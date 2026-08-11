/* ============================================================
 * store.js — 엽전(코인)·과금·광고 스캐폴딩
 *  - 엽전: 앱 내 재화 (localStorage)
 *  - 광고: 플레이스홀더 (실제 SDK 연동 지점 명시)
 *  - 결제: 준비중 UI (IAP/PG 연동 지점 명시)
 * ============================================================ */
(function (global) {
  'use strict';

  const LS = {
    profile: 'saju_profile_v1',
    coins: 'saju_coins_v1',
    state: 'saju_state_v1',
  };

  const PRICES = {
    weekly: 10,      // 주간 운세 (주 단위 잠금 해제)
    deepReport: 20,  // 심층 사주 리포트 (영구 해제)
    tarotExtra: 5,   // 타로 추가 뽑기
  };

  const REWARDS = {
    signup: 30,      // 최초 가입 보너스
    attendance: 5,   // 일일 출석
    ad: 3,           // 광고 시청 1회
  };

  const AD_DAILY_LIMIT = 3;

  /* ---------- 결제 상품 정의 (스토어 연동 준비용) ---------- */
  const IAP_PACKAGES = [
    { id: 'coin_100', coins: 100, price: '₩1,500', bonus: '' },
    { id: 'coin_330', coins: 330, price: '₩4,400', bonus: '+10% 보너스' },
    { id: 'coin_700', coins: 700, price: '₩8,800', bonus: '+17% 보너스' },
    { id: 'sub_month', coins: null, price: '₩3,900/월', bonus: '프리미엄 구독: 주간운세·심층풀이·타로 무제한', sub: true },
  ];

  /* ---------- 저장/불러오기 ---------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 저장 실패 무시 */ }
  }

  function getProfile() { return loadJSON(LS.profile, null); }
  function saveProfile(p) { saveJSON(LS.profile, p); }
  function clearProfile() { localStorage.removeItem(LS.profile); }

  function getCoins() {
    const c = loadJSON(LS.coins, null);
    return c === null ? null : c.amount;
  }
  function initCoins() {
    if (loadJSON(LS.coins, null) === null) {
      saveJSON(LS.coins, { amount: REWARDS.signup });
      return true; // 가입 보너스 지급됨
    }
    return false;
  }
  function addCoins(n) {
    const cur = getCoins() || 0;
    saveJSON(LS.coins, { amount: cur + n });
    return cur + n;
  }
  function spendCoins(n) {
    const cur = getCoins() || 0;
    if (cur < n) return false;
    saveJSON(LS.coins, { amount: cur - n });
    return true;
  }

  /* ---------- 일일/영구 상태 ---------- */
  function getState() { return loadJSON(LS.state, {}); }
  function setState(patch) {
    const s = Object.assign(getState(), patch);
    saveJSON(LS.state, s);
    return s;
  }

  // 출석
  function canAttend(todayKey) { return getState().attendDate !== todayKey; }
  function attend(todayKey) {
    if (!canAttend(todayKey)) return false;
    setState({ attendDate: todayKey });
    addCoins(REWARDS.attendance);
    return true;
  }

  // 광고 시청 횟수
  function adCountToday(todayKey) {
    const s = getState();
    return s.adDate === todayKey ? (s.adCount || 0) : 0;
  }
  function canWatchAd(todayKey) { return adCountToday(todayKey) < AD_DAILY_LIMIT; }
  function recordAdWatch(todayKey) {
    const cnt = adCountToday(todayKey) + 1;
    setState({ adDate: todayKey, adCount: cnt });
    addCoins(REWARDS.ad);
    return cnt;
  }

  // 주간 운세 잠금
  function isWeeklyUnlocked(weekKey) { return getState().weeklyKey === weekKey; }
  function unlockWeekly(weekKey) {
    if (!spendCoins(PRICES.weekly)) return false;
    setState({ weeklyKey: weekKey });
    return true;
  }

  // 심층 리포트 (프로필 기준 영구)
  function isDeepUnlocked(profileSig) { return getState().deepSig === profileSig; }
  function unlockDeep(profileSig) {
    if (!spendCoins(PRICES.deepReport)) return false;
    setState({ deepSig: profileSig });
    return true;
  }

  // 타로: 무료 1장/일 + 추가 뽑기
  function tarotDrawsToday(todayKey) {
    const s = getState();
    return s.tarotDate === todayKey ? (s.tarotCount || 0) : 0;
  }
  function recordTarotDraw(todayKey) {
    const cnt = tarotDrawsToday(todayKey) + 1;
    setState({ tarotDate: todayKey, tarotCount: cnt });
    return cnt;
  }
  function payTarotExtra() { return spendCoins(PRICES.tarotExtra); }

  /* ---------- 광고 SDK 연동 지점 ----------
   * 실제 서비스 시 이 함수를 AdMob/AdFit 등 SDK 호출로 교체하세요.
   * onComplete()는 광고 시청 완료 콜백에서 호출해야 합니다. */
  function showRewardedAd(onComplete, onCancel) {
    // === AD SDK PLACEHOLDER ===
    // 예: admob.rewarded.show().then(onComplete).catch(onCancel)
    if (global.AdPlaceholder) {
      global.AdPlaceholder(onComplete, onCancel);
    } else {
      onComplete();
    }
  }

  /* ---------- 결제 연동 지점 ----------
   * 실제 서비스 시 인앱결제(IAP) 또는 PG 결제 모듈로 교체하세요. */
  function purchasePackage(pkgId, onSuccess, onFail) {
    // === PAYMENT PLACEHOLDER ===
    // 예: iap.purchase(pkgId).then(onSuccess).catch(onFail)
    onFail && onFail('결제 기능은 준비 중입니다. 곧 만나요! 🙏');
  }

  global.Store = {
    PRICES, REWARDS, AD_DAILY_LIMIT, IAP_PACKAGES,
    getProfile, saveProfile, clearProfile,
    getCoins, initCoins, addCoins, spendCoins,
    getState, setState,
    canAttend, attend,
    adCountToday, canWatchAd, recordAdWatch,
    isWeeklyUnlocked, unlockWeekly,
    isDeepUnlocked, unlockDeep,
    tarotDrawsToday, recordTarotDraw, payTarotExtra,
    showRewardedAd, purchasePackage,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Store;
})(typeof window !== 'undefined' ? window : globalThis);
