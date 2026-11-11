import { RoleType } from '../types/conversation';

export interface FreeTalkTopic {
  id: string;
  category: string;
  categoryEmoji: string;
  title: string;
  situationBrief: string;
  partnerRoleName: string;
  userRoleName: string;
  customerOpening: {
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    koreanTranslation: string;
    realLifeTip: string;
    suggestedReplies: Array<{
      japanese: string;
      koreanPronunciation: string;
      koreanTranslation: string;
    }>;
  };
  staffOpening: {
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    koreanTranslation: string;
    realLifeTip: string;
    suggestedReplies: Array<{
      japanese: string;
      koreanPronunciation: string;
      koreanTranslation: string;
    }>;
  };
}

export const CURATED_FREETALK_TOPICS: FreeTalkTopic[] = [
  // 1. 식당 & 카페 & 이자카야
  {
    id: 'topic-restaurant-order',
    category: '식당 & 이자카야',
    categoryEmoji: '🍜',
    title: '도쿄 골목 라멘집에서 주문 및 면/국물 취향 요청하기',
    situationBrief: '현지인들이 줄 서는 라멘집에 들어와 자리를 안내받고, 면 삶기 정도와 국물 진하기, 토핑을 주문하는 상황입니다.',
    partnerRoleName: '라멘집 직원',
    userRoleName: '손님',
    customerOpening: {
      japanese: 'いらっしゃいませ！何名様ですか？カウンター席へどうぞ！ご注文はお決まりですか？',
      furigana: 'いらっしゃいませ！なんめいさまですか？かうんたーせきへどうぞ！ごちゅうもんはおきまりですか？',
      koreanPronunciation: '이랏샤이마세! 난메-사마데스카? 카운타-세키에 도-조! 고추-몽와 오키마리데스카?',
      koreanTranslation: '어서 오세요! 몇 분이신가요? 카운터석으로 앉으세요! 주문은 결정하셨나요?',
      realLifeTip: '라멘집에선 면 익힘(카타메/후츠우), 국물 농도(코이메/후츠우)를 물어보는 경우가 많습니다.',
      suggestedReplies: [
        {
          japanese: '一人です。とんこつラーメン一つ、麺は固めでお願いします。',
          koreanPronunciation: '히토리데스. 돈코츠 라-멘 히토츠, 멩와 카타메데 오네가이시마스.',
          koreanTranslation: '한 명입니다. 돈코츠 라멘 하나, 면은 꼬들꼬들하게 부탁합니다.',
        },
        {
          japanese: '一番人気のおすすめラーメンは何ですか？',
          koreanPronunciation: '이치방 닌키노 오스스메 라-멘와 난데스카?',
          koreanTranslation: '가장 인기 있는 추천 라멘은 어떤 건가요?',
        },
      ],
    },
    staffOpening: {
      japanese: 'すみません、注文をお願いできますか？おすすめのラーメンを教えてください。',
      furigana: 'すみません、ちゅうもんをおねがいできますか？おすすめのらーめんをおしえてください。',
      koreanPronunciation: '스미마센, 추-몽오 오네가이 데키마스카? 오스스메노 라-멘오 오시에테 쿠다사이.',
      koreanTranslation: '저기요, 주문할 수 있을까요? 추천 라멘 좀 알려주세요.',
      realLifeTip: '손님이 추천을 물어보면 "저희 가게 간판 메뉴는 특제 돈코츠입니다" 등으로 친절히 안내합니다.',
      suggestedReplies: [
        {
          japanese: 'はい、喜んで！当店一番人気の特製とんこつラーメンがおすすめです。',
          koreanPronunciation: '하이, 요로콘데! 토-텐 이치방 닌키노 토쿠세이 돈코츠 라-멘가 오스스메데스.',
          koreanTranslation: '네, 기꺼이요! 저희 매장 1등 인기인 특제 돈코츠 라멘을 추천해 드립니다.',
        },
      ],
    },
  },

  {
    id: 'topic-izakaya-smalltalk',
    category: '식당 & 이자카야',
    categoryEmoji: '🍻',
    title: '퇴근길 이자카야에서 옆자리 현지인과 맥주 한잔하며 수다떨기',
    situationBrief: '도쿄 신바시의 활기찬 선술집(이자카야)에서 카운터석에 앉아 맥주를 마시던 중, 옆자리 일본인 회사원이 말을 건네는 상황입니다.',
    partnerRoleName: '옆자리 회사원 다나카',
    userRoleName: '한국인 여행자',
    customerOpening: {
      japanese: 'こんばんは！お隣いいですか？もしかして韓国から旅行で来られたんですか？',
      furigana: 'こんばんは！おとなりいいですか？もしかしてかんこくからりょこうでこられたんですか？',
      koreanPronunciation: '콘방와! 오토나리 이이데스카? 모시카시테 칸코쿠카라 료코-데 코라레탄데스카?',
      koreanTranslation: '안녕하세요! 옆자리 괜찮으시죠? 혹시 한국에서 여행 오신 건가요?',
      realLifeTip: '일본 이자카야에서는 "건배(칸파이)"를 나누며 가볍게 여행 이야기나 좋아하는 음식 이야기를 트는 문화가 있습니다.',
      suggestedReplies: [
        {
          japanese: 'こんばんは！はい、ソウルから一人旅で来ました。乾杯しましょう！',
          koreanPronunciation: '콘방와! 하이, 소우루카라 히토리타비데 키마시타. 캄파이 시마쇼-!',
          koreanTranslation: '안녕하세요! 네, 서울에서 혼자 여행 왔어요. 건배해요!',
        },
        {
          japanese: 'はい、日本のご飯が大好きで来ました！このお店で美味しいおつまみは何ですか？',
          koreanPronunciation: '하이, 니혼노 고항가 다이스키데 키마시타! 코노 오미세데 오이시이 오츠마미와 난데스카?',
          koreanTranslation: '네, 일본 음식이 너무 좋아서 왔어요! 이 집에서 맛있는 안주는 뭐예요?',
        },
      ],
    },
    staffOpening: {
      japanese: '乾杯！旅行中なんですか？東京でどこか行かれましたか？',
      furigana: 'かんぱい！りょこうちゅうなんですか？とうきょうでどこかいかれましたか？',
      koreanPronunciation: '캄파이! 료코-추- 난데스카? 토-쿄-데 도코카 이카레마시타카?',
      koreanTranslation: '건배! 여행 중이신가요? 도쿄에서 어디 어디 가보셨어요?',
      realLifeTip: '상대방이 물어볼 때는 오늘 가본 명소나 먹은 음식을 짧고 밝게 이야기하면 대화가 자연스럽습니다.',
      suggestedReplies: [
        {
          japanese: '今日は浅草と渋谷に行ってきました！人が多くて活気がありましたよ。',
          koreanPronunciation: '쿄-와 아사쿠사토 시부야니 잇테키마시타! 히토가 오오쿠테 캇키가 아리마시타요.',
          koreanTranslation: '오늘은 아사쿠사랑 시부야에 다녀왔어요! 사람이 많고 활기차더라고요.',
        },
      ],
    },
  },

  // 2. 쇼핑 & 편의점 & 면세
  {
    id: 'topic-shopping-size-taxfree',
    category: '쇼핑 & 편의점',
    categoryEmoji: '🛍️',
    title: '신주쿠 옷 매장에서 사이즈 시착 및 면세(Tax-Free) 수속하기',
    situationBrief: '마음에 드는 재킷과 바지를 발견하여 다른 사이즈 시착을 부탁하고, 계산 시 면세 할인을 요청하는 상황입니다.',
    partnerRoleName: '의류 매장 직원',
    userRoleName: '손님',
    customerOpening: {
      japanese: 'いらっしゃいませ！何かお探しのものはございますか？ご試着もできますよ！',
      furigana: 'いらっしゃいませ！なにかおさがしのものはございますか？ごしちゃくもできますよ！',
      koreanPronunciation: '이랏샤이마세! 나니카 오사가시노 모노와 고자이마스카? 고시차쿠모 데키마스요!',
      koreanTranslation: '어서 오세요! 찾으시는 상품이 있으신가요? 입어보시는 것도 가능해요!',
      realLifeTip: '옷을 입어볼 땐 "시착해도 돼요?(試着してもいいですか)"라고 가볍게 물어보면 피팅룸으로 안내해줍니다.',
      suggestedReplies: [
        {
          japanese: 'すみません、これ試着してもいいですか？これより一つ大きいサイズはありますか？',
          koreanPronunciation: '스미마센, 코레 시차쿠 시테모 이이데스카? 코레요리 히토츠 오오키이 사이즈와 아리마스카?',
          koreanTranslation: '저기요, 이거 입어봐도 될까요? 이것보다 한 치수 큰 사이즈 있나요?',
        },
        {
          japanese: 'お会計の時に免税（タックスフリー）は利用できますか？',
          koreanPronunciation: '오카이케이노 토키니 멘제이(탓쿠스후리-)와 리요- 데키마스카?',
          koreanTranslation: '계산할 때 면세(Tax-Free) 이용 가능한가요?',
        },
      ],
    },
    staffOpening: {
      japanese: 'すみません、この服を試着したいのですが、試着室はどこですか？',
      furigana: 'すみません、このふくをしちゃくしたいのですが、しちゃくしつはどこですか？',
      koreanPronunciation: '스미마센, 코노 후쿠오 시차쿠 시타이노데스가, 시차쿠시츠와 도코데스카?',
      koreanTranslation: '저기요, 이 옷 시착해보고 싶은데 피팅룸이 어디인가요?',
      realLifeTip: '직원은 손님을 피팅룸으로 안내하고 신발을 벗고 들어갈 것을 정중히 안내합니다.',
      suggestedReplies: [
        {
          japanese: 'ご試着室はこちらでございます。どうぞご案内いたします！',
          koreanPronunciation: '고시차쿠시츠와 코치라데 고자이마스. 도-조 고안나이 이타시마스!',
          koreanTranslation: '피팅룸은 이쪽입니다. 편하게 안내해 드릴게요!',
        },
      ],
    },
  },

  // 3. 호텔 & 료칸 & 온천
  {
    id: 'topic-hotel-checkin-luggage',
    category: '호텔 & 료칸',
    categoryEmoji: '🏨',
    title: '체크인 전 짐 맡기기 & 대욕장(온천) 이용 시간 문의하기',
    situationBrief: '오후 1시에 호텔에 도착하여 체크인 시간(오후 3시) 전까지 캐리어를 맡기고, 호텔 온천과 조식 위치를 묻는 상황입니다.',
    partnerRoleName: '호텔 프런트 직원 사토',
    userRoleName: '투숙객',
    customerOpening: {
      japanese: 'いらっしゃいませ、TabiTalkホテルへようこそ。チェックインのご予約でしょうか？',
      furigana: 'いらっしゃいませ、TabiTalkほてるへようこそ。ちぇっくいんのごよやくでしょうか？',
      koreanPronunciation: '이랏샤이마세, 타비토-쿠 호테루에 요-코소. 첵쿠인노 고요야쿠데쇼-카?',
      koreanTranslation: '어서 오세요, TabiTalk 호텔에 오신 것을 환영합니다. 체크인 예약 손님이실까요?',
      realLifeTip: '일본 호텔은 체크인 전과 체크아웃 후 모두 당일 무료 짐 보관(荷物預かり) 서비스를 제공합니다.',
      suggestedReplies: [
        {
          japanese: 'チェックイン前なんですが、先にスーツケースを夕方まで預かってもらえますか？',
          koreanPronunciation: '첵쿠인 마에난데스가, 사키니 수-츠케-스오 유-가타마데 아즈캇테 모라에마스카?',
          koreanTranslation: '체크인 전인데, 먼저 캐리어를 저녁까지 맡길 수 있을까요?',
        },
        {
          japanese: '大浴場（温泉）と明日の朝食は何時から利用できますか？',
          koreanPronunciation: '다이요쿠죠-(온센)토 아시타노 조-쇼쿠와 난지카라 리요- 데키마스카?',
          koreanTranslation: '대욕장(온천)과 내일 아침 식사는 몇 시부터 이용할 수 있나요?',
        },
      ],
    },
    staffOpening: {
      japanese: 'チェックインをお願いします。予約したキムです。荷物も預けたいのですが。',
      furigana: 'ちぇっくいんをおねがいします。よやくしたきむです。にもつもあずけたいのですが。',
      koreanPronunciation: '첵쿠인오 오네가이시마스. 요야쿠시타 키무데스. 니모츠모 아즈케타이노데스가.',
      koreanTranslation: '체크인 부탁합니다. 예약자 김입니다. 짐도 맡기고 싶은데요.',
      realLifeTip: '직원 역할을 할 때는 여권(パスポート) 제시 요청과 보관증(お預かり札) 전달을 연습해보세요.',
      suggestedReplies: [
        {
          japanese: 'キム様、ご予約ありがとうございます。パスポートのご提示をお願いできますでしょうか？',
          koreanPronunciation: '키무사마, 고요야쿠 아리가토-고자이마스. 파스포-토노 고테이지오 오네가이 데키마스데쇼-카?',
          koreanTranslation: '김 고객님, 예약 감사합니다. 여권 제시를 부탁드려도 될까요?',
        },
      ],
    },
  },

  // 4. 교통 & 지하철 & 길찾기
  {
    id: 'topic-station-directions-error',
    category: '교통 & 길찾기',
    categoryEmoji: '🚇',
    title: '지하철역에서 신주쿠행 환승 승강장 묻기 & 교통카드 에러 해결',
    situationBrief: '복잡한 도쿄역 개찰구에서 스이카를 찍었는데 빨간 불 에러가 나고, 신주쿠로 가는 빠른 열차 승강장을 역무원에게 묻는 상황입니다.',
    partnerRoleName: '역무원 다카하시',
    userRoleName: '승객',
    customerOpening: {
      japanese: 'どうされましたか？Suicaのエラーでしょうか、お調べいたしますよ！',
      furigana: 'どうされましたか？Suicaのえらーでしょうか、おしらべいたしますよ！',
      koreanPronunciation: '도- 사레마시타카? 스이카노 에라-데쇼-카, 오시라베 이타시마스요!',
      koreanTranslation: '무슨 일이신가요? 스이카 카드 에러이신가요, 확인해 드릴게요!',
      realLifeTip: '교통카드 터치 시 삐빅 소리가 나며 문이 닫히면 역무원 창구(窓口)에 보여주면 즉시 처리해줍니다.',
      suggestedReplies: [
        {
          japanese: '改札でエラーが出ました。見てもらえますか？チャージもしたいです。',
          koreanPronunciation: '카이사츠데 에라-가 데마시타. 미테 모라에마스카? 차-지모 시타이데스.',
          koreanTranslation: '개찰구에서 에러가 났어요. 봐주실 수 있나요? 충전도 하고 싶어요.',
        },
        {
          japanese: '新宿へ行くには、何番ホームの電車に乗れば一番早いですか？',
          koreanPronunciation: '신주쿠에 이쿠니와, 난방 호-무노 덴샤니 노레바 이치방 하야이데스카?',
          koreanTranslation: '신주쿠에 가려면 몇 번 홈 전철을 타는 게 가장 빠른가요?',
        },
      ],
    },
    staffOpening: {
      japanese: 'すみません、新宿に行きたいのですが、この電車で合っていますか？',
      furigana: 'すみません、しんじゅくにいきたいのですが、このでんしゃであっていますか？',
      koreanPronunciation: '스미마센, 신주쿠니 이키타이노데스가, 코노 덴샤데 앗테이마스카?',
      koreanTranslation: '저기요, 신주쿠에 가고 싶은데 이 전철이 맞나요?',
      realLifeTip: '승객에게 올바른 승강장 번호(中央線 快速 1番線 등)를 알려주는 표현을 연습할 수 있습니다.',
      suggestedReplies: [
        {
          japanese: 'はい、中央線の快速でしたら、向かい側の1番線から乗っていただけます！',
          koreanPronunciation: '하이, 추-오-센노 카이소쿠데시타라, 무카이가와노 이치반센카라 놋테 이타다케마스!',
          koreanTranslation: '네, 주오선 쾌속이라면 맞은편 1번 홈에서 타시면 됩니다!',
        },
      ],
    },
  },

  // 5. 카페 & 일상 스몰토크
  {
    id: 'topic-cafe-local-talk',
    category: '일상 & 스몰토크',
    categoryEmoji: '☕',
    title: '시부야 감성 카페에서 옆자리 사람과 여행 명소 & 문화 이야기 나누기',
    situationBrief: '아기자기한 시부야 로컬 카페에서 아이스 드립 커피를 마시며 쉬던 중, 카메라와 다이어리를 보던 옆자리 현지인과 즐겁게 대화하는 상황입니다.',
    partnerRoleName: '카페 손님 유이',
    userRoleName: '한국인 여행자',
    customerOpening: {
      japanese: '素敵なカメラですね！東京の写真はたくさん撮れましたか？',
      furigana: 'すてきなかめらですね！とうきょうのしゃしんはたくさんとれましたか？',
      koreanPronunciation: '스테키나 카메라데스네! 토-쿄-노 샤신와 탁상 토레마시타카?',
      koreanTranslation: '멋진 카메라네요! 도쿄 사진은 많이 찍으셨나요?',
      realLifeTip: '카페나 샵에서 가벼운 칭찬(멋지네요, 맛있네요)으로 시작하면 자연스럽게 좋은 여행 팁을 얻을 수 있습니다.',
      suggestedReplies: [
        {
          japanese: 'ありがとうございます！韓国から旅行で来ました。東京の街並みがとても綺麗です。',
          koreanPronunciation: '아리가토-고자이마스! 칸코쿠카라 료코-데 키마시타. 토-쿄-노 마치나미가 토테모 키레이데스.',
          koreanTranslation: '감사합니다! 한국에서 여행 왔어요. 도쿄 거리가 정말 예뻐요.',
        },
        {
          japanese: 'この近くで、地元の人しか知らないおすすめの穴場スポットはありますか？',
          koreanPronunciation: '코노 치카쿠데, 지모토노 히토시카 시라나이 오스스메노 아나바 스폿토와 아리마스카?',
          koreanTranslation: '이 근처에 현지인들만 아는 추천 숨은 명소가 있을까요?',
        },
      ],
    },
    staffOpening: {
      japanese: '東京旅行でどこが一番楽しかったですか？おすすめの場所はありますか？',
      furigana: 'とうきょうりょこうでどこがいちばんたのしかったですか？おすすめのばしょはありますか？',
      koreanPronunciation: '토-쿄- 료코-데 도코가 이치방 타노시캇타데스카? 오스스메노 바쇼와 아리마스카?',
      koreanTranslation: '도쿄 여행에서 어디가 제일 재미있으셨어요? 추천하는 곳이 있나요?',
      realLifeTip: '서로의 경험을 공유하며 자연스럽게 질문을 되받아치는 리액션을 연습합니다.',
      suggestedReplies: [
        {
          japanese: '夕暮れの代々木公園と下北沢のカフェ巡りが本当に良かったです！',
          koreanPronunciation: '유-구레노 요요기코-엔토 시모키타자와노 카페메구리가 혼토-니 요캇타데스!',
          koreanTranslation: '해질녘 요요기 공원과 시모키타자와 카페 투어가 정말 좋았어요!',
        },
      ],
    },
  },

  // 6. 약국 & 병원 & 긴급상황
  {
    id: 'topic-pharmacy-symptom-cure',
    category: '약국 & 응급',
    categoryEmoji: '🚨',
    title: '약국(드러그스토어)에서 갑작스러운 두통/소화불량 증상 설명하고 약 사기',
    situationBrief: '여행 중 갑작스러운 두통과 체기, 속쓰림 증상이 나타나 드럭스토어 약사에게 증상을 설명하고 졸리지 않는 약을 추천받는 상황입니다.',
    partnerRoleName: '드럭스토어 약사 야마다',
    userRoleName: '환자 / 손님',
    customerOpening: {
      japanese: 'どうされましたか？体調がすぐれませんか？お薬のご相談でしょうか？',
      furigana: 'どうされましたか？たいちょうがすぐれませんか？おくすりのごそうだんでしょうか？',
      koreanPronunciation: '도- 사레마시타카? 타이쵸-가 스구레마센카? 오쿠스리노 고소-단데쇼-카?',
      koreanTranslation: '무슨 일이신가요? 몸 상태가 안 좋으신가요? 약 상담이 필요하신가요?',
      realLifeTip: '약국에서는 증상(두통=즈츠우, 소화불량=이초우, 열=네츠)과 "졸리지 않는(네무쿠나라나이)" 조건을 말하면 좋습니다.',
      suggestedReplies: [
        {
          japanese: '頭がとても痛くて少し吐き気がします。眠くならない頭痛薬はありますか？',
          koreanPronunciation: '아타마가 토테모 이타쿠테 스코시 하키케가 시마스. 네무쿠 나라나이 즈츠-야쿠와 아리마스카?',
          koreanTranslation: '머리가 너무 아프고 속이 메스꺼워요. 졸리지 않은 두통약이 있나요?',
        },
        {
          japanese: '胃がもたれて痛いです。即効性のある胃腸薬をおすすめしてください。',
          koreanPronunciation: '이가 모타레테 이타이데스. 속코-세이노 아루 이쵸-야쿠오 오스스메 시테 쿠다사이.',
          koreanTranslation: '위가 더부룩하고 아파요. 효과가 빠른 소화제를 추천해 주세요.',
        },
      ],
    },
    staffOpening: {
      japanese: '熱があって喉が痛いのですが、風邪薬はどこにありますか？',
      furigana: 'ねつがあってのどがいたいのですが、かぜぐすりはどこにありますか？',
      koreanPronunciation: '네츠가 앗테 노도가 이타이노데스가, 카제구스리와 도코니 아리마스카?',
      koreanTranslation: '열이 나고 목이 아픈데, 감기약은 어디에 있나요?',
      realLifeTip: '약사 역할을 할 때는 복용 방법(식후 30분, 하루 3회 등)을 친절하게 안내합니다.',
      suggestedReplies: [
        {
          japanese: '喉の痛みと熱によく効くこちらの総合風邪薬がおすすめです。食後に飲んでください。',
          koreanPronunciation: '노도노 이타미토 네츠니 요쿠 키쿠 코치라노 소-고-카제구스리가 오스스메데스. 쇼쿠고니 논데 쿠다사이.',
          koreanTranslation: '목 통증과 열에 잘 듣는 이 종합 감기약을 추천합니다. 식후에 드세요.',
        },
      ],
    },
  },
];

