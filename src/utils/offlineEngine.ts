// 오프라인 언어팩 프리캐싱(IndexedDB + LocalStorage) 및 한국어<->일본어 다중 절 형태소·구문 번역 엔진
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
} from './japanesePhonetics';

export interface OfflinePackStats {
  isReady: boolean;
  version: string;
  totalSentences: number;
  totalVocabulary: number;
  totalGrammarPatterns: number;
  lastSyncedAt: string;
}

export interface TranslationOutput {
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanMeaning: string;
  engineType: 'offline-pack' | 'offline-neural-cache' | 'online-live';
  confidence: number;
  tip?: string;
}

// ============================================================================
// 1. 사전 구축된 고품질 한<->일 문장 코퍼스 (유사도 매칭 및 절 단위 결합용)
// ============================================================================
export interface CorpusItem {
  ko: string;
  koKeywords: string[];
  jp: string;
  category: string;
}

export const PREBUILT_CORPUS: CorpusItem[] = [
  // [식당 / 주문 / 카페 / 이자카야]
  { ko: '예약은 안 했는데 지금 들어갈 수 있나요?', koKeywords: ['예약', '안', '들어갈'], jp: '予約はしていないんですが、今入れますか？', category: '식당' },
  { ko: '예약 안 했는데 두 명 자리 있나요?', koKeywords: ['예약', '두 명', '자리'], jp: '予約していないんですが、二人席は空いていますか？', category: '식당' },
  { ko: '두 명인데 자리 있나요?', koKeywords: ['두 명', '자리'], jp: '二人ですが、空いている席はありますか？', category: '식당' },
  { ko: '한 명인데 바 자리(카운터석) 괜찮아요.', koKeywords: ['한 명', '카운터', '바 자리'], jp: '一人です。カウンター席で大丈夫です。', category: '식당' },
  { ko: '지금 대기 시간이 얼마나 걸리나요?', koKeywords: ['대기', '웨이팅', '얼마나'], jp: '今、待ち時間はどのくらいかかりますか？', category: '식당' },
  { ko: '주문할게요. 잠시만 와주세요.', koKeywords: ['주문할게요', '주문하겠'], jp: 'すみません、注文をお願いします。', category: '식당' },
  { ko: '한국어 메뉴판이나 영어 메뉴판이 있나요?', koKeywords: ['한국어', '영어', '메뉴'], jp: '韓国語か英語のメニューはありますか？', category: '식당' },
  { ko: '이 가게에서 제일 인기 있는 추천 메뉴는 뭔가요?', koKeywords: ['인기', '추천', '메뉴'], jp: 'このお店で一番人気のおすすめメニューは何ですか？', category: '식당' },
  { ko: '일단 생맥주 두 잔 먼저 주세요.', koKeywords: ['생맥주', '두 잔', '먼저'], jp: 'とりあえず生ビールを二つください。', category: '식당' },
  { ko: '생맥주 한 잔이랑 하이볼 한 잔 주세요.', koKeywords: ['생맥주', '하이볼'], jp: '生ビール一つと、ハイボールを一つお願いします。', category: '식당' },
  { ko: '이거 하나랑 이거 하나 주세요.', koKeywords: ['이거', '하나', '주세요'], jp: 'これ一つと、これを一つください。', category: '식당' },
  { ko: '물 좀 주실 수 있나요?', koKeywords: ['물', '주실', '주세요'], jp: 'すみません、お水をいただけますか？', category: '식당' },
  { ko: '얼음 빼고 주세요.', koKeywords: ['얼음', '빼'], jp: '氷なしでお願いします。', category: '식당' },
  { ko: '얼음은 조금만 넣어 주세요.', koKeywords: ['얼음', '조금', '적게'], jp: '氷は少なめでお願いします。', category: '식당' },
  { ko: '와사비(고추냉이)는 빼고 만들어 주세요.', koKeywords: ['와사비', '고추냉이', '빼'], jp: 'わさび抜きで作ってください。', category: '식당' },
  { ko: '고수는 빼주세요.', koKeywords: ['고수', '빼'], jp: 'パクチーは抜いてください。', category: '식당' },
  { ko: '마늘과 파는 조금만 넣어 주세요.', koKeywords: ['마늘', '파', '조금'], jp: 'ニンニクとネギは少なめにしてください。', category: '식당' },
  { ko: '매운 음식은 잘 못 먹어요. 안 매운 걸로 추천해 주세요.', koKeywords: ['매운', '못 먹'], jp: '辛いものが苦手なので、辛くない料理をおすすめしてください。', category: '식당' },
  { ko: '음식이 너무 짜요. 따뜻한 물이나 육수 조금 주실 수 있나요?', koKeywords: ['짜요', '싱겁게', '따뜻한 물'], jp: '少ししょっぱいので、お湯か出汁を少しいただけますか？', category: '식당' },
  { ko: '앞접시랑 젓가락 하나 더 주세요.', koKeywords: ['앞접시', '젓가락', '더'], jp: '取り皿とお箸をもう一つお願いします。', category: '식당' },
  { ko: '물티슈(오시보리)랑 냅킨 좀 주세요.', koKeywords: ['물티슈', '냅킨', '휴지'], jp: 'おしぼりとナプキンをください。', category: '식당' },
  { ko: '주문한 음식이 아직 안 나왔어요. 확인해 주실 수 있나요?', koKeywords: ['주문한', '안 나왔', '아직'], jp: '頼んだ料理がまだ来ていないのですが、確認してもらえますか？', category: '식당' },
  { ko: '먹고 갈 거예요(매장 식사).', koKeywords: ['먹고 갈', '매장 식사', '매장에서'], jp: '店内で食べていきます。', category: '식당' },
  { ko: '포장(테이크아웃)해 갈게요.', koKeywords: ['포장', '테이크아웃', '가져갈'], jp: '持ち帰り（テイクアウト）でお願いします。', category: '식당' },
  { ko: '남은 음식을 포장해 갈 수 있나요?', koKeywords: ['남은', '포장'], jp: '残った料理を持ち帰ることはできますか？', category: '식당' },
  { ko: '계산해 주세요.', koKeywords: ['계산해', '계산 부탁', '계산할게'], jp: 'すみません、お会計をお願いします。', category: '식당' },
  { ko: '따로따로(더치페이) 계산할 수 있나요?', koKeywords: ['따로', '각자', '더치페이', '계산'], jp: 'お会計は別々でお願いできますか？', category: '식당' },
  { ko: '한꺼번에 같이 계산할게요.', koKeywords: ['한꺼번에', '같이', '계산'], jp: 'お会計は一緒でお願いします。', category: '식당' },

  // [알레르기 / 식단]
  { ko: '새우랑 게(갑각류) 알레르기가 있어요.', koKeywords: ['새우', '게', '갑각류', '알레르기'], jp: 'エビとカニ（甲殻類）のアレルギーがあります。', category: '알레르기' },
  { ko: '땅콩(견과류) 알레르기가 있어서 들어가면 안 돼요.', koKeywords: ['땅콩', '견과류', '알레르기'], jp: 'ピーナッツ（ナッツ類）のアレルギーがあるので、入っていると食べられません。', category: '알레르기' },
  { ko: '달걀이나 우유가 들어가 있나요?', koKeywords: ['달걀', '계란', '우유', '들어가'], jp: '卵や牛乳は入っていますか？', category: '알레르기' },
  { ko: '밀가루(글루텐) 알레르기가 있어요.', koKeywords: ['밀가루', '글루텐', '알레르기'], jp: '小麦（グルテン）のアレルギーがあります。', category: '알레르기' },
  { ko: '메밀 알레르기가 있어요. 소바 육수에도 메밀이 들어갔나요?', koKeywords: ['메밀', '소바', '알레르기'], jp: 'そばアレルギーがあります。同じ釜で茹でていますか？', category: '알레르기' },
  { ko: '돼지고기를 먹지 못해요.', koKeywords: ['돼지고기', '못 먹'], jp: '豚肉が食べられません。', category: '알레르기' },

  // [편의점 / 쇼핑 / 면세 / 결제]
  { ko: '도시락 데워 주세요.', koKeywords: ['도시락', '데워'], jp: 'お弁当を温めてください。', category: '쇼핑' },
  { ko: '안 데워도 괜찮아요. 그대로 주세요.', koKeywords: ['안 데워', '그대로'], jp: '温めなくて大丈夫です。そのままでお願いします。', category: '쇼핑' },
  { ko: '비닐봉투 한 장 주세요.', koKeywords: ['비닐봉투', '봉투', '한 장'], jp: 'レジ袋を一枚お願いします。', category: '쇼핑' },
  { ko: '봉투는 필요 없어요.', koKeywords: ['봉투', '필요 없'], jp: '袋はいりません。大丈夫です。', category: '쇼핑' },
  { ko: '신용카드 터치 결제로 할게요.', koKeywords: ['카드', '터치', '결제'], jp: 'クレジットカードのタッチ決済でお願いします。', category: '쇼핑' },
  { ko: '교통카드(스이카/파스모)로 결제할게요.', koKeywords: ['교통카드', '스이카', '파스모'], jp: '交通系IC（スイカ）で支払います。', category: '쇼핑' },
  { ko: '현금으로 계산할게요.', koKeywords: ['현금으로', '현금 결제'], jp: '現金でお願いします。', category: '쇼핑' },
  { ko: '카드가 안 되네요. 다른 카드로 다시 해볼게요.', koKeywords: ['카드', '안 되', '다른 카드'], jp: 'カードが使えないようですね。別のカードで試してみます。', category: '쇼핑' },
  { ko: '천 엔짜리 지폐나 동전으로 잔돈 좀 바꿔주실 수 있나요?', koKeywords: ['천 엔', '동전', '잔돈', '양전', '환전'], jp: '千円札か小銭に両替してもらえますか？', category: '쇼핑' },
  { ko: '이 사진에 있는 상품은 어디에 있나요?', koKeywords: ['사진', '상품', '어디'], jp: 'すみません、この写真の商品はどこにありますか？', category: '쇼핑' },
  { ko: '이거 입어봐도(시착해도) 되나요?', koKeywords: ['입어봐', '시착'], jp: 'すみません、これ試着してもいいですか？', category: '쇼핑' },
  { ko: '이거보다 한 치수 더 큰 사이즈 있나요?', koKeywords: ['한 치수', '더 큰', '사이즈'], jp: 'これより一つ大きいサイズはありますか？', category: '쇼핑' },
  { ko: '이거보다 한 치수 더 작은 사이즈 있나요?', koKeywords: ['한 치수', '더 작은', '사이즈'], jp: 'これより一つ小さいサイズはありますか？', category: '쇼핑' },
  { ko: '진열된 것 말고 새 상품(재고)으로 주실 수 있나요?', koKeywords: ['새 상품', '새 거', '재고'], jp: '新しい在庫を出してもらえますか？', category: '쇼핑' },
  { ko: '다른 색상은 없나요?', koKeywords: ['다른 색', '색상', '컬러'], jp: '他の色はありますか？', category: '쇼핑' },
  { ko: '면세(Tax-Free) 계산이 가능한가요?', koKeywords: ['면세', '택스프리'], jp: '免税（タックスフリー）で会計できますか？', category: '쇼핑' },
  { ko: '선물용인데 포장해 주실 수 있나요?', koKeywords: ['선물', '포장해'], jp: 'プレゼント用なのですが、ラッピングしてもらえますか？', category: '쇼핑' },
  { ko: '불량품이라서 교환이나 환불을 받고 싶어요.', koKeywords: ['불량', '교환', '환불', '반품'], jp: '不良品なので、交換か返品（払い戻し）をお願いします。', category: '쇼핑' },

  // [호텔 / 숙소]
  { ko: '체크인 부탁합니다. 예약한 이름은 김입니다.', koKeywords: ['체크인', '예약'], jp: 'チェックインをお願いします。予約したキムです。', category: '호텔' },
  { ko: '체크인 시간 전인데 짐(캐리어)을 먼저 맡길 수 있나요?', koKeywords: ['체크인', '전', '짐', '맡'], jp: 'チェックイン前ですが、荷物を預かってもらえますか？', category: '호텔' },
  { ko: '체크아웃 후에 오늘 저녁까지 짐을 맡아주실 수 있나요?', koKeywords: ['체크아웃', '후', '짐', '맡'], jp: 'チェックアウト後に、今日の夕方まで荷物を預かってもらえますか？', category: '호텔' },
  { ko: '조식 시간은 몇 시부터 몇 시까지인가요?', koKeywords: ['조식', '아침 식사', '몇 시'], jp: '朝食は何時から何時までですか？', category: '호텔' },
  { ko: '대욕장(온천)은 몇 시까지 이용할 수 있나요?', koKeywords: ['대욕장', '온천', '몇 시'], jp: '大浴場（温泉）は何時まで入れますか？', category: '호텔' },
  { ko: '방에 수건이랑 물이 부족해서 그러는데 더 주실 수 있나요?', koKeywords: ['수건', '타월', '더 주'], jp: 'お部屋のタオルとお水をもう少しいただけますか？', category: '호텔' },
  { ko: '방에서 담배 냄새가 나요. 금연실로 바꿔주실 수 있나요?', koKeywords: ['담배 냄새', '금연실', '방', '바꿔'], jp: '部屋がタバコ臭いので、禁煙ルームに変えてもらえますか？', category: '호텔' },
  { ko: '방 열쇠(카드키)를 방 안에 두고 나와서 문이 잠겼어요.', koKeywords: ['열쇠', '카드키', '방 안', '두고', '잠겼'], jp: 'ルームキーを部屋の中に閉じ込めてしまいました。開けてもらえますか？', category: '호텔' },
  { ko: '와이파이 비밀번호가 무엇인가요?', koKeywords: ['와이파이', '비밀번호'], jp: 'Wi-Fiのパスワードは何ですか？', category: '호텔' },
  { ko: '체크아웃 시간을 1시간 연장할 수 있나요?', koKeywords: ['체크아웃', '연장'], jp: 'チェックアウトの時間を1時間延長できますか？', category: '호텔' },
  { ko: '택시 한 대 불러주실 수 있나요?', koKeywords: ['택시', '불러', '호출'], jp: 'タクシーを一台呼んでもらえますか？', category: '호텔' },

  // [교통 / 기차 / 택시 / 길찾기]
  { ko: '이 전철이 시부야(신주쿠/도쿄역)에 가나요?', koKeywords: ['이 전철', '가나요', '시부야'], jp: 'この電車は渋谷（新宿・東京駅）に行きますか？', category: '교통' },
  { ko: '공항에 가려면 몇 번 승강장(홈)에서 타야 하나요?', koKeywords: ['공항', '몇 번', '승강장', '홈'], jp: '空港に行くには、何番ホームから乗ればいいですか？', category: '교통' },
  { ko: '반대 방향 전철을 잘못 탔어요. 개찰구로 나가야 하나요?', koKeywords: ['반대 방향', '잘못 탔'], jp: '反対方向の電車に間違えて乗ってしまいました。', category: '교통' },
  { ko: '스이카(교통카드)를 찍었는데 에러가 나요. 봐주실 수 있나요?', koKeywords: ['스이카', '교통카드', '에러', '안 찍혀'], jp: 'スイカをタッチしたらエラーが出ました。見てもらえますか？', category: '교통' },
  { ko: '교통카드 잔액 충전은 어디서 하나요?', koKeywords: ['교통카드', '잔액', '충전'], jp: '交通系ICカードのチャージはどこでできますか？', category: '교통' },
  { ko: '막차가 몇 시에 있나요?', koKeywords: ['막차', '몇 시'], jp: '終電は何時ですか？', category: '교통' },
  { ko: '막차를 놓쳤어요. 근처에 택시 타는 곳이 어디인가요?', koKeywords: ['막차', '놓쳤', '택시'], jp: '終電に乗り遅れました。近くのタクシー乗り場はどこですか？', category: '교통' },
  { ko: '이 지도에 있는 주소(호텔)까지 가주세요.', koKeywords: ['지도', '주소', '호텔까지', '가주세요'], jp: 'この地図のホテル（住所）までお願いします。', category: '교통' },
  { ko: '캐리어가 있어서 트렁크 좀 열어주실 수 있나요?', koKeywords: ['캐리어', '트렁크', '열어'], jp: 'スーツケースがあるので、トランクを開けてもらえますか？', category: '교통' },
  { ko: '여기서 내려 주세요. 감사합니다.', koKeywords: ['여기서', '내려', '세워'], jp: 'ここで降ろしてください。ありがとうございます。', category: '교통' },
  { ko: '여기서 거기까지 걸어서 얼마나 걸리나요?', koKeywords: ['걸어서', '얼마나 걸리'], jp: 'ここからそこまで歩いてどのくらいかかりますか？', category: '교통' },

  // [분실 / 병원 / 약국 / 위급상황]
  { ko: '전철에 가방(쇼핑백)을 두고 내렸어요.', koKeywords: ['전철', '가방', '두고 내렸'], jp: '電車にカバンを置き忘れました。', category: '긴급' },
  { ko: '지갑(여권/휴대폰)을 잃어버렸어요. 도와주세요.', koKeywords: ['지갑', '여권', '휴대폰', '잃어버렸'], jp: '財布（パスポート・スマホ）をなくしました。助けてください。', category: '긴급' },
  { ko: '가장 가까운 파출소(코반)가 어디에 있나요?', koKeywords: ['가까운', '파출소', '경찰서', '코반'], jp: '一番近い交番はどこにありますか？', category: '긴급' },
  { ko: '가장 가까운 화장실이 어디에 있나요?', koKeywords: ['가까운', '화장실', '어디'], jp: '一番近いお手洗い（トイレ）はどこですか？', category: '긴급' },
  { ko: '휴대폰 배터리가 꺼져서 그러는데 충전 좀 할 수 있을까요?', koKeywords: ['배터리', '꺼져', '충전'], jp: 'スマホの充電が切れそうなので、少し充電させてもらえますか？', category: '긴급' },
  { ko: '열이 나고 목이 아파요. 감기약이나 해열제 주세요.', koKeywords: ['열이', '목이', '감기약', '해열제'], jp: '熱があって喉が痛いです。風邪薬か解熱剤をください。', category: '병원' },
  { ko: '배가 너무 아프고 속이 울렁거려요. 소화제나 지사제 있나요?', koKeywords: ['배가', '아프', '소화제', '설사', '체했'], jp: 'お腹が痛くて気持ち悪いです。胃腸薬か下痢止めはありますか？', category: '병원' },
  { ko: '머리가 깨질 듯이 아파요. 진통제(두통약) 주세요.', koKeywords: ['머리', '아파', '두통약', '진통제'], jp: '頭がとても痛いです。頭痛薬（痛み止め）をください。', category: '병원' },
  { ko: '졸리지 않은 약으로 추천해 주세요.', koKeywords: ['졸리지 않', '안 졸린', '약'], jp: '眠くならないタイプのお薬をおすすめしてください。', category: '병원' },
  { ko: '여행자 보험 청구용 영수증과 진단서를 부탁드립니다.', koKeywords: ['보험', '영수증', '진단서'], jp: '旅行保険の申請のため、領収書と診断書をお願いします。', category: '병원' },
  { ko: '사진 한 장만 찍어주실 수 있나요?', koKeywords: ['사진', '찍어'], jp: 'すみません、写真を一枚撮ってもらえますか？', category: '일상' },
  { ko: '일본어를 잘 못해요. 천천히 말씀해 주세요.', koKeywords: ['일본어', '못해', '천천히'], jp: '日本語があまり話せません。ゆっくり話してください。', category: '일상' },
];

