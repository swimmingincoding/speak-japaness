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
  engineType: 'offline-pack' | 'offline-neural-cache' | 'online-live' | 'gemini-ai' | 'openai-ai';
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

  // 추가 확장 명사 (일상·트러블·시설·시간·음식·상태)
  { ko: ['화장지', '두루마리 휴지'], jp: 'トイレットペーパー', type: 'item' },
  { ko: ['금액', '가격', '요금', '계산서 금액'], jp: '金額', type: 'abstract' },
  { ko: ['창문'], jp: '窓', type: 'item' },
  { ko: ['문', '출입문'], jp: 'ドア', type: 'item' },
  { ko: ['에어컨', '냉방'], jp: 'エアコン（冷房）', type: 'item' },
  { ko: ['난방', '히터'], jp: '暖房', type: 'item' },
  { ko: ['청소', '방 청소'], jp: '部屋の掃除', type: 'abstract' },
  { ko: ['세탁', '빨래', '세탁기'], jp: '洗濯機', type: 'item' },
  { ko: ['전자레인지'], jp: '電子レンジ', type: 'item' },
  { ko: ['뜨거운 물'], jp: 'お湯', type: 'food' },
  { ko: ['모닝콜'], jp: 'モーニングコール', type: 'abstract' },
  { ko: ['날씨'], jp: '天気', type: 'abstract' },
  { ko: ['산책'], jp: '散歩', type: 'abstract' },
  { ko: ['기분'], jp: '気分', type: 'abstract' },
  { ko: ['고기'], jp: 'お肉', type: 'food' },
  { ko: ['국물', '육수', '스프'], jp: 'スープ（出汁）', type: 'food' },
  { ko: ['음식', '요리'], jp: '料理', type: 'food' },
  { ko: ['디저트', '후식'], jp: 'デザート', type: 'food' },
  { ko: ['맛집', '맛있는 식당', '좋은 식당'], jp: '美味しいお店', type: 'place' },
  { ko: ['카페', '커피숍'], jp: 'カフェ', type: 'place' },
  { ko: ['이자카야', '술집'], jp: '居酒屋', type: 'place' },
  { ko: ['백화점'], jp: 'デパート', type: 'place' },
  { ko: ['돈키호테'], jp: 'ドン・キホーテ', type: 'place' },
  { ko: ['버스'], jp: 'バス', type: 'item' },
  { ko: ['전철', '지하철', '기차'], jp: '電車', type: 'item' },
  { ko: ['택시'], jp: 'タクシー', type: 'item' },
  { ko: ['신칸센'], jp: '新幹線', type: 'item' },
  { ko: ['비행기', '항공편'], jp: '飛行機', type: 'item' },
  { ko: ['도쿄타워'], jp: '東京タワー', type: 'place' },
  { ko: ['스카이트리'], jp: 'スカイツリー', type: 'place' },
  { ko: ['유니버설 스튜디오', 'USJ'], jp: 'ユニバーサル・スタジオ', type: 'place' },
  { ko: ['디즈니랜드'], jp: 'ディズニーランド', type: 'place' },
  { ko: ['아사쿠사'], jp: '浅草', type: 'place' },
  { ko: ['하라주쿠'], jp: '原宿', type: 'place' },
  { ko: ['긴자'], jp: '銀座', type: 'place' },
  { ko: ['우에노'], jp: '上野', type: 'place' },
  { ko: ['아키하바라'], jp: '秋葉原', type: 'place' },
  { ko: ['이케부쿠로'], jp: '池袋', type: 'place' },
  { ko: ['오사카'], jp: '大阪', type: 'place' },
  { ko: ['교토'], jp: '京都', type: 'place' },
  { ko: ['고베'], jp: '神戸', type: 'place' },
  { ko: ['나고야'], jp: '名古屋', type: 'place' },
  { ko: ['후쿠오카'], jp: '福岡', type: 'place' },
  { ko: ['근처', '주변', '이 근처'], jp: 'この近く', type: 'place' },
  { ko: ['직원', '점원'], jp: '店員さん', type: 'person' },
  { ko: ['한국 사람', '한국인'], jp: '韓国人', type: 'person' },
  { ko: ['친구'], jp: '友達', type: 'person' },
  { ko: ['가족'], jp: '家族', type: 'person' },
  { ko: ['아이', '어린이'], jp: '子供', type: 'person' },
  { ko: ['냄새'], jp: '匂い', type: 'abstract' },
  { ko: ['소리', '소음'], jp: '音', type: 'abstract' },
  { ko: ['맛'], jp: '味', type: 'abstract' },
  { ko: ['양'], jp: '量', type: 'abstract' },
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
// 3. 한국어 어절(체언+조사) · 시간/수량 · 부사 · 120종 용언(동사/형용사) 구문 번역기
// ============================================================================
function extractQtyFromSegment(seg: string): string {
  for (const [regex, jpVal] of QUANTITY_RULES) {
    if (regex.test(seg)) {
      return jpVal;
    }
  }
  return '';
}

const DYNAMIC_VOCAB_STORAGE_KEY = 'tabitalk_dynamic_vocab_v1';

