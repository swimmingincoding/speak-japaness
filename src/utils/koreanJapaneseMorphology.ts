/**
 * [Milestone 2] Tier 2: 본격 한→일 교착어 형태소 분석기 & 일본어 동사·형용사 활용 생성기
 * - 일본어 1류(5단)·2류(1단)·3류(불규칙) 동사 및 い/な형용사 정식 활용표
 * - 한국어 용언 어간 + 선어말/보조/종결/연결어미(시제·부정·희망·허가·가능·의무·정중의뢰·인과절) 분석
 * - 미등록 고유명사·외래어 한글 음절 분해 → 가타카나(カタカナ) 자동 음차기 (한글 원문 노출 0% 보장)
 */

import { SlotNounRef, extractStructuredQuantities, normalizeKoreanInputForAnalysis } from './offlineSlotTemplates';

export type JpPredicateClass = 'v1' | 'v2' | 'v3_suru' | 'v3_kuru' | 'adj_i' | 'adj_na';

export type GrammaticalMood =
  | 'polite_pres'
  | 'polite_past'
  | 'polite_neg'
  | 'polite_past_neg'
  | 'question'
  | 'past_question'
  | 'neg_question'
  | 'desire'
  | 'desire_neg'
  | 'desire_polite'
  | 'request'
  | 'polite_request'
  | 'neg_request'
  | 'permission'
  | 'prohibition_question'
  | 'potential'
  | 'potential_question'
  | 'potential_neg'
  | 'obligation'
  | 'obligation_question'
  | 'try_polite'
  | 'try_permission'
  | 'progressive'
  | 'volitional_question'
  | 'conn_reason'
  | 'conn_contrast'
  | 'conn_seq';

export interface KoPredicateEntry {
  stems: string[];           // 한국어 활용 어간 목록 (긴 어간 우선 매칭)
  jpBase: string;            // 일본어 사전형 (예: 移る, 変える, 予約する, 痛い, 静か)
  jpClass: JpPredicateClass; // 활용 부류
  defaultParticle: 'を' | 'に' | 'が' | 'で' | 'と' | 'から' | 'は';
  inherentPast?: boolean;    // 어간 자체에 과거가 녹아있는 경우 보조 힌트
}

// ============================================================================
// 1. 일본어 5단 / 1단 / 불규칙 동사 및 い/な형용사 정식 활용 생성기
// ============================================================================
const GODAN_I_MAP: Record<string, string> = {
  う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り',
};
const GODAN_A_MAP: Record<string, string> = {
  う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら',
};
const GODAN_E_MAP: Record<string, string> = {
  う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ',
};
const GODAN_O_MAP: Record<string, string> = {
  う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ',
};

function getVerbMasuStem(base: string, cls: JpPredicateClass): string {
  if (cls === 'v3_suru') return base.replace(/する$/, 'し');
  if (cls === 'v3_kuru') return base.replace(/来る$/, '来').replace(/くる$/, 'き');
  if (cls === 'v2') return base.slice(0, -1);
  if (cls === 'v1') {
    const last = base.slice(-1);
    return base.slice(0, -1) + (GODAN_I_MAP[last] || last);
  }
  return base;
}

function getVerbTeForm(base: string, cls: JpPredicateClass): string {
  if (cls === 'v3_suru') return base.replace(/する$/, 'して');
  if (cls === 'v3_kuru') {
    return base.endsWith('来る') ? base.replace(/来る$/, '来て') : base.replace(/くる$/, 'きて');
  }
  if (cls === 'v2') return base.slice(0, -1) + 'て';
  if (cls === 'v1') {
    if (base.endsWith('行く') || base.endsWith('いく')) {
      return base.slice(0, -1) + 'って';
    }
    const last = base.slice(-1);
    const stem = base.slice(0, -1);
    if (last === 'う' || last === 'つ' || last === 'る') return stem + 'って';
    if (last === 'む' || last === 'ぶ' || last === 'ぬ') return stem + 'んで';
    if (last === 'く') return stem + 'いて';
    if (last === 'ぐ') return stem + 'いで';
    if (last === 'す') return stem + 'して';
  }
  return base + 'て';
}

function getVerbNaiStem(base: string, cls: JpPredicateClass): string {
  if (cls === 'v3_suru') return base.replace(/する$/, 'し');
  if (cls === 'v3_kuru') {
    return base.endsWith('来る') ? base.replace(/来る$/, '来') : base.replace(/くる$/, 'こ');
  }
  if (cls === 'v2') return base.slice(0, -1);
  if (cls === 'v1') {
    const last = base.slice(-1);
    return base.slice(0, -1) + (GODAN_A_MAP[last] || last);
  }
  return base;
}

