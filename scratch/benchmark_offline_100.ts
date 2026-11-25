/**
 * [Milestone 5] 오프라인 번역 엔진 100문장 실전 난이도 벤치마크 (자유 변형 80문장 ko->jp + 점원 경어/숫자 20문장 jp->ko)
 * 검증 기준:
 * 1. 일본어 출력물 내 한글(가-힣) 원문 노출 0% (Zero Hangul Leakage)
 * 2. 모든 출력물의 후리가나(한자 미포함) 및 한글 발음 생성률 100%
 * 3. 오탐 함정(식기 교체 vs 새 상품 재고, 품목 면세 부정, 시제/부정/허가/희망 활용, 숫자/시간제/층수 보존) 정확도 검증
 * 4. 문장당 평균 처리 속도 < 5ms (비행기 모드 0.01초 즉시 응답 보장)
 */

import { executeOfflineTranslation } from '../src/utils/offlineEngine';
import {
  installBuiltInTripPack,
  hydrateInstalledTripPacks,
} from '../src/utils/tripLanguagePackStore';

interface KoToJpCase {
  ko: string;
  mustIncludeAny?: string[];
  mustNotInclude?: string[];
}

interface JpToKoCase {
  jp: string;
  mustIncludeAny: string[];
}

const KO_TO_JP_80_CASES: KoToJpCase[] = [
  // [그룹 A: 구문 오탐 함정 & 슬롯 템플릿 정밀 분기 (15문장)]
  {
    ko: '젓가락이 바닥에 떨어졌는데 새 걸로 바꿔주세요.',
    mustIncludeAny: ['お箸', '箸', '新しいもの'],
    mustNotInclude: ['在庫'],
  },
  {
    ko: '포크가 떨어졌어요. 새 걸로 주실 수 있나요?',
    mustIncludeAny: ['フォーク', '新しい'],
    mustNotInclude: ['在庫'],
  },
  {
    ko: '진열된 상품 말고 새 상품 재고 있나요?',
    mustIncludeAny: ['在庫', '新しい'],
  },
  {
    ko: '이 화장품도 면세 안 되나요?',
    mustIncludeAny: ['化粧品', '免税'],
  },
  {
    ko: '아멕스 카드는 결제 안 돼요?',
    mustIncludeAny: ['カード', '使えません', 'できません', '支払'],
  },
  {
    ko: '시부야역까지 전철로 얼마나 걸려요?',
    mustIncludeAny: ['渋谷', 'どのくらい', '何分'],
  },
  {
    ko: '도쿄역까지 택시로 몇 분 정도 걸리나요?',
    mustIncludeAny: ['東京駅', 'タクシー'],
  },
  {
    ko: '라멘에 파랑 마늘은 빼고 주세요.',
    mustIncludeAny: ['抜き', '抜いて', 'なし'],
  },
  {
    ko: '하이볼에 얼음 빼고 주세요.',
    mustIncludeAny: ['氷なし', '氷を抜'],
  },
  {
    ko: '창가 자리로 옮겨도 될까요?',
    mustIncludeAny: ['窓際', '席', 'いいですか', '大丈夫'],
  },
  {
    ko: '생맥주 세 잔이랑 하이볼 두 잔 주세요.',
    mustIncludeAny: ['生ビール', 'ハイボール'],
  },
  {
    ko: '어른 두 명이랑 아이 한 명 자리 있나요?',
    mustIncludeAny: ['大人', '子供', '席'],
  },
  {
    ko: '5층 엘리베이터는 어디에 있나요?',
    mustIncludeAny: ['5階', '五階', 'エレベーター', 'どこ'],
  },
  {
    ko: '이 우산 비닐봉투에 넣어 주실 수 있나요?',
    mustIncludeAny: ['傘', '袋'],
  },
  {
    ko: '영수증을 따로따로 끊어주실 수 있나요?',
    mustIncludeAny: ['領収書', 'レシート', '別々'],
  },

  // [그룹 B: 동사/형용사 교착어 활용 — 과거/부정/희망/허가/금지/가능 (25문장)]
  { ko: '여기서 사진을 찍어도 되나요?', mustIncludeAny: ['写真', '撮ってもいい', '撮っても大丈夫'] },
  { ko: '이 옷 입어봐도 괜찮나요?', mustIncludeAny: ['試着', '着てみても'] },
  { ko: '가게 안에서 담배 피우면 안 되나요?', mustIncludeAny: ['タバコ', '禁煙', '吸っては', 'だめ', 'ダメ'] },
  { ko: '예약하지 않았는데 들어갈 수 있나요?', mustIncludeAny: ['予約', '入れますか', 'できますか'] },
  { ko: '어제 산 상품인데 교환하고 싶어요.', mustIncludeAny: ['昨日', '交換'] },
  { ko: '조용한 자리에 앉고 싶습니다.', mustIncludeAny: ['静か', '席', '座りたい'] },
  { ko: '따뜻한 국물을 마시고 싶어요.', mustIncludeAny: ['温かい', 'スープ', '飲みたい'] },
  { ko: '너무 맵지 않게 만들어 주세요.', mustIncludeAny: ['辛く', 'ないで', '控えめ', 'しないで'] },
  { ko: '덜 짜게 해주실 수 있나요?', mustIncludeAny: ['薄め', '塩', 'しょっぱく'] },
  { ko: '체크인 전에 짐을 맡기고 싶어요.', mustIncludeAny: ['荷物', '預け', '預か'] },
  { ko: '천천히 말씀해 주실 수 있나요?', mustIncludeAny: ['ゆっくり', '話して'] },
  { ko: '한국어로 적힌 안내문이 있나요?', mustIncludeAny: ['韓国語'] },
  { ko: '일본어를 잘 읽지 못해요.', mustIncludeAny: ['日本語', '読めません', '話せません', '苦手'] },
  { ko: '돼지고기는 먹지 못합니다.', mustIncludeAny: ['豚肉', '食べられません'] },
  { ko: '차가운 물 한 잔 부탁드립니다.', mustIncludeAny: ['冷たい', '水'] },
  { ko: '택시를 불러주실 수 있나요?', mustIncludeAny: ['タクシー', '呼んで'] },
  { ko: '창문을 조금 열어도 될까요?', mustIncludeAny: ['窓', '開けても'] },
  { ko: '콘센트를 써도 괜찮을까요?', mustIncludeAny: ['コンセント', '使っても', '充電'] },
  { ko: '조금 더 큰 사이즈를 보여주세요.', mustIncludeAny: ['大きい', 'サイズ'] },
  { ko: '조금 더 싼 상품이 있나요?', mustIncludeAny: ['安い'] },
  { ko: '아직 음식이 나오지 않았어요.', mustIncludeAny: ['まだ', '料理', '来て'] },
  { ko: '방을 금연실로 바꾸고 싶어요.', mustIncludeAny: ['禁煙', '変え', '替え'] },
  { ko: '오늘 저녁 7시에 예약하고 싶습니다.', mustIncludeAny: ['7時', '予約'] },
  { ko: '공항까지 가는 버스를 타고 싶어요.', mustIncludeAny: ['空港', 'バス', '乗りたい'] },
  { ko: '화장실을 먼저 다녀와도 되나요?', mustIncludeAny: ['トイレ', 'お手洗い', '行っても'] },

  // [그룹 C: 다중 절 복합문 & 실전 여행 트러블 (20문장)]
  {
    ko: '카드가 안 되네요, 현금으로 계산할게요.',
    mustIncludeAny: ['カード', '現金'],
  },
  {
    ko: '배가 너무 아파서 그러는데 근처에 약국이 어디 있나요?',
    mustIncludeAny: ['お腹', '薬局', 'どこ'],
  },
  {
    ko: '지갑을 전철에 두고 내렸어요. 도와주세요.',
    mustIncludeAny: ['財布', '電車', '忘れ', 'なくし', '助けて'],
  },
  {
    ko: '휴대폰 배터리가 거의 다 닳아서 충전 좀 할 수 있을까요?',
    mustIncludeAny: ['充電', 'スマホ'],
  },
  {
    ko: '방 열쇠를 방 안에 두고 나와서 문이 잠겼어요.',
    mustIncludeAny: ['キー', '鍵', '部屋'],
  },
  {
    ko: '막차를 놓쳤는데 택시 승강장은 어디에 있나요?',
    mustIncludeAny: ['終電', 'タクシー'],
  },
  {
    ko: '열이 나고 목이 아파요. 감기약 주세요.',
    mustIncludeAny: ['熱', '喉', '風邪薬'],
  },
  {
    ko: '새우 알레르기가 있어서 빼고 조리해 주세요.',
    mustIncludeAny: ['エビ', 'アレルギー'],
  },
  {
    ko: '체크아웃 후에도 오후 4시까지 캐리어를 맡길 수 있나요?',
    mustIncludeAny: ['チェックアウト', '荷物', 'スーツケース', '預'],
  },
  {
    ko: '스이카 잔액이 부족해서 충전하고 싶어요.',
    mustIncludeAny: ['スイカ', 'IC', 'チャージ'],
  },
  {
    ko: '비닐봉투 한 장 주시고 도시락은 데워 주세요.',
    mustIncludeAny: ['袋', '弁当', '温め'],
  },
  {
    ko: '선물할 거라서 예쁘게 포장해 주세요.',
    mustIncludeAny: ['プレゼント', 'ラッピング', '包'],
  },
  {
    ko: '수건 두 장이랑 생수 두 병 더 주실 수 있나요?',
    mustIncludeAny: ['タオル', '水'],
  },
  {
    ko: '예약한 김민수인데 체크인 부탁드립니다.',
    mustIncludeAny: ['チェックイン', '予約'],
  },
  {
    ko: '이 전철이 나리타 공항으로 가나요?',
    mustIncludeAny: ['電車', '空港', '行きますか'],
  },
  {
    ko: '반대 방향 열차를 잘못 탔어요.',
    mustIncludeAny: ['反対', '間違え'],
  },
  {
    ko: '여행자 보험 청구용 진단서와 영수증을 부탁드립니다.',
    mustIncludeAny: ['保険', '領収書', '診断書'],
  },
  {
    ko: '남은 음식을 포장해 갈 수 있나요?',
    mustIncludeAny: ['残った', '持ち帰', 'テイクアウト'],
  },
  {
    ko: '계산은 각자 따로따로 할 수 있나요?',
    mustIncludeAny: ['別々', '会計'],
  },
  {
    ko: '와이파이 비밀번호가 무엇인지 알려주세요.',
    mustIncludeAny: ['Wi-Fi', 'パスワード'],
  },

  // [그룹 D: 미등록 고유명사/외래어 OOV 가타카나 음차 방어 + 테마 확장팩 (20문장)]
  { ko: '돈키호테 메가점은 어디에 있나요?' },
  { ko: '타마고산도 두 개 주세요.' },
  { ko: '시로이코이비토 재고 있나요?' },
  { ko: '규카츠 포장 가능한가요?' },
  { ko: '오모테산도힐즈까지 걸어서 갈 수 있나요?' },
  { ko: '히츠마부시 추천 메뉴는 뭐예요?' },
  { ko: '메론소다 한 잔 부탁드려요.' },
  { ko: '츠타야서점 라운지 이용 되나요?' },
  { ko: '유니버설스튜디오 입장권 얼마예요?' },
  { ko: '이치란라멘 대기 시간 있나요?' },
  { ko: '하카타버스터미널 어디예요?' },
  { ko: '가라아게 추가 부탁해요.' },
  { ko: '말차라떼 차갑게 주세요.' },
  { ko: '명란바게트 아직 남아 있나요?' },
  { ko: '다이마루백화점 면세 카운터 어디예요?' },
  { ko: '초밥 밥(샤리) 양을 조금 적게 해주실 수 있나요?', mustIncludeAny: ['シャリ'] },
  { ko: '일반 휘발유(레귤러)로 가득(만땅) 주유해 주세요.', mustIncludeAny: ['レギュラー', '満タン'] },
  { ko: '가족탕(전세탕)을 오늘 밤에 예약할 수 있나요?', mustIncludeAny: ['貸切風呂'] },
  { ko: '고기 굽기는 미디엄 레어로 부탁드립니다.', mustIncludeAny: ['ミディアムレア'] },
  { ko: '가챠를 돌리려고 하는데 천 엔 지폐를 백 엔 동전으로 바꿀 수 있나요?', mustIncludeAny: ['百円玉', '両替'] },
];

