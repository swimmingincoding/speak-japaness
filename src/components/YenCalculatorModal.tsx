import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Volume2,
  Users,
  Percent,
  Delete,
  Settings2,
  ArrowLeftRight,
  Plus,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { speakJapanese } from '../utils/speech';

interface YenCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CartItem {
  id: string;
  rawYen: number;
  finalYen: number;
  isTaxExclusive: boolean;
  label?: string;
}

const STORAGE_RATE_KEY = 'tabitalk_exchange_rate_v1';
const STORAGE_CART_KEY = 'tabitalk_shopping_cart_v1';

/**
 * 외부 컴포넌트(메뉴판 AI 스캐너 등)에서 판독한 메뉴 가격을 엔화 계산기 장바구니에 원터치로 추가합니다.
 */
export function addExternalItemToYenCart(yenAmount: number, label?: string): number {
  if (!Number.isFinite(yenAmount) || yenAmount <= 0) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_CART_KEY);
    const prev: CartItem[] = raw ? JSON.parse(raw) : [];
    const next: CartItem[] = [
      ...prev,
      {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        rawYen: Math.round(yenAmount),
        finalYen: Math.round(yenAmount),
        isTaxExclusive: false,
        label: label?.slice(0, 14),
      },
    ];
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(next));
    return next.length;
  } catch {
    return 0;
  }
}

const DEFAULT_RATE_PER_100_YEN = 910;
const TAX_FREE_THRESHOLD_JPY = 5500;

type CalcTab = 'converter' | 'warikan';
type InputCurrency = 'JPY' | 'KRW';
type RoundingOption = 'exact' | 'round10' | 'round100';

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
    kr: '봉투는 필요 없어요',
    badge: '봉투',
  },
];

