// Settings Page JavaScript

const PROFILE_STORAGE_KEY = 'bonbonUserProfile';
const SECURITY_STORAGE_KEY = 'bonbonUserSecurity';
const PREFERENCES_STORAGE_KEY = 'bonbonUserPreferences';
const ACCESS_LOGS_STORAGE_KEY = 'bonbonAccessLogs';
const SYSTEM_SETTINGS_STORAGE_KEY = 'bonbonSystemSettings';
const REGIONAL_SETTINGS_STORAGE_KEY = 'bonbonRegionalSettings';

let profileData = loadProfileData();
let securityData = loadSecurityData();
let preferencesData = loadPreferences();
let accessLogs = loadAccessLogs();
let systemSettings = loadSystemSettings();
let regionalSettings = loadRegionalSettings();

document.addEventListener('DOMContentLoaded', () => {
    setupSidebarToggle();
    setupTabs();
    initializeProfileSection();
    initializeSecuritySection();
    initializeSystemSettingsSection();
    initializeRegionalSettingsSection();
    
    // Clear any existing saved logs
    localStorage.removeItem(ACCESS_LOGS_STORAGE_KEY);
    accessLogs = [];
    
    renderAccessLogs();
    setupLogButtons();
    
    // Apply all settings on page load
    applyAllSettings();
});

function applyAllSettings() {
    // Apply all settings immediately on page load
    applySystemSettings();
    applyRegionalSettings();
}

/* ---------- Sidebar ---------- */
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('show');
            sidebarOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }

    const closeSidebar = () => {
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');
        document.body.style.overflow = '';
    };

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

/* ---------- Tabs ---------- */
function setupTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    const tabs = document.querySelectorAll('.tab-content');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.tab;

            buttons.forEach(btn => {
                btn.classList.toggle('active', btn === button);
                btn.setAttribute('aria-selected', btn === button);
            });

            tabs.forEach(tab => {
                const shouldActivate = tab.id === `${target}Tab`;
                tab.classList.toggle('active', shouldActivate);
                tab.setAttribute('aria-hidden', !shouldActivate);
            });
        });
    });
}

/* ---------- Profile ---------- */
function loadProfileData() {
    const fallback = {
        firstName: 'Bonbon',
        lastName: 'User',
        email: 'user@example.com',
        phone: '',
        photo: ''
    };

    try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
}

function saveProfileData() {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
}

function initializeProfileSection() {
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    const profileForm = document.getElementById('profileForm');
    const feedback = document.getElementById('profileFeedback');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const profileImageInput = document.getElementById('profileImageInput');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const profileFullName = document.getElementById('profileFullName');
    const profileEmailText = document.getElementById('profileEmailText');
    const userNameDisplay = document.getElementById('userNameDisplay');

    firstNameInput.value = profileData.firstName || '';
    lastNameInput.value = profileData.lastName || '';
    emailInput.value = profileData.email || '';
    phoneInput.value = profileData.phone || '';
    updateProfileIdentity(profileFullName, profileEmailText, userNameDisplay);

    if (profileData.photo) {
        profileImagePreview.src = profileData.photo;
    }

    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        profileData = {
            ...profileData,
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim()
        };

        saveProfileData();
        updateProfileIdentity(profileFullName, profileEmailText, userNameDisplay);
        showFeedback(feedback, 'Profile updated successfully!');
        document.dispatchEvent(new CustomEvent('profileUpdated', { detail: profileData }));
    });

    changePhotoBtn.addEventListener('click', () => profileImageInput.click());
    profileImageInput.addEventListener('change', handleProfileImageChange);
}

function updateProfileIdentity(nameEl, emailEl, headerNameEl) {
    const fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || 'Bonbon User';
    nameEl.textContent = fullName;
    emailEl.textContent = profileData.email || 'user@example.com';
    headerNameEl.textContent = fullName;
}

function handleProfileImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        profileData.photo = reader.result;
        document.getElementById('profileImagePreview').src = reader.result;
        saveProfileData();
        showFeedback(document.getElementById('profileFeedback'), 'Profile picture updated!');
        document.dispatchEvent(new CustomEvent('profileUpdated', { detail: profileData }));
    };
    reader.readAsDataURL(file);
}

/* ---------- Security ---------- */
function loadSecurityData() {
    const fallback = {
        password: 'Bonbon123!',
        twoFactor: false,
        loginAlerts: true,
        lastPasswordChange: null
    };

    try {
        const stored = localStorage.getItem(SECURITY_STORAGE_KEY);
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
}

function saveSecurityData() {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(securityData));
}

