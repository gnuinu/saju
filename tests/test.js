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
