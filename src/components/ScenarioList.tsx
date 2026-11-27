import React, { useState, useMemo } from 'react';
import { Scenario, CategoryType, RoleType } from '../types/conversation';
import { SCENARIOS, CATEGORY_META } from '../data/scenarios';
import {
  User,
  Store,
  CheckCircle2,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react';

interface ScenarioListProps {
  customScenarios: Scenario[];
  completedMap: Record<string, { customer: boolean; staff: boolean }>;
  onSelectScenario: (scenario: Scenario, role: RoleType) => void;
  onGoKeigoTab?: () => void;
  onOpenCustomModal: () => void;
  onDeleteCustomScenario?: (id: string) => void;
  onStartFreeTalk?: (starterScenario: Scenario) => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  customScenarios,
  completedMap,
  onSelectScenario,
  onOpenCustomModal,
  onDeleteCustomScenario,
  onStartFreeTalk,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const scenarios = useMemo(() => [...customScenarios, ...SCENARIOS], [customScenarios]);

  const filtered =
    selectedCategory === 'all'
      ? scenarios
      : scenarios.filter((s) => s.category === selectedCategory);

  const totalRolesCount = scenarios.length * 2;
  const completedRolesCount = Object.values(completedMap).reduce(
    (acc, cur) => acc + (cur.customer ? 1 : 0) + (cur.staff ? 1 : 0),
    0
  );

  return (
    <div className="space-y-4 pb-28">
      {/* 1. 상단 핵심 액션 2개 (거대 홍보 배너 대신 직관적인 투버튼 카드) */}
      <div className="grid grid-cols-2 gap-2.5">
        {onStartFreeTalk && (
          <button
            type="button"
            onClick={() => onStartFreeTalk(scenarios[0])}
            className="p-4 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white text-left space-y-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black">AI 자유 대화</div>
              <p className="text-[11px] text-indigo-100 font-medium mt-0.5">
                원하는 주제로 바로 프리토킹
              </p>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenCustomModal}
          className="p-4 rounded-3xl bg-white hover:bg-slate-50 border border-slate-200/90 text-left space-y-2 shadow-2xs active:scale-[0.98] transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-slate-100 text-indigo-600 flex items-center justify-center">
            <Plus className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">맞춤 상황 추가</div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              내 여행 상황 대본 만들기
            </p>
          </div>
        </button>
      </div>

      {/* 2. 카테고리 필터 & 진도 요약 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-slate-700">상황별 롤플레잉</span>
          <span className="text-[11px] font-bold text-slate-400">
            완료 {completedRolesCount}/{totalRolesCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-full text-xs font-extrabold shrink-0 transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200/80'
            }`}
          >
            전체
          </button>
          {(Object.keys(CATEGORY_META) as CategoryType[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-full text-xs font-extrabold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 간결하고 한눈에 들어오는 시나리오 카드 리스트 */}
      <div className="space-y-3">
        {filtered.map((scenario) => {
          const catMeta = CATEGORY_META[scenario.category];
          const progress = completedMap[scenario.id] || { customer: false, staff: false };

          return (
            <div
              key={scenario.id}
              className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                    {catMeta.emoji}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-slate-900 leading-snug">
                      {scenario.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                      {scenario.placeName} · {scenario.turns.length}턴 대화
                    </p>
                  </div>
                </div>

                {scenario.id.startsWith('custom-') && onDeleteCustomScenario && (
                  <button
                    onClick={() => onDeleteCustomScenario(scenario.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 손님 / 점원 역할 선택 버튼 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSelectScenario(scenario, 'customer')}
                  className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer ${
                    progress.customer
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>손님 연습</span>
                  {progress.customer && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => onSelectScenario(scenario, 'staff')}
                  className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer ${
                    progress.staff
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>점원 체험</span>
                  {progress.staff && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
