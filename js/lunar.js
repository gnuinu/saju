/* ============================================================
 * lunar.js — 음양력 변환 (한국 음력, KST 기준)
 *
 * 현행 음력(시헌력) 규칙을 천문 계산으로 그대로 구현합니다.
 *   1) 달의 삭(朔, 신월) 순간이 드는 날이 그 달의 초하루
 *   2) 동지(冬至)는 반드시 11월에 든다
 *   3) 두 동짓달 사이에 13개월이 들어가면 그 해에 윤달이 있다
 *   4) 윤달은 중기(中氣)가 들지 않는 첫 번째 달
 *
 * 한국 음력은 한국 표준시(UTC+9)를 기준으로 정해집니다.
 * 중국 음력(UTC+8)과 하루 차이가 나는 해가 종종 있는 이유입니다.
 * 삭 계산은 Meeus 『Astronomical Algorithms』 49장을 따릅니다.
 * ============================================================ */
(function (global) {
  'use strict';

  const S = global.Saju;
  const RAD = Math.PI / 180;
  const SYNODIC = 29.530588861; // 삭망월 평균 길이(일)

  const sin = (deg) => Math.sin(deg * RAD);

  /* KST 기준 날짜 번호 (같은 날이면 같은 정수) */
  function kstDay(jdUT) { return Math.floor(jdUT + 9 / 24 + 0.5); }

  /* ---------- 삭(신월)의 순간 — Meeus 49장 ---------- */
  function newMoonJD(k) {
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

    let jde = 2451550.09766 + SYNODIC * k
      + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;

    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
    const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;

    jde += -0.40720 * sin(Mp)
      + 0.17241 * E * sin(M)
      + 0.01608 * sin(2 * Mp)
      + 0.01039 * sin(2 * F)
      + 0.00739 * E * sin(Mp - M)
      - 0.00514 * E * sin(Mp + M)
      + 0.00208 * E * E * sin(2 * M)
      - 0.00111 * sin(Mp - 2 * F)
      - 0.00057 * sin(Mp + 2 * F)
      + 0.00056 * E * sin(2 * Mp + M)
      - 0.00042 * sin(3 * Mp)
      + 0.00042 * E * sin(M + 2 * F)
      + 0.00038 * E * sin(M - 2 * F)
      - 0.00024 * E * sin(2 * Mp - M)
      - 0.00017 * sin(Om)
      - 0.00007 * sin(Mp + 2 * M)
      + 0.00004 * sin(2 * Mp - 2 * F)
      + 0.00004 * sin(3 * M)
      + 0.00003 * sin(Mp + M - 2 * F)
      + 0.00003 * sin(2 * Mp + 2 * F)
      - 0.00003 * sin(Mp + M + 2 * F)
      + 0.00003 * sin(Mp - M + 2 * F)
      - 0.00002 * sin(Mp - M - 2 * F)
      - 0.00002 * sin(3 * Mp + M)
      + 0.00002 * sin(4 * Mp);

    // 추가 주기항 A1~A14
    const A = [
      [0.000325, 299.77 + 0.107408 * k - 0.009173 * T2],
      [0.000165, 251.88 + 0.016321 * k],
      [0.000164, 251.83 + 26.651886 * k],
      [0.000126, 349.42 + 36.412478 * k],
      [0.000110, 84.66 + 18.206239 * k],
      [0.000062, 141.74 + 53.303771 * k],
      [0.000060, 207.14 + 2.453732 * k],
      [0.000056, 154.84 + 7.306860 * k],
      [0.000047, 34.52 + 27.261239 * k],
      [0.000042, 207.19 + 0.121824 * k],
      [0.000040, 291.34 + 1.844379 * k],
      [0.000037, 161.72 + 24.198154 * k],
      [0.000035, 239.56 + 25.513099 * k],
      [0.000023, 331.55 + 3.592518 * k],
    ];
    for (let i = 0; i < A.length; i++) jde += A[i][0] * sin(A[i][1]);

    // 지구시(TT) → 세계시(UT)
    const approxYear = 2000 + k / 12.3685;
    return jde - S.deltaTSec(approxYear) / 86400;
  }

  /* 해당 날짜(이하)의 가장 마지막 삭의 k값 */
  function newMoonKOnOrBefore(dayNum) {
    let k = Math.floor((dayNum - 2451550.5) / SYNODIC);
    while (kstDay(newMoonJD(k)) > dayNum) k--;
    while (kstDay(newMoonJD(k + 1)) <= dayNum) k++;
    return k;
  }

  /* ---------- 태양황경이 목표값에 닿는 순간 ---------- */
  function solarLongitudeJD(targetLong, approxJD) {
    let x = approxJD;
    for (let i = 0; i < 10; i++) {
      const yr = 2000 + (x - 2451545) / 365.25;
      let diff = targetLong - S.solarLongitude(x + S.deltaTSec(yr) / 86400);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      x += diff / 0.9856473;
    }
    return x;
  }

  /* 그 해 12월의 동지 (황경 270°) */
  function winterSolstice(year) {
    return solarLongitudeJD(270, S.jdFull(year, 12, 22, 0));
  }

  /* 중기(中氣): 황경 30° 배수. 동지 이후 n번째 중기 */
  function zhongqiAfter(wsJD, n) {
    const target = (270 + 30 * n) % 360;
    return solarLongitudeJD(target, wsJD + 30.4 * n);
  }

  /* ---------- 한 음력 주기(동지달 ~ 다음 동지달) 구성 ----------
   * 반환: [{ startDay, endDay, num, isLeap, lunarYear, days }]
   * 이 주기는 (lunarYear-1)년 11월부터 lunarYear년 11월까지를 담습니다. */
  const _cycleCache = {};
  function buildCycle(lunarYear) {
    if (_cycleCache[lunarYear]) return _cycleCache[lunarYear];

    const ws1 = winterSolstice(lunarYear - 1);
    const ws2 = winterSolstice(lunarYear);
    const k1 = newMoonKOnOrBefore(kstDay(ws1));
    const k2 = newMoonKOnOrBefore(kstDay(ws2));
    const count = k2 - k1;                 // 두 동짓달 사이의 달 수
    const isLeapYear = count === 13;

    // 달 경계(초하루) 날짜번호
    const starts = [];
    for (let i = 0; i <= count; i++) starts.push(kstDay(newMoonJD(k1 + i)));

    // 중기 날짜번호 (동지 포함해 넉넉히)
    const zq = [];
    for (let n = 0; n <= 13; n++) zq.push(kstDay(zhongqiAfter(ws1, n)));
    const hasZhongqi = (a, b) => zq.some(z => z >= a && z < b);

    const months = [];
    let num = 11, prev = 11, leapDone = false;
    let year = lunarYear - 1, seenFirst = false;

    for (let i = 0; i < count; i++) {
      const a = starts[i], b = starts[i + 1];
      if (isLeapYear && !leapDone && i > 0 && !hasZhongqi(a, b)) {
        months.push({ startDay: a, endDay: b, num: prev, isLeap: true, lunarYear: year, days: b - a });
        leapDone = true;
      } else {
        if (num === 1) { seenFirst = true; year = lunarYear; }
        months.push({ startDay: a, endDay: b, num: num, isLeap: false, lunarYear: year, days: b - a });
        prev = num;
        num = num === 12 ? 1 : num + 1;
      }
    }
    // 마지막 11월은 lunarYear에 속함
    if (seenFirst) months[months.length - 1].lunarYear = lunarYear;

    _cycleCache[lunarYear] = months;
    return months;
  }

  /* 해당 음력 연도의 열두 달 (윤달 포함) */
  function monthsOfLunarYear(lunarYear) {
    const a = buildCycle(lunarYear).filter(m => m.lunarYear === lunarYear);
    const b = buildCycle(lunarYear + 1).filter(m => m.lunarYear === lunarYear);
    const seen = {};
    return a.concat(b).filter(m => {
      const key = m.num + (m.isLeap ? 'L' : '');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort((x, y) => x.startDay - y.startDay);
  }

  /* ---------- 음력 → 양력 ---------- */
  function lunarToSolar(lunarYear, month, isLeap, day) {
    const list = monthsOfLunarYear(lunarYear);
    const m = list.find(x => x.num === month && x.isLeap === !!isLeap);
    if (!m) return null;
    if (day < 1 || day > m.days) return null;
    const d = S.jdToDate(m.startDay + day - 1 - 0.5 + 0.0001);
    return { year: d.y, month: d.m, day: d.d };
  }

  /* ---------- 양력 → 음력 ---------- */
  function solarToLunar(year, month, day) {
    const dayNum = Math.floor(S.jdFull(year, month, day, 12) + 0.5);
    // 이 날짜가 속한 주기를 찾음 (경계에서는 앞뒤 주기를 확인)
    for (let ly = year + 1; ly >= year - 1; ly--) {
      const cyc = buildCycle(ly);
      for (let i = 0; i < cyc.length; i++) {
        const m = cyc[i];
        if (dayNum >= m.startDay && dayNum < m.endDay) {
          return {
            year: m.lunarYear, month: m.num, isLeap: m.isLeap,
            day: dayNum - m.startDay + 1, monthDays: m.days,
          };
        }
      }
    }
    return null;
  }

  /* 해당 음력 달의 일수 (29 또는 30) */
  function daysInLunarMonth(lunarYear, month, isLeap) {
    const m = monthsOfLunarYear(lunarYear).find(x => x.num === month && x.isLeap === !!isLeap);
    return m ? m.days : 0;
  }

  /* 해당 음력 연도의 윤달 번호 (없으면 0) */
  function leapMonthOf(lunarYear) {
    const m = monthsOfLunarYear(lunarYear).find(x => x.isLeap);
    return m ? m.num : 0;
  }

  global.Lunar = {
    newMoonJD, newMoonKOnOrBefore, kstDay, winterSolstice,
    buildCycle, monthsOfLunarYear,
    lunarToSolar, solarToLunar, daysInLunarMonth, leapMonthOf,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Lunar;
})(typeof window !== 'undefined' ? window : globalThis);
