const money = n => "MUR " + Number(n || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0
});
const pct = n => Number(n || 0).toFixed(2) + "%";
const sessionStamp = new Date().toLocaleString();
let sessionMode = 'Demo';
let activeRateCategory = 'All';
let budget = {
    income: 30000,
    expenses: 22000,
    disposable: 8000,
    rate: 26.6667
};
let logs = [];
const pages = {
    dashboard: 'Dashboard',
    budget: 'Budget Tracker',
    rates: 'Bank Rates',
    compare: 'Compare Rates',
    loan: 'Loan Calculator',
    sources: 'Data Sources',
    reports: 'Reports',
    settings: 'Settings',
    admin: 'Admin',
    about: 'About'
};
const $ = id => document.getElementById(id);

function log(msg) {
    logs.unshift(`${new Date().toLocaleTimeString()} — ${msg}`);
    renderLog();
    if (typeof refreshReports === 'function') refreshReports()
}

function renderLog() {
    if ($('activityLog')) $('activityLog').innerHTML = logs.slice(0, 12).map(l => `<p>${l}</p>`).join('')
}

function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    $(id).classList.add('active-page');
    document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.page === id));
    $('pageTitle').textContent = pages[id] || 'MoBudget'
}
document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => show(b.dataset.page)));

function ask(title, msg) {
    return new Promise(resolve => {
        const m = $('modal');
        $('modalTitle').textContent = title;
        $('modalMsg').textContent = msg;
        m.classList.remove('hidden');
        $('modalCancel').onclick = () => {
            m.classList.add('hidden');
            resolve(false)
        };
        $('modalOk').onclick = () => {
            m.classList.add('hidden');
            resolve(true)
        }
    })
}

function step(id) {
    document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active-auth'));
    $(id).classList.add('active-auth')
}
$('toPin').onclick = () => step('authPin');

function validPwd(v) {
    return v.length === 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)
}
$('unlockBtn').onclick = () => {
    const v = $('pinInput').value;
    if (v === 'MoBud@1!' && validPwd(v)) {    //PASSWORD
        $('pinError').textContent = '';
        step('authConsent')
    } else {
        $('pinError').textContent = 'Password is incorrect.'
    }
};
$('bioBtn').onclick = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        ask('Biometric login', 'Use biometric login for this prototype session?').then(ok => {
            if (ok) step('authConsent')
        })
    } else alert('Biometric login is available in the mobile-app version. Please use password login on desktop.')
};
$('forgotBtn').onclick = () => {
    $('resetMsg').textContent = '';
    $('resetEmail').value = '';
    step('authForgot')
};
$('sendResetBtn').onclick = () => {
    const email = $('resetEmail').value.trim();
    if (!email || !email.includes('@')) {
        $('resetMsg').textContent = 'Please enter a valid email address.';
        return;
    }
    $('resetMsg').textContent = 'If this were a live system, a reset link would be sent to ' + email + '.';
    log('Password reset requested for ' + email);
};
$('backToLoginBtn').onclick = () => step('authPin');
$('consentCheck').onchange = () => $('toMode').disabled = !$('consentCheck').checked;
$('toMode').onclick = () => step('authMode');
$('demoMode').onclick = () => unlock('Demo');
$('participantMode').onclick = () => $('participantBox').classList.remove('hidden');
$('startParticipant').onclick = () => unlock(($('participantId').value || 'Participant') + ' • ' + $('ageGroup').value);
$('lockBtn').onclick = () => {
    $('authOverlay').classList.remove('hidden');
    $('appShell').classList.add('locked');
    step('authPin');
    log('App locked')
};

function unlock(mode) {
    sessionMode = mode;
    $('sessionModeLabel').textContent = mode;
    $('setMode').textContent = mode;
    $('miniSessionText').textContent = mode + ' active.';
    $('authOverlay').classList.add('hidden');
    $('appShell').classList.remove('locked');
    log('Session started: ' + mode);
    updateDash();
    renderRates();
    renderSources()
}

