/**
 * 에빙하우스 망각곡선(Spaced Repetition System - SRS) 및 연속 학습 스트릭 엔진
 */

export interface SRSItemRecord {
  id: string; // 단어 또는 문장 ID
  title: string;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  category: string;
  level: number; // 0: 신규, 1: 1일후, 2: 3일후, 3: 7일후, 4: 14일후, 5: 30일후(마스터)
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

const STORAGE_KEYS = {
  STREAK: 'tabitalk_user_streak_v1',
  SRS_ITEMS: 'tabitalk_srs_records_v1',
};

// 망각곡선 레벨별 복습 주기 (일수)
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

// 오늘 날짜 문자열 ('YYYY-MM-DD')
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 스트릭 데이터 로드
export function loadUserStreak(): UserStreakData {
  const defaultData: UserStreakData = {
    currentStreak: 1,
    maxStreak: 1,
    lastStudyDate: '',
    historyDates: [],
    totalReviewsCompleted: 0,
  };

  if (typeof localStorage === 'undefined') return defaultData;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return {
      currentStreak: Number(parsed.currentStreak) || 1,
      maxStreak: Number(parsed.maxStreak) || 1,
      lastStudyDate: parsed.lastStudyDate || '',
      historyDates: Array.isArray(parsed.historyDates) ? parsed.historyDates : [],
      totalReviewsCompleted: Number(parsed.totalReviewsCompleted) || 0,
    };
  } catch {
    return defaultData;
  }
}

// 복습 완료 시 스트릭 갱신
export function recordStudyCompletion(): UserStreakData {
  const current = loadUserStreak();
  const today = getTodayDateStr();

  let nextStreak = current.currentStreak;
  let nextMax = current.maxStreak;

  if (current.lastStudyDate === today) {
    // 오늘 이미 공부함 -> 스트릭 유지, 누적 횟수만 증가
    const updated: UserStreakData = {
      ...current,
      totalReviewsCompleted: current.totalReviewsCompleted + 1,
    };
    saveUserStreak(updated);
    return updated;
  }

  // 어제 날짜 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yYear = yesterday.getFullYear();
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

  if (current.lastStudyDate === yesterdayStr) {
    // 어제 공부했음 -> 연속 스트릭 +1
    nextStreak = current.currentStreak + 1;
  } else if (!current.lastStudyDate) {
    // 첫 공부
    nextStreak = 1;
  } else {
    // 하루 이상 건너뜀 -> 스트릭 1일로 리셋
    nextStreak = 1;
  }

  if (nextStreak > nextMax) {
    nextMax = nextStreak;
  }

  const updatedDates = Array.from(new Set([...current.historyDates, today])).sort();

  const result: UserStreakData = {
    currentStreak: nextStreak,
    maxStreak: nextMax,
    lastStudyDate: today,
    historyDates: updatedDates,
    totalReviewsCompleted: current.totalReviewsCompleted + 1,
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

// 퀴즈 결과에 따른 SRS 등급 업데이트
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
    // 틀림/어려움 -> 레벨 0(1일 후 다시 복습)으로 리셋
    nextLevel = 0;
    consecutive = 0;
  } else if (grade === 'good') {
    // 보통 -> 1단계 상승
    nextLevel = Math.min(SRS_INTERVALS_DAYS.length - 1, nextLevel + 1);
    consecutive += 1;
  } else {
    // 완벽 암기(easy) -> 2단계 상승
    nextLevel = Math.min(SRS_INTERVALS_DAYS.length - 1, nextLevel + 2);
    consecutive += 2;
  }

  const intervalDays = SRS_INTERVALS_DAYS[nextLevel];
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  const nYear = nextDate.getFullYear();
  const nMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nDay = String(nextDate.getDate()).padStart(2, '0');
  const nextReviewDate = `${nYear}-${nMonth}-${nDay}`;

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
): Array<{
  id: string;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  category: string;
  level: number;
  isOverdue: boolean;
}> {
  const records = loadSRSRecords();
  const today = getTodayDateStr();

  // 1. 단어장에 있는 표현들을 후보로 변환
  const candidates: Array<{
    id: string;
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    koreanTranslation: string;
    category: string;
    level: number;
    nextReviewDate: string;
    isOverdue: boolean;
  }> = [];

  savedExpressions.forEach((saved) => {
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
      });
    } else {
      // 아직 복습 기록이 없는 신규 저장 문장
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
      });
    }
  });

  // 2. N3 단어 중 일부 후보 추가
  n3Words.slice(0, 30).forEach((word) => {
    const rec = records[word.id];
    if (rec) {
      candidates.push({
        id: word.id,
        japanese: word.word,
        furigana: word.furigana,
        koreanPronunciation: word.koreanPronunciation,
        koreanTranslation: word.meaning,
        category: `N3 ${word.partOfSpeech}`,
        level: rec.level,
        nextReviewDate: rec.nextReviewDate,
        isOverdue: rec.nextReviewDate <= today,
      });
    } else {
      candidates.push({
        id: word.id,
        japanese: word.word,
        furigana: word.furigana,
        koreanPronunciation: word.koreanPronunciation,
        koreanTranslation: word.meaning,
        category: `N3 ${word.partOfSpeech}`,
        level: 0,
        nextReviewDate: today,
        isOverdue: true,
      });
    }
  });

  // 기한이 지난 것(overdue) 우선, 그 후 낮은 레벨 순으로 정렬
  candidates.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.level - b.level;
  });

  return candidates.slice(0, limit);
}