export function createCustomTopic(
  title: string,
  userRole: RoleType = 'customer'
): FreeTalkTopic {
  const cleanTitle = title.trim() || '자유 일상 대화';
  const isCustomer = userRole === 'customer';

  return {
    id: `custom-topic-${Date.now()}`,
    category: '직접 입력 맞춤 상황',
    categoryEmoji: '✨',
    title: cleanTitle,
    situationBrief: `사용자가 직접 설정한 상황: "${cleanTitle}". 상대방과 자연스러운 롤플레잉 프리토킹을 진행합니다.`,
    partnerRoleName: isCustomer ? '일본 현지인 파트너' : '일본인 손님',
    userRoleName: isCustomer ? '나 (손님/여행객)' : '나 (점원/안내인)',
    customerOpening: {
      japanese: `こんにちは！「${cleanTitle}」の場面ですね。よろしくお願いします！`,
      furigana: `こんにちは！「${cleanTitle}」のばめんですね。よろしくおねがいします！`,
      koreanPronunciation: `콘니치와! 「${cleanTitle}」노 바멘데스네. 요로시쿠 오네가이시마스!`,
      koreanTranslation: `안녕하세요! 「${cleanTitle}」 상황이군요. 잘 부탁드립니다!`,
      realLifeTip: '상황에 맞게 자유롭게 일본어로 말하거나 한국어로 입력해보세요.',
      suggestedReplies: [
        {
          japanese: 'よろしくお願いします！日本語でたくさん話してみたいです。',
          koreanPronunciation: '요로시쿠 오네가이시마스! 니혼고데 탁상 하나시테 미타이데스.',
          koreanTranslation: '잘 부탁드립니다! 일본어로 많이 대화해보고 싶어요.',
        },
        {
          japanese: 'すみません、これについて少し教えてもらえますか？',
          koreanPronunciation: '스미마센, 코레니 츠이테 스코시 오시에테 모라에마스카?',
          koreanTranslation: '저기요, 이것에 대해 조금 알려주실 수 있나요?',
        },
      ],
    },
    staffOpening: {
      japanese: `すみません、「${cleanTitle}」についてお伺いしたいのですが、いいですか？`,
      furigana: `すみません、「${cleanTitle}」についておうかがいしたいのですが、いいですか？`,
      koreanPronunciation: `스미마센, 「${cleanTitle}」니 츠이테 오우카가이시타이노데스가, 이이데스카?`,
      koreanTranslation: `저기요, 「${cleanTitle}」에 대해 여쭤보고 싶은데 괜찮으실까요?`,
      realLifeTip: '상대방의 요청에 친절한 존댓말이나 적절한 리액션으로 응대해 보세요.',
      suggestedReplies: [
        {
          japanese: 'はい、喜んで！何でも聞いてください。',
          koreanPronunciation: '하이, 요로콘데! 난데모 키이테 쿠다사이.',
          koreanTranslation: '네, 기꺼이요! 무엇이든 물어보세요.',
        },
      ],
    },
  };
}