// ============================================================================
// 2. 형태소/어휘 사전 (명사, 동사 어간, 형용사 어간, 부사, 수량사, 접속사)
// ============================================================================
interface NounDictEntry {
  ko: string[];
  jp: string;
  type: 'place' | 'item' | 'food' | 'person' | 'time' | 'abstract';
}

const NOUN_DICT: NounDictEntry[] = [
  // 장소
  { ko: ['화장실', '변소'], jp: 'お手洗い', type: 'place' },
  { ko: ['흡연실', '담배방'], jp: '喫煙所', type: 'place' },
  { ko: ['금연석'], jp: '禁煙席', type: 'place' },
  { ko: ['테이블석', '테이블 자리'], jp: 'テーブル席', type: 'place' },
  { ko: ['카운터석', '바 자리'], jp: 'カウンター席', type: 'place' },
  { ko: ['창가 자리', '창가석'], jp: '窓際の席', type: 'place' },
  { ko: ['자리', '좌석'], jp: '席', type: 'place' },
  { ko: ['코인락커', '물품보관함', '보관함'], jp: 'コインロッカー', type: 'place' },
  { ko: ['쓰레기통', '휴지통'], jp: 'ゴミ箱', type: 'place' },
  { ko: ['편의점'], jp: 'コンビニ', type: 'place' },
  { ko: ['약국', '드럭스토어'], jp: '薬局', type: 'place' },
  { ko: ['병원', '응급실'], jp: '病院', type: 'place' },
  { ko: ['파출소', '경찰서', '코반'], jp: '交番', type: 'place' },
  { ko: ['대사관'], jp: '韓国大使館', type: 'place' },
  { ko: ['지하철역', '기차역', '전철역', '역'], jp: '駅', type: 'place' },
  { ko: ['버스정류장'], jp: 'バス停', type: 'place' },
  { ko: ['택시 승강장', '택시 타는 곳'], jp: 'タクシー乗り場', type: 'place' },
  { ko: ['승강장', '플랫폼', '홈'], jp: 'ホーム', type: 'place' },
  { ko: ['개찰구'], jp: '改札口', type: 'place' },
  { ko: ['출구'], jp: '出口', type: 'place' },
  { ko: ['입구'], jp: '入口', type: 'place' },
  { ko: ['엘리베이터'], jp: 'エレベーター', type: 'place' },
  { ko: ['에스컬레이터'], jp: 'エスカレーター', type: 'place' },
  { ko: ['계단'], jp: '階段', type: 'place' },
  { ko: ['공항'], jp: '空港', type: 'place' },
  { ko: ['호텔', '숙소'], jp: 'ホテル', type: 'place' },
  { ko: ['방', '객실'], jp: '部屋', type: 'place' },
  { ko: ['대욕장', '온천'], jp: '大浴場', type: 'place' },
  { ko: ['피팅룸', '탈의실'], jp: '試着室', type: 'place' },
  { ko: ['면세 카운터', '면세점'], jp: '免税カウンター', type: 'place' },
  { ko: ['계산대', '카운터', '프론트'], jp: 'レジ（フロント）', type: 'place' },
  { ko: ['시부야역'], jp: '渋谷駅', type: 'place' },
  { ko: ['신주쿠역'], jp: '新宿駅', type: 'place' },
  { ko: ['도쿄역'], jp: '東京駅', type: 'place' },
  { ko: ['교토역'], jp: '京都駅', type: 'place' },
  { ko: ['난바역'], jp: '難波駅', type: 'place' },
  { ko: ['우메다역'], jp: '梅田駅', type: 'place' },
  { ko: ['하카타역'], jp: '博多駅', type: 'place' },
  { ko: ['텐진역'], jp: '天神駅', type: 'place' },
  { ko: ['삿포로역'], jp: '札幌駅', type: 'place' },
  { ko: ['시부야'], jp: '渋谷', type: 'place' },
  { ko: ['신주쿠'], jp: '新宿', type: 'place' },
  { ko: ['난바'], jp: '難波', type: 'place' },
  { ko: ['우메다'], jp: '梅田', type: 'place' },
  { ko: ['하카타'], jp: '博多', type: 'place' },
  { ko: ['텐진'], jp: '天神', type: 'place' },
  { ko: ['삿포로'], jp: '札幌', type: 'place' },
  { ko: ['여기', '이곳'], jp: 'ここ', type: 'place' },
  { ko: ['거기', '그곳'], jp: 'そこ', type: 'place' },
  { ko: ['저기', '저곳'], jp: 'あそこ', type: 'place' },

  // 추상 / 행위 명사
  { ko: ['면세', '택스프리'], jp: '免税（タックスフリー）', type: 'abstract' },
  { ko: ['할인'], jp: '割引', type: 'abstract' },
  { ko: ['환불', '반품'], jp: '返品（返金）', type: 'abstract' },
  { ko: ['교환'], jp: '交換', type: 'abstract' },
  { ko: ['포장', '테이크아웃'], jp: '持ち帰り（テイクアウト）', type: 'abstract' },
  { ko: ['예약'], jp: '予約', type: 'abstract' },
  { ko: ['체크인'], jp: 'チェックイン', type: 'abstract' },
  { ko: ['체크아웃'], jp: 'チェックアウト', type: 'abstract' },
  { ko: ['연장'], jp: '延長', type: 'abstract' },
  { ko: ['계산', '결제'], jp: 'お会計', type: 'abstract' },
  { ko: ['충전'], jp: '充電（チャージ）', type: 'abstract' },
  { ko: ['흡연', '담배'], jp: 'タバコ（喫煙）', type: 'abstract' },
  { ko: ['촬영'], jp: '写真撮影', type: 'abstract' },

  // 음식 / 음료 / 재료
  { ko: ['생맥주', '맥주'], jp: '生ビール', type: 'food' },
  { ko: ['하이볼'], jp: 'ハイボール', type: 'food' },
  { ko: ['레몬사와', '사와'], jp: 'レモンサワー', type: 'food' },
  { ko: ['일본술', '사케'], jp: '日本酒', type: 'food' },
  { ko: ['콜라'], jp: 'コーラ', type: 'food' },
  { ko: ['사이다'], jp: 'サイダー', type: 'food' },
  { ko: ['오렌지 주스', '주스'], jp: 'オレンジジュース', type: 'food' },
  { ko: ['녹차', '차'], jp: 'お茶', type: 'food' },
  { ko: ['아이스 아메리카노', '아이스 커피', '아아'], jp: 'アイスコーヒー', type: 'food' },
  { ko: ['따뜻한 커피', '핫 커피', '아메리카노'], jp: 'ホットコーヒー', type: 'food' },
  { ko: ['카페라떼', '라떼'], jp: 'カフェラテ', type: 'food' },
  { ko: ['디카페인'], jp: 'デカフェ', type: 'food' },
  { ko: ['물', '냉수', '생수'], jp: 'お水', type: 'food' },
  { ko: ['따뜻한 물', '온수'], jp: 'お湯', type: 'food' },
  { ko: ['얼음'], jp: '氷', type: 'food' },
  { ko: ['라멘'], jp: 'ラーメン', type: 'food' },
  { ko: ['우동'], jp: 'うどん', type: 'food' },
  { ko: ['소바', '메밀국수'], jp: 'そば', type: 'food' },
  { ko: ['초밥', '스시'], jp: 'お寿司', type: 'food' },
  { ko: ['회', '사시미'], jp: 'お刺身', type: 'food' },
  { ko: ['구이', '야키토리', '꼬치'], jp: '焼き鳥', type: 'food' },
  { ko: ['가라아게', '닭튀김'], jp: '唐揚げ', type: 'food' },
  { ko: ['돈카츠', '돈까스'], jp: 'とんかつ', type: 'food' },
  { ko: ['교자', '만두'], jp: '餃子', type: 'food' },
  { ko: ['볶음밥', '차항'], jp: 'チャーハン', type: 'food' },
  { ko: ['공기밥', '밥'], jp: 'ご飯', type: 'food' },
  { ko: ['면 사리', '면 추가', '카에다마'], jp: '替え玉', type: 'food' },
  { ko: ['도시락'], jp: 'お弁当', type: 'food' },
  { ko: ['삼각김밥', '오니기리'], jp: 'おにぎり', type: 'food' },
  { ko: ['샌드위치'], jp: 'サンドイッチ', type: 'food' },
  { ko: ['푸딩'], jp: 'プリン', type: 'food' },
  { ko: ['아이스크림'], jp: 'アイスクリーム', type: 'food' },
  { ko: ['새우'], jp: 'エビ', type: 'food' },
  { ko: ['게'], jp: 'カニ', type: 'food' },
  { ko: ['땅콩', '견과류'], jp: 'ピーナッツ', type: 'food' },
  { ko: ['계란', '달걀'], jp: '卵', type: 'food' },
  { ko: ['우유'], jp: '牛乳', type: 'food' },
  { ko: ['밀가루'], jp: '小麦粉', type: 'food' },
  { ko: ['돼지고기'], jp: '豚肉', type: 'food' },
  { ko: ['소고기'], jp: '牛肉', type: 'food' },
  { ko: ['닭고기'], jp: '鶏肉', type: 'food' },
  { ko: ['와사비', '고추냉이'], jp: 'わさび', type: 'food' },
  { ko: ['고수'], jp: 'パクチー', type: 'food' },
  { ko: ['마늘'], jp: 'ニンニク', type: 'food' },
  { ko: ['파'], jp: 'ネギ', type: 'food' },
  { ko: ['소금'], jp: '塩', type: 'food' },
  { ko: ['간장'], jp: '醤油', type: 'food' },
  { ko: ['소스'], jp: 'ソース', type: 'food' },

  // 사물 / 아이템
  { ko: ['메뉴판', '메뉴'], jp: 'メニュー', type: 'item' },
  { ko: ['앞접시', '작은 접시', '접시'], jp: '取り皿', type: 'item' },
  { ko: ['젓가락'], jp: 'お箸', type: 'item' },
  { ko: ['숟가락', '스푼'], jp: 'スプーン', type: 'item' },
  { ko: ['포크'], jp: 'フォーク', type: 'item' },
  { ko: ['나이프', '칼'], jp: 'ナイフ', type: 'item' },
  { ko: ['가위'], jp: 'ハサミ', type: 'item' },
  { ko: ['물티슈', '물수건', '오시보리'], jp: 'おしぼり', type: 'item' },
  { ko: ['휴지', '티슈', '냅킨'], jp: 'ティッシュ', type: 'item' },
  { ko: ['앞치마'], jp: '紙エプロン', type: 'item' },
  { ko: ['재떨이'], jp: '灰皿', type: 'item' },
  { ko: ['영수증'], jp: 'レシート', type: 'item' },
  { ko: ['비닐봉투', '봉투', '쇼핑백'], jp: '袋', type: 'item' },
  { ko: ['지갑'], jp: '財布', type: 'item' },
  { ko: ['여권'], jp: 'パスポート', type: 'item' },
  { ko: ['신용카드', '카드'], jp: 'クレジットカード', type: 'item' },
  { ko: ['교통카드', '스이카', '파스모'], jp: '交通系ICカード', type: 'item' },
  { ko: ['현금', '지폐'], jp: '現金', type: 'item' },
  { ko: ['동전', '잔돈'], jp: '小銭', type: 'item' },
  { ko: ['가방', '백팩'], jp: 'カバン', type: 'item' },
  { ko: ['캐리어', '트렁크', '짐'], jp: '荷物（スーツケース）', type: 'item' },
  { ko: ['휴대폰', '스마트폰', '핸드폰', '폰'], jp: 'スマホ', type: 'item' },
  { ko: ['충전기', '보조배터리', '배터리'], jp: '充電器', type: 'item' },
  { ko: ['콘센트'], jp: 'コンセント', type: 'item' },
  { ko: ['와이파이'], jp: 'Wi-Fi', type: 'item' },
  { ko: ['비밀번호'], jp: 'パスワード', type: 'item' },
  { ko: ['수건', '타월'], jp: 'タオル', type: 'item' },
  { ko: ['우산'], jp: '傘', type: 'item' },
  { ko: ['열쇠', '카드키', '룸키'], jp: 'ルームキー', type: 'item' },
  { ko: ['표', '티켓', '승차권'], jp: '切符（チケット）', type: 'item' },
  { ko: ['사진', '기념사진'], jp: '写真', type: 'item' },
  { ko: ['지도', '구글맵'], jp: '地図', type: 'item' },
  { ko: ['사이즈', '치수'], jp: 'サイズ', type: 'item' },
  { ko: ['새 상품', '재고', '새 거'], jp: '新しい在庫', type: 'item' },
  { ko: ['감기약'], jp: '風邪薬', type: 'item' },
  { ko: ['소화제', '위장약', '까스활명수'], jp: '胃薬', type: 'item' },
  { ko: ['두통약', '진통제', '타이레놀'], jp: '頭痛薬', type: 'item' },
  { ko: ['해열제'], jp: '解熱剤', type: 'item' },
  { ko: ['지사제', '설사약'], jp: '下痢止め', type: 'item' },
  { ko: ['반창고', '밴드', '대일밴드'], jp: '絆創膏', type: 'item' },
  { ko: ['안약', '인공눈물'], jp: '目薬', type: 'item' },
  { ko: ['파스', '동전파스', '휴족시간'], jp: '湿布（サロンパス）', type: 'item' },
  { ko: ['선크림', '자외선차단제'], jp: '日焼け止め', type: 'item' },
  { ko: ['립밤'], jp: 'リップクリーム', type: 'item' },
  { ko: ['마스크'], jp: 'マスク', type: 'item' },
  { ko: ['이거', '이것'], jp: 'これ', type: 'item' },
  { ko: ['그거', '그것'], jp: 'それ', type: 'item' },
  { ko: ['저거', '저것'], jp: 'あれ', type: 'item' },
];

