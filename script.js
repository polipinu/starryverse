// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

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
    const googleWipBtn = document.getElementById('googleWipBtn');
    const discordWipBtn = document.getElementById('discordWipBtn');
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

    if(accountNavBtn) {
        accountNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Work in Progress Alerts
    const showWipAlert = () => alert("Starryverse social logins are currently a work in progress!");
    if(googleWipBtn) googleWipBtn.addEventListener('click', showWipAlert);
    if(discordWipBtn) discordWipBtn.addEventListener('click', showWipAlert);

    // Global Click Listener (Close modal/dropdown on outside click)
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            closeModal();
        }
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
        date.setTime(date.getTime() + (7*24*60*60*1000)); // 7 days expiration
        document.cookie = "starryverse_session=true; expires=" + date.toUTCString() + "; path=/";
    }

    function clearLoginCookie() {
        document.cookie = "starryverse_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // Form Submission
    if(authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const usernameInput = document.getElementById('authUsername');
            const username = usernameInput ? usernameInput.value : "User";

            try {
                if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, email, password);
                    setLoginCookie();
                    closeModal();
                } else {
                    if (localStorage.getItem('starryverse_device_registered')) {
                        alert("Registration Failed: Only 1 account is allowed per device.");
                        return;
                    }

                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { displayName: username });
                    
                    localStorage.setItem('starryverse_device_registered', 'true');
                    setLoginCookie();
                    closeModal();
                }
            } catch (error) {
                alert(error.message);
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

        if (user) {
            // Logged In
            if (accountNavBtn) accountNavBtn.style.display = 'none';
            if (userPill) userPill.style.display = 'flex';
            
            const displayName = user.displayName || "User";
            if (userNameDisplay) userNameDisplay.innerText = displayName;
            
            if (userAvatar) {
                userAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=3b82f6&color=fff&rounded=true&bold=true`;
            }
        } else {
            // Logged Out
            if (accountNavBtn) accountNavBtn.style.display = 'inline-block';
            if (userPill) userPill.style.display = 'none';
        }
    });
});