/**
 * [Milestone 3] 일본어 → 한국어(jp-to-ko) 정밀 형태소 · 숫자/조건 · 접객 경어 역번역 파서
 * 점원의 빠른 응대나 매장 안내문에서 시간제, 요금, 층수, 플랫폼, 금기사항, 정중 거절(~いたしかねます) 등을
 * 손실 없이 자연스러운 완결형 한국어 문장으로 복원합니다.
 */

export interface JpVocabRef {
  jp: string;
  ko: string;
}

// 1. 일본어 문장 내 숫자·시간·금액·층수·플랫폼·제한 조건 정밀 추출기
function extractJapaneseNumericAndRuleFacts(jp: string): string[] {
  const facts: string[] = [];

  // 시간제 (예: 90分制, 2時間制)
  const timeLimitMin = jp.match(/(\d+)\s*分制/);
  if (timeLimitMin) facts.push(`${timeLimitMin[1]}분 시간제`);
  const timeLimitHr = jp.match(/(\d+)\s*時間制/);
  if (timeLimitHr) facts.push(`${timeLimitHr[1]}시간 이용 제한`);

  // 대기 시간 (예: 30分待ち, 約20分ほどお待ち)
  const waitMin = jp.match(/(\d+)\s*分\s*(?:待ち|ほどお待ち|くらいお待ち|程度お待ち)/);
  if (waitMin) facts.push(`약 ${waitMin[1]}분 대기`);

  // 시각 (예: 11時30分, 10時)
  const clockMatches = [...jp.matchAll(/(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分|(半))?/g)];
  for (const m of clockMatches) {
    // ~時間制와 중복 방지
    const afterIdx = (m.index ?? 0) + m[0].length;
    if (jp.slice(afterIdx, afterIdx + 1) === '間') continue;
    const minStr = m[3] ? ' 30분' : m[2] ? ` ${m[2]}분` : '';
    facts.push(`${m[1]}시${minStr}`);
  }

  // 금액 (예: 1,500円, 5500円)
  const yenMatch = jp.match(/([\d,]+)\s*円/);
  if (yenMatch) facts.push(`${yenMatch[1]}엔`);

  // 층수 (예: 3階, 地下1階, B1F)
  const bFloor = jp.match(/地下\s*(\d+)\s*階|B(\d+)F/i);
  if (bFloor) {
    facts.push(`지하 ${bFloor[1] || bFloor[2]}층`);
  } else {
    const floor = jp.match(/(\d+)\s*階/);
    if (floor) facts.push(`${floor[1]}층`);
  }

  // 승강장 / 출구 번호 (예: 5番線, 3番ホーム, 2番出口)
  const platform = jp.match(/(\d+)\s*番(?:線|ホーム|乗り場)/);
  if (platform) facts.push(`${platform[1]}번 승강장`);
  const exitNum = jp.match(/(\d+)\s*番出口/);
  if (exitNum) facts.push(`${exitNum[1]}번 출구`);

  // 인원수 (예: 2名様, 3人)
  const person = jp.match(/(\d+)\s*(?:名様?|人)/);
  if (person) facts.push(`${person[1]}분(명)`);

  // 주요 매장 운영 규칙 키워드
  if (/現金のみ/.test(jp)) facts.push('현금 결제만 가능');
  if (/キャッシュレスのみ|現金不可/.test(jp)) facts.push('현금 불가(카드·간편결제 전용)');
  if (/ワンドリンク制|1ドリンク/.test(jp)) facts.push('1인 1음료 주문 필수');
  if (/完全予約制|予約のみ/.test(jp)) facts.push('사전 예약제 전용');
  if (/お通し|席料|チャージ料/.test(jp)) facts.push('기본 안주비(자릿세)');
  if (/税込/.test(jp)) facts.push('세금 포함');
  if (/税抜|税別/.test(jp)) facts.push('세금 별도');
  if (/無料/.test(jp)) facts.push('무료');
  if (/有料/.test(jp)) facts.push('유료');

  return Array.from(new Set(facts));
}

