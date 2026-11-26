/**
 * [Milestone 5] 출국 전 맞춤 여행 언어팩 스토어 (IndexedDB 영구 보관 + Gemini 일정 맞춤 생성)
 * - iOS Safari LocalStorage 5MB 한계를 우회하여 IndexedDB('tabitalk_trip_packs_db')에 대용량 언어팩 보관
 * - 설치 즉시 offlineEngine 코퍼스·어휘·한자 루비 사전 및 0.001초 커스텀 인덱스에 동기화
 */

import { AIConfig } from '../types/conversation';
import { getGeminiModelsToTry, recordWorkingGeminiModel } from './aiService';
import {
  registerDynamicCorpusItems,
  registerDynamicVocabPairs,
  syncTripCustomPackEntries,
  TripCustomPackEntry,
} from './offlineEngine';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
  registerDirectKanjiReadings,
} from './japanesePhonetics';

export interface TripPackSentence {
  ko: string;
  jp: string;
  furigana: string;
  koreanPronunciation: string;
  category: string;
  tip?: string;
}

export interface TripLanguagePack {
  id: string;
  title: string;
  emoji: string;
  description: string;
  isBuiltInPreset: boolean;
  installedAt: string;
  sentences: TripPackSentence[];
  vocabPairs: Array<{ ko: string; jp: string }>;
  kanjiReadings: Array<{ kanji: string; reading: string }>;
}

const DB_NAME = 'tabitalk_trip_packs_db';
const DB_VERSION = 1;
const STORE_NAME = 'packs';

let inMemoryPacks: TripLanguagePack[] = [];
let hydrated = false;

