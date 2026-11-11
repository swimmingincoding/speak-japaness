import React, { useState, useEffect } from 'react';
import {
  Scenario,
  RoleType,
  DisplaySettings,
  AIConfig,
  SavedExpression,
} from './types/conversation';
import { SCENARIOS } from './data/scenarios';
import { ScenarioList } from './components/ScenarioList';
import { RolePlayRoom } from './components/RolePlayRoom';
import { KeigoGuide } from './components/KeigoGuide';
import { SavedExpressions } from './components/SavedExpressions';
import { OfflineTranslator } from './components/OfflineTranslator';
import { N3StudyRoom } from './components/N3StudyRoom';
import { SettingsModal } from './components/SettingsModal';
import { CustomScenarioModal } from './components/CustomScenarioModal';
import {
  MessageCircleHeart,
  Headphones,
  Bookmark,
  Settings,
  MapPin,
  Languages,
  GraduationCap,
} from 'lucide-react';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // 사용자 생성 커스텀 시나리오
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  // 표시 설정
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

  // AI 연동 설정
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

  // 저장한 표현 단어장
  const [savedExpressions, setSavedExpressions] = useState<SavedExpression[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  // 시나리오별 완료한 역할 기록
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

  // N3 암기 완료 단어 ID 목록
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
  };

  const handleToggleN3Mastered = (wordId: string) => {
    setN3MasteredList((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      {/* 모바일 앱 프레임 컨테이너 */}
      <div className="w-full max-w-lg min-h-screen bg-slate-950 border-x border-slate-900 flex flex-col relative">
        {/* 상단 앱 바 */}
        <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => {
              setSelectedScenario(null);
              setActiveTab('scenarios');
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md shadow-rose-600/20">
              <MessageCircleHeart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  TabiTalk
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  旅トーク
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                역할교대 회화 · 오프라인 번역 · N3 한자
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-rose-400" />
            <span>맞춤 설정</span>
          </button>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 px-4 pt-3">
          {selectedScenario ? (
            <RolePlayRoom
              scenario={selectedScenario}
              initialRole={selectedInitialRole}
              displaySettings={displaySettings}
              onUpdateDisplay={setDisplaySettings}
              aiConfig={aiConfig}
              savedIds={savedIds}
              onToggleSave={handleToggleSave}
              completedRoles={
                completedMap[selectedScenario.id] || { customer: false, staff: false }
              }
              onMarkCompleted={handleMarkCompleted}
              onBack={() => setSelectedScenario(null)}
            />
          ) : (
            <>
              {activeTab === 'scenarios' && (
                <ScenarioList
                  scenarios={allScenarios}
                  completedMap={completedMap}
                  onSelectScenario={(scenario, role) => {
                    setSelectedInitialRole(role);
                    setSelectedScenario(scenario);
                  }}
                  onGoKeigoTab={() => setActiveTab('keigo')}
                  onOpenCustomModal={() => setIsCustomModalOpen(true)}
                  onDeleteCustomScenario={handleDeleteCustomScenario}
                />
              )}
              {activeTab === 'translator' && (
                <OfflineTranslator
                  ttsSpeed={displaySettings.ttsSpeed}
                  showFurigana={displaySettings.showFurigana}
                />
              )}
              {activeTab === 'n3' && (
                <N3StudyRoom
                  ttsSpeed={displaySettings.ttsSpeed}
                  masteredIds={n3MasteredSet}
                  onToggleMastered={handleToggleN3Mastered}
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
                />
              )}
            </>
          )}
        </main>

        {/* 하단 모바일 5탭 네비게이션 */}
        {!selectedScenario && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 px-1.5 py-2 grid grid-cols-5 gap-0.5">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'scenarios'
                  ? 'text-rose-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">실전회화</span>
            </button>

            <button
              onClick={() => setActiveTab('translator')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'translator'
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Languages className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">오프라인번역</span>
            </button>

            <button
              onClick={() => setActiveTab('n3')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'n3'
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">N3 한자단어</span>
            </button>

            <button
              onClick={() => setActiveTab('keigo')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'keigo'
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Headphones className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">접객어사전</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition relative cursor-pointer ${
                activeTab === 'saved'
                  ? 'text-sky-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">
                내단어장{savedExpressions.length > 0 ? `(${savedExpressions.length})` : ''}
              </span>
            </button>
          </nav>
        )}

        {/* 설정 모달 */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          displaySettings={displaySettings}
          onUpdateDisplay={setDisplaySettings}
          aiConfig={aiConfig}
          onUpdateAI={setAiConfig}
        />

        {/* 나만의 여행 상황 만들기 모달 */}
        <CustomScenarioModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          aiConfig={aiConfig}
          onCreateScenario={handleCreateCustomScenario}
        />
      </div>
    </div>
  );
};
export default App;
