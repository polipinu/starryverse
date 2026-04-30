import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAw4PQJcwXYx8a3E5xFtqQBx4nacr7ZVGM",
    authDomain: "starryverse-5e574.firebaseapp.com",
    projectId: "starryverse-5e574",
    storageBucket: "starryverse-5e574.firebasestorage.app",
    messagingSenderId: "956879967022",
    appId: "1:956879967022:web:df0534394a4f1b646ce0bf",
    measurementId: "G-EWXBVFJ47Q"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app); // initialise analytics but don't expose the handle
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_PFP = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg';

// ─── Allowed avatar URL hostnames (whitelist) ──────────────────────────────
// SECURITY: only accept images from known safe hosts so users can't point
// avatars at tracking pixels, private-network URLs, etc.
const ALLOWED_AVATAR_HOSTS = [
    'i.imgur.com',
    'i.ibb.co',
    'cdn.discordapp.com',
    'media.discordapp.net',
    'upload.wikimedia.org',
    'api.dicebear.com',
];

function isAllowedAvatarUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'https:') return false;
        return ALLOWED_AVATAR_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    } catch {
        return false;
    }
}

// ─── UI Sounds ─────────────────────────────────────────────────────────────
const sfxHover = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const sfxClick = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
sfxHover.volume = 0.1;
sfxClick.volume = 0.3;

function playHoverSound() { sfxHover.currentTime = 0; sfxHover.play().catch(() => {}); }
function playClickSound() { sfxClick.currentTime = 0; sfxClick.play().catch(() => {}); }

function attachUISounds() {
    document.querySelectorAll('a, button, .user-pill-ui, .avatar-option').forEach(el => {
        el.removeEventListener('mouseenter', playHoverSound);
        el.removeEventListener('click', playClickSound);
        el.addEventListener('mouseenter', playHoverSound);
        el.addEventListener('click', playClickSound);
    });
}

// ─── Username validation (mirrors Firestore rule) ──────────────────────────
function isValidUsername(name) {
    return typeof name === 'string' && name.length >= 1 && name.length <= 12;
}

// ─── Cookie helpers ────────────────────────────────────────────────────────
function setLoginCookie() {
    const date = new Date();
    date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    // SameSite=Strict prevents CSRF; Secure flag ensures HTTPS only
    document.cookie = `starryverse_session=true; expires=${date.toUTCString()}; path=/; SameSite=Strict; Secure`;
}

function clearLoginCookie() {
    document.cookie = "starryverse_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;";
}

