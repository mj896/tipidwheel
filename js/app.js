        // ==========================================
        // 1. STATE & DEFAULT DATA
        // ==========================================
        const DEFAULT_FOODS = [
            "Jollibee",
            "McDonald's",
            "Chowking",
            "Mang Inasal",
            "KFC",
            "Greenwich",
            "Potato Corner",
            "Siomai House"
        ];

        // Vibrant, harmonious color palette for wheel slices
        const WHEEL_COLORS = [
            "#EF4444", // Red (Jollibee vibes)
            "#F59E0B", // Amber (McDo vibes)
            "#10B981", // Emerald
            "#3B82F6", // Blue
            "#8B5CF6", // Violet
            "#EC4899", // Pink
            "#14B8A6", // Teal
            "#F97316", // Orange
            "#6366F1", // Indigo
            "#84CC16"  // Lime
        ];

        let appState = {
            totalMoney: 0,
            days: 7,
            strategy: 'balanced',
            savedAmount: 0,
            needsAmount: 0,
            foodInitialBudget: 0,
            foodSpent: 0,
            expenses: [], // { note, cost }
            foods: [...DEFAULT_FOODS],
            soundEnabled: true,
            darkMode: false,
            // New Feature 1: Custom Reminders ("Tol wag muna...")
            reminders: [
                "Tol wag muna, may ipon goals ka pa! Tiis-tiis muna sa budol.",
                "Iwas impulse buying bro, isipin mo yung future savings mo!",
                "May pagkain pa sa bahay, wag muna mag-food delivery!"
            ],
            activeReminderIndex: 0,
            // New Feature 2: Events Calendar
            events: [], // { id, dateStr: 'YYYY-MM-DD', title, category, budget }
            // New Feature 3: Personal Avatar Customization
            avatar: {
                gender: "male",          // 'male' or 'female'
                name: "Boss Tipid",
                hairStyle: "taper",      // male: taper, crop, curtain, buzz, spiky, wolf | female: longstraight, bob, ponytail, twinbuns, wavy, pixie
                hairColor: "#1e1b18",
                outfit: "hoodie",        // hoodie, oversized, polo, jersey, sando, blouse, dress
                outfitColor: "#10b981",
                skinTone: "#e0ac69",
                accessory: "none"        // none, glasses, headphones, cap, ribbon
            },
            // New Feature 4: My Toy Collection Vault
            toys: [], // { id, name, category, price, notes, photoDataUrl, addedAt }
            vault: { balance: 0, history: [] }, // piggy bank
            dailySpends: [], planStart: '', dailyGoal: 0, dailyDate: '', mealPrices: {}, hiddenMeals: []
        };

        // Temporary holder for uploaded compressed photo DataURL
        let pendingToyPhotoDataUrl = "";

        let STATE_KEY = 'tipidwheel_state_v1';
        try { const su = localStorage.getItem('tipidwheel_session'); if (su) STATE_KEY = 'tipidwheel_state_u_' + su; } catch (e) {}

        function saveState() {
            try {
                localStorage.setItem(STATE_KEY, JSON.stringify(appState));
                if (typeof renderMonitor === 'function') renderMonitor();
            } catch (err) {
                console.warn('Could not save state to localStorage:', err);
            }
        }

        function loadState() {
            try {
                const raw = localStorage.getItem(STATE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    appState = {
                        ...appState,
                        ...parsed,
                        avatar: { ...appState.avatar, ...(parsed.avatar || {}) },
                        foods: Array.isArray(parsed.foods) && parsed.foods.length > 0 ? parsed.foods : [...DEFAULT_FOODS],
                        reminders: Array.isArray(parsed.reminders) && parsed.reminders.length > 0 ? parsed.reminders : appState.reminders,
                        events: Array.isArray(parsed.events) ? parsed.events : [],
                        toys: Array.isArray(parsed.toys) ? parsed.toys : [],
                        vault: { balance: Number(parsed.vault?.balance) || 0, history: Array.isArray(parsed.vault?.history) ? parsed.vault.history : [] },
                        dailySpends: Array.isArray(parsed.dailySpends) ? parsed.dailySpends : [],
                        mealPrices: parsed.mealPrices && typeof parsed.mealPrices === 'object' ? parsed.mealPrices : {},
                        hiddenMeals: Array.isArray(parsed.hiddenMeals) ? parsed.hiddenMeals : []
                    };
                }
            } catch (err) {
                console.warn('Could not load saved state:', err);
            }
        }

        function formatPeso(amount) {
            const num = Number(amount) || 0;
            return '₱' + num.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function formatDateISO(dateObj) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function setQuickMoney(amount) {
            const input = document.getElementById('moneyInput');
            if (input) {
                input.value = amount;
                generateSmartPlan();
            }
        }

        async function generateSmartPlan() {
            const input = document.getElementById('moneyInput');
            const rawVal = parseFloat(input?.value);
            if (isNaN(rawVal) || rawVal <= 0) {
                showToast("Maglagay muna ng valid na halaga ng pera (₱)!", "error");
                return;
            }

            // Galing ba sa Vault ang perang inilagay? (idadagdag lang ang tinanong kung dagdag sa dating total)
            const added = rawVal - (appState.totalMoney || 0), vBal = appState.vault.balance;
            if (added > 0 && vBal > 0) {
                const fromVault = await askConfirm({
                    title: 'Galing ba sa Vault?',
                    msg: `Galing ba sa Vault (${formatPeso(vBal)}) ang ${formatPeso(added)}? Kapag Oo, awtomatiko itong ibabawas sa ipon mo. Kung bigay lang ito ng iba, piliin ang Hindi.`,
                    yes: 'Oo, ibawas sa Vault', no: 'Hindi, galing sa iba'
                });
                if (fromVault) {
                    if (added > vBal) { showToast('Kulang ang laman ng Vault para diyan.', 'error'); return; }
                    vaultMove('out', added, 'Pang-budget (galing Vault)');
                }
            }

            const days = parseInt(document.getElementById('timeframeSelect')?.value || '7', 10);
            const strategy = document.getElementById('strategySelect')?.value || 'balanced';

            let saveRatio = 0.20;
            let needsRatio = 0.50;
            let foodRatio = 0.30;

            if (strategy === 'aggressive') {
                saveRatio = 0.40;
                needsRatio = 0.40;
                foodRatio = 0.20;
            } else if (strategy === 'survival') {
                saveRatio = 0.15;
                needsRatio = 0.60;
                foodRatio = 0.25;
            }

            appState.totalMoney = rawVal;
            appState.days = days;
            appState.strategy = strategy;
            appState.savedAmount = rawVal * saveRatio;
            appState.needsAmount = rawVal * needsRatio;
            appState.foodInitialBudget = rawVal * foodRatio;
            appState.foodSpent = 0;
            appState.expenses = [];
            appState.planStart = formatDateISO(new Date());

            saveState();
            renderAll();
            showToast(`Auto-budget ready! Itinabi ang ${formatPeso(appState.savedAmount)} sa vault.`, "success");
        }

        function logFoodExpense() {
            const noteInput = document.getElementById('expenseNoteInput');
            const costInput = document.getElementById('expenseCostInput');
            const cost = parseFloat(costInput?.value);

            if (isNaN(cost) || cost <= 0) {
                showToast("Ilagay ang halaga ng nagastos sa pagkain.", "error");
                return;
            }

            const note = (noteInput?.value || "").trim() || "Food / Cravings";
            appState.expenses.unshift({ note, cost });
            appState.foodSpent += cost;

            if (noteInput) noteInput.value = "";
            if (costInput) costInput.value = "";

            saveState();
            renderBudgetUI();
            showToast(`Nabawasan ng ${formatPeso(cost)} ang food budget.`, "info");
        }

        // Gastos mula sa "Ngayong Araw" na kasama sa Smart Tipid (mula nang ginawa ang plan)
        function dailySynced() {
            const from = appState.planStart || '', ok = x => x.date >= from;
            const foodItems = (appState.dailySpends || []).filter(x => x.kind === 'food' && ok(x)).map(x => ({ note: x.note, cost: x.amount }));
            const sum = a => a.reduce((s, x) => s + (x.amount ?? x.price ?? 0), 0);
            const needs = sum((appState.dailySpends || []).filter(x => x.kind === 'other' && ok(x))) + sum((appState.transport || []).filter(ok));
            return { foodItems, food: foodItems.reduce((s, x) => s + x.cost, 0), needs };
        }
        const foodSpentAll = () => (appState.foodSpent || 0) + dailySynced().food;

        function renderBudgetUI() {
            const strategy = appState.strategy || 'balanced';
            let savePct = 20, needsPct = 50, foodPct = 30;
            if (strategy === 'aggressive') { savePct = 40; needsPct = 40; foodPct = 20; }
            else if (strategy === 'survival') { savePct = 15; needsPct = 60; foodPct = 25; }

            document.getElementById('needsPct').textContent = `${needsPct}%`;
            document.getElementById('foodPct').textContent = `${foodPct}%`;
            document.getElementById('savePct').textContent = `${savePct}%`;

            document.getElementById('autoSavedAmount').textContent = formatPeso(appState.savedAmount);
            document.getElementById('saveAmountCard').textContent = formatPeso(appState.savedAmount);
            document.getElementById('needsAmount').textContent = formatPeso(Math.max(0, (appState.needsAmount || 0) - dailySynced().needs));

            const foodRemaining = Math.max(0, (appState.foodInitialBudget || 0) - foodSpentAll());
            document.getElementById('foodRemainingAmount').textContent = formatPeso(foodRemaining);
            document.getElementById('foodTotalSub').textContent = `of ${formatPeso(appState.foodInitialBudget)} food budget`;
            document.getElementById('wheelBudgetDisplay').textContent = formatPeso(foodRemaining);

            const days = appState.days || 7;
            const spendablePool = Math.max(0, (appState.needsAmount || 0) - dailySynced().needs) + foodRemaining;
            const dailyAvg = spendablePool / days;
            document.getElementById('dailyAllowanceBadge').textContent = `${formatPeso(dailyAvg)} / araw (${days}d)`;

            const pctLeft = appState.foodInitialBudget > 0
                ? Math.max(0, Math.min(100, (foodRemaining / appState.foodInitialBudget) * 100))
                : 0;
            document.getElementById('foodProgressBar').style.width = `${pctLeft}%`;
            document.getElementById('foodProgressText').textContent = `${formatPeso(foodRemaining)} / ${formatPeso(appState.foodInitialBudget)} left`;

            // Meal tier banner on wheel
            const mealTierText = document.getElementById('mealTierText');
            if (appState.foodInitialBudget <= 0) {
                mealTierText.textContent = "Mag-set muna ng budget sa Smart Tipid para malaman kung pang-Value Meal o Feast ka ngayon!";
            } else if (foodRemaining <= 0) {
                mealTierText.textContent = "Ubos na ang food budget mo! Stick to home-cooked meals muna o i-check ang Active Reminder.";
            } else if (foodRemaining < 150) {
                mealTierText.textContent = "Value Meal Mode: Sakto sa budget meals, snacks, o street food/siomai.";
            } else if (foodRemaining < 500) {
                mealTierText.textContent = "Solo Combo Mode: Pasok ang fast-food combo meals—iwasan lang ang sobrang add-ons.";
            } else {
                mealTierText.textContent = "Comfortable Food Budget: May budget ka pa for meals, pero keep saving!";
            }

            // Recent expenses list
            const expContainer = document.getElementById('expenseHistoryList');
            if (expContainer) {
                expContainer.innerHTML = [...dailySynced().foodItems, ...appState.expenses].slice(0, 6).map(item => `
                    <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        ${escapeHtml(item.note)}: -${formatPeso(item.cost)}
                    </span>
                `).join('');
            }

            // Tipid coach advice
            const tipsList = document.getElementById('tipidTipsList');
            if (tipsList) {
                if (appState.totalMoney <= 0) {
                    tipsList.innerHTML = `<li>• Ilagay ang pera mo sa itaas para makagawa ako ng personalized tipid plan!</li>`;
                } else {
                    const tips = [
                        `• Itinabi na agad ang <strong>${formatPeso(appState.savedAmount)}</strong> sa Auto-Saved Vault—huwag galawin unless emergency.`,
                        `• May <strong>${formatPeso(foodRemaining)}</strong> ka pang natitira para sa pagkain sa loob ng <strong>${days} araw</strong>.`,
                        appState.events.length > 0
                            ? `• May <strong>${appState.events.length}</strong> naka-save na event sa calendar mo—maghanda ng budget nang mas maaga.`
                            : `• Puwede mong ilagay ang mga paparating na gala o bayarin sa <strong>Events</strong> tab para hindi mabigla sa gastos.`
                    ];
                    tipsList.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
                }
            }
        }

        // ==========================================
        // WHEEL & FOOD LIST FUNCTIONS
        // ==========================================
        let wheelAngle = 0;
        let isSpinning = false;
        let lastWinner = "";

        function setupResponsiveCanvas() {
            const canvas = document.getElementById('wheelCanvas');
            const wrapper = document.getElementById('wheelWrapper');
            if (!canvas || !wrapper) return;

            const size = Math.max(240, wrapper.clientWidth || 340);
            const dpr = window.devicePixelRatio || 1;
            canvas.width = size * dpr;
            canvas.height = size * dpr;

            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawWheel();
        }

        function drawWheel() {
            const canvas = document.getElementById('wheelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const size = canvas.width / dpr;
            const radius = size / 2;
            const cx = radius;
            const cy = radius;

            ctx.clearRect(0, 0, size, size);

            const foods = appState.foods.length > 0 ? appState.foods : ["Jollibee", "McDonald's"];
            const sliceAngle = (2 * Math.PI) / foods.length;

            foods.forEach((food, i) => {
                const startAngle = wheelAngle + i * sliceAngle;
                const endAngle = startAngle + sliceAngle;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius - 2, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
                ctx.fill();

                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(255,255,255,0.65)";
                ctx.stroke();

                // Slice label
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + sliceAngle / 2);
                ctx.textAlign = "right";
                ctx.fillStyle = "#ffffff";
                ctx.font = `bold ${Math.max(11, Math.min(15, Math.floor(size / 25)))}px Inter, sans-serif`;
                ctx.shadowColor = "rgba(0,0,0,0.4)";
                ctx.shadowBlur = 3;
                const label = food.length > 14 ? food.slice(0, 13) + "…" : food;
                ctx.fillText(label, radius - 18, 4);
                ctx.restore();
            });
        }

        function spinWheel() {
            if (isSpinning) return;
            if (!appState.foods || appState.foods.length < 2) {
                showToast("Magdagdag ng kahit 2 choices para makapag-spin!", "error");
                return;
            }

            isSpinning = true;
            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) spinBtn.disabled = true;

            const extraSpins = (5 + Math.random() * 4) * 2 * Math.PI;
            const randomOffset = Math.random() * 2 * Math.PI;
            const targetAngle = wheelAngle + extraSpins + randomOffset;
            const duration = 3400;
            const startTime = performance.now();
            const startAngle = wheelAngle;

            function animateSpin(now) {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                // Cubic ease-out
                const eased = 1 - Math.pow(1 - t, 3);
                wheelAngle = startAngle + (targetAngle - startAngle) * eased;
                drawWheel();

                if (t < 1) {
                    requestAnimationFrame(animateSpin);
                } else {
                    wheelAngle = wheelAngle % (2 * Math.PI);
                    isSpinning = false;
                    if (spinBtn) spinBtn.disabled = false;
                    determineWinner();
                }
            }

            requestAnimationFrame(animateSpin);
        }

        function determineWinner() {
            const foods = appState.foods;
            const sliceAngle = (2 * Math.PI) / foods.length;
            // Pointer is at top (-90 deg = 3*PI/2 in canvas coords)
            const pointerAngle = (1.5 * Math.PI - wheelAngle) % (2 * Math.PI);
            const normalizedPointer = (pointerAngle + 2 * Math.PI) % (2 * Math.PI);
            const winnerIndex = Math.floor(normalizedPointer / sliceAngle) % foods.length;
            const winner = foods[winnerIndex];
            lastWinner = winner;

            if (typeof confetti === 'function') {
                confetti({ particleCount: 65, spread: 60, origin: { y: 0.65 } });
            }

            showWinnerModal(winner);
        }

        function showWinnerModal(winner) {
            const modal = document.getElementById('winnerModal');
            const card = document.getElementById('winnerModalCard');
            document.getElementById('winnerNameText').textContent = winner;

            const activeNote = appState.reminders[appState.activeReminderIndex] || "Tol wag muna, tipid tayo!";
            document.getElementById('modalTolReminderBox').textContent = `💬 "${activeNote}"`;

            const foodRemaining = Math.max(0, (appState.foodInitialBudget || 0) - foodSpentAll());
            const adviceEl = document.getElementById('winnerBudgetAdvice');
            if (appState.foodInitialBudget <= 0) {
                adviceEl.textContent = `Nanalo ang ${winner}! Mag-set ng budget sa Smart Tipid para ma-track ang gastos mo.`;
            } else {
                adviceEl.textContent = `Nanalo ang ${winner}! May ${formatPeso(foodRemaining)} ka pang food budget—piliin ang sulit na meal.`;
            }

            document.getElementById('modalDeductInput').value = "";
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => {
                card.classList.remove('scale-95', 'opacity-0');
                card.classList.add('scale-100', 'opacity-100');
            });
        }

        function closeWinnerModal() {
            const modal = document.getElementById('winnerModal');
            const card = document.getElementById('winnerModalCard');
            card.classList.remove('scale-100', 'opacity-100');
            card.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 180);
        }

        function deductWinnerExpense() {
            const input = document.getElementById('modalDeductInput');
            const cost = parseFloat(input?.value);
            if (isNaN(cost) || cost <= 0) {
                showToast("Ilagay ang presyo ng kinain mo.", "error");
                return;
            }
            appState.expenses.unshift({ note: lastWinner || "Wheel Meal", cost });
            appState.foodSpent += cost;
            saveState();
            renderBudgetUI();
            closeWinnerModal();
            showToast(`Nabawas ang ${formatPeso(cost)} para sa ${lastWinner}!`, "success");
        }

        function addFoodItem(e) {
            e.preventDefault();
            const input = document.getElementById('newFoodInput');
            const val = (input?.value || "").trim();
            if (!val) return;
            if (appState.foods.some(f => f.toLowerCase() === val.toLowerCase())) {
                showToast(`Nasa wheel na ang "${val}"!`, "info");
                return;
            }
            appState.foods.push(val);
            if (input) input.value = "";
            saveState();
            renderFoodTags();
            drawWheel();
            showToast(`Nadagdag ang "${val}" sa wheel!`, "success");
        }

        function removeFoodItem(index) {
            if (appState.foods.length <= 2) {
                showToast("Kailangan ng at least 2 choices sa wheel.", "error");
                return;
            }
            appState.foods.splice(index, 1);
            saveState();
            renderFoodTags();
            drawWheel();
        }

        function resetDefaultFoods() {
            appState.foods = [...DEFAULT_FOODS];
            saveState();
            renderFoodTags();
            drawWheel();
            showToast("Na-restore ang default fastfood choices.", "success");
        }

        function renderFoodTags() {
            const container = document.getElementById('foodTagsContainer');
            const countEl = document.getElementById('choiceCount');
            if (countEl) countEl.textContent = appState.foods.length;
            if (!container) return;

            container.innerHTML = appState.foods.map((food, idx) => `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                    <span>${escapeHtml(food)}</span>
                    <button type="button" onclick="removeFoodItem(${idx})" class="text-slate-400 hover:text-rose-500 transition" title="Remove">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </span>
            `).join('');
        }

        // ==========================================
        // REMINDERS ("TOL WAG MUNA...") & CALENDAR
        // ==========================================
        function toggleReminderDrawer() {
            const drawer = document.getElementById('reminderManagerDrawer');
            if (drawer) drawer.classList.toggle('hidden');
        }

        function addCustomReminder(e) {
            e.preventDefault();
            const input = document.getElementById('customReminderInput');
            const text = (input?.value || "").trim();
            if (!text) return;
            appState.reminders.unshift(text);
            appState.activeReminderIndex = 0;
            if (input) input.value = "";
            saveState();
            renderReminders();
            showToast("Na-save ang bagong paalala mo!", "success");
        }

        function quickAddReminder(text) {
            appState.reminders.unshift(text);
            appState.activeReminderIndex = 0;
            saveState();
            renderReminders();
            showToast("Naidagdag ang paalala!", "success");
        }

        function cycleReminderMessage() {
            if (!appState.reminders.length) return;
            appState.activeReminderIndex = (appState.activeReminderIndex + 1) % appState.reminders.length;
            saveState();
            renderReminders();
        }

        function selectReminder(idx) {
            appState.activeReminderIndex = idx;
            saveState();
            renderReminders();
        }

        function deleteReminder(idx) {
            if (appState.reminders.length <= 1) {
                showToast("Mag-iwan ng kahit 1 paalala.", "error");
                return;
            }
            appState.reminders.splice(idx, 1);
            appState.activeReminderIndex = 0;
            saveState();
            renderReminders();
        }

        function renderReminders() {
            const bubble = document.getElementById('activeReminderBubbleText');
            const list = document.getElementById('savedRemindersList');
            const current = appState.reminders[appState.activeReminderIndex] || appState.reminders[0] || "Tol wag muna!";
            if (bubble) bubble.textContent = `"${current}"`;

            if (list) {
                list.innerHTML = appState.reminders.map((rem, idx) => {
                    const active = idx === appState.activeReminderIndex;
                    return `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${active
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">
                            <button type="button" onclick="selectReminder(${idx})" class="text-left flex-1 truncate">"${escapeHtml(rem)}"</button>
                            <button type="button" onclick="deleteReminder(${idx})" class="text-slate-400 hover:text-rose-500 px-1" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    `;
                }).join('');
            }
        }

        let currentCalYear = new Date().getFullYear();
        let currentCalMonth = new Date().getMonth();
        let selectedDateStr = formatDateISO(new Date());

        function changeCalendarMonth(delta) {
            currentCalMonth += delta;
            if (currentCalMonth < 0) {
                currentCalMonth = 11;
                currentCalYear--;
            } else if (currentCalMonth > 11) {
                currentCalMonth = 0;
                currentCalYear++;
            }
            renderCalendar();
        }

        function goToTodayCalendar() {
            const now = new Date();
            currentCalYear = now.getFullYear();
            currentCalMonth = now.getMonth();
            selectedDateStr = formatDateISO(now);
            renderCalendar();
        }

        function selectCalendarDate(dateStr) {
            selectedDateStr = dateStr;
            renderCalendar();
        }

        function addCalendarEvent(e) {
            e.preventDefault();
            const titleInput = document.getElementById('eventTitleInput');
            const catSelect = document.getElementById('eventCategorySelect');
            const budgetInput = document.getElementById('eventBudgetInput');

            const title = (titleInput?.value || "").trim();
            if (!title) return;

            appState.events.push({
                id: Date.now().toString(),
                dateStr: selectedDateStr,
                title,
                category: catSelect?.value || 'other',
                budget: parseFloat(budgetInput?.value) || 0
            });

            if (titleInput) titleInput.value = "";
            if (budgetInput) budgetInput.value = "";
            saveState();
            renderCalendar();
            renderBudgetUI();
            showToast(`Na-save ang event sa ${selectedDateStr}!`, "success");
        }

        function deleteCalendarEvent(id) {
            appState.events = appState.events.filter(ev => ev.id !== id);
            saveState();
            renderCalendar();
            renderBudgetUI();
        }

        function getCategoryDotColor(cat) {
            if (cat === 'gala') return 'bg-amber-500';
            if (cat === 'bills') return 'bg-rose-500';
            if (cat === 'payday') return 'bg-emerald-500';
            return 'bg-indigo-500';
        }

        function renderCalendar() {
            const titleEl = document.getElementById('calendarMonthYearTitle');
            const gridEl = document.getElementById('calendarDaysGrid');
            const selDisplay = document.getElementById('selectedDateDisplay');
            const dayEventsEl = document.getElementById('selectedDayEventsList');
            const upcomingEl = document.getElementById('upcomingEventsList');
            const upcomingEstBadge = document.getElementById('upcomingTotalEstBadge');
            const navBadge = document.getElementById('upcomingEventsBadge');

            if (!gridEl) return;

            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            if (titleEl) titleEl.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
            if (selDisplay) selDisplay.textContent = selectedDateStr;

            const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
            const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
            const todayStr = formatDateISO(new Date());

            let cellsHtml = "";
            for (let i = 0; i < firstDay; i++) {
                cellsHtml += `<div class="h-12 sm:h-14 rounded-xl bg-transparent"></div>`;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = appState.events.filter(ev => ev.dateStr === dateStr);
                const isSelected = dateStr === selectedDateStr;
                const isToday = dateStr === todayStr;

                const dots = dayEvents.slice(0, 3).map(ev =>
                    `<span class="w-1.5 h-1.5 rounded-full ${getCategoryDotColor(ev.category)}"></span>`
                ).join('');

                cellsHtml += `
                    <button type="button" onclick="selectCalendarDate('${dateStr}')"
                        class="h-12 sm:h-14 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-sm'
                            : isToday
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-400 font-semibold'}">
                        <span class="text-xs sm:text-sm">${day}</span>
                        <div class="flex items-center gap-0.5 h-1.5">${dots}</div>
                    </button>
                `;
            }
            gridEl.innerHTML = cellsHtml;

            // Selected Day Events
            const selectedDayEvents = appState.events.filter(ev => ev.dateStr === selectedDateStr);
            if (dayEventsEl) {
                if (selectedDayEvents.length === 0) {
                    dayEventsEl.innerHTML = `<p class="text-xs text-slate-400">Walang event sa petsang ito.</p>`;
                } else {
                    dayEventsEl.innerHTML = selectedDayEvents.map(ev => `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2.5 h-2.5 rounded-full shrink-0 ${getCategoryDotColor(ev.category)}"></span>
                                <span class="text-xs font-bold truncate">${escapeHtml(ev.title)}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${ev.budget > 0 ? `<span class="text-xs font-extrabold text-amber-600 dark:text-amber-400">${formatPeso(ev.budget)}</span>` : ''}
                                <button type="button" onclick="deleteCalendarEvent('${ev.id}')" class="text-slate-400 hover:text-rose-500 text-xs">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Upcoming Events List
            const sortedEvents = [...appState.events].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
            const totalEst = sortedEvents.reduce((sum, ev) => sum + (ev.category === 'payday' ? 0 : (ev.budget || 0)), 0);
            if (upcomingEstBadge) upcomingEstBadge.textContent = `Est: ${formatPeso(totalEst)}`;
            if (navBadge) {
                if (sortedEvents.length > 0) {
                    navBadge.textContent = sortedEvents.length;
                    navBadge.classList.remove('hidden');
                } else {
                    navBadge.classList.add('hidden');
                }
            }

            if (upcomingEl) {
                if (sortedEvents.length === 0) {
                    upcomingEl.innerHTML = `<p class="text-xs text-slate-400">Wala pang nakalista na upcoming events.</p>`;
                } else {
                    upcomingEl.innerHTML = sortedEvents.map(ev => `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700">
                            <div>
                                <div class="text-xs font-extrabold">${escapeHtml(ev.title)}</div>
                                <div class="text-[11px] text-slate-400">${ev.dateStr} • ${ev.category.toUpperCase()}</div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-extrabold ${ev.category === 'payday' ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}">
                                    ${ev.category === 'payday' ? '+' : ''}${formatPeso(ev.budget)}
                                </span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }

        // ==========================================
        // RESTORED: TABS, TOAST, AVATAR, COLLECTION
        // ==========================================
        const NAV_ON = ['bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm', 'font-extrabold'];
        const NAV_OFF = ['text-slate-600', 'dark:text-slate-400', 'font-bold'];
        let currentMainTab = 'budget';

        function switchMainTab(tab) {
            currentMainTab = tab;
            const main = tab === 'budget' || tab === 'wheel';
            const show = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !on); };
            show('mainBudgetWheelView', main);
            show('calendarViewSection', tab === 'calendar');
            show('avatarViewSection', tab === 'avatar');
            show('collectionViewSection', tab === 'collection');
            const b = document.getElementById('budgetSection');
            const w = document.getElementById('wheelSection');
            if (b) { b.classList.add('lg:block'); b.classList.toggle('hidden', tab === 'wheel'); }
            if (w) { w.classList.add('lg:block'); w.classList.toggle('hidden', tab !== 'wheel'); }
            ['budget', 'wheel', 'collection', 'calendar', 'avatar'].forEach(t => {
                const btn = document.getElementById('navTab-' + t);
                if (!btn) return;
                btn.classList.remove(...NAV_ON, ...NAV_OFF);
                btn.classList.add(...(t === tab ? NAV_ON : NAV_OFF));
            });
            if (main) requestAnimationFrame(() => { setupResponsiveCanvas(); drawWheel(); });
            if (tab === 'calendar') renderCalendar();
            if (tab === 'avatar') renderAllAvatars();
            if (tab === 'collection') renderCollection();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function showToast(msg, type = 'info') {
            const box = document.getElementById('toastContainer');
            if (!box) return;
            const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-slate-800' };
            const t = document.createElement('div');
            t.className = `${colors[type] || colors.info} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg max-w-xs transition-opacity duration-300`;
            t.textContent = msg;
            box.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
        }

        // ---------- AVATAR ----------
        const HAIR_STYLES = {
            male: [['taper', 'Low Taper'], ['crop', 'Crop'], ['curtain', 'Curtain'], ['buzz', 'Buzz Cut'], ['spiky', 'Spiky'], ['wolf', 'Wolf Cut']],
            female: [['longstraight', 'Long Straight'], ['bob', 'Bob'], ['ponytail', 'Ponytail'], ['twinbuns', 'Twin Buns'], ['wavy', 'Wavy'], ['pixie', 'Pixie']]
        };
        const OUTFITS = {
            male: [['hoodie', 'Hoodie'], ['oversized', 'Oversized Tee'], ['polo', 'Polo'], ['jersey', 'Jersey'], ['sando', 'Sando']],
            female: [['blouse', 'Blouse'], ['dress', 'Dress'], ['hoodie', 'Hoodie'], ['jersey', 'Jersey'], ['oversized', 'Oversized Tee']]
        };
        const ACCESSORIES = [['none', 'Wala'], ['glasses', 'Glasses'], ['headphones', 'Headphones'], ['cap', 'Cap'], ['ribbon', 'Ribbon']];
        const HAIR_COLORS = ['#1e1b18', '#4a2c17', '#8b5a2b', '#d6a84f', '#b33a3a', '#6366F1', '#10b981', '#e5e7eb'];
        const OUTFIT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#0f172a', '#ec4899', '#f1f5f9'];
        const SKIN_TONES = ['#f5d0b0', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];

        const HAIR_PATHS = {
            taper: ['', 'M32 40 Q32 22 50 22 Q68 22 68 40 Q64 32 50 31 Q36 32 32 40Z'],
            crop: ['', 'M32 40 Q30 20 50 20 Q70 20 68 40 L66 33 Q50 28 34 33Z'],
            curtain: ['', 'M31 44 Q30 20 50 21 Q70 20 69 44 Q66 30 58 29 L50 33 L42 29 Q34 30 31 44Z'],
            buzz: ['', 'M33 38 Q34 24 50 24 Q66 24 67 38 Q60 30 50 30 Q40 30 33 38Z'],
            spiky: ['', 'M32 40 L33 26 L40 31 L44 20 L50 29 L56 20 L60 31 L67 26 L68 40 Q60 32 50 32 Q40 32 32 40Z'],
            wolf: ['', 'M29 50 Q26 20 50 19 Q74 20 71 50 Q70 36 62 32 Q50 28 38 32 Q30 36 29 50Z'],
            longstraight: ['M30 40 Q30 18 50 18 Q70 18 70 40 L72 80 L28 80Z', 'M32 38 Q34 24 50 24 Q66 24 68 38 Q58 30 50 33 Q42 30 32 38Z'],
            bob: ['M30 40 Q30 18 50 18 Q70 18 70 40 L70 58 Q50 63 30 58Z', 'M32 38 Q34 24 50 24 Q66 24 68 38 Q58 30 50 33 Q42 30 32 38Z'],
            ponytail: ['M62 28 Q88 30 78 66 Q74 46 64 36Z', 'M32 40 Q32 22 50 22 Q68 22 68 40 Q58 30 50 33 Q42 30 32 40Z'],
            twinbuns: ['M26 22 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M58 22 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', 'M32 40 Q32 22 50 22 Q68 22 68 40 Q58 30 50 33 Q42 30 32 40Z'],
            wavy: ['M29 42 Q26 20 50 18 Q74 20 71 42 Q77 56 68 68 Q66 52 64 46 L36 46 Q34 52 32 68 Q23 56 29 42Z', 'M32 38 Q34 24 50 24 Q66 24 68 38 Q58 30 50 33 Q42 30 32 38Z'],
            pixie: ['', 'M31 40 Q30 20 50 20 Q70 20 69 40 Q64 28 54 30 Q46 26 38 34 Q33 36 31 40Z']
        };

        function avatarSVG(av) {
            const g = av.gender === 'female' ? 'female' : 'male';
            const hp = HAIR_PATHS[av.hairStyle] || HAIR_PATHS[HAIR_STYLES[g][0][0]];
            const oc = av.outfitColor, sk = av.skinTone, hc = av.hairColor, dark = '#1f2937';
            let body = `<path d="M18 100 Q20 70 50 68 Q80 70 82 100Z" fill="${oc}"/>`;
            switch (av.outfit) {
                case 'hoodie': body += `<path d="M34 69 Q50 82 66 69" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="38" y="88" width="24" height="9" rx="3" fill="rgba(0,0,0,.15)"/>`; break;
                case 'oversized': body = `<path d="M8 100 Q12 70 50 68 Q88 70 92 100Z" fill="${oc}"/>`; break;
                case 'polo': body += `<path d="M42 68 L50 79 L58 68Z" fill="#fff"/>`; break;
                case 'jersey': body += `<text x="50" y="94" text-anchor="middle" font-size="18" font-weight="800" fill="#fff" font-family="sans-serif">7</text>`; break;
                case 'sando': body = `<path d="M18 100 Q19 76 30 71 L32 100Z M82 100 Q81 76 70 71 L68 100Z" fill="${sk}"/><path d="M30 100 L32 72 Q50 79 68 72 L70 100Z" fill="${oc}"/>`; break;
                case 'blouse': body += `<path d="M40 68 Q50 78 60 68" fill="none" stroke="#fff" stroke-width="3"/>`; break;
                case 'dress': body += `<path d="M24 100 Q36 82 50 82 Q64 82 76 100Z" fill="rgba(0,0,0,.18)"/>`; break;
            }
            let acc = '';
            switch (av.accessory) {
                case 'glasses': acc = `<g fill="none" stroke="${dark}" stroke-width="1.6"><circle cx="43" cy="44" r="5"/><circle cx="57" cy="44" r="5"/><path d="M48 44 L52 44"/></g>`; break;
                case 'headphones': acc = `<path d="M31 42 Q31 19 50 19 Q69 19 69 42" fill="none" stroke="${dark}" stroke-width="3"/><rect x="27" y="40" width="7" height="12" rx="3" fill="${dark}"/><rect x="66" y="40" width="7" height="12" rx="3" fill="${dark}"/>`; break;
                case 'cap': acc = `<path d="M30 34 Q50 12 70 34Z" fill="${oc}"/><path d="M28 34 Q50 30 78 37 Q50 41 28 34Z" fill="rgba(0,0,0,.3)"/>`; break;
                case 'ribbon': acc = `<path d="M64 24 L74 18 L74 32Z M64 24 L54 18 L54 32Z" fill="#ef4444"/><circle cx="64" cy="24" r="3" fill="#b91c1c"/>`; break;
            }
            return `<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
                ${hp[0] ? `<path d="${hp[0]}" fill="${hc}"/>` : ''}
                ${body}
                <rect x="44" y="58" width="12" height="12" fill="${sk}"/>
                <circle cx="32" cy="44" r="3.5" fill="${sk}"/><circle cx="68" cy="44" r="3.5" fill="${sk}"/>
                <ellipse cx="50" cy="42" rx="18" ry="20" fill="${sk}"/>
                <path d="${hp[1]}" fill="${hc}"/>
                <circle cx="43" cy="44" r="2" fill="${dark}"/><circle cx="57" cy="44" r="2" fill="${dark}"/>
                <path d="M44 52 Q50 57 56 52" fill="none" stroke="${dark}" stroke-width="1.6" stroke-linecap="round"/>
                ${acc}</svg>`;
        }

        function labelOf(list, key) { const f = list.find(x => x[0] === key); return f ? f[1] : key; }

        function setAvatarProp(key, val) {
            appState.avatar[key] = val;
            saveState();
            renderAllAvatars();
        }

        function swatchHTML(colors, current, key) {
            return colors.map(c => `<button type="button" onclick="setAvatarProp('${key}','${c}')" aria-label="${c}" class="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow ${current === c ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : ''}" style="background:${c}"></button>`).join('');
        }

        function optionHTML(list, current, key) {
            return list.map(([v, l]) => `<button type="button" onclick="setAvatarProp('${key}','${v}')" class="px-3 py-2 rounded-xl text-xs font-bold border transition ${current === v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">${l}</button>`).join('');
        }

        function renderAllAvatars() {
            const av = appState.avatar;
            const g = av.gender === 'female' ? 'female' : 'male';
            const svg = avatarSVG(av);
            const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
            set('headerAvatarMini', svg);
            set('companionAvatarBox', svg);
            set('studioAvatarStage', svg);
            const nm = av.name || 'My Avatar';
            const hn = document.getElementById('headerAvatarName'); if (hn) hn.textContent = nm;
            const cn = document.getElementById('companionNameBadge'); if (cn) cn.textContent = nm;
            // make sure style/outfit belong to the chosen gender
            if (!HAIR_STYLES[g].some(x => x[0] === av.hairStyle)) av.hairStyle = HAIR_STYLES[g][0][0];
            if (!OUTFITS[g].some(x => x[0] === av.outfit)) av.outfit = OUTFITS[g][0][0];
            set('hairStyleOptions', optionHTML(HAIR_STYLES[g], av.hairStyle, 'hairStyle'));
            set('outfitOptions', optionHTML(OUTFITS[g], av.outfit, 'outfit'));
            set('accessoryOptions', optionHTML(ACCESSORIES, av.accessory, 'accessory'));
            set('hairColorSwatches', swatchHTML(HAIR_COLORS, av.hairColor, 'hairColor'));
            set('outfitColorSwatches', swatchHTML(OUTFIT_COLORS, av.outfitColor, 'outfitColor'));
            set('skinToneSwatches', swatchHTML(SKIN_TONES, av.skinTone, 'skinTone'));
            const hl = document.getElementById('currentHairLabel'); if (hl) hl.textContent = labelOf(HAIR_STYLES[g], av.hairStyle);
            const ol = document.getElementById('currentOutfitLabel'); if (ol) ol.textContent = labelOf(OUTFITS[g], av.outfit);
            ['male', 'female'].forEach(x => {
                const b = document.getElementById('genderBtn-' + x);
                if (!b) return;
                const on = x === g;
                b.classList.toggle('bg-emerald-500', on); b.classList.toggle('text-white', on);
            });
        }

        function initAvatarControls() {
            const reset = document.getElementById('resetAllBtn');
            if (reset) reset.addEventListener('click', () => {
                if (confirm('Burahin lahat ng data (budget, events, avatar, collection)?')) {
                    try { localStorage.removeItem(STATE_KEY); } catch (e) {}
                    location.reload();
                }
            });
            renderAllAvatars();
        }

        function setAvatarGender(g) {
            appState.avatar.gender = g;
            appState.avatar.hairStyle = HAIR_STYLES[g][0][0];
            appState.avatar.outfit = OUTFITS[g][0][0];
            saveState();
            renderAllAvatars();
        }

        function randomizeAvatar() {
            const pick = a => a[Math.floor(Math.random() * a.length)];
            const g = Math.random() < 0.5 ? 'male' : 'female';
            Object.assign(appState.avatar, {
                gender: g, hairStyle: pick(HAIR_STYLES[g])[0], outfit: pick(OUTFITS[g])[0],
                hairColor: pick(HAIR_COLORS), outfitColor: pick(OUTFIT_COLORS), skinTone: pick(SKIN_TONES), accessory: pick(ACCESSORIES)[0]
            });
            saveState();
            renderAllAvatars();
        }

        function updateAvatarName(v) {
            appState.avatar.name = v;
            saveState();
            const nm = v.trim() || 'My Avatar';
            const hn = document.getElementById('headerAvatarName'); if (hn) hn.textContent = nm;
            const cn = document.getElementById('companionNameBadge'); if (cn) cn.textContent = nm;
        }

        // ---------- TOY COLLECTION ----------
        function handleToyPhotoSelect(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const max = 800, r = Math.min(1, max / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    pendingToyPhotoDataUrl = c.toDataURL('image/jpeg', 0.7);
                    const p = document.getElementById('toyPhotoPreview');
                    p.src = pendingToyPhotoDataUrl; p.classList.remove('hidden');
                    document.getElementById('toyPhotoPlaceholder').classList.add('hidden');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function addToyToCollection(e) {
            e.preventDefault();
            const name = document.getElementById('toyNameInput').value.trim();
            if (!name) { showToast('Ilagay ang pangalan ng toy.', 'error'); return; }
            appState.toys.unshift({
                id: 'toy_' + Date.now(),
                name,
                category: document.getElementById('toyCategorySelect').value,
                price: parseFloat(document.getElementById('toyPriceInput').value) || 0,
                notes: document.getElementById('toyNotesInput').value.trim(),
                photoDataUrl: pendingToyPhotoDataUrl,
                addedAt: new Date().toISOString()
            });
            saveState();
            e.target.reset();
            pendingToyPhotoDataUrl = '';
            document.getElementById('toyPhotoPreview').classList.add('hidden');
            document.getElementById('toyPhotoPlaceholder').classList.remove('hidden');
            showToast(`Nadagdag sa collection: ${name}!`, 'success');
            renderCollection();
        }

        function deleteToy(id) {
            if (!confirm('Tanggalin ito sa collection?')) return;
            appState.toys = appState.toys.filter(t => t.id !== id);
            saveState();
            renderCollection();
        }

        function openToyLightbox(id) {
            const t = appState.toys.find(x => x.id === id);
            if (!t) return;
            document.getElementById('lightboxToyImg').src = t.photoDataUrl || '';
            document.getElementById('lightboxToyCat').textContent = t.category;
            document.getElementById('lightboxToyTitle').textContent = t.name;
            document.getElementById('lightboxToyNotes').textContent = t.notes || '';
            document.getElementById('lightboxToyPrice').textContent = formatPeso(t.price);
            const m = document.getElementById('toyLightboxModal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }

        function closeToyLightbox() {
            const m = document.getElementById('toyLightboxModal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function renderCollection() {
            const q = (document.getElementById('collectionSearchInput')?.value || '').toLowerCase().trim();
            const cat = document.getElementById('collectionFilterCategory')?.value || 'ALL';
            const list = appState.toys.filter(t => (cat === 'ALL' || t.category === cat) && (!q || t.name.toLowerCase().includes(q)));
            const total = appState.toys.reduce((s, t) => s + (t.price || 0), 0);
            const n = appState.toys.length;
            const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            setText('collectionTotalItemsText', `${n} item${n === 1 ? '' : 's'}`);
            setText('collectionTotalValueText', formatPeso(total));
            setText('collectionCountBadge', String(n));
            const grid = document.getElementById('collectionGalleryGrid');
            if (!grid) return;
            if (!list.length) {
                grid.innerHTML = `<div class="col-span-full text-center text-xs text-slate-400 py-10">${n ? 'Walang tugma sa search.' : 'Wala pang laman. Magdagdag ng unang toy mo!'}</div>`;
                return;
            }
            grid.innerHTML = list.map(t => `
                <div onclick="openToyLightbox('${t.id}')" class="cursor-pointer bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div class="h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl">
                        ${t.photoDataUrl ? `<img src="${t.photoDataUrl}" alt="" class="w-full h-full object-cover" />` : '🧸'}
                    </div>
                    <div class="p-3">
                        <span class="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">${escapeHtml(t.category)}</span>
                        <h4 class="text-sm font-extrabold truncate">${escapeHtml(t.name)}</h4>
                        <div class="flex items-center justify-between mt-1">
                            <span class="text-xs font-bold">${formatPeso(t.price)}</span>
                            <button onclick="event.stopPropagation(); deleteToy('${t.id}')" class="text-rose-500 text-xs" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>`).join('');
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // ==========================================
        // 13. INITIALIZATION & THEME / SOUND BINDINGS
        // ==========================================
        function applyTheme() {
            const root = document.documentElement;
            const icon = document.getElementById('themeIcon');
            if (appState.darkMode) {
                root.classList.add('dark');
                if (icon) icon.className = 'fa-solid fa-sun text-sm';
            } else {
                root.classList.remove('dark');
                if (icon) icon.className = 'fa-solid fa-moon text-sm';
            }
        }

        function applySoundIcon() {
            const icon = document.getElementById('soundIcon');
            if (icon) {
                icon.className = appState.soundEnabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm';
            }
        }

        function renderAll() {
            renderBudgetUI();
            renderFoodTags();
            drawWheel();
            renderReminders();
            renderCalendar();
            renderAllAvatars();
            renderCollection();
        }

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            appState.darkMode = !appState.darkMode;
            saveState();
            applyTheme();
        });

        document.getElementById('soundToggle')?.addEventListener('click', () => {
            appState.soundEnabled = !appState.soundEnabled;
            saveState();
            applySoundIcon();
        });

        window.addEventListener('resize', () => {
            setupResponsiveCanvas();
        });

        window.addEventListener('DOMContentLoaded', () => {
            loadState();
            applyTheme();
            applySoundIcon();

            const moneyInput = document.getElementById('moneyInput');
            if (moneyInput && appState.totalMoney > 0) {
                moneyInput.value = appState.totalMoney;
            }
            const tfSelect = document.getElementById('timeframeSelect');
            if (tfSelect && appState.days) {
                tfSelect.value = String(appState.days);
            }
            const stratSelect = document.getElementById('strategySelect');
            if (stratSelect && appState.strategy) {
                stratSelect.value = appState.strategy;
            }
            const avatarNameInput = document.getElementById('avatarNameInput');
            if (avatarNameInput && appState.avatar?.name) {
                avatarNameInput.value = appState.avatar.name;
            }

            initAvatarControls();
            renderAll();
            setupResponsiveCanvas();
        });
