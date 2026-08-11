/* ============================================================
 * app.js — 운세 편의점 UI 로직
 * ============================================================ */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let profile = null;   // 사용자 프로필
  let saju = null;      // 계산된 사주
  let currentTarot = null;

  const todayKey = () => Fortune.dateKey(new Date());
  const profileSig = (p) => [p.name, p.year, p.month, p.day, p.hourUnknown ? 'x' : p.hour + ':' + p.minute].join('|');
  // 일간 상징("보석과 칼날 💎")에서 이모지/이름 분리
  const symEmoji = (dm) => dm.symbol.split(' ').pop();
  const symName = (dm) => dm.symbol.split(' ').slice(0, -1).join(' ');
  // 만 나이
  function ageOf(p) {
    const t = new Date();
    let a = t.getFullYear() - p.year;
    const bd = new Date(t.getFullYear(), p.month - 1, p.day);
    if (t < bd) a--;
    return a;
  }

  /* ==================== 초기화 ==================== */
  function init() {
    populateFormSelects();
    bindGlobalEvents();

    profile = Store.getProfile();
    if (profile) {
      startApp();
    } else {
      $('#onboarding').classList.remove('hidden');
    }
  }

  function populateFormSelects() {
    const yearSel = $('#in-year'), monthSel = $('#in-month'), daySel = $('#in-day');
    const hourSel = $('#in-hour'), minSel = $('#in-minute'), mbtiSel = $('#in-mbti');
    const nowY = new Date().getFullYear();
    for (let y = nowY; y >= 1930; y--) yearSel.add(new Option(y + '년', y));
    yearSel.value = 1995;
    for (let m = 1; m <= 12; m++) monthSel.add(new Option(m + '월', m));
    rebuildDayOptions(31);
    for (let h = 0; h < 24; h++) hourSel.add(new Option(String(h).padStart(2, '0') + '시', h));
    hourSel.value = 12;
    for (let mi = 0; mi < 60; mi += 5) minSel.add(new Option(String(mi).padStart(2, '0') + '분', mi));
    Mbti.TYPES.forEach(t => mbtiSel.add(new Option(t + ' — ' + Mbti.TYPE_DESC[t].nick, t)));
  }

  /* ---------- 양력/음력 입력 ---------- */
  function rebuildDayOptions(n) {
    const sel = $('#in-day');
    const keep = +sel.value || 1;
    sel.innerHTML = '';
    for (let d = 1; d <= n; d++) sel.add(new Option(d + '일', d));
    sel.value = Math.min(keep, n);
  }

  function calType() { return $('#in-caltype .seg-btn.active').dataset.v; }

  // 음력 선택 시: 윤달 표시 여부, 그 달의 일수(29/30), 양력 환산 미리보기를 갱신
  function updateCalendarUI() {
    const preview = $('#cal-preview');
    const leapLine = $('#leap-line');
    const y = +$('#in-year').value, m = +$('#in-month').value;

    if (calType() === 'solar') {
      leapLine.classList.add('hidden');
      $('#in-leap').checked = false;
      rebuildDayOptions(31);
      preview.textContent = '';
      return;
    }

    const leapM = Lunar.leapMonthOf(y);
    if (leapM === m) {
      leapLine.classList.remove('hidden');
      $('#leap-hint').innerHTML = `<span class="muted">— ${y}년에는 윤${leapM}월이 있어요</span>`;
    } else {
      leapLine.classList.add('hidden');
      $('#in-leap').checked = false;
    }

    const isLeap = $('#in-leap').checked;
    const days = Lunar.daysInLunarMonth(y, m, isLeap);
    rebuildDayOptions(days || 30);

    const s = Lunar.lunarToSolar(y, m, isLeap, +$('#in-day').value);
    preview.innerHTML = s
      ? `📅 양력으로는 <b>${s.year}년 ${s.month}월 ${s.day}일</b>이에요`
      : '';
  }

  function bindGlobalEvents() {
    // 양력/음력 전환
    $('#in-caltype').addEventListener('click', (e) => {
      if (!e.target.classList.contains('seg-btn')) return;
      $$('#in-caltype .seg-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      updateCalendarUI();
    });
    ['#in-year', '#in-month', '#in-day', '#in-leap'].forEach(sel => {
      $(sel).addEventListener('change', updateCalendarUI);
    });

    // 성별 세그먼트
    $('#in-gender').addEventListener('click', (e) => {
      if (!e.target.classList.contains('seg-btn')) return;
      $$('#in-gender .seg-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });

    // 시간 모름 체크
    $('#in-hour-unknown').addEventListener('change', (e) => {
      $('#in-hour').disabled = e.target.checked;
      $('#in-minute').disabled = e.target.checked;
    });

    // 프로필 저장
    $('#profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inY = +$('#in-year').value, inM = +$('#in-month').value, inD = +$('#in-day').value;
      const isLunar = calType() === 'lunar';
      const isLeap = isLunar && $('#in-leap').checked;

      // 음력이면 양력으로 환산해서 저장합니다 (사주 계산은 전부 양력 기준)
      let sy = inY, sm = inM, sd = inD;
      if (isLunar) {
        const s = Lunar.lunarToSolar(inY, inM, isLeap, inD);
        if (!s) {
          toast(`음력 ${inY}년 ${isLeap ? '윤' : ''}${inM}월 ${inD}일은 없는 날짜예요 🙏`);
          return;
        }
        sy = s.year; sm = s.month; sd = s.day;
      }

      const p = {
        name: $('#in-name').value.trim() || '손님',
        year: sy, month: sm, day: sd,
        calendar: isLunar ? 'lunar' : 'solar',
        lunarInput: isLunar ? { year: inY, month: inM, day: inD, isLeap: isLeap } : null,
        hour: +$('#in-hour').value,
        minute: +$('#in-minute').value,
        hourUnknown: $('#in-hour-unknown').checked,
        solarCorrection: $('#in-solar-corr').checked,
        gender: $('#in-gender .seg-btn.active').dataset.v,
        mbti: $('#in-mbti').value,
      };
      // 양력 날짜 유효성 (음력은 위 변환에서 이미 검증됨)
      const dt = new Date(p.year, p.month - 1, p.day);
      if (dt.getMonth() + 1 !== p.month || dt.getDate() !== p.day) {
        toast('존재하지 않는 날짜예요. 다시 확인해 주세요 🙏');
        return;
      }
      Store.saveProfile(p);
      profile = p;
      if (Store.initCoins()) {
        setTimeout(() => toast('🎁 첫 방문 선물 엽전 ' + Store.REWARDS.signup + '냥 지급!'), 600);
      }
      startApp();
    });

    // 탭
    $('#bottom-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    $('#coin-badge').addEventListener('click', () => switchTab('shop'));
    $('#btn-settings').addEventListener('click', openProfileEditor);
  }

  function startApp() {
    saju = Saju.computeSaju(profile);
    Store.initCoins();
    $('#onboarding').classList.add('hidden');
    $('#main').classList.remove('hidden');
    $('#bottom-nav').classList.remove('hidden');
    renderCoins();
    renderHome();
    renderSaju();
    renderTarot();
    renderMbti();
    renderShop();
  }

  function switchTab(name) {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $('#tab-' + name).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    window.scrollTo({ top: 0 });
  }

  function renderCoins() {
    const c = Store.getCoins() || 0;
    $('#coin-amount').textContent = c;
    const el = $('#shop-balance-num');
    if (el) el.textContent = c;
  }

  /* ==================== 홈 (오늘의 운세) ==================== */
  function renderHome() {
    const today = new Date();
    const f = Fortune.dailyFortune(saju, today);
    const dm = SajuData.DAY_MASTER[saju.dayMasterName];
    const dateStr = today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일 (' + '일월화수목금토'[today.getDay()] + ')';

    const cats = [
      { name: '💰 재물운', key: 'money', desc: f.money },
      { name: '💕 애정운', key: 'love', desc: f.love },
      { name: '💼 직장·학업', key: 'work', desc: f.work },
      { name: '🍀 건강운', key: 'health', desc: f.health },
    ];

    $('#tab-home').innerHTML = `
      <div class="section-head">
        <div class="greeting">어서 오세요, ${esc(profile.name)}님 ${symEmoji(dm) || '🏪'}</div>
        <div class="date-line">${dateStr} · <span class="iljin-chip">오늘의 ${term('일진')} ${f.day.name} (${f.day.hanja})</span></div>
      </div>

      <div class="card">
        <div class="score-hero">
          <div class="score-num">${f.scores.total}<small> 점</small></div>
          <div class="headline">「 ${f.headline} 」</div>
        </div>
        <p class="fortune-text">${f.total}</p>
        ${f.relComment ? `<div class="rel-comment">✨ ${f.relComment}</div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">📊 분야별 운세</div>
        ${cats.map(c => `
          <div class="cat-row">
            <div class="cat-name">${c.name}</div>
            <div class="cat-bar-wrap"><div class="cat-bar" style="width:${f.scores[c.key]}%"></div></div>
            <div class="cat-score">${f.scores[c.key]}</div>
          </div>
          <div class="cat-desc">${c.desc}</div>
        `).join('')}
      </div>

      <div class="card">
        <div class="card-title">🍀 오늘의 행운</div>
        <div class="lucky-grid">
          <div class="lucky-item"><div class="k">행운의 색</div><div class="v">${f.lucky.color}</div></div>
          <div class="lucky-item"><div class="k">행운의 숫자</div><div class="v">${f.lucky.number}</div></div>
          <div class="lucky-item"><div class="k">행운의 방향</div><div class="v">${f.lucky.direction}</div></div>
          <div class="lucky-item"><div class="k">행운의 아이템</div><div class="v">${f.lucky.item}</div></div>
          <div class="lucky-item" style="grid-column: span 2;"><div class="k">행운의 음식</div><div class="v">${f.lucky.food}</div></div>
        </div>
        <p class="muted" style="margin-top:10px;">💡 당신의 사주에 부족한 <b>${f.lucky.elem}(${SajuData.ELEMENT_DESC[f.lucky.elem].emoji})</b> 기운을 보충하는 아이템이에요.</p>
      </div>

      <div id="weekly-section"></div>

      <div class="card">
        <div class="card-title">🧾 오늘의 영수증<span class="spacer"></span><span class="muted">무료</span></div>
        <p class="muted" style="margin-bottom:10px;">오늘의 운세를 편의점 영수증으로 뽑아 드려요. 저장하거나 친구에게 공유해 보세요.</p>
        <button class="btn-gold" id="btn-receipt">🧾 영수증 뽑기</button>
      </div>

      <div class="card" id="attend-card">
        <div class="card-title">🔖 출석 도장<span class="spacer"></span><span class="muted">매일 +${Store.REWARDS.attendance}냥</span></div>
        <button class="btn-gold" id="btn-attend">${Store.canAttend(todayKey()) ? '오늘 도장 찍고 엽전 받기 🪙' : '오늘 도장 완료! 내일 또 오세요 ✅'}</button>
      </div>
    `;

    $('#btn-receipt').addEventListener('click', () => openReceipt(f));

    $('#btn-attend').addEventListener('click', () => {
      if (Store.attend(todayKey())) {
        toast('🪙 도장 찍었어요! 엽전 +' + Store.REWARDS.attendance + '냥');
        renderCoins();
        $('#btn-attend').textContent = '오늘 도장 완료! 내일 또 오세요 ✅';
      } else {
        toast('오늘 도장은 이미 찍으셨어요 😊');
      }
    });

    renderWeekly();
  }

  /* ---------- 영수증 공유 카드 ---------- */
  function openReceipt(fortune) {
    // 오늘 뽑은 타로가 있으면 영수증에 함께 인쇄
    const draws = Store.tarotDrawsToday(todayKey());
    const tarot = draws > 0 ? drawTarotCard(draws) : null;
    const lun = profile.lunarInput;

    const canvas = Receipt.render({
      profile, saju, fortune, tarot,
      lunar: lun ? `음 ${lun.year}.${lun.isLeap ? '윤' : ''}${lun.month}.${lun.day} (양 ${profile.year}.${profile.month}.${profile.day})` : null,
      seed: todayKey() + '-' + profileSig(profile),
    });

    const modal = $('#modal');
    $('#modal-content').innerHTML = `
      <div class="modal-title">🧾 오늘의 영수증</div>
      <div class="receipt-wrap" id="receipt-wrap"></div>
      <div class="modal-actions" style="margin-top:14px;">
        <button class="btn-gold" id="btn-receipt-share">${Receipt.canShareFiles() ? '📤 공유하기' : '💾 이미지 저장'}</button>
        <button class="btn-ghost" id="btn-receipt-close">닫기</button>
      </div>`;
    canvas.style.width = '100%';
    canvas.style.display = 'block';
    $('#receipt-wrap').appendChild(canvas);
    modal.classList.remove('hidden');
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const name = Receipt.fileName({ fortune });
    $('#btn-receipt-share').addEventListener('click', () => {
      Receipt.share(canvas, name).then(r => {
        if (r === 'downloaded') toast('💾 영수증을 저장했어요');
        else if (r === 'shared') toast('📤 공유했어요!');
      }).catch(() => toast('저장에 실패했어요 🥲'));
    });
    $('#btn-receipt-close').addEventListener('click', closeModal);
  }

  /* ---------- 주간 운세 (유료 상품) ---------- */
  function renderWeekly() {
    const wk = Fortune.weekKey(new Date());
    const unlocked = Store.isWeeklyUnlocked(wk);
    const wrap = $('#weekly-section');

    if (!unlocked) {
      wrap.innerHTML = `
        <div class="card lock-card">
          <div class="lock-blur">
            <div class="card-title">🗓️ 주간 운세</div>
            ${[0, 1, 2, 3].map(i => `
              <div class="week-row">
                <div class="week-day">${i + 11}일 (수)<small>갑자일</small></div>
                <div class="week-head">동료와 친구의 기운이 들어오는 날</div>
                <div class="week-score">8${i}</div>
              </div>`).join('')}
          </div>
          <div class="lock-overlay">
            <div class="lock-ico">🔒</div>
            <div class="lock-msg">7일간의 흐름을 미리 보세요</div>
            <div class="lock-sub">가장 좋은 날 · 조심할 날 · 주간 총평 포함</div>
            <button class="btn-gold btn-sm" id="btn-unlock-weekly">🪙 ${Store.PRICES.weekly}냥으로 열어보기</button>
            <button class="btn-ghost btn-sm" id="btn-weekly-ad">광고 보고 엽전 모으기 (+${Store.REWARDS.ad}냥)</button>
          </div>
        </div>`;
      $('#btn-unlock-weekly').addEventListener('click', () => {
        if (Store.unlockWeekly(wk)) {
          toast('✨ 이번 주 운세가 열렸어요!');
          renderCoins();
          renderWeekly();
        } else {
          confirmModal('엽전이 부족해요 🥲', `주간 운세는 ${Store.PRICES.weekly}냥이 필요해요.<br/>광고를 보시거나 출석 도장을 찍으면 엽전을 드려요.`, [
            { label: '광고 보고 +' + Store.REWARDS.ad + '냥', gold: true, fn: watchAd },
            { label: '계산대 가기', fn: () => switchTab('shop') },
          ]);
        }
      });
      $('#btn-weekly-ad').addEventListener('click', watchAd);
      return;
    }

    const w = Fortune.weeklyFortune(saju, new Date());
    wrap.innerHTML = `
      <div class="card">
        <div class="card-title">🗓️ 주간 운세<span class="spacer"></span><span class="muted">평균 ${w.avg}점</span></div>
        <p class="fortune-text" style="margin-bottom:12px;">${w.summary}</p>
        ${w.days.map(d => {
          const dt = d.date;
          const isBest = d === w.best, isWorst = d === w.worst;
          return `
          <div class="week-row">
            <div class="week-day">${dt.getMonth() + 1}/${dt.getDate()} (${'일월화수목금토'[dt.getDay()]})<small>${d.day.name}일</small></div>
            <div class="week-head">${d.headline}${isBest ? '<span class="badge best">BEST</span>' : ''}${isWorst ? '<span class="badge worst">주의</span>' : ''}</div>
            <div class="week-score">${d.scores.total}</div>
          </div>`;
        }).join('')}
        <p class="muted" style="margin-top:10px;">💡 BEST인 날에 중요한 약속·결정을 배치해 보세요.</p>
      </div>`;
  }

  /* ==================== 내 사주 ==================== */
  function renderSaju() {
    const dm = SajuData.DAY_MASTER[saju.dayMasterName];
    const g = saju.tenGods;
    const timeStr = profile.hourUnknown ? '(시간 모름)' : String(profile.hour).padStart(2, '0') + ':' + String(profile.minute).padStart(2, '0');
    const lun = profile.lunarInput || Lunar.solarToLunar(profile.year, profile.month, profile.day);
    const lunStr = lun ? `음력 ${lun.year}. ${lun.isLeap ? '윤' : ''}${lun.month}. ${lun.day}.` : '';
    const birthStr = profile.calendar === 'lunar'
      ? `${lunStr} · 양력 ${profile.year}. ${profile.month}. ${profile.day}. ${timeStr}`
      : `양력 ${profile.year}. ${profile.month}. ${profile.day}. ${timeStr} · ${lunStr}`;

    const pillarCol = (label, p, gods) => p ? `
      <div class="pillar">
        <div class="p-label">${term(label)}</div>
        <div class="p-hanja">${p.hanja[0]}<br/>${p.hanja[1]}</div>
        <div class="p-han">${p.name}</div>
        <span class="elem-chip" style="background:${Saju.ELEM_COLOR[p.stemElem]}">${p.stemElem}</span><span class="elem-chip" style="background:${Saju.ELEM_COLOR[p.branchElem]}">${p.branchElem}</span>
        ${gods ? `<div class="p-god">${term(gods.stem)}<br/>${term(gods.branch)}</div>` : ''}
      </div>` : `
      <div class="pillar">
        <div class="p-label">${term(label)}</div>
        <div class="p-hanja" style="color:var(--sub)">?<br/>?</div>
        <div class="p-han muted">시간 모름</div>
      </div>`;

    const maxCnt = Math.max(...Saju.ELEMENTS.map(e => saju.elemCount[e]), 1);

    $('#tab-saju').innerHTML = `
      <div class="section-head">
        <h2>📜 ${esc(profile.name)}님의 사주팔자</h2>
        <p>${birthStr} · ${saju.sajuYear}년생 ${saju.zodiac}띠</p>
      </div>

      <div class="card">
        <div class="card-title">${term('사주팔자', '四柱 나의 네 기둥')}</div>
        <div class="term-hint">💡 점선이 그어진 낱말을 누르면 뜻풀이가 나와요</div>
        <div class="pillars">
          ${pillarCol('시주', saju.hour, g.hour)}
          ${pillarCol('일주', saju.day, g.day)}
          ${pillarCol('월주', saju.month, g.month)}
          ${pillarCol('년주', saju.year, g.year)}
        </div>
        <p class="muted" style="margin-top:10px;">${term('일간')}(${term('일주')}의 ${term('천간')}) <b>${saju.dayMasterName}(${saju.dayMasterHanja})</b>이 사주의 주인공, 바로 "나"입니다.</p>
      </div>

      <div class="card">
        <div class="dm-hero">
          <div class="dm-symbol">${symEmoji(dm)}</div>
          <div class="dm-name">${saju.dayMasterName}${saju.dayMasterElem} 일간 — ${symName(dm)}</div>
          <div class="dm-title">"${dm.title}"</div>
          <div class="dm-core">${dm.core}</div>
        </div>
        <p class="fortune-text">${dm.desc}</p>
        <div class="divider"></div>
        <div class="info-line"><span class="ik">강점</span><span>${dm.strength}</span></div>
        <div class="info-line"><span class="ik">주의점</span><span>${dm.caution}</span></div>
      </div>

      <div class="card">
        <div class="card-title">🌈 ${term('오행')} 밸런스</div>
        ${Saju.ELEMENTS.map(e => `
          <div class="elem-bar-row">
            <div class="elem-name">${SajuData.ELEMENT_DESC[e].emoji} ${e}(${{ 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }[e]})</div>
            <div class="elem-track"><div class="elem-fill" style="width:${(saju.elemCount[e] / maxCnt) * 100}%;background:${Saju.ELEM_COLOR[e]}"></div></div>
            <div class="elem-cnt">${saju.elemCount[e]}</div>
          </div>`).join('')}
        <div class="divider"></div>
        <p class="fortune-text">가장 강한 기운은 <b>${saju.dominant}(${SajuData.ELEMENT_DESC[saju.dominant].emoji})</b> — ${SajuData.ELEMENT_DESC[saju.dominant].keyword}.</p>
        <p class="muted" style="margin-top:6px;">${SajuData.ELEMENT_DESC[saju.lacking].lack}</p>
      </div>

      ${renderLuckCard()}
      ${renderSinsalCard()}

      <div id="deep-section"></div>

      ${saju.boundaryUncertain ? `
      <div class="card" style="border-color:var(--gold);">
        <div class="card-title">⚠️ 확인이 필요해요</div>
        <p class="fortune-text">태어나신 날이 ${term('절기')}가 바뀌는 바로 그날입니다. 절기는 <b>시각</b>까지 따지기 때문에, 태어난 시간에 따라 ${term('년주')} 또는 ${term('월주')}가 달라질 수 있어요.</p>
        <p class="muted" style="margin-top:8px;">현재는 정오(12시)에 태어난 것으로 계산했습니다. 정확한 시간을 아신다면 ⚙️에서 입력해 주세요.</p>
      </div>` : ''}

      <div class="card">
        <div class="card-title">📖 이 앱은 이렇게 계산합니다</div>
        <div class="info-line"><span class="ik">${term('절기')}</span><span>태양의 위치(황경)를 직접 계산해 절기 <b>시각까지</b> 구합니다. 근사식을 쓰지 않아 입춘 등 경계일 출생도 정확합니다.</span></div>
        <div class="info-line"><span class="ik">${term('태양시')}</span><span>${profile.solarCorrection === false ? '보정하지 않음 (해외 출생)' : `시계 시각에서 <b>${saju.solarShiftMin}분</b>을 빼서 계산했습니다.`}</span></div>
        ${profile.solarCorrection !== false && saju.solarShiftMin !== 30 ? `<p class="muted" style="margin-top:6px;">💡 ${profile.year}년 당시 한국의 표준시가 지금과 달랐습니다${saju.solarShiftMin === 90 ? ' (서머타임 시행 중)' : saju.solarShiftMin === 0 ? ' (동경 127.5도 기준)' : ''}. 그래서 보정값이 요즘(30분)과 다릅니다.</p>` : ''}
        <div class="info-line"><span class="ik">한계</span><span>음력 생일 입력은 아직 지원하지 않습니다(양력만). 해석은 재미와 자기 이해를 위한 참고 자료예요.</span></div>
      </div>

      <div class="card">
        <div class="card-title">📚 용어 사전</div>
        <p class="muted" style="margin-bottom:10px;">어려운 말이 나오면 언제든 여기서 찾아보세요.</p>
        <div class="glossary-grid">
          ${Object.keys(SajuData.GLOSSARY).map(w => `<button class="term-chip" data-term="${w}">${w}</button>`).join('')}
        </div>
      </div>
    `;

    const genderBtn = $('#btn-set-gender');
    if (genderBtn) genderBtn.addEventListener('click', openProfileEditor);

    renderDeepReport();
  }

  /* ---------- 대운 (성별 기반) ---------- */
  function renderLuckCard() {
    if (!saju.luck) {
      return `
        <div class="card">
          <div class="card-title">🌊 ${term('대운')} (10년 주기 운의 흐름)</div>
          <p class="fortune-text">대운은 <b>태어난 해의 음양과 성별</b>이 맞물려 방향이 정해집니다.
          (양남음녀는 순행, 음남양녀는 역행) 성별을 선택하지 않으셔서 계산할 수 없어요.</p>
          <button class="btn-ghost btn-sm" id="btn-set-gender" style="margin-top:10px;">⚙️ 성별 선택하고 대운 보기</button>
        </div>`;
    }
    const L = saju.luck;
    const age = ageOf(profile);
    return `
      <div class="card">
        <div class="card-title">🌊 ${term('대운')} (10년 주기 운의 흐름)<span class="spacer"></span><span class="muted">${term(L.direction)} · ${term('대운수')} ${L.startAge}</span></div>
        <p class="fortune-text" style="margin-bottom:12px;">${SajuData.LUCK_INTRO[L.direction]}</p>
        ${L.list.map(d => {
          const now = age >= d.from && age <= d.to;
          const god = Saju.tenGod(saju.dayMaster, d.stem);
          return `
          <div class="week-row" ${now ? 'style="background:rgba(139,111,240,0.12);border-radius:10px;padding-left:8px;padding-right:8px;"' : ''}>
            <div class="week-day">${d.from}~${d.to}세${now ? '<small style="color:var(--gold)">지금 이 대운</small>' : ''}</div>
            <div class="week-head"><b style="color:var(--text)">${d.hanja} ${d.name}</b> · ${term(god)}</div>
            <div class="week-score" style="font-size:12px;">${d.stemElem}${d.branchElem}</div>
          </div>`;
        }).join('')}
        <p class="muted" style="margin-top:10px;">💡 대운은 10년마다 인생의 배경 음악이 바뀌는 것과 같아요. 지금 대운의 십신이 요즘 나에게 강하게 작동하는 에너지입니다.</p>
      </div>`;
  }

  /* ---------- 신살 ---------- */
  function renderSinsalCard() {
    if (!saju.sinsal.length) return '';
    return `
      <div class="card">
        <div class="card-title">✨ 내 사주의 ${term('신살', '신살(神煞)')}</div>
        ${saju.sinsal.map(n => {
          const s = SajuData.SINSAL_DESC[n];
          return `
          <div style="margin-bottom:14px;">
            <div style="font-weight:800;font-size:15px;">${s.emoji} ${s.title}</div>
            <p class="fortune-text" style="margin-top:4px;">${s.desc}</p>
            <div class="tarot-advice" style="margin-top:8px;">💡 ${s.tip}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  /* ---------- 심층 리포트 (유료 상품) ---------- */
  function renderDeepReport() {
    const sig = profileSig(profile);
    const unlocked = Store.isDeepUnlocked(sig);
    const wrap = $('#deep-section');

    if (!unlocked) {
      wrap.innerHTML = `
        <div class="card lock-card">
          <div class="lock-blur">
            <div class="card-title">🔮 심층 사주 리포트</div>
            <p class="fortune-text">당신의 사주에 흐르는 십신의 별들은 각각 재물, 명예, 지혜의 방향을 가리키고 있습니다. 월주에 자리한 별은 사회 활동과 직업의 무대를…</p>
            <p class="fortune-text">연애에서는 일지의 기운이 배우자의 자리로…</p>
          </div>
          <div class="lock-overlay">
            <div class="lock-ico">🔮</div>
            <div class="lock-msg">나의 십신 · 직업 · 연애 심층 풀이</div>
            <div class="lock-sub">한 번 열면 계속 볼 수 있어요 (프로필 기준)</div>
            <button class="btn-gold btn-sm" id="btn-unlock-deep">🪙 ${Store.PRICES.deepReport}냥으로 열어보기</button>
          </div>
        </div>`;
      $('#btn-unlock-deep').addEventListener('click', () => {
        if (Store.unlockDeep(sig)) {
          toast('🔮 심층 리포트가 열렸어요!');
          renderCoins();
          renderDeepReport();
        } else {
          confirmModal('엽전이 부족해요 🥲', `심층 리포트는 ${Store.PRICES.deepReport}냥이 필요해요.<br/>광고 시청과 출석 도장으로 엽전을 모아 보세요.`, [
            { label: '광고 보고 +' + Store.REWARDS.ad + '냥', gold: true, fn: watchAd },
            { label: '계산대 가기', fn: () => switchTab('shop') },
          ]);
        }
      });
      return;
    }

    const dm = SajuData.DAY_MASTER[saju.dayMasterName];
    const g = saju.tenGods;
    const seen = new Set();
    const godList = [
      ['년주', g.year.stem], ['년주', g.year.branch],
      ['월주', g.month.stem], ['월주', g.month.branch],
      ['일지', g.day.branch],
      ...(g.hour ? [['시주', g.hour.stem], ['시주', g.hour.branch]] : []),
    ].filter(([, name]) => {
      if (!SajuData.TEN_GOD_DESC[name] || seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    wrap.innerHTML = `
      <div class="card">
        <div class="card-title">🔮 심층 사주 리포트</div>

        <p class="fortune-text" style="margin-bottom:12px;">내 사주에 들어와 있는 <b>${term('십신', '십신(十神)의 별')}</b>들입니다. 각 별은 인생에서 강하게 작동하는 에너지의 방향을 보여 줍니다.</p>
        ${godList.map(([pos, name]) => {
          const d = SajuData.TEN_GOD_DESC[name];
          return `<div class="info-line"><span class="ik">${term(name)}</span><span><b>${d.short}</b> <span class="muted">(${pos})</span><br/><span class="muted">${d.desc}</span></span></div>`;
        }).join('')}

        <div class="divider"></div>
        <div class="card-title">💼 직업·적성 풀이</div>
        <p class="fortune-text">${dm.job}에서 재능이 빛나는 사주입니다. ${SajuData.ELEMENT_DESC[saju.dominant].desc}</p>

        <div class="divider"></div>
        <div class="card-title">💕 연애·인연 풀이</div>
        <p class="fortune-text">${dm.love}</p>
        <p class="muted" style="margin-top:6px;">일지(배우자궁)에 <b>${g.day.branch}</b>의 기운이 자리해, ${SajuData.TEN_GOD_DESC[g.day.branch] ? SajuData.TEN_GOD_DESC[g.day.branch].short + '의 인연이 배우자 자리에서 작동합니다.' : '인연의 기운이 흐릅니다.'}</p>
        ${renderSpouseBlock()}

        <div class="divider"></div>
        <div class="card-title">📆 ${new Date().getFullYear()}년 ${term('세운')} · 지금의 ${term('대운')}</div>
        ${renderYearlyBlock()}

        <div class="divider"></div>
        <div class="card-title">🧭 점장님 한마디</div>
        <p class="fortune-text">${dm.caution} ${SajuData.ELEMENT_DESC[saju.lacking].lack}</p>
      </div>`;
  }

  /* ---------- 배우자성 블록 (성별 기반) ---------- */
  function renderSpouseBlock() {
    const sp = saju.spouse;
    if (!sp) return `<p class="muted" style="margin-top:6px;">⚙️ 성별을 선택하시면 배우자성(남자는 재성, 여자는 관성) 해석을 함께 보여드려요.</p>`;
    const D = SajuData.SPOUSE_DESC[saju.gender];
    const body = sp.count >= 3 ? D.many : sp.count === 0 ? D.none : D.one;
    return `
      <div class="rel-comment" style="margin-top:10px;">
        ${D.intro} 당신의 사주에는 ${term(saju.gender === 'M' ? '재성' : '관성', D.star)}이 <b>${sp.count}개</b> 있습니다.<br/><br/>${body}
      </div>`;
  }

  /* ---------- 올해 세운 + 현재 대운 ---------- */
  function renderYearlyBlock() {
    const y = new Date().getFullYear();
    // 세운: 해당 연도의 년간지
    const stem = ((y - 4) % 10 + 10) % 10;
    const branch = ((y - 4) % 12 + 12) % 12;
    const god = Saju.tenGod(saju.dayMaster, stem);
    const gd = SajuData.TEN_GOD_DESC[god];
    const name = Saju.STEMS[stem] + Saju.BRANCHES[branch];
    const hanja = Saju.STEM_HANJA[stem] + Saju.BRANCH_HANJA[branch];
    const rel = Saju.branchRelation(saju.day.branch, branch);
    const relTxt = SajuData.RELATION_COMMENT[rel];

    let cur = '';
    if (saju.luck) {
      const age = ageOf(profile);
      const d = saju.luck.list.find(x => age >= x.from && age <= x.to);
      if (d) {
        const lg = Saju.tenGod(saju.dayMaster, d.stem);
        const lgd = SajuData.TEN_GOD_DESC[lg];
        cur = `<p class="fortune-text" style="margin-top:10px;">지금은 <b>${d.hanja} ${d.name} 대운</b>(${d.from}~${d.to}세) 한가운데입니다. ${lgd ? lgd.short + ' — ' + lgd.desc : ''}</p>`;
      }
    }

    return `
      <p class="fortune-text">${y}년은 <b>${hanja} ${name}년</b>, 당신의 일간에게는 <b>${god}</b>의 해입니다.
      ${gd ? gd.short + ' — ' + gd.desc : ''}</p>
      ${relTxt ? `<div class="rel-comment" style="margin-top:10px;">✨ ${relTxt}</div>` : ''}
      ${cur}`;
  }

  /* ==================== 타로 ==================== */
  function renderTarot() {
    const draws = Store.tarotDrawsToday(todayKey());
    const wrap = $('#tab-tarot');

    wrap.innerHTML = `
      <div class="section-head">
        <h2>🎴 오늘의 타로</h2>
        <p>하루 1장은 무료! 추가 뽑기는 🪙 ${Store.PRICES.tarotExtra}냥이에요.</p>
      </div>
      <div class="card">
        <div class="tarot-stage" id="tarot-stage"></div>
      </div>
      <div class="notice-box">🃏 매일 자정이 지나면 새 카드가 입고돼요. 하루 한 장은 무료로 뽑으실 수 있습니다. 카드는 나의 생년월일과 날짜의 기운으로 정해집니다.</div>
    `;

    const stage = $('#tarot-stage');
    if (draws === 0) {
      renderTarotBack(stage, '카드를 눌러 오늘의 타로를 뽑아 보세요', () => drawTarot(false));
    } else {
      // 오늘 마지막으로 뽑은 카드 다시 보여주기
      showTarotResult(stage, drawTarotCard(draws), draws);
    }
  }

  function drawTarotCard(n) {
    return Tarot.drawCard('tarot-' + todayKey() + '-' + profileSig(profile) + '-' + n);
  }

  function renderTarotBack(stage, msg, onClick) {
    stage.innerHTML = `
      <div class="tarot-card-face tarot-back" id="tarot-back">
        <div class="tarot-emoji">🌟</div>
        <div class="tarot-en">TAROT</div>
      </div>
      <p class="muted">${msg}</p>`;
    $('#tarot-back').addEventListener('click', onClick);
  }

  function drawTarot(paid) {
    if (paid) {
      if (!Store.payTarotExtra()) {
        confirmModal('엽전이 부족해요 🥲', `추가 뽑기는 ${Store.PRICES.tarotExtra}냥이 필요해요.`, [
          { label: '광고 보고 +' + Store.REWARDS.ad + '냥', gold: true, fn: watchAd },
          { label: '계산대 가기', fn: () => switchTab('shop') },
        ]);
        return;
      }
      renderCoins();
    }
    const n = Store.recordTarotDraw(todayKey());
    const result = drawTarotCard(n);
    showTarotResult($('#tarot-stage'), result, n);
  }

  function showTarotResult(stage, result, drawCount) {
    const { card, reversed } = result;
    currentTarot = result;
    stage.innerHTML = `
      <div class="tarot-card-face" style="${reversed ? 'transform:rotate(180deg);' : ''}">
        <div class="tarot-emoji">${card.emoji}</div>
        <div class="tarot-name" style="${reversed ? 'transform:rotate(180deg);display:inline-block;' : ''}">${card.name}</div>
        <div class="tarot-en" style="${reversed ? 'transform:rotate(180deg);display:inline-block;' : ''}">${card.en}</div>
      </div>
      ${reversed ? '<div class="tarot-rev-tag">⟲ 역방향으로 나왔어요</div>' : ''}
      <div class="tarot-keywords">${card.keywords.map(k => `<span class="kw">#${k}</span>`).join('')}</div>
      <p class="tarot-meaning">${reversed ? card.reversed : card.upright}</p>
      <div class="tarot-advice">💡 오늘의 조언 — ${card.advice}</div>
      <div style="margin-top:16px;">
        <button class="btn-gold" id="btn-tarot-extra">🪙 ${Store.PRICES.tarotExtra}냥으로 한 장 더 뽑기</button>
      </div>
      <p class="muted" style="margin-top:8px;">오늘 ${drawCount}번째 카드</p>
    `;
    $('#btn-tarot-extra').addEventListener('click', () => drawTarot(true));
  }

  /* ==================== MBTI × 사주 ==================== */
  function renderMbti() {
    const wrap = $('#tab-mbti');
    wrap.innerHTML = `
      <div class="section-head">
        <h2>🧩 MBTI × 사주 궁합</h2>
        <p>서양의 성격 유형과 동양의 사주가 만나면?</p>
      </div>
      <div class="card">
        <div class="card-title">내 MBTI 선택</div>
        <div class="mbti-grid" id="mbti-grid">
          ${Mbti.TYPES.map(t => `<button class="mbti-btn ${profile.mbti === t ? 'active' : ''}" data-t="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div id="mbti-result"></div>
    `;

    $('#mbti-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.mbti-btn');
      if (!btn) return;
      $$('#mbti-grid .mbti-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      profile.mbti = btn.dataset.t;
      Store.saveProfile(profile);
      renderMbtiResult(btn.dataset.t);
    });

    if (profile.mbti) renderMbtiResult(profile.mbti);
    else $('#mbti-result').innerHTML = `<div class="notice-box">☝️ MBTI를 선택하면 사주와 결합한 해석을 보여드려요.</div>`;
  }

  function renderMbtiResult(type) {
    const r = Mbti.combine(type, saju);
    $('#mbti-result').innerHTML = `
      <div class="card">
        <div class="score-ring">
          <div class="muted">${type} × ${saju.dayMasterName}${saju.dayMasterElem} 일간 시너지</div>
          <div class="big">${r.score}<small style="font-size:16px;color:var(--sub);"> 점</small></div>
        </div>
        <div class="info-line"><span class="ik">MBTI</span><span><b>${type} — ${r.typeInfo.nick}</b><br/><span class="muted">${r.typeInfo.desc}</span></span></div>
        <div class="info-line"><span class="ik">사주</span><span><b>${saju.dayMasterName} 일간 — ${r.dmInfo.title}</b><br/><span class="muted">${r.dmInfo.core}</span></span></div>
        <div class="divider"></div>
        <p class="fortune-text">${r.synergy}</p>
        <div class="rel-comment" style="margin-top:12px;">🌈 ${r.domAxisLabel}</div>
        <div class="tarot-advice" style="margin-top:10px;">💡 성장 팁 — ${r.tip}</div>
      </div>`;
  }

  /* ==================== 상점 ==================== */
  function renderShop() {
    const wrap = $('#tab-shop');
    const adCnt = Store.adCountToday(todayKey());

    wrap.innerHTML = `
      <div class="section-head">
        <h2>🛒 계산대</h2>
        <p>저희 가게는 엽전으로 계산합니다. 광고를 보시거나 매일 도장을 찍으면 엽전을 드려요.</p>
      </div>

      <div class="card">
        <div class="shop-balance">내 엽전 <b id="shop-balance-num">${Store.getCoins() || 0}</b> 냥</div>
        <button class="btn-gold" id="btn-shop-ad" ${Store.canWatchAd(todayKey()) ? '' : 'disabled'}>
          📺 광고 보고 +${Store.REWARDS.ad}냥 받기 (오늘 ${adCnt}/${Store.AD_DAILY_LIMIT})
        </button>
        <div style="height:8px;"></div>
        <button class="btn-ghost" id="btn-shop-attend">🔖 출석 도장 찍고 +${Store.REWARDS.attendance}냥</button>
      </div>

      <div class="card">
        <div class="card-title">🪙 엽전 충전<span class="spacer"></span><span class="muted">결제 준비 중</span></div>
        ${Store.IAP_PACKAGES.map(p => `
          <div class="shop-item">
            <div class="shop-ico">${p.sub ? '🎟️' : '🪙'}</div>
            <div class="shop-info">
              <div class="shop-name">${p.sub ? '운세 편의점 정기권' : '엽전 ' + p.coins + '냥'}</div>
              <div class="shop-desc">${p.bonus || '기본 패키지'}</div>
            </div>
            <button class="btn-ghost btn-sm" data-pkg="${p.id}">${p.price}</button>
          </div>`).join('')}
        <p class="muted" style="margin-top:10px;">💳 결제 기능은 현재 준비 중이에요. 지금은 광고 시청과 출석 도장으로 엽전을 모으실 수 있어요.</p>
      </div>

      <div class="card">
        <div class="card-title">🧾 오늘의 진열대</div>
        <div class="shop-item"><div class="shop-ico">🗓️</div><div class="shop-info"><div class="shop-name">주간 운세</div><div class="shop-desc">7일간의 흐름 + BEST/주의 날짜</div></div><div class="shop-price">${Store.PRICES.weekly}냥/주</div></div>
        <div class="shop-item"><div class="shop-ico">🔮</div><div class="shop-info"><div class="shop-name">심층 사주 리포트</div><div class="shop-desc">십신·직업·연애 풀이 (영구 소장)</div></div><div class="shop-price">${Store.PRICES.deepReport}냥</div></div>
        <div class="shop-item"><div class="shop-ico">🎴</div><div class="shop-info"><div class="shop-name">타로 추가 뽑기</div><div class="shop-desc">하루 1장 무료 이후 추가 뽑기</div></div><div class="shop-price">${Store.PRICES.tarotExtra}냥/장</div></div>
      </div>
    `;

    $('#btn-shop-ad').addEventListener('click', watchAd);
    $('#btn-shop-attend').addEventListener('click', () => {
      if (Store.attend(todayKey())) {
        toast('🪙 도장 찍었어요! 엽전 +' + Store.REWARDS.attendance + '냥');
        renderCoins();
        renderHome();
      } else {
        toast('오늘 도장은 이미 찍으셨어요 😊');
      }
    });
    wrap.querySelectorAll('[data-pkg]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.purchasePackage(btn.dataset.pkg, null, (msg) => toast(msg));
      });
    });
  }

  /* ==================== 광고 (플레이스홀더) ==================== */
  // Store.showRewardedAd가 호출하는 데모 광고 화면
  window.AdPlaceholder = function (onComplete, onCancel) {
    const modal = $('#ad-modal');
    const count = $('#ad-countdown');
    const skip = $('#ad-skip');
    modal.classList.remove('hidden');
    let n = 5;
    count.textContent = n;
    skip.disabled = true;
    skip.textContent = '광고 시청 중...';
    const timer = setInterval(() => {
      n--;
      count.textContent = n;
      if (n <= 0) {
        clearInterval(timer);
        skip.disabled = false;
        skip.textContent = '보상 받기 🎁';
        skip.onclick = () => {
          modal.classList.add('hidden');
          onComplete();
        };
      }
    }, 1000);
  };

  function watchAd() {
    closeModal();
    if (!Store.canWatchAd(todayKey())) {
      toast('오늘의 광고 시청 횟수를 모두 사용했어요 (' + Store.AD_DAILY_LIMIT + '/' + Store.AD_DAILY_LIMIT + ')');
      return;
    }
    Store.showRewardedAd(() => {
      Store.recordAdWatch(todayKey());
      toast('🪙 엽전 +' + Store.REWARDS.ad + '냥 받았어요!');
      renderCoins();
      renderShop();
    }, () => {
      toast('광고 시청이 취소되었어요');
    });
  }

  /* ==================== 프로필 수정 ==================== */
  function openProfileEditor() {
    confirmModal('프로필을 수정할까요? ⚙️', '생년월일 등 정보를 다시 입력하면 사주가 새로 계산됩니다.<br/><span class="muted">엽전과 잠금 해제 내역은 유지돼요. (심층 리포트는 프로필 기준이라 다시 열어야 해요)</span>', [
      { label: '수정하기', gold: true, fn: () => {
        // 기존 값 채워 넣기
        $('#in-name').value = profile.name;
        // 음력으로 입력했던 분은 음력 값 그대로 되살립니다
        const lunar = profile.calendar === 'lunar' && profile.lunarInput;
        $$('#in-caltype .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.v === (lunar ? 'lunar' : 'solar')));
        $('#in-year').value = lunar ? profile.lunarInput.year : profile.year;
        $('#in-month').value = lunar ? profile.lunarInput.month : profile.month;
        $('#in-leap').checked = lunar ? !!profile.lunarInput.isLeap : false;
        updateCalendarUI();
        $('#in-day').value = lunar ? profile.lunarInput.day : profile.day;
        updateCalendarUI();
        $('#in-hour').value = profile.hour;
        $('#in-minute').value = profile.minute;
        $('#in-hour-unknown').checked = profile.hourUnknown;
        $('#in-hour').disabled = profile.hourUnknown;
        $('#in-minute').disabled = profile.hourUnknown;
        $('#in-solar-corr').checked = profile.solarCorrection !== false;
        $('#in-mbti').value = profile.mbti || '';
        $$('#in-gender .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.v === profile.gender));
        $('#main').classList.add('hidden');
        $('#bottom-nav').classList.add('hidden');
        $('#onboarding').classList.remove('hidden');
        window.scrollTo({ top: 0 });
      } },
      { label: '취소', fn: () => {} },
    ]);
  }

  /* ==================== 용어 사전 ====================
   * term('일간') → 점선 밑줄이 그어진 칩. 누르면 뜻풀이 모달이 열립니다. */
  function term(word, label) {
    const g = SajuData.GLOSSARY[word];
    if (!g) return esc(label || word);
    return `<button class="term" data-term="${esc(word)}">${esc(label || word)}<span class="term-q">?</span></button>`;
  }

  function openGlossary(word) {
    const g = SajuData.GLOSSARY[word];
    if (!g) return;
    confirmModal(
      `${word} <span class="term-read">${g.read}</span>`,
      `<div class="term-plain">💬 ${g.plain}</div><p style="margin-top:10px;">${g.full}</p>`,
      [{ label: '알겠어요', gold: true, fn: () => {} }]
    );
  }

  // 본문 칩(.term)과 사전 목록 칩(.term-chip) 모두 문서 전체에 위임
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-term]');
    if (btn) openGlossary(btn.dataset.term);
  });

  /* ==================== 공용 UI ==================== */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  function confirmModal(title, bodyHtml, actions) {
    const modal = $('#modal');
    const content = $('#modal-content');
    content.innerHTML = `
      <div class="modal-title">${title}</div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-actions">
        ${actions.map((a, i) => `<button class="${a.gold ? 'btn-gold' : 'btn-ghost'}" data-i="${i}">${a.label}</button>`).join('')}
      </div>`;
    modal.classList.remove('hidden');
    content.querySelectorAll('[data-i]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal();
        actions[+btn.dataset.i].fn();
      });
    });
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  }

  function closeModal() { $('#modal').classList.add('hidden'); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ==================== 시작 ==================== */
  document.addEventListener('DOMContentLoaded', init);
})();
