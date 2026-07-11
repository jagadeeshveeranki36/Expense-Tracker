/*
  Expense Tracker — Local Single Page Application Engine
  Handles state management, client-side routing, user sessions (up to 5 accounts),
  IndexedDB/LocalStorage databases, forms, captcha, Chart.js re-renders, and CSV/Excel/PDF exports.
*/

// Brand color maps for Chart.js
const brandColors = {
    Food: '#6366f1',
    Travel: '#06b6d4',
    Shopping: '#ec4899',
    Bills: '#f59e0b',
    Entertainment: '#8b5cf6',
    Healthcare: '#ef4444',
    Education: '#10b981',
    Others: '#64748b'
};

const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CNY: '¥'
};

// Realistic exchange rates relative to USD
const exchangeRates = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.3,
    JPY: 156.0,
    AUD: 1.50,
    CAD: 1.36,
    CNY: 7.24
};

// Global SPA State
let state = {
    users: [],              // User profiles
    activeUserIds: [],      // Concurrent logged-in user IDs (up to 5)
    currentUserId: null,    // Active session user ID
    expenses: [],           // All expenses
    budgets: [],            // Category budgets
    currentEditExpenseId: null, // Temporary storage for editing
    captchaAnswer: '',
    addAccountMode: false,  // True if adding an account to switcher
    expenseFilter: {
        search: '',
        category: '',
        dateFrom: '',
        dateTo: '',
        sort: 'latest'
    },
    expensesPage: 1,
    expensesPerPage: 8
};

// Main Entry Point
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load data from LocalStorage
    initDatabase();

    // 2. Setup Captcha & Event Bindings
    generateCaptcha();
    bindEvents();

    // 3. Setup Client-Side Routing
    initRouting();
    
    // 4. Set Initial Theme
    const savedTheme = localStorage.getItem('et_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);
});

// ==========================================
// DATABASE & STORAGE ENGINE
// ==========================================
function initDatabase() {
    state.users = JSON.parse(localStorage.getItem('et_users')) || [];
    state.activeUserIds = JSON.parse(localStorage.getItem('et_active_user_ids')) || [];
    state.currentUserId = JSON.parse(localStorage.getItem('et_current_user_id')) || null;
    state.expenses = JSON.parse(localStorage.getItem('et_expenses')) || [];
    state.budgets = JSON.parse(localStorage.getItem('et_budgets')) || [];

    // If no users exist, seed default database with John Doe for testing
    if (state.users.length === 0) {
        seedDatabase();
    }
}

function saveDatabase() {
    localStorage.setItem('et_users', JSON.stringify(state.users));
    localStorage.setItem('et_active_user_ids', JSON.stringify(state.activeUserIds));
    localStorage.setItem('et_current_user_id', JSON.stringify(state.currentUserId));
    localStorage.setItem('et_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('et_budgets', JSON.stringify(state.budgets));
}

function seedDatabase() {
    // Create John Doe profile
    const johnId = 1779346800; // Unique static ID
    const john = {
        id: johnId,
        username: "John Doe",
        email: "john@example.com",
        passwordHash: "Password123!", // Plain password matching requirements
        profilePic: "avatar-1.svg",
        currency: "INR",
        bankName: "Primary Bank",
        createdAt: new Date().toISOString()
    };
    state.users.push(john);
    state.activeUserIds.push(johnId);
    state.currentUserId = johnId;

    // Create expenses in current month to guarantee beautiful rendering
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const seededExpenses = [
        { id: 1, userId: johnId, category: "Food", original_amount: 1450.00, currency: "INR", amount: 1450.00, description: "Office lunch party", date: `${year}-${month}-03` },
        { id: 2, userId: johnId, category: "Travel", original_amount: 3200.00, currency: "INR", amount: 3200.00, description: "Weekly fuel refilling", date: `${year}-${month}-05` },
        { id: 3, userId: johnId, category: "Bills", original_amount: 4500.00, currency: "INR", amount: 4500.00, description: "Electricity bill payment", date: `${year}-${month}-10` },
        { id: 4, userId: johnId, category: "Shopping", original_amount: 2800.00, currency: "INR", amount: 2800.00, description: "Denim jacket purchase", date: `${year}-${month}-12` },
        { id: 5, userId: johnId, category: "Entertainment", original_amount: 950.00, currency: "INR", amount: 950.00, description: "Movie night tickets", date: `${year}-${month}-15` },
        { id: 6, userId: johnId, category: "Healthcare", original_amount: 1200.00, currency: "INR", amount: 1200.00, description: "Multivitamin supplements", date: `${year}-${month}-18` }
    ];

    const seededBudgets = [
        { id: 1, userId: johnId, category: "Food", limit: 2000.00, month: now.getMonth() + 1, year: year },
        { id: 2, userId: johnId, category: "Shopping", limit: 2000.00, month: now.getMonth() + 1, year: year }, // Overspent!
        { id: 3, userId: johnId, category: "Travel", limit: 5000.00, month: now.getMonth() + 1, year: year },
        { id: 4, userId: johnId, category: "Bills", limit: 6000.00, month: now.getMonth() + 1, year: year }
    ];

    state.expenses.push(...seededExpenses);
    state.budgets.push(...seededBudgets);
    saveDatabase();
}

// ==========================================
// ROUTING ENGINE
// ==========================================
function initRouting() {
    // Listen to hash changes for page navigation
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
}

function handleRouting() {
    const hash = window.location.hash || '#/landing';
    const currentUser = getCurrentUser();

    // Route Guards
    if (!currentUser) {
        // If not logged in, force navigation back to landing/login/register
        if (hash !== '#/login' && hash !== '#/register') {
            window.location.hash = '#/landing';
            showSection('landing-section');
            return;
        }
        showSection(hash === '#/login' ? 'login-section' : 'register-section');
    } else {
        // If logged in, block access to landing/login/register pages
        if (hash === '#/landing' || hash === '#/login' || hash === '#/register') {
            window.location.hash = '#/dashboard';
            showSection('dashboard-section');
            return;
        }

        // Active layout mapping
        const routeMap = {
            '#/dashboard': 'dashboard-section',
            '#/expenses': 'expenses-section',
            '#/reports': 'reports-section',
            '#/profile': 'profile-section'
        };

        const sectionId = routeMap[hash] || 'dashboard-section';
        showSection(sectionId);
    }
}

function showSection(sectionId) {
    // Hide all screen sections
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.classList.add('d-none');
    });

    // Display selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }

    // Toggle base application elements (sidebar, topbar, bottom nav)
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.body.classList.add('user-logged-in');
        document.body.classList.remove('user-visitor');
        document.querySelectorAll('.sidebar, .topbar, .bottom-nav').forEach(el => el.classList.remove('d-none'));
        
        // Refresh appropriate view components
        if (sectionId === 'dashboard-section') {
            renderDashboard();
        } else if (sectionId === 'expenses-section') {
            renderExpensesList();
        } else if (sectionId === 'reports-section') {
            renderReports();
        } else if (sectionId === 'profile-section') {
            renderProfile();
        }

        // Highlight Nav menu item
        updateNavHighlight(window.location.hash);
        
        // Update user dropdown headers
        renderUserDropdown();
    } else {
        document.body.classList.remove('user-logged-in');
        document.body.classList.add('user-visitor');
        document.querySelectorAll('.sidebar, .topbar, .bottom-nav').forEach(el => el.classList.add('d-none'));
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Initialise Scroll Revel transitions
    triggerEntranceAnimations();
}

