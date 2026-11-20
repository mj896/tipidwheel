// ==========================================
// HISTORY NG GASTOS (pagkain, pamasahe, iba pa + galaw ng Vault)
// ==========================================
let histFilter = 'all';
function setHistFilter(f) { histFilter = f; renderHistory(); }

function historyItems() {
    const ts = id => Number(String(id).split('_')[1]) || 0, it = [];
    appState.dailySpends.forEach(x => { if (x.kind !== 'vault') it.push({ date: x.date, note: x.note, amount: x.amount, kind: x.kind, ts: ts(x.id) }); });
    (appState.transport || []).forEach(t => it.push({ date: t.date, note: t.type + (t.note ? ' · ' + t.note : ''), amount: t.price, kind: 'fare', ts: ts(t.id) }));
    appState.vault.history.forEach(v => it.push({ date: formatDateISO(new Date(v.at)), note: v.note || (v.type === 'in' ? 'Ipon' : 'Kinuha'), amount: v.amount, kind: v.type === 'in' ? 'vin' : 'vout', ts: new Date(v.at).getTime() }));
    return it;
}

function renderHistory() {
    const box = document.getElementById('historyList'); if (!box || !appState.vault) return;
    const all = historyItems(), spend = ['food', 'fare', 'other'], today = formatDateISO(new Date());
    const wk = formatDateISO(new Date(Date.now() - 6 * 864e5));
    const sum = f => all.filter(x => spend.includes(x.kind) && f(x)).reduce((s, x) => s + x.amount, 0);
    document.getElementById('histSummary').innerHTML = [['Ngayon', sum(x => x.date === today)], ['7 araw', sum(x => x.date >= wk)], ['Lahat', sum(() => true)]]
        .map(([l, v]) => `<div class="rounded-2xl p-3 bg-slate-50 dark:bg-slate-800 text-center"><div class="text-[10px] font-bold text-slate-500 dark:text-slate-400">${l}</div><div class="text-sm font-extrabold text-amber-600 dark:text-amber-400">${formatPeso(v)}</div></div>`).join('');
    document.getElementById('histFilters').innerHTML = [['all', 'Lahat'], ['food', 'Pagkain'], ['fare', 'Pamasahe'], ['other', 'Iba pa'], ['vault', 'Vault']]
        .map(([k, l]) => `<button onclick="setHistFilter('${k}')" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${histFilter === k ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}">${l}</button>`).join('');
    const list = all.filter(x => histFilter === 'all' || (histFilter === 'vault' ? x.kind[0] === 'v' : x.kind === histFilter)).sort((a, b) => b.ts - a.ts);
    if (!list.length) { box.innerHTML = '<p class="text-xs text-slate-400">Wala pang naitala.</p>'; return; }
    const days = {}; list.forEach(x => (days[x.date] = days[x.date] || []).push(x));
    const ICON = { food: '🍽️', fare: '🚌', other: '💸', vin: '🟢', vout: '🔴' };
    box.innerHTML = Object.keys(days).sort().reverse().map(d => {
        const tot = days[d].filter(x => spend.includes(x.kind)).reduce((s, x) => s + x.amount, 0);
        const label = d === today ? 'Ngayon' : new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div class="mb-4"><div class="flex justify-between items-center text-xs font-extrabold mb-1"><span>${label}</span>${tot ? `<span class="text-amber-600 dark:text-amber-400"><span>Gastos</span> ${formatPeso(tot)}</span>` : ''}</div>` +
            days[d].map(x => `<div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm"><span class="min-w-0 truncate">${ICON[x.kind]} ${escapeHtml(x.note)}</span>
            <b class="shrink-0 ${x.kind === 'vin' ? 'text-emerald-600 dark:text-emerald-400' : x.kind === 'vout' ? 'text-rose-500' : ''}">${x.kind === 'vin' ? '+' : '−'}${formatPeso(x.amount)}</b></div>`).join('') + '</div>';
    }).join('');
}
