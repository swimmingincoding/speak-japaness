export type N3PartType = 'verb' | 'noun' | 'adj' | 'expression';

export interface KanjiDetail {
  kanji: string;
  meaningKo: string; // 한자 훈과 음 (예: 거둘 수, 낼 납)
  onyomi: string; // 음독 (가타카나/히라가나)
  kunyomi: string; // 훈독
  strokeOrTip: string; // 암기 팁
}

export interface N3WordItem {
  id: string;
  word: string; // 한자 표기 포함 단어
  furigana: string; // 히라가나 읽기
  koreanPronunciation: string; // 한글 발음
  meaning: string; // 한국어 뜻
  partOfSpeech: N3PartType;
  kanjiBreakdown: KanjiDetail[]; // 포함된 주요 한자 분석
  exampleJp: string; // 실전 회화 예문
  exampleFurigana: string;
  exampleKoPron: string;
  exampleKo: string;
}

export const N3_VOCAB_LIST: N3WordItem[] = [
  {
    id: 'n3-1',
    word: '確認',
    furigana: 'かくにん',
    koreanPronunciation: '카쿠닌',
    meaning: '확인',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '確',
        meaningKo: '굳을 확',
        onyomi: 'カク (카쿠)',
        kunyomi: 'たし(か) (타시카 - 확실함)',
        strokeOrTip: '돌(石)처럼 단단하고 확실하다는 뜻. 確かめる(확인하다)로도 필수!',
      },
      {
        kanji: '認',
        meaningKo: '알 인',
        onyomi: 'ニン (닌)',
        kunyomi: 'みと(める) (미토메루 - 인정하다)',
        strokeOrTip: '말(言)을 참을성(忍) 있게 듣고 인정·인식한다는 뜻.',
      },
    ],
    exampleJp: '予約の内容を確認していただけますか？',
    exampleFurigana: 'よやくの ないようを かくにんして いただけますか？',
    exampleKoPron: '요야쿠노 나이요-오 카쿠닌시테 이타다케마스카?',
    exampleKo: '예약 내용을 확인해 주실 수 있나요?',
  },
  {
    id: 'n3-2',
    word: '両替',
    furigana: 'りょうがえ',
    koreanPronunciation: '료-가에',
    meaning: '환전, 잔돈 교환',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '両',
        meaningKo: '두 량',
        onyomi: 'リョウ (료-)',
        kunyomi: '-',
        strokeOrTip: '양쪽(両親 부모님, 両方 양쪽)을 뜻하는 한자.',
      },
      {
        kanji: '替',
        meaningKo: '바꿀 체',
        onyomi: 'タイ (타이)',
        kunyomi: 'か(える) (카에루 - 바꾸다/교체하다)',
        strokeOrTip: '乗り換え(노리카에, 환승)의 換과 같은 발음이지만 돈/순서를 맞바꿀 때 替를 씁니다.',
      },
    ],
    exampleJp: 'すみません、千円札に両替してもらえますか？',
    exampleFurigana: 'すみません、せんえんさつに りょうがえして もらえますか？',
    exampleKoPron: '스미마센, 센엔사츠니 료-가에시테 모라에마스카?',
    exampleKo: '저기요, 천 엔짜리 지폐로 잔돈 좀 바꿔주실 수 있나요?',
  },
  {
    id: 'n3-3',
    word: '預ける',
    furigana: 'あずける',
    koreanPronunciation: '아즈케루',
    meaning: '(짐이나 물건을 남에게) 맡기다',
    partOfSpeech: 'verb',
    kanjiBreakdown: [
      {
        kanji: '預',
        meaningKo: '맡길 예',
        onyomi: 'ヨ (요)',
        kunyomi: 'あず(ける) (맡기다) / あず(かる) (맡다)',
        strokeOrTip: '손님이 짐을 맡기면 預ける(아즈케루), 직원이 짐을 맡아주면 預かる(아즈카루)!',
      },
    ],
    exampleJp: 'チェックインの前に荷物を預けたいんですが。',
    exampleFurigana: 'ちぇっくいんの まえに にもつを あずけたいんですが。',
    exampleKoPron: '쳇쿠인노 마에니 니모츠오 아즈케타인데스가.',
    exampleKo: '체크인 전에 짐을 맡기고 싶은데요.',
  },
  {
    id: 'n3-4',
    word: '混雑',
    furigana: 'こんざつ',
    koreanPronunciation: '콘자츠',
    meaning: '혼잡, 붐빔',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '混',
        meaningKo: '섞일 혼',
        onyomi: 'コン (콘)',
        kunyomi: 'こ(む) (코무 - 붐비다) / ま(ざる) (섞이다)',
        strokeOrTip: '식당이나 전철이 붐빌 때 「混んでいる(콘데이루)」로도 정말 많이 씁니다.',
      },
      {
        kanji: '雑',
        meaningKo: '섞일 잡',
        onyomi: 'ザツ (자츠)',
        kunyomi: '-',
        strokeOrTip: '雑誌(잡지), 複雑(복잡)에 쓰이는 N3 필수 한자.',
      },
    ],
    exampleJp: '本日は混雑しているため、お席は2時間制となります。',
    exampleFurigana: 'ほんじつは こんざつして いるため、おせきは にじかんせいとなります。',
    exampleKoPron: '혼지츠와 콘자츠시테 이루타메, 오세키와 니지칸세-토 나리마스.',
    exampleKo: '오늘은 매장이 혼잡하여 좌석 이용은 2시간 제한입니다.',
  },
  {
    id: 'n3-5',
    word: '有効期限',
    furigana: 'ゆうこうきげん',
    koreanPronunciation: '유-코-키겐',
    meaning: '유효 기간, 유통기한(상미기한)',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '有',
        meaningKo: '있을 유',
        onyomi: 'ユウ (유-)',
        kunyomi: 'あ(る) (아루 - 있다)',
        strokeOrTip: '有名(유명), 有料(유료) 등에 쓰입니다.',
      },
      {
        kanji: '効',
        meaningKo: '본받을 효',
        onyomi: 'コウ (코-)',
        kunyomi: 'き(く) (키쿠 - 약효/효과가 듣다)',
        strokeOrTip: '드럭스토어에서 「痛みに効く(통증에 잘 듣는다)」로 자주 보게 되는 한자!',
      },
      {
        kanji: '限',
        meaningKo: '한할 한',
        onyomi: 'ゲン (겐)',
        kunyomi: 'かぎ(る) (카기루 - 제한하다/한정하다)',
        strokeOrTip: '期間限定(기간 한정)의 바로 그 한자입니다.',
      },
    ],
    exampleJp: 'この乗車券の有効期限は今日までです。',
    exampleFurigana: 'この じょうしゃけんの ゆうこうきげんは きょうまでです。',
    exampleKoPron: '코노 죠-샤켄노 유-코-키겐와 쿄-마데데스.',
    exampleKo: '이 승차권의 유효기간은 오늘까지입니다.',
  },
  {
    id: 'n3-6',
    word: '払い戻し',
    furigana: 'はらいもどし',
    koreanPronunciation: '하라이모도시',
    meaning: '환불, 반환',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '払',
        meaningKo: '떨 불 (지불할 불)',
        onyomi: 'フツ (후츠)',
        kunyomi: 'はら(う) (하라우 - 지불하다)',
        strokeOrTip: '支払い(시하라이, 결제/지불)에 들어가는 핵심 한자.',
      },
      {
        kanji: '戻',
        meaningKo: '돌아올 려',
        onyomi: 'レイ (레-)',
        kunyomi: 'もど(す) (돌려놓다) / もど(る) (돌아오다)',
        strokeOrTip: '지불한(払) 돈을 다시 되돌려준다(戻)는 뜻이 합쳐져 환불이 됩니다.',
      },
    ],
    exampleJp: '切符を間違えて買ったので、払い戻しはできますか？',
    exampleFurigana: 'きっぷを まちがえて かったので、はらいもどしは できますか？',
    exampleKoPron: '킵푸오 마치가에테 캇타노데, 하라이모도시와 데키마스카?',
    exampleKo: '표를 잘못 사서 그러는데, 환불이 가능한가요?',
  },
  {
    id: 'n3-7',
    word: '遠慮',
    furigana: 'えんりょ',
    koreanPronunciation: '엔료',
    meaning: '사양, 삼감 (접객어: ~하지 마십시오)',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '遠',
        meaningKo: '멀 원',
        onyomi: 'エン (엔)',
        kunyomi: 'とお(い) (토오이 - 멀다)',
        strokeOrTip: '멀리 생각하고 조심한다는 뜻.',
      },
      {
        kanji: '慮',
        meaningKo: '생각할 려',
        onyomi: 'リョ (료)',
        kunyomi: '-',
        strokeOrTip: '配慮(배려)에도 쓰이는 한자입니다.',
      },
    ],
    exampleJp: '店内での撮影はご遠慮ください。',
    exampleFurigana: 'てんないでの さつえいは ごえんりょ ください。',
    exampleKoPron: '텐나이데노 사츠에-와 고엔료 쿠다사이.',
    exampleKo: '매장 내 촬영은 삼가 주십시오. (일본 안내문 1순위 표현!)',
  },
  {
    id: 'n3-8',
    word: '届ける',
    furigana: 'とどける',
    koreanPronunciation: '토도케루',
    meaning: '(분실물 등을) 신고하다, 배달/전달하다',
    partOfSpeech: 'verb',
    kanjiBreakdown: [
      {
        kanji: '届',
        meaningKo: '이를 계',
        onyomi: 'カイ (카이)',
        kunyomi: 'とど(ける) (보내다/신고하다) / とど(く) (도착하다)',
        strokeOrTip: '분실물 신고서나 서류를 낼 때도 届(토도케)라고 합니다.',
      },
    ],
    exampleJp: '財布をなくしたので、交番に届けたいです。',
    exampleFurigana: 'さいふを なくしたので、こうばんに とどけたいです。',
    exampleKoPron: '사이후오 나쿠시타노데, 코-반니 토도케타이데스.',
    exampleKo: '지갑을 잃어버려서 파출소(코반)에 분실 신고를 하고 싶습니다.',
  },
  {
    id: 'n3-9',
    word: '都合',
    furigana: 'つごう',
    koreanPronunciation: '츠고-',
    meaning: '형편, 사정, 스케줄 편의',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '都',
        meaningKo: '도읍 도',
        onyomi: 'ト (토) / ツ (츠)',
        kunyomi: 'みやこ (미야코)',
        strokeOrTip: '東京都(도쿄도) 할 때는 ト, 都合(형편) 할 때는 ツ로 읽는 시험 단골 한자!',
      },
      {
        kanji: '合',
        meaningKo: '합할 합',
        onyomi: 'ゴウ (고-)',
        kunyomi: 'あ(う) (아우 - 맞다)',
        strokeOrTip: '시간이나 조건이 서로 맞물린다는 뜻.',
      },
    ],
    exampleJp: '明日の10時はご都合いかがでしょうか？',
    exampleFurigana: 'あしたの じゅうじは ごつごう いかがでしょうか？',
    exampleKoPron: '아시타노 쥬-지와 고츠고- 이카가데쇼-카?',
    exampleKo: '내일 10시는 시간(사정)이 괜찮으실까요?',
  },
  {
    id: 'n3-10',
    word: '売り切れ',
    furigana: 'うりきれ',
    koreanPronunciation: '우리키레',
    meaning: '매진, 품절 (Sold Out)',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '売',
        meaningKo: '팔 매',
        onyomi: 'バイ (바이)',
        kunyomi: 'う(る) (우루 - 팔다)',
        strokeOrTip: '식권 자판기(券売機 켄바이키)에 빨간 불로 売切가 떠 있으면 품절입니다!',
      },
      {
        kanji: '切',
        meaningKo: '끊을 절',
        onyomi: 'セツ (세츠)',
        kunyomi: 'き(る) (키루 - 자르다/다 떨어지다)',
        strokeOrTip: '다 팔려서 끊어졌다(바닥났다)는 뜻.',
      },
    ],
    exampleJp: '申し訳ございません、限定プリンは売り切れました。',
    exampleFurigana: 'もうしわけ ございません、げんていぷりんは うりきれました。',
    exampleKoPron: '모-시와케 고자이마센, 겐테- 푸린와 우리키레마시타.',
    exampleKo: '죄송합니다만, 한정 푸딩은 품절되었습니다.',
  },
  {
    id: 'n3-11',
    word: '乗り遅れる',
    furigana: 'のりおくれる',
    koreanPronunciation: '노리오쿠레루',
    meaning: '(전철·버스·비행기를) 놓치다',
    partOfSpeech: 'verb',
    kanjiBreakdown: [
      {
        kanji: '乗',
        meaningKo: '탈 승',
        onyomi: 'ジョウ (죠-)',
        kunyomi: 'の(る) (노루 - 타다)',
        strokeOrTip: '탑승하다(乗車)의 한자.',
      },
      {
        kanji: '遅',
        meaningKo: '늦을 지',
        onyomi: 'チ (치)',
        kunyomi: 'おく(れる) (오쿠레루 - 늦다) / おそ(い) (오소이 - 느리다)',
        strokeOrTip: '타는(乗) 것에 늦다(遅れる)가 합쳐져 교통수단을 놓치다는 뜻이 됩니다.',
      },
    ],
    exampleJp: '終電に乗り遅れてしまいました。',
    exampleFurigana: 'しゅうでんに のりおくれて しまいました。',
    exampleKoPron: '슈-덴니 노리오쿠레테 시마이마시타.',
    exampleKo: '막차를 놓쳐버렸습니다.',
  },
  {
    id: 'n3-12',
    word: '勘定 / 会計',
    furigana: 'かんじょう / かいけい',
    koreanPronunciation: '칸죠- / 카이케-',
    meaning: '계산, 셈 (식당 결제)',
    partOfSpeech: 'noun',
    kanjiBreakdown: [
      {
        kanji: '勘',
        meaningKo: '헤아릴 감',
        onyomi: 'カン (칸)',
        kunyomi: '-',
        strokeOrTip: '노포 이자카야에서는 お会計 대신 「お勘定(오칸죠-)」도 정말 많이 씁니다.',
      },
      {
        kanji: '定',
        meaningKo: '정할 정',
        onyomi: 'テイ (테-) / ジョウ (죠-)',
        kunyomi: 'さだ(める) (사다메루)',
        strokeOrTip: '予定(예정), 定食(정식)에는 テイ, 勘定(계산)에는 ジョウ로 읽습니다.',
      },
    ],
    exampleJp: 'すみません、お勘定（お会計）をお願いします。',
    exampleFurigana: 'すみません、おかんじょう（おかいけい）を おねがいします。',
    exampleKoPron: '스미마센, 오칸죠-(오카이케-)오 오네가이시마스.',
    exampleKo: '저기요, 계산 부탁합니다.',
  },
];
