// ==========================================
// LANGUAGE: Tagalog (default) <-> English. Dictionary-based, gumagana din sa dynamic text.
// ==========================================
let LANG = 'tl';
try { LANG = (JSON.parse(localStorage.getItem('tipidwheel_prefs')) || {}).lang || 'tl'; } catch (e) {}

const EN = [
 // nav / header
 ["Smart Tipid", "Smart Budget"], ["Ngayong Araw", "Today"], ["History", "History"], ["👛 Pera ko ngayon", "👛 My money today"], ["Hindi pa set", "Not set"],
 ["Pera mo ngayon", "Your money today"], ["👛 Pera mo ngayon", "👛 Your money today"], ["Logout", "Log out"],
 // auth
 ["Mag-Register", "Register"], ["Mag-Login", "Log in"], ["May account na? Mag-login", "Already have an account? Log in"], ["Wala pang account? Mag-register", "No account yet? Register"],
 ["Palayaw mo (optional)", "Nickname (optional)"], ["Lalaki", "Male"], ["Babae", "Female"], ["Ang account ay naka-save sa phone/browser na ito lang.", "Your account is saved on this phone/browser only."],
 ["Welcome back! Tuloy ang pag-iipon.", "Welcome back! Keep saving."], ["Gumawa ng account para sa sarili mong ipon at budget.", "Create an account for your own savings and budget."],
 ["Username: 3-20 letters/numbers lang.", "Username: 3-20 letters/numbers only."], ["Password: at least 4 characters.", "Password: at least 4 characters."],
 ["Piliin kung lalaki o babae.", "Pick male or female."], ["May gumagamit na ng username na yan.", "That username is already taken."], ["Mali ang username o password.", "Wrong username or password."],
 ["Kumusta, {}! 👋", "Hi, $1! 👋"],
 // today
 ["Cash na dala mo ngayon (₱)", "Cash you carry today (₱)"], ["- galing sa Smart Tipid", "- from Smart Budget"], ["I-set", "Set"],
 ["Target ipon ngayong araw (₱)", "Savings target today (₱)"], ["- sa pagkain kukunin, hindi sa pamasahe", "- taken from food, not fares"], ["Blanko = 20% ng cash", "Blank = 20% of cash"],
 ["1 kain", "1 meal"], ["2 kain", "2 meals"], ["3 kain", "3 meals"], ["4 kain", "4 meals"],
 ["Galing sa Smart Tipid: {} ang natitira (mga {}/araw).", "From Smart Budget: $1 left (about $2/day)."], ["Gamitin ang {}", "Use $1"],
 ["Wala pang plan sa Smart Tipid. Gumawa muna roon, dahil doon kinukuha ang pera mo.", "No Smart Budget plan yet. Create one there first, since your money comes from it."],
 ["{} cash − pamasahe − nakain/gastos", "$1 cash − fares − meals/expenses"], ["I-set muna ang cash mo sa taas.", "Set your cash above first."],
 ["💰 Target ipon", "💰 Savings target"], ["🚌 Pamasahe", "🚌 Fare"], ["🍽️ Pagkain (natira)", "🍽️ Food (left)"],
 ["Masyadong malaki ang target ipon. Ibinaba sa {} para hindi galawin ang pamasahe.", "Savings target is too big. Lowered to $1 so fares stay covered."],
 ["Nakain / nagastos ngayon", "Eaten / spent today"], ["🍽️ Kumain ako! Saan at magkano?", "🍽️ I ate! Where and how much?"], ["Saan? (e.g. Jollibee)", "Where? (e.g. Jollibee)"], ["Itala", "Log"],
 ["Iba pang gastos (load, tubig...)", "Other expenses (load, water...)"], ["🐷 Ilagay sa Vault ang natira ({})", "🐷 Move leftover to Vault ($1)"],
 ["🚌 Pamasahe ngayon", "🚌 Fares today"], ["Wala pang naitalang pamasahe ngayong araw.", "No fares logged today."], ["Saan galing/papunta? (optional)", "From/to where? (optional)"], ["₱ presyo", "₱ price"],
 ["🍽️ Saan pwedeng kumain na pasok sa budget?", "🍽️ Where can I eat within budget?"], ["Ilagay muna ang cash mo sa taas.", "Enter your cash above first."],
 ["Natitirang kain: {}x. Kada kain: hanggang", "Meals left: $1x. Per meal: up to"], ["Ayaw ko nito", "Not for me"],
 ["Ubos na ang pang-pagkain mo dahil sa ipon, pamasahe at nakain. Ito ang pinakamura:", "Your food money is used up (savings, fares, meals). Cheapest options:"],
 ["Kulang ang {} kada kain. Pinakamura ang mga ito:", "$1 per meal is not enough. Cheapest options:"],
 ["🎡 Gamitin sa Spin Wheel", "🎡 Use in Spin Wheel"], ["↺ Ibalik ang mga tinago kong suggestion", "↺ Restore my hidden suggestions"],
 ["Tantyang presyo lang ito at pwedeng iba sa branch o promo. Idagdag ang sarili mong kainan at presyo:", "Prices are estimates and may differ by branch or promo. Add your own place and price:"], ["Pangalan ng kainan/meal", "Place/meal name"],
 // today toasts
 ["Maglagay ng valid na cash (₱).", "Enter a valid cash amount (₱)."], ["Na-set na ang budget mo ngayong araw!", "Today’s budget is set!"], ["Ilagay ang presyo ng pamasahe.", "Enter the fare."], ["Naitala: {} pamasahe.", "Logged: $1 fare."],
 ["Ilagay ang halaga.", "Enter the amount."], ["Nasa Vault na ito. Kunin mo sa Vault tab kung kailangan.", "This is already in the Vault. Take it from the Vault tab if needed."],
 ["Nilagay sa Vault ang natira: {} 🐷", "Moved the leftover to the Vault: $1 🐷"], ["Ilagay ang presyo ng kakainin mo.", "Enter the price of your meal."], ["I-set muna ang cash mo sa tab na Ngayong Araw.", "Set your cash in the Today tab first."],
 ["Lampas sa pera mo!", "Over your money!"], ["{} ang presyo pero {} na lang ang pera mo ngayon. Tuloy pa rin?", "It costs $1 but you only have $2 left today. Continue anyway?"],
 ["{} ang kinain mo pero {} na lang ang pera mo ngayon. Itala pa rin?", "You ate $1 but only $2 is left today. Log it anyway?"], ["Tuloy", "Continue"], ["Hindi muna", "Not yet"],
 ["Go! −{} para sa {}. Natira: {}", "Go! −$1 for $2. Left: $3"], ["Naitala: {} −{}. Natira: {}", "Logged: $1 −$2. Left: $3"], ["Ilagay ang pangalan at presyo.", "Enter the name and price."],
 ["Nilagay sa Spin Wheel ang mga pasok sa budget!", "Added the in-budget picks to the Spin Wheel!"], ["Ilagay kung saan ka kumain at magkano.", "Enter where you ate and how much."],
 ["Nilagay ang pang-araw mula sa Smart Tipid. Pindutin ang I-set.", "Filled in the daily allowance from Smart Budget. Tap Set."], ["May natira kang {} kahapon. I-set ulit ang cash mo ngayon.", "You had $1 left yesterday. Set your cash again today."],
 // wheel
 ["Naka-desisyon na ang Wheel!", "The wheel has decided!"], ["Magkano ang kakainin mo? (pwedeng baguhin)", "How much will you pay? (editable)"], ["❌ No, spin ulit", "❌ No, spin again"], ["✅ GO! Kain na", "✅ GO! Let’s eat"],
 ["Tipid Tip: Sakto ang food budget mo! Stick to solo meals para may matira pa.", "Tip: your food budget is just right! Stick to solo meals to have some left."],
 ["Nanalo ang {}! Pera mo ngayon: {}. Pasok sa kada kain: hanggang {}. Go o No?", "$1 won! Money today: $2. Per-meal limit: up to $3. Go or No?"],
 ["Nanalo ang {}! I-set muna ang cash mo sa Ngayong Araw para ma-bawas ito. Go o No?", "$1 won! Set your cash in Today first so it can be deducted. Go or No?"],
 ["Hirap pumili ng kakainin? I-Spin na!", "Can’t decide what to eat? Spin it!"], ["Magdagdag (e.g. Mang Inasal, Samgyup, Lugaw)...", "Add (e.g. Mang Inasal, Samgyup, Lugaw)..."],
 ["Magdagdag ng kahit 2 choices para makapag-spin!", "Add at least 2 choices to spin!"], [`Nadagdag ang "{}" sa wheel!`, `Added "$1" to the wheel!`], [`Nasa wheel na ang "{}"!`, `"$1" is already on the wheel!`],
 ["Kailangan ng at least 2 choices sa wheel.", "You need at least 2 choices on the wheel."], ["Remaining sa kain", "Remaining for food"],
 // smart budget
 ["Magkano ang pera mo ngayon?", "How much money do you have now?"], ["I-Auto Budget & Mag-Save Na!", "Auto Budget & Save Now!"], ["Isang Araw (Daily)", "One Day (Daily)"],
 ["Awtomatikong itinabi ng system para hindi mo magastos!", "Automatically set aside so you won’t spend it!"], ["Tipid Coach Advice para sa'yo:", "Tipid Coach advice for you:"],
 ["Ipon Goals (40% Needs / 20% Food / 40% Save)", "Savings Goals (40% Needs / 20% Food / 40% Save)"], ["Petsa de Peligro (60% Needs / 25% Food / 15% Save)", "Pre-Payday Survival (60% Needs / 25% Food / 15% Save)"],
 ["Maglagay muna ng valid na halaga ng pera (₱)!", "Enter a valid amount of money (₱) first!"], ["Auto-budget ready! Itinabi ang {} sa vault.", "Auto-budget ready! Set aside $1 for savings."],
 ["Mag-set muna ng budget sa kabila para malaman natin kung pang-Value Meal o Feast ka ngayon!", "Set a budget on the other tab to see if you’re on Value Meal or Feast mode today!"],
 ["Ubos na ang food budget mo! Stick to home-cooked meals muna o i-check ang Active Reminder.", "Your food budget is used up! Stick to home-cooked meals or check your Active Reminder."],
 ["Nabawasan ng {} ang food budget.", "Food budget reduced by $1."], ["Ilagay ang halaga ng nagastos sa pagkain.", "Enter the amount spent on food."],
 // vault
 ["Ipon mo sa Vault", "Your savings in the Vault"], ["Magkano?", "How much?"], ["Para saan? (optional)", "What for? (optional)"], ["🪙 Ilagay sa Vault", "🪙 Put in Vault"], ["🔒 Kuha", "🔒 Take"],
 ["Kasaysayan", "History"], ["Wala pang laman. Ilagay ang unang ipon mo!", "Empty so far. Add your first savings!"], ["Ipon", "Savings"], ["Kinuha", "Taken"], ["Natira ngayong araw", "Leftover today"],
 ["Pang-araw (galing Vault)", "Daily (from Vault)"], ["Pang-budget (galing Vault)", "Budget (from Vault)"],
 ["Sigurado ka ba?", "Are you sure?"], ["Kukunin mo ang {} sa ipon mo. Matitira sa Vault: {}. Para sa ipon ang Vault, kaya pag-isipan muna.", "You are taking $1 from your savings. The Vault will have $2 left. The Vault is for saving, so think twice."],
 ["Oo, kukunin ko", "Yes, take it"], ["Huwag muna", "Not now"], ["Ilagay kung magkano ang ilalagay sa Vault.", "Enter how much to put in the Vault."], ["Naipon! +{} sa Vault 🐷", "Saved! +$1 in the Vault 🐷"],
 ["Ilagay kung magkano ang kukunin.", "Enter how much to take."], ["Ang laman lang ng Vault ay {}.", "The Vault only has $1."], ["Kinuha ang {} sa Vault.", "Took $1 from the Vault."],
 ["Galing ba sa Vault?", "Is it from the Vault?"], ["Galing ba sa Vault ({}) ang {}? Kapag Oo, awtomatiko itong ibabawas sa ipon mo. Kung bigay lang ito ng iba, piliin ang Hindi.", "Is the $2 from your Vault ($1)? If yes, it is deducted from your savings automatically. If someone just gave it to you, choose No."],
 ["Oo, ibawas sa Vault", "Yes, deduct from Vault"], ["Hindi, galing sa iba", "No, from someone else"], ["Kulang ang laman ng Vault para diyan.", "The Vault does not have enough for that."], ["Hindi", "No"], ["Oo", "Yes"],
 // history
 ["Kasaysayan ng Gastos", "Spending History"], ["Ngayon", "Today"], ["7 araw", "7 days"], ["Lahat", "All"], ["Pagkain", "Food"], ["Pamasahe", "Fares"], ["Iba pa", "Other"], ["Gastos", "Spent"],
 ["Wala pang naitala.", "Nothing logged yet."], ["Gastos (hindi kasama ang Vault)", "Spending (Vault not included)"],
];

