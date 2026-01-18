/**
 * Partículas elementales - Authentication Module
 * Handles Supabase authentication with Google Sign-In
 */

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = 'https://ckgzzkrxbyjgiqekhcfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3p6a3J4YnlqZ2lxZWtoY2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTI4MDAsImV4cCI6MjA4MzUyODgwMH0.y_rGrQ_s2hO5Wp91PZ_wCnnEEZz4aoobKQbuxAuNLFI';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Current user state
let currentUser = null;

// ============================================================
// AUTH INITIALIZATION
// ============================================================

async function initAuth() {
    try {
        // Check if we have OAuth tokens in the URL hash (mobile redirect fix)
        if (window.location.hash && window.location.hash.includes('access_token')) {
            // Give Supabase a moment to process the tokens
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Check for existing session
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
        }

        if (session) {
            currentUser = session.user;
            // Clean up URL hash after successful auth
            if (window.location.hash && window.location.hash.includes('access_token')) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }

        // Always update UI (whether signed in or not)
        updateAuthUI();

        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            updateAuthUI();

            if (event === 'SIGNED_IN') {
                onSignIn();
            } else if (event === 'SIGNED_OUT') {
                onSignOut();
            }
        });
    } catch (error) {
        console.error('Auth initialization error:', error);
        // Still try to update UI even on error
        updateAuthUI();
    }
}

// ============================================================
// SIGN IN / SIGN OUT
// ============================================================

async function signInWithGoogle() {
    // Ensure supabase client is ready (fixes mobile timing issues)
    if (!supabaseClient || !supabaseClient.auth) {
        alert('Authentication not ready. Please try again.');
        return;
    }

    // Small delay to ensure mobile browsers process the user gesture
    await new Promise(resolve => setTimeout(resolve, 100));

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        console.error('Sign in error:', error);
        alert('Sign in failed: ' + error.message);
    }
}

async function signOut() {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
    }

    // Always clear local state and reload, regardless of errors
    currentUser = null;

    // Clear any Supabase auth data from storage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
        }
    });
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) {
            sessionStorage.removeItem(key);
        }
    });

    updateAuthUI();
    location.reload();
}

// ============================================================
// UI UPDATES
// ============================================================

function updateAuthUI() {
    const menuBtn = document.getElementById('user-menu-btn');
    const profileSection = document.getElementById('user-menu-profile');

    if (!menuBtn) {
        console.warn('Auth UI elements not found');
        return;
    }

    if (currentUser) {
        // User is signed in - show avatar in header button
        const avatarUrl = currentUser.user_metadata?.avatar_url || '';
        const userName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'Usuario';
        const userEmail = currentUser.email || '';

        if (avatarUrl) {
            menuBtn.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="user-avatar-btn">`;
        } else {
            menuBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            `;
        }
        menuBtn.title = 'Menu de usuario';

        // Update modal profile section
        if (profileSection) {
            profileSection.innerHTML = `
                ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="user-menu-avatar">` : ''}
                <div class="user-menu-details">
                    <p class="user-menu-name">${userName}</p>
                    <p class="user-menu-email">${userEmail}</p>
                </div>
            `;
            profileSection.style.display = 'flex';
        }
    } else {
        // User is signed out - show sign in icon
        menuBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        `;
        menuBtn.title = 'Iniciar sesion';

        // Hide profile section when not logged in
        if (profileSection) {
            profileSection.style.display = 'none';
        }
    }
}

// ============================================================
// USER MENU FUNCTIONS
// ============================================================

function handleUserMenuClick() {
    if (currentUser) {
        openUserMenu();
    } else {
        signInWithGoogle();
    }
}

function openUserMenu() {
    const modal = document.getElementById('user-menu-modal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeUserMenu() {
    const modal = document.getElementById('user-menu-modal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Close on Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeUserMenu();
    }
});

// ============================================================
// AUTH EVENT HANDLERS
// ============================================================

async function onSignIn() {
    if (typeof init === 'function') {
        init();
    }
}

function onSignOut() {
    // Clear user data before reinitializing
    if (typeof clearUserData === 'function') {
        clearUserData();
    }
    if (typeof init === 'function') {
        init();
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function isAuthenticated() {
    return currentUser !== null;
}

function getUser() {
    return currentUser;
}

function getSupabaseClient() {
    return supabaseClient;
}
