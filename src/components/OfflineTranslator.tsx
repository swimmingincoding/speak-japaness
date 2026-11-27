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
import {
  subscribeOnDeviceNmtStatus,
  getOnDeviceNmtStatus,
  downloadAndActivateOnDeviceModel,
  setOnDeviceModelPreset,
  toggleOnDeviceNmtEnabled,
  suspendOnDeviceWorker,
  clearOnDeviceModelCache,
  translateWithOnDeviceNmt,
  OnDeviceNmtStatus,
  OnDeviceModelPreset,
} from '../utils/onDeviceNmtClient';
import { speakJapanese, startJapaneseSpeechRecognition } from '../utils/speech';
import { FuriganaText } from './FuriganaText';
import { RhythmicPronunciation } from './RhythmicPronunciation';
import { TripPackModal } from './TripPackModal';
import { hydrateInstalledTripPacks } from '../utils/tripLanguagePackStore';
import {
  WifiOff,
  ArrowRightLeft,
  Volume2,
  Maximize2,
  X,
  Mic,
  MicOff,
  Sparkles,
  CornerDownLeft,
  BookmarkPlus,
  BookmarkCheck,
  Check,
  Cpu,
  Copy,
  Download,
  Trash2,
  Moon,
  Briefcase,
  Camera,
  Calculator,
  ChevronRight,
  Ear,
} from 'lucide-react';
import { AIConfig, SavedExpression } from '../types/conversation';

interface OfflineTranslatorProps {
  ttsSpeed: number;
  showFurigana?: boolean;
  aiConfig?: AIConfig;
  savedJapaneseSet?: Set<string>;
  onOpenSettings?: () => void;
  onSaveExpression?: (expr: SavedExpression) => void;
  onOpenYenCalculator?: () => void;
  onOpenCameraScanner?: () => void;
}

