// Data State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || [];
let profile = JSON.parse(localStorage.getItem('profile')) || {
    name: 'Your Name',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150'
};

// Constants
const monthsThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// DOM Elements
const form = document.getElementById('finance-form');
const transactionList = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netSavingsEl = document.getElementById('net-savings');
const savingsRateEl = document.getElementById('savings-rate');
const forecastBalanceEl = document.getElementById('forecast-balance');
const dailyAllowanceEl = document.getElementById('daily-allowance');

// Charts
let mainChart, pieChart;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateUI();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('date')) document.getElementById('date').value = today;
    
    const currentMonth = new Date().getMonth();
    document.getElementById('current-date').innerText = `${monthsThai[currentMonth]} ${new Date().getFullYear()}`;
});

// Mode Switching Logic
function switchMode(mode) {
    const entryModeInput = document.getElementById('entry-mode');
    const formTitle = document.getElementById('form-title');
    const amountLabel = document.getElementById('amount-label');
    const submitBtn = document.getElementById('submit-btn');
    const tabActual = document.getElementById('tab-actual');
    const tabPlan = document.getElementById('tab-plan');
    const timeContainer = document.getElementById('time-input-container');

    entryModeInput.value = mode;
    
    if (mode === 'actual') {
        formTitle.innerText = 'บันทึกรายวัน (Actual)';
        amountLabel.innerText = 'จำนวนเงินจริง (บาท)';
        submitBtn.innerText = 'บันทึกรายการ';
        tabActual.classList.add('active');
        tabActual.style.background = 'var(--gradient-primary)';
        tabPlan.classList.remove('active');
        tabPlan.style.background = 'transparent';
        
        timeContainer.innerHTML = `
            <label id="time-label">วันที่</label>
            <input type="date" id="date" required value="${new Date().toISOString().split('T')[0]}">
        `;
    } else {
        formTitle.innerText = 'วางแผนรายเดือน (Plan)';
        amountLabel.innerText = 'จำนวนเงินเป้าหมาย (บาท)';
        submitBtn.innerText = 'บันทึกแผนงาน';
        tabPlan.classList.add('active');
        tabPlan.style.background = 'var(--gradient-primary)';
        tabActual.classList.remove('active');
        tabActual.style.background = 'transparent';
        
        const currentMonth = new Date().getMonth();
        let options = monthsThai.map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
        
        timeContainer.innerHTML = `
            <label id="time-label">เดือน</label>
            <select id="month" required>${options}</select>
        `;
    }
}

// Form Submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const mode = document.getElementById('entry-mode').value;
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (mode === 'actual') {
        const dateStr = document.getElementById('date').value;
        const entryId = document.getElementById('editing-id').value;
        
        if (entryId) {
            const idx = transactions.findIndex(t => t.id == entryId);
            if (idx > -1) {
                transactions[idx] = { ...transactions[idx], type, category, note, amount, date: dateStr };
            }
            document.getElementById('editing-id').value = '';
        } else {
            const transaction = {
                id: Date.now(),
                type, category, note, amount, date: dateStr
            };
            transactions.push(transaction);
        }
    } else {
        const month = parseInt(document.getElementById('month').value);
        const existingIdx = budgets.findIndex(b => b.month === month && b.category === category && b.type === type);
        if (existingIdx > -1) {
            budgets[existingIdx].amount = amount;
            budgets[existingIdx].note = note;
        } else {
            budgets.push({ type, category, note, amount, month });
        }
    }
    
    saveData();
    updateUI();
    form.reset();
    document.getElementById('entry-mode').value = mode; 
    if (mode === 'actual') {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
});

function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('budgets', JSON.stringify(budgets));
    localStorage.setItem('profile', JSON.stringify(profile));
}

function updateUI() {
    renderTransactions();
    calculateSummaries();
    updateCharts();
    renderProfile();
}

function renderProfile() {
    document.getElementById('profile-name-display').innerText = profile.name;
    document.getElementById('profile-img-display').src = profile.img;
}

function editProfile() {
    const newName = prompt('ระบุชื่อของคุณ:', profile.name);
    if (newName !== null && newName.trim() !== "") {
        profile.name = newName;
        
        const newImg = prompt('ใส่ URL รูปภาพโปรไฟล์ของคุณ (หรือกด OK เพื่อใช้รูปเดิม):', profile.img);
        if (newImg !== null && newImg.trim() !== "") {
            profile.img = newImg;
        }
        
        saveData();
        renderProfile();
    }
}

