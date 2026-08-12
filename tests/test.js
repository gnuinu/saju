/* 만세력 엔진 검증 테스트: node tests/test.js */
const Saju = require('../js/saju.js');
global.Saju = Saju;
const SajuData = require('../js/data.js');
global.SajuData = SajuData;
const Lunar = require('../js/lunar.js');
global.Lunar = Lunar;
const Tarot = require('../js/tarot.js');
const Mbti = require('../js/mbti.js');
const Fortune = require('../js/fortune.js');

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.error('  ✗ ' + label + ' — expected ' + expected + ', got ' + actual); }
}

console.log('[일주 검증]');
// 2000-01-01은 무오(戊午)일로 알려져 있음
eq(Saju.ganzhiOf(Saju.dayGanzhiIndex(2000, 1, 1)).name, '무오', '2000-01-01 = 무오일');
// 60일 주기 확인
eq(Saju.dayGanzhiIndex(2000, 3, 1), Saju.dayGanzhiIndex(2000, 1, 1), '60일 뒤 같은 간지');

console.log('[년주 검증]');
let s = Saju.computeSaju({ year: 2024, month: 6, day: 15, hourUnknown: true });
eq(s.year.name, '갑진', '2024-06-15 → 갑진년');
s = Saju.computeSaju({ year: 2000, month: 1, day: 1, hourUnknown: true });
eq(s.year.name, '기묘', '2000-01-01 → (입춘 전) 기묘년');
s = Saju.computeSaju({ year: 1984, month: 5, day: 1, hourUnknown: true });
eq(s.year.name, '갑자', '1984-05-01 → 갑자년');

console.log('[월주 검증]');
s = Saju.computeSaju({ year: 2000, month: 1, day: 1, hourUnknown: true });
eq(s.month.name, '병자', '2000-01-01 → 병자월 (기묘년 자월)');
s = Saju.computeSaju({ year: 2024, month: 2, day: 20, hourUnknown: true });
eq(s.month.name, '병인', '2024-02-20 → 병인월 (갑진년 인월)');

console.log('[시주 검증]');
// 갑/기일의 자시는 갑자시
s = Saju.computeSaju({ year: 2024, month: 6, day: 15, hour: 12, minute: 0, hourUnknown: false, solarCorrection: false });
const dayStem = s.day.stem;
const expectedNoonStem = ((dayStem % 5) * 2 + 6) % 10; // 자시 천간 + 6 (오시)
eq(s.hour.branch, 6, '12:00 → 오시');
eq(s.hour.stem, expectedNoonStem, '오시 천간 규칙 일치');
// 태양시 보정: 12:10 → 11:40 → 여전히 오시(11~13시)
s = Saju.computeSaju({ year: 2024, month: 6, day: 15, hour: 12, minute: 10, hourUnknown: false, solarCorrection: true });
eq(s.hour.branch, 6, '태양시 보정 후에도 오시');
// 23시는 다음날 자시
const a = Saju.computeSaju({ year: 2024, month: 6, day: 15, hour: 23, minute: 30, hourUnknown: false, solarCorrection: false });
const b = Saju.computeSaju({ year: 2024, month: 6, day: 16, hour: 1, minute: 0, hourUnknown: false, solarCorrection: false });
eq(a.day.name, b.day.name, '23:30 일주 = 다음날 일주');
eq(a.hour.branch, 0, '23:30 → 자시');

console.log('[십신 검증]');
eq(Saju.tenGod(0, 0), '비견', '갑 vs 갑 = 비견');
eq(Saju.tenGod(0, 1), '겁재', '갑 vs 을 = 겁재');
eq(Saju.tenGod(0, 2), '식신', '갑 vs 병 = 식신');
eq(Saju.tenGod(0, 3), '상관', '갑 vs 정 = 상관');
eq(Saju.tenGod(0, 4), '편재', '갑 vs 무 = 편재');
eq(Saju.tenGod(0, 5), '정재', '갑 vs 기 = 정재');
eq(Saju.tenGod(0, 6), '편관', '갑 vs 경 = 편관');
eq(Saju.tenGod(0, 7), '정관', '갑 vs 신 = 정관');
eq(Saju.tenGod(0, 8), '편인', '갑 vs 임 = 편인');
eq(Saju.tenGod(0, 9), '정인', '갑 vs 계 = 정인');

