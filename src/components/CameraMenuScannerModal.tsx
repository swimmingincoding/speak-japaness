import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Volume2,
  Copy,
  BookmarkPlus,
  Check,
  Utensils,
  Store,
  HelpCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import {
  scanJapaneseMenuWithVision,
  VisionMenuScanResult,
  VisionMenuItem,
} from '../utils/aiService';
import { speakJapanese } from '../utils/speech';
import { AIConfig, SavedExpression } from '../types/conversation';
import { FuriganaText } from './FuriganaText';

interface CameraMenuScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig?: AIConfig;
  onSaveExpression?: (expr: SavedExpression) => void;
}

// 오프라인 / 데모 테스트용 대표 일본 맛집 메뉴판 프리셋
const DEMO_PRESETS: { [key: string]: VisionMenuScanResult } = {
  ramen: {
    placeCategory: '🍜 도쿄 돈코츠 & 츠케멘 전문점',
    summary: '진한 돼지뼈와 어패류 육수로 유명한 도쿄의 인기 라멘 전문점 메뉴판입니다.',
    orderingTip: '입구 자판기에서 식권을 구매한 후, 점원이 "오코노미와?(취향은?)" 물어보면 "후츠-데(보통으로)"라고 하시면 됩니다.',
    items: [
      {
        japanese: '特製濃厚つけ麺',
        furigana: 'とくせいのうこうつけめん',
        pronunciation: '토쿠세- 노-코- 츠케멘',
        koreanTranslation: '특제 진한 츠케멘 (면을 국물에 찍어먹는 라멘)',
        price: '1,200円',
        description: '도톰한 숯불 차슈와 반숙 맛달걀(아지타마)이 포함된 시그니처 1위 메뉴',
        recommendation: 'BEST',
      },
      {
        japanese: '濃厚味玉らーめん',
        furigana: 'のうこうあじたまらーめん',
        pronunciation: '노-코- 아지타마 라-멘',
        koreanTranslation: '진한 맛달걀 돈코츠 라멘',
        price: '1,000円',
        description: '깊은 풍미의 돈코츠 스프와 쫄깃한 면발, 촉촉한 반숙 달걀의 조화',
        recommendation: 'HOT',
      },
      {
        japanese: '手作り焼き餃子 (5個)',
        furigana: 'てづくりやきぎょうざ (ごこ)',
        pronunciation: '테즈쿠리 야키교-자 (고코)',
        koreanTranslation: '수제 군만두 (5개)',
        price: '400円',
        description: '바삭한 피와 육즙 가득한 돼지고기 소가 일품인 사이드 만두',
      },
      {
        japanese: '生ビール (中)',
        furigana: 'なまびーる (ちゅう)',
        pronunciation: '나마비-루 (츄-)',
        koreanTranslation: '생맥주 (중간 잔)',
        price: '550円',
        description: '시원한 아사히 슈퍼드라이 생맥주',
      },
    ],
  },
  izakaya: {
    placeCategory: '🍢 신주쿠 오모이데요코초 숯불 이자카야',
    summary: '퇴근길 현지인들이 숯불 꼬치구이와 하이볼을 즐기는 정통 이자카야 메뉴판입니다.',
    orderingTip: '자리에 앉으면 기본 안주(오토오시)가 제공되며, 먼저 "토리아에즈 나마(우선 생맥주)"로 첫 잔을 주문해보세요.',
    items: [
      {
        japanese: '焼き鳥盛り合わせ (5本)',
        furigana: 'やきとりもりあわせ (ごほん)',
        pronunciation: '야키토리 모리아와세 (고혼)',
        koreanTranslation: '숯불 닭꼬치 모둠 (5꼬치)',
        price: '980円',
        description: '닭다리살, 네기마(파닭), 닭날개, 염통 등 인기 부위 모둠 (타레/소금 선택)',
        recommendation: 'BEST',
      },
      {
        japanese: '若鶏の唐揚げ',
        furigana: 'わかどりのからあげ',
        pronunciation: '와카도리노 카라아게',
        koreanTranslation: '바삭한 일본식 닭튀김 (가라아게)',
        price: '680円',
        description: '간장과 생강으로 마리네이드하여 겉바속촉하게 튀겨낸 안주',
        recommendation: 'HOT',
      },
      {
        japanese: '角ハイボール',
        furigana: 'かくはいぼーる',
        pronunciation: '카쿠 하이보-루',
        koreanTranslation: '산토리 가쿠 하이볼',
        price: '480円',
        description: '산토리 위스키와 탄산수를 황금 비율로 섞어 깔끔하고 청량한 맛',
      },
      {
        japanese: '塩茹で枝豆',
        furigana: 'しおゆでえだまめ',
        pronunciation: '시오유데 에다마메',
        koreanTranslation: '소금에 삶은 풋콩',
        price: '380円',
        description: '맥주 안주로 손이 계속 가는 고소하고 담백한 풋콩',
      },
    ],
  },
  cafe: {
    placeCategory: '☕ 긴자 전통 킷사텐 & 디저트 카페',
    summary: '앤티크한 분위기에서 핸드드립 커피와 부드러운 수플레 디저트를 파는 카페 메뉴입니다.',
    orderingTip: '아이스 커피는 "아이수 코-히-", 따뜻한 커피는 "호또 코-히-"라고 부릅니다.',
    items: [
      {
        japanese: 'ふわふわスフレパンケーキ',
        furigana: 'ふわふわすふれぱんけーき',
        pronunciation: '후와후와 수후레 판케-키',
        koreanTranslation: '폭신폭신 수플레 팬케이크',
        price: '1,350円',
        description: '주문 즉시 구워 입안에서 사르르 녹는 부드러운 수플레 케이크',
        recommendation: 'BEST',
      },
      {
        japanese: '炭火焙煎ブレンド珈琲',
        furigana: 'すみびばいせんぶれんどこーひー',
        pronunciation: '스미비 바이센 부렌도 코-히-',
        koreanTranslation: '숯불 로스팅 블렌드 드립 커피',
        price: '650円',
        description: '깊은 훈연향과 묵직한 바디감이 느껴지는 하우스 블렌드 커피',
        recommendation: 'HOT',
      },
      {
        japanese: '宇治抹茶パフェ',
        furigana: 'うじまっちゃぱふぇ',
        pronunciation: '우지 맛차 파훼',
        koreanTranslation: '교토 우지 말차 파르페',
        price: '1,100円',
        description: '진한 말차 아이스크림, 떡(시라타마), 단팥이 층층이 담긴 파르페',
      },
    ],
  },
};