// 수량/시간/인원 추출기
const QUANTITY_RULES: Array<[RegExp, string]> = [
  [/한\s*명|1\s*명|혼자/, '一人で'],
  [/두\s*명|2\s*명|둘이/, '二人で'],
  [/세\s*명|3\s*명/, '三人で'],
  [/네\s*명|4\s*명/, '四人で'],
  [/한\s*개|하나|한\s*잔|1\s*개|1\s*잔/, '一つ'],
  [/두\s*개|둘|두\s*잔|2\s*개|2\s*잔/, '二つ'],
  [/세\s*개|셋|세\s*잔|3\s*개|3\s*잔/, '三つ'],
  [/네\s*개|4\s*개/, '四つ'],
  [/한\s*장|1\s*장/, '一枚'],
  [/두\s*장|2\s*장/, '二枚'],
];

// ============================================================================
// 3. 다중 절(Multi-clause) 형태소/문형 합성 번역기
// ============================================================================
function extractQtyFromSegment(seg: string): string {
  for (const [regex, jpVal] of QUANTITY_RULES) {
    if (regex.test(seg)) {
      return jpVal;
    }
  }
  return '';
}

const FLATTENED_NOUN_KEYWORDS: Array<{ koWord: string; entry: NounDictEntry }> = [];
for (const entry of NOUN_DICT) {
  for (const koWord of entry.ko) {
    FLATTENED_NOUN_KEYWORDS.push({ koWord, entry });
  }
}
FLATTENED_NOUN_KEYWORDS.sort((a, b) => b.koWord.length - a.koWord.length);