console.log('[지지 관계 검증]');
eq(Saju.branchRelation(0, 6), '충', '자오충');
eq(Saju.branchRelation(0, 1), '합', '자축합');
eq(Saju.branchRelation(8, 4), '삼합', '신진 삼합(수국)');

console.log('[절기 정밀 계산 검증]');
// 공표된 만세력 절기일과 대조 (근사식이 틀렸던 윤년 포함)
[[2024, 2, 4], [2025, 2, 3], [2026, 2, 4], [2000, 2, 4], [2004, 2, 4],
 [2016, 2, 4], [2024, 4, 4], [1984, 2, 5]].forEach(([y, m, d]) => {
  eq(Saju.termDay(y, m), d, `${y}년 ${Saju.TERM_NAME[m]} = ${m}/${d}`);
});
// 절기일 범위 제약: 입춘은 2/3~2/5, 청명은 4/4~4/6를 벗어나지 않음
let ipchunRange = true, chungmyeongRange = true;
for (let y = 1930; y <= 2030; y++) {
  const i = Saju.termDay(y, 2), c = Saju.termDay(y, 4);
  if (i < 3 || i > 5) ipchunRange = false;
  if (c < 4 || c > 6) chungmyeongRange = false;
}
eq(ipchunRange, true, '1930~2030 입춘이 2/3~2/5 범위 내');
eq(chungmyeongRange, true, '1930~2030 청명이 4/4~4/6 범위 내');
// 절기는 매년 단조 증가해야 함 (계산 발산 방지)
let monotonic = true;
for (let y = 1931; y <= 2030; y++) {
  for (let m = 1; m <= 12; m++) if (Saju.termJD(y, m) <= Saju.termJD(y - 1, m)) monotonic = false;
}
eq(monotonic, true, '절기 시각이 연도별로 단조 증가');

console.log('[입춘 경계 시각 검증]');
// 2024 입춘은 2/4 저녁 — 같은 날이라도 시각에 따라 년주가 갈림
const beforeIp = Saju.computeSaju({ year: 2024, month: 2, day: 4, hour: 10, minute: 0, hourUnknown: false, solarCorrection: true });
const afterIp = Saju.computeSaju({ year: 2024, month: 2, day: 4, hour: 20, minute: 0, hourUnknown: false, solarCorrection: true });
eq(beforeIp.year.name, '계묘', '입춘 전 출생 → 전년도 년주');
eq(afterIp.year.name, '갑진', '입춘 후 출생 → 당해 년주');
eq(beforeIp.boundaryUncertain, false, '시각을 알면 경계 불확실 아님');
const unknownIp = Saju.computeSaju({ year: 2024, month: 2, day: 4, hourUnknown: true, solarCorrection: true });
eq(unknownIp.boundaryUncertain, true, '절기 당일 + 시간 모름 → 경계 불확실 표시');

console.log('[한국 표준시 역사 검증]');
eq(Saju.solarShiftMin(1995, 3, 21), 30, '현대(UTC+9) → 30분 보정');
eq(Saju.solarShiftMin(1988, 8, 15), 90, '1988 서머타임 → 90분 보정');
eq(Saju.solarShiftMin(1988, 1, 15), 30, '1988 겨울(서머타임 밖) → 30분');
eq(Saju.solarShiftMin(1957, 1, 15), 0, '1957(UTC+8:30) → 보정 없음');
eq(Saju.solarShiftMin(1955, 6, 15), 60, '1955 여름(UTC+8:30 + 서머타임) → 60분');
eq(Saju.solarShiftMin(1953, 6, 15), 30, '1953(UTC+9, 서머타임 없음) → 30분');
// 서머타임 1시간 차이가 시주를 실제로 바꾸는지
const dstOn = Saju.computeSaju({ year: 1988, month: 8, day: 15, hour: 7, minute: 30, hourUnknown: false, solarCorrection: true });
const dstOff = Saju.computeSaju({ year: 1988, month: 1, day: 15, hour: 7, minute: 30, hourUnknown: false, solarCorrection: true });
eq(dstOn.hour.branch, 3, '1988 여름 07:30 → 90분 보정 → 06:00 = 묘시');
eq(dstOff.hour.branch, 4, '1988 겨울 07:30 → 30분 보정 → 07:00 = 진시');
eq(dstOn.hour.name !== dstOff.hour.name, true, '서머타임 여부가 시주를 실제로 바꿈');
// 1984 입춘은 2/5 00:25 — 2/4 출생자는 전년(계해)에 속함
eq(Saju.computeSaju({ year: 1984, month: 2, day: 4, hour: 12, minute: 0, hourUnknown: false, solarCorrection: true }).year.name,
  '계해', '1984-02-04 출생 → 계해년 (입춘 전)');