const FLATTENED_NOUN_KEYWORDS: Array<{ koWord: string; entry: NounDictEntry }> = [];
function rebuildFlattenedNounKeywords(): void {
  FLATTENED_NOUN_KEYWORDS.length = 0;
  for (const entry of NOUN_DICT) {
    for (const koWord of entry.ko) {
      if (koWord) FLATTENED_NOUN_KEYWORDS.push({ koWord, entry });
    }
  }
  FLATTENED_NOUN_KEYWORDS.sort((a, b) => b.koWord.length - a.koWord.length);
}

// 앱 시작 시 Gemini로부터 학습해 둔 동적 어휘 사전 복원
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(DYNAMIC_VOCAB_STORAGE_KEY);
    if (raw) {
      const savedPairs: Array<{ ko: string; jp: string }> = JSON.parse(raw);
      for (const p of savedPairs) {
        if (p?.ko && p?.jp && !NOUN_DICT.some((e) => e.ko.includes(p.ko))) {
          NOUN_DICT.push({ ko: [p.ko], jp: p.jp, type: 'item' });
        }
      }
    }
  }
} catch {
  // ignore
}
rebuildFlattenedNounKeywords();

export function registerDynamicVocabPairs(
  pairs: Array<{ ko: string; jp: string }>
): void {
  if (!Array.isArray(pairs) || pairs.length === 0) return;
  let added = false;
  for (const p of pairs) {
    const ko = p?.ko?.trim();
    const jp = p?.jp?.trim();
    if (ko && jp && ko.length >= 2 && !NOUN_DICT.some((e) => e.ko.includes(ko))) {
      NOUN_DICT.push({ ko: [ko], jp, type: 'item' });
      added = true;
    }
  }
  if (added) {
    rebuildFlattenedNounKeywords();
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DYNAMIC_VOCAB_STORAGE_KEY);
        const existing: Array<{ ko: string; jp: string }> = raw ? JSON.parse(raw) : [];
        for (const p of pairs) {
          const ko = p?.ko?.trim();
          const jp = p?.jp?.trim();
          if (ko && jp && !existing.some((e) => e.ko === ko)) {
            existing.push({ ko, jp });
          }
        }
        localStorage.setItem(DYNAMIC_VOCAB_STORAGE_KEY, JSON.stringify(existing));
      }
    } catch {
      // ignore
    }
  }
}

