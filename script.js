// Import the functions you need from the SDKs
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
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAw4PQJcwXYx8a3E5xFtqQBx4nacr7ZVGM",
    authDomain: "starryverse-5e574.firebaseapp.com",
    projectId: "starryverse-5e574",
    storageBucket: "starryverse-5e574.firebasestorage.app",
    messagingSenderId: "956879967022",
    appId: "1:956879967022:web:df0534394a4f1b646ce0bf",
    measurementId: "G-EWXBVFJ47Q"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM to load before attaching events
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Scroll Animations ---
    const observerOptions = {
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // --- DOM Elements ---
    const accountNavBtn = document.getElementById('accountNavBtn');
    const authModal = document.getElementById('authModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authToggleText = document.getElementById('authToggleText');
    const userPill = document.getElementById('userPill');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const authForm = document.getElementById('authForm');
    
    // --- Modal Logic ---
    function openModal() {
        authModal.style.display = 'flex';
        setTimeout(() => {
            authModal.style.opacity = '1';
            authModal.classList.add('active');
        }, 10);
    }

    function closeModal() {
        authModal.style.opacity = '0';
        authModal.classList.remove('active');
        setTimeout(() => {
            authModal.style.display = 'none';
        }, 300);
    }

    if(accountNavBtn) accountNavBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    // Global Click Listener (Close modal/dropdown on outside click)
    window.addEventListener('click', (event) => {
        if (event.target === authModal) closeModal();
        if (userDropdown && userDropdown.classList.contains('show') && userPill && !userPill.contains(event.target)) {
            userDropdown.classList.remove('show');
            userPill.classList.remove('active');
        }
    });

    // --- User Pill Dropdown ---
    if(userPill) {
        userPill.addEventListener('click', (e) => {
            e.stopPropagation();
            if(userDropdown) userDropdown.classList.toggle('show');
            userPill.classList.toggle('active');
        });
    }

    // --- Auth System Logic ---
    let isLoginMode = true;

    if(authToggleText) {
        authToggleText.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            const title = document.getElementById('authTitle');
            const submitBtn = document.getElementById('authSubmitBtn');
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
    }

    // Cookie Helpers
    function setLoginCookie() {
        let date = new Date();
        date.setTime(date.getTime() + (7*24*60*60*1000));
        document.cookie = "starryverse_session=true; expires=" + date.toUTCString() + "; path=/";
    }

    function clearLoginCookie() {
        document.cookie = "starryverse_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // Google Sign In
    if(googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Disable button to prevent spamming
            const originalHTML = googleAuthBtn.innerHTML;
            googleAuthBtn.disabled = true;
            googleAuthBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            googleAuthBtn.style.opacity = "0.7";
            googleAuthBtn.style.cursor = "not-allowed";

            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                setLoginCookie();
                closeModal();
            } catch (error) {
                alert("Google Sign-In Error: " + error.message);
            } finally {
                // Re-enable button
                googleAuthBtn.disabled = false;
                googleAuthBtn.innerHTML = originalHTML;
                googleAuthBtn.style.opacity = "1";
                googleAuthBtn.style.cursor = "pointer";
            }
        });
    }

    // Form Submission (Email/Password)
    if(authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('authSubmitBtn');
            
            // Disable button to prevent spamming multiple accounts
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            submitBtn.style.opacity = "0.7";
            submitBtn.style.cursor = "not-allowed";

            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const usernameInput = document.getElementById('authUsername');
            const username = usernameInput ? usernameInput.value.trim() : "User";

            try {
                if (isLoginMode) {
                    // --- LOGIN LOGIC ---
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    
                    // Check if the email is verified
                    if (!userCredential.user.emailVerified) {
                        await signOut(auth); // Log them back out immediately
                        alert("Please check your email and verify your account before logging in.");
                        return;
                    }

                    setLoginCookie();
                    closeModal();
                } else {
                    // --- REGISTER LOGIC ---
                    if (localStorage.getItem('starryverse_device_registered')) {
                        alert("Registration Failed: Only 1 account is allowed per device.");
                        return;
                    }

                    // 1. Check if Username Exists in Firestore
                    const usernamesRef = collection(db, "usernames");
                    const q = query(usernamesRef, where("username_lower", "==", username.toLowerCase()));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        alert("Username is already taken! Please choose another one.");
                        return; // Stop registration
                    }

                    // 2. Create Account
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { displayName: username });
                    
                    // 3. Save new Username to Firestore
                    await setDoc(doc(db, "usernames", userCredential.user.uid), {
                        username: username,
                        username_lower: username.toLowerCase()
                    });
                    
                    // 4. Send the verification email
                    await sendEmailVerification(userCredential.user);
                    
                    // 5. Sign them out immediately so they are forced to verify
                    await signOut(auth);
                    
                    localStorage.setItem('starryverse_device_registered', 'true');
                    alert("Registration successful! We have sent a verification link to your email. Please verify before logging in.");
                    closeModal();
                }
            } catch (error) {
                alert(error.message);
            } finally {
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
        });
    }

    // Logout
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                clearLoginCookie();
                if(userDropdown) userDropdown.classList.remove('show');
                if(userPill) userPill.classList.remove('active');
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }

    // Auth State Observer
    onAuthStateChanged(auth, (user) => {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');

        if (user && user.emailVerified) {
            // Logged In & Verified
            if (accountNavBtn) accountNavBtn.style.display = 'none';
            if (userPill) userPill.style.display = 'flex';
            
            const displayName = user.displayName || "User";
            if (userNameDisplay) userNameDisplay.innerText = displayName;
            
            if (userAvatar) {
                userAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=3b82f6&color=fff&rounded=true&bold=true`;
            }
        } else {
            // Logged Out (or logged in but unverified)
            if (accountNavBtn) accountNavBtn.style.display = 'inline-block';
            if (userPill) userPill.style.display = 'none';
        }
    });
});