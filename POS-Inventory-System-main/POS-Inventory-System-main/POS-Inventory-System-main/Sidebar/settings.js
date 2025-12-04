// Settings Page JavaScript

const PROFILE_STORAGE_KEY = 'bonbonUserProfile';
const SECURITY_STORAGE_KEY = 'bonbonUserSecurity';
const PREFERENCES_STORAGE_KEY = 'bonbonUserPreferences';
const ACCESS_LOGS_STORAGE_KEY = 'bonbonAccessLogs';
const SYSTEM_SETTINGS_STORAGE_KEY = 'bonbonSystemSettings';
const REGIONAL_SETTINGS_STORAGE_KEY = 'bonbonRegionalSettings';
const ARCHIVES_STORAGE_KEY = 'bonbonArchives';
const SETTINGS_ACTIVE_TAB_KEY = 'bonbonSettingsActiveTab';

let profileData = loadProfileData();
let securityData = loadSecurityData();
let preferencesData = loadPreferences();
let accessLogs = loadAccessLogs();
let systemSettings = loadSystemSettings();
let regionalSettings = loadRegionalSettings();

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettingsFromBackend();
    setupSidebarToggle();
    if (typeof PersistUtils !== 'undefined') PersistUtils.applyTabPersistence('settings');
    setupTabs();
    initializeProfileSection();
    initializeSecuritySection();
    initializeSystemSettingsSection();
    initializeRegionalSettingsSection();
    renderAccessLogs();
    setupLogButtons();
    initializeArchivesSection();
    applyAllSettings();
});

// Resolve correct API path whether we're on *.html (Sidebar/) or *.php (Sidebar/api/)
function apiPath(script) {
    return window.location.pathname.includes('/api/')
        ? script
        : `api/${script}`;
}

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
    const setActive = (target) => {
        if (!target) return;
        buttons.forEach(btn => {
            const isSelf = btn.dataset.tab === target;
            btn.classList.toggle('active', isSelf);
            btn.setAttribute('aria-selected', isSelf);
        });
        tabs.forEach(tab => {
            const shouldActivate = tab.id === `${target}Tab`;
            tab.classList.toggle('active', shouldActivate);
            tab.setAttribute('aria-hidden', !shouldActivate);
        });
    };
    try {
        const stored = localStorage.getItem(SETTINGS_ACTIVE_TAB_KEY);
        if (stored && Array.from(buttons).some(b => b.dataset.tab === stored)) {
            setActive(stored);
        }
    } catch {}

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.tab;
            setActive(target);
            try { localStorage.setItem(SETTINGS_ACTIVE_TAB_KEY, target); } catch {}
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

    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        profileData = {
            ...profileData,
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim()
        };

        // Save locally for instant UI updates
        saveProfileData();
        updateProfileIdentity(profileFullName, profileEmailText, userNameDisplay);

        // Also send to backend to store in `users` table
        try {
            const res = await fetch(apiPath('settings.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_profile',
                    firstName: profileData.firstName,
                    lastName: profileData.lastName,
                    email: profileData.email,
                    phone: profileData.phone
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                const msg = settingsErrorMessage(errJson.error || 'server_error');
                showFeedback(feedback, msg, false, true);
                return;
            }

            showFeedback(feedback, 'Profile saved to database successfully!', true);
        } catch (e) {
            showFeedback(feedback, settingsErrorMessage('network_error'), false, true);
        }

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

async function handleProfileImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const feedbackEl = document.getElementById('profileFeedback');

    // Preview immediately
    const localUrl = URL.createObjectURL(file);
    document.getElementById('profileImagePreview').src = localUrl;

    // Upload to backend so avatar_url is stored in DB
    const formData = new FormData();
    formData.append('avatar', file);
    // Use correct path whether we are on settings.php (in api/) or settings.html (in Sidebar/)
    const avatarEndpoint = window.location.pathname.includes('/api/')
        ? 'upload_avatar.php'
        : 'api/upload_avatar.php';

    try {
        const res = await fetch(avatarEndpoint, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const msg = settingsErrorMessage(errJson.error || 'server_error');
            showFeedback(feedbackEl, msg, false, true);
            return;
        }

        const json = await res.json();
        if (json.avatarUrl) {
            // Store the URL returned by backend
            profileData.photo = json.avatarUrl;
            document.getElementById('profileImagePreview').src = json.avatarUrl;
            saveProfileData();
        }

        showFeedback(feedbackEl, 'Profile picture updated!', true);
        document.dispatchEvent(new CustomEvent('profileUpdated', { detail: profileData }));
    } catch (e) {
        showFeedback(feedbackEl, settingsErrorMessage('network_error'), false, true);
    }
}