function updateNavHighlight(hash) {
    document.querySelectorAll('.sidebar-menu .menu-item, .bottom-nav .bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === hash) {
            item.classList.add('active');
        }
    });
}

function triggerEntranceAnimations() {
    const animatedCards = document.querySelectorAll('.app-section:not(.d-none) .glass-card, .app-section:not(.d-none) .table-responsive-custom, .app-section:not(.d-none) .animate-entrance');
    animatedCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 80 * index);
    });
}

// ==========================================
// CORE LAYOUTS RENDERING
// ==========================================
function getCurrentUser() {
    if (!state.currentUserId) return null;
    return state.users.find(u => u.id === state.currentUserId) || null;
}

function renderUserDropdown() {
    const user = getCurrentUser();
    if (!user) return;

    const dropdownContainers = document.querySelectorAll('.topbar-actions .dropdown');
    dropdownContainers.forEach(container => {
        // Build Google-style multi-account layout inside dropdown-menu
        const symbol = currencySymbols[user.currency] || '$';
        const userPicPath = user.profilePic.startsWith('data:image') ? user.profilePic : `static/images/${user.profilePic}`;

        // Top trigger updates
        const trigger = container.querySelector('#userDropdown');
        if (trigger) {
            trigger.innerHTML = `
                <img src="${userPicPath}" class="user-avatar-sm border border-2 border-primary" style="border-color: var(--brand-primary) !important;" alt="User profile picture">
                <div class="d-none d-sm-flex flex-column align-items-start text-start" style="line-height: 1.2;">
                    <span class="fw-semibold text-truncate" style="color: var(--text-primary); max-width: 120px;">${user.username}</span>
                    <span class="text-secondary small" style="font-size: 0.7rem;">${user.bankName || 'Primary Bank'}</span>
                </div>
            `;
        }

        // Build list of alternate accounts
        let switchAccountsHtml = '';
        const alternateIds = state.activeUserIds.filter(id => id !== user.id);
        
        if (alternateIds.length > 0) {
            switchAccountsHtml = `
                <li class="dropdown-header text-uppercase tracking-wider px-2 py-1 mb-1" style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">
                    Switch Bank Accounts
                </li>
            `;
            
            alternateIds.forEach(altId => {
                const altUser = state.users.find(u => u.id === altId);
                if (altUser) {
                    const altPic = altUser.profilePic.startsWith('data:image') ? altUser.profilePic : `static/images/${altUser.profilePic}`;
                    switchAccountsHtml += `
                        <li>
                            <button class="dropdown-item py-2 px-2 rounded-2 d-flex align-items-center gap-2 mb-1 border-0 bg-transparent w-100" onclick="switchActiveUser(${altUser.id})">
                                <img src="${altPic}" class="rounded-circle border border-light-subtle" style="width: 32px; height: 32px; object-fit: cover;" alt="${altUser.username}">
                                <div class="d-flex flex-column align-items-start text-start" style="line-height: 1.2;">
                                    <span class="fw-semibold text-truncate small" style="color: var(--text-primary);">${altUser.username}</span>
                                    <span class="text-secondary" style="font-size: 0.65rem;">${altUser.bankName || 'Primary Bank'}</span>
                                </div>
                            </button>
                        </li>
                    `;
                }
            });
            switchAccountsHtml += `<li><hr class="dropdown-divider my-2"></li>`;
        }

        const addAccountBtnHtml = state.activeUserIds.length < 5 ? `
            <li>
                <button class="dropdown-item py-2 px-2 small d-flex align-items-center gap-2 rounded-2 text-indigo fw-semibold border-0 bg-transparent w-100" onclick="triggerAddAccountMode()" style="color: var(--brand-primary) !important;">
                    <i class="bi bi-plus-circle-fill fs-6"></i> Add Bank Account
                </button>
            </li>
        ` : '';

        // Complete dropdown menu build
        const menu = container.querySelector('.dropdown-menu');
        if (menu) {
            menu.innerHTML = `
                <!-- Current Active Account Info -->
                <li class="text-center py-2 px-1 border-bottom border-light-subtle mb-2">
                    <div class="position-relative d-inline-block mb-2">
                        <img src="${userPicPath}" class="border border-3 border-primary rounded-circle" style="width: 64px; height: 64px; object-fit: cover;" alt="User profile picture">
                    </div>
                    <div class="fw-bold brand-font" style="color: var(--text-primary);">${user.username}</div>
                    <div class="text-secondary small mb-1">${user.email}</div>
                    <span class="badge bg-primary-subtle text-primary small py-1 px-2 border border-primary-subtle" style="background-color: rgba(79, 70, 229, 0.1);">
                        <i class="bi bi-bank me-1"></i> ${user.bankName || 'Primary Bank'}
                    </span>
                </li>
                
                <!-- Other Logged-in Accounts Switcher -->
                ${switchAccountsHtml}
                
                <!-- Quick Actions & Management -->
                <li>
                    <a class="dropdown-item py-2 px-2 small d-flex align-items-center gap-2 rounded-2" href="#/profile">
                        <i class="bi bi-person-gear fs-6 text-secondary"></i> Profile Settings
                    </a>
                </li>
                ${addAccountBtnHtml}
                <li><hr class="dropdown-divider my-2"></li>
                <li>
                    <button class="dropdown-item py-2 px-2 small d-flex align-items-center gap-2 text-danger rounded-2 border-0 bg-transparent w-100" onclick="logoutCurrentUser()">
                        <i class="bi bi-box-arrow-left fs-6"></i> Sign Out Current Account
                    </button>
                </li>
                <li>
                    <button class="dropdown-item py-2 px-2 small d-flex align-items-center gap-2 text-danger fw-semibold bg-danger-subtle bg-opacity-10 rounded-2 mt-1 border-0 w-100" onclick="logoutAllAccounts()">
                        <i class="bi bi-x-circle fs-6"></i> Sign Out All Accounts
                    </button>
                </li>
            `;
        }
    });

    // Update greeting banner names globally
    document.querySelectorAll('.topbar h1.brand-font').forEach(title => {
        title.innerHTML = `Hello, ${user.username.split(' ')[0]}`;
    });
}

function triggerAddAccountMode() {
    state.addAccountMode = true;
    window.location.hash = '#/login';
}

// ==========================================
// SECURITY RATELIMITS & lockout ENGINE
// ==========================================
function getLoginLockoutRemaining() {
    const lockoutTime = localStorage.getItem('et_lockout_time');
    if (!lockoutTime) return 0;
    const remaining = Math.ceil((parseInt(lockoutTime) - Date.now()) / 1000);
    if (remaining <= 0) {
        localStorage.removeItem('et_lockout_time');
        localStorage.removeItem('et_login_attempts');
        return 0;
    }
    return remaining;
}

