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
    getDoc,
    updateDoc,
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global Constants
const DEFAULT_PFP = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg';

// --- UI Sounds Setup ---
// Using reliable mixkit UI audio URLs
const sfxHover = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const sfxClick = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
sfxHover.volume = 0.1;
sfxClick.volume = 0.3;

function playHoverSound() {
    sfxHover.currentTime = 0;
    sfxHover.play().catch(() => {}); // Catch prevents errors if user hasn't interacted with document yet
}

function playClickSound() {
    sfxClick.currentTime = 0;
    sfxClick.play().catch(() => {});
}

// Function to attach sounds to all interactive elements
function attachUISounds() {
    const interactables = document.querySelectorAll('a, button, .user-pill-ui, .avatar-option');
    interactables.forEach(el => {
        // Prevent adding multiple listeners
        el.removeEventListener('mouseenter', playHoverSound);
        el.removeEventListener('click', playClickSound);
        
        el.addEventListener('mouseenter', playHoverSound);
        el.addEventListener('click', playClickSound);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    
    // Attach initial sounds
    attachUISounds();

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
    const authForm = document.getElementById('authForm');
    
    const userPill = document.getElementById('userPill');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const gemsPill = document.getElementById('gemsPill');
    const gemCountDisplay = document.getElementById('gemCountDisplay');
    
    const avatarModal = document.getElementById('avatarModal');
    const changeAvatarNavBtn = document.getElementById('changeAvatarNavBtn');
    const closeAvatarModalBtn = document.getElementById('closeAvatarModalBtn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const customAvatarInput = document.getElementById('customAvatarInput');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const avatarPreview = document.getElementById('avatarPreview');

    // --- Core Modal Logic ---
    function openModal(modalEl) {
        modalEl.style.display = 'flex';
        setTimeout(() => {
            modalEl.style.opacity = '1';
            modalEl.classList.add('active');
        }, 10);
    }

    function closeModal(modalEl) {
        modalEl.style.opacity = '0';
        modalEl.classList.remove('active');
        setTimeout(() => {
            modalEl.style.display = 'none';
        }, 300);
    }

    if(accountNavBtn) accountNavBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(authModal); });
    if(closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(authModal));
    if(changeAvatarNavBtn) changeAvatarNavBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(avatarModal); });
    if(closeAvatarModalBtn) closeAvatarModalBtn.addEventListener('click', () => closeModal(avatarModal));

    // Global Click Listener (Close modals/dropdowns on outside click)
    window.addEventListener('click', (event) => {
        if (event.target === authModal) closeModal(authModal);
        if (event.target === avatarModal) closeModal(avatarModal);
        
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

    // --- Avatar Changing System ---
    let selectedAvatarUrl = DEFAULT_PFP;

    // Handle clicking a default avatar
    avatarOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            // Remove selection from all, add to clicked
            avatarOptions.forEach(o => o.classList.remove('selected'));
            e.target.classList.add('selected');
            
            selectedAvatarUrl = e.target.getAttribute('data-url');
            
            // Hide custom preview since they clicked a default
            avatarPreviewContainer.style.display = 'none';
        });
    });

    // Trigger hidden file input
    uploadAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        customAvatarInput.click();
    });

    // Handle Custom File Upload
    customAvatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Security check limit (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("Image is too large. Maximum size is 2MB.");
            return;
        }

        const originalText = uploadAvatarBtn.innerHTML;
        uploadAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        uploadAvatarBtn.disabled = true;

        try {
            // Upload to Firebase Storage under a unique name for this user
            const storageRef = ref(storage, `avatars/${auth.currentUser.uid}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update variables
            selectedAvatarUrl = downloadUrl;
            
            // Deselect default options visually
            avatarOptions.forEach(o => o.classList.remove('selected'));

            // Show custom preview
            avatarPreview.src = downloadUrl;
            avatarPreviewContainer.style.display = 'block';

        } catch (error) {
            alert("Upload failed. Make sure Firebase Storage rules allow writes. Error: " + error.message);
        } finally {
            uploadAvatarBtn.innerHTML = originalText;
            uploadAvatarBtn.disabled = false;
        }
    });

    // Save final avatar choice
    saveAvatarBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return;

        saveAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        saveAvatarBtn.disabled = true;

        try {
            // 1. Update Auth Profile
            await updateProfile(auth.currentUser, { photoURL: selectedAvatarUrl });
            
            // 2. Update Firestore Document
            await updateDoc(doc(db, "usernames", auth.currentUser.uid), {
                avatar: selectedAvatarUrl
            });

            // 3. Update active UI immediately
            document.getElementById('userAvatar').src = selectedAvatarUrl;
            closeModal(avatarModal);
            
        } catch(error) {
            alert("Failed to save profile picture: " + error.message);
        } finally {
            saveAvatarBtn.innerHTML = 'Save Changes';
            saveAvatarBtn.disabled = false;
        }
    });


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
            
            const originalHTML = googleAuthBtn.innerHTML;
            googleAuthBtn.disabled = true;
            googleAuthBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            googleAuthBtn.style.opacity = "0.7";
            googleAuthBtn.style.cursor = "not-allowed";

            const provider = new GoogleAuthProvider();
            try {
                const userCredential = await signInWithPopup(auth, provider);
                
                // --- GOOGLE FIX: Check if they exist in Firestore database. If not, generate their profile and gems ---
                const userDocRef = doc(db, "usernames", userCredential.user.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (!userDocSnap.exists()) {
                    let defaultName = userCredential.user.displayName || "GoogleUser";
                    let finalAvatar = userCredential.user.photoURL || DEFAULT_PFP;
                    
                    await setDoc(userDocRef, {
                        username: defaultName,
                        username_lower: defaultName.toLowerCase(),
                        gems: 0,
                        avatar: finalAvatar
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
                googleAuthBtn.style.cursor = "pointer";
            }
        });
    }

    // Form Submission (Email/Password)
    if(authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('authSubmitBtn');
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
                    
                    if (!userCredential.user.emailVerified) {
                        await signOut(auth);
                        alert("Please check your email and verify your account before logging in. (Be sure to check your spam or junk folder if you can't find it!)");
                        return;
                    }

                    setLoginCookie();
                    closeModal(authModal);
                } else {
                    // --- REGISTER LOGIC ---
                    
                    // Device Limit Check
                    let accountCount = parseInt(localStorage.getItem('starryverse_account_count') || '0');
                    if (localStorage.getItem('starryverse_device_registered') === 'true') {
                        accountCount = Math.max(1, accountCount);
                        localStorage.removeItem('starryverse_device_registered');
                    }

                    if (accountCount >= 3) {
                        alert("Registration Failed: A maximum of 3 accounts is allowed per device.");
                        return;
                    }

                    // Security Checks
                    if (username.length > 12) {
                        alert("Username cannot be longer than 12 characters.");
                        return;
                    }

                    if (username.length === 0) {
                        alert("Username cannot be empty.");
                        return;
                    }

                    // 1. Database Check
                    const usernamesRef = collection(db, "usernames");
                    const q = query(usernamesRef, where("username_lower", "==", username.toLowerCase()));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        alert("Username is already taken! Please choose another one.");
                        return; 
                    }

                    // 2. Create Auth Account & Apply Default Avatar directly
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { 
                        displayName: username,
                        photoURL: DEFAULT_PFP // Apply new Default standard
                    });
                    
                    // 3. Save to Firestore WITH Gems and Avatar applied
                    await setDoc(doc(db, "usernames", userCredential.user.uid), {
                        username: username,
                        username_lower: username.toLowerCase(),
                        gems: 0, // NEW GEMS SYSTEM
                        avatar: DEFAULT_PFP
                    });
                    
                    // 4. Verification
                    await sendEmailVerification(userCredential.user);
                    await signOut(auth);
                    
                    localStorage.setItem('starryverse_account_count', (accountCount + 1).toString());
                    alert("Registration successful! We have sent a verification link to your email. Please verify before logging in. (Be sure to check your spam or junk folder if you can't find it!)");
                    closeModal(authModal);
                }
            } catch (error) {
                alert(error.message);
            } finally {
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
    onAuthStateChanged(auth, async (user) => {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');

        if (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'))) {
            // Logged In & Verified (or Google user)
            if (accountNavBtn) accountNavBtn.style.display = 'none';
            if (userPill) userPill.style.display = 'flex';
            
            const displayName = user.displayName || "User";
            if (userNameDisplay) userNameDisplay.innerText = displayName;
            
            // Set Avatar (Fallback to the new requested default if none exists)
            if (userAvatar) {
                userAvatar.src = user.photoURL || DEFAULT_PFP;
            }

            // --- FETCH GEMS FROM FIRESTORE ---
            try {
                const userDoc = await getDoc(doc(db, "usernames", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    gemCountDisplay.innerText = data.gems !== undefined ? data.gems : 0;
                    gemsPill.style.display = 'flex'; // Show gems UI
                }
            } catch (error) {
                console.error("Error fetching gems:", error);
            }

            // Make sure new dynamic UI elements get sounds attached
            attachUISounds();

        } else {
            // Logged Out
            if (accountNavBtn) accountNavBtn.style.display = 'inline-block';
            if (userPill) userPill.style.display = 'none';
            if (gemsPill) gemsPill.style.display = 'none'; // Hide gems
        }
    });
});