/* ---------- Security ---------- */
function loadSecurityData() {
    const fallback = {
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

    securityForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const current = document.getElementById('currentPasswordInput').value;
        const next = document.getElementById('newPasswordInput').value;
        const confirm = document.getElementById('confirmPasswordInput').value;

        if (next.length < 8) {
            showFeedback(feedback, 'New password must be at least 8 characters.', true);
            return;
        }

        if (next !== confirm) {
            showFeedback(feedback, 'New passwords do not match.', true);
            return;
        }

        try {
            const res = await fetch(apiPath('settings.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'change_password',
                    currentPassword: current,
                    newPassword: next
                })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.error) {
                const code = json.error || 'server_error';
                const map = {
                    invalid_current_password: 'Current password is incorrect.',
                    weak_password: 'New password must be at least 8 characters.',
                    missing_password: 'Please fill in all password fields.'
                };
                const msg = map[code] || settingsErrorMessage(code);
                showFeedback(feedback, msg, true);
                return;
            }
            securityData.lastPasswordChange = json.lastPasswordChange || new Date().toISOString();
            saveSecurityData();
            lastPasswordChange.textContent = new Date(securityData.lastPasswordChange).toLocaleString();
            securityForm.reset();
            showFeedback(feedback, 'Password updated successfully!');
        } catch (e) {
            showFeedback(feedback, settingsErrorMessage('network_error'), true);
        }
    });

    twoFactorToggle.addEventListener('change', () => {
        securityData.twoFactor = twoFactorToggle.checked;
        saveSecurityData();
        saveSecuritySettings();
    });

    loginAlertsToggle.addEventListener('change', () => {
        securityData.loginAlerts = loginAlertsToggle.checked;
        saveSecurityData();
        saveSecuritySettings();
    });
}

async function saveSecuritySettings() {
    try {
        await fetch(apiPath('settings.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_security_settings',
                twoFactor: !!securityData.twoFactor,
                loginAlerts: !!securityData.loginAlerts
            })
        });
    } catch (_) {
        // Silent fail; toggles still stored locally
    }
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

async function saveSystemSettings() {
    const feedbackEl = document.getElementById('systemSettingsFeedback');
    try {
        const res = await fetch(apiPath('settings.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_system_settings', language: systemSettings.language, dateFormat: systemSettings.dateFormat })
        });
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok || (json && json.error)) {
            const code = (json && json.error) ? json.error : 'server_error';
            const msg = settingsErrorMessage(code);
            showFeedback(feedbackEl, msg, false, true);
            if (code === 'network_error' || code === 'db_error' || code === 'server_error') {
                localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
                applySystemSettings();
                showToast({ message: 'Settings saved locally (offline)', kind: 'info' });
            }
            return;
        }
        localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
        applySystemSettings();
        showFeedback(feedbackEl, 'Settings saved', true, false);
    } catch (_) {
        localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
        applySystemSettings();
        showFeedback(feedbackEl, 'Network error. Saved locally.', false, true);
        showToast({ message: 'Settings saved locally (offline)', kind: 'info' });
    }
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
        case 'MMM DD, YYYY':
            return `${monthNames[d.getMonth()]} ${day}, ${year}`;
        case 'YYYY/MM/DD':
            return `${year}/${month}/${day}`;
        case 'DD.MM.YYYY':
            return `${day}.${month}.${year}`;
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

