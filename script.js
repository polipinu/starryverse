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

// Scroll Animations
document.addEventListener('DOMContentLoaded', () => {
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
});

// We must attach functions to the window object so inline HTML onclicks can find them in module scripts
window.openModal = function() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.classList.add('active');
    }, 10);
};

window.closeModal = function() {
    const modal = document.getElementById('authModal');
    modal.style.opacity = '0';
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
};

window.showWipAlert = function() {
    alert("Starryverse social logins are currently a work in progress!");
};

// Close on background click
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    const dropdown = document.getElementById('userDropdown');
    const userPill = document.getElementById('userPill');

    // Close Auth modal if clicking outside
    if (event.target === modal) {
        window.closeModal();
    }

    // Close Dropdown if clicking outside
    if (dropdown && dropdown.classList.contains('show') && userPill && !userPill.contains(event.target)) {
        dropdown.classList.remove('show');
        userPill.classList.remove('active');
    }
};

// --- Auth System Logic ---
let isLoginMode = true;

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const usernameInput = document.getElementById('authUsername');

    if (isLoginMode) {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        toggleText.innerText = "Need an account? Register";
        usernameInput.style.display = "none";
        usernameInput.removeAttribute('required');
    } else {
        title.innerText = "Create Account";
        submitBtn.innerText = "Register";
        toggleText.innerText = "Already have an account? Sign In";
        usernameInput.style.display = "block";
        usernameInput.setAttribute('required', 'true');
    }
};

// Cookie Helpers
function setLoginCookie() {
    let date = new Date();
    date.setTime(date.getTime() + (7*24*60*60*1000)); // 7 days expiration
    document.cookie = "starryverse_session=true; expires=" + date.toUTCString() + "; path=/";
}

function clearLoginCookie() {
    document.cookie = "starryverse_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Handle Form Submission
document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const usernameInput = document.getElementById('authUsername');
    const username = usernameInput ? usernameInput.value : "User";

    try {
        if (isLoginMode) {
            // Login
            await signInWithEmailAndPassword(auth, email, password);
            setLoginCookie();
            window.closeModal();
        } else {
            // Register & check device limits
            if (localStorage.getItem('starryverse_device_registered')) {
                alert("Registration Failed: Only 1 account is allowed per device.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
            
            localStorage.setItem('starryverse_device_registered', 'true');
            setLoginCookie();
            window.closeModal();
        }
    } catch (error) {
        alert(error.message);
    }
});

// Dropdown UI Interaction
window.toggleDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    const pill = document.getElementById('userPill');
    if(dropdown) dropdown.classList.toggle('show');
    if(pill) pill.classList.toggle('active');
};

window.logoutUser = async function(event) {
    event.preventDefault();
    try {
        await signOut(auth);
        clearLoginCookie();
        // Fallback reload if UI doesn't update immediately
        window.location.reload(); 
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// Listen for Auth State Changes
onAuthStateChanged(auth, (user) => {
    // If you are using the original HTML, it might not have 'accountNav', so we use querySelector as fallback
    const accountNav = document.getElementById('accountNav') || document.querySelector('a[onclick="openModal()"]');
    const userPill = document.getElementById('userPill');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');

    if (user) {
        // Logged In
        if (accountNav) accountNav.style.display = 'none';
        if (userPill) userPill.style.display = 'flex';
        
        const displayName = user.displayName || "User";
        if (userNameDisplay) userNameDisplay.innerText = displayName;
        
        if (userAvatar) {
            userAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=3b82f6&color=fff&rounded=true&bold=true`;
        }
    } else {
        // Logged Out
        if (accountNav) accountNav.style.display = 'inline-block';
        if (userPill) userPill.style.display = 'none';
    }
});