function recordFailedLoginAttempt() {
    let attempts = parseInt(localStorage.getItem('et_login_attempts') || '0') + 1;
    localStorage.setItem('et_login_attempts', String(attempts));
    
    if (attempts >= 5) {
        const lockoutEnd = Date.now() + 30000; // 30 second cooldown
        localStorage.setItem('et_lockout_time', String(lockoutEnd));
        return true; // locked out
    }
    return false;
}

function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
    
    let ans;
    if (op === '+') ans = num1 + num2;
    else if (op === '-') ans = num1 - num2;
    else ans = num1 * num2;
    
    state.captchaAnswer = String(ans);
    
    const captchaText = `What is ${num1} ${op} ${num2}?`;
    document.querySelectorAll('.captcha-label').forEach(label => {
        label.textContent = captchaText;
    });
    
    // Clear captcha inputs
    document.querySelectorAll('input[name="security_answer"]').forEach(input => {
        input.value = '';
    });
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
function switchActiveUser(userId) {
    if (state.activeUserIds.includes(userId)) {
        state.currentUserId = userId;
        saveDatabase();
        window.createToast("Switched account successfully!", "success");
        window.location.hash = '#/dashboard';
        handleRouting();
    }
}

function logoutCurrentUser() {
    const user = getCurrentUser();
    if (!user) return;

    state.activeUserIds = state.activeUserIds.filter(id => id !== user.id);
    
    if (state.activeUserIds.length > 0) {
        state.currentUserId = state.activeUserIds[0];
        saveDatabase();
        window.createToast(`Signed out of previous account. Switched to active session.`, "info");
        window.location.hash = '#/dashboard';
        handleRouting();
    } else {
        state.currentUserId = null;
        saveDatabase();
        window.createToast("Logged out successfully.", "info");
        window.location.hash = '#/landing';
    }
}

function logoutAllAccounts() {
    state.activeUserIds = [];
    state.currentUserId = null;
    saveDatabase();
    window.createToast("Logged out of all accounts successfully.", "info");
    window.location.hash = '#/landing';
}

// ==========================================
// DASHBOARD RENDERING
// ==========================================
function renderDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    const userSymbol = currencySymbols[user.currency] || '$';
    
    // Get filter stats for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    const monthlyExpenses = userExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    // 1. Total expenses calculation
    const totalAllTime = userExpenses.reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);
    
    // 2. Current month total
    const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);
    
    // 3. Daily Average
    const daysInMonth = now.getDate();
    const dailyAverage = totalMonthly / Math.max(daysInMonth, 1);

    // Update Counter Banners on Dashboard
    document.getElementById('dash-alltime-expenses').setAttribute('data-target', String(totalAllTime));
    document.getElementById('dash-alltime-expenses').setAttribute('data-prefix', userSymbol);
    document.getElementById('dash-monthly-expenses').setAttribute('data-target', String(totalMonthly));
    document.getElementById('dash-monthly-expenses').setAttribute('data-prefix', userSymbol);
    document.getElementById('dash-daily-average').setAttribute('data-target', String(dailyAverage));
    document.getElementById('dash-daily-average').setAttribute('data-prefix', userSymbol);

    // Trigger animation increments
    document.querySelectorAll('#dashboard-section .animate-counter').forEach(elem => {
        const target = parseFloat(elem.getAttribute('data-target') || '0');
        const prefix = elem.getAttribute('data-prefix') || '';
        animateNumber(elem, target, prefix);
    });

    // 4. Highest Category
    const categoryTotals = {};
    monthlyExpenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + convertCurrency(e.original_amount, e.currency, user.currency);
    });

    let highestCat = 'None';
    let highestAmt = 0;
    for (const cat in categoryTotals) {
        if (categoryTotals[cat] > highestAmt) {
            highestAmt = categoryTotals[cat];
            highestCat = cat;
        }
    }
    
    const topExpenditureHeader = document.getElementById('dash-highest-category');
    const topExpenditureSub = document.getElementById('dash-highest-category-sub');
    if (highestCat !== 'None') {
        topExpenditureHeader.textContent = highestCat;
        topExpenditureHeader.classList.remove('fs-4'); // restore normal styling
        topExpenditureSub.innerHTML = `<strong>${userSymbol}${highestAmt.toFixed(2)}</strong> this month`;
    } else {
        topExpenditureHeader.textContent = 'None';
        topExpenditureSub.textContent = 'No monthly expenses yet';
    }

    // 5. Render Budgets Status limits
    renderDashboardBudgets(user, categoryTotals);

    // 6. Recent Transactions Table (latest 5)
    renderDashboardRecentTransactions(user);
}