function getVerbPotentialMasuStem(base: string, cls: JpPredicateClass): string {
  if (cls === 'v3_suru') return base.replace(/する$/, 'でき');
  if (cls === 'v3_kuru') {
    return base.endsWith('来る') ? base.replace(/来る$/, '来られ') : base.replace(/くる$/, 'こられ');
  }
  if (cls === 'v2') return base.slice(0, -1) + 'られ';
  if (cls === 'v1') {
    const last = base.slice(-1);
    return base.slice(0, -1) + (GODAN_E_MAP[last] || last);
  }
  return base;
}

function getVerbVolitional(base: string, cls: JpPredicateClass): string {
  const masu = getVerbMasuStem(base, cls);
  return `${masu}ましょう`;
}

export function conjugateJpPredicate(
  base: string,
  cls: JpPredicateClass,
  mood: GrammaticalMood
): string {
  // 1) い형용사 활용
  if (cls === 'adj_i') {
    const isIi = base === 'いい' || base === 'よい' || base.endsWith('いい');
    const prefix = isIi ? base.replace(/(いい|よい)$/, '') : '';
    const stem = isIi ? `${prefix}よ` : base.slice(0, -1);

    switch (mood) {
      case 'polite_pres':
        return `${base}です。`;
      case 'polite_past':
        return `${stem}かったです。`;
      case 'polite_neg':
        return `${stem}くないです。`;
      case 'polite_past_neg':
        return `${stem}くなかったです。`;
      case 'question':
        return `${base}ですか？`;
      case 'past_question':
        return `${stem}かったですか？`;
      case 'neg_question':
        return `${stem}くないですか？`;
      case 'conn_reason':
        return `${base}ので、`;
      case 'conn_contrast':
        return `${base}のですが、`;
      case 'conn_seq':
        return `${stem}くて、`;
      default:
        return `${base}です。`;
    }
  }

  // 2) な형용사 활용
  if (cls === 'adj_na') {
    switch (mood) {
      case 'polite_pres':
        return `${base}です。`;
      case 'polite_past':
        return `${base}でした。`;
      case 'polite_neg':
        return `${base}ではありません。`;
      case 'polite_past_neg':
        return `${base}ではありませんでした。`;
      case 'question':
        return `${base}ですか？`;
      case 'past_question':
        return `${base}でしたか？`;
      case 'neg_question':
        return `${base}ではないですか？`;
      case 'conn_reason':
        return `${base}なので、`;
      case 'conn_contrast':
        return `${base}なのですが、`;
      case 'conn_seq':
        return `${base}で、`;
      default:
        return `${base}です。`;
    }
  }

  // 3) 동사 (v1, v2, v3_suru, v3_kuru) 활용
  const masu = getVerbMasuStem(base, cls);
  const te = getVerbTeForm(base, cls);
  const nai = getVerbNaiStem(base, cls);
  const potMasu = getVerbPotentialMasuStem(base, cls);

  switch (mood) {
    case 'polite_pres':
      return `${masu}ます。`;
    case 'polite_past':
      return `${masu}ました。`;
    case 'polite_neg':
      return `${masu}ません。`;
    case 'polite_past_neg':
      return `${masu}ませんでした。`;
    case 'question':
      return `${masu}ますか？`;
    case 'past_question':
      return `${masu}ましたか？`;
    case 'neg_question':
      return `${masu}ませんか？`;
    case 'desire':
      return `${masu}たいです。`;
    case 'desire_neg':
      return `${masu}たくないです。`;
    case 'desire_polite':
      return `${masu}たいのですが、可能でしょうか？`;
    case 'request':
      return `${te}ください。`;
    case 'polite_request':
      return `${te}いただけますか？`;
    case 'neg_request':
      return `${nai}ないでください。`;
    case 'permission':
      return `${te}もいいですか？`;
    case 'prohibition_question':
      return `${te}はいけませんか？（だめですか？）`;
    case 'potential':
      return `${potMasu}ます。`;
    case 'potential_question':
      return `${potMasu}ますか？`;
    case 'potential_neg':
      return `${potMasu}ません。`;
    case 'obligation':
      return `${nai}なければなりません。`;
    case 'obligation_question':
      return `${te.replace(/て$/, 'た').replace(/で$/, 'だ')}ほうがいいですか？（${nai}なければなりませんか？）`;
    case 'try_polite':
      return `${te}みます。`;
    case 'try_permission':
      return `${te}みてもいいですか？`;
    case 'progressive':
      return `${te}います。`;
    case 'volitional_question':
      return `${getVerbVolitional(base, cls)}か？`;
    case 'conn_reason':
      return `${masu}ますので、`;
    case 'conn_contrast':
      return `${masu}ますが、`;
    case 'conn_seq':
      return `${te}、`;
    default:
      return `${masu}ます。`;
  }
}

