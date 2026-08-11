/* ============================================================
 * receipt.js — 편의점 영수증 스타일 공유 카드
 *
 * 오늘의 운세를 영수증 이미지(PNG)로 그려서 저장·공유합니다.
 * 외부 라이브러리 없이 Canvas만 사용합니다.
 * ============================================================ */
(function (global) {
  'use strict';

  const W = 400;            // 논리 폭(px)
  const PAD = 26;
  const SCALE = 3;          // 고해상도 렌더링 배율
  const PAPER = '#faf7ef';
  const INK = '#2c2a26';
  const FAINT = '#8b877c';
  const TOOTH = 9;          // 절취선 톱니 크기

  const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const MONO = '"SF Mono","Consolas","D2Coding",monospace';
  const f = (size, weight, mono) => `${weight || 400} ${size}px ${mono ? MONO : FONT}`;

  /* ---------- 텍스트 줄바꿈 ---------- */
  function wrapText(ctx, text, maxW) {
    const lines = [];
    let cur = '';
    for (const ch of text) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const SITE = 'gnuinu.github.io/saju';

  function dateLabel(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${'일월화수목금토'[d.getDay()]})`;
  }

  /* 영수증 번호 — 시드에서 뽑아 같은 조합이면 항상 같은 번호 */
  function receiptNo(seed) {
    const h = global.Saju.hashStr(seed).toString(16).toUpperCase().padStart(8, '0');
    return `No. ${h.slice(0, 4)}-${h.slice(4, 6)}`;
  }

  /* 머리말 — 두 종류 영수증이 공유합니다 */
  function pushHeader(push, subtitle) {
    push({ t: 'gap', h: 26 });
    push({ t: 'center', text: '🏪 운세 편의점', font: f(23, 800), h: 30 });
    push({ t: 'center', text: '24시간 열려 있는 나의 운세 가게', font: f(11), color: FAINT, h: 18 });
    if (subtitle) push({ t: 'center', text: subtitle, font: f(13, 800), h: 24 });
    push({ t: 'gap', h: 8 });
    push({ t: 'sep', style: 'double', h: 12 });
  }

  /* 맺음말 — 바코드와 함께 앱 주소를 남겨 공유받은 분도 찾아올 수 있게 합니다 */
  function pushFooter(push, seed, codeText, cta) {
    push({ t: 'gap', h: 10 });
    push({ t: 'barcode', h: 52 });
    push({ t: 'center', text: codeText, font: f(10, 400, true), color: FAINT, h: 18 });
    push({ t: 'gap', h: 8 });
    push({ t: 'center', text: cta, font: f(12, 700), h: 22 });
    push({ t: 'center', text: SITE, font: f(11.5, 700, true), color: FAINT, h: 20 });
    push({ t: 'center', text: '본 영수증은 재미로 보는 참고 자료입니다', font: f(10), color: FAINT, h: 18 });
    push({ t: 'gap', h: 26 });
  }

  /* ---------- 오늘의 운세 영수증 ----------
   * 그리기 전에 항목 목록을 만들어 전체 높이를 먼저 구합니다. */
  function buildDailyOps(ctx, data) {
    const { profile, saju, fortune, tarot, lunar } = data;
    const CW = W - PAD * 2;
    const ops = [];
    const push = (o) => ops.push(o);

    const d = fortune.date;
    const dateStr = dateLabel(d);

    pushHeader(push, null);

    push({ t: 'row', l: dateStr, r: `일진 ${fortune.day.name}`, font: f(11.5, 400, true), color: FAINT, h: 20 });
    push({ t: 'row', l: '손님', r: `${profile.name} 님`, font: f(12.5, 700), h: 21 });
    push({ t: 'row', l: '사주', r: `${saju.dayMasterName}${saju.dayMasterElem} 일간 · ${saju.zodiac}띠`, font: f(11.5), color: FAINT, h: 19 });
    if (lunar) push({ t: 'row', l: '생일', r: lunar, font: f(11), color: FAINT, h: 18 });

    push({ t: 'sep', style: 'dash', h: 16 });

    // 헤드라인
    ctx.font = f(14, 800);
    wrapText(ctx, `「 ${fortune.headline} 」`, CW).forEach(line => {
      push({ t: 'center', text: line, font: f(14, 800), h: 22 });
    });
    push({ t: 'gap', h: 6 });

    // 총운
    push({ t: 'row', l: '오늘의 총운', r: `${fortune.scores.total}점`, font: f(17, 800), h: 27 });
    push({ t: 'gap', h: 4 });
    push({ t: 'sep', style: 'dash', h: 16 });

    // 분야별
    [['재물운', 'money'], ['애정운', 'love'], ['직장·학업운', 'work'], ['건강운', 'health']].forEach(([name, key]) => {
      push({ t: 'row', l: `  ${name}`, r: `${fortune.scores[key]}점`, font: f(13), h: 24 });
    });

    push({ t: 'sep', style: 'dash', h: 16 });

    // 행운 아이템
    const L = fortune.lucky;
    [['행운의 색', L.color], ['행운의 숫자', String(L.number)], ['행운의 방향', L.direction],
     ['행운의 아이템', L.item], ['행운의 음식', L.food]].forEach(([k, v]) => {
      push({ t: 'row', l: `  ${k}`, r: v, font: f(12.5), h: 23 });
    });

    // 오늘 뽑은 타로가 있으면 한 줄 추가
    if (tarot) {
      push({ t: 'sep', style: 'dash', h: 16 });
      push({ t: 'row', l: '  오늘의 타로', r: `${tarot.card.emoji} ${tarot.card.name}${tarot.reversed ? ' (역)' : ''}`, font: f(12.5), h: 23 });
    }

    push({ t: 'sep', style: 'double', h: 16 });
    push({ t: 'row', l: '합계', r: `${fortune.scores.total}점 / 100점`, font: f(15, 800), h: 26 });

    pushFooter(push, data.seed, fortune.day.hanja + ' · ' + dateStr.replace(/-/g, ''),
      '감사합니다. 내일도 들러 주세요 🌙');
    return ops;
  }

  /* ---------- 궁합 영수증 ---------- */
  function buildMatchOps(ctx, data) {
    const { me, you, meSaju, youSaju, match, unlocked, date } = data;
    const CW = W - PAD * 2;
    const ops = [];
    const push = (o) => ops.push(o);

    pushHeader(push, '💞 궁합 영수증');

    push({ t: 'row', l: dateLabel(date), r: receiptNo(data.seed), font: f(11.5, 400, true), color: FAINT, h: 20 });
    push({ t: 'sep', style: 'dash', h: 14 });

    // 두 사람
    push({ t: 'row', l: me.name, r: `${meSaju.dayMasterName}${meSaju.dayMasterElem} · ${meSaju.zodiac}띠`, font: f(13.5, 700), h: 24 });
    push({ t: 'center', text: '×', font: f(13, 800), color: FAINT, h: 20 });
    push({ t: 'row', l: you.name, r: `${youSaju.dayMasterName}${youSaju.dayMasterElem} · ${youSaju.zodiac}띠`, font: f(13.5, 700), h: 24 });

    push({ t: 'sep', style: 'dash', h: 16 });

    match.categories.forEach(c => {
      push({ t: 'row', l: `  ${c.emoji} ${c.name}`, r: `${c.score} / ${c.max}`, font: f(13), h: 25 });
    });

    push({ t: 'sep', style: 'double', h: 16 });
    push({ t: 'row', l: '합계', r: `${match.total}점 / 100점`, font: f(17, 800), h: 29 });
    ctx.font = f(13.5, 800);
    wrapText(ctx, `「 ${match.verdict} 」`, CW).forEach(line => {
      push({ t: 'center', text: line, font: f(13.5, 800), h: 22 });
    });
    push({ t: 'gap', h: 6 });
    push({ t: 'sep', style: 'dash', h: 16 });
    push({ t: 'center', text: `일지 ${match.branchPair} · 일간 ${match.stemPair} · 띠 ${match.zodiacPair}`, font: f(12), color: FAINT, h: 22 });

    // 조언은 상세 풀이를 연 경우에만 인쇄합니다
    if (unlocked) {
      push({ t: 'sep', style: 'dash', h: 16 });
      ctx.font = f(12.5);
      wrapText(ctx, '💡 ' + match.advice, CW - 8).forEach(line => {
        push({ t: 'center', text: line, font: f(12.5), h: 21 });
      });
    }

    pushFooter(push, data.seed, `${meSaju.day.hanja} × ${youSaju.day.hanja}`,
      '우리 궁합도 뽑아 보실래요? 💞');
    return ops;
  }

  /* ---------- 그리기 ---------- */
  function render(data) {
    const measure = document.createElement('canvas').getContext('2d');
    const ops = data.type === 'match' ? buildMatchOps(measure, data) : buildDailyOps(measure, data);
    const H = ops.reduce((s, o) => s + o.h, 0);

    const cv = document.createElement('canvas');
    cv.width = W * SCALE;
    cv.height = H * SCALE;
    const ctx = cv.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // 종이 (위아래 절취선 톱니)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, TOOTH);
    for (let x = 0; x < W; x += TOOTH * 2) {
      ctx.lineTo(x + TOOTH, 0);
      ctx.lineTo(x + TOOTH * 2, TOOTH);
    }
    ctx.lineTo(W, H - TOOTH);
    for (let x = W; x > 0; x -= TOOTH * 2) {
      ctx.lineTo(x - TOOTH, H);
      ctx.lineTo(x - TOOTH * 2, H - TOOTH);
    }
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.restore();

    const CW = W - PAD * 2;
    let y = 0;

    for (const o of ops) {
      const baseline = y + o.h - 6;
      ctx.fillStyle = o.color || INK;
      ctx.strokeStyle = o.color || INK;

      if (o.t === 'center') {
        ctx.font = o.font;
        ctx.textAlign = 'center';
        ctx.fillText(o.text, W / 2, baseline);
      } else if (o.t === 'row') {
        ctx.font = o.font;
        ctx.textAlign = 'left';
        ctx.fillText(o.l, PAD, baseline);
        ctx.textAlign = 'right';
        ctx.fillText(o.r, W - PAD, baseline);
      } else if (o.t === 'sep') {
        const ly = y + o.h / 2;
        ctx.save();
        ctx.strokeStyle = o.style === 'double' ? INK : FAINT;
        ctx.lineWidth = 1;
        if (o.style === 'double') {
          ctx.beginPath(); ctx.moveTo(PAD, ly - 1.5); ctx.lineTo(W - PAD, ly - 1.5);
          ctx.moveTo(PAD, ly + 1.5); ctx.lineTo(W - PAD, ly + 1.5); ctx.stroke();
        } else {
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(PAD, ly); ctx.lineTo(W - PAD, ly); ctx.stroke();
        }
        ctx.restore();
      } else if (o.t === 'barcode') {
        drawBarcode(ctx, PAD, y + 6, CW, o.h - 12, data.seed);
      }
      y += o.h;
    }

    ctx.textAlign = 'left';
    return cv;
  }

  /* 시드 기반 가짜 바코드 — 같은 날 같은 사람은 항상 같은 무늬 */
  function drawBarcode(ctx, x, y, w, h, seed) {
    const rng = global.Saju.seededRng('barcode-' + seed);
    ctx.fillStyle = INK;
    let cx = x;
    while (cx < x + w - 2) {
      const bw = 1 + Math.floor(rng() * 3);
      if (rng() > 0.35) ctx.fillRect(cx, y, bw, h);
      cx += bw + 1 + Math.floor(rng() * 3);
    }
  }

  /* ---------- 저장 / 공유 ---------- */
  function toBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  function fileName(data) {
    const d = data.type === 'match' ? data.date : data.fortune.date;
    const kind = data.type === 'match' ? '궁합' : '영수증';
    return `운세편의점_${kind}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`;
  }

  function download(canvas, name) {
    return toBlob(canvas).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return 'downloaded';
    });
  }

  // 공유 API를 지원하면 공유 시트, 아니면 다운로드로 대체
  function share(canvas, name) {
    return toBlob(canvas).then(blob => {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share({ files: [file], title: '운세 편의점 영수증' })
          .then(() => 'shared')
          .catch(err => (err && err.name === 'AbortError') ? 'cancelled' : download(canvas, name));
      }
      return download(canvas, name);
    });
  }

  function canShareFiles() {
    if (!navigator.share || !navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [new File([new Blob()], 'a.png', { type: 'image/png' })] });
    } catch (e) { return false; }
  }

  global.Receipt = { render, toBlob, download, share, fileName, canShareFiles, wrapText, receiptNo, SITE };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Receipt;
})(typeof window !== 'undefined' ? window : globalThis);
