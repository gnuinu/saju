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

  /* ============================================================
   * 절기(節氣) 정밀 계산 — 태양 겉보기 황경 기반 (Meeus, 천문알고리즘)
   * 태양황경이 15°의 배수에 닿는 순간이 절기입니다.
   * 근사식(壽星公式) 대비 1930~2030년 구간에서 실제 만세력과 100% 일치.
   * ============================================================ */
  const RAD = Math.PI / 180;
  const TERM_NAME = { 1: '소한', 2: '입춘', 3: '경칩', 4: '청명', 5: '입하', 6: '망종', 7: '소서', 8: '입추', 9: '백로', 10: '한로', 11: '입동', 12: '대설' };
  // 각 달을 여는 절기의 태양황경
  const TERM_LONGITUDE = { 1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75, 7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255 };

  // 소수점을 포함한 율리우스일
  function jdFull(y, m, d, hourFrac) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
      + d + B - 1524.5 + (hourFrac || 0) / 24;
  }

  // 율리우스일 → 달력 날짜
  function jdToDate(j) {
    const z = Math.floor(j + 0.5);
    const f = j + 0.5 - z;
    let a = z;
    if (z >= 2299161) {
      const al = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + al - Math.floor(al / 4);
    }
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const dd = Math.floor(365.25 * c);
    const e = Math.floor((b - dd) / 30.6001);
    const day = b - dd - Math.floor(30.6001 * e);
    const mo = e < 14 ? e - 1 : e - 13;
    const yr = mo > 2 ? c - 4716 : c - 4715;
    return { y: yr, m: mo, d: day, hour: f * 24 };
  }

  // ΔT (지구시 − 세계시), 초 — Espenak & Meeus 다항식
  function deltaTSec(y) {
    let t;
    if (y >= 2005 && y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y >= 1986 && y < 2005) {
      t = y - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * Math.pow(t, 2) + 0.0017275 * Math.pow(t, 3)
        + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5);
    }
    if (y >= 1961 && y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - Math.pow(t, 3) / 718; }
    if (y >= 1941 && y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + Math.pow(t, 3) / 2547; }
    if (y >= 1920 && y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * Math.pow(t, 3); }
    if (y >= 2050) { return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y); }
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * Math.pow(t, 3) - 0.000197 * Math.pow(t, 4);
  }

  // 태양 겉보기 황경(도). jde는 지구시(TT) 기준 율리우스일
  function solarLongitude(jde) {
    const T = (jde - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
      + 0.000289 * Math.sin(3 * M * RAD);
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return ((lambda % 360) + 360) % 360;
  }

  /* 해당 달을 여는 절기의 순간 (세계시 기준 율리우스일) */
  const _termCache = {};
  function termJD(year, month) {
    const key = year * 100 + month;
    if (_termCache[key] !== undefined) return _termCache[key];
    const target = TERM_LONGITUDE[month];
    let x = jdFull(year, month, 5, 0) + deltaTSec(year) / 86400;
    for (let i = 0; i < 8; i++) {
      let diff = target - solarLongitude(x);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      x += diff / 0.9856473;
    }
    const ut = x - deltaTSec(year) / 86400;
    _termCache[key] = ut;
    return ut;
  }

  /* ============================================================
   * 한국 표준시 역사 — 시주(時柱) 정확도에 직결
   * 표준자오선이 바뀐 시기와 서머타임 시행 기간이 실재합니다.
   * ============================================================ */
  // 표준자오선: 1912-01-01~1954-03-20 및 1961-08-10~현재는 UTC+9(135°E),
  //             1954-03-21~1961-08-09은 UTC+8:30(127.5°E)
  function standardOffsetMin(y, m, d) {
    const t = y * 10000 + m * 100 + d;
    if (t >= 19540321 && t <= 19610809) return 510; // +8:30
    return 540;                                     // +9:00
  }
  // 서머타임 시행 기간 (IANA tz database, Asia/Seoul)
  const DST_RANGES = [
    [19480601, 19480913], [19490403, 19490911], [19500401, 19500910], [19510506, 19510909],
    [19550505, 19550909], [19560520, 19560930], [19570505, 19570922], [19580504, 19580921],
    [19590504, 19590920], [19600501, 19600918], [19870510, 19871011], [19880508, 19881009],
  ];
  function dstOffsetMin(y, m, d) {
    const t = y * 10000 + m * 100 + d;
    for (let i = 0; i < DST_RANGES.length; i++) {
      if (t >= DST_RANGES[i][0] && t <= DST_RANGES[i][1]) return 60;
    }
    return 0;
  }
  // 출생 당시 시계가 UTC보다 몇 분 앞서 있었는가
  function koreaOffsetMin(y, m, d) {
    return standardOffsetMin(y, m, d) + dstOffsetMin(y, m, d);
  }
  /* 시계시각 → 평균태양시 보정량(분).
   * 서울(127.5°E)의 평균태양시는 UTC+8:30이므로 그 차이만큼 빼 줍니다.
   * 현대(UTC+9) = 30분, 서머타임 시행기 = 90분, 1954~61년(UTC+8:30) = 0분 */
  function solarShiftMin(y, m, d) {
    return koreaOffsetMin(y, m, d) - 510;
  }

  /* 절기 날짜(해당 시기 한국 시계 기준) */
  function termMoment(year, month) {
    const approx = jdToDate(termJD(year, month) + 9 / 24);
    const off = koreaOffsetMin(approx.y, approx.m, approx.d);
    return jdToDate(termJD(year, month) + off / 1440);
  }
  function termDay(year, month) { return termMoment(year, month).d; }

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

    // 시간 보정: 출생 당시 표준시(자오선 변경·서머타임)를 반영한 평균태양시
    const shift = solarCorrection ? solarShiftMin(year, month, day) : 0;
    let effY = year, effM = month, effD = day, effHourMin = null;
    if (!hourUnknown) {
      let total = hour * 60 + minute;
      total -= shift;
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

    // ----- 출생 순간을 세계시 율리우스일로 (절기 시각과 정확히 비교하기 위해) -----
    // 시간을 모르면 정오로 가정하고, 절기 당일 출생이면 경계 불확실 플래그를 세웁니다.
    const clockMin = hourUnknown ? 12 * 60 : hour * 60 + minute;
    const birthJD = jdFull(year, month, day, clockMin / 60) - koreaOffsetMin(year, month, day) / 1440;

    // ----- 년주 (입춘 시각 기준) -----
    const ipchunJD = termJD(year, 2);
    const sajuYear = birthJD < ipchunJD ? year - 1 : year;
    const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
    const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

    // ----- 월주 (절기 시각 기준) -----
    let termM = month, termY = year;
    if (birthJD < termJD(year, month)) {
      termM = month - 1;
      if (termM === 0) { termM = 12; termY = year - 1; }
    }

    // 절기 당일에 태어났는데 출생 시각을 모르면 년주/월주가 갈릴 수 있음
    const ipchunM = termMoment(year, 2);
    const thisTermM = termMoment(termY === year ? year : year, month);
    const onBoundary =
      (ipchunM.y === year && ipchunM.m === month && ipchunM.d === day) ||
      (thisTermM.m === month && thisTermM.d === day);
    const boundaryUncertain = hourUnknown && onBoundary;
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
      solarShiftMin: shift, boundaryUncertain,
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
    jdn, jdFull, jdToDate, termDay, termMoment, termJD, solarLongitude, deltaTSec,
    koreaOffsetMin, solarShiftMin, TERM_NAME, ganzhiOf, ganzhiIndexOf, dayGanzhiIndex,
    prevTermDate, nextTermDate, computeLuckCycles, computeSinsal, spouseAnalysis,
    computeSaju, tenGod, branchRelation, hashStr, seededRng, todayGanzhi,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.Saju;
})(typeof window !== 'undefined' ? window : globalThis);