function drawBar(canvas, values, labels, colors) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(rect.width || 320, 320),
        cssH = Math.max(rect.height || 160, 160);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cssW, cssH);
    const max = Math.max(...values.map(v => Number(v) || 0), 1);
    const gap = cssW / (values.length + 1);
    const barW = Math.min(70, gap * .45);
    values.forEach((v, i) => {
        v = Number(v) || 0;
        const x = gap * (i + 1) - barW / 2;
        const bh = (cssH - 62) * (v / max);
        c.fillStyle = colors[i] || '#2f6f89';
        c.fillRect(x, cssH - 36 - bh, barW, bh);
        c.fillStyle = '#172b3a';
        c.font = 'bold 12px Arial';
        c.textAlign = 'center';
        c.fillText(labels[i], x + barW / 2, cssH - 13);
        c.fillStyle = '#6b7c8b';
        c.font = '11px Arial';
        c.fillText(money(v).replace('MUR ', ''), x + barW / 2, Math.max(12, cssH - 42 - bh));
    });
}

function updateDash() {
    let income = budget.income,
        expenses = budget.expenses;
    if ($('mIncome')) $('mIncome').textContent = money(income);
    if ($('mExpenses')) $('mExpenses').textContent = money(expenses);
    if ($('mRate')) $('mRate').textContent = pct(budget.rate);
    if ($('goalBar')) $('goalBar').style.width = '40%';
    if ($('sessionTimeDash')) $('sessionTimeDash').textContent = sessionStamp;
    if ($('sessionTimeRates')) $('sessionTimeRates').textContent = sessionStamp;
    if ($('sessionTimeTop')) $('sessionTimeTop').textContent = sessionStamp;
    if ($('expenseChart')) drawBar($('expenseChart'), [income, expenses, Math.max(budget.disposable, 0)], ['Income', 'Exp', 'Left'], ['#2f6f89', '#d58b39', '#3f8f72']);
}

function setBudgetEditing(on) {
    document.querySelectorAll('.budget-field').forEach(i => i.disabled = !on);
    $('editBudgetBtn').textContent = on ? 'Editing Enabled' : 'Edit Budget'
}
$('editBudgetBtn').onclick = () => ask('Edit budget', 'Are you sure you want to edit budget inputs?').then(ok => {
    if (ok) {
        setBudgetEditing(true);
        log('Budget editing enabled')
    }
});
$('budgetForm').addEventListener('submit', e => {
    e.preventDefault();
    ask('Save budget', 'Are you sure you want to save these budget changes?').then(ok => {
        if (!ok) return;
        let income = (+$('income').value || 0) + (+$('otherIncome').value || 0);
        let expenses = [...document.querySelectorAll('.exp')].reduce((s, i) => s + (+i.value || 0), 0);
        let disposable = income - expenses;
        let rate = income ? disposable / income * 100 : 0;
        budget = {
            income,
            expenses,
            disposable,
            rate
        };
        $('rExpenses').textContent = money(expenses);
        $('rDisposable').textContent = money(disposable);
        $('rRate').textContent = pct(rate);
        $('budgetAlert').classList.toggle('hidden', disposable >= 0);
        $('budgetAlert').textContent = disposable < 0 ? 'Warning: expenses exceed income.' : '';
        setBudgetEditing(false);
        updateDash();
        log('Budget saved')
    })
});
$('saveLocalBtn').onclick = () => {
    localStorage.setItem('mobudgetBudget', JSON.stringify(budget));
    log('Budget saved locally')
};
$('loadLocalBtn').onclick = () => {
    let b = localStorage.getItem('mobudgetBudget');
    if (b) {
        budget = JSON.parse(b);
        updateDash();
        log('Saved budget loaded')
    }
};

