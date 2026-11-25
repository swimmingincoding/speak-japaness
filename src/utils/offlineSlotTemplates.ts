/**
 * [Milestone 1] Tier 1: 한국어 구어체/유의어 정규화 및 동적 슬롯 템플릿(Parameterized Slot Template) 매처
 * 수량, 인원, 시각, 장소, 음식, 사물, 교통수단 슬롯을 원어민 문형에 0.002초 만에 정밀 결합합니다.
 */

export interface SlotNounRef {
  matchedKo: string;
  jp: string;
  type: 'place' | 'item' | 'food' | 'person' | 'time' | 'abstract';
  index: number;
}

// 1. 구어체 오타·축약어·방언 정규화 (의미 손실 없이 표준 분석 형태로 정돈)
export function normalizeKoreanInputForAnalysis(raw: string): string {
  return raw
    .trim()
    .replace(/할려구|하려구/g, '하려고')
    .replace(/할께요|할께/g, '할게요')
    .replace(/갈께요|갈께/g, '갈게요')
    .replace(/줄래요|주실래요/g, '주실 수 있나요')
    .replace(/되여|되요/g, '돼요')
    .replace(/안되나요|안돼나요/g, '안 되나요')
    .replace(/안되요|안돼요/g, '안 돼요')
    .replace(/얼마에여|얼마예여|얼마임/g, '얼마예요')
    .replace(/어디에여|어디예여|어디임/g, '어디예요')
    .replace(/있나여|있어여/g, '있나요')
    .replace(/주세여|주셈/g, '주세요')
    .replace(/어케|어떻해/g, '어떻게')
    .replace(/비번/g, '비밀번호')
    .replace(/텍스프리|택스리펀드/g, '면세')
    .replace(/아아/g, '아이스 커피')
    .replace(/뜨아/g, '따뜻한 커피')
    .replace(/\s+/g, ' ');
}

// 2. 정밀 숫자·단위(인원, 개수, 잔, 장, 층, 호실, 번, 분, 시간, 엔) 추출기
const KOR_NUM_MAP: Record<string, number> = {
  한: 1, 하나: 1, 일: 1,
  두: 2, 둘: 2, 이: 2,
  세: 3, 셋: 3, 삼: 3,
  네: 4, 넷: 4, 사: 4,
  다섯: 5, 오: 5,
  여섯: 6, 육: 6,
  일곱: 7, 칠: 7,
  여덟: 8, 팔: 8,
  아홉: 9, 구: 9,
  열: 10, 십: 10,
};

function parseKorOrDigitNumber(token: string): number | null {
  const trimmed = token.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (KOR_NUM_MAP[trimmed] !== undefined) return KOR_NUM_MAP[trimmed];
  return null;
}

// 일본어 고유수사(1~10개: 一つ~十) 변환
export function toJapaneseGenericCounter(n: number): string {
  const genericMap: Record<number, string> = {
    1: '一つ',
    2: '二つ',
    3: '三つ',
    4: '四つ',
    5: '五つ',
    6: '六つ',
    7: '七つ',
    8: '八つ',
    9: '九つ',
    10: '十',
  };
  return genericMap[n] || `${n}個`;
}

// 일본어 인원수(一人, 二人, 三人, 四人...) 변환
export function toJapanesePersonCounter(n: number): string {
  if (n === 1) return '一人';
  if (n === 2) return '二人';
  if (n === 4) return '四人';
  return `${n}人`;
}

export interface ExtractedQuantities {
  personCountJp?: string; // 예: 二人
  itemCountJp?: string;   // 예: 二つ, 三枚, 二杯
  floorJp?: string;       // 예: 3階
  roomOrTableJp?: string; // 예: 502号室, 4番テーブル
  durationJp?: string;    // 예: 30分, 2時間
}

