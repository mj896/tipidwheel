// ==========================================
// FEATURES: LOGIN/REGISTER (local sa device), DAILY CASH, TRANSPO
// ==========================================
const USERS_KEY = 'tipidwheel_users';
const SESSION_KEY = 'tipidwheel_session';
const FARE_TYPES = [['Jeep', '🚐'], ['Tricycle', '🛺'], ['Bus', '🚌'], ['UV / Van', '🚐'], ['MRT / LRT', '🚆'], ['Iba pa', '🚗']];
const MEALS = [ // tantyang presyo lang, nag-iiba depende sa branch/promo
    ['Street food (kwek-kwek, fishball)', 30], ['Lugaw / Goto', 35], ['Siomai rice', 45], ['Carinderia: 1 ulam + rice', 60],
    ['Pares', 75], ['McDo Burger Steak + rice', 75], ['Tapsilog / Longsilog', 80], ['Jollibee Yumburger + fries + drink', 95],
    ['Jollibee Chickenjoy 1pc + rice', 99], ['KFC rice meal', 105], ['Chowking Chao Fan + siomai', 110], ['Mang Inasal PM1', 120]
];
let authMode = 'login';

const getUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; } };
async function hashPw(pw, salt) {
    const data = new TextEncoder().encode(salt + pw);
    if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const c of salt + pw) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return 'x' + h;
}

// ---------- AUTH ----------
function showAuth() { const o = document.getElementById('authOverlay'); o.classList.remove('hidden'); o.classList.add('flex'); setAuthMode('login'); }

function setAuthMode(mode) {
    authMode = mode;
    const reg = mode === 'register';
    document.getElementById('authRegisterFields').classList.toggle('hidden', !reg);
    document.getElementById('authSubmitBtn').textContent = reg ? 'Mag-Register' : 'Mag-Login';
    document.getElementById('authSwitchBtn').textContent = reg ? 'May account na? Mag-login' : 'Wala pang account? Mag-register';
    document.getElementById('authMsg').textContent = '';
    const sub = document.getElementById('authSub');
    if (sub) sub.textContent = reg ? 'Gumawa ng account para sa sarili mong ipon at budget.' : 'Welcome back! Tuloy ang pag-iipon.';
}

async function submitAuth(e) {
    e.preventDefault();
    const msg = document.getElementById('authMsg');
    const u = document.getElementById('authUser').value.trim().toLowerCase();
    const pw = document.getElementById('authPass').value;
    const users = getUsers();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { msg.textContent = 'Username: 3-20 letters/numbers lang.'; return; }
    if (pw.length < 4) { msg.textContent = 'Password: at least 4 characters.'; return; }
    if (authMode === 'register') {
        const g = document.querySelector('input[name="authGender"]:checked');
        if (!g) { msg.textContent = 'Piliin kung lalaki o babae.'; return; }
        if (users[u]) { msg.textContent = 'May gumagamit na ng username na yan.'; return; }
        const salt = Math.random().toString(36).slice(2);
        users[u] = { salt, hash: await hashPw(pw, salt), gender: g.value, nick: document.getElementById('authNick').value.trim() || u };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
        const rec = users[u];
        if (!rec || rec.hash !== await hashPw(pw, rec.salt)) { msg.textContent = 'Mali ang username o password.'; return; }
    }
    localStorage.setItem(SESSION_KEY, u);
    location.reload(); // para ma-load ang sariling data ng user
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
}

// ---------- DAILY ----------
const $ = id => document.getElementById(id);
const todayStr = () => formatDateISO(new Date());
const todayFares = () => appState.transport.filter(t => t.date === todayStr());
const fareTotal = () => todayFares().reduce((s, t) => s + t.price, 0);
const todaySpends = () => appState.dailySpends.filter(x => x.date === todayStr());
const mealSpends = () => todaySpends().filter(x => x.kind === 'food');
const isDailySet = () => appState.dailyDate === todayStr() && appState.dailyCash > 0;
const moneyNow = () => isDailySet() ? appState.dailyCash - fareTotal() - todaySpends().reduce((s, x) => s + x.amount, 0) : 0;

