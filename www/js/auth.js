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
        // User is signed in
        authBtn.textContent = 'Sign Out';
        authBtn.onclick = signOut;

        const avatarUrl = currentUser.user_metadata?.avatar_url || '';
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;

        userInfo.innerHTML = `
            ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="user-avatar">` : ''}
            <span class="user-name">${displayName}</span>
        `;
        userInfo.style.display = 'flex';
    } else {
        // User is signed out
        authBtn.textContent = 'Sign In with Google';
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
