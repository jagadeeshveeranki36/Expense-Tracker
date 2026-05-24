/* Persistent Dark/Light Mode Theme Manager */

(function () {
    // Immediate execution before DOM render to prevent white screen flicker
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        updateToggleIcon(themeBtn);
        
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Apply transitions dynamically on click so it doesn't animate on page load
            document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            updateToggleIcon(themeBtn);
            
            // Dispatch a theme change event so that Chart.js is notified to redock colors
            const event = new CustomEvent('themeChanged', { detail: { theme: newTheme } });
            document.dispatchEvent(event);
        });
    }
    
    function updateToggleIcon(btn) {
        const theme = document.documentElement.getAttribute('data-theme');
        const icon = btn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'bi bi-sun-fill';
                icon.style.color = '#fbbf24'; // glowing warm yellow
            } else {
                icon.className = 'bi bi-moon-fill';
                icon.style.color = '#4f46e5'; // sleek indigo moon
            }
        }
    }
});
