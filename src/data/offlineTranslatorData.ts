export type EmergencyCategory =
  | 'lost'
  | 'medical'
  | 'allergy'
  | 'payment'
  | 'transport_issue'
  | 'help';

export interface EmergencyPhrase {
  id: string;
  category: EmergencyCategory;
  korean: string;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  expectedReplyJp: string; // 상대방(점원/역무원/경찰)이 주로 하는 대답
  expectedReplyKo: string;
  keywords: string[]; // 오프라인 검색/번역 매칭용 키워드
}

export const EMERGENCY_CATEGORY_META: Record<
  EmergencyCategory,
  { label: string; emoji: string; color: string }
> = {
  lost: { label: '분실 · 놓고 내림', emoji: '👜', color: 'text-rose-400' },
  medical: { label: '병원 · 약국 · 증상', emoji: '🏥', color: 'text-emerald-400' },
  allergy: { label: '알레르기 · 못 먹는 음식', emoji: '🦐', color: 'text-amber-400' },
  payment: { label: '결제 오류 · 현금 · 예약', emoji: '💳', color: 'text-sky-400' },
  transport_issue: { label: '열차 지연 · 길 잃음', emoji: '🚆', color: 'text-purple-400' },
  help: { label: '긴급 구조 · 파출소', emoji: '🆘', color: 'text-red-400' },
};

