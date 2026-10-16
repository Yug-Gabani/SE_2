import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  HeartPulse,
  Info,
  MapPin,
  Sparkles,
  Video,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type {
  Appointment,
  ConsultationType,
  Doctor,
  TriageAssessment,
  User,
} from '../types';
import { appointmentsApi, doctorsApi, triageApi } from '../services/api';

interface PatientTriageBookingProps {
  currentUser: User | null;
}

const COMMON_SYMPTOMS = [
  'Fever / Chills',
  'Chest Tightness / Pain',
  'Shortness of Breath',
  'Severe Headache / Migraine',
  'Abdominal Cramping / Pain',
  'Persistent Cough',
  'Dizziness / Fainting',
  'Skin Rash / Allergic Reaction',
  'Joint Swelling',
  'Sore Throat',
];

function urgencyColor(score: TriageAssessment['urgency']): string {
  if (score === 'EMERGENCY') return '#dc2626';
  if (score === 'URGENT') return '#d97706';
  return '#059669';
}

function urgencyBg(score: TriageAssessment['urgency']): string {
  if (score === 'EMERGENCY') return 'rgba(220, 38, 38, 0.08)';
  if (score === 'URGENT') return 'rgba(217, 119, 6, 0.1)';
  return 'rgba(5, 150, 105, 0.08)';
}

function formatSlot(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}

