export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'PHARMACIST' | 'STAFF';

export type UrgencyLevel = 'EMERGENCY' | 'URGENT' | 'ROUTINE';

export type ConsultationType = 'VIDEO' | 'IN_PERSON';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
}

export interface SlotSummary {
  id: string;
  slotAt: string;
}

export interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
  avatarUrl?: string;
  rating: number;
  bio?: string;
  nextSlots: SlotSummary[];
  openSlotCount: number;
  /** Legacy field retained so the old booking modal still compiles until it is retired. */
  name?: string;
  avatar?: string;
  availableDays?: string[];
  slots?: string[];
}

export interface Slot {
  id: string;
  doctorId: string;
  slotAt: string;
  booked: boolean;
}

export interface TriageAssessment {
  id: string;
  patientId: string;
  chiefComplaint: string;
  symptoms: string[];
  durationDays: number;
  painLevel: number;
  fever: boolean;
  chestPain: boolean;
  shortnessOfBreath: boolean;
  urgency: UrgencyLevel;
  rationale: string;
  suggestedSpecialty: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorHospital?: string;
  doctorAvatarUrl?: string;
  slotId: string;
  slotAt?: string;
  assessmentId?: string;
  consultationType: ConsultationType;
  urgency: UrgencyLevel;
  status: AppointmentStatus;
  chiefComplaint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