export const OFFLINE_EMERGENCY_PHRASES: EmergencyPhrase[] = [
  // 1. 분실 / 놓고 내림
  {
    id: 'em-lost-1',
    category: 'lost',
    korean: '전철(기차)에 가방을 두고 내렸어요. 어디에 문의해야 하나요?',
    japanese: '電車にカバンを置き忘れました。どこに聞けばいいですか？',
    furigana: 'でんしゃに かばんを おきわすれました。どこに きけば いいですか？',
    koreanPronunciation: '덴샤니 카반오 오키와스레마시타. 도코니 키케바 이-데스카?',
    expectedReplyJp: '何線（なにせん）の何時ごろの電車ですか？お忘れ物センターに確認します。',
    expectedReplyKo: '무슨 노선 몇 시쯤 전철인가요? 유실물 센터에 확인해 보겠습니다.',
    keywords: ['전철', '기차', '가방', '두고', '내렸', '분실', '유실물', '잃어버렸', '電車', 'カバン', '忘れ'],
  },
  {
    id: 'em-lost-2',
    category: 'lost',
    korean: '지갑(여권)을 잃어버렸어요. 가장 가까운 파출소(코반)가 어디인가요?',
    japanese: '財布（パスポート）をなくしました。一番近い交番はどこですか？',
    furigana: 'さいふ（ぱすぽーと）を なくしました。いちばん ちかい こうばんは どこですか？',
    koreanPronunciation: '사이후(파스포-토)오 나쿠시마시타. 이치반 치카이 코-반와 도코데스카?',
    expectedReplyJp: '駅の北口を出てすぐ右に交番がありますよ。',
    expectedReplyKo: '역 북쪽 출구로 나가서 바로 오른쪽에 파출소가 있습니다.',
    keywords: ['지갑', '여권', '잃어버', '분실', '파출소', '경찰', '코반', '財布', 'パスポート', '交番'],
  },
  {
    id: 'em-lost-3',
    category: 'lost',
    korean: '방금 이 가게(식당) 테이블에 휴대폰을 놓고 온 것 같아요.',
    japanese: 'さっきこのお店のテーブルにスマホを忘れたみたいです。',
    furigana: 'さっき この おみせの てーぶるに すまほを わすれた みたいです。',
    koreanPronunciation: '삿키 코노 오미세노 테-부루니 스마호오 와스레타 미타이데스.',
    expectedReplyJp: '届いておりますよ！特徴（色やケース）を教えていただけますか？',
    expectedReplyKo: '보관하고 있습니다! 특징(색상이나 케이스)을 말씀해 주시겠어요?',
    keywords: ['가게', '식당', '휴대폰', '스마트폰', '폰', '놓고', '테이블', 'スマホ', '携帯'],
  },

  // 2. 병원 / 약국 / 증상
  {
    id: 'em-med-1',
    category: 'medical',
    korean: '열이 나고 목이 많이 아파요. 종합감기약이나 해열제 있나요?',
    japanese: '熱があって喉がとても痛いです。風邪薬か解熱剤はありますか？',
    furigana: 'ねつが あって のどが とても いたいです。かぜぐすりか げねつざいは ありますか？',
    koreanPronunciation: '네츠가 앗테 노도가 토테모 이타이데스. 카제구스리카 게네츠자이와 아리마스카?',
    expectedReplyJp: '眠くなりにくいタイプと、すぐ効くタイプがありますが、どちらになさいますか？',
    expectedReplyKo: '졸리지 않은 타입과 바로 듣는 타입이 있는데, 어느 것으로 하시겠어요?',
    keywords: ['열', '목', '아파', '감기', '해열제', '약', '병원', '熱', '喉', '痛い', '風邪薬'],
  },
  {
    id: 'em-med-2',
    category: 'medical',
    korean: '배가 너무 아프고 설사를 해요. 급체/배탈 약 좀 주세요.',
    japanese: 'お腹がとても痛くて下痢をしています。胃腸薬か下痢止めをください。',
    furigana: 'おなかが とても いたくて げりを しています。いちょうやくか げりどめを ください。',
    koreanPronunciation: '오나카가 토테모 이타쿠테 게리오 시테 이마스. 이쵸-야쿠카 게리도메오 쿠다사이.',
    expectedReplyJp: 'こちらのお薬が1日3回、食後に飲むタイプです。',
    expectedReplyKo: '이 약이 하루 3번, 식후에 복용하는 타입입니다.',
    keywords: ['배', '아프', '설사', '배탈', '소화제', '체했', 'お腹', '下痢', '胃腸薬'],
  },
  {
    id: 'em-med-3',
    category: 'medical',
    korean: '여행자 보험 청구용 영수증과 진단서를 발급받을 수 있나요?',
    japanese: '旅行保険の申請のため、領収書と診断書を発行してもらえますか？',
    furigana: 'りょこうほけんの しんせいのため、りょうしゅうしょと しんだんしょを はっこうして もらえますか？',
    koreanPronunciation: '료코-호켄노 신세-노 타메, 료-슈-쇼토 신단쇼오 핫코-시테 모라에마스카?',
    expectedReplyJp: 'はい、受付で発行いたします。少々お時間をいただきます。',
    expectedReplyKo: '네, 접수처에서 발급해 드리겠습니다. 시간이 조금 걸립니다.',
    keywords: ['보험', '병원', '영수증', '진단서', '발급', '保険', '診断書', '領収書'],
  },

  // 3. 알레르기 / 식단 제한
  {
    id: 'em-alg-1',
    category: 'allergy',
    korean: '새우·게(갑각류) 알레르기가 있어요. 이 요리에 들어가 있나요?',
    japanese: 'エビとカニ（甲殻類）のアレルギーがあります。この料理に入っていますか？',
    furigana: 'えびと かに（こうかくるい）の あれるぎーが あります。この りょうりに はいっていますか？',
    koreanPronunciation: '에비토 카니(코-카쿠루이)노 아레루기-가 아리마스. 코노 료-리니 하잇테 이마스카?',
    expectedReplyJp: '出汁（だし）にエビが含まれておりますが、抜いてお作りしましょうか？',
    expectedReplyKo: '육수(다시)에 새우가 포함되어 있는데, 빼고 조리해 드릴까요?',
    keywords: ['새우', '게', '갑각류', '알레르기', '알러지', '빼주', '에비', 'エビ', 'アレルギー'],
  },
  {
    id: 'em-alg-2',
    category: 'allergy',
    korean: '와사비(고추냉이)와 고수는 못 먹어요. 빼고 만들어 주세요.',
    japanese: 'わさびとパクチーが食べられません。抜いて作ってください。',
    furigana: 'わさびと ぱくちーが たべられません。ぬいて つくって ください。',
    koreanPronunciation: '와사비토 파쿠치-가 타베라레마센. 누이테 츠쿳테 쿠다사이.',
    expectedReplyJp: 'かしこまりました。わさび抜きでご用意いたします。',
    expectedReplyKo: '알겠습니다. 와사비를 빼고(사비누키) 준비해 드리겠습니다.',
    keywords: ['와사비', '고추냉이', '고수', '못 먹', '빼고', '사비누키', 'わさび', '抜き'],
  },

  // 4. 결제 / 예약 오류
  {
    id: 'em-pay-1',
    category: 'payment',
    korean: '카드가 결제가 안 되네요. 현금(ATM)을 뽑고 올 때까지 잠시만 기다려 주시겠어요?',
    japanese: 'カードが使えないようです。ATMで現金を下ろしてくるまで、少し待ってもらえますか？',
    furigana: 'かーどが つかえないようです。えーてぃーえむで げんきんを おろしてくるまで、すこし まって もらえますか？',
    koreanPronunciation: '카-도가 츠카에나이요-데스. 에-티-에무데 겐킨오 오로시테 쿠루마데, 스코시 맛테 모라에마스카?',
    expectedReplyJp: 'かしこまりました。すぐ隣のコンビニにATMがございますよ。',
    expectedReplyKo: '알겠습니다. 바로 옆 편의점에 ATM이 있습니다.',
    keywords: ['카드', '결제', '안 돼', '안되', '현금', 'ATM', '기다려', 'カード', '現金'],
  },
  {
    id: 'em-pay-2',
    category: 'payment',
    korean: '영수증을 보니 주문하지 않은 메뉴가 하나 더 찍혀 있어요. 확인 부탁드려요.',
    japanese: 'レシートを見たら、頼んでいないメニューが入っています。確認してもらえますか？',
    furigana: 'れしーとを みたら、たのんでいない めにゅーが はいっています。かくにんして もらえますか？',
    koreanPronunciation: '레시-토오 미타라, 타논데 이나이 메뉴-가 하잇테 이마스. 카쿠닌시테 모라에마스카?',
    expectedReplyJp: '大変申し訳ございません！すぐにお会計を訂正いたします。',
    expectedReplyKo: '대단히 죄송합니다! 즉시 계산 내역을 정정해 드리겠습니다.',
    keywords: ['영수증', '계산', '잘못', '주문', '확인', '환불', 'レシート', '間違'],
  },

  // 5. 교통 지연 / 길 잃음
  {
    id: 'em-tr-1',
    category: 'transport_issue',
    korean: '열차가 사고(지연)로 멈췄는데, 공항에 가려면 어떻게 돌아가야 하나요?',
    japanese: '電車が遅延で止まっていますが、空港へ行くにはどう迂回すればいいですか？',
    furigana: 'でんしゃが ちえんで とまっていますが、くうこうへ いくには どう うかいすれば いいですか？',
    koreanPronunciation: '덴샤가 치엔데 토맛테 이마스가, 쿠-코-에 이쿠니와 도- 우카이스레바 이-데스카?',
    expectedReplyJp: '振替輸送（ふりかえゆそう）を行っていますので、地下鉄かリムジンバスをご利用ください。',
    expectedReplyKo: '대체 수송을 실시하고 있으니 지하철이나 리무진버스를 이용해 주세요.',
    keywords: ['열차', '전철', '지연', '멈췄', '공항', '사고', '환승', '電車', '遅延', '空港'],
  },
  {
    id: 'em-tr-2',
    category: 'transport_issue',
    korean: '반대 방향 전철을 잘못 탔어요! 반대편 승강장으로 건너가도 되나요?',
    japanese: '反対方向の電車に間違えて乗ってしまいました。反対側のホームに渡れますか？',
    furigana: 'はんたいほうこうの でんしゃに まちがえて のって しまいました。はんたいがわの ほーむに わたれますか？',
    koreanPronunciation: '한타이 호-코-노 덴샤니 마치가에테 놋테 시마이마시타. 한타이가와노 호-무니 와타레마스카?',
    expectedReplyJp: 'はい、階段を上って向かい側の2番ホームへ移動してください。',
    expectedReplyKo: '네, 계단을 올라가서 맞은편 2번 승강장으로 이동해 주세요.',
    keywords: ['반대', '방향', '잘못', '탔어', '승강장', '홈', '개찰구', '反対', '間違えて'],
  },

  // 6. 긴급 구조 / 파출소 / 통역
  {
    id: 'em-help-1',
    category: 'help',
    korean: '일본어를 잘 못해요. 천천히 쉬운 말로 말씀해 주시거나 번역기에 대고 말씀해 주세요.',
    japanese: '日本語があまり話せません。ゆっくり簡単な言葉で話すか、この翻訳アプリに話してください。',
    furigana: 'にほんごが あまり はなせません。ゆっくり かんたんな ことばで はなすか、この ほんやくあぷりに はなして ください。',
    koreanPronunciation: '니혼고가 아마리 하나세마센. 육쿠리 칸탄나 코토바데 하나스카, 코노 혼야쿠 아푸리니 하나시테 쿠다사이.',
    expectedReplyJp: 'わかりました！ゆっくり話しますね。大丈夫ですよ。',
    expectedReplyKo: '알겠습니다! 천천히 말할게요. 괜찮아요.',
    keywords: ['일본어', '못해', '천천히', '번역기', '쉬운', '도와주', 'ゆっくり', '日本語'],
  },
  {
    id: 'em-help-2',
    category: 'help',
    korean: '위급한 상황입니다. 한국어 통역이나 한국 대사관에 연락할 수 있도록 도와주세요.',
    japanese: '緊急事態です。韓国語の通訳か、韓国大使館に連絡できるよう助けてください。',
    furigana: 'きんきゅうじたいです。かんこくごの つうやくか、かんこくたいしかんに れんらくできるよう たすけて ください。',
    koreanPronunciation: '킨큐-지타이데스. 칸코쿠고노 츠-야쿠카, 칸코쿠 타이시칸니 렌라쿠 데키루요- 타스케테 쿠다사이.',
    expectedReplyJp: 'すぐ警察（110番）か観光ホットラインに電話しますね！',
    expectedReplyKo: '바로 경찰(110번)이나 관광 핫라인에 전화해 드릴게요!',
    keywords: ['위급', '긴급', '대사관', '통역', '도와', '살려', '경찰', '緊急', '助けて'],
  },
];