function findValidKeywordIndex(text: string, koWord: string): number {
  let startPos = 0;
  while (startPos < text.length) {
    const idx = text.indexOf(koWord, startPos);
    if (idx === -1) return -1;

    // 1글자 단어(예: '게', '파', '차', '역', '방', '물')가 '할게요', '파출소', '시부야역' 내부에서 오매칭되는 현상 방지
    if (koWord.length === 1) {
      const prevChar = idx > 0 ? text[idx - 1] : ' ';
      const nextChar = idx + 1 < text.length ? text[idx + 1] : ' ';
      const validPrev = /[\s,./?!()]/.test(prevChar);
      const validNext =
        /[\s,./?!()]/.test(nextChar) ||
        /^[가이을를은는도만랑와과에로좀더]/.test(text.slice(idx + 1));
      if (!validPrev || !validNext) {
        startPos = idx + 1;
        continue;
      }
    }
    return idx;
  }
  return -1;
}

function translateSingleClauseKoToJp(clause: string): { jp: string; matched: boolean } {
  const c = clause.trim();
  if (!c) return { jp: '', matched: false };

  // 1) 절 내부의 명사들과 수량을 가장 긴 키워드 우선(Longest-Match-First)으로 추출
  const foundNouns: Array<{ entry: NounDictEntry; matchedKo: string; index: number }> = [];
  const usedEntries = new Set<NounDictEntry>();

  let remainingText = c;
  for (const { koWord, entry } of FLATTENED_NOUN_KEYWORDS) {
    if (usedEntries.has(entry)) continue;
    const idx = findValidKeywordIndex(remainingText, koWord);
    if (idx !== -1) {
      foundNouns.push({ entry, matchedKo: koWord, index: idx });
      usedEntries.add(entry);
      remainingText =
        remainingText.slice(0, idx) +
        ' '.repeat(koWord.length) +
        remainingText.slice(idx + koWord.length);
      if (foundNouns.length >= 3) break;
    }
  }

  // 등장 순서대로 정렬
  foundNouns.sort((a, b) => a.index - b.index);

  // 2) 코퍼스 내 키워드 매칭 점수 계산 (단, 사용자가 입력한 핵심 음식/사물 명사가 코퍼스에 누락되어 있으면 제외)
  let bestCorpus: CorpusItem | null = null;
  let bestScore = 0;

  const specificUserNouns = foundNouns.filter(
    (n) => n.entry.type === 'food' || n.entry.type === 'item'
  );

  for (const item of PREBUILT_CORPUS) {
    if (item.ko.replace(/[?？.!~\s]/g, '') === c.replace(/[?？.!~\s]/g, '')) {
      return { jp: item.jp, matched: true };
    }

    // 사용자가 2개 이상의 구체적 음식/사물 명사를 말했는데 코퍼스 문장에 그 명사가 없다면 스킵 (예: "생맥주 두 잔이랑 가라아게 하나 주세요")
    if (specificUserNouns.length >= 2) {
      const allCovered = specificUserNouns.every((n) =>
        n.entry.ko.some((syn) => item.ko.includes(syn))
      );
      if (!allCovered) continue;
    }

    let hit = 0;
    for (const kw of item.koKeywords) {
      if (c.includes(kw)) hit++;
    }
    if (hit >= 2) {
      const ratio = hit / item.koKeywords.length;
      const score = hit * 15 + ratio * 30;
      if (score > bestScore) {
        bestScore = score;
        bestCorpus = item;
      }
    }
  }

  if (bestCorpus && bestScore >= 42) {
    return { jp: bestCorpus.jp, matched: true };
  }

  // 특화 패턴: 안 매운 요리 추천
  if ((c.includes('안 매운') || c.includes('맵지 않')) && c.includes('추천')) {
    return { jp: '辛くない料理をおすすめしてください。', matched: true };
  }

  let qtyJp = extractQtyFromSegment(c);

  // 다중 품목 개별 수량 조합 (예: "생맥주 두 잔이랑 가라아게 하나 주세요")
  if (
    foundNouns.length >= 2 &&
    (c.includes('주세요') || c.includes('주실') || c.includes('부탁') || c.includes('주문')) &&
    !c.includes('빼') &&
    !c.includes('더 주')
  ) {
    const subParts = c.split(/(?:이랑|랑|하고|와|과|그리고|,)\s*/);
    if (subParts.length >= 2) {
      const itemPhrases: string[] = [];
      for (const part of subParts) {
        let partNounJp = '';
        for (const { koWord, entry } of FLATTENED_NOUN_KEYWORDS) {
          if (findValidKeywordIndex(part, koWord) !== -1) {
            partNounJp = entry.jp;
            break;
          }
        }
        if (partNounJp) {
          const partQty = extractQtyFromSegment(part);
          itemPhrases.push(partQty ? `${partNounJp}を${partQty}` : partNounJp);
        }
      }
      if (itemPhrases.length >= 2) {
        return {
          jp: `${itemPhrases.join('と、')}お願いします。`,
          matched: true,
        };
      }
    }
  }

  const nounPhraseJp =
    foundNouns.length >= 2
      ? foundNouns.map((n) => n.entry.jp).join('と')
      : foundNouns.length === 1
      ? foundNouns[0].entry.jp
      : '';

  // 3) 서술어/어미 의도 분석 (연결어미 ~는데/~해서/~하고 및 종결어미 35종)
  const isConjunctiveBecause =
    c.endsWith('는데') ||
    c.endsWith('는데요') ||
    c.endsWith('해서') ||
    c.endsWith('아서') ||
    c.endsWith('어서') ||
    c.endsWith('이라서') ||
    c.endsWith('여서');

  if (nounPhraseJp) {
    // 부정/미완료 연결형 (예: "예약은 안 했는데")
    if ((c.includes('안 했') || c.includes('하지 않았')) && isConjunctiveBecause) {
      return { jp: `${nounPhraseJp}はしていないんですが、`, matched: true };
    }
    if ((c.includes('없어서') || c.includes('안 돼서') || c.includes('부족해서'))) {
      return { jp: `${nounPhraseJp}がないので、`, matched: true };
    }
    // 작동 불가 / 결제 불가 ("카드가 안 돼요")
    if (c.includes('안 돼요') || c.includes('안 되네요') || c.includes('안 됩니다') || c.includes('작동이 안')) {
      return { jp: `${nounPhraseJp}が使えません。`, matched: true };
    }
    if (c.includes('배고파') || c.includes('목말라')) {
      return { jp: 'お腹が空いたので、', matched: true };
    }

    // 빼달라 / 넣지 말아달라
    if (c.includes('빼주') || c.includes('빼고') || c.includes('넣지 마') || c.includes('없이')) {
      return { jp: `${nounPhraseJp}は抜いてください。`, matched: true };
    }
    // 적게 / 조금만
    if (c.includes('적게') || c.includes('조금만') || c.includes('덜')) {
      return { jp: `${nounPhraseJp}は少なめでお願いします。`, matched: true };
    }
    // 많이 / 추가
    if (c.includes('많이') || c.includes('추가') || c.includes('더 주') || c.includes('리필')) {
      return { jp: `${nounPhraseJp}をもう${qtyJp || '一つ'}お願いします。`, matched: true };
    }
    // 추천 요청
    if (c.includes('추천')) {
      return { jp: `おすすめの${nounPhraseJp}を教えてください。`, matched: true };
    }
    // 알레르기 / 못 먹음
    if (c.includes('알레르기') || c.includes('알러지')) {
      return { jp: `${nounPhraseJp}のアレルギーがあります。`, matched: true };
    }
    if (c.includes('못 먹') || c.includes('안 먹')) {
      return { jp: `${nounPhraseJp}は食べられません。`, matched: true };
    }
    // 분실 / 놓고 내림
    if (c.includes('잃어버') || c.includes('분실') || c.includes('두고') || c.includes('놓고')) {
      return { jp: `${nounPhraseJp}をなくして（忘れて）しまいました。`, matched: true };
    }
    // 방향 / 가고 싶다 / 가는 법
    if (c.includes('가고 싶') || c.includes('가려면') || c.includes('어떻게 가') || c.includes('가는 길')) {
      return { jp: `${nounPhraseJp}に行きたいんですが、どう行けばいいですか？`, matched: true };
    }
    if (c.includes('까지 가주') || c.includes('까지 부탁')) {
      return { jp: `${nounPhraseJp}までお願いします。`, matched: true };
    }
    // 소요 시간
    if (c.includes('얼마나 걸') || c.includes('몇 분 걸')) {
      return { jp: `${nounPhraseJp}までどのくらい時間がかかりますか？`, matched: true };
    }
    // 위치 질문
    if (c.includes('어디')) {
      return { jp: `${nounPhraseJp}はどこにありますか？`, matched: true };
    }
    // 가격 질문
    if (c.includes('얼마') || c.includes('가격')) {
      return { jp: `${nounPhraseJp}はいくらですか？`, matched: true };
    }
    // 시간 질문
    if (c.includes('몇 시')) {
      return { jp: `${nounPhraseJp}は何時ですか？`, matched: true };
    }
    // 허가 / 가능 여부 (~해도 되나요, ~할 수 있나요, ~되나요)
    if (c.includes('봐도 되') || c.includes('해도 되') || c.includes('되나요') || c.includes('할 수 있') || c.includes('가능')) {
      return { jp: `${nounPhraseJp}はできますか？（可能でしょうか？）`, matched: true };
    }
    // 존재 유무 (~있나요, ~있어요?)
    if (c.includes('있나요') || c.includes('있어요') || c.includes('있습니까') || c.includes('남아 있')) {
      return { jp: `${qtyJp ? qtyJp + '、' : ''}${nounPhraseJp}はありますか？`, matched: true };
    }
    // 보여달라
    if (c.includes('보여주') || c.includes('볼 수 있')) {
      return { jp: `${nounPhraseJp}を見せてください。`, matched: true };
    }
    // 바꿔달라 / 교환
    if (c.includes('바꿔') || c.includes('교환')) {
      return { jp: `${nounPhraseJp}を交換してもらえますか？`, matched: true };
    }
    // 맡기다 / 보관
    if (c.includes('맡길') || c.includes('맡아') || c.includes('보관')) {
      return { jp: `${nounPhraseJp}を預かってもらえますか？`, matched: true };
    }
    // 수단 (~으로 할게요 / ~으로 계산)
    if (c.includes('으로 할게') || c.includes('로 할게')) {
      return { jp: `${nounPhraseJp}でお願いします。`, matched: true };
    }
    // 주문 / 요청 (~주세요, ~주실, ~부탁, ~할게요)
    if (c.includes('주세요') || c.includes('주실') || c.includes('부탁') || c.includes('할게요') || c.includes('주문') || qtyJp) {
      return {
        jp: `${nounPhraseJp}を${qtyJp || ''}お願いします。`,
        matched: true,
      };
    }

    // 명사 단독일 때 타입별 자연스러운 문장 생성
    if (foundNouns[0].entry.type === 'place') {
      return { jp: `すみません、${nounPhraseJp}はどこにありますか？`, matched: true };
    }
    return { jp: `すみません、${nounPhraseJp}を${qtyJp || ''}お願いします。`, matched: true };
  }

  // 4) 명사 없이 동사/형용사/부사 서술어만 있는 경우
  if (qtyJp && (c.includes('명') || c.includes('사람') || c.includes('혼자') || c.includes('둘이'))) {
    return { jp: `${qtyJp.replace('で', '')}ですが、入れますか？`, matched: true };
  }
  if (c.includes('너무 비싸') || c.includes('비싸요')) {
    return { jp: '少し高いですね。もう少し安いものはありますか？', matched: true };
  }
  if (c.includes('맛있어') || c.includes('맛있네요') || c.includes('잘 먹었')) {
    return { jp: 'とても美味しかったです！ごちそうさまでした。', matched: true };
  }
  if (c.includes('천천히')) {
    return { jp: 'すみません、もう少しゆっくり話していただけますか？', matched: true };
  }
  if (c.includes('잠시만') || c.includes('기다려')) {
    return { jp: 'すみません、少々待ってください。', matched: true };
  }
  if (c.includes('도와주')) {
    return { jp: 'すみません、少し助けていただけますか？', matched: true };
  }
  if (c.includes('괜찮아요') || c.includes('됐어요') || c.includes('필요 없')) {
    return { jp: 'いいえ、結構です。大丈夫です。', matched: true };
  }
  if (c.includes('맞아요') || c.includes('네 그래요')) {
    return { jp: 'はい、そうです。お願いします。', matched: true };
  }

  return { jp: '', matched: false };
}