// ============================================================================
// 2. 한글 → 가타카나(カタカナ) 자동 음차 변환기 (미등록 외래어·고유명사 처리용)
// ============================================================================
const KNOWN_LOANWORDS: Record<string, string> = {
  스타벅스: 'スターバックス',
  블루보틀: 'ブルーボトル',
  세븐일레븐: 'セブンイレブン',
  패밀리마트: 'ファミリーマート',
  로손: 'ローソン',
  이치란: '一蘭（イチラン）',
  이치란라멘: '一蘭ラーメン',
  유니클로: 'ユニクロ',
  무인양품: '無印良品',
  아디다스: 'アディダス',
  나이키: 'ナイキ',
  애플스토어: 'アップルストア',
  아이폰: 'アイフォーン',
  에어팟: 'エアポッズ',
  아이패드: 'アイパッド',
  맥북: 'マックブック',
  보조배터리: 'モバイルバッテリー',
  트래블로그: 'トラベルログカード',
  트래블월렛: 'トラベルウォレットカード',
  카카오페이: 'カカオペイ',
  애플페이: 'アップルペイ',
  페이페이: 'ペイペイ',
  구글맵: 'グーグルマップ',
  인스타그램: 'インスタグラム',
  오마카세: 'おまかせ',
  소아과: '小児科',
  응급실: '救急外来',
  안과: '眼科',
  치과: '歯科',
  피부과: '皮膚科',
};

const CHOSEONG_ROMA = [
  'k', 'kk', 'n', 't', 'tt', 'r', 'm', 'p', 'pp', 's', 'ss', '', 'ch', 'ch', 'ch', 'k', 't', 'p', 'h',
];
const JUNGSEONG_KATA: Record<number, { plain: string; afterK: string; afterS: string; afterT: string; afterN: string; afterH: string; afterM: string; afterR: string; afterP: string; afterCh: string }> = {
  0:  { plain: 'ア', afterK: 'カ', afterS: 'サ', afterT: 'タ', afterN: 'ナ', afterH: 'ハ', afterM: 'マ', afterR: 'ラ', afterP: 'パ', afterCh: 'チャ' }, // ㅏ
  1:  { plain: 'エ', afterK: 'ケ', afterS: 'セ', afterT: 'テ', afterN: 'ネ', afterH: 'ヘ', afterM: 'メ', afterR: 'レ', afterP: 'ペ', afterCh: 'チェ' }, // ㅐ
  2:  { plain: 'ヤ', afterK: 'キャ', afterS: 'シャ', afterT: 'チャ', afterN: 'ニャ', afterH: 'ヒャ', afterM: 'ミャ', afterR: 'リャ', afterP: 'ピャ', afterCh: 'チャ' }, // ㅑ
  3:  { plain: 'イェ', afterK: 'キェ', afterS: 'シェ', afterT: 'チェ', afterN: 'ニェ', afterH: 'ヒェ', afterM: 'ミェ', afterR: 'リェ', afterP: 'ピェ', afterCh: 'チェ' }, // ㅒ
  4:  { plain: 'オ', afterK: 'コ', afterS: 'ソ', afterT: 'ト', afterN: 'ノ', afterH: 'ホ', afterM: 'モ', afterR: 'ロ', afterP: 'ポ', afterCh: 'チョ' }, // ㅓ
  5:  { plain: 'エ', afterK: 'ケ', afterS: 'セ', afterT: 'テ', afterN: 'ネ', afterH: 'ヘ', afterM: 'メ', afterR: 'レ', afterP: 'ペ', afterCh: 'チェ' }, // ㅔ
  6:  { plain: 'ヨ', afterK: 'キョ', afterS: 'ショ', afterT: 'チョ', afterN: 'ニョ', afterH: 'ヒョ', afterM: 'ミョ', afterR: 'リョ', afterP: 'ピョ', afterCh: 'チョ' }, // ㅕ
  7:  { plain: 'イェ', afterK: 'キェ', afterS: 'シェ', afterT: 'チェ', afterN: 'ニェ', afterH: 'ヒェ', afterM: 'ミェ', afterR: 'リェ', afterP: 'ピェ', afterCh: 'チェ' }, // ㅖ
  8:  { plain: 'オ', afterK: 'コ', afterS: 'ソ', afterT: 'ト', afterN: 'ノ', afterH: 'ホ', afterM: 'モ', afterR: 'ロ', afterP: 'ポ', afterCh: 'チョ' }, // ㅗ
  9:  { plain: 'ワ', afterK: 'クァ', afterS: 'スァ', afterT: 'トァ', afterN: 'ノァ', afterH: 'ファ', afterM: 'モァ', afterR: 'ロァ', afterP: 'ポァ', afterCh: 'チョァ' }, // ㅘ
  10: { plain: 'ウェ', afterK: 'クェ', afterS: 'スェ', afterT: 'トェ', afterN: 'ノェ', afterH: 'フェ', afterM: 'モェ', afterR: 'ロェ', afterP: 'ポェ', afterCh: 'チェ' }, // ㅙ
  11: { plain: 'ウェ', afterK: 'クェ', afterS: 'スェ', afterT: 'トェ', afterN: 'ノェ', afterH: 'フェ', afterM: 'モェ', afterR: 'ロェ', afterP: 'ポェ', afterCh: 'チェ' }, // ㅚ
  12: { plain: 'ヨ', afterK: 'キョ', afterS: 'ショ', afterT: 'チョ', afterN: 'ニョ', afterH: 'ヒョ', afterM: 'ミョ', afterR: 'リョ', afterP: 'ピョ', afterCh: 'チョ' }, // ㅛ
  13: { plain: 'ウ', afterK: 'ク', afterS: 'ス', afterT: 'トゥ', afterN: 'ヌ', afterH: 'フ', afterM: 'ム', afterR: 'ル', afterP: 'プ', afterCh: 'チュ' }, // ㅜ
  14: { plain: 'ウォ', afterK: 'クォ', afterS: 'スォ', afterT: 'トォ', afterN: 'ノォ', afterH: 'フォ', afterM: 'モォ', afterR: 'ロォ', afterP: 'ポォ', afterCh: 'チョ' }, // ㅝ
  15: { plain: 'ウェ', afterK: 'クェ', afterS: 'スェ', afterT: 'トェ', afterN: 'ノェ', afterH: 'フェ', afterM: 'モェ', afterR: 'ロェ', afterP: 'ポェ', afterCh: 'チェ' }, // ㅞ
  16: { plain: 'ウィ', afterK: 'クィ', afterS: 'スィ', afterT: 'ティ', afterN: 'ニ', afterH: 'フィ', afterM: 'ミ', afterR: 'リ', afterP: 'ピ', afterCh: 'チ' }, // ㅟ
  17: { plain: 'ユ', afterK: 'キュ', afterS: 'シュ', afterT: 'チュ', afterN: 'ニュ', afterH: 'ヒュ', afterM: 'ミュ', afterR: 'リュ', afterP: 'ピュ', afterCh: 'チュ' }, // ㅠ
  18: { plain: 'ウ', afterK: 'ク', afterS: 'ス', afterT: 'ト', afterN: 'ヌ', afterH: 'フ', afterM: 'ム', afterR: 'ル', afterP: 'プ', afterCh: 'チュ' }, // ㅡ
  19: { plain: 'ウィ', afterK: 'キ', afterS: 'シ', afterT: 'ティ', afterN: 'ニ', afterH: 'ヒ', afterM: 'ミ', afterR: 'リ', afterP: 'ピ', afterCh: 'チ' }, // ㅢ
  20: { plain: 'イ', afterK: 'キ', afterS: 'シ', afterT: 'ティ', afterN: 'ニ', afterH: 'ヒ', afterM: 'ミ', afterR: 'リ', afterP: 'ピ', afterCh: 'チ' }, // ㅣ
};

