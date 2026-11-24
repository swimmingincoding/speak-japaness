/**
 * 에빙하우스 망각곡선(Spaced Repetition System - SRS) 및 연속 학습 스트릭 엔진
 */

export interface SRSItemRecord {
  id: string;
  title: string;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  category: string;
  level: number; // 0: 신규/오답(1일), 1: 3일, 2: 7일, 3: 14일, 4: 30일, 5: 60일(마스터)
  nextReviewDate: string; // 'YYYY-MM-DD'
  lastReviewedAt: string; // ISO string
  consecutiveSuccess: number;
}

export interface UserStreakData {
  currentStreak: number;
  maxStreak: number;
  lastStudyDate: string; // 'YYYY-MM-DD'
  historyDates: string[]; // ['2026-11-10', '2026-11-11', ...]
  totalReviewsCompleted: number;
}

export interface WeekDayStatus {
  dayLabel: string;
  dateStr: string;
  isToday: boolean;
  isStudied: boolean;
}

const STORAGE_KEYS = {
  STREAK: 'tabitalk_user_streak_v1',
  SRS_ITEMS: 'tabitalk_srs_records_v1',
};

// 망각곡선 레벨별 복습 주기 (일수)
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

export function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 오늘 날짜 문자열 ('YYYY-MM-DD')
export function getTodayDateStr(): string {
  return formatLocalDateStr(new Date());
}

export function getYesterdayDateStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDateStr(yesterday);
}

// 스트릭 데이터 로드 (날짜 경과에 따른 연속 스트릭 유효성 자동 검증 포함)
export function loadUserStreak(): UserStreakData {
  const defaultData: UserStreakData = {
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: '',
    historyDates: [],
    totalReviewsCompleted: 0,
  };

  if (typeof localStorage === 'undefined') return defaultData;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    const lastStudyDate: string = parsed.lastStudyDate || '';
    const historyDates: string[] = Array.isArray(parsed.historyDates) ? parsed.historyDates : [];
    const savedStreak = Number(parsed.currentStreak) || 0;
    const maxStreak = Math.max(Number(parsed.maxStreak) || 0, savedStreak);

    const today = getTodayDateStr();
    const yesterday = getYesterdayDateStr();

    // 오늘 또는 어제 학습 기록이 있으면 연속 스트릭 유지, 하루 이상 건너뛰었으면 0일로 표시
    const effectiveStreak =
      lastStudyDate === today || lastStudyDate === yesterday ? savedStreak : 0;

    return {
      currentStreak: effectiveStreak,
      maxStreak,
      lastStudyDate,
      historyDates,
      totalReviewsCompleted: Number(parsed.totalReviewsCompleted) || 0,
    };
  } catch {
    return defaultData;
  }
}

// 이번 주 월~일 출석 도장 현황 계산
export function getWeekStudyStatus(streakData: UserStreakData): WeekDayStatus[] {
  const now = new Date();
  const todayStr = formatLocalDateStr(now);
  // 월요일(0) ~ 일요일(6) 기준 오프셋
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const historySet = new Set(streakData.historyDates);
  if (streakData.lastStudyDate) {
    historySet.add(streakData.lastStudyDate);
  }

  return labels.map((dayLabel, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = formatLocalDateStr(d);
    return {
      dayLabel,
      dateStr,
      isToday: dateStr === todayStr,
      isStudied: historySet.has(dateStr),
    };
  });
}

// 학습 활동(복습 세션, 롤플레잉 완주, N3 퀴즈 등) 완료 시 스트릭 갱신
export function recordStudyCompletion(incrementReviewCounter: boolean = true): UserStreakData {
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  let rawSavedStreak = 0;
  let prevMax = 0;
  let lastStudyDate = '';
  let historyDates: string[] = [];
  let totalReviews = 0;

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
      if (raw) {
        const parsed = JSON.parse(raw);
        rawSavedStreak = Number(parsed.currentStreak) || 0;
        prevMax = Number(parsed.maxStreak) || 0;
        lastStudyDate = parsed.lastStudyDate || '';
        historyDates = Array.isArray(parsed.historyDates) ? parsed.historyDates : [];
        totalReviews = Number(parsed.totalReviewsCompleted) || 0;
      }
    } catch {
      // ignore
    }
  }

  if (lastStudyDate === today) {
    const updated: UserStreakData = {
      currentStreak: Math.max(1, rawSavedStreak),
      maxStreak: Math.max(prevMax, Math.max(1, rawSavedStreak)),
      lastStudyDate: today,
      historyDates: Array.from(new Set([...historyDates, today])).sort(),
      totalReviewsCompleted: totalReviews + (incrementReviewCounter ? 1 : 0),
    };
    saveUserStreak(updated);
    return updated;
  }

  const nextStreak = lastStudyDate === yesterday ? Math.max(1, rawSavedStreak) + 1 : 1;
  const nextMax = Math.max(prevMax, nextStreak);
  const updatedDates = Array.from(new Set([...historyDates, today])).sort();

  const result: UserStreakData = {
    currentStreak: nextStreak,
    maxStreak: nextMax,
    lastStudyDate: today,
    historyDates: updatedDates,
    totalReviewsCompleted: totalReviews + (incrementReviewCounter ? 1 : 0),
  };

  saveUserStreak(result);
  return result;
}

