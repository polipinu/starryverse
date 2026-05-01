import { auth, db, DEFAULT_PFP } from './firebase.js';
import { attachUISounds, closeModal } from './ui.js';
import { 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, 
    signOut, updateProfile, GoogleAuthProvider, signInWithPopup, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const ALLOWED_AVATAR_HOSTS = ['i.imgur.com', 'i.ibb.co', 'cdn.discordapp.com', 'media.discordapp.net', 'upload.wikimedia.org', 'api.dicebear.com'];

function isAllowedAvatarUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'https:') return false;
        return ALLOWED_AVATAR_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    } catch { return false; }
}

function isValidUsername(name) { return typeof name === 'string' && name.length >= 1 && name.length <= 12; }

function setLoginCookie() {
    const date = new Date();
    date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `starryverse_session=true; expires=${date.toUTCString()}; path=/; SameSite=Strict; Secure`;
}

function clearLoginCookie() {
    document.cookie = "starryverse_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;";
}

export function setupAccounts() {
    // --- Auth Form UI ---
    let isLoginMode = true;
    const authToggleText = document.getElementById('authToggleText');
    const authModal = document.getElementById('authModal');
    
    authToggleText?.addEventListener('click', e => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const usernameInput = document.getElementById('authUsername');

        if (isLoginMode) {
            title.innerText = "Welcome Back"; submitBtn.innerText = "Sign In";
            authToggleText.innerText = "Need an account? Register";
            usernameInput.style.display = "none"; usernameInput.removeAttribute('required');
        } else {
            title.innerText = "Create Account"; submitBtn.innerText = "Register";
            authToggleText.innerText = "Already have an account? Sign In";
            usernameInput.style.display = "block"; usernameInput.setAttribute('required', 'true');
        }
    });

    // --- Google Auth ---
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    googleAuthBtn?.addEventListener('click', async e => {
        e.preventDefault();
        const originalHTML = googleAuthBtn.innerHTML;
        googleAuthBtn.disabled = true; googleAuthBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        googleAuthBtn.style.opacity = "0.7";
        
        try {
            const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
            const userDocRef = doc(db, "usernames", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                const defaultName = (userCredential.user.displayName || "GoogleUser").slice(0, 12);
                await setDoc(userDocRef, { username: defaultName, username_lower: defaultName.toLowerCase(), gems: 0, avatar: userCredential.user.photoURL || DEFAULT_PFP });
            }
            setLoginCookie(); closeModal(authModal);
        } catch (error) { alert("Google Sign-In Error: " + error.message); } 
        finally { googleAuthBtn.disabled = false; googleAuthBtn.innerHTML = originalHTML; googleAuthBtn.style.opacity = "1"; }
    });

    // --- Email Auth ---
    document.getElementById('authForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = document.getElementById('authSubmitBtn');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true; submitBtn.innerText = "Processing...";
        submitBtn.style.opacity = "0.7";

        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const username = document.getElementById('authUsername')?.value.trim() || "User";

        try {
            if (isLoginMode) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (!userCredential.user.emailVerified) {
                    await signOut(auth); alert("Please verify your email before logging in."); return;
                }
                setLoginCookie(); closeModal(authModal);
            } else {
                const accountCount = parseInt(localStorage.getItem('starryverse_account_count') || '0');
                if (accountCount >= 3) { alert("Registration Failed: Max 3 accounts per device."); return; }
                if (!isValidUsername(username)) { alert("Username must be 1-12 characters."); return; }

                const q = query(collection(db, "usernames"), where("username_lower", "==", username.toLowerCase()));
                if (!(await getDocs(q)).empty) { alert("Username is taken!"); return; }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username, photoURL: DEFAULT_PFP });
                await setDoc(doc(db, "usernames", userCredential.user.uid), { username: username, username_lower: username.toLowerCase(), gems: 0, avatar: DEFAULT_PFP });
                
                await sendEmailVerification(userCredential.user);
                await signOut(auth);
                localStorage.setItem('starryverse_account_count', (accountCount + 1).toString());
                alert("Registration successful! Check your email to verify.");
                closeModal(authModal);
            }
        } catch (error) { 
            const friendlyErrors = {
                'auth/email-already-in-use': 'That email is already registered.',
                'auth/weak-password': 'Password must be at least 6 characters.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/wrong-password': 'Incorrect password.',
                'auth/user-not-found': 'No account found with that email.',
            };
            alert(friendlyErrors[error.code] || "Error: " + error.message); 
        } 
        finally { submitBtn.disabled = false; submitBtn.innerText = originalText; submitBtn.style.opacity = "1"; submitBtn.style.cursor = "pointer"; }
    });

    // --- Logout ---
    document.getElementById('logoutBtn')?.addEventListener('click', async e => {
        e.preventDefault();
        try { await signOut(auth); clearLoginCookie(); document.getElementById('userDropdown')?.classList.remove('show'); document.getElementById('userPill')?.classList.remove('active'); } catch (_) {}
    });

    // --- Avatar URL Workaround ---
    let selectedAvatarUrl = DEFAULT_PFP;
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const customAvatarUrlInput = document.getElementById('customAvatarUrlInput');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const avatarPreview = document.getElementById('avatarPreview');

    avatarOptions.forEach(opt => {
        opt.addEventListener('click', e => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedAvatarUrl = e.target.getAttribute('data-url');
            avatarPreviewContainer.style.display = 'none';
            customAvatarUrlInput.value = '';
        });
    });

    document.getElementById('previewUrlBtn')?.addEventListener('click', e => {
        e.preventDefault();
        const url = customAvatarUrlInput.value.trim();
        if (!isAllowedAvatarUrl(url)) { alert("Please use a valid HTTPS link from an allowed host."); return; }
        avatarOptions.forEach(o => o.classList.remove('selected'));
        selectedAvatarUrl = url; avatarPreview.src = url; avatarPreviewContainer.style.display = 'block';
    });

    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    saveAvatarBtn?.addEventListener('click', async e => {
        e.preventDefault();
        if (!auth.currentUser) return;
        if (!isAllowedAvatarUrl(selectedAvatarUrl) && selectedAvatarUrl !== DEFAULT_PFP) { alert("Invalid avatar URL."); return; }

        saveAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; saveAvatarBtn.disabled = true;
        try {
            await updateProfile(auth.currentUser, { photoURL: selectedAvatarUrl });
            await updateDoc(doc(db, "usernames", auth.currentUser.uid), { avatar: selectedAvatarUrl });
            document.getElementById('userAvatar').src = selectedAvatarUrl;
            closeModal(document.getElementById('avatarModal'));
        } catch (error) { alert("Failed to save: " + error.message); } 
        finally { saveAvatarBtn.innerHTML = 'Save Changes'; saveAvatarBtn.disabled = false; }
    });

    // --- Auth State Observer ---
    onAuthStateChanged(auth, async user => {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');
        const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));

        if (isVerified) {
            document.getElementById('accountNavBtn').style.display = 'none';
            document.getElementById('userPill').style.display = 'flex';
            if (userNameDisplay) userNameDisplay.innerText = user.displayName || "User";
            if (userAvatar) userAvatar.src = user.photoURL || DEFAULT_PFP;

            try {
                const userDoc = await getDoc(doc(db, "usernames", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    document.getElementById('gemCountDisplay').innerText = data.gems ?? 0;
                    document.getElementById('gemsPill').style.display = 'flex';
                    if (data.avatar && userAvatar) userAvatar.src = data.avatar;
                }
            } catch (_) {}
            attachUISounds();
        } else {
            document.getElementById('accountNavBtn').style.display = 'inline-block';
            document.getElementById('userPill').style.display = 'none';
            document.getElementById('gemsPill').style.display = 'none';
        }
    });
}