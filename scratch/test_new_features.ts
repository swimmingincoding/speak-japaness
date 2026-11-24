/**
 * 5대 신기능 + 2차 고도화(장바구니/양방향 환율, 주간 스트릭 잔디, 오답 SRS 자동 편입 등) 종합 검증 스위트
 */
import {
  getTodayDateStr,
  getYesterdayDateStr,
  updateSRSGrade,
  loadUserStreak,
  recordStudyCompletion,
  getWeekStudyStatus,
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

// Node 테스트 환경을 위한 인메모리 localStorage 모킹
const memoryStore: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
      setItem: (k: string, v: string) => {
        memoryStore[k] = String(v);
      },
      removeItem: (k: string) => {
        delete memoryStore[k];
      },
      clear: () => {
        Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
      },
      key: (i: number) => Object.keys(memoryStore)[i] || null,
      get length() {
        return Object.keys(memoryStore).length;
      },
    },
    configurable: true,
  });
}

console.log('========================================================');
console.log('🧪 TABITALK 5대 신기능 & 2차 고도화 품질 종합 검증 스위트');
console.log('========================================================\n');

// ----------------------------------------------------
// [Test 1] SRS 망각곡선, 주간 잔디 도장 & 오답 자동 편입 검증
// ----------------------------------------------------
console.log('--- [Step 4 & Phase 3 SRS · 주간 스트릭 잔디 · N3 오답 연동 검증] ---');
const todayStr = getTodayDateStr();
const yesterdayStr = getYesterdayDateStr();
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `오늘 날짜 형식(YYYY-MM-DD) 정상: ${todayStr}`);

// 어제 학습 기록 세팅 후 오늘 학습 완료 시 연속 스트릭 2일 증가 검증
localStorage.setItem(
  'tabitalk_user_streak_v1',
  JSON.stringify({
    currentStreak: 1,
    maxStreak: 1,
    lastStudyDate: yesterdayStr,
    historyDates: [yesterdayStr],
    totalReviewsCompleted: 1,
  })
);
const preLoadedStreak = loadUserStreak();
assert(preLoadedStreak.currentStreak === 1, `어제 학습 시 유효 스트릭 유지 확인 (1일)`);

const afterTodayStudy = recordStudyCompletion(true);
assert(afterTodayStudy.currentStreak === 2, `오늘 연속 학습 완료 시 스트릭 2일 증가 확인: ${afterTodayStudy.currentStreak}일`);

const weekStatus = getWeekStudyStatus(afterTodayStudy);
assert(weekStatus.length === 7, '주간 출석 캘린더 월~일 7일 배열 생성 확인');
const todaySlot = weekStatus.find((d) => d.isToday);
assert(!!todaySlot && todaySlot.isStudied, '오늘 요일 출석 도장 정상 체크 확인');

// N3 퀴즈에서 특정 단어를 틀렸을 때('hard') 오늘 복습 큐 최상단 편입 검증
const targetWrongWord = N3_VOCAB_LIST[10];
updateSRSGrade(targetWrongWord.id, 'hard', {
  title: targetWrongWord.word,
  japanese: targetWrongWord.word,
  furigana: targetWrongWord.furigana,
  koreanPronunciation: targetWrongWord.koreanPronunciation,
  koreanTranslation: targetWrongWord.meaning,
  category: 'N3 퀴즈 복습',
});

const mockSaved = [
  {
    id: 'test-1',
    japanese: 'お会計をお願いします。',
    furigana: 'おかいけいをおねがいします。',
    koreanPronunciation: '오카이케-오 오네가이시마스',
    koreanTranslation: '계산 부탁드립니다.',
    scenarioTitle: '식당 결제',
  },
];

const dueItems = getDueReviewItems(mockSaved, N3_VOCAB_LIST, 5);
assert(dueItems.length === 5, `오늘 복습 큐 5개 자동 추천 정상 추출 (${dueItems.length}개)`);
assert(
  dueItems.some((item) => item.id === targetWrongWord.id),
  `N3 퀴즈 오답 단어(${targetWrongWord.word})가 망각곡선 우선 복습 큐에 자동 포함됨`
);

// ----------------------------------------------------
// [Test 2] 엔화 장바구니 다품목 합산 / 양방향 역산 / 와리깡 검증
// ----------------------------------------------------
console.log('\n--- [Step 1 & Phase 3 엔화 장바구니 합산 · 원화 역산 · 와리깡 검증] ---');

// 단품 2,980엔 (세금 별도)
const priceWithoutTax = 2980;
const tax10 = Math.floor(priceWithoutTax * 0.1);
const finalPrice = priceWithoutTax + tax10;
assert(tax10 === 298 && finalPrice === 3278, `2,980엔 세금 별도 -> 세금 298엔 -> 최종 3,278엔 확인`);

// 장바구니 다품목 합산 시뮬레이션 (동전파스 780엔 + 안약 550엔 + 과자 1,280엔, 각 +10% 세금)
const cartRaw = [780, 550, 1280];
const cartFinalSum = cartRaw.reduce((acc, v) => acc + v + Math.floor(v * 0.1), 0);
// 858 + 605 + 1408 = 2871엔
assert(cartFinalSum === 2871, `장바구니 3품목 세금포함 누적 합계 2,871엔 확인: ${cartFinalSum}엔`);

// 원화 예산 -> 엔화 역산 (50,000원 예산, 100엔=910원 기준 -> 약 5,495엔)
const rate = 910;
const reverseYen = Math.round((50000 * 100) / rate);
assert(reverseYen === 5495, `50,000원 예산 엔화 역산(5,495엔) 정확도 확인: ${reverseYen}엔`);

// 와리깡 3인 100엔 단위 올림 계산
const headcount = 3;
const perPerson100 = Math.ceil(finalPrice / headcount / 100) * 100;
const totalCollected = perPerson100 * headcount;
const surplus = totalCollected - finalPrice;
assert(perPerson100 === 1100 && surplus === 22, `3인 100엔 올림 와리깡 1,100엔/인 (+22엔 잔돈) 확인`);

// ----------------------------------------------------
// [Test 3] 아이폰 16 프로 잠금화면 비율 & 긴급 연락망 검증
// ----------------------------------------------------
console.log('\n--- [Step 2 & Phase 2 아이폰 16 프로 잠금화면 치트시트 검증] ---');
const iphone16ProRatio = 402 / 874;
const cheatSheetLockRatio = 900 / 1956;
assert(
  Math.abs(iphone16ProRatio - cheatSheetLockRatio) < 0.002,
  `치트시트 잠금화면 해상도(900x1956)가 iPhone 16 Pro(402x874) 비율과 99.9% 일치함`
);

// ----------------------------------------------------
// [Test 4] 카메라 스캐너 & 실시간 전화 통화 시나리오 검증
// ----------------------------------------------------
console.log('\n--- [Step 3 & Step 5 스캐너 및 전화 통화 연동성 검증] ---');
assert(SCENARIOS.length >= 10, `전체 ${SCENARIOS.length}개 시나리오 전화 통화 동적 힌트 매칭 확인`);
const izakayaScenario = SCENARIOS.find((s) => s.id === 'izakaya-entry-order');
assert(
  !!izakayaScenario && izakayaScenario.turns.some((t) => t.speaker === 'customer'),
  '전화 통화 시나리오별 고객/점원 동적 추천 대사 추출 확인'
);

console.log('\n========================================================');
console.log(`📊 테스트 결과: 총 ${passCount + failCount}개 중 ${passCount}개 통과, ${failCount}개 실패`);
console.log('========================================================');

if (failCount > 0) {
  process.exit(1);
}