function saveUserStreak(data: UserStreakData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// SRS 기록 로드
export function loadSRSRecords(): { [id: string]: SRSItemRecord } {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SRS_ITEMS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// SRS 기록 저장
export function saveSRSRecords(records: { [id: string]: SRSItemRecord }): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SRS_ITEMS, JSON.stringify(records));
  } catch {
    // ignore
  }
}

// 퀴즈/플래시카드 결과에 따른 SRS 등급 업데이트
export function updateSRSGrade(
  itemId: string,
  grade: 'easy' | 'good' | 'hard',
  itemMeta: {
    title: string;
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    koreanTranslation: string;
    category: string;
  }
): SRSItemRecord {
  const records = loadSRSRecords();
  const existing = records[itemId];
  const today = new Date();

  let nextLevel = existing ? existing.level : 0;
  let consecutive = existing ? existing.consecutiveSuccess : 0;

  if (grade === 'hard') {
    nextLevel = 0;
    consecutive = 0;
  } else if (grade === 'good') {
    nextLevel = Math.min(SRS_INTERVALS_DAYS.length - 1, nextLevel + 1);
    consecutive += 1;
  } else {
    nextLevel = Math.min(SRS_INTERVALS_DAYS.length - 1, nextLevel + 2);
    consecutive += 2;
  }

  // hard(오답/어려움)일 때는 당일 또는 내일 최우선 복습 큐에 뜨도록 오늘/내일 기준 설정
  const intervalDays = grade === 'hard' ? 0 : SRS_INTERVALS_DAYS[nextLevel];
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  const nextReviewDate = formatLocalDateStr(nextDate);

  const updated: SRSItemRecord = {
    id: itemId,
    title: itemMeta.title,
    japanese: itemMeta.japanese,
    furigana: itemMeta.furigana,
    koreanPronunciation: itemMeta.koreanPronunciation,
    koreanTranslation: itemMeta.koreanTranslation,
    category: itemMeta.category,
    level: nextLevel,
    nextReviewDate,
    lastReviewedAt: new Date().toISOString(),
    consecutiveSuccess: consecutive,
  };

  records[itemId] = updated;
  saveSRSRecords(records);
  return updated;
}

export interface DueReviewCard {
  id: string;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  category: string;
  level: number;
  isOverdue: boolean;
}

// 오늘 복습해야 할 추천 목록 (기본 5개)
export function getDueReviewItems(
  savedExpressions: Array<{
    id: string;
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    koreanTranslation: string;
    scenarioTitle: string;
  }>,
  n3Words: Array<{
    id: string;
    word: string;
    furigana: string;
    koreanPronunciation: string;
    meaning: string;
    partOfSpeech: string;
  }>,
  limit: number = 5
): DueReviewCard[] {
  const records = loadSRSRecords();
  const today = getTodayDateStr();

  const candidates: Array<DueReviewCard & { nextReviewDate: string; hasRecord: boolean }> = [];
  const seenIds = new Set<string>();

  // 1. 단어장에 있는 표현들을 후보로 변환
  savedExpressions.forEach((saved) => {
    seenIds.add(saved.id);
    const rec = records[saved.id];
    if (rec) {
      candidates.push({
        id: saved.id,
        japanese: saved.japanese,
        furigana: saved.furigana || saved.japanese,
        koreanPronunciation: saved.koreanPronunciation,
        koreanTranslation: saved.koreanTranslation,
        category: saved.scenarioTitle || '단어장 표현',
        level: rec.level,
        nextReviewDate: rec.nextReviewDate,
        isOverdue: rec.nextReviewDate <= today,
        hasRecord: true,
      });
    } else {
      candidates.push({
        id: saved.id,
        japanese: saved.japanese,
        furigana: saved.furigana || saved.japanese,
        koreanPronunciation: saved.koreanPronunciation,
        koreanTranslation: saved.koreanTranslation,
        category: saved.scenarioTitle || '단어장 표현',
        level: 0,
        nextReviewDate: today,
        isOverdue: true,
        hasRecord: false,
      });
    }
  });

  // 2. N3 전체 단어 후보 추가 (특히 퀴즈 오답으로 level 0 기록된 단어 최우선 노출!)
  n3Words.forEach((word) => {
    if (seenIds.has(word.id)) return;
    seenIds.add(word.id);
    const rec = records[word.id];
    if (rec) {
      candidates.push({
        id: word.id,
        japanese: word.word,
        furigana: word.furigana,
        koreanPronunciation: word.koreanPronunciation,
        koreanTranslation: word.meaning,
        category: `N3 어휘`,
        level: rec.level,
        nextReviewDate: rec.nextReviewDate,
        isOverdue: rec.nextReviewDate <= today,
        hasRecord: true,
      });
    } else {
      candidates.push({
        id: word.id,
        japanese: word.word,
        furigana: word.furigana,
        koreanPronunciation: word.koreanPronunciation,
        koreanTranslation: word.meaning,
        category: `N3 어휘`,
        level: 0,
        nextReviewDate: today,
        isOverdue: true,
        hasRecord: false,
      });
    }
  });

  // 정렬 우선순위: 기한 도래(isOverdue) -> 오답 기록 있는 낮은 레벨(hasRecord && level===0) -> 낮은 레벨 순
  candidates.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.level !== b.level) return a.level - b.level;
    if (a.hasRecord && !b.hasRecord) return -1;
    if (!a.hasRecord && b.hasRecord) return 1;
    return 0;
  });

  return candidates.slice(0, limit).map(({ nextReviewDate: _n, hasRecord: _h, ...rest }) => rest);
}