$('resetBudgetBtn').onclick = () => ask('Reset budget', 'Reset budget to demo values?').then(ok => {
    if (!ok) return;
    // Restore all budgetForm fields to their original HTML default values
    const defaults = {
        income:      30000,
        otherIncome: 0,
        mortgage:    9000,
        leasing:     0,
        carLoan:     0,
        food:        5500,
        transport:   2500,
        education:   1500,
        mobile:      1200,
        personal:    1800,
        otherExp:    500
    };
    Object.entries(defaults).forEach(([id, val]) => {
        if ($(id)) $(id).value = val;
    });
    // Recalculate and update budget object from restored defaults
    let income = defaults.income + defaults.otherIncome;
    let expenses = defaults.mortgage + defaults.leasing + defaults.carLoan +
                   defaults.food + defaults.transport + defaults.education +
                   defaults.mobile + defaults.personal + defaults.otherExp;
    let disposable = income - expenses;
    let rate = income ? disposable / income * 100 : 0;
    budget = { income, expenses, disposable, rate };
    // Update result panel
    $('rExpenses').textContent = money(expenses);
    $('rDisposable').textContent = money(disposable);
    $('rRate').textContent = pct(rate);
    $('budgetAlert').classList.add('hidden');
    $('budgetAlert').textContent = '';
    // Lock fields back and update dashboard
    setBudgetEditing(false);
    updateDash();
    log('Budget reset to demo defaults');
});
$('resetAllBtn').onclick = () => ask('Reset all', 'Clear local saved data and reset app?').then(ok => {
    if (ok) {
        localStorage.clear();
        location.reload()
    }
});
$('changePinBtn').onclick = () => alert('Prototype password can be changed in script.js for demo purposes. Current: MoBud@1!');

function renderRates() {
    const cats = activeRateCategory === 'All' ? ['Benchmark', 'Loan', 'Fixed Deposit'] : [activeRateCategory];
    $('rateSections').innerHTML = cats.map(cat => {
        const rows = bankRates.filter(r => r.category === cat);
        return `<section class="rate-category"><div class="rate-category-title"><h3>${cat}</h3><span>${rows.length} source${rows.length!==1?'s':''}</span></div><div class="rate-grid">${rows.map(r=>`<article class="rate-card"><span class="tag ${r.category==='Loan'?'loan':r.category==='Benchmark'?'benchmark':''}">${r.category}</span><h4>${r.bankName}</h4><p>${r.productName}</p><div class="rate">${r.displayRate}</div><p class="muted">${r.conditions}</p><div class="rate-meta"><span class="mini-tag">Collected: ${r.dateCollected}</span><span class="mini-tag">Session: ${sessionStamp}</span></div><a class="source-link" href="${r.sourceURL}" target="_blank">Open official webpage</a><p class="note">${r.notes}</p></article>`).join('')}</div></section>`
    }).join('')
}
document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('tab-btn')) {
        activeRateCategory = e.target.dataset.category;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
        renderRates();
        log('Rate category viewed: ' + activeRateCategory)
    }
});
let selectedCompareA = 0;
let selectedCompareB = 1;

function getComparableOptions() {
    return bankRates.filter(r => r.rate !== null && r.category !== 'Benchmark');
}

function renderProductPicker(containerId, selectedIndex, which) {
    const opts = getComparableOptions();
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = opts.map((r, i) => `<button type="button" class="product-choice ${i===selectedIndex?'selected':''}" data-which="${which}" data-index="${i}"><strong>${r.bankName}</strong><span>${r.productName}</span><em>${r.displayRate}</em></button>`).join('');
}

function updateSelectedProductLabels() {
    const opts = getComparableOptions();
    const a = opts[selectedCompareA];
    const b = opts[selectedCompareB];
    if ($('selectedA')) $('selectedA').textContent = a ? `Selected: ${a.bankName} — ${a.productName} (${a.displayRate})` : 'No product selected';
    if ($('selectedB')) $('selectedB').textContent = b ? `Selected: ${b.bankName} — ${b.productName} (${b.displayRate})` : 'No product selected';
}

function fillCompare() {
    const opts = getComparableOptions();
    const absa = opts.findIndex(r => r.bankName.toLowerCase().includes('absa') && r.productName.toLowerCase().includes('personal'));
    const sbm = opts.findIndex(r => r.bankName.toLowerCase().includes('sbm') && r.productName.toLowerCase().includes('personal'));
    selectedCompareA = absa >= 0 ? absa : 0;
    selectedCompareB = sbm >= 0 ? sbm : Math.min(1, opts.length - 1);
    renderProductPicker('pickerA', selectedCompareA, 'A');
    renderProductPicker('pickerB', selectedCompareB, 'B');
    updateSelectedProductLabels();
    calculateComparison(false);
}
document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.product-choice');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (btn.dataset.which === 'A') selectedCompareA = idx;
    if (btn.dataset.which === 'B') selectedCompareB = idx;
    renderProductPicker('pickerA', selectedCompareA, 'A');
    renderProductPicker('pickerB', selectedCompareB, 'B');
    updateSelectedProductLabels();
    calculateComparison(false);
});