const JONGSEONG_KATA: Record<number, string> = {
  0: '',
  1: 'ック', 2: 'ック', 4: 'ン', 7: 'ッ', 8: 'ル', 16: 'ム', 17: 'ップ', 19: 'ッ', 20: 'ッ', 21: 'ン',
  22: 'ッ', 23: 'ッ', 24: 'ック', 25: 'ッ', 26: 'ップ', 27: 'ッ',
};

export function hangulToKatakana(word: string): string {
  const clean = word.trim();
  if (!clean) return '';
  if (KNOWN_LOANWORDS[clean]) return KNOWN_LOANWORDS[clean];

  let out = '';
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = Math.floor(offset / 588);
      const jung = Math.floor((offset % 588) / 28);
      const jong = offset % 28;

      const cGroup = CHOSEONG_ROMA[cho];
      const vRow = JUNGSEONG_KATA[jung] || JUNGSEONG_KATA[0];

      let syllable = vRow.plain;
      if (cGroup === 'k' || cGroup === 'kk') syllable = (cGroup === 'kk' ? 'ッ' : '') + vRow.afterK;
      else if (cGroup === 's' || cGroup === 'ss') syllable = (cGroup === 'ss' ? 'ッ' : '') + vRow.afterS;
      else if (cGroup === 't' || cGroup === 'tt') syllable = (cGroup === 'tt' ? 'ッ' : '') + vRow.afterT;
      else if (cGroup === 'n') syllable = vRow.afterN;
      else if (cGroup === 'h') syllable = vRow.afterH;
      else if (cGroup === 'm') syllable = vRow.afterM;
      else if (cGroup === 'r') syllable = vRow.afterR;
      else if (cGroup === 'p' || cGroup === 'pp') syllable = (cGroup === 'pp' ? 'ッ' : '') + vRow.afterP;
      else if (cGroup === 'ch') syllable = vRow.afterCh;

      const coda = JONGSEONG_KATA[jong] ?? 'ン';
      out += syllable + coda;
    } else if (/[a-zA-Z0-9\s-]/.test(clean[i])) {
      out += clean[i];
    }
  }
  return out.replace(/ッッ+/g, 'ッ');
}