function initializeSecuritySection() {
    const securityForm = document.getElementById('securityForm');
    const feedback = document.getElementById('securityFeedback');
    const twoFactorToggle = document.getElementById('twoFactorToggle');
    const loginAlertsToggle = document.getElementById('loginAlertsToggle');
    const lastPasswordChange = document.getElementById('lastPasswordChange');

    twoFactorToggle.checked = securityData.twoFactor;
    loginAlertsToggle.checked = securityData.loginAlerts;
    lastPasswordChange.textContent = securityData.lastPasswordChange
        ? new Date(securityData.lastPasswordChange).toLocaleString()
        : 'Never';

    securityForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const current = document.getElementById('currentPasswordInput').value;
        const next = document.getElementById('newPasswordInput').value;
        const confirm = document.getElementById('confirmPasswordInput').value;

        if (current !== securityData.password) {
            showFeedback(feedback, 'Current password is incorrect.', true);
            return;
        }

        if (next.length < 8) {
            showFeedback(feedback, 'New password must be at least 8 characters.', true);
            return;
        }

        if (next !== confirm) {
            showFeedback(feedback, 'New passwords do not match.', true);
            return;
        }

        securityData.password = next;
        securityData.lastPasswordChange = new Date().toISOString();
        saveSecurityData();
        lastPasswordChange.textContent = new Date(securityData.lastPasswordChange).toLocaleString();
        securityForm.reset();
        showFeedback(feedback, 'Password updated successfully!');
    });

    twoFactorToggle.addEventListener('change', () => {
        securityData.twoFactor = twoFactorToggle.checked;
        saveSecurityData();
    });

    loginAlertsToggle.addEventListener('change', () => {
        securityData.loginAlerts = loginAlertsToggle.checked;
        saveSecurityData();
    });
}

/* ---------- System Settings ---------- */
function loadSystemSettings() {
    const fallback = {
        language: 'en-fil',
        dateFormat: 'MM/DD/YYYY',
        selectedDate: null
    };

    try {
        const stored = localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
}

function saveSystemSettings() {
    localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
    // Apply settings system-wide
    applySystemSettings();
}

function applySystemSettings() {
    // Set language attribute on html element
    document.documentElement.lang = systemSettings.language === 'fil' ? 'fil' : 'en';
    
    // Store date format for use across the system
    document.documentElement.setAttribute('data-date-format', systemSettings.dateFormat);
    
    // Apply language changes to UI elements
    applyLanguageChanges();
    
    // Update all date displays immediately
    updateAllDateDisplays();
    
    // Dispatch event to notify other pages of settings change
    window.dispatchEvent(new CustomEvent('systemSettingsUpdated', {
        detail: systemSettings
    }));
}

function applyLanguageChanges() {
    // Update UI text based on language setting
    const lang = systemSettings.language;
    
    // Example: Update page title if it exists
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        if (lang === 'fil') {
            // Could add Filipino translations here
        }
    }
    
    // Update any elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        // Could implement translation system here
    });
}

function formatDate(date, format = systemSettings.dateFormat) {
    if (!date) return '—';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD MMM YYYY':
            return `${day} ${monthNames[d.getMonth()]} ${year}`;
        case 'MM/DD/YYYY':
        default:
            return `${month}/${day}/${year}`;
    }
}