function calcDaily() {
    const set = isDailySet(), cash = set ? appState.dailyCash : 0, fare = fareTotal();
    const meals = appState.mealsPerDay || 3, spendable = Math.max(0, cash - fare);
    // target ipon ay kinukuha sa PAGKAIN lang (hindi sa pamasahe)
    const ipon = Math.min(appState.dailyGoal > 0 ? appState.dailyGoal : Math.round(cash * 0.2), spendable);
    const eaten = mealSpends(), foodBudget = cash - fare - ipon;
    const foodLeft = foodBudget - eaten.reduce((s, x) => s + x.amount, 0);
    const per = Math.floor(foodLeft / Math.max(1, meals - eaten.length)); // kada natitirang kain
    return { set, cash, fare, meals, ipon, foodBudget, foodLeft, per, now: moneyNow() };
}

// Pera sa wallet = galing sa Smart Tipid (hindi sa Vault)
const planPool = () => Math.max(0, (appState.foodInitialBudget || 0) - foodSpentAll()) + Math.max(0, (appState.needsAmount || 0) - dailySynced().needs);
const smartAllowance = () => Math.floor(planPool() / Math.max(1, appState.days || 7));
function useSmartAllowance() { $('dailyCashInput').value = smartAllowance(); showToast('Nilagay ang pang-araw mula sa Smart Tipid. Pindutin ang I-set.', 'info'); }

function addSpend(note, amount, kind) {
    appState.dailySpends.unshift({ id: 's_' + Date.now(), date: todayStr(), note, amount, kind });
}

async function saveDailyCash() {
    const v = parseFloat($('dailyCashInput').value);
    if (!(v > 0)) { showToast('Maglagay ng valid na cash (₱).', 'error'); return; }
    appState.dailyCash = v; appState.dailyDate = todayStr();
    appState.dailyGoal = parseFloat($('dailyGoalInput').value) || 0;
    appState.mealsPerDay = parseInt($('mealsPerDay').value) || 3;
    saveState(); renderDaily();
    showToast('Na-set na ang budget mo ngayong araw!', 'success');
}

function addTransport(e) {
    e.preventDefault();
    const price = parseFloat($('farePrice').value);
    if (!(price > 0)) { showToast('Ilagay ang presyo ng pamasahe.', 'error'); return; }
    appState.transport.unshift({ id: 'f_' + Date.now(), date: todayStr(), price, type: $('fareType').value, note: $('fareNote').value.trim() });
    e.target.reset(); saveState(); renderDaily();
    showToast(`Naitala: ${formatPeso(price)} pamasahe.`, 'success');
}
function deleteFare(id) { appState.transport = appState.transport.filter(t => t.id !== id); saveState(); renderDaily(); }

function addOtherSpend(e) {
    e.preventDefault();
    const note = $('otherNote').value.trim() || 'Gastos', amt = parseFloat($('otherAmt').value);
    if (!(amt > 0)) { showToast('Ilagay ang halaga.', 'error'); return; }
    addSpend(note, amt, 'other'); e.target.reset(); saveState(); renderDaily();
}
function deleteSpend(id) {
    const x = appState.dailySpends.find(s => s.id === id);
    if (x && x.kind === 'vault') { showToast('Nasa Vault na ito. Kunin mo sa Vault tab kung kailangan.', 'error'); return; }
    appState.dailySpends = appState.dailySpends.filter(s => s.id !== id); saveState(); renderDaily();
}
function moveLeftoverToVault() {
    const left = moneyNow();
    if (!(left > 0)) return;
    addSpend('Lipat sa Vault', left, 'vault');
    vaultMove('in', left, 'Natira ngayong araw'); renderDaily();
    showToast(`Nilagay sa Vault ang natira: ${formatPeso(left)} 🐷`, 'success');
}