const _exact = new Map(), _pat = [];
EN.forEach(([tl, en]) => {
    if (!tl.includes('{}')) _exact.set(tl, en);
    else _pat.push([new RegExp('^' + tl.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\}/g, '(.+?)') + '$'), en]);
});
function toEnglish(s) {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
    if (!core) return s;
    if (_exact.has(core)) return m[1] + _exact.get(core) + m[3];
    for (const [re, en] of _pat) if (re.test(core)) return m[1] + core.replace(re, en) + m[3];
    return s;
}

const _tn = new WeakMap(), _at = new WeakMap(), ATTRS = ['placeholder', 'title', 'aria-label'];
function procText(n) {
    const v = n.nodeValue, r = _tn.get(n);
    if (r && v === r.out) { if (LANG === 'tl') { n.nodeValue = r.orig; r.out = r.orig; } return; }
    const orig = v, out = LANG === 'en' ? toEnglish(orig) : orig;
    _tn.set(n, { orig, out });
    if (out !== v) n.nodeValue = out;
}
function procAttrs(el) {
    ATTRS.forEach(a => {
        if (!el.hasAttribute || !el.hasAttribute(a)) return;
        const rec = _at.get(el) || {}, v = el.getAttribute(a), r = rec[a];
        if (r && v === r.out) { if (LANG === 'tl') { el.setAttribute(a, r.orig); r.out = r.orig; } return; }
        const out = LANG === 'en' ? toEnglish(v) : v;
        rec[a] = { orig: v, out }; _at.set(el, rec);
        if (out !== v) el.setAttribute(a, out);
    });
}
function procTree(root) {
    if (root.nodeType === 3) { procText(root); return; }
    if (root.nodeType !== 1 || ['SCRIPT', 'STYLE'].includes(root.tagName)) return;
    procAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === 3) { if (n.parentNode && !['SCRIPT', 'STYLE'].includes(n.parentNode.tagName)) procText(n); } else procAttrs(n);
    }
}

function setLang(l) {
    LANG = l; document.documentElement.lang = l === 'en' ? 'en' : 'tl';
    if (typeof savePrefs === 'function') savePrefs();
    document.querySelectorAll('.lang-label').forEach(b => b.textContent = l === 'en' ? '🌐 EN' : '🌐 TL');
    procTree(document.body);
    if (typeof renderHistory === 'function') renderHistory();
}
function toggleLang() { setLang(LANG === 'en' ? 'tl' : 'en'); }

new MutationObserver(ms => ms.forEach(m => {
    if (m.type === 'characterData') procText(m.target);
    else m.addedNodes.forEach(procTree);
})).observe(document.body, { childList: true, characterData: true, subtree: true });
setLang(LANG);