export const BUILTIN_TRIP_EXPANSION_PACKS: Omit<TripLanguagePack, 'installedAt'>[] = [
  {
    id: 'preset-omakase-gourmet',
    title: '오마카세 · 이자카야 · 미식 심화팩',
    emoji: '🍣',
    description: '샤리 양 조절, 오토시 확인, 굽기 정도, 니혼슈 추천 등 미식 여행 필수 12문장',
    isBuiltInPreset: true,
    vocabPairs: [
      { ko: '샤리', jp: 'シャリ' },
      { ko: '오토시', jp: 'お通し' },
      { ko: '자릿세', jp: '席料' },
      { ko: '드라이한 사케', jp: '辛口の日本酒' },
      { ko: '레어', jp: 'レア' },
      { ko: '미디엄레어', jp: 'ミディアムレア' },
      { ko: '숯불', jp: '炭火' },
      { ko: '라스트오더', jp: 'ラストオーダー' },
    ],
    kanjiReadings: [
      { kanji: '辛口', reading: 'からくち' },
      { kanji: '甘口', reading: 'あまくち' },
      { kanji: '席料', reading: 'せきりょう' },
      { kanji: '苦味', reading: 'にがみ' },
    ],
    sentences: [
      {
        ko: '초밥 밥(샤리) 양을 조금 적게 해주실 수 있나요?',
        jp: 'シャリを少し小さめにしていただけますか？',
        furigana: 'しゃりをすこしちいさめにしていただけますか？',
        koreanPronunciation: '샤리오 스코시 치이사메니 시테 이타다케마스카?',
        category: '식당',
        tip: '오마카세에서 배가 일찍 부를 때 가장 자연스러운 요청 표현입니다.',
      },
      {
        ko: '못 먹는 재료는 없고 전부 다 잘 먹습니다.',
        jp: '苦手な食材は特にありません。何でも食べられます。',
        furigana: 'にがてなしょくざいはとくにありません。なんでもたべられます。',
        koreanPronunciation: '니가테나 쇼쿠자이와 토쿠니 아리마센. 난데모 타베라레마스.',
        category: '식당',
        tip: '오마카세 시작 전 셰프가 苦手な食材(못 먹는 식재료)를 물어볼 때 씁니다.',
      },
      {
        ko: '깔끔하고 드라이한 니혼슈(사케)로 한 잔 추천해 주세요.',
        jp: 'すっきりした辛口の日本酒を一杯おすすめしてください。',
        furigana: 'すっきりしたからくちのにほんしゅをいっぱいおすすめしてください。',
        koreanPronunciation: '슷키리시타 카라쿠치노 니혼슈오 잇파이 오스스메시테 쿠다사이.',
        category: '식당',
      },
      {
        ko: '이 자릿세 안주(오토시)는 기본으로 나오는 건가요?',
        jp: 'こちらのお通しは席料として付くものですか？',
        furigana: 'こちらのおとおしはせきりょうとしてつくものですか？',
        koreanPronunciation: '코치라노 오토오시와 세키료오토 시테 츠쿠 모노데스카?',
        category: '식당',
      },
      {
        ko: '고기 굽기는 미디엄 레어로 부탁드립니다.',
        jp: 'お肉の焼き加減はミディアムレアでお願いします。',
        furigana: 'おにくのやきかげんはみでぃあむれあでおねがいします。',
        koreanPronunciation: '오니쿠노 야키카겐와 미디아무레아데 오네가이시마스.',
        category: '식당',
      },
      {
        ko: '꼬치구이는 소금(시오) 반, 양념(타레) 반으로 가능한가요?',
        jp: '焼き鳥は塩とタレ、半分ずつにできますか？',
        furigana: 'やきとりはしおとたれ、はんぶんずつにできますか？',
        koreanPronunciation: '야키토리와 시오토 타레, 한분즈츠니 데키마스카?',
        category: '식당',
      },
      {
        ko: '면 삶기는 약간 꼬들꼬들하게(카타메) 해주세요.',
        jp: '麺の硬さは「かため」でお願いします。',
        furigana: 'めんのかたさは「かため」でおねがいします。',
        koreanPronunciation: '멘노 카타사와 카타메데 오네가이시마스.',
        category: '식당',
      },
      {
        ko: '라멘 국물 염도를 조금 연하게(우스메) 해주실 수 있나요?',
        jp: 'スープの味を少し薄めにしてもらえますか？',
        furigana: 'すーぷのあじをすこしうすめにしてもらえますか？',
        koreanPronunciation: '스으푸노 아지오 스코시 우스메니 시테 모라에마스카?',
        category: '식당',
      },
      {
        ko: '지금 주문한 메뉴가 마지막 주문(라스트 오더)인가요?',
        jp: '今頼んだものでラストオーダーになりますか？',
        furigana: 'いまたのんだものでらすとーだーになりますか？',
        koreanPronunciation: '이마 타논다 모노데 라스토오오다아니 나리마스카?',
        category: '식당',
      },
      {
        ko: '오늘 요리가 정말 최고였어요. 잘 먹었습니다!',
        jp: '今日のお料理、本当に最高でした。ごちそうさまでした！',
        furigana: 'きょうのおりょうり、ほんとうにさいこうでした。ごちそうさまでした！',
        koreanPronunciation: '쿄오노 오료오리, 혼토오니 사이코오데시타. 고치소오사마데시타!',
        category: '식당',
      },
      {
        ko: '영어 메뉴판이 없으면 사진이 있는 메뉴판이 있나요?',
        jp: '写真付きのメニューはありますか？',
        furigana: 'しゃしんつきのめにゅーはありますか？',
        koreanPronunciation: '샤신츠키노 메뉴으와 아리마스카?',
        category: '식당',
      },
      {
        ko: '술을 못 마셔서 우롱차나 진저에일로 부탁드려요.',
        jp: 'お酒が飲めないので、ウーロン茶かジンジャーエールをお願いします。',
        furigana: 'おさけがのめないので、うーろんちゃかじんじゃーえーるをおねがいします。',
        koreanPronunciation: '오사케가 노메나이노데, 우으론차카 진자아에으루오 오네가이시마스.',
        category: '식당',
      },
    ],
  },
  {
    id: 'preset-family-care',
    title: '아이 동반 · 부모님 효도 여행 배려팩',
    emoji: '👨‍👩‍👧',
    description: '유모차 보관, 어린이 식기, 저염 조리, 엘리베이터·택시 배려 요청 10문장',
    isBuiltInPreset: true,
    vocabPairs: [
      { ko: '유모차', jp: 'ベビーカー' },
      { ko: '어린이 의자', jp: '子供用の椅子' },
      { ko: '어린이 식기', jp: '子供用の食器' },
      { ko: '수유실', jp: '授乳室' },
      { ko: '기저귀 교환대', jp: 'おむつ替え台' },
      { ko: '시럽 해열제', jp: 'シロップの解熱剤' },
    ],
    kanjiReadings: [
      { kanji: '授乳室', reading: 'じゅにゅうしつ' },
      { kanji: '子供用', reading: 'こどもよう' },
      { kanji: '食器', reading: 'しょっき' },
    ],
    sentences: [
      {
        ko: '유모차를 접어서 입구 쪽에 맡겨도 될까요?',
        jp: 'ベビーカーを畳んで入口に置かせてもらえますか？',
        furigana: 'べびーかーをたたんでいりぐちにおかせてもらえますか？',
        koreanPronunciation: '베비이카아오 타탄데 이리구치니 오카세테 모라에마스카?',
        category: '식당',
      },
      {
        ko: '아이가 먹을 거라서 후추나 매운 양념은 빼주실 수 있나요?',
        jp: '子供が食べるので、コショウや辛い調味料は抜いてもらえますか？',
        furigana: 'こどもがたべるので、こしょうやからいちょうみりょうはぬいてもらえますか？',
        koreanPronunciation: '코도모가 타베루노데, 코쇼오야 카라이 초오미료오와 누이테 모라에마스카?',
        category: '식당',
      },
      {
        ko: '어린이 의자랑 포크, 작은 앞접시 하나 부탁드립니다.',
        jp: '子供用の椅子とフォーク、取り皿を一つお願いします。',
        furigana: 'こどもようのいすとふぉーく、とりざらをひとつおねがいします。',
        koreanPronunciation: '코도모요오노 이스토 포오쿠, 토리자라오 히토츠 오네가이시마스.',
        category: '식당',
      },
      {
        ko: '계단 대신 엘리베이터로 갈 수 있는 길이 어디인가요?',
        jp: '階段ではなく、エレベーターで行ける道はどこですか？',
        furigana: 'かいだんではなく、えれべーたーでいけるみちはどこですか？',
        koreanPronunciation: '카이단데와 나쿠, 에레베에타아데 이케루 미치와 도코데스카?',
        category: '교통',
      },
      {
        ko: '근처에 수유실이나 기저귀 갈 수 있는 곳이 있나요?',
        jp: '近くに授乳室やおむつ替えができる場所はありますか？',
        furigana: 'ちかくにじゅにゅうしつやおむつがえができるばしょはありますか？',
        koreanPronunciation: '치카쿠니 주뉴으시츠야 오무츠가에가 데키루 바쇼와 아리마스카?',
        category: '쇼핑',
      },
      {
        ko: '부모님 무릎이 안 좋으셔서 테이블석으로 안내해 주실 수 있나요?',
        jp: '親の膝が悪いので、テーブル席に案内していただけますか？',
        furigana: 'おやのひざがわるいので、てーぶるせきにあんないしていただけますか？',
        koreanPronunciation: '오야노 히자가 와루이노데, 테에부루세키니 안나이시테 이타다케마스카?',
        category: '식당',
      },
      {
        ko: '분유를 타야 해서 그러는데 뜨거운 물을 조금 얻을 수 있을까요?',
        jp: 'ミルクを作りたいので、お湯を少しいただけますか？',
        furigana: 'みるくをつくりたいので、おゆをすこしいただけますか？',
        koreanPronunciation: '미루쿠오 츠쿠리타이노데, 오유오 스코시 이타다케마스카?',
        category: '식당',
      },
      {
        ko: '만 5세 아이가 먹을 수 있는 시럽 감기약이나 해열제 있나요?',
        jp: '5歳の子供が飲めるシロップの風邪薬や解熱剤はありますか？',
        furigana: 'ごさいのこどもがのめるしろっぷのかぜぐすりやげねつざいはありますか？',
        koreanPronunciation: '고사이노 코도모가 노메루 시롯푸노 카제구스리야 게네츠자이와 아리마스카?',
        category: '병원',
      },
      {
        ko: '부모님과 함께 타야 해서 천천히 출발해 주시면 감사하겠습니다.',
        jp: '親と一緒なので、ゆっくり出発していただけると助かります。',
        furigana: 'おやといっしょなので、ゆっくりしゅっぱつしていただけるとたすかります。',
        koreanPronunciation: '오야토 잇쇼나노데, 윳쿠리 슛파츠시테 이타다케루토 타스카리마스.',
        category: '교통',
      },
      {
        ko: '방 두 개를 서로 가까운 옆방이나 같은 층으로 배정해 주실 수 있나요?',
        jp: '二部屋をなるべく近い隣同士か同じ階にしていただけますか？',
        furigana: 'ふたへやをなるべくちかいとなりどうしかおなじかいにしていただけますか？',
        koreanPronunciation: '후타헤야오 나루베쿠 치카이 토나리도오시카 오나지 카이니 시테 이타다케마스카?',
        category: '호텔',
      },
    ],
  },
  {
    id: 'preset-onsen-ryokan-drive',
    title: '료칸 · 온천 · 소도시 렌터카 투어팩',
    emoji: '♨️',
    description: '가이세키 시간, 전세탕 예약, 입욕세, 렌터카 풀커버 보험·주유소·맵코드 10문장',
    isBuiltInPreset: true,
    vocabPairs: [
      { ko: '전세탕', jp: '貸切風呂' },
      { ko: '노천탕', jp: '露天風呂' },
      { ko: '입욕세', jp: '入湯税' },
      { ko: '유카타', jp: '浴衣' },
      { ko: '레귤러 휘발유', jp: 'レギュラー' },
      { ko: '풀커버 보험', jp: 'フルカバー保険' },
    ],
    kanjiReadings: [
      { kanji: '貸切風呂', reading: 'かしきりぶろ' },
      { kanji: '露天風呂', reading: 'ろてんぶろ' },
      { kanji: '入湯税', reading: 'にゅうとうぜい' },
      { kanji: '満タン', reading: 'まんたん' },
    ],
    sentences: [
      {
        ko: '저녁 가이세키 식사는 6시 반으로 부탁드립니다.',
        jp: '夕食の懐石料理は6時半でお願いします。',
        furigana: 'ゆうしょくのかいせきりょうりはろくじはんでおねがいします。',
        koreanPronunciation: '유으쇼쿠노 카이세키료오리와 로쿠지한데 오네가이시마스.',
        category: '호텔',
      },
      {
        ko: '가족탕(전세탕)을 오늘 밤에 예약할 수 있나요?',
        jp: '貸切風呂を今日の夜に予約できますか？',
        furigana: 'かしきりぶろをきょうのよるにようやくできますか？',
        koreanPronunciation: '카시키리부로오 쿄오노 요루니 요야쿠 데키마스카?',
        category: '호텔',
      },
      {
        ko: '작은 타투가 있는데 커버 스티커를 붙이면 대욕장 이용이 가능한가요?',
        jp: '小さいタトゥーがあるのですが、カバーシールを貼れば大浴場に入れますか？',
        furigana: 'ちいさいたとぅーがあるのですが、かばーしーるをはればだいよくじょうにはいれますか？',
        koreanPronunciation: '치이사이 타투으가 아루노데스가, 카바아시이루오 하레바 다이요쿠조오니 하이레마스카?',
        category: '호텔',
      },
      {
        ko: '체크아웃할 때 내는 입욕세는 현금만 가능한가요?',
        jp: '入湯税のお支払いは現金のみですか？',
        furigana: 'にゅうとうぜいのおしはらいはげんきんのみですか？',
        koreanPronunciation: '뉴으토오제이노 오시하라이와 겐킨노미데스카?',
        category: '호텔',
      },
      {
        ko: '송영 버스(셔틀버스)를 역 앞으로 불러주실 수 있나요?',
        jp: '送迎バスを駅まで迎えに来てもらえますか？',
        furigana: 'そうげいばすをえきまでむかえにきてもらえますか？',
        koreanPronunciation: '소오게이바스오 에키마데 무카에니 키테 모라에마스카?',
        category: '교통',
      },
      {
        ko: '렌터카 완전 면책(NOC 풀커버) 보험도 같이 추가해 주세요.',
        jp: 'レンタカーのフルカバー保険（NOC補償）も追加してください。',
        furigana: 'れんたかーのふるかばーほけん（えぬおーしーほしょう）もついかしてください。',
        koreanPronunciation: '렌타카아노 후루카바아호켄모 츠이카시테 쿠다사이.',
        category: '교통',
      },
      {
        ko: '고속도로 ETC 카드도 대여할 수 있나요?',
        jp: '高速道路のETCカードもレンタルできますか？',
        furigana: 'こうそくどうろのいーてぃーしーかーどもれんたるできますか？',
        koreanPronunciation: '코오소쿠도오로노 이이티이시이 카아도모 렌타루 데키마스카?',
        category: '교통',
      },
      {
        ko: '일반 휘발유(레귤러)로 가득(만땅) 주유해 주세요.',
        jp: 'レギュラー満タンでお願いします。',
        furigana: 'れぎゅらーまんたんでおねがいします。',
        koreanPronunciation: '레규라아 만탄데 오네가이시마스.',
        category: '교통',
      },
      {
        ko: '내비게이션 언어를 한국어나 영어로 바꿔주실 수 있나요?',
        jp: 'カーナビの言語を韓国語か英語に変えてもらえますか？',
        furigana: 'かーなびのげんごをかんこくごかえいごにかえてもらえますか？',
        koreanPronunciation: '카아나비노 겐고오 칸코쿠고카 에이고니 카에테 모라에마스카?',
        category: '교통',
      },
      {
        ko: '근처에 무료 주차장이나 코인 주차장이 어디에 있나요?',
        jp: '近くに無料駐車場かコインパーキングはありますか？',
        furigana: 'ちかくにむりょうちゅうしゃじょうかこいんぱーきんぐはありますか？',
        koreanPronunciation: '치카쿠니 무료오츄으샤조오카 코인파아킹구와 아리마스카?',
        category: '교통',
      },
    ],
  },
  {
    id: 'preset-shopping-otaku-tax',
    title: '백화점 · 굿즈 · 드럭스토어 · 면세 쇼핑팩',
    emoji: '🛍️',
    description: '게스트카드 5% 할인, 가챠 동전 교환, 한정판 재고 확인, 110V 전압 확인 10문장',
    isBuiltInPreset: true,
    vocabPairs: [
      { ko: '게스트카드', jp: 'ゲストカード' },
      { ko: '백엔 동전', jp: '百円玉' },
      { ko: '구매 제한', jp: '購入制限' },
      { ko: '한정판', jp: '限定品' },
      { ko: '프리볼트', jp: '海外対応（100-240V）' },
      { ko: '면세 카운터', jp: '免税カウンター' },
    ],
    kanjiReadings: [
      { kanji: '百円玉', reading: 'ひゃくえんだま' },
      { kanji: '限定品', reading: 'げんていひん' },
      { kanji: '購入制限', reading: 'こうにゅうせいげん' },
    ],
    sentences: [
      {
        ko: '외국인 여행객용 5% 할인 게스트카드는 어디서 발급받나요?',
        jp: '外国人旅行者向けの5%割引ゲストカードはどこで作れますか？',
        furigana: 'がいこくじんりょこうしゃむけのごぱーせんとわりびきげすとかーどはどこでつくれますか？',
        koreanPronunciation: '가이코쿠진 료코오샤무케노 고파아센토 와리비키 게스토카아도와 도코데 츠쿠레마스카?',
        category: '쇼핑',
      },
      {
        ko: '가챠를 돌리려고 하는데 천 엔 지폐를 백 엔 동전으로 바꿀 수 있나요?',
        jp: 'ガチャを回したいので、千円札を百円玉に両替できますか？',
        furigana: 'がちゃをまわしたいので、せんえんさつをひゃくえんだまにりょうがえできますか？',
        koreanPronunciation: '가챠오 마와시타이노데, 센엔사츠오 햐쿠엔다마니 료오가에 데키마스카?',
        category: '쇼핑',
      },
      {
        ko: '이 굿즈는 1인당 몇 개까지 구매할 수 있나요?',
        jp: 'このグッズはお一人様何点まで購入できますか？',
        furigana: 'このぐっずはおひとりさまなんてんまでこうにゅうできますか？',
        koreanPronunciation: '코노 굿즈와 오히토리사마 난텐마데 코오뉴으 데키마스카?',
        category: '쇼핑',
      },
      {
        ko: '면세 수속 카운터는 몇 층에 있고 몇 시에 마감하나요?',
        jp: '免税カウンターは何階にあり、何時に閉まりますか？',
        furigana: 'めんぜいかうんたーはなんがいにあり、なんじにしまりますか？',
        koreanPronunciation: '멘제이카운타아와 난가이니 아리, 난지니 시마리마스카?',
        category: '쇼핑',
      },
      {
        ko: '소모품이랑 일반 물품을 합산해서 5,500엔이 넘으면 면세가 되나요?',
        jp: '消耗品と一般物品を合算して5,500円以上になれば免税になりますか？',
        furigana: 'しょうもうひんといっぱんぶっぴんをがっさんしてごせんごひゃくえんいじょうになればめんぜいになりますか？',
        koreanPronunciation: '쇼오모오힌토 잇판붓핀오 갓산시테 고센고햐쿠엔 이조오니 나레바 멘제이니 나리마스카?',
        category: '쇼핑',
      },
      {
        ko: '이 전자제품은 해외 겸용 프리볼트(100~240V) 제품인가요?',
        jp: 'この電化製品は海外対応（100V〜240V）ですか？',
        furigana: 'このでんかせいひんはかいがいたいおう（ひゃくぼるとからにひゃくよんじゅうぼると）ですか？',
        koreanPronunciation: '코노 덴카세이힌와 카이가이타이오오 데스카?',
        category: '쇼핑',
      },
      {
        ko: '깨지기 쉬운 유리 제품이라 뽁뽁이(완충재)로 꼼꼼히 감싸주실 수 있나요?',
        jp: '割れ物なので、緩衝材（プチプチ）でしっかり包んでもらえますか？',
        furigana: 'われものなので、かんしょうざい（ぷちぷち）でしっかりつつんでもらえますか？',
        koreanPronunciation: '와레모노나노데, 칸쇼오자이데 싯카리 츠츤데 모라에마스카?',
        category: '쇼핑',
      },
      {
        ko: '진열대에는 품절로 되어 있는데 창고에 남은 재고가 하나도 없나요?',
        jp: '棚にはないのですが、奥に在庫は残っていませんか？',
        furigana: 'たなにはないのですが、おくにざいこはのこっていませんか？',
        koreanPronunciation: '타나니와 나이노데스가, 오쿠니 자이코와 노콧테 이마센카?',
        category: '쇼핑',
      },
      {
        ko: '면세 수수료가 몇 퍼센트 차감되는지 알려주실 수 있나요?',
        jp: '免税の手数料は何パーセント引かれますか？',
        furigana: 'めんぜいのてすうりょうはなんぱーせんとひかれますか？',
        koreanPronunciation: '멘제이노 테스으료오와 난파아센토 히카레마스카?',
        category: '쇼핑',
      },
      {
        ko: '선물용 쇼핑백을 2장만 여분으로 더 주실 수 있나요?',
        jp: 'プレゼント用の紙袋を二枚余分にいただけますか？',
        furigana: 'ぷれぜんとようのかみぶくろをにまいよぶんにいただけますか？',
        koreanPronunciation: '푸레젠토요오노 카미부쿠로오 니마이 요분니 이타다케마스카?',
        category: '쇼핑',
      },
    ],
  },
];

function openPacksDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function applyPacksToRuntimeEngines(packs: TripLanguagePack[]): void {
  const customEntries: TripCustomPackEntry[] = [];

  for (const pack of packs) {
    if (pack.kanjiReadings?.length) {
      registerDirectKanjiReadings(pack.kanjiReadings);
    }
    if (pack.vocabPairs?.length) {
      registerDynamicVocabPairs(pack.vocabPairs);
    }
    if (pack.sentences?.length) {
      registerDynamicCorpusItems(
        pack.sentences.map((s) => ({
          ko: s.ko,
          jp: s.jp,
          category: s.category || '일상',
          koKeywords: s.ko
            .replace(/[?？.!~,]/g, '')
            .split(/\s+/)
            .filter((w) => w.length >= 2)
            .slice(0, 4),
        }))
      );
      for (const s of pack.sentences) {
        customEntries.push({
          ko: s.ko,
          jp: s.jp,
          furigana: s.furigana || japaneseToHiraganaReading(s.jp),
          koreanPronunciation: s.koreanPronunciation || kanaToKoreanPronunciation(s.jp),
          tip: s.tip,
          packTitle: pack.title,
        });
      }
    }
  }

  syncTripCustomPackEntries(customEntries);
}

export async function hydrateInstalledTripPacks(): Promise<TripLanguagePack[]> {
  const db = await openPacksDb();
  if (!db) {
    hydrated = true;
    applyPacksToRuntimeEngines(inMemoryPacks);
    return [...inMemoryPacks];
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as TripLanguagePack[]) : [];
        inMemoryPacks = rows.sort((a, b) => b.installedAt.localeCompare(a.installedAt));
        hydrated = true;
        applyPacksToRuntimeEngines(inMemoryPacks);
        resolve([...inMemoryPacks]);
      };
      req.onerror = () => {
        hydrated = true;
        resolve([...inMemoryPacks]);
      };
    } catch {
      hydrated = true;
      resolve([...inMemoryPacks]);
    }
  });
}

