/**
 * FinanSmart - Controle Financeiro Pessoal
 * Lógica da aplicação
 */

// --- CONFIGURAÇÕES E ESTADO ---
const DEFAULT_CATEGORIES = [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 
    'Lazer', 'Compras', 'Salário', 'Investimentos', 'Outros'
];

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let categoryChart = null;
let monthlyChart = null;

// --- ELEMENTOS DOM ---
const elements = {
    balance: document.getElementById('total-balance'),
    income: document.getElementById('total-income'),
    expense: document.getElementById('total-expense'),
    savings: document.getElementById('total-savings'),
    recentList: document.getElementById('recent-list'),
    fullList: document.getElementById('full-list'),
    transactionForm: document.getElementById('transaction-form'),
    transactionModal: document.getElementById('transaction-modal'),
    addBtn: document.getElementById('add-transaction-btn'),
    closeModalBtns: document.querySelectorAll('.close-modal'),
    themeBtn: document.getElementById('theme-btn'),
    searchInput: document.getElementById('search-input'),
    filterMonth: document.getElementById('filter-month'),
    filterCategory: document.getElementById('filter-category'),
    sortBy: document.getElementById('sort-by'),
    exportBtn: document.getElementById('export-btn'),
    importInput: document.getElementById('import-input'),
    clearBtn: document.getElementById('clear-btn'),
    navLinks: document.querySelectorAll('.nav-link'),
    viewSections: document.querySelectorAll('.view-section'),
    amountInput: document.getElementById('amount'),
    categorySelect: document.getElementById('category'),
    modalTitle: document.getElementById('modal-title'),
    editId: document.getElementById('edit-id'),
    currentDate: document.getElementById('current-date')
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateDate();
    loadCategories();
    loadMonthFilter();
    updateUI();
    setupEventListeners();
    checkTheme();
}

function updateDate() {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    elements.currentDate.textContent = new Date().toLocaleDateString('pt-BR', options);
}

function loadCategories() {
    const html = DEFAULT_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    elements.categorySelect.innerHTML = html;
    
    const filterHtml = '<option value="all">Todas Categorias</option>' + 
        DEFAULT_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    elements.filterCategory.innerHTML = filterHtml;
}

