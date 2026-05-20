// STEM-105: Tests for real Firebase Auth service with firebase/auth mocked.

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
} from '../authService';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('../firebase', () => ({
  auth: { __fake: 'auth', currentUser: null },
}));

const firebaseAuth = require('firebase/auth');
const firebaseModule = require('../firebase');

beforeEach(() => {
  jest.clearAllMocks();
  firebaseModule.auth.currentUser = null;
});

describe('authService', () => {
  describe('signUp', () => {
    test('returns uid and email on success', async () => {
      firebaseAuth.createUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'uid_123', email: 'test@school.edu' },
      });

      const result = await signUp('test@school.edu', 'password123');

      expect(result).toEqual({ uid: 'uid_123', email: 'test@school.edu' });
      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        firebaseModule.auth,
        'test@school.edu',
        'password123'
      );
    });

    test('maps email-already-in-use to friendly message', async () => {
      firebaseAuth.createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Firebase: ...',
      });

      await expect(signUp('test@school.edu', 'password123')).rejects.toThrow(
        'An account with that email already exists.'
      );
    });

    test('maps weak-password to friendly message', async () => {
      firebaseAuth.createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/weak-password',
      });

      await expect(signUp('test@school.edu', '123')).rejects.toThrow(
        'Password must be at least 6 characters.'
      );
    });
  });

  describe('signIn', () => {
    test('returns uid and email on success', async () => {
      firebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'uid_xyz', email: 'student@school.edu' },
      });

      const result = await signIn('student@school.edu', 'password');

      expect(result).toEqual({ uid: 'uid_xyz', email: 'student@school.edu' });
    });

    test('maps wrong-password and user-not-found to same friendly message', async () => {
      firebaseAuth.signInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/wrong-password',
      });
      await expect(signIn('a@b.com', 'wrong')).rejects.toThrow(
        'Invalid email or password.'
      );

      firebaseAuth.signInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/user-not-found',
      });
      await expect(signIn('nope@b.com', 'pw')).rejects.toThrow(
        'Invalid email or password.'
      );
    });

    test('passes through unknown errors unchanged', async () => {
      const weird = new Error('some unknown failure');
      weird.code = 'auth/unknown-thing';
      firebaseAuth.signInWithEmailAndPassword.mockRejectedValue(weird);

      await expect(signIn('a@b.com', 'pw')).rejects.toThrow('some unknown failure');
    });
  });

  describe('signOut', () => {
    test('calls firebase signOut', async () => {
      firebaseAuth.signOut.mockResolvedValue(undefined);
      await signOut();
      expect(firebaseAuth.signOut).toHaveBeenCalledWith(firebaseModule.auth);
    });
  });

  describe('getCurrentUser', () => {
    test('returns null when not signed in', () => {
      firebaseModule.auth.currentUser = null;
      expect(getCurrentUser()).toBeNull();
    });

    test('returns uid and email when signed in', () => {
      firebaseModule.auth.currentUser = { uid: 'uid_1', email: 'a@b.com' };
      expect(getCurrentUser()).toEqual({ uid: 'uid_1', email: 'a@b.com' });
    });
  });

  describe('onAuthStateChanged', () => {
    test('passes mapped user to callback on sign-in', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      firebaseAuth.onAuthStateChanged.mockImplementation((authArg, cb) => {
        cb({ uid: 'uid_1', email: 'a@b.com' });
        return unsubscribe;
      });

      const result = onAuthStateChanged(callback);

      expect(callback).toHaveBeenCalledWith({ uid: 'uid_1', email: 'a@b.com' });
      expect(result).toBe(unsubscribe);
    });

    test('passes null to callback on sign-out', () => {
      const callback = jest.fn();

      firebaseAuth.onAuthStateChanged.mockImplementation((authArg, cb) => {
        cb(null);
        return jest.fn();
      });

      onAuthStateChanged(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });
});