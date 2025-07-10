// Текущая дата для формы
document.getElementById('date').valueAsDate = new Date();

// База данных транзакций (в реальном приложении будет на сервере)
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChart, trendChart;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    loadTransactions();
    updateSummary();
    runAnalysis();
    
    // Обработка формы добавления транзакции
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction();
    });
    
    // Фильтрация транзакций
    document.getElementById('transactionFilter').addEventListener('change', function() {
        loadTransactions();
    });
    
    // Кнопка загрузки файла
    document.getElementById('fileUploadBtn').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });
    
    // Обработка загрузки файла
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // Экспорт данных
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    
    // Обновление анализа
    document.getElementById('runAnalysisBtn').addEventListener('click', runAnalysis);
    
    // Drag and drop для файлов
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4361ee';
        dropZone.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#ccc';
        dropZone.style.backgroundColor = '';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.backgroundColor = '';
        
        if (e.dataTransfer.files.length) {
            document.getElementById('fileInput').files = e.dataTransfer.files;
            handleFileUpload(e);
        }
    });
});

// Функция добавления транзакции
function addTransaction() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    
    if (!amount || !description || !date) {
        showToast('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type,
        category,
        amount,
        description,
        date
    };
    
    transactions.push(transaction);
    saveTransactions();
    
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    
    showToast('Транзакция успешно добавлена!', 'success');
    loadTransactions();
    updateSummary();
    updateCharts();
    runAnalysis();
}

