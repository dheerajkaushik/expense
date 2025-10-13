// Global State
let transactions = [];
let expensePieChart;

const CATEGORIES = {
    income: ['Salary', 'Investment', 'Gift', 'Other Income'],
    expense: ['Food', 'Rent', 'Transportation', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other Expense']
};

// DOM Elements
const elements = {
    form: document.getElementById('transaction-form'),
    transactionIdInput: document.getElementById('transaction-id'),
    descriptionInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    dateInput: document.getElementById('date'),
    categorySelect: document.getElementById('category'),
    typeExpenseRadio: document.getElementById('type-expense'),
    typeIncomeRadio: document.getElementById('type-income'),
    submitBtn: document.getElementById('submit-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    errorMsg: document.getElementById('error-message'),
    netIncomeDisplay: document.getElementById('net-income-display'),
    totalIncomeDisplay: document.getElementById('total-income-display'),
    totalExpensesDisplay: document.getElementById('total-expenses-display'),
    transactionList: document.getElementById('transaction-list'),
    categoryFilter: document.getElementById('category-filter'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file')
};

/**
 * Utility function to format numbers as currency.
 * @param {number} amount
 * @returns {string} Formatted currency string.
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

/**
 * Persistence: Saves the current transactions array to Local Storage.
 */
const saveTransactions = () => {
    localStorage.setItem('auraTrackTransactions', JSON.stringify(transactions));
    updateSummary();
};

/**
 * Persistence: Loads transactions from Local Storage on initial load.
 */
const loadTransactions = () => {
    const storedTransactions = localStorage.getItem('auraTrackTransactions');
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    }
    // Set current date as default for convenience
    elements.dateInput.value = new Date().toISOString().split('T')[0];
    renderCategories();
    renderTransactions();
    updateSummary();
};

/**
 * Renders category options in the transaction form and filter dropdowns.
 */
const renderCategories = () => {
    // Populate form category select
    elements.categorySelect.innerHTML = '<option value="">Select Category</option>';
    
    // Determine which categories to show based on selected type
    const selectedType = elements.typeIncomeRadio.checked ? 'income' : 'expense';
    const categoriesToShow = CATEGORIES[selectedType];

    categoriesToShow.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        elements.categorySelect.appendChild(option);
    });

    // Populate filter category select (only done once on load)
    if (elements.categoryFilter.options.length <= 1) {
        elements.categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        CATEGORIES.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            elements.categoryFilter.appendChild(option);
        });
    }
};

/**
 * Validation: Checks form inputs and displays errors.
 * @returns {boolean} True if all inputs are valid.
 */
const validateForm = () => {
    elements.errorMsg.classList.add('hidden');
    let errors = [];

    if (!elements.descriptionInput.value.trim()) {
        errors.push("Description is required.");
    }
    if (parseFloat(elements.amountInput.value) <= 0 || isNaN(parseFloat(elements.amountInput.value))) {
        errors.push("Amount must be a positive number.");
    }
    if (!elements.categorySelect.value) {
        errors.push("Category is required.");
    }
    if (!elements.dateInput.value) {
        errors.push("Date is required.");
    }

    if (errors.length > 0) {
        elements.errorMsg.textContent = errors.join(' ');
        elements.errorMsg.classList.remove('hidden');
        return false;
    }
    return true;
};

/**
 * Handles adding and updating a transaction.
 * @param {Event} e 
 */
const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const id = elements.transactionIdInput.value;
    const isEditing = !!id;

    const newTransaction = {
        id: isEditing ? parseInt(id) : Date.now(),
        description: elements.descriptionInput.value.trim(),
        amount: parseFloat(elements.amountInput.value),
        date: elements.dateInput.value,
        category: elements.categorySelect.value,
        type: elements.typeIncomeRadio.checked ? 'income' : 'expense',
    };

    if (isEditing) {
        // Find and replace the existing transaction
        const index = transactions.findIndex(t => t.id === newTransaction.id);
        if (index !== -1) {
            transactions[index] = newTransaction;
        }
        // Switch back to "Add" mode
        elements.submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Transaction';
        elements.cancelEditBtn.classList.add('hidden');
    } else {
        // Add new transaction
        transactions.push(newTransaction);
    }
    
    // Reset form and UI
    e.target.reset();
    elements.transactionIdInput.value = '';
    elements.typeExpenseRadio.checked = true; // Default to expense
    elements.dateInput.value = new Date().toISOString().split('T')[0]; // Reset date to today
    renderCategories(); // Re-render categories based on default type
    
    saveTransactions();
    renderTransactions();
};

/**
 * Calculates and updates the summary (Total Income, Total Expenses, Net Balance).
 */
const updateSummary = () => {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    elements.netIncomeDisplay.textContent = formatCurrency(netIncome);
    elements.totalIncomeDisplay.textContent = formatCurrency(totalIncome);
    elements.totalExpensesDisplay.textContent = formatCurrency(totalExpenses);

    renderPieChart(totalExpenses); // Update chart with new data
};

/**
 * Renders the list of transactions to the DOM.
 * @param {Array} arr - The array of transactions to render (can be filtered).
 */
