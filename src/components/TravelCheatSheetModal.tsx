import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { SavedExpression } from '../types/conversation';

interface TravelCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedList: SavedExpression[];
}

type ThemeStyle = 'boarding_pass' | 'tokyo_receipt' | 'sakura_bloom';
type LayoutMode = 'iphone16pro_lock' | 'compact_card';

// 단어장이 비어있거나 문장이 적을 때 기본 추천되는 '골든 여행 회화 6선'
const DEFAULT_GOLDEN_PHRASES = [
  {
    jp: 'これ、いくらですか？',
    reading: '코레, 이쿠라데스카?',
    kr: '이거 얼마인가요?',
    tag: '쇼핑',
  },
  {
    jp: 'おすすめは何ですか？',
    reading: '오스스메와 난데스카?',
    kr: '추천 메뉴는 무엇인가요?',
    tag: '식당',
  },
  {
    jp: 'お会計をお願いします。',
    reading: '오카이케-오 오네가이시마스',
    kr: '계산 부탁드립니다.',
    tag: '정산',
  },
  {
    jp: 'トイレはどこですか？',
    reading: '토이레와 도코데스카?',
    kr: '화장실은 어디인가요?',
    tag: '위치',
  },
  {
    jp: 'カード使えますか？',
    reading: '카-도 츠카에마스카?',
    kr: '신용카드 사용할 수 있나요?',
    tag: '결제',
  },
  {
    jp: '別々でお願いします。',
    reading: '베츠베츠데 오네가이시마스',
    kr: '각자 따로 계산해주세요.',
    tag: '정산',
  },
];

