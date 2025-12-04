// Get the current page filename
const currentPage = window.location.pathname.split('/').pop();

// API endpoint
const API_BASE = 'api/auth.php';

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', () => {
    if (currentPage === 'login.html' || currentPage.includes('login')) {
        initLogin();
    } else if (currentPage === 'signup.html' || currentPage.includes('signup')) {
        initSignup();
    } else if (currentPage === 'forgot-password.html' || currentPage.includes('forgot')) {
        initForgotPassword();
    } else if (currentPage === 'verify-code.html' || currentPage.includes('verify')) {
        initVerifyCode();
    } else if (currentPage === 'reset-password.html' || currentPage.includes('reset')) {
        initResetPassword();
    }
});

// Login functionality
function initLogin() {
    const form = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    email,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store user session
                if (rememberMe) {
                    localStorage.setItem('user_id', data.user_id);
                    localStorage.setItem('user_email', data.email);
                } else {
                    sessionStorage.setItem('user_id', data.user_id);
                    sessionStorage.setItem('user_email', data.email);
                }

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(errorDiv, data.message || 'Invalid email or password');
            }
        } catch (error) {
            showError(errorDiv, 'Network error. Please try again.');
        }
    });
}

// Signup functionality
function initSignup() {
    const form = document.getElementById('signupForm');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
    });

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        toggleConfirmPassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            showError(errorDiv, 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError(errorDiv, 'Password must be at least 6 characters');
            return;
        }

        // Split name into first and last
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'signup',
                    firstName,
                    lastName,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store user session
                sessionStorage.setItem('user_id', data.user_id);
                sessionStorage.setItem('user_email', data.email);

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(errorDiv, data.message || 'Failed to create account');
            }
        } catch (error) {
            showError(errorDiv, 'Network error. Please try again.');
        }
    });
}

// Forgot Password functionality
function initForgotPassword() {
    const form = document.getElementById('forgotPasswordForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const email = document.getElementById('email').value.trim();

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'forgot_password',
                    email
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store email in session for verification
                sessionStorage.setItem('reset_email', email);
                // Redirect to verify code page
                window.location.href = 'verify-code.html';
            } else {
                showError(errorDiv, data.message || 'Failed to send code');
            }
        } catch (error) {
            showError(errorDiv, 'Network error. Please try again.');
        }
    });
}

// Verify Code functionality
function initVerifyCode() {
    const form = document.getElementById('verifyCodeForm');
    const codeInputs = ['code1', 'code2', 'code3', 'code4', 'code5', 'code6'];

    // Auto-focus next input
    codeInputs.forEach((id, index) => {
        const input = document.getElementById(id);
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < codeInputs.length - 1) {
                document.getElementById(codeInputs[index + 1]).focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                document.getElementById(codeInputs[index - 1]).focus();
            }
        });
    });

    // Timer countdown
    let timeLeft = 300; // 5 minutes in seconds
    const timerElement = document.getElementById('timer');
    const timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = '0:00';
            showError(document.getElementById('errorMessage'), 'Code expired. Please request a new one.');
        }
        timeLeft--;
    }, 1000);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const code = codeInputs.map(id => document.getElementById(id).value).join('');
        const email = sessionStorage.getItem('reset_email');

        if (!email) {
            showError(errorDiv, 'Session expired. Please start over.');
            window.location.href = 'forgot-password.html';
            return;
        }

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_code',
                    email,
                    code
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                clearInterval(timerInterval);
                // Redirect to reset password
                window.location.href = 'reset-password.html';
            } else {
                showError(errorDiv, data.message || 'Invalid verification code');
            }
        } catch (error) {
            showError(errorDiv, 'Network error. Please try again.');
        }
    });
}

// Reset Password functionality
function initResetPassword() {
    const form = document.getElementById('resetPasswordForm');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Toggle password visibility
    toggleNewPassword.addEventListener('click', () => {
        const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        newPasswordInput.setAttribute('type', type);
        toggleNewPassword.querySelector('.eye-icon').textContent = type === 'password' ? '✓' : '👁';
    });

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        toggleConfirmPassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        // Prefer email from reset flow, but allow manual entry if needed
        let email = sessionStorage.getItem('reset_email');
        if (!email) {
            email = prompt('Please enter the email for this account:') || '';
        }
        email = email.trim();
        if (!email) {
            showError(errorDiv, 'Email is required to reset your password.');
            return;
        }

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showError(errorDiv, 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            showError(errorDiv, 'Password must be at least 6 characters');
            return;
        }

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset_password',
                    email,
                    newPassword
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Show success message
                showSuccess('Password changed successfully! Redirecting...');
                sessionStorage.removeItem('reset_email');
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showError(errorDiv, data.message || 'Failed to reset password');
            }
        } catch (error) {
            showError(errorDiv, 'Network error. Please try again.');
        }
    });
}

// Utility functions
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = 'error-message';
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'success-message';
}

// Logout function (can be called from other pages)
function logout() {
    const uid = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    const doClear = () => {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        sessionStorage.removeItem('user_id');
        sessionStorage.removeItem('user_email');
        sessionStorage.removeItem('reset_email');
    };

    const finish = () => {
        window.location.href = 'login.html';
    };

    if (!uid) {
        doClear();
        finish();
        return;
    }

    fetch('api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', userId: Number(uid) || 0 })
    }).catch(() => {}).finally(() => {
        doClear();
        finish();
    });
}