function renderDashboardBudgets(user, categoryTotals) {
    const userBudgets = state.budgets.filter(b => b.userId === user.id && b.month === (new Date().getMonth() + 1) && b.year === new Date().getFullYear());
    const budgetMap = {};
    userBudgets.forEach(b => {
        budgetMap[b.category] = b.limit;
    });

    const categoriesUi = [
        { name: 'Food', icon: '🍔', color: '#6366f1' },
        { name: 'Travel', icon: '✈️', color: '#06b6d4' },
        { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
        { name: 'Bills', icon: '💡', color: '#f59e0b' },
        { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
        { name: 'Healthcare', icon: '🏥', color: '#ef4444' },
        { name: 'Education', icon: '📚', color: '#10b981' },
        { name: 'Others', icon: '📦', color: '#64748b' }
    ];

    const budgetAlertContainer = document.getElementById('budget-alerts-banner-container');
    const budgetListContainer = document.getElementById('dashboard-budgets-list');
    
    let overspentHtml = '';
    let budgetListHtml = '';

    categoriesUi.forEach(cat => {
        const spend = categoryTotals[cat.name] || 0.0;
        const limit = budgetMap[cat.name] || 0.0;
        let percent = 0.0;
        
        if (limit > 0) {
            percent = Math.min((spend / limit) * 100, 100.0);
            if (spend > limit) {
                overspentHtml += `
                    <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill small">
                        ${cat.icon} ${cat.name} exceeded limit by <strong>${currencySymbols[user.currency]}${(spend - limit).toFixed(2)}</strong> (Limit: ${currencySymbols[user.currency]}${limit.toFixed(2)})
                    </span>
                `;
            }
        }

        // Build list elements
        const limitText = limit > 0 
            ? `of ${currencySymbols[user.currency]}${limit.toFixed(2)} (${percent.toFixed(1)}%)`
            : `(No limit configured)`;
            
        let barColor = 'var(--text-muted)';
        if (limit > 0) {
            if (percent >= 100) barColor = 'var(--brand-danger)';
            else if (percent >= 80) barColor = 'var(--brand-warning)';
            else barColor = 'var(--brand-success)';
        }

        budgetListHtml += `
            <div>
                <div class="d-flex justify-content-between align-items-center mb-2 small">
                    <span class="fw-semibold">${cat.icon} ${cat.name}</span>
                    <span class="text-muted">
                        <strong>${currencySymbols[user.currency]}${spend.toFixed(2)}</strong> ${limitText}
                    </span>
                </div>
                <div class="progress-custom">
                    <div class="progress-bar-custom" style="width: ${limit > 0 ? percent : 0}%; background-color: ${barColor};"></div>
                </div>
            </div>
        `;
    });

    // Populate alert box
    if (overspentHtml) {
        budgetAlertContainer.innerHTML = `
            <div class="col-12">
                <div class="glass-card shadow-sm border border-danger-subtle p-3 rounded-4" style="background-color: rgba(239, 68, 68, 0.05);">
                    <h5 class="text-danger mb-2 brand-font"><i class="bi bi-exclamation-triangle-fill me-2"></i> Monthly Budget Alerts</h5>
                    <div class="d-flex flex-wrap gap-2">
                        ${overspentHtml}
                    </div>
                </div>
            </div>
        `;
        budgetAlertContainer.classList.remove('d-none');
    } else {
        budgetAlertContainer.innerHTML = '';
        budgetAlertContainer.classList.add('d-none');
    }

    budgetListContainer.innerHTML = budgetListHtml;
}

function renderDashboardRecentTransactions(user) {
    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    // Sort latest date desc, then ID desc
    const sorted = [...userExpenses].sort((a,b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
    }).slice(0, 5);

    const tbody = document.querySelector('#dashboard-recent-transactions-tbody');
    if (!tbody) return;

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No expenses recorded yet.</td></tr>`;
        return;
    }

    let html = '';
    sorted.forEach(exp => {
        const catIcons = { Food: '🍔 Food', Travel: '✈️ Travel', Shopping: '🛍️ Shopping', Bills: '💡 Bills', Entertainment: '🎬 Entertainment', Healthcare: '🏥 Healthcare', Education: '📚 Education', Others: '📦 Others' };
        const catDisplay = catIcons[exp.category] || `📦 ${exp.category}`;
        const userSymbol = currencySymbols[user.currency] || '$';
        
        let conversionSubText = '';
        if (exp.currency !== user.currency) {
            const convertedVal = convertCurrency(exp.original_amount, exp.currency, user.currency);
            conversionSubText = `<span class="text-muted d-block fw-normal" style="font-size: 0.75rem;">(${userSymbol}${convertedVal.toFixed(2)} ${user.currency})</span>`;
        }

        html += `
            <tr>
                <td class="fw-semibold">${catDisplay}</td>
                <td>${exp.description || '-'}</td>
                <td>${exp.date}</td>
                <td class="fw-bold text-end text-danger" style="color: var(--brand-danger);">
                    ${currencySymbols[exp.currency]}${parseFloat(exp.original_amount).toFixed(2)}
                    ${conversionSubText}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// EXPENSES LEDGER LIST RENDERING
// ==========================================
function renderExpensesList() {
    const user = getCurrentUser();
    if (!user) return;

    const userExpenses = state.expenses.filter(e => e.userId === user.id);

    // Apply filters
    const filter = state.expenseFilter;
    let filtered = userExpenses.filter(exp => {
        // Description / Category Search matches
        if (filter.search) {
            const query = filter.search.toLowerCase();
            const descMatch = (exp.description || '').toLowerCase().includes(query);
            const catMatch = exp.category.toLowerCase().includes(query);
            if (!descMatch && !catMatch) return false;
        }

        // Category filter
        if (filter.category && exp.category !== filter.category) {
            return false;
        }

        // Date boundaries
        if (filter.dateFrom && exp.date < filter.dateFrom) return false;
        if (filter.dateTo && exp.date > filter.dateTo) return false;

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        const valA = convertCurrency(a.original_amount, a.currency, user.currency);
        const valB = convertCurrency(b.original_amount, b.currency, user.currency);
        
        if (filter.sort === 'latest') {
            return new Date(b.date) - new Date(a.date) || b.id - a.id;
        } else if (filter.sort === 'oldest') {
            return new Date(a.date) - new Date(b.date) || a.id - b.id;
        } else if (filter.sort === 'highest') {
            return valB - valA;
        } else if (filter.sort === 'lowest') {
            return valA - valB;
        }
        return 0;
    });

    // Pagination Calculation
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / state.expensesPerPage);
    state.expensesPage = Math.min(state.expensesPage, Math.max(totalPages, 1));
    const startIndex = (state.expensesPage - 1) * state.expensesPerPage;
    const paginatedRecords = filtered.slice(startIndex, startIndex + state.expensesPerPage);

    // Render Table Rows
    const tbody = document.querySelector('#expenses-list-tbody');
    if (!tbody) return;

    if (paginatedRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2"></i> No expenses matched your filtering options.
                </td>
            </tr>
        `;
        document.getElementById('expenses-pagination-nav').innerHTML = '';
        return;
    }

    let tableHtml = '';
    paginatedRecords.forEach(exp => {
        const catIcons = { Food: '🍔 Food', Travel: '✈️ Travel', Shopping: '🛍️ Shopping', Bills: '💡 Bills', Entertainment: '🎬 Entertainment', Healthcare: '🏥 Healthcare', Education: '📚 Education', Others: '📦 Others' };
        const catDisplay = catIcons[exp.category] || `📦 ${exp.category}`;
        const userSymbol = currencySymbols[user.currency] || '$';

        let conversionHtml = '';
        if (exp.currency !== user.currency) {
            const converted = convertCurrency(exp.original_amount, exp.currency, user.currency);
            conversionHtml = `<span class="text-muted d-block fw-normal" style="font-size: 0.75rem;">(${userSymbol}${converted.toFixed(2)} ${user.currency})</span>`;
        }

        tableHtml += `
            <tr class="expense-row">
                <td class="fw-semibold expense-cat">${catDisplay}</td>
                <td class="expense-desc">${exp.description || '-'}</td>
                <td>${exp.date}</td>
                <td class="fw-bold text-danger" style="color: var(--brand-danger);">
                    ${currencySymbols[exp.currency]}${parseFloat(exp.original_amount).toFixed(2)}
                    ${conversionHtml}
                </td>
                <td>
                    <div class="d-flex justify-content-center gap-2">
                        <button onclick="editExpenseTrigger(${exp.id})" class="btn btn-sm btn-outline-secondary py-1 px-2 rounded-3 border-0" aria-label="Edit Expense">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="deleteExpenseRecord(${exp.id})" class="btn btn-sm btn-outline-danger py-1 px-2 rounded-3 border-0" aria-label="Delete Expense">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = tableHtml;

    // Render Pagination HTML
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const nav = document.getElementById('expenses-pagination-nav');
    if (!nav || totalPages <= 1) {
        nav.innerHTML = '';
        return;
    }

    let paginationHtml = `<ul class="pagination justify-content-center gap-1">`;
    
    // Prev Button
    const prevDisabled = state.expensesPage === 1 ? 'disabled' : '';
    paginationHtml += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link border-0 rounded-3 text-secondary bg-transparent" onclick="changeExpensesPage(${state.expensesPage - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
    `;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = state.expensesPage === i ? 'btn-premium py-2 px-3' : 'text-secondary py-2 px-3 bg-transparent';
        const pageItemActive = state.expensesPage === i ? 'active' : '';
        paginationHtml += `
            <li class="page-item ${pageItemActive}">
                <button class="page-link border-0 rounded-3 ${activeClass}" onclick="changeExpensesPage(${i})">${i}</button>
            </li>
        `;
    }

    // Next Button
    const nextDisabled = state.expensesPage === totalPages ? 'disabled' : '';
    paginationHtml += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link border-0 rounded-3 text-secondary bg-transparent" onclick="changeExpensesPage(${state.expensesPage + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    paginationHtml += `</ul>`;
    nav.innerHTML = paginationHtml;
}

function changeExpensesPage(newPage) {
    state.expensesPage = newPage;
    renderExpensesList();
}

// ==========================================
// REPORTS & ANALYTICS VIEWS
// ==========================================
let pieChartInstance = null;
let barChartInstance = null;
let lineChartInstance = null;

function renderReports() {
    const user = getCurrentUser();
    if (!user) return;

    const userSymbol = currencySymbols[user.currency] || '$';
    
    // Compute current month statistics
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    const monthlyExpenses = userExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);
    const daysInMonth = now.getDate();
    const dailyAverage = totalMonthly / Math.max(daysInMonth, 1);

    // Calculate Category Breakdown & totals
    const categoryTotals = {};
    monthlyExpenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + convertCurrency(e.original_amount, e.currency, user.currency);
    });

    let highestCat = 'None';
    let highestAmt = 0;
    for (const cat in categoryTotals) {
        if (categoryTotals[cat] > highestAmt) {
            highestAmt = categoryTotals[cat];
            highestCat = cat;
        }
    }

    // Update Report Stats widgets
    document.getElementById('stat-monthly-total').textContent = `${userSymbol}${totalMonthly.toFixed(2)}`;
    document.getElementById('stat-daily-average').textContent = `${userSymbol}${dailyAverage.toFixed(2)}`;
    document.getElementById('stat-highest-category').textContent = highestCat !== 'None' 
        ? `${highestCat} (${userSymbol}${highestAmt.toFixed(2)})`
        : 'None';

    // Get Theme Variables for Chart Styling
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e2e8f0';
    const labelFontColor = isDark ? '#9ca3af' : '#64748b';

    // 1. Doughnut Category Chart Data
    const pieLabels = Object.keys(categoryTotals);
    const pieDataValues = Object.values(categoryTotals);
    renderDoughnutChart(pieLabels, pieDataValues, labelFontColor);

    // 2. Line spending trend this month
    const lineLabels = [];
    const lineDataValues = [];
    // Populate all days from 1st to today
    for (let day = 1; day <= daysInMonth; day++) {
        const dayString = String(day).padStart(2, '0');
        const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dayString}`;
        lineLabels.push(dayString);
        
        const dayTotal = monthlyExpenses
            .filter(e => e.date === dateKey)
            .reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);
        lineDataValues.push(dayTotal);
    }
    renderLineTrendChart(lineLabels, lineDataValues, gridColor, labelFontColor, theme);

    // 3. Bar Monthly spending comparison (Latest 6 calendar months)
    const barLabels = [];
    const barDataValues = [];
    for (let i = 5; i >= 0; i--) {
        const tempDate = new Date();
        tempDate.setMonth(now.getMonth() - i);
        const tempMonth = tempDate.getMonth() + 1;
        const tempYear = tempDate.getFullYear();
        
        // Month name label
        const monthLabel = tempDate.toLocaleString('default', { month: 'short' });
        barLabels.push(monthLabel);

        const targetExpenses = userExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === tempMonth && d.getFullYear() === tempYear;
        });

        const targetTotal = targetExpenses.reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);
        barDataValues.push(targetTotal);
    }
    renderBarComparisonChart(barLabels, barDataValues, gridColor, labelFontColor, userSymbol);

    // Refresh budget form label currency symbol
    document.querySelector('label[for="budget-limit"]').textContent = `Monthly Limit (${user.currency})`;
}

