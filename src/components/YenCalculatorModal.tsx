import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Copy,
  Check,
  Volume2,
  Users,
  Receipt,
  Sparkles,
  ShoppingBag,
  Percent,
  Delete,
  Settings2,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { speakJapanese } from '../utils/speech';

interface YenCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_RATE_KEY = 'tabitalk_exchange_rate_v1';
const DEFAULT_RATE_PER_100_YEN = 910; // 100엔당 910원 (기본값)
const TAX_FREE_THRESHOLD_JPY = 5500; // 일본 면세 기준선 5,500엔 (세금 포함)

type CalcTab = 'converter' | 'warikan';
type RoundingOption = 'exact' | 'round10' | 'round100';

// 실전 쇼핑/정산 일본어 표현 모음
const SHOPPING_PHRASES = [
  {
    jp: '別々で会計できますか？',
    reading: '베츠베츠데 카이케- 데키마스카?',
    kr: '따로따로 계산할 수 있나요?',
    badge: '정산',
  },
  {
    jp: '別々でお願いします。',
    reading: '베츠베츠데 오네가이시마스',
    kr: '각자 따로 계산해주세요.',
    badge: '정산',
  },
  {
    jp: '一括でお願いします。',
    reading: '잇카츠데 오네가이시마스',
    kr: '(카드로) 일시불로 해주세요.',
    badge: '결제',
  },
  {
    jp: '免税できますか？',
    reading: '멘제- 데키마스카?',
    kr: '면세 가능한가요?',
    badge: '면세',
  },
  {
    jp: 'レシートをください。',
    reading: '레시-토오 쿠다사이',
    kr: '영수증 주세요.',
    badge: '영수증',
  },
  {
    jp: '袋はいりません。',
    reading: '후쿠로와 이리마센',
    kr: '봉투는 필요 없어요 (비닐봉투 사절)',
    badge: '봉투',
  },
];

