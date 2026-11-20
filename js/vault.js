// ==========================================
// VAULT (PIGGY BANK), CONFIRM MODAL, PERA MONITOR
// ==========================================
let _confirmResolve = null, shownBal = 0;

function askConfirm({ title, msg, yes = 'Oo', no = 'Hindi', tone = 'info' }) {
    return new Promise(res => {
        if (_confirmResolve) _confirmResolve(false);
        _confirmResolve = res;
        const $ = id => document.getElementById(id);
        $('confirmTitle').textContent = title; $('confirmMsg').textContent = msg;
        $('confirmYes').textContent = yes; $('confirmNo').textContent = no;
        $('confirmYes').className = 'flex-1 py-3 rounded-xl text-white text-sm font-bold ' + (tone === 'danger' ? 'bg-rose-600' : 'bg-emerald-600');
        $('confirmIcon').textContent = tone === 'danger' ? '🥺' : '🐷';
        $('confirmModal').classList.remove('hidden'); $('confirmModal').classList.add('flex');
        $('confirmNo').focus(); // ligtas na option ang naka-focus
    });
}
function closeConfirm(ans) {
    const m = document.getElementById('confirmModal');
    m.classList.add('hidden'); m.classList.remove('flex');
    if (_confirmResolve) { _confirmResolve(ans); _confirmResolve = null; }
}

function vaultMove(type, amount, note) {
    const v = appState.vault;
    v.balance = Math.max(0, +(v.balance + (type === 'in' ? amount : -amount)).toFixed(2));
    v.history.unshift({ id: 'v_' + Date.now(), type, amount, note: note || '', at: new Date().toISOString() });
    v.history = v.history.slice(0, 100);
    saveState(); renderVault(); animatePig(type, amount);
}

const vaultInputs = () => [parseFloat(document.getElementById('vaultAmount').value), document.getElementById('vaultNote').value.trim()];
function setVaultAmt(n) { document.getElementById('vaultAmount').value = n; }
function clearVaultInputs() { document.getElementById('vaultAmount').value = ''; document.getElementById('vaultNote').value = ''; }

function vaultDeposit() {
    const [amt, note] = vaultInputs();
    if (!(amt > 0)) { showToast('Ilagay kung magkano ang ilalagay sa Vault.', 'error'); return; }
    vaultMove('in', amt, note || 'Ipon'); clearVaultInputs();
    showToast(`Naipon! +${formatPeso(amt)} sa Vault 🐷`, 'success');
}

async function vaultWithdraw() {
    const [amt, note] = vaultInputs();
    if (!(amt > 0)) { showToast('Ilagay kung magkano ang kukunin.', 'error'); return; }
    if (amt > appState.vault.balance) { showToast(`Ang laman lang ng Vault ay ${formatPeso(appState.vault.balance)}.`, 'error'); return; }
    const ok = await askConfirm({
        title: 'Sigurado ka ba?',
        msg: `Kukunin mo ang ${formatPeso(amt)} sa ipon mo. Matitira sa Vault: ${formatPeso(appState.vault.balance - amt)}. Para sa ipon ang Vault, kaya pag-isipan muna.`,
        yes: 'Oo, kukunin ko', no: 'Huwag muna', tone: 'danger'
    });
    if (!ok) return;
    vaultMove('out', amt, note || 'Kinuha'); clearVaultInputs();
    showToast(`Kinuha ang ${formatPeso(amt)} sa Vault.`, 'info');
}

function tweenBalance(to) {
    const el = document.getElementById('vaultBalance'); if (!el) return;
    const from = shownBal, t0 = performance.now(); shownBal = to;
    const step = now => {
        const t = Math.min(1, (now - t0) / 900);
        el.textContent = formatPeso(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function animatePig(type, amount) {
    const w = document.getElementById('pigWrap'), pig = document.getElementById('pigSvg');
    if (!w || !pig || w.offsetParent === null) return;
    const n = Math.min(6, Math.max(1, Math.ceil(amount / 100)));
    for (let i = 0; i < n; i++) {
        const c = document.createElement('div');
        c.className = 'pig-coin ' + (type === 'in' ? 'coin-in' : 'coin-out');
        c.style.animationDelay = (i * 150) + 'ms';
        c.style.setProperty('--dx', ((i % 2 ? 1 : -1) * (30 + i * 14)) + 'px');
        c.textContent = '₱'; w.appendChild(c);
        setTimeout(() => c.remove(), 1600 + i * 150);
    }
    setTimeout(() => {
        pig.classList.remove('pig-jiggle', 'pig-shake'); void pig.getBoundingClientRect();
        pig.classList.add(type === 'in' ? 'pig-jiggle' : 'pig-shake');
        if (type === 'in' && typeof confetti === 'function') confetti({ particleCount: 28, spread: 55, origin: { y: 0.45 }, colors: ['#f59e0b', '#fbbf24', '#f472b6', '#10b981'] });
    }, type === 'in' ? 550 + (n - 1) * 150 : 0);
}

function renderVault() {
    tweenBalance(appState.vault.balance);
    const h = appState.vault.history, box = document.getElementById('vaultHistory');
    if (!box) return;
    box.innerHTML = h.length ? h.slice(0, 20).map(x => `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
            <span class="min-w-0 truncate">${x.type === 'in' ? '🟢' : '🔴'} ${escapeHtml(x.note || (x.type === 'in' ? 'Ipon' : 'Kinuha'))}
                <span class="text-[11px] text-slate-400">${new Date(x.at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span></span>
            <b class="${x.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}">${x.type === 'in' ? '+' : '−'}${formatPeso(x.amount)}</b>
        </div>`).join('') : '<p class="text-xs text-slate-400">Wala pang laman. Ilagay ang unang ipon mo!</p>';
}

// Pera ko ngayon + Vault (laging nakikita sa header)
function renderMonitor() {
    const a = document.getElementById('monNow'), b = document.getElementById('monVault');
    if (!a || !b || !appState.vault) return;
    const now = moneyNow(), set = isDailySet();
    a.textContent = set ? formatPeso(now) : 'Hindi pa set';
    a.className = 'font-extrabold ' + (set && now < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400');
    b.textContent = formatPeso(appState.vault.balance);
}

// Wheel: lagyan ng presyo at update ng advice kapag lumabas ang winner
const _showWinnerBase = window.showWinnerModal;
window.showWinnerModal = function (winner) {
    _showWinnerBase(winner);
    const all = [...MEALS.map(m => ({ name: m[0], price: m[1] })), ...appState.customMeals];
    const known = appState.mealPrices[winner] ?? (all.find(m => m.name === winner) || {}).price;
    document.getElementById('modalDeductInput').value = known || '';
    const d = calcDaily();
    document.getElementById('winnerBudgetAdvice').textContent = d.set
        ? `Nanalo ang ${winner}! Pera mo ngayon: ${formatPeso(d.now)}. Pasok sa kada kain: hanggang ${formatPeso(Math.max(0, d.per))}. Go o No?`
        : `Nanalo ang ${winner}! I-set muna ang cash mo sa Ngayong Araw para ma-bawas ito. Go o No?`;
};
