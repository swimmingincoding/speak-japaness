import { AIConfig, FreeTalkMessage, RoleType, Scenario } from '../types/conversation';
import { registerDirectKanjiReadings } from './japanesePhonetics';

export interface AITranslationResponse {
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanMeaning: string;
  tip: string;
  kanjiReadings: Array<{ kanji: string; reading: string }>;
  vocabPairs: Array<{ ko: string; jp: string }>;
  providerUsed: 'gemini-ai' | 'openai-ai';
  modelUsed: string;
}

export async function translateWithAI(
  text: string,
  direction: 'ko-to-jp' | 'jp-to-ko',
  aiConfig: AIConfig
): Promise<AITranslationResponse | null> {
  const key = aiConfig?.apiKey?.trim() || '';
  if (!key) return null;

  const isGeminiKey = aiConfig.provider === 'gemini' || key.startsWith('AIza');
  const isOpenAIKey = aiConfig.provider === 'openai' || key.startsWith('sk-');

  const systemPrompt = `당신은 일본 현지 여행·생활 회화 전문 통번역가입니다.
사용자가 입력한 문장을 ${
    direction === 'ko-to-jp'
      ? '한국어에서 실제 일본 원어민이 매장/호텔/길거리/병원 등에서 자연스럽게 쓰는 고품질 일본어로 번역'
      : '일본어(점원 접객 경어 또는 일상 회화)에서 자연스러운 한국어로 번역'
  }하세요.

중요 규칙:
1. 직역투(예: 영수증에 찍힌 -> 領収書に撮られた 같은 오역)를 절대 피하고, 일본 현지에서 실제로 사용하는 자연스러운 표현(예: 領収書に記載された / レシートの金額がメニューと違うのですが)으로 번역하세요.
2. 'japanese'에는 한자와 가나가 적절히 섞인 표준 일본어 문장을 넣으세요.
3. 'furigana'에는 'japanese' 문장 전체를 히라가나로만 읽은 발음을 정확히 넣으세요 (한자가 절대 남으면 안 됩니다).
4. 'koreanPronunciation'에는 'japanese' 문장과 1:1로 정확히 대응되는 자연스러운 한글 발음(예: 스미마센, 레시-토노 킨가쿠가 메뉴-토 치가우노데스가...)을 넣으세요.
5. 'kanjiReadings' 배열에는 'japanese' 문장에 등장하는 모든 한자 단어(또는 단일 한자)와 그 문맥에서의 정확한 히라가나 읽기를 빠짐없이 나열하세요.
6. 'vocabPairs' 배열에는 이 문장에 등장하는 핵심 명사/어휘의 한국어-일본어 쌍(예: [{"ko":"유모차","jp":"ベビーカー"}])을 1~4개 추출하여 오프라인 어휘 사전에 학습될 수 있게 하세요.
7. 'tip'에는 이 표현을 일본 현지에서 쓸 때 알아두면 좋은 원어민 뉘앙스나 발음/상황 팁을 1문장으로 작성하세요.
8. 반드시 아래 순수 JSON 형식으로만 응답하세요:
{
  "japanese": "자연스러운 일본어 문장",
  "furigana": "문장 전체 히라가나 읽기",
  "koreanPronunciation": "1:1 매칭 한국어 발음",
  "koreanMeaning": "자연스러운 한국어 뜻",
  "tip": "현지 활용 원포인트 팁",
  "kanjiReadings": [
    { "kanji": "한자단어", "reading": "히라가나읽기" }
  ],
  "vocabPairs": [
    { "ko": "한국어명사", "jp": "일본어명사" }
  ]
}`;

  if (isGeminiKey) {
    const modelsToTry = [
      aiConfig.model || 'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          key
        )}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: `번역할 문장: "${text}"` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed?.japanese) {
          return {
            japanese: parsed.japanese,
            furigana: parsed.furigana || '',
            koreanPronunciation: parsed.koreanPronunciation || '',
            koreanMeaning: parsed.koreanMeaning || text,
            tip: parsed.tip || 'Gemini AI가 현지 문맥에 맞게 번역한 자연스러운 표현입니다.',
            kanjiReadings: Array.isArray(parsed.kanjiReadings) ? parsed.kanjiReadings : [],
            vocabPairs: Array.isArray(parsed.vocabPairs) ? parsed.vocabPairs : [],
            providerUsed: 'gemini-ai',
            modelUsed: model,
          };
        }
      } catch {
        // 다음 모델 폴백
      }
    }
  }

  if (isOpenAIKey) {
    try {
      const model = aiConfig.model || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `번역할 문장: "${text}"` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(rawText);
        if (parsed?.japanese) {
          return {
            japanese: parsed.japanese,
            furigana: parsed.furigana || '',
            koreanPronunciation: parsed.koreanPronunciation || '',
            koreanMeaning: parsed.koreanMeaning || text,
            tip: parsed.tip || 'OpenAI GPT가 현지 문맥에 맞게 번역한 표현입니다.',
            kanjiReadings: Array.isArray(parsed.kanjiReadings) ? parsed.kanjiReadings : [],
            vocabPairs: Array.isArray(parsed.vocabPairs) ? parsed.vocabPairs : [],
            providerUsed: 'openai-ai',
            modelUsed: model,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export interface PartnerReplyResponse {
  japanese: string;
  furigana: string;
  koreanPronunciation: string;
  koreanTranslation: string;
  realLifeTip: string;
  correctionFeedback: string;
  suggestedReplies: {
    japanese: string;
    koreanPronunciation: string;
    koreanTranslation: string;
  }[];
}

export async function generatePartnerReply(
  scenario: Scenario,
  userRole: RoleType,
  history: FreeTalkMessage[],
  userText: string,
  aiConfig: AIConfig
): Promise<PartnerReplyResponse> {
  const partnerRole: RoleType = userRole === 'customer' ? 'staff' : 'customer';
  const key = aiConfig?.apiKey?.trim() || '';

  if ((aiConfig.provider === 'gemini' || key.startsWith('AIza')) && key) {
    try {
      return await callGeminiAPI(scenario, userRole, partnerRole, history, userText, aiConfig);
    } catch (err) {
      console.warn('Gemini API 호출 실패, 스마트 시뮬레이션 엔진으로 전환합니다:', err);
    }
  }

  if ((aiConfig.provider === 'openai' || key.startsWith('sk-')) && key) {
    try {
      return await callOpenAIAPI(scenario, userRole, partnerRole, history, userText, aiConfig);
    } catch (err) {
      console.warn('OpenAI API 호출 실패, 스마트 시뮬레이션 엔진으로 전환합니다:', err);
    }
  }

  return simulateSmartPartnerReply(scenario, userRole, partnerRole, history, userText);
}

function buildSystemPrompt(
  scenario: Scenario,
  userRole: RoleType,
  partnerRole: RoleType
): string {
  const userRoleTitle = userRole === 'customer' ? scenario.customerRoleName : scenario.staffRoleName;
  const partnerRoleTitle =
    partnerRole === 'customer' ? scenario.customerRoleName : scenario.staffRoleName;

  return `당신은 일본 여행 회화 롤플레잉 앱 'TabiTalk'의 원어민 대화 파트너입니다.
현재 상황: ${scenario.title} (${scenario.placeName})
상황 설명: ${scenario.situationBrief}
사용자의 역할: ${userRoleTitle} (${userRole})
당신(AI)의 역할: ${partnerRoleTitle} (${partnerRole})

규칙:
1. 당신은 반드시 '${partnerRoleTitle}' 역할에 몰입하여 실제 일본 현지의 자연스러운 일본어(점원일 경우 실제 매장 접객 경어, 손님일 경우 자연스러운 구어체/정중체)로 1~2문장 이내로 응답하세요.
2. 사용자의 발화에 대해 칭찬이나 더 자연스러운 일본 현지 표현 코칭을 'correctionFeedback'에 한국어로 작성하세요.
3. 당신의 응답에서 알아두면 좋은 원어민 실생활 뉘앙스나 접객 표현 포인트를 'realLifeTip'에 한국어로 작성하세요.
4. 사용자가 다음에 이어서 말할 수 있는 추천 답변 2~3개를 'suggestedReplies'에 포함하세요.
5. 'kanjiReadings'에는 응답과 추천 답변에 등장하는 모든 한자 단어의 히라가나 읽기를 포함하세요.
6. 반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "japanese": "일본어 응답 문장",
  "furigana": "히라가나 전체 읽기",
  "koreanPronunciation": "한국어 발음 표기",
  "koreanTranslation": "자연스러운 한국어 번역",
  "realLifeTip": "일본 현지 표현/접객어 팁 (한국어)",
  "correctionFeedback": "사용자 발화에 대한 피드백 및 자연스러운 표현 추천 (한국어)",
  "kanjiReadings": [
    { "kanji": "한자단어", "reading": "히라가나읽기" }
  ],
  "suggestedReplies": [
    {
      "japanese": "다음 추천 일본어 답변 1",
      "koreanPronunciation": "한국어 발음 1",
      "koreanTranslation": "한국어 뜻 1"
    },
    {
      "japanese": "다음 추천 일본어 답변 2",
      "koreanPronunciation": "한국어 발음 2",
      "koreanTranslation": "한국어 뜻 2"
    }
  ]
}`;
}

async function callGeminiAPI(
  scenario: Scenario,
  userRole: RoleType,
  partnerRole: RoleType,
  history: FreeTalkMessage[],
  userText: string,
  aiConfig: AIConfig
): Promise<PartnerReplyResponse> {
  const modelsToTry = [
    aiConfig.model || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  const conversationLog = history
    .map((m) => `${m.sender === 'user' ? 'User' : 'Partner'}: ${m.japanese}`)
    .join('\n');

  let lastError: unknown = null;
  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        aiConfig.apiKey.trim()
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(scenario, userRole, partnerRole) }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `이전 대화 내역:\n${conversationLog}\n\n사용자의 새 발화: "${userText}"\n위 발화에 이어지는 JSON 응답을 생성하세요.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        lastError = new Error(`Gemini HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.kanjiReadings)) {
        registerDirectKanjiReadings(parsed.kanjiReadings);
      }
      return parsed as PartnerReplyResponse;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gemini API call failed');
}

async function callOpenAIAPI(
  scenario: Scenario,
  userRole: RoleType,
  partnerRole: RoleType,
  history: FreeTalkMessage[],
  userText: string,
  aiConfig: AIConfig
): Promise<PartnerReplyResponse> {
  const model = aiConfig.model || 'gpt-4o-mini';
  const messages = [
    { role: 'system', content: buildSystemPrompt(scenario, userRole, partnerRole) },
    ...history.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.japanese,
    })),
    { role: 'user' as const, content: userText },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  return JSON.parse(rawText) as PartnerReplyResponse;
}

