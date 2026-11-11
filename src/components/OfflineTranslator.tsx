import React, { useState, useEffect } from 'react';
import {
  OFFLINE_EMERGENCY_PHRASES,
  EMERGENCY_CATEGORY_META,
  EmergencyCategory,
  EmergencyPhrase,
  translateOfflineSmart,
  saveTranslationToOfflineCache,
  OfflineTranslationResult,
} from '../data/offlineTranslatorData';
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
  Search,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface OfflineTranslatorProps {
  ttsSpeed: number;
  showFurigana?: boolean;
}

export const OfflineTranslator: React.FC<OfflineTranslatorProps> = ({
  ttsSpeed,
  showFurigana = true,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);
  const [direction, setDirection] = useState<'ko-to-jp' | 'jp-to-ko'>('ko-to-jp');
  const [inputText, setInputText] = useState<string>('');
  const [translationResult, setTranslationResult] =
    useState<OfflineTranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory | 'all'>('all');
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

    // 1. 고밀도 오프라인 구문 합성 엔진 + 로컬 캐시로 0.01초 만에 즉시 번역
    const offlineRes = translateOfflineSmart(text, direction);
    setTranslationResult(offlineRes);

    // 2. 브라우저 내장 온디바이스 신경망 번역기(Chrome Built-in Translator API) 지원 시 오프라인에서도 신경망 번역 시도
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const winAny = window as any;
    if (
      effectiveOffline &&
      offlineRes.engineType === 'offline-composed' &&
      (winAny.Translator || winAny.translation?.createTranslator)
    ) {
      try {
        const sl = direction === 'ko-to-jp' ? 'ko' : 'ja';
        const tl = direction === 'ko-to-jp' ? 'ja' : 'ko';
        const translator = winAny.Translator
          ? await winAny.Translator.create({ sourceLanguage: sl, targetLanguage: tl })
          : await winAny.translation.createTranslator({
              sourceLanguage: sl,
              targetLanguage: tl,
            });
        const onDeviceTranslated: string = await translator.translate(text);
        if (onDeviceTranslated) {
          const finalJp = direction === 'ko-to-jp' ? onDeviceTranslated : text;
          const nextRes: OfflineTranslationResult = {
            japanese: finalJp,
            furigana: japaneseToHiraganaReading(finalJp),
            koreanPronunciation: kanaToKoreanPronunciation(finalJp),
            koreanMeaning: direction === 'ko-to-jp' ? text : onDeviceTranslated,
            engineType: 'offline-cached',
            tip: '기기 내장 온디바이스 AI 번역 모델로 오프라인 번역되었습니다.',
          };
          setTranslationResult(nextRes);
          saveTranslationToOfflineCache(text, direction, nextRes);
          return;
        }
      } catch {
        // 온디바이스 모델 미설치 환경이면 이미 세팅된 오프라인 구문 합성 결과 유지
      }
    }

    // 3. 온라인 상태일 때: 오프라인 정확 매칭(offline-exact)이 아닌 자유 문장은 온라인 신경망 번역 + 1:1 발음 매칭으로 업그레이드 후 오프라인 캐시에 저장
    if (!effectiveOffline && offlineRes.engineType !== 'offline-exact') {
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

            // 한자 사전 기반 가나 변환을 최우선 사용하여 조사/어미 발음 정확도 보장, 미등록 한자가 있을 때만 로마자 보조 활용
            const hasUnresolvedKanji = /[\u4e00-\u9faf]/.test(matchedFurigana);
            const matchedKoreanPron =
              !hasUnresolvedKanji
                ? kanaToKoreanPronunciation(finalJapanese)
                : romajiSegments
                ? romajiToKoreanPronunciation(romajiSegments)
                : kanaToKoreanPronunciation(finalJapanese);

            const onlineRes: OfflineTranslationResult = {
              japanese: finalJapanese,
              furigana: matchedFurigana,
              koreanPronunciation: matchedKoreanPron,
              koreanMeaning: direction === 'ko-to-jp' ? text : translatedText,
              engineType: 'online-ai',
              tip: '한자 바로 위에 후리가나가 표시되며, 이 문장은 오프라인 캐시에 자동 저장되어 비행기 모드에서도 다시 쓸 수 있습니다!',
            };

            setTranslationResult(onlineRes);
            saveTranslationToOfflineCache(text, direction, onlineRes);
          }
        }
      } catch {
        // 네트워크 불안정 시 오프라인 결과 유지
      } finally {
        setIsTranslating(false);
      }
    }
  };

  // 음성 인식 (한국어 또는 일본어)
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

  const filteredPhrases: EmergencyPhrase[] =
    selectedCategory === 'all'
      ? OFFLINE_EMERGENCY_PHRASES
      : OFFLINE_EMERGENCY_PHRASES.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-5 pb-24">
      {/* 1. 상단 오프라인/온라인 상태 배너 */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {effectiveOffline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5" /> 오프라인 구문합성 엔진 작동 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <Wifi className="w-3.5 h-3.5" /> 온라인 신경망 + 오프라인 하이브리드
              </span>
            )}
          </div>

          <button
            onClick={() => setForceOfflineMode((prev) => !prev)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {forceOfflineMode ? '온라인 모드로 전환' : '✈️ 비행기모드 테스트'}
          </button>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-white">
            돌발상황 실시간 통번역 (한자 위 후리가나 지원)
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            모든 일본어 한자 바로 위에 <strong>읽는 법(후리가나)</strong>이 표시되어 읽기 연습까지 동시에 할 수 있습니다. <strong>200+ 어휘 구문 합성 엔진</strong>과 <strong>자동 오프라인 캐시</strong>로 비행기 모드에서도 자연스럽게 번역됩니다!
          </p>
        </div>
      </div>

      {/* 2. 실시간 양방향 번역 입력 박스 */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span
              className={
                direction === 'ko-to-jp' ? 'text-rose-400' : 'text-amber-400'
              }
            >
              {direction === 'ko-to-jp' ? '🇰🇷 한국어 입력' : '🇯🇵 일본어(점원 말) 입력'}
            </span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span
              className={
                direction === 'ko-to-jp' ? 'text-amber-400' : 'text-rose-400'
              }
            >
              {direction === 'ko-to-jp' ? '🇯🇵 일본어 변환' : '🇰🇷 한국어 의미'}
            </span>
          </div>

          <button
            onClick={() => {
              setDirection((d) => (d === 'ko-to-jp' ? 'jp-to-ko' : 'ko-to-jp'));
              setTranslationResult(null);
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ArrowRightLeft className="w-3 h-3" /> 방향 전환
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl border transition cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700'
            }`}
            title="음성으로 말해서 번역하기"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTranslate();
            }}
            placeholder={
              direction === 'ko-to-jp'
                ? '예: 생맥주 두 잔이랑 가라아게 주세요 / 얼음 빼주세요 / 체크아웃 후 짐 보관'
                : '점원이 말한 일본어나 안내문 텍스트 입력...'
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
          />

          <button
            onClick={() => handleTranslate()}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" /> 번역
          </button>
        </div>

        {/* 빠른 테스트 키워드 칩 (비행기 모드에서도 완벽 번역 확인 가능) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {[
            '생맥주 두 잔이랑 가라아게 주세요',
            '얼음 빼고 주세요',
            '예약 안 했는데 두 명 자리 있나요?',
            '체크아웃 후에 짐 맡길 수 있나요?',
            '시부야역까지 얼마나 걸리나요?',
            '새우 알레르기가 있어요',
            '따로 계산할 수 있나요?',
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setDirection('ko-to-jp');
                setInputText(sample);
                handleTranslate(sample);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 shrink-0 cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* 번역 결과 표시 카드 (한자 바로 위에 후리가나 루비 렌더링!) */}
        {translationResult && (
          <div className="mt-2 rounded-2xl bg-slate-950 border-2 border-rose-500/40 p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {isTranslating
                  ? '번역 중...'
                  : translationResult.engineType === 'online-ai'
                  ? '⚡ 실시간 신경망 번역 (오프라인 자동 캐시됨)'
                  : translationResult.engineType === 'offline-cached'
                  ? '💾 오프라인 캐시 복원 번역'
                  : '📦 오프라인 구문 합성 엔진 번역'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setBigScreenPhrase({
                      japanese: translationResult.japanese,
                      furigana: translationResult.furigana,
                      koreanPronunciation: translationResult.koreanPronunciation,
                      korean: translationResult.koreanMeaning,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> 큰 화면으로 보여주기
                </button>
                <button
                  onClick={() => speakJapanese(translationResult.japanese, ttsSpeed)}
                  className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  title="원어민 발음 듣기"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 한자 위에 후리가나가 올라간 메인 일본어 문장 */}
            <div className="pt-1">
              <FuriganaText
                text={translationResult.japanese}
                showFurigana={showFurigana}
                className="text-xl sm:text-2xl font-extrabold text-white"
                rtClassName="text-[11px] font-bold text-rose-300"
              />
            </div>

            {/* 전체 히라가나 & 1:1 매칭 한국어 발음 */}
            <div className="space-y-1 pt-1 border-t border-slate-900">
              <div className="text-xs text-slate-400">
                전체 히라가나: <span className="text-slate-200">{translationResult.furigana}</span>
              </div>
              <div className="text-xs font-bold text-amber-300">
                한국어 발음: [{translationResult.koreanPronunciation}]
              </div>
              <div className="text-sm font-semibold text-emerald-300 pt-0.5">
                의미: {translationResult.koreanMeaning}
              </div>
            </div>

            {translationResult.tip && (
              <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
                {translationResult.tip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 오프라인 6대 돌발상황 프리셋 카드 */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white">
            오프라인 100% 보장 · 여행 돌발상황 SOS 문장집
          </h3>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-950'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            전체 ({OFFLINE_EMERGENCY_PHRASES.length})
          </button>
          {(Object.keys(EMERGENCY_CATEGORY_META) as EmergencyCategory[]).map((cat) => {
            const meta = EMERGENCY_CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* 돌발상황 문장 리스트 */}
        <div className="space-y-3">
          {filteredPhrases.map((item) => {
            const meta = EMERGENCY_CATEGORY_META[item.category];
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${meta.color}`}>
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
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" /> 큰 화면 제시
                    </button>
                    <button
                      onClick={() => speakJapanese(item.japanese, ttsSpeed)}
                      className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm font-bold text-emerald-300">{item.korean}</div>

                {/* 한자 위에 후리가나가 올라간 일본어 문장 */}
                <div className="pt-1">
                  <FuriganaText
                    text={item.japanese}
                    showFurigana={showFurigana}
                    className="text-base sm:text-lg font-extrabold text-white"
                    rtClassName="text-[10px] font-semibold text-rose-300"
                  />
                </div>

                <div className="text-xs font-semibold text-amber-300">
                  [{item.koreanPronunciation}]
                </div>

                {/* 상대방 예상 답변 */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-300">
                  <div className="space-y-1">
                    <div>
                      <span className="font-bold text-sky-300">👂 점원/역무원 예상 답변: </span>
                      <FuriganaText
                        text={item.expectedReplyJp}
                        showFurigana={showFurigana}
                        className="font-semibold text-white"
                        rtClassName="text-[9px] text-sky-300"
                      />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      → {item.expectedReplyKo}
                    </div>
                  </div>
                  <button
                    onClick={() => speakJapanese(item.expectedReplyJp, ttsSpeed)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 cursor-pointer"
                    title="예상 답변 듣기"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 점원/역무원에게 바로 보여주는 전체화면 SOS 빅카드 모달 */}
      {bigScreenPhrase && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">
              🇯🇵 상대방에게 화면을 보여주세요 (Show to Staff)
            </span>
            <button
              onClick={() => setBigScreenPhrase(null)}
              className="p-2 rounded-2xl bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="my-auto space-y-6 text-center px-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              すみません、これを読んでいただけますか？
            </p>
            <div className="py-2">
              <FuriganaText
                text={bigScreenPhrase.japanese}
                showFurigana={true}
                className="text-3xl sm:text-4xl font-black text-white break-keep"
                rtClassName="text-xs font-bold text-rose-300"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="text-sm font-bold text-amber-300">
                내 발음 가이드: [{bigScreenPhrase.koreanPronunciation}]
              </div>
              <div className="text-sm text-emerald-300">{bigScreenPhrase.korean}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => speakJapanese(bigScreenPhrase.japanese, 0.95)}
              className="py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
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