// Manual: saan kumain at magkano (yun lang ang mababawas)
async function logMeal(e) {
    e.preventDefault();
    const name = $('eatName').value.trim(), cost = parseFloat($('eatPrice').value);
    if (!name || !(cost > 0)) { showToast('Ilagay kung saan ka kumain at magkano.', 'error'); return; }
    if (!isDailySet()) { showToast('I-set muna ang cash mo sa taas.', 'error'); return; }
    if (cost > moneyNow()) {
        const ok = await askConfirm({ title: 'Lampas sa pera mo!', msg: `${formatPeso(cost)} ang kinain mo pero ${formatPeso(Math.max(0, moneyNow()))} na lang ang pera mo ngayon. Itala pa rin?`, yes: 'Itala', no: 'Hindi muna', tone: 'danger' });
        if (!ok) return;
    }
    addSpend(name, cost, 'food'); appState.mealPrices[name] = cost;
    e.target.reset(); saveState(); renderDaily();
    showToast(`Naitala: ${name} −${formatPeso(cost)}. Natira: ${formatPeso(moneyNow())}`, 'success');
}

// Go sa wheel: ibawas sa "pera ko ngayon"
async function wheelGo() {
    const cost = parseFloat($('modalDeductInput').value);
    if (!(cost > 0)) { showToast('Ilagay ang presyo ng kakainin mo.', 'error'); return; }
    if (!isDailySet()) { showToast('I-set muna ang cash mo sa tab na Ngayong Araw.', 'error'); return; }
    if (cost > moneyNow()) {
        const ok = await askConfirm({ title: 'Lampas sa pera mo!', msg: `${formatPeso(cost)} ang presyo pero ${formatPeso(Math.max(0, moneyNow()))} na lang ang pera mo ngayon. Tuloy pa rin?`, yes: 'Tuloy', no: 'Hindi muna', tone: 'danger' });
        if (!ok) return;
    }
    addSpend(lastWinner || 'Wheel meal', cost, 'food');
    appState.mealPrices[lastWinner] = cost;
    saveState(); closeWinnerModal(); renderDaily();
    showToast(`Go! −${formatPeso(cost)} para sa ${lastWinner}. Natira: ${formatPeso(moneyNow())}`, 'success');
}

function addCustomMeal(e) {
    e.preventDefault();
    const name = $('customMealName').value.trim(), price = parseFloat($('customMealPrice').value);
    if (!name || !(price > 0)) { showToast('Ilagay ang pangalan at presyo.', 'error'); return; }
    appState.customMeals.push({ name, price });
    appState.hiddenMeals = appState.hiddenMeals.filter(n => n !== name);
    e.target.reset(); saveState(); renderDaily();
}
function deleteCustomMeal(i) { appState.customMeals.splice(i, 1); saveState(); renderDaily(); }

let lastRecNames = [], lastRecs = [];
function setMealPrice(i, v) {
    const price = parseFloat(v), m = lastRecs[i];
    if (m && price > 0) { appState.mealPrices[m.name] = price; saveState(); renderDaily(); }
}
function hideMeal(i) { const m = lastRecs[i]; if (m) { appState.hiddenMeals.push(m.name); saveState(); renderDaily(); } }
function restoreMeals() { appState.hiddenMeals = []; saveState(); renderDaily(); }

function useRecsInWheel() {
    if (!lastRecNames.length) return;
    appState.foods = [...lastRecNames];
    saveState(); renderFoodTags(); drawWheel();
    showToast('Nilagay sa Spin Wheel ang mga pasok sa budget!', 'success');
    switchMainTab('wheel');
}