function payment(P, r, n) {
    let i = r / 100 / 12;
    if (!i) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
}

function calculateComparison(writeLog = true) {
    const opts = getComparableOptions();
    updateSelectedProductLabels();
    const a = opts[selectedCompareA],
        b = opts[selectedCompareB];
    const amt = +$('cmpAmount').value || 0,
        n = +$('cmpMonths').value || 1;
    if (!a || !b || amt <= 0) {
        $('outA').textContent = '-';
        $('outB').textContent = '-';
        $('outDiff').textContent = '-';
        $('compareNote').textContent = 'Please enter a valid amount and select two products.';
        return;
    }
    const pa = payment(amt, a.rate, n),
        pb = payment(amt, b.rate, n);
    $('labelA').textContent = `${a.bankName} monthly estimate`;
    $('labelB').textContent = `${b.bankName} monthly estimate`;
    $('outA').textContent = money(pa);
    $('outB').textContent = money(pb);
    $('outDiff').textContent = money(Math.abs(pa - pb));
    const likeForLike = (a.productName.toLowerCase().includes('personal') && b.productName.toLowerCase().includes('personal')) || a.category === b.category;
    $('compareNote').textContent = likeForLike ? 'Indicative comparison only. Actual offers may differ after bank assessment.' : 'Warning: selected products may not be directly comparable.';
    drawBar($('compareChart'), [pa, pb], ['A', 'B'], ['#2f6f89', '#3f8f72']);
    if (writeLog) log('Rate comparison calculated');
}
$('compareForm').addEventListener('submit', e => {
    e.preventDefault();
    ask('Apply comparison', 'Are you sure you want to apply these comparison inputs?').then(ok => {
        if (ok) calculateComparison(true)
    })
});
['cmpAmount', 'cmpMonths'].forEach(id => $(id).addEventListener('input', () => calculateComparison(false)));

function getLoanOptions() {
    return bankRates.filter(r => r.rate !== null && r.category === 'Loan');
}

function fillLoanBankRates() {
    const opts = getLoanOptions();
    const sel = $('loanBankRate');
    if (!sel) return;
    sel.innerHTML = '';
    opts.forEach((r, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = `${r.bankName} - ${r.productName} (${r.displayRate})`;
        sel.appendChild(o);
    });
    const mcb = opts.findIndex(r => r.bankName.toLowerCase().includes('mcb'));
    sel.value = String(mcb >= 0 ? mcb : 0);
    applySelectedLoanRate(false);
    renderLoanRateCards();
}

function applySelectedLoanRate(writeLog = true) {
    const opts = getLoanOptions();
    const selected = opts[+$('loanBankRate').value];
    if (!selected) return;
    $('loanRate').value = Number(selected.rate).toFixed(2);
    if ($('selectedLoanRate')) $('selectedLoanRate').textContent = `Selected: ${selected.bankName} — ${selected.productName} (${selected.displayRate})`;
    calculateLoan(false);
    if (writeLog) log('Loan bank rate selected: ' + selected.bankName + ' ' + selected.displayRate);
}

function renderLoanRateCards() {
    const box = $('loanRateCards');
    if (!box) return;
    const opts = getLoanOptions();
    box.innerHTML = opts.map((r, i) => `<button type="button" class="loan-rate-card" data-loan-index="${i}"><strong>${r.bankName}</strong><span>${r.productName}</span><em>${r.displayRate}</em></button>`).join('');
}
document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.loan-rate-card');
    if (!btn) return;
    $('loanBankRate').value = btn.dataset.loanIndex;
    applySelectedLoanRate(true);
});

function scenarioRate(r, sal) {
    return sal >= 60000 ? r * .95 : sal >= 50000 ? r * .975 : r
}

