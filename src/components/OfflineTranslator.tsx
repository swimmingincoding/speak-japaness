import React, { useState, useEffect } from 'react';
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
  PREBUILT_CORPUS,
  TranslationOutput,
} from '../utils/offlineEngine';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
  romajiToKoreanPronunciation,
} from '../utils/japanesePhonetics';
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
} from 'lucide-react';
import { SavedExpression } from '../types/conversation';

interface OfflineTranslatorProps {
  ttsSpeed: number;
  showFurigana?: boolean;
  onSaveExpression?: (expr: SavedExpression) => void;
}

export const OfflineTranslator: React.FC<OfflineTranslatorProps> = ({
  ttsSpeed,
  showFurigana = true,
  onSaveExpression,
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
  const [corpusCategory, setCorpusCategory] = useState<string>('식당');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const [selectedEmergencyCat, setSelectedEmergencyCat] = useState<
    EmergencyCategory | 'all'
  >('all');
  const [bigScreenPhrase, setBigScreenPhrase] = useState<{
    japanese: string;
    furigana: string;
    koreanPronunciation: string;
    korean: string;
  } | null>(null);

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

  const handleTranslate = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text) return;

    // 1. 사전 캐싱된 오프라인 언어팩 & 다중 절 형태소 합성 엔진으로 즉시 변환 (0.01초)
    const offlineOut = executeOfflineTranslation(text, direction);
    setTranslationResult(offlineOut);

    // 2. 온라인 모드이고 코퍼스 정확 매칭(confidence >= 95)이 아닌 경우 온라인 신경망 번역 후 오프라인 캐시에 영구 저장
    if (!effectiveOffline && offlineOut.confidence < 95) {
      setIsTranslating(true);
      try {
        const sl = direction === 'ko-to-jp' ? 'ko' : 'ja';
        const tl = direction === 'ko-to-jp' ? 'ja' : 'ko';
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=rm&q=${encodeURIComponent(
          text
        )}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const segments = Array.isArray(data?.[0]) ? data[0] : [];
          const translatedText = segments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((seg: any) => (typeof seg?.[0] === 'string' ? seg[0] : ''))
            .join('')
            .trim();

          const romajiSegments = segments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((seg: any) => {
              if (!Array.isArray(seg)) return '';
              return direction === 'ko-to-jp'
                ? seg[2] || ''
                : seg[3] || seg[2] || '';
            })
            .filter(Boolean)
            .join(' ')
            .trim();

          if (translatedText) {
            const finalJapanese = direction === 'ko-to-jp' ? translatedText : text;
            const matchedFurigana = japaneseToHiraganaReading(finalJapanese);
            const hasUnresolvedKanji = /[\u4e00-\u9faf]/.test(matchedFurigana);
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
              tip: '이 번역 결과는 기기 내부 오프라인 언어팩 캐시에 자동 추가되어 비행기 모드에서도 동일하게 작동합니다.',
            };

            setTranslationResult(liveOut);
            saveNeuralCache(text, direction, liveOut);
            setPackStats(getOfflinePackStats());
          }
        }
      } catch {
        // 오프라인 결과 유지
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
    if (!SpeechRecognitionClass) return;

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

  const filteredCorpus = PREBUILT_CORPUS.filter((c) => c.category === corpusCategory);

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
                  : '오프라인 언어팩 프리캐싱 완료'}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              내장 문장 {packStats.totalSentences}개 · 어휘 {packStats.totalVocabulary}개 기기 저장됨
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
            ) : (
              <>
                <Wifi className="w-3 h-3 text-emerald-500" /> 실시간 하이브리드
              </>
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
                className="absolute top-0 right-0 p-1 text-slate-300 hover:text-slate-500 cursor-pointer"
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
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {isTranslating
                  ? '번역 중...'
                  : translationResult.engineType === 'offline-pack'
                  ? '📦 오프라인 언어팩 엔진'
                  : translationResult.engineType === 'offline-neural-cache'
                  ? '💾 오프라인 캐시 메모리'
                  : '⚡ 실시간 번역 + 오프라인 저장됨'}
              </span>

              <div className="flex items-center gap-1.5">
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
              <div className="text-xs font-extrabold text-indigo-700">
                발음: [{translationResult.koreanPronunciation}]
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
          {['식당', '쇼핑', '호텔', '교통', '알레르기', '병원', '긴급'].map((cat) => (
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
          {filteredCorpus.map((item, idx) => (
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
          ))}
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
