import type { Role, User } from '../types';

export interface TokenResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  };
}

const API_BASE = '/api';

export const authApi = {
  async login(email: string, password: string): Promise<TokenResponseData> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json.message || json.error || (res.status === 401 ? 'Invalid email or password' : 'Login failed');
      throw new Error(message);
    }
    return json.data;
  },

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: Role;
  }): Promise<TokenResponseData> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      let message = json.message || json.error || 'Registration failed';
      if (json.fieldErrors) {
        const firstField = Object.keys(json.fieldErrors)[0];
        message = `${firstField}: ${json.fieldErrors[firstField]}`;
      }
      throw new Error(message);
    }
    return json.data;
  },

  async getMe(accessToken: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch user session');
    }
    return json.data;
  },

  async logout(accessToken?: string): Promise<void> {
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        // silent catch
      }
    }
    localStorage.removeItem('pulsecare_token');
    localStorage.removeItem('pulsecare_refresh');
    localStorage.removeItem('pulsecare_user');
  },

  saveAuth(data: TokenResponseData) {
    localStorage.setItem('pulsecare_token', data.accessToken);
    localStorage.setItem('pulsecare_refresh', data.refreshToken);
    localStorage.setItem('pulsecare_user', JSON.stringify(data.user));
  },

  getSavedAuth(): { token: string | null; user: User | null } {
    const token = localStorage.getItem('pulsecare_token');
    const userStr = localStorage.getItem('pulsecare_user');
    let user: User | null = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
    return { token, user };
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'probe@probe.com', password: 'probe' }),
      });
      // A 401 response confirms Spring Boot and DB are active and responding
      return res.status === 401 || res.status === 200;
    } catch {
      return false;
    }
  }
};
