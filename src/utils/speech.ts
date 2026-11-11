// Web Speech API 기반 일본어 음성 합성(TTS) 및 음성 인식(STT) 유틸리티

export function speakJapanese(
  text: string,
  rate: number = 1.0,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  // 괄호 안의 지문(예: （タッチして）) 제거 후 발화
  const cleanText = text.replace(/（.*?）|\(.*?\)/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ja-JP';
  utterance.rate = rate;
  utterance.pitch = 1.02;

  const voices = window.speechSynthesis.getVoices();
  const jpVoice =
    voices.find((v) => v.lang === 'ja-JP' && v.name.includes('Google')) ||
    voices.find((v) => v.lang === 'ja-JP' && v.name.includes('Kyoko')) ||
    voices.find((v) => v.lang === 'ja-JP' && v.name.includes('Haruka')) ||
    voices.find((v) => v.lang.startsWith('ja'));

  if (jpVoice) {
    utterance.voice = jpVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };
  utterance.onerror = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

export interface RecognitionHandle {
  stop: () => void;
}

export function startJapaneseSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (errorMsg: string) => void,
  onEnd: () => void
): RecognitionHandle | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionClass =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onError('현재 브라우저에서 음성 인식을 지원하지 않습니다. (Chrome 또는 Safari 권장)');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognition = new (SpeechRecognitionClass as any)();
  recognition.lang = 'ja-JP';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let transcript = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        isFinal = true;
      }
    }
    onResult(transcript, isFinal);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      onError('음성이 감지되지 않았습니다. 마이크에 대고 다시 말씀해 주세요.');
    } else if (event.error === 'not-allowed') {
      onError('마이크 권한이 거부되었습니다. 브라우저 주소창에서 마이크 권한을 허용해 주세요.');
    } else {
      onError(`음성 인식 오류: ${event.error}`);
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.start();

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}

function normalizeJapanese(str: string): string {
  return str
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/[、。！？!?\s「」『』・~〜ー-]/g, '')
    .trim();
}

export function calculateSimilarityScore(
  spoken: string,
  targetJapanese: string,
  targetFurigana?: string
): { score: number; feedback: string } {
  const cleanSpoken = normalizeJapanese(spoken);
  const cleanTarget = normalizeJapanese(targetJapanese);
  const cleanFurigana = targetFurigana ? normalizeJapanese(targetFurigana) : '';

  if (!cleanSpoken) {
    return { score: 0, feedback: '인식된 문장이 없습니다.' };
  }

  if (cleanSpoken === cleanTarget || (cleanFurigana && cleanSpoken === cleanFurigana)) {
    return { score: 100, feedback: '완벽해요! 원어민 점원이 바로 알아들을 발음입니다 🎉' };
  }

  // 문자 단위 Bigram 및 포함도 계산
  const calcOverlap = (a: string, b: string) => {
    if (!a || !b) return 0;
    let matches = 0;
    const bChars = b.split('');
    for (const ch of a) {
      const idx = bChars.indexOf(ch);
      if (idx !== -1) {
        matches++;
        bChars.splice(idx, 1);
      }
    }
    return Math.round((matches / Math.max(a.length, b.length)) * 100);
  };

  const scoreKanji = calcOverlap(cleanSpoken, cleanTarget);
  const scoreHira = cleanFurigana ? calcOverlap(cleanSpoken, cleanFurigana) : 0;
  const bestScore = Math.min(100, Math.max(scoreKanji, scoreHira));

  if (bestScore >= 85) {
    return { score: bestScore, feedback: '아주 훌륭해요! 실제 일본 여행에서 100% 통하는 발음입니다 👍' };
  } else if (bestScore >= 60) {
    return { score: bestScore, feedback: '핵심 단어가 잘 전달되었어요! 억양을 한 번 더 들어보고 따라 해보세요 ✨' };
  } else {
    return { score: Math.max(40, bestScore), feedback: '좋은 시도예요! 천천히 듣기(0.78x)로 발음을 확인한 뒤 다시 말해볼까요?' };
  }
}