export const CameraMenuScannerModal: React.FC<CameraMenuScannerModalProps> = ({
  isOpen,
  onClose,
  aiConfig,
  onSaveExpression,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<VisionMenuScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 주문 카드 크게 보기 상태
  const [focusedItem, setFocusedItem] = useState<VisionMenuItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // 클라이언트 측 이미지 압축 및 리사이징 (최대 1280px)
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context error');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 사진 선택 / 촬영 핸들러
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      setIsScanning(true);
      const dataUrl = await resizeImage(file);
      setSelectedImage(dataUrl);

      // Gemini Vision API 호출
      if (aiConfig?.apiKey?.trim()) {
        const result = await scanJapaneseMenuWithVision(dataUrl, aiConfig);
        if (result && result.items.length > 0) {
          setScanResult(result);
        } else {
          // 비전 실패 시 데모 데이터로 fallback 안내
          setErrorMessage('메뉴판 텍스트 인식이 어려워 샘플 데이터를 불러왔습니다. 조명이 밝은 곳에서 글씨가 선명하게 다시 촬영해주세요.');
          setScanResult(DEMO_PRESETS.ramen);
        }
      } else {
        // API 키가 없을 때 기본 라멘 프리셋으로 안내
        setErrorMessage('AI 키가 등록되어 있지 않아 [도쿄 라멘 맛집] 샘플 분석 화면을 표시합니다. 설정에서 Gemini API 키를 넣으면 실제 촬영 사진을 실시간 분석합니다!');
        setScanResult(DEMO_PRESETS.ramen);
      }
    } catch (err) {
      setErrorMessage('이미지 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsScanning(false);
    }
  };

  // 프리셋 선택
  const handleSelectPreset = (key: 'ramen' | 'izakaya' | 'cafe') => {
    setErrorMessage(null);
    setIsScanning(true);
    setSelectedImage(null);
    setTimeout(() => {
      setScanResult(DEMO_PRESETS[key]);
      setIsScanning(false);
    }, 400);
  };

  // 복사
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // 단어장 저장
  const handleSaveToVocab = (item: VisionMenuItem, key: string) => {
    if (onSaveExpression) {
      onSaveExpression({
        id: `menu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        scenarioId: 'menu_scanner',
        scenarioTitle: scanResult?.placeCategory || '메뉴판 스캔',
        speaker: 'customer',
        japanese: `${item.japanese}をお願いします。`,
        furigana: item.furigana ? `${item.furigana}をおねがいします。` : `${item.japanese}をおねがいします。`,
        koreanTranslation: `${item.koreanTranslation} 주세요.`,
        koreanPronunciation: `${item.pronunciation} 오네가이시마스`,
        realLifeTip: item.description,
        savedAt: new Date().toISOString(),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[460px] max-h-[calc(100dvh-2rem)] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
              📷
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base leading-tight tracking-tight">
                  메뉴판 · 간판 AI 스캐너
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                  Gemini Vision
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                손글씨/세로쓰기 한자 판독 · 발음 · 한국어 뜻
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

        {/* 숨김 파일 인풋 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 촬영 및 업로드 버튼 영역 */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="py-3.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex flex-col items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>카메라로 즉시 촬영</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              disabled={isScanning}
              className="py-3.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex flex-col items-center justify-center gap-1.5 border border-slate-200 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-5 h-5 text-slate-600" />
              <span>사진 앨범에서 선택</span>
            </button>
          </div>

          {/* 원터치 샘플 프리셋 버튼 (테스트 및 체험용) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">
              💡 실전 맛집 메뉴판 미리보기 체험:
            </span>
            <div className="flex gap-1.5">
              {[
                { key: 'ramen', label: '🍜 라멘집' },
                { key: 'izakaya', label: '🍢 이자카야' },
                { key: 'cafe', label: '☕ 킷사텐 카페' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleSelectPreset(p.key as any)}
                  className="flex-1 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-100 cursor-pointer text-center"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 스캐닝 진행 애니메이션 */}
          {isScanning && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-fadeIn">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-amber-400 absolute -top-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-800">
                  Gemini Vision AI가 메뉴판을 분석 중입니다...
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  한자 후리가나 · 한국어 번역 · 추천 요리 추출
                </p>
              </div>
            </div>
          )}

          {/* 오류/안내 배너 */}
          {errorMessage && !isScanning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-900 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* 스캔 결과 뷰 */}
          {scanResult && !isScanning && (
            <div className="space-y-3 animate-fadeIn">
              {/* 장소 요약 카드 */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-indigo-300">
                    {scanResult.placeCategory}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {scanResult.items.length}개 메뉴 판독
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {scanResult.summary}
                </p>
                {scanResult.orderingTip && (
                  <div className="pt-2 border-t border-white/15 text-[11px] text-amber-300 flex items-start gap-1.5">
                    <span className="shrink-0 font-bold">💡 팁:</span>
                    <span className="text-slate-300">{scanResult.orderingTip}</span>
                  </div>
                )}
              </div>

              {/* 판독된 메뉴 리스트 */}
              <div className="space-y-2.5">
                {scanResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {item.recommendation && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                              {item.recommendation}
                            </span>
                          )}
                          <span className="text-base font-black text-slate-900 tracking-tight">
                            {item.japanese}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-indigo-600">
                          {item.furigana && `(${item.furigana})`} · [{item.pronunciation}]
                        </div>
                      </div>

                      {item.price && (
                        <span className="font-black text-sm text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                          {item.price}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-extrabold text-slate-800">
                      {item.koreanTranslation}
                    </div>

                    {item.description && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                        {item.description}
                      </div>
                    )}

                    {/* 액션 버튼 바 */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      {/* 점원에게 주문하기 (보여주기) */}
                      <button
                        onClick={() => {
                          setFocusedItem(item);
                          speakJapanese(`${item.japanese}をお願いします。`, 1.0);
                        }}
                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>"이걸로 주세요" 주문</span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => speakJapanese(item.japanese, 1.0)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition"
                          title="발음 듣기"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(item.japanese, `copy_${idx}`)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition"
                          title="일본어 복사"
                        >
                          {copiedKey === `copy_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {onSaveExpression && (
                          <button
                            onClick={() => handleSaveToVocab(item, `save_${idx}`)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition"
                            title="단어장에 저장"
                          >
                            {savedKey === `save_${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <BookmarkPlus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 초기 진입 안내 (아직 결과가 없을 때) */}
          {!scanResult && !isScanning && (
            <div className="py-10 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs mx-auto flex items-center justify-center text-indigo-600">
                <Utensils className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">
                일본 식당에서 메뉴판을 찍어보세요!
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                손글씨로 적힌 이자카야 메뉴, 라멘 자판기 티켓, 돈키호테 상품 설명까지 Gemini Vision이 한자와 뜻을 실시간으로 읽어드립니다.
              </p>
            </div>
          )}
        </div>

        {/* 점원에게 바로 보여주는 큰 글씨 주문 팝업 (포커스 모드) */}
        {focusedItem && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col justify-between text-white animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">
                👉 점원에게 화면을 그대로 보여주세요!
              </span>
              <button
                onClick={() => setFocusedItem(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-4 my-auto py-6">
              <div className="text-xs text-slate-300 font-bold bg-white/10 py-1 px-3 rounded-full inline-block">
                {focusedItem.koreanTranslation}
              </div>

              <div className="space-y-2">
                <div className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight leading-tight">
                  {focusedItem.japanese}
                </div>
                <div className="text-2xl font-bold text-white">
                  をお願いします
                </div>
                <div className="text-sm font-bold text-indigo-300">
                  [{focusedItem.pronunciation} 오네가이시마스]
                </div>
              </div>

              {focusedItem.price && (
                <div className="text-xl font-bold text-slate-200 font-mono">
                  {focusedItem.price}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => speakJapanese(`${focusedItem.japanese}をお願いします。`, 1.0)}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Volume2 className="w-4 h-4" />
                음성 다시 듣기
              </button>
              <button
                onClick={() => setFocusedItem(null)}
                className="flex-1 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl text-xs flex items-center justify-center cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        )}

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