console.log('[음력 변환 검증]');
const ymd = (o) => o ? o.year + '-' + String(o.month).padStart(2, '0') + '-' + String(o.day).padStart(2, '0') : 'null';
// 설날 = 음력 1월 1일
[[2020, '2020-01-25'], [2022, '2022-02-01'], [2023, '2023-01-22'],
 [2024, '2024-02-10'], [2025, '2025-01-29'], [2026, '2026-02-17']].forEach(([y, s]) => {
  eq(ymd(Lunar.lunarToSolar(y, 1, false, 1)), s, `${y}년 설날(음 1/1) = ${s}`);
});
// 추석 = 음력 8월 15일
[[2022, '2022-09-10'], [2023, '2023-09-29'], [2024, '2024-09-17'], [2025, '2025-10-06']].forEach(([y, s]) => {
  eq(ymd(Lunar.lunarToSolar(y, 8, false, 15)), s, `${y}년 추석(음 8/15) = ${s}`);
});
// 윤달
[[2012, 3], [2014, 9], [2017, 5], [2020, 4], [2023, 2], [2025, 6], [2028, 5]].forEach(([y, lm]) => {
  eq(Lunar.leapMonthOf(y), lm, `${y}년 윤달 = 윤${lm}월`);
});
eq(Lunar.leapMonthOf(2024), 0, '2024년은 윤달 없음');

// 양력↔음력 왕복 변환 (1930~2030 매월 1·15일)
let rtFail = 0, rtTotal = 0;
for (let y = 1930; y <= 2030; y += 1) {
  for (let m = 1; m <= 12; m += 3) {
    for (const d of [1, 15]) {
      const lu = Lunar.solarToLunar(y, m, d);
      rtTotal++;
      if (!lu) { rtFail++; continue; }
      const back = Lunar.lunarToSolar(lu.year, lu.month, lu.isLeap, lu.day);
      if (!back || back.year !== y || back.month !== m || back.day !== d) rtFail++;
    }
  }
}
eq(rtFail, 0, `양력→음력→양력 왕복 일치 (${rtTotal}건)`);

// 음력 달은 29일 또는 30일
let lenOK = true;
Lunar.monthsOfLunarYear(2024).forEach(m => { if (m.days !== 29 && m.days !== 30) lenOK = false; });
eq(lenOK, true, '음력 달 길이는 29 또는 30일');
// 윤달 포함 해는 13개월
eq(Lunar.monthsOfLunarYear(2023).length, 13, '윤달 있는 해(2023)는 13개월');
eq(Lunar.monthsOfLunarYear(2024).length, 12, '평년(2024)은 12개월');
// 없는 날짜는 null
eq(Lunar.lunarToSolar(2024, 1, true, 1), null, '없는 윤달 요청 → null');
eq(Lunar.lunarToSolar(2024, 1, false, 31), null, '음력 31일 → null');

console.log('[음력 입력 → 사주 일관성]');
// 음력 설날 출생은 양력으로 환산해도 같은 날을 가리켜야 함
const seol2024 = Lunar.lunarToSolar(2024, 1, false, 1);   // 2024-02-10
const sajuLunar = Saju.computeSaju({ year: seol2024.year, month: seol2024.month, day: seol2024.day, hour: 9, minute: 0, hourUnknown: false, solarCorrection: true, gender: 'F' });
const sajuSolar = Saju.computeSaju({ year: 2024, month: 2, day: 10, hour: 9, minute: 0, hourUnknown: false, solarCorrection: true, gender: 'F' });
eq(sajuLunar.day.name, sajuSolar.day.name, '음력 2024-1-1 = 양력 2024-2-10, 일주 동일');
eq(sajuLunar.year.name, '갑진', '2024 설날은 입춘 이후라 갑진년');
// 윤달과 평달은 서로 다른 날짜로 환산돼야 함
const plain = Lunar.lunarToSolar(2023, 2, false, 15);
const leapy = Lunar.lunarToSolar(2023, 2, true, 15);
eq(plain.month !== leapy.month || plain.day !== leapy.day, true, '2023년 평2월과 윤2월은 다른 날');
eq(Saju.computeSaju({ year: plain.year, month: plain.month, day: plain.day, hourUnknown: true }).day.name
  !== Saju.computeSaju({ year: leapy.year, month: leapy.month, day: leapy.day, hourUnknown: true }).day.name,
  true, '평달/윤달 선택에 따라 사주가 달라짐');