// ─── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    attachUISounds();

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // DOM refs
    const accountNavBtn      = document.getElementById('accountNavBtn');
    const authModal          = document.getElementById('authModal');
    const closeModalBtn      = document.getElementById('closeModalBtn');
    const googleAuthBtn      = document.getElementById('googleAuthBtn');
    const authToggleText     = document.getElementById('authToggleText');
    const authForm           = document.getElementById('authForm');
    const userPill           = document.getElementById('userPill');
    const userDropdown       = document.getElementById('userDropdown');
    const logoutBtn          = document.getElementById('logoutBtn');
    const gemsPill           = document.getElementById('gemsPill');
    const gemCountDisplay    = document.getElementById('gemCountDisplay');
    const avatarModal        = document.getElementById('avatarModal');
    const changeAvatarNavBtn = document.getElementById('changeAvatarNavBtn');
    const closeAvatarModalBtn= document.getElementById('closeAvatarModalBtn');
    const avatarOptions      = document.querySelectorAll('.avatar-option');
    const customAvatarUrlInput = document.getElementById('customAvatarUrlInput');
    const previewUrlBtn      = document.getElementById('previewUrlBtn');
    const saveAvatarBtn      = document.getElementById('saveAvatarBtn');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const avatarPreview      = document.getElementById('avatarPreview');

    // ── Modal helpers ──────────────────────────────────────────────────────
    function openModal(modalEl) {
        modalEl.style.display = 'flex';
        setTimeout(() => { modalEl.style.opacity = '1'; modalEl.classList.add('active'); }, 10);
    }
    function closeModal(modalEl) {
        modalEl.style.opacity = '0';
        modalEl.classList.remove('active');
        setTimeout(() => { modalEl.style.display = 'none'; }, 300);
    }

    accountNavBtn?.addEventListener('click',       e => { e.preventDefault(); openModal(authModal); });
    closeModalBtn?.addEventListener('click',       ()  => closeModal(authModal));
    changeAvatarNavBtn?.addEventListener('click',  e => { e.preventDefault(); openModal(avatarModal); });
    closeAvatarModalBtn?.addEventListener('click', ()  => closeModal(avatarModal));

    window.addEventListener('click', event => {
        if (event.target === authModal)   closeModal(authModal);
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

    // ── Avatar system ──────────────────────────────────────────────────────
    let selectedAvatarUrl = DEFAULT_PFP;

    avatarOptions.forEach(opt => {
        opt.addEventListener('click', e => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedAvatarUrl = e.target.getAttribute('data-url');
            avatarPreviewContainer.style.display = 'none';
            customAvatarUrlInput.value = '';
        });
    });

    previewUrlBtn?.addEventListener('click', e => {
        e.preventDefault();
        const url = customAvatarUrlInput.value.trim();

        // SECURITY: validate against allowed-host whitelist
        if (!isAllowedAvatarUrl(url)) {
            alert("Please use a direct HTTPS image link from an allowed host (Imgur, ImgBB, Discord CDN, etc.).");
            return;
        }

        avatarOptions.forEach(o => o.classList.remove('selected'));
        selectedAvatarUrl = url;
        avatarPreview.src = url;
        avatarPreviewContainer.style.display = 'block';
    });

    saveAvatarBtn?.addEventListener('click', async e => {
        e.preventDefault();
        if (!auth.currentUser) return;

        // Re-validate before saving (don't trust the earlier preview check alone)
        if (!isAllowedAvatarUrl(selectedAvatarUrl) && selectedAvatarUrl !== DEFAULT_PFP) {
            alert("Invalid avatar URL.");
            return;
        }

        saveAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        saveAvatarBtn.disabled = true;

        try {
            await updateProfile(auth.currentUser, { photoURL: selectedAvatarUrl });

            // SECURITY: use updateDoc (not setDoc) and only touch the avatar field.
            // The Firestore rule blocks any write that touches `gems`, so this is safe
            // even if someone tries to inject extra fields via the console.
            await updateDoc(doc(db, "usernames", auth.currentUser.uid), {
                avatar: selectedAvatarUrl
            });

            document.getElementById('userAvatar').src = selectedAvatarUrl;
            closeModal(avatarModal);
        } catch (error) {
            alert("Failed to save profile picture: " + error.message);
        } finally {
            saveAvatarBtn.innerHTML = 'Save Changes';
            saveAvatarBtn.disabled = false;
        }
    });

    // ── Auth system ────────────────────────────────────────────────────────
    let isLoginMode = true;

    authToggleText?.addEventListener('click', e => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        const title       = document.getElementById('authTitle');
        const submitBtn   = document.getElementById('authSubmitBtn');
        const usernameInput = document.getElementById('authUsername');

        if (isLoginMode) {
            title.innerText = "Welcome Back";
            submitBtn.innerText = "Sign In";
            authToggleText.innerText = "Need an account? Register";
            usernameInput.style.display = "none";
            usernameInput.removeAttribute('required');
        } else {
            title.innerText = "Create Account";
            submitBtn.innerText = "Register";
            authToggleText.innerText = "Already have an account? Sign In";
            usernameInput.style.display = "block";
            usernameInput.setAttribute('required', 'true');
        }
    });

    googleAuthBtn?.addEventListener('click', async e => {
        e.preventDefault();
        const originalHTML = googleAuthBtn.innerHTML;
        googleAuthBtn.disabled = true;
        googleAuthBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        googleAuthBtn.style.opacity = "0.7";

        try {
            const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
            const userDocRef  = doc(db, "usernames", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                const defaultName   = (userCredential.user.displayName || "GoogleUser").slice(0, 12);
                const finalAvatar   = userCredential.user.photoURL || DEFAULT_PFP;
                // SECURITY: gems is set to 0 here — Firestore rule enforces this on create
                await setDoc(userDocRef, {
                    username:       defaultName,
                    username_lower: defaultName.toLowerCase(),
                    gems:           0,
                    avatar:         finalAvatar
                });
            }

            setLoginCookie();
            closeModal(authModal);
        } catch (error) {
            alert("Google Sign-In Error: " + error.message);
        } finally {
            googleAuthBtn.disabled = false;
            googleAuthBtn.innerHTML = originalHTML;
            googleAuthBtn.style.opacity = "1";
        }
    });

    authForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn   = document.getElementById('authSubmitBtn');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";
        submitBtn.style.opacity = "0.7";

        const email    = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const usernameInput = document.getElementById('authUsername');
        const username = usernameInput ? usernameInput.value.trim() : "User";

        try {
            if (isLoginMode) {
                // ── Login ──────────────────────────────────────────────────
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    alert("Please verify your email before logging in.");
                    return;
                }
                setLoginCookie();
                closeModal(authModal);

            } else {
                // ── Register ───────────────────────────────────────────────
                // NOTE: localStorage limit is a soft UX nudge only.
                // Real per-device limiting requires a Cloud Function + fingerprinting.
                const accountCount = parseInt(localStorage.getItem('starryverse_account_count') || '0');
                if (accountCount >= 3) {
                    alert("Registration Failed: A maximum of 3 accounts is allowed per device.");
                    return;
                }

                // Client-side username validation (mirrors Firestore rule)
                if (!isValidUsername(username)) {
                    alert("Username must be between 1 and 12 characters.");
                    return;
                }

                // Check username uniqueness
                const q = query(
                    collection(db, "usernames"),
                    where("username_lower", "==", username.toLowerCase())
                );
                if (!(await getDocs(q)).empty) {
                    alert("Username is already taken! Please choose another.");
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username, photoURL: DEFAULT_PFP });

                // SECURITY: gems locked to 0 on create — Firestore rule enforces this
                await setDoc(doc(db, "usernames", userCredential.user.uid), {
                    username:       username,
                    username_lower: username.toLowerCase(),
                    gems:           0,
                    avatar:         DEFAULT_PFP
                });

                await sendEmailVerification(userCredential.user);
                await signOut(auth);

                localStorage.setItem('starryverse_account_count', (accountCount + 1).toString());
                alert("Registration successful! Check your email for the verification link.");
                closeModal(authModal);
            }
        } catch (error) {
            // Surface friendly messages; avoid leaking raw Firebase error internals
            const friendlyErrors = {
                'auth/email-already-in-use':   'That email is already registered.',
                'auth/weak-password':           'Password must be at least 6 characters.',
                'auth/invalid-email':           'Please enter a valid email address.',
                'auth/wrong-password':          'Incorrect password.',
                'auth/user-not-found':          'No account found with that email.',
                'auth/too-many-requests':       'Too many attempts. Please try again later.',
            };
            alert(friendlyErrors[error.code] || "An error occurred. Please try again.");
        } finally {
            submitBtn.disabled   = false;
            submitBtn.innerText  = originalText;
            submitBtn.style.opacity = "1";
            submitBtn.style.cursor  = "pointer";
        }
    });

    logoutBtn?.addEventListener('click', async e => {
        e.preventDefault();
        try {
            await signOut(auth);
            clearLoginCookie();
            userDropdown?.classList.remove('show');
            userPill?.classList.remove('active');
        } catch (_) {}
    });

    // ── Auth state observer ────────────────────────────────────────────────
    onAuthStateChanged(auth, async user => {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar      = document.getElementById('userAvatar');

        const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));

        if (isVerified) {
            accountNavBtn && (accountNavBtn.style.display = 'none');
            userPill      && (userPill.style.display      = 'flex');

            if (userNameDisplay) userNameDisplay.innerText = user.displayName || "User";
            if (userAvatar)      userAvatar.src            = user.photoURL    || DEFAULT_PFP;

            try {
                const userDoc = await getDoc(doc(db, "usernames", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    // Read gems from Firestore (read-only from client perspective)
                    if (gemCountDisplay) gemCountDisplay.innerText = data.gems ?? 0;
                    if (gemsPill)        gemsPill.style.display    = 'flex';
                    if (data.avatar && userAvatar) userAvatar.src  = data.avatar;
                }
            } catch (_) {}

            attachUISounds();
        } else {
            accountNavBtn && (accountNavBtn.style.display = 'inline-block');
            userPill      && (userPill.style.display      = 'none');
            gemsPill      && (gemsPill.style.display      = 'none');
        }
    });
});