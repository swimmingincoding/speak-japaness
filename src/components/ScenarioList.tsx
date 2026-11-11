import React, { useState } from 'react';
import { Scenario, CategoryType, RoleType } from '../types/conversation';
import { CATEGORY_META } from '../data/scenarios';
import {
  User,
  Store,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Headphones,
} from 'lucide-react';

interface ScenarioListProps {
  scenarios: Scenario[];
  completedMap: Record<string, { customer: boolean; staff: boolean }>;
  onSelectScenario: (scenario: Scenario, role: RoleType) => void;
  onGoKeigoTab: () => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  completedMap,
  onSelectScenario,
  onGoKeigoTab,
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

  return (
    <div className="space-y-5 pb-24">
      {/* 히어로 카드 */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 p-5 shadow-xl border border-rose-400/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 text-rose-100 text-[11px] font-bold">
            <ArrowRightLeft className="w-3.5 h-3.5" /> 손님(A) ↔ 종업원(B) 역할교대 회화
          </span>
          <span className="text-xs font-bold text-rose-100">
            마스터 진도: {completedRolesCount}/{totalRolesCount} 역할
          </span>
        </div>

        <h1 className="text-xl font-extrabold text-white leading-snug">
          내가 말할 줄 아는 건 기본,
          <br />
          <span className="text-amber-300">일본 점원이 하는 말까지 100% 들리는</span> 실전 훈련
        </h1>

        <p className="text-xs text-rose-100/90 leading-relaxed">
          먼저 <strong>손님(A)</strong>이 되어 주문·요청을 해보고, 이어서 <strong>종업원(B)</strong>으로 역할을 바꿔 점원의 빠른 접객 일본어를 직접 말해보세요!
        </p>

        <button
          onClick={onGoKeigoTab}
          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-950/70 border border-white/15 text-xs font-bold text-amber-200 flex items-center justify-between transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Headphones className="w-4 h-4 text-amber-300" />
            점원 말이 안 들릴 땐? [접객 일본어 핵심 6선] 먼저 듣기
          </span>
          <span>→</span>
        </button>
      </div>

      {/* 카테고리 필터 탭 */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          🔥 전체 상황 ({scenarios.length})
        </button>
        {(Object.keys(CATEGORY_META) as CategoryType[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* 시나리오 카드 목록 */}
      <div className="space-y-4">
        {filtered.map((scenario) => {
          const catMeta = CATEGORY_META[scenario.category];
          const progress = completedMap[scenario.id] || { customer: false, staff: false };

          return (
            <div
              key={scenario.id}
              className="rounded-2xl bg-slate-900/95 border border-slate-800 hover:border-slate-700 p-4 space-y-3.5 shadow-md transition"
            >
              {/* 상단 메타 배지 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{catMeta.emoji}</span>
                  <span className="text-xs font-bold text-rose-400">{catMeta.label}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {scenario.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> 약 {scenario.estimatedMinutes}분 ·{' '}
                  {scenario.turns.length}턴
                </div>
              </div>

              {/* 제목 및 장소 */}
              <div>
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{scenario.subtitle}</p>
              </div>

              {/* 왜 안 들리는지 핵심 요약 */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-amber-300">🎯 실전 포인트: </span>
                {scenario.whyHardToUnderstand}
              </div>

              {/* 핵심 표현 미리보기 */}
              <div className="space-y-1">
                {scenario.keyTakeaways.slice(0, 2).map((tip, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{tip}</span>
                  </div>
                ))}
              </div>

              {/* 역할 선택 진입 버튼 2개 (손님 A vs 종업원 B) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onSelectScenario(scenario, 'customer')}
                  className="py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>손님(A)으로 대화</span>
                  {progress.customer && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                <button
                  onClick={() => onSelectScenario(scenario, 'staff')}
                  className="py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  <span>종업원(B) 역할 체험</span>
                  {progress.staff && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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