// 2. 고빈도 일본어 접객·안내 복합 패턴 사전 (숫자/슬롯 보존형)
const DETAILED_JP_PATTERNS: Array<{
  regex: RegExp;
  render: (m: RegExpMatchArray, facts: string[]) => string;
}> = [
  {
    regex: /お席.*(\d+分|\d+時間)制.*(?:よろしい|大丈夫)/,
    render: (_m, facts) =>
      `좌석은 ${facts.find((f) => f.includes('시간제') || f.includes('이용 제한')) || '시간 제한제'}로 운영되는데 괜찮으신가요?`,
  },
  {
    regex: /現金のみ.*(?:お支払い|会計|対応|よろしい|大丈夫|使えます)?/,
    render: () => '결제는 현금으로만 가능한데 괜찮으신가요?',
  },
  {
    regex: /ワンドリンク|1ドリンク/,
    render: () => '1인당 최소 음료 1잔 주문이 필수인데 괜찮으신가요?',
  },
  {
    regex: /何名様|なんめいさま|何人/,
    render: () => '몇 분이신가요?',
  },
  {
    regex: /ご予約.*(?:ありますか|されていますか|おありですか|承って)/,
    render: () => '사전에 예약하셨나요?',
  },
  {
    regex: /喫煙室.*のみ|喫煙所.*のみ|(?:お煙草|おタバコ|タバコ).*喫煙(?:室|所)/,
    render: () => '흡연(담배)은 지정된 흡연실에서만 가능합니다.',
  },
  {
    regex: /(?:おタバコ|お煙草).*吸われ|禁煙席.*喫煙席|禁煙と喫煙/,
    render: () => '금연석과 흡연석 중 어느 쪽으로 안내해 드릴까요?',
  },
  {
    regex: /店内.*(?:お召し上がり|ご利用)|お持ち帰り.*店内|イートイン.*テイクアウト/,
    render: () => '매장에서 드시고 가시나요, 포장(테이크아웃)해 가시나요?',
  },
  {
    regex: /温めますか|あたためますか|お温め/,
    render: () => '음식(도시락)을 전자레인지에 데워 드릴까요?',
  },
  {
    regex: /レジ袋|袋.*(?:ご利用|入りますか|お付け|いりますか|お持ち)/,
    render: (_m, facts) =>
      `비닐봉투(쇼핑백)${facts.includes('유료') ? '(유료)' : ''} 필요하신가요?`,
  },
  {
    regex: /ポイントカード.*(?:お持ち|ありますか|ご提示)/,
    render: () => '포인트 카드 가지고 계신가요?',
  },
  {
    regex: /お箸.*スプーン|お箸.*(?:お付け|ご利用|何膳)/,
    render: () => '젓가락이나 스푼 챙겨 드릴까요? (몇 벌 필요하신가요?)',
  },
  {
    regex: /お支払い.*(?:方法|いかが|どちら|回数|一括)/,
    render: (m) =>
      m[0].includes('回数') || m[0].includes('一括')
        ? '카드 할부 개월 수는 일시불로 해드릴까요?'
        : '결제 수단은 어떻게 도와드릴까요? (현금/카드/IC카드)',
  },
  {
    regex: /タッチ決済|差し込んで|暗証番号|サインをお願い/,
    render: (m) =>
      m[0].includes('サイン')
        ? '화면에 서명(사인)을 부탁드립니다.'
        : '카드를 단말기에 터치하거나 꽂아주시고 비밀번호를 입력해 주세요.',
  },
  {
    regex: /レシート|領収書.*(?:ご利用|よろしい|お渡し|宛名)/,
    render: (m) =>
      m[0].includes('宛名')
        ? '영수증에 적을 성함(상호명)은 어떻게 해드릴까요?'
        : '영수증 챙겨 드릴까요?',
  },
  {
    regex: /パスポート.*(?:ご提示|見せて|お預かり|拝見)/,
    render: () => '실물 여권을 보여주시겠어요?',
  },
  {
    regex: /チェックイン.*お名前|ご予約のお名前/,
    render: () => '예약하신 분의 성함을 말씀해 주시겠어요?',
  },
  {
    regex: /チェックアウト.*(?:\d+時|何時)/,
    render: (_m, facts) =>
      `체크아웃 시간은 ${facts.find((f) => f.includes('시')) || '안내된 시각'}까지입니다.`,
  },
  {
    regex: /朝食.*(?:会場|レストラン|\d+時)/,
    render: (_m, facts) => {
      const times = facts.filter((f) => f.includes('시')).join(' ~ ');
      const floor = facts.find((f) => f.includes('층'));
      return `조식은 ${floor ? `${floor} 레스토랑에서 ` : ''}${times ? `${times} 사이에 ` : ''}이용하실 수 있습니다.`;
    },
  },
  {
    regex: /エレベーター.*(?:あちら|右手|左手|奥|\d+階)/,
    render: (m) => {
      const dir = m[0].includes('右手')
        ? '오른쪽'
        : m[0].includes('左手')
        ? '왼쪽'
        : m[0].includes('奥')
        ? '안쪽'
        : '저쪽';
      return `엘리베이터는 ${dir}에 있습니다.`;
    },
  },
  {
    regex: /お荷物.*お預かり/,
    render: () => '고객님의 짐을 보관해 드리겠습니다. (보관증을 받아주세요)',
  },
  {
    regex: /満席.*お待ち|待ち時間|お名前を書いてお待ち/,
    render: (m, facts) => {
      const wait = facts.find((f) => f.includes('대기'));
      if (m[0].includes('名前を書いて')) {
        return `현재 만석이니 웨이팅 보드에 성함과 인원을 적고 기다려 주세요.${wait ? ` (${wait})` : ''}`;
      }
      return `현재 만석이라 ${wait ? `${wait} 정도 ` : ''}기다리셔야 합니다.`;
    },
  },
  {
    regex: /売り切れ|品切れ|在庫がございません|完売/,
    render: () => '죄송합니다만 해당 상품(메뉴)은 현재 품절되어 재고가 없습니다.',
  },
  {
    regex: /少々お待ちください|しばらくお待ち|お掛けになってお待ち/,
    render: (m) =>
      m[0].includes('お掛けになって')
        ? '자리에 앉아서 잠시만 기다려 주십시오.'
        : '잠시만 기다려 주십시오.',
  },
  {
    regex: /かしこまりました|承知いたしました/,
    render: () => '네, 잘 알겠습니다!',
  },
  {
    regex: /ご注文はお決まり|お伺いします/,
    render: () => '주문하실 메뉴 결정하셨나요?',
  },
  {
    regex: /以上でよろしい|ご注文は以上/,
    render: () => '주문하신 내역은 이상으로 맞으신가요?',
  },
  {
    regex: /ラストオーダー/,
    render: (_m, facts) =>
      `라스트 오더(마감 주문)는 ${facts.find((f) => f.includes('시')) || '곧 마감 시간'}입니다.`,
  },
  {
    regex: /お控えください|ご遠慮ください|禁止となって/,
    render: (m) => {
      if (m.input?.includes('写真') || m.input?.includes('撮影')) {
        return '죄송합니다만 이곳에서의 사진·동영상 촬영은 삼가 주시기 바랍니다.';
      }
      if (m.input?.includes('飲食')) {
        return '매장 내 외부 음식물 섭취는 삼가 주시기 바랍니다.';
      }
      if (m.input?.includes('喫煙') || m.input?.includes('タバコ')) {
        return '이곳은 금연 구역이므로 흡연을 삼가 주시기 바랍니다.';
      }
      return '죄송합니다만 해당 행위는 규정상 삼가 주시기 바랍니다.';
    },
  },
  {
    regex: /いたしかねます|できかねます|お受けできません|対応しておりません/,
    render: (m) => {
      if (m.input?.includes('返品') || m.input?.includes('交換') || m.input?.includes('返金')) {
        return '죄송합니다만 교환이나 환불 처리는 해드리기 어렵습니다.';
      }
      if (m.input?.includes('別々') || m.input?.includes('個別')) {
        return '죄송합니다만 개별(더치페이) 계산은 어렵고 한꺼번에 결제 부탁드립니다.';
      }
      if (m.input?.includes('予約')) {
        return '죄송합니다만 예약이 마감되었거나 예약을 받지 않고 있습니다.';
      }
      return '죄송합니다만 요청하신 사항은 도와드리기 어렵습니다(불가합니다).';
    },
  },
];

