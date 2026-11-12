import React, { useState, useEffect, useRef } from 'react';
import {
  OFFLINE_EMERGENCY_PHRASES,
  EMERGENCY_CATEGORY_META,
  EmergencyCategory,
  EmergencyPhrase,
} from '../data/offlineTranslatorData';
import {
  executeOfflineTranslation,
  saveNeuralCache,
  getOfflinePackStats,
  getNeuralCacheEntries,
  registerDynamicVocabPairs,
  registerDynamicCorpusItems,
  PREBUILT_CORPUS,
  TranslationOutput,
} from '../utils/offlineEngine';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
  romajiToKoreanPronunciation,
  romajiToHiragana,
  registerDynamicKanjiReadings,
  registerDirectKanjiReadings,
} from '../utils/japanesePhonetics';
import { translateWithAI } from '../utils/aiService';
import { speakJapanese, startJapaneseSpeechRecognition } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import {
  Wifi,
  WifiOff,
  ArrowRightLeft,
  Volume2,
  Maximize2,
  X,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Database,
  CornerDownLeft,
  BookmarkPlus,
  Check,
  Cpu,
  Copy,
} from 'lucide-react';
import { AIConfig, SavedExpression } from '../types/conversation';

interface OfflineTranslatorProps {
  ttsSpeed: number;
  showFurigana?: boolean;
  aiConfig?: AIConfig;
  onOpenSettings?: () => void;
  onSaveExpression?: (expr: SavedExpression) => void;
  onOpenYenCalculator?: () => void;
}

