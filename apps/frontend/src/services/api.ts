import type { User } from '../types';

export interface TokenResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

const API_BASE = '/api';

export const authApi = {
  async login(email: string, password: string): Promise<TokenResponseData> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Login failed');
    }
    return json.data;
  },

  async register(data: { email: string; password: string; fullName: string; phone?: string }): Promise<TokenResponseData> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Registration failed');
    }
    return json.data;
  },

  async getMe(accessToken: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch user');
    }
    return json.data;
  },
};
