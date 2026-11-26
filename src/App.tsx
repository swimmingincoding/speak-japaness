import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Scenario,
  RoleType,
  DisplaySettings,
  AIConfig,
  SavedExpression,
} from './types/conversation';
import { SCENARIOS } from './data/scenarios';
import { ScenarioList } from './components/ScenarioList';
import { OfflineTranslator } from './components/OfflineTranslator';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { stopSpeaking } from './utils/speech';
import { loadUserStreak, recordStudyCompletion } from './utils/srsEngine';
import {
  Headphones,
  Bookmark,
  SlidersHorizontal,
  MessageSquareText,
  Languages,
  GraduationCap,
  Loader2,
  Flame,
} from 'lucide-react';

// 성능 최적화: 코드 스플리팅으로 초기 번들 다운로드 용량을 줄이고 탭 전환 시 온디맨드 로딩
const RolePlayRoom = lazy(() =>
  import('./components/RolePlayRoom').then((m) => ({ default: m.RolePlayRoom }))
);
const KeigoGuide = lazy(() =>
  import('./components/KeigoGuide').then((m) => ({ default: m.KeigoGuide }))
);
const SavedExpressions = lazy(() =>
  import('./components/SavedExpressions').then((m) => ({ default: m.SavedExpressions }))
);
const N3StudyRoom = lazy(() =>
  import('./components/N3StudyRoom').then((m) => ({ default: m.N3StudyRoom }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const CustomScenarioModal = lazy(() =>
  import('./components/CustomScenarioModal').then((m) => ({ default: m.CustomScenarioModal }))
);
const YenCalculatorModal = lazy(() =>
  import('./components/YenCalculatorModal').then((m) => ({ default: m.YenCalculatorModal }))
);
const TravelCheatSheetModal = lazy(() =>
  import('./components/TravelCheatSheetModal').then((m) => ({ default: m.TravelCheatSheetModal }))
);
const CameraMenuScannerModal = lazy(() =>
  import('./components/CameraMenuScannerModal').then((m) => ({ default: m.CameraMenuScannerModal }))
);
const DailyReviewModal = lazy(() =>
  import('./components/DailyReviewModal').then((m) => ({ default: m.DailyReviewModal }))
);

const TabLoadingFallback = () => (
  <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 animate-fadeIn">
    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    <span className="text-xs font-bold">콘텐츠 준비 중...</span>
  </div>
);

const STORAGE_KEYS = {
  DISPLAY: 'tabitalk_display_settings_v1',
  AI: 'tabitalk_ai_config_v1',
  SAVED: 'tabitalk_saved_expressions_v1',
  COMPLETED: 'tabitalk_completed_roles_v1',
  N3_MASTERED: 'tabitalk_n3_mastered_v1',
  CUSTOM_SCENARIOS: 'tabitalk_custom_scenarios_v1',
};

type MainTab = 'scenarios' | 'translator' | 'n3' | 'keigo' | 'saved';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedInitialRole, setSelectedInitialRole] = useState<RoleType>('customer');
  const [selectedInitialMode, setSelectedInitialMode] = useState<'guided' | 'freetalk'>('guided');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isYenCalculatorOpen, setIsYenCalculatorOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState<boolean>(false);
  const [streakData, setStreakData] = useState(() => loadUserStreak());

  const [customScenarios, setCustomScenarios] = useState<Scenario[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISPLAY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {
      showFurigana: true,
      showKoreanPronunciation: true,
      showTranslation: true,
      ttsSpeed: 1.0,
      autoPlayPartnerAudio: true,
    };
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AI);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {
      provider: 'simulation',
      apiKey: '',
      model: '',
    };
  });

  const [savedExpressions, setSavedExpressions] = useState<SavedExpression[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  const [completedMap, setCompletedMap] = useState<
    Record<string, { customer: boolean; staff: boolean }>
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  });

  const [n3MasteredList, setN3MasteredList] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.N3_MASTERED);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISPLAY, JSON.stringify(displaySettings));
  }, [displaySettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AI, JSON.stringify(aiConfig));
  }, [aiConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(savedExpressions));
  }, [savedExpressions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(completedMap));
  }, [completedMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.N3_MASTERED, JSON.stringify(n3MasteredList));
  }, [n3MasteredList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(customScenarios));
  }, [customScenarios]);

  const allScenarios = [...customScenarios, ...SCENARIOS];
  const savedIds = new Set(savedExpressions.map((s) => s.id));
  const n3MasteredSet = new Set(n3MasteredList);

  const handleCreateCustomScenario = (newScenario: Scenario) => {
    setCustomScenarios((prev) => [newScenario, ...prev]);
    setSelectedInitialRole('customer');
    setSelectedScenario(newScenario);
  };

  const handleDeleteCustomScenario = (id: string) => {
    setCustomScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleSave = (expr: SavedExpression) => {
    setSavedExpressions((prev) => {
      const exists = prev.some((item) => item.id === expr.id);
      if (exists) {
        return prev.filter((item) => item.id !== expr.id);
      }
      return [expr, ...prev];
    });
  };

  const handleRemoveSaved = (id: string) => {
    setSavedExpressions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMarkCompleted = (scenarioId: string, role: RoleType) => {
    setCompletedMap((prev) => {
      const current = prev[scenarioId] || { customer: false, staff: false };
      return {
        ...prev,
        [scenarioId]: {
          ...current,
          [role]: true,
        },
      };
    });
    // 롤플레잉 완주 시 오늘의 연속 학습 스트릭 자동 달성 반영
    setStreakData(recordStudyCompletion(true));
  };

  const handleToggleN3Mastered = (wordId: string) => {
    setN3MasteredList((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
    setStreakData(recordStudyCompletion(false));
  };

  const handleReloadRestoredData = () => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (savedRaw) setSavedExpressions(JSON.parse(savedRaw));
      const compRaw = localStorage.getItem(STORAGE_KEYS.COMPLETED);
      if (compRaw) setCompletedMap(JSON.parse(compRaw));
      const n3Raw = localStorage.getItem(STORAGE_KEYS.N3_MASTERED);
      if (n3Raw) setN3MasteredList(JSON.parse(n3Raw));
      const custRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      if (custRaw) setCustomScenarios(JSON.parse(custRaw));
      const dispRaw = localStorage.getItem(STORAGE_KEYS.DISPLAY);
      if (dispRaw) setDisplaySettings(JSON.parse(dispRaw));
      setStreakData(loadUserStreak());
    } catch {
      // ignore
    }
  };

  const handleSwitchTab = (tab: MainTab) => {
    stopSpeaking();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] text-slate-900 flex justify-center">
      {/* 모바일 앱 컨테이너 (아이폰 16 프로 6.3인치 및 모던 스마트폰 최적화) */}
      <div className="w-full max-w-[480px] min-h-screen bg-[#F7F9FC] shadow-2xl shadow-slate-300/60 flex flex-col relative">
        {/* 상단 모던 앱 바 (다이내믹 아일랜드 Safe Area 대응) */}
        {!selectedScenario && (
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center justify-between">
            <div
              onClick={() => handleSwitchTab('scenarios')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/25 text-white font-black text-lg">
                旅
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[17px] tracking-tight text-slate-900">
                    TabiTalk
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                    타비토크
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  손님 ↔ 점원 양방향 일본어 회화
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsDailyReviewOpen(true)}
                className="px-2 sm:px-2.5 py-2 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200/80 flex items-center gap-1 text-slate-800 transition cursor-pointer shadow-2xs group"
                title="망각곡선 일일 복습 & 연속 학습 스트릭"
              >
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 group-hover:scale-110 transition" />
                <span className="text-xs font-black text-orange-950">
                  {streakData.currentStreak}일
                </span>
              </button>

              <button
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-2 sm:px-2.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 flex items-center gap-1 text-slate-800 transition cursor-pointer shadow-2xs"
                title="카메라 메뉴판 · 간판 Gemini Vision AI 스캐너"
              >
                <span className="text-sm">📷</span>
                <span className="text-xs font-black text-indigo-900 hidden sm:inline">스캔</span>
              </button>

              <button
                onClick={() => setIsYenCalculatorOpen(true)}
                className="px-2 sm:px-2.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 flex items-center gap-1 text-slate-800 transition cursor-pointer shadow-2xs"
                title="현지 엔화 환율 · 소비세(10%) · 와리깡 계산기"
              >
                <span className="text-sm">💴</span>
                <span className="text-xs font-black text-amber-900 hidden sm:inline">계산기</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-700 transition cursor-pointer"
                title="학습 및 AI 설정"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* 메인 콘텐츠 영역 */}
        <main className={selectedScenario ? 'flex-1' : 'flex-1 px-4 pt-4'}>
          <ChunkErrorBoundary>
            <Suspense fallback={<TabLoadingFallback />}>
            {selectedScenario ? (
              <RolePlayRoom
                scenario={selectedScenario}
                initialRole={selectedInitialRole}
                initialMode={selectedInitialMode}
                displaySettings={displaySettings}
                onUpdateDisplay={setDisplaySettings}
                aiConfig={aiConfig}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                completedRoles={
                  completedMap[selectedScenario.id] || { customer: false, staff: false }
                }
                onMarkCompleted={handleMarkCompleted}
                onBack={() => {
                  stopSpeaking();
                  setSelectedScenario(null);
                }}
              />
            ) : (
              <>
                {activeTab === 'scenarios' && (
                  <ScenarioList
                    scenarios={allScenarios}
                    completedMap={completedMap}
                    onSelectScenario={(scenario, role) => {
                      stopSpeaking();
                      setSelectedInitialMode('guided');
                      setSelectedInitialRole(role);
                      setSelectedScenario(scenario);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onGoKeigoTab={() => handleSwitchTab('keigo')}
                    onOpenCustomModal={() => setIsCustomModalOpen(true)}
                    onDeleteCustomScenario={handleDeleteCustomScenario}
                    onStartFreeTalk={() => {
                      stopSpeaking();
                      setSelectedInitialRole('customer');
                      setSelectedInitialMode('freetalk');
                      setSelectedScenario(allScenarios[0]);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
                {activeTab === 'translator' && (
                  <OfflineTranslator
                    ttsSpeed={displaySettings.ttsSpeed}
                    showFurigana={displaySettings.showFurigana}
                    aiConfig={aiConfig}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onSaveExpression={handleToggleSave}
                    onOpenYenCalculator={() => setIsYenCalculatorOpen(true)}
                    onOpenCameraScanner={() => setIsCameraScannerOpen(true)}
                  />
                )}
                {activeTab === 'n3' && (
                  <N3StudyRoom
                    ttsSpeed={displaySettings.ttsSpeed}
                    masteredIds={n3MasteredSet}
                    onToggleMastered={handleToggleN3Mastered}
                    onStudyActivity={() => setStreakData(recordStudyCompletion(false))}
                  />
                )}
                {activeTab === 'keigo' && (
                  <KeigoGuide ttsSpeed={displaySettings.ttsSpeed} />
                )}
                {activeTab === 'saved' && (
                  <SavedExpressions
                    savedList={savedExpressions}
                    onRemove={handleRemoveSaved}
                    ttsSpeed={displaySettings.ttsSpeed}
                    onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
                    onOpenDailyReview={() => setIsDailyReviewOpen(true)}
                  />
                )}
              </>
            )}
            </Suspense>
          </ChunkErrorBoundary>
        </main>

        {/* 하단 모던 탭 네비게이션 (아이폰 16 프로 홈 인디케이터 Safe-Area 완벽 대응) */}
        {!selectedScenario && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,16px)+0.5rem)] grid grid-cols-5 gap-1 shadow-[0_-4px_20px_rgba(15,23,42,0.05)]">
            {(
              [
                { id: 'scenarios', label: '실전회화', icon: MessageSquareText },
                { id: 'translator', label: '번역·SOS', icon: Languages },
                { id: 'n3', label: 'N3 단어', icon: GraduationCap },
                { id: 'keigo', label: '접객어', icon: Headphones },
                {
                  id: 'saved',
                  label: savedExpressions.length > 0 ? `단어장(${savedExpressions.length})` : '단어장',
                  icon: Bookmark,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSwitchTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition cursor-pointer ${
                    isActive
                      ? 'text-indigo-600 font-extrabold bg-indigo-50/80'
                      : 'text-slate-400 font-medium hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  <span className="text-[11px] tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* 설정 모달 */}
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            displaySettings={displaySettings}
            onUpdateDisplay={setDisplaySettings}
            aiConfig={aiConfig}
            onUpdateAI={setAiConfig}
            onDataRestored={handleReloadRestoredData}
          />
        </Suspense>

        {/* 나만의 여행 상황 만들기 모달 */}
        <Suspense fallback={null}>
          <CustomScenarioModal
            isOpen={isCustomModalOpen}
            onClose={() => setIsCustomModalOpen(false)}
            aiConfig={aiConfig}
            onCreateScenario={handleCreateCustomScenario}
          />
        </Suspense>

        {/* 현지 엔화 환율 · 소비세(10%) · 와리깡(더치페이) 계산기 모달 */}
        <Suspense fallback={null}>
          <YenCalculatorModal
            isOpen={isYenCalculatorOpen}
            onClose={() => setIsYenCalculatorOpen(false)}
          />
        </Suspense>

        {/* 나만의 여행 치트시트 1장 고화질 이미지(PNG) 내보내기 모달 */}
        <Suspense fallback={null}>
          <TravelCheatSheetModal
            isOpen={isCheatSheetOpen}
            onClose={() => setIsCheatSheetOpen(false)}
            savedList={savedExpressions}
          />
        </Suspense>

        {/* 카메라 메뉴판 · 간판 Gemini Vision AI 스캐너 모달 */}
        <Suspense fallback={null}>
          <CameraMenuScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            aiConfig={aiConfig}
            onSaveExpression={handleToggleSave}
            onOpenYenCalculator={() => {
              setIsCameraScannerOpen(false);
              setIsYenCalculatorOpen(true);
            }}
          />
        </Suspense>

        {/* 에빙하우스 망각곡선 일일 복습 & 스트릭 모달 */}
        <Suspense fallback={null}>
          <DailyReviewModal
            isOpen={isDailyReviewOpen}
            onClose={() => {
              setIsDailyReviewOpen(false);
              setStreakData(loadUserStreak());
            }}
            savedExpressions={savedExpressions}
            ttsSpeed={displaySettings.ttsSpeed}
          />
        </Suspense>
      </div>
    </div>
  );
};
export default App;