function initializeSystemSettingsSection() {
    const systemSettingsForm = document.getElementById('systemSettingsForm');
    const feedback = document.getElementById('systemSettingsFeedback');

    if (!systemSettingsForm) return;

    // Load current settings
    const languageSelect = document.getElementById('languageSelect');
    const dateFormatSelect = document.getElementById('dateFormatSelect');
    const datePickerInput = document.getElementById('datePickerInput');
    const calendarToggleBtn = document.getElementById('calendarToggleBtn');
    const datePreview = document.getElementById('datePreview');

    if (languageSelect) {
        languageSelect.value = systemSettings.language;
    }

    if (dateFormatSelect) {
        dateFormatSelect.value = systemSettings.dateFormat;
    }

    // Initialize date picker
    if (datePickerInput) {
        // Set today's date as default if no date is saved
        if (systemSettings.selectedDate) {
            datePickerInput.value = systemSettings.selectedDate;
        } else {
            const today = new Date().toISOString().split('T')[0];
            datePickerInput.value = today;
            systemSettings.selectedDate = today;
        }

        // Update preview when date changes
        updateDatePreview();

        // Calendar button click
        if (calendarToggleBtn) {
            calendarToggleBtn.addEventListener('click', () => {
                datePickerInput.showPicker ? datePickerInput.showPicker() : datePickerInput.focus();
            });
        }

        // Update preview on date change
        datePickerInput.addEventListener('change', () => {
            updateDatePreview();
        });
    }

    // Update preview when format changes
    if (dateFormatSelect) {
        dateFormatSelect.addEventListener('change', () => {
            updateDatePreview();
        });
    }

    // Apply settings on page load
    applySystemSettings();

    systemSettingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        systemSettings = {
            language: languageSelect.value,
            dateFormat: dateFormatSelect.value,
            selectedDate: datePickerInput ? datePickerInput.value : null
        };

        saveSystemSettings();
        showFeedback(feedback, 'System settings saved successfully!', true);
        
        // Update date displays on current page immediately
        updateAllDateDisplays();
        
        // Show visual feedback
        showSettingsAppliedFeedback('systemSettingsForm');
    });

    function updateDatePreview() {
        if (!datePreview || !datePickerInput) return;
        const selectedDate = datePickerInput.value;
        if (selectedDate) {
            const format = dateFormatSelect ? dateFormatSelect.value : systemSettings.dateFormat;
            datePreview.textContent = formatDate(selectedDate, format);
        } else {
            datePreview.textContent = '—';
        }
    }
}


function updateDateDisplays() {
    // Update all date displays on the current page
    document.querySelectorAll('[data-date]').forEach(element => {
        const dateValue = element.getAttribute('data-date');
        if (dateValue) {
            element.textContent = formatDate(dateValue);
        }
    });
    
    // Also update any date inputs that show formatted dates
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.value) {
            const formatted = formatDate(input.value);
            // Update any associated display elements
            const display = input.parentElement.querySelector('.date-display');
            if (display) {
                display.textContent = formatted;
            }
        }
    });
}

function updateAllDateDisplays() {
    updateDateDisplays();
    
    // Update timestamps in access logs
    if (typeof renderAccessLogs === 'function') {
        renderAccessLogs();
    }
    
    // Update any other date-related displays
    document.querySelectorAll('.date-value, .timestamp, [class*="date"]').forEach(el => {
        if (el.textContent && el.textContent.match(/\d{4}-\d{2}-\d{2}/)) {
            try {
                const date = new Date(el.textContent);
                if (!isNaN(date.getTime())) {
                    el.textContent = formatDate(date.toISOString());
                }
            } catch (e) {
                // Ignore if not a valid date
            }
        }
    });
}

/* ---------- Regional Settings ---------- */
function loadRegionalSettings() {
    const fallback = {
        timeFormat: '12h',
        timezone: 'Asia/Manila',
        currency: 'PHP',
        numberFormat: '1,234.56'
    };

    try {
        const stored = localStorage.getItem(REGIONAL_SETTINGS_STORAGE_KEY);
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
}

function saveRegionalSettings() {
    localStorage.setItem(REGIONAL_SETTINGS_STORAGE_KEY, JSON.stringify(regionalSettings));
    applyRegionalSettings();
}

function applyRegionalSettings() {
    // Store regional settings for use across the system
    document.documentElement.setAttribute('data-time-format', regionalSettings.timeFormat);
    document.documentElement.setAttribute('data-timezone', regionalSettings.timezone);
    document.documentElement.setAttribute('data-currency', regionalSettings.currency);
    document.documentElement.setAttribute('data-number-format', regionalSettings.numberFormat);
    
    // Apply time format immediately
    updateAllTimeDisplays();
    
    // Apply currency format immediately
    updateAllCurrencyDisplays();
    
    // Apply number format immediately
    updateAllNumberDisplays();
    
    window.dispatchEvent(new CustomEvent('regionalSettingsUpdated', {
        detail: regionalSettings
    }));
}

function formatTime(date, format = regionalSettings.timeFormat) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    
    if (format === '24h') {
        return d.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: regionalSettings.timezone 
        });
    } else {
        return d.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: regionalSettings.timezone 
        });
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    
    const currencySymbols = {
        'PHP': '₱',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    };
    
    const symbol = currencySymbols[regionalSettings.currency] || '';
    const formatted = formatNumber(num);
    
    return `${symbol}${formatted}`;
}

