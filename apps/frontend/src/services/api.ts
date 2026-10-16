import type {
  Appointment,
  ConsultationType,
  Doctor,
  Role,
  Slot,
  TriageAssessment,
  User,
} from '../types';

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

function getToken(): string | null {
  return localStorage.getItem('pulsecare_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    let message = json.message || json.error || res.statusText || 'Request failed';
    if (json.fieldErrors && Array.isArray(json.fieldErrors) && json.fieldErrors.length > 0) {
      const first = json.fieldErrors[0];
      message = `${first.field}: ${first.message}`;
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  // Backend wraps everything in ApiResponse { success, data, message, timestamp }
  return (json?.data ?? json) as T;
}

export const authApi = {
  async login(email: string, password: string): Promise<TokenResponseData> {
    return request<TokenResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: Role;
  }): Promise<TokenResponseData> {
    return request<TokenResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(_accessToken?: string): Promise<User> {
    return request<User>('/auth/me');
  },

  async logout(_accessToken?: string): Promise<void> {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* silent */
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
      return res.status === 401 || res.status === 200;
    } catch {
      return false;
    }
  },
};

export const doctorsApi = {
  list: (specialty?: string): Promise<Doctor[]> =>
    request<Doctor[]>(
      `/v1/doctors${specialty ? `?specialty=${encodeURIComponent(specialty)}` : ''}`
    ),
  get: (id: string): Promise<Doctor> => request<Doctor>(`/v1/doctors/${id}`),
  slots: (id: string): Promise<Slot[]> => request<Slot[]>(`/v1/doctors/${id}/slots`),
};

export interface TriageRequestBody {
  chiefComplaint: string;
  symptoms: string[];
  durationDays: number;
  painLevel: number;
  fever: boolean;
  chestPain: boolean;
  shortnessOfBreath: boolean;
}

export const triageApi = {
  assess: (body: TriageRequestBody): Promise<TriageAssessment> =>
    request<TriageAssessment>('/v1/triage/assess', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export interface BookAppointmentBody {
  doctorId: string;
  slotId: string;
  assessmentId?: string;
  consultationType: ConsultationType;
}

export const appointmentsApi = {
  book: (body: BookAppointmentBody): Promise<Appointment> =>
    request<Appointment>('/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  mine: (): Promise<Appointment[]> => request<Appointment[]>('/v1/appointments/me'),
  get: (id: string): Promise<Appointment> => request<Appointment>(`/v1/appointments/${id}`),
  cancel: (id: string): Promise<Appointment> =>
    request<Appointment>(`/v1/appointments/${id}/cancel`, { method: 'PATCH' }),
  doctorQueue: (): Promise<Appointment[]> => request<Appointment[]>('/v1/appointments/queue'),
};