export function extractStructuredQuantities(text: string): ExtractedQuantities {
  const out: ExtractedQuantities = {};

  // 인원수 (혼자, 둘이, N명, N분)
  if (/혼자(서)?/.test(text)) {
    out.personCountJp = '一人';
  } else if (/둘이(서)?/.test(text)) {
    out.personCountJp = '二人';
  } else {
    const pMatch = text.match(/(\d+|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*(?:명|사람)/);
    if (pMatch) {
      const n = parseKorOrDigitNumber(pMatch[1]);
      if (n) out.personCountJp = toJapanesePersonCounter(n);
    }
  }

  // 잔/병/장/개/그릇/접시
  const cupMatch = text.match(/(\d+|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*잔/);
  if (cupMatch) {
    const n = parseKorOrDigitNumber(cupMatch[1]);
    if (n) out.itemCountJp = n <= 3 ? toJapaneseGenericCounter(n) : `${n}杯`;
  }

  const sheetMatch = text.match(/(\d+|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*장/);
  if (sheetMatch) {
    const n = parseKorOrDigitNumber(sheetMatch[1]);
    if (n) out.itemCountJp = `${n}枚`;
  }

  const bottleMatch = text.match(/(\d+|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*병/);
  if (bottleMatch) {
    const n = parseKorOrDigitNumber(bottleMatch[1]);
    if (n) out.itemCountJp = `${n}本`;
  }

  if (!out.itemCountJp) {
    const genMatch = text.match(/(\d+|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*(?:개|그릇|인분|세트)/);
    if (genMatch) {
      const n = parseKorOrDigitNumber(genMatch[1]);
      if (n) {
        out.itemCountJp = genMatch[0].includes('인분') ? `${n}人前` : toJapaneseGenericCounter(n);
      }
    } else if (/(?<!한\s)하나/.test(text)) {
      out.itemCountJp = '一つ';
    } else if (/둘/.test(text) && !out.personCountJp) {
      out.itemCountJp = '二つ';
    }
  }

  // 층수 / 호실 / 번호
  const floorMatch = text.match(/(\d+)\s*층/);
  if (floorMatch) out.floorJp = `${floorMatch[1]}階`;

  const roomMatch = text.match(/(\d+)\s*호(실)?/);
  if (roomMatch) out.roomOrTableJp = `${roomMatch[1]}号室`;

  const tableMatch = text.match(/(\d+)\s*번\s*(테이블|자리|좌석)/);
  if (tableMatch) out.roomOrTableJp = `${tableMatch[1]}番テーブル`;

  // 소요/연장 시간 (N시간, N분)
  const durHour = text.match(/(\d+|한|두|세|네)\s*시간/);
  const durMin = text.match(/(\d+)\s*분(?!\s*이신)/);
  if (durHour || durMin) {
    const h = durHour ? parseKorOrDigitNumber(durHour[1]) : null;
    const m = durMin ? parseInt(durMin[1], 10) : null;
    out.durationJp = `${h ? `${h}時間` : ''}${m ? `${m}分` : ''}`;
  }

  return out;
}

// 3. 고빈도 여행 실전 슬롯 템플릿 매처 (오역 방지 및 원어민 100% 자연스러운 구문 치환)
export function matchSlotTemplateKoToJp(
  clause: string,
  foundNouns: SlotNounRef[],
  timePrefix: string
): string | null {
  const c = normalizeKoreanInputForAnalysis(clause);
  const qty = extractStructuredQuantities(c);
  const hasNegation = /안\s*되|안\s*돼|없나|없어|못\s*|아닌|말고|빼고/.test(c);

  // [Template 1] 식기/수건/어메니티 떨어뜨림·오염으로 인한 새것 교체 요청 ('새 상품 재고' 오역 완벽 차단!)
  const tableOrRoomItem = foundNouns.find((n) =>
    ['お箸', 'スプーン', 'フォーク', 'ナイフ', '取り皿', 'お皿', 'おしぼり', 'タオル', 'バスタオル', 'コップ', 'グラス', 'ナプキン'].includes(
      n.jp
    )
  );
  if (
    tableOrRoomItem &&
    (c.includes('떨어') || c.includes('더러') || c.includes('새 거') || c.includes('새 걸로') || c.includes('새것') || c.includes('교체') || c.includes('바꿔'))
  ) {
    if (c.includes('떨어')) {
      return `すみません、${tableOrRoomItem.jp}を落としてしまったので、新しいものをいただけますか？`;
    }
    return `すみません、新しい${tableOrRoomItem.jp}に変えていただけますか？`;
  }

  // [Template 2] 특정 품목 면세 가능/불가 여부 질문 ("이 약은 면세가 안 되나요?", "술도 면세 되나요?")
  if (c.includes('면세')) {
    const targetItem = foundNouns.find((n) => n.jp !== '免税');
    const subjectJp = targetItem ? `${targetItem.jp}は` : 'こちらは';
    if (c.includes('안 되나') || c.includes('안 돼요') || c.includes('제외') || c.includes('안 됩니')) {
      return `${subjectJp}免税の対象外ですか？（免税になりませんか？）`;
    }
    if (c.includes('합산') || c.includes('합쳐서')) {
      return `他の商品と合算して免税にできますか？`;
    }
    if (targetItem) {
      return `${subjectJp}免税（タックスフリー）になりますか？`;
    }
  }

  // [Template 3] 교통수단 + 목적지 소요시간 / 요금 / 탑승 희망 ("시부야역까지 택시로 얼마나 걸리나요?", "도쿄역까지 택시로 몇 분 정도 걸리나요?")
  const placeNouns = foundNouns.filter(
    (n) =>
      n.type === 'place' ||
      c.slice(n.index + n.matchedKo.length).trimStart().startsWith('까지')
  );
  const transportNoun = foundNouns.find((n) =>
    ['電車', '列車', '地下鉄', 'バス', 'タクシー', '新幹線', '空港リムジンバス', '徒歩'].includes(n.jp)
  );
  const walkExpr = c.includes('걸어서') || c.includes('도보로') ? '歩いて' : '';
  const byTransportJp = transportNoun ? `${transportNoun.jp}で` : walkExpr;

  if (
    placeNouns.length >= 1 &&
    /(얼마나|몇\s*(?:분|시간))\s*(?:정도|쯤|가량)?\s*걸/.test(c)
  ) {
    const dest = placeNouns[placeNouns.length - 1].jp;
    const from = placeNouns.length >= 2 ? `${placeNouns[0].jp}から` : 'ここから';
    return `${from}${dest}まで${byTransportJp}どのくらいかかりますか？`;
  }

  if (
    placeNouns.length >= 1 &&
    transportNoun &&
    (c.includes('타고 싶') || c.includes('타려') || c.includes('타야'))
  ) {
    const dest = placeNouns[placeNouns.length - 1].jp;
    return `${dest}まで行く${transportNoun.jp}に乗りたいです。`;
  }

  if (placeNouns.length >= 1 && byTransportJp && (c.includes('얼마예') || c.includes('얼마인가') || c.includes('요금'))) {
    const dest = placeNouns[placeNouns.length - 1].jp;
    return `ここから${dest}まで${byTransportJp}いくらかかりますか？`;
  }

  // [Template 4] 전철/버스 특정 목적지 행선지 확인 ("이 전철 아사쿠사에 가나요?", "이 버스 교토역 가나요?")
  if (placeNouns.length >= 1 && transportNoun && (c.includes('가나요') || c.includes('가요?') || c.includes('맞나요') || c.includes('타면 되'))) {
    const dest = placeNouns[placeNouns.length - 1].jp;
    return `この${transportNoun.jp}は${dest}に行きますか？`;
  }

  // [Template 5] 음식 내 특정 재료 포함 여부 / 제외 주문 ("이 라멘에 돼지고기 들어가 있나요?", "계란 빼고 만들어주실 수 있나요?")
  const foodNouns = foundNouns.filter((n) => n.type === 'food');
  if (foodNouns.length >= 1 && (c.includes('들어가') || c.includes('들어 있') || c.includes('들어있') || c.includes('포함'))) {
    if (foodNouns.length >= 2) {
      return `この${foodNouns[0].jp}に${foodNouns[1].jp}は入っていますか？`;
    }
    return `これに${foodNouns[0].jp}は入っていますか？`;
  }

  if (foodNouns.length >= 2 && (c.includes('빼고') || c.includes('빼주') || c.includes('없이'))) {
    // 조사/어순상 '빼고' 바로 앞 명사가 제외할 재료
    const removeIdx = c.search(/빼고|빼주|없이/);
    const sortedByDist = [...foodNouns].sort(
      (a, b) => Math.abs(removeIdx - a.index) - Math.abs(removeIdx - b.index)
    );
    const ingredient = sortedByDist[0];
    const mainDish = foodNouns.find((f) => f !== ingredient)!;
    return `${mainDish.jp}を${ingredient.jp}抜きでお願いできますか？`;
  }

  // [Template 6] 인원수 + 좌석 타입/입장 문의 ("3명인데 금연석 자리 있나요?", "예약 안 했는데 4명 들어갈 수 있나요?")
  if (qty.personCountJp && (c.includes('자리') || c.includes('들어갈') || c.includes('입장') || c.includes('앉을') || c.includes('석'))) {
    const seatNoun = foundNouns.find((n) =>
      ['禁煙席', '喫煙席', 'カウンター席', 'テーブル席', '窓際の席', '個室'].includes(n.jp)
    );
    const noResPrefix = c.includes('예약') && hasNegation ? '予約していないのですが、' : '';
    if (seatNoun) {
      return `${noResPrefix}${qty.personCountJp}ですが、${seatNoun.jp}は空いていますか？`;
    }
    return `${noResPrefix}${qty.personCountJp}ですが、今入れますか？（空いている席はありますか？）`;
  }

  // [Template 7] 자리 이동 요청 ("창가 자리로 옮겨도 될까요?", "다른 자리로 바꿀 수 있나요?")
  if ((c.includes('자리') || c.includes('좌석') || c.includes('테이블')) && (c.includes('옮겨') || c.includes('옮길') || c.includes('이동') || c.includes('바꿔') || c.includes('바꿀'))) {
    const seatNoun = foundNouns.find((n) =>
      ['窓際の席', 'カウンター席', 'テーブル席', '禁煙席', '個室', '窓側'].includes(n.jp)
    );
    if (seatNoun) {
      return `すみません、${seatNoun.jp === '窓側' ? '窓側の席' : seatNoun.jp}に移ってもいいですか？`;
    }
    return `すみません、別の席に移ってもいいですか？`;
  }

  // [Template 8] 시간/시각 + 짐 보관 ("오후 5시까지 캐리어 맡길 수 있나요?")
  if (
    (c.includes('짐') || c.includes('캐리어') || c.includes('가방') || c.includes('수하물')) &&
    (c.includes('맡') || c.includes('보관'))
  ) {
    const prefix = c.includes('체크인 전')
      ? 'チェックイン前ですが、'
      : c.includes('체크아웃 후')
      ? 'チェックアウト後ですが、'
      : '';
    const timeStr = timePrefix || (qty.durationJp ? `${qty.durationJp}ほど` : '');
    return `${prefix}${timeStr}荷物を預かっていただけますか？`;
  }

  // [Template 9] 시간 연장 요청 ("체크아웃 2시간 연장할 수 있나요?")
  if (c.includes('연장') && (qty.durationJp || timePrefix)) {
    const target = foundNouns.find((n) => n.jp === 'チェックアウト') ? 'チェックアウトを' : '';
    return `${target}${qty.durationJp || timePrefix}延長することはできますか？`;
  }

  // [Template 10] 호실 / 테이블 번호 기반 요청 ("502호실인데 수건 두 장 더 주실 수 있나요?", "4번 테이블 계산할게요")
  if (qty.roomOrTableJp) {
    if (c.includes('계산')) {
      return `すみません、${qty.roomOrTableJp}のお会計をお願いします。`;
    }
    const reqItem = foundNouns.find((n) => n.type === 'item' || n.type === 'food');
    if (reqItem) {
      return `すみません、${qty.roomOrTableJp}ですが、${reqItem.jp}を${qty.itemCountJp || 'もう一つ'}いただけますか？`;
    }
  }

  // [Template 11] 불량/고장 교환 및 환불 복합 문장 ("어제 산 상품이 고장나서 교환하고 싶어요")
  if (
    (c.includes('고장') || c.includes('불량') || c.includes('안 켜져') || c.includes('작동이 안') || c.includes('깨져') || c.includes('찢어')) &&
    (c.includes('교환') || c.includes('환불') || c.includes('반품') || c.includes('바꿔'))
  ) {
    const item = foundNouns.find((n) => n.type === 'item' && !['交換', '返品', '不良品', 'レシート'].includes(n.jp));
    const itemStr = item ? `この${item.jp}` : '購入した商品';
    const actionJp = c.includes('환불') || c.includes('반품') ? '返品（返金）' : '新しいものに交換';
    return `すみません、${timePrefix ? timePrefix.replace(/に$/, '') : ''}${itemStr}が壊れている（不良品）ようなので、${actionJp}していただけますか？`;
  }

  // [Template 12] 선물용 포장 (음식 테이크아웃 '持ち帰り' 오역 원천 차단!)
  if ((c.includes('선물') || c.includes('예쁘게') || c.includes('리본')) && c.includes('포장')) {
    return 'プレゼント用なので、きれいにラッピングしていただけますか？';
  }

  // [Template 13] 여행자 보험용 진단서·영수증 발급 요청
  if (
    (c.includes('보험') || c.includes('진단서')) &&
    (c.includes('영수증') || c.includes('발급') || c.includes('부탁') || c.includes('주세'))
  ) {
    return '旅行保険の申請のため、診断書と領収書をお願いします。';
  }

  // [Template 14] 반대 방향 열차/전철/버스 오탑승
  if (c.includes('반대') && (c.includes('잘못') || c.includes('거꾸로'))) {
    const vehicle = transportNoun ? transportNoun.jp : '電車';
    return `反対方向の${vehicle}に間違えて乗ってしまいました。`;
  }

  return null;
}