async function saveRegionalSettings() {
    const feedbackEl = document.getElementById('regionalSettingsFeedback');
    try {
        const res = await fetch(apiPath('settings.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_regional_settings', timeFormat: regionalSettings.timeFormat, timezone: regionalSettings.timezone, currency: regionalSettings.currency, numberFormat: regionalSettings.numberFormat })
        });
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok || (json && json.error)) {
            const code = (json && json.error) ? json.error : 'server_error';
            const msg = settingsErrorMessage(code);
            showFeedback(feedbackEl, msg, false, true);
            if (code === 'network_error' || code === 'db_error' || code === 'server_error') {
                localStorage.setItem(REGIONAL_SETTINGS_STORAGE_KEY, JSON.stringify(regionalSettings));
                applyRegionalSettings();
                showToast({ message: 'Regional settings saved locally', kind: 'info' });
            }
            return;
        }
        localStorage.setItem(REGIONAL_SETTINGS_STORAGE_KEY, JSON.stringify(regionalSettings));
        applyRegionalSettings();
        showFeedback(feedbackEl, 'Regional settings saved', true, false);
    } catch (_) {
        localStorage.setItem(REGIONAL_SETTINGS_STORAGE_KEY, JSON.stringify(regionalSettings));
        applyRegionalSettings();
        showFeedback(feedbackEl, 'Network error. Saved locally.', false, true);
        showToast({ message: 'Regional settings saved locally', kind: 'info' });
    }
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
        'PHP': '₱', 'USD': '$', 'EUR': '€', 'GBP': '£',
        'JPY': '¥', 'CNY': '¥', 'KRW': '₩',
        'AUD': '$', 'CAD': '$', 'NZD': '$', 'SGD': '$', 'HKD': '$', 'TWD': '$',
        'INR': '₹', 'THB': '฿', 'IDR': 'Rp', 'MYR': 'RM',
        'CHF': 'CHF', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
        'RUB': '₽', 'BRL': 'R$', 'ZAR': 'R', 'AED': 'د.إ', 'SAR': '﷼'
    };
    
    const symbol = currencySymbols[regionalSettings.currency] || '';
    const formatted = formatNumber(num);
    
    return `${symbol}${formatted}`;
}

function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    const n = parseFloat(num);
    if (isNaN(n)) return num;
    
    let format = regionalSettings.numberFormat || '';
    format = format.replace(/\u00A0|\u202F/g, ' ');
    
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

async function savePreferences() {
    try {
        const res = await fetch(apiPath('settings.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_preferences', notifications: preferencesData.notifications, autoUpdate: preferencesData.autoUpdate, dataSharing: preferencesData.dataSharing, theme: preferencesData.theme })
        });
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok || (json && json.error)) {
            const code = (json && json.error) ? json.error : 'server_error';
            const msg = settingsErrorMessage(code);
            showToast({ message: msg, kind: 'error' });
            if (code === 'network_error' || code === 'db_error' || code === 'server_error') {
                localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesData));
                showToast({ message: 'Preferences saved locally', kind: 'info' });
            }
            return;
        }
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesData));
        showToast({ message: 'Preferences saved', kind: 'success' });
    } catch (_) {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesData));
        showToast({ message: 'Network error. Preferences saved locally.', kind: 'info' });
    }
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
        refreshBtn.addEventListener('click', async () => {
            const logs = await fetchLogsFromBackend();
            if (!logs.length) {
                showToast({ message: 'Unable to fetch logs', kind: 'error' });
            }
            accessLogs = logs;
            saveAccessLogs();
            renderAccessLogs();
        });
    }

    if (addDemoBtn) {
        addDemoBtn.addEventListener('click', async () => {
            try {
        const res = await fetch(apiPath('settings.php'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'add_demo_log' })
                });
                if (!res.ok) {
                    showToast({ message: 'Unable to add demo log', kind: 'error' });
                }
                const logs = await fetchLogsFromBackend();
                accessLogs = logs;
                saveAccessLogs();
                renderAccessLogs();
            } catch (e) { showToast({ message: 'Network error adding log', kind: 'error' }); }
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
    const index = accessLogs.findIndex(log => log.id === sessionId);
    if (index === -1) return;
    accessLogs.splice(index, 1);
    saveAccessLogs();
    renderAccessLogs();
}