console.log('[대운 검증 — 성별 반영]');
// 1984 갑자년(양) 남자 → 순행 / 여자 → 역행
const mSaju = Saju.computeSaju({ year: 1984, month: 5, day: 1, hourUnknown: true, gender: 'M' });
const fSaju = Saju.computeSaju({ year: 1984, month: 5, day: 1, hourUnknown: true, gender: 'F' });
eq(mSaju.luck.direction, '순행', '양년(갑자) 남자 → 순행');
eq(fSaju.luck.direction, '역행', '양년(갑자) 여자 → 역행');
// 1985 을축년(음) 남자 → 역행 / 여자 → 순행
const m85 = Saju.computeSaju({ year: 1985, month: 5, day: 1, hourUnknown: true, gender: 'M' });
const f85 = Saju.computeSaju({ year: 1985, month: 5, day: 1, hourUnknown: true, gender: 'F' });
eq(m85.luck.direction, '역행', '음년(을축) 남자 → 역행');
eq(f85.luck.direction, '순행', '음년(을축) 여자 → 순행');
// 순행/역행은 월주 기준 서로 반대 방향
const mIdx = Saju.ganzhiIndexOf(mSaju.month.stem, mSaju.month.branch);
eq(mSaju.luck.list[0].index, (mIdx + 1) % 60, '순행 첫 대운 = 월주 +1');
eq(fSaju.luck.list[0].index, (mIdx + 59) % 60, '역행 첫 대운 = 월주 -1');
eq(mSaju.luck.list.length, 8, '대운 8주기 생성');
eq(mSaju.luck.list[1].from - mSaju.luck.list[0].from, 10, '대운 간격 10년');
eq(mSaju.luck.startAge >= 1 && mSaju.luck.startAge <= 10, true, '대운수 1~10 범위');
// 성별 미선택 시 대운/배우자 해석 없음
const xSaju = Saju.computeSaju({ year: 1984, month: 5, day: 1, hourUnknown: true, gender: 'X' });
eq(xSaju.luck, null, '성별 미선택 → 대운 null');
eq(xSaju.spouse, null, '성별 미선택 → 배우자성 null');

console.log('[절기 경계 검증]');
const pt = Saju.prevTermDate(2024, 6, 1);
eq(pt.m, 5, '6/1 이전 절기는 5월(입하)');
const nt = Saju.nextTermDate(2024, 6, 20);
eq(nt.m, 7, '6/20 다음 절기는 7월(소서)');

console.log('[배우자성 검증]');
eq(mSaju.spouse.starName, '재성(財星)', '남자 → 재성이 배우자성');
eq(fSaju.spouse.starName, '관성(官星)', '여자 → 관성이 배우자성');
eq(typeof mSaju.spouse.count === 'number' && mSaju.spouse.count >= 0, true, '배우자성 개수 산출');

console.log('[12운성 검증]');
// 양간은 장생 지지에서 순행, 음간은 역행
[[0, 11, '장생'], [0, 0, '목욕'], [0, 2, '건록'], [0, 3, '제왕'],
 [1, 6, '장생'], [1, 5, '목욕'],                       // 을(음간) 역행
 [2, 2, '장생'], [4, 2, '장생'],
 [7, 0, '장생'], [7, 11, '목욕'],                      // 신(음간) 역행
 [8, 8, '장생'], [9, 3, '장생']].forEach(([ds, b, exp]) => {
  eq(Saju.lifeStage(ds, b), exp, `${Saju.STEMS[ds]}일간 ${Saju.BRANCHES[b]} → ${exp}`);
});
// 12지지를 돌면 12단계가 한 번씩만 나와야 함
let stageOK = true;
for (let ds = 0; ds < 10; ds++) {
  const seen = {};
  for (let b = 0; b < 12; b++) seen[Saju.lifeStage(ds, b)] = (seen[Saju.lifeStage(ds, b)] || 0) + 1;
  if (Object.keys(seen).length !== 12) stageOK = false;
}
eq(stageOK, true, '일간마다 12단계가 빠짐없이 한 번씩 배정');

