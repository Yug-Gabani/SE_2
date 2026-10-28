import axios from 'axios';
import { User, Meeting, TranscriptRecord, ClinicalSummary, Appointment } from '../types';

const getBaseUrl = (): string => {
  if ((import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('telemeet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await client.post<{ access_token: string; user: User }>('/api/auth/login', { email, password });
    localStorage.setItem('telemeet_token', res.data.access_token);
    localStorage.setItem('telemeet_user', JSON.stringify(res.data.user));
    return res.data;
  },

  register: async (email: string, password: string, fullName: string, role: string, specialty?: string) => {
    const res = await client.post<{ access_token: string; user: User }>('/api/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
      specialty,
    });
    localStorage.setItem('telemeet_token', res.data.access_token);
    localStorage.setItem('telemeet_user', JSON.stringify(res.data.user));
    return res.data;
  },

  getMe: async () => {
    const res = await client.get<User>('/api/auth/me');
    localStorage.setItem('telemeet_user', JSON.stringify(res.data));
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('telemeet_token');
    localStorage.removeItem('telemeet_user');
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('telemeet_user');
    return stored ? JSON.parse(stored) : null;
  },
};

export const meetingApi = {
  createMeeting: async (title: string, patientId?: string) => {
    const res = await client.post<Meeting>('/api/meetings', { title, patient_id: patientId });
    return res.data;
  },

  listMeetings: async () => {
    const res = await client.get<Meeting[]>('/api/meetings');
    return res.data;
  },

  getMeeting: async (roomCode: string) => {
    const res = await client.get<Meeting>(`/api/meetings/${roomCode}`);
    return res.data;
  },

  endMeeting: async (roomCode: string) => {
    const res = await client.post<Meeting>(`/api/meetings/${roomCode}/end`);
    return res.data;
  },
};

export const transcriptApi = {
  getTranscripts: async (roomCode: string) => {
    const res = await client.get<TranscriptRecord[]>(`/api/meetings/${roomCode}/transcripts`);
    return res.data;
  },

  appendTranscript: async (roomCode: string, speakerName: string, speakerRole: string, text: string) => {
    const res = await client.post<TranscriptRecord>(`/api/meetings/${roomCode}/transcripts`, {
      speaker_name: speakerName,
      speaker_role: speakerRole,
      text,
    });
    return res.data;
  },
};

export const summaryApi = {
  generateSummary: async (roomCode: string) => {
    const res = await client.post<ClinicalSummary>(`/api/meetings/${roomCode}/generate-summary`);
    return res.data;
  },

  getSummary: async (roomCode: string) => {
    const res = await client.get<ClinicalSummary>(`/api/meetings/${roomCode}/summary`);
    return res.data;
  },
};

export const appointmentApi = {
  listDoctors: async () => {
    const res = await client.get<User[]>('/api/doctors');
    return res.data;
  },

  bookAppointment: async (doctorId: string, scheduledTime: string, reason: string) => {
    const res = await client.post<Appointment>('/api/appointments', {
      doctor_id: doctorId,
      scheduled_time: scheduledTime,
      reason,
    });
    return res.data;
  },

  listAppointments: async () => {
    const res = await client.get<Appointment[]>('/api/appointments');
    return res.data;
  },

  getAppointmentSummary: async (appointmentId: string) => {
    const res = await client.get<ClinicalSummary>(`/api/appointments/${appointmentId}/summary`);
    return res.data;
  },
};

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

