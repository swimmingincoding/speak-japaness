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
    <div className="space-y-5 pb-28">
      {/* 1. 상단 히어로 대시보드 카드 */}
      <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold text-indigo-100">
            <ArrowRightLeft className="w-3.5 h-3.5" /> 양방향 롤플레잉 학습
          </span>
          <span className="text-xs font-bold text-indigo-100">
            달성도 {progressPercent}% ({completedRolesCount}/{totalRolesCount})
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold leading-snug tracking-tight">
            손님이 되어 주문도 해보고,
            <br />
            <span className="text-amber-300">점원이 되어 손님을 응대해 보세요!</span>
          </h1>
          <p className="text-xs text-indigo-100/85 leading-relaxed">
            점원의 접객 일본어를 내 입으로 직접 말해보면, 실제 일본에 갔을 때 점원의 빠른 말이 거짓말처럼 들리기 시작합니다.
          </p>
        </div>

        {/* 진도 프로그레스 바 */}
        <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
          <div
            className="h-full bg-amber-300 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>

        {/* 퀵 액션 버튼 2개 */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={onOpenCustomModal}
            className="py-3 px-3.5 rounded-2xl bg-white text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-indigo-50 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5px]" />
            <span>내 맞춤 상황 만들기</span>
          </button>

          <button
            onClick={onGoKeigoTab}
            className="py-3 px-3.5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-950/60 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer"
          >
            <Headphones className="w-4 h-4 text-amber-300" />
            <span>점원 단골 멘트 6선</span>
          </button>
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

      {/* 3. 시나리오 카드 리스트 (모던 화이트 카드) */}
      <div className="space-y-3.5">
        {filtered.map((scenario) => {
          const catMeta = CATEGORY_META[scenario.category];
          const progress = completedMap[scenario.id] || { customer: false, staff: false };

          return (
            <div
              key={scenario.id}
              className="rounded-[24px] bg-white border border-slate-200/80 p-5 space-y-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-md transition"
            >
              {/* 카드 상단 태그 & 소요 시간 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base">
                    {catMeta.emoji}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-indigo-600">{catMeta.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{scenario.placeName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{scenario.turns.length}턴</span>
                  {scenario.id.startsWith('custom-') && onDeleteCustomScenario && (
                    <button
                      onClick={() => onDeleteCustomScenario(scenario.id)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 제목 & 부제목 */}
              <div>
                <h3 className="text-[17px] font-extrabold text-slate-900 leading-snug tracking-tight">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{scenario.subtitle}</p>
              </div>

              {/* 왜 점원 말이 안 들리는지 핵심 팁 박스 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-extrabold text-indigo-600">💡 듣기 포인트: </span>
                {scenario.whyHardToUnderstand}
              </div>

              {/* 역할 선택 버튼 2개 */}
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
                    <span>손님(A) 시작</span>
                  </span>
                  {progress.customer ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-80" />
                  )}
                </button>

                <button
                  onClick={() => onSelectScenario(scenario, 'staff')}
                  className={`py-3 px-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
                    progress.staff
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>점원(B) 체험</span>
                  </span>
                  {progress.staff ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