// 3. 일본어 보충 어휘 사전 (역번역 전용 동사/부사/방향어)
const JP_SUPPLEMENT_LEXICON: Array<[string, string]> = [
  ['右手', '오른쪽'],
  ['左手', '왼쪽'],
  ['まっすぐ', '곧장 직진'],
  ['突き当たり', '길 끝'],
  ['向かい側', '건너편'],
  ['隣', '바로 옆'],
  ['奥', '안쪽'],
  ['手前', '앞쪽'],
  ['階段', '계단'],
  ['改札', '개찰구'],
  ['乗り場', '타는 곳'],
  ['番号札', '번호표'],
  ['整理券', '대기 번호표'],
  ['身分証', '신분증'],
  ['暗証番号', '비밀번호'],
  ['署名', '서명'],
  ['開封', '개봉(뜯음)'],
  ['出国まで', '출국 전까지'],
  ['お選び', '선택'],
  ['ご記入', '기입(작성)'],
  ['お並び', '줄 서서 대기'],
  ['ご確認', '확인'],
];

// 4. 메인 일본어 → 한국어 정밀 해독 함수
export function parseJapaneseToKoreanDetailed(
  cleanJp: string,
  dictEntries: JpVocabRef[]
): { ko: string; confidence: number } {
  const facts = extractJapaneseNumericAndRuleFacts(cleanJp);

  // 1) 정밀 복합 접객 패턴 검사
  for (const pat of DETAILED_JP_PATTERNS) {
    const match = cleanJp.match(pat.regex);
    if (match) {
      return { ko: pat.render(match, facts), confidence: 94 };
    }
  }

  // 2) 어휘 + 숫자/규칙 + 일본어 문말 문법 어미 결합 해석
  const foundMeanings: string[] = [...facts];

  for (const [jpKey, koVal] of JP_SUPPLEMENT_LEXICON) {
    if (cleanJp.includes(jpKey) && !foundMeanings.includes(koVal)) {
      foundMeanings.push(koVal);
    }
  }

  // 긴 일본어 단어부터 매칭하여 부분 오매칭 방지
  const sortedDict = [...dictEntries].sort((a, b) => b.jp.length - a.jp.length);
  let masked = cleanJp;
  for (const entry of sortedDict) {
    if (entry.jp.length >= 2 && masked.includes(entry.jp)) {
      if (!foundMeanings.includes(entry.ko)) {
        foundMeanings.push(entry.ko);
      }
      masked = masked.replace(entry.jp, ' ');
      if (foundMeanings.length >= 5) break;
    }
  }

  const coreTopic = foundMeanings.slice(0, 4).join(' · ');

  if (!coreTopic) {
    if (/ありがとう/.test(cleanJp)) return { ko: '감사합니다!', confidence: 95 };
    if (/すみません|申し訳|恐れ入ります/.test(cleanJp))
      return { ko: '죄송합니다 (실례합니다).', confidence: 92 };
    if (/いらっしゃいませ/.test(cleanJp)) return { ko: '어서 오세요!', confidence: 98 };
    if (/どうぞ/.test(cleanJp)) return { ko: '자, 여기 있습니다 (편히 이용해 주세요).', confidence: 90 };
    return { ko: '상대방의 일본어 안내 말씀입니다.', confidence: 70 };
  }

  // 일본어 문말 조동사·어미에 따른 정밀 서술부 복원
  let koResult = '';
  if (/終了いたしました|終わりました|締め切りました/.test(cleanJp)) {
    koResult = `${coreTopic} 이용(접수)이 마감되었습니다.`;
  } else if (/ありません|ございません|できません|使えません|不可/.test(cleanJp)) {
    koResult = `${coreTopic}은(는) 없거나 이용하실 수 없습니다.`;
  } else if (/どこですか|どちらですか/.test(cleanJp)) {
    koResult = `${coreTopic}은(는) 어디인가요? (어느 쪽으로 해드릴까요?)`;
  } else if (/いくらですか/.test(cleanJp)) {
    koResult = `${coreTopic} 요금(가격)은 얼마인가요?`;
  } else if (/お選びください/.test(cleanJp)) {
    koResult = `${coreTopic} 중에서 선택해 주세요.`;
  } else if (/ご記入ください|書いてください/.test(cleanJp)) {
    koResult = `${coreTopic} 내용을 작성(기입)해 주세요.`;
  } else if (/お並びください/.test(cleanJp)) {
    koResult = `${coreTopic} 쪽으로 줄을 서서 기다려 주세요.`;
  } else if (/ご確認ください/.test(cleanJp)) {
    koResult = `${coreTopic} 내용을 확인해 주세요.`;
  } else if (/よろしいでしょうか|よろしいですか|大丈夫ですか|いいですか/.test(cleanJp)) {
    koResult = `${coreTopic}(으)로 진행해도 괜찮으신가요?`;
  } else if (/ますか|ですか|でしょうか/.test(cleanJp)) {
    koResult = `${coreTopic} 맞으신가요? (확인 질문)`;
  } else if (/ください|お願いします|いただけますか/.test(cleanJp)) {
    koResult = `${coreTopic}을(를) 부탁드립니다.`;
  } else if (/となっております|でございます|になります|です/.test(cleanJp)) {
    koResult = `${coreTopic}(으)로 안내드립니다.`;
  } else {
    koResult = `${coreTopic} 관련 안내입니다.`;
  }

  return { ko: koResult, confidence: 86 };
}
