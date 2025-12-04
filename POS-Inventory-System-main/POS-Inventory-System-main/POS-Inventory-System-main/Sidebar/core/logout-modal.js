(function () {
    let initialized = false;

    const TEMPLATE = `
        <div class="modal-backdrop" id="logoutBackdrop">
            <div class="modal-card">
                <h2 class="modal-title">Log Out</h2>
                <p class="modal-text">Are you sure you want to log out?</p>
                <div class="modal-actions">
                    <button class="modal-btn primary" id="logoutConfirmYes">Yes</button>
                    <button class="modal-btn secondary" id="logoutConfirmNo">No</button>
                </div>
            </div>
        </div>
        <div class="modal-backdrop" id="logoutSuccessBackdrop">
            <div class="modal-card">
                <h2 class="modal-title">Logged Out</h2>
                <p class="modal-text">You have been logged out successfully.</p>
                <div class="modal-actions">
                    <button class="modal-btn primary" id="logoutSuccessContinue">Continue</button>
                </div>
            </div>
        </div>
    `;

    document.addEventListener('DOMContentLoaded', () => {
        if (initialized) return;

        const logoutLinks = document.querySelectorAll('.logout .nav-item');
        if (!logoutLinks.length) return;

        initialized = true;

        ensureModals();

        const confirmModal = document.getElementById('logoutBackdrop');
        const successModal = document.getElementById('logoutSuccessBackdrop');
        const yesBtn = document.getElementById('logoutConfirmYes');
        const noBtn = document.getElementById('logoutConfirmNo');
        const continueBtn = document.getElementById('logoutSuccessContinue');

        const showConfirm = () => {
            confirmModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        const hideConfirm = () => {
            confirmModal.style.display = 'none';
            document.body.style.overflow = '';
        };

        const showSuccess = () => {
            successModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        const hideSuccess = () => {
            successModal.style.display = 'none';
            document.body.style.overflow = '';
        };

        const clearAuthData = () => {
            const keys = ['user_id', 'user_email', 'reset_email'];
            keys.forEach((key) => {
                try { localStorage.removeItem(key); } catch (_) {}
                try { sessionStorage.removeItem(key); } catch (_) {}
            });
        };

        const goToLogin = () => {
            window.location.href = 'login.html';
        };

        logoutLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                showConfirm();
            });
        });

        yesBtn.addEventListener('click', () => {
            hideConfirm();
            clearAuthData();
            showSuccess();
        });

        noBtn.addEventListener('click', hideConfirm);

        continueBtn.addEventListener('click', () => {
            hideSuccess();
            goToLogin();
        });
    });

    function ensureModals() {
        const confirmExists = document.getElementById('logoutBackdrop');
        const successExists = document.getElementById('logoutSuccessBackdrop');
        if (confirmExists && successExists) return;
        document.body.insertAdjacentHTML('beforeend', TEMPLATE);
    }
})();

