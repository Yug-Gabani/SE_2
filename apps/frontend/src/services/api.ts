import type {
  Appointment,
  ConsultationType,
  Doctor,
  Hospital,
  PatientProfile,
  Prescription,
  PrescriptionItem,
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
  list: (specialty?: string, hospitalId?: string): Promise<Doctor[]> => {
    const params = new URLSearchParams();
    if (specialty) params.set('specialty', specialty);
    if (hospitalId) params.set('hospitalId', hospitalId);
    const qs = params.toString();
    return request<Doctor[]>(`/v1/doctors${qs ? `?${qs}` : ''}`);
  },
  get: (id: string): Promise<Doctor> => request<Doctor>(`/v1/doctors/${id}`),
  slots: (id: string): Promise<Slot[]> => request<Slot[]>(`/v1/doctors/${id}/slots`),
};

/** Public (no auth) hospital search for the landing page. */
export const publicHospitalsApi = {
  search: (opts: { q?: string; city?: string; limit?: number } = {}): Promise<Hospital[]> => {
    const params = new URLSearchParams();
    if (opts.q)     params.set('q', opts.q);
    if (opts.city)  params.set('city', opts.city);
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return fetch(`/api/v1/hospitals/public/search${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(j => (j?.data ?? []) as Hospital[]);
  },
  get: (id: string): Promise<Hospital> =>
    fetch(`/api/v1/hospitals/public/${id}`)
      .then(r => r.json())
      .then(j => j.data as Hospital),
};

export const hospitalsApi = {
  search: (opts: { q?: string; state?: string; city?: string; specialty?: string; limit?: number } = {}): Promise<Hospital[]> => {
    const params = new URLSearchParams();
    if (opts.q)         params.set('q', opts.q);
    if (opts.state)     params.set('state', opts.state);
    if (opts.city)      params.set('city', opts.city);
    if (opts.specialty) params.set('specialty', opts.specialty);
    if (opts.limit)     params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<Hospital[]>(`/v1/hospitals${qs ? `?${qs}` : ''}`);
  },
  get: (id: string): Promise<Hospital> => request<Hospital>(`/v1/hospitals/${id}`),
  states: (): Promise<string[]> => request<string[]>('/v1/hospitals/states'),
  cities: (state?: string): Promise<string[]> =>
    request<string[]>(`/v1/hospitals/cities${state ? `?state=${encodeURIComponent(state)}` : ''}`),
};

export const profileApi = {
  get: (): Promise<PatientProfile> => request<PatientProfile>('/v1/users/me/profile'),
  update: (body: Partial<Omit<PatientProfile, 'id' | 'email'>>): Promise<PatientProfile> =>
    request<PatientProfile>('/v1/users/me/profile', { method: 'PUT', body: JSON.stringify(body) }),
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

export type DoctorAction =
  | 'ACCEPT'
  | 'START'
  | 'COMPLETE'
  | 'NO_SHOW'
  | 'OVERRIDE_URGENCY';

export interface PatchAppointmentBody {
  action: DoctorAction;
  urgency?: 'EMERGENCY' | 'URGENT' | 'ROUTINE';
  reason?: string;
  notes?: string;
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
  doctorQueue: (scope: 'active' | 'past' | 'all' = 'active'): Promise<Appointment[]> =>
    request<Appointment[]>(`/v1/appointments/queue?scope=${scope}`),
  doctorAction: (id: string, body: PatchAppointmentBody): Promise<Appointment> =>
    request<Appointment>(`/v1/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export interface CreatePrescriptionBody {
  appointmentId: string;
  notes?: string;
  items: PrescriptionItem[];
}
export interface UpdatePrescriptionBody {
  notes?: string;
  items: PrescriptionItem[];
}

export const prescriptionsApi = {
  create: (body: CreatePrescriptionBody): Promise<Prescription> =>
    request<Prescription>('/v1/prescriptions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: UpdatePrescriptionBody): Promise<Prescription> =>
    request<Prescription>(`/v1/prescriptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  sign: (id: string): Promise<Prescription> =>
    request<Prescription>(`/v1/prescriptions/${id}/sign`, { method: 'POST' }),
  voidRx: (id: string, reason: string): Promise<Prescription> =>
    request<Prescription>(`/v1/prescriptions/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deleteDraft: (id: string): Promise<Prescription> =>
    request<Prescription>(`/v1/prescriptions/${id}`, { method: 'DELETE' }),
  mine: (): Promise<Prescription[]> => request<Prescription[]>('/v1/prescriptions/me'),
  listForAppointment: (appointmentId: string): Promise<Prescription[]> =>
    request<Prescription[]>(`/v1/prescriptions?appointmentId=${appointmentId}`),
  get: (id: string): Promise<Prescription> => request<Prescription>(`/v1/prescriptions/${id}`),
  pdfUrl: (id: string): string => `/api/v1/prescriptions/${id}/pdf`,
};
