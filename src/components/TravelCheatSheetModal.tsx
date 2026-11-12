import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Ticket,
  Receipt,
  Heart,
  Smartphone,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { SavedExpression } from '../types/conversation';
import { OFFLINE_EMERGENCY_PHRASES } from '../data/offlineTranslatorData';

interface TravelCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedList: SavedExpression[];
}

type ThemeStyle = 'boarding_pass' | 'tokyo_receipt' | 'sakura_bloom';

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

export const TravelCheatSheetModal: React.FC<TravelCheatSheetModalProps> = ({
  isOpen,
  onClose,
  savedList,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>('boarding_pass');
  const [travelerName, setTravelerName] = useState<string>('TABI TRAVELER');
  const [includeSOS, setIncludeSOS] = useState<boolean>(true);
  const [includeShoppingTips, setIncludeShoppingTips] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // 렌더링
      renderCanvas();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, selectedTheme, travelerName, includeSOS, includeShoppingTips, savedList]);

  // 치트시트에 들어갈 표현 목록 조합 (최대 7개)
  const displayItems = React.useMemo(() => {
    if (savedList.length > 0) {
      return savedList.slice(0, 7).map((item) => ({
        jp: item.japanese.replace(/（.*?）|\(.*?\)/g, ''),
        reading: item.koreanPronunciation,
        kr: item.koreanTranslation,
        tag: item.speaker === 'customer' ? '손님' : '점원',
      }));
    }
    return DEFAULT_GOLDEN_PHRASES;
  }, [savedList]);

  // Canvas 드로잉 함수 (고해상도 800 x 1320px - 스마트폰 9:16 비율)
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = 1320;
    canvas.width = W;
    canvas.height = H;

    // 테마별 색상 팔레트 정의
    let bgColor = '#0F172A';
    let cardBg = '#1E293B';
    let primaryColor = '#6366F1';
    let accentColor = '#38BDF8';
    let textColor = '#F8FAFC';
    let subTextColor = '#94A3B8';
    let dividerColor = '#334155';
    let badgeBg = '#312E81';
    let badgeText = '#A5B4FC';

    if (selectedTheme === 'boarding_pass') {
      bgColor = '#0B132B';
      cardBg = '#1C2541';
      primaryColor = '#4F46E5';
      accentColor = '#38BDF8';
      textColor = '#FFFFFF';
      subTextColor = '#94A3B8';
      dividerColor = 'rgba(255, 255, 255, 0.15)';
      badgeBg = '#312E81';
      badgeText = '#C7D2FE';
    } else if (selectedTheme === 'tokyo_receipt') {
      bgColor = '#F8FAFC';
      cardBg = '#FFFFFF';
      primaryColor = '#0F172A';
      accentColor = '#475569';
      textColor = '#0F172A';
      subTextColor = '#64748B';
      dividerColor = '#E2E8F0';
      badgeBg = '#F1F5F9';
      badgeText = '#334155';
    } else if (selectedTheme === 'sakura_bloom') {
      bgColor = '#FFF1F2';
      cardBg = '#FFFFFF';
      primaryColor = '#E11D48';
      accentColor = '#FB7185';
      textColor = '#881337';
      subTextColor = '#9F1239';
      dividerColor = '#FFE4E6';
      badgeBg = '#FFE4E6';
      badgeText = '#BE123C';
    }

    // 1. 배경 채우기
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // 2. 메인 티켓 카드 영역 (패딩 40px)
    const cardX = 40;
    const cardY = 40;
    const cardW = W - 80;
    const cardH = H - 80;
    const radius = 32;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
    ctx.lineTo(cardX + cardW, cardY + cardH - radius);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
    ctx.lineTo(cardX + radius, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();

    ctx.fillStyle = cardBg;
    ctx.fill();

    // 테두리
    if (selectedTheme === 'tokyo_receipt') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#CBD5E1';
      ctx.stroke();
    } else if (selectedTheme === 'sakura_bloom') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FDA4AF';
      ctx.stroke();
    }
    ctx.restore();

    // 3. 상단 헤더 영역
    let y = 95;

    // 비행기 / 보딩패스 아이콘 및 타이틀
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TABITALK TRAVEL PASS · 日本旅行チートシート', 70, y);

    y += 40;
    ctx.fillStyle = textColor;
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('일본 여행 원핸드 치트시트', 70, y);

    y += 24;
    ctx.fillStyle = subTextColor;
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const todayStr = new Date().toISOString().split('T')[0];
    ctx.fillText(`TRAVELER: ${travelerName.toUpperCase()} · DATE: ${todayStr}`, 70, y);

    // 구분 절취선
    y += 30;
    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.moveTo(70, y);
    ctx.lineTo(W - 70, y);
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // 복원

    // 4. 섹션 1: 현지 즉시 사용 핵심 회화 (KEY PHRASES)
    y += 35;
    ctx.fillStyle = accentColor;
    ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('💬 현지 필수 회화 (BEST PHRASES)', 70, y);

    y += 18;
    displayItems.forEach((item, idx) => {
      y += 26;

      // 번호 / 배지
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(70, y - 18, 52, 22, 6);
      ctx.fill();

      ctx.fillStyle = badgeText;
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.tag || `NO.${idx + 1}`, 78, y - 3);

      // 일본어 원문
      ctx.fillStyle = textColor;
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Meiryo", sans-serif';
      ctx.fillText(item.jp, 132, y);

      // 발음 및 뜻 (줄바꿈)
      y += 22;
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`[${item.reading}]`, 132, y);

      ctx.fillStyle = subTextColor;
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`· ${item.kr}`, 135 + ctx.measureText(`[${item.reading}]`).width, y);

      y += 10;
    });

    // 5. 섹션 2: 현지 결제 & 쇼핑 팁 (TAX & PAYMENT)
    if (includeShoppingTips) {
      y += 20;
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(70, y);
      ctx.lineTo(W - 70, y);
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      y += 28;
      ctx.fillStyle = accentColor;
      ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('💴 쇼핑 & 세금 정산 꿀팁 (SHOPPING TIPS)', 70, y);

      y += 26;
      const tips = [
        '• 소비세: 가격표에 (税抜) 적혀있으면 결제 시 +10% 가산',
        '• 면세(Tax-Free): 돈키호테/드럭스토어 5,500円 이상 시 여권 제시',
        '• 더치페이: "別々でお願いします(베츠베츠데 오네가이시마스)"',
      ];
      tips.forEach((tip) => {
        ctx.fillStyle = textColor;
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(tip, 75, y);
        y += 22;
      });
    }

    // 6. 섹션 3: 비상 긴급 연락망 (SOS & EMERGENCY)
    if (includeSOS) {
      y += 10;
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(70, y);
      ctx.lineTo(W - 70, y);
      ctx.strokeStyle = dividerColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      y += 28;
      ctx.fillStyle = '#F43F5E'; // 긴급 로즈
      ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('🚨 긴급 상황 비상 연락처 (EMERGENCY)', 70, y);

      y += 24;
      const sosList = [
        '• 경찰 범죄 신고: 110번 (일본)',
        '• 화재 / 구급차 / 응급: 119번 (일본)',
        '• 외교부 영사콜센터 (24시간 한국어 통역): +82-2-3210-0404',
      ];
      sosList.forEach((sos) => {
        ctx.fillStyle = textColor;
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(sos, 75, y);
        y += 20;
      });
    }

    // 7. 하단 바코드 & 티켓 마무리 장식
    const bottomY = H - 120;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(70, bottomY);
    ctx.lineTo(W - 70, bottomY);
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 가짜 바코드 그리기
    const barcodeX = 75;
    const barcodeY = bottomY + 16;
    ctx.fillStyle = textColor;
    for (let i = 0; i < 48; i++) {
      const barW = (i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1);
      ctx.fillRect(barcodeX + i * 9, barcodeY, barW, 28);
    }

    // 우측 스탬프 문구
    ctx.textAlign = 'right';
    ctx.fillStyle = accentColor;
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('HAVE A SAFE FLIGHT & TRIP 🇯🇵', W - 75, bottomY + 30);
    ctx.fillStyle = subTextColor;
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('POWERED BY TABITALK', W - 75, bottomY + 46);
    ctx.textAlign = 'left'; // 원복

    // 프리뷰 URL 추출
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewDataUrl(dataUrl);
    setIsGenerating(false);
  };

  // 이미지 다운로드
  const handleDownload = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `TabiTalk_CheatSheet_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 클립보드에 이미지 복사
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } catch (e) {
      // 복사 미지원 브라우저의 경우 텍스트 복사로 fallback
      handleDownload();
    }
  };

  // 모바일 Web Share API
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'tabitalk_cheatsheet.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: '나만의 일본 여행 치트시트',
            text: '비행기 모드에서도 볼 수 있는 일본 여행 필수 회화 & SOS 치트시트!',
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
      <div className="relative w-full max-w-[460px] max-h-[94vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base leading-tight tracking-tight">
                  여행 치트시트 1장 내보내기
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                  고화질 PNG
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                갤러리/잠금화면 저장 · 비행기 모드 대응
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

        {/* 숨김 캔버스 (800x1320 실제 렌더링용) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 테마 스타일 선택기 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">디자인 테마 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'boarding_pass', label: '✈️ 보딩패스', desc: '네이비 공항 감성' },
                { id: 'tokyo_receipt', label: '🧾 도쿄 영수증', desc: '모던 화이트' },
                { id: 'sakura_bloom', label: '🌸 사쿠라 핑크', desc: '화사한 여행 감성' },
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
          </div>

          {/* 옵션 토글 바 */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">여행자 닉네임:</span>
              <input
                type="text"
                value={travelerName}
                onChange={(e) => setTravelerName(e.target.value)}
                maxLength={15}
                className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                placeholder="닉네임 입력"
              />
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeShoppingTips}
                  onChange={(e) => setIncludeShoppingTips(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                소비세 10% & 면세 쇼핑 팁 포함
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeSOS}
                  onChange={(e) => setIncludeSOS(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                긴급 영사콜센터(110/119) 포함
              </label>
            </div>
          </div>

          {/* 카드 미리보기 (9:16 모바일 비율) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                스마트폰 잠금화면 최적화 비율 (800×1320)
              </span>
              <span>{savedList.length > 0 ? `저장 문장 ${displayItems.length}개 반영` : '골든 회화 반영'}</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 flex items-center justify-center max-h-[360px]">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="여행 치트시트 미리보기"
                  className="w-full h-auto object-contain max-h-[350px]"
                />
              ) : (
                <div className="py-24 text-xs text-slate-400 font-bold">이미지 생성 중...</div>
              )}
            </div>
          </div>

          {/* 활용 팁 배너 */}
          <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <span className="text-base shrink-0">💡</span>
            <p className="leading-relaxed">
              <strong>갤러리에 저장하거나 스마트폰 잠금화면으로 설정</strong>해두면, 비행기 안이나 데이터가 안 터지는 지하철/시골에서도 1초 만에 꺼내 볼 수 있습니다!
            </p>
          </div>
        </div>

        {/* 하단 액션 버튼 바 */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2">
          <button
            onClick={handleCopyImage}
            className="flex-1 py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold rounded-2xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                이미지 복사
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="p-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold rounded-2xl transition cursor-pointer text-xs flex items-center justify-center shadow-2xs"
            title="공유하기"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownload}
            className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25"
          >
            <Download className="w-4 h-4" />
            고화질 PNG 다운로드
          </button>
        </div>
      </div>
    </div>
  );
};
