/**
 * Mock auth service.
 *
 * Exposes the same interface as the real Firebase auth will:
 *   signUp(email, password)        → Promise<User>
 *   signIn(email, password)        → Promise<User>
 *   signOut()                      → Promise<void>
 *   getCurrentUser()               → User | null
 *   onAuthStateChanged(callback)   → unsubscribe function
 *
 * When real Firebase config is available, replace the body of each function
 * with the real Firebase call — screens won't need to change.  
 */

// In-memory user store (resets on app reload)
const users = [
  { uid: 'test-user-001', email: 'test@test.com', password: 'test123' },
];

// Currently logged-in user (null when logged out)
let currentUser = null;

// Listeners registered via onAuthStateChanged
const authListeners = [];

// Notify all listeners that auth state changed
function notifyListeners() {
  authListeners.forEach((cb) => cb(currentUser));
}

/**
 * Register a new user. Throws if email already exists.
 */
export async function signUp(email, password) {
  // Simulate network delay so UI loading states feel realistic
  await delay(400);

  const existing = users.find((u) => u.email === email);
  if (existing) {
    throw new Error('An account with that email already exists.');
  }

  const newUser = {
    uid: 'mock-uid-' + Date.now(),
    email,
    password,
  };
  users.push(newUser);

  currentUser = { uid: newUser.uid, email: newUser.email };
  notifyListeners();
  return currentUser;
}

/**
 * Sign in an existing user. Throws on wrong credentials.
 */
export async function signIn(email, password) {
  await delay(400);

  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  currentUser = { uid: user.uid, email: user.email };
  notifyListeners();
  return currentUser;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await delay(200);
  currentUser = null;
  notifyListeners();
}

/**
 * Get the currently signed-in user (synchronous).
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Register a listener for auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(callback) {
  authListeners.push(callback);
  // Fire immediately with current state, matching Firebase behaviour
  callback(currentUser);

  return function unsubscribe() {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
}

// Utility — simulate network delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}