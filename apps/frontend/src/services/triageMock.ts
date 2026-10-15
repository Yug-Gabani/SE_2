import type { Doctor, TriageAssessment, UrgencyLevel } from '../types';

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Mitchell, MD',
    specialty: 'Emergency & Internal Medicine',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    rating: 4.9,
    availableDays: ['Today', 'Tomorrow', 'Friday'],
    slots: ['10:00 AM', '11:30 AM', '02:00 PM', '04:15 PM'],
    hospital: 'Metropolitan Medical Center',
  },
  {
    id: 'doc-2',
    name: 'Dr. Robert Chen, FACC',
    specialty: 'Cardiology & Preventive Care',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    rating: 4.95,
    availableDays: ['Today', 'Thursday', 'Saturday'],
    slots: ['09:30 AM', '01:00 PM', '03:30 PM'],
    hospital: 'Heart & Vascular Institute',
  },
  {
    id: 'doc-3',
    name: 'Dr. Emily Vance, MD',
    specialty: 'Pediatrics & Adolescent Health',
    avatar: 'https://images.unsplash.com/photo-1594824813625-e517a26f6e16?auto=format&fit=crop&q=80&w=300',
    rating: 4.88,
    availableDays: ['Today', 'Tomorrow', 'Next Monday'],
    slots: ['11:00 AM', '01:30 PM', '04:00 PM'],
    hospital: 'St. Jude Children & Family Clinic',
  },
  {
    id: 'doc-4',
    name: 'Dr. Marcus Reynolds, DO',
    specialty: 'Neurology & Chronic Pain',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    rating: 4.82,
    availableDays: ['Tomorrow', 'Friday'],
    slots: ['10:15 AM', '02:45 PM'],
    hospital: 'NeuroCare Regional Hospital',
  },
];

export const INITIAL_TRIAGE_CASES: TriageAssessment[] = [
  {
    id: 'TR-1082',
    patientId: 'pat-101',
    patientName: 'Eleanor Davis',
    patientAge: 58,
    chiefComplaint: 'Acute chest tightness radiating to left shoulder',
    symptoms: ['Chest pressure', 'Shortness of breath', 'Cold sweat'],
    durationDays: 1,
    painLevel: 9,
    vitals: {
      temperature: 98.6,
      heartRate: 114,
      bloodPressure: '158/96',
    },
    aiAdvisoryScore: 'EMERGENCY',
    aiAdvisoryReason: 'Classic presentation consistent with acute coronary event. Immediate medical evaluation required. Red-flag symptoms present.',
    doctorConfirmedScore: 'EMERGENCY',
    doctorNotes: 'Admitted to ER Observation bay 3. ECG dispatched.',
    status: 'REVIEWED',
    consultationType: 'IN_PERSON',
    selectedDoctorId: 'doc-2',
    appointmentTime: 'Immediate ER Triage',
    createdAt: '15 mins ago',
  },
  {
    id: 'TR-1083',
    patientId: 'pat-102',
    patientName: 'David Kim',
    patientAge: 34,
    chiefComplaint: 'High continuous fever with severe right lower quadrant abdominal pain',
    symptoms: ['Fever > 102F', 'Abdominal pain', 'Nausea'],
    durationDays: 2,
    painLevel: 7,
    vitals: {
      temperature: 102.4,
      heartRate: 98,
      bloodPressure: '128/82',
    },
    aiAdvisoryScore: 'URGENT',
    aiAdvisoryReason: 'Localized right iliac fossa tenderness with systemic fever warrants urgent surgical rule-out for appendicitis within 4-6 hours.',
    status: 'PENDING_REVIEW',
    consultationType: 'IN_PERSON',
    selectedDoctorId: 'doc-1',
    appointmentTime: 'Today 11:30 AM',
    createdAt: '42 mins ago',
  },
  {
    id: 'TR-1084',
    patientId: 'pat-103',
    patientName: 'Jessica Morales',
    patientAge: 29,
    chiefComplaint: 'Seasonal allergic rhinitis and dry cough for 5 days',
    symptoms: ['Mild cough', 'Nasal congestion', 'Sneezing'],
    durationDays: 5,
    painLevel: 2,
    vitals: {
      temperature: 98.4,
      heartRate: 72,
      bloodPressure: '118/74',
    },
    aiAdvisoryScore: 'ROUTINE',
    aiAdvisoryReason: 'Mild upper respiratory symptoms without dyspnea or hemodynamic instability. Suitable for routine outpatient or telehealth consultation.',
    status: 'PENDING_REVIEW',
    consultationType: 'VIDEO',
    selectedDoctorId: 'doc-1',
    appointmentTime: 'Tomorrow 02:00 PM',
    createdAt: '2 hours ago',
  },
];

export function calculateAdvisoryTriage(data: {
  symptoms: string[];
  painLevel: number;
  durationDays: number;
  fever: boolean;
  chestPain: boolean;
  shortnessOfBreath: boolean;
}): { score: UrgencyLevel; reason: string } {
  if (data.chestPain || data.shortnessOfBreath || data.painLevel >= 8) {
    return {
      score: 'EMERGENCY',
      reason: 'Critical red-flag indicators detected (severe pain >= 8/10, respiratory distress, or cardiopulmonary warning signs). Emergency department care strongly advised.',
    };
  }

  if (data.fever || data.painLevel >= 5 || data.durationDays >= 3) {
    return {
      score: 'URGENT',
      reason: 'Elevated symptom burden with ongoing systemic indicators. Same-day clinical assessment recommended.',
    };
  }

  return {
    score: 'ROUTINE',
    reason: 'Stable clinical parameters. Standard scheduled clinic or video telehealth consultation is appropriate.',
  };
}
