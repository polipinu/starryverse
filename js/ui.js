// =========================================
// PREFERENCES SYSTEM (Runs immediately)
// =========================================
export function applyPreferences() {
    const theme = localStorage.getItem('sv_theme') || 'dynamic';
    const font = localStorage.getItem('sv_font') || 'lato';
    const anim = localStorage.getItem('sv_anim') || 'on';

    document.documentElement.className = ''; 
    
    if (theme !== 'dynamic') document.documentElement.classList.add(`theme-${theme}`);
    if (font !== 'lato') document.documentElement.classList.add(`font-${font}`);
    if (anim === 'off') document.documentElement.classList.add('anim-off');

    const themeSelect = document.getElementById('themeSelect');
    const fontSelect = document.getElementById('fontSelect');
    const animSelect = document.getElementById('animSelect');
    
    if (themeSelect) themeSelect.value = theme;
    if (fontSelect) fontSelect.value = font;
    if (animSelect) animSelect.value = anim;
}

applyPreferences();

// =========================================
// UI SOUNDS & MODALS
// =========================================
const sfxHover = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const sfxClick = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
sfxHover.volume = 0.1;
sfxClick.volume = 0.3;

export function playHoverSound() { sfxHover.currentTime = 0; sfxHover.play().catch(() => {}); }
export function playClickSound() { sfxClick.currentTime = 0; sfxClick.play().catch(() => {}); }

export function attachUISounds() {
    document.querySelectorAll('a, button, .user-pill-ui, .avatar-option, .settings-select').forEach(el => {
        el.removeEventListener('mouseenter', playHoverSound);
        el.removeEventListener('click', playClickSound);
        el.addEventListener('mouseenter', playHoverSound);
        el.addEventListener('click', playClickSound);
    });
}

export function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'flex';
    setTimeout(() => { modalEl.style.opacity = '1'; modalEl.classList.add('active'); }, 10);
}

export function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.opacity = '0';
    modalEl.classList.remove('active');
    setTimeout(() => { modalEl.style.display = 'none'; }, 300);
}

// =========================================
// MAIN UI SETUP BINDINGS
// =========================================
export function setupUI() {
    attachUISounds();

    // Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // Nav & Footer Listeners
    const accountNavBtn = document.getElementById('accountNavBtn');
    const authModal = document.getElementById('authModal');
    
    const changeAvatarNavBtn = document.getElementById('changeAvatarNavBtn');
    const avatarModal = document.getElementById('avatarModal');
    
    const settingsNavBtn = document.getElementById('settingsNavBtn');
    const settingsModal = document.getElementById('settingsModal');
    
    const supportBtn = document.getElementById('openSupportBtn');
    const supportModal = document.getElementById('supportModal');
    
    const userPill = document.getElementById('userPill');
    const userDropdown = document.getElementById('userDropdown');

    // Modals Click Handlers
    accountNavBtn?.addEventListener('click', e => { e.preventDefault(); openModal(authModal); });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => closeModal(authModal));
    
    changeAvatarNavBtn?.addEventListener('click', e => { e.preventDefault(); openModal(avatarModal); });
    document.getElementById('closeAvatarModalBtn')?.addEventListener('click', () => closeModal(avatarModal));
    
    settingsNavBtn?.addEventListener('click', e => { e.preventDefault(); openModal(settingsModal); });
    document.getElementById('closeSettingsModalBtn')?.addEventListener('click', () => closeModal(settingsModal));

    supportBtn?.addEventListener('click', e => { e.preventDefault(); openModal(supportModal); });
    document.getElementById('closeSupportModalBtn')?.addEventListener('click', () => closeModal(supportModal));

    // Outside Click closer
    window.addEventListener('click', event => {
        if (event.target === authModal) closeModal(authModal);
        if (event.target === avatarModal) closeModal(avatarModal);
        if (event.target === settingsModal) closeModal(settingsModal);
        if (event.target === supportModal) closeModal(supportModal);
        
        if (userDropdown?.classList.contains('show') && !userPill?.contains(event.target)) {
            userDropdown.classList.remove('show');
            userPill?.classList.remove('active');
        }
    });

    // Dropdown Toggler
    userPill?.addEventListener('click', e => {
        e.stopPropagation();
        userDropdown?.classList.toggle('show');
        userPill.classList.toggle('active');
    });

    // Save Settings Event
    document.getElementById('settingsForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveSettingsBtn');
        saveBtn.innerText = "Saved!";
        
        localStorage.setItem('sv_theme', document.getElementById('themeSelect').value);
        localStorage.setItem('sv_font', document.getElementById('fontSelect').value);
        localStorage.setItem('sv_anim', document.getElementById('animSelect').value);
        
        applyPreferences();
        
        setTimeout(() => {
            saveBtn.innerText = "Save Preferences";
            closeModal(settingsModal);
        }, 800); 
    });

    // Copy Discord Username Event
    const copyDiscordBtn = document.getElementById('copyDiscordBtn');
    copyDiscordBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const copyText = document.getElementById('discordUserCopy');
        
        // Use browser clipboard API to copy the text
        navigator.clipboard.writeText(copyText.value).then(() => {
            copyDiscordBtn.innerText = "Copied!";
            copyDiscordBtn.classList.add('btn-primary');
            copyDiscordBtn.classList.remove('btn-secondary');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                copyDiscordBtn.innerText = "Copy";
                copyDiscordBtn.classList.remove('btn-primary');
                copyDiscordBtn.classList.add('btn-secondary');
            }, 2000);
        });
    });
}