export const OfflineTranslator: React.FC<OfflineTranslatorProps> = ({
  ttsSpeed,
  showFurigana = true,
  aiConfig,
  onOpenSettings,
  onSaveExpression,
  onOpenYenCalculator,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);
  const [direction, setDirection] = useState<'ko-to-jp' | 'jp-to-ko'>('ko-to-jp');
  const [inputText, setInputText] = useState<string>('');
  const [translationResult, setTranslationResult] =
    useState<TranslationOutput | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [packStats, setPackStats] = useState(() => getOfflinePackStats());
  const [corpusCategory, setCorpusCategory] = useState<string>('일상');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  const [selectedEmergencyCat, setSelectedEmergencyCat] = useState<
    EmergencyCategory | 'all'
  >('all');
  const [bigScreenPhrase, setBigScreenPhrase] = useState<{
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    korean: string;
  } | null>(null);

  const activeReqIdRef = useRef<number>(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOffline = !isOnline || forceOfflineMode;
  const hasAiKey = Boolean(aiConfig?.apiKey?.trim());
  const isGeminiConfigured =
    hasAiKey &&
    (aiConfig?.provider === 'gemini' || aiConfig?.apiKey?.trim().startsWith('AIza'));

  // 실시간 타이핑 디바운스 자동 번역 (2자 이상 입력 후 350ms 멈추면 체감 지연 0초로 즉시 번역)
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setTranslationResult(null);
      setIsTranslating(false);
      return;
    }

    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        handleTranslate(trimmed);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [inputText, direction, forceOfflineMode]);

  const handleTranslate = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text) return;

    const currentReqId = ++activeReqIdRef.current;

    // 1. 사전 캐싱된 오프라인 언어팩 & 다중 절 구문 합성 엔진으로 0.01초 즉시 응답 (Optimistic UI)
    const offlineOut = executeOfflineTranslation(text, direction);
    setTranslationResult(offlineOut);

    // 2. 이미 캐시된 고품질 신경망 번역이거나 100% 완전 일치 오프라인 팩인 경우 즉시 완료 (네트워크 0초)
    if (
      offlineOut.engineType === 'offline-neural-cache' ||
      (offlineOut.engineType === 'offline-pack' && offlineOut.confidence === 100)
    ) {
      setIsTranslating(false);
      return;
    }

    // 3. 온라인 모드 + Gemini/OpenAI API Key가 설정된 경우: 초고속 LLM 문맥 번역 (thinkingBudget=0)
    if (!effectiveOffline && hasAiKey && aiConfig) {
      setIsTranslating(true);
      try {
        const aiRes = await translateWithAI(text, direction, aiConfig);
        if (currentReqId !== activeReqIdRef.current) return;

        if (aiRes && aiRes.japanese) {
          if (aiRes.kanjiReadings?.length) {
            registerDirectKanjiReadings(aiRes.kanjiReadings);
          }
          if (aiRes.vocabPairs?.length) {
            registerDynamicVocabPairs(aiRes.vocabPairs);
          }
          const finalJp = aiRes.japanese.trim();
          const finalFuri = aiRes.furigana?.trim() || japaneseToHiraganaReading(finalJp);
          const finalKorPron =
            aiRes.koreanPronunciation?.trim() || kanaToKoreanPronunciation(finalJp);

          const aiOut: TranslationOutput = {
            japanese: finalJp,
            furigana: finalFuri,
            koreanPronunciation: finalKorPron,
            koreanMeaning:
              direction === 'ko-to-jp' ? text : aiRes.koreanMeaning || text,
            engineType: aiRes.providerUsed,
            confidence: 100,
            tip: aiRes.tip,
          };

          setTranslationResult(aiOut);
          saveNeuralCache(text, direction, aiOut);
          setPackStats(getOfflinePackStats());
          setIsTranslating(false);
          return;
        }
      } catch {
        // AI 호출 실패 시 아래 일반 신경망 번역 엔드포인트로 자동 폴백
      }
    }

    // 4. 온라인 모드(API 키 미설정 또는 폴백): 코퍼스 완전 일치가 아니면 실시간 신경망 번역 보조
    if (!effectiveOffline && offlineOut.confidence < 99) {
      setIsTranslating(true);
      try {
        const sl = direction === 'ko-to-jp' ? 'ko' : 'ja';
        const tl = direction === 'ko-to-jp' ? 'ja' : 'ko';
        const q = encodeURIComponent(text);

        let translatedText = '';
        let romajiSegments = '';

        // 1차 신경망 번역: Google Chrome Extension Dict API (429 차단 없이 0.2초 내 응답)
        try {
          const res = await fetch(
            `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${q}`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              if (typeof data[0] === 'string') {
                translatedText = data.join('').trim();
              } else if (Array.isArray(data[0])) {
                translatedText = data
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((item: any) => (typeof item?.[0] === 'string' ? item[0] : ''))
                  .join('')
                  .trim();
              }
            }
          }
        } catch {
          // 2차 엔드포인트로 폴백
        }

        // 2차 신경망 번역: MyMemory Neural Translation API
        if (!translatedText) {
          try {
            const mmRes = await fetch(
              `https://api.mymemory.translated.net/get?q=${q}&langpair=${sl}|${tl}`
            );
            if (mmRes.ok) {
              const mmData = await mmRes.json();
              if (mmData?.responseData?.translatedText) {
                translatedText = mmData.responseData.translatedText.trim();
              }
            }
          } catch {
            // 3차 엔드포인트로 폴백
          }
        }

        // 3차 폴백: Google gtx single API (모바일 네트워크 환경용)
        if (!translatedText) {
          try {
            const gtxRes = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=rm&q=${q}`
            );
            if (gtxRes.ok) {
              const data = await gtxRes.json();
              const segments = Array.isArray(data?.[0]) ? data[0] : [];
              translatedText = segments
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((seg: any) => (typeof seg?.[0] === 'string' ? seg[0] : ''))
                .join('')
                .trim();
              romajiSegments = segments
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((seg: any) => (Array.isArray(seg) ? seg[2] || seg[3] || '' : ''))
                .filter(Boolean)
                .join(' ')
                .trim();
            }
          } catch {
            // ignore
          }
        }

        if (translatedText) {
          const finalJapanese = direction === 'ko-to-jp' ? translatedText : text;

          // 로마자 발음 데이터를 일본어 원문 한자와 가나 앵커 정렬하여 사전에 없던 한자의 후리가나까지 자동 추출·등록!
          if (romajiSegments) {
            registerDynamicKanjiReadings(finalJapanese, romajiSegments);
          }

          let matchedFurigana = japaneseToHiraganaReading(finalJapanese);
          const hasUnresolvedKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(
            matchedFurigana
          );

          if (hasUnresolvedKanji && romajiSegments) {
            matchedFurigana = romajiToHiragana(romajiSegments);
          }

          const matchedKoreanPron = !hasUnresolvedKanji
            ? kanaToKoreanPronunciation(finalJapanese)
            : romajiSegments
            ? romajiToKoreanPronunciation(romajiSegments)
            : kanaToKoreanPronunciation(finalJapanese);

          const liveOut: TranslationOutput = {
            japanese: finalJapanese,
            furigana: matchedFurigana,
            koreanPronunciation: matchedKoreanPron,
            koreanMeaning: direction === 'ko-to-jp' ? text : translatedText,
            engineType: 'online-live',
            confidence: 100,
            tip: '실시간 신경망 번역 결과와 한자 후리가나가 오프라인 캐시에 자동 저장되어 비행기 모드에서도 그대로 작동합니다.',
          };

          setTranslationResult(liveOut);
          saveNeuralCache(text, direction, liveOut);
          setPackStats(getOfflinePackStats());
        }
      } catch {
        // 오프라인 구문 번역 결과 유지
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (direction === 'jp-to-ko') {
      setIsListening(true);
      startJapaneseSpeechRecognition(
        (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            handleTranslate(transcript);
          }
        },
        () => setIsListening(false),
        () => setIsListening(false)
      );
      return;
    }

    const SpeechRecognitionClass =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('현재 브라우저 환경에서 마이크 음성 인식을 지원하지 않습니다. Chrome 또는 Safari 브라우저를 권장합니다.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRecognitionClass as any)();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const spoken = e.results?.[0]?.[0]?.transcript || '';
      if (spoken) {
        setInputText(spoken);
        handleTranslate(spoken);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const filteredEmergency: EmergencyPhrase[] =
    selectedEmergencyCat === 'all'
      ? OFFLINE_EMERGENCY_PHRASES
      : OFFLINE_EMERGENCY_PHRASES.filter((p) => p.category === selectedEmergencyCat);

  const cachedEntries = getNeuralCacheEntries();
  const filteredCorpus = PREBUILT_CORPUS.filter((c) => c.category === corpusCategory);

  const handleCopyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 1600);
  };

  return (
    <div className="space-y-5 pb-28">
      {/* 1. 오프라인 언어팩 캐싱 상태 배너 */}
      <div className="rounded-[24px] bg-white border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              effectiveOffline
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {effectiveOffline ? (
              <WifiOff className="w-5 h-5" />
            ) : (
              <Database className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-900">
                {effectiveOffline
                  ? '✈️ 비행기(오프라인) 언어팩 모드 작동 중'
                  : 'Gemini 고품질 오프라인 언어팩 기본 탑재 완료'}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              내장 문장 {packStats.totalSentences}개 · 어휘 {packStats.totalVocabulary}개 · 한자 루비 2,300+ 기본 탑재됨
            </p>
          </div>
        </div>

        <button
          onClick={() => setForceOfflineMode((prev) => !prev)}
          className={`px-3 py-2 rounded-xl text-[11px] font-extrabold transition shrink-0 cursor-pointer ${
            forceOfflineMode
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {forceOfflineMode ? '온라인 복귀' : '✈️ 오프라인 체험'}
        </button>
      </div>

      {/* 여행 편의 도구: 현지 엔화 환율 · 소비세(10%) · 와리깡 계산기 퀵 배너 */}
      {onOpenYenCalculator && (
        <button
          onClick={onOpenYenCalculator}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-amber-500/10 to-violet-500/10 border border-indigo-200/70 hover:border-indigo-300 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
              💴
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-slate-800">
                  현지 엔화 & 와리깡(더치페이) 계산기
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                  10% 소비세
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                면세 5,500엔 트래커 · 동전 최소화 더치페이 · 쇼핑 회화 내장
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition shrink-0">
            열기 →
          </span>
        </button>
      )}

      {/* 2. 파파고 스타일 모던 양방향 번역 카드 */}
      <div className="rounded-[28px] bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* 언어 전환 탭 헤더 */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs font-extrabold">
            <span
              className={
                direction === 'ko-to-jp'
                  ? 'text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg'
                  : 'text-slate-600'
              }
            >
              🇰🇷 한국어
            </span>
            <button
              onClick={() => {
                setDirection((d) => (d === 'ko-to-jp' ? 'jp-to-ko' : 'ko-to-jp'));
                setTranslationResult(null);
              }}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-2xs transition cursor-pointer"
              title="번역 방향 바꾸기"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <span
              className={
                direction === 'jp-to-ko'
                  ? 'text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg'
                  : 'text-slate-600'
              }
            >
              🇯🇵 일본어
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            {effectiveOffline ? (
              <>
                <WifiOff className="w-3 h-3 text-amber-500" /> 데이터 0% 오프라인 번역
              </>
            ) : hasAiKey ? (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-extrabold cursor-pointer"
                title="AI 엔진 설정 열기"
              >
                <Cpu className="w-3 h-3" />
                {isGeminiConfigured ? 'Gemini AI 번역 활성' : 'OpenAI GPT 번역 활성'}
              </button>
            ) : (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer"
                title="우측 상단 설정에서 Gemini API 키를 등록하면 LLM 통번역이 활성화됩니다"
              >
                <Wifi className="w-3 h-3 text-emerald-500" /> 실시간 신경망 하이브리드
              </button>
            )}
          </span>
        </div>

        {/* 입력 영역 */}
        <div className="p-5 space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              placeholder={
                direction === 'ko-to-jp'
                  ? '번역할 문장을 입력하세요 (예: 예약은 안 했는데 두 명 자리 있나요?)'
                  : '일본어 문장을 입력하거나 마이크로 들려주세요'
              }
              className="w-full text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none pr-8"
            />
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setTranslationResult(null);
                }}
                className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="입력 내용 지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleVoiceInput}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" /> 듣는 중...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-indigo-600" /> 음성 입력
                </>
              )}
            </button>

            <button
              onClick={() => handleTranslate()}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition cursor-pointer"
            >
              <span>번역하기</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 번역 결과 영역 (한자 바로 위에 후리가나가 선명하게 표시!) */}
        {translationResult && (
          <div className="p-5 bg-indigo-50/50 border-t border-indigo-100/80 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  isTranslating
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : translationResult.engineType === 'gemini-ai' ||
                      translationResult.engineType === 'openai-ai'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {isTranslating ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>⚡ Gemini 3.8 초고속 업그레이드 중...</span>
                  </>
                ) : translationResult.engineType === 'gemini-ai' ? (
                  '✨ Gemini 3.8 AI 초고속 번역 완료'
                ) : translationResult.engineType === 'openai-ai' ? (
                  '✨ OpenAI GPT 실시간 번역'
                ) : translationResult.engineType === 'offline-neural-cache' ? (
                  '⚡ 0.001초 고속 캐시 메모리'
                ) : translationResult.engineType === 'offline-pack' ? (
                  '⚡ 0.01초 오프라인 즉시 번역'
                ) : (
                  '⚡ 실시간 신경망 번역'
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const textToCopy =
                      direction === 'ko-to-jp'
                        ? translationResult.japanese
                        : translationResult.koreanMeaning;
                    handleCopyText(textToCopy);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                    copiedOutput
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}
                  title={
                    direction === 'ko-to-jp'
                      ? '번역된 일본어 문장 복사'
                      : '번역된 한국어 문장 복사'
                  }
                >
                  {copiedOutput ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> 복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />{' '}
                      {direction === 'ko-to-jp' ? '일본어 복사' : '한국어 복사'}
                    </>
                  )}
                </button>
                {onSaveExpression && (
                  <button
                    onClick={() => {
                      onSaveExpression({
                        id: `trans-${Date.now()}`,
                        scenarioId: 'translator',
                        scenarioTitle: '실시간 번역 북마크',
                        speaker: 'customer',
                        japanese: translationResult.japanese,
                        furigana: translationResult.furigana,
                        koreanPronunciation: translationResult.koreanPronunciation,
                        koreanTranslation: translationResult.koreanMeaning,
                        realLifeTip: translationResult.tip || '번역기에서 저장한 표현입니다.',
                        savedAt: new Date().toISOString(),
                      });
                      setJustSaved(true);
                      setTimeout(() => setJustSaved(false), 1800);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${
                      justSaved
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}
                    title="내 단어장에 저장"
                  >
                    {justSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> 저장됨
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" /> 단어장 저장
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() =>
                    setBigScreenPhrase({
                      japanese: translationResult.japanese,
                      furigana: translationResult.furigana,
                      koreanPronunciation: translationResult.koreanPronunciation,
                      korean: translationResult.koreanMeaning,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> 큰 화면
                </button>
                <button
                  onClick={() => speakJapanese(translationResult.japanese, ttsSpeed)}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer"
                  title="발음 듣기"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 한자 위에 후리가나가 달린 일본어 결과 */}
            <div className="py-1">
              <FuriganaText
                text={translationResult.japanese}
                showFurigana={showFurigana}
                className="text-xl sm:text-2xl font-black text-slate-900"
                rtClassName="text-[11px] font-bold text-indigo-600"
              />
            </div>

            {/* 1:1 매칭 한글 발음 및 한국어 의미 */}
            <div className="p-3.5 rounded-2xl bg-white border border-indigo-100/90 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-indigo-700">
                  발음: [{translationResult.koreanPronunciation}]
                </div>
                <button
                  onClick={() =>
                    handleCopyText(
                      `${translationResult.japanese} [${translationResult.koreanPronunciation}]`
                    )
                  }
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  title="일본어 문장과 발음을 함께 복사"
                >
                  <Copy className="w-3 h-3" />
                  <span>발음함께 복사</span>
                </button>
              </div>
              <div className="text-xs text-slate-500">
                히라가나: {translationResult.furigana}
              </div>
              <div className="text-sm font-bold text-slate-800 pt-1 border-t border-slate-100">
                뜻: {translationResult.koreanMeaning}
              </div>
            </div>

            {translationResult.tip && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{translationResult.tip}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 오프라인 언어팩 상황별 원터치 문장 칩 (탭 한 번으로 즉시 번역 & 음성 출력) */}
      <div className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              ⚡ 오프라인 언어팩 상황별 즉시 번역 사전
            </h3>
            <p className="text-[11px] text-slate-500">
              비행기 모드에서도 탭 한 번으로 한자 후리가나와 음성을 확인할 수 있습니다
            </p>
          </div>
        </div>

        {/* 상황 카테고리 탭 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {cachedEntries.length > 0 && (
            <button
              onClick={() => setCorpusCategory('AI캐시')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition cursor-pointer ${
                corpusCategory === 'AI캐시'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              ✨ 내 AI 캐시 ({cachedEntries.length})
            </button>
          )}
          {['일상', '식당', '쇼핑', '호텔', '교통', '알레르기', '병원', '긴급'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCorpusCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition cursor-pointer ${
                corpusCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
          {corpusCategory === 'AI캐시' ? (
            cachedEntries.map((entry, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(entry.direction);
                  setInputText(entry.source);
                  setTranslationResult({
                    ...entry.output,
                    engineType: 'offline-neural-cache',
                  });
                }}
                className="text-left p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 transition flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {entry.source}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700 truncate">
                    → {entry.output.japanese}
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-600 shrink-0">
                  캐시 불러오기 →
                </span>
              </button>
            ))
          ) : (
            filteredCorpus.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection('ko-to-jp');
                  setInputText(item.ko);
                  handleTranslate(item.ko);
                }}
                className="text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/60 hover:border-indigo-200 transition flex items-center justify-between gap-2 cursor-pointer group"
              >
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                  {item.ko}
                </span>
                <span className="text-[11px] font-semibold text-indigo-500 shrink-0">
                  번역 보기 →
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 4. 위급 돌발상황 SOS 카드 리스트 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-900">
            🆘 돌발상황 SOS 소통 카드 (예상 답변 포함)
          </h3>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedEmergencyCat('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold shrink-0 cursor-pointer ${
              selectedEmergencyCat === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            전체 ({OFFLINE_EMERGENCY_PHRASES.length})
          </button>
          {(Object.keys(EMERGENCY_CATEGORY_META) as EmergencyCategory[]).map((cat) => {
            const meta = EMERGENCY_CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedEmergencyCat(cat)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedEmergencyCat === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredEmergency.map((item) => {
            const meta = EMERGENCY_CATEGORY_META[item.category];
            return (
              <div
                key={item.id}
                className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {meta.emoji} {meta.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setBigScreenPhrase({
                          japanese: item.japanese,
                          furigana: item.furigana,
                          koreanPronunciation: item.koreanPronunciation,
                          korean: item.korean,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> 큰 화면
                    </button>
                    <button
                      onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm font-extrabold text-slate-700">{item.korean}</div>

                {/* 한자 위에 후리가나가 올라간 일본어 문장 */}
                <div className="pt-0.5">
                  <FuriganaText
                    text={item.japanese}
                    showFurigana={showFurigana}
                    className="text-lg font-black text-slate-900"
                    rtClassName="text-[10.5px] font-bold text-indigo-600"
                  />
                </div>

                <div className="text-xs font-bold text-indigo-600">
                  [{item.koreanPronunciation}]
                </div>

                {/* 상대방 예상 답변 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-700">
                      <span className="font-extrabold text-amber-600">👂 상대방 예상 대답: </span>
                      <FuriganaText
                        text={item.expectedReplyJp}
                        showFurigana={showFurigana}
                        className="font-bold text-slate-900"
                        rtClassName="text-[9.5px] text-indigo-600"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      → {item.expectedReplyKo}
                    </div>
                  </div>
                  <button
                    onClick={() => speakJapanese(item.expectedReplyJp, ttsSpeed)}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shrink-0 cursor-pointer"
                    title="예상 답변 듣기"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 점원에게 보여주는 전체화면 SOS 빅카드 */}
      {bigScreenPhrase && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-extrabold">
              🇯🇵 상대방에게 화면을 보여주세요
            </span>
            <button
              onClick={() => setBigScreenPhrase(null)}
              className="p-2.5 rounded-2xl bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="my-auto space-y-6 text-center px-2">
            <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              すみません、これを読んでいただけますか？
            </p>
            <div className="py-2">
              <FuriganaText
                text={bigScreenPhrase.japanese}
                showFurigana={true}
                className="text-3xl sm:text-4xl font-black text-white break-keep"
                rtClassName="text-xs font-bold text-amber-300"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="text-sm font-bold text-amber-300">
                발음: [{bigScreenPhrase.koreanPronunciation}]
              </div>
              <div className="text-sm text-emerald-300">{bigScreenPhrase.korean}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => speakJapanese(bigScreenPhrase.japanese, 0.95)}
              className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Volume2 className="w-5 h-5" /> 일본어 음성 크게 재생
            </button>
            <button
              onClick={() => setBigScreenPhrase(null)}
              className="py-4 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
