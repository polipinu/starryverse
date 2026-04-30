document.addEventListener('DOMContentLoaded', () => {
    // Scroll Animations
    const observerOptions = {
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once visible so it doesn't re-animate
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
});

// Modal Logic Fixes
function openModal() {
    const modal = document.getElementById('authModal');
    // Set display first so the transition can happen
    modal.style.display = 'flex';
    // Small timeout ensures CSS transitions catch the display change
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.classList.add('active');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('authModal');
    modal.style.opacity = '0';
    modal.classList.remove('active');
    // Wait for opacity transition before hiding
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function showWipAlert() {
    alert("Starryverse accounts are currently a work in progress!");
}

// Close on background click
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    // Ensure we are strictly clicking the dark background overlay, not the content box
    if (event.target === modal) {
        closeModal();
    }
}