const JP_TO_KO_20_CASES: JpToKoCase[] = [
  {
    jp: 'お席は90分制となっております。',
    mustIncludeAny: ['90분', '시간제', '이용 시간'],
  },
  {
    jp: 'お支払いは現金のみとなっております。',
    mustIncludeAny: ['현금'],
  },
  {
    jp: '当店はワンドリンク制となっております。',
    mustIncludeAny: ['1음료', '음료', '원드링크'],
  },
  {
    jp: '申し訳ございませんが、個別会計はいたしかねます。',
    mustIncludeAny: ['어렵', '불가', '안 됩', '할 수 없'],
  },
  {
    jp: '店内でのフラッシュ撮影はお控えください。',
    mustIncludeAny: ['삼가', '자제', '하지 말아'],
  },
  {
    jp: 'お手洗いは3階の奥にございます。',
    mustIncludeAny: ['3층'],
  },
  {
    jp: '成田空港行きは5番線から発車いたします。',
    mustIncludeAny: ['5번'],
  },
  {
    jp: 'お会計は合計で3,850円になります。',
    mustIncludeAny: ['3,850엔', '3850엔'],
  },
  {
    jp: 'チェックインは15時からとなっております。',
    mustIncludeAny: ['15시'],
  },
  {
    jp: 'ただいま満席のため、20分ほどお待ちいただきます。',
    mustIncludeAny: ['20분', '만석', '대기', '기다'],
  },
  {
    jp: '袋は有料になりますが、ご利用になられますか？',
    mustIncludeAny: ['봉투', '유료', '필요'],
  },
  {
    jp: 'ポイントカードはお持ちですか？',
    mustIncludeAny: ['포인트', '카드'],
  },
  {
    jp: '店内でお召し上がりですか、お持ち帰りですか？',
    mustIncludeAny: ['매장', '드시고', '포장'],
  },
  {
    jp: 'お弁当はお温めいたしますか？',
    mustIncludeAny: ['도시락', '데워', '데우'],
  },
  {
    jp: 'エレベーターで7階までお上がりください。',
    mustIncludeAny: ['7층', '엘리베이터'],
  },
  {
    jp: 'パスポートをご提示いただけますでしょうか？',
    mustIncludeAny: ['여권', '보여', '제시'],
  },
  {
    jp: 'こちらの商品は免税対象外となっております。',
    mustIncludeAny: ['면세', '제외', '안 됩', '불가', '대상 외'],
  },
  {
    jp: 'ラストオーダーは21時30分でございます。',
    mustIncludeAny: ['21시', '30분', '라스트', '마지막'],
  },
  {
    jp: 'お煙草は喫煙室でのみお願いしております。',
    mustIncludeAny: ['흡연'],
  },
  {
    jp: 'タッチ決済でよろしいでしょうか？',
    mustIncludeAny: ['터치', '결제'],
  },
];

