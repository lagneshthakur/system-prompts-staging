/**
 * Authentication module for the BrainMo App
 * Handles login, logout, token storage, and auth state management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
const AUTH_STORAGE_KEY = 'auth';

export interface Teacher {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  school_id: string;
  grade_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuthState {
  teacher: Teacher | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

interface LoginResponse {
  teacher: Teacher;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  onboarding_checkpoint: string;
}

const emptyAuthState: AuthState = {
  teacher: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

/**
 * Get current auth state from localStorage
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return emptyAuthState;
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return emptyAuthState;
    }
    return JSON.parse(stored) as AuthState;
  } catch {
    return emptyAuthState;
  }
}

/**
 * Save auth state to localStorage
 */
export function setAuthState(state: AuthState): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Clear auth state (logout)
 */
export function clearAuthState(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user is authenticated with a valid token
 */
export function isAuthenticated(): boolean {
  const state = getAuthState();
  if (!state.accessToken || !state.expiresAt) {
    return false;
  }
  // Check if token is expired (with 1 minute buffer)
  return Date.now() < state.expiresAt - 60000;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  const state = getAuthState();
  if (!state.accessToken || !state.expiresAt) {
    return null;
  }
  // Return null if expired
  if (Date.now() >= state.expiresAt) {
    return null;
  }
  return state.accessToken;
}

/**
 * Get the current teacher info
 */
export function getTeacher(): Teacher | null {
  return getAuthState().teacher;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signin-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || errorData.error || `Login failed (${response.status})`,
      };
    }

    const data: LoginResponse = await response.json();

    // Calculate expiry timestamp
    const expiresAt = Date.now() + data.expiresIn * 1000;

    // Store auth state
    setAuthState({
      teacher: data.teacher,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please try again.',
    };
  }
}

/**
 * Logout and clear all auth data
 */
export function logout(): void {
  clearAuthState();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}