// 캔버스 멀티라인 자동 줄바꿈 유틸리티 (우측 잘림 완벽 방지)
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const chars = Array.from(text);
  const lines: string[] = [];
  let currentLine = '';

  for (const ch of chars) {
    const testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export const TravelCheatSheetModal: React.FC<TravelCheatSheetModalProps> = ({
  isOpen,
  onClose,
  savedList,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 아이폰 16 프로 사용자를 위해 잠금화면 시계·하단 아이콘 회피 레이아웃을 기본값으로 설정
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('iphone16pro_lock');
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>('boarding_pass');
  const [travelerName, setTravelerName] = useState<string>('TABI TRAVELER');
  const [includeSOS, setIncludeSOS] = useState<boolean>(true);
  const [includeShoppingTips, setIncludeShoppingTips] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const maxPhraseCount = layoutMode === 'iphone16pro_lock' ? 5 : 6;

  // 치트시트에 들어갈 표현 목록 조합
  const displayItems = React.useMemo(() => {
    if (savedList.length > 0) {
      return savedList.slice(0, maxPhraseCount).map((item) => ({
        jp: item.japanese.replace(/（.*?）|\(.*?\)/g, '').trim(),
        reading: item.koreanPronunciation,
        kr: item.koreanTranslation,
        tag: item.speaker === 'customer' ? '손님' : '점원',
      }));
    }
    return DEFAULT_GOLDEN_PHRASES.slice(0, maxPhraseCount);
  }, [savedList, maxPhraseCount]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      renderCanvas();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, layoutMode, selectedTheme, travelerName, includeSOS, includeShoppingTips, displayItems]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 아이폰 16 프로 해상도 비율 (402 : 874 = 1 : 2.174 -> 900 x 1956 고해상도)
    const isLockMode = layoutMode === 'iphone16pro_lock';
    const W = isLockMode ? 900 : 840;
    const H = isLockMode ? 1956 : 1420;
    canvas.width = W;
    canvas.height = H;

    let bgColor = '#0B132B';
    let bgGradientEnd = '#111C44';
    let cardBg = '#1C2541';
    let primaryColor = '#818CF8';
    let accentColor = '#38BDF8';
    let textColor = '#FFFFFF';
    let subTextColor = '#CBD5E1';
    let dividerColor = 'rgba(255, 255, 255, 0.16)';
    let badgeBg = '#312E81';
    let badgeText = '#C7D2FE';

    if (selectedTheme === 'tokyo_receipt') {
      bgColor = '#E2E8F0';
      bgGradientEnd = '#CBD5E1';
      cardBg = '#FFFFFF';
      primaryColor = '#0F172A';
      accentColor = '#334155';
      textColor = '#0F172A';
      subTextColor = '#475569';
      dividerColor = '#CBD5E1';
      badgeBg = '#F1F5F9';
      badgeText = '#1E293B';
    } else if (selectedTheme === 'sakura_bloom') {
      bgColor = '#FFE4E6';
      bgGradientEnd = '#FECDD3';
      cardBg = '#FFFFFF';
      primaryColor = '#E11D48';
      accentColor = '#BE123C';
      textColor = '#881337';
      subTextColor = '#9F1239';
      dividerColor = '#FECDD3';
      badgeBg = '#FFE4E6';
      badgeText = '#BE123C';
    }

    // 1. 배경 그라데이션 채우기
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 아이폰 16 프로 잠금화면 모드일 때 상단 시계 영역 은은한 배경 장식
    if (isLockMode) {
      ctx.save();
      ctx.fillStyle = selectedTheme === 'boarding_pass' ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(W / 2, 290, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. 메인 티켓 카드 영역 계산
    // 아이폰 16 프로 잠금화면: 상단 590px(약 30.2%, 다이내믹 아일랜드+날짜+시계+위젯 영역) 및 하단 265px(약 13.5%, 손전등/카메라 버튼+홈바) 회피!
    const cardX = 44;
    const cardY = isLockMode ? 590 : 44;
    const cardW = W - 88;
    const cardBottomMargin = isLockMode ? 265 : 44;
    const cardH = H - cardY - cardBottomMargin;
    const radius = 36;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = cardBg;
    ctx.fill();

    if (selectedTheme === 'tokyo_receipt') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#94A3B8';
      ctx.stroke();
    } else if (selectedTheme === 'sakura_bloom') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FDA4AF';
      ctx.stroke();
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.stroke();
    }
    ctx.restore();

    // 카드 내부 클리핑으로 어떤 경우에도 카드 밖으로 넘치지 않게 보호
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.clip();

    const innerLeft = cardX + 34;
    const innerRight = cardX + cardW - 34;
    const contentMaxW = innerRight - innerLeft;

    // 3. 상단 헤더 영역
    let y = cardY + 46;
    const todayStr = new Date().toISOString().split('T')[0];

    ctx.fillStyle = primaryColor;
    ctx.font = '800 14px "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(
      isLockMode
        ? '✈️ TABITALK · iPhone 16 Pro LOCK SCREEN PASS'
        : '✈️ TABITALK TRAVEL PASS · 日本旅行チートシート',
      innerLeft,
      y
    );

    y += 34;
    ctx.fillStyle = textColor;
    ctx.font = '900 28px "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('일본 여행 원핸드 치트시트', innerLeft, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = subTextColor;
    ctx.font = '600 13px "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${travelerName.toUpperCase()} · ${todayStr}`, innerRight, y - 4);
    ctx.textAlign = 'left';

    // 구분 절취선
    y += 22;
    ctx.beginPath();
    ctx.setLineDash([7, 7]);
    ctx.moveTo(innerLeft, y);
    ctx.lineTo(innerRight, y);
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 섹션 1: 현지 즉시 사용 핵심 회화 (자동 줄바꿈 적용)
    y += 30;
    ctx.fillStyle = accentColor;
    ctx.font = '800 14px "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('💬 현지 필수 회화 (BEST PHRASES)', innerLeft, y);
    y += 10;

    const textStartX = innerLeft + 64;
    const phraseMaxW = innerRight - textStartX;

    displayItems.forEach((item, idx) => {
      y += 26;

      // 배지
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(innerLeft, y - 17, 54, 23, 7);
      ctx.fill();

      ctx.fillStyle = badgeText;
      ctx.font = '800 11.5px "Pretendard", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.tag || `NO.${idx + 1}`, innerLeft + 27, y - 1);
      ctx.textAlign = 'left';

      // 일본어 원문 (멀티라인 줄바꿈)
      ctx.fillStyle = textColor;
      ctx.font = '800 20px "Noto Sans JP", "Hiragino Sans", sans-serif';
      const jpLines = wrapCanvasText(ctx, item.jp, phraseMaxW).slice(0, 2);
      jpLines.forEach((line, lIdx) => {
        if (lIdx > 0) y += 24;
        ctx.fillText(line, textStartX, y);
      });

      // 한글 발음 + 한국어 뜻 (멀티라인 줄바꿈)
      y += 21;
      ctx.font = '700 13.5px "Pretendard", -apple-system, sans-serif';
      const subCombined = `[${item.reading}] · ${item.kr}`;
      const subLines = wrapCanvasText(ctx, subCombined, phraseMaxW).slice(0, 2);
      subLines.forEach((sLine, sIdx) => {
        if (sIdx > 0) y += 18;
        ctx.fillStyle = sIdx === 0 ? accentColor : subTextColor;
        ctx.fillText(sLine, textStartX, y);
      });

      y += 6;
    });

    // 5. 섹션 2: 쇼핑 & 세금 정산 꿀팁
    if (includeShoppingTips) {
      y += 16;
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(innerLeft, y);
      ctx.lineTo(innerRight, y);
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      y += 26;
      ctx.fillStyle = accentColor;
      ctx.font = '800 13.5px "Pretendard", -apple-system, sans-serif';
      ctx.fillText('💴 쇼핑 · 소비세 · 면세 핵심 요약', innerLeft, y);

      y += 22;
      const tips = [
        '• 소비세: 가격표 (税抜) 표기 시 결제 금액에 +10% 가산',
        '• 면세(Tax-Free): 5,500円 이상 구매 시 실물 여권 제시',
        '• 더치페이 요청: 別々でお願いします [베츠베츠데 오네가이시마스]',
      ];
      ctx.fillStyle = textColor;
      ctx.font = '600 13.5px "Pretendard", -apple-system, sans-serif';
      tips.forEach((tip) => {
        const tipLines = wrapCanvasText(ctx, tip, contentMaxW);
        tipLines.forEach((tl) => {
          ctx.fillText(tl, innerLeft + 4, y);
          y += 20;
        });
      });
    }

    // 6. 섹션 3: 긴급 연락처
    if (includeSOS) {
      y += 8;
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(innerLeft, y);
      ctx.lineTo(innerRight, y);
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      y += 25;
      ctx.fillStyle = '#FB7185';
      ctx.font = '800 13.5px "Pretendard", -apple-system, sans-serif';
      ctx.fillText('🚨 긴급 비상 연락망 (24시간 SOS)', innerLeft, y);

      y += 21;
      ctx.fillStyle = textColor;
      ctx.font = '700 13.5px "Pretendard", -apple-system, sans-serif';
      ctx.fillText('• 일본 경찰: 110번   |   화재·구급차: 119번', innerLeft + 4, y);
      y += 20;
      ctx.fillText('• 외교부 영사콜센터(한국어 통역): +82-2-3210-0404', innerLeft + 4, y);
    }

    // 7. 카드 하단 바코드 장식
    const barcodeBaseY = cardY + cardH - 52;
    if (y + 20 < barcodeBaseY) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(innerLeft, barcodeBaseY - 12);
      ctx.lineTo(innerRight, barcodeBaseY - 12);
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = textColor;
      for (let i = 0; i < 38; i++) {
        const barW = i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1;
        ctx.fillRect(innerLeft + i * 8.5, barcodeBaseY, barW, 24);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = accentColor;
      ctx.font = '800 12.5px "Pretendard", -apple-system, sans-serif';
      ctx.fillText('SAFE TRIP IN JAPAN 🇯🇵', innerRight, barcodeBaseY + 16);
      ctx.textAlign = 'left';
    }

    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewDataUrl(dataUrl);
  };

  // Blob 기반 안정적 PNG 다운로드 (iOS Safari 대용량 DataURL 제한 우회)
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `TabiTalk_${layoutMode === 'iphone16pro_lock' ? 'iPhone16Pro_LockScreen' : 'CheatSheet'}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    }, 'image/png');
  };

  // 클립보드에 이미지 복사
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } catch {
      handleDownload();
    }
  };

  // 아이폰 사진 앱 바로 저장 / 공유 시트 실행 (iOS Safari 최적 동선)
  const handleShareOrSaveToPhotos = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'TabiTalk_iPhone16Pro_CheatSheet.png', {
          type: 'image/png',
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'TabiTalk 일본 여행 잠금화면 치트시트',
            files: [file],
          });
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[460px] max-h-[calc(100dvh-2rem)] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base leading-tight tracking-tight">
                  여행 치트시트 배경화면 만들기
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                  iPhone 16 Pro
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                잠금화면 시계·하단 버튼 겹침 없는 전용 레이아웃
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

        {/* 숨김 고해상도 캔버스 */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 smooth-scroll">
          {/* 1. 비율 모드 스위치 (아이폰 16 프로 잠금화면 vs 일반 카드) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setLayoutMode('iphone16pro_lock')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'iphone16pro_lock'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone 16 Pro 잠금화면</span>
            </button>
            <button
              onClick={() => setLayoutMode('compact_card')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'compact_card'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>일반 요약 카드</span>
            </button>
          </div>

          {/* 2. 디자인 테마 선택기 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'boarding_pass', label: '✈️ 보딩패스', desc: '네이비 다크' },
              { id: 'tokyo_receipt', label: '🧾 도쿄 영수증', desc: '모던 화이트' },
              { id: 'sakura_bloom', label: '🌸 사쿠라 핑크', desc: '화사한 감성' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id as ThemeStyle)}
                className={`p-2.5 rounded-2xl text-left border transition cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'bg-indigo-50 border-indigo-500 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black text-slate-900">{theme.label}</div>
                <div className="text-[10px] text-slate-500">{theme.desc}</div>
              </button>
            ))}
          </div>

          {/* 3. 옵션 토글 바 */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">여행자 스탬프 닉네임:</span>
              <input
                type="text"
                value={travelerName}
                onChange={(e) => setTravelerName(e.target.value)}
                maxLength={15}
                className="w-40 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-800 text-[16px] sm:text-xs focus:ring-2 focus:ring-indigo-500"
                placeholder="닉네임 입력"
              />
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeShoppingTips}
                  onChange={(e) => setIncludeShoppingTips(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                소비세·면세 요약 포함
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeSOS}
                  onChange={(e) => setIncludeSOS(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                긴급 110/119/영사관 포함
              </label>
            </div>
          </div>

          {/* 4. 미리보기 영역 (잠금화면 모드 시 시계/하단 아이콘 위치 오버레이 시뮬레이션 표시!) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
              <span>
                {layoutMode === 'iphone16pro_lock'
                  ? '📱 상단 시계(30%) · 하단 플래시/카메라(14%) 여백 확보됨'
                  : '🎫 갤러리 열람용 컴팩트 비율'}
              </span>
              <span>
                {savedList.length > 0 ? `내 단어장 ${displayItems.length}문장` : '골든 회화 자동 적용'}
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900 flex items-center justify-center py-3">
              {previewDataUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewDataUrl}
                    alt="여행 치트시트 미리보기"
                    className="w-auto h-[340px] object-contain rounded-xl shadow-lg"
                  />
                  {/* 실제 이미지에는 안 그려지고 미리보기에서만 시계/아이콘 위치를 안내하는 반투명 가이드 */}
                  {layoutMode === 'iphone16pro_lock' && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between items-center py-4 px-5 text-white/45 select-none">
                      <div className="text-center space-y-0.5 mt-2">
                        <div className="w-12 h-2.5 rounded-full bg-black/50 mx-auto mb-1.5" />
                        <div className="text-[8px] font-bold tracking-wider">11월 24일 화요일</div>
                        <div className="text-2xl font-black leading-none tracking-tight">09:41</div>
                        <div className="text-[7px] font-semibold">(iOS 시계 영역 비움)</div>
                      </div>
                      <div className="w-full flex items-center justify-between text-[9px] mb-1">
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">🔦</span>
                        <span className="w-14 h-1 rounded-full bg-white/40 mt-3" />
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">📷</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-24 text-xs text-slate-400 font-bold">이미지 생성 중...</div>
              )}
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl text-[11px] text-indigo-950 leading-relaxed">
            💡 <strong>아이폰 16 프로 꿀팁:</strong> 아래 <strong>[아이폰 사진첩 저장]</strong>을 누른 뒤 공유 시트에서 <strong>'이미지 저장'</strong>을 선택하면 사진 앱에 즉시 저장됩니다!
          </div>
        </div>

        {/* 하단 액션 버튼 바 */}
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom,8px)+0.75rem)] bg-slate-50 border-t border-slate-200/80 flex items-center gap-2">
          <button
            onClick={handleCopyImage}
            className="py-3 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold rounded-2xl transition cursor-pointer text-xs flex items-center justify-center gap-1 shadow-2xs shrink-0"
            title="클립보드 복사"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="py-3 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold rounded-2xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
            title="파일로 다운로드"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>파일 받기</span>
          </button>

          <button
            onClick={handleShareOrSaveToPhotos}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25"
          >
            <Share2 className="w-4 h-4" />
            <span>아이폰 사진첩 저장 / 공유</span>
          </button>
        </div>
      </div>
    </div>
  );
};