export const YenCalculatorModal: React.FC<YenCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<CalcTab>('converter');
  const [inputCurrency, setInputCurrency] = useState<InputCurrency>('JPY');

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
  const [inputStr, setInputStr] = useState<string>(() => (cartItems.length > 0 ? '0' : '2980'));
  const [isTaxExclusive, setIsTaxExclusive] = useState<boolean>(true);
  const [headcount, setHeadcount] = useState<number>(3);
  const [rounding, setRounding] = useState<RoundingOption>('round100');
  const [showPhrases, setShowPhrases] = useState<boolean>(false);
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
      try {
        const saved = localStorage.getItem(STORAGE_CART_KEY);
        if (saved) {
          const parsed: CartItem[] = JSON.parse(saved);
          setCartItems(parsed);
          if (parsed.length > 0) {
            setInputStr('0');
          }
        }
      } catch {
        // ignore
      }
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

  const currentRawYen = useMemo(() => {
    if (inputCurrency === 'JPY') return rawInputNum;
    return Math.round((rawInputNum * 100) / Math.max(1, ratePer100Yen));
  }, [rawInputNum, inputCurrency, ratePer100Yen]);

  const currentTaxYen = useMemo(() => {
    if (inputCurrency === 'KRW' || !isTaxExclusive) return 0;
    return Math.floor(currentRawYen * 0.1);
  }, [currentRawYen, isTaxExclusive, inputCurrency]);

  const currentFinalYen = currentRawYen + currentTaxYen;

  const cartTotalYen = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.finalYen, 0),
    [cartItems]
  );

  const finalYen = cartTotalYen + currentFinalYen;
  const krwAmount = useMemo(() => {
    if (inputCurrency === 'KRW' && cartItems.length === 0) return rawInputNum;
    return Math.round((finalYen * ratePer100Yen) / 100);
  }, [finalYen, ratePer100Yen, inputCurrency, cartItems.length, rawInputNum]);

  const taxFreeProgress = useMemo(() => {
    const pct = (finalYen / TAX_FREE_THRESHOLD_JPY) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }, [finalYen]);

  const taxFreeGap = useMemo(() => {
    return Math.max(0, TAX_FREE_THRESHOLD_JPY - finalYen);
  }, [finalYen]);

  const estimatedTaxSavedYen = useMemo(() => {
    if (finalYen < TAX_FREE_THRESHOLD_JPY) return 0;
    return Math.floor(finalYen - finalYen / 1.1);
  }, [finalYen]);

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
          { label: '+100', val: 100 },
          { label: '+500', val: 500 },
          { label: '+1천', val: 1000 },
          { label: '+5천', val: 5000 },
          { label: '+1만', val: 10000 },
        ]
      : [
          { label: '+1천원', val: 1000 },
          { label: '+5천원', val: 5000 },
          { label: '+1만원', val: 10000 },
          { label: '+5만원', val: 50000 },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-[480px] max-h-[94dvh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
        {/* 상단 핸들 바 & 컴팩트 헤더 */}
        <div className="pt-2.5 px-5 pb-2.5 border-b border-slate-100 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2.5 sm:hidden" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-900">엔화 계산기</h3>
              <button
                type="button"
                onClick={() => {
                  setTempRateInput(ratePer100Yen.toString());
                  setIsEditingRate(!isEditingRate);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition"
              >
                <Settings2 className="w-3 h-3 text-indigo-600" />
                <span>100엔 = {ratePer100Yen}원</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isEditingRate && (
            <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs animate-fadeIn">
              <span className="text-slate-700 font-bold whitespace-nowrap">100엔 기준:</span>
              <input
                type="number"
                value={tempRateInput}
                onChange={(e) => setTempRateInput(e.target.value)}
                className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-center font-bold text-[16px] text-slate-900 focus:outline-none focus:border-indigo-500"
                placeholder="910"
              />
              <span className="text-slate-600 font-bold">원</span>
              <button
                onClick={handleSaveRate}
                className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl cursor-pointer transition"
              >
                적용
              </button>
            </div>
          )}
        </div>

        {/* 스크롤 본문: 첫 화면에 금액 카드와 키패드가 한눈에 들어오도록 압축 */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-5 space-y-3 smooth-scroll">
          {/* 세그먼트 탭 */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100">
            <button
              onClick={() => setActiveTab('converter')}
              className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'converter'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              쇼핑 · 장바구니{cartItems.length > 0 ? ` (${cartItems.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('warikan')}
              className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'warikan'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              와리깡 (더치페이)
            </button>
          </div>

          {/* 통합 금액 디스플레이 + 면세 미니 게이지 카드 */}
          <div className="bg-slate-900 rounded-3xl p-3.5 text-white space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-1.5">
              <button
                onClick={handleToggleCurrency}
                className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3 text-amber-300" />
                <span>{inputCurrency === 'JPY' ? '엔화 입력' : '원화 역산'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {inputCurrency === 'JPY' && (
                  <button
                    onClick={() => setIsTaxExclusive(!isTaxExclusive)}
                    className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer ${
                      isTaxExclusive
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    {isTaxExclusive ? '+10% 세별도' : '세포함'}
                  </button>
                )}

                {activeTab === 'converter' && currentFinalYen > 0 && (
                  <button
                    onClick={handleAddToCart}
                    className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-0.5 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3px]" />
                    <span>담기</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 pt-0.5">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-2xl font-black tracking-tight font-mono">
                    {rawInputNum.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {inputCurrency === 'JPY' ? '円' : '원'}
                  </span>
                  {inputCurrency === 'JPY' && isTaxExclusive && rawInputNum > 0 && (
                    <span className="text-[11px] text-amber-300 font-semibold">
                      (+세금 {currentTaxYen.toLocaleString()}円)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  총 결제 {finalYen.toLocaleString()}円
                  {cartItems.length > 0 ? ` · 바구니 ${cartItems.length}개` : ''}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xl font-black text-amber-300 font-mono">
                  ≈ {krwAmount.toLocaleString()}
                  <span className="text-xs font-bold text-slate-300 ml-0.5">원</span>
                </div>
                {inputCurrency === 'KRW' && rawInputNum > 0 && (
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    약 {currentRawYen.toLocaleString()}円 예산
                  </div>
                )}
              </div>
            </div>

            {/* 1줄 면세 트래커 바 */}
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">
                  {taxFreeGap === 0
                    ? `🎉 면세 5,500円 달성 (약 ${estimatedTaxSavedYen.toLocaleString()}円 절약)`
                    : `면세 5,500円까지 ${taxFreeGap.toLocaleString()}円 남음`}
                </span>
                <span className="font-extrabold text-indigo-300">{taxFreeProgress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    taxFreeGap === 0 ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${taxFreeProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 담긴 장바구니 미니 칩 리스트 */}
          {cartItems.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-slate-700 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                  장바구니 ({cartItems.length}개 · {cartTotalYen.toLocaleString()}円)
                </span>
                <button
                  onClick={() => setCartItems([])}
                  className="font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  비우기
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shrink-0"
                  >
                    <span className="text-[10px] text-slate-400">
                      {item.label ? item.label : `#${idx + 1}`}
                    </span>
                    <span className="font-mono">{item.finalYen.toLocaleString()}円</span>
                    <button
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 탭 1: 첫 화면에 바로 들어오는 키패드 */}
          {activeTab === 'converter' && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {quickChips.map((chip) => (
                  <button
                    key={chip.val}
                    onClick={() => handleAddAmount(chip.val)}
                    className="flex-1 py-1.5 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-extrabold transition cursor-pointer text-center"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'DEL'].map((key) => {
                  const isDel = key === 'DEL';
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className={`h-11 rounded-2xl font-black text-base transition flex items-center justify-center cursor-pointer active:scale-95 ${
                        isDel
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200/80'
                      }`}
                    >
                      {isDel ? <Delete className="w-5 h-5" /> : key}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleKeypadPress('C')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition cursor-pointer"
                >
                  초기화 (C)
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${finalYen.toLocaleString()}円 (약 ${krwAmount.toLocaleString()}원)`,
                      'copy_price'
                    )
                  }
                  className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'copy_price' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">복사 완료</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> 금액 복사
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 탭 2: 와리깡 (더치페이) 계산기 */}
          {activeTab === 'warikan' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    나눌 인원수
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHeadcount((prev) => Math.max(2, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-black text-indigo-700 text-sm">
                      {headcount}명
                    </span>
                    <button
                      onClick={() => setHeadcount((prev) => Math.min(10, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-black cursor-pointer"
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
                      className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        headcount === num
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {num}명
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'round100' as const, title: '100엔 올림', sub: '동전 최소화' },
                  { id: 'round10' as const, title: '10엔 올림', sub: '10엔 단위' },
                  { id: 'exact' as const, title: '정확한 1엔', sub: '정밀 1/N' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setRounding(opt.id)}
                    className={`p-2.5 rounded-2xl text-left border transition cursor-pointer ${
                      rounding === opt.id
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{opt.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>

              <div className="bg-indigo-600 rounded-2xl p-4 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-100 font-bold">
                  <span>1인당 부담액</span>
                  <span>{headcount}명 분할</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black font-mono">
                    {warikanResults.perPersonYen.toLocaleString()}円
                  </div>
                  <div className="text-sm font-extrabold text-amber-300 font-mono">
                    약 {warikanResults.perPersonKrw.toLocaleString()}원
                  </div>
                </div>
                {warikanResults.diffYen > 0 && (
                  <div className="text-[11px] text-indigo-100 pt-1 border-t border-white/15">
                    총 {warikanResults.totalCollected.toLocaleString()}円 수금 (+
                    {warikanResults.diffYen}円 공동경비 남음)
                  </div>
                )}
              </div>

              <button
                onClick={handleCopyWarikanShare}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {copiedKey === 'warikan_share' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>복사 완료! 카톡에 붙여넣으세요</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>정산 내역 카톡 공유용 복사</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 접이식 정산·면세 회화 팁 (필요할 때만 펼쳐서 키패드 시야 확보) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPhrases((p) => !p)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-extrabold text-slate-700 cursor-pointer"
            >
              <span>💬 계산대 · 면세 필수 일본어 표현 (6개)</span>
              {showPhrases ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showPhrases && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-slate-200/60 pt-2 animate-fadeIn">
                {SHOPPING_PHRASES.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                          {item.badge}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {item.jp}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        [{item.reading}] · {item.kr}
                      </div>
                    </div>

                    <button
                      onClick={() => speakJapanese(item.jp, 1.0)}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
