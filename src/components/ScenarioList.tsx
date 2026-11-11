import React, { useState } from 'react';
import { Scenario, CategoryType, RoleType } from '../types/conversation';
import { CATEGORY_META } from '../data/scenarios';
import {
  User,
  Store,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Headphones,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ScenarioListProps {
  scenarios: Scenario[];
  completedMap: Record<string, { customer: boolean; staff: boolean }>;
  onSelectScenario: (scenario: Scenario, role: RoleType) => void;
  onGoKeigoTab: () => void;
  onOpenCustomModal: () => void;
  onDeleteCustomScenario?: (id: string) => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  completedMap,
  onSelectScenario,
  onGoKeigoTab,
  onOpenCustomModal,
  onDeleteCustomScenario,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');

  const filtered =
    selectedCategory === 'all'
      ? scenarios
      : scenarios.filter((s) => s.category === selectedCategory);

  const totalRolesCount = scenarios.length * 2;
  const completedRolesCount = Object.values(completedMap).reduce(
    (acc, cur) => acc + (cur.customer ? 1 : 0) + (cur.staff ? 1 : 0),
    0
  );
  const progressPercent = Math.round((completedRolesCount / Math.max(1, totalRolesCount)) * 100);

  return (
    <div className="space-y-6 pb-28">
      {/* 1. 상단 히어로 대시보드 카드 */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
          <ArrowRightLeft className="w-24 h-24" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> 양방향 롤플레잉 회화
            </span>
            <span className="text-xs font-extrabold text-indigo-200">
              진도율 {progressPercent}% ({completedRolesCount}/{totalRolesCount})
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">
              손님으로 주문하고,
              <br />
              <span className="text-amber-300">점원이 되어 직접 응대해 보세요!</span>
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-md">
              점원의 접객 일본어를 내 입으로 직접 말해보면, 실제 일본 매장에서 직원의 빠른 말이 또렷하게 들립니다.
            </p>
          </div>

          {/* 진도 프로그레스 바 */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* 퀵 액션 버튼 2개 */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={onOpenCustomModal}
              className="py-3 px-3.5 rounded-2xl bg-white text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-indigo-50 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              <span>맞춤 상황 만들기</span>
            </button>

            <button
              onClick={onGoKeigoTab}
              className="py-3 px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer backdrop-blur-sm"
            >
              <Headphones className="w-4 h-4 text-amber-300" />
              <span>점원 단골 멘트 6선</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 카테고리 알약 탭 */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          전체 ({scenarios.length})
        </button>
        {(Object.keys(CATEGORY_META) as CategoryType[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. 시나리오 카드 리스트 */}
      <div className="space-y-4">
        {filtered.map((scenario) => {
          const catMeta = CATEGORY_META[scenario.category];
          const progress = completedMap[scenario.id] || { customer: false, staff: false };

          return (
            <div
              key={scenario.id}
              className="rounded-[26px] bg-white border border-slate-200/80 p-5 space-y-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-md transition"
            >
              {/* 카드 상단: 카테고리 & 난이도 & 턴 수 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg">
                    {catMeta.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-indigo-600">{catMeta.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{scenario.placeName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{scenario.turns.length}턴 대화</span>
                  {scenario.id.startsWith('custom-') && onDeleteCustomScenario && (
                    <button
                      onClick={() => onDeleteCustomScenario(scenario.id)}
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 제목 & 설명 */}
              <div className="space-y-1">
                <h3 className="text-[17px] font-black text-slate-900 leading-snug tracking-tight">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {scenario.subtitle}
                </p>
              </div>

              {/* 핵심 청취 포인트 */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-extrabold text-indigo-600">💡 듣기 핵심 포인트: </span>
                {scenario.whyHardToUnderstand}
              </div>

              {/* 역할 선택 버튼 (손님 A / 점원 B) */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  onClick={() => onSelectScenario(scenario, 'customer')}
                  className={`py-3 px-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
                    progress.customer
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>손님(A) 대화</span>
                  </span>
                  {progress.customer ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      완료 <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-80" />
                  )}
                </button>

                <button
                  onClick={() => onSelectScenario(scenario, 'staff')}
                  className={`py-3 px-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
                    progress.staff
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 text-amber-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>점원(B) 체험</span>
                  </span>
                  {progress.staff ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      완료 <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-amber-600" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