// Функция загрузки транзакций
function loadTransactions() {
    const container = document.getElementById('transactionsContainer');
    const filter = document.getElementById('transactionFilter').value;
    
    // Фильтрация транзакций
    let filteredTransactions = transactions;
    if (filter !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === filter);
    }
    
    // Сортировка по дате (новые сверху)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Отображение транзакций
    if (filteredTransactions.length === 0) {
        container.innerHTML = `<div class="text-center py-4">
            <i class="fas fa-wallet fa-3x mb-3 text-muted"></i>
            <p class="text-muted">Нет транзакций для отображения</p>
        </div>`;
        return;
    }
    
    let html = '';
    filteredTransactions.forEach(transaction => {
        const isIncome = transaction.type === 'income';
        const date = new Date(transaction.date).toLocaleDateString('ru-RU');
        
        html += `
        <div class="transaction-item ${isIncome ? 'income-item' : 'expense-item'} p-3 mb-3 bg-light">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${getCategoryName(transaction.category)}</h6>
                    <small class="text-muted">${date}</small>
                    <div class="mt-1 small text-truncate">${transaction.description}</div>
                </div>
                <div class="text-end ms-2">
                    <div class="fw-bold ${isIncome ? 'text-success' : 'text-danger'} amount-cell">
                        ${isIncome ? '+' : '-'}${transaction.amount.toLocaleString('ru-RU')} ₽
                    </div>
                    <button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

// Удаление транзакции
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    loadTransactions();
    updateSummary();
    updateCharts();
    runAnalysis();
    showToast('Транзакция удалена', 'success');
}

// Сохранение транзакций в localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Обновление финансовой сводки
function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const balance = income - expense;
    const total = income + expense;
    const incomePercent = total > 0 ? Math.round((income / total) * 100) : 0;
    const expensePercent = total > 0 ? Math.round((expense / total) * 100) : 0;
    
    document.getElementById('balanceAmount').textContent = balance.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('incomeAmount').textContent = income.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('expenseAmount').textContent = expense.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('incomePercent').textContent = incomePercent + '%';
    document.getElementById('expensePercent').textContent = expensePercent + '%';
    document.getElementById('incomeBar').style.width = incomePercent + '%';
    document.getElementById('expenseBar').style.width = expensePercent + '%';
}

// Инициализация графиков
function initCharts() {
    // График распределения расходов
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // График динамики
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Доходы',
                data: [],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.3,
                fill: true
            }, {
                label: 'Расходы',
                data: [],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    updateCharts();
}

// Обновление данных графиков
function updateCharts() {
    // Распределение расходов по категориям
    const expenseCategories = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            if (!expenseCategories[t.category]) {
                expenseCategories[t.category] = 0;
            }
            expenseCategories[t.category] += t.amount;
        });
    
    const expenseLabels = Object.keys(expenseCategories).map(getCategoryName);
    const expenseAmounts = Object.values(expenseCategories);
    
    expenseChart.data.labels = expenseLabels;
    expenseChart.data.datasets[0].data = expenseAmounts;
    expenseChart.update();
    
    // Динамика доходов/расходов по месяцам
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.date);
        const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });
        
        if (!monthlyData[month]) {
            monthlyData[month] = {
                name: monthName,
                income: 0,
                expense: 0
            };
        }
        
        if (t.type === 'income') {
            monthlyData[month].income += t.amount;
        } else {
            monthlyData[month].expense += t.amount;
        }
    });
    
    // Сортировка по месяцам
    const sortedMonths = Object.keys(monthlyData).sort();
    const monthNames = sortedMonths.map(m => monthlyData[m].name);
    const incomeData = sortedMonths.map(m => monthlyData[m].income);
    const expenseData = sortedMonths.map(m => monthlyData[m].expense);
    
    trendChart.data.labels = monthNames;
    trendChart.data.datasets[0].data = incomeData;
    trendChart.data.datasets[1].data = expenseData;
    trendChart.update();
}

// AI-анализ данных
function runAnalysis() {
    if (transactions.length === 0) {
        document.getElementById('aiAnalysisContent').innerHTML = `
            <p class="mb-0">Добавьте транзакции для проведения анализа</p>
        `;
        return;
    }
    
    // В реальном приложении здесь будет запрос к AI API
    // Для демонстрации сгенерируем "анализ" на основе данных
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    
    // Самые большие категории расходов
    const expenseCategories = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            if (!expenseCategories[t.category]) {
                expenseCategories[t.category] = 0;
            }
            expenseCategories[t.category] += t.amount;
        });
    
    const topExpense = Object.entries(expenseCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);
    
    // Генерация "анализа"
    let analysisHTML = `
        <p class="mb-0">На основе ваших ${transactions.length} транзакций:</p>
        <ul>
            <li>Ваш текущий баланс: <strong>${balance.toLocaleString('ru-RU')} ₽</strong></li>
            <li>Ваш уровень сбережений: <strong>${savingsRate}%</strong> от дохода</li>
    `;
    
    if (topExpense.length > 0) {
        analysisHTML += `
            <li>Основная статья расходов: <strong>${getCategoryName(topExpense[0][0])}</strong> 
            (${Math.round((topExpense[0][1] / expense) * 100)}% всех расходов)</li>
        `;
    }
    
    if (savingsRate < 20) {
        analysisHTML += `
            <li>Рекомендация: попробуйте сократить расходы на развлечения и покупки, 
            чтобы увеличить уровень сбережений до 20%</li>
        `;
    } else {
        analysisHTML += `
            <li>Отличный результат! Вы сохраняете больше 20% своего дохода</li>
        `;
    }
    
    analysisHTML += `
            <li>Самый прибыльный месяц: <strong>Ноябрь</strong> (доходы: ${income.toLocaleString('ru-RU')} ₽)</li>
        </ul>
    `;
    
    document.getElementById('aiAnalysisContent').innerHTML = analysisHTML;
    showToast('Анализ финансов обновлен', 'success');
}

// Обработка загрузки файла
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // В реальном приложении здесь будет обработка файла
            // Для демонстрации добавим фиктивные транзакции
            
            // Очистка файлового инпута
            document.getElementById('fileInput').value = '';
            
            // Имитация обработки файла
            setTimeout(() => {
                const newTransactions = [
                    {
                        id: Date.now() + 1,
                        type: 'income',
                        category: 'freelance',
                        amount: 15000,
                        description: 'Проект по веб-разработке',
                        date: '2023-11-10'
                    },
                    {
                        id: Date.now() + 2,
                        type: 'expense',
                        category: 'shopping',
                        amount: 7500,
                        description: 'Новый ноутбук',
                        date: '2023-11-12'
                    }
                ];
                
                transactions = [...transactions, ...newTransactions];
                saveTransactions();
                
                loadTransactions();
                updateSummary();
                updateCharts();
                runAnalysis();
                
                showToast('Файл успешно обработан! Добавлено 2 транзакции', 'success');
            }, 2000);
        } catch (error) {
            showToast('Ошибка при обработке файла', 'error');
            console.error(error);
        }
    };
    
    reader.readAsArrayBuffer(file);
    showToast('Обработка файла...', 'info');
}

// Экспорт в Excel
function exportToExcel() {
    if (transactions.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    try {
        // Подготовка данных
        const data = transactions.map(t => ({
            'Дата': new Date(t.date).toLocaleDateString('ru-RU'),
            'Тип': t.type === 'income' ? 'Доход' : 'Расход',
            'Категория': getCategoryName(t.category),
            'Сумма (₽)': t.amount,
            'Описание': t.description
        }));
        
        // Создание рабочей книги
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');
        
        // Сохранение файла
        XLSX.writeFile(wb, 'financial_report.xlsx');
        showToast('Файл успешно экспортирован', 'success');
    } catch (error) {
        showToast('Ошибка при экспорте данных', 'error');
        console.error(error);
    }
}

// Вспомогательные функции
function getCategoryName(category) {
    const names = {
        'salary': 'Зарплата',
        'freelance': 'Фриланс',
        'investment': 'Инвестиции',
        'food': 'Еда',
        'transport': 'Транспорт',
        'entertainment': 'Развлечения',
        'shopping': 'Покупки'
    };
    return names[category] || category;
}

function showToast(message, type) {
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} mb-3`;
    toast.innerHTML = `
        <div class="toast-body d-flex justify-content-between">
            <div>${message}</div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Инициализация и показ toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Удаление toast после скрытия
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}