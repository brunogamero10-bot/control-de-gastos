const form = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const totalExpenses = document.getElementById('total-expenses');
const totalIncome = document.getElementById('total-income');
const balance = document.getElementById('balance');
const clearAllButton = document.getElementById('clear-all');
const chartCanvas = document.getElementById('finance-chart');
const chartCtx = chartCanvas ? chartCanvas.getContext('2d') : null;
const filterButtons = document.querySelectorAll('[data-filter]');
const categoryFilter = document.getElementById('category-filter');
const transactionCountEl = document.getElementById('transaction-count');
const topExpenseEl = document.getElementById('top-expense');
const topIncomeEl = document.getElementById('top-income');
const categoryBreakdownEl = document.getElementById('category-breakdown');
const breakdownTotal = document.getElementById('breakdown-total');

let activeTypeFilter = 'Todos';
let activeCategoryFilter = '';

const STORAGE_KEY = 'control-gastos-app';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function getExpenses() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.warn('LocalStorage corrupto, reiniciando transacciones', error);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function calculateTotals(transactions) {
  const income = transactions
    .filter(item => item.type === 'Ingreso')
    .reduce((sum, item) => sum + item.amount, 0);
  const total = transactions
    .filter(item => item.type === 'Gasto')
    .reduce((sum, item) => sum + item.amount, 0);
  return { total, income, balance: income - total };
}

function buildChartData(transactions) {
  const income = transactions
    .filter(item => item.type === 'Ingreso')
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions
    .filter(item => item.type === 'Gasto')
    .reduce((sum, item) => sum + item.amount, 0);
  return [
    { label: 'Ingresos', value: income, color: '#f5c518' },
    { label: 'Gastos', value: expense, color: '#eab308' },
  ];
}

function drawChart(transactions) {
  if (!chartCtx || !chartCanvas) return;
  const data = buildChartData(transactions);
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(chartCanvas.clientWidth * dpr);
  const height = Math.floor(chartCanvas.clientHeight * dpr);
  if (chartCanvas.width !== width || chartCanvas.height !== height) {
    chartCanvas.width = width;
    chartCanvas.height = height;
  }
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const displayWidth = chartCanvas.clientWidth;
  const displayHeight = chartCanvas.clientHeight;
  const padding = 26;
  chartCtx.clearRect(0, 0, displayWidth, displayHeight);

  chartCtx.fillStyle = 'rgba(20, 23, 40, 0.95)';
  chartCtx.fillRect(0, 0, displayWidth, displayHeight);
  chartCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  chartCtx.lineWidth = 1;
  chartCtx.strokeRect(0, 0, displayWidth, displayHeight);

  const centerX = displayWidth / 2;
  const centerY = displayHeight / 2 - 10;
  const radius = Math.min(displayWidth, displayHeight) / 2 - 56;
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  let startAngle = -Math.PI / 2;

  data.forEach(item => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const gradient = chartCtx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, 'rgba(255,255,255,0.18)');

    chartCtx.beginPath();
    chartCtx.arc(centerX, centerY, radius, startAngle, endAngle);
    chartCtx.strokeStyle = gradient;
    chartCtx.lineWidth = 30;
    chartCtx.lineCap = 'round';
    chartCtx.stroke();

    startAngle = endAngle;
  });

  chartCtx.beginPath();
  chartCtx.arc(centerX, centerY, radius - 18, 0, Math.PI * 2);
  chartCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  chartCtx.fill();

  const totals = calculateTotals(transactions);
  chartCtx.fillStyle = '#f8fafc';
  chartCtx.textAlign = 'center';
  chartCtx.font = '600 15px Inter, system-ui';
  chartCtx.fillText('Balance', centerX, centerY - 12);
  chartCtx.font = '700 22px Inter, system-ui';
  chartCtx.fillText(formatCurrency(totals.balance), centerX, centerY + 18);

  let legendX = padding;
  const legendY = displayHeight - 18;
  data.forEach(item => {
    chartCtx.fillStyle = item.color;
    chartCtx.fillRect(legendX, legendY - 8, 12, 12);
    chartCtx.fillStyle = '#e5e7eb';
    chartCtx.font = '500 12px Inter, system-ui';
    chartCtx.textAlign = 'left';
    chartCtx.fillText(`${item.label} ${formatCurrency(item.value)}`, legendX + 18, legendY + 2);
    legendX += 150;
  });
}