async function runBenchmark() {
  console.log('==============================================================');
  console.log('🚀 TabiTalk Offline Engine v5.0 — 100-Sentence Benchmark Start');
  console.log('==============================================================');

  // 내장 4대 테마 확장팩 모두 설치 상태 시뮬레이션
  await hydrateInstalledTripPacks();
  await installBuiltInTripPack('preset-omakase-gourmet');
  await installBuiltInTripPack('preset-family-care');
  await installBuiltInTripPack('preset-onsen-ryokan-drive');
  await installBuiltInTripPack('preset-shopping-otaku-tax');

  let hangulLeakCount = 0;
  let furiganaMissingCount = 0;
  let semanticPassCount = 0;
  const failures: string[] = [];

  const t0 = performance.now();

  // 1. 한국어 -> 일본어 80문장 테스트
  for (let i = 0; i < KO_TO_JP_80_CASES.length; i++) {
    const tc = KO_TO_JP_80_CASES[i];
    const res = executeOfflineTranslation(tc.ko, 'ko-to-jp');

    const hasRawHangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(res.japanese);
    if (hasRawHangul) {
      hangulLeakCount++;
      failures.push(`[KO->JP #${i + 1} 한글 노출] "${tc.ko}" => "${res.japanese}"`);
    }

    if (!res.furigana || !res.koreanPronunciation) {
      furiganaMissingCount++;
      failures.push(`[KO->JP #${i + 1} 발음 누락] "${tc.ko}" => furi="${res.furigana}"`);
    }

    let semanticOk = !hasRawHangul;
    if (tc.mustIncludeAny && tc.mustIncludeAny.length > 0) {
      const hit = tc.mustIncludeAny.some((kw) => res.japanese.includes(kw));
      if (!hit) {
        semanticOk = false;
        failures.push(
          `[KO->JP #${i + 1} 핵심어 미포함] "${tc.ko}" => "${res.japanese}" (기대: ${tc.mustIncludeAny.join(' | ')})`
        );
      }
    }
    if (tc.mustNotInclude && tc.mustNotInclude.length > 0) {
      const badHit = tc.mustNotInclude.find((kw) => res.japanese.includes(kw));
      if (badHit) {
        semanticOk = false;
        failures.push(
          `[KO->JP #${i + 1} 금지어 오탐(${badHit})] "${tc.ko}" => "${res.japanese}"`
        );
      }
    }

    if (semanticOk) semanticPassCount++;
  }

  // 2. 일본어 -> 한국어 20문장 테스트
  for (let i = 0; i < JP_TO_KO_20_CASES.length; i++) {
    const tc = JP_TO_KO_20_CASES[i];
    const res = executeOfflineTranslation(tc.jp, 'jp-to-ko');

    if (!res.furigana || !res.koreanPronunciation) {
      furiganaMissingCount++;
      failures.push(`[JP->KO #${i + 1} 발음 누락] "${tc.jp}"`);
    }

    const hit = tc.mustIncludeAny.some((kw) => res.koreanMeaning.includes(kw));
    if (hit) {
      semanticPassCount++;
    } else {
      failures.push(
        `[JP->KO #${i + 1} 역번역 핵심 누락] "${tc.jp}" => "${res.koreanMeaning}" (기대: ${tc.mustIncludeAny.join(' | ')})`
      );
    }
  }

  const elapsedMs = performance.now() - t0;
  const avgMs = elapsedMs / 100;

  console.log(`총 테스트 문장 수       : 100문장 (KO->JP 80 + JP->KO 20)`);
  console.log(`일본어 내 한글 노출 건수: ${hangulLeakCount}건 (목표: 0건)`);
  console.log(`후리가나/발음 생성 누락 : ${furiganaMissingCount}건 (목표: 0건)`);
  console.log(`의미·핵심어 정확도 통과 : ${semanticPassCount}/100 (${semanticPassCount}%)`);
  console.log(`총 소요 시간 / 문장당   : ${elapsedMs.toFixed(2)}ms / 평균 ${avgMs.toFixed(3)}ms`);

  if (failures.length > 0) {
    console.log('\n⚠️ 점검 필요 항목:');
    for (const f of failures) {
      console.log('  -', f);
    }
  }

  if (hangulLeakCount > 0 || furiganaMissingCount > 0 || semanticPassCount < 95 || avgMs >= 5) {
    process.exit(1);
  }

  console.log('\n✅ 100-Sentence Offline Benchmark PASSED with flying colors!');
}

runBenchmark();