const renderTransactions = (arr = transactions) => {
    elements.transactionList.innerHTML = ''; // Clear existing list

    if (arr.length === 0) {
        elements.transactionList.innerHTML = '<li style="text-align: center; color: var(--color-secondary-grey);">No transactions recorded.</li>';
        return;
    }

    arr.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

    arr.forEach(t => {
        const listItem = document.createElement('li');
        const amountClass = t.type === 'income' ? 'income-amount' : 'expense-amount';
        const sign = t.type === 'income' ? '+' : '-';

        listItem.innerHTML = `
            <span class="transaction-date">${t.date}</span>
            <span class="transaction-description">${t.description}</span>
            <span class="category-tag">${t.category}</span>
            <span class="transaction-amount ${amountClass}">${sign} ${formatCurrency(t.amount)}</span>
            <button class="action-btn edit-btn" data-id="${t.id}"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete-btn" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
        `;

        elements.transactionList.appendChild(listItem);
    });

    // Attach event listeners for the dynamically created buttons
    elements.transactionList.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteTransaction);
    });
    elements.transactionList.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEditTransaction);
    });
};

/**
 * Handles deleting a transaction.
 * @param {Event} e 
 */
const handleDeleteTransaction = (e) => {
    const id = parseInt(e.currentTarget.dataset.id);
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderTransactions();
};

/**
 * Handles setting up the form for editing a transaction.
 * @param {Event} e 
 */
const handleEditTransaction = (e) => {
    const id = parseInt(e.currentTarget.dataset.id);
    const transactionToEdit = transactions.find(t => t.id === id);

    if (!transactionToEdit) return;

    // Populate form fields
    elements.transactionIdInput.value = transactionToEdit.id;
    elements.descriptionInput.value = transactionToEdit.description;
    elements.amountInput.value = transactionToEdit.amount;
    elements.dateInput.value = transactionToEdit.date;
    
    // Set Type (which will re-render categories)
    if (transactionToEdit.type === 'income') {
        elements.typeIncomeRadio.checked = true;
    } else {
        elements.typeExpenseRadio.checked = true;
    }
    renderCategories(); // Re-render categories based on the transaction type

    // Set Category
    elements.categorySelect.value = transactionToEdit.category;

    // Change button text and show cancel button
    elements.submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Transaction';
    elements.cancelEditBtn.classList.remove('hidden');
    elements.form.scrollIntoView({ behavior: 'smooth' }); // Scroll to form
};

/**
 * Handles cancelling the edit mode.
 */
const handleCancelEdit = () => {
    elements.form.reset();
    elements.transactionIdInput.value = '';
    elements.typeExpenseRadio.checked = true; // Default to expense
    elements.dateInput.value = new Date().toISOString().split('T')[0]; // Reset date to today
    renderCategories();
    
    // Reset buttons
    elements.submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Transaction';
    elements.cancelEditBtn.classList.add('hidden');
    elements.errorMsg.classList.add('hidden');
};

/**
 * Filters transactions based on the selected category.
 */
const handleFilterChange = () => {
    const selectedCategory = elements.categoryFilter.value;
    let filteredTransactions = transactions;

    if (selectedCategory !== 'all') {
        filteredTransactions = transactions.filter(t => t.category === selectedCategory);
    }

    renderTransactions(filteredTransactions);
};

/**
 * Renders the expense distribution as a Pie Chart using Chart.js.
 * @param {number} totalExpenses - Total calculated expenses.
 */
const renderPieChart = (totalExpenses) => {
    const expenseData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    const labels = Object.keys(expenseData);
    const data = Object.values(expenseData);

    const backgroundColors = [
        '#E53935', '#7B66FF', '#4CAF50', '#FFC107', '#2196F3', '#FF5722', '#673AB7', '#00BCD4'
    ];
    
    const chartData = {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: backgroundColors.slice(0, labels.length),
            hoverOffset: 8
        }]
    };

    const config = {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--color-text-primary)',
                        font: { family: 'Inter' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            const value = context.parsed;
                            const percentage = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0;
                            return `${label} ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };

    // Destroy previous chart instance if it exists to avoid memory leaks
    if (expensePieChart) {
        expensePieChart.destroy();
    }

    const ctx = document.getElementById('expense-pie-chart').getContext('2d');
    expensePieChart = new Chart(ctx, config);
};

/**
 * Export: Downloads transactions as a JSON file.
 */
const handleExport = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auratrack_transactions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Import: Triggers the file input click.
 */
const handleImportClick = () => {
    elements.importFile.click();
};

/**
 * Import: Reads the JSON file and updates transactions.
 * @param {Event} e 
 */
const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                if (confirm('Are you sure you want to replace your current transactions with the imported data?')) {
                    transactions = importedData;
                    saveTransactions();
                    renderTransactions();
                    alert('Data imported successfully!');
                }
            } else {
                alert('Invalid file format. Please import a valid JSON array.');
            }
        } catch (error) {
            alert('Error reading or parsing file: ' + error.message);
        }
        // Reset file input to allow importing the same file again
        elements.importFile.value = ''; 
    };
    reader.readAsText(file);
};


// -----------------------------------------------------------
// INITIALIZATION AND EVENT LISTENERS
// -----------------------------------------------------------

// 1. Initial Load
document.addEventListener('DOMContentLoaded', loadTransactions);

// 2. Form Submission (Add/Edit)
elements.form.addEventListener('submit', handleFormSubmit);

// 3. Category Re-render on Type Change
elements.typeExpenseRadio.addEventListener('change', renderCategories);
elements.typeIncomeRadio.addEventListener('change', renderCategories);

// 4. Cancel Edit
elements.cancelEditBtn.addEventListener('click', handleCancelEdit);

// 5. Filter Transactions
elements.categoryFilter.addEventListener('change', handleFilterChange);

// 6. Export/Import
elements.exportBtn.addEventListener('click', handleExport);
elements.importBtn.addEventListener('click', handleImportClick);
elements.importFile.addEventListener('change', handleImportFile);