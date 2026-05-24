/* Main Interactivity Script: Animations, Ripples, Modals, Toasts, and Counters */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Number Counter Animation on Dashboard Stats
    const countElements = document.querySelectorAll('.animate-counter');
    countElements.forEach(elem => {
        const target = parseFloat(elem.getAttribute('data-target') || '0');
        const prefix = elem.getAttribute('data-prefix') || '';
        animateNumber(elem, target, prefix);
    });

    // 2. Button Ripple Effect
    document.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.btn-premium, .btn-premium-outline, .fab-btn');
        if (!btn) return;
        
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        btn.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // 3. Scroll Reveal / Entrance Animation Triggers
    const animatedCards = document.querySelectorAll('.glass-card, .table-responsive-custom, .animate-entrance');
    animatedCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // 4. Modal Triggers
    setupModalTriggers();

    // 5. Toast System Setup (Auto-Dismiss)
    setupToastDismissal();

    // 6. Avatar Selector (Profile Page)
    setupAvatarGrid();

    // 7. Live Expense Search Filter (Client Side quick match helper)
    setupClientSearchFilter();

    // 8. Password Visibility Toggles
    setupPasswordToggles();

    // 9. Live Password Strength meter
    setupPasswordStrength();

    // 10. Live Input Validation Outline Indicator rings
    setupLiveInputValidation();

    // 11. Mobile Sidebar offcanvas drawer interactions
    setupMobileSidebar();
});

function animateNumber(element, target, prefix = '') {
    const duration = 1200; // ms
    const stepTime = 15;
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

function setupModalTriggers() {
    const modal = document.getElementById('expenseModal');
    const openBtns = document.querySelectorAll('.open-expense-modal-btn');
    const closeBtns = document.querySelectorAll('.close-expense-modal-btn');
    
    if (modal) {
        openBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            });
        });
        
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            });
        });
        
        // Click outside modal body to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }
}

function setupToastDismissal() {
    const toasts = document.querySelectorAll('.toast-custom');
    toasts.forEach(toast => {
        // entrance slide
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto-dismiss after 6 seconds
        const dismissTimer = setTimeout(() => {
            dismissToast(toast);
        }, 6000);
        
        // Close on button click
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(dismissTimer);
                dismissToast(toast);
            });
        }
    });
}

function dismissToast(toast) {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
    }, 400);
}

function setupAvatarGrid() {
    const avatarGrid = document.querySelector('.avatar-grid');
    const avatarInput = document.getElementById('profile_pic_input');
    const selectedAvatarDisplay = document.getElementById('selected-avatar-display');
    const fileInput = document.getElementById('avatar_file');
    
    if (avatarGrid && avatarInput) {
        const options = avatarGrid.querySelectorAll('.avatar-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                
                const avatarFile = opt.getAttribute('data-avatar');
                avatarInput.value = avatarFile;
                
                // Clear file input when selecting a preset
                if (fileInput) {
                    fileInput.value = '';
                }
                
                if (selectedAvatarDisplay) {
                    selectedAvatarDisplay.src = `/static/images/${avatarFile}`;
                }
            });
        });
    }

    if (fileInput && selectedAvatarDisplay) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Clear selection from presets
                if (avatarGrid) {
                    const options = avatarGrid.querySelectorAll('.avatar-option');
                    options.forEach(o => o.classList.remove('selected'));
                }
                
                // Read and preview image
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedAvatarDisplay.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function setupClientSearchFilter() {
    const searchInput = document.getElementById('client-live-search');
    const expenseRows = document.querySelectorAll('.expense-row');
    
    if (searchInput && expenseRows.length > 0) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            expenseRows.forEach(row => {
                const desc = row.querySelector('.expense-desc').textContent.toLowerCase();
                const cat = row.querySelector('.expense-cat').textContent.toLowerCase();
                
                if (desc.includes(query) || cat.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

// Global helper to create a dynamic toast warning from frontend
window.createToast = function(message, type = 'info') {
    const container = document.querySelector('.toast-container-custom');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-custom theme-${type}`;
    
    let emoji = '💡';
    if (type === 'success') emoji = '✅';
    if (type === 'danger') emoji = '❌';
    if (type === 'warning') emoji = '🚨';
    
    toast.innerHTML = `
        <div class="toast-icon">${emoji}</div>
        <div class="toast-msg">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    const timer = setTimeout(() => {
        dismissToast(toast);
    }, 5000);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timer);
        dismissToast(toast);
    });
};

function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const wrapper = btn.closest('.password-toggle-wrapper');
            if (!wrapper) return;
            const input = wrapper.querySelector('.password-input');
            const icon = btn.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('bi-eye-slash-fill');
                    icon.classList.add('bi-eye-fill');
                } else {
                    input.type = 'password';
                    icon.classList.remove('bi-eye-fill');
                    icon.classList.add('bi-eye-slash-fill');
                }
            }
        });
    });
}

