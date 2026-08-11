/* 만세력 엔진 검증 테스트: node tests/test.js */
const Saju = require('../js/saju.js');
global.Saju = Saju;
const SajuData = require('../js/data.js');
global.SajuData = SajuData;
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