export function getInstalledTripPacksSync(): TripLanguagePack[] {
  return [...inMemoryPacks];
}

export function isTripPackHydrated(): boolean {
  return hydrated;
}

export async function saveTripLanguagePack(pack: TripLanguagePack): Promise<TripLanguagePack[]> {
  const existingIdx = inMemoryPacks.findIndex((p) => p.id === pack.id);
  if (existingIdx >= 0) {
    inMemoryPacks[existingIdx] = pack;
  } else {
    inMemoryPacks = [pack, ...inMemoryPacks];
  }

  const db = await openPacksDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(pack);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  applyPacksToRuntimeEngines(inMemoryPacks);
  return [...inMemoryPacks];
}

export async function removeTripLanguagePack(packId: string): Promise<TripLanguagePack[]> {
  inMemoryPacks = inMemoryPacks.filter((p) => p.id !== packId);

  const db = await openPacksDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(packId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  applyPacksToRuntimeEngines(inMemoryPacks);
  return [...inMemoryPacks];
}

export async function installBuiltInTripPack(presetId: string): Promise<TripLanguagePack[]> {
  const preset = BUILTIN_TRIP_EXPANSION_PACKS.find((p) => p.id === presetId);
  if (!preset) return [...inMemoryPacks];

  const fullPack: TripLanguagePack = {
    ...preset,
    installedAt: new Date().toISOString(),
  };
  return saveTripLanguagePack(fullPack);
}

/**
 * 사용자의 여행 일정·알레르기·특별 요청사항을 바탕으로 Gemini/OpenAI가 맞춤 오프라인 언어팩을 생성합니다.
 * API 키가 없거나 오프라인일 때도 키워드 매칭 기반 스마트 팩을 즉시 조합하여 생성합니다.
 */
export async function generateCustomTripPackWithAI(
  itineraryPrompt: string,
  aiConfig?: AIConfig
): Promise<TripLanguagePack> {
  const cleanPrompt = itineraryPrompt.trim();
  const key = aiConfig?.apiKey?.trim() || '';
  const isGemini = key && (aiConfig?.provider === 'gemini' || key.startsWith('AIza'));
  const isOpenAI = key && (aiConfig?.provider === 'openai' || key.startsWith('sk-'));

  const systemInstruction = `당신은 일본 여행 회화 오프라인 언어팩 설계 전문가입니다.
사용자의 여행 일정·동행자·알레르기·방문 예정지에 꼭 맞춰서, 비행기 모드(오프라인) 현장에서 가장 요긴하게 쓸 핵심 한↔일 회화 14문장과 핵심 명사 어휘 12개, 한자 읽기 사전을 생성하세요.
사용자가 직접 점원에게 말할 문장 10개 + 현지 점원이 대답할 가능성이 높은 핵심 일본어 문장 4개(한국어 뜻 포함)를 섞어서 구성하세요.

반드시 아래 순수 JSON 형식으로만 응답하세요:
{
  "title": "맞춤 언어팩 제목 (예: 후쿠오카·유후인 3박4일 미식&온천팩)",
  "emoji": "🎒",
  "description": "팩 요약 설명 1문장",
  "sentences": [
    {
      "ko": "자연스러운 한국어 문장",
      "jp": "현지 원어민 일본어 문장",
      "furigana": "문장 전체 히라가나 읽기 (한자 포함 금지)",
      "koreanPronunciation": "1:1 한글 발음",
      "category": "식당",
      "tip": "현지 활용 팁 (선택)"
    }
  ],
  "vocabPairs": [
    { "ko": "한국어단어", "jp": "일본어단어" }
  ],
  "kanjiReadings": [
    { "kanji": "한자단어", "reading": "히라가나읽기" }
  ]
}`;

  if (isGemini && navigator.onLine) {
    const models = getGeminiModelsToTry(aiConfig?.model);
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          key
        )}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              {
                role: 'user',
                parts: [{ text: `내 여행 계획 및 특이사항: "${cleanPrompt}"` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        });
        if (res.ok) {
          recordWorkingGeminiModel(model);
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsed?.sentences) && parsed.sentences.length > 0) {
            const pack: TripLanguagePack = {
              id: `custom-${Date.now()}`,
              title: parsed.title || `${cleanPrompt.slice(0, 16)} 맞춤팩`,
              emoji: parsed.emoji || '🎒',
              description: parsed.description || cleanPrompt,
              isBuiltInPreset: false,
              installedAt: new Date().toISOString(),
              sentences: parsed.sentences.map((s: TripPackSentence) => ({
                ko: s.ko,
                jp: s.jp,
                furigana: s.furigana || japaneseToHiraganaReading(s.jp),
                koreanPronunciation: s.koreanPronunciation || kanaToKoreanPronunciation(s.jp),
                category: s.category || '일상',
                tip: s.tip,
              })),
              vocabPairs: Array.isArray(parsed.vocabPairs) ? parsed.vocabPairs : [],
              kanjiReadings: Array.isArray(parsed.kanjiReadings) ? parsed.kanjiReadings : [],
            };
            await saveTripLanguagePack(pack);
            return pack;
          }
        }
      } catch {
        // try next model
      }
    }
  }

  if (isOpenAI && navigator.onLine) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: aiConfig?.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `내 여행 계획 및 특이사항: "${cleanPrompt}"` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
        if (Array.isArray(parsed?.sentences) && parsed.sentences.length > 0) {
          const pack: TripLanguagePack = {
            id: `custom-${Date.now()}`,
            title: parsed.title || `${cleanPrompt.slice(0, 16)} 맞춤팩`,
            emoji: parsed.emoji || '🎒',
            description: parsed.description || cleanPrompt,
            isBuiltInPreset: false,
            installedAt: new Date().toISOString(),
            sentences: parsed.sentences.map((s: TripPackSentence) => ({
              ko: s.ko,
              jp: s.jp,
              furigana: s.furigana || japaneseToHiraganaReading(s.jp),
              koreanPronunciation: s.koreanPronunciation || kanaToKoreanPronunciation(s.jp),
              category: s.category || '일상',
              tip: s.tip,
            })),
            vocabPairs: Array.isArray(parsed.vocabPairs) ? parsed.vocabPairs : [],
            kanjiReadings: Array.isArray(parsed.kanjiReadings) ? parsed.kanjiReadings : [],
          };
          await saveTripLanguagePack(pack);
          return pack;
        }
      }
    } catch {
      // fallback below
    }
  }

  // 오프라인 또는 API 키 미설정 시: 입력 키워드를 분석해 4대 확장팩에서 가장 잘 맞는 핵심 표현을 큐레이션 합성!
  const matchedSentences: TripPackSentence[] = [];
  const matchedVocab: Array<{ ko: string; jp: string }> = [];
  const matchedKanji: Array<{ kanji: string; reading: string }> = [];

  const wantOnsen = /(온천|료칸|유후인|하코네|노보리베츠|렌터카|운전|주유)/.test(cleanPrompt);
  const wantFamily = /(아이|아기|부모님|효도|가족|유모차|임산부)/.test(cleanPrompt);
  const wantShop = /(쇼핑|면세|돈키호테|백화점|굿즈|위스키|드럭스토어|가챠)/.test(cleanPrompt);

  const candidatePresets = [
    ...(wantOnsen ? [BUILTIN_TRIP_EXPANSION_PACKS[2]] : []),
    ...(wantFamily ? [BUILTIN_TRIP_EXPANSION_PACKS[1]] : []),
    ...(wantShop ? [BUILTIN_TRIP_EXPANSION_PACKS[3]] : []),
    BUILTIN_TRIP_EXPANSION_PACKS[0],
  ];

  for (const preset of candidatePresets) {
    for (const s of preset.sentences.slice(0, 5)) {
      if (!matchedSentences.some((x) => x.ko === s.ko)) {
        matchedSentences.push(s);
      }
    }
    matchedVocab.push(...preset.vocabPairs.slice(0, 4));
    matchedKanji.push(...preset.kanjiReadings);
  }

  if (cleanPrompt.includes('고수')) {
    matchedSentences.unshift({
      ko: '고수를 못 먹어서 그러는데 고수는 꼭 빼주세요.',
      jp: 'パクチーが食べられないので、必ず抜いてください。',
      furigana: 'ぱくちーがたべられないので、かならずぬいてください。',
      koreanPronunciation: '파쿠치이가 타베라레나이노데, 카나라즈 누이테 쿠다사이.',
      category: '알레르기',
    });
  }
  if (/(갑각류|새우|게)/.test(cleanPrompt)) {
    matchedSentences.unshift({
      ko: '갑각류(새우·게) 알레르기가 심해서 육수에도 들어가면 안 됩니다.',
      jp: '甲殻類（エビ・カニ）のアレルギーがあるため、出汁に入っているものも食べられません。',
      furigana: 'こうかくるい（えび・かに）のあれるぎーがあるため、だしにはいっているものもたべられません。',
      koreanPronunciation: '코오카쿠루이노 아레루기이가 아루타메, 다시니 하잇테 이루 모노모 타베라레마센.',
      category: '알레르기',
    });
  }

  const fallbackPack: TripLanguagePack = {
    id: `custom-${Date.now()}`,
    title: `${cleanPrompt.slice(0, 14) || '일본 여행'} 맞춤 큐레이션팩`,
    emoji: '🎒',
    description: cleanPrompt || '맞춤 여행 핵심 표현 모음',
    isBuiltInPreset: false,
    installedAt: new Date().toISOString(),
    sentences: matchedSentences.slice(0, 14),
    vocabPairs: matchedVocab,
    kanjiReadings: matchedKanji,
  };

  await saveTripLanguagePack(fallbackPack);
  return fallbackPack;
}

