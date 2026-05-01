// --- UI Sounds ---
const sfxHover = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const sfxClick = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
sfxHover.volume = 0.1;
sfxClick.volume = 0.3;

export function playHoverSound() { sfxHover.currentTime = 0; sfxHover.play().catch(() => {}); }
export function playClickSound() { sfxClick.currentTime = 0; sfxClick.play().catch(() => {}); }

export function attachUISounds() {
    document.querySelectorAll('a, button, .user-pill-ui, .avatar-option').forEach(el => {
        el.removeEventListener('mouseenter', playHoverSound);
        el.removeEventListener('click', playClickSound);
        el.addEventListener('mouseenter', playHoverSound);
        el.addEventListener('click', playClickSound);
    });
}

// --- Modal Logic ---
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

// --- General UI Setup ---
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

    // Nav Listeners
    const accountNavBtn = document.getElementById('accountNavBtn');
    const authModal = document.getElementById('authModal');
    const changeAvatarNavBtn = document.getElementById('changeAvatarNavBtn');
    const avatarModal = document.getElementById('avatarModal');
    const userPill = document.getElementById('userPill');
    const userDropdown = document.getElementById('userDropdown');

    accountNavBtn?.addEventListener('click', e => { e.preventDefault(); openModal(authModal); });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => closeModal(authModal));
    changeAvatarNavBtn?.addEventListener('click', e => { e.preventDefault(); openModal(avatarModal); });
    document.getElementById('closeAvatarModalBtn')?.addEventListener('click', () => closeModal(avatarModal));

    window.addEventListener('click', event => {
        if (event.target === authModal) closeModal(authModal);
        if (event.target === avatarModal) closeModal(avatarModal);
        if (userDropdown?.classList.contains('show') && !userPill?.contains(event.target)) {
            userDropdown.classList.remove('show');
            userPill?.classList.remove('active');
        }
    });

    userPill?.addEventListener('click', e => {
        e.stopPropagation();
        userDropdown?.classList.toggle('show');
        userPill.classList.toggle('active');
    });
}