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
  Bookmark,
  SlidersHorizontal,
  MessageSquareText,
  Languages,
  GraduationCap,
  Loader2,
  Camera,
  Calculator,
} from 'lucide-react';

const RolePlayRoom = lazy(() =>
  import('./components/RolePlayRoom').then((m) => ({ default: m.RolePlayRoom }))
);
const StudyHub = lazy(() =>
  import('./components/StudyHub').then((m) => ({ default: m.StudyHub }))
);
const SavedExpressions = lazy(() =>
  import('./components/SavedExpressions').then((m) => ({ default: m.SavedExpressions }))
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
    <span className="text-xs font-bold">불러오는 중...</span>
  </div>
);

const STORAGE_KEYS = {
  DISPLAY: 'tabitalk_display_settings_v1',
  AI: 'tabitalk_ai_config_v1',
  SAVED: 'tabitalk_saved_expressions_v1',
  COMPLETED: 'tabitalk_completed_roles_v1',
  N3_MASTERED: 'tabitalk_n3_mastered_v1',
  CUSTOM_SCENARIOS: 'tabitalk_custom_scenarios_v1',
  LAST_TAB: 'tabitalk_last_tab_v2',
};

type MainTab = 'translator' | 'scenarios' | 'study' | 'saved';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_TAB);
      if (
        saved === 'translator' ||
        saved === 'scenarios' ||
        saved === 'study' ||
        saved === 'saved'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'translator';
  });

  const [studyInitialSubTab, setStudyInitialSubTab] = useState<'n3' | 'keigo'>('n3');
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_TAB, activeTab);
  }, [activeTab]);

  const normalizeJpKey = (s: string) => s.replace(/[\s。、！？!?]/g, '').trim();
  const allScenarios = [...customScenarios, ...SCENARIOS];
  const savedIds = new Set(savedExpressions.map((s) => s.id));
  const savedJapaneseSet = new Set(savedExpressions.map((s) => normalizeJpKey(s.japanese)));
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
    const targetJpKey = normalizeJpKey(expr.japanese);
    setSavedExpressions((prev) => {
      const exists = prev.some(
        (item) => item.id === expr.id || (targetJpKey && normalizeJpKey(item.japanese) === targetJpKey)
      );
      if (exists) {
        return prev.filter(
          (item) => item.id !== expr.id && (!targetJpKey || normalizeJpKey(item.japanese) !== targetJpKey)
        );
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
      {/* 아이폰 16 프로 (402px) 및 모바일 최적화 앱 프레임 */}
      <div className="w-full max-w-[480px] min-h-screen bg-[#F5F7FA] shadow-2xl shadow-slate-300/50 flex flex-col relative">
        {/* 간결하고 차분한 상단 앱 바 */}
        {!selectedScenario && (
          <header className="sticky top-0 z-30 bg-[#F5F7FA]/90 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] pb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSwitchTab('translator')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                旅
              </div>
              <span className="font-black text-[18px] tracking-tight text-slate-900">
                TabiTalk
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsCameraScannerOpen(true)}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-2xs"
                title="메뉴판 · 간판 사진 스캔"
              >
                <Camera className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsYenCalculatorOpen(true)}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-2xs"
                title="엔화 환율 · 소비세 · 더치페이 계산기"
              >
                <Calculator className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-2xs"
                title="설정 및 백업"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* 메인 콘텐츠 영역 */}
        <main className={selectedScenario ? 'flex-1' : 'flex-1 px-4 pt-1.5'}>
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
                  {activeTab === 'translator' && (
                    <OfflineTranslator
                      ttsSpeed={displaySettings.ttsSpeed}
                      showFurigana={displaySettings.showFurigana}
                      aiConfig={aiConfig}
                      savedJapaneseSet={savedJapaneseSet}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      onSaveExpression={handleToggleSave}
                      onOpenYenCalculator={() => setIsYenCalculatorOpen(true)}
                      onOpenCameraScanner={() => setIsCameraScannerOpen(true)}
                    />
                  )}
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
                      onGoKeigoTab={() => {
                        setStudyInitialSubTab('keigo');
                        handleSwitchTab('study');
                      }}
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
                  {activeTab === 'study' && (
                    <StudyHub
                      key={studyInitialSubTab}
                      ttsSpeed={displaySettings.ttsSpeed}
                      streakData={streakData}
                      masteredIds={n3MasteredSet}
                      savedExpressions={savedExpressions}
                      savedJapaneseSet={savedJapaneseSet}
                      onToggleSave={handleToggleSave}
                      onToggleMastered={handleToggleN3Mastered}
                      onStudyActivity={() => setStreakData(recordStudyCompletion(false))}
                      onOpenDailyReview={() => setIsDailyReviewOpen(true)}
                      initialSubTab={studyInitialSubTab}
                    />
                  )}
                  {activeTab === 'saved' && (
                    <SavedExpressions
                      savedList={savedExpressions}
                      onRemove={handleRemoveSaved}
                      ttsSpeed={displaySettings.ttsSpeed}
                      onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
                    />
                  )}
                </>
              )}
            </Suspense>
          </ChunkErrorBoundary>
        </main>

        {/* 직관적인 4탭 하단 바 (아이폰 16 프로 Safe-Area 대응) */}
        {!selectedScenario && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/70 px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom,16px)+0.4rem)] grid grid-cols-4 gap-1 shadow-[0_-4px_20px_rgba(15,23,42,0.04)]">
            {(
              [
                { id: 'translator', label: '번역', icon: Languages },
                { id: 'scenarios', label: '실전회화', icon: MessageSquareText },
                { id: 'study', label: '학습', icon: GraduationCap },
                {
                  id: 'saved',
                  label: '보관함',
                  icon: Bookmark,
                  badge: savedExpressions.length > 0 ? savedExpressions.length : undefined,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSwitchTab(item.id)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition cursor-pointer ${
                    isActive
                      ? 'text-indigo-600 font-extrabold'
                      : 'text-slate-400 font-semibold hover:text-slate-600'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-[22px] h-[22px] mb-0.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                    {'badge' in item && item.badge && (
                      <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9.5px] font-black flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

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

        <Suspense fallback={null}>
          <CustomScenarioModal
            isOpen={isCustomModalOpen}
            onClose={() => setIsCustomModalOpen(false)}
            aiConfig={aiConfig}
            onCreateScenario={handleCreateCustomScenario}
          />
        </Suspense>

        <Suspense fallback={null}>
          <YenCalculatorModal
            isOpen={isYenCalculatorOpen}
            onClose={() => setIsYenCalculatorOpen(false)}
          />
        </Suspense>

        <Suspense fallback={null}>
          <TravelCheatSheetModal
            isOpen={isCheatSheetOpen}
            onClose={() => setIsCheatSheetOpen(false)}
            savedList={savedExpressions}
          />
        </Suspense>

        <Suspense fallback={null}>
          <CameraMenuScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            aiConfig={aiConfig}
            savedJapaneseSet={savedJapaneseSet}
            onSaveExpression={handleToggleSave}
            onOpenYenCalculator={() => {
              setIsCameraScannerOpen(false);
              setIsYenCalculatorOpen(true);
            }}
          />
        </Suspense>

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