function setupPasswordStrength() {
    const passwordInputs = document.querySelectorAll('#register-password, #password-profile');
    
    passwordInputs.forEach(input => {
        const parentGroup = input.closest('.form-group-custom');
        if (!parentGroup) return;
        const container = parentGroup.querySelector('.password-strength-container');
        if (!container) return;
        
        const bar = container.querySelector('.progress-bar-custom');
        const text = container.querySelector('#strength-text');
        
        input.addEventListener('input', () => {
            const val = input.value;
            if (!val) {
                bar.style.width = '0%';
                bar.className = 'progress-bar-custom bg-danger';
                text.textContent = 'Password Strength: Weak';
                return;
            }
            
            let score = 0;
            if (val.length >= 6) score += 1;
            if (val.length >= 10) score += 1;
            if (/[a-z]/.test(val)) score += 1;
            if (/[A-Z]/.test(val)) score += 1;
            if (/[0-9]/.test(val)) score += 1;
            if (/[!@#$%^&*(),.?\":{}|<>_]/.test(val)) score += 1;
            
            let pct = 0;
            let cls = 'bg-danger';
            let txt = 'Weak';
            
            if (score <= 2) {
                pct = 20;
                cls = 'bg-danger';
                txt = 'Weak (Needs upper, lower, numbers, symbols)';
            } else if (score <= 4) {
                pct = 50;
                cls = 'bg-warning';
                txt = 'Medium (Add symbols or make it longer)';
            } else {
                pct = 100;
                cls = 'bg-success';
                txt = 'Strong';
            }
            
            bar.style.width = `${pct}%`;
            bar.className = `progress-bar-custom ${cls}`;
            text.textContent = `Password Strength: ${txt}`;
        });
    });
}

function setupLiveInputValidation() {
    const usernameFields = document.querySelectorAll('#username, #username-profile');
    const emailFields = document.querySelectorAll('#email, #email-profile');
    
    usernameFields.forEach(field => {
        field.addEventListener('input', () => {
            if (field.value.trim().length >= 3) {
                field.style.borderColor = 'var(--brand-success)';
                field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
            } else if (field.value.trim().length > 0) {
                field.style.borderColor = 'var(--brand-danger)';
                field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            } else {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });
    });
    
    emailFields.forEach(field => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        field.addEventListener('input', () => {
            if (emailRegex.test(field.value.trim())) {
                field.style.borderColor = 'var(--brand-success)';
                field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
            } else if (field.value.trim().length > 0) {
                field.style.borderColor = 'var(--brand-danger)';
                field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
            } else {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });
    });
}

function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar-navigation');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-mobile-toggle');
    const closeBtn = document.getElementById('sidebar-mobile-close');
    
    if (sidebar && overlay) {
        // Toggle Sidebar & Overlay
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('show');
                overlay.classList.add('show');
                document.body.style.overflow = 'hidden'; // lock scrolling
            });
        }
        
        // Hide Sidebar & Overlay on Close click or Backdrop click
        const closeSidebar = () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
            document.body.style.overflow = ''; // unlock scrolling
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeSidebar);
        }
        
        overlay.addEventListener('click', closeSidebar);
        
        // Auto-close sidebar on link click (helpful for single-page operations or same-page anchor transitions)
        const sidebarLinks = sidebar.querySelectorAll('.sidebar-menu a, .logout-btn');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', closeSidebar);
        });
        
        // Cleanup if screen is resized back to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 992) {
                closeSidebar();
            }
        });
    }
}