// API 키 없이도 시나리오 문맥과 사용자 키워드에 맞춰 동작하는 스마트 롤플레잉 시뮬레이션 엔진
function simulateSmartPartnerReply(
  scenario: Scenario,
  userRole: RoleType,
  partnerRole: RoleType,
  history: FreeTalkMessage[],
  userText: string
): Promise<PartnerReplyResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const partnerTurns = scenario.turns.filter((t) => t.speaker === partnerRole);
      const userTurns = scenario.turns.filter((t) => t.speaker === userRole);
      const partnerMsgCount = history.filter((m) => m.sender === 'partner').length;

      // 시나리오 내 다음 턴 찾기
      const nextPartnerTurn =
        partnerTurns[partnerMsgCount % partnerTurns.length] || partnerTurns[0];
      const nextUserTurn =
        userTurns[(partnerMsgCount + 1) % userTurns.length] || userTurns[0];
      const altUserTurn =
        userTurns[(partnerMsgCount + 2) % userTurns.length] || userTurns[0];

      // 사용자 입력에 따른 맞춤 코칭 피드백 생성
      let correctionFeedback =
        userRole === 'customer'
          ? `좋아요! "${userText}"라고 자연스럽게 의사를 전달하셨습니다. 실제 일본 매장에서도 아주 잘 통하는 표현이에요 👍`
          : `훌륭한 접객 응대입니다! "${userText}"처럼 정중한 톤으로 말하면 일본인 손님이 아주 편안해합니다 ✨`;

      if (userText.includes('ください') || userText.includes('お願いします')) {
        correctionFeedback =
          '완벽합니다! 문장 끝에 「お願いします(오네가이시마스)」나 「ください(쿠다사이)」를 붙여 아주 정중하고 자연스러운 표현이 되었어요 👏';
      } else if (userText.includes('かしこまりました') || userText.includes('いらっしゃいませ')) {
        correctionFeedback =
          '실제 일본인 스태프 못지않은 접객 경어(接客敬語) 구사력입니다! 점원 역할을 해보면 상대방의 말이 훨씬 잘 들리게 됩니다 🎯';
      }

      const suggestedReplies = [
        {
          japanese: nextUserTurn.japanese,
          koreanPronunciation: nextUserTurn.koreanPronunciation,
          koreanTranslation: nextUserTurn.koreanTranslation,
        },
        ...(nextUserTurn.alternatives?.map((alt) => ({
          japanese: alt.japanese,
          koreanPronunciation: alt.koreanPronunciation,
          koreanTranslation: alt.koreanTranslation,
        })) || []),
        {
          japanese: altUserTurn.japanese,
          koreanPronunciation: altUserTurn.koreanPronunciation,
          koreanTranslation: altUserTurn.koreanTranslation,
        },
      ].slice(0, 3);

        resolve({
        japanese: nextPartnerTurn.japanese,
        furigana: nextPartnerTurn.furigana,
        koreanPronunciation: nextPartnerTurn.koreanPronunciation,
        koreanTranslation: nextPartnerTurn.koreanTranslation,
        realLifeTip:
          nextPartnerTurn.staffKeigoPoint ||
          nextPartnerTurn.realLifeTip ||
          '핵심 단어 위주로 귀를 기울이면 빠른 원어민 속도도 충분히 캐치할 수 있습니다!',
        correctionFeedback,
        suggestedReplies,
      });
    }, 550);
  });
}