function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    const n = parseFloat(num);
    if (isNaN(n)) return num;
    
    const format = regionalSettings.numberFormat;
    
    if (format === '1.234,56') {
        // EU format
        return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (format === '1 234,56') {
        // FR format
        return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        // US format (default)
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function updateAllTimeDisplays() {
    document.querySelectorAll('[data-time], .time-value, .timestamp').forEach(el => {
        const timeValue = el.getAttribute('data-time') || el.textContent;
        if (timeValue) {
            try {
                const date = new Date(timeValue);
                if (!isNaN(date.getTime())) {
                    el.textContent = formatTime(date);
                }
            } catch (e) {
                // Ignore if not a valid time
            }
        }
    });
}

function updateAllCurrencyDisplays() {
    document.querySelectorAll('[data-currency], .currency-value, .price, .amount').forEach(el => {
        const amount = el.getAttribute('data-currency') || parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
        if (!isNaN(amount)) {
            el.textContent = formatCurrency(amount);
        }
    });
}

function updateAllNumberDisplays() {
    document.querySelectorAll('[data-number], .number-value, .quantity').forEach(el => {
        const num = el.getAttribute('data-number') || parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
            el.textContent = formatNumber(num);
        }
    });
}

function initializeRegionalSettingsSection() {
    const regionalSettingsForm = document.getElementById('regionalSettingsForm');
    const feedback = document.getElementById('regionalSettingsFeedback');

    if (!regionalSettingsForm) return;

    const timeFormatSelect = document.getElementById('timeFormatSelect');
    const timezoneSelect = document.getElementById('timezoneSelect');
    const currencySelect = document.getElementById('currencySelect');
    const numberFormatSelect = document.getElementById('numberFormatSelect');

    if (timeFormatSelect) timeFormatSelect.value = regionalSettings.timeFormat;
    if (timezoneSelect) timezoneSelect.value = regionalSettings.timezone;
    if (currencySelect) currencySelect.value = regionalSettings.currency;
    if (numberFormatSelect) numberFormatSelect.value = regionalSettings.numberFormat;

    applyRegionalSettings();

    regionalSettingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        regionalSettings = {
            timeFormat: timeFormatSelect.value,
            timezone: timezoneSelect.value,
            currency: currencySelect.value,
            numberFormat: numberFormatSelect.value
        };

        saveRegionalSettings();
        showFeedback(feedback, 'Regional settings saved successfully!', true);
        
        // Show visual feedback
        showSettingsAppliedFeedback('regionalSettingsForm');
    });
}

/* ---------- Preferences ---------- */
function loadPreferences() {
    const fallback = {
        notifications: true,
        autoUpdate: true,
        dataSharing: false,
        theme: 'system'
    };

    try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
}

function savePreferences() {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesData));
}