function renderDoughnutChart(labels, dataValues, fontColor) {
    const ctx = document.getElementById('pieCategoryChart');
    if (!ctx) return;
    
    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    if (labels.length === 0) {
        // Fallback display
        labels = ['No Data'];
        dataValues = [1];
    }
    
    const backgroundColors = labels.map(label => brandColors[label] || '#cbd5e1');
    const user = getCurrentUser();
    const userSymbol = user ? (currencySymbols[user.currency] || '$') : '$';
    
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: fontColor,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.label === 'No Data') return ' No recorded transactions';
                            return ` ${context.label}: ${userSymbol}${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderLineTrendChart(labels, dataValues, gridColor, fontColor, theme) {
    const ctx = document.getElementById('lineDailyChart');
    if (!ctx) return;
    
    if (lineChartInstance) {
        lineChartInstance.destroy();
    }
    
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    if (theme === 'dark') {
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
    } else {
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
    }
    
    const user = getCurrentUser();
    const userSymbol = user ? (currencySymbols[user.currency] || '$') : '$';

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Spending',
                data: dataValues,
                borderColor: theme === 'dark' ? '#22d3ee' : '#4f46e5',
                borderWidth: 3,
                pointBackgroundColor: theme === 'dark' ? '#22d3ee' : '#4f46e5',
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: gradient,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Spent: ${userSymbol}${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: fontColor, font: { family: 'Inter', size: 10 } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: fontColor,
                        font: { family: 'Inter' },
                        callback: value => `${userSymbol}${value}`
                    }
                }
            }
        }
    });
}

function renderBarComparisonChart(labels, dataValues, gridColor, fontColor, userSymbol) {
    const ctx = document.getElementById('barMonthlyChart');
    if (!ctx) return;
    
    if (barChartInstance) {
        barChartInstance.destroy();
    }
    
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: 'rgba(79, 70, 229, 0.85)',
                hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Total: ${userSymbol}${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: fontColor, font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: fontColor,
                        font: { family: 'Inter' },
                        callback: value => `${userSymbol}${value}`
                    }
                }
            }
        }
    });
}

// ==========================================
// PROFILE SETTINGS VIEW
// ==========================================
function renderProfile() {
    const user = getCurrentUser();
    if (!user) return;

    // Load aggregate stats
    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    const monthlyExpenses = userExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === (new Date().getMonth() + 1) && d.getFullYear() === new Date().getFullYear();
    });

    const activeBudgetsCount = state.budgets.filter(b => b.userId === user.id && b.month === (new Date().getMonth() + 1) && b.year === new Date().getFullYear()).length;
    const totalLogs = userExpenses.length;
    const monthlyTotalSpent = monthlyExpenses.reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);

    document.getElementById('prof-stat-logs').textContent = totalLogs;
    document.getElementById('prof-stat-monthly').textContent = `${currencySymbols[user.currency]}${monthlyTotalSpent.toFixed(2)}`;
    document.getElementById('prof-stat-budgets').textContent = activeBudgetsCount;

    // Fill form elements
    document.getElementById('username-profile').value = user.username;
    document.getElementById('email-profile').value = user.email;
    document.getElementById('currency-profile').value = user.currency;
    document.getElementById('bank_name-profile').value = user.bankName || 'Primary Bank';
    document.getElementById('profile_pic_input').value = user.profilePic;

    // Setup avatar preview
    const selectedAvatarDisplay = document.getElementById('selected-avatar-display');
    const userPicPath = user.profilePic.startsWith('data:image') ? user.profilePic : `static/images/${user.profilePic}`;
    selectedAvatarDisplay.src = userPicPath;

    // Set active in preset grid
    document.querySelectorAll('.avatar-grid .avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-avatar') === user.profilePic) {
            opt.classList.add('selected');
        }
    });

    // Clear password inputs
    document.getElementById('password-profile').value = '';
    document.getElementById('delete-password-confirm').value = '';
    
    // Reset strength bar
    const bar = document.querySelector('#profile-section .progress-bar-custom');
    if (bar) bar.style.width = '0%';
    const text = document.getElementById('strength-text');
    if (text) text.textContent = 'Password Strength: Weak';
}

// ==========================================
// FORM SUBMISSIONS & DATA MUTATIONS
// ==========================================
function bindEvents() {
    // Modal expense category symbol setup
    const modalCurrencySelect = document.querySelector('#expenseModal select[name="currency"]');
    if (modalCurrencySelect) {
        modalCurrencySelect.addEventListener('change', (e) => {
            const sym = currencySymbols[e.target.value] || '$';
            document.querySelector('#expenseModal .form-control-custom[name="amount"]').setAttribute('placeholder', `${sym}0.00`);
        });
    }

    // Modal expense submission
    const expenseForm = document.querySelector('#expenseModal form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const user = getCurrentUser();
            if (!user) return;

            const amountVal = parseFloat(expenseForm.querySelector('[name="amount"]').value);
            const currencyVal = expenseForm.querySelector('[name="currency"]').value;
            const categoryVal = expenseForm.querySelector('[name="category"]').value;
            const descVal = expenseForm.querySelector('[name="description"]').value;
            const dateVal = expenseForm.querySelector('[name="date"]').value;

            if (isNaN(amountVal) || amountVal <= 0) {
                window.createToast("Please enter a valid positive expense amount.", "danger");
                return;
            }

            if (state.currentEditExpenseId) {
                // UPDATE
                const idx = state.expenses.findIndex(exp => exp.id === state.currentEditExpenseId && exp.userId === user.id);
                if (idx !== -1) {
                    state.expenses[idx].amount = convertCurrency(amountVal, currencyVal, user.currency);
                    state.expenses[idx].original_amount = amountVal;
                    state.expenses[idx].currency = currencyVal;
                    state.expenses[idx].category = categoryVal;
                    state.expenses[idx].description = descVal;
                    state.expenses[idx].date = dateVal;
                    
                    window.createToast("Expense record updated successfully!", "success");
                }
                state.currentEditExpenseId = null;
            } else {
                // CREATE
                const newId = state.expenses.length > 0 ? Math.max(...state.expenses.map(exp => exp.id)) + 1 : 1;
                const newExpense = {
                    id: newId,
                    userId: user.id,
                    category: categoryVal,
                    original_amount: amountVal,
                    currency: currencyVal,
                    amount: convertCurrency(amountVal, currencyVal, user.currency),
                    description: descVal,
                    date: dateVal
                };
                state.expenses.push(newExpense);
                
                // Overspending Toast Check
                checkBudgetThresholdExceeded(categoryVal, user);
                
                window.createToast("New expense tracked successfully!", "success");
            }

            saveDatabase();
            
            // Hide Modal
            document.getElementById('expenseModal').classList.remove('show');
            document.body.style.overflow = '';
            
            // Refresh View
            handleRouting();
        });
    }

    // Modal cancellation or close reset edit tracker ID
    document.querySelectorAll('.close-expense-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentEditExpenseId = null;
            resetExpenseModalForm();
        });
    });

    // Landing screen captcha resets
    document.querySelectorAll('.captcha-refresh-btn').forEach(btn => {
        btn.addEventListener('click', generateCaptcha);
    });

    // Login Form Submission
    const loginForm = document.querySelector('#login-section form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Lockout checks
            const lockoutSecs = getLoginLockoutRemaining();
            if (lockoutSecs > 0) {
                window.createToast(`Too many failed login attempts. Please wait ${lockoutSecs} seconds.`, "danger");
                return;
            }

            const emailVal = loginForm.querySelector('[name="email"]').value.trim().toLowerCase();
            const passwordVal = loginForm.querySelector('[name="password"]').value;
            const captchaVal = loginForm.querySelector('[name="security_answer"]').value.trim();

            if (captchaVal !== state.captchaAnswer) {
                window.createToast("Security check failed! Solve anti-bot math challenge correctly.", "danger");
                generateCaptcha();
                return;
            }

            const matchedUser = state.users.find(u => u.email === emailVal && u.passwordHash === passwordVal);
            if (matchedUser) {
                // Clean Lockout Stats
                localStorage.removeItem('et_lockout_time');
                localStorage.removeItem('et_login_attempts');

                if (state.addAccountMode) {
                    // Switcher mode addition
                    if (!state.activeUserIds.includes(matchedUser.id)) {
                        if (state.activeUserIds.length >= 5) {
                            window.createToast("Maximum of 5 concurrent bank accounts reached.", "danger");
                            state.addAccountMode = false;
                            window.location.hash = '#/dashboard';
                            return;
                        }
                        state.activeUserIds.push(matchedUser.id);
                    }
                    state.addAccountMode = false;
                    window.createToast(`Account added successfully! Switched to ${matchedUser.username}`, "success");
                } else {
                    // Regular Login
                    if (!state.activeUserIds.includes(matchedUser.id)) {
                        state.activeUserIds = [matchedUser.id]; // reset switcher on fresh login
                    }
                    window.createToast(`Welcome back, ${matchedUser.username}!`, "success");
                }

                state.currentUserId = matchedUser.id;
                saveDatabase();

                loginForm.reset();
                window.location.hash = '#/dashboard';
            } else {
                const isLocked = recordFailedLoginAttempt();
                generateCaptcha();
                if (isLocked) {
                    window.createToast("Too many failed login attempts. You are locked out for 30 seconds.", "danger");
                } else {
                    const attempts = localStorage.getItem('et_login_attempts') || '0';
                    window.createToast(`Invalid email or password. Attempt ${attempts} of 5.`, "danger");
                }
            }
        });
    }

    // Register Form Submission
    const registerForm = document.querySelector('#register-section form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const usernameVal = registerForm.querySelector('[name="username"]').value.trim();
            const emailVal = registerForm.querySelector('[name="email"]').value.trim().toLowerCase();
            const passwordVal = registerForm.querySelector('#register-password').value;
            const confirmVal = registerForm.querySelector('[name="confirm_password"]').value;
            const captchaVal = registerForm.querySelector('[name="security_answer"]').value.trim();

            if (captchaVal !== state.captchaAnswer) {
                window.createToast("Security check failed! Solve captcha correctly.", "danger");
                generateCaptcha();
                return;
            }

            if (passwordVal.length < 6) {
                window.createToast("Password must be at least 6 characters long.", "danger");
                return;
            }

            if (passwordVal !== confirmVal) {
                window.createToast("Confirm password matching failed.", "danger");
                return;
            }

            // Exists duplicate email check
            const duplicate = state.users.find(u => u.email === emailVal);
            if (duplicate) {
                window.createToast("Email address is already in use.", "danger");
                return;
            }

            const newUserId = Date.now();
            const userCount = state.users.length;
            const profilePicPreset = `avatar-${(userCount % 6) + 1}.svg`;

            const newUser = {
                id: newUserId,
                username: usernameVal,
                email: emailVal,
                passwordHash: passwordVal, // Plain for local mock client
                profilePic: profilePicPreset,
                currency: "INR", // DEFAULT INR as requested
                bankName: "Primary Bank",
                createdAt: new Date().toISOString()
            };

            state.users.push(newUser);

            if (state.addAccountMode) {
                if (state.activeUserIds.length >= 5) {
                    window.createToast("Maximum of 5 concurrent bank accounts reached.", "danger");
                    state.addAccountMode = false;
                    window.location.hash = '#/dashboard';
                    return;
                }
                state.activeUserIds.push(newUserId);
                state.currentUserId = newUserId;
                state.addAccountMode = false;
                window.createToast(`Account created and added successfully! Switched to ${usernameVal}.`, "success");
            } else {
                state.activeUserIds = [newUserId];
                state.currentUserId = newUserId;
                window.createToast("Registration successful! Welcome to Expense Tracker.", "success");
            }

            saveDatabase();
            registerForm.reset();
            window.location.hash = '#/dashboard';
        });
    }

    // Ledger Filters refinement bindings
    const filterForm = document.querySelector('#expenses-section form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            state.expenseFilter.search = document.getElementById('client-live-search').value;
            state.expenseFilter.category = document.getElementById('category-filter').value;
            state.expenseFilter.dateFrom = document.getElementById('date-from-filter').value;
            state.expenseFilter.dateTo = document.getElementById('date-to-filter').value;
            state.expenseFilter.sort = document.getElementById('sort-filter').value;
            state.expensesPage = 1; // reset page
            renderExpensesList();
        });

        // Clear button hook
        filterForm.querySelector('.btn-premium-outline').addEventListener('click', (e) => {
            e.preventDefault();
            filterForm.reset();
            state.expenseFilter = { search: '', category: '', dateFrom: '', dateTo: '', sort: 'latest' };
            state.expensesPage = 1;
            renderExpensesList();
        });
    }

    // Analytics Limit Budget Constraints Save
    const budgetForm = document.getElementById('budget-api-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) return;

            const categoryVal = document.getElementById('budget-category').value;
            const limitVal = parseFloat(document.getElementById('budget-limit').value);

            if (isNaN(limitVal) || limitVal < 0) {
                window.createToast("Please enter a valid positive budget limit.", "danger");
                return;
            }

            const now = new Date();
            const monthVal = now.getMonth() + 1;
            const yearVal = now.getFullYear();

            // Find duplicate budget
            const dupIdx = state.budgets.findIndex(b => b.userId === user.id && b.category === categoryVal && b.month === monthVal && b.year === yearVal);
            if (dupIdx !== -1) {
                state.budgets[dupIdx].limit = limitVal;
            } else {
                const newBId = state.budgets.length > 0 ? Math.max(...state.budgets.map(b => b.id)) + 1 : 1;
                state.budgets.push({
                    id: newBId,
                    userId: user.id,
                    category: categoryVal,
                    limit: limitVal,
                    month: monthVal,
                    year: yearVal
                });
            }

            saveDatabase();
            window.createToast(`Saved monthly limit for ${categoryVal} to ${currencySymbols[user.currency]}${limitVal.toFixed(2)} successfully!`, "success");
            budgetForm.reset();
            renderReports();
        });
    }

    // Profile Settings Form Save
    const profileForm = document.querySelector('#profile-section form');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) return;

            const usernameVal = document.getElementById('username-profile').value.trim();
            const emailVal = document.getElementById('email-profile').value.trim().toLowerCase();
            const currencyVal = document.getElementById('currency-profile').value;
            const bankNameVal = document.getElementById('bank_name-profile').value.trim();
            const profilePicVal = document.getElementById('profile_pic_input').value;
            const passwordVal = document.getElementById('password-profile').value;

            if (!usernameVal || !emailVal) {
                window.createToast("Username and email address are required fields.", "danger");
                return;
            }

            // Exists duplicate email check
            const duplicate = state.users.find(u => u.email === emailVal && u.id !== user.id);
            if (duplicate) {
                window.createToast("Email address is already in use by another account.", "danger");
                return;
            }

            // Password update check
            if (passwordVal) {
                if (passwordVal.length < 6) {
                    window.createToast("New password must be at least 6 characters long.", "danger");
                    return;
                }
                user.passwordHash = passwordVal;
            }

            // Save details
            user.username = usernameVal;
            user.email = emailVal;
            user.currency = currencyVal;
            user.bankName = bankNameVal;
            user.profilePic = profilePicVal;

            saveDatabase();
            window.createToast("Profile settings saved successfully!", "success");
            
            // Re-render
            renderProfile();
            renderUserDropdown();
        });
    }

    // CSV Imports triggers
    const csvImportForm = document.querySelector('#expenses-section .glass-card form');
    if (csvImportForm) {
        csvImportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) return;

            const fileInput = csvImportForm.querySelector('input[type="file"]');
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                parseCSVAndImport(text, user);
                csvImportForm.reset();
            };
            reader.readAsText(file);
        });
    }

    // Account Delete confirmation
    const deleteAccountForm = document.querySelector('#profile-section .collapse form');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) return;

            const confirmPasswordVal = document.getElementById('delete-password-confirm').value;
            if (confirmPasswordVal !== user.passwordHash) {
                window.createToast("Incorrect password. Account deletion aborted.", "danger");
                return;
            }

            // Perform purge
            state.expenses = state.expenses.filter(exp => exp.userId !== user.id);
            state.budgets = state.budgets.filter(b => b.userId !== user.id);
            state.users = state.users.filter(u => u.id !== user.id);
            state.activeUserIds = state.activeUserIds.filter(id => id !== user.id);

            state.currentUserId = state.activeUserIds.length > 0 ? state.activeUserIds[0] : null;
            saveDatabase();

            window.createToast("Your account and all its logs have been permanently purged.", "success");
            deleteAccountForm.reset();
            
            if (state.currentUserId) {
                window.location.hash = '#/dashboard';
            } else {
                window.location.hash = '#/landing';
            }
            handleRouting();
        });
    }

    // Dark Mode Theme Toggle click
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('et_theme', newTheme);
            updateThemeToggleUI(newTheme);

            // Re-render report graphs if reports screen is active
            if (window.location.hash === '#/reports') {
                renderReports();
            }
        });
    }
}

function updateThemeToggleUI(theme) {
    const icon = document.querySelector('#theme-toggle-btn i');
    if (!icon) return;
    if (theme === 'dark') {
        icon.className = 'bi bi-sun-fill';
    } else {
        icon.className = 'bi bi-moon-fill';
    }
}

function resetExpenseModalForm() {
    const user = getCurrentUser();
    const expenseForm = document.querySelector('#expenseModal form');
    if (expenseForm && user) {
        expenseForm.reset();
        expenseForm.querySelector('[name="currency"]').value = user.currency;
        expenseForm.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
        
        const sym = currencySymbols[user.currency] || '$';
        expenseForm.querySelector('.form-control-custom[name="amount"]').setAttribute('placeholder', `${sym}0.00`);
        
        // Reset title
        document.querySelector('#expenseModal .modal-title').innerHTML = `<i class="bi bi-cash me-2"></i> Record Expenditure`;
    }
}

function editExpenseTrigger(expenseId) {
    const user = getCurrentUser();
    if (!user) return;

    const exp = state.expenses.find(e => e.id === expenseId && e.userId === user.id);
    if (!exp) return;

    state.currentEditExpenseId = expenseId;
    
    // Fill form and Open Modal
    const expenseForm = document.querySelector('#expenseModal form');
    if (expenseForm) {
        expenseForm.querySelector('[name="amount"]').value = exp.original_amount;
        expenseForm.querySelector('[name="currency"]').value = exp.currency;
        expenseForm.querySelector('[name="category"]').value = exp.category;
        expenseForm.querySelector('[name="description"]').value = exp.description || '';
        expenseForm.querySelector('[name="date"]').value = exp.date;

        // Update title
        document.querySelector('#expenseModal .modal-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i> Modify Expenditure`;

        // Show Modal
        document.getElementById('expenseModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function deleteExpenseRecord(expenseId) {
    const user = getCurrentUser();
    if (!user) return;

    if (confirm("Are you sure you want to delete this expense record?")) {
        state.expenses = state.expenses.filter(e => !(e.id === expenseId && e.userId === user.id));
        saveDatabase();
        window.createToast("Expense record deleted successfully.", "success");
        renderExpensesList();
    }
}