async function loadSettingsFromBackend() {
    try {
        const res = await fetch(apiPath('settings.php'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_settings' }) });
        if (!res.ok) return;
        const json = await res.json();
        if (json.profile) {
            profileData = {
                ...profileData,
                firstName: json.profile.firstName || '',
                lastName: json.profile.lastName || '',
                email: json.profile.email || '',
                phone: json.profile.phone || '',
                photo: json.profile.avatarUrl || profileData.photo || ''
            };
            saveProfileData();
        }
        if (json.security) {
            securityData.twoFactor = !!json.security.twoFactor;
            securityData.loginAlerts = !!json.security.loginAlerts;
            securityData.lastPasswordChange = json.security.lastPasswordChange || securityData.lastPasswordChange;
            saveSecurityData();
        }
        if (json.system) {
            systemSettings = { language: json.system.language || 'en', dateFormat: json.system.dateFormat || 'MM/DD/YYYY' };
            localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
        }
        if (json.regional) {
            regionalSettings = { timeFormat: json.regional.timeFormat || '12h', timezone: json.regional.timezone || 'Asia/Manila', currency: json.regional.currency || 'PHP', numberFormat: json.regional.numberFormat || '1,234.56' };
            localStorage.setItem(REGIONAL_SETTINGS_STORAGE_KEY, JSON.stringify(regionalSettings));
        }
        if (json.preferences) {
            preferencesData = { notifications: !!json.preferences.notifications, autoUpdate: !!json.preferences.autoUpdate, dataSharing: !!json.preferences.dataSharing, theme: json.preferences.theme || 'system' };
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesData));
        }
        if (Array.isArray(json.logs)) {
            accessLogs = json.logs.map((l, idx) => ({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `log-${idx}-${Date.now()}`,
                email: l.email || '—',
                timestamp: l.timestamp,
                ip: l.ip,
                device: l.device,
                status: l.status,
                active: l.status === 'success' && !l.loggedOutAt
            }));
            saveAccessLogs();
        }
    } catch (e) {}
}