function loadMonthFilter() {
    const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
    let html = '<option value="all">Todos os Meses</option>';
    
    months.forEach(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        html += `<option value="${m}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
    });
    
    elements.filterMonth.innerHTML = html;
}

// --- LÓGICA DE DADOS ---
function updateUI() {
    calculateTotals();
    renderTransactions();
    updateCharts();
    saveToLocalStorage();
}

function calculateTotals() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
    
    const balance = income - expense;
    const savings = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;

    elements.balance.textContent = formatCurrency(balance);
    elements.income.textContent = formatCurrency(income);
    elements.expense.textContent = formatCurrency(expense);
    elements.savings.textContent = income > 0 ? `${formatCurrency(income - expense)} (${savings}%)` : 'R$ 0,00 (0%)';
}

function renderTransactions() {
    // Recent List (Dashboard)
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    elements.recentList.innerHTML = recent.length ? recent.map(t => createTableRow(t)).join('') : '<tr><td colspan="5" style="text-align:center">Nenhuma transação encontrada</td></tr>';

    // Full List (Transactions View)
    filterAndSortTransactions();
}

function createTableRow(t) {
    const date = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const amountClass = t.type === 'income' ? 'text-income' : 'text-expense';
    const amountSign = t.type === 'income' ? '+' : '-';
    const typeIcon = t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';

    return `
        <tr>
            ${elements.fullList === event?.target ? `<td><i class="fas ${typeIcon} ${amountClass}"></i></td>` : ''}
            <td>${t.description}</td>
            <td><span class="badge">${t.category}</span></td>
            <td>${date}</td>
            <td class="${amountClass}">${amountSign} ${formatCurrency(t.amount)}</td>
            <td>
                <button class="btn btn-secondary btn-icon" onclick="editTransaction('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
}

function filterAndSortTransactions() {
    let filtered = [...transactions];
    
    // Search
    const search = elements.searchInput.value.toLowerCase();
    if (search) {
        filtered = filtered.filter(t => t.description.toLowerCase().includes(search) || t.category.toLowerCase().includes(search));
    }
    
    // Month Filter
    const month = elements.filterMonth.value;
    if (month !== 'all') {
        filtered = filtered.filter(t => t.date.startsWith(month));
    }
    
    // Category Filter
    const cat = elements.filterCategory.value;
    if (cat !== 'all') {
        filtered = filtered.filter(t => t.category === cat);
    }
    
    // Sort
    const sort = elements.sortBy.value;
    filtered.sort((a, b) => {
        if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sort === 'value-desc') return b.amount - a.amount;
        if (sort === 'value-asc') return a.amount - b.amount;
        return 0;
    });

    elements.fullList.innerHTML = filtered.length ? filtered.map(t => {
        const date = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR');
        const amountClass = t.type === 'income' ? 'text-income' : 'text-expense';
        const amountSign = t.type === 'income' ? '+' : '-';
        const typeIcon = t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';
        return `
            <tr>
                <td><i class="fas ${typeIcon} ${amountClass}"></i></td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${date}</td>
                <td class="${amountClass}">${amountSign} ${formatCurrency(t.amount)}</td>
                <td>
                    <button class="btn btn-secondary btn-icon" onclick="editTransaction('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-icon" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="6" style="text-align:center">Nenhuma transação encontrada</td></tr>';
}

// --- GRÁFICOS (CHART.JS) ---
function updateCharts() {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#1e293b';

    // 1. Category Chart (Pizza)
    const expenseData = transactions.filter(t => t.type === 'expense');
    const categories = [...new Set(expenseData.map(t => t.category))];
    const totals = categories.map(cat => expenseData.filter(t => t.category === cat).reduce((acc, t) => acc + t.amount, 0));

    if (categoryChart) categoryChart.destroy();
    
    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: totals,
                backgroundColor: ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#14b8a6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Poppins' } } }
            }
        }
    });

    // 2. Monthly Chart (Barras)
    const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().slice(-6);
    const incomeData = months.map(m => transactions.filter(t => t.date.startsWith(m) && t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
    const outcomeData = months.map(m => transactions.filter(t => t.date.startsWith(m) && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
    const labels = months.map(m => {
        const [y, mon] = m.split('-');
        return new Date(y, mon - 1).toLocaleDateString('pt-BR', { month: 'short' });
    });

    if (monthlyChart) monthlyChart.destroy();
    
    const ctx2 = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Receitas', data: incomeData, backgroundColor: '#10b981', borderRadius: 5 },
                { label: 'Despesas', data: outcomeData, backgroundColor: '#ef4444', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: isDark ? '#334155' : '#e2e8f0' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Poppins' } } }
            }
        }
    });
}

// --- AÇÕES ---
function setupEventListeners() {
    // Navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            elements.viewSections.forEach(s => s.classList.remove('active'));
            document.getElementById(`${viewId}-view`).classList.add('active');
        });
    });

    // Modal
    elements.addBtn.addEventListener('click', () => openModal());
    elements.closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    window.onclick = (e) => { if (e.target === elements.transactionModal) closeModal(); };

    // Form
    elements.transactionForm.addEventListener('submit', handleFormSubmit);
    
    // Amount Mask
    elements.amountInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        value = (value / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
        e.target.value = value;
    });

    // Filters & Search
    elements.searchInput.addEventListener('input', filterAndSortTransactions);
    elements.filterMonth.addEventListener('change', filterAndSortTransactions);
    elements.filterCategory.addEventListener('change', filterAndSortTransactions);
    elements.sortBy.addEventListener('change', filterAndSortTransactions);

    // Theme
    elements.themeBtn.addEventListener('click', toggleTheme);

    // Data Actions
    elements.exportBtn.addEventListener('click', exportData);
    elements.importInput.addEventListener('change', importData);
    elements.clearBtn.addEventListener('click', clearData);
}

function openModal(editData = null) {
    elements.transactionForm.reset();
    if (editData) {
        elements.modalTitle.textContent = 'Editar Transação';
        elements.editId.value = editData.id;
        document.querySelector(`input[name="type"][value="${editData.type}"]`).checked = true;
        elements.description.value = editData.description;
        elements.amountInput.value = formatCurrency(editData.amount);
        elements.date.value = editData.date;
        elements.categorySelect.value = editData.category;
    } else {
        elements.modalTitle.textContent = 'Nova Transação';
        elements.editId.value = '';
        elements.date.value = new Date().toISOString().split('T')[0];
    }
    elements.transactionModal.style.display = 'flex';
}

function closeModal() {
    elements.transactionModal.style.display = 'none';
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const amountStr = elements.amountInput.value.replace(/[R$\s.]/g, "").replace(",", ".");
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Por favor, insira um valor válido', 'error');
        return;
    }

    const transaction = {
        id: elements.editId.value || Date.now().toString(),
        type: document.querySelector('input[name="type"]:checked').value,
        description: document.getElementById('description').value,
        amount: amount,
        date: document.getElementById('date').value,
        category: document.getElementById('category').value
    };

    if (elements.editId.value) {
        const index = transactions.findIndex(t => t.id === transaction.id);
        transactions[index] = transaction;
        showNotification('Transação atualizada com sucesso!');
    } else {
        transactions.push(transaction);
        showNotification('Transação adicionada com sucesso!');
    }

    closeModal();
    updateUI();
    loadMonthFilter();
}

window.deleteTransaction = function(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
        loadMonthFilter();
        showNotification('Transação excluída', 'success');
    }
};

window.editTransaction = function(id) {
    const t = transactions.find(t => t.id === id);
    if (t) openModal(t);
};

// --- UTILITÁRIOS ---
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function saveToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// --- TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const icon = isDark ? 'fa-sun' : 'fa-moon';
    const text = isDark ? 'Modo Claro' : 'Modo Escuro';
    elements.themeBtn.innerHTML = `<i class="fas ${icon}"></i> <span>${text}</span>`;
    
    updateCharts();
}

function checkTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        elements.themeBtn.innerHTML = `<i class="fas fa-sun"></i> <span>Modo Claro</span>`;
    }
}

// --- IMPORTAÇÃO / EXPORTAÇÃO ---
function exportData() {
    if (transactions.length === 0) {
        showNotification('Não há dados para exportar', 'error');
        return;
    }
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'finansmart-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                transactions = imported;
                updateUI();
                loadMonthFilter();
                showNotification('Dados importados com sucesso!');
            } else {
                throw new Error();
            }
        } catch (err) {
            showNotification('Erro ao importar arquivo. Verifique o formato.', 'error');
        }
    };
    reader.readAsText(file);
}

function clearData() {
    if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados permanentemente. Continuar?')) {
        transactions = [];
        updateUI();
        loadMonthFilter();
        showNotification('Todos os dados foram limpos', 'success');
    }
}
