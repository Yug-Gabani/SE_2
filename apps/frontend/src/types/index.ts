export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type UrgencyLevel = 'EMERGENCY' | 'URGENT' | 'ROUTINE';

export type ConsultationType = 'VIDEO' | 'IN_PERSON';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  rating: number;
  availableDays: string[];
  slots: string[];
  hospital: string;
}

export interface TriageAssessment {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  chiefComplaint: string;
  symptoms: string[];
  durationDays: number;
  painLevel: number; // 1-10
  vitals?: {
    temperature?: number;
    heartRate?: number;
    bloodPressure?: string;
  };
  aiAdvisoryScore: UrgencyLevel;
  aiAdvisoryReason: string;
  doctorConfirmedScore?: UrgencyLevel;
  doctorNotes?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  status: 'PENDING_REVIEW' | 'REVIEWED' | 'DISCHARGED';
  consultationType: ConsultationType;
  selectedDoctorId: string;
  appointmentTime: string;
  createdAt: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
