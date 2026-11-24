import React, { useState, useEffect, useRef } from 'react';
import {
  Scenario,
  RoleType,
  DisplaySettings,
  AIConfig,
  DialogueTurn,
  SavedExpression,
  FreeTalkMessage,
} from '../types/conversation';
import {
  speakJapanese,
  stopSpeaking,
  unlockSpeechForIOS,
  startJapaneseSpeechRecognition,
  calculateSimilarityScore,
  RecognitionHandle,
} from '../utils/speech';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
} from '../utils/japanesePhonetics';
import { executeOfflineTranslation } from '../utils/offlineEngine';
import { generatePartnerReply, generateCustomTopicOpening, translateWithAI } from '../utils/aiService';
import { CURATED_FREETALK_TOPICS, FreeTalkTopic, createCustomTopic } from '../data/freeTalkTopics';
import { FuriganaText } from './FuriganaText';
import { LiveCallModal } from './LiveCallModal';
import {
  ArrowLeft,
  ArrowLeftRight,
  Volume2,
  Mic,
  MicOff,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Send,
  Lightbulb,
  User,
  Store,
  ChevronDown,
  ChevronUp,
  Play,
  Volume1,
  Check,
  SlidersHorizontal,
  X,
  Plus,
  Phone,
  Square,
} from 'lucide-react';

interface RolePlayRoomProps {
  scenario: Scenario;
  initialRole?: RoleType;
  initialMode?: 'guided' | 'freetalk';
  displaySettings: DisplaySettings;
  onUpdateDisplay: (next: DisplaySettings) => void;
  aiConfig: AIConfig;
  savedIds: Set<string>;
  onToggleSave: (expr: SavedExpression) => void;
  completedRoles: { customer: boolean; staff: boolean };
  onMarkCompleted: (scenarioId: string, role: RoleType) => void;
  onBack: () => void;
}