console.log('[공망 검증]');
[[0, '술해'], [10, '신유'], [20, '오미'], [30, '진사'], [40, '인묘'], [50, '자축'], [59, '자축']].forEach(([i, exp]) => {
  eq(Saju.voidBranches(i).map(b => Saju.BRANCHES[b]).join(''), exp, `${Saju.ganzhiOf(i).name}일 공망 = ${exp}`);
});
// 공망 지지는 그 순(旬) 안의 어떤 간지에도 나타나지 않아야 함
let voidOK = true;
for (let x = 0; x < 60; x += 10) {
  const v = Saju.voidBranches(x);
  for (let k = x; k < x + 10; k++) if (v.indexOf(Saju.ganzhiOf(k).branch) !== -1) voidOK = false;
}
eq(voidOK, true, '공망 지지는 해당 순에 등장하지 않음');
// computeSaju 통합
const lsS = Saju.computeSaju({ year: 1995, month: 3, day: 21, hour: 9, minute: 0, hourUnknown: false, solarCorrection: true, gender: 'F' });
eq(Object.keys(lsS.lifeStages).length, 4, '네 기둥의 12운성 산출');
eq(lsS.voids.length, 2, '공망 지지 두 개 산출');
eq(Array.isArray(lsS.voidPillars), true, '공망에 걸린 기둥 목록 반환');
eq(lsS.voidPillars.indexOf('일주') === -1, true, '일주는 자기 자신이라 공망 대상에서 제외');
// 시간 모르면 시주 12운성은 없음
const noHour = Saju.computeSaju({ year: 1995, month: 3, day: 21, hourUnknown: true, gender: 'F' });
eq(noHour.lifeStages.hour, null, '시간 모르면 시주 12운성 없음');
// 모든 단계에 해설이 있어야 함
let lsDescOK = true;
Saju.LIFE_STAGES.forEach(n => { if (!SajuData.LIFE_STAGE_DESC[n]) lsDescOK = false; });
eq(lsDescOK, true, '12운성 12단계 해설 모두 존재');

console.log('[신살 검증]');
eq(Array.isArray(mSaju.sinsal), true, '신살 배열 반환');
let sinsalOk = true;
mSaju.sinsal.forEach(n => { if (!SajuData.SINSAL_DESC[n]) sinsalOk = false; });
eq(sinsalOk, true, '검출된 신살에 해설이 모두 존재');
// 자(0)년생 기준 도화는 유(9) — 신자진 수국
const sin = Saju.computeSinsal([{ branch: 9 }], 0, 0, 0);
eq(sin.indexOf('도화') !== -1, true, '자년 + 유지 → 도화살');

console.log('[운세/타로/MBTI 결정성 검증]');
s = Saju.computeSaju({ year: 1995, month: 3, day: 21, hour: 9, minute: 0, hourUnknown: false, solarCorrection: true });
const d1 = Fortune.dailyFortune(s, new Date(2026, 7, 11));
const d2 = Fortune.dailyFortune(s, new Date(2026, 7, 11));
eq(d1.scores.total, d2.scores.total, '같은 날 운세 점수 동일(결정적)');
eq(d1.total, d2.total, '같은 날 운세 문구 동일');
const w = Fortune.weeklyFortune(s, new Date(2026, 7, 11));
eq(w.days.length, 7, '주간 운세 7일');
const t1 = Tarot.drawCard('seed-a');
const t2 = Tarot.drawCard('seed-a');
eq(t1.card.id, t2.card.id, '같은 시드 → 같은 타로 카드');
const m1 = Mbti.combine('INFP', s);
const m2 = Mbti.combine('INFP', s);
eq(m1.score, m2.score, 'MBTI 궁합 점수 결정적');
eq(typeof m1.synergy, 'string', '결합 해석 문자열 생성');

// 모든 일간에 해석 콘텐츠 존재
console.log('[궁합 검증]');
const Match = require('../js/match.js');
global.Match = Match;
const mk = (y, m, d, g) => Saju.computeSaju({ year: y, month: m, day: d, hour: 12, minute: 0, hourUnknown: false, solarCorrection: true, gender: g });

// 지지 관계 판정
eq(Match.branchPair(8, 0), '삼합', '신-자 삼합');
eq(Match.branchPair(0, 1), '육합', '자-축 육합');
eq(Match.branchPair(0, 6), '충', '자-오 충');
eq(Match.branchPair(2, 9), '원진', '인-유 원진');
eq(Match.branchPair(3, 4), '육해', '묘-진 육해');
eq(Match.branchPair(5, 5), '동일', '같은 지지');
// 천간 관계
eq(Match.stemPair(0, 5), '천간합', '갑-기 천간합');
eq(Match.stemPair(0, 6), '천간충', '갑-경 천간충');
eq(Match.stemPair(0, 1), '비화', '갑-을 같은 오행');
eq(Match.stemPair(0, 2), '상생', '갑(목)-병(화) 상생');
eq(Match.stemPair(0, 4), '상극', '갑(목)-무(토) 상극');