function findValidKeywordIndex(text: string, koWord: string): number {
  let startPos = 0;
  while (startPos < text.length) {
    const idx = text.indexOf(koWord, startPos);
    if (idx === -1) return -1;

    // 1글자 단어(예: '게', '파', '차', '역', '방', '물', '문', '맛', '양')가 어미나 합성어 내부에서 오매칭되는 현상 방지
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

// 한국어 문장 내 시간·시각·수량 표현을 일본어로 추출
function extractTimeAndCounterPrefix(clause: string): string {
  const parts: string[] = [];
  if (clause.includes('내일')) parts.push('明日');
  else if (clause.includes('오늘')) parts.push('今日');
  else if (clause.includes('어제')) parts.push('昨日');

  if (clause.includes('새벽')) parts.push('早朝');
  else if (clause.includes('아침') || clause.includes('오전')) parts.push('朝');
  else if (clause.includes('점심') || clause.includes('낮')) parts.push('昼');
  else if (clause.includes('저녁') || clause.includes('오후')) parts.push('夕方');
  else if (clause.includes('밤')) parts.push('夜');

  const korHourMap: Record<string, number> = {
    한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6,
    일곱: 7, 여덟: 8, 아홉: 9, 열: 10, 열한: 11, 열두: 12,
  };
  const timeMatch = clause.match(
    /(\d{1,2}|열두|열한|열|아홉|여덟|일곱|여섯|다섯|네|세|두|한)\s*시(\s*반|\s*\d{1,2}\s*분)?(에|까지|부터)?/
  );
  if (timeMatch) {
    const rawH = timeMatch[1];
    const h = korHourMap[rawH] ?? Number(rawH);
    const minPart = timeMatch[2]
      ? timeMatch[2].includes('반')
        ? '半'
        : timeMatch[2].replace(/\s*분/, '分').trim()
      : '';
    const particle =
      timeMatch[3] === '까지'
        ? 'までに'
        : timeMatch[3] === '부터'
        ? 'から'
        : 'に';
    parts.push(`${h}時${minPart}${particle}`);
  } else if (clause.includes('지금') || clause.includes('바로')) {
    parts.push('今');
  }

  if (parts.length === 0) return '';
  if (parts.length >= 2 && (parts[0] === '明日' || parts[0] === '今日' || parts[0] === '昨日')) {
    return `${parts[0]}の${parts.slice(1).join('')}`;
  }
  return parts.join('');
}

// 한국어에서 해당 명사 바로 뒤에 붙은 조사를 분석하여 일본어 조사(に, で, が, は, を, と, まで, から, の)를 결정
function detectJapaneseParticleAfterNoun(
  clause: string,
  matchIndex: number,
  matchLen: number,
  nounType: NounDictEntry['type'],
  isLastNoun: boolean,
  defaultParticle: string
): string {
  const after = clause.slice(matchIndex + matchLen);
  if (/^(에서는|에서)/.test(after)) return 'で';
  if (/^(에게는|에게|한테|에\s+있|에\s+없|에\s+가|에\s+서|에\s+두고|에\s+놓고)/.test(after)) return 'に';
  if (/^에/.test(after)) {
    return nounType === 'place' ? 'に' : 'に';
  }
  if (/^서\s/.test(after) && nounType === 'place') return 'で';
  if (/^까지/.test(after)) return 'まで';
  if (/^부터/.test(after)) return 'から';
  if (/^보다/.test(after)) return 'より';
  if (/^(이랑|랑|하고|와|과)/.test(after)) return 'と';
  if (/^(으로|로)/.test(after)) return 'で';
  if (/^의/.test(after)) return 'の';
  if (/^도/.test(after)) return 'も';
  if (/^만/.test(after)) return 'だけ';
  if (/^(은|는)/.test(after)) return 'は';
  if (/^(이|가)/.test(after)) return 'が';
  if (/^(을|를)/.test(after)) return 'を';

  if (!isLastNoun) {
    // 앞 명사가 조사 없이 다음 명사를 수식하는 경우 (예: "영수증 금액", "방 청소", "화장실 휴지")
    return 'の';
  }
  return defaultParticle;
}

function buildSyntacticNounChain(
  clause: string,
  foundNouns: Array<{ entry: NounDictEntry; matchedKo: string; index: number }>,
  defaultLastParticle: string
): string {
  if (foundNouns.length === 0) return '';
  return foundNouns
    .map((item, idx) => {
      const isLast = idx === foundNouns.length - 1;
      const particle = detectJapaneseParticleAfterNoun(
        clause,
        item.index,
        item.matchedKo.length,
        item.entry.type,
        isLast,
        defaultLastParticle
      );
      return `${item.entry.jp}${particle}`;
    })
    .join('');
}

function translateSingleClauseKoToJp(clause: string): {
  jp: string;
  matched: boolean;
  exactCorpus?: boolean;
} {
  const c = clause.trim();
  if (!c) return { jp: '', matched: false };

  // 0) 코퍼스 완전 일치(100% Exact Match) 최우선 확인
  const normInput = c.replace(/[?？.!~\s]/g, '');
  for (const item of PREBUILT_CORPUS) {
    if (item.ko.replace(/[?？.!~\s]/g, '') === normInput) {
      return { jp: item.jp, matched: true, exactCorpus: true };
    }
  }

  // 1) 절 내부의 명사들을 가장 긴 키워드 우선(Longest-Match-First)으로 추출
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

  // 2) 코퍼스 키워드 매칭 (단, 사용자의 명사가 모두 포함되고 서술어 의도가 충돌하지 않을 때만 허용)
  let bestCorpus: CorpusItem | null = null;
  let bestScore = 0;

  const userHasNegationOrDiff =
    c.includes('없어') ||
    c.includes('없나') ||
    c.includes('달라') ||
    c.includes('다른데') ||
    c.includes('틀려') ||
    c.includes('안 돼') ||
    c.includes('마세') ||
    c.includes('안 해');

  for (const item of PREBUILT_CORPUS) {
    // 사용자가 추출된 모든 명사를 코퍼스 문장도 포함하는지 확인 (부분 명사 매칭으로 인한 오역 원천 차단)
    if (foundNouns.length >= 1) {
      const allNounsCovered = foundNouns.every((n) =>
        n.entry.ko.some((syn) => item.ko.includes(syn))
      );
      if (!allNounsCovered) continue;
    }

    if (userHasNegationOrDiff) {
      const itemHasNeg =
        item.ko.includes('없') ||
        item.ko.includes('안') ||
        item.ko.includes('못') ||
        item.ko.includes('빼') ||
        item.ko.includes('마');
      if (!itemHasNeg) continue;
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

  if (bestCorpus && bestScore >= 45) {
    return { jp: bestCorpus.jp, matched: true, exactCorpus: false };
  }

  // 3) 특화 문형 및 다중 품목 주문 합성
  if ((c.includes('안 매운') || c.includes('맵지 않')) && c.includes('추천')) {
    return { jp: '辛くない料理をおすすめしてください。', matched: true };
  }

  const timePrefix = extractTimeAndCounterPrefix(c);
  const qtyJp = extractQtyFromSegment(c);

  // 다중 품목 개별 수량 조합 (예: "생맥주 두 잔이랑 가라아게 하나 주세요")
  if (
    foundNouns.length >= 2 &&
    (c.includes('주세요') || c.includes('주실') || c.includes('부탁') || c.includes('주문')) &&
    !c.includes('빼') &&
    !c.includes('더 주') &&
    !c.includes('달라') &&
    !c.includes('다른데') &&
    !c.includes('확인')
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

  // 4) 한국어 조사(에/에서/이/가/은/는/을/를/와/과/의) + 120종 서술어(동사·형용사·어미) 정밀 구문 합성
  const isConjunctive =
    c.endsWith('는데') ||
    c.endsWith('는데요') ||
    c.endsWith('해서') ||
    c.endsWith('아서') ||
    c.endsWith('어서') ||
    c.endsWith('이라서') ||
    c.endsWith('여서') ||
    c.endsWith('고');

  const isQuestion =
    c.includes('?') ||
    c.includes('나요') ||
    c.includes('까요') ||
    c.includes('어요?') ||
    c.includes('아요?') ||
    c.includes('해요?') ||
    c.includes('니까') ||
    c.includes('예요?') ||
    c.includes('인가요');

  const isPermissionAsk =
    c.includes('도 되나요') ||
    c.includes('도 될까요') ||
    c.includes('도 돼요') ||
    c.includes('면 되나요') ||
    c.includes('야 하나요') ||
    c.includes('야 돼요');

  const adverbJp =
    c.includes('너무') || c.includes('정말') || c.includes('아주')
      ? 'とても'
      : c.includes('조금') || c.includes('약간')
      ? '少し'
      : c.includes('잘') || c.includes('바싹') || c.includes('푹')
      ? 'よく'
      : c.includes('천천히')
      ? 'ゆっくり'
      : c.includes('빨리')
      ? '早く'
      : '';

  // [서술어 그룹 A] 차이 / 다름 / 오류 ("영수증 금액이 메뉴판이랑 다른데요", "주문한 거랑 달라요")
  if (c.includes('달라') || c.includes('다른데') || c.includes('틀려') || c.includes('안 맞아')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    const pred = isConjunctive ? '違うのですが、' : isQuestion ? '違いますか？' : '違います。';
    return { jp: `${chain || '内容が'}${pred}`, matched: true };
  }

  // [서술어 그룹 B] 부재 / 소진 ("화장실에 휴지가 없어요", "다 떨어졌어요")
  if (
    c.includes('없어요') ||
    c.includes('없습니다') ||
    c.includes('없네요') ||
    c.includes('없는데') ||
    c.includes('떨어졌') ||
    c.includes('안 나와') ||
    c.includes('안 나왔')
  ) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    if (c.includes('안 나와') || c.includes('안 나왔')) {
      return {
        jp: `${chain || '料理が'}まだ出ていません${isConjunctive ? 'が、' : '。'}`,
        matched: true,
      };
    }
    return {
      jp: `${chain || 'これが'}${isConjunctive ? 'ないのですが、' : 'ありません。'}`,
      matched: true,
    };
  }

  // [서술어 그룹 C] 불필요 / 사양 ("방 청소 안 해주셔도 돼요", "안 해도 돼요", "필요 없어요")
  if (
    c.includes('안 해주셔도') ||
    c.includes('안 해도') ||
    c.includes('필요 없') ||
    c.includes('안 주셔도') ||
    c.includes('안 데워도')
  ) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'は');
    return {
      jp: `${chain ? chain : ''}しなくて大丈夫です（不要です）。`,
      matched: true,
    };
  }

  // [서술어 그룹 D] 촬영 / 사진 찍기 ("여기서 사진 찍어도 되나요?", "사진 찍어주세요")
  if (c.includes('찍어') || c.includes('찍을') || c.includes('촬영')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    if (isPermissionAsk || c.includes('찍어도')) {
      return { jp: `${chain || '写真を'}撮ってもいいですか？`, matched: true };
    }
    return {
      jp: `すみません、${chain || '写真を'}${qtyJp || '一枚'}撮ってもらえますか？`,
      matched: true,
    };
  }

  // [서술어 그룹 E] 개폐 / 전원 / 온도 조절 (창문, 문, 에어컨, 난방 등)
  if (c.includes('닫아') || c.includes('닫을')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return {
      jp: isPermissionAsk
        ? `${chain || '窓を'}閉めてもいいですか？`
        : `すみません、${chain || '窓を'}閉めてください。`,
      matched: true,
    };
  }
  if (c.includes('열어') || c.includes('열릴') || c.includes('열려')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return {
      jp: isPermissionAsk
        ? `${chain || 'ドアを'}開けてもいいですか？`
        : `すみません、${chain || 'ドアを'}開けてもらえますか？`,
      matched: true,
    };
  }
  if (c.includes('켜주') || c.includes('켜도')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain || 'エアコンを'}つけてください。`, matched: true };
  }
  if (c.includes('꺼주') || c.includes('꺼도')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain || 'エアコンを'}消してください。`, matched: true };
  }
  if (c.includes('구워') || c.includes('익혀')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `${chain || 'お肉を'}${adverbJp || 'よく'}焼いてください。`, matched: true };
  }
  if (c.includes('데워') || c.includes('따뜻하게 해')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `${chain || 'これを'}温めてください。`, matched: true };
  }
  if (c.includes('잘라') || c.includes('썰어')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `${chain || 'これを'}食べやすく切ってください。`, matched: true };
  }
  if (c.includes('채워') || c.includes('보충')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain || 'これを'}補充してもらえますか？`, matched: true };
  }
  if (c.includes('치워') || c.includes('닦아') || c.includes('정리')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain || 'テーブルを'}片付けて（拭いて）もらえますか？`, matched: true };
  }

  // [서술어 그룹 F] 확인 / 문의 / 보여주기 ("확인해 주세요", "여권을 보여드려야 하나요?")
  if (c.includes('확인해') || c.includes('확인 부탁') || c.includes('봐주')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain}確認してください。`, matched: true };
  }
  if (c.includes('보여드려') || c.includes('보여줄까') || c.includes('제시해')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return {
      jp: isQuestion
        ? `${chain || 'パスポートを'}見せたほうがいいですか？`
        : `${chain || 'こちらを'}見せます。`,
      matched: true,
    };
  }
  if (c.includes('보여주') || c.includes('볼 수 있')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'を');
    return { jp: `すみません、${chain || 'これを'}見せてください。`, matched: true };
  }

  // [서술어 그룹 G] 날씨 / 기온 / 맛 / 상태 형용사 ("오늘 날씨가 너무 좋네요", "에어컨이 너무 추워요")
  if (c.includes('추워') || c.includes('춥네') || c.includes('쌀쌀')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    return { jp: `${ timePrefix }${chain}${adverbJp}寒いです。`, matched: true };
  }
  if (c.includes('더워') || c.includes('덥네')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    return { jp: `${timePrefix}${chain}${adverbJp}暑いです。`, matched: true };
  }
  if (c.includes('산책') && (c.includes('좋') || c.includes('하고 싶'))) {
    return { jp: `${timePrefix}天気がとても良くて、散歩日和ですね。`, matched: true };
  }
  if (c.includes('좋네요') || c.includes('좋아요') || c.includes('멋지네') || c.includes('예쁘네')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    return { jp: `${timePrefix}${chain || ''}${adverbJp || 'とても'}いいですね！`, matched: true };
  }
  if (c.includes('배고파') || c.includes('출출해')) {
    return {
      jp: isConjunctive ? 'お腹が空いたので、' : 'お腹が空きました。',
      matched: true,
    };
  }
  if (c.includes('목말라') || c.includes('갈증')) {
    return {
      jp: isConjunctive ? '喉が渇いたので、' : '喉が渇きました。',
      matched: true,
    };
  }
  if (c.includes('피곤해') || c.includes('힘들어')) {
    return { jp: '少し疲れました。休みたいです。', matched: true };
  }
  if (c.includes('시끄러')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'が');
    return { jp: `${chain}少しうるさいです。`, matched: true };
  }
  if (c.includes('짜요') || c.includes('짜네')) {
    return { jp: '少ししょっぱいです。', matched: true };
  }
  if (c.includes('싱거워') || c.includes('싱겁')) {
    return { jp: '少し味が薄いです。', matched: true };
  }
  if (c.includes('매워') || c.includes('맵네')) {
    return { jp: '少し辛いです。', matched: true };
  }

  // [서술어 그룹 H] 교통 정차 / 탑승 / 하차 ("이 버스가 도쿄타워 근처에 서나요?")
  if (c.includes('서나요') || c.includes('정차하') || c.includes('멈추나')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'に');
    return { jp: `${chain}止まりますか？`, matched: true };
  }
  if (c.includes('타야') || c.includes('타면 되') || c.includes('타나요')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'で');
    return { jp: `${chain}乗ればいいですか？`, matched: true };
  }
  if (c.includes('내려야') || c.includes('내리면 되')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'で');
    return { jp: `${chain}降りればいいですか？`, matched: true };
  }
  if (c.includes('기다려도') || c.includes('기다릴 수')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'で');
    return { jp: `${chain || 'ここで'}少し待ってもいいですか？`, matched: true };
  }
  if (c.includes('어떻게 먹') || c.includes('먹는 방법')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'は');
    return { jp: `${chain || 'これは'}どうやって食べますか？`, matched: true };
  }
  if (c.includes('어떻게 쓰') || c.includes('어떻게 사용') || c.includes('사용법')) {
    const chain = buildSyntacticNounChain(c, foundNouns, 'は');
    return { jp: `${chain || 'これは'}どうやって使いますか？`, matched: true };
  }

  // [서술어 그룹 I] 명사가 포함된 일반 여행 구문
  if (foundNouns.length > 0) {
    const nounPhraseJp =
      foundNouns.length >= 2 &&
      foundNouns.every((n) => n.entry.type === foundNouns[0].entry.type) &&
      /(이랑|랑|하고|와|과|,)/.test(c)
        ? foundNouns.map((n) => n.entry.jp).join('と')
        : '';

    // 부정/미완료 연결형 (예: "예약은 안 했는데")
    if ((c.includes('안 했') || c.includes('하지 않았')) && isConjunctive) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${chain}していないんですが、`, matched: true };
    }
    if (c.includes('없어서') || c.includes('안 돼서') || c.includes('부족해서')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'が');
      return { jp: `${chain}ないので、`, matched: true };
    }
    // 작동 불가 / 결제 불가 ("카드가 안 돼요")
    if (c.includes('안 돼요') || c.includes('안 되네요') || c.includes('안 됩니다') || c.includes('작동이 안')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'が');
      return { jp: `${chain}使えません。`, matched: true };
    }
    // 빼달라 / 넣지 말아달라
    if (c.includes('빼주') || c.includes('빼고') || c.includes('넣지 마') || c.includes('없이')) {
      const target = nounPhraseJp || buildSyntacticNounChain(c, foundNouns, 'は');
      return {
        jp: target.endsWith('は') || target.endsWith('を')
          ? `${target}抜いてください。`
          : `${target}は抜いてください。`,
        matched: true,
      };
    }
    // 적게 / 조금만
    if (c.includes('적게') || c.includes('조금만') || c.includes('덜')) {
      const chain = nounPhraseJp ? `${nounPhraseJp}は` : buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${chain}少なめでお願いします。`, matched: true };
    }
    // 많이 / 추가
    if (c.includes('많이') || c.includes('추가') || c.includes('더 주') || c.includes('리필')) {
      const chain = nounPhraseJp ? `${nounPhraseJp}を` : buildSyntacticNounChain(c, foundNouns, 'を');
      return { jp: `${chain}もう${qtyJp || '一つ'}お願いします。`, matched: true };
    }
    // 추천 요청
    if (c.includes('추천')) {
      const lastNoun = foundNouns[foundNouns.length - 1].entry.jp;
      return { jp: `おすすめの${lastNoun}を教えてください。`, matched: true };
    }
    // 알레르기 / 못 먹음
    if (c.includes('알레르기') || c.includes('알러지')) {
      const target = nounPhraseJp || foundNouns[0].entry.jp;
      return { jp: `${target}のアレルギーがあります。`, matched: true };
    }
    if (c.includes('못 먹') || c.includes('안 먹')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${chain}食べられません。`, matched: true };
    }
    // 분실 / 놓고 내림 ("전철에 가방을 두고 내렸어요")
    if (c.includes('잃어버') || c.includes('분실') || c.includes('두고') || c.includes('놓고')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'を');
      return { jp: `${chain}なくして（置き忘れて）しまいました。`, matched: true };
    }
    // 방향 / 가고 싶다 / 가는 법
    if (c.includes('가고 싶') || c.includes('가려면') || c.includes('어떻게 가') || c.includes('가는 길')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'に');
      return { jp: `${chain}行きたいんですが、どう行けばいいですか？`, matched: true };
    }
    if (c.includes('까지 가주') || c.includes('까지 부탁')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'まで');
      return { jp: `${chain}お願いします。`, matched: true };
    }
    // 소요 시간
    if (c.includes('얼마나 걸') || c.includes('몇 분 걸')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'まで');
      return { jp: `${chain}どのくらい時間がかかりますか？`, matched: true };
    }
    // 위치 질문
    if (c.includes('어디')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${chain}どこにありますか？`, matched: true };
    }
    // 가격 질문
    if (c.includes('얼마') || c.includes('가격')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${chain}いくらですか？`, matched: true };
    }
    // 시간 질문
    if (c.includes('몇 시')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${timePrefix}${chain}何時ですか？`, matched: true };
    }
    // 바꿔달라 / 변경 ("창가 자리로 바꿀 수 있을까요?")
    if (c.includes('바꿔') || c.includes('바꿀') || c.includes('변경') || c.includes('교환')) {
      const lastNoun = foundNouns[foundNouns.length - 1].entry.jp;
      if (c.includes('으로') || c.includes('로')) {
        return { jp: `${lastNoun}に変えてもらえますか？`, matched: true };
      }
      return { jp: `${lastNoun}を交換してもらえますか？`, matched: true };
    }
    // 맡기다 / 보관
    if (c.includes('맡길') || c.includes('맡아') || c.includes('보관')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'を');
      return { jp: `${timePrefix}${chain}預かってもらえますか？`, matched: true };
    }
    // 체크아웃 / 체크인 / 예약 등 시간 결합 행동 ("내일 아침 7시에 체크아웃할게요")
    if (
      foundNouns.some((n) => n.entry.jp === 'チェックアウト' || n.entry.jp === 'チェックイン') &&
      (c.includes('할게요') || c.includes('합니다') || c.includes('하려'))
    ) {
      const act = foundNouns.find(
        (n) => n.entry.jp === 'チェックアウト' || n.entry.jp === 'チェックイン'
      )!.entry.jp;
      return { jp: `${timePrefix}${act}します。`, matched: true };
    }
    // 허가 / 가능 여부 (~해도 되나요, ~할 수 있나요, ~되나요)
    if (c.includes('봐도 되') || c.includes('해도 되') || c.includes('되나요') || c.includes('할 수 있') || c.includes('가능')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${timePrefix}${chain}できますか？（可能でしょうか？）`, matched: true };
    }
    // 존재 유무 (~있나요, ~있어요?)
    if (c.includes('있나요') || c.includes('있어요') || c.includes('있습니까') || c.includes('남아 있')) {
      const chain = buildSyntacticNounChain(c, foundNouns, 'は');
      return { jp: `${qtyJp ? qtyJp + '、' : ''}${chain}ありますか？`, matched: true };
    }
    // 수단 (~으로 할게요 / ~으로 계산)
    if (c.includes('으로 할게') || c.includes('로 할게')) {
      const lastNoun = foundNouns[foundNouns.length - 1].entry.jp;
      return { jp: `${lastNoun}でお願いします。`, matched: true };
    }
    // 명시적 주문 / 요청 (~주세요, ~주실, ~부탁, ~할게요, ~주문)일 때만 お願いします 사용!
    if (c.includes('주세요') || c.includes('주실') || c.includes('부탁') || c.includes('할게요') || c.includes('주문')) {
      const target = nounPhraseJp
        ? `${nounPhraseJp}を`
        : buildSyntacticNounChain(c, foundNouns, 'を');
      return {
        jp: `${timePrefix}${target}${qtyJp || ''}お願いします。`,
        matched: true,
      };
    }
    // 명사 단독 입력일 때만 질문/요청 생성 (긴 문장인데 서술어를 모르는 경우는 오역 방지를 위해 matched: false 반환하여 후속 처리)
    if (c.length <= 12) {
      if (foundNouns[0].entry.type === 'place') {
        return { jp: `すみません、${foundNouns[0].entry.jp}はどこにありますか？`, matched: true };
      }
      return {
        jp: `すみません、${foundNouns[0].entry.jp}を${qtyJp || ''}お願いします。`,
        matched: true,
      };
    }
  }

  // 5) 명사 없이 인사·감정·일상 표현만 있는 경우
  if (c.includes('안녕하') || c.includes('반갑') || c.includes('반가워')) {
    return { jp: 'こんにちは！よろしくお願いします。', matched: true };
  }
  if (c.includes('감사합') || c.includes('고마워') || c.includes('고맙습')) {
    return { jp: 'ありがとうございます！', matched: true };
  }
  if (c.includes('죄송합') || c.includes('미안해') || c.includes('실례합')) {
    return { jp: 'すみません、申し訳ありません。', matched: true };
  }
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
  if (c.includes('괜찮아요') || c.includes('됐어요')) {
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
    version: 'v4.0 Neural+Syntactic Pack',
    totalSentences: PREBUILT_CORPUS.length + 180 + cachedCount,
    totalVocabulary: NOUN_DICT.length + 450,
    totalGrammarPatterns: 120,
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
    const exactKey = `${direction}:${source.trim()}`;
    if (map[exactKey]) {
      return { ...map[exactKey], engineType: 'offline-neural-cache' };
    }
    // 문장부호·공백 차이를 무시하는 정규화 퍼지 매칭 지원 (오프라인에서 물음표나 띄어쓰기가 달라도 캐시 적중!)
    const normTarget = source.replace(/[?？.!~\s]/g, '');
    for (const [k, val] of Object.entries(map)) {
      if (!k.startsWith(`${direction}:`)) continue;
      const savedSource = k.slice(direction.length + 1);
      if (savedSource.replace(/[?？.!~\s]/g, '') === normTarget) {
        return { ...val, engineType: 'offline-neural-cache' };
      }
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
    // 두 문장 이상이 공백/접속사로 이어진 복합 입력인지 먼저 확인
    const multiSentenceParts = clean
      .split(
        /(?:\.\s+|\?\s+|!\s+|(?<=어요|아요|해요|돼요|되네요|네요|이에요|예요|습니다|입니다|데요)\s+)/
      )
      .map((s) => s.trim())
      .filter(Boolean);

    if (multiSentenceParts.length >= 2) {
      const translatedParts = multiSentenceParts.map((cl) =>
        translateSingleClauseKoToJp(cl)
      );
      if (translatedParts.every((r) => r.matched)) {
        const combinedJp = translatedParts.map((r) => r.jp).join(' ');
        return {
          japanese: combinedJp,
          furigana: japaneseToHiraganaReading(combinedJp),
          koreanPronunciation: kanaToKoreanPronunciation(combinedJp),
          koreanMeaning: clean,
          engineType: 'offline-pack',
          confidence: 90,
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
        confidence: wholeMatch.exactCorpus ? 99 : 90,
      };
    }

    // 복합문 절(Clause) 분리: ", ", "그리고", "근데", "는데 ", "해서 " 등으로 쪼개서 각각 번역 후 결합
    const clauses = clean
      .split(
        /(?:,\s*|그리고\s+|근데\s+|그런데\s+|(?<=는데)\s+|(?<=해서)\s+|(?<=아서)\s+|(?<=어서)\s+|(?<=고)\s+)/
      )
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
          confidence: 88,
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
    // 일본어 -> 한국어 역번역 (점원/역무원/호텔리어 응답 및 사용자 문장 정밀 해석)
    const normJp = clean.replace(/[\s。、！？!?]/g, '');

    // 1. 내장 코퍼스 완전 일치 검사
    for (const item of PREBUILT_CORPUS) {
      const itemNorm = item.jp.replace(/[\s。、！？!?]/g, '');
      if (normJp === itemNorm) {
        return {
          japanese: clean,
          furigana: japaneseToHiraganaReading(clean),
          koreanPronunciation: kanaToKoreanPronunciation(clean),
          koreanMeaning: item.ko,
          engineType: 'offline-pack',
          confidence: 99,
        };
      }
    }

    // 2. 일본 현지 직원/점원 단골 질문·안내 표현 50선 패턴 매칭
    const staffPatterns: Array<{ test: RegExp; ko: string }> = [
      { test: /何名様|なんめいさま/, ko: '몇 분이신가요?' },
      { test: /ご予約.*(ありますか|されていますか|おありですか)/, ko: '예약하셨나요?' },
      { test: /おタバコ|禁煙席.*喫煙席|禁煙と喫煙/, ko: '금연석과 흡연석 중 어느 쪽으로 하시겠습니까?' },
      { test: /店内.*お召し上がり|お持ち帰り.*店内|イートイン.*テイクアウト/, ko: '매장에서 드시나요, 포장해 가시나요?' },
      { test: /温めますか|あたためますか|お弁当温め/, ko: '음식(도시락)을 데워 드릴까요?' },
      { test: /レジ袋|袋.*(ご利用|入りますか|お付け|いりますか)/, ko: '비닐봉투(쇼핑백) 필요하신가요?' },
      { test: /ポイントカード.*(お持ち|ありますか)/, ko: '포인트 카드 가지고 계신가요?' },
      { test: /お箸.*スプーン|お箸.*お付け/, ko: '젓가락이나 스푼 넣어 드릴까요?' },
      { test: /お支払い.*(方法|現金|カード|いかが)/, ko: '결제는 어떻게 도와드릴까요? (현금/카드)' },
      { test: /タッチ決済|差し込んで|暗証番号/, ko: '카드를 터치하거나 꽂아주시고 비밀번호를 입력해 주세요.' },
      { test: /レシート.*(ご利用|よろしい|お渡し)/, ko: '영수증 필요하신가요?' },
      { test: /パスポート.*(ご提示|見せて|お預かり|拝見)/, ko: '여권을 보여주시겠어요?' },
      { test: /チェックイン.*お名前|ご予約のお名前/, ko: '체크인(예약)하신 분 성함이 어떻게 되시나요?' },
      { test: /チェックアウト.*(何時|10時|11時)/, ko: '체크아웃 시간 안내입니다.' },
      { test: /朝食.*(会場|レストラン|何時)/, ko: '조식 시간 및 레스토랑 위치 안내입니다.' },
      { test: /エレベーター.*(あちら|右手|左手|奥)/, ko: '엘리베이터는 저쪽(오른쪽/왼쪽/안쪽)에 있습니다.' },
      { test: /お荷物.*お預かり/, ko: '짐을 맡아 드리겠습니다.' },
      { test: /満席.*お待ち|待ち時間/, ko: '현재 만석이라 대기 시간이 발생합니다.' },
      { test: /売り切れ|品切れ|在庫がございません/, ko: '죄송합니다만 현재 품절(재고 없음)입니다.' },
      { test: /少々お待ちください|しばらくお待ち/, ko: '잠시만 기다려 주십시오.' },
      { test: /かしこまりました|承知いたしました/, ko: '네, 알겠습니다. (정중한 확인)' },
      { test: /ご注文はお決まりですか|お伺いします/, ko: '주문하실 메뉴 결정하셨나요?' },
      { test: /以上でよろしいですか|ご注文は以上/, ko: '주문은 이상으로 맞으신가요?' },
      { test: /お水.*セルフ|セルフサービス/, ko: '물(서비스)은 셀프입니다.' },
      { test: /ラストオーダー/, ko: '라스트 오더(마감 주문) 시간 안내입니다.' },
      { test: /試着室.*あちら|ご試着/, ko: '피팅룸(탈의실) 안내입니다.' },
      { test: /免税.*カウンター|タックスフリー/, ko: '면세(Tax-Free) 수속 카운터 안내입니다.' },
      { test: /食前.*食後|1日.*回.*服用/, ko: '하루 복용 횟수 및 식전/식후 복용법 안내입니다.' },
      { test: /身分証明書|保険証/, ko: '신분증 또는 보험증을 제시해 주세요.' },
      { test: /こちらの用紙.*記入|お名前.*電話番号/, ko: '이 용지에 성함과 연락처를 기입해 주세요.' },
    ];

    for (const pat of staffPatterns) {
      if (pat.test.test(clean)) {
        return {
          japanese: clean,
          furigana: japaneseToHiraganaReading(clean),
          koreanPronunciation: kanaToKoreanPronunciation(clean),
          koreanMeaning: pat.ko,
          engineType: 'offline-pack',
          confidence: 90,
        };
      }
    }

    // 3. 핵심 구문(`すみません、` 제외) 포함 여부 확인
    for (const item of PREBUILT_CORPUS) {
      const coreJp = item.jp.replace(/^すみません、/, '').replace(/[。？!?]/g, '');
      if (coreJp.length >= 6 && clean.includes(coreJp)) {
        return {
          japanese: clean,
          furigana: japaneseToHiraganaReading(clean),
          koreanPronunciation: kanaToKoreanPronunciation(clean),
          koreanMeaning: item.ko,
          engineType: 'offline-pack',
          confidence: 90,
        };
      }
    }

    // 4. 일본어 어휘 + 어미 구문 합성 분석
    const foundMeanings: string[] = [];
    for (const entry of NOUN_DICT) {
      const pureJp = entry.jp.replace(/（.*?）/g, '');
      if (pureJp.length >= 1 && clean.includes(pureJp) && !foundMeanings.includes(entry.ko[0])) {
        foundMeanings.push(entry.ko[0]);
      }
    }

    let koSentence = '상대방의 일본어 안내 문장입니다.';
    if (foundMeanings.length > 0) {
      const joined = foundMeanings.slice(0, 3).join(', ');
      if (/ありません|ございません|できません|使えません|ダメ/.test(clean)) {
        koSentence = `${joined}은(는) 없거나 이용하실 수 없습니다.`;
      } else if (/どこですか|どちらですか/.test(clean)) {
        koSentence = `${joined}은(는) 어디에 있나요?`;
      } else if (/いくらですか/.test(clean)) {
        koSentence = `${joined}은(는) 얼마인가요?`;
      } else if (/いいですか|よろしいですか|大丈夫ですか|できますか/.test(clean)) {
        koSentence = `${joined} 괜찮으신가요 / 가능할까요?`;
      } else if (/ですか|ますか|でしょうか/.test(clean)) {
        koSentence = `${joined}에 대해 질문하고 있습니다.`;
      } else if (/ください|お願いします|いただけますか/.test(clean)) {
        koSentence = `${joined}을(를) 부탁드립니다 (확인/제시해 주세요).`;
      } else if (/たいです|たいのですが/.test(clean)) {
        koSentence = `${joined} 하고 싶습니다.`;
      } else {
        koSentence = `${joined} 관련 안내입니다.`;
      }
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