export const OfflineTranslator: React.FC<OfflineTranslatorProps> = ({
  ttsSpeed,
  showFurigana = true,
  aiConfig,
  savedJapaneseSet,
  onOpenSettings,
  onSaveExpression,
  onOpenYenCalculator,
  onOpenCameraScanner,
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

  const [bottomSection, setBottomSection] = useState<'phrasebook' | 'sos'>('phrasebook');
  const [corpusCategory, setCorpusCategory] = useState<string>('식당');
  const [selectedEmergencyCat, setSelectedEmergencyCat] = useState<
    EmergencyCategory | 'all'
  >('all');
  const [expandedSosId, setExpandedSosId] = useState<string | null>(null);

  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [nmtStatus, setNmtStatus] = useState<OnDeviceNmtStatus>(() =>
    getOnDeviceNmtStatus()
  );
  const [isEngineSheetOpen, setIsEngineSheetOpen] = useState<boolean>(false);
  const [isTripPackModalOpen, setIsTripPackModalOpen] = useState<boolean>(false);

  const [recentHistory, setRecentHistory] = useState<
    Array<{
      source: string;
      direction: 'ko-to-jp' | 'jp-to-ko';
      output: TranslationOutput;
    }>
  >([]);

  const [bigScreenPhrase, setBigScreenPhrase] = useState<{
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    korean: string;
  } | null>(null);

  const activeReqIdRef = useRef<number>(0);
  const voiceRecRef = useRef<{ stop: () => void } | null>(null);

  const pushRecentHistory = (
    source: string,
    dir: 'ko-to-jp' | 'jp-to-ko',
    output: TranslationOutput
  ) => {
    const cleanSrc = source.trim();
    if (cleanSrc.length < 2) return;
    setRecentHistory((prev) => {
      const deduped = prev.filter((item) => item.source !== cleanSrc);
      return [{ source: cleanSrc, direction: dir, output }, ...deduped].slice(0, 5);
    });
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribeNmt = subscribeOnDeviceNmtStatus((st) => {
      setNmtStatus(st);
    });
    hydrateInstalledTripPacks().then(() => {
      setPackStats(getOfflinePackStats());
    });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeNmt();
      voiceRecRef.current?.stop();
    };
  }, []);

  const effectiveOffline = !isOnline || forceOfflineMode;
  const hasAiKey = Boolean(aiConfig?.apiKey?.trim());

  // 실시간 타이핑 디바운스 자동 번역
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

  const handleTranslate = async (
    textOverride?: string,
    dirOverride?: 'ko-to-jp' | 'jp-to-ko'
  ) => {
    const text = (textOverride ?? inputText).trim();
    const activeDir = dirOverride ?? direction;
    if (!text) return;

    const currentReqId = ++activeReqIdRef.current;

    const offlineOut = executeOfflineTranslation(text, activeDir);
    setTranslationResult(offlineOut);
    pushRecentHistory(text, activeDir, offlineOut);

    if (
      offlineOut.engineType === 'offline-neural-cache' ||
      offlineOut.engineType === 'trip-custom-pack' ||
      (offlineOut.engineType === 'offline-pack' && offlineOut.confidence >= 98)
    ) {
      setIsTranslating(false);
      return;
    }

    const tryOnDeviceNmtUpgrade = async (): Promise<boolean> => {
      if (!nmtStatus.enabled || offlineOut.confidence >= 97) return false;
      setIsTranslating(true);
      try {
        const nmtTranslated = await translateWithOnDeviceNmt(text, activeDir);
        if (currentReqId !== activeReqIdRef.current) return true;
        if (nmtTranslated && nmtTranslated.trim()) {
          const finalJp = activeDir === 'ko-to-jp' ? nmtTranslated.trim() : text;
          const finalFuri = japaneseToHiraganaReading(finalJp);
          const finalKorPron = kanaToKoreanPronunciation(finalJp);
          const nmtOut: TranslationOutput = {
            japanese: finalJp,
            furigana: finalFuri,
            koreanPronunciation: finalKorPron,
            koreanMeaning: activeDir === 'ko-to-jp' ? text : nmtTranslated.trim(),
            engineType: 'on-device-nmt',
            confidence: 98,
          };
          setTranslationResult(nmtOut);
          pushRecentHistory(text, activeDir, nmtOut);
          saveNeuralCache(text, activeDir, nmtOut);
          setPackStats(getOfflinePackStats());
          return true;
        }
      } catch {
        // 형태소 결과 유지
      } finally {
        if (currentReqId === activeReqIdRef.current) {
          setIsTranslating(false);
        }
      }
      return false;
    };

    if (effectiveOffline) {
      await tryOnDeviceNmtUpgrade();
      return;
    }

    if (!effectiveOffline && hasAiKey && aiConfig) {
      setIsTranslating(true);
      try {
        const aiRes = await translateWithAI(text, activeDir, aiConfig);
        if (currentReqId !== activeReqIdRef.current) return;

        if (aiRes && aiRes.japanese) {
          if (aiRes.kanjiReadings?.length) {
            registerDirectKanjiReadings(aiRes.kanjiReadings);
          }
          if (aiRes.vocabPairs?.length) {
            registerDynamicVocabPairs(aiRes.vocabPairs);
          }
          const finalJp = aiRes.japanese.trim();
          const aiFuri = aiRes.furigana?.trim() || '';
          const aiPron = aiRes.koreanPronunciation?.trim() || '';
          const finalFuri =
            aiFuri && (finalJp.length < 8 || aiFuri.includes(' '))
              ? aiFuri
              : japaneseToHiraganaReading(finalJp);
          const finalKorPron =
            aiPron && (finalJp.length < 8 || aiPron.includes(' '))
              ? aiPron
              : kanaToKoreanPronunciation(finalJp);

          const aiOut: TranslationOutput = {
            japanese: finalJp,
            furigana: finalFuri,
            koreanPronunciation: finalKorPron,
            koreanMeaning:
              activeDir === 'ko-to-jp' ? text : aiRes.koreanMeaning || text,
            engineType: aiRes.providerUsed,
            confidence: 100,
            tip: aiRes.tip,
          };

          setTranslationResult(aiOut);
          pushRecentHistory(text, activeDir, aiOut);
          saveNeuralCache(text, activeDir, aiOut);
          setPackStats(getOfflinePackStats());
          setIsTranslating(false);
          return;
        }
      } catch {
        // 폴백 진행
      }
    }

    if (!effectiveOffline && offlineOut.confidence < 99) {
      setIsTranslating(true);
      try {
        const sl = activeDir === 'ko-to-jp' ? 'ko' : 'ja';
        const tl = activeDir === 'ko-to-jp' ? 'ja' : 'ko';
        const q = encodeURIComponent(text);

        let translatedText = '';
        let romajiSegments = '';

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
          // 2차 폴백
        }

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
            // 3차 폴백
          }
        }

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
          const finalJapanese = activeDir === 'ko-to-jp' ? translatedText : text;

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
            koreanMeaning: activeDir === 'ko-to-jp' ? text : translatedText,
            engineType: 'online-live',
            confidence: 100,
          };

          setTranslationResult(liveOut);
          pushRecentHistory(text, activeDir, liveOut);
          saveNeuralCache(text, activeDir, liveOut);
          setPackStats(getOfflinePackStats());
          return;
        }
      } catch {
        // 오프라인 결과 유지
      } finally {
        setIsTranslating(false);
      }
    }

    if (nmtStatus.enabled && offlineOut.confidence < 97) {
      await tryOnDeviceNmtUpgrade();
    }
  };

  const startVoiceForDirection = (targetDir: 'ko-to-jp' | 'jp-to-ko') => {
    voiceRecRef.current?.stop();
    voiceRecRef.current = null;
    stopSpeakingSafe();

    if (targetDir !== direction) {
      setDirection(targetDir);
      setInputText('');
      setTranslationResult(null);
    }

    if (targetDir === 'jp-to-ko') {
      setIsListening(true);
      const handle = startJapaneseSpeechRecognition(
        (transcript, isFinal) => {
          setInputText(transcript);
          if (isFinal) {
            handleTranslate(transcript, 'jp-to-ko');
          }
        },
        () => {
          voiceRecRef.current = null;
          setIsListening(false);
        },
        () => {
          voiceRecRef.current = null;
          setIsListening(false);
        }
      );
      voiceRecRef.current = handle;
      return;
    }

    const SpeechRecognitionClass =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('현재 브라우저 환경에서 마이크 음성 인식을 지원하지 않습니다.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRecognitionClass as any)();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    setIsListening(true);
    voiceRecRef.current = {
      stop: () => {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          isFinal = true;
        }
      }
      if (transcript) {
        setInputText(transcript);
        if (isFinal) {
          handleTranslate(transcript, 'ko-to-jp');
        }
      }
    };
    rec.onerror = () => {
      voiceRecRef.current = null;
      setIsListening(false);
    };
    rec.onend = () => {
      voiceRecRef.current = null;
      setIsListening(false);
    };
    try {
      rec.start();
    } catch {
      voiceRecRef.current = null;
      setIsListening(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      voiceRecRef.current?.stop();
      voiceRecRef.current = null;
      setIsListening(false);
      return;
    }
    startVoiceForDirection(direction);
  };

  function stopSpeakingSafe() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

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
    <div className="space-y-4 pb-28">
      {/* 1. 최상단 즉시 번역 카드 (불필요한 상단 배너 완전 제거로 열자마자 바로 입력!) */}
      <div className="rounded-[28px] bg-white border border-slate-200/90 shadow-[0_6px_24px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* 언어 스왑 & 심플 상태 칩 */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setDirection((d) => (d === 'ko-to-jp' ? 'jp-to-ko' : 'ko-to-jp'));
              setTranslationResult(null);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/70 text-xs font-extrabold text-slate-800 transition cursor-pointer active:scale-95"
          >
            <span className={direction === 'ko-to-jp' ? 'text-indigo-600' : 'text-slate-600'}>
              한국어
            </span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className={direction === 'jp-to-ko' ? 'text-indigo-600' : 'text-slate-600'}>
              일본어
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsEngineSheetOpen(true)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              effectiveOffline
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
            }`}
          >
            {effectiveOffline ? (
              <>
                <WifiOff className="w-3 h-3" />
                <span>오프라인 모드</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{hasAiKey ? 'AI 실시간' : '실시간 번역'}</span>
              </>
            )}
          </button>
        </div>

        {/* 번역 텍스트 입력창 */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="relative">
            <textarea
              rows={3}
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
                  ? '하고 싶은 말을 편하게 입력하세요\n예) 예약 안 했는데 두 명 자리 있나요?'
                  : '점원의 일본어를 입력하거나 음성으로 들려주세요'
              }
              className="w-full text-[16px] leading-relaxed font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent resize-none focus:outline-none pr-8"
            />
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setTranslationResult(null);
                }}
                className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleVoiceInput}
              className={`px-4 py-2.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-sm'
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
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer"
            >
              <span>번역</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 깔끔하게 정돈된 번역 결과 영역 */}
        {translationResult && (
          <div className="p-4 sm:p-5 bg-indigo-50/45 border-t border-indigo-100/80 space-y-3.5 animate-fadeIn">
            {/* 상단 상태 표시 + 미니 유틸 아이콘 2개 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5">
                {isTranslating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span>정밀 번역 업그레이드 중...</span>
                  </>
                ) : translationResult.engineType === 'on-device-nmt' ? (
                  '🧠 온디바이스 AI 번역'
                ) : translationResult.engineType === 'gemini-ai' ||
                  translationResult.engineType === 'openai-ai' ? (
                  '✨ AI 문맥 번역 완료'
                ) : effectiveOffline ? (
                  '⚡ 오프라인 즉시 번역'
                ) : (
                  '⚡ 번역 완료'
                )}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleCopyText(
                      direction === 'ko-to-jp'
                        ? translationResult.japanese
                        : translationResult.koreanMeaning
                    )
                  }
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    copiedOutput
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                  title="문장 복사"
                >
                  {copiedOutput ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {onSaveExpression && (() => {
                  const jpKey = translationResult.japanese.replace(/[\s。、！？!?]/g, '').trim();
                  const isSaved = Boolean(jpKey && savedJapaneseSet?.has(jpKey));
                  return (
                    <button
                      onClick={() => {
                        onSaveExpression({
                          id: `trans-${jpKey}`,
                          scenarioId: 'translator',
                          scenarioTitle: '번역 북마크',
                          speaker: direction === 'jp-to-ko' ? 'staff' : 'customer',
                          japanese: translationResult.japanese,
                          furigana: translationResult.furigana,
                          koreanPronunciation: translationResult.koreanPronunciation,
                          koreanTranslation: translationResult.koreanMeaning,
                          realLifeTip: translationResult.tip || '번역기에서 저장한 표현입니다.',
                          savedAt: new Date().toISOString(),
                        });
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isSaved
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                      }`}
                      title={isSaved ? '보관함에서 제거' : '보관함에 저장'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <BookmarkPlus className="w-4 h-4" />
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* 큼직한 일본어 + 한자 루비 */}
            <div className="py-0.5">
              <FuriganaText
                text={translationResult.japanese}
                showFurigana={showFurigana}
                className="text-[22px] sm:text-2xl font-black text-slate-900"
                rtClassName="text-[11px] font-bold text-indigo-600"
              />
            </div>

            {/* 박자 발음 & 한국어 의미 */}
            <div className="p-3.5 rounded-2xl bg-white border border-indigo-100/90 space-y-1.5">
              <RhythmicPronunciation
                pronunciation={translationResult.koreanPronunciation}
                japanese={translationResult.japanese}
              />
              {direction === 'jp-to-ko' && (
                <div className="text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-100">
                  {translationResult.koreanMeaning}
                </div>
              )}
            </div>

            {/* 핵심 현장 액션 + 대면 티키타카 원터치 통역 */}
            <div className="space-y-2 pt-0.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => speakJapanese(translationResult.japanese, ttsSpeed)}
                  className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>발음 듣기</span>
                </button>
                <button
                  onClick={() =>
                    setBigScreenPhrase({
                      japanese: translationResult.japanese,
                      furigana: translationResult.furigana,
                      koreanPronunciation: translationResult.koreanPronunciation,
                      korean: translationResult.koreanMeaning,
                    })
                  }
                  className="py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>크게 보여주기</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  startVoiceForDirection(direction === 'ko-to-jp' ? 'jp-to-ko' : 'ko-to-jp')
                }
                className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-indigo-50 border border-indigo-200/90 text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
              >
                <Ear className="w-3.5 h-3.5" />
                <span>
                  {direction === 'ko-to-jp'
                    ? '점원의 일본어 대답 바로 듣기 (자동 통역)'
                    : '한국어로 바로 대답하기'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. 최근 대화 미니 기록 (2개 이상일 때만 깔끔한 한 줄 칩으로 노출) */}
      {recentHistory.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {recentHistory.map((hist, hIdx) => (
            <button
              key={hIdx}
              type="button"
              onClick={() => {
                setDirection(hist.direction);
                setInputText(hist.source);
                setTranslationResult(hist.output);
              }}
              className="shrink-0 max-w-[190px] px-3 py-1.5 rounded-full bg-white border border-slate-200/90 text-[11px] font-bold text-slate-700 hover:border-indigo-300 truncate cursor-pointer shadow-2xs"
            >
              🕒 {hist.source}
            </button>
          ))}
        </div>
      )}

      {/* 3. 여행 필수 도구 4종 컴팩트 아이콘 바 (기존 3단 배너를 깔끔한 1줄 위젯으로 압축!) */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onOpenCameraScanner}
          className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold text-slate-700">메뉴판 스캔</span>
        </button>

        <button
          type="button"
          onClick={onOpenYenCalculator}
          className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold text-slate-700">엔화 계산기</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTripPackModalOpen(true)}
          className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold text-slate-700">맞춤 언어팩</span>
        </button>

        <button
          type="button"
          onClick={() => setIsEngineSheetOpen(true)}
          className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer relative"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          {nmtStatus.isDownloaded && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2.5 right-3" />
          )}
          <span className="text-[11px] font-extrabold text-slate-700">오프라인 AI</span>
        </button>
      </div>

      {/* 4. 상황별 회화집 / 위급 SOS 깔끔한 세그먼트 분리 (한 화면 무한 나열 방지!) */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-200/70">
          <button
            type="button"
            onClick={() => setBottomSection('phrasebook')}
            className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              bottomSection === 'phrasebook'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ 상황별 빠른 회화
          </button>
          <button
            type="button"
            onClick={() => setBottomSection('sos')}
            className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              bottomSection === 'sos'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🆘 위급 상황 SOS
          </button>
        </div>

        {bottomSection === 'phrasebook' ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['식당', '쇼핑', '호텔', '교통', '알레르기', '병원', '긴급', '일상'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setCorpusCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0 transition cursor-pointer ${
                      corpusCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
              {cachedEntries.length > 0 && (
                <button
                  onClick={() => setCorpusCategory('AI캐시')}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0 transition cursor-pointer ${
                    corpusCategory === 'AI캐시'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  내 기록 ({cachedEntries.length})
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {corpusCategory === 'AI캐시'
                ? cachedEntries.map((entry, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(entry.direction);
                        setInputText(entry.source);
                        setTranslationResult({
                          ...entry.output,
                          engineType: 'offline-neural-cache',
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left py-3 px-1 hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {entry.source}
                        </div>
                        <div className="text-[11px] text-indigo-600 font-semibold truncate mt-0.5">
                          {entry.output.japanese}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))
                : filteredCorpus.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection('ko-to-jp');
                        setInputText(item.ko);
                        handleTranslate(item.ko);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left py-3 px-1 hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800">{item.ko}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedEmergencyCat('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 cursor-pointer ${
                  selectedEmergencyCat === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                전체
              </button>
              {(Object.keys(EMERGENCY_CATEGORY_META) as EmergencyCategory[]).map((cat) => {
                const meta = EMERGENCY_CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedEmergencyCat(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 flex items-center gap-1 cursor-pointer ${
                      selectedEmergencyCat === cat
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {filteredEmergency.map((item) => {
                const meta = EMERGENCY_CATEGORY_META[item.category];
                const isExpanded = expandedSosId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">
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
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" /> 크게 보기
                        </button>
                        <button
                          onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm font-extrabold text-slate-800">{item.korean}</div>

                    <FuriganaText
                      text={item.japanese}
                      showFurigana={showFurigana}
                      className="text-base font-black text-slate-900"
                      rtClassName="text-[10px] font-bold text-indigo-600"
                    />

                    <RhythmicPronunciation
                      pronunciation={item.koreanPronunciation}
                      japanese={item.japanese}
                      variant="compact"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSosId(isExpanded ? null : item.id)
                      }
                      className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer pt-0.5"
                    >
                      {isExpanded ? '예상 답변 접기 ▲' : '👂 상대방 예상 대답 보기 ▼'}
                    </button>

                    {isExpanded && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs animate-fadeIn">
                        <div className="space-y-0.5">
                          <FuriganaText
                            text={item.expectedReplyJp}
                            showFurigana={showFurigana}
                            className="font-bold text-slate-900"
                            rtClassName="text-[9.5px] text-indigo-600"
                          />
                          <div className="text-[11px] text-slate-500">
                            {item.expectedReplyKo}
                          </div>
                        </div>
                        <button
                          onClick={() => speakJapanese(item.expectedReplyJp, ttsSpeed)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. 오프라인 번역 엔진 & 온디바이스 AI 바텀 시트 (메인 화면 번잡함 완전 격리!) */}
      {isEngineSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 pb-[calc(env(safe-area-inset-bottom,16px)+1.2rem)] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  번역 엔진 & 비행기 모드 설정
                </h3>
                <p className="text-[11px] text-slate-500">
                  내장 문장 {packStats.totalSentences}개 · 어휘 {packStats.totalVocabulary}개 기본 탑재됨
                </p>
              </div>
              <button
                onClick={() => setIsEngineSheetOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 비행기 모드 테스트 스위치 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  ✈️ 오프라인(비행기 모드) 체험
                </div>
                <p className="text-[11px] text-slate-500">
                  데이터 0바이트 상태에서 번역 품질을 미리 확인합니다
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForceOfflineMode((p) => !p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  forceOfflineMode
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {forceOfflineMode ? '켜짐' : '꺼짐'}
              </button>
            </div>

            {/* 온디바이스 신경망 AI 모델 관리 */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-300" />
                  아이폰 온디바이스 신경망 AI
                </span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-white/15 text-indigo-200 font-bold">
                  {nmtStatus.state === 'ready'
                    ? '활성화됨'
                    : nmtStatus.state === 'loading'
                    ? `다운로드 ${nmtStatus.progress}%`
                    : nmtStatus.isDownloaded
                    ? '설치됨 (대기)'
                    : '미설치 (선택)'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Wi-Fi에서 1회 받아두면 비행기 안에서도 사전에 없는 자유 문장을 아이폰 칩으로 직접 번역합니다.
              </p>

              {nmtStatus.state === 'loading' && (
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 transition-all duration-300"
                    style={{ width: `${Math.max(5, nmtStatus.progress)}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'm2m100-418m' as OnDeviceModelPreset, label: 'M2M-100 경량 고속' },
                    { id: 'nllb-600m' as OnDeviceModelPreset, label: 'NLLB-200 고정밀' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOnDeviceModelPreset(opt.id)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                      nmtStatus.preset === opt.id
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={nmtStatus.state === 'loading'}
                  onClick={() => downloadAndActivateOnDeviceModel(nmtStatus.preset)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{nmtStatus.isDownloaded ? '엔진 깨우기' : 'Wi-Fi 모델 다운로드'}</span>
                </button>

                {nmtStatus.isDownloaded && (
                  <button
                    type="button"
                    onClick={() => toggleOnDeviceNmtEnabled(!nmtStatus.enabled)}
                    className="py-2.5 px-3 rounded-xl bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    {nmtStatus.enabled ? '자동켜짐' : '꺼짐'}
                  </button>
                )}

                {nmtStatus.state === 'ready' && (
                  <button
                    type="button"
                    onClick={() => suspendOnDeviceWorker()}
                    className="py-2.5 px-2.5 rounded-xl bg-white/10 text-xs font-bold text-indigo-200 cursor-pointer"
                    title="메모리 반환"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                )}

                {nmtStatus.isDownloaded && (
                  <button
                    type="button"
                    onClick={() => clearOnDeviceModelCache()}
                    className="py-2.5 px-2.5 rounded-xl bg-rose-500/25 text-rose-200 text-xs font-bold cursor-pointer"
                    title="캐시 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsEngineSheetOpen(false);
                  onOpenSettings();
                }}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                온라인 Gemini / GPT API 키 설정 열기 →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. 점원에게 보여주는 전체화면 빅카드 */}
      {bigScreenPhrase && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between pt-[calc(env(safe-area-inset-top,20px)+1.2rem)] px-6 pb-[calc(env(safe-area-inset-bottom,20px)+1.2rem)] animate-fadeIn">
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
            <p className="text-xs font-bold text-amber-300">
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
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <RhythmicPronunciation
                pronunciation={bigScreenPhrase.koreanPronunciation}
                japanese={bigScreenPhrase.japanese}
                variant="big"
              />
              <div className="text-sm text-emerald-300 pt-1 border-t border-slate-800">
                {bigScreenPhrase.korean}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => {
                setBigScreenPhrase(null);
                startVoiceForDirection('jp-to-ko');
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Ear className="w-4 h-4" /> 상대방 일본어 대답 바로 통역하기
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => speakJapanese(bigScreenPhrase.japanese, 0.95)}
                className="py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Volume2 className="w-5 h-5" /> 음성 크게 재생
              </button>
              <button
                onClick={() => setBigScreenPhrase(null)}
                className="py-3.5 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <TripPackModal
        isOpen={isTripPackModalOpen}
        onClose={() => setIsTripPackModalOpen(false)}
        aiConfig={aiConfig}
        ttsSpeed={ttsSpeed}
        onPacksChanged={() => setPackStats(getOfflinePackStats())}
        onSelectSentenceToTranslate={(sent) => {
          setDirection('ko-to-jp');
          setInputText(sent.ko);
          handleTranslate(sent.ko);
        }}
      />
    </div>
  );
};
