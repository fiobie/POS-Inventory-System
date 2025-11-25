// Shared user profile helper
(function () {
    const STORAGE_KEY = 'bonbonUserProfile';
    const DEFAULT_AVATAR = 'Bonbon Pics/Logo.png';

    function loadProfile() {
        const defaults = {
            firstName: 'Bonbon',
            lastName: 'User',
            email: 'user@example.com',
            photo: ''
        };

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...defaults, ...JSON.parse(stored) };
            }
        } catch (err) {
            console.warn('Unable to load profile data', err);
        }

        return defaults;
    }

    function buildDisplayName(profile) {
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        return fullName || 'User Name';
    }

    function applyProfile(profile) {
        const displayName = buildDisplayName(profile);
        document.querySelectorAll('.user-name, [data-user-name]').forEach(el => {
            el.textContent = displayName;
        });

        document.querySelectorAll('[data-user-email]').forEach(el => {
            el.textContent = profile.email || 'user@example.com';
        });

        document.querySelectorAll('[data-user-avatar]').forEach(img => {
            const fallback = img.dataset.defaultAvatar || DEFAULT_AVATAR;
            img.src = profile.photo || fallback;
            img.alt = `${displayName} avatar`;
        });
    }

    function init() {
        applyProfile(loadProfile());

        // Listen for profile updates within the same page (settings)
        document.addEventListener('profileUpdated', event => {
            const profile = event.detail || loadProfile();
            applyProfile(profile);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();