/* ---------- Access Logs ---------- */
function loadAccessLogs() {
    // Start with empty logs - no fallback data
    try {
        const stored = localStorage.getItem(ACCESS_LOGS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveAccessLogs() {
    localStorage.setItem(ACCESS_LOGS_STORAGE_KEY, JSON.stringify(accessLogs));
}

function renderAccessLogs() {
    const tbody = document.getElementById('accessLogsBody');

    if (!tbody) {
        updateSecurityOverview();
        return;
    }

    if (!accessLogs.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px;">No access logs recorded yet.</td>
            </tr>
        `;
        updateSecurityOverview();
        return;
    }

    const rows = accessLogs
        .sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a))
        .map(log => {
            const isActive = log.active && log.status === 'success';
            const statusClass =
                log.status === 'success' ? 'status-success' :
                log.status === 'failed' ? 'status-failed' : 'status-terminated';
            const statusLabel =
                log.status === 'success' ? (isActive ? 'Active' : 'Success') :
                log.status === 'failed' ? 'Failed' :
                'Logged Out';

            return `
                <tr>
                    <td>
                        ${isActive
                            ? `<button class="logout-device-btn" data-session-id="${log.id}">Log Out</button>`
                            : '<span class="muted">—</span>'}
                    </td>
                    <td>${log.email || '—'}</td>
                    <td>${formatTimestamp(log.timestamp)}</td>
                    <td>${log.ip || '—'}</td>
                    <td>${log.device || '—'}</td>
                    <td class="${statusClass}">
                        <span class="status-chip">
                            <span class="status-dot ${log.status}"></span>
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

    tbody.innerHTML = rows;
    attachLogoutActions();
    updateSecurityOverview();
}

function setupLogButtons() {
    const refreshBtn = document.getElementById('refreshLogsBtn');
    const addDemoBtn = document.getElementById('addDemoLogBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            accessLogs = loadAccessLogs();
            renderAccessLogs();
        });
    }

    if (addDemoBtn) {
        addDemoBtn.addEventListener('click', () => {
            const now = new Date();
            const newLog = {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `sess-${Date.now()}`,
                email: 'demo@bonbonkitchen.com',
                timestamp: now.toISOString(),
                device: 'Chrome on Android',
                ip: `192.168.1.${Math.floor(Math.random() * 80) + 10}`,
                status: 'success',
                active: true
            };
            accessLogs.unshift(newLog);
            saveAccessLogs();
            renderAccessLogs();
        });
    }
}

function getLogTimestamp(log) {
    if (log.timestamp) {
        const parsed = Date.parse(log.timestamp);
        if (!Number.isNaN(parsed)) return parsed;
    }

    const datePart = log.date || '';
    const timePart = log.time || '00:00';
    const parsed = Date.parse(`${datePart} ${timePart}`);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function updateSecurityOverview() {
    const successValue = document.getElementById('overviewSuccess');
    if (!successValue) return;

    const successCount = accessLogs.filter(log => log.status === 'success').length;
    const failedCount = accessLogs.filter(log => log.status === 'failed').length;

    successValue.textContent = successCount;
    const failedValue = document.getElementById('overviewFailed');
    if (failedValue) {
        failedValue.textContent = failedCount;
    }

    const successLogs = accessLogs
        .filter(log => log.status === 'success')
        .sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a));

    const lastLoginDate = document.getElementById('lastLoginDate');
    const lastLoginIp = document.getElementById('lastLoginIp');

    if (successLogs.length && lastLoginDate && lastLoginIp) {
        const latest = successLogs[0];
        lastLoginDate.textContent = formatTimestamp(latest.timestamp);
        lastLoginIp.textContent = latest.ip || 'Unknown';
    } else if (lastLoginDate && lastLoginIp) {
        lastLoginDate.textContent = 'No successful logins recorded';
        lastLoginIp.textContent = '—';
    }

    const alertBox = document.getElementById('securityAlertBox');
    const alertText = document.getElementById('securityAlertText');
    if (alertBox && alertText) {
        if (failedCount > 0) {
            alertBox.style.display = 'flex';
            alertText.textContent = `${failedCount} failed login attempt${failedCount > 1 ? 's' : ''} detected. Please review your access logs.`;
        } else {
            alertBox.style.display = 'none';
        }
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) return timestamp;
    
    const date = new Date(parsed);
    const formattedDate = formatDate(date.toISOString());
    const formattedTime = formatTime(date.toISOString());
    
    return `${formattedDate} ${formattedTime}`;
}

function attachLogoutActions() {
    document.querySelectorAll('.logout-device-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-session-id');
            logoutSession(id);
        });
    });
}

function logoutSession(sessionId) {
    // Remove the log from the array instead of just marking it as terminated
    const index = accessLogs.findIndex(log => log.id === sessionId);
    if (index === -1) return;

    // Remove the log entry completely
    accessLogs.splice(index, 1);

    saveAccessLogs();
    renderAccessLogs();
}

/* ---------- Utilities ---------- */
function showFeedback(element, message, isSuccess = false, isError = false) {
    if (!element) return;
    element.textContent = message;
    if (isSuccess) {
        element.style.color = '#1d7c32';
        element.classList.add('feedback-success');
    } else if (isError) {
        element.style.color = '#c0392b';
        element.classList.add('feedback-error');
    } else {
        element.style.color = '#1d7c32';
    }
    setTimeout(() => {
        element.textContent = '';
        element.classList.remove('feedback-success', 'feedback-error');
    }, 3500);
}

function showSettingsAppliedFeedback(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Add visual feedback animation
    form.classList.add('settings-applied');
    setTimeout(() => {
        form.classList.remove('settings-applied');
    }, 2000);
    
    // Highlight changed fields
    const inputs = form.querySelectorAll('select, input[type="date"], input[type="checkbox"]');
    inputs.forEach(input => {
        input.classList.add('field-updated');
        setTimeout(() => {
            input.classList.remove('field-updated');
        }, 1500);
    });
}

