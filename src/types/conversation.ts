export type RoleType = 'customer' | 'staff';

export type CategoryType = 'restaurant' | 'convenience' | 'hotel' | 'transport';

export interface VocabItem {
  word: string;
  reading: string;
  koreanPronunciation: string;
  meaning: string;
  note?: string;
}

export interface AlternativeReply {
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  nuance: string;
}

export interface DialogueTurn {
  id: string;
  speaker: RoleType;
  speakerLabel: string;
  japanese: string;
  furigana: string; // 히라가나 전체 읽기 또는 후리가나 가이드
  koreanPronunciation: string; // 한국어 발음 표기
  koreanTranslation: string; // 자연스러운 한국어 뜻
  literalMeaning?: string; // 직역 또는 문법 구조 설명
  realLifeTip: string; // 일본인들이 실생활에서 쓰는 뉘앙스 / 종업원 특유의 표현 해설
  staffKeigoPoint?: string; // 종업원(B)이 쓰는 접객 경어 포인트 (왜 알아듣기 힘든지에 대한 비밀)
  vocab: VocabItem[];
  alternatives?: AlternativeReply[]; // 같은 상황에서 다르게 대답할 수 있는 응용 표현
}

export interface Scenario {
  id: string;
  category: CategoryType;
  title: string;
  subtitle: string;
  placeName: string;
  difficulty: '초급' | '중급' | '실전';
  estimatedMinutes: number;
  customerRoleName: string;
  staffRoleName: string;
  situationBrief: string;
  whyHardToUnderstand: string; // 왜 실제 일본 여행에서 이 상황의 점원 말을 못 알아듣는지 핵심 요약
  keyTakeaways: string[];
  turns: DialogueTurn[];
  freeTalkStarter: {
    customerStarts: {
      staffOpening: DialogueTurn;
      missions: string[];
    };
    staffStarts: {
      customerOpening: DialogueTurn;
      missions: string[];
    };
  };
}

export interface SavedExpression {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  speaker: RoleType;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  realLifeTip: string;
  savedAt: string;
}

export interface DisplaySettings {
  showFurigana: boolean;
  showKoreanPronunciation: boolean;
  showTranslation: boolean;
  ttsSpeed: number; // 1.0 or 0.78
  autoPlayPartnerAudio: boolean;
}

export interface AIConfig {
  provider: 'simulation' | 'gemini' | 'openai';
  apiKey: string;
  model: string;
}

export interface FreeTalkMessage {
  id: string;
  sender: 'user' | 'partner';
  role: RoleType;
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  realLifeTip?: string;
  correctionFeedback?: string;
  suggestedReplies?: {
    japanese: string;
    koreanPronunciation: string;
    koreanTranslation: string;
  }[];
}

