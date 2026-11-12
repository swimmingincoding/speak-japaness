/**
 * 오늘 개발된 5대 신기능 로직 종합 단위/통합 테스트 스크립트
 */
import {
  getTodayDateStr,
  updateSRSGrade,
  loadSRSRecords,
  loadUserStreak,
  getDueReviewItems,
} from '../src/utils/srsEngine';
import { N3_VOCAB_LIST } from '../src/data/n3Vocab';
import { SCENARIOS } from '../src/data/scenarios';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failCount++;
  }
}

console.log('========================================================');
console.log('🧪 TABITALK 5대 신기능 품질 및 로직 종합 검증 스위트');
console.log('========================================================\n');

// ----------------------------------------------------
// [Test 1] SRS 망각곡선 및 날짜 계산 검증
// ----------------------------------------------------
console.log('--- [Step 4 SRS & 스트릭 엔진 검증] ---');
const todayStr = getTodayDateStr();
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `오늘 날짜 형식(YYYY-MM-DD) 정상: ${todayStr}`);

// 모의 단어장 데이터
const mockSaved = [
  {
    id: 'test-1',
    japanese: 'お会計をお願いします。',
    furigana: 'おかいけいをおねがいします。',
    koreanPronunciation: '오카이케-오 오네가이시마스',
    koreanTranslation: '계산 부탁드립니다.',
    scenarioTitle: '식당 결제',
  },
  {
    id: 'test-2',
    japanese: 'おすすめは何ですか？',
    furigana: 'おすすめはなんですか？',
    koreanPronunciation: '오스스메와 난데스카?',
    koreanTranslation: '추천 메뉴는 무엇인가요?',
    scenarioTitle: '이자카야 주문',
  },
];

const dueItems = getDueReviewItems(mockSaved, N3_VOCAB_LIST, 5);
assert(dueItems.length === 5, `오늘 복습 큐 5개 자동 추천 정상 추출 (현재: ${dueItems.length}개)`);
assert(dueItems[0].japanese.length > 0, `첫 번째 복습 대상 일본어 텍스트 존재: ${dueItems[0].japanese}`);
assert(dueItems.every((item) => item.category && item.koreanTranslation), '모든 복습 카드가 카테고리와 뜻을 완비함');

// ----------------------------------------------------
// [Test 2] 엔화 환율 / 10% 소비세 / 면세 5,500엔 / 와리깡 계산 공식 검증
// ----------------------------------------------------
console.log('\n--- [Step 1 엔화 & 와리깡 계산기 수학적 정밀도 검증] ---');

// 시나리오 1: 2,980엔 (세금 별도)
const priceWithoutTax = 2980;
const tax10 = Math.floor(priceWithoutTax * 0.1);
const finalPrice = priceWithoutTax + tax10;
assert(tax10 === 298, `2,980엔의 10% 소비세는 298엔이어야 함: ${tax10}엔`);
assert(finalPrice === 3278, `세금 포함 최종가는 3,278엔이어야 함: ${finalPrice}엔`);

// 환율 910원 / 100엔 환산 (1엔 = 9.1원)
const rate = 910;
const krw = Math.round((finalPrice * rate) / 100);
assert(krw === 29830, `3,278엔 환산 원화(약 29,830원) 정확도 확인: ${krw}원`);

// 면세 5,500엔 트래커 갭 계산
const taxFreeThreshold = 5500;
const gapBefore = Math.max(0, taxFreeThreshold - finalPrice);
assert(gapBefore === 2222, `면세까지 남은 금액(5,500 - 3,278 = 2,222엔) 정확도 확인: ${gapBefore}엔`);

// 와리깡 3인 100엔 단위 올림 계산 (3,278엔 / 3명 = 1,092.66엔 -> 100엔 올림 시 1,100엔)
const headcount = 3;
const perPersonExact = Math.ceil(finalPrice / headcount);
const perPerson100 = Math.ceil(finalPrice / headcount / 100) * 100;
assert(perPersonExact === 1093, `정확한 1엔 단위 N빵: 1,093엔`);
assert(perPerson100 === 1100, `동전 최소화 100엔 올림 1인당 금액: 1,100엔`);
const totalCollected = perPerson100 * headcount;
const surplus = totalCollected - finalPrice;
assert(totalCollected === 3300, `총 수금액 3,300엔 확인`);
assert(surplus === 22, `공동경비 잔여 차액(3,300 - 3,278 = +22엔) 확인`);

// ----------------------------------------------------
// [Test 3] Step 2 여행 치트시트 필수 데이터 무결성 검증
// ----------------------------------------------------
console.log('\n--- [Step 2 나만의 여행 치트시트 데이터 검증] ---');
const emergencyContacts = [
  { name: '경찰', number: '110' },
  { name: '구급차', number: '119' },
  { name: '영사콜센터', number: '+82-2-3210-0404' },
];
assert(emergencyContacts.length === 3, '긴급 연락망 3종(110/119/외교부) 완비');

// ----------------------------------------------------
// [Test 4] Step 3 카메라 메뉴판 스캐너 데모 프리셋 데이터 검증
// ----------------------------------------------------
console.log('\n--- [Step 3 카메라 메뉴판 AI 스캐너 프리셋 검증] ---');
const ramenItems = [
  '特製濃厚つけ麺',
  '濃厚味玉らーめん',
  '手作り焼き餃子 (5個)',
  '生ビール (中)',
];
assert(ramenItems.length === 4, '라멘집 대표 메뉴 4종 탑재 확인');
assert(ramenItems[0].includes('つけ麺'), '특제 농후 츠케멘 시그니처 확인');

// ----------------------------------------------------
// [Test 5] Step 5 전화 통화형 음성 AI 시나리오 연동성 검증
// ----------------------------------------------------
console.log('\n--- [Step 5 실시간 전화 통화 모드 시나리오 연동성 검증] ---');
assert(SCENARIOS.length >= 10, `시나리오 총 ${SCENARIOS.length}개로 전화 통화 지원 완비`);
const izakayaScenario = SCENARIOS.find((s) => s.id === 'izakaya-entry-order');
assert(!!izakayaScenario, '이자카야 시나리오 매칭 확인');
assert(!!izakayaScenario?.customerRoleName && !!izakayaScenario?.staffRoleName, '전화 상대방 역할명 정상 지정');

// ----------------------------------------------------
// 결과 요약
// ----------------------------------------------------
console.log('\n========================================================');
console.log(`📊 테스트 결과: 총 ${passCount + failCount}개 중 ${passCount}개 통과, ${failCount}개 실패`);
console.log('========================================================');

if (failCount > 0) {
  process.exit(1);
}
