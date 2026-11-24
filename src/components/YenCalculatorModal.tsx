import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
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
  TrendingUp,
  ArrowLeftRight,
  Plus,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { speakJapanese } from '../utils/speech';

interface YenCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartItem {
  id: string;
  rawYen: number;
  finalYen: number;
  isTaxExclusive: boolean;
}

const STORAGE_RATE_KEY = 'tabitalk_exchange_rate_v1';
const STORAGE_CART_KEY = 'tabitalk_shopping_cart_v1';
const DEFAULT_RATE_PER_100_YEN = 910; // 100엔당 910원 (기본값)
const TAX_FREE_THRESHOLD_JPY = 5500; // 일본 면세 기준선 5,500엔 (세금 포함)

type CalcTab = 'converter' | 'warikan';
type InputCurrency = 'JPY' | 'KRW';
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
  const [activeTab, setActiveTab] = useState<CalcTab>('converter');
  const [inputCurrency, setInputCurrency] = useState<InputCurrency>('JPY');

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

  // 쇼핑 장바구니 (돈키호테/드럭스토어 다품목 합산용, 오프라인 유지)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CART_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [tempRateInput, setTempRateInput] = useState<string>(ratePer100Yen.toString());

  // 현재 키패드 입력값
  const [inputStr, setInputStr] = useState<string>(() => (cartItems.length > 0 ? '0' : '2980'));

  // 소비세 토글: true = 세금 별도(税抜 가격표라 +10% 가산), false = 세금 포함(税込 그대로)
  const [isTaxExclusive, setIsTaxExclusive] = useState<boolean>(true);

  // 와리깡(더치페이) 설정
  const [headcount, setHeadcount] = useState<number>(3);
  const [rounding, setRounding] = useState<RoundingOption>('round100');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const rawInputNum = useMemo(() => {
    const parsed = parseInt(inputStr.replace(/[^0-9]/g, '') || '0', 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [inputStr]);

  // 현재 입력 중인 단품의 엔화 환산치 (KRW 입력 모드일 경우 역산)
  const currentRawYen = useMemo(() => {
    if (inputCurrency === 'JPY') return rawInputNum;
    return Math.round((rawInputNum * 100) / Math.max(1, ratePer100Yen));
  }, [rawInputNum, inputCurrency, ratePer100Yen]);

  const currentTaxYen = useMemo(() => {
    if (inputCurrency === 'KRW' || !isTaxExclusive) return 0;
    return Math.floor(currentRawYen * 0.1);
  }, [currentRawYen, isTaxExclusive, inputCurrency]);

  const currentFinalYen = currentRawYen + currentTaxYen;

  // 장바구니 누적 합계 (세금 포함 기준)
  const cartTotalYen = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.finalYen, 0),
    [cartItems]
  );
  const cartRawTotalYen = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.rawYen, 0),
    [cartItems]
  );

  // 최종 결제 예정 엔화 총액 (장바구니 합계 + 현재 입력 중인 금액)
  const finalYen = cartTotalYen + currentFinalYen;
  const krwAmount = useMemo(() => {
    if (inputCurrency === 'KRW' && cartItems.length === 0) return rawInputNum;
    return Math.round((finalYen * ratePer100Yen) / 100);
  }, [finalYen, ratePer100Yen, inputCurrency, cartItems.length, rawInputNum]);

  // 면세 트래커 진척도 (세금 포함 5,500엔 또는 세전 5,000엔 기준)
  const taxFreeProgress = useMemo(() => {
    const pct = (finalYen / TAX_FREE_THRESHOLD_JPY) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }, [finalYen]);

  const taxFreeGap = useMemo(() => {
    return Math.max(0, TAX_FREE_THRESHOLD_JPY - finalYen);
  }, [finalYen]);

  // 면세 적용 시 돌려받는(아끼는) 예상 세금 절감액
  const estimatedTaxSavedYen = useMemo(() => {
    if (finalYen < TAX_FREE_THRESHOLD_JPY) return 0;
    return Math.floor(finalYen - finalYen / 1.1);
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
      perPersonYen = Math.ceil(finalYen / headcount / 10) * 10;
    } else {
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

  // 통화 방향 스왑 (엔화 입력 <-> 원화 예산 역산)
  const handleToggleCurrency = () => {
    if (inputCurrency === 'JPY') {
      const convertedKrw = Math.round((currentFinalYen * ratePer100Yen) / 100);
      setInputCurrency('KRW');
      setInputStr(convertedKrw > 0 ? convertedKrw.toString() : '10000');
    } else {
      setInputCurrency('JPY');
      setInputStr(currentRawYen > 0 ? currentRawYen.toString() : '0');
    }
  };

  // 장바구니에 현재 품목 추가
  const handleAddToCart = () => {
    if (currentFinalYen <= 0) return;
    setCartItems((prev) => [
      ...prev,
      {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        rawYen: currentRawYen,
        finalYen: currentFinalYen,
        isTaxExclusive: inputCurrency === 'JPY' && isTaxExclusive,
      },
    ]);
    setInputStr('0');
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setInputStr('0');
      return;
    }
    if (val === 'DEL') {
      setInputStr((prev) => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    setInputStr((prev) => {
      if (prev === '0') return val === '00' ? '0' : val;
      if (prev.length >= 9) return prev;
      return prev + val;
    });
  };

  const handleAddAmount = (amount: number) => {
    const cur = parseInt(inputStr || '0', 10);
    const next = Math.min(999999999, cur + amount);
    setInputStr(next.toString());
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCopyWarikanShare = () => {
    const text =
      `💴 일본 여행 와리깡(더치페이) 정산 결과\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 총 결제액: ${finalYen.toLocaleString()}円 (약 ${krwAmount.toLocaleString()}원)\n` +
      `• 나눌 인원: ${headcount}명\n` +
      `👉 1인당 부담액: ${warikanResults.perPersonYen.toLocaleString()}円 (약 ${warikanResults.perPersonKrw.toLocaleString()}원)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${warikanResults.diffYen > 0 ? `(잔돈 남는 +${warikanResults.diffYen}円은 공동 경비/팁으로 적립!)` : ''}`;

    copyToClipboard(text, 'warikan_share');
  };

  if (!isOpen) return null;

  const quickChips =
    inputCurrency === 'JPY'
      ? [
          { label: '+100円', val: 100 },
          { label: '+500円', val: 500 },
          { label: '+1,000円', val: 1000 },
          { label: '+5,000円', val: 5000 },
          { label: '+10,000円', val: 10000 },
        ]
      : [
          { label: '+1천원', val: 1000 },
          { label: '+5천원', val: 5000 },
          { label: '+1만원', val: 10000 },
          { label: '+5만원', val: 50000 },
        ];

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
                  엔화 장바구니 & 와리깡 계산기
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  양방향
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                장바구니 누적 합산 · 면세 5,500엔 트래커
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

        {/* 탭 전환 */}
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
            쇼핑 · 장바구니{cartItems.length > 0 ? ` (${cartItems.length})` : ''}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 smooth-scroll">
          {/* 금액 디스플레이 카드 */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
            {/* 상단 모드 및 통화 스왑 토글 */}
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <button
                onClick={handleToggleCurrency}
                className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-400/40 text-indigo-100 flex items-center gap-1 transition cursor-pointer"
                title="엔화 입력 ↔ 원화 예산 역산 전환"
              >
                <ArrowLeftRight className="w-3 h-3 text-amber-300" />
                <span>{inputCurrency === 'JPY' ? '🇯🇵 엔화 입력 중' : '🇰🇷 원화 역산 중'}</span>
              </button>

              {inputCurrency === 'JPY' && (
                <button
                  onClick={() => setIsTaxExclusive(!isTaxExclusive)}
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer border ${
                    isTaxExclusive
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  {isTaxExclusive ? '+10% 세금별도(税抜)' : '세금포함가(税込)'}
                </button>
              )}
            </div>

            {/* 현재 입력 금액 표시 */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl font-black tracking-tight text-white font-mono">
                  {rawInputNum.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-slate-300">
                  {inputCurrency === 'JPY' ? '円' : '원'}
                </span>
                {inputCurrency === 'JPY' && isTaxExclusive && rawInputNum > 0 && (
                  <span className="text-xs text-amber-300 ml-1 font-semibold">
                    + 세금 {currentTaxYen.toLocaleString()}円
                  </span>
                )}
                {inputCurrency === 'KRW' && rawInputNum > 0 && (
                  <span className="text-xs text-emerald-300 ml-1 font-semibold">
                    ≈ {currentRawYen.toLocaleString()}円
                  </span>
                )}
              </div>

              {activeTab === 'converter' && currentFinalYen > 0 && (
                <button
                  onClick={handleAddToCart}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer shadow-sm"
                  title="장바구니 합계에 추가하고 다음 상품 입력"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>바구니 담기</span>
                </button>
              )}
            </div>

            {/* 최종 결제 총액 (장바구니 합산 반영) */}
            <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-indigo-400" />
                  {cartItems.length > 0
                    ? `총 합계 (바구니 ${cartItems.length}개 포함)`
                    : '최종 결제 예정'}
                </span>
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

          {/* 담긴 장바구니 미니 영수증 리스트 */}
          {cartItems.length > 0 && (
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                  장바구니 담긴 품목 ({cartItems.length}개 · 세전 {cartRawTotalYen.toLocaleString()}円)
                </span>
                <button
                  onClick={() => setCartItems([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  전체 비우기
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                    <span className="font-mono">{item.finalYen.toLocaleString()}円</span>
                    <button
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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

            <div className="text-xs">
              {taxFreeGap === 0 ? (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-between">
                  <span>🎉 면세 5,500엔 달성!</span>
                  <span className="text-[11px] font-extrabold text-emerald-700">
                    약 {estimatedTaxSavedYen.toLocaleString()}円 세금 절약!
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
                  <span className="text-slate-400">
                    (약 {Math.round((taxFreeGap * ratePer100Yen) / 100).toLocaleString()}원)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 탭 1: 키패드 & 빠른 추가 버튼 */}
          {activeTab === 'converter' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip) => (
                  <button
                    key={chip.val}
                    onClick={() => handleAddAmount(chip.val)}
                    className="flex-1 min-w-[68px] py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-100 cursor-pointer text-center"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'DEL'].map((key) => {
                  const isDel = key === 'DEL';
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className={`h-12 rounded-2xl font-black text-base transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 ${
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
                  입력창 지우기 (C)
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
                      <Copy className="w-3.5 h-3.5" />총 금액 복사
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 탭 2: 와리깡 (더치페이) 계산기 */}
          {activeTab === 'warikan' && (
            <div className="space-y-4 animate-fadeIn">
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

          {/* 일본 현지 쇼핑/정산 실전 회화 팁 */}
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
        <div className="p-3 pb-[calc(env(safe-area-inset-bottom,6px)+0.5rem)] bg-slate-50 border-t border-slate-100 text-center">
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
