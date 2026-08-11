/* ============================================================
 * match.js — 두 사람의 사주 궁합
 *
 * 네 가지 축을 각 25점씩, 합계 100점으로 봅니다.
 *   1) 인연의 깊이 — 일지(배우자궁)끼리의 관계
 *   2) 성향의 어울림 — 일간(나 자신)끼리의 관계
 *   3) 기운의 보완 — 두 사주를 합쳤을 때의 오행 균형
 *   4) 인연의 결 — 띠(년지) 관계와 십신
 * ============================================================ */
(function (global) {
  'use strict';

  const S = () => global.Saju;

  /* ---------- 지지 관계 (원진·육해까지) ---------- */
  const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  const YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
  const YUKHAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
  const inPairs = (list, a, b) => list.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

  function branchPair(a, b) {
    if (SAMHAP.some(g => g.includes(a) && g.includes(b) && a !== b)) return '삼합';
    if (inPairs(YUKHAP, a, b)) return '육합';
    if ((a + 6) % 12 === b) return '충';
    if (inPairs(WONJIN, a, b)) return '원진';
    if (inPairs(YUKHAE, a, b)) return '육해';
    if (a === b) return '동일';
    return '무난';
  }

  /* ---------- 천간 관계 ---------- */
  function stemPair(a, b) {
    const ea = S().STEM_ELEM[a], eb = S().STEM_ELEM[b];
    if (Math.abs(a - b) === 5) return '천간합';
    if (Math.abs(a - b) === 6) return '천간충';
    if (ea === eb) return '비화';
    if (S().GEN_NEXT[ea] === eb || S().GEN_NEXT[eb] === ea) return '상생';
    return '상극';
  }

  /* ---------- 해설 문구 ---------- */
  const BRANCH_TEXT = {
    삼합: { score: 25, title: '삼합 — 손발이 척척 맞는 인연', desc: '두 사람의 배우자궁이 삼합(三合)으로 묶여 있습니다. 궁합에서 가장 좋게 보는 조합 중 하나로, 말하지 않아도 통하는 구석이 있고 함께 일을 벌일 때 특히 시너지가 큽니다. 오래 볼수록 편해지는 사이입니다.' },
    육합: { score: 24, title: '육합 — 서로를 끌어당기는 인연', desc: '배우자궁이 육합(六合)을 이룹니다. 처음부터 이상하게 끌리고, 곁에 있으면 마음이 놓이는 관계입니다. 다툼이 생겨도 오래 못 가고 금세 풀리는 편입니다.' },
    동일: { score: 18, title: '같은 자리 — 거울 같은 사이', desc: '배우자궁이 같은 글자입니다. 취향과 생활 리듬이 비슷해 편안하지만, 너무 닮아서 같은 약점을 공유하기도 합니다. 서로의 부족한 부분을 함께 메우려는 노력이 필요합니다.' },
    무난: { score: 15, title: '무난 — 담백하게 흘러가는 사이', desc: '배우자궁에 특별한 합도 충도 없습니다. 극적인 끌림은 덜하지만 그만큼 부딪힐 일도 적어, 서로 예의를 지키며 오래갈 수 있는 조합입니다. 관계의 온도는 두 사람이 만들기 나름입니다.' },
    육해: { score: 11, title: '육해 — 사소한 데서 어긋나는 사이', desc: '배우자궁이 육해(六害) 관계입니다. 큰 문제는 아닌데 사소한 일정이나 습관에서 자꾸 엇갈립니다. 서로의 리듬이 다르다는 걸 인정하고 미리 맞춰 두면 대부분 해결됩니다.' },
    원진: { score: 9, title: '원진 — 미우면서도 끌리는 사이', desc: '배우자궁이 원진(怨嗔)입니다. 예로부터 "미워하면서도 못 헤어지는" 관계로 봅니다. 애증이 강해 감정의 진폭이 크지만, 그만큼 서로에게서 눈을 떼지 못합니다. 감정이 격해질 때 한 박자 쉬는 습관이 이 인연의 열쇠입니다.' },
    충: { score: 7, title: '충 — 부딪히며 배우는 사이', desc: '배우자궁이 정면으로 충(沖)합니다. 가치관이 달라 자주 부딪히고 변동수도 많습니다. 다만 충은 정체된 것을 깨는 힘이기도 해서, 서로를 성장시키는 관계가 되기도 합니다. 승부를 내려 하지 말고 다름을 인정하는 것이 중요합니다.' },
  };

  const STEM_TEXT = {
    천간합: { score: 25, title: '천간합 — 하나로 합쳐지는 기운', desc: '두 사람의 일간이 천간합(天干合)을 이룹니다. 서로에게 없는 것을 정확히 채워 주는 짝으로, 함께 있을 때 각자가 더 나은 사람이 됩니다. 궁합에서 최고로 치는 조합입니다.' },
    상생: { score: 21, title: '상생 — 한쪽이 다른 쪽을 키워 주는 사이', desc: '두 일간이 상생(相生) 관계입니다. 한 사람이 다른 사람의 기운을 북돋아 줍니다. 자연스럽게 응원하고 도와주는 흐름이라 편안하지만, 늘 주기만 하는 쪽이 지치지 않게 균형을 살펴야 합니다.' },
    비화: { score: 17, title: '비화 — 닮은꼴 동지', desc: '두 일간이 같은 오행입니다. 생각하는 방식이 비슷해 말이 잘 통하고 동지 같은 사이가 됩니다. 다만 같은 것을 원할 때는 경쟁이 될 수 있으니, 영역을 나누면 훨씬 편해집니다.' },
    상극: { score: 12, title: '상극 — 긴장이 있는 사이', desc: '두 일간이 상극(相剋) 관계입니다. 한쪽이 다른 쪽을 누르는 형태라 은근한 긴장이 있습니다. 그러나 적당한 긴장은 서로를 다잡아 주기도 합니다. 누르려 하지 않고 존중하면 오히려 단단해집니다.' },
    천간충: { score: 10, title: '천간충 — 정면으로 맞서는 기운', desc: '두 일간이 충(沖)합니다. 성격이 정반대라 처음엔 신선하지만 시간이 갈수록 부딪히는 지점이 늘어납니다. 서로를 바꾸려 들지 않는 것이 이 관계를 지키는 유일한 방법입니다.' },
  };

  const ZODIAC_TEXT = {
    삼합: '띠끼리도 삼합을 이뤄 사회적으로도 잘 어울립니다. 함께 사람을 만나거나 일을 도모할 때 특히 좋습니다.',
    육합: '띠끼리 육합이라 주변에서도 잘 어울린다는 말을 듣는 편입니다.',
    동일: '같은 띠라 세대 감각과 관심사가 비슷합니다. 이해가 빠른 대신 시야가 좁아지지 않도록 신경 쓰세요.',
    무난: '띠 사이에 특별한 작용은 없습니다. 무난하게 지낼 수 있습니다.',
    육해: '띠 관계에 약간의 어긋남이 있어, 일정이나 돈 문제에서 오해가 생기지 않도록 미리 이야기해 두면 좋습니다.',
    원진: '띠끼리 원진이라 감정이 얽히기 쉽습니다. 서운한 마음은 쌓아 두지 말고 그때그때 푸세요.',
    충: '띠끼리 충이라 활동 반경이나 생활 리듬이 다를 수 있습니다. 각자의 시간을 존중하면 문제되지 않습니다.',
  };

  /* ---------- 궁합 계산 ---------- */
  function compat(a, b) {
    // 1) 인연의 깊이 — 일지
    const bp = branchPair(a.day.branch, b.day.branch);
    const bt = BRANCH_TEXT[bp];

    // 2) 성향의 어울림 — 일간
    const sp = stemPair(a.dayMaster, b.dayMaster);
    const st = STEM_TEXT[sp];

    // 3) 기운의 보완 — 오행
    const elems = S().ELEMENTS;
    const merged = {};
    let totalCount = 0;
    elems.forEach(e => {
      merged[e] = a.elemCount[e] + b.elemCount[e];
      totalCount += merged[e];
    });
    // 상대가 내 부족한 오행을 얼마나 채워 주는가 (각 최대 5점)
    const fillA = Math.min(5, b.elemCount[a.lacking] * 2);
    const fillB = Math.min(5, a.elemCount[b.lacking] * 2);
    // 합쳤을 때 오행이 고르게 퍼졌는가 (최대 10점)
    const ideal = totalCount / 5;
    const dev = elems.reduce((s, e) => s + Math.abs(merged[e] - ideal), 0) / totalCount;
    const balance = Math.max(0, Math.round((1 - dev) * 10));
    // 빈 오행이 없으면 가산
    const noZero = elems.every(e => merged[e] > 0) ? 5 : 0;
    const elemScore = Math.min(25, 5 + fillA + fillB + balance + noZero);

    // 4) 인연의 결 — 띠 + 십신
    const zp = branchPair(a.year.branch, b.year.branch);
    const zScore = { 삼합: 12, 육합: 11, 동일: 8, 무난: 7, 육해: 5, 원진: 5, 충: 4 }[zp];
    // 상대의 일간이 나에게 어떤 십신인가
    const godAB = S().tenGod(a.dayMaster, b.dayMaster);
    const spouseStars = a.gender === 'M' ? ['정재', '편재'] : a.gender === 'F' ? ['정관', '편관'] : [];
    let godScore = 6;
    if (spouseStars.indexOf(godAB) !== -1) godScore = 13;
    else if (['정인', '정관', '정재', '식신'].indexOf(godAB) !== -1) godScore = 11;
    else if (['편인', '편관', '편재', '상관'].indexOf(godAB) !== -1) godScore = 8;
    const bondScore = Math.min(25, zScore + godScore);

    const total = Math.max(20, Math.min(99, bt.score + st.score + elemScore + bondScore));

    let verdict, verdictEmoji;
    if (total >= 85) { verdict = '천생연분에 가까운 궁합이에요'; verdictEmoji = '💞'; }
    else if (total >= 72) { verdict = '서로에게 좋은 기운을 주는 궁합이에요'; verdictEmoji = '💕'; }
    else if (total >= 58) { verdict = '노력한 만큼 좋아지는 궁합이에요'; verdictEmoji = '🌱'; }
    else if (total >= 45) { verdict = '다른 점이 많은 만큼 배울 것도 많은 사이예요'; verdictEmoji = '🌗'; }
    else { verdict = '서로를 이해하는 데 시간이 필요한 사이예요'; verdictEmoji = '🌊'; }

    return {
      total, verdict, verdictEmoji,
      categories: [
        { key: 'bond', name: '인연의 깊이', emoji: '💞', score: bt.score, max: 25, label: bt.title, desc: bt.desc },
        { key: 'temper', name: '성향의 어울림', emoji: '🤝', score: st.score, max: 25, label: st.title, desc: st.desc },
        { key: 'element', name: '기운의 보완', emoji: '🌈', score: elemScore, max: 25, label: elemLabel(elemScore), desc: elemDesc(a, b, merged, fillA, fillB) },
        { key: 'tie', name: '인연의 결', emoji: '🧧', score: bondScore, max: 25, label: `${a.zodiac}띠 × ${b.zodiac}띠`, desc: `${ZODIAC_TEXT[zp]} 상대의 일간은 나에게 <b>${godAB}</b>에 해당합니다.` },
      ],
      branchPair: bp, stemPair: sp, zodiacPair: zp, godAB,
      merged, advice: adviceFor(bp, sp, total),
    };
  }

  function elemLabel(score) {
    if (score >= 22) return '서로의 빈 곳을 정확히 메워 줍니다';
    if (score >= 17) return '함께 있으면 균형이 좋아집니다';
    if (score >= 12) return '겹치는 기운이 조금 많습니다';
    return '한쪽으로 기운이 쏠립니다';
  }

  function elemDesc(a, b, merged, fillA, fillB) {
    const E = global.SajuData.ELEMENT_DESC;
    const parts = [];
    if (fillA >= 4) parts.push(`상대는 내게 부족한 <b>${a.lacking}(${E[a.lacking].emoji})</b> 기운을 넉넉히 갖고 있습니다.`);
    else if (fillA === 0) parts.push(`내게 부족한 <b>${a.lacking}(${E[a.lacking].emoji})</b> 기운은 상대에게도 없습니다. 이 부분은 둘이 함께 채워 가야 합니다.`);
    if (fillB >= 4) parts.push(`반대로 상대에게 부족한 <b>${b.lacking}(${E[b.lacking].emoji})</b> 기운은 내가 채워 줍니다.`);
    const zero = global.Saju.ELEMENTS.filter(e => merged[e] === 0);
    if (zero.length) parts.push(`두 사람을 합쳐도 <b>${zero.join('·')}</b> 기운이 비어 있으니, 그 색과 방향을 생활에서 의식적으로 들이면 좋습니다.`);
    else parts.push('두 사람의 사주를 합치면 다섯 기운이 모두 채워집니다. 함께일 때 더 안정적인 조합입니다.');
    return parts.join(' ');
  }

  function adviceFor(bp, sp, total) {
    if (bp === '충' || sp === '천간충') return '서로를 바꾸려는 순간 이 관계는 어려워집니다. "다르구나"에서 멈추면 오래갑니다.';
    if (bp === '원진') return '감정이 올라올 때 바로 말하지 말고 하룻밤만 재워 두세요. 이 조합은 그 한 박자가 전부입니다.';
    if (total >= 85) return '좋은 궁합일수록 당연하게 여기기 쉽습니다. 고맙다는 말을 자주 하는 것만으로 이 인연은 더 좋아집니다.';
    if (total >= 72) return '지금처럼 서로의 영역을 존중하면 오래 갑니다. 가끔은 함께 새로운 걸 시작해 보세요.';
    return '급하게 가까워지려 하기보다 시간을 두고 쌓아 가는 편이 이 조합에는 훨씬 유리합니다.';
  }

  global.Match = { compat, branchPair, stemPair, BRANCH_TEXT, STEM_TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Match;
})(typeof window !== 'undefined' ? window : globalThis);