// ==========================================
// UTILITIES & HELPER CALCULATIONS
// ==========================================
function convertCurrency(amount, from, to) {
    if (from === to) return amount;
    const fromRate = exchangeRates[from] || 1.0;
    const toRate = exchangeRates[to] || 1.0;
    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
}

function checkBudgetThresholdExceeded(category, user) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get active category budget limit
    const budget = state.budgets.find(b => b.userId === user.id && b.category === category && b.month === currentMonth && b.year === currentYear);
    if (!budget) return;

    // Get total monthly expenditures in category
    const spend = state.expenses
        .filter(e => e.userId === user.id && e.category === category)
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + convertCurrency(e.original_amount, e.currency, user.currency), 0);

    if (spend > budget.limit) {
        setTimeout(() => {
            window.createToast(`🚨 Budget Warning: Category ${category} has exceeded its monthly limit by ${currencySymbols[user.currency]}${(spend - budget.limit).toFixed(2)}!`, "warning");
        }, 800);
    }
}

// ==========================================
// FILE IMPORTS & EXPORTS
// ==========================================
function parseCSVAndImport(text, user) {
    const lines = text.split('\n');
    if (lines.length <= 1) {
        window.createToast("CSV file is empty or missing content.", "danger");
        return;
    }

    let headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split CSV row supporting optional simple comma escaping
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < headers.length) continue;

        // Map column values
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = cols[idx];
        });

        // Parse key elements
        const categoryVal = row.category || 'Others';
        const originalAmount = parseFloat(row.amount || row.original_amount);
        const currencyVal = (row.currency || user.currency).toUpperCase();
        const descriptionVal = row.description || '';
        const dateVal = row.date || new Date().toISOString().split('T')[0];

        if (isNaN(originalAmount) || originalAmount <= 0) continue;

        const newId = state.expenses.length > 0 ? Math.max(...state.expenses.map(exp => exp.id)) + 1 : 1;
        state.expenses.push({
            id: newId,
            userId: user.id,
            category: categoryVal,
            original_amount: originalAmount,
            currency: currencyVal,
            amount: convertCurrency(originalAmount, currencyVal, user.currency),
            description: descriptionVal,
            date: dateVal
        });
        importedCount++;
    }

    if (importedCount > 0) {
        saveDatabase();
        window.createToast(`Successfully imported ${importedCount} records from CSV!`, "success");
        renderExpensesList();
    } else {
        window.createToast("No valid expense records could be imported from the CSV.", "danger");
    }
}