// ============================================================================
// Gemini 2.5 Flash 기반 일상·여행 회화 대량 사전번역(Pre-Warming) 배치 엔진
// ============================================================================
export interface BatchWarmItem {
  ko: string;
  jp: string;
  furigana: string;
  koreanPronunciation: string;
  category: string;
  koKeywords: string[];
  tip: string;
}

export interface BatchWarmProgress {
  completedBatches: number;
  totalBatches: number;
  totalSentencesGenerated: number;
  totalKanjiLearned: number;
  totalVocabLearned: number;
  estimatedCostUsd: number;
  currentTheme: string;
}

const PREWARM_THEMES: Array<{ category: string; title: string; sentences: string[] }> = [
  {
    category: '일상',
    title: '일상 회화 · 인사 · 스몰토크 · 감정 표현',
    sentences: [
      '오늘 하루도 정말 수고 많으셨어요!',
      '오랜만이에요! 그동안 어떻게 지내셨어요?',
      '실례지만 나이가 어떻게 되시나요?',
      '일본 드라마나 애니메이션 보는 걸 좋아해요',
      '주말에는 보통 뭐 하면서 시간을 보내세요?',
      '여기 분위기가 정말 아늑하고 좋네요',
      '시간이 벌써 이렇게 됐네요, 슬슬 가봐야 할 것 같아요',
      '길 찾기가 생각보다 어려워서 조금 헤맸어요',
      '비행기 연착 때문에 예정보다 늦게 도착했어요',
      '일본 편의점 음식은 다 맛있어서 매일 사 먹고 있어요',
      '내일 날씨가 비가 온다고 해서 걱정이네요',
      '혹시 한국에 가보신 적 있으세요?',
      '다음에 기회 되면 또 만나서 이야기해요!',
      '오늘 찍은 사진 나중에 보내주실 수 있나요?',
      '몸이 조금 피곤해서 오늘은 숙소에서 일찍 쉬려고요',
    ],
  },
  {
    category: '식당',
    title: '식당 · 라멘 · 스시 · 야키니쿠 · 이자카야 심화',
    sentences: [
      '초밥에 와사비를 넣지 말고 따로 주실 수 있나요?',
      '라멘에 차슈랑 반숙 계란 추가해 주세요',
      '꼬치구이 모둠은 소금구이랑 양념(타레) 중에 추천으로 주세요',
      '오늘 들어온 가장 신선한 제철 생선이 뭔가요?',
      '생맥주 한 잔 더 주시고 안주 메뉴판 좀 다시 보여주세요',
      '술이 약해서 논알코올 칵테일이나 음료로 주문할게요',
      '음식이 조금 짜서 그러는데 따뜻한 물이나 육수 좀 주실 수 있나요?',
      '숯불이 약해진 것 같은데 숯 좀 더 넣어주세요',
      '어린이 식기(포크와 작은 그릇) 하나 부탁드려요',
      '라스트 오더 전에 추가로 더 시켜도 되나요?',
      '현금 영수증이나 종이 영수증 발급해 주세요',
      '테이블이 조금 끈적거리는데 한 번만 닦아주실 수 있나요?',
      '예약한 김민수인데 7시 반으로 30분만 늦춰도 될까요?',
      '코스 요리는 인원수대로 다 시켜야 하나요?',
      '디저트는 식사 다 끝난 뒤에 달라고 말씀드릴게요',
    ],
  },
  {
    category: '쇼핑',
    title: '쇼핑 · 의류 · 드럭스토어 · 가전 · 면세 심화',
    sentences: [
      '이 화장품은 지성 피부에 맞나요, 건성 피부에 맞나요?',
      '유통기한이 언제까지인 상품인가요?',
      '한국(220V)에서도 변압기 없이 바로 꽂아 쓸 수 있는 제품인가요?',
      '면세 포장된 봉투는 출국할 때까지 뜯으면 안 되나요?',
      '백화점 게스트 카드(외국인 5% 할인 쿠폰)는 어디서 받나요?',
      '이 옷은 세탁기로 빨아도 되나요, 드라이클리닝해야 하나요?',
      '선물할 거라서 가격표(택)는 떼어주실 수 있나요?',
      '쇼핑백 큰 걸로 하나 더 구매할 수 있을까요?',
      '영수증을 잃어버렸는데 결제한 카드로 교환이 되나요?',
      '이 상품 다른 지점에는 재고가 있는지 확인해 주실 수 있나요?',
      '오늘 사서 호텔로 바로 배송해 주는 서비스가 있나요?',
      '할인 쿠폰 화면을 보여드리면 지금 바로 적용되나요?',
      '면세 수속할 때 실물 카드가 꼭 있어야 하나요?',
      '여권 명의랑 신용카드 명의가 같아야 면세가 되나요?',
      '동전이 부족한데 천 엔짜리로 계산할게요',
    ],
  },
  {
    category: '호텔',
    title: '호텔 · 료칸 · 온천 · 어메니티 · 컨시어지 심화',
    sentences: [
      '료칸 저녁 식사(가이세키)는 몇 시에 어디로 가면 되나요?',
      '유카타 사이즈가 안 맞는데 한 치수 큰 걸로 바꿔주실 수 있나요?',
      '전세탕(가족탕)을 예약하고 싶은데 지금 비어 있는 시간대가 있나요?',
      '객실 내 금고가 안 열리는데 직원분이 와서 봐주실 수 있나요?',
      '방에 전자레인지가 없는데 이 도시락을 데울 수 있는 곳이 있나요?',
      '옆방 소음이 너무 심한데 주의를 주시거나 방을 옮길 수 있을까요?',
      '내일 식당 예약을 대신 전화로 해주실 수 있나요?',
      '우산 두 개만 빌릴 수 있을까요? 저녁에 돌아와서 반납할게요',
      '체크아웃할 때 짐이 많은데 카트(벨보이)를 불러주실 수 있나요?',
      '방에 휴대폰 충전기를 놓고 체크아웃했는데 찾아주실 수 있나요?',
      '세탁기가 다 돌아갔는데 건조기는 어떻게 쓰나요?',
      '방 키를 두 개로 발급해 주실 수 있나요?',
      '오늘 밤에 돌아오는 시간이 늦어질 것 같은데 정문이 잠기나요?',
      '미니바에 있는 생수는 무료인가요, 유료인가요?',
      '택시 두 대를 지금 호텔 로비 앞으로 불러주세요',
    ],
  },
  {
    category: '교통',
    title: '전철 · 신칸센 · 버스 · 공항 · 렌터카 심화',
    sentences: [
      '신칸센 특대 수하물 좌석으로 예약하고 싶습니다',
      '지정석 기차를 놓쳤는데 다음 열차 자유석에 타도 되나요?',
      '환승할 때 개찰구 밖으로 나갔다가 다시 타야 하나요?',
      '원데이 패스(1일 승차권)는 어디서 살 수 있나요?',
      '어린이 교통카드는 역무실에서 만들어야 하나요?',
      '버스를 탈 때 뒷문으로 타서 번호표를 뽑는 게 맞나요?',
      '내릴 때 요금함에 동전이 없으면 버스 안에서 환전이 되나요?',
      '공항 리무진 버스 티켓을 지금 사고 싶은데 다음 출발이 몇 시인가요?',
      '제1터미널에서 내릴 건데 가방에 태그 붙여주세요',
      '렌터카 반납하기 전에 근처에 주유소가 어디 있나요?',
      '만땅(가득)으로 일반 휘발유(레귤러) 넣어주세요',
      '고속도로 통행료(ETC 카드) 정산 부탁드립니다',
      '주차권에 할인 도장(처리) 받을 수 있나요?',
      '비행기 탑승구가 변경되었는지 확인해 주세요',
      '기내 수하물 무게 제한이 몇 킬로그램까지인가요?',
    ],
  },
  {
    category: '병원',
    title: '병원 · 약국 · 응급 · 분실 · 트러블 완벽 대처',
    sentences: [
      '음식을 먹고 나서 온몸에 두드러기가 나고 가려워요',
      '발목을 삐어서 걷기가 힘든데 냉찜질팩이나 압박붕대 있나요?',
      '눈이 충혈되고 따가운데 인공눈물이나 안약 추천해 주세요',
      '입안이 헐어서 구내염 패치나 연고를 찾고 있어요',
      '모기에 물렸는데 바르는 약(무히) 어디에 있나요?',
      '어린이가 먹을 수 있는 시럽 형태의 해열제가 있나요?',
      '현재 복용 중인 약이 있는데 이 약이랑 같이 먹어도 괜찮나요?',
      '구급차를 불러주실 수 있나요? 위급한 상황입니다',
      '신용카드를 분실해서 결제 정지 신고를 해야 하는데 전화 좀 빌릴 수 있나요?',
      '분실물 신고 접수증(유실물 증명서)을 발급해 주실 수 있나요?',
      '택시에 쇼핑백을 두고 내렸는데 영수증에 적힌 택시 회사로 연락해 주실 수 있나요?',
      '보조배터리를 떨어뜨렸는데 타는 냄새가 나요',
      '여권 사본이랑 사진은 가지고 있는데 임시 여권을 발급받아야 해요',
      '한국어 통역이 지원되는 병원 안내 번호를 알려주세요',
      '도움을 주셔서 무사히 해결했습니다, 정말 은인이세요!',
    ],
  },
];