window.switchMode = switchMode;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editProfile = editProfile;

    if (transactions.length === 0) {
        transactionList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">ยังไม่มีรายการบันทึก</div>';
        return;
    }
    
    // Group by Date
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id).slice(0, 20);
    
    let html = '';
    let lastDate = '';
    
    sorted.forEach(t => {
        if (t.date !== lastDate) {
            html += `<div style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); font-size: 0.8rem; font-weight: 600; color: var(--accent-blue); margin-top: 0.5rem;">${t.date}</div>`;
            lastDate = t.date;
        }
        
        html += `
            <div class="transaction-item">
                <div class="item-info">
                    <span class="item-title">${t.category} ${t.note ? `<small style="font-weight: 400; color: var(--text-secondary); margin-left: 5px;">(${t.note})</small>` : ''}</span>
                    <span class="item-date">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="item-amount ${t.type === 'income' ? 'positive' : 'negative'}">
                        ${t.type === 'income' ? '+' : '-'}฿${t.amount.toLocaleString()}
                    </span>
                    <div class="action-btns" style="display: flex; gap: 0.5rem;">
                        <button onclick="editTransaction(${t.id})" class="icon-btn edit-btn">✏️</button>
                        <button onclick="deleteTransaction(${t.id})" class="icon-btn delete-btn">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    transactionList.innerHTML = html;
}

function deleteTransaction(id) {
    if (confirm('ยืนยันการลบรายการนี้?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

function editTransaction(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;
    
    switchMode('actual');
    document.getElementById('type').value = t.type;
    document.getElementById('category').value = t.category;
    document.getElementById('note').value = t.note || '';
    document.getElementById('amount').value = t.amount;
    document.getElementById('date').value = t.date;
    document.getElementById('editing-id').value = t.id;
    
    document.getElementById('form-title').innerText = 'แก้ไขรายการ (Edit)';
    document.getElementById('submit-btn').innerText = 'อัปเดตรายการ';
    
    window.scrollTo({ top: document.getElementById('finance-form').offsetTop - 50, behavior: 'smooth' });
}

function calculateSummaries() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    
    totalIncomeEl.innerText = `฿${totalIncome.toLocaleString()}`;
    totalExpenseEl.innerText = `฿${totalExpense.toLocaleString()}`;
    netSavingsEl.innerText = `฿${netSavings.toLocaleString()}`;
    savingsRateEl.innerText = `Saving Rate: ${savingsRate.toFixed(1)}%`;
    
    // Forecast
    let forecastedSavings = netSavings;
    for (let m = currentMonth + 1; m < 12; m++) {
        const plannedIncome = budgets.filter(b => b.month === m && b.type === 'income').reduce((s, b) => s + b.amount, 0);
        const plannedExpense = budgets.filter(b => b.month === m && b.type === 'expense').reduce((s, b) => s + b.amount, 0);
        forecastedSavings += (plannedIncome - plannedExpense);
    }
    forecastBalanceEl.innerText = `฿${forecastedSavings.toLocaleString()}`;
    
    // Daily Allowance Calculation
    // Get planned budget for current month
    const plannedExpCurrentMonth = budgets.filter(b => b.month === currentMonth && b.type === 'expense').reduce((s, b) => s + b.amount, 0);
    // Get actual expense for current month
    const actualExpCurrentMonth = transactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
        })
        .reduce((s, t) => s + t.amount, 0);
        
    const remainingBudget = plannedExpCurrentMonth - actualExpCurrentMonth;
    
    // Calculate days remaining in month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate() + 1;
    
    const dailyAllowance = remainingBudget > 0 ? (remainingBudget / daysRemaining) : 0;
    dailyAllowanceEl.innerText = `฿${Math.max(0, dailyAllowance).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
}

function initCharts() {
    const ctxMain = document.getElementById('mainChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    mainChart = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: monthsThai,
            datasets: [
                {
                    label: 'รายรับ (Actual)',
                    backgroundColor: '#6366f1',
                    borderRadius: 6,
                    data: new Array(12).fill(0)
                },
                {
                    label: 'เป้าหมายรายรับ (Plan)',
                    type: 'line',
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    borderDash: [5, 5],
                    pointStyle: 'circle',
                    data: new Array(12).fill(0)
                },
                {
                    label: 'รายจ่าย (Actual)',
                    backgroundColor: '#f87171',
                    borderRadius: 6,
                    data: new Array(12).fill(0)
                },
                {
                    label: 'เป้าหมายรายจ่าย (Plan)',
                    type: 'line',
                    borderColor: 'rgba(248, 113, 113, 0.4)',
                    borderDash: [5, 5],
                    pointStyle: 'circle',
                    data: new Array(12).fill(0)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'top', align: 'end' }
            }
        }
    });

    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#818cf8', '#38bdf8', '#4ade80', '#fb7185', '#fbbf24', '#a78bfa', '#94a3b8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}

function updateCharts() {
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpense = new Array(12).fill(0);
    const plannedIncome = new Array(12).fill(0);
    const plannedExpense = new Array(12).fill(0);
    
    transactions.forEach(t => {
        const m = new Date(t.date).getMonth();
        if (t.type === 'income') monthlyIncome[m] += t.amount;
        else monthlyExpense[m] += t.amount;
    });

    budgets.forEach(b => {
        if (b.type === 'income') plannedIncome[b.month] += b.amount;
        else plannedExpense[b.month] += b.amount;
    });
    
    mainChart.data.datasets[0].data = monthlyIncome;
    mainChart.data.datasets[1].data = plannedIncome;
    mainChart.data.datasets[2].data = monthlyExpense;
    mainChart.data.datasets[3].data = plannedExpense;
    mainChart.update();
    
    const categoryMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    
    pieChart.data.labels = Object.keys(categoryMap);
    pieChart.data.datasets[0].data = Object.values(categoryMap);
    pieChart.update();
}

window.switchMode = switchMode;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