export const YenCalculatorModal: React.FC<YenCalculatorModalProps> = ({ isOpen, onClose }) => {
  // 모달 탭
  const [activeTab, setActiveTab] = useState<CalcTab>('converter');

  // 환율 설정 (100엔당 원화)
  const [ratePer100Yen, setRatePer100Yen] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RATE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_RATE_PER_100_YEN;
  });

  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [tempRateInput, setTempRateInput] = useState<string>(ratePer100Yen.toString());

  // 계산기 입력값 (엔화 원문 입력, 기본 빈값 -> 0)
  const [inputYenStr, setInputYenStr] = useState<string>('2980'); // 기본값 일본 쇼핑 대표 단가

  // 소비세 토글: false = 세금 포함(税込そのまま), true = 세금 별도(税抜 표시 상태라 +10% 추가)
  const [isTaxExclusive, setIsTaxExclusive] = useState<boolean>(true);

  // 와리깡(더치페이) 설정
  const [headcount, setHeadcount] = useState<number>(3);
  const [rounding, setRounding] = useState<RoundingOption>('round100'); // 100엔 올림이 여행 시 가장 유용

  // 복사 피드백 상태
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 모달 열릴 때 백드롭 스크롤 고정
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 엔화 숫자 환산
  const rawYen = useMemo(() => {
    const parsed = parseInt(inputYenStr.replace(/[^0-9]/g, '') || '0', 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [inputYenStr]);

  // 소비세 10% 적용 계산
  const taxAmount = useMemo(() => {
    if (!isTaxExclusive) return 0;
    return Math.floor(rawYen * 0.1);
  }, [rawYen, isTaxExclusive]);

  // 최종 결제 예정 엔화 금액
  const finalYen = useMemo(() => {
    return rawYen + taxAmount;
  }, [rawYen, taxAmount]);

  // 원화 환산액 (100엔당 ratePer100Yen)
  const krwAmount = useMemo(() => {
    return Math.round((finalYen * ratePer100Yen) / 100);
  }, [finalYen, ratePer100Yen]);

  // 면세 트래커 진척도 (5,500엔 기준)
  const taxFreeProgress = useMemo(() => {
    const pct = (finalYen / TAX_FREE_THRESHOLD_JPY) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }, [finalYen]);

  const taxFreeGap = useMemo(() => {
    return Math.max(0, TAX_FREE_THRESHOLD_JPY - finalYen);
  }, [finalYen]);

  // 와리깡 계산
  const warikanResults = useMemo(() => {
    if (headcount <= 0 || finalYen <= 0) {
      return { perPersonYen: 0, perPersonKrw: 0, totalCollected: 0, diffYen: 0 };
    }

    let perPersonYen = 0;
    if (rounding === 'exact') {
      perPersonYen = Math.ceil(finalYen / headcount);
    } else if (rounding === 'round10') {
      // 10엔 단위 올림
      perPersonYen = Math.ceil(finalYen / headcount / 10) * 10;
    } else {
      // 100엔 단위 올림
      perPersonYen = Math.ceil(finalYen / headcount / 100) * 100;
    }

    const perPersonKrw = Math.round((perPersonYen * ratePer100Yen) / 100);
    const totalCollected = perPersonYen * headcount;
    const diffYen = totalCollected - finalYen;

    return {
      perPersonYen,
      perPersonKrw,
      totalCollected,
      diffYen,
    };
  }, [finalYen, headcount, rounding, ratePer100Yen]);

  // 환율 저장
  const handleSaveRate = () => {
    const parsed = parseFloat(tempRateInput);
    if (!isNaN(parsed) && parsed > 100 && parsed < 3000) {
      setRatePer100Yen(parsed);
      try {
        localStorage.setItem(STORAGE_RATE_KEY, parsed.toString());
      } catch {
        // ignore
      }
    }
    setIsEditingRate(false);
  };

  // 키패드 입력 핸들러
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setInputYenStr('0');
      return;
    }
    if (val === 'DEL') {
      setInputYenStr((prev) => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    setInputYenStr((prev) => {
      if (prev === '0') return val;
      // 최대 9자리(1억 엔) 제한
      if (prev.length >= 8) return prev;
      return prev + val;
    });
  };

  // 빠른 금액 추가 버튼
  const handleAddYen = (amount: number) => {
    const cur = parseInt(inputYenStr || '0', 10);
    const next = Math.min(99999999, cur + amount);
    setInputYenStr(next.toString());
  };

  // 클립보드 복사 유틸
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // 와리깡 정산 내역 공유 텍스트
  const handleCopyWarikanShare = () => {
    const text = `💴 일본 여행 와리깡(더치페이) 정산 결과\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 총 결제액: ${finalYen.toLocaleString()}円 (약 ${krwAmount.toLocaleString()}원)\n` +
      `• 나눌 인원: ${headcount}명\n` +
      `👉 1인당 부담액: ${warikanResults.perPersonYen.toLocaleString()}円 (약 ${warikanResults.perPersonKrw.toLocaleString()}원)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${warikanResults.diffYen > 0 ? `(잔돈 남는 +${warikanResults.diffYen}円은 공동 경비/팁으로 적립!)` : ''}`;

    copyToClipboard(text, 'warikan_share');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[440px] max-h-[calc(100dvh-2rem)] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
              💴
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base leading-tight tracking-tight">
                  현지 엔화 & 와리깡 계산기
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  10% 소비세
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                오프라인 작동 · 면세 5,500엔 트래커
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 환율 표시 및 변경 바 */}
        <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>기준 환율:</span>
            <span className="font-extrabold text-slate-800">
              100엔 = {ratePer100Yen.toLocaleString()}원
            </span>
            <span className="text-[11px] text-slate-400">
              (1엔 ≈ {(ratePer100Yen / 100).toFixed(2)}원)
            </span>
          </div>
          <button
            onClick={() => {
              setTempRateInput(ratePer100Yen.toString());
              setIsEditingRate(!isEditingRate);
            }}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs"
          >
            <Settings2 className="w-3 h-3" />
            {isEditingRate ? '닫기' : '환율 수정'}
          </button>
        </div>

        {/* 환율 직접 수정 패널 */}
        {isEditingRate && (
          <div className="px-5 py-3 bg-amber-50/90 border-b border-amber-200/80 flex items-center gap-2 animate-fadeIn text-xs">
            <span className="text-slate-700 font-bold whitespace-nowrap">100엔 당:</span>
            <input
              type="number"
              value={tempRateInput}
              onChange={(e) => setTempRateInput(e.target.value)}
              className="w-24 px-2 py-1 bg-white border border-amber-300 rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="예: 910"
            />
            <span className="text-slate-700 font-bold">원</span>
            <button
              onClick={handleSaveRate}
              className="ml-auto px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer transition shadow-2xs"
            >
              적용
            </button>
          </div>
        )}

        {/* 탭 전환 (환율/쇼핑 계산 vs 와리깡 더치페이) */}
        <div className="p-2 border-b border-slate-100 flex gap-1.5 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            엔화 쇼핑 · 소비세
          </button>
          <button
            onClick={() => setActiveTab('warikan')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'warikan'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            와리깡 (더치페이)
          </button>
        </div>

        {/* 스크롤 가능한 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 금액 디스플레이 카드 (공통 상단) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
            {/* 세금 별도/포함 토글 뱃지 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                {isTaxExclusive ? '세금 별도(税抜) 입력 모드' : '세금 포함(税込) 결제 모드'}
              </span>
              <button
                onClick={() => setIsTaxExclusive(!isTaxExclusive)}
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer border ${
                  isTaxExclusive
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <Percent className="w-3 h-3" />
                {isTaxExclusive ? '+10% 소비세 가산 중' : '세금 포함가 그대로'}
              </button>
            </div>

            {/* 입력 엔화 & 소비세 내역 */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-white font-mono">
                  {rawYen.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-slate-300">円</span>
                {isTaxExclusive && (
                  <span className="text-xs text-amber-300 ml-1 font-semibold">
                    (税抜) + 세 10% ({taxAmount.toLocaleString()}円)
                  </span>
                )}
              </div>
            </div>

            {/* 최종 결제 금액 (원화 환산 병기) */}
            <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">최종 결제 예정</span>
                <div className="text-xl font-black text-indigo-300 font-mono">
                  {finalYen.toLocaleString()}
                  <span className="text-xs font-bold text-slate-300 ml-0.5">円</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">한국 원화 환산</span>
                <div className="text-xl font-black text-amber-400 font-mono">
                  약 {krwAmount.toLocaleString()}
                  <span className="text-xs font-bold text-slate-300 ml-0.5">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5,500엔 면세(Tax-Free) 트래커 게이지 */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>면세(Tax-Free) 트래커</span>
                <span className="text-[10px] text-slate-400 font-normal">기준: 5,500円</span>
              </div>
              <span
                className={`font-black text-xs ${
                  taxFreeGap === 0 ? 'text-emerald-600' : 'text-indigo-600'
                }`}
              >
                {taxFreeProgress}%
              </span>
            </div>

            {/* 게이지 바 */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  taxFreeGap === 0
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-indigo-500 to-amber-500'
                }`}
                style={{ width: `${taxFreeProgress}%` }}
              />
            </div>

            {/* 면세 도달 여부 알림 */}
            <div className="text-xs">
              {taxFreeGap === 0 ? (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    🎉 <strong>면세 5,500엔 달성!</strong>
                  </span>
                  <span className="text-[11px] font-normal text-emerald-700">
                    여권 제시 시 10% 면세 환급
                  </span>
                </div>
              ) : (
                <div className="text-slate-600 font-medium flex items-center justify-between text-[11px]">
                  <span>
                    면세까지 앞으로{' '}
                    <strong className="text-indigo-600 font-bold">
                      {taxFreeGap.toLocaleString()}円
                    </strong>{' '}
                    남았어요!
                  </span>
                  <span className="text-slate-400">(약 {Math.round((taxFreeGap * ratePer100Yen) / 100).toLocaleString()}원)</span>
                </div>
              )}
            </div>
          </div>

          {/* 탭 1: 쇼핑 키패드 & 빠른 추가 버튼 */}
          {activeTab === 'converter' && (
            <div className="space-y-3">
              {/* 빠른 금액 증감 칩 */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+100円', val: 100 },
                  { label: '+500円', val: 500 },
                  { label: '+1,000円', val: 1000 },
                  { label: '+5,000円', val: 5000 },
                  { label: '+10,000円', val: 10000 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    onClick={() => handleAddYen(chip.val)}
                    className="flex-1 min-w-[68px] py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-100 cursor-pointer text-center"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* 터치 친화적 4x3 계산기 키패드 */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'DEL'].map((key) => {
                  const isDel = key === 'DEL';
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className={`h-12 rounded-2xl font-black text-base transition flex items-center justify-center cursor-pointer shadow-2xs ${
                        isDel
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {isDel ? <Delete className="w-5 h-5" /> : key}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleKeypadPress('C')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  금액 초기화 (Clear)
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${finalYen.toLocaleString()}円 (약 ${krwAmount.toLocaleString()}원)`,
                      'copy_price'
                    )
                  }
                  className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-200"
                >
                  {copiedKey === 'copy_price' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      금액 복사
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 탭 2: 와리깡 (더치페이) 계산기 */}
          {activeTab === 'warikan' && (
            <div className="space-y-4 animate-fadeIn">
              {/* 인원수 선택 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    나눌 인원수
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHeadcount((prev) => Math.max(2, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-indigo-700 text-base">
                      {headcount}명
                    </span>
                    <button
                      onClick={() => setHeadcount((prev) => Math.min(10, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 빠른 인원 칩 */}
                <div className="flex gap-1.5">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setHeadcount(num)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        headcount === num
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {num}명
                    </button>
                  ))}
                </div>
              </div>

              {/* 올림/절사 옵션 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  동전 최소화 / 올림 단위 선택
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setRounding('round100')}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      rounding === 'round100'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">100엔 올림</div>
                    <div className="text-[10px] text-slate-500 font-medium">추천 · 잔돈 최소화</div>
                  </button>
                  <button
                    onClick={() => setRounding('round10')}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      rounding === 'round10'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">10엔 올림</div>
                    <div className="text-[10px] text-slate-500 font-medium">10엔 동전 깔끔</div>
                  </button>
                  <button
                    onClick={() => setRounding('exact')}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      rounding === 'exact'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">정확한 1엔</div>
                    <div className="text-[10px] text-slate-500 font-medium">정밀 1/N 계산</div>
                  </button>
                </div>
              </div>

              {/* 와리깡 정산 결과 카드 */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between text-xs text-indigo-100">
                  <span>1인당 부담 금액 (1人あたり)</span>
                  <span className="font-bold">{headcount}명 분할</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-black font-mono tracking-tight">
                    {warikanResults.perPersonYen.toLocaleString()}
                    <span className="text-base font-bold text-indigo-200 ml-1">円</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-300 font-mono">
                    약 {warikanResults.perPersonKrw.toLocaleString()}원
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20 text-[11px] text-indigo-100 flex items-center justify-between">
                  <span>
                    총 수금: {warikanResults.totalCollected.toLocaleString()}円 (계산서:{' '}
                    {finalYen.toLocaleString()}円)
                  </span>
                  {warikanResults.diffYen > 0 && (
                    <span className="bg-amber-400/90 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      +{warikanResults.diffYen}円 공동경비 잔여
                    </span>
                  )}
                </div>
              </div>

              {/* 카카오톡 / 클립보드 공유 버튼 */}
              <button
                onClick={handleCopyWarikanShare}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {copiedKey === 'warikan_share' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-800" />
                    <span>정산 내역 복사 완료! 카톡에 붙여넣기 하세요</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>📋 와리깡 정산 내역 복사 (카톡 공유용)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 일본 현지 쇼핑/정산 실전 회화 팁 아코디언/카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                💬 현지 쇼핑 · 정산 필수 일본어
              </span>
              <span className="text-[10px] text-slate-400">발음 듣기 & 복사</span>
            </div>

            <div className="space-y-2">
              {SHOPPING_PHRASES.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600">
                        {item.badge}
                      </span>
                      <span className="font-bold text-xs text-slate-800 tracking-tight truncate">
                        {item.jp}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {item.reading} · <span className="text-slate-700">{item.kr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => speakJapanese(item.jp, 1.0)}
                      className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center cursor-pointer transition"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(item.jp, `phrase_${idx}`)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
                      title="일본어 복사"
                    >
                      {copiedKey === `phrase_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 모달 하단 닫기 바 */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

