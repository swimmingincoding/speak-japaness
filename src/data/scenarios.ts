import { Scenario, CategoryType } from '../types/conversation';

export const CATEGORY_META: Record<
  CategoryType,
  { label: string; emoji: string; desc: string; badgeColor: string }
> = {
  restaurant: {
    label: '식당 · 이자카야',
    emoji: '🍣',
    desc: '입장 인원 확인, 카운터/테이블 안내, 오토시, 주문 및 계산',
    badgeColor: 'from-rose-500 to-orange-500',
  },
  convenience: {
    label: '편의점 · 드럭스토어',
    emoji: '🏪',
    desc: '도시락 데우기, 봉투·젓가락 질문, 면세(Tax-Free) 및 결제',
    badgeColor: 'from-emerald-500 to-teal-500',
  },
  hotel: {
    label: '호텔 · 료칸',
    emoji: '🏨',
    desc: '체크인, 여권·숙박세 안내, 짐 맡기기, 조식·대욕장 이용',
    badgeColor: 'from-indigo-500 to-blue-500',
  },
  transport: {
    label: '교통 · 길 찾기',
    emoji: '🚆',
    desc: '역무원 환승/승강장 문의, IC카드(스이카) 오류, 택시 이동',
    badgeColor: 'from-amber-500 to-yellow-500',
  },
};

export interface KeigoEssential {
  id: string;
  casualOrTextbook: string;
  casualMeaning: string;
  staffKeigo: string;
  staffReading: string;
  staffKoreanPron: string;
  meaning: string;
  whyConfusing: string;
  exampleInStore: string;
  exampleReading: string;
  exampleKorean: string;
}