// Export Ledger to CSV Format
function exportToCSV() {
    const user = getCurrentUser();
    if (!user) return;

    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    let csvContent = "Category,Description,Date,Amount,Currency\n";

    userExpenses.forEach(e => {
        const desc = (e.description || '').replace(/"/g, '""');
        csvContent += `"${e.category}","${desc}","${e.date}",${e.original_amount},"${e.currency}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Expense_Ledger_${user.username.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.createToast("CSV file exported successfully!", "success");
}

// Export Ledger to Excel Spreadsheet using SheetJS CDN
function exportToExcel() {
    const user = getCurrentUser();
    if (!user) return;

    if (typeof XLSX === 'undefined') {
        window.createToast("Excel compiler library loading. Please retry in a second.", "warning");
        return;
    }

    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    const data = userExpenses.map(e => ({
        'Category': e.category,
        'Description': e.description || '-',
        'Date': e.date,
        'Amount': e.original_amount,
        'Currency': e.currency,
        'Converted Amount': parseFloat(convertCurrency(e.original_amount, e.currency, user.currency).toFixed(2)),
        'Target Currency': user.currency
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses Ledger");
    
    XLSX.writeFile(workbook, `Expense_Ledger_${user.username.replace(/\s+/g, '_')}.xlsx`);
    window.createToast("Excel file exported successfully!", "success");
}

// Export Ledger to PDF Document using jsPDF & jsPDF-AutoTable CDNs
function exportToPDF() {
    const user = getCurrentUser();
    if (!user) return;

    const { jsPDF } = window.jspdf;
    if (typeof jsPDF === 'undefined') {
        window.createToast("PDF compiler library loading. Please retry in a second.", "warning");
        return;
    }

    const userExpenses = state.expenses.filter(e => e.userId === user.id);
    const doc = new jsPDF();

    // Set Document Header Styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo brand primary
    doc.text("EXPENSE TRACKER REPORT", 14, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Text muted
    doc.text(`Monthly Financial Log - Generated on ${new Date().toISOString().split('T')[0]}`, 14, 28);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Text primary
    doc.text(`Expense Ledger for: ${user.username}`, 14, 38);
    doc.text(`Email Account: ${user.email}`, 14, 44);
    doc.text(`Total Transactions: ${userExpenses.length} records`, 14, 50);

    // Build Table Rows
    const tableBody = userExpenses.map(e => [
        e.category,
        e.description || '-',
        e.date,
        `${currencySymbols[e.currency]}${e.original_amount.toFixed(2)} (${e.currency})`
    ]);

    // Render AutoTable
    doc.autoTable({
        startY: 56,
        head: [['Category', 'Description', 'Date', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Brand color headers
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { font: 'helvetica', fontSize: 9 }
    });

    doc.save(`Expense_Ledger_${user.username.replace(/\s+/g, '_')}.pdf`);
    window.createToast("PDF report exported successfully!", "success");
}