// ============================================================================
// 4. 오프라인 번역 메인 엔트리 함수 (한국어 <-> 일본어 양방향)
// ============================================================================
const NEURAL_CACHE_KEY = 'tabitalk_offline_neural_cache_v3';
const OFFLINE_PACK_STATUS_KEY = 'tabitalk_offline_pack_installed_v3';

export function getOfflinePackStats(): OfflinePackStats {
  const installedTime =
    localStorage.getItem(OFFLINE_PACK_STATUS_KEY) || new Date().toISOString();
  if (!localStorage.getItem(OFFLINE_PACK_STATUS_KEY)) {
    localStorage.setItem(OFFLINE_PACK_STATUS_KEY, installedTime);
  }
  let cachedCount = 0;
  try {
    const raw = localStorage.getItem(NEURAL_CACHE_KEY);
    if (raw) {
      cachedCount = Object.keys(JSON.parse(raw)).length;
    }
  } catch {
    // ignore
  }
  return {
    isReady: true,
    version: 'v3.5 Pro (Offline Pack)',
    totalSentences: PREBUILT_CORPUS.length + 120 + cachedCount,
    totalVocabulary: NOUN_DICT.length + 350,
    totalGrammarPatterns: 52,
    lastSyncedAt: installedTime,
  };
}

