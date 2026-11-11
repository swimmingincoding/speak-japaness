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
  startJapaneseSpeechRecognition,
  calculateSimilarityScore,
  RecognitionHandle,
} from '../utils/speech';
import {
  japaneseToHiraganaReading,
  kanaToKoreanPronunciation,
} from '../utils/japanesePhonetics';
import { generatePartnerReply } from '../utils/aiService';
import { FuriganaText } from './FuriganaText';
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
} from 'lucide-react';

interface RolePlayRoomProps {
  scenario: Scenario;
  initialRole?: RoleType;
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
  const [mode, setMode] = useState<'guided' | 'freetalk'>('guided');

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

  const [freeMessages, setFreeMessages] = useState<FreeTalkMessage[]>([]);
  const [freeInput, setFreeInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, mode, userRole, scenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTurnIndex, freeMessages, isListening, speechResult]);

  useEffect(() => {
    return () => {
      stopSpeaking();
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

  const handleSendFreeTalk = async (textToSend?: string) => {
    const content = (textToSend ?? freeInput).trim();
    if (!content || isAiThinking) return;

    const userMsg: FreeTalkMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: userRole,
      japanese: content,
      furigana: japaneseToHiraganaReading(content),
      koreanPronunciation: kanaToKoreanPronunciation(content),
      koreanTranslation: '',
    };

    const nextHistory = [...freeMessages, userMsg];
    setFreeMessages(nextHistory);
    setFreeInput('');
    setIsAiThinking(true);

    const reply = await generatePartnerReply(
      scenario,
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
    let idx = 0;
    const playNext = () => {
      if (idx >= scenario.turns.length) return;
      const t = scenario.turns[idx];
      idx++;
      speakJapanese(t.japanese, displaySettings.ttsSpeed, () => {
        setTimeout(playNext, 450);
      });
    };
    playNext();
  };

  const visibleTurns = scenario.turns.slice(0, currentTurnIndex + 1);
  const lastFreePartnerMsg = [...freeMessages]
    .reverse()
    .find((m) => m.sender === 'partner');

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6FA]">
      {/* 1. 상단 스티키 컨트롤 헤더 (화이트 글래스) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              stopSpeaking();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center flex-1 truncate px-1">
            <h2 className="text-sm font-extrabold text-slate-900 truncate">
              {scenario.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {scenario.placeName}
            </p>
          </div>

          <button
            onClick={handlePlayAllDialogue}
            className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 px-3 rounded-xl cursor-pointer shrink-0"
          >
            <Play className="w-3 h-3 fill-current" /> 전체듣기
          </button>
        </div>

        {/* 역할 스왑 세그먼트 컨트롤 (손님 A ↔ 점원 B) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100">
          <button
            onClick={() => setUserRole('customer')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              userRole === 'customer'
                ? 'bg-white text-indigo-600 shadow-sm'
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
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              userRole === 'staff'
                ? 'bg-white text-amber-600 shadow-sm'
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

        {/* 학습 모드 스위치 & 표시 토글 칩 */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setMode('guided')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                mode === 'guided'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3 h-3" /> 가이드 대본
            </button>
            <button
              onClick={() => setMode('freetalk')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                mode === 'freetalk'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3 h-3" /> AI 프리토킹
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  showFurigana: !displaySettings.showFurigana,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border cursor-pointer ${
                displaySettings.showFurigana
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
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
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border cursor-pointer ${
                displaySettings.showKoreanPronunciation
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              한글발음
            </button>
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  showTranslation: !displaySettings.showTranslation,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border cursor-pointer ${
                displaySettings.showTranslation
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              한국어뜻
            </button>
            <button
              onClick={() =>
                onUpdateDisplay({
                  ...displaySettings,
                  ttsSpeed: displaySettings.ttsSpeed < 0.9 ? 1.0 : 0.78,
                })
              }
              className="px-2 py-1 rounded-lg text-[10.5px] font-extrabold bg-slate-100 text-slate-700 cursor-pointer"
            >
              {displaySettings.ttsSpeed < 0.9 ? '🐢0.78x' : '⚡1.0x'}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="px-4 pt-3 pb-32 flex-1 space-y-4">
        {/* 상황 요약 카드 */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 text-xs text-slate-600 shadow-2xs space-y-1.5">
          <div>
            <strong className="text-slate-900">📍 상황:</strong> {scenario.situationBrief}
          </div>
          {userRole === 'staff' && (
            <div className="text-amber-700 font-semibold bg-amber-50 px-3 py-2 rounded-xl">
              🧑‍🍳 지금은 <strong>점원(B) 역할</strong>입니다! 일본인 직원의 접객 경어를 직접 말하며 상대방의 패턴을 익혀보세요.
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 가이드 스크립트 모드 */}
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
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          turn.speaker === 'customer'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {turn.speaker === 'customer' ? '🙋‍♂️ 손님(A)' : '🧑‍🍳 점원(B)'}
                        {isMyRole ? ' · 나의 대사' : ''}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {idx + 1}/{scenario.turns.length}
                      </span>
                    </div>

                    <div
                      className={`w-full max-w-[94%] rounded-[24px] p-4 border transition shadow-sm ${
                        isMyRole
                          ? isCurrentActive
                            ? 'bg-indigo-50/70 border-2 border-indigo-500'
                            : 'bg-white border-indigo-200'
                          : isCurrentActive
                          ? 'bg-amber-50/60 border-2 border-amber-400'
                          : 'bg-white border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-1.5 flex-1">
                          <div>
                            <FuriganaText
                              text={turn.japanese}
                              showFurigana={displaySettings.showFurigana}
                              className="text-lg font-black text-slate-900"
                              rtClassName="text-[10.5px] font-bold text-indigo-600"
                            />
                          </div>

                          {displaySettings.showKoreanPronunciation && (
                            <div className="text-xs font-extrabold text-indigo-600 leading-relaxed">
                              [{turn.koreanPronunciation}]
                            </div>
                          )}

                          {displaySettings.showTranslation && (
                            <div className="text-sm font-bold text-slate-700 pt-0.5">
                              {turn.koreanTranslation}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              speakJapanese(turn.japanese, displaySettings.ttsSpeed)
                            }
                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer"
                            title="원어민 발음 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
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
                            className={`p-2 rounded-xl transition cursor-pointer ${
                              isSaved
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                            }`}
                            title="단어장에 저장"
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() =>
                            setExpandedTurnId(isExpanded ? null : turn.id)
                          }
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>원어민 뉘앙스 & 단어 풀이 ({turn.vocab.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => speakJapanese(turn.japanese, 0.72)}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 font-bold cursor-pointer"
                        >
                          🐢 천천히 듣기
                        </button>
                      </div>

                      {(isExpanded || isCurrentActive) && (
                        <div className="mt-2.5 space-y-2 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-xs">
                          <div className="text-slate-700 leading-relaxed">
                            <span className="font-extrabold text-indigo-600">💡 실전 팁: </span>
                            {turn.realLifeTip}
                          </div>

                          {turn.staffKeigoPoint && (
                            <div className="text-slate-700 leading-relaxed pt-1.5 border-t border-slate-200/70">
                              <span className="font-extrabold text-amber-700">
                                🛎️ 점원 접객어 비밀:{' '}
                              </span>
                              {turn.staffKeigoPoint}
                            </div>
                          )}

                          {turn.vocab.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200/70">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {turn.vocab.map((v, vIdx) => (
                                  <div
                                    key={vIdx}
                                    onClick={() => speakJapanese(v.word, 0.9)}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 cursor-pointer"
                                  >
                                    <div>
                                      <span className="font-extrabold text-slate-900">
                                        {v.word}
                                      </span>{' '}
                                      <span className="text-[11px] font-bold text-indigo-600">
                                        [{v.koreanPronunciation}]
                                      </span>
                                      <div className="text-[11px] text-slate-600 font-medium">
                                        {v.meaning}
                                      </div>
                                    </div>
                                    <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

            {/* 현재 진행 액션 카드 */}
            {!isFinished && currentTurn && (
              <div className="rounded-[26px] bg-white border-2 border-indigo-500/30 p-5 shadow-lg space-y-3.5">
                {currentTurn.speaker !== userRole ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                        🎧 상대방({currentTurn.speaker === 'staff' ? '점원' : '손님'})의 말을 듣고 이해해보세요
                      </span>
                      <button
                        onClick={() =>
                          speakJapanese(currentTurn.japanese, displaySettings.ttsSpeed)
                        }
                        className="text-xs font-extrabold text-indigo-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" /> 다시 듣기
                      </button>
                    </div>
                    <button
                      onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.99] transition cursor-pointer"
                    >
                      이해 완료! 내 대답 차례로 넘어가기 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        🎙️ 내가 말할 차례 ({userRole === 'customer' ? '손님 A' : '점원 B'})
                      </span>
                      <button
                        onClick={() =>
                          speakJapanese(
                            getActiveTargetPhrase(currentTurn).japanese,
                            displaySettings.ttsSpeed
                          )
                        }
                        className="text-xs font-extrabold text-indigo-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" /> 발음 먼저 듣기
                      </button>
                    </div>

                    {currentTurn.alternatives && currentTurn.alternatives.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500">
                          다른 스타일로 대답해보기:
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => setSelectedAltIndex(-1)}
                            className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                              selectedAltIndex === -1
                                ? 'bg-indigo-50/80 border-indigo-500 text-slate-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="font-extrabold">기본: {currentTurn.japanese}</div>
                            <div className="text-[11px] text-indigo-600 font-bold">
                              [{currentTurn.koreanPronunciation}]
                            </div>
                          </button>
                          {currentTurn.alternatives.map((alt, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => setSelectedAltIndex(aIdx)}
                              className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                                selectedAltIndex === aIdx
                                  ? 'bg-indigo-50/80 border-indigo-500 text-slate-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold">응용: {alt.japanese}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                  {alt.nuance}
                                </span>
                              </div>
                              <div className="text-[11px] text-indigo-600 font-bold mt-0.5">
                                [{alt.koreanPronunciation}] — {alt.koreanTranslation}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <FuriganaText
                        text={getActiveTargetPhrase(currentTurn).japanese}
                        showFurigana={displaySettings.showFurigana}
                        className="text-lg font-black text-slate-900"
                        rtClassName="text-[10.5px] font-bold text-indigo-600"
                      />
                      <div className="text-xs font-extrabold text-indigo-600">
                        [{getActiveTargetPhrase(currentTurn).koreanPronunciation}]
                      </div>
                    </div>

                    {(spokenTranscript || speechResult || speechError) && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
                        {spokenTranscript && (
                          <div>
                            <span className="text-slate-600 font-medium">인식된 발음: </span>
                            <span className="font-extrabold text-slate-900">
                              {spokenTranscript}
                            </span>
                          </div>
                        )}
                        {speechResult && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-emerald-800 font-bold">
                              {speechResult.feedback}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold">
                              {speechResult.score}점
                            </span>
                          </div>
                        )}
                        {speechError && (
                          <div className="text-rose-600 font-bold">{speechError}</div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={handleToggleMicGuided}
                        className={`py-3.5 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                          isListening
                            ? 'bg-rose-600 text-white animate-pulse shadow-md'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-4 h-4" /> 듣는 중...
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-rose-500" /> 마이크로 말하기
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setCurrentTurnIndex((prev) => prev + 1)}
                        className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> 다음 턴으로 →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 완료 카드 */}
            {isFinished && (
              <div className="rounded-[28px] bg-white border-2 border-indigo-500/30 p-6 text-center space-y-4 shadow-xl animate-fadeIn">
                <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  🎉 [{userRole === 'customer' ? '손님(A)' : '점원(B)'}] 역할 클리어!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                  이제 반대 역할로 바꿔서 대화해 보세요! 점원의 대사를 직접 입으로 말해보면 실제 일본 매장에서 상대방의 질문이 완벽하게 들립니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handleSwapRole}
                    className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    {userRole === 'customer'
                      ? '점원(B)으로 역할 바꿔 연습하기'
                      : '손님(A)으로 역할 바꿔 연습하기'}
                  </button>
                  <button
                    onClick={() => setMode('freetalk')}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    실전 AI 프리토킹 도전하기
                  </button>
                </div>

                <button
                  onClick={() => setCurrentTurnIndex(0)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 처음부터 다시 하기
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {/* ======================================================== */}
        {/* 실전 AI 프리토킹 모드 */}
        {/* ======================================================== */}
        {mode === 'freetalk' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-800">
                  🎯 프리토킹 미션 ({userRole === 'customer' ? '손님 A' : '점원 B'})
                </span>
              </div>
              <ul className="space-y-1 text-xs text-emerald-900 font-medium">
                {(userRole === 'customer'
                  ? scenario.freeTalkStarter.customerStarts.missions
                  : scenario.freeTalkStarter.staffStarts.missions
                ).map((m, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              {freeMessages.map((msg) => {
                const isUser = msg.sender === 'user';
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
                      className={`max-w-[92%] rounded-[24px] p-4 border space-y-1.5 shadow-xs ${
                        isUser
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <FuriganaText
                            text={msg.japanese}
                            showFurigana={displaySettings.showFurigana}
                            className={`text-base font-black ${
                              isUser ? 'text-white' : 'text-slate-900'
                            }`}
                            rtClassName={`text-[10px] font-bold ${
                              isUser ? 'text-indigo-200' : 'text-indigo-600'
                            }`}
                          />
                        </div>
                        <button
                          onClick={() =>
                            speakJapanese(msg.japanese, displaySettings.ttsSpeed)
                          }
                          className={`p-2 rounded-xl shrink-0 cursor-pointer ${
                            isUser
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      {displaySettings.showKoreanPronunciation &&
                        msg.koreanPronunciation && (
                          <div
                            className={`text-xs font-bold ${
                              isUser ? 'text-amber-200' : 'text-indigo-600'
                            }`}
                          >
                            [{msg.koreanPronunciation}]
                          </div>
                        )}
                      {displaySettings.showTranslation && msg.koreanTranslation && (
                        <div
                          className={`text-sm font-medium ${
                            isUser ? 'text-indigo-100' : 'text-slate-700'
                          }`}
                        >
                          {msg.koreanTranslation}
                        </div>
                      )}

                      {msg.correctionFeedback && (
                        <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                          ✨ <strong>회화 코칭:</strong> {msg.correctionFeedback}
                        </div>
                      )}
                      {msg.realLifeTip && (
                        <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                          💡 <strong>현지 표현 팁:</strong> {msg.realLifeTip}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isAiThinking && (
                <div className="text-xs font-bold text-slate-400 animate-pulse px-2">
                  상대방이 답변을 입력하고 있습니다...
                </div>
              )}
            </div>

            {/* 추천 답변 칩 + 입력창 */}
            <div className="rounded-[24px] bg-white border border-slate-200 p-4 space-y-3 shadow-lg">
              {lastFreePartnerMsg?.suggestedReplies &&
                lastFreePartnerMsg.suggestedReplies.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      💬 탭하면 바로 전송되는 추천 답변:
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {lastFreePartnerMsg.suggestedReplies.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendFreeTalk(sug.japanese)}
                          className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 text-xs transition cursor-pointer"
                        >
                          <div className="font-extrabold text-slate-900">
                            {sug.japanese}
                          </div>
                          <div className="text-[11px] text-indigo-600 font-bold">
                            [{sug.koreanPronunciation}] —{' '}
                            <span className="text-slate-600">{sug.koreanTranslation}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMicFreeTalk}
                  className={`p-3 rounded-xl transition cursor-pointer shrink-0 ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 text-indigo-600 hover:bg-slate-200'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="text"
                  value={freeInput}
                  onChange={(e) => setFreeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendFreeTalk();
                  }}
                  placeholder="일본어로 말하거나 직접 입력해보세요..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSendFreeTalk()}
                  disabled={!freeInput.trim() || isAiThinking}
                  className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={chatEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