function renderDaily() {
    const p = appState.profile || {}, d = calcDaily();
    $('dailyGreeting').textContent = `Kumusta, ${p.gender === 'female' ? 'Ate' : 'Kuya'} ${p.nick || ''}! 👋`;
    if (document.activeElement !== $('dailyCashInput') && d.set) $('dailyCashInput').value = appState.dailyCash;
    if (document.activeElement !== $('dailyGoalInput') && d.set) $('dailyGoalInput').value = appState.dailyGoal || '';
    $('mealsPerDay').value = String(d.meals);

    $('smartHint').innerHTML = appState.totalMoney > 0
        ? `Galing sa Smart Tipid: ${formatPeso(planPool())} ang natitira (mga ${formatPeso(smartAllowance())}/araw). <button type="button" onclick="useSmartAllowance()" class="font-bold text-emerald-600 dark:text-emerald-400 underline">Gamitin ang ${formatPeso(smartAllowance())}</button>`
        : 'Wala pang plan sa Smart Tipid. Gumawa muna roon, dahil doon kinukuha ang pera mo.';
    const nowEl = $('dailyNowText');
    nowEl.textContent = formatPeso(d.now);
    nowEl.className = 'text-3xl font-extrabold ' + (d.now < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400');
    $('dailyNowSub').textContent = d.set ? `${formatPeso(d.cash)} cash − pamasahe − nakain/gastos` : 'I-set muna ang cash mo sa taas.';
    const goalCapped = appState.dailyGoal > 0 && appState.dailyGoal > d.ipon;
    const box = (label, val, cls) => `<div class="rounded-2xl p-3 bg-slate-50 dark:bg-slate-800"><div class="text-[10px] font-bold text-slate-500 dark:text-slate-400">${label}</div><div class="text-sm font-extrabold ${cls}">${formatPeso(val)}</div></div>`;
    $('dailyBreakdown').innerHTML = d.set
        ? box('💰 Target ipon', d.ipon, 'text-emerald-600 dark:text-emerald-400') + box('🚌 Pamasahe', d.fare, 'text-amber-600 dark:text-amber-400') + box('🍽️ Pagkain (natira)', Math.max(0, d.foodLeft), '')
          + (goalCapped ? `<div class="col-span-3 text-[11px] text-rose-500">Masyadong malaki ang target ipon. Ibinaba sa ${formatPeso(d.ipon)} para hindi galawin ang pamasahe.</div>` : '')
        : '';

    const ICON = { food: '🍽️', vault: '🐷', other: '💸' };
    const sp = todaySpends();
    $('spendList').innerHTML = sp.length ? '<div class="text-xs font-bold mb-1">Nakain / nagastos ngayon</div>' + sp.map(x => `
        <div class="flex items-center justify-between py-1.5 text-sm border-b border-slate-100 dark:border-slate-800"><span>${ICON[x.kind] || '💸'} ${escapeHtml(x.note)}</span>
        <span class="font-bold">−${formatPeso(x.amount)} <button onclick="deleteSpend('${x.id}')" class="ml-2 text-slate-400 hover:text-rose-500 text-xs" aria-label="Alisin">✕</button></span></div>`).join('') : '';
    $('toVaultBtn').classList.toggle('hidden', !(d.now > 0));
    $('toVaultBtn').textContent = `🐷 Ilagay sa Vault ang natira (${formatPeso(d.now)})`;

    const fares = todayFares();
    $('fareTotalText').textContent = formatPeso(d.fare);
    $('fareList').innerHTML = fares.length ? fares.map(t => `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
            <span>${(FARE_TYPES.find(x => x[0] === t.type) || ['', '🚗'])[1]} <b>${escapeHtml(t.type)}</b>${t.note ? ` <span class="text-xs text-slate-400">${escapeHtml(t.note)}</span>` : ''}</span>
            <span class="font-bold">${formatPeso(t.price)} <button onclick="deleteFare('${t.id}')" class="ml-2 text-rose-500 text-xs" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></span>
        </div>`).join('') : '<p class="text-xs text-slate-400">Wala pang naitalang pamasahe ngayong araw.</p>';

    // rekomendasyon: editable ang presyo, may ✕ para itago
    const all = [...MEALS.map(m => ({ name: m[0], price: m[1] })), ...appState.customMeals]
        .filter(m => !appState.hiddenMeals.includes(m.name))
        .map(m => ({ name: m.name, price: appState.mealPrices[m.name] ?? m.price }));
    const recEl = $('mealRecs'), per = Math.max(0, d.per);
    lastRecNames = []; lastRecs = [];
    if (!d.set) recEl.innerHTML = '<p class="text-xs text-slate-400">Ilagay muna ang cash mo sa taas.</p>';
    else {
        let fit = all.filter(m => m.price <= per).sort((a, b) => b.price - a.price).slice(0, 6), warn = '';
        if (d.foodLeft <= 0) { warn = 'Ubos na ang pang-pagkain mo dahil sa ipon, pamasahe at nakain. Ito ang pinakamura:'; fit = [...all].sort((a, b) => a.price - b.price).slice(0, 3); }
        else if (!fit.length) { warn = `Kulang ang ${formatPeso(per)} kada kain. Pinakamura ang mga ito:`; fit = [...all].sort((a, b) => a.price - b.price).slice(0, 3); }
        lastRecs = fit; lastRecNames = fit.map(m => m.name);
        const left = Math.max(1, d.meals - mealSpends().length);
        recEl.innerHTML = `<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${warn || `Natitirang kain: ${left}x. Kada kain: hanggang <b>${formatPeso(per)}</b>`}</p>` +
            fit.map((m, i) => `<div class="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800 text-sm"><span class="flex-1 min-w-0">${escapeHtml(m.name)}</span>
                <span class="text-xs text-slate-400">~₱</span><input type="number" inputmode="decimal" min="1" value="${m.price}" onchange="setMealPrice(${i}, this.value)" aria-label="Presyo" class="w-16 px-2 py-1 text-sm font-bold text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <button onclick="hideMeal(${i})" aria-label="Ayaw ko nito" class="text-slate-400 hover:text-rose-500 px-1">✕</button></div>`).join('');
    }
    $('useRecsBtn').classList.toggle('hidden', !lastRecNames.length);
    $('restoreMealsBtn').classList.toggle('hidden', !appState.hiddenMeals.length);
    $('customMealChips').innerHTML = appState.customMeals.map((m, i) =>
        `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800">${escapeHtml(m.name)} ${formatPeso(m.price)} <button onclick="deleteCustomMeal(${i})" aria-label="Remove">✕</button></span>`).join(' ');
    const names = [...new Set([...MEALS.map(m => m[0]), ...appState.customMeals.map(m => m.name), ...appState.foods])];
    $('mealNames').innerHTML = names.map(n => `<option value="${escapeHtml(n)}">`).join('');
    renderMonitor(); renderBudgetUI();
}

// ---------- INIT ----------
const _origSwitch = window.switchMainTab;
window.switchMainTab = function (tab) {
    _origSwitch(tab);
    [['daily', renderDaily], ['vault', renderVault]].forEach(([t, fn]) => {
        const on = tab === t;
        $(t + 'Section').classList.toggle('hidden', !on);
        const btn = $('navTab-' + t);
        if (btn) { btn.classList.remove(...NAV_ON, ...NAV_OFF); btn.classList.add(...(on ? NAV_ON : NAV_OFF)); }
        if (on) fn();
    });
};

window.addEventListener('DOMContentLoaded', () => {
    const u = localStorage.getItem(SESSION_KEY), rec = getUsers()[u];
    if (!u || !rec) { localStorage.removeItem(SESSION_KEY); showAuth(); return; }
    appState.transport = Array.isArray(appState.transport) ? appState.transport : [];
    appState.customMeals = Array.isArray(appState.customMeals) ? appState.customMeals : [];
    appState.dailyCash = appState.dailyCash || 0;
    appState.mealsPerDay = appState.mealsPerDay || 3;
    const d0 = appState.dailyDate; // bagong araw na: i-reset ang cash, sabihin kung may natira kahapon
    if (d0 && d0 !== todayStr() && appState.dailyCash > 0) {
        const left = appState.dailyCash - appState.transport.filter(t => t.date === d0).reduce((s, t) => s + t.price, 0) - appState.dailySpends.filter(x => x.date === d0).reduce((s, x) => s + x.amount, 0);
        if (left > 0) setTimeout(() => showToast(`May natira kang ${formatPeso(left)} kahapon. I-set ulit ang cash mo ngayon.`, 'info'), 900);
        appState.dailyCash = 0; appState.dailyGoal = 0; appState.dailyDate = '';
    }
    if (!appState.profile) {
        appState.profile = { username: u, nick: rec.nick, gender: rec.gender };
        setAvatarGender(rec.gender);
        updateAvatarName(rec.nick);
        const ni = $('avatarNameInput'); if (ni) ni.value = rec.nick;
    }
    saveState();
    renderDaily();
    switchMainTab('daily');
});
