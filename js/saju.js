/* ============================================================
 * saju.js — 만세력(사주팔자) 계산 엔진
 * 절기 근사식 기반. 양력 입력 기준.
 * ============================================================ */
(function (global) {
  'use strict';

  const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const STEM_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

  const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const BRANCH_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const BRANCH_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  const BRANCH_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  // 지지의 본기(주된 지장간) 천간 인덱스
  const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

  const ELEMENTS = ['목', '화', '토', '금', '수'];
  const ELEM_COLOR = { 목: '#4caf7d', 화: '#e0564b', 토: '#c9a24b', 금: '#b7bec9', 수: '#4a7fd4' };

  // 오행 상생: 목→화→토→금→수→목
  const GEN_NEXT = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  // 오행 상극: 목→토, 토→수, 수→화, 화→금, 금→목
  const CTRL = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

  /* ---------- 율리우스 적일 (그레고리력) ---------- */
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  /* ---------- 절기(월 시작 절기) 근사 계산 ----------
   * 각 달의 사주월 시작 절기 날짜 (1일 내외 오차 가능)
   * key: 절기가 드는 양력 달 */
  const TERM_NAME = { 1: '소한', 2: '입춘', 3: '경칩', 4: '청명', 5: '입하', 6: '망종', 7: '소서', 8: '입추', 9: '백로', 10: '한로', 11: '입동', 12: '대설' };
  const TERM_C_20 = { 1: 6.11, 2: 4.6295, 3: 6.318, 4: 5.59, 5: 6.318, 6: 6.5, 7: 7.928, 8: 8.35, 9: 8.44, 10: 9.098, 11: 8.218, 12: 7.9 };
  const TERM_C_21 = { 1: 5.4055, 2: 3.87, 3: 5.63, 4: 4.81, 5: 5.52, 6: 5.678, 7: 7.108, 8: 7.5, 9: 7.646, 10: 8.318, 11: 7.438, 12: 7.18 };

  function termDay(year, month) {
    const is21 = year >= 2000;
    const C = is21 ? TERM_C_21 : TERM_C_20;
    const Y = year % 100;
    const L = is21 ? Math.floor(Y / 4) : Math.floor((Y - 1) / 4);
    return Math.floor(Y * 0.2422 + C[month]) - L;
  }

  /* ---------- 60갑자 유틸 ---------- */
  function ganzhiOf(index) {
    const i = ((index % 60) + 60) % 60;
    const s = i % 10, b = i % 12;
    return {
      index: i,
      stem: s,
      branch: b,
      name: STEMS[s] + BRANCHES[b],
      hanja: STEM_HANJA[s] + BRANCH_HANJA[b],
      stemElem: STEM_ELEM[s],
      branchElem: BRANCH_ELEM[b],
      animal: BRANCH_ANIMAL[b],
    };
  }

  function dayGanzhiIndex(y, m, d) {
    return ((jdn(y, m, d) + 49) % 60 + 60) % 60;
  }

  /* ---------- 사주팔자 계산 ----------
   * opts: { year, month, day, hour, minute, hourUnknown, solarCorrection }
   * solarCorrection: 한국 표준시 → 실제 태양시 보정(-30분) */
  function computeSaju(opts) {
    let { year, month, day, hour, minute, hourUnknown, solarCorrection, gender } = opts;
    minute = minute || 0;

    // 시간 보정 (태양시): -30분
    let effY = year, effM = month, effD = day, effHourMin = null;
    if (!hourUnknown) {
      let total = hour * 60 + minute;
      if (solarCorrection) total -= 30;
      let dayShift = 0;
      if (total < 0) { total += 1440; dayShift = -1; }
      if (total >= 1440) { total -= 1440; dayShift = 1; }
      if (dayShift !== 0) {
        const dt = new Date(Date.UTC(year, month - 1, day + dayShift));
        effY = dt.getUTCFullYear(); effM = dt.getUTCMonth() + 1; effD = dt.getUTCDate();
      }
      effHourMin = total;
    }

    // ----- 일주 (23시 이후는 다음날 자시로 취급) -----
    let dY = effY, dM = effM, dD = effD;
    if (!hourUnknown && effHourMin >= 23 * 60) {
      const dt = new Date(Date.UTC(effY, effM - 1, effD + 1));
      dY = dt.getUTCFullYear(); dM = dt.getUTCMonth() + 1; dD = dt.getUTCDate();
    }
    const dayIdx = dayGanzhiIndex(dY, dM, dD);
    const dayP = ganzhiOf(dayIdx);

    // ----- 년주 (입춘 기준) -----
    let sajuYear = year;
    const ipchun = termDay(year, 2);
    if (month < 2 || (month === 2 && day < ipchun)) sajuYear = year - 1;
    const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
    const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

    // ----- 월주 (절기 기준) -----
    let termM = month, termY = year;
    if (day < termDay(year, month)) {
      termM = month - 1;
      if (termM === 0) { termM = 12; termY = year - 1; }
    }
    const monthBranch = termM % 12; // 2월(입춘)→인(2) ... 12월→자(0), 1월→축(1)
    const monthNum = ((monthBranch - 2 + 12) % 12) + 1; // 인월=1
    const firstMonthStem = ((yearStem % 5) * 2 + 2) % 10;
    const monthStem = (firstMonthStem + monthNum - 1) % 10;

    const monthPillar = {
      stem: monthStem, branch: monthBranch,
      name: STEMS[monthStem] + BRANCHES[monthBranch],
      hanja: STEM_HANJA[monthStem] + BRANCH_HANJA[monthBranch],
      stemElem: STEM_ELEM[monthStem], branchElem: BRANCH_ELEM[monthBranch],
      animal: BRANCH_ANIMAL[monthBranch],
    };

    // ----- 시주 -----
    let hourPillar = null;
    if (!hourUnknown) {
      const hb = Math.floor(((effHourMin + 60) % 1440) / 120);
      const firstHourStem = (dayP.stem % 5) * 2;
      const hs = (firstHourStem + hb) % 10;
      hourPillar = {
        stem: hs, branch: hb,
        name: STEMS[hs] + BRANCHES[hb],
        hanja: STEM_HANJA[hs] + BRANCH_HANJA[hb],
        stemElem: STEM_ELEM[hs], branchElem: BRANCH_ELEM[hb],
        animal: BRANCH_ANIMAL[hb],
      };
    }

    const yearPillar = {
      stem: yearStem, branch: yearBranch,
      name: STEMS[yearStem] + BRANCHES[yearBranch],
      hanja: STEM_HANJA[yearStem] + BRANCH_HANJA[yearBranch],
      stemElem: STEM_ELEM[yearStem], branchElem: BRANCH_ELEM[yearBranch],
      animal: BRANCH_ANIMAL[yearBranch],
    };

    // ----- 오행 분포 -----
    const pillars = [yearPillar, monthPillar, dayP, hourPillar].filter(Boolean);
    const elemCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    pillars.forEach(p => { elemCount[p.stemElem]++; elemCount[p.branchElem]++; });

    let dominant = '목', lacking = '목';
    ELEMENTS.forEach(e => {
      if (elemCount[e] > elemCount[dominant]) dominant = e;
      if (elemCount[e] < elemCount[lacking]) lacking = e;
    });

    // ----- 십신 -----
    const tenGods = {
      year: { stem: tenGod(dayP.stem, yearPillar.stem), branch: tenGod(dayP.stem, BRANCH_MAIN_STEM[yearPillar.branch]) },
      month: { stem: tenGod(dayP.stem, monthPillar.stem), branch: tenGod(dayP.stem, BRANCH_MAIN_STEM[monthPillar.branch]) },
      day: { stem: '일간(나)', branch: tenGod(dayP.stem, BRANCH_MAIN_STEM[dayP.branch]) },
      hour: hourPillar ? { stem: tenGod(dayP.stem, hourPillar.stem), branch: tenGod(dayP.stem, BRANCH_MAIN_STEM[hourPillar.branch]) } : null,
    };

    // ----- 성별 의존 해석: 대운 · 배우자성 -----
    const luck = computeLuckCycles(
      { yearStem, monthStem, monthBranch },
      { y: year, m: month, d: day },
      gender
    );
    const sinsal = computeSinsal(pillars, dayP.stem, yearBranch, dayP.branch);
    const spouse = spouseAnalysis(dayP.stem, dayP.branch, pillars, gender);

    return {
      year: yearPillar, month: monthPillar, day: dayP, hour: hourPillar,
      luck, sinsal, spouse, gender: gender || 'X',
      dayMaster: dayP.stem,
      dayMasterName: STEMS[dayP.stem],
      dayMasterHanja: STEM_HANJA[dayP.stem],
      dayMasterElem: STEM_ELEM[dayP.stem],
      dayMasterYang: dayP.stem % 2 === 0,
      elemCount, dominant, lacking,
      tenGods,
      sajuYear,
      zodiac: BRANCH_ANIMAL[yearBranch],
    };
  }

  /* ---------- 십신 계산 ---------- */
  function tenGod(dayStem, otherStem) {
    const de = STEM_ELEM[dayStem], oe = STEM_ELEM[otherStem];
    const same = (dayStem % 2) === (otherStem % 2);
    if (oe === de) return same ? '비견' : '겁재';
    if (GEN_NEXT[de] === oe) return same ? '식신' : '상관';
    if (GEN_NEXT[oe] === de) return same ? '편인' : '정인';
    if (CTRL[de] === oe) return same ? '편재' : '정재';
    if (CTRL[oe] === de) return same ? '편관' : '정관';
    return '';
  }

  /* ---------- 60갑자 인덱스 역산 ---------- */
  function ganzhiIndexOf(stem, branch) {
    for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return -1;
  }

  /* ---------- 앞뒤 절기 날짜 ---------- */
  function prevTermDate(y, m, d) {
    if (d >= termDay(y, m)) return { y, m, d: termDay(y, m) };
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return { y: py, m: pm, d: termDay(py, pm) };
  }
  function nextTermDate(y, m, d) {
    if (d < termDay(y, m)) return { y, m, d: termDay(y, m) };
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    return { y: ny, m: nm, d: termDay(ny, nm) };
  }

  /* ---------- 대운(大運) ----------
   * 양남음녀 순행 / 음남양녀 역행.
   * 대운수 = 순행이면 다음 절기까지, 역행이면 이전 절기부터의 일수 ÷ 3 */
  function computeLuckCycles(base, birth, gender) {
    if (gender !== 'M' && gender !== 'F') return null;
    const yangYear = base.yearStem % 2 === 0;
    const forward = yangYear === (gender === 'M');

    const jb = jdn(birth.y, birth.m, birth.d);
    let days;
    if (forward) {
      const t = nextTermDate(birth.y, birth.m, birth.d);
      days = jdn(t.y, t.m, t.d) - jb;
    } else {
      const t = prevTermDate(birth.y, birth.m, birth.d);
      days = jb - jdn(t.y, t.m, t.d);
    }
    const startAge = Math.max(1, Math.round(days / 3));

    const mIdx = ganzhiIndexOf(base.monthStem, base.monthBranch);
    const list = [];
    for (let k = 1; k <= 8; k++) {
      const p = ganzhiOf(mIdx + (forward ? k : -k));
      list.push(Object.assign({}, p, { from: startAge + (k - 1) * 10, to: startAge + k * 10 - 1 }));
    }
    return { forward, direction: forward ? '순행' : '역행', startAge, days, list };
  }

  /* ---------- 신살(神煞) ---------- */
  // 삼합국: 인오술=화, 사유축=금, 신자진=수, 해묘미=목
  const SAMHAP_KEY = { 2: '화', 6: '화', 10: '화', 5: '금', 9: '금', 1: '금', 8: '수', 0: '수', 4: '수', 11: '목', 3: '목', 7: '목' };
  const SINSAL_TABLE = {
    화: { 도화: 3, 역마: 8, 화개: 10 },
    금: { 도화: 6, 역마: 11, 화개: 1 },
    수: { 도화: 9, 역마: 2, 화개: 4 },
    목: { 도화: 0, 역마: 5, 화개: 7 },
  };
  // 천을귀인: 일간 기준
  const CHEONEUL = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [5, 3], 9: [5, 3], 7: [2, 6] };

  function computeSinsal(pillars, dayStem, yearBranch, dayBranch) {
    const branches = pillars.map(p => p.branch);
    const found = [];
    [yearBranch, dayBranch].forEach(base => {
      const t = SINSAL_TABLE[SAMHAP_KEY[base]];
      if (!t) return;
      Object.keys(t).forEach(name => {
        if (branches.includes(t[name]) && found.indexOf(name) === -1) found.push(name);
      });
    });
    const gui = CHEONEUL[dayStem] || [];
    if (branches.some(b => gui.indexOf(b) !== -1)) found.push('천을귀인');
    return found;
  }

  /* ---------- 배우자성 ----------
   * 남자는 재성(정재·편재)이 아내, 여자는 관성(정관·편관)이 남편을 뜻합니다. */
  function spouseAnalysis(dayStem, dayBranch, pillars, gender) {
    if (gender !== 'M' && gender !== 'F') return null;
    const targets = gender === 'M' ? ['정재', '편재'] : ['정관', '편관'];
    let count = 0;
    pillars.forEach(p => {
      if (targets.indexOf(tenGod(dayStem, p.stem)) !== -1) count++;
      if (targets.indexOf(tenGod(dayStem, BRANCH_MAIN_STEM[p.branch])) !== -1) count++;
    });
    return {
      starName: gender === 'M' ? '재성(財星)' : '관성(官星)',
      targets, count,
      palace: tenGod(dayStem, BRANCH_MAIN_STEM[dayBranch]),
    };
  }

  /* ---------- 지지 관계 ---------- */
  function branchRelation(a, b) {
    if (a === b) return '동일';
    if ((a + 6) % 12 === b) return '충'; // 자오, 축미 ...
    const HAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
    if (HAP[a] === b) return '합';
    // 삼합: 신자진(수) 해묘미(목) 인오술(화) 사유축(금)
    const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
    for (const g of SAMHAP) if (g.includes(a) && g.includes(b)) return '삼합';
    return '무난';
  }

  /* ---------- 문자열 시드 RNG (mulberry32) ---------- */
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seededRng(seedStr) {
    let a = hashStr(seedStr);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 오늘의 일진 ---------- */
  function todayGanzhi(date) {
    const d = date || new Date();
    return ganzhiOf(dayGanzhiIndex(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }

  global.Saju = {
    STEMS, STEM_HANJA, STEM_ELEM, BRANCHES, BRANCH_HANJA, BRANCH_ELEM,
    BRANCH_ANIMAL, ELEMENTS, ELEM_COLOR, GEN_NEXT, CTRL,
    jdn, termDay, TERM_NAME, ganzhiOf, ganzhiIndexOf, dayGanzhiIndex,
    prevTermDate, nextTermDate, computeLuckCycles, computeSinsal, spouseAnalysis,
    computeSaju, tenGod, branchRelation, hashStr, seededRng, todayGanzhi,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.Saju;
})(typeof window !== 'undefined' ? window : globalThis);
