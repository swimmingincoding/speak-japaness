import { AIConfig, FreeTalkMessage, RoleType, Scenario } from '../types/conversation';

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

  if (aiConfig.provider === 'gemini' && aiConfig.apiKey.trim()) {
    try {
      return await callGeminiAPI(scenario, userRole, partnerRole, history, userText, aiConfig);
    } catch (err) {
      console.warn('Gemini API 호출 실패, 스마트 시뮬레이션 엔진으로 전환합니다:', err);
    }
  }

  if (aiConfig.provider === 'openai' && aiConfig.apiKey.trim()) {
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
5. 반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "japanese": "일본어 응답 문장",
  "furigana": "히라가나 전체 읽기",
  "koreanPronunciation": "한국어 발음 표기",
  "koreanTranslation": "자연스러운 한국어 번역",
  "realLifeTip": "일본 현지 표현/접객어 팁 (한국어)",
  "correctionFeedback": "사용자 발화에 대한 피드백 및 자연스러운 표현 추천 (한국어)",
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
  const model = aiConfig.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    aiConfig.apiKey.trim()
  )}`;

  const conversationLog = history
    .map((m) => `${m.sender === 'user' ? 'User' : 'Partner'}: ${m.japanese}`)
    .join('\n');

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
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as PartnerReplyResponse;
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