function calculateLoan(writeLog = true) {
    let P = +$('loanAmount').value || 0,
        r = +$('loanRate').value || 0,
        s = +$('salary').value || 0,
        n = +$('term').value || 1;
    if (P <= 0 || r < 0 || n <= 0) {
        $('advPay').textContent = '-';
        $('scnPay').textContent = '-';
        $('payDiff').textContent = '-';
        return
    }
    let sr = scenarioRate(r, s),
        ap = payment(P, r, n),
        sp = payment(P, sr, n);
    $('advRate').textContent = pct(r);
    $('scnRate').textContent = pct(sr);
    $('advPay').textContent = money(ap);
    $('scnPay').textContent = money(sp);
    $('payDiff').textContent = money(Math.abs(ap - sp));
    drawBar($('loanChart'), [ap, sp], ['Advertised', 'Scenario'], ['#d58b39', '#3f8f72']);
    if (writeLog) log('Loan scenario calculated')
}
$('loanForm').addEventListener('submit', e => {
    e.preventDefault();
    ask('Calculate loan', 'Are you sure you want to calculate using these loan inputs?').then(ok => {
        if (ok) calculateLoan(true)
    })
});
['loanAmount', 'loanRate', 'salary', 'term'].forEach(id => $(id).addEventListener('input', () => calculateLoan(false)));
if ($('loanBankRate')) $('loanBankRate').addEventListener('change', () => applySelectedLoanRate(true));

function renderSources() {
    $('sourceRows').innerHTML = bankRates.map(r => `<tr><td>${r.bankName}</td><td>${r.productName}</td><td>${r.displayRate}</td><td>${r.rateType}</td><td>${r.dateCollected}<br>${sessionStamp}</td><td><a href="${r.sourceURL}" target="_blank">Open</a></td></tr>`).join('')
}

function exportSnapshot() {
    download('mobudget_session_snapshot.csv', buildFullCsv())
}

function download(name, text) {
    let a = document.createElement('a'),
        blob = new Blob([text], {
            type: 'text/plain'
        });
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href)
}
$('exportSessionBtn').onclick = exportSnapshot;
$('reportBtn').onclick = () => download('mobudget_summary_report.txt', `MoBudget Summary Report\nSession: ${sessionMode}\nTime: ${sessionStamp}\nIncome: ${money(budget.income)}\nExpenses: ${money(budget.expenses)}\nDisposable income: ${money(budget.disposable)}\nSavings rate: ${pct(budget.rate)}\n\nThis report is generated by an academic prototype and is not financial advice.`);
$('adminRateForm').addEventListener('submit', e => {
    e.preventDefault();
    bankRates.push({
        bankName: $('adminBank').value,
        productName: $('adminProduct').value,
        category: $('adminCategory').value,
        rate: $('adminRate').value ? +$('adminRate').value : null,
        displayRate: $('adminDisplay').value || 'Check source',
        rateType: 'Admin-added',
        conditions: 'Added during prototype session',
        sourceURL: $('adminSource').value || '#',
        dateCollected: new Date().toISOString().slice(0, 10),
        notes: 'Admin-added session entry'
    });
    renderRates();
    renderSources();
    fillCompare();
    fillLoanBankRates();
    log('Admin added rate entry')
});

function getBudgetSummaryText() {
    return `MoBudget Budget Summary
Session mode: ${sessionMode}
Session time: ${sessionStamp}
Income: ${money(budget.income)}
Expenses: ${money(budget.expenses)}
Disposable income: ${money(budget.disposable)}
Savings rate: ${pct(budget.rate)}

Note: This is an academic prototype and not financial advice.`;
}

function buildSessionRows() {
    const rows = [];
    bankRates.forEach(r => rows.push({
        sessionMode,
        timestamp: sessionStamp,
        type: 'rate_snapshot',
        bankName: r.bankName,
        productName: r.productName,
        category: r.category,
        displayRate: r.displayRate,
        numericRate: r.rate ?? '',
        sourceURL: r.sourceURL,
        dateCollected: r.dateCollected,
        notes: r.notes
    }));
    rows.push({
        sessionMode,
        timestamp: sessionStamp,
        type: 'budget_summary',
        income: budget.income,
        expenses: budget.expenses,
        disposable: budget.disposable,
        savingsRate: budget.rate
    });
    logs.forEach(l => rows.push({
        sessionMode,
        timestamp: sessionStamp,
        type: 'activity_log',
        action: l
    }));
    return rows;
}