export async function batchWarmOfflinePackWithGemini(
  aiConfig: AIConfig,
  onProgress: (prog: BatchWarmProgress) => void,
  onBatchComplete: (
    items: BatchWarmItem[],
    kanjiReadings: Array<{ kanji: string; reading: string }>,
    vocabPairs: Array<{ ko: string; jp: string }>
  ) => void
): Promise<{ totalGenerated: number; totalCostUsd: number }> {
  const key = aiConfig?.apiKey?.trim() || '';
  if (!key) throw new Error('Gemini API Key가 설정되지 않았습니다.');

  const model = aiConfig.model || 'gemini-2.5-flash';
  const MAX_BUDGET_USD = 5.0;
  let estimatedCostUsd = 0;
  let totalSentencesGenerated = 0;
  let totalKanjiLearned = 0;
  let totalVocabLearned = 0;

  for (let i = 0; i < PREWARM_THEMES.length; i++) {
    const theme = PREWARM_THEMES[i];
    if (estimatedCostUsd >= MAX_BUDGET_USD) break;

    onProgress({
      completedBatches: i,
      totalBatches: PREWARM_THEMES.length,
      totalSentencesGenerated,
      totalKanjiLearned,
      totalVocabLearned,
      estimatedCostUsd,
      currentTheme: theme.title,
    });

    const prompt = `당신은 일본 현지 여행·일상 회화 전문 통번역가입니다.
아래 한국어 일상·여행 문장 ${theme.sentences.length}개를 실제 일본 원어민이 현장에서 가장 자연스럽게 쓰는 고품질 일본어로 일괄 번역하여 오프라인 언어팩 데이터를 구축하세요.

번역할 한국어 문장 목록 (카테고리: ${theme.category}):
${theme.sentences.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

반드시 아래 순수 JSON 형식으로만 응답하세요:
{
  "items": [
    {
      "ko": "원래 한국어 문장",
      "jp": "자연스러운 일본어 번역문",
      "furigana": "문장 전체 히라가나 읽기 (한자 절대 포함 금지)",
      "koreanPronunciation": "1:1 매칭 한국어 발음",
      "category": "${theme.category}",
      "koKeywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
      "tip": "현지 활용 팁 1문장"
    }
  ],
  "kanjiReadings": [
    { "kanji": "등장한한자단어", "reading": "히라가나읽기" }
  ],
  "vocabPairs": [
    { "ko": "한국어명사", "jp": "일본어명사" }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      key
    )}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const batchItems: BatchWarmItem[] = Array.isArray(parsed?.items) ? parsed.items : [];
      const batchKanji: Array<{ kanji: string; reading: string }> = Array.isArray(
        parsed?.kanjiReadings
      )
        ? parsed.kanjiReadings
        : [];
      const batchVocab: Array<{ ko: string; jp: string }> = Array.isArray(parsed?.vocabPairs)
        ? parsed.vocabPairs
        : [];

      // gemini-2.5-flash 토큰 단가 기준 배치당 약 $0.0025 산정 (안전 버퍼 포함)
      estimatedCostUsd += 0.003;
      totalSentencesGenerated += batchItems.length;
      totalKanjiLearned += batchKanji.length;
      totalVocabLearned += batchVocab.length;

      onBatchComplete(batchItems, batchKanji, batchVocab);
    }
  }

  onProgress({
    completedBatches: PREWARM_THEMES.length,
    totalBatches: PREWARM_THEMES.length,
    totalSentencesGenerated,
    totalKanjiLearned,
    totalVocabLearned,
    estimatedCostUsd,
    currentTheme: '완료',
  });

  return { totalGenerated: totalSentencesGenerated, totalCostUsd: estimatedCostUsd };
}