export const PatientTriageBooking: React.FC<PatientTriageBookingProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — intake
  const [chiefComplaint, setChiefComplaint] = useState('Persistent high fever and dry cough for 3 days');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Fever / Chills', 'Persistent Cough']);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [painLevel, setPainLevel] = useState<number>(4);
  const [fever, setFever] = useState<boolean>(true);
  const [chestPain, setChestPain] = useState<boolean>(false);
  const [shortnessOfBreath, setShortnessOfBreath] = useState<boolean>(false);

  // Step 2 — triage result (from backend)
  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);
  const [assessing, setAssessing] = useState<boolean>(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Step 3 — doctor + slot
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState<boolean>(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('VIDEO');
  const [booking, setBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const toggleSymptom = (symptom: string) =>
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );

  // Fetch doctors (filtered by suggested specialty if present) when we enter step 3.
  useEffect(() => {
    if (step !== 3) return;
    setDoctorsLoading(true);
    setDoctorsError(null);
    const specialty = assessment?.suggestedSpecialty;
    doctorsApi
      .list(specialty)
      .then(list => {
        // If specialty filter returns nothing, fall back to the full list.
        if (list.length === 0 && specialty) {
          return doctorsApi.list();
        }
        return list;
      })
      .then(list => {
        setDoctors(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedDoctorId(first.id);
          setSelectedSlotId(first.nextSlots[0]?.id ?? '');
        }
      })
      .catch(err => setDoctorsError(err.message || 'Failed to load doctors'))
      .finally(() => setDoctorsLoading(false));
  }, [step, assessment?.suggestedSpecialty]);

  const selectedDoctor = useMemo(
    () => doctors.find(d => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const handleAssess = async () => {
    setAssessing(true);
    setTriageError(null);
    try {
      const result = await triageApi.assess({
        chiefComplaint,
        symptoms: selectedSymptoms,
        durationDays,
        painLevel,
        fever,
        chestPain,
        shortnessOfBreath,
      });
      setAssessment(result);
      setStep(2);
    } catch (err: any) {
      setTriageError(err.message || 'Triage service is unavailable');
    } finally {
      setAssessing(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlotId) {
      setBookingError('Choose a doctor and a slot before confirming.');
      return;
    }
    setBooking(true);
    setBookingError(null);
    try {
      const booked = await appointmentsApi.book({
        doctorId: selectedDoctorId,
        slotId: selectedSlotId,
        assessmentId: assessment?.id,
        consultationType,
      });
      setConfirmed(booked);
    } catch (err: any) {
      setBookingError(err.message || 'Could not book this slot. Try another.');
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <div className="card" style={{ maxWidth: '680px', margin: '56px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'rgba(50, 138, 59, 0.12)', color: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} />
        </div>
        <h1 className="font-serif text-heading-lg" style={{ color: 'var(--ink)', marginBottom: '12px' }}>
          Your appointment is confirmed.
        </h1>
        <p className="text-body" style={{ color: 'var(--muted)', marginBottom: '28px' }}>
          Your intake and advisory triage are now attached to the record for{' '}
          <strong>{confirmed.doctorName}</strong>.
        </p>
        <div style={{
          backgroundColor: 'var(--canvas)', borderRadius: '16px', padding: '24px',
          textAlign: 'left', marginBottom: '28px', display: 'grid', gap: '12px',
          fontSize: '14px', border: '1px solid var(--border)',
        }}>
          <div><strong>Patient:</strong> {currentUser?.fullName ?? 'You'}</div>
          <div><strong>Mode:</strong> {confirmed.consultationType === 'VIDEO' ? 'Encrypted Video Telehealth' : 'In-Person Clinic'}</div>
          <div><strong>Attending Physician:</strong> {confirmed.doctorName} ({confirmed.doctorSpecialty})</div>
          <div><strong>Hospital:</strong> {confirmed.doctorHospital}</div>
          <div><strong>Scheduled Slot:</strong> {confirmed.slotAt ? formatSlot(confirmed.slotAt) : 'TBA'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Triage Classification:</strong>
            <span style={{
              padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
              color: urgencyColor(confirmed.urgency), backgroundColor: urgencyBg(confirmed.urgency),
            }}>{confirmed.urgency}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/appointments')} className="btn btn-secondary">
            View All Appointments
          </button>
          <button onClick={() => navigate('/patient')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '48px auto', padding: '0 24px' }}>
      <section style={{ maxWidth: '840px', margin: '0 auto 48px', textAlign: 'center' }}>
        <span className="badge-ai-warm" style={{ marginBottom: '24px' }}>
          <Sparkles size={14} />
          AI-assisted · reviewed by doctors
        </span>
        <h1 className="font-serif text-display" style={{ color: 'var(--ink)', margin: '16px 0 20px' }}>
          Care that starts
          <br />
          before the appointment.
        </h1>
        <p className="text-subheading" style={{ maxWidth: '580px', margin: '0 auto' }}>
          Describe your symptoms, let us classify urgency, then pick a doctor — all before you leave your home.
        </p>
      </section>

      {/* Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '10px', marginBottom: '36px', flexWrap: 'wrap',
      }}>
        {[
          { n: 1, label: '1. Symptoms & Intake' },
          { n: 2, label: '2. AI Urgency Review' },
          { n: 3, label: '3. Doctor & Schedule' },
        ].map((s, idx) => (
          <React.Fragment key={s.n}>
            <button
              type="button"
              onClick={() => s.n < step && setStep(s.n as 1 | 2 | 3)}
              disabled={s.n > step}
              className={`btn ${step === s.n ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 20px', fontSize: '13px', minHeight: '38px', opacity: s.n > step ? 0.6 : 1 }}
            >
              {s.label}
            </button>
            {idx < 2 && <ChevronRight size={15} color="var(--muted)" />}
          </React.Fragment>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
        gap: '32px',
        alignItems: 'start',
      }}>
        <div className="card" style={{ padding: '36px' }}>
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  backgroundColor: 'var(--info)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <HeartPulse size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Describe Your Condition</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 1 of 3 · Pre-visit intake</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input
                    type="number" min={0} max={60}
                    className="form-input"
                    value={durationDays}
                    onChange={e => setDurationDays(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Patient</label>
                  <input
                    type="text" className="form-input" value={currentUser?.fullName ?? 'Guest'} disabled
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Concern / Chief Complaint</label>
                <textarea
                  className="form-textarea"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  placeholder="Describe your symptoms in your own words..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Symptoms Experienced</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {COMMON_SYMPTOMS.map(s => {
                    const active = selectedSymptoms.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSymptom(s)}
                        style={{
                          padding: '8px 18px', borderRadius: '9999px', fontSize: '13px',
                          fontFamily: 'var(--font-sans)', fontWeight: active ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.2s',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? 'var(--info)' : 'var(--canvas)',
                          color: active ? 'var(--primary)' : 'var(--ink)',
                        }}
                      >
                        {active ? '✓ ' : '+ '}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{
                marginTop: '24px', padding: '20px', borderRadius: '16px',
                backgroundColor: 'rgba(255, 109, 57, 0.08)',
                border: '1px solid rgba(255, 109, 57, 0.2)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontWeight: 600, fontSize: '14px', color: 'var(--accent-warm)', marginBottom: '12px',
                }}>
                  <AlertTriangle size={18} />
                  <span>Critical Safety Markers</span>
                </div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={chestPain}
                      onChange={e => setChestPain(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Acute chest pain, pressure, or tightness radiating to arm</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={shortnessOfBreath}
                      onChange={e => setShortnessOfBreath(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Severe difficulty breathing or resting breathlessness</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={fever}
                      onChange={e => setFever(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Body temperature elevated above 101.5°F</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label">Pain Severity: <strong>{painLevel} / 10</strong></label>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: painLevel >= 8 ? 'var(--danger)' : 'var(--muted)',
                  }}>
                    {painLevel === 0 && 'No Pain'}
                    {painLevel >= 1 && painLevel <= 3 && 'Mild Discomfort'}
                    {painLevel >= 4 && painLevel <= 6 && 'Moderate Pain'}
                    {painLevel >= 7 && painLevel <= 8 && 'Severe Pain'}
                    {painLevel >= 9 && 'Emergency'}
                  </span>
                </div>
                <input
                  type="range" min={0} max={10} value={painLevel}
                  onChange={e => setPainLevel(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: painLevel >= 8 ? 'var(--danger)' : 'var(--primary)',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {triageError && (
                <div style={{
                  marginTop: '20px', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  color: '#dc2626', fontSize: '13px',
                }}>
                  {triageError}
                </div>
              )}

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleAssess}
                  disabled={assessing || !chiefComplaint.trim()}
                  className="btn btn-primary"
                >
                  {assessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Running Triage...
                    </>
                  ) : (
                    <>
                      Run Advisory Triage <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 2 && assessment && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  backgroundColor: 'var(--info)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Automated Urgency Assessment</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 2 of 3 · Server-side rule engine</div>
                </div>
              </div>

              <div style={{
                padding: '24px', borderRadius: '16px',
                backgroundColor: urgencyBg(assessment.urgency),
                border: `1px solid ${urgencyColor(assessment.urgency)}25`,
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Triage Status:</span>
                    <span style={{
                      padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
                      color: urgencyColor(assessment.urgency),
                      backgroundColor: '#ffffff',
                    }}>{assessment.urgency}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Suggested specialty: <strong>{assessment.suggestedSpecialty}</strong>
                  </span>
                </div>
                <p style={{
                  fontSize: '15px', lineHeight: '1.6',
                  color: urgencyColor(assessment.urgency),
                }}>
                  {assessment.rationale}
                </p>
              </div>

              <div style={{
                backgroundColor: 'var(--canvas)', borderRadius: '16px', padding: '20px',
                marginBottom: '28px', fontSize: '14px', border: '1px solid var(--border)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '10px' }}>Reported Clinical Summary:</div>
                <ul style={{ paddingLeft: '20px', color: 'var(--muted)', lineHeight: '1.8' }}>
                  <li>Primary concern: <em>"{assessment.chiefComplaint}"</em></li>
                  <li>Symptoms flagged: {assessment.symptoms.join(', ') || 'None selected'}</li>
                  <li>Pain index: {assessment.painLevel} / 10 | Duration: {assessment.durationDays} day(s)</li>
                  <li>Cardiopulmonary alert: {assessment.chestPain || assessment.shortnessOfBreath ? 'POSITIVE' : 'Negative'}</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                  Back to Symptoms
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn btn-primary">
                  Select Doctor & Slot <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && assessment && (
            <form onSubmit={handleBook}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  backgroundColor: 'var(--info)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Calendar size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Select Doctor & Consultation Mode</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 3 of 3 · Finalize Booking</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Consultation Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                  <button
                    type="button" onClick={() => setConsultationType('VIDEO')}
                    style={{
                      padding: '16px 20px', borderRadius: '16px',
                      border: consultationType === 'VIDEO' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: consultationType === 'VIDEO' ? 'var(--info)' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Video size={24} color={consultationType === 'VIDEO' ? 'var(--primary)' : 'var(--muted)'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>Telehealth Video</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Encrypted video call</div>
                    </div>
                  </button>
                  <button
                    type="button" onClick={() => setConsultationType('IN_PERSON')}
                    style={{
                      padding: '16px 20px', borderRadius: '16px',
                      border: consultationType === 'IN_PERSON' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: consultationType === 'IN_PERSON' ? 'var(--info)' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <MapPin size={24} color={consultationType === 'IN_PERSON' ? 'var(--primary)' : 'var(--muted)'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>In-Person Clinic</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Hospital facility visit</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">
                  Clinicians specialising in {assessment.suggestedSpecialty}
                </label>
                {doctorsLoading && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                    <Loader2 size={20} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
                    Loading doctors…
                  </div>
                )}
                {doctorsError && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    backgroundColor: 'rgba(220, 38, 38, 0.08)',
                    border: '1px solid rgba(220, 38, 38, 0.25)',
                    color: '#dc2626', fontSize: '13px',
                  }}>
                    {doctorsError}
                  </div>
                )}
                {!doctorsLoading && !doctorsError && doctors.length === 0 && (
                  <div style={{ padding: '16px', color: 'var(--muted)' }}>No doctors available right now.</div>
                )}
                <div style={{ display: 'grid', gap: '12px', marginTop: '6px' }}>
                  {doctors.map(doc => {
                    const active = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          setSelectedSlotId(doc.nextSlots[0]?.id ?? '');
                        }}
                        style={{
                          padding: '16px 20px', borderRadius: '16px',
                          border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? 'var(--info)' : 'var(--surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {doc.avatarUrl ? (
                            <img
                              src={doc.avatarUrl}
                              alt={doc.fullName}
                              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '50%',
                              backgroundColor: 'var(--canvas)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              color: 'var(--primary)', fontWeight: 700,
                            }}>
                              {doc.fullName.split(' ').map(s => s[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{doc.fullName}</div>
                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                              {doc.specialty} · {doc.hospital}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '13px' }}>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>★ {Number(doc.rating).toFixed(2)}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                            {doc.openSlotCount} open slot{doc.openSlotCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Select Slot Time</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                  {(selectedDoctor?.nextSlots ?? []).length === 0 && (
                    <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                      No open slots for this doctor in the next 7 days.
                    </div>
                  )}
                  {(selectedDoctor?.nextSlots ?? []).map(slot => {
                    const active = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        style={{
                          padding: '8px 20px', borderRadius: '9999px',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                          color: active ? '#ffffff' : 'var(--ink)',
                          fontWeight: active ? 600 : 400, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        {formatSlot(slot.slotAt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {bookingError && (
                <div style={{
                  marginTop: '20px', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  color: '#dc2626', fontSize: '13px',
                }}>
                  {bookingError}
                </div>
              )}

              <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={booking || !selectedDoctorId || !selectedSlotId}
                  className="btn btn-primary"
                >
                  {booking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Booking…
                    </>
                  ) : (
                    'Confirm & Schedule Visit'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live summary */}
        <div>
          <div className="card" style={{ padding: '28px', position: 'sticky', top: '96px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Triage Live Summary</h3>
              </div>
              {assessment && (
                <span style={{
                  padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
                  color: urgencyColor(assessment.urgency), backgroundColor: urgencyBg(assessment.urgency),
                }}>{assessment.urgency}</span>
              )}
            </div>

            {!assessment ? (
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Fill out the intake on the left. Once you run advisory triage the server classifies urgency
                and suggests a specialty for your booking.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div className="text-caption" style={{
                    color: 'var(--muted)', textTransform: 'uppercase',
                    letterSpacing: '0.04em', marginBottom: '6px',
                  }}>
                    Clinical Rationale:
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
                    {assessment.rationale}
                  </p>
                </div>
                {assessment.urgency === 'EMERGENCY' && (
                  <div style={{
                    backgroundColor: 'rgba(192, 57, 43, 0.08)',
                    border: '1px solid rgba(192, 57, 43, 0.3)',
                    borderRadius: '12px', padding: '14px', fontSize: '13px',
                    color: 'var(--danger)', display: 'flex', gap: '10px', marginBottom: '20px',
                  }}>
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>High Urgency Alert:</strong> Red-flag indicators detected.
                      Consider calling 108 / 112 or proceed immediately to the nearest emergency room.
                    </div>
                  </div>
                )}
                <div style={{
                  backgroundColor: 'var(--canvas)', borderRadius: '14px', padding: '16px',
                  display: 'grid', gap: '10px', fontSize: '13px', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Suggested specialty:</span>
                    <strong>{assessment.suggestedSpecialty}</strong>
                  </div>
                  {selectedDoctor && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Attending:</span>
                        <strong>{selectedDoctor.fullName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Facility:</span>
                        <span>{selectedDoctor.hospital}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Mode:</span>
                    <span>{consultationType === 'VIDEO' ? 'Telehealth Video' : 'In-Person'}</span>
                  </div>
                </div>
              </>
            )}

            <div style={{
              marginTop: '20px', padding: '12px 16px',
              backgroundColor: 'var(--info)', borderRadius: '10px',
              fontSize: '12px', color: 'var(--ink)', lineHeight: '1.5',
              display: 'flex', gap: '10px',
            }}>
              <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>AI Clinical Advisory (DR-15):</strong> Scores are advisory. A doctor reviews every booking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
