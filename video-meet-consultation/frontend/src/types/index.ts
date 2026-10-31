export type UserRole = 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  specialty?: string;
  avatar_url?: string;
}

export interface Meeting {
  id: string;
  room_code: string;
  title: string;
  doctor_id?: string;
  patient_id?: string;
  doctor_name?: string;
  patient_name?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  started_at?: string;
  ended_at?: string;
  created_at: string;
  has_summary?: boolean;
}

export interface TranscriptRecord {
  id?: number;
  meeting_id?: string;
  speaker_name: string;
  speaker_role: UserRole | string;
  text: string;
  timestamp: string;
}

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface ClinicalSummary {
  id: string;
  meeting_id: string;
  chief_complaint?: string;
  clinical_observations?: string;
  doctor_advice?: string;
  prescribed_medications?: MedicationItem[];
  follow_up_instructions?: string;
  red_flags_and_warnings?: string;
  ai_model_used: string;
  created_at: string;
}

export interface ChatMessage {
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  text: string;
  timestamp: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialty?: string;
  scheduled_time: string;
  reason: string;
  room_code: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  has_summary?: boolean;
}

