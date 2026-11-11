import React, { useState } from 'react';
import { AIConfig, CategoryType, Scenario } from '../types/conversation';
import { X, Sparkles, PlusCircle, Loader2 } from 'lucide-react';

interface CustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig: AIConfig;
  onCreateScenario: (newScenario: Scenario) => void;
}

export const CustomScenarioModal: React.FC<CustomScenarioModalProps> = ({
  isOpen,
  onClose,
  aiConfig,
  onCreateScenario,
}) => {
  const [category, setCategory] = useState<CategoryType>('restaurant');
  const [topic, setTopic] = useState<string>('');
  const [placeName, setPlaceName] = useState<string>('');
  const [myGoal, setMyGoal] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const buildSmartCustomScenario = async () => {
    const cleanTopic = topic.trim() || '카페에서 디카페인 라떼 테이크아웃 주문하기';
    const cleanPlace = placeName.trim() || '도쿄 로컬 매장';
    const cleanGoal = myGoal.trim() || '원하는 옵션을 요청하고 점원의 확인 질문 알아듣기';

    setIsGenerating(true);

    // Gemini API 키가 설정된 경우 실시간 AI로 맞춤 4턴 시나리오 생성 시도
    if (aiConfig.provider === 'gemini' && aiConfig.apiKey.trim()) {
      try {
        const model = aiConfig.model || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          aiConfig.apiKey.trim()
        )}`;
        const prompt = `사용자가 원하는 일본 여행 회화 상황을 양방향(손님 A ↔ 종업원 B) 4턴 롤플레잉 시나리오 JSON으로 작성하세요.
주제: ${cleanTopic}
장소: ${cleanPlace}
목표: ${cleanGoal}

반드시 아래 JSON 스키마만 출력하세요:
{
  "title": "시나리오 제목",
  "subtitle": "부제목 요약",
  "whyHardToUnderstand": "왜 실제 일본에서 점원의 말을 못 알아듣는지 핵심 이유",
  "keyTakeaways": ["핵심표현1", "핵심표현2"],
  "turns": [
    {
      "speaker": "staff",
      "japanese": "일본어 문장",
      "furigana": "히라가나 읽기",
      "koreanPronunciation": "한글 발음",
      "koreanTranslation": "한국어 뜻",
      "realLifeTip": "실생활 팁",
      "staffKeigoPoint": "종업원 접객 경어 포인트",
      "vocab": [{"word": "단어", "reading": "히라가나", "koreanPronunciation": "발음", "meaning": "뜻"}]
    }
  ]
}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          if (parsed?.turns?.length >= 2) {
            const customId = `custom-${Date.now()}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedTurns = parsed.turns.map((t: any, idx: number) => ({
              id: `${customId}-t${idx}`,
              speaker: t.speaker === 'customer' ? 'customer' : 'staff',
              speakerLabel: t.speaker === 'customer' ? '손님 (A)' : '종업원 (B)',
              japanese: t.japanese,
              furigana: t.furigana,
              koreanPronunciation: t.koreanPronunciation,
              koreanTranslation: t.koreanTranslation,
              realLifeTip: t.realLifeTip || '핵심 키워드에 집중해보세요!',
              staffKeigoPoint: t.staffKeigoPoint,
              vocab: Array.isArray(t.vocab) ? t.vocab : [],
            }));

            const created: Scenario = {
              id: customId,
              category,
              title: parsed.title || cleanTopic,
              subtitle: parsed.subtitle || cleanGoal,
              placeName: cleanPlace,
              difficulty: '실전',
              estimatedMinutes: 4,
              customerRoleName: '손님 (A)',
              staffRoleName: '종업원 (B)',
              situationBrief: `${cleanPlace}에서 "${cleanTopic}" 상황을 진행합니다. (${cleanGoal})`,
              whyHardToUnderstand:
                parsed.whyHardToUnderstand ||
                '종업원이 매뉴얼화된 접객 경어로 옵션을 빠르게 확인하기 때문에 핵심 단어를 캐치하는 것이 중요합니다.',
              keyTakeaways: parsed.keyTakeaways || [cleanGoal],
              turns: mappedTurns,
              freeTalkStarter: {
                customerStarts: {
                  staffOpening: mappedTurns[0],
                  missions: [cleanGoal, '점원의 확인 질문에 답하기', '계산 및 마무리 인사하기'],
                },
                staffStarts: {
                  customerOpening:
                    mappedTurns.find((t: { speaker: string }) => t.speaker === 'customer') ||
                    mappedTurns[0],
                  missions: ['손님 맞이하기', '요청 사항 확인 및 안내하기', '정중히 마무리 응대하기'],
                },
              },
            };
            setIsGenerating(false);
            onCreateScenario(created);
            onClose();
            return;
          }
        }
      } catch {
        // AI 실패 시 로컬 템플릿 생성으로 폴백
      }
    }

    // 오프라인/기본 모드: 입력한 주제와 목표가 반영된 맞춤형 4턴 대화 자동 구성
    setTimeout(() => {
      const customId = `custom-${Date.now()}`;
      const turns = [
        {
          id: `${customId}-1`,
          speaker: 'staff' as const,
          speakerLabel: '종업원 (B)',
          japanese: 'いらっしゃいませ！本日はどのようなご用件でしょうか？',
          furigana: 'いらっしゃいませ！ ほんじつは どのような ごようけんでしょうか？',
          koreanPronunciation: '이랏샤이마세! 혼지츠와 도노요-나 고요-켄데쇼-카?',
          koreanTranslation: '어서 오세요! 오늘은 어떤 용건(주문/문의)이신가요?',
          realLifeTip: `내가 설정한 [${cleanTopic}] 상황을 시작하는 점원의 첫인사입니다.`,
          staffKeigoPoint: '손님에게 용건을 물을 때 「ご用件(고요-켄)」이라는 정중한 표현을 씁니다.',
          vocab: [
            {
              word: 'ご用件',
              reading: 'ごようけん',
              koreanPronunciation: '고요-켄',
              meaning: '용건, 문의 사항',
            },
          ],
        },
        {
          id: `${customId}-2`,
          speaker: 'customer' as const,
          speakerLabel: '손님 (A)',
          japanese: 'すみません、こちらをお願いしたいんですが、可能でしょうか？',
          furigana: 'すみません、こちらを おねがいしたいんですが、かのうでしょうか？',
          koreanPronunciation: '스미마센, 코치라오 오네가이시타인데스가, 카노-데쇼-카?',
          koreanTranslation: `저기요, 이것(${cleanTopic})을 부탁드리고 싶은데 가능할까요?`,
          realLifeTip: `"${cleanGoal}" 상황에서 만능으로 활용할 수 있는 정중한 요청 문장입니다!`,
          vocab: [
            {
              word: 'お願いしたいんですが',
              reading: 'おねがいしたいんですが',
              koreanPronunciation: '오네가이시타인데스가',
              meaning: '부탁드리고 싶은데요',
            },
            {
              word: '可能',
              reading: 'かのう',
              koreanPronunciation: '카노-',
              meaning: '가능',
            },
          ],
        },
        {
          id: `${customId}-3`,
          speaker: 'staff' as const,
          speakerLabel: '종업원 (B)',
          japanese: 'かしこまりました！こちらで間違いございませんか？すぐにご用意いたします。',
          furigana: 'かしこまりました！ こちらで まちがい ございませんか？ すぐに ごようい いたします。',
          koreanPronunciation: '카시코마리마시타! 코치라데 마치가이 고자이마센카? 스구니 고요-이 이타시마스.',
          koreanTranslation: '알겠습니다! 이 내용으로 틀림없으신가요? 바로 준비해 드리겠습니다.',
          realLifeTip:
            '점원이 요청 사항을 재확인할 때 "마치가이 고자이마센카?(틀림없으신가요?)"를 정말 자주 씁니다!',
          staffKeigoPoint:
            '"준비하겠습니다"를 접객 경어로 「ご用意いたします(고요-이 이타시마스)」라고 표현합니다.',
          vocab: [
            {
              word: '間違いございませんか',
              reading: 'まちがいございませんか',
              koreanPronunciation: '마치가이 고자이마센카',
              meaning: '틀림없으신가요?',
            },
            {
              word: 'ご用意いたします',
              reading: 'ごよういいたします',
              koreanPronunciation: '고요-이 이타시마스',
              meaning: '준비해 드리겠습니다',
            },
          ],
        },
        {
          id: `${customId}-4`,
          speaker: 'customer' as const,
          speakerLabel: '손님 (A)',
          japanese: 'はい、それで大丈夫です。ありがとうございます！',
          furigana: 'はい、それで だいじょうぶです。ありがとうございます！',
          koreanPronunciation: '하이, 소레데 다이죠-부데스. 아리가토- 고자이마스!',
          koreanTranslation: '네, 그걸로 괜찮습니다. 감사합니다!',
          realLifeTip: '점원의 확인 질문에 깔끔하게 긍정하며 마무리하는 실전 표현입니다.',
          vocab: [
            {
              word: 'それで大丈夫です',
              reading: 'それでだいじょうぶです',
              koreanPronunciation: '소레데 다이죠-부데스',
              meaning: '그것으로 괜찮습니다',
            },
          ],
        },
      ];

      const created: Scenario = {
        id: customId,
        category,
        title: `✨ [나만의 상황] ${cleanTopic}`,
        subtitle: cleanGoal,
        placeName: cleanPlace,
        difficulty: '실전',
        estimatedMinutes: 4,
        customerRoleName: '손님 (A)',
        staffRoleName: '종업원 (B)',
        situationBrief: `${cleanPlace}에서 진행하는 나만의 맞춤 시나리오: ${cleanTopic}`,
        whyHardToUnderstand:
          '내가 원하는 요청을 말한 뒤 점원이 "마치가이 고자이마센카?(틀림없으신가요?)", "고요-이 이타시마스(준비해 드리겠습니다)"라고 빠르게 확인하는 흐름을 익혀야 합니다.',
        keyTakeaways: [
          `목표: ${cleanGoal}`,
          '정중한 요청: "코치라오 오네가이시타인데스가(이것을 부탁드리고 싶은데요)"',
        ],
        turns,
        freeTalkStarter: {
          customerStarts: {
            staffOpening: turns[0],
            missions: [cleanGoal, '점원의 확인 질문에 대답하기', '감사 인사 건네기'],
          },
          staffStarts: {
            customerOpening: turns[1],
            missions: [
              '손님의 요청을 정중히 접수하기(かしこまりました)',
              '내용이 맞는지 확인하기(間違いございませんか)',
              '바로 준비해 드리겠다고 안내하기(ご用意いたします)',
            ],
          },
        },
      };

      setIsGenerating(false);
      onCreateScenario(created);
      setTopic('');
      setPlaceName('');
      setMyGoal('');
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white border border-slate-200 p-6 space-y-4 shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              나만의 여행 회화 상황 만들기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          시중 강의에 없는 <strong>나만의 특별한 여행 상황</strong>을 입력하면 손님(A)과 점원(B) 역할을 바꿔가며 연습할 수 있는 시나리오가 생성됩니다!
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              카테고리 선택
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'restaurant', label: '🍣 식당 · 카페 · 바' },
                  { id: 'convenience', label: '🏪 쇼핑 · 편의점' },
                  { id: 'hotel', label: '🏨 호텔 · 료칸' },
                  { id: 'transport', label: '🚆 교통 · 관광지' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border text-left transition cursor-pointer ${
                    category === c.id
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              어떤 상황인가요? (주제)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 카페에서 오트밀크 라떼 테이크아웃 주문하기"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              구체적인 장소 (선택)
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="예: 블루보틀 도쿄 시부야점 / 신주쿠 바"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              이 대화에서 꼭 말하고 싶은 목표 (선택)
            </label>
            <input
              type="text"
              value={myGoal}
              onChange={(e) => setMyGoal(e.target.value)}
              placeholder="예: 얼음 적게 해달라고 하고 매장 컵 대신 테이크아웃 요청"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={buildSmartCustomScenario}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 맞춤 롤플레잉 대본 생성 중...
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" /> 나만의 양방향 롤플레잉 추가하기
            </>
          )}
        </button>
      </div>
    </div>
  );
};