// ============================================================================
// 3. 핵심 한국어 동사 · 형용사 110+ 정밀 어간 사전
// ============================================================================
export const KO_PREDICATE_LEXICON: KoPredicateEntry[] = [
  // 이동 / 교통 / 방문
  { stems: ['갈아타', '환승하', '환승해', '환승했'], jpBase: '乗り換える', jpClass: 'v2', defaultParticle: 'で' },
  { stems: ['옮기', '옮겨', '옮겼'], jpBase: '移る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['들어가', '들어갔'], jpBase: '入る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['돌아가', '돌아갔'], jpBase: '帰る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['걸어가', '걸어갔'], jpBase: '歩いて行く', jpClass: 'v1', defaultParticle: 'まで' as 'に' },
  { stems: ['나가', '나갔'], jpBase: '出る', jpClass: 'v2', defaultParticle: 'から' },
  { stems: ['내리', '내려', '내렸'], jpBase: '降りる', jpClass: 'v2', defaultParticle: 'で' },
  { stems: ['타고', '타지', '타려', '탔어', '타도'], jpBase: '乗る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['나오지', '나왔', '나와'], jpBase: '来る', jpClass: 'v3_kuru', defaultParticle: 'が' },
  { stems: ['멈추', '멈춰', '정차하', '정차해'], jpBase: '止まる', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['도착하', '도착해', '도착했'], jpBase: '到着する', jpClass: 'v3_suru', defaultParticle: 'に' },
  { stems: ['출발하', '출발해', '출발했'], jpBase: '出発する', jpClass: 'v3_suru', defaultParticle: 'に' },
  { stems: ['놓치', '놓쳤'], jpBase: '乗り遅れる', jpClass: 'v2', defaultParticle: 'に' },
  { stems: ['길 잃', '길을 잃', '헤매'], jpBase: '迷う', jpClass: 'v1', defaultParticle: 'に' },

  // 식당 / 주문 / 조리 / 쇼핑
  { stems: ['예약하', '예약해', '예약했'], jpBase: '予約する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['취소하', '취소해', '취소했'], jpBase: 'キャンセルする', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['주문하', '주문해', '주문했', '시키', '시켜', '시켰'], jpBase: '注文する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['계산하', '계산해', '결제하', '결제해', '지불하'], jpBase: '支払う', jpClass: 'v1', defaultParticle: 'で' },
  { stems: ['포장하', '포장해', '가져가'], jpBase: '持ち帰る', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['데우', '데워', '데웠'], jpBase: '温める', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['식히', '식혀'], jpBase: '冷ます', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['자르', '잘라', '썰어'], jpBase: '切る', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['나누', '나눠'], jpBase: '分ける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['굽', '구워'], jpBase: '焼く', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['추가하', '추가해'], jpBase: '追加する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['입어보', '입어봐', '시착하', '시착해'], jpBase: '試着する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['신어보', '신어봐'], jpBase: '試し履きする', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['교환하', '교환해'], jpBase: '交換する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['환불하', '환불해', '반품하', '반품해'], jpBase: '返品する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['바꾸', '바꿔', '바꿨', '변경하', '변경해'], jpBase: '変える', jpClass: 'v2', defaultParticle: 'に' },

  // 호텔 / 시설 / 대여 / 고장 / 분실
  { stems: ['보관하', '보관해', '맡기', '맡겨', '맡겼'], jpBase: '預ける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['연장하', '연장해'], jpBase: '延長する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['빌리', '빌려', '빌렸', '대여하', '대여해'], jpBase: '借りる', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['돌려주', '돌려줘', '반납하', '반납해'], jpBase: '返す', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['충전하', '충전해', '충전했'], jpBase: '充電する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['연결하', '연결해'], jpBase: 'つなぐ', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['작동하', '작동해'], jpBase: '動く', jpClass: 'v1', defaultParticle: 'が' },
  { stems: ['고장나', '고장났', '고장 나', '망가지', '망가졌'], jpBase: '壊れる', jpClass: 'v2', defaultParticle: 'が', inherentPast: true },
  { stems: ['막히', '막혀', '막혔'], jpBase: '詰まる', jpClass: 'v1', defaultParticle: 'が', inherentPast: true },
  { stems: ['떨어뜨리', '떨어뜨렸'], jpBase: '落とす', jpClass: 'v1', defaultParticle: 'を', inherentPast: true },
  { stems: ['떨어지', '떨어져', '떨어졌'], jpBase: '落ちる', jpClass: 'v2', defaultParticle: 'が', inherentPast: true },
  { stems: ['잃어버리', '잃어버렸', '분실하', '분실했'], jpBase: 'なくす', jpClass: 'v1', defaultParticle: 'を', inherentPast: true },
  { stems: ['두고 내리', '두고 내렸', '놓고 오', '놓고 왔', '두고 오', '두고 왔'], jpBase: '置き忘れる', jpClass: 'v2', defaultParticle: 'を', inherentPast: true },
  { stems: ['찾아보', '찾아봐', '찾고', '찾아', '찾으'], jpBase: '探す', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['청소하', '청소해', '치우', '치워', '닦아'], jpBase: '片付ける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['열어', '열리', '열고'], jpBase: '開ける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['닫아', '닫히', '닫고'], jpBase: '閉める', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['켜주', '켜고', '켜도', '켜지'], jpBase: 'つける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['꺼주', '끄고', '꺼도', '꺼지'], jpBase: '消す', jpClass: 'v1', defaultParticle: 'を' },

  // 소통 / 요청 / 일상 동사
  { stems: ['가르쳐', '알려주', '알려줘', '알려'], jpBase: '教える', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['물어보', '물어봐', '여쭤보', '여쭤봐'], jpBase: '聞く', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['확인하', '확인해', '확인했'], jpBase: '確認する', jpClass: 'v3_suru', defaultParticle: 'を' },
  { stems: ['보여주', '보여줘', '보여드'], jpBase: '見せる', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['기다리', '기다려', '기다렸'], jpBase: '待つ', jpClass: 'v1', defaultParticle: 'で' },
  { stems: ['부르', '불러', '불렀', '호출하', '호출해'], jpBase: '呼ぶ', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['찍어', '찍고', '찍으', '촬영하', '촬영해'], jpBase: '撮る', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['적어', '적고', '기입하', '기입해'], jpBase: '書く', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['보내', '보냈', '발송하'], jpBase: '送る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['도와주', '도와줘', '도와'], jpBase: '助ける', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['사용하', '사용해', '이용하', '이용해'], jpBase: '使う', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['앉아', '앉으', '앉고', '앉지'], jpBase: '座る', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['마시', '마셔', '마셨', '마시지'], jpBase: '飲む', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['먹어', '먹고', '먹으', '먹었', '먹지', '드시', '드셔'], jpBase: '食べる', jpClass: 'v2', defaultParticle: 'を' },
  { stems: ['피우', '피워', '피웠'], jpBase: '吸う', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['읽어', '읽고', '읽지', '읽으'], jpBase: '読む', jpClass: 'v1', defaultParticle: 'が' },
  { stems: ['말씀해', '말씀하', '말해', '말하'], jpBase: '話す', jpClass: 'v1', defaultParticle: 'で' },
  { stems: ['구매하', '구매해', '사고 싶', '살게', '사려', '샀어'], jpBase: '買う', jpClass: 'v1', defaultParticle: 'を' },
  { stems: ['만나', '만났'], jpBase: '会う', jpClass: 'v1', defaultParticle: 'に' },
  { stems: ['쉬고', '쉬어', '휴식하'], jpBase: '休む', jpClass: 'v1', defaultParticle: 'で' },

  // 증상 / 상태 / 감각 형용사 & 동사
  { stems: ['어지럽', '어지러워'], jpBase: 'めまいがする', jpClass: 'v3_suru', defaultParticle: 'が' },
  { stems: ['가렵', '가려워', '간지럽', '간지러워'], jpBase: 'かゆい', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['붓고', '부었', '부어오르'], jpBase: '腫れる', jpClass: 'v2', defaultParticle: 'が', inherentPast: true },
  { stems: ['다치', '다쳤'], jpBase: '怪我をする', jpClass: 'v3_suru', defaultParticle: 'を', inherentPast: true },
  { stems: ['아프', '아파', '아팠'], jpBase: '痛い', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['비싸', '비쌌'], jpBase: '高い', jpClass: 'adj_i', defaultParticle: 'は' },
  { stems: ['저렴하', '저렴해'], jpBase: '安い', jpClass: 'adj_i', defaultParticle: 'は' },
  { stems: ['무겁', '무거워'], jpBase: '重い', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['가볍', '가벼워'], jpBase: '軽い', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['어렵', '어려워'], jpBase: '難しい', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['불편하', '불편해'], jpBase: '不便', jpClass: 'adj_na', defaultParticle: 'が' },
  { stems: ['위험하', '위험해'], jpBase: '危ない', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['조용하', '조용해'], jpBase: '静か', jpClass: 'adj_na', defaultParticle: 'が' },
  { stems: ['유명하', '유명해'], jpBase: '有名', jpClass: 'adj_na', defaultParticle: 'が' },
  { stems: ['친절하', '친절해'], jpBase: '親切', jpClass: 'adj_na', defaultParticle: 'が' },
  { stems: ['깨끗하', '깨끗해'], jpBase: 'きれい', jpClass: 'adj_na', defaultParticle: 'が' },
  { stems: ['더럽', '더러워'], jpBase: '汚い', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['멀어', '머나', '멉니'], jpBase: '遠い', jpClass: 'adj_i', defaultParticle: 'は' },
  { stems: ['가깝', '가까워'], jpBase: '近い', jpClass: 'adj_i', defaultParticle: 'は' },
  { stems: ['좁아', '좁네'], jpBase: '狭い', jpClass: 'adj_i', defaultParticle: 'が' },
  { stems: ['넓어', '넓네'], jpBase: '広い', jpClass: 'adj_i', defaultParticle: 'が' },
];

// 긴 어간이 먼저 매칭되도록 정렬
const SORTED_PREDICATES: Array<{ stem: string; entry: KoPredicateEntry }> = [];
for (const entry of KO_PREDICATE_LEXICON) {
  for (const stem of entry.stems) {
    SORTED_PREDICATES.push({ stem, entry });
  }
}
SORTED_PREDICATES.sort((a, b) => b.stem.length - a.stem.length);

// ============================================================================
// 4. 한국어 문말 어미/양태 결정기
// ============================================================================
function detectGrammaticalMood(clause: string, matchedStem: string, entry: KoPredicateEntry): GrammaticalMood {
  const c = clause.trim();
  const stemIdx = c.lastIndexOf(matchedStem);
  const tail = stemIdx >= 0 ? c.slice(stemIdx) : c;
  const before = stemIdx > 0 ? c.slice(Math.max(0, stemIdx - 4), stemIdx) : '';

  const isQuestion = /[?？]$|(나요|까요|어요\?|아요\?|해요\?|습니까|입니까|예요\?|인가요|는지|죠\?)/.test(c);
  const hasNegBefore = /(안\s*$|못\s*$)/.test(before);
  const hasNegTail = /(지\s*않|지\s*못|안\s*되|안\s*돼)/.test(tail);
  const isNeg = hasNegBefore || hasNegTail;
  const isCannot = /못\s*$/.test(before) || /(수\s*없|지\s*못)/.test(tail);
  const isPast =
    entry.inherentPast ||
    /(았|었|였|했)(어요|습니다|네요|나요|던|는데|어서)/.test(tail) ||
    /(았|었|했)$/.test(matchedStem);

  // 연결어미 (절 끝에 위치할 때)
  if (/(아서|어서|해서|기\s*때문|니까|므로)$/.test(c)) {
    return 'conn_reason';
  }
  if (/(는데|는데요|지만)$/.test(c)) {
    return 'conn_contrast';
  }
  if (/고$/.test(c)) {
    return 'conn_seq';
  }

  // 부정 의뢰 (~지 마세요)
  if (/지\s*마(세요|십시오|요)?/.test(tail)) {
    return 'neg_request';
  }

  // 시도 + 허가 (~아/어 봐도 될까요?)
  if (/(보|봐)도\s*(되|돼|될까|괜찮)/.test(tail)) {
    return 'try_permission';
  }
  if (/(볼게|보려|볼까)/.test(tail)) {
    return isQuestion ? 'volitional_question' : 'try_polite';
  }

  // 금지 확인 (~(으)면 안 되나요?)
  if (/면\s*안\s*(되나|돼요|됩니|될까)/.test(tail)) {
    return 'prohibition_question';
  }

  // 허가 요청 (~아/어도 되나요? / ~해도 될까요?)
  if (/도\s*(되나|돼요|될까|괜찮)/.test(tail)) {
    return 'permission';
  }

  // 의무 (~아야/어야 해요, ~해야 하나요?)
  if (/(야\s*하|야\s*돼|야\s*되|야\s*합니)/.test(tail)) {
    return isQuestion ? 'obligation_question' : 'obligation';
  }

  // 가능 (~ㄹ 수 있나요 / ~ㄹ 수 없어요)
  if (/수\s*있/.test(tail) || (/가능/.test(tail) && entry.jpClass !== 'adj_i')) {
    return isQuestion ? 'potential_question' : 'potential';
  }
  if (isCannot) {
    return 'potential_neg';
  }

  // 희망 (~고 싶어요 / ~고 싶은데요)
  if (/고\s*싶/.test(tail)) {
    if (isNeg) return 'desire_neg';
    if (/(은데|는데)/.test(tail) || isQuestion) return 'desire_polite';
    return 'desire';
  }

  // 정중 의뢰 (~해 주실 수 있나요? / ~해 주시겠어요? / ~해 주세요)
  if (/(주시겠|주실\s*수|주실래|주세|주십시|부탁)/.test(tail)) {
    return isQuestion ? 'polite_request' : 'request';
  }

  // 청유/의문 (~ㄹ까요?)
  if (/까요\??$/.test(c) && !isPast && !isNeg) {
    return 'volitional_question';
  }

  // 진행 (~고 있어요)
  if (/고\s*있/.test(tail) && !isPast) {
    return 'progressive';
  }

  // 일반 시제 + 긍정/부정 + 평서/의문
  if (isQuestion) {
    if (isNeg) return 'neg_question';
    if (isPast) return 'past_question';
    return 'question';
  }

  if (isNeg) {
    return isPast ? 'polite_past_neg' : 'polite_neg';
  }
  if (isPast) {
    return 'polite_past';
  }
  return 'polite_pres';
}

// ============================================================================
// 5. 미등록 명사구(외래어·고유명사) 안전 추출 및 조사 매핑
// ============================================================================
const KO_PARTICLE_SUFFIXES: Array<[RegExp, string]> = [
  [/에서는$/, 'では'],
  [/에서$/, 'で'],
  [/에게는$|에게$|한테$/, 'に'],
  [/까지$/, 'まで'],
  [/부터$/, 'から'],
  [/이랑$|랑$|하고$/, 'と'],
  [/으로$|로$/, 'で'],
  [/보다$/, 'より'],
  [/만$/, 'だけ'],
  [/도$/, 'も'],
  [/은$|는$/, 'は'],
  [/이$|가$/, 'が'],
  [/을$|를$/, 'を'],
  [/에$/, 'に'],
  [/의$/, 'の'],
];

const STOPWORD_STEMS = new Set([
  '제가', '저는', '나는', '내가', '우리', '저희', '지금', '오늘', '내일', '어제',
  '조금', '너무', '정말', '아주', '빨리', '천천히', '잠시', '혹시', '여기', '거기', '저기',
]);

function extractUnknownProperNounsAsKatakana(
  clause: string,
  foundNouns: SlotNounRef[],
  matchedStem: string
): string {
  const tokens = clause
    .replace(/[?？.!~,]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const coveredRanges = foundNouns.map((n) => n.matchedKo);
  const extraParts: string[] = [];

  for (const tok of tokens) {
    if (tok.includes(matchedStem)) continue;
    if (STOPWORD_STEMS.has(tok)) continue;
    if (coveredRanges.some((cov) => tok.includes(cov) || cov.includes(tok))) continue;
    if (/^\d+/.test(tok)) continue;

    // 조사가 붙은 어절인 경우 어근과 조사 분리
    for (const [pRegex, jpParticle] of KO_PARTICLE_SUFFIXES) {
      if (pRegex.test(tok)) {
        const stemNoun = tok.replace(pRegex, '').trim();
        if (stemNoun.length >= 2 && !STOPWORD_STEMS.has(stemNoun)) {
          // 동사/부사 어미가 아닌 명사성 토큰만 음차 변환
          if (!/(해서|는데|니까|려고|면서|어요|아요|해요)$/.test(stemNoun)) {
            const kata = hangulToKatakana(stemNoun);
            if (kata) {
              extraParts.push(`${kata}${jpParticle}`);
            }
          }
        }
        break;
      }
    }
  }

  return extraParts.slice(0, 2).join('');
}

// ============================================================================
// 6. 메인 교착어 형태소 절 번역 엔트리
// ============================================================================
export function translateClauseByMorphology(
  clause: string,
  foundNouns: SlotNounRef[],
  timePrefix: string,
  buildNounChainFn: (defaultLastParticle: string) => string
): { jp: string; confidence: number } | null {
  const c = normalizeKoreanInputForAnalysis(clause);
  if (!c) return null;

  // 서술어 어간 탐색 (문장 후반부에 등장하는 용언 우선)
  let bestMatch: { stem: string; entry: KoPredicateEntry; pos: number } | null = null;
  for (const { stem, entry } of SORTED_PREDICATES) {
    const pos = c.lastIndexOf(stem);
    if (pos !== -1) {
      // 문장 가장 끝(서술부)에 가까운 어간을 최우선 선택 (동일 위치면 더 긴 어간 우선)
      if (
        !bestMatch ||
        pos + stem.length > bestMatch.pos + bestMatch.stem.length ||
        (pos + stem.length === bestMatch.pos + bestMatch.stem.length && stem.length > bestMatch.stem.length)
      ) {
        bestMatch = { stem, entry, pos };
      }
    }
  }

  if (!bestMatch) return null;

  const { stem, entry } = bestMatch;
  const mood = detectGrammaticalMood(c, stem, entry);
  const qty = extractStructuredQuantities(c);

  const adverbJp =
    c.includes('너무') || c.includes('정말') || c.includes('매우') || c.includes('아주')
      ? 'とても'
      : c.includes('조금') || c.includes('약간') || c.includes('살짝')
      ? '少し'
      : c.includes('천천히')
      ? 'ゆっくり'
      : c.includes('빨리') || c.includes('일찍')
      ? '早く'
      : c.includes('다시') || c.includes('한 번 더')
      ? 'もう一度'
      : c.includes('아직')
      ? 'まだ'
      : '';

  const nounChain = buildNounChainFn(entry.defaultParticle);
  const unknownKataChain =
    foundNouns.length === 0 ? extractUnknownProperNounsAsKatakana(c, foundNouns, stem) : '';
  const conjugatedPred = conjugateJpPredicate(entry.jpBase, entry.jpClass, mood);

  const personPrefix = qty.personCountJp && !nounChain.includes('人') ? `${qty.personCountJp}で` : '';
  const countInfix = qty.itemCountJp ? `${qty.itemCountJp}` : '';
  const politeLead =
    mood === 'polite_request' || mood === 'permission' || mood === 'try_permission'
      ? 'すみません、'
      : '';

  const assembled = `${politeLead}${timePrefix}${personPrefix}${nounChain}${unknownKataChain}${countInfix}${adverbJp}${conjugatedPred}`;
  return {
    jp: assembled.replace(/\s+/g, ''),
    confidence: 92,
  };
}
