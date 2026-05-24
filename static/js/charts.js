/* Dynamic Chart.js integrations supporting automatic dark/light theme re-styling */

let pieChartInstance = null;
let barChartInstance = null;
let lineChartInstance = null;

// Brand color maps
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

document.addEventListener('DOMContentLoaded', () => {
    // Only render charts if we are on the reports page (has report container)
    if (document.getElementById('reports-container')) {
        renderAllReports();
        
        // Listen to theme adjustments and redock
        document.addEventListener('themeChanged', () => {
            renderAllReports();
        });
    }
});

async function renderAllReports() {
    try {
        const response = await fetch('/api/reports/summary');
        if (!response.ok) throw new Error('API reports request failed');
        const data = await response.json();
        
        // Update Stats Cards Text Content
        updateStatsCards(data.stats);
        
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const isDark = theme === 'dark';
        
        // Setup visual theme constants
        const gridColor = isDark ? '#1f2937' : '#e2e8f0';
        const labelFontColor = isDark ? '#9ca3af' : '#64748b';
        
        // Setup Pie Chart
        renderPieChart(data.pie, labelFontColor);
        
        // Setup Bar Chart
        renderBarChart(data.bar, gridColor, labelFontColor);
        
        // Setup Line Chart
        renderLineChart(data.line, gridColor, labelFontColor);
        
    } catch (err) {
        console.error('Failed to load reports:', err);
    }
}

function updateStatsCards(stats) {
    const totalElem = document.getElementById('stat-monthly-total');
    const avgElem = document.getElementById('stat-daily-average');
    const highestElem = document.getElementById('stat-highest-category');
    
    if (totalElem) animateNumberCounter(totalElem, stats.monthly_total, window.USER_CURRENCY_SYMBOL);
    if (avgElem) animateNumberCounter(avgElem, stats.daily_average, window.USER_CURRENCY_SYMBOL);
    if (highestElem) {
        highestElem.textContent = stats.highest_category !== 'None' 
            ? `${stats.highest_category} (${window.USER_CURRENCY_SYMBOL}${stats.highest_amount.toFixed(2)})`
            : 'None';
    }
}

function renderPieChart(pieData, fontColor) {
    const ctx = document.getElementById('pieCategoryChart');
    if (!ctx) return;
    
    if (pieChartInstance) {
        pieChartInstance.destroy();
    }
    
    // Match colors to category names
    const backgroundColors = pieData.labels.map(label => brandColors[label] || '#cbd5e1');
    
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: pieData.labels,
            datasets: [{
                data: pieData.data,
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
                            return ` ${context.label}: ${window.USER_CURRENCY_SYMBOL}${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderBarChart(barData, gridColor, fontColor) {
    const ctx = document.getElementById('barMonthlyChart');
    if (!ctx) return;
    
    if (barChartInstance) {
        barChartInstance.destroy();
    }
    
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barData.labels,
            datasets: [{
                label: 'Monthly Spending (' + window.USER_CURRENCY_SYMBOL + ')',
                data: barData.data,
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
                            return ` Total: ${window.USER_CURRENCY_SYMBOL}${context.raw.toFixed(2)}`;
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
                        callback: value => `${window.USER_CURRENCY_SYMBOL}${value}`
                    }
                }
            }
        }
    });
}

function renderLineChart(lineData, gridColor, fontColor) {
    const ctx = document.getElementById('lineDailyChart');
    if (!ctx) return;
    
    if (lineChartInstance) {
        lineChartInstance.destroy();
    }
    
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    
    if (theme === 'dark') {
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
    } else {
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
    }
    
    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lineData.labels,
            datasets: [{
                label: 'Daily Expenditure (' + window.USER_CURRENCY_SYMBOL + ')',
                data: lineData.data,
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
                            return ` Spent: ${window.USER_CURRENCY_SYMBOL}${context.raw.toFixed(2)}`;
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
                        callback: value => `${window.USER_CURRENCY_SYMBOL}${value}`
                    }
                }
            }
        }
    });
}

function animateNumberCounter(element, target, prefix = '') {
    const duration = 1000; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const valPerStep = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += valPerStep;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = prefix + current.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, stepTime);
}