export const STAFF_KEIGO_ESSENTIALS: KeigoEssential[] = [
  {
    id: 'keigo-1',
    casualOrTextbook: 'わかりました (와카리마시타)',
    casualMeaning: '알겠습니다',
    staffKeigo: 'かしこまりました / 承知いたしました',
    staffReading: 'かしこまりました / しょうちいたしました',
    staffKoreanPron: '카시코마리마시타 / 쇼-치 이타시마시타',
    meaning: '(정중하게) 알겠습니다, 주문/요청 접수했습니다',
    whyConfusing:
      '교과서에서는 "와카리마시타"만 배우지만, 실제 일본 매장 직원은 손님에게 절대 "와카리마시타"라고 하지 않고 99% "카시코마리마시타"라고 대답합니다!',
    exampleInStore: '生ビール二つですね。かしこまりました！',
    exampleReading: 'なまびーる ふたつですね。かしこまりました！',
    exampleKorean: '생맥주 두 잔이시군요. 알겠습니다!',
  },
  {
    id: 'keigo-2',
    casualOrTextbook: '店内ですか、持ち帰りですか？',
    casualMeaning: '매장 식사인가요, 포장인가요?',
    staffKeigo: 'お召し上がりですか、お持ち帰りですか？',
    staffReading: 'おめしあがりですか、おもちかえりですか？',
    staffKoreanPron: '오메시아가리데스카, 오모치카에리데스카?',
    meaning: '드시고 가시나요, 가져가시나요(포장)?',
    whyConfusing:
      '먹다(타베루)의 높임말인 "메시아가루(召し上がる = 잡수시다)"를 써서 순식간에 물어보기 때문에 "타베루"를 기다리던 여행객은 얼어붙게 됩니다.',
    exampleInStore: 'こちらでお召し上がりですか？',
    exampleReading: 'こちらでおめしあがりですか？',
    exampleKorean: '이곳(매장)에서 드시고 가시나요?',
  },
  {
    id: 'keigo-3',
    casualOrTextbook: '温めますか？ (아타타메마스카?)',
    casualMeaning: '데워 드릴까요?',
    staffKeigo: 'お弁当、お温めいたしますか？',
    staffReading: 'おべんとう、おあたためいたしますか？',
    staffKoreanPron: '오벤토-, 오아타타메 이타시마스카?',
    meaning: '도시락 데워 드릴까요?',
    whyConfusing:
      '편의점에서 바코드를 찍자마자 0.5초 만에 물어보는 단골 질문입니다. "아타타메(데움)" 단어 하나만 귀에 꽂히면 바로 "오네가이시마스!"라고 답할 수 있습니다.',
    exampleInStore: 'こちら、お温めいたしますか？',
    exampleReading: 'こちら、おあたためいたしますか？',
    exampleKorean: '이 상품, 데워 드릴까요?',
  },
  {
    id: 'keigo-4',
    casualOrTextbook: '袋はいりますか？ (후쿠로와 이리마스카?)',
    casualMeaning: '봉투 필요하세요?',
    staffKeigo: 'レジ袋はご利用ですか？ / 袋にお入れしますか？',
    staffReading: 'れじぶくろは ごりようですか？ / ふくろに おいれしますか？',
    staffKoreanPron: '레지부쿠로와 고리요-데스카? / 후쿠로니 오이레시마스카?',
    meaning: '비닐봉투 이용하시나요? / 봉투에 넣어 드릴까요?',
    whyConfusing:
      '단순히 "후쿠로?"라고 묻기도 하지만, "레지부쿠로(계산대 봉투)"나 "고리요-(이용)"라는 한자어로 정중하게 물어보는 경우가 많습니다.',
    exampleInStore: '袋はご利用になられますか？',
    exampleReading: 'ふくろは ごりように なられますか？',
    exampleKorean: '봉투는 사용하시겠어요?',
  },
  {
    id: 'keigo-5',
    casualOrTextbook: '何人ですか？ (난닌데스카?)',
    casualMeaning: '몇 명인가요?',
    staffKeigo: '何名様でいらっしゃいますか？',
    staffReading: 'なんめいさまで いらっしゃいますか？',
    staffKoreanPron: '난메-사마데 이랏샤이마스카?',
    meaning: '몇 분이신가요?',
    whyConfusing:
      '사람 수를 셀 때 "닌(人)" 대신 높임 표현인 "메이사마(名様 = ~분)"를 쓰고, "~데스카" 대신 "~데 이랏샤이마스카(~이십니까)"를 붙입니다.',
    exampleInStore: 'いらっしゃいませ！何名様ですか？',
    exampleReading: 'いらっしゃいませ！なんめいさまですか？',
    exampleKorean: '어서 오세요! 몇 분이신가요?',
  },
  {
    id: 'keigo-6',
    casualOrTextbook: 'これで全部ですか？',
    casualMeaning: '이걸로 전부인가요?',
    staffKeigo: 'ご注文は以上でよろしいでしょうか？',
    staffReading: 'ごちゅうもんは いじょうで よろしいでしょうか？',
    staffKoreanPron: '고츄-몬와 이죠-데 요로시-데쇼-카?',
    meaning: '주문은 이상으로 괜찮으실까요(다 되셨을까요)?',
    whyConfusing:
      '"이죠-(以上, 이상)"와 "요로시-데쇼-카(괜찮으실까요)"가 합쳐져 주문을 마무리할 때 모든 식당 직원이 기계처럼 쓰는 표현입니다.',
    exampleInStore: '以上でよろしいでしょうか？',
    exampleReading: 'いじょうで よろしいでしょうか？',
    exampleKorean: '이걸로 주문 다 되셨을까요?',
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'izakaya-entry-order',
    category: 'restaurant',
    title: '이자카야 입장부터 첫 주문까지',
    subtitle: '인원수 확인 · 카운터석 안내 · 먼저 마실 음료 주문',
    placeName: '신주쿠 꼬치구이 이자카야 (鳥貴族 스타일)',
    difficulty: '초급',
    estimatedMinutes: 5,
    customerRoleName: '여행객 손님 (A)',
    staffRoleName: '이자카야 점원 (B)',
    situationBrief:
      '저녁 8시, 도쿄의 활기찬 이자카야에 들어섰습니다. 점원이 반갑게 맞이하며 인원수와 좌석 형태를 묻고, 자리에 앉자마자 첫 음료(오토시와 함께)를 주문받습니다.',
    whyHardToUnderstand:
      '일본 이자카야에서는 들어오자마자 "난메-사마(몇 분)", "카운타-세키(바 좌석)" 여부를 빠르게 물어보고, 앉자마자 음식보다 "오노미모노(마실 것)"부터 먼저 물어보는 문화가 있습니다.',
    keyTakeaways: [
      '인원수 말하기: 손가락과 함께 "후타리데스(2명입니다)" 또는 "히토리데스(1명입니다)"',
      '좌석 확인: "카운타-세키데모 요로시-데스카?(카운터석도 괜찮으신가요?)" 알아듣기',
      '첫 주문 필수 단어: "토리아에즈(일단은)" + "나마 후타츠(생맥주 2잔)"',
    ],
    turns: [
      {
        id: 'iz-1',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'いらっしゃいませ！何名様でいらっしゃいますか？',
        furigana: 'いらっしゃいませ！ なんめいさまで いらっしゃいますか？',
        koreanPronunciation: '이랏샤이마세! 난메-사마데 이랏샤이마스카?',
        koreanTranslation: '어서 오세요! 몇 분이신가요?',
        literalMeaning: '어서 오세요! 몇 명님(何名様)으로 계십니까(いらっしゃいますか)?',
        realLifeTip:
          '시끄러운 이자카야에서는 "난메-사마데스카~!"라고 끝을 길게 늘여서 말합니다. 손가락으로 인원수를 함께 보여주면 훨씬 잘 통합니다.',
        staffKeigoPoint:
          '"난닌(何人)" 대신 손님을 높여 부르는 "난메-사마(何名様)"를 씁니다. 내가 점원 역할을 할 때도 밝고 힘차게 외쳐보세요!',
        vocab: [
          { word: '何名様', reading: 'なんめいさま', koreanPronunciation: '난메-사마', meaning: '몇 분 (인원수 높임말)' },
          { word: 'いらっしゃいますか', reading: 'いらっしゃいますか', koreanPronunciation: '이랏샤이마스카', meaning: '~이십니까 / 계십니까' },
        ],
      },
      {
        id: 'iz-2',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: '二人です。予約はしていないんですが、入れますか？',
        furigana: 'ふたりです。よやくは していないんですが、はいれますか？',
        koreanPronunciation: '후타리데스. 요야쿠와 시테 이나인데스가, 하이레마스카?',
        koreanTranslation: '두 명입니다. 예약은 안 했는데 들어갈 수 있나요?',
        literalMeaning: '두 사람입니다. 예약은 하지 않았습니다만, 들어갈 수 있습니까?',
        realLifeTip:
          '예약 없이 맛집이나 이자카야에 갈 때 "요야쿠와 시테 이나인데스가(예약은 안 했는데...)"를 쓰면 점원이 바로 빈자리를 확인해 줍니다.',
        vocab: [
          { word: '二人', reading: 'ふたり', koreanPronunciation: '후타리', meaning: '두 명 (1명은 히토리, 3명은 산닌)' },
          { word: '予約', reading: 'よやく', koreanPronunciation: '요야쿠', meaning: '예약' },
          { word: '入れますか', reading: 'はいれますか', koreanPronunciation: '하이레마스카', meaning: '들어갈 수 있나요? (입장 가능 여부)' },
        ],
        alternatives: [
          {
            japanese: '一人です。空いている席はありますか？',
            furigana: 'ひとりです。あいている せきは ありますか？',
            koreanPronunciation: '히토리데스. 아이테이루 세키와 아리마스카?',
            koreanTranslation: '한 명입니다. 빈자리가 있나요?',
            nuance: '혼술/혼밥러일 때 가장 자연스럽게 쓰는 표현',
          },
          {
            japanese: '二人なんですけど、いけますか？',
            furigana: 'ふたりなんですけど、いけますか？',
            koreanPronunciation: '후타리난데스케도, 이케마스카?',
            koreanTranslation: '두 명인데, 가능할까요?',
            nuance: '일본 젊은 층이 실생활에서 정말 많이 쓰는 구어체("이케마스카? = 되나요?")',
          },
        ],
      },
      {
        id: 'iz-3',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'はい、ご案内いたします！カウンター席でもよろしいでしょうか？',
        furigana: 'はい、ごあんない いたします！ かうんたーせきでも よろしいでしょうか？',
        koreanPronunciation: '하이, 고안나이 이타시마스! 카운타-세키데모 요로시-데쇼-카?',
        koreanTranslation: '네, 안내해 드리겠습니다! 카운터석(바 좌석)도 괜찮으실까요?',
        literalMeaning: '네, 안내해 드리겠습니다! 카운터 좌석이라도 좋겠습니까?',
        realLifeTip:
          '테이블석이 만석일 때 점원이 무조건 물어보는 질문입니다. "카운타-(카운터)" 또는 "테-부루(테이블)" 단어를 주의 깊게 들어보세요.',
        staffKeigoPoint:
          '"이이데스카(괜찮나요?)" 대신 "요로시-데쇼-카(괜찮으실까요?)"를 쓰면 훨씬 정중한 접객 일본어가 됩니다.',
        vocab: [
          { word: 'ご案内', reading: 'ごあんない', koreanPronunciation: '고안나이', meaning: '안내' },
          { word: 'カウンター席', reading: 'かうんたーせき', koreanPronunciation: '카운타-세키', meaning: '카운터석 (바 테이블 좌석)' },
          { word: 'よろしいでしょうか', reading: 'よろしいでしょうか', koreanPronunciation: '요로시-데쇼-카', meaning: '괜찮으실까요?' },
        ],
      },
      {
        id: 'iz-4',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'はい、大丈夫です。お願いします。',
        furigana: 'はい、だいじょうぶです。おねがいします。',
        koreanPronunciation: '하이, 다이죠-부데스. 오네가이시마스.',
        koreanTranslation: '네, 괜찮습니다. 부탁드려요.',
        realLifeTip:
          '일본 여행 만능 긍정 답변! 점원이 무언가 제안했을 때 좋으면 "하이, 다이죠-부데스(네, 괜찮아요)"라고 하면 만사형통입니다.',
        vocab: [
          { word: '大丈夫', reading: 'だいじょうぶ', koreanPronunciation: '다이죠-부', meaning: '괜찮음, 문제없음' },
          { word: 'お願いします', reading: 'おねがいします', koreanPronunciation: '오네가이시마스', meaning: '부탁합니다' },
        ],
        alternatives: [
          {
            japanese: 'テーブル席は空いていませんか？',
            furigana: 'てーぶるせきは あいていませんか？',
            koreanPronunciation: '테-부루세키와 아이테 이마센카?',
            koreanTranslation: '테이블석은 비어 있지 않나요?',
            nuance: '카운터석 대신 테이블석에 앉고 싶을 때 정중히 물어보는 표현',
          },
        ],
      },
      {
        id: 'iz-5',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'こちらへどうぞ。まずお飲み物は何になさいますか？',
        furigana: 'こちらへ どうぞ。まず おのみものは なにに なさいますか？',
        koreanPronunciation: '코치라에 도-조. 마즈 오노미모노와 나니니 나사이마스카?',
        koreanTranslation: '이쪽으로 오세요. 먼저 마실 것은 무엇으로 하시겠어요?',
        literalMeaning: '이쪽으로 부디. 우선 음료는 무엇으로 하시겠습니까(なさいますか)?',
        realLifeTip:
          '일본 이자카야는 자리에 앉자마자 안주보다 음료(술/음료수) 주문을 먼저 받는 것이 국룰입니다! "마즈 오노미모노와~(우선 음료는~)"가 들리면 마실 것부터 말해주세요.',
        staffKeigoPoint:
          '"나니니 시마스카(무엇으로 할래요?)"의 존경어인 "나니니 나사이마스카(무엇으로 하시겠습니까?)"를 사용합니다.',
        vocab: [
          { word: 'まず', reading: 'まず', koreanPronunciation: '마즈', meaning: '우선, 먼저' },
          { word: 'お飲み物', reading: 'おのみもの', koreanPronunciation: '오노미모노', meaning: '마실 것, 음료' },
          { word: '何になさいますか', reading: 'なにになさいますか', koreanPronunciation: '나니니 나사이마스카', meaning: '무엇으로 하시겠습니까?' },
        ],
      },
      {
        id: 'iz-6',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'とりあえず生ビールを二つください。食べ物はもう少し見てから頼みます。',
        furigana: 'とりあえず なまびーるを ふたつ ください。たべものは もうすこし みてから たのみます。',
        koreanPronunciation: '토리아에즈 나마비-루오 후타츠 쿠다사이. 타베모노와 모-스코시 미테카라 타노미마스.',
        koreanTranslation: '일단은 생맥주 두 잔 주세요. 음식은 조금만 더 보고 주문할게요.',
        realLifeTip:
          '"토리아에즈 나마!(일단은 생맥주!)"는 일본 직장인들이 이자카야에 앉자마자 외치는 소울 구호입니다. 안주를 아직 못 골랐을 때 "타베모노와 모-스코시 미테카라(음식은 좀 더 보고 나서)"라고 하면 점원이 기다려줍니다.',
        vocab: [
          { word: 'とりあえず', reading: 'とりあえず', koreanPronunciation: '토리아에즈', meaning: '일단은, 우선은' },
          { word: '生ビール', reading: 'なまびーる', koreanPronunciation: '나마비-루', meaning: '생맥주' },
          { word: '見てから', reading: 'みてから', koreanPronunciation: '미테카라', meaning: '(메뉴를) 보고 나서' },
          { word: '頼みます', reading: 'たのみます', koreanPronunciation: '타노미마스', meaning: '주문하겠습니다 / 부탁합니다' },
        ],
        alternatives: [
          {
            japanese: '生一つと、レモンサワーを一つお願いします。',
            furigana: 'なま ひとつと、れもんさわーを ひとつ おねがいします。',
            koreanPronunciation: '나마 히토츠토, 레몬사와-오 히토츠 오네가이시마스.',
            koreanTranslation: '생맥주 한 잔이랑 레몬사와 한 잔 부탁해요.',
            nuance: '서로 다른 음료를 시킬 때 가장 많이 쓰는 패턴',
          },
        ],
      },
      {
        id: 'iz-7',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'かしこまりました！生ビールお二つですね。少々お待ちくださいませ。',
        furigana: 'かしこまりました！ なまびーる おふたつですね。しょうしょう おまちくださいませ。',
        koreanPronunciation: '카시코마리마시타! 나마비-루 오후타츠데스네. 쇼-쇼- 오마치 쿠다사이마세.',
        koreanTranslation: '알겠습니다! 생맥주 두 잔이시군요. 잠시만 기다려 주십시오.',
        realLifeTip:
          '점원이 주문을 복창한 뒤 "카시코마리마시타(알겠습니다)" + "쇼-쇼- 오마치 쿠다사이마세(잠시만 기다려 주세요)" 세트로 마무리합니다.',
        staffKeigoPoint:
          '"와카리마시타"가 아닌 "카시코마리마시타!", "촛토 맛테"가 아닌 "쇼-쇼- 오마치 쿠다사이마세!"가 접객의 핵심입니다.',
        vocab: [
          { word: 'かしこまりました', reading: 'かしこまりました', koreanPronunciation: '카시코마리마시타', meaning: '알겠습니다 (정중한 표현)' },
          { word: '少々', reading: 'しょうしょう', koreanPronunciation: '쇼-쇼-', meaning: '잠시, 조금 (접객어)' },
          { word: 'お待ちくださいませ', reading: 'おまちくださいませ', koreanPronunciation: '오마치 쿠다사이마세', meaning: '기다려 주십시오' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-iz-s1',
          speaker: 'staff',
          speakerLabel: '이자카야 점원',
          japanese: 'いらっしゃいませ！何名様でいらっしゃいますか？',
          furigana: 'いらっしゃいませ！ なんめいさまで いらっしゃいますか？',
          koreanPronunciation: '이랏샤이마세! 난메-사마데 이랏샤이마스카?',
          koreanTranslation: '어서 오세요! 몇 분이신가요?',
          realLifeTip: '인원수와 예약 여부를 말해보세요!',
          vocab: [],
        },
        missions: [
          '인원수(예: 2명)를 말하고 자리 있는지 물어보기',
          '선호하는 좌석(카운터석 또는 테이블석) 수락하기',
          '생맥주나 하이볼, 추천 안주(야키토리 등) 주문하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-iz-c1',
          speaker: 'customer',
          speakerLabel: '일본인 손님',
          japanese: 'すみません、二人なんですけど、今入れますか？',
          furigana: 'すみません、ふたりなんですけど、いま はいれますか？',
          koreanPronunciation: '스미마센, 후타리난데스케도, 이마 하이레마스카?',
          koreanTranslation: '저기요, 두 명인데 지금 들어갈 수 있나요?',
          realLifeTip: '점원이 되어 손님을 반갑게 맞이하고 좌석 안내 및 첫 음료 주문을 받아보세요!',
          vocab: [],
        },
        missions: [
          '손님에게 카운터석(또는 테이블석)으로 안내하겠다고 정중히 말하기',
          '자리에 앉은 손님에게 첫 음료(お飲み物)가 무엇인지 물어보기',
          '주문을 복창하고 "かしこまりました(카시코마리마시타)"로 응대하기',
        ],
      },
    },
  },
  {
    id: 'restaurant-bill-payment',
    category: 'restaurant',
    title: '식당 추천 메뉴 질문 & 계산하기',
    subtitle: '오늘의 추천 메뉴 · 계산서 요청 · 더치페이/카드 결제',
    placeName: '오사카 로컬 스시 & 해산물 식당',
    difficulty: '중급',
    estimatedMinutes: 5,
    customerRoleName: '여행객 손님 (A)',
    staffRoleName: '식당 종업원 (B)',
    situationBrief:
      '메뉴판에 일본어 손글씨로 적힌 오늘의 추천 메뉴가 궁금해 종업원에게 물어보고, 식사를 마친 뒤 자리에서 계산서를 요청해 카드로 결제하는 상황입니다.',
    whyHardToUnderstand:
      '계산할 때 점원이 "오카이케-와 아치라데(계산은 저쪽 카운터에서)", "벳츠베츠(각자 계산) vs 이카츠(한꺼번에)", "타치 케-사이(터치 결제)" 등 빠른 속도로 결제 관련 단어를 말합니다.',
    keyTakeaways: [
      '추천 메뉴 묻기: "오스스메와 난데스카?(추천 메뉴는 뭔가요?)"',
      '계산 요청하기: "오카이케- 오네가이시마스(계산 부탁합니다)"',
      '결제 수단 확인: "쿠레짓토 카-도 이케마스카?(신용카드 되나요?)"',
    ],
    turns: [
      {
        id: 'rb-1',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'すみません、今日のおすすめは何ですか？',
        furigana: 'すみません、きょうの おすすめは なんですか？',
        koreanPronunciation: '스미마센, 쿄-노 오스스메와 난데스카?',
        koreanTranslation: '저기요, 오늘의 추천 메뉴는 무엇인가요?',
        realLifeTip:
          '메뉴판이 한자 투성이거나 무엇을 시킬지 고민될 때 "오스스메와 난데스카?" 한마디면 그 가게의 시그니처 메뉴를 바로 추천받을 수 있습니다.',
        vocab: [
          { word: '今日', reading: 'きょう', koreanPronunciation: '쿄-', meaning: '오늘' },
          { word: 'おすすめ', reading: 'おすすめ', koreanPronunciation: '오스스메', meaning: '추천 (메뉴/상품)' },
        ],
        alternatives: [
          {
            japanese: '一番人気のメニューは何ですか？',
            furigana: 'いちばん にんきの めにゅーは なんですか？',
            koreanPronunciation: '이치반 닌키노 메뉴-와 난데스카?',
            koreanTranslation: '제일 인기 있는 메뉴는 뭔가요?',
            nuance: '가장 많이 팔리는 베스트셀러 메뉴를 묻고 싶을 때',
          },
        ],
      },
      {
        id: 'rb-2',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: '本日は新鮮な本マグロのお刺身がおすすめです！すぐお出しできますよ。',
        furigana: 'ほんじつは しんせんな ほんまぐろの おさしみが おすすめです！ すぐ おだしできますよ。',
        koreanPronunciation: '혼지츠와 신센나 혼마구로노 오사시미가 오스스메데스! 스구 오다시 데키마스요.',
        koreanTranslation: '오늘은 신선한 참다랑어 회가 추천 메뉴입니다! 바로 내어드릴 수 있어요.',
        realLifeTip:
          '점원이 "스구 오다시 데키마스(금방 내어드릴 수 있어요)"라고 하면 조리 시간 없이 바로 나오는 메뉴라는 뜻입니다.',
        staffKeigoPoint:
          '"쿄-(오늘)" 대신 격식 있는 "혼지츠(本日, 금일)"를, "다세마스(낼 수 있다)" 대신 겸양어 "오다시 데키마스(내어드릴 수 있습니다)"를 씁니다.',
        vocab: [
          { word: '本日', reading: 'ほんじつ', koreanPronunciation: '혼지츠', meaning: '금일, 오늘 (정중한 표현)' },
          { word: 'お刺身', reading: 'おさしみ', koreanPronunciation: '오사시미', meaning: '생선회' },
          { word: 'すぐお出しできます', reading: 'すぐおだしできます', koreanPronunciation: '스구 오다시 데키마스', meaning: '금방 내어드릴 수 있습니다' },
        ],
      },
      {
        id: 'rb-3',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'じゃあ、それをお願いします。あと、お会計も一緒にお願いできますか？',
        furigana: 'じゃあ、それを おねがいします。あと、おかいけいも いっしょに おねがいできますか？',
        koreanPronunciation: '쟈-, 소레오 오네가이시마스. 아토, 오카이케-모 잇쇼니 오네가이 데키마스카?',
        koreanTranslation: '그럼 그걸로 부탁해요. 그리고(식사 후) 계산도 부탁드릴 수 있을까요?',
        realLifeTip:
          '메뉴 이름을 다시 발음하기 어려울 땐 손가락으로 가리키거나 방금 점원이 말한 것을 받아 "쟈-, 소레오 오네가이시마스(그럼 그걸로 주세요!)"라고 하면 완벽합니다.',
        vocab: [
          { word: 'それ', reading: 'それ', koreanPronunciation: '소레', meaning: '그것 (상대방이 방금 말한 것)' },
          { word: 'お会計', reading: 'おかいけい', koreanPronunciation: '오카이케-', meaning: '계산, 결제' },
        ],
      },
      {
        id: 'rb-4',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'ありがとうございます。お会計はご一緒でよろしいでしょうか？',
        furigana: 'ありがとうございます。おかいけいは ごいっしょで よろしいでしょうか？',
        koreanPronunciation: '아리가토- 고자이마스. 오카이케-와 고잇쇼데 요로시-데쇼-카?',
        koreanTranslation: '감사합니다. 계산은 한꺼번에(같이) 해 드리면 될까요?',
        realLifeTip:
          '여러 명이 계산할 때 점원이 무조건 묻는 말! "고잇쇼데(한꺼번에 같이)" vs "벳츠베츠데(각자 따로)". 이 질문을 못 알아들으면 계산대에서 어색한 침묵이 흐릅니다.',
        staffKeigoPoint:
          '"잇쇼(一緒)" 앞에 "고(ご)"를 붙여 "고잇쇼데 요로시-데쇼-카?(합산해서 계산해도 괜찮으실까요?)"라고 정중히 묻습니다.',
        vocab: [
          { word: 'ご一緒', reading: 'ごいっしょ', koreanPronunciation: '고잇쇼', meaning: '함께, 한꺼번에 (일괄 계산)' },
          { word: '別々', reading: 'べつべつ', koreanPronunciation: '벳츠베츠', meaning: '따로따로 (더치페이/분할 계산)' },
        ],
      },
      {
        id: 'rb-5',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'はい、一緒でお願いします。クレジットカードで払えますか？',
        furigana: 'はい、いっしょで おねがいします。くれじっとかーどで はらえますか？',
        koreanPronunciation: '하이, 잇쇼데 오네가이시마스. 쿠레짓토 카-도데 하라에마스카?',
        koreanTranslation: '네, 같이 계산해 주세요. 신용카드로 결제할 수 있나요?',
        realLifeTip:
          '일본 로컬 식당은 아직 현금만 받는 곳(現金のみ, 겐킨노미)이 있어서 카드 가능 여부를 물어보는 것이 안전합니다. 줄여서 "카-도 이케마스카?"라고 해도 됩니다.',
        vocab: [
          { word: 'クレジットカード', reading: 'くれじっとかーど', koreanPronunciation: '쿠레짓토 카-도', meaning: '신용카드' },
          { word: '払えますか', reading: 'はらえますか', koreanPronunciation: '하라에마스카', meaning: '지불할 수 있나요?' },
        ],
        alternatives: [
          {
            japanese: 'すみません、別々でお願いできますか？',
            furigana: 'すみません、べつべつで おねがいできますか？',
            koreanPronunciation: '스미마센, 벳츠베츠데 오네가이 데키마스카?',
            koreanTranslation: '죄송하지만, 따로따로 계산할 수 있을까요?',
            nuance: '친구와 각자 계산(더치페이)하고 싶을 때',
          },
        ],
      },
      {
        id: 'rb-6',
        speaker: 'staff',
        speakerLabel: '점원 (B)',
        japanese: 'はい、ご利用いただけます。タッチ決済か差し込みでお願いいたします。レシートはお入用ですか？',
        furigana: 'はい、ごりよう いただけます。たっちけっさいか さしこみで おねがいいたします。れしーとは おいりようですか？',
        koreanPronunciation: '하이, 고리요- 이타다케마스. 탓치 켓사이카 사시코미데 오네가이 이타시마스. 레시-토와 오이리요-데스카?',
        koreanTranslation: '네, 이용 가능하십니다. 터치 결제나 삽입으로 부탁드립니다. 영수증은 필요하신가요?',
        realLifeTip:
          '요즘 일본 카드 단말기는 "탓치(컨택리스 터치)" 아니면 "사시코미(IC칩 꽂기)"를 요구합니다. 마지막에 "레시-토와 오이리요-데스카?(영수증 필요하세요?)"까지 세트로 물어봅니다!',
        staffKeigoPoint:
          '"츠카에마스(쓸 수 있어요)" 대신 "고리요- 이타다케마스(이용하실 수 있습니다)", "이리마스카(필요해요?)" 대신 "오이리요-데스카(필요하신가요?)"를 씁니다.',
        vocab: [
          { word: 'タッチ決済', reading: 'たっちけっさい', koreanPronunciation: '탓치 켓사이', meaning: '터치 결제 (컨택리스)' },
          { word: '差し込み', reading: 'さしこみ', koreanPronunciation: '사시코미', meaning: '(카드를 단말기에) 꽂음, 삽입' },
          { word: 'お入用', reading: 'おいりよう', koreanPronunciation: '오이리요-', meaning: '필요하심 (필요 여부의 높임말)' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-rb-s1',
          speaker: 'staff',
          speakerLabel: '식당 종업원',
          japanese: 'お待たせいたしました！ご注文はお決まりでしょうか？',
          furigana: 'おまたせ いたしました！ ごちゅうもんは おきまりでしょうか？',
          koreanPronunciation: '오마타세 이타시마시타! 고츄-몬와 오키마리데쇼-카?',
          koreanTranslation: '기다려 주셔서 감사합니다! 주문하실 메뉴는 정하셨나요?',
          realLifeTip: '추천 메뉴를 물어보거나 주문을 하고 계산까지 진행해보세요!',
          vocab: [],
        },
        missions: [
          '점원에게 오늘의 추천 메뉴(おすすめ)가 무엇인지 물어보기',
          '추천받은 메뉴를 주문하기',
          '식사 후 계산(お会計)을 요청하고 카드 결제 및 영수증 여부 답하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-rb-c1',
          speaker: 'customer',
          speakerLabel: '일본인 손님',
          japanese: 'すみません！今日のおすすめメニューは何ですか？',
          furigana: 'すみません！ きょうの おすすめめにゅーは なんですか？',
          koreanPronunciation: '스미마센! 쿄-노 오스스메 메뉴-와 난데스카?',
          koreanTranslation: '저기요! 오늘의 추천 메뉴는 뭔가요?',
          realLifeTip: '종업원이 되어 맛있는 메뉴를 추천하고 계산까지 친절하게 안내해보세요!',
          vocab: [],
        },
        missions: [
          '손님에게 오늘의 추천 요리(예: 사시미, 야키토리 등)를 설명해주기',
          '계산을 요청하는 손님에게 합산(ご一緒)인지 각자(別々)인지 물어보기',
          '카드 터치 결제 안내 및 영수증(レシート) 필요 여부 물어보기',
        ],
      },
    },
  },
  {
    id: 'konbini-speed-checkout',
    category: 'convenience',
    title: '편의점 계산대 3초 폭풍 질문 방어전',
    subtitle: '도시락 데우기 · 젓가락/스푼 · 비닐봉투 · 결제 수단',
    placeName: '세븐일레븐 / 로손 / 패밀리마트 계산대',
    difficulty: '초급',
    estimatedMinutes: 4,
    customerRoleName: '여행객 손님 (A)',
    staffRoleName: '편의점 스태프 (B)',
    situationBrief:
      '야식으로 먹을 도시락과 푸딩, 맥주를 골라 계산대에 올렸습니다. 바코드를 찍자마자 점원의 빠른 질문 콤보(데우기 → 봉투 → 젓가락 → 연령 확인/결제)가 시작됩니다!',
    whyHardToUnderstand:
      '편의점 알바생들은 하루에 수백 번 같은 질문을 하기 때문에 말이 엄청나게 빠릅니다. 문장 전체를 해석하려 하지 말고 핵심 키워드("아타타메", "후쿠로", "오하시", "오시하라이")만 캐치하면 됩니다!',
    keyTakeaways: [
      '데우기 질문: "오아타타메 이타시마스카?" → "오네가이시마스(부탁해요)" 또는 "다이죠-부데스(안 데워도 돼요)"',
      '봉투 질문: "후쿠로와 고리요-데스카?" → "후쿠로 쿠다사이(봉투 주세요)" 또는 "이리마센(필요 없어요)"',
      '결제 수단 말하기: "스이카데(교통카드로)" / "탓치데(카드 터치로)" / "페이페이데(QR로)"',
    ],
    turns: [
      {
        id: 'kb-1',
        speaker: 'staff',
        speakerLabel: '편의점 직원 (B)',
        japanese: 'いらっしゃいませ。こちらのお弁当はお温めいたしますか？',
        furigana: 'いらっしゃいませ。こちらの おべんとうは おあたため いたしますか？',
        koreanPronunciation: '이랏샤이마세. 코치라노 오벤토-와 오아타타메 이타시마스카?',
        koreanTranslation: '어서 오세요. 이 도시락은 데워 드릴까요?',
        realLifeTip:
          '편의점 질문 1순위! 도시락, 주먹밥(오니기리), 파스타를 사면 무조건 물어봅니다. 귀를 열고 "아타타메"라는 소리가 들리면 데울지 말지만 결정하세요.',
        staffKeigoPoint:
          '"아타타메마스카" 앞에 "오(お)"를 붙이고 뒤를 겸양어 "이타시마스카(해 드릴까요?)"로 바꾼 정중한 편의점 매뉴얼 표현입니다.',
        vocab: [
          { word: 'お弁当', reading: 'おべんとう', koreanPronunciation: '오벤토-', meaning: '도시락' },
          { word: 'お温め', reading: 'おあたため', koreanPronunciation: '오아타타메', meaning: '데움, 전자레인지 가열' },
        ],
      },
      {
        id: 'kb-2',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'はい、温めてください。おにぎりはそのままで大丈夫です。',
        furigana: 'はい、あたためて ください。おにぎりは そのままで だいじょうぶです。',
        koreanPronunciation: '하이, 아타타메테 쿠다사이. 오니기리와 소노마마데 다이죠-부데스.',
        koreanTranslation: '네, 데워 주세요. 삼각김밥은 그냥 그대로 괜찮아요.',
        realLifeTip:
          '일부만 데우고 싶거나 데우지 않고 그대로 받고 싶을 때 "소노마마데 다이죠-부데스(그대로 괜찮아요)"를 쓰면 원어민처럼 자연스럽습니다!',
        vocab: [
          { word: '温めてください', reading: 'あたためてください', koreanPronunciation: '아타타메테 쿠다사이', meaning: '데워 주세요' },
          { word: 'そのまま', reading: 'そのまま', koreanPronunciation: '소노마마', meaning: '그대로 (데우지 않고)' },
        ],
        alternatives: [
          {
            japanese: 'はい、お願いします！',
            furigana: 'はい、おねがいします！',
            koreanPronunciation: '하이, 오네가이시마스!',
            koreanTranslation: '네, 부탁합니다!',
            nuance: '가장 짧고 간단하게 데워 달라고 답할 때',
          },
        ],
      },
      {
        id: 'kb-3',
        speaker: 'staff',
        speakerLabel: '편의점 직원 (B)',
        japanese: 'かしこまりました。お箸とスプーンはお付けしますか？また、レジ袋はご利用ですか？',
        furigana: 'かしこまりました。おはしと すぷーんは おつけしますか？ また、れじぶくろは ごりようですか？',
        koreanPronunciation: '카시코마리마시타. 오하시토 스푼-와 오츠케시마스카? 마타, 레지부쿠로와 고리요-데스카?',
        koreanTranslation: '알겠습니다. 젓가락과 스푼은 넣어 드릴까요? 그리고 비닐봉투는 이용하시나요?',
        realLifeTip:
          '실제 편의점에서는 이렇게 젓가락(오하시)과 봉투(레지부쿠로)를 한 호흡에 묶어서 물어보는 경우가 많습니다!',
        staffKeigoPoint:
          '"오츠케시마스카(동봉해 드릴까요?)"는 젓가락, 스푼, 빨대(스토로-), 물티슈(오시보리)를 챙겨줄 때 쓰는 필수 접객어입니다.',
        vocab: [
          { word: 'お箸', reading: 'おはし', koreanPronunciation: '오하시', meaning: '젓가락' },
          { word: 'お付けしますか', reading: 'おつけしますか', koreanPronunciation: '오츠케시마스카', meaning: '함께 넣어(붙여) 드릴까요?' },
          { word: 'レジ袋', reading: 'れじぶくろ', koreanPronunciation: '레지부쿠로', meaning: '계산대 비닐봉투' },
        ],
      },
      {
        id: 'kb-4',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'はい、お箸を二膳と、袋も一枚お願いします。',
        furigana: 'はい、おはしを にぜんと、ふくろも いちまい おねがいします。',
        koreanPronunciation: '하이, 오하시오 니젠토, 후쿠로모 이치마이 오네가이시마스.',
        koreanTranslation: '네, 젓가락 두 벌이랑 봉투도 한 장 부탁해요.',
        realLifeTip:
          '젓가락 단위가 "젠(膳)"이지만 생각나지 않으면 그냥 "오하시 후타츠(젓가락 두 개)"라고 해도 100% 통합니다!',
        vocab: [
          { word: '二膳', reading: 'にぜん', koreanPronunciation: '니젠', meaning: '(젓가락) 두 벌' },
          { word: '一枚', reading: 'いちまい', koreanPronunciation: '이치마이', meaning: '(봉투 등 얇은 것) 한 장' },
        ],
        alternatives: [
          {
            japanese: 'お箸だけお願いします。袋はいりません。',
            furigana: 'おはしだけ おねがいします。ふくろは いりません。',
            koreanPronunciation: '오하시다케 오네가이시마스. 후쿠로와 이리마센.',
            koreanTranslation: '젓가락만 부탁해요. 봉투는 필요 없어요.',
            nuance: '에코백이나 가방이 있어서 봉투(3~5엔 유료)가 필요 없을 때',
          },
        ],
      },
      {
        id: 'kb-5',
        speaker: 'staff',
        speakerLabel: '편의점 직원 (B)',
        japanese: 'お酒がございますので、画面の年齢確認ボタンにタッチをお願いします。お支払いはいかがなさいますか？',
        furigana: 'おさけが ございますので、がめんの ねんれいかくにん ぼたんに たっちを おねがいします。おしはらいは いかがなさいますか？',
        koreanPronunciation: '오사케가 고자이마스노데, 가멘노 넨레-카쿠닌 보탄니 탓치오 오네가이시마스. 오시하라이와 이카가 나사이마스카?',
        koreanTranslation: '주류가 포함되어 있어서, 화면의 연령 확인 버튼을 터치해 주세요. 결제는 어떻게 하시겠어요?',
        realLifeTip:
          '일본 편의점에서 맥주/술을 사면 포스기 화면에 "20세 이상입니까? [はい(네)]" 버튼이 뜹니다. 직원이 화면을 가리키며 길게 말하면 당황하지 말고 화면의 [はい]를 터치하세요!',
        staffKeigoPoint:
          '"오시하라이와 이카가 나사이마스카?(지불은 어떻게 하시겠습니까?)"는 편의점·백화점·식당 어디서나 결제 수단을 물을 때 쓰는 표현입니다.',
        vocab: [
          { word: '年齢確認', reading: 'ねんれいかくにん', koreanPronunciation: '넨레-카쿠닌', meaning: '연령 확인 (성인 인증)' },
          { word: 'お支払い', reading: 'おしはらい', koreanPronunciation: '오시하라이', meaning: '지불, 결제' },
          { word: 'いかがなさいますか', reading: 'いかがなさいますか', koreanPronunciation: '이카가 나사이마스카', meaning: '어떻게 하시겠습니까?' },
        ],
      },
      {
        id: 'kb-6',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: '（タッチして）カードのタッチ決済でお願いします。',
        furigana: '（たっちして）かーどの たっちけっさいで おねがいします。',
        koreanPronunciation: '(탓치시테) 카-도노 탓치 켓사이데 오네가이시마스.',
        koreanTranslation: '(화면을 터치하며) 카드 터치 결제로 부탁합니다.',
        realLifeTip:
          '트래블로그/트래블월렛 카드로 컨택리스 결제할 때는 "쿠레짓토노 탓치데(신용카드 터치로)" 또는 "카-도데(카드로)"라고 말하면 됩니다.',
        vocab: [
          { word: 'カードのタッチ決済', reading: 'かーどのたっちけっさい', koreanPronunciation: '카-도노 탓치 켓사이', meaning: '카드 컨택리스(터치) 결제' },
        ],
        alternatives: [
          {
            japanese: '交通系IC（スイカ）でお願いします。',
            furigana: 'こうつうけい あいしー（すいか）で おねがいします。',
            koreanPronunciation: '코-츠-케- 아이시-(스이카)데 오네가이시마스.',
            koreanTranslation: '교통카드(스이카)로 결제할게요.',
            nuance: '스이카/파스모/이코카 등 교통카드로 결제할 때',
          },
          {
            japanese: '現金でお願いします。',
            furigana: 'げんきんで おねがいします。',
            koreanPronunciation: '겐킨데 오네가이시마스.',
            koreanTranslation: '현금으로 할게요.',
            nuance: '동전이나 지폐로 결제할 때',
          },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-kb-s1',
          speaker: 'staff',
          speakerLabel: '편의점 스태프',
          japanese: 'いらっしゃいませ！お弁当はお温めいたしますか？レジ袋はご利用ですか？',
          furigana: 'いらっしゃいませ！ おべんとうは おあたため いたしますか？ れじぶくろは ごりようですか？',
          koreanPronunciation: '이랏샤이마세! 오벤토-와 오아타타메 이타시마스카? 레지부쿠로와 고리요-데스카?',
          koreanTranslation: '어서 오세요! 도시락은 데워 드릴까요? 비닐봉투는 이용하시나요?',
          realLifeTip: '도시락 데우기, 봉투, 젓가락, 결제 수단까지 이어서 답해보세요!',
          vocab: [],
        },
        missions: [
          '도시락 데우기 여부 답하기',
          '봉투(袋)와 젓가락(お箸) 필요 여부 말하기',
          '결제 수단(카드 터치, 스이카, 현금 등) 말하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-kb-c1',
          speaker: 'customer',
          speakerLabel: '일본인 손님',
          japanese: 'これお願いします。（お弁当とビールをレジに置く）',
          furigana: 'これ おねがいします。（おべんとうと びーるを れじに おく）',
          koreanPronunciation: '코레 오네가이시마스. (오벤토-토 비-루오 레지니 오쿠)',
          koreanTranslation: '이거 계산 부탁해요. (도시락과 맥주를 계산대에 올려놓는다)',
          realLifeTip: '편의점 점원이 되어 도시락 데우기, 봉투, 주류 연령 확인, 결제 수단을 차례로 물어보세요!',
          vocab: [],
        },
        missions: [
          '도시락을 데워 드릴지(お温めいたしますか) 정중히 물어보기',
          '비닐봉투(レジ袋)와 젓가락(お箸) 필요 여부 물어보기',
          '결제 수단(お支払い方法) 물어보고 마무리 인사하기',
        ],
      },
    },
  },
  {
    id: 'drugstore-taxfree',
    category: 'convenience',
    title: '드럭스토어 약 추천 & 면세(Tax-Free) 계산',
    subtitle: '증상 설명하고 약 찾기 · 면세 조건 확인 · 개봉 금지 안내',
    placeName: '마츠모토 키요시 / 돈키호테 면세 카운터',
    difficulty: '중급',
    estimatedMinutes: 5,
    customerRoleName: '여행객 손님 (A)',
    staffRoleName: '드럭스토어 점원 (B)',
    situationBrief:
      '드럭스토어에서 소화제/진통제를 찾고, 5,500엔 이상 구매하여 면세(Tax-Free) 카운터에서 여권을 제시하며 면세 포장 안내를 듣는 상황입니다.',
    whyHardToUnderstand:
      '면세 계산 시 직원이 의무적으로 설명해야 하는 규정("일본 출국 전까지 개봉하면 안 됩니다", "소모품이라 면세 봉투에 밀봉합니다")을 아주 빠르게 일본어로 설명합니다.',
    keyTakeaways: [
      '재고/위치 묻기: "코노 샤신노 모노와 도코니 아리마스카?(이 사진의 제품은 어디 있나요?)"',
      '면세 요청: "멘세-(면세) 오네가이시마스"',
      '직원 필수 안내 알아듣기: "니혼오 데루마데 아케나이데 쿠다사이(일본을 떠나기 전까지 개봉하지 마세요)"',
    ],
    turns: [
      {
        id: 'ds-1',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'すみません、食べすぎて胃が痛いんですが、おすすめの胃薬はありますか？',
        furigana: 'すみません、たべすぎて いが いたいんですが、おすすめの いぐすりは ありますか？',
        koreanPronunciation: '스미마센, 타베스기테 이가 이타인데스가, 오스스메노 이구스리와 아리마스카?',
        koreanTranslation: '저기요, 너무 많이 먹어서 속(위)이 아픈데, 추천해주실 위장약(소화제)이 있나요?',
        realLifeTip:
          '증상을 말할 때는 "[부위]가 이타이데스(~가 아파요)"만 알아도 됩니다. 머리(아타마), 목(노도), 배(오나카), 위(이).',
        vocab: [
          { word: '食べすぎて', reading: 'たべすぎて', koreanPronunciation: '타베스기테', meaning: '과식해서, 너무 많이 먹어서' },
          { word: '胃薬', reading: 'いぐすり', koreanPronunciation: '이구스리', meaning: '위장약, 소화제 (두통약은 즈츠-야쿠)' },
        ],
        alternatives: [
          {
            japanese: 'すみません、この写真の商品はどこにありますか？',
            furigana: 'すみません、この しゃしんの しょうひんは どこに ありますか？',
            koreanPronunciation: '스미마센, 코노 샤신노 쇼-힌와 도코니 아리마스카?',
            koreanTranslation: '저기요, 이 사진의 상품은 어디에 있나요?',
            nuance: '스마트폰으로 캡처해 간 쇼핑 리스트 사진을 보여주며 물어볼 때 최고로 유용한 표현!',
          },
        ],
      },
      {
        id: 'ds-2',
        speaker: 'staff',
        speakerLabel: '드럭스토어 직원 (B)',
        japanese: 'それでしたら、こちらの太田胃散が人気ですよ。食後に飲むタイプです。',
        furigana: 'それでしたら、こちらの おおたいさんが にんきですよ。しょくごに のむ たいぷです。',
        koreanPronunciation: '소레데시타라, 코치라노 오-타이산가 닌키데스요. 쇼쿠고니 노무 타이푸데스.',
        koreanTranslation: '그러시다면 이 오타이산이 인기 있어요. 식후에 복용하는 타입입니다.',
        realLifeTip:
          '약을 추천해줄 때 직원이 꼭 알려주는 복용법: "쇼쿠젠(식전)", "쇼쿠고(식후)", "네무쿠 나리마스(졸릴 수 있습니다)".',
        staffKeigoPoint:
          '"소레나라(그렇다면)"의 정중한 표현인 "소레데시타라(그러시다면)"로 손님의 상황에 공감하며 상품을 권합니다.',
        vocab: [
          { word: 'それでしたら', reading: 'それでしたら', koreanPronunciation: '소레데시타라', meaning: '그러시다면' },
          { word: '食後', reading: 'しょくご', koreanPronunciation: '쇼쿠고', meaning: '식후' },
        ],
      },
      {
        id: 'ds-3',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'ありがとうございます。これにします！あと、全部で免税（タックスフリー）になりますか？',
        furigana: 'ありがとうございます。これに します！ あと、ぜんぶで めんぜい（たっくすふりー）に なりますか？',
        koreanPronunciation: '아리가토- 고자이마스. 코레니 시마스! 아토, 젠부데 멘제-(탁쿠스 후리-)니 나리마스카?',
        koreanTranslation: '감사합니다. 이걸로 할게요! 그리고 전부 합쳐서 면세가 되나요?',
        realLifeTip:
          '쇼핑할 때 물건을 고르고 "코레니 시마스!(이걸로 할게요!)"는 정말 유용한 결정 표현입니다. 면세는 일본어로 "멘제-(免税)"라고 합니다.',
        vocab: [
          { word: 'これにします', reading: 'これにします', koreanPronunciation: '코레니 시마스', meaning: '이것으로 하겠습니다 (결정)' },
          { word: '免税', reading: 'めんぜい', koreanPronunciation: '멘제-', meaning: '면세 (Tax-Free)' },
        ],
      },
      {
        id: 'ds-4',
        speaker: 'staff',
        speakerLabel: '드럭스토어 직원 (B)',
        japanese: 'はい、5,000円以上ですので免税対象です。パスポートをご提示いただけますか？',
        furigana: 'はい、ごせんえん いじょうですので めんぜいたいしょうです。ぱすぽーとを ごていじ いただけますか？',
        koreanPronunciation: '하이, 고센엔 이죠-데스노데 멘제- 타이쇼-데스. 파스포-토오 고테-지 이타다케마스카?',
        koreanTranslation: '네, 세전 5,000엔 이상이라 면세 대상입니다. 여권을 제시해 주시겠어요?',
        realLifeTip:
          '"파스포-토(여권)"와 "고테-지(제시)"가 들리면 실물 여권을 건네주면 됩니다.',
        staffKeigoPoint:
          '"미세테 쿠다사이(보여 주세요)" 대신 접객 용어인 "고테-지 이타다케마스카?(제시해 주실 수 있으신가요?)"를 씁니다.',
        vocab: [
          { word: '免税対象', reading: 'めんぜいたいしょう', koreanPronunciation: '멘제- 타이쇼-', meaning: '면세 대상' },
          { word: 'ご提示', reading: 'ごていじ', koreanPronunciation: '고테-지', meaning: '제시, 보여주심' },
        ],
      },
      {
        id: 'ds-5',
        speaker: 'staff',
        speakerLabel: '드럭스토어 직원 (B)',
        japanese: 'ありがとうございます。消耗品ですので専用の袋にお入れします。日本を出国するまで開けないでください。',
        furigana: 'ありがとうございます。しょうもうひんですので せんようの ふくろに おいれします。にほんを しゅっこくするまで あけないでください。',
        koreanPronunciation: '아리가토- 고자이마스. 쇼-모-힌데스노데 센요-노 후쿠로니 오이레시마스. 니혼오 슛코쿠스루마데 아케나이데 쿠다사이.',
        koreanTranslation: '감사합니다. 소모품이므로 전용 봉투에 밀봉해 드립니다. 일본에서 출국하실 때까지 개봉하지 마세요.',
        realLifeTip:
          '드럭스토어 면세 카운터에서 100% 듣게 되는 문장입니다! 만약 지금 당장 일본 호텔에서 먹을 약이라면 면세 봉투에 넣기 전에 따로 빼달라고 해야 합니다.',
        staffKeigoPoint:
          '면세 규정 안내 시 "슛코쿠스루마데 아케나이데 쿠다사이(출국 전까지 열지 마세요)"를 명확히 전달합니다.',
        vocab: [
          { word: '消耗品', reading: 'しょうもうひん', koreanPronunciation: '쇼-모-힌', meaning: '소모품 (화장품, 약, 식품 등)' },
          { word: '出国するまで', reading: 'しゅっこくするまで', koreanPronunciation: '슛코쿠스루마데', meaning: '출국할 때까지' },
          { word: '開けないでください', reading: 'あけないでください', koreanPronunciation: '아케나이데 쿠다사이', meaning: '열지(개봉하지) 마세요' },
        ],
      },
      {
        id: 'ds-6',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'わかりました。あ、この胃薬だけ今日飲みたいので、別会計にできますか？',
        furigana: 'わかりました。あ、この いぐすりだけ きょう のみたいので、べつかいけいに できますか？',
        koreanPronunciation: '와카리마시타. 아, 코노 이구스리다케 쿄- 노미타이노데, 베츠카이케-니 데키마스카?',
        koreanTranslation: '알겠습니다. 아, 이 위장약만 오늘 먹고 싶어서 그러는데, 따로 계산할 수 있나요?',
        realLifeTip:
          '실제 여행 꿀팁! 일본 체류 중에 바로 쓸 약이나 화장품은 면세 봉투에 묶이면 뜯을 수 없으므로 "베츠카이케-(별도 계산)"로 해달라고 하면 편리합니다.',
        vocab: [
          { word: '飲みたいので', reading: 'のみたいので', koreanPronunciation: '노미타이노데', meaning: '(약을) 먹고 싶어서' },
          { word: '別会計', reading: 'べつかいけい', koreanPronunciation: '베츠카이케-', meaning: '별도 계산, 따로 결제' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-ds-s1',
          speaker: 'staff',
          speakerLabel: '드럭스토어 점원',
          japanese: 'いらっしゃいませ！何かお探しの商品はございますか？',
          furigana: 'いらっしゃいませ！ なにか おさがしの しょうひんは ございますか？',
          koreanPronunciation: '이랏샤이마세! 나니카 오사가시노 쇼-힌와 고자이마스카?',
          koreanTranslation: '어서 오세요! 혹시 찾으시는 상품이 있으신가요?',
          realLifeTip: '필요한 약이나 화장품 위치를 묻고 면세 계산까지 요청해보세요!',
          vocab: [],
        },
        missions: [
          '증상(소화불량, 두통 등)에 맞는 약이나 찾는 상품 물어보기',
          '면세(免税)가 가능한지 물어보고 여권 제시하기',
          '개봉 금지 안내에 답하거나 당장 쓸 물건 별도 계산 요청하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-ds-c1',
          speaker: 'customer',
          speakerLabel: '외국인 여행객 손님',
          japanese: 'すみません、頭痛薬（ずつうやく）はどこにありますか？あと免税でお願いします。',
          furigana: 'すみません、ずつうやくは どこに ありますか？ あと めんぜいで おねがいします。',
          koreanPronunciation: '스미마센, 즈츠-야쿠와 도코니 아리마스카? 아토 멘제-데 오네가이시마스.',
          koreanTranslation: '저기요, 두통약은 어디에 있나요? 그리고 면세로 계산 부탁해요.',
          realLifeTip: '드럭스토어 직원이 되어 약을 안내하고 여권 확인 및 면세 개봉 금지 안내를 해보세요!',
          vocab: [],
        },
        missions: [
          '손님에게 인기 있는 약을 안내해주기',
          '면세 처리를 위해 여권 제시(パスポートのご提示) 요청하기',
          '출국 전까지 개봉하지 말라는 안내(出国するまで開けないでください) 전달하기',
        ],
      },
    },
  },
  {
    id: 'hotel-checkin-luggage',
    category: 'hotel',
    title: '호텔 체크인 & 짐 보관 요청하기',
    subtitle: '예약자 확인 · 숙박세 및 조식 안내 · 체크인 전/후 캐리어 보관',
    placeName: '도쿄 시내 비즈니스 호텔 프론트',
    difficulty: '초급',
    estimatedMinutes: 5,
    customerRoleName: '투숙객 손님 (A)',
    staffRoleName: '호텔 프론트리어 (B)',
    situationBrief:
      '호텔에 도착해 프론트에서 체크인을 진행합니다. 여권 복사와 숙박세(도쿄/오사카/교토 등 현지 결제), 조식 시간 및 엘리베이터 이용법을 안내받습니다.',
    whyHardToUnderstand:
      '호텔 직원은 최고 수준의 정중한 경어(최상급 존경어/겸양어)를 사용합니다. 특히 "고추-쇼쿠(조식)", "슈쿠하쿠세-(숙박세)", "오니모츠(짐)" 관련 안내가 길게 이어집니다.',
    keyTakeaways: [
      '체크인 첫마디: "체크인 오네가이시마스. 성함은 ~데스"',
      '짐 보관 요청: "체크인 마에니 니모츠오 아즈캇테 모라에마스카?(체크인 전에 짐을 맡아주실 수 있나요?)"',
      '호텔 직원 단골 질문: "파스포-토오 오카리 이타시마스(여권을 잠시 빌리겠습니다/확인하겠습니다)"',
    ],
    turns: [
      {
        id: 'ht-1',
        speaker: 'customer',
        speakerLabel: '투숙객 (A)',
        japanese: 'こんにちは。チェックインをお願いします。予約したキムです。',
        furigana: 'こんにちは。ちぇっくいんを おねがいします。よやくした きむです。',
        koreanPronunciation: '콘니치와. 쳇쿠인오 오네가이시마스. 요야쿠시타 키무데스.',
        koreanTranslation: '안녕하세요. 체크인 부탁합니다. 예약한 김(Kim)입니다.',
        realLifeTip:
          '예약자 이름을 말할 때 "요야쿠시타 [성함]데스(예약한 OO입니다)"라고 하면 프론트 직원이 바로 예약 내역을 조회합니다.',
        vocab: [
          { word: 'チェックイン', reading: 'ちぇっくいん', koreanPronunciation: '쳇쿠인', meaning: '체크인' },
          { word: '予約した', reading: 'よやくした', koreanPronunciation: '요야쿠시타', meaning: '예약한' },
        ],
      },
      {
        id: 'ht-2',
        speaker: 'staff',
        speakerLabel: '프론트 직원 (B)',
        japanese: 'キム様ですね、お待ちしておりました！ご宿泊の皆様のパスポートをお預かりしてもよろしいでしょうか？',
        furigana: 'きむさまですね、おまちして おりました！ ごしゅくはくの みなさまの ぱすぽーとを おあずかりしても よろしいでしょうか？',
        koreanPronunciation: '키무사마데스네, 오마치시테 오리마시타! 고슈쿠하쿠노 미나사마노 파스포-토오 오아즈카리시테모 요로시-데쇼-카?',
        koreanTranslation: '김 님이시군요, 기다리고 있었습니다! 투숙하시는 모든 분의 여권을 잠시 받아도 될까요?',
        realLifeTip:
          '일본 호텔은 법적으로 대표자뿐만 아니라 **함께 묵는 동행자 전원(미나사마)**의 여권을 스캔해야 합니다.',
        staffKeigoPoint:
          '"오마치시테 오리마시타(기다리고 있었습니다)"와 "오아즈카리시테모~(맡아도/건네받아도 될까요?)"는 호텔리어의 대표 경어입니다.',
        vocab: [
          { word: 'ご宿泊の皆様', reading: 'ごしゅくはくのみなさま', koreanPronunciation: '고슈쿠하쿠노 미나사마', meaning: '투숙하시는 모든 분' },
          { word: 'お預かり', reading: 'おあずかり', koreanPronunciation: '오아즈카리', meaning: '맡음, 보관함 (겸양어)' },
        ],
      },
      {
        id: 'ht-3',
        speaker: 'customer',
        speakerLabel: '투숙객 (A)',
        japanese: 'はい、どうぞ。二名分です。部屋は禁煙ルームになっていますか？',
        furigana: 'はい、どうぞ。にめいぶんです。へやは きんえんるーむに なっていますか？',
        koreanPronunciation: '하이, 도-조. 니메-분데스. 헤야와 킨엔루-무니 낫테 이마스카?',
        koreanTranslation: '네, 여기 있습니다. 두 명분이에요. 방은 금연실로 되어 있나요?',
        realLifeTip:
          '일본 호텔에는 아직 흡연실(키츠엔루-무)이 남아있는 곳이 많으므로, 비흡연자라면 "킨엔루-무(금연실)"인지 확인하는 것이 좋습니다.',
        vocab: [
          { word: '二名分', reading: 'にめいぶん', koreanPronunciation: '니메-분', meaning: '2명분' },
          { word: '禁煙ルーム', reading: 'きんえんるーむ', koreanPronunciation: '킨엔루-무', meaning: '금연 객실 (흡연실은 喫煙 きつえん)' },
        ],
      },
      {
        id: 'ht-4',
        speaker: 'staff',
        speakerLabel: '프론트 직원 (B)',
        japanese: 'はい、10階の禁煙ツインルームでございます。宿泊税が200円かかりますが、今お支払いになりますか？',
        furigana: 'はい、じゅっかいの きんえん ついんるーむで ございます。しゅくはくぜいが にひゃくえん かかりますが、いま おしはらいに なりますか？',
        koreanPronunciation: '하이, 쥿카이노 킨엔 츠인루-무데 고자이마스. 슈쿠하쿠제-가 니햐쿠엔 카카리마스가, 이마 오시하라이니 나리마스카?',
        koreanTranslation: '네, 10층 금연 트윈룸입니다. 숙박세가 200엔 부과되는데, 지금 결제하시겠어요?',
        realLifeTip:
          '온라인으로 숙박비를 이미 완납했더라도 도쿄·오사카·교토·후쿠오카 등에서는 현장에서 1인당 100~500엔의 "슈쿠하쿠제-(숙박세)"를 따로 받는 경우가 많습니다! 이중 결제가 아니니 안심하세요.',
        staffKeigoPoint:
          '"~데스" 대신 한층 더 격식 있는 "~데 고자이마스"를 구사합니다.',
        vocab: [
          { word: '宿泊税', reading: 'しゅくはくぜい', koreanPronunciation: '슈쿠하쿠제-', meaning: '숙박세 (도시세)' },
          { word: 'かかります', reading: 'かかります', koreanPronunciation: '카카리마스', meaning: '(비용/시간이) 듭니다, 부과됩니다' },
        ],
      },
      {
        id: 'ht-5',
        speaker: 'customer',
        speakerLabel: '투숙객 (A)',
        japanese: 'はい、現金で払います。あと、明日のチェックアウト後に荷物を預かってもらえますか？',
        furigana: 'はい、げんきんで はらいます。あと、あしたの ちぇっくあうとごに にもつを あずかって もらえますか？',
        koreanPronunciation: '하이, 겐킨데 하라이마스. 아토, 아시타노 쳇쿠아우토고니 니모츠오 아즈캇테 모라에마스카?',
        koreanTranslation: '네, 현금으로 낼게요. 그리고 내일 체크아웃 후에 짐을 맡아주실 수 있나요?',
        realLifeTip:
          '"니모츠오 아즈캇테 모라에마스카?(짐을 맡아주실 수 있나요?)"는 체크인 전이나 체크아웃 후에 두 손을 가볍게 해주는 여행 필수 문장입니다!',
        vocab: [
          { word: '荷物', reading: 'にもつ', koreanPronunciation: '니모츠', meaning: '짐, 수하물 (캐리어)' },
          { word: '預かってもらえますか', reading: 'あずかってもらえますか', koreanPronunciation: '아즈캇테 모라에마스카', meaning: '맡아 주실 수 있나요?' },
        ],
      },
      {
        id: 'ht-6',
        speaker: 'staff',
        speakerLabel: '프론트 직원 (B)',
        japanese: 'はい、喜んでお預かりいたします。こちらがルームキーでございます。ご朝食は1階で朝7時からでございます。',
        furigana: 'はい、よろこんで おあずかり いたします。こちらが るーむきーで ございます。ごちょうしょくは いっかいで あさ しちじからで ございます。',
        koreanPronunciation: '하이, 요로콘데 오아즈카리 이타시마스. 코치라가 루-무키-데 고자이마스. 고쵸-쇼쿠와 잇카이데 아사 시치지카라데 고자이마스.',
        koreanTranslation: '네, 기꺼이 보관해 드리겠습니다. 여기 객실 키입니다. 조식은 1층에서 아침 7시부터입니다.',
        realLifeTip:
          '객실 키를 줄 때 함께 알려주는 핵심 단어 3가지: "고쵸-쇼쿠(조식)", "다이요쿠죠-(대욕장/온천)", "에레베-타-(엘리베이터)".',
        staffKeigoPoint:
          '"요로콘데(기꺼이)" + "오아즈카리 이타시마스(맡아 드리겠습니다)"는 손님을 감동시키는 호텔 접객 표현입니다.',
        vocab: [
          { word: '喜んで', reading: 'よろこんで', koreanPronunciation: '요로콘데', meaning: '기꺼이, 기쁜 마음으로' },
          { word: 'ご朝食', reading: 'ごちょうしょく', koreanPronunciation: '고쵸-쇼쿠', meaning: '조식, 아침 식사' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-ht-s1',
          speaker: 'staff',
          speakerLabel: '호텔 프론트리어',
          japanese: 'いらっしゃいませ。チェックインでいらっしゃいますか？お名前をお伺いいたします。',
          furigana: 'いらっしゃいませ。ちぇっくいんで いらっしゃいますか？ おなまえを おうかがい いたします。',
          koreanPronunciation: '이랏샤이마세. 쳇쿠인데 이랏샤이마스카? 오나마에오 오우카가이 이타시마스.',
          koreanTranslation: '어서 오십시오. 체크인이신가요? 성함을 여쭙겠습니다.',
          realLifeTip: '예약자 이름을 말하고 조식 시간이나 짐 보관을 요청해보세요!',
          vocab: [],
        },
        missions: [
          '예약자 이름을 말하고 체크인 요청하기',
          '금연실 여부나 조식(朝食) 시간 물어보기',
          '체크아웃 후 캐리어 보관(荷物を預かってもらえますか) 요청하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-ht-c1',
          speaker: 'customer',
          speakerLabel: '투숙객 손님',
          japanese: 'すみません、チェックインお願いします。あと、朝食は何時からですか？',
          furigana: 'すみません、ちぇっくいん おねがいします。あと、ちょうしょくは なんじからですか？',
          koreanPronunciation: '스미마센, 쳇쿠인 오네가이시마스. 아토, 쵸-쇼쿠와 난지카라데스카?',
          koreanTranslation: '저기요, 체크인 부탁합니다. 그리고 조식은 몇 시부터인가요?',
          realLifeTip: '호텔 프론트 직원이 되어 여권 확인, 숙박세 안내, 조식 시간을 친절하게 안내해보세요!',
          vocab: [],
        },
        missions: [
          '손님의 여권(パスポート)을 확인하고 객실 층수 안내하기',
          '조식 시간(예: 1층에서 아침 7시부터)을 정중히 안내하기',
          '룸키를 건네며 편안한 투숙 인사를 건네기',
        ],
      },
    },
  },
  {
    id: 'ryokan-onsen-etiquette',
    category: 'hotel',
    title: '료칸 가이세키 저녁 시간 & 대욕장 문의',
    subtitle: '저녁 식사 시간 선택 · 유카타 사이즈 · 온천 이용 시간',
    placeName: '하코네 / 유후인 전통 온천 료칸',
    difficulty: '중급',
    estimatedMinutes: 5,
    customerRoleName: '투숙객 손님 (A)',
    staffRoleName: '료칸 나카이산 / 직원 (B)',
    situationBrief:
      '온천 료칸에 체크인하면서 저녁 식사(가이세키) 시간을 정하고, 대욕장(온천) 이용 시간과 수건 지참 여부를 물어보는 상황입니다.',
    whyHardToUnderstand:
      '료칸에서는 저녁을 "고유-쇼쿠(ご夕食)", 온천을 "다이요쿠죠-(大浴場)" 또는 "오후로(お風呂)"라고 부르며, 식사 희망 시간을 분 단위로 물어봅니다.',
    keyTakeaways: [
      '저녁 식사 시간 선택: "로쿠지한데 오네가이시마스(6시 반으로 부탁해요)"',
      '못 먹는 음식(알레르기) 말하기: "나마모노와 다이죠-부데스(날것은 괜찮아요)" / "~와 타베라레마센(~는 못 먹어요)"',
      '대욕장 문의: "다이요쿠죠-와 난지마데데스카?(대욕장은 몇 시까지인가요?)"',
    ],
    turns: [
      {
        id: 'ry-1',
        speaker: 'staff',
        speakerLabel: '료칸 직원 (B)',
        japanese: '本日ご夕食のお時間は、18時か19時でお選びいただけますが、いかがなさいますか？',
        furigana: 'ほんじつ ごゆうしょくの おじかんは、じゅうはちじか じゅうくじで おえらび いただけますが、いかがなさいますか？',
        koreanPronunciation: '혼지츠 고유-쇼쿠노 오지칸와, 쥬-하치지카 쥬-쿠지데 오에라비 이타다케마스가, 이카가 나사이마스카?',
        koreanTranslation: '오늘 저녁 식사 시간은 18시(6시) 또는 19시(7시) 중에서 선택하실 수 있는데, 어떻게 하시겠어요?',
        realLifeTip:
          '료칸에서는 체크인할 때 반드시 저녁 식사(고유-쇼쿠)와 다음 날 아침 식사(고쵸-쇼쿠) 시간을 먼저 정합니다!',
        staffKeigoPoint:
          '"에라베마스(고를 수 있습니다)" 대신 존경 표현인 "오에라비 이타다케마스(선택하실 수 있습니다)"를 사용합니다.',
        vocab: [
          { word: 'ご夕食', reading: 'ごゆうしょく', koreanPronunciation: '고유-쇼쿠', meaning: '저녁 식사 (높임말)' },
          { word: 'お選びいただけます', reading: 'おえらびいただけます', koreanPronunciation: '오에라비 이타다케마스', meaning: '선택하실 수 있습니다' },
        ],
      },
      {
        id: 'ry-2',
        speaker: 'customer',
        speakerLabel: '투숙객 (A)',
        japanese: '18時（6時）でお願いします。温泉に入ってから食べようと思います。',
        furigana: 'じゅうはちじ（ろくじ）で おねがいします。おんせんに はいってから たべようと おもいます。',
        koreanPronunciation: '쥬-하치지(로쿠지)데 오네가이시마스. 온센니 하잇테카라 타베요-토 오모이마스.',
        koreanTranslation: '6시로 부탁합니다. 온천에 들어갔다 와서 먹으려고요.',
        realLifeTip:
          '시간을 말할 때는 "로쿠지(6시)"나 "쥬-하치지(18시)" 둘 다 자연스럽게 쓰입니다.',
        vocab: [
          { word: '温泉に入ってから', reading: 'おんせんにはいってから', koreanPronunciation: '온센니 하잇테카라', meaning: '온천에 들어간(목욕한) 뒤에' },
        ],
      },
      {
        id: 'ry-3',
        speaker: 'staff',
        speakerLabel: '료칸 직원 (B)',
        japanese: 'かしこまりました。お食事でアレルギーや苦手な食材はございますか？',
        furigana: 'かしこまりました。おしょくじで あれるぎーや にがてな しょくざいは ございますか？',
        koreanPronunciation: '카시코마리마시타. 오쇼쿠지데 아레루기-야 니가테나 쇼쿠자이와 고자이마스카?',
        koreanTranslation: '알겠습니다. 식사 중에 알레르기나 못 드시는 식재료가 있으신가요?',
        realLifeTip:
          '가이세키 요리가 나오는 료칸이나 오마카세 식당에서 꼭 물어보는 질문입니다! "아레루기-(알레르기)"와 "니가테(못 먹는 것/기피 음식)"를 기억해두세요.',
        staffKeigoPoint:
          '"키라이(싫어하는)"라는 직접적인 단어 대신 완곡한 "니가테나 쇼쿠자이(거북한/잘 못 드시는 식재료)"라는 표현을 씁니다.',
        vocab: [
          { word: '苦手な食材', reading: 'にがてなしょくざい', koreanPronunciation: '니가테나 쇼쿠자이', meaning: '못 먹는(거북한) 식재료' },
        ],
      },
      {
        id: 'ry-4',
        speaker: 'customer',
        speakerLabel: '투숙객 (A)',
        japanese: 'いいえ、特にありません。何でも食べられます！あと、大浴場は何時まで開いていますか？',
        furigana: 'いいえ、とくに ありません。なんでも たべられます！ あと、だいよくじょうは なんじまで あいていますか？',
        koreanPronunciation: '이-에, 토쿠니 아리마센. 난데모 타베라레마스! 아토, 다이요쿠죠-와 난지마데 아이테 이마스카?',
        koreanTranslation: '아니요, 특별히 없습니다. 뭐든지 잘 먹어요! 그리고 대욕장(온천)은 몇 시까지 여나요?',
        realLifeTip:
          '가리는 음식이 없을 땐 "토쿠니 아리마센(특별히 없어요)" 한마디면 충분합니다!',
        vocab: [
          { word: '特にありません', reading: 'とくにありません', koreanPronunciation: '토쿠니 아리마센', meaning: '특별히 없습니다' },
          { word: '大浴場', reading: 'だいよくじょう', koreanPronunciation: '다이요쿠죠-', meaning: '대욕장 (공동 온천탕)' },
        ],
      },
      {
        id: 'ry-5',
        speaker: 'staff',
        speakerLabel: '료칸 직원 (B)',
        japanese: '大浴場は夜12時までと、明日の朝は5時からご利用いただけます。お部屋のタオルをお持ちになってください。',
        furigana: 'だいよくじょうは よる じゅうにじまでと、あしたの あさは ごじから ごりよう いただけます。おへやの たおるを おもちになって ください。',
        koreanPronunciation: '다이요쿠죠-와 요루 쥬-니지마데토, 아시타노 아사와 고지카라 고리요- 이타다케마스. 오헤야노 타오루오 오모치니 낫테 쿠다사이.',
        koreanTranslation: '대욕장은 밤 12시까지, 그리고 내일 아침은 5시부터 이용하실 수 있습니다. 객실에 있는 수건을 가지고 가 주세요.',
        realLifeTip:
          '일본 호텔/료칸 대욕장에는 수건이 비치되어 있지 않은 곳이 많습니다! 직원이 "오헤야노 타오루오 오모치 쿠다사이(방에 있는 타월을 챙겨 가세요)"라고 안내하는 이유입니다.',
        staffKeigoPoint:
          '"못테 잇테 쿠다사이(가지고 가세요)"를 높여 "오모치니 낫테 쿠다사이(지참해 주십시오)"라고 안내합니다.',
        vocab: [
          { word: 'お部屋のタオル', reading: 'おへやのたおる', koreanPronunciation: '오헤야노 타오루', meaning: '객실 안의 수건' },
          { word: 'お持ちになって', reading: 'おもちになって', koreanPronunciation: '오모치니 낫테', meaning: '가지고(지참하셔서)' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-ry-s1',
          speaker: 'staff',
          speakerLabel: '료칸 나카이산',
          japanese: 'ようこそいらっしゃいました。ご夕食のお時間は何時になさいますか？',
          furigana: 'ようこそ いらっしゃいました。ごゆうしょくの おじかんは なんじに なさいますか？',
          koreanPronunciation: '요-코소 이랏샤이마시타. 고유-쇼쿠노 오지칸와 난지니 나사이마스카?',
          koreanTranslation: '환영합니다. 저녁 식사 시간은 몇 시로 하시겠습니까?',
          realLifeTip: '저녁 식사 시간을 정하고 대욕장 이용법을 물어보세요!',
          vocab: [],
        },
        missions: [
          '희망하는 저녁 식사 시간(예: 6시 또는 7시) 말하기',
          '알레르기나 못 먹는 음식 유무 답하기',
          '대욕장(大浴場) 이용 시간 및 타월 지참 여부 물어보기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-ry-c1',
          speaker: 'customer',
          speakerLabel: '료칸 투숙객',
          japanese: 'すみません、夕食は6時にお願いします。あと、温泉は夜何時まで入れますか？',
          furigana: 'すみません、ゆうしょくは ろくじに おねがいします。あと、おんせんは よる なんじまで はいれますか？',
          koreanPronunciation: '스미마센, 유-쇼쿠와 로쿠지니 오네가이시마스. 아토, 온센와 요루 난지마데 하이레마스카?',
          koreanTranslation: '저기요, 저녁 식사는 6시로 부탁해요. 그리고 온천은 밤 몇 시까지 들어갈 수 있나요?',
          realLifeTip: '료칸 직원이 되어 식사 알레르기 여부 확인과 대욕장 이용 시간 및 수건 안내를 해보세요!',
          vocab: [],
        },
        missions: [
          '저녁 6시 예약을 확인하고 못 먹는 식재료(苦手な食材)가 있는지 물어보기',
          '대욕장 운영 시간 안내하기',
          '객실의 수건(お部屋のタオル)을 챙겨 가라고 안내하기',
        ],
      },
    },
  },
  {
    id: 'train-station-staff',
    category: 'transport',
    title: '전철역 승강장(홈) 문의 & IC카드 오류 해결',
    subtitle: '행선지 맞는지 확인 · 몇 번 홈(승강장)인지 질문 · 스이카 개찰구 오류',
    placeName: '도쿄 우에노역 / 오사카 난바역 개찰구',
    difficulty: '초급',
    estimatedMinutes: 5,
    customerRoleName: '여행객 승객 (A)',
    staffRoleName: '역무원 (B)',
    situationBrief:
      '복잡한 일본 지하철역에서 내가 타려는 열차가 맞는지, 몇 번 승강장(반센)으로 가야 하는지 역무원에게 물어보고, 급행/보통 열차 차이를 확인합니다.',
    whyHardToUnderstand:
      '역무원은 승강장을 "난반센(몇 번 선)" 또는 "난반 호-무(몇 번 홈)"라고 부르며, 열차 종류를 "큐-코-(급행)", "후츠-(보통/완행)", "카이소쿠(쾌속)"로 구분해 알려줍니다.',
    keyTakeaways: [
      '노선/승강장 묻기: "[목적지]니 이쿠니와 난반 호-무데스카?(~에 가려면 몇 번 승강장인가요?)"',
      '열차 확인: "코노 덴샤와 [목적지]니 이키마스카?(이 전철은 ~에 가나요?)"',
      '역무원 핵심 단어: "츠기노 각코-테이샤(다음 각역정차/완행)", "산반센(3번 승강장)", "노리카에(환승)"',
    ],
    turns: [
      {
        id: 'tr-1',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'すみません、渋谷（しぶや）に行きたいんですが、何番ホームですか？',
        furigana: 'すみません、しぶやに いきたいんですが、なんばん ほーむですか？',
        koreanPronunciation: '스미마센, 시부야니 이키타인데스가, 난반 호-무데스카?',
        koreanTranslation: '저기요, 시부야에 가고 싶은데 몇 번 승강장(홈)인가요?',
        realLifeTip:
          '"[목적지]니 이키타인데스가(~에 가고 싶은데요)"만 외워두면 기차역, 버스정류장, 길거리 어디서든 길을 물어볼 수 있습니다!',
        vocab: [
          { word: '行きたいんですが', reading: 'いきたいんですが', koreanPronunciation: '이키타인데스가', meaning: '가고 싶은데요' },
          { word: '何番ホーム', reading: 'なんばんほーむ', koreanPronunciation: '난반 호-무', meaning: '몇 번 승강장(플랫폼)' },
        ],
      },
      {
        id: 'tr-2',
        speaker: 'staff',
        speakerLabel: '역무원 (B)',
        japanese: '渋谷でしたら、階段を下りて3番線（さんばんせん）の銀座線にお乗りください。',
        furigana: 'しぶやでしたら、かいだんを おりて さんばんせんの ぎんざせんに おのりください。',
        koreanPronunciation: '시부야데시타라, 카이단오 오리테 산반센노 긴자센니 오노리 쿠다사이.',
        koreanTranslation: '시부야에 가신다면, 계단을 내려가서 3번 선의 긴자선을 타세요.',
        realLifeTip:
          '일본 역무원은 승강장을 말할 때 "~반 호-무" 또는 "~반센(番線)"이라고 말합니다. 숫자 + "반센"에 집중하세요!',
        staffKeigoPoint:
          '"놋테 쿠다사이(타세요)" 대신 정중한 "오노리 쿠다사이(탑승해 주십시오)"를 씁니다.',
        vocab: [
          { word: '階段を下りて', reading: 'かいだんをおりて', koreanPronunciation: '카이단오 오리테', meaning: '계단을 내려가서 (올라가서는 아갓테)' },
          { word: '3番線', reading: 'さんばんせん', koreanPronunciation: '산반센', meaning: '3번 선(승강장)' },
          { word: 'お乗りください', reading: 'おのりください', koreanPronunciation: '오노리 쿠다사이', meaning: '탑승해 주십시오' },
        ],
      },
      {
        id: 'tr-3',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'ありがとうございます。あ、今止まっている急行（きゅうこう）に乗っても止まりますか？',
        furigana: 'ありがとうございます。あ、いま とまっている きゅうこうに のっても とまりますか？',
        koreanPronunciation: '아리가토- 고자이마스. 아, 이마 토맛테 이루 큐-코-니 놋테모 토마리마스카?',
        koreanTranslation: '감사합니다. 아, 지금 서 있는 급행열차를 타도 (그 역에) 서나요?',
        realLifeTip:
          '일본 전철에서 가장 많이 하는 실수가 급행(큐-코-)이나 특급(톳큐-)을 잘못 타서 내릴 역을 지나치는 것입니다! 타기 전에 "코노 덴샤와 OO니 토마리마스카?(이 전철은 OO역에 서나요?)"라고 물어보면 안전합니다.',
        vocab: [
          { word: '急行', reading: 'きゅうこう', koreanPronunciation: '큐-코-', meaning: '급행열차 (일반 완행은 普通 후츠-)' },
          { word: '止まりますか', reading: 'とまりますか', koreanPronunciation: '토마리마스카', meaning: '(역에) 정차하나요?' },
        ],
      },
      {
        id: 'tr-4',
        speaker: 'staff',
        speakerLabel: '역무원 (B)',
        japanese: 'はい、急行も渋谷に止まりますよ。乗り換えなしでそのまま行けます。',
        furigana: 'はい、きゅうこうも しぶやに とまりますよ。のりかえなしで そのまま いけます。',
        koreanPronunciation: '하이, 큐-코-모 시부야니 토마리마스요. 노리카에 나시데 소노마마 이케마스.',
        koreanTranslation: '네, 급행도 시부야에 정차합니다. 환승 없이 그대로 가실 수 있어요.',
        realLifeTip:
          '"노리카에 나시데(환승 없이)"라는 말이 들리면 중간에 내릴 필요 없이 쭉 타고 가면 된다는 뜻입니다!',
        vocab: [
          { word: '乗り換えなし', reading: 'のりかえなし', koreanPronunciation: '노리카에 나시', meaning: '환승 없음, 직통' },
        ],
      },
      {
        id: 'tr-5',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'すみません、スイカをタッチしたらエラーが出たんですが、見てもらえますか？',
        furigana: 'すみません、すいかを たっちしたら えらーが でたんですが、みて もらえますか？',
        koreanPronunciation: '스미마센, 스이카오 탓치시타라 에라-가 데탄데스가, 미테 모라에마스카?',
        koreanTranslation: '저기요, 스이카를 찍었더니 에러가 났는데 봐주실 수 있나요?',
        realLifeTip:
          '개찰구에서 삑- 소리와 함께 문이 닫혔을 때 역무원 창구로 가서 카드를 보여주며 "에라-가 데탄데스가(에러가 났는데요)"라고 하면 바로 처리해 줍니다.',
        vocab: [
          { word: 'エラーが出た', reading: 'えらーがでた', koreanPronunciation: '에라-가 데타', meaning: '에러(오류)가 났다' },
          { word: '見てもらえますか', reading: 'みてもらえますか', koreanPronunciation: '미테 모라에마스카', meaning: '봐주실 수 있나요?' },
        ],
      },
      {
        id: 'tr-6',
        speaker: 'staff',
        speakerLabel: '역무원 (B)',
        japanese: '残高（ざんだか）が足りないようですね。隣の精算機でチャージしてから出てください。',
        furigana: 'ざんだかが たりないようですね。となりの せいさんきで ちゃーじしてから でてください。',
        koreanPronunciation: '잔다카가 타리나이요-데스네. 토나리노 세-산키데 챠-지시테카라 데테 쿠다사이.',
        koreanTranslation: '잔액이 부족한 것 같네요. 옆의 정산기에서 충전하신 뒤에 나가 주세요.',
        realLifeTip:
          '개찰구 오류 원인의 90%는 "잔다카 부소쿠(잔액 부족)" 또는 이전 역 하차 미처리입니다. 개찰구 안쪽에 있는 노란색 "노리코시 세-산키(운임 정산기)"에서 충전("챠-지")하면 됩니다.',
        vocab: [
          { word: '残高', reading: 'ざんだか', koreanPronunciation: '잔다카', meaning: '잔액' },
          { word: '精算機', reading: 'せいさんき', koreanPronunciation: '세-산키', meaning: '운임 정산기' },
          { word: 'チャージ', reading: 'ちゃーじ', koreanPronunciation: '챠-지', meaning: '(교통카드) 충전' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-tr-s1',
          speaker: 'staff',
          speakerLabel: '역무원',
          japanese: 'はい、どうされましたか？どちらまで行かれますか？',
          furigana: 'はい、どうされましたか？ どちらまで いかれますか？',
          koreanPronunciation: '하이, 도-사레마시타카? 도치라마데 이카레마스카?',
          koreanTranslation: '네, 무슨 일이신가요? 어디까지 가시나요?',
          realLifeTip: '가고 싶은 역의 승강장 번호나 스이카 잔액/충전 문제를 물어보세요!',
          vocab: [],
        },
        missions: [
          '목적지(예: 신주쿠, 시부야, 공항 등)로 가는 승강장(何番ホーム) 물어보기',
          '급행열차 정차 여부나 환승(乗り換え) 필요 여부 물어보기',
          'IC카드(스이카) 충전 또는 오류 해결 요청하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-tr-c1',
          speaker: 'customer',
          speakerLabel: '여행객 승객',
          japanese: 'すみません！東京駅に行きたいんですが、何番線に乗ればいいですか？',
          furigana: 'すみません！ とうきょうえきに いきたいんですが、なんばんせんに のれば いいですか？',
          koreanPronunciation: '스미마센! 토-쿄-에키니 이키타인데스가, 난반센니 노레바 이-데스카?',
          koreanTranslation: '저기요! 도쿄역에 가고 싶은데 몇 번 선을 타면 되나요?',
          realLifeTip: '역무원이 되어 승강장 번호와 환승 없이 갈 수 있는지 친절히 안내해보세요!',
          vocab: [],
        },
        missions: [
          '승객에게 몇 번 승강장(예: 2番線)으로 가면 되는지 안내하기',
          '환승 없이(乗り換えなしで) 바로 간다고 알려주기',
          '교통카드 잔액 충전(チャージ) 위치 안내하기',
        ],
      },
    },
  },
  {
    id: 'taxi-ride-direction',
    category: 'transport',
    title: '택시 탑승 · 목적지 설명 · 하차 및 결제',
    subtitle: '구글맵 주소 보여주기 · 트렁크에 캐리어 싣기 · 원하는 곳에서 세우기',
    placeName: '교토역 앞 택시 승강장',
    difficulty: '중급',
    estimatedMinutes: 4,
    customerRoleName: '택시 승객 (A)',
    staffRoleName: '택시 기사님 (B)',
    situationBrief:
      '캐리어를 들고 택시에 탑승합니다. 일본 택시는 자동문이므로 문이 열릴 때까지 기다렸다가 타고, 기사님께 스마트폰 지도를 보여주며 목적지와 소요 시간을 확인합니다.',
    whyHardToUnderstand:
      '택시 기사님들은 연배가 있으신 경우가 많아 정중한 표현과 함께 "도노 아타리데 오토메 시마쇼-카?(어느 부근에서 세워 드릴까요?)"처럼 경로/하차 지점을 물어보십니다.',
    keyTakeaways: [
      '트렁크 부탁: "토란쿠오 아케테 모라에마스카?(트렁크 좀 열어주실 수 있나요?)"',
      '목적지 전달: "코노 치즈노 호테루마데 오네가이시마스(이 지도의 호텔까지 부탁합니다)"',
      '하차 요청: "코코데 오로시테 쿠다사이(여기서 내려 주세요)"',
    ],
    turns: [
      {
        id: 'tx-1',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'すみません、スーツケースがあるので、トランクを開けてもらえますか？',
        furigana: 'すみません、すーつけーすが あるので、とらんくを あけて もらえますか？',
        koreanPronunciation: '스미마센, 스-츠케-스가 아루노데, 토란쿠오 아케테 모라에마스카?',
        koreanTranslation: '저기요, 캐리어가 있어서 그러는데 트렁크를 열어주실 수 있나요?',
        realLifeTip:
          '일본 택시는 뒷문도 자동문(지도-도아)이라 손으로 열거나 닫지 않는 것이 매너입니다! 캐리어는 일본어로 "스-츠케-스" 또는 "캬리-케-스"라고 합니다.',
        vocab: [
          { word: 'スーツケース', reading: 'すーつけーす', koreanPronunciation: '스-츠케-스', meaning: '여행용 캐리어' },
          { word: 'トランク', reading: 'とらんく', koreanPronunciation: '토란쿠', meaning: '자동차 트렁크' },
        ],
      },
      {
        id: 'tx-2',
        speaker: 'staff',
        speakerLabel: '택시 기사 (B)',
        japanese: 'はい、どうぞ！お荷物お乗せしますね。どちらまで行かれますか？',
        furigana: 'はい、どうぞ！ おにもつ おのせしますね。どちらまで いかれますか？',
        koreanPronunciation: '하이, 도-조! 오니모츠 오노세시마스네. 도치라마데 이카레마스카?',
        koreanTranslation: '네, 그러세요! 짐 실어 드릴게요. 어디까지 가시나요?',
        realLifeTip:
          '기사님이 타자마자 물어보는 "도치라마데?(어디까지 가시나요?)"에 당황하지 마세요!',
        staffKeigoPoint:
          '"도코에 이키마스카" 대신 방향을 높여 묻는 "도치라마데 이카레마스카?(어느 쪽까지 가십니까?)"를 씁니다.',
        vocab: [
          { word: 'お乗せします', reading: 'おのせします', koreanPronunciation: '오노세시마스', meaning: '(짐을) 실어 드리겠습니다' },
          { word: 'どちらまで', reading: 'どちらまで', koreanPronunciation: '도치라마데', meaning: '어디까지 (정중한 표현)' },
        ],
      },
      {
        id: 'tx-3',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'この地図のホテルまでお願いします。ここからどのくらいかかりますか？',
        furigana: 'この ちずの ほてるまで おねがいします。ここから どのくらい かかりますか？',
        koreanPronunciation: '코노 치즈노 호테루마데 오네가이시마스. 코코카라 도노쿠라이 카카리마스카?',
        koreanTranslation: '이 지도의 호텔까지 부탁합니다. 여기서 얼마나 걸리나요?',
        realLifeTip:
          '일본 주소를 읽으려 애쓰기보다 구글맵 화면을 보여주며 "코노 치즈노 바쇼마데(이 지도의 장소까지)"라고 하는 것이 가장 정확합니다!',
        vocab: [
          { word: '地図', reading: 'ちず', koreanPronunciation: '치즈', meaning: '지도' },
          { word: 'どのくらいかかりますか', reading: 'どのくらいかかりますか', koreanPronunciation: '도노쿠라이 카카리마스카', meaning: '(시간/요금이) 얼마나 걸리나요?' },
        ],
      },
      {
        id: 'tx-4',
        speaker: 'staff',
        speakerLabel: '택시 기사 (B)',
        japanese: 'かしこまりました。道が空いていれば15分ほどで着きますよ。建物の前でお止めしましょうか？',
        furigana: 'かしこまりました。みちが すいていれば じゅうごふんほどで つきますよ。たてものの まえで おとめしましょうか？',
        koreanPronunciation: '카시코마리마시타. 미치가 스이테 이레바 쥬-고훈호도데 츠키마스요. 타테모노노 마에데 오토메 시마쇼-카?',
        koreanTranslation: '알겠습니다. 길이 안 막히면 15분 정도면 도착해요. 건물 앞에서 세워 드릴까요?',
        realLifeTip:
          '목적지 근처에 다 왔을 때 기사님이 "도코데 오토메 시마쇼-카?(어디서 세워 드릴까요?)"라고 꼭 물어봅니다.',
        staffKeigoPoint:
          '"토메마쇼-카(세울까요?)"를 겸양어 "오토메 시마쇼-카(세워 드릴까요?)"로 정중하게 묻습니다.',
        vocab: [
          { word: '道が空いていれば', reading: 'みちがすいていれば', koreanPronunciation: '미치가 스이테 이레바', meaning: '길이 한산하면 (안 막히면)' },
          { word: 'お止めしましょうか', reading: 'おとめしましょうか', koreanPronunciation: '오토메 시마쇼-카', meaning: '(차를) 세워 드릴까요?' },
        ],
      },
      {
        id: 'tx-5',
        speaker: 'customer',
        speakerLabel: '승객 (A)',
        japanese: 'はい、あの白い建物の前で降ろしてください。カードで払えますか？',
        furigana: 'はい、あの しろい たてものの まえで おろして ください。かーどで はらえますか？',
        koreanPronunciation: '하이, 아노 시로이 타테모노노 마에데 오로시테 쿠다사이. 카-도데 하라에마스카?',
        koreanTranslation: '네, 저 하얀 건물 앞에서 내려 주세요. 카드로 결제되나요?',
        realLifeTip:
          '"코코데 오로시테 쿠다사이(여기서 내려 주세요)" 또는 "코코데 다이죠-부데스(여기서 괜찮아요)"는 하차할 때 쓰는 필수 표현입니다.',
        vocab: [
          { word: '降ろしてください', reading: 'おろしてください', koreanPronunciation: '오로시테 쿠다사이', meaning: '내려 주세요 (하차 요청)' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-tx-s1',
          speaker: 'staff',
          speakerLabel: '택시 기사님',
          japanese: 'ご乗車ありがとうございます。どちらまで行かれますか？',
          furigana: 'ごじょうしゃ ありがとうございます。どちらまで いかれますか？',
          koreanPronunciation: '고죠-샤 아리가토- 고자이마스. 도치라마데 이카레마스카?',
          koreanTranslation: '탑승해 주셔서 감사합니다. 어디까지 가시나요?',
          realLifeTip: '목적지와 소요 시간을 묻고 원하는 위치에 내려 달라고 말해보세요!',
          vocab: [],
        },
        missions: [
          '목적지(예: 교토역, 호텔 등)를 말하고 얼마나 걸리는지 물어보기',
          '원하는 위치에서 내려 달라고(ここで降ろしてください) 요청하기',
          '카드나 교통카드로 결제 요청하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-tx-c1',
          speaker: 'customer',
          speakerLabel: '택시 승객',
          japanese: 'すみません、京都駅までお願いします。あと何分くらいで着きますか？',
          furigana: 'すみません、きょうとえきまで おねがいします。あと なんぷんくらいで つきますか？',
          koreanPronunciation: '스미마센, 쿄-토에키마데 오네가이시마스. 아토 난푼쿠라이데 츠키마스카?',
          koreanTranslation: '저기요, 교토역까지 부탁해요. 몇 분 정도면 도착하나요?',
          realLifeTip: '택시 기사님이 되어 소요 시간과 하차 위치를 친절히 물어보세요!',
          vocab: [],
        },
        missions: [
          '예상 소요 시간(예: 10분 정도)을 알려주기',
          '어느 위치에서 세워 드릴지(お止めしましょうか) 물어보기',
          '요금 결제 및 잊으신 물건(お忘れ物) 없는지 인사하기',
        ],
      },
    },
  },
  {
    id: 'ramen-ticket-custom',
    category: 'restaurant',
    title: '라멘집 식권 자판기 & 면 삶기·농도 커스텀',
    subtitle: '식권(쇼쿠켄) 건네기 · 면 단단함(카타메) · 파/마늘 추가 · 카에다마(면 추가)',
    placeName: '후쿠오카/도쿄 돈코츠 라멘 전문점',
    difficulty: '실전',
    estimatedMinutes: 5,
    customerRoleName: '라멘집 손님 (A)',
    staffRoleName: '라멘집 직원 (B)',
    situationBrief:
      '입구 식권 자판기(권매기)에서 식권을 뽑아 자리에 앉았습니다. 직원이 식권을 받자마자 면의 삶기 정도(단단함), 국물 진하기, 마늘 유무를 빠르게 물어봅니다!',
    whyHardToUnderstand:
      '라멘집 직원은 "멘노 카타사와 도-사레마스카?(면의 단단함은 어떻게 하시겠어요?)", "오코노미와?(취향 선택은요?)"라고 짧고 힘차게 물어봅니다. "카타메(꼬들면)", "후츠-(보통)", "야와라카메(부드러운 면)" 세 단어를 알면 당황하지 않습니다!',
    keyTakeaways: [
      '면 삶기 대답: "카타메데 오네가이시마스(꼬들꼬들한 면으로 부탁해요)" 또는 "후츠-데(보통으로)"',
      '마늘/파 토핑: "닌니쿠 스코시(마늘 조금)", "젠부 후츠-데(전부 보통으로)"',
      '먹다가 면 추가: "스미마센, 카에다마 히토츠!(저기요, 면 사리 추가 하나요!)"',
    ],
    turns: [
      {
        id: 'rm-1',
        speaker: 'staff',
        speakerLabel: '라멘집 직원 (B)',
        japanese: 'いらっしゃいませ！食券（しょっけん）をお預かりします。麺の硬さはいかがなさいますか？',
        furigana: 'いらっしゃいませ！ しょっけんを おあずかりします。めんの かたさは いかがなさいますか？',
        koreanPronunciation: '이랏샤이마세! 숏켄오 오아즈카리시마스. 멘노 카타사와 이카가 나사이마스카?',
        koreanTranslation: '어서 오세요! 식권을 받겠습니다. 면의 단단함(삶기 정도)은 어떻게 하시겠어요?',
        realLifeTip:
          '일본 라멘집(이에케 라멘, 하카타 돈코츠 라멘 등)에서는 식권을 건네자마자 100% 물어보는 질문입니다! "멘노 카타사(면의 단단함)"가 들리면 바로 취향을 말해주세요.',
        staffKeigoPoint:
          '식권을 받을 때 "모라이마스" 대신 "오아즈카리시마스(맡겠습니다/받겠습니다)"라고 말합니다.',
        vocab: [
          { word: '食券', reading: 'しょっけん', koreanPronunciation: '숏켄', meaning: '식권' },
          { word: '麺の硬さ', reading: 'めんのかたさ', koreanPronunciation: '멘노 카타사', meaning: '면의 단단함 (삶기 정도)' },
        ],
      },
      {
        id: 'rm-2',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: '麺はかためでお願いします。あと、味の濃さは普通でいいです。',
        furigana: 'めんは かためで おねがいします。あと、あじの こさは ふつうで いいです。',
        koreanPronunciation: '멘와 카타메데 오네가이시마스. 아토, 아지노 코사와 후츠-데 이-데스.',
        koreanTranslation: '면은 꼬들꼬들하게(단단하게) 부탁해요. 그리고 국물 간(농도)은 보통으로 괜찮아요.',
        realLifeTip:
          '일본 현지인들이 가장 선호하는 조합이 "멘 카타메(면은 꼬들하게)"입니다! 일일이 고르기 힘들 땐 "젠부 후츠-데 오네가이시마스(전부 보통으로 해주세요)"라고 하면 해결됩니다.',
        vocab: [
          { word: 'かため', reading: 'かため', koreanPronunciation: '카타메', meaning: '약간 단단함 (꼬들면)' },
          { word: '味の濃さ', reading: 'あじのこさ', koreanPronunciation: '아지노 코사', meaning: '맛의 진하기 (염도/농도)' },
          { word: '普通', reading: 'ふつう', koreanPronunciation: '후츠-', meaning: '보통, 기본' },
        ],
        alternatives: [
          {
            japanese: '全部普通（ふつう）でお願いします。',
            furigana: 'ぜんぶ ふつうで おねがいします。',
            koreanPronunciation: '젠부 후츠-데 오네가이시마스.',
            koreanTranslation: '전부 다 보통(기본)으로 부탁합니다.',
            nuance: '복잡한 커스텀 질문을 한 방에 해결하는 마법의 문장!',
          },
        ],
      },
      {
        id: 'rm-3',
        speaker: 'staff',
        speakerLabel: '라멘집 직원 (B)',
        japanese: 'かしこまりました！ニンニクはお入れしますか？また、紙エプロンはご利用ですか？',
        furigana: 'かしこまりました！ にんにくは おいれしますか？ また、かみえぷろんは ごりようですか？',
        koreanPronunciation: '카시코마리마시타! 닌니쿠와 오이레시마스카? 마타, 카미에푸론와 고리요-데스카?',
        koreanTranslation: '알겠습니다! 마늘은 넣어 드릴까요? 그리고 종이 앞치마는 사용하시겠어요?',
        realLifeTip:
          '라멘이나 츠케멘, 카레 우동집에서는 옷에 국물이 튀지 않도록 "카미에푸론(종이 앞치마)"이 필요한지 자주 물어봅니다!',
        staffKeigoPoint:
          '"닌니쿠 이레마스카?"를 정중하게 "닌니쿠와 오이레시마스카?(마늘은 넣어 드릴까요?)"로 묻습니다.',
        vocab: [
          { word: 'ニンニク', reading: 'にんにく', koreanPronunciation: '닌니쿠', meaning: '마늘 (빼달라고 할 땐 ニンニクなしで)' },
          { word: '紙エプロン', reading: 'かみえぷろん', koreanPronunciation: '카미에푸론', meaning: '일회용 종이 앞치마' },
        ],
      },
      {
        id: 'rm-4',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'ニンニクは少し入れてください。紙エプロンも一枚お願いします！',
        furigana: 'にんにくは すこし いれて ください。かみえぷろんも いちまい おねがいします！',
        koreanPronunciation: '닌니쿠와 스코시 이레테 쿠다사이. 카미에푸론모 이치마이 오네가이시마스!',
        koreanTranslation: '마늘은 조금 넣어 주세요. 종이 앞치마도 한 장 부탁해요!',
        realLifeTip:
          '마늘을 아예 안 넣고 싶다면 "닌니쿠 나시데(마늘 빼고)", 많이 넣고 싶다면 "닌니쿠 오-메데(마늘 많이)"라고 말해보세요.',
        vocab: [
          { word: '少し', reading: 'すこし', koreanPronunciation: '스코시', meaning: '조금, 약간' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-rm-s1',
          speaker: 'staff',
          speakerLabel: '라멘집 직원',
          japanese: 'いらっしゃいませ！食券をお預かりします。お好み（麺の硬さや味の濃さ）はいかがなさいますか？',
          furigana: 'いらっしゃいませ！ しょっけんを おあずかりします。おこのみ（めんのかたさや あじのこさ）は いかがなさいますか？',
          koreanPronunciation: '이랏샤이마세! 숏켄오 오아즈카리시마스. 오코노미(멘노 카타사야 아지노 코사)와 이카가 나사이마스카?',
          koreanTranslation: '어서 오세요! 식권을 받겠습니다. 취향(면 삶기나 국물 진하기)은 어떻게 해 드릴까요?',
          realLifeTip: '면 삶기(かため/普通), 마늘 유무, 면 추가(替え玉) 등을 말해보세요!',
          vocab: [],
        },
        missions: [
          '면의 삶기 정도(かため 또는 普通) 말하기',
          '마늘(ニンニク) 추가 여부와 종이 앞치마(紙エプロン) 요청하기',
          '식사 도중 면 사리 추가(替え玉 かえだま) 주문해보기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-rm-c1',
          speaker: 'customer',
          speakerLabel: '라멘집 손님',
          japanese: 'すみません、この食券お願いします！',
          furigana: 'すみません、この しょっけん おねがいします！',
          koreanPronunciation: '스미마센, 코노 숏켄 오네가이시마스!',
          koreanTranslation: '저기요, 이 식권 부탁합니다!',
          realLifeTip: '라멘집 직원이 되어 면의 단단함과 마늘, 앞치마 필요 여부를 물어보세요!',
          vocab: [],
        },
        missions: [
          '식권을 받으며 면의 단단함(麺の硬さ) 물어보기',
          '마늘(ニンニク)과 종이 앞치마(紙エプロン) 필요 여부 물어보기',
          '힘차게 주문을 복창하고 잠시만 기다려 달라고 안내하기',
        ],
      },
    },
  },
  {
    id: 'shopping-fitting-size',
    category: 'convenience',
    title: '옷가게·백화점 시착(피팅룸) & 새 사이즈 요청',
    subtitle: '입어봐도 되는지 질문 · 피팅룸 안내 · 한 치수 큰 사이즈 문의',
    placeName: '시부야/하라주쿠 편집샵 & 백화점 매대',
    difficulty: '중급',
    estimatedMinutes: 5,
    customerRoleName: '쇼핑객 손님 (A)',
    staffRoleName: '매장 스태프 (B)',
    situationBrief:
      '마음에 드는 옷을 발견해 입어보고(시착) 싶습니다. 매장 직원에게 피팅룸 이용을 요청하고, 입어본 뒤 한 치수 더 큰 새 상품 재고가 있는지 물어봅니다.',
    whyHardToUnderstand:
      '옷가게 직원은 피팅룸에 들어갈 때 "난텐 고자이마스카?(몇 벌이신가요?)", "오츠기노 사마 고안나이시마스(안내해 드리겠습니다)", "이카가데시타카?(사이즈 어떠셨나요?)"를 빠르고 세련된 어조로 물어봅니다.',
    keyTakeaways: [
      '입어보기 요청: "코레, 시챠쿠시테모 이-데스카?(이거 입어봐도 되나요?)"',
      '다른 사이즈 문의: "모- 히토츠 오-키이 사이즈와 아리마스카?(한 치수 더 큰 사이즈 있나요?)"',
      '새 상품 재고 확인: "아타라시이 자이코와 아리마스카?(새 상품 재고 있나요?)"',
    ],
    turns: [
      {
        id: 'sh-1',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: 'すみません、これ試着（しちゃく）してもいいですか？',
        furigana: 'すみません、これ しちゃくしても いいですか？',
        koreanPronunciation: '스미마센, 코레 시챠쿠시테모 이-데스카?',
        koreanTranslation: '저기요, 이거 입어봐도(시착해도) 될까요?',
        realLifeTip:
          '일본 옷가게에서는 피팅룸에 그냥 들어가지 않고 직원에게 먼저 "시챠쿠시테모 이-데스카?"라고 말한 뒤 번호표를 받는 것이 매너입니다!',
        vocab: [
          { word: '試着', reading: 'しちゃく', koreanPronunciation: '시챠쿠', meaning: '시착 (옷/신발을 착용해 봄)' },
        ],
      },
      {
        id: 'sh-2',
        speaker: 'staff',
        speakerLabel: '매장 스태프 (B)',
        japanese: 'はい、もちろんです！全部で何点（なんてん）ございますか？お履き物を脱いでお入りください。',
        furigana: 'はい、もちろんです！ ぜんぶで なんてん ございますか？ おはきものを ぬいで おはいりください。',
        koreanPronunciation: '하이, 모치론데스! 젠부데 난텐 고자이마스카? 오하키모노오 누이데 오하이리 쿠다사이.',
        koreanTranslation: '네, 물론이죠! 전부 몇 벌(몇 점)이신가요? 신발을 벗고 들어가 주세요.',
        realLifeTip:
          '일본 피팅룸의 2대 핵심! ① 옷 개수를 "난텐(何点, 몇 점)"으로 물어봅니다(1벌=잇텐, 2벌=니텐). ② 피팅룸 카펫 위에 올라갈 때 반드시 신발("오하키모노")을 벗고 들어가야 합니다!',
        staffKeigoPoint:
          '"쿠츠(신발)" 대신 높임말인 "오하키모노(신으시는 것)"를, 옷 개수에는 "난텐 고자이마스카"를 사용합니다.',
        vocab: [
          { word: '何点', reading: 'なんてん', koreanPronunciation: '난텐', meaning: '몇 점, 몇 벌 (1점=一点 いってん, 2점=二点 にてん)' },
          { word: 'お履き物', reading: 'おはきもの', koreanPronunciation: '오하키모노', meaning: '신발 (높임말)' },
          { word: '脱いで', reading: 'ぬいで', koreanPronunciation: '누이데', meaning: '벗고서' },
        ],
      },
      {
        id: 'sh-3',
        speaker: 'customer',
        speakerLabel: '손님 (A)',
        japanese: '二点です。（試着後）すみません、これ少し小さいんですが、ひとつ大きいサイズはありますか？',
        furigana: 'にてんです。（しちゃくご）すみません、これ すこし ちいさいんですが、ひとつ おおきい さいずは ありますか？',
        koreanPronunciation: '니텐데스. (시챠쿠고) 스미마센, 코레 스코시 치-사인데스가, 히토츠 오-키- 사이즈와 아리마스카?',
        koreanTranslation: '두 벌입니다. (입어본 후) 저기요, 이게 조금 작은데 한 치수 큰 사이즈가 있나요?',
        realLifeTip:
          '"히토츠 오-키- 사이즈(한 치수 큰 사이즈)" / "히토츠 치-사이 사이즈(한 치수 작은 사이즈)"는 옷과 신발 쇼핑에서 무조건 쓰이는 표현입니다!',
        vocab: [
          { word: '二点', reading: 'にてん', koreanPronunciation: '니텐', meaning: '두 벌(두 점)' },
          { word: 'ひとつ大きいサイズ', reading: 'ひとつおおきいさいず', koreanPronunciation: '히토츠 오-키- 사이즈', meaning: '한 단계 큰 사이즈' },
        ],
      },
      {
        id: 'sh-4',
        speaker: 'staff',
        speakerLabel: '매장 스태프 (B)',
        japanese: 'Lサイズですね！在庫（ざいこ）を確認してまいりますので、少々お待ちくださいませ。',
        furigana: 'えるさいずですね！ ざいこを かくにんして まいりますので、しょうしょう おまちくださいませ。',
        koreanPronunciation: '에루 사이즈데스네! 자이코오 카쿠닌시테 마이리마스노데, 쇼-쇼- 오마치 쿠다사이마세.',
        koreanTranslation: 'L 사이즈시군요! 재고를 확인하고 오겠습니다, 잠시만 기다려 주십시오.',
        realLifeTip:
          '직원이 "자이코오 카쿠닌시테 마이리마스(재고를 확인하고 오겠습니다)"라고 하면 창고에서 새 상품을 찾아온다는 뜻입니다!',
        staffKeigoPoint:
          '"미테 키마스(보고 올게요)"의 겸양어인 "카쿠닌시테 마이리마스(확인하고 오겠습니다)"를 씁니다.',
        vocab: [
          { word: '在庫', reading: 'ざいこ', koreanPronunciation: '자이코', meaning: '재고 (새 상품)' },
          { word: '確認してまいります', reading: 'かくにんしてまいります', koreanPronunciation: '카쿠닌시테 마이리마스', meaning: '확인하고 오겠습니다 (겸양어)' },
        ],
      },
    ],
    freeTalkStarter: {
      customerStarts: {
        staffOpening: {
          id: 'ft-sh-s1',
          speaker: 'staff',
          speakerLabel: '의류 매장 직원',
          japanese: 'いらっしゃいませ！気になる商品がございましたら、ご試着もできますのでお声がけくださいね。',
          furigana: 'いらっしゃいませ！ きになる しょうひんが ございましたら、ごしちゃくも できますので おこえがけ くださいね。',
          koreanPronunciation: '이랏샤이마세! 키니나루 쇼-힌가 고자이마시타라, 고시챠쿠모 데키마스노데 오코에가케 쿠다사이네.',
          koreanTranslation: '어서 오세요! 마음에 드는 상품이 있으시면 입어보실 수도 있으니 편하게 말씀해 주세요.',
          realLifeTip: '시착(피팅룸)을 요청하고 다른 사이즈나 색상이 있는지 물어보세요!',
          vocab: [],
        },
        missions: [
          '옷을 입어봐도 되는지(試着してもいいですか) 물어보고 몇 벌인지 답하기',
          '한 치수 큰 사이즈(ひとつ大きいサイズ)나 다른 색상이 있는지 물어보기',
          '새 상품 재고(新しい在庫)로 구매하겠다고 말하기',
        ],
      },
      staffStarts: {
        customerOpening: {
          id: 'ft-sh-c1',
          speaker: 'customer',
          speakerLabel: '쇼핑객 손님',
          japanese: 'すみません、このシャツを試着したいんですが、いいですか？',
          furigana: 'すみません、この しゃつを しちゃくしたいんですが、いいですか？',
          koreanPronunciation: '스미마센, 코노 샤츠오 시챠쿠시타인데스가, 이-데스카?',
          koreanTranslation: '저기요, 이 셔츠를 입어보고 싶은데 괜찮을까요?',
          realLifeTip: '옷가게 스태프가 되어 몇 벌인지 확인하고 신발을 벗고 들어가 달라고 안내해보세요!',
          vocab: [],
        },
        missions: [
          '총 몇 벌(何点)인지 물어보고 신발을 벗고 들어가라고 안내하기',
          '시착 후 손님에게 사이즈가 어떠셨는지(いかがでしたか) 물어보기',
          '재고를 확인하고 오겠다고(在庫を確認してまいります) 정중히 응대하기',
        ],
      },
    },
  },
];