// 오프라인 단어/표현 조각 사전 (인터넷이 완전히 끊겼을 때 사용자의 임의 문장을 조합 번역하기 위한 로컬 사전)
interface OfflineLexiconEntry {
  koTokens: string[];
  jpWord: string;
  furigana: string;
  koPron: string;
  koMeaning: string;
}

export const OFFLINE_LEXICON: OfflineLexiconEntry[] = [
  { koTokens: ['화장실', '변소'], jpWord: 'お手洗い（トイレ）', furigana: 'おてあらい（といれ）', koPron: '오테아라이(토이레)', koMeaning: '화장실' },
  { koTokens: ['물', '냉수'], jpWord: 'お水', furigana: 'おみず', koPron: '오미즈', koMeaning: '물' },
  { koTokens: ['따뜻한 물', '온수'], jpWord: 'お湯', furigana: 'おゆ', koPron: '오유', koMeaning: '따뜻한 물' },
  { koTokens: ['얼음'], jpWord: '氷', furigana: 'こおり', koPron: '코오리', koMeaning: '얼음' },
  { koTokens: ['콘센트', '충전', '배터리'], jpWord: '充電（コンセント）', furigana: 'じゅうでん（こんせんと）', koPron: '쥬-덴(콘센토)', koMeaning: '충전/콘센트' },
  { koTokens: ['와이파이', '인터넷', '비밀번호'], jpWord: 'Wi-Fiのパスワード', furigana: 'わいふぁいの ぱすわーど', koPron: '와이파이노 파스와-도', koMeaning: '와이파이 비밀번호' },
  { koTokens: ['흡연실', '담배'], jpWord: '喫煙所', furigana: 'きつえんじょ', koPron: '키츠엔죠', koMeaning: '흡연실' },
  { koTokens: ['코인락커', '물품보관함', '보관함'], jpWord: 'コインロッカー', furigana: 'こいんろっかー', koPron: '코인롯카-', koMeaning: '코인락커' },
  { koTokens: ['쓰레기통', '휴지통'], jpWord: 'ゴミ箱', furigana: 'ごみばこ', koPron: '고미바코', koMeaning: '쓰레기통' },
  { koTokens: ['편의점'], jpWord: 'コンビニ', furigana: 'こんびに', koPron: '콘비니', koMeaning: '편의점' },
  { koTokens: ['약국', '드럭스토어'], jpWord: '薬局（ドラッグストア）', furigana: 'やっきょく', koPron: '약쿄쿠', koMeaning: '약국' },
  { koTokens: ['역', '지하철역', '기차역'], jpWord: '駅', furigana: 'えき', koPron: '에키', koMeaning: '역' },
  { koTokens: ['출구'], jpWord: '出口', furigana: 'でぐち', koPron: '데구치', koMeaning: '출구' },
  { koTokens: ['입구'], jpWord: '入り口', furigana: 'いりぐち', koPron: '이리구치', koMeaning: '입구' },
  { koTokens: ['엘리베이터'], jpWord: 'エレベーター', furigana: 'えれべーたー', koPron: '에레베-타-', koMeaning: '엘리베이터' },
  { koTokens: ['택시'], jpWord: 'タクシー', furigana: 'たくしー', koPron: '타쿠시-', koMeaning: '택시' },
  { koTokens: ['버스'], jpWord: 'バス', furigana: 'ばす', koPron: '바스', koMeaning: '버스' },
  { koTokens: ['공항'], jpWord: '空港', furigana: 'くうこう', koPron: '쿠-코-', koMeaning: '공항' },
  { koTokens: ['영수증'], jpWord: 'レシート（領収書）', furigana: 'れしーと', koPron: '레시-토', koMeaning: '영수증' },
  { koTokens: ['봉투', '비닐봉지'], jpWord: '袋', furigana: 'ふくろ', koPron: '후쿠로', koMeaning: '봉투' },
  { koTokens: ['젓가락'], jpWord: 'お箸', furigana: 'おはし', koPron: '오하시', koMeaning: '젓가락' },
  { koTokens: ['숟가락', '스푼'], jpWord: 'スプーン', furigana: 'すぷーん', koPron: '스푼-', koMeaning: '스푼' },
  { koTokens: ['물티슈', '손수건'], jpWord: 'おしぼり', furigana: 'おしぼり', koPron: '오시보리', koMeaning: '물티슈' },
  { koTokens: ['앞접시'], jpWord: '取り皿', furigana: 'とりざら', koPron: '토리자라', koMeaning: '앞접시' },
  { koTokens: ['한국어 메뉴', '영어 메뉴', '메뉴판'], jpWord: '韓国語（英語）のメニュー', furigana: 'かんこくごの めにゅー', koPron: '칸코쿠고노 메뉴-', koMeaning: '한국어 메뉴판' },
];