function buildFullCsv() {
    const headers = ['sessionMode', 'timestamp', 'type', 'bankName', 'productName', 'category', 'displayRate', 'numericRate', 'sourceURL', 'dateCollected', 'income', 'expenses', 'disposable', 'savingsRate', 'action', 'notes'];
    const lines = [headers.join(',')];
    buildSessionRows().forEach(row => {
        lines.push(headers.map(h => '"' + String(row[h] ?? '').replaceAll('"', '""') + '"').join(','));
    });
    return lines.join('\n');
}

function refreshReports() {
    if (!$('budgetReportPreview')) return;
    $('budgetReportPreview').textContent = getBudgetSummaryText();
    $('reportRateRows').innerHTML = bankRates.map(r => `<tr><td>${r.bankName}</td><td>${r.productName}</td><td>${r.category}</td><td>${r.displayRate}</td><td><a href="${r.sourceURL}" target="_blank">Open</a></td><td>${sessionStamp}</td></tr>`).join('');
    $('reportLogPreview').innerHTML = logs.length ? logs.map(l => `<p>${l}</p>`).join('') : '<p>No activity recorded yet.</p>';
    const endpoint = localStorage.getItem('mobudgetDbEndpoint') || '';
    if ($('dbEndpoint')) $('dbEndpoint').value = endpoint;
    if ($('dbStatus')) $('dbStatus').textContent = endpoint ? 'Database endpoint configured. You can save anonymous session data.' : 'No database endpoint configured yet. Add a Google Apps Script URL in Settings.';
}

function saveEndpoint() {
    const url = ($('dbEndpoint').value || '').trim();
    if (!url) {
        alert('Please paste a Google Apps Script web app URL.');
        return;
    }
    localStorage.setItem('mobudgetDbEndpoint', url);
    refreshReports();
    log('Database endpoint saved');
}
async function saveToDatabase(testOnly = false) {
    const endpoint = localStorage.getItem('mobudgetDbEndpoint') || '';
    if (!endpoint) {
        alert('No database endpoint configured. Add it in Settings.');
        return;
    }
    const payload = {
        testOnly,
        sessionMode,
        sessionTimestamp: sessionStamp,
        budget,
        bankRates,
        activityLog: logs
    };
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        $('dbStatus').textContent = testOnly ? 'Test request sent to database endpoint. Check Google Sheet.' : 'Session data sent to database endpoint. Check Google Sheet.';
        log(testOnly ? 'Database test request sent' : 'Session saved to database');
    } catch (err) {
        $('dbStatus').textContent = 'Database save failed: ' + err.message;
        alert('Database save failed. Check your endpoint URL and deployment permissions.');
    }
}

function wireReports() {
    if ($('refreshReportsBtn')) $('refreshReportsBtn').onclick = refreshReports;
    if ($('downloadAllCsvBtn')) $('downloadAllCsvBtn').onclick = () => download('mobudget_full_session_export.csv', buildFullCsv());
    if ($('downloadReportTxtBtn')) $('downloadReportTxtBtn').onclick = () => download('mobudget_summary_report.txt', getBudgetSummaryText());
    if ($('copyReportBtn')) $('copyReportBtn').onclick = () => navigator.clipboard.writeText(getBudgetSummaryText()).then(() => alert('Summary copied.'));
    if ($('saveDatabaseBtn')) $('saveDatabaseBtn').onclick = () => saveToDatabase(false);
    if ($('saveEndpointBtn')) $('saveEndpointBtn').onclick = saveEndpoint;
    if ($('testDatabaseBtn')) $('testDatabaseBtn').onclick = () => saveToDatabase(true);
}
updateDash();
renderRates();
fillCompare();
fillLoanBankRates();
renderSources();
wireReports();
refreshReports();
calculateComparison(false);
calculateLoan(false);
log('Prototype loaded');
refreshReports();