function getCategoryIcon(category) {
  const icons = {
    Transporte: '🚗',
    Alimentos: '🍽️',
    Hogar: '🏠',
    Entretenimiento: '🎬',
    Salud: '💊',
    Salario: '💼',
    Ahorros: '💰',
    Ventas: '🛒',
    Reembolso: '🔄',
    Otros: '✨',
  };
  return icons[category] || '💠';
}

  function filterTransactions(transactions) {
    return transactions.filter(item => {
      const matchesType = activeTypeFilter === 'Todos' || item.type === activeTypeFilter;
      const matchesCategory = !activeCategoryFilter || item.category === activeCategoryFilter;
      return matchesType && matchesCategory;
    });
  }

  function getTopTransaction(transactions, type) {
    return transactions
      .filter(item => item.type === type)
      .sort((a, b) => b.amount - a.amount)[0];
  }

  function getCategoryTotals(transactions) {
    return transactions.reduce((totals, item) => {
      if (!totals[item.category]) totals[item.category] = 0;
      totals[item.category] += item.amount;
      return totals;
    }, {});
  }

  function renderCategoryBreakdown(transactions) {
    const totals = getCategoryTotals(transactions);
    const rows = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const totalValue = rows.reduce((sum, [, value]) => sum + value, 0);
    breakdownTotal.textContent = formatCurrency(totalValue);
    categoryBreakdownEl.innerHTML = '';
    if (!rows.length) {
      categoryBreakdownEl.innerHTML = '<p class="empty-state">Registra transacciones para ver el desglose.</p>';
      return;
    }
    rows.forEach(([category, value]) => {
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      const percentage = totalValue ? Math.round((value / totalValue) * 100) : 0;
      row.innerHTML = `
        <span>${category}<strong>${formatCurrency(value)}</strong></span>
        <div class="breakdown-bar"><div class="breakdown-progress" style="width: ${percentage}%"></div></div>
      `;
      categoryBreakdownEl.appendChild(row);
    });
  }

  function renderInsights(transactions) {
    transactionCountEl.textContent = transactions.length;
    const topExpense = getTopTransaction(transactions, 'Gasto');
    const topIncome = getTopTransaction(transactions, 'Ingreso');
    topExpenseEl.textContent = topExpense ? `-${formatCurrency(topExpense.amount)}` : '-';
    topIncomeEl.textContent = topIncome ? `+${formatCurrency(topIncome.amount)}` : '-';
    renderCategoryBreakdown(transactions);
  }

  function setActiveFilter(filter) {
    activeTypeFilter = filter;
    filterButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.filter === filter);
    });
  }

function createExpenseCard(transaction) {
  const item = document.createElement('article');
  item.className = `expense-item ${transaction.type.toLowerCase()}`;
  item.innerHTML = `
    <div class="expense-info">
      <strong>${transaction.name}</strong>
      <div class="tag-row">
        <span class="category-icon">${getCategoryIcon(transaction.category)}</span>
        <span class="category">${transaction.category}</span>
        <span class="type-pill">${transaction.type}</span>
      </div>
      <small>${transaction.date}</small>
    </div>
    <div class="expense-value">
      <span>${transaction.type === 'Gasto' ? '-' : '+'}${formatCurrency(transaction.amount)}</span>
      <button class="icon-button remove" data-id="${transaction.id}" aria-label="Eliminar transacción">×</button>
    </div>
  `;

  const removeButton = item.querySelector('.remove');
  removeButton.addEventListener('click', () => removeExpense(transaction.id));

  return item;
}

function renderExpenses() {
  const transactions = getExpenses();
  const filteredTransactions = filterTransactions(transactions);
  expenseList.innerHTML = '';

  if (!transactions.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No hay transacciones registradas. Agrega la primera.';
    expenseList.appendChild(empty);
    updateSummary(transactions);
    drawChart(transactions);
    renderInsights(transactions);
    return;
  }

  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  filteredTransactions.forEach(transaction => expenseList.appendChild(createExpenseCard(transaction)));
  updateSummary(transactions);
  drawChart(transactions);
  renderInsights(transactions);
}

function updateSummary(expenses) {
  const totals = calculateTotals(expenses);
  totalExpenses.textContent = formatCurrency(totals.total);
  totalIncome.textContent = formatCurrency(totals.income);
  balance.textContent = formatCurrency(totals.balance);
  balance.classList.toggle('positive', totals.balance >= 0);
  balance.classList.toggle('negative', totals.balance < 0);
}

function addExpense(expense) {
  const transactions = getExpenses();
  transactions.push(expense);
  saveExpenses(transactions);
  renderExpenses();
}

function removeExpense(id) {
  const expenses = getExpenses().filter(expense => expense.id !== id);
  saveExpenses(expenses);
  renderExpenses();
}

function clearAllExpenses() {
  localStorage.removeItem(STORAGE_KEY);
  renderExpenses();
}

function initializeDate() {
  const dateInput = document.getElementById('expense-date');
  dateInput.valueAsDate = new Date();
}

function initApp() {
  initializeDate();
  renderExpenses();
  if (!form || !clearAllButton) return;
  setActiveFilter(activeTypeFilter);
  form.addEventListener('submit', event => {
    event.preventDefault();

    const name = document.getElementById('expense-name').value.trim();
    const type = document.getElementById('expense-type').value;
    const category = document.getElementById('expense-category').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;

    if (!name || !category || !amount || !date) return;

    addExpense({
      id: `expense-${Date.now()}`,
      name,
      type,
      category,
      amount,
      date,
    });

    form.reset();
    initializeDate();
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      setActiveFilter(button.dataset.filter);
      renderExpenses();
    });
  });

  if (categoryFilter) {
    categoryFilter.addEventListener('change', event => {
      activeCategoryFilter = event.target.value;
      renderExpenses();
    });
  }

  clearAllButton.addEventListener('click', () => {
    if (confirm('¿Deseas eliminar todas las transacciones?')) {
      clearAllExpenses();
    }
  });
}

window.addEventListener('DOMContentLoaded', initApp);