export const RolePlayRoom: React.FC<RolePlayRoomProps> = ({
  scenario,
  initialRole = 'customer',
  initialMode = 'guided',
  displaySettings,
  onUpdateDisplay,
  aiConfig,
  savedIds,
  onToggleSave,
  completedRoles,
  onMarkCompleted,
  onBack,
}) => {
  const [userRole, setUserRole] = useState<RoleType>(initialRole);
  const [mode, setMode] = useState<'guided' | 'freetalk'>(initialMode);

  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [expandedTurnId, setExpandedTurnId] = useState<string | null>(null);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(-1);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [speechResult, setSpeechResult] = useState<{
    score: number;
    feedback: string;
  } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);

  const [freeMessages, setFreeMessages] = useState<FreeTalkMessage[]>([]);
  const [freeInput, setFreeInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [activeFreeTopic, setActiveFreeTopic] = useState<FreeTalkTopic | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [isChangingTopic, setIsChangingTopic] = useState<boolean>(false);

  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const playAllSessionRef = useRef<number>(0);
  const playAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPlayAll = () => {
    playAllSessionRef.current += 1;
    if (playAllTimerRef.current) {
      clearTimeout(playAllTimerRef.current);
      playAllTimerRef.current = null;
    }
    setIsPlayingAll(false);
    stopSpeaking();
  };

  const currentTurn: DialogueTurn | undefined = scenario.turns[currentTurnIndex];
  const isFinished = mode === 'guided' && currentTurnIndex >= scenario.turns.length;

  useEffect(() => {
    stopSpeaking();
    setCurrentTurnIndex(0);
    setSelectedAltIndex(-1);
    setSpokenTranscript('');
    setSpeechResult(null);
    setSpeechError(null);
    setExpandedTurnId(null);

    if (userRole === 'customer') {
      const opening = scenario.freeTalkStarter.customerStarts.staffOpening;
      setFreeMessages([
        {
          id: opening.id,
          sender: 'partner',
          role: 'staff',
          japanese: opening.japanese,
          furigana: opening.furigana,
          koreanPronunciation: opening.koreanPronunciation,
          koreanTranslation: opening.koreanTranslation,
          realLifeTip: opening.realLifeTip,
          suggestedReplies: scenario.turns
            .filter((t) => t.speaker === 'customer')
            .slice(0, 2)
            .map((t) => ({
              japanese: t.japanese,
              koreanPronunciation: t.koreanPronunciation,
              koreanTranslation: t.koreanTranslation,
            })),
        },
      ]);
    } else {
      const opening = scenario.freeTalkStarter.staffStarts.customerOpening;
      setFreeMessages([
        {
          id: opening.id,
          sender: 'partner',
          role: 'customer',
          japanese: opening.japanese,
          furigana: opening.furigana,
          koreanPronunciation: opening.koreanPronunciation,
          koreanTranslation: opening.koreanTranslation,
          realLifeTip: opening.realLifeTip,
          suggestedReplies: scenario.turns
            .filter((t) => t.speaker === 'staff')
            .slice(0, 2)
            .map((t) => ({
              japanese: t.japanese,
              koreanPronunciation: t.koreanPronunciation,
              koreanTranslation: t.koreanTranslation,
            })),
        },
      ]);
    }
  }, [userRole, scenario]);

  useEffect(() => {
    if (mode !== 'guided') return;
    if (currentTurnIndex >= scenario.turns.length) {
      onMarkCompleted(scenario.id, userRole);
      return;
    }

    const turn = scenario.turns[currentTurnIndex];
    setSelectedAltIndex(-1);
    setSpokenTranscript('');
    setSpeechResult(null);
    setSpeechError(null);

    if (turn.speaker !== userRole && displaySettings.autoPlayPartnerAudio) {
      const timer = setTimeout(() => {
        speakJapanese(turn.japanese, displaySettings.ttsSpeed);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, mode, userRole, scenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTurnIndex, freeMessages, isListening, speechResult]);

  useEffect(() => {
    return () => {
      stopPlayAll();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSwapRole = () => {
    setUserRole((prev) => (prev === 'customer' ? 'staff' : 'customer'));
  };

  const getActiveTargetPhrase = (turn: DialogueTurn) => {
    if (
      selectedAltIndex >= 0 &&
      turn.alternatives &&
      turn.alternatives[selectedAltIndex]
    ) {
      const alt = turn.alternatives[selectedAltIndex];
      return {
        japanese: alt.japanese,
        furigana: alt.furigana,
        koreanPronunciation: alt.koreanPronunciation,
        koreanTranslation: alt.koreanTranslation,
      };
    }
    return {
      japanese: turn.japanese,
      furigana: turn.furigana,
      koreanPronunciation: turn.koreanPronunciation,
      koreanTranslation: turn.koreanTranslation,
    };
  };

  const handleToggleMicGuided = () => {
    if (!currentTurn) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    setSpokenTranscript('');
    setSpeechResult(null);
    setIsListening(true);

    const target = getActiveTargetPhrase(currentTurn);

    const handle = startJapaneseSpeechRecognition(
      (transcript, isFinal) => {
        setSpokenTranscript(transcript);
        if (isFinal || transcript.length >= 2) {
          const result = calculateSimilarityScore(
            transcript,
            target.japanese,
            target.furigana
          );
          setSpeechResult(result);
        }
      },
      (errMsg) => {
        setSpeechError(errMsg);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    recognitionRef.current = handle;
  };

  const handleToggleMicFreeTalk = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    setIsListening(true);

    const handle = startJapaneseSpeechRecognition(
      (transcript) => {
        setFreeInput(transcript);
      },
      (errMsg) => {
        setSpeechError(errMsg);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    recognitionRef.current = handle;
  };

  const handleSelectFreeTalkTopic = async (topic: FreeTalkTopic) => {
    setActiveFreeTopic(topic);
    setIsChangingTopic(true);
    setIsTopicModalOpen(false);
    stopSpeaking();

    try {
      const openingData = await generateCustomTopicOpening(topic.title, userRole, aiConfig);
      const openingMsg: FreeTalkMessage = {
        id: `partner-opening-${Date.now()}`,
        sender: 'partner',
        role: userRole === 'customer' ? 'staff' : 'customer',
        japanese: openingData.japanese,
        furigana: openingData.furigana,
        koreanPronunciation: openingData.koreanPronunciation,
        koreanTranslation: openingData.koreanTranslation,
        realLifeTip: openingData.realLifeTip,
        suggestedReplies: openingData.suggestedReplies,
      };
      setFreeMessages([openingMsg]);
      if (displaySettings.autoPlayPartnerAudio) {
        speakJapanese(openingData.japanese, displaySettings.ttsSpeed);
      }
    } finally {
      setIsChangingTopic(false);
    }
  };

  const handleCreateCustomFreeTalkTopic = async (customTitle: string) => {
    const clean = customTitle.trim();
    if (!clean) return;
    const topic = createCustomTopic(clean, userRole);
    await handleSelectFreeTalkTopic(topic);
    setCustomTopicInput('');
  };

  const isGeminiActive =
    Boolean(aiConfig?.apiKey?.trim()) &&
    (aiConfig.provider === 'gemini' || aiConfig.apiKey.trim().startsWith('AIza'));

  const handleSendFreeTalk = async (textToSend?: string) => {
    const content = (textToSend ?? freeInput).trim();
    if (!content || isAiThinking) return;

    setIsAiThinking(true);

    const isKoreanInput = /[가-힣]/.test(content);
    let userJapanese = content;
    let userFurigana = japaneseToHiraganaReading(content);
    let userPronunciation = kanaToKoreanPronunciation(content);
    let userMeaning = content;

    if (isKoreanInput) {
      // 1순위: Gemini API 연결 시 Gemini 3.8 Flash로 고품질 번역
      const aiTrans = await translateWithAI(content, 'ko-to-jp', aiConfig);
      if (aiTrans && aiTrans.japanese) {
        userJapanese = aiTrans.japanese;
        userFurigana = aiTrans.furigana || japaneseToHiraganaReading(aiTrans.japanese);
        userPronunciation = aiTrans.koreanPronunciation || kanaToKoreanPronunciation(aiTrans.japanese);
        userMeaning = content;
      } else {
        // 2순위: 오프라인 스마트 번역 엔진
        const trans = executeOfflineTranslation(content, 'ko-to-jp');
        userJapanese = trans.japanese;
        userFurigana = trans.furigana;
        userPronunciation = trans.koreanPronunciation;
        userMeaning = content;
      }
    } else {
      const trans = executeOfflineTranslation(content, 'jp-to-ko');
      userMeaning = trans.koreanMeaning;
    }

    const userMsg: FreeTalkMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: userRole,
      japanese: userJapanese,
      furigana: userFurigana,
      koreanPronunciation: userPronunciation,
      koreanTranslation: userMeaning,
    };

    const nextHistory = [...freeMessages, userMsg];
    setFreeMessages(nextHistory);
    setFreeInput('');

    const currentScenarioContext: Scenario = activeFreeTopic
      ? {
          ...scenario,
          id: activeFreeTopic.id,
          title: activeFreeTopic.title,
          placeName: activeFreeTopic.category,
          situationBrief: activeFreeTopic.situationBrief,
          customerRoleName: activeFreeTopic.userRoleName,
          staffRoleName: activeFreeTopic.partnerRoleName,
        }
      : scenario;

    const reply = await generatePartnerReply(
      currentScenarioContext,
      userRole,
      nextHistory,
      content,
      aiConfig
    );

    const partnerRole: RoleType = userRole === 'customer' ? 'staff' : 'customer';
    const partnerMsg: FreeTalkMessage = {
      id: `partner-${Date.now()}`,
      sender: 'partner',
      role: partnerRole,
      japanese: reply.japanese,
      furigana: reply.furigana,
      koreanPronunciation: reply.koreanPronunciation,
      koreanTranslation: reply.koreanTranslation,
      realLifeTip: reply.realLifeTip,
      correctionFeedback: reply.correctionFeedback,
      suggestedReplies: reply.suggestedReplies,
    };

    setFreeMessages((prev) => [...prev, partnerMsg]);
    setIsAiThinking(false);

    if (displaySettings.autoPlayPartnerAudio) {
      speakJapanese(reply.japanese, displaySettings.ttsSpeed);
    }

    if (nextHistory.filter((m) => m.sender === 'user').length >= 2) {
      onMarkCompleted(scenario.id, userRole);
    }
  };

  const handlePlayAllDialogue = () => {
    if (isPlayingAll) {
      stopPlayAll();
      return;
    }
    unlockSpeechForIOS();
    const sessionId = ++playAllSessionRef.current;
    setIsPlayingAll(true);
    let idx = 0;

    const playNext = () => {
      if (playAllSessionRef.current !== sessionId) return;
      if (idx >= scenario.turns.length) {
        setIsPlayingAll(false);
        return;
      }
      const t = scenario.turns[idx];
      idx++;
      speakJapanese(t.japanese, displaySettings.ttsSpeed, () => {
        if (playAllSessionRef.current !== sessionId) return;
        playAllTimerRef.current = setTimeout(playNext, 420);
      });
    };
    playNext();
  };

  const visibleTurns = scenario.turns.slice(0, currentTurnIndex + 1);
  const lastFreePartnerMsg = [...freeMessages]
    .reverse()
    .find((m) => m.sender === 'partner');

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 1. 상단 모던 스티키 헤더 (아이폰 다이내믹 아일랜드 Safe Area 대응) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        {/* 네비게이션 & 제목 바 */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              stopPlayAll();
              onBack();
            }}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
            title="뒤로가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {scenario.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {scenario.placeName} · {scenario.turns.length}턴
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                stopPlayAll();
                unlockSpeechForIOS();
                setIsCallModalOpen(true);
              }}
              className="flex items-center gap-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-1.5 px-2.5 rounded-xl transition cursor-pointer shadow-sm shadow-emerald-500/20 active:scale-95"
              title="실시간 전화 통화형 음성 AI 롤플레잉"
            >
              <Phone className="w-3 h-3 fill-current" />
              <span>전화 통화</span>
            </button>
            <button
              onClick={handlePlayAllDialogue}
              className={`flex items-center gap-1 text-[11px] font-extrabold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
                isPlayingAll
                  ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
              }`}
              title={isPlayingAll ? '전체 듣기 정지' : '전체 대사 연속 듣기'}
            >
              {isPlayingAll ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">전체듣기</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowSettingsDrawer((prev) => !prev)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
                showSettingsDrawer
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="표시 및 음성 설정"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 역할 스위처 & 모드 토글 (모던 세그먼트 바) */}
        <div className="px-4 pb-2.5 pt-0.5 space-y-2">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/90 text-xs font-bold">
            <button
              onClick={() => setUserRole('customer')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                userRole === 'customer'
                  ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>손님(A) 역할</span>
              {completedRoles.customer && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>
            <button
              onClick={() => setUserRole('staff')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                userRole === 'staff'
                  ? 'bg-white text-amber-600 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>점원(B) 역할</span>
              {completedRoles.staff && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>
          </div>

          {/* 서브 컨트롤: 모드 탭 + 퀵 디스플레이 칩 */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => setMode('guided')}
                className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  mode === 'guided'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3 h-3" /> 가이드 대본
              </button>
              <button
                onClick={() => setMode('freetalk')}
                className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                  mode === 'freetalk'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3 h-3" /> AI 프리토킹
              </button>
            </div>

            {/* 빠른 토글 알약 (후리가나 / 한글발음 / 한국어뜻 / 속도) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() =>
                  onUpdateDisplay({
                    ...displaySettings,
                    showFurigana: !displaySettings.showFurigana,
                  })
                }
                className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
                  displaySettings.showFurigana
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
                title="한자 위 후리가나(요미가나) 표시 토글"
              >
                후리가나
              </button>
              <button
                onClick={() =>
                  onUpdateDisplay({
                    ...displaySettings,
                    showKoreanPronunciation: !displaySettings.showKoreanPronunciation,
                  })
                }
                className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
                  displaySettings.showKoreanPronunciation
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
                title="한글 발음 표시 토글"
              >
                발음
              </button>
              <button
                onClick={() =>
                  onUpdateDisplay({
                    ...displaySettings,
                    showTranslation: !displaySettings.showTranslation,
                  })
                }
                className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
                  displaySettings.showTranslation
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
                title="한국어 번역 해석 표시 토글"
              >
                번역
              </button>
              <button
                onClick={() =>
                  onUpdateDisplay({
                    ...displaySettings,
                    ttsSpeed: displaySettings.ttsSpeed < 0.9 ? 1.0 : 0.78,
                  })
                }
                className="px-2 py-1 rounded-lg text-[10.5px] font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                title="음성 읽기 속도"
              >
                {displaySettings.ttsSpeed < 0.9 ? '🐢 0.8x' : '⚡ 1.0x'}
              </button>
            </div>
          </div>
        </div>

        {/* 상세 옵션 드로어 (설정 버튼 클릭 시 펼쳐짐) */}
        {showSettingsDrawer && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={displaySettings.autoPlayPartnerAudio}
                onChange={(e) =>
                  onUpdateDisplay({
                    ...displaySettings,
                    autoPlayPartnerAudio: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>상대방 대사 시 음성 자동 재생</span>
            </label>

            <span className="text-[11px] text-slate-400">
              카드를 탭하여 상세 뉘앙스와 단어를 볼 수 있습니다.
            </span>
          </div>
        )}
      </div>

      {/* 2. 메인 대화 영역 */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-3xl mx-auto w-full pb-64">
        {/* 미니 상황 안내 배너 */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 text-xs text-slate-600 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span>📍 상황 요약:</span>
            <span className="font-medium text-slate-700">{scenario.situationBrief}</span>
          </div>
          {userRole === 'staff' && (
            <div className="text-amber-800 font-bold bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/50 flex items-center gap-1.5 mt-1">
              <span>🧑‍🍳</span>
              <span>지금은 점원(B) 차례입니다! 고객을 대하는 정중한 일본어 접객 표현을 익혀보세요.</span>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 모드 1: 가이드 대본 모드 */}
        {/* ======================================================== */}
        {mode === 'guided' && (
          <div className="space-y-4">
            <div className="space-y-3.5">
              {visibleTurns.map((turn, idx) => {
                const isMyRole = turn.speaker === userRole;
                const isCurrentActive = idx === currentTurnIndex && !isFinished;
                const isSaved = savedIds.has(turn.id);
                const isExpanded = expandedTurnId === turn.id;

                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${
                      isMyRole ? 'items-end' : 'items-start'
                    } animate-fadeIn`}
                  >
                    {/* 발화자 태그 */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          turn.speaker === 'customer'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {turn.speaker === 'customer' ? '🙋‍♂️ 손님(A)' : '🧑‍🍳 점원(B)'}
                        {isMyRole ? ' · 나' : ' · 파트너'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {idx + 1}/{scenario.turns.length}
                      </span>
                    </div>

                    {/* 대화 말풍선 */}
                    <div
                      className={`w-full max-w-[92%] sm:max-w-[85%] rounded-[24px] p-4.5 border transition shadow-xs ${
                        isMyRole
                          ? isCurrentActive
                            ? 'bg-indigo-50/90 border-2 border-indigo-500 rounded-tr-sm ring-4 ring-indigo-500/10'
                            : 'bg-indigo-50/40 border-indigo-200 rounded-tr-sm'
                          : isCurrentActive
                          ? 'bg-amber-50/80 border-2 border-amber-400 rounded-tl-sm ring-4 ring-amber-400/10'
                          : 'bg-white border-slate-200/90 rounded-tl-sm'
                      }`}
                    >
                      {/* 일본어 원문 + Furigana */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <FuriganaText
                              text={turn.japanese}
                              showFurigana={displaySettings.showFurigana}
                              className="text-lg sm:text-xl font-black text-slate-900 leading-relaxed"
                              rtClassName="text-[11px] font-bold text-indigo-600"
                            />
                          </div>
                        </div>

                        {/* 한글 발음 */}
                        {displaySettings.showKoreanPronunciation && (
                          <div className="text-xs sm:text-sm font-extrabold text-indigo-600">
                            [{turn.koreanPronunciation}]
                          </div>
                        )}

                        {/* 한국어 번역 */}
                        {displaySettings.showTranslation && (
                          <div className="text-sm font-semibold text-slate-700 pt-0.5">
                            {turn.koreanTranslation}
                          </div>
                        )}
                      </div>

                      {/* 말풍선 하단 마이크로 툴바 */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        {/* 원어민 뉘앙스 & 단어 토글 버튼 */}
                        <button
                          onClick={() =>
                            setExpandedTurnId(isExpanded ? null : turn.id)
                          }
                          className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 transition"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>해설 & 단어 ({turn.vocab.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* 음성 및 북마크 액션 */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              speakJapanese(turn.japanese, displaySettings.ttsSpeed)
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition cursor-pointer"
                            title="음성 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => speakJapanese(turn.japanese, 0.72)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer text-[11px] font-bold"
                            title="천천히 듣기 (0.72x)"
                          >
                            🐢
                          </button>
                          <button
                            onClick={() =>
                              onToggleSave({
                                id: turn.id,
                                scenarioId: scenario.id,
                                scenarioTitle: scenario.title,
                                speaker: turn.speaker,
                                japanese: turn.japanese,
                                furigana: turn.furigana,
                                koreanPronunciation: turn.koreanPronunciation,
                                koreanTranslation: turn.koreanTranslation,
                                realLifeTip: turn.realLifeTip,
                                savedAt: new Date().toISOString(),
                              })
                            }
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSaved
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                            }`}
                            title="단어장에 보관"
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 확장 영역: 실전 팁 & 접객어 포인트 & 단어 사전 */}
                      {(isExpanded || isCurrentActive) && (
                        <div className="mt-3 space-y-2.5 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200 text-xs animate-fadeIn">
                          <div className="text-slate-700 leading-relaxed">
                            <span className="font-extrabold text-indigo-600">💡 실전 팁: </span>
                            {turn.realLifeTip}
                          </div>

                          {turn.staffKeigoPoint && (
                            <div className="text-slate-700 leading-relaxed pt-2 border-t border-slate-200">
                              <span className="font-extrabold text-amber-700">
                                🛎️ 점원 접객어 비밀:{' '}
                              </span>
                              {turn.staffKeigoPoint}
                            </div>
                          )}

                          {turn.vocab.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                                📚 핵심 단어장:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {turn.vocab.map((v, vIdx) => (
                                  <div
                                    key={vIdx}
                                    onClick={() => speakJapanese(v.word, 0.9)}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition cursor-pointer"
                                  >
                                    <div>
                                      <span className="font-black text-slate-900">
                                        {v.word}
                                      </span>{' '}
                                      <span className="text-[11px] font-bold text-indigo-600">
                                        [{v.koreanPronunciation}]
                                      </span>
                                      <div className="text-[11px] text-slate-600 font-medium">
                                        {v.meaning}
                                      </div>
                                    </div>
                                    <Volume1 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 시나리오 완료 카드 */}
            {isFinished && (
              <div className="rounded-[28px] bg-white border-2 border-indigo-500/30 p-6 text-center space-y-4 shadow-xl animate-fadeIn">
                <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  🎉 [{userRole === 'customer' ? '손님(A)' : '점원(B)'}] 역할 완주!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  이제 반대 역할로 바꿔서 대화해 보세요! 점원의 대사를 직접 말해보면 일본 현지에서 상대방의 빠른 대사가 거짓말처럼 또렷하게 들립니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={handleSwapRole}
                    className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-[0.99]"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    {userRole === 'customer'
                      ? '점원(B)으로 역할 바꿔 연습하기'
                      : '손님(A)으로 역할 바꿔 연습하기'}
                  </button>
                  <button
                    onClick={() => setMode('freetalk')}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-[0.99]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    실전 AI 프리토킹 도전하기
                  </button>
                </div>

                <button
                  onClick={() => setCurrentTurnIndex(0)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 pt-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 처음부터 다시 하기
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {/* ======================================================== */}
        {/* 모드 2: 실전 AI 프리토킹 모드 */}
        {/* ======================================================== */}
        {mode === 'freetalk' && (
          <div className="space-y-4">
            {/* 인터랙티브 대화 주제 배너 & 상황 선택기 */}
            <div className="rounded-[26px] bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-4.5 text-white shadow-md shadow-emerald-900/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black text-emerald-100">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{activeFreeTopic ? activeFreeTopic.category : '시나리오 연계 대화'}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                    isGeminiActive
                      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                      : 'bg-black/20 text-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isGeminiActive ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{isGeminiActive ? 'Gemini 3.8 Flash 활성화' : '오프라인 시뮬레이션'}</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsTopicModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-black shadow-xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>주제 선택 & 직접 입력 ▾</span>
                </button>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black leading-snug tracking-tight">
                  {activeFreeTopic ? activeFreeTopic.title : scenario.title}
                </h3>
                <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                  {activeFreeTopic ? activeFreeTopic.situationBrief : scenario.situationBrief}
                </p>
              </div>

              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100/90 font-semibold">
                <span>
                  대화 상대: <strong className="text-white">{activeFreeTopic ? activeFreeTopic.partnerRoleName : (userRole === 'customer' ? scenario.staffRoleName : scenario.customerRoleName)}</strong>
                </span>
                <span>
                  내 역할: <strong className="text-amber-300">{userRole === 'customer' ? '손님(A)' : '점원(B)'}</strong>
                </span>
              </div>
            </div>

            {isChangingTopic && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center text-xs text-slate-600 font-bold animate-pulse">
                새로운 대화 주제로 원어민 파트너를 준비하고 있습니다...
              </div>
            )}

            {/* 메시지 리스트 */}
            <div className="space-y-3">
              {freeMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isFreeSaved = savedIds.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[11px] font-bold text-slate-400 mb-1 px-1">
                      {msg.role === 'customer' ? '🙋‍♂️ 손님(A)' : '🧑‍🍳 점원(B)'}
                      {isUser ? ' · 나' : ' · 파트너'}
                    </span>
                    <div
                      className={`max-w-[92%] sm:max-w-[85%] rounded-[24px] p-4 border space-y-1.5 shadow-xs ${
                        isUser
                          ? 'bg-indigo-600 border-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white border-slate-200 text-slate-900 rounded-tl-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 whitespace-pre-wrap">
                          <FuriganaText
                            text={msg.japanese}
                            showFurigana={displaySettings.showFurigana}
                            className={`text-base sm:text-lg font-black whitespace-pre-wrap ${
                              isUser ? 'text-white' : 'text-slate-900'
                            }`}
                            rtClassName={`text-[10px] font-bold ${
                              isUser ? 'text-indigo-200' : 'text-indigo-600'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              speakJapanese(msg.japanese, displaySettings.ttsSpeed)
                            }
                            className={`p-1.5 rounded-lg cursor-pointer transition ${
                              isUser
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="발음 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onToggleSave({
                                id: msg.id,
                                scenarioId: activeFreeTopic ? activeFreeTopic.id : scenario.id,
                                scenarioTitle: activeFreeTopic ? activeFreeTopic.title : scenario.title,
                                speaker: msg.role,
                                japanese: msg.japanese,
                                furigana: msg.furigana || msg.japanese,
                                koreanPronunciation: msg.koreanPronunciation,
                                koreanTranslation: msg.koreanTranslation,
                                realLifeTip: msg.realLifeTip || msg.correctionFeedback || 'AI 프리토킹에서 저장한 실전 회화 표현입니다.',
                                savedAt: new Date().toISOString(),
                              })
                            }
                            className={`p-1.5 rounded-lg cursor-pointer transition ${
                              isFreeSaved
                                ? isUser
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                                : isUser
                                ? 'bg-white/15 hover:bg-white/25 text-indigo-100'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                            }`}
                            title="단어장에 보관"
                          >
                            {isFreeSaved ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {displaySettings.showKoreanPronunciation &&
                        msg.koreanPronunciation && (
                          <div
                            className={`text-xs font-bold whitespace-pre-wrap ${
                              isUser ? 'text-amber-200' : 'text-indigo-600'
                            }`}
                          >
                            [{msg.koreanPronunciation}]
                          </div>
                        )}
                      {displaySettings.showTranslation && msg.koreanTranslation && (
                        <div
                          className={`text-sm font-medium whitespace-pre-wrap ${
                            isUser ? 'text-indigo-100' : 'text-slate-700'
                          }`}
                        >
                          {msg.koreanTranslation}
                        </div>
                      )}

                      {msg.correctionFeedback && (
                        <div
                          className={`mt-2 p-3 rounded-xl border text-xs leading-relaxed ${
                            isUser
                              ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-50'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                          }`}
                        >
                          ✨ <strong className={isUser ? 'text-white' : 'text-emerald-800'}>회화 코칭:</strong>{' '}
                          {msg.correctionFeedback}
                        </div>
                      )}
                      {msg.realLifeTip && (
                        <div
                          className={`mt-1 p-3 rounded-xl border text-xs leading-relaxed ${
                            isUser
                              ? 'bg-white/15 border-white/20 text-indigo-50'
                              : 'bg-amber-50/70 border-amber-200/80 text-slate-700'
                          }`}
                        >
                          💡 <strong className={isUser ? 'text-amber-200' : 'text-amber-800'}>현지 표현 팁:</strong>{' '}
                          {msg.realLifeTip}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isAiThinking && (
                <div className="text-xs font-bold text-slate-400 animate-pulse px-2 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>상대방이 답변을 입력하고 있습니다...</span>
                </div>
              )}
            </div>

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. 하단 고정 액션 컨트롤러 (현대적 모바일 플로팅 독) */}
      {/* ======================================================== */}
      {mode === 'guided' && !isFinished && currentTurn && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,16px)+0.6rem)]">
          <div className="w-full space-y-2.5">
            {/* Case A: 파트너 턴일 때 (상대방의 말을 듣고 이해) */}
            {currentTurn.speaker !== userRole ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                    🎧 {currentTurn.speaker === 'staff' ? '점원' : '손님'}의 말을 듣고 확인하세요
                  </span>
                  <button
                    onClick={() =>
                      speakJapanese(currentTurn.japanese, displaySettings.ttsSpeed)
                    }
                    className="text-xs font-extrabold text-indigo-600 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Volume2 className="w-4 h-4" /> 다시 듣기
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => speakJapanese(currentTurn.japanese, 0.72)}
                    className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer shrink-0"
                    title="천천히 듣기"
                  >
                    🐢 0.7x
                  </button>
                  <button
                    onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>이해 완료! 내 차례로 넘어가기</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Case B: 나의 턴일 때 (발음 연습 및 음성 인식) */
              <div className="space-y-2">
                {/* 상단 턴 안내 및 다른 표현 알약 셀렉터 */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    🎙️ 내가 말할 차례 ({userRole === 'customer' ? '손님 A' : '점원 B'})
                  </span>

                  <button
                    onClick={() =>
                      speakJapanese(
                        getActiveTargetPhrase(currentTurn).japanese,
                        displaySettings.ttsSpeed
                      )
                    }
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> 모범 발음
                  </button>
                </div>

                {/* 응용 표현이 있을 경우 가로 스와이프 알약 탭 */}
                {currentTurn.alternatives && currentTurn.alternatives.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      onClick={() => setSelectedAltIndex(-1)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 transition cursor-pointer ${
                        selectedAltIndex === -1
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      기본 표현
                    </button>
                    {currentTurn.alternatives.map((alt, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => setSelectedAltIndex(aIdx)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                          selectedAltIndex === aIdx
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{alt.nuance}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 발화 타겟 요약 카드 */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 text-sm truncate">
                      {getActiveTargetPhrase(currentTurn).japanese}
                    </div>
                    <div className="text-[11px] font-extrabold text-indigo-600 truncate">
                      [{getActiveTargetPhrase(currentTurn).koreanPronunciation}]
                    </div>
                  </div>

                  {speechResult && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shrink-0 animate-scaleIn">
                      {speechResult.score}점
                    </span>
                  )}
                </div>

                {/* 실시간 음성 피드백 */}
                {(spokenTranscript || speechError) && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs flex items-center justify-between gap-2">
                    {spokenTranscript && (
                      <span className="text-slate-800 font-bold truncate">
                        인식: "{spokenTranscript}"
                      </span>
                    )}
                    {speechError && (
                      <span className="text-rose-600 font-bold">{speechError}</span>
                    )}
                    {speechResult && (
                      <span className="text-emerald-700 font-extrabold text-[11px] shrink-0">
                        {speechResult.feedback}
                      </span>
                    )}
                  </div>
                )}

                {/* 하단 버튼 2개: 마이크로 말하기 + 다음 턴 */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    onClick={handleToggleMicGuided}
                    className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" /> 듣는 중 (탭해서 중지)
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-rose-500" /> 마이크로 말하기
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                    className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-[0.99] transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> 다음 턴으로 →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FreeTalk Mode 전용 하단 고정 입력창 */}
      {mode === 'freetalk' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,16px)+0.6rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <div className="w-full space-y-2">
            {/* 추천 답변 칩 */}
            {lastFreePartnerMsg?.suggestedReplies &&
              lastFreePartnerMsg.suggestedReplies.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    추천 답변:
                  </span>
                  {lastFreePartnerMsg.suggestedReplies.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendFreeTalk(sug.japanese)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-xs font-bold text-slate-700 hover:text-indigo-700 shrink-0 transition cursor-pointer whitespace-nowrap"
                    >
                      {sug.japanese} ({sug.koreanTranslation})
                    </button>
                  ))}
                </div>
              )}

            <div className="flex items-end gap-2">
              <button
                onClick={handleToggleMicFreeTalk}
                className={`p-3 rounded-2xl transition cursor-pointer shrink-0 mb-0.5 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 text-indigo-600 hover:bg-slate-200'
                }`}
                title="음성으로 말하기"
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <textarea
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    handleSendFreeTalk();
                  }
                }}
                rows={1}
                placeholder="일본어로 말하거나 한국어로 입력해보세요... (Shift+Enter 줄바꿈)"
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-medium resize-none max-h-28 min-h-[44px] leading-relaxed no-scrollbar"
              />
              <button
                onClick={() => handleSendFreeTalk()}
                disabled={!freeInput.trim() || isAiThinking}
                className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold cursor-pointer shrink-0 transition active:scale-95 mb-0.5"
                title="보내기 (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* 4. AI 프리토킹 대화 주제 선택 & 사용자 직접 입력 모달 */}
      {/* ======================================================== */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-[480px] bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* 모달 상단 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI 프리토킹 대화 주제 선택</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  원하는 대화 상황을 직접 입력하거나 인기 주제에서 골라보세요.
                </p>
              </div>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 본문 (스크롤) */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* 섹션 1: 사용자가 직접 대화 주제 입력하기 */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>대화 상황 직접 입력하기</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCustomFreeTalkTopic(customTopicInput);
                    }}
                    placeholder="예: 이자카야에서 옆자리 사람과 애니메이션 이야기하기..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  />

                  {/* 빠른 추천 입력 칩 */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '이자카야에서 옆자리 사람과 애니 이야기',
                      '시부야 카페에서 옆사람과 여행 수다',
                      '디즈니랜드에서 잃어버린 가방 찾기',
                      '약국에서 알레르기 비염약 사기',
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomTopicInput(chip)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-emerald-800 border border-emerald-200 font-bold transition cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCreateCustomFreeTalkTopic(customTopicInput)}
                    disabled={!customTopicInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs shadow-sm transition cursor-pointer active:scale-[0.99]"
                  >
                    이 주제로 AI와 대화 시작 🚀
                  </button>
                </div>
              </div>

              {/* 섹션 2: 인기 대화 주제 큰 틀 (카테고리별 큐레이션) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">
                    인기 대화 상황 큰 틀에서 고르기
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {CURATED_FREETALK_TOPICS.length}개 준비됨
                  </span>
                </div>

                <div className="space-y-2.5">
                  {CURATED_FREETALK_TOPICS.map((topic) => {
                    const isCurrent = activeFreeTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectFreeTalkTopic(topic)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{topic.categoryEmoji}</span>
                            <span className="text-[11px] font-black text-emerald-700">
                              {topic.category}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                            상대: {topic.partnerRoleName}
                          </span>
                        </div>

                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {topic.title}
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {topic.situationBrief}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 실시간 전화 통화형 음성 AI 롤플레잉 모달 */}
      <LiveCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        scenario={scenario}
        userRole={userRole}
        aiConfig={aiConfig}
        ttsSpeed={displaySettings.ttsSpeed}
        onSaveExpression={onToggleSave}
        onCallCompleted={() => onMarkCompleted(scenario.id, userRole)}
      />
    </div>
  );
};
