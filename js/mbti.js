/* ============================================================
 * mbti.js — MBTI × 사주(일간/오행) 결합 해석
 * ============================================================ */
(function (global) {
  'use strict';

  const TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];

  const TYPE_DESC = {
    ISTJ: { nick: '원칙주의 관리자', desc: '약속과 원칙을 지키는 데서 신뢰를 쌓는 현실주의자입니다.' },
    ISFJ: { nick: '따뜻한 수호자', desc: '조용히 주변을 챙기며 안정과 조화를 지키는 헌신가입니다.' },
    INFJ: { nick: '통찰의 옹호자', desc: '사람과 세상의 이면을 읽어내는 깊은 통찰의 이상주의자입니다.' },
    INTJ: { nick: '전략가', desc: '장기 계획과 독립적 사고로 목표를 설계하는 전략가입니다.' },
    ISTP: { nick: '만능 해결사', desc: '위기 상황에서 침착하게 도구와 논리로 문제를 푸는 실용주의자입니다.' },
    ISFP: { nick: '감성 예술가', desc: '자유로운 감성과 온화함으로 자기만의 미학을 사는 예술가입니다.' },
    INFP: { nick: '낭만적 중재자', desc: '깊은 내면 세계와 가치를 지닌 낭만적 이상주의자입니다.' },
    INTP: { nick: '논리적 사색가', desc: '아이디어의 미로를 탐험하며 원리를 파고드는 사색가입니다.' },
    ESTP: { nick: '행동파 승부사', desc: '지금 이 순간에 몰입하며 기회를 낚아채는 행동파입니다.' },
    ESFP: { nick: '무대 위의 엔터테이너', desc: '어디서든 분위기를 밝히는 타고난 엔터테이너입니다.' },
    ENFP: { nick: '열정의 스파크', desc: '호기심과 열정으로 사람과 가능성을 연결하는 스파크입니다.' },
    ENTP: { nick: '아이디어 변론가', desc: '토론과 발상의 전환을 즐기는 지적 모험가입니다.' },
    ESTJ: { nick: '추진력의 관리자', desc: '체계와 실행력으로 조직을 움직이는 타고난 관리자입니다.' },
    ESFJ: { nick: '사교적 조력자', desc: '사람들을 잇고 돌보며 공동체를 지탱하는 조력자입니다.' },
    ENFJ: { nick: '카리스마 멘토', desc: '사람의 성장을 이끌어내는 따뜻한 카리스마의 멘토입니다.' },
    ENTJ: { nick: '통솔하는 지휘관', desc: '비전을 세우고 과감하게 통솔하는 지휘관입니다.' },
  };

  /* 오행 → MBTI 지표 친화도: 각 오행이 강화하는 성향 */
  const ELEM_AXIS = {
    목: { axis: 'N', label: '성장과 가능성을 좇는 목(木)의 기운은 미래지향적 직관(N)과 통합니다.' },
    화: { axis: 'E', label: '밖으로 발산하는 화(火)의 기운은 외향(E) 에너지와 통합니다.' },
    토: { axis: 'S', label: '현실에 뿌리내리는 토(土)의 기운은 현실 감각(S)과 통합니다.' },
    금: { axis: 'T', label: '자르고 결단하는 금(金)의 기운은 논리적 판단(T)과 통합니다.' },
    수: { axis: 'P', label: '유연하게 흐르는 수(水)의 기운은 개방적 인식(P)과 통합니다.' },
  };

  const OPP = { E: 'I', I: 'E', S: 'N', N: 'S', T: 'F', F: 'T', J: 'P', P: 'J' };

  /* 일간별 MBTI 축 성향 (사주가 미는 방향) */
  const DAY_MASTER_AXIS = {
    갑: ['E', 'J'], 을: ['F', 'P'], 병: ['E', 'F'], 정: ['I', 'F'], 무: ['S', 'J'],
    기: ['I', 'S'], 경: ['T', 'J'], 신: ['T', 'S'], 임: ['N', 'P'], 계: ['I', 'N'],
  };

  const AXIS_NAME = {
    E: '외향', I: '내향', S: '현실감각', N: '직관', T: '사고', F: '감정', J: '계획', P: '유연함',
  };

  /* 결합 해석 생성 */
  function combine(mbti, saju) {
    const dm = saju.dayMasterName;
    const dmInfo = global.SajuData.DAY_MASTER[dm];
    const typeInfo = TYPE_DESC[mbti];
    const letters = mbti.split('');

    const sajuAxes = DAY_MASTER_AXIS[dm];
    const domAxis = ELEM_AXIS[saju.dominant];

    // 일치/반대 축 분석
    const matched = sajuAxes.filter(a => letters.includes(a));
    const opposed = sajuAxes.filter(a => letters.includes(OPP[a]));

    let synergy;
    if (matched.length === 2) {
      synergy = `사주와 MBTI가 같은 방향을 가리키고 있어요. ${dm} 일간이 밀어주는 ${matched.map(a => AXIS_NAME[a]).join('·')} 성향이 ${mbti}에서 그대로 드러납니다. 타고난 기질을 숨김없이 쓰는 "정직한 엔진"형으로, 방향만 잘 잡으면 남들보다 두 배 빠르게 갑니다. 다만 브레이크 역할을 해 줄 반대 성향의 사람을 곁에 두면 완성형이 됩니다.`;
    } else if (opposed.length === 2) {
      synergy = `사주가 미는 방향(${sajuAxes.map(a => AXIS_NAME[a]).join('·')})과 MBTI(${mbti})가 반대라서, 겉모습과 속 기질이 다른 "반전 매력"형입니다. 평소엔 MBTI대로 살다가 결정적 순간에 사주의 본능이 튀어나옵니다. 이 이중성은 약점이 아니라 폭넓은 스펙트럼입니다. 상황에 따라 두 모드를 의식적으로 전환하면 강력한 무기가 됩니다.`;
    } else {
      synergy = `사주 기질과 MBTI가 절반쯤 겹치는 균형형입니다. ${matched.length ? `${AXIS_NAME[matched[0]]} 성향은 사주와 MBTI가 서로 증폭시키는 확실한 강점이고, ` : ''}나머지 영역에서는 상황에 따라 유연하게 오갈 수 있는 여지가 있습니다. 안정과 변화 사이에서 균형을 잡는 감각이 좋은 편이라, 팀에서 "조율자" 역할을 맡으면 빛납니다.`;
    }

    // 궁합 점수 (결정적: mbti+일간 시드)
    const rng = global.Saju.seededRng('mbti-' + mbti + '-' + dm + '-' + saju.dominant);
    const base = matched.length === 2 ? 88 : opposed.length === 2 ? 78 : 83;
    const score = base + Math.floor(rng() * 10);

    const tips = {
      E: '에너지가 밖으로 향하니, 혼자 재충전하는 시간을 일부러 만들어야 방전을 막습니다.',
      I: '깊이 파는 힘이 강점이니, 성과는 반드시 밖으로 공유해서 알리세요.',
      S: '현실 감각이 뛰어나니, 가끔은 "만약에?"라는 상상이 새 기회를 엽니다.',
      N: '큰 그림을 보는 눈이 좋으니, 실행 체크리스트로 디테일을 보완하세요.',
      T: '판단이 명쾌하니, 결론 앞에 공감 한 문장을 붙이면 사람까지 얻습니다.',
      F: '사람 마음을 얻는 힘이 있으니, 중요한 결정엔 숫자와 근거를 함께 챙기세요.',
      J: '계획력이 무기이니, 계획이 틀어졌을 때의 플랜B도 미리 준비해 두세요.',
      P: '유연함이 강점이니, 마감 시한만은 스스로 정해 두면 완벽합니다.',
    };
    const tip = tips[letters[Math.floor(rng() * 4)]];

    return {
      typeInfo,
      dmInfo,
      synergy,
      domAxisLabel: domAxis.label,
      score,
      tip,
      matchedAxes: matched.map(a => AXIS_NAME[a]),
    };
  }

  global.Mbti = { TYPES, TYPE_DESC, combine };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Mbti;
})(typeof window !== 'undefined' ? window : globalThis);