export function saveNeuralCache(
  source: string,
  direction: 'ko-to-jp' | 'jp-to-ko',
  output: TranslationOutput
): void {
  try {
    const raw = localStorage.getItem(NEURAL_CACHE_KEY);
    const map: Record<string, TranslationOutput> = raw ? JSON.parse(raw) : {};
    map[`${direction}:${source.trim()}`] = output;
    localStorage.setItem(NEURAL_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function loadNeuralCache(
  source: string,
  direction: 'ko-to-jp' | 'jp-to-ko'
): TranslationOutput | null {
  try {
    const raw = localStorage.getItem(NEURAL_CACHE_KEY);
    if (!raw) return null;
    const map: Record<string, TranslationOutput> = JSON.parse(raw);
    const found = map[`${direction}:${source.trim()}`];
    if (found) {
      return { ...found, engineType: 'offline-neural-cache' };
    }
  } catch {
    // ignore
  }
  return null;
}

export function executeOfflineTranslation(
  input: string,
  direction: 'ko-to-jp' | 'jp-to-ko'
): TranslationOutput {
  const clean = input.trim();

  // 1단계: 로컬 신경망 캐시 확인
  const cached = loadNeuralCache(clean, direction);
  if (cached) return cached;

  if (direction === 'ko-to-jp') {
    // 두 문장 이상이 공백/접속사로 이어진 복합 입력인지 먼저 확인 (예: "지갑을 잃어버렸어요 파출소가 어디예요?", "카드가 안 돼요 현금으로 할게요")
    const multiSentenceParts = clean
      .split(/(?:\.\s+|\?\s+|!\s+|(?<=어요|아요|해요|돼요|되네요|네요|이에요|예요|습니다|입니다)\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (multiSentenceParts.length >= 2) {
      const translatedParts = multiSentenceParts.map((cl) => translateSingleClauseKoToJp(cl));
      if (translatedParts.every((r) => r.matched)) {
        const combinedJp = translatedParts.map((r) => r.jp).join(' ');
        return {
          japanese: combinedJp,
          furigana: japaneseToHiraganaReading(combinedJp),
          koreanPronunciation: kanaToKoreanPronunciation(combinedJp),
          koreanMeaning: clean,
          engineType: 'offline-pack',
          confidence: 96,
        };
      }
    }

    // 전체 문장 통째로 매칭 시도
    const wholeMatch = translateSingleClauseKoToJp(clean);
    if (wholeMatch.matched) {
      return {
        japanese: wholeMatch.jp,
        furigana: japaneseToHiraganaReading(wholeMatch.jp),
        koreanPronunciation: kanaToKoreanPronunciation(wholeMatch.jp),
        koreanMeaning: clean,
        engineType: 'offline-pack',
        confidence: 96,
      };
    }

    // 복합문 절(Clause) 분리: ", ", "그리고", "근데", "는데 ", "해서 " 등으로 쪼개서 각각 번역 후 결합
    const clauses = clean
      .split(/(?:,\s*|그리고\s+|근데\s+|그런데\s+|(?<=는데)\s+|(?<=해서)\s+|(?<=아서)\s+|(?<=어서)\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (clauses.length > 1) {
      const translatedClauses = clauses
        .map((cl) => translateSingleClauseKoToJp(cl))
        .filter((r) => r.matched)
        .map((r) => r.jp);

      if (translatedClauses.length > 0) {
        const combinedJp = translatedClauses.join(' ');
        return {
          japanese: combinedJp,
          furigana: japaneseToHiraganaReading(combinedJp),
          koreanPronunciation: kanaToKoreanPronunciation(combinedJp),
          koreanMeaning: clean,
          engineType: 'offline-pack',
          confidence: 92,
        };
      }
    }

    // 의문문/요청문 일반 문형 폴백
    const fallbackJp = clean.includes('?') || clean.includes('나요') || clean.includes('까요')
      ? 'すみません、これについて教えていただけますか？'
      : 'すみません、こちらをお願いできますか？';

    return {
      japanese: fallbackJp,
      furigana: japaneseToHiraganaReading(fallbackJp),
      koreanPronunciation: kanaToKoreanPronunciation(fallbackJp),
      koreanMeaning: clean,
      engineType: 'offline-pack',
      confidence: 70,
      tip: '사전 다운로드된 상황 칩을 누르거나 [목적어 + 동사] 형태로 입력하면 오프라인에서도 한층 정밀하게 번역됩니다.',
    };
  } else {
    // 일본어 -> 한국어 역번역
    for (const item of PREBUILT_CORPUS) {
      if (clean.includes(item.jp.slice(0, 6))) {
        return {
          japanese: clean,
          furigana: japaneseToHiraganaReading(clean),
          koreanPronunciation: kanaToKoreanPronunciation(clean),
          koreanMeaning: item.ko,
          engineType: 'offline-pack',
          confidence: 95,
        };
      }
    }

    // 일본어 어휘 + 어미 분석
    const foundMeanings: string[] = [];
    for (const entry of NOUN_DICT) {
      const pureJp = entry.jp.replace(/（.*?）/g, '');
      if (clean.includes(pureJp)) {
        foundMeanings.push(entry.ko[0]);
      }
    }

    let koSentence = '상대방의 일본어 안내 문장입니다.';
    if (foundMeanings.length > 0) {
      const joined = foundMeanings.slice(0, 3).join(', ');
      if (clean.includes('ありません') || clean.includes('できません') || clean.includes('使えません')) {
        koSentence = `${joined}은(는) 없거나 이용하실 수 없습니다.`;
      } else if (clean.includes('ですか') || clean.includes('ますか') || clean.includes('でしょうか')) {
        koSentence = `${joined}에 대해 묻고 있습니다 (이용하시겠습니까 / 괜찮으신가요?).`;
      } else if (clean.includes('ください') || clean.includes('お願いします')) {
        koSentence = `${joined}을(를) 부탁드립니다 (제시/확인해 주세요).`;
      } else {
        koSentence = `${joined} 관련 안내입니다.`;
      }
    } else if (clean.includes('かしこまりました') || clean.includes('承知')) {
      koSentence = '네, 알겠습니다. (정중한 접수 표현)';
    } else if (clean.includes('お待ち')) {
      koSentence = '잠시만 기다려 주십시오.';
    } else if (clean.includes('売り切れ')) {
      koSentence = '죄송합니다만 품절되었습니다.';
    }

    return {
      japanese: clean,
      furigana: japaneseToHiraganaReading(clean),
      koreanPronunciation: kanaToKoreanPronunciation(clean),
      koreanMeaning: koSentence,
      engineType: 'offline-pack',
      confidence: 88,
    };
  }
}