export interface OfflineTranslationResult {
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanMeaning: string;
  engineType: 'offline-exact' | 'offline-composed' | 'online-ai';
  tip?: string;
}

// 100% 오프라인에서도 작동하는 한↔일 스마트 패턴 번역 함수
export function translateOfflineSmart(
  input: string,
  direction: 'ko-to-jp' | 'jp-to-ko'
): OfflineTranslationResult {
  const clean = input.trim();

  if (direction === 'ko-to-jp') {
    // 1단계: 돌발상황 프리셋 문장과 키워드 매칭
    let bestMatch: EmergencyPhrase | null = null;
    let maxScore = 0;

    for (const phrase of OFFLINE_EMERGENCY_PHRASES) {
      let score = 0;
      if (phrase.korean === clean) {
        score = 100;
      } else {
        for (const kw of phrase.keywords) {
          if (clean.includes(kw)) score += 20;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = phrase;
      }
    }

    if (bestMatch && maxScore >= 35) {
      return {
        japanese: bestMatch.japanese,
        furigana: bestMatch.furigana,
        koreanPronunciation: bestMatch.koreanPronunciation,
        koreanMeaning: bestMatch.korean,
        engineType: 'offline-exact',
        tip: `예상되는 상대방 답변: "${bestMatch.expectedReplyJp}" (${bestMatch.expectedReplyKo})`,
      };
    }

    // 2단계: 명사 어휘 + 문미 패턴("어디", "주세요", "있나요", "되나요", "얼마") 조합 번역
    const matchedLex = OFFLINE_LEXICON.find((entry) =>
      entry.koTokens.some((tok) => clean.includes(tok))
    );

    if (matchedLex) {
      if (clean.includes('어디')) {
        return {
          japanese: `すみません、${matchedLex.jpWord}はどこにありますか？`,
          furigana: `すみません、${matchedLex.furigana}は どこに ありますか？`,
          koreanPronunciation: `스미마센, ${matchedLex.koPron}와 도코니 아리마스카?`,
          koreanMeaning: `저기요, ${matchedLex.koMeaning}은(는) 어디에 있나요?`,
          engineType: 'offline-composed',
          tip: '오프라인 문형 조합 엔진이 [장소/사물 + 위치 질문] 패턴으로 즉시 생성했습니다.',
        };
      }
      if (clean.includes('주세요') || clean.includes('부탁')) {
        return {
          japanese: `すみません、${matchedLex.jpWord}をお願いします。`,
          furigana: `すみません、${matchedLex.furigana}を おねがいします。`,
          koreanPronunciation: `스미마센, ${matchedLex.koPron}오 오네가이시마스.`,
          koreanMeaning: `저기요, ${matchedLex.koMeaning} 좀 부탁드립니다(주세요).`,
          engineType: 'offline-composed',
          tip: '오프라인 문형 조합 엔진이 [사물 + 정중한 요청] 패턴으로 생성했습니다.',
        };
      }
      if (clean.includes('있나요') || clean.includes('있어요') || clean.includes('있습니까')) {
        return {
          japanese: `すみません、${matchedLex.jpWord}はありますか？`,
          furigana: `すみません、${matchedLex.furigana}は ありますか？`,
          koreanPronunciation: `스미마센, ${matchedLex.koPron}와 아리마스카?`,
          koreanMeaning: `저기요, ${matchedLex.koMeaning} 있나요?`,
          engineType: 'offline-composed',
        };
      }
      // 단어만 입력한 경우
      return {
        japanese: `すみません、${matchedLex.jpWord}はどこですか？（または、${matchedLex.jpWord}をお願いします）`,
        furigana: `すみません、${matchedLex.furigana}は どこですか？`,
        koreanPronunciation: `스미마센, ${matchedLex.koPron}와 도코데스카? / ${matchedLex.koPron}오 오네가이시마스`,
        koreanMeaning: `${matchedLex.koMeaning} 어디인가요? / ${matchedLex.koMeaning} 부탁합니다.`,
        engineType: 'offline-composed',
      };
    }

    // 3단계: 일반 문미 의도 기반 폴백
    if (clean.includes('얼마')) {
      return {
        japanese: 'すみません、これはいくらですか？',
        furigana: 'すみません、これは いくらですか？',
        koreanPronunciation: '스미마센, 코레와 이쿠라데스카?',
        koreanMeaning: '저기요, 이것은 얼마인가요?',
        engineType: 'offline-composed',
      };
    }
    if (clean.includes('어디')) {
      return {
        japanese: 'すみません、ここ（これ）はどこにありますか？地図で教えてください。',
        furigana: 'すみません、ここは どこに ありますか？ ちずで おしえて ください。',
        koreanPronunciation: '스미마센, 코코와 도코니 아리마스카? 치즈데 오시에테 쿠다사이.',
        koreanMeaning: '저기요, 여기는 어디에 있나요? 지도로 알려주세요.',
        engineType: 'offline-composed',
      };
    }

    return {
      japanese: `すみません、韓国人旅行者です。「${clean}」について助けてもらえますか？`,
      furigana: 'すみません、かんこくじん りょこうしゃです。たすけて もらえますか？',
      koreanPronunciation: '스미마센, 칸코쿠진 료코-샤데스. 타스케테 모라에마스카?',
      koreanMeaning: `저기요, 한국인 여행객입니다. "${clean}" 관련해서 도와주실 수 있나요?`,
      engineType: 'offline-composed',
      tip: '오프라인 상태에서는 아래 6대 돌발상황 탭의 문장을 선택하시거나 핵심 단어(예: 화장실 어디, 앞접시 주세요, 지갑 분실)를 입력하시면 가장 정확하게 변환됩니다!',
    };
  } else {
    // 일본어 -> 한국어 오프라인 분석
    for (const phrase of OFFLINE_EMERGENCY_PHRASES) {
      if (
        clean.includes(phrase.japanese.slice(0, 6)) ||
        phrase.keywords.some((k) => clean.includes(k))
      ) {
        return {
          japanese: clean,
          furigana: phrase.furigana,
          koreanPronunciation: phrase.koreanPronunciation,
          koreanMeaning: phrase.korean,
          engineType: 'offline-exact',
        };
      }
    }

    if (clean.includes('かしこまりました') || clean.includes('承知')) {
      return {
        japanese: clean,
        furigana: 'かしこまりました',
        koreanPronunciation: '카시코마리마시타',
        koreanMeaning: '네, 알겠습니다 (정중한 접수 표현)',
        engineType: 'offline-composed',
      };
    }
    if (clean.includes('お待ち')) {
      return {
        japanese: clean,
        furigana: 'しょうしょう おまちください',
        koreanPronunciation: '쇼-쇼- 오마치 쿠다사이',
        koreanMeaning: '잠시만 기다려 주십시오.',
        engineType: 'offline-composed',
      };
    }
    if (clean.includes('現金のみ')) {
      return {
        japanese: clean,
        furigana: 'げんきんのみです',
        koreanPronunciation: '겐킨노미데스',
        koreanMeaning: '현금 결제만 가능합니다 (카드 불가).',
        engineType: 'offline-composed',
      };
    }

    return {
      japanese: clean,
      furigana: clean,
      koreanPronunciation: '-',
      koreanMeaning:
        '상대방의 일본어 문장입니다. 온라인 연결 시 상세 번역이 제공되며, 오프라인에서는 핵심 단어(現金=현금, 待ち=대기, 売り切れ=품절, 身分証/パスポート=여권)를 확인하세요.',
      engineType: 'offline-composed',
    };
  }
}
