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
    console.log('Initializing authentication...');

    try {
        // Check for existing session
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
        }

        if (session) {
            currentUser = session.user;
            console.log('Existing session found:', currentUser.email);
        }

        // Always update UI (whether signed in or not)
        updateAuthUI();

        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            currentUser = session?.user || null;
            updateAuthUI();

            if (event === 'SIGNED_IN') {
                onSignIn();
            } else if (event === 'SIGNED_OUT') {
                onSignOut();
            }
        });

        console.log('Authentication initialized');
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
    console.log('Initiating Google sign-in...');

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
    console.log('Signing out...');

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
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');

    if (!authBtn || !userInfo) {
        console.warn('Auth UI elements not found');
        return;
    }

    if (currentUser) {
        // User is signed in - show sign out icon
        authBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        `;
        authBtn.title = 'Sign Out';
        authBtn.onclick = signOut;

        const avatarUrl = currentUser.user_metadata?.avatar_url || '';

        userInfo.innerHTML = avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="user-avatar">` : '';
        userInfo.style.display = avatarUrl ? 'flex' : 'none';
    } else {
        // User is signed out - show sign in icon
        authBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        `;
        authBtn.title = 'Sign In';
        authBtn.onclick = signInWithGoogle;
        userInfo.innerHTML = '';
        userInfo.style.display = 'none';
    }
}

// ============================================================
// AUTH EVENT HANDLERS
// ============================================================

async function onSignIn() {
    console.log('User signed in:', currentUser.email);
    // TODO Phase 2: Sync data from cloud
    // For now, just refresh posts
    if (typeof init === 'function') {
        init();
    }
}

function onSignOut() {
    console.log('User signed out');
    // TODO Phase 2: Clear synced data, use localStorage only
    // For now, just refresh posts
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