async function fetchLogsFromBackend() {
    try {
        const res = await fetch(apiPath('settings.php'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_logs' }) });
        if (!res.ok) { return []; }
        const json = await res.json();
        const list = Array.isArray(json.logs) ? json.logs : [];
        return list.map((l, idx) => ({ id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `log-${idx}-${Date.now()}`, email: '—', timestamp: l.timestamp, ip: l.ip, device: l.device, status: l.status, active: l.status === 'success' && !l.loggedOutAt }));
    } catch (e) {
        return [];
    }
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
function settingsErrorMessage(code) {
    const map = {
        invalid_language: 'Please select a valid language.',
        invalid_date_format: 'Please select a valid date format.',
        invalid_time_format: 'Please select 12h or 24h time format.',
        invalid_timezone: 'Please select a valid timezone.',
        invalid_currency: 'Please select a valid currency.',
        invalid_number_format: 'Please select a valid number format.',
        invalid_theme: 'Please select a valid theme.',
        db_error: 'Database error encountered.',
        network_error: 'Network error encountered.',
        server_error: 'Server error encountered.',
        unknown_action: 'Unknown server action.'
    };
    return map[code] || 'Operation failed.';
}
function initializeArchivesSection() {
    const typeSel = document.getElementById('archivesTypeSelect');
    const qInput = document.getElementById('archivesSearchInput');
    const fromInput = document.getElementById('archivesFromDate');
    const toInput = document.getElementById('archivesToDate');
    const refreshBtn = document.getElementById('archivesRefreshBtn');
    const sortSel = document.getElementById('archivesSortSelect');
    const catWrap = document.getElementById('archivesCategoryWrapper');
    const catSel = document.getElementById('archivesCategorySelect');
    const clearBtn = document.getElementById('archivesClearBtn');
    const tbody = document.getElementById('archivesTableBody');
    if (!typeSel || !tbody) return;
    let lastRows = [];
    const render = rows => {
        const type = typeSel.value;
        let data = Array.isArray(rows) ? rows.slice() : [];
        if (type === 'products' && catSel && catSel.value) {
            data = data.filter(r => String(r.category_slug || '') === String(catSel.value));
        }
        const cmp = (a, b, key, dir = 'asc') => {
            const av = a[key];
            const bv = b[key];
            if (av == null && bv == null) return 0;
            if (av == null) return dir === 'asc' ? 1 : -1;
            if (bv == null) return dir === 'asc' ? -1 : 1;
            if (key === 'deleted_at') {
                const ad = Date.parse(av);
                const bd = Date.parse(bv);
                const res = (isNaN(ad) ? 0 : ad) - (isNaN(bd) ? 0 : bd);
                return dir === 'asc' ? res : -res;
            }
            if (typeof av === 'string' && typeof bv === 'string') {
                const res = av.localeCompare(bv);
                return dir === 'asc' ? res : -res;
            }
            const res = (av > bv) - (av < bv);
            return dir === 'asc' ? res : -res;
        };
        if (sortSel) {
            const sv = sortSel.value;
            if (sv === 'deleted_desc') data.sort((a, b) => cmp(a, b, 'deleted_at', 'desc'));
            else if (sv === 'deleted_asc') data.sort((a, b) => cmp(a, b, 'deleted_at', 'asc'));
            else if (sv === 'name_asc') data.sort((a, b) => cmp(a, b, 'name', 'asc'));
            else if (sv === 'name_desc') data.sort((a, b) => cmp(a, b, 'name', 'desc'));
        }
        lastRows = data;
        tbody.innerHTML = data.map(r => {
            if (type === 'orders') {
                return `
                <tr>
                    <td>orders</td>
                    <td>${r.order_id || '—'}</td>
                    <td>${r.order_number || '—'}</td>
                    <td>${r.payment_method || '—'}</td>
                    <td>${typeof r.total_amount === 'number' ? r.total_amount.toFixed(2) : '—'}</td>
                    <td>—</td>
                    <td>${formatTimestamp(r.cancelled_at)}</td>
                    <td>—</td>
                </tr>`;
            }
            if (type === 'ingredients') {
                return `
                <tr>
                    <td>ingredients</td>
                    <td>${r.ingredient_id || '—'}</td>
                    <td>${r.name || '—'}</td>
                    <td>${r.unit || '—'}</td>
                    <td>—</td>
                    <td>${typeof r.current_stock === 'number' ? r.current_stock : '—'}</td>
                    <td>${formatTimestamp(r.deleted_at)}</td>
                    <td><button class="restore-btn" data-type="ingredients" data-archive-id="${r.archive_id}"><i class="fas fa-rotate-left"></i> Restore</button></td>
                </tr>`;
            }
            if (type === 'recipes') {
                return `
                <tr>
                    <td>recipes</td>
                    <td>${r.recipe_id || '—'}</td>
                    <td>${r.recipe_name || '—'}</td>
                    <td>${r.product_id || '—'}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>${formatTimestamp(r.deleted_at)}</td>
                    <td><button class="restore-btn" data-type="recipes" data-archive-id="${r.archive_id}"><i class="fas fa-rotate-left"></i> Restore</button></td>
                </tr>`;
            }
            return `
            <tr>
                <td>${type}</td>
                <td>${r.client_product_id || r.product_id || '—'}</td>
                <td>${r.name || '—'}</td>
                <td>${r.category_slug || '—'}</td>
                <td>${typeof r.selling_price === 'number' ? r.selling_price.toFixed(2) : '—'}</td>
                <td>${typeof r.stock_quantity === 'number' ? r.stock_quantity : '—'}</td>
                <td>${formatTimestamp(r.deleted_at)}</td>
                <td><button class="restore-btn" data-type="products" data-archive-id="${r.archive_id}"><i class="fas fa-rotate-left"></i> Restore</button></td>
            </tr>`;
        }).join('');
    };
    const load = async () => {
        const type = typeSel.value;
        const params = new URLSearchParams({ action: 'archives', type });
        const q = (qInput && qInput.value.trim()) || '';
        const from = (fromInput && fromInput.value) || '';
        const to = (toInput && toInput.value) || '';
        if (q) params.append('q', q);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        try {
            const endpoint = type === 'orders' ? apiPath('pos.php') : apiPath('inventory.php');
            const json = await NetUtils.fetchJson(`${endpoint}?${params.toString()}`, {}, { ttl: 3000, retries: 1, key: `archives:${type}:${params.toString()}` });
            const rows = Array.isArray(json.rows) ? json.rows : [];
            render(rows);
            if (type === 'products' && catWrap && catSel) {
                const cats = Array.from(new Set(rows.map(r => String(r.category_slug || '')).filter(Boolean)));
                catSel.innerHTML = ['<option value="">All Categories</option>', ...cats.map(c => `<option value="${c}">${c}</option>`)].join('');
                catWrap.hidden = cats.length === 0;
            } else if (catWrap) {
                catWrap.hidden = true;
            }
            const local = loadArchivesLocal();
            local[type] = rows;
            saveArchivesLocal(local);
        } catch (e) {
            const local = loadArchivesLocal();
            render(local[type] || []);
            showToast({ message: 'Loaded local archives', kind: 'info' });
        }
    };
    typeSel.addEventListener('change', load);
    try { if (qInput) { const EM = new EventManager(); EM.on(qInput, 'input', load, { debounce: 250 }); } } catch (_) { if (qInput) qInput.addEventListener('input', load); }
    if (fromInput) fromInput.addEventListener('change', load);
    if (toInput) toInput.addEventListener('change', load);
    if (refreshBtn) refreshBtn.addEventListener('click', load);
    if (sortSel) sortSel.addEventListener('change', () => render(lastRows));
    if (catSel) catSel.addEventListener('change', () => render(lastRows));
    if (clearBtn) clearBtn.addEventListener('click', () => { if (qInput) qInput.value = ''; if (fromInput) fromInput.value = ''; if (toInput) toInput.value = ''; if (catSel) catSel.value = ''; load(); });
    tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.restore-btn');
        if (!btn) return;
        const type = btn.getAttribute('data-type');
        const aid = parseInt(btn.getAttribute('data-archive-id'), 10);
        if (!aid) return;
        try {
            const payload = { action: '', archive_id: aid };
            if (type === 'products') payload.action = 'restore_product';
            else if (type === 'ingredients') payload.action = 'restore_ingredient';
            else if (type === 'recipes') payload.action = 'restore_recipe';
            else return;
            const res = await fetch(apiPath('inventory.php'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            let json = {};
            try { json = await res.json(); } catch (_) { json = {}; }
            if (!res.ok || (json && json.error)) {
                const code = (json && json.error) ? json.error : 'server_error';
                showToast({ message: settingsErrorMessage(code), kind: 'error' });
                return;
            }
            showToast({ message: 'Item restored', kind: 'success' });
            load();
        } catch (_) {
            showToast({ message: 'Network error', kind: 'error' });
        }
    });
    load();
}

function loadArchivesLocal() {
    try {
        const stored = localStorage.getItem(ARCHIVES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : { products: [], ingredients: [], recipes: [], orders: [] };
    } catch {
        return { products: [], ingredients: [], recipes: [], orders: [] };
    }
}

function saveArchivesLocal(data) {
    localStorage.setItem(ARCHIVES_STORAGE_KEY, JSON.stringify(data));
}
