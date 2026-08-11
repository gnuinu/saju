/* ============================================================
 * fortune.js — 오늘의 운세 / 주간 운세 생성
 * 사용자 사주 × 그날의 일진(간지) 조합 + 시드 RNG → 매일 다른 개인화 운세
 * ============================================================ */
(function (global) {
  'use strict';

  const S = () => global.Saju;
  const D = () => global.SajuData;

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* 특정 날짜의 개인 운세 생성 */
  function dailyFortune(saju, date) {
    const day = S().todayGanzhi(date);
    const seed = 'daily-' + dateKey(date) + '-' + saju.day.index + '-' + (saju.hour ? saju.hour.index : 'x');
    const rng = S().seededRng(seed);

    // 오늘 일진 천간 ↔ 내 일간 → 십신 테마
    const god = S().tenGod(saju.dayMaster, day.stem);
    const theme = D().DAILY_THEME[god];

    // 지지 관계 (내 일지 vs 오늘 일지)
    const rel = S().branchRelation(saju.day.branch, day.branch);
    const relComment = D().RELATION_COMMENT[rel];

    // 점수: 기본 55~87 + 관계 보정
    let base = 55 + Math.floor(rng() * 33);
    if (rel === '합') base += 8;
    if (rel === '삼합') base += 6;
    if (rel === '동일') base += 3;
    if (rel === '충') base -= 10;
    base = Math.max(35, Math.min(99, base));

    // 카테고리별 점수 (테마 카테고리에 가중치)
    const themeBoost = { 비견: 'work', 겁재: 'money', 식신: 'health', 상관: 'work', 편재: 'money', 정재: 'money', 편관: 'work', 정관: 'work', 편인: 'work', 정인: 'love' };
    const scores = {};
    D().FORTUNE_CATEGORIES.forEach(c => {
      if (c.key === 'total') { scores.total = base; return; }
      let s = base + Math.floor(rng() * 21) - 10;
      if (themeBoost[god] === c.key) s += 6;
      scores[c.key] = Math.max(30, Math.min(99, s));
    });

    // 행운 아이템 (부족 오행 보충 중심)
    const lucky = D().LUCKY;
    const luckyElem = saju.lacking;
    const color = pick(rng, lucky.colors[luckyElem]);
    const direction = lucky.directions[luckyElem];
    const item = pick(rng, lucky.items);
    const food = pick(rng, lucky.foods);
    const number = 1 + Math.floor(rng() * 9);

    return {
      date, day, god, theme,
      rel, relComment,
      headline: theme.headline,
      total: pick(rng, theme.total),
      money: theme.money,
      love: theme.love,
      work: theme.work,
      health: theme.health,
      scores,
      lucky: { color, direction, item, food, number, elem: luckyElem },
    };
  }

  /* 주간 운세: 오늘부터 7일 */
  function weeklyFortune(saju, startDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      days.push(dailyFortune(saju, d));
    }
    const best = days.reduce((a, b) => (b.scores.total > a.scores.total ? b : a));
    const worst = days.reduce((a, b) => (b.scores.total < a.scores.total ? b : a));
    const avg = Math.round(days.reduce((s, d) => s + d.scores.total, 0) / 7);

    let summary;
    if (avg >= 75) summary = '전반적으로 순풍이 부는 한 주입니다. 미뤄 온 도전을 꺼내기 좋은 타이밍이에요.';
    else if (avg >= 60) summary = '무난한 흐름 속에 기회가 숨어 있는 한 주입니다. 좋은 날을 골라 중요한 일을 배치하세요.';
    else summary = '숨 고르기가 필요한 한 주입니다. 무리한 확장보다 정비와 재충전에 집중하면 다음 흐름이 좋아집니다.';

    return { days, best, worst, avg, summary };
  }

  /* 이번 주 키 (주간 운세 잠금 해제 단위) */
  function weekKey(d) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (day.getDay() + 6) % 7; // 월=0
    day.setDate(day.getDate() - dow);
    return 'W' + dateKey(day);
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  global.Fortune = { dailyFortune, weeklyFortune, dateKey, weekKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Fortune;
})(typeof window !== 'undefined' ? window : globalThis);
