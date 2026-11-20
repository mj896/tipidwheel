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
const todayStr = () => formatDateISO(new Date());
const todayFares = () => appState.transport.filter(t => t.date === todayStr());
const fareTotal = () => todayFares().reduce((s, t) => s + t.price, 0);

function saveDailyCash() {
    const v = parseFloat(document.getElementById('dailyCashInput').value);
    if (!(v > 0)) { showToast('Maglagay ng valid na cash (₱).', 'error'); return; }
    appState.dailyCash = v;
    appState.mealsPerDay = parseInt(document.getElementById('mealsPerDay').value) || 3;
    saveState(); renderDaily();
    showToast('Na-set na ang budget mo ngayong araw!', 'success');
}

function addTransport(e) {
    e.preventDefault();
    const price = parseFloat(document.getElementById('farePrice').value);
    if (!(price > 0)) { showToast('Ilagay ang presyo ng pamasahe.', 'error'); return; }
    appState.transport.unshift({
        id: 'f_' + Date.now(), date: todayStr(), price,
        type: document.getElementById('fareType').value,
        note: document.getElementById('fareNote').value.trim()
    });
    e.target.reset(); saveState(); renderDaily();
    showToast(`Naitala: ${formatPeso(price)} pamasahe.`, 'success');
}

function deleteFare(id) {
    appState.transport = appState.transport.filter(t => t.id !== id);
    saveState(); renderDaily();
}

function addCustomMeal(e) {
    e.preventDefault();
    const name = document.getElementById('customMealName').value.trim();
    const price = parseFloat(document.getElementById('customMealPrice').value);
    if (!name || !(price > 0)) { showToast('Ilagay ang pangalan at presyo.', 'error'); return; }
    appState.customMeals.push({ name, price });
    e.target.reset(); saveState(); renderDaily();
}

function deleteCustomMeal(i) { appState.customMeals.splice(i, 1); saveState(); renderDaily(); }

let lastRecNames = [];
function useRecsInWheel() {
    if (!lastRecNames.length) return;
    appState.foods = [...lastRecNames];
    saveState(); renderFoodTags(); drawWheel();
    showToast('Nilagay sa Spin Wheel ang mga pasok sa budget!', 'success');
    switchMainTab('wheel');
}

function renderDaily() {
    const p = appState.profile || {};
    const title = p.gender === 'female' ? 'Ate' : 'Kuya';
    document.getElementById('dailyGreeting').textContent = `Kumusta, ${title} ${p.nick || ''}! 👋`;
    const cashIn = document.getElementById('dailyCashInput');
    if (document.activeElement !== cashIn && appState.dailyCash) cashIn.value = appState.dailyCash;
    document.getElementById('mealsPerDay').value = String(appState.mealsPerDay || 3);

    const cash = appState.dailyCash || 0, meals = appState.mealsPerDay || 3;
    const ipon = Math.round(cash * 0.2), fare = fareTotal();
    const food = cash - ipon - fare, per = Math.floor(food / meals);
    const box = (label, val, cls) => `<div class="rounded-2xl p-3 bg-slate-50 dark:bg-slate-800"><div class="text-[10px] font-bold text-slate-500 dark:text-slate-400">${label}</div><div class="text-sm font-extrabold ${cls}">${formatPeso(val)}</div></div>`;
    document.getElementById('dailyBreakdown').innerHTML = cash
        ? box('💰 Ipon (20%)', ipon, 'text-emerald-600 dark:text-emerald-400') + box('🚌 Pamasahe', fare, 'text-amber-600 dark:text-amber-400') + box('🍽️ Pagkain', Math.max(0, food), '')
        : '<div class="col-span-3 text-xs text-slate-400">Ilagay ang cash mo para makita ang hati.</div>';

    // fares
    const fares = todayFares();
    document.getElementById('fareTotalText').textContent = formatPeso(fare);
    document.getElementById('fareList').innerHTML = fares.length ? fares.map(t => `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
            <span>${(FARE_TYPES.find(x => x[0] === t.type) || ['', '🚗'])[1]} <b>${escapeHtml(t.type)}</b>${t.note ? ` <span class="text-xs text-slate-400">${escapeHtml(t.note)}</span>` : ''}</span>
            <span class="font-bold">${formatPeso(t.price)} <button onclick="deleteFare('${t.id}')" class="ml-2 text-rose-500 text-xs" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></span>
        </div>`).join('') : '<p class="text-xs text-slate-400">Wala pang naitalang pamasahe ngayong araw.</p>';

    // recommendations
    const all = [...MEALS.map(m => ({ name: m[0], price: m[1] })), ...appState.customMeals];
    const recEl = document.getElementById('mealRecs');
    lastRecNames = [];
    if (!cash) { recEl.innerHTML = '<p class="text-xs text-slate-400">Ilagay muna ang cash mo sa taas.</p>'; }
    else {
        let fit = all.filter(m => m.price <= per).sort((a, b) => b.price - a.price).slice(0, 6), warn = '';
        if (food <= 0) { warn = 'Ubos na ang pang-pagkain mo dahil sa ipon at pamasahe. Ito ang pinakamura:'; fit = [...all].sort((a, b) => a.price - b.price).slice(0, 3); }
        else if (!fit.length) { warn = `Kulang ang ${formatPeso(per)} kada kain. Pinakamura ang mga ito:`; fit = [...all].sort((a, b) => a.price - b.price).slice(0, 3); }
        lastRecNames = fit.map(m => m.name);
        recEl.innerHTML = `<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${warn || `Kada kain (${meals}x): hanggang <b>${formatPeso(per)}</b>`}</p>` +
            fit.map(m => `<div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm"><span>${escapeHtml(m.name)}</span><b>~${formatPeso(m.price)}</b></div>`).join('');
    }
    document.getElementById('useRecsBtn').classList.toggle('hidden', !lastRecNames.length);
    document.getElementById('customMealChips').innerHTML = appState.customMeals.map((m, i) =>
        `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800">${escapeHtml(m.name)} ${formatPeso(m.price)} <button onclick="deleteCustomMeal(${i})" aria-label="Remove">✕</button></span>`).join(' ');
}

// ---------- INIT ----------
const _origSwitch = window.switchMainTab;
window.switchMainTab = function (tab) {
    _origSwitch(tab);
    const on = tab === 'daily';
    document.getElementById('dailySection').classList.toggle('hidden', !on);
    const btn = document.getElementById('navTab-daily');
    if (btn) { btn.classList.remove(...NAV_ON, ...NAV_OFF); btn.classList.add(...(on ? NAV_ON : NAV_OFF)); }
    if (on) renderDaily();
};

window.addEventListener('DOMContentLoaded', () => {
    const u = localStorage.getItem(SESSION_KEY), rec = getUsers()[u];
    if (!u || !rec) { localStorage.removeItem(SESSION_KEY); showAuth(); return; }
    appState.transport = Array.isArray(appState.transport) ? appState.transport : [];
    appState.customMeals = Array.isArray(appState.customMeals) ? appState.customMeals : [];
    appState.dailyCash = appState.dailyCash || 0;
    appState.mealsPerDay = appState.mealsPerDay || 3;
    if (!appState.profile) { // unang login: ayusin ang avatar ayon sa gender
        appState.profile = { username: u, nick: rec.nick, gender: rec.gender };
        setAvatarGender(rec.gender);
        updateAvatarName(rec.nick);
        const ni = document.getElementById('avatarNameInput'); if (ni) ni.value = rec.nick;
    }
    saveState();
    renderDaily();
    switchMainTab('daily');
});