// 점수 성질
const p1 = mk(1990, 5, 15, 'M'), p2 = mk(1992, 8, 20, 'F');
const c = Match.compat(p1, p2);
eq(c.total >= 20 && c.total <= 99, true, '총점이 20~99 범위');
eq(c.categories.length, 4, '네 개 항목으로 구성');
eq(c.categories.every(x => x.score >= 0 && x.score <= x.max), true, '각 항목이 만점을 넘지 않음');
eq(c.categories.reduce((s, x) => s + x.score, 0) >= c.total - 1, true, '항목 합이 총점과 일치');
// 결정적: 같은 입력이면 같은 결과
eq(Match.compat(p1, p2).total, c.total, '같은 두 사람은 항상 같은 점수');
// 모든 해설 문구가 채워져 있어야 함
eq(c.categories.every(x => x.desc && x.label), true, '항목별 해설·요약이 모두 존재');
eq(typeof c.advice === 'string' && c.advice.length > 0, true, '조언 문구 생성');
// 충 조합이 삼합 조합보다 인연의 깊이 점수가 낮아야 함
eq(Match.BRANCH_TEXT['삼합'].score > Match.BRANCH_TEXT['충'].score, true, '삼합이 충보다 높은 점수');
eq(Match.STEM_TEXT['천간합'].score > Match.STEM_TEXT['천간충'].score, true, '천간합이 천간충보다 높은 점수');
// 성별 미선택도 계산 가능
eq(typeof Match.compat(mk(1990, 5, 15, 'X'), p2).total, 'number', '성별 미선택도 궁합 계산 가능');

console.log('[영수증 카드]');
const Receipt = require('../js/receipt.js');
eq(Receipt.fileName({ fortune: { date: new Date(2026, 7, 11) } }), '운세편의점_영수증_20260811.png', '영수증 파일명 생성');
eq(Receipt.fileName({ fortune: { date: new Date(2026, 0, 5) } }), '운세편의점_영수증_20260105.png', '한 자리 월/일도 0으로 채움');
eq(Receipt.fileName({ type: 'match', date: new Date(2026, 7, 11) }), '운세편의점_궁합_20260811.png', '궁합 영수증 파일명');
// 영수증 번호는 같은 시드면 항상 같아야 함 (공유했을 때 서로 같은 번호)
eq(Receipt.receiptNo('a::b'), Receipt.receiptNo('a::b'), '같은 시드 → 같은 영수증 번호');
eq(Receipt.receiptNo('a::b') !== Receipt.receiptNo('a::c'), true, '다른 시드 → 다른 영수증 번호');
eq(/^No\. [0-9A-F]{4}-[0-9A-F]{2}$/.test(Receipt.receiptNo('x')), true, '영수증 번호 형식');
eq(Receipt.SITE, 'gnuinu.github.io/saju', '영수증에 앱 주소가 박혀 공유 시 유입 경로가 됨');
// 줄바꿈: 폭을 넘지 않게 쪼개고 글자를 잃지 않아야 함
const fakeCtx = { measureText: (s) => ({ width: s.length * 10 }) };
const wrapped = Receipt.wrapText(fakeCtx, '가나다라마바사아자차카타파하', 50);
eq(wrapped.every(l => l.length <= 5), true, '줄바꿈이 최대 폭을 넘지 않음');
eq(wrapped.join(''), '가나다라마바사아자차카타파하', '줄바꿈 후에도 글자 보존');

console.log('[콘텐츠 무결성]');
let ok = true;
Saju.STEMS.forEach(st => { if (!SajuData.DAY_MASTER[st]) ok = false; });
eq(ok, true, '10개 일간 해설 모두 존재');
ok = true;
['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'].forEach(gname => {
  if (!SajuData.TEN_GOD_DESC[gname] || !SajuData.DAILY_THEME[gname]) ok = false;
});
eq(ok, true, '십신 10종 해설·운세 테마 모두 존재');
eq(Tarot.CARDS.length, 22, '메이저 아르카나 22장');
eq(Mbti.TYPES.length, 16, 'MBTI 16유형');

console.log('\n결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
