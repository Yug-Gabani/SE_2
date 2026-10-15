import React, { useState } from 'react';
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
} from 'lucide-react';
import type { ConsultationType, Doctor, TriageAssessment, User } from '../types';
import { calculateAdvisoryTriage } from '../services/triageMock';

interface PatientTriageBookingProps {
  doctors: Doctor[];
  onBookSuccess: (newAssessment: TriageAssessment) => void;
  currentUser: User | null;
  onNavigateToExplain?: () => void;
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

export const PatientTriageBooking: React.FC<PatientTriageBookingProps> = ({
  doctors,
  onBookSuccess,
  currentUser,
  onNavigateToExplain,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Patient Intake Form State
  const [patientName, setPatientName] = useState(currentUser?.fullName || 'Eleanor Davis');
  const [patientAge, setPatientAge] = useState<number>(32);
  const [chiefComplaint, setChiefComplaint] = useState('Persistent high fever and dry cough for 3 days');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Fever / Chills', 'Persistent Cough']);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [painLevel, setPainLevel] = useState<number>(4);

  // Red flag states
  const [chestPain, setChestPain] = useState<boolean>(false);
  const [shortnessOfBreath, setShortnessOfBreath] = useState<boolean>(false);
  const [fever, setFever] = useState<boolean>(true);

  // Doctor & Scheduling selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [consultationType, setConsultationType] = useState<ConsultationType>('VIDEO');
  const [selectedSlot, setSelectedSlot] = useState<string>('Today 02:00 PM');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Calculate live advisory score
  const advisory = calculateAdvisoryTriage({
    symptoms: selectedSymptoms,
    painLevel,
    durationDays,
    fever,
    chestPain,
    shortnessOfBreath,
  });

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];

  const handleCompleteBooking = (e: React.FormEvent) => {
    e.preventDefault();

    const newAssessment: TriageAssessment = {
      id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: currentUser?.id || `pat-${Date.now()}`,
      patientName: patientName || 'Anonymous Patient',
      patientAge,
      chiefComplaint,
      symptoms: selectedSymptoms,
      durationDays,
      painLevel,
      vitals: {
        temperature: fever ? 101.8 : 98.6,
        heartRate: chestPain ? 105 : 78,
        bloodPressure: '120/80',
      },
      aiAdvisoryScore: advisory.score,
      aiAdvisoryReason: advisory.reason,
      status: 'PENDING_REVIEW',
      consultationType,
      selectedDoctorId,
      appointmentTime: selectedSlot,
      createdAt: 'Just now',
    };

    onBookSuccess(newAssessment);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="card" style={{
        maxWidth: '680px',
        margin: '56px auto',
        padding: '40px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(50, 138, 59, 0.12)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} />
        </div>

        {/* DM Serif Display for Booking Confirmation Headline (Rule 13) */}
        <h1 className="font-serif text-heading-lg" style={{ color: 'var(--ink)', marginBottom: '12px' }}>
          Your appointment is confirmed.
        </h1>
        <p className="text-body" style={{ color: 'var(--muted)', marginBottom: '28px' }}>
          Your clinical intake and advisory triage have been sent to <strong>{selectedDoctor.name}</strong> for pre-visit review.
        </p>

        <div style={{
          backgroundColor: 'var(--canvas)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'left',
          marginBottom: '28px',
          display: 'grid',
          gap: '12px',
          fontSize: '14px',
          border: '1px solid var(--border)',
        }}>
          <div><strong>Patient:</strong> {patientName} (Age: {patientAge})</div>
          <div><strong>Consultation Mode:</strong> {consultationType === 'VIDEO' ? 'Encrypted Video Telehealth' : 'In-Person Hospital Clinic'}</div>
          <div><strong>Attending Physician:</strong> {selectedDoctor.name} ({selectedDoctor.specialty})</div>
          <div><strong>Scheduled Slot:</strong> {selectedSlot}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Triage Classification:</strong>
            <span className={`badge-urgency-${advisory.score.toLowerCase()}-warm`}>
              {advisory.score}
            </span>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--info)',
          borderRadius: '14px',
          padding: '16px 20px',
          fontSize: '13px',
          color: 'var(--ink)',
          textAlign: 'left',
          marginBottom: '32px',
          display: 'flex',
          gap: '12px',
        }}>
          <Info size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>AI Clinical Advisory (DR-15/16):</strong> Artificial intelligence scores assist clinician triage and do not constitute an autonomous diagnosis.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {onNavigateToExplain && (
            <button
              onClick={onNavigateToExplain}
              className="btn btn-secondary"
            >
              Explain My Triage
            </button>
          )}
          <button
            onClick={() => {
              setIsSubmitted(false);
              setStep(1);
            }}
            className="btn btn-primary"
          >
            Book Another Consultation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '48px auto', padding: '0 24px' }}>
      {/* Warm Hero (PULSECARE_DESIGN.md Section 12.1) */}
      <section style={{ maxWidth: '840px', margin: '0 auto 48px', textAlign: 'center' }}>
        <span className="badge-ai-warm" style={{ marginBottom: '24px' }}>
          <Sparkles size={14} />
          AI-assisted · reviewed by doctors
        </span>

        {/* Display headline uses DM Serif Display (Rule 13) */}
        <h1 className="font-serif text-display" style={{ color: 'var(--ink)', margin: '16px 0 20px' }}>
          Care that starts
          <br />
          before the appointment.
        </h1>

        <p className="text-subheading" style={{ maxWidth: '580px', margin: '0 auto' }}>
          Describe your symptoms, choose your doctor, book consultation — all before you leave your home.
        </p>
      </section>

      {/* Stepper Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '36px',
      }}>
        <button
          onClick={() => setStep(1)}
          className={`btn ${step === 1 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '13px', minHeight: '38px' }}
        >
          1. Symptoms & Intake
        </button>
        <ChevronRight size={15} color="var(--muted)" />
        <button
          onClick={() => setStep(2)}
          className={`btn ${step === 2 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '13px', minHeight: '38px' }}
        >
          2. AI Urgency Review
        </button>
        <ChevronRight size={15} color="var(--muted)" />
        <button
          onClick={() => setStep(3)}
          className={`btn ${step === 3 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '13px', minHeight: '38px' }}
        >
          3. Doctor & Schedule
        </button>
      </div>

      {/* Main Grid: Form Left, Real-Time Board Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
        gap: '32px',
        alignItems: 'start',
      }}>
        {/* Form Card (20px radius, warm padding) */}
        <div className="card" style={{ padding: '36px' }}>
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <HeartPulse size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Describe Your Condition</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 1 of 3 · Pre-visit intake questionnaire</div>
                </div>
              </div>

              {/* 3-column input row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="115"
                    className="form-input"
                    value={patientAge}
                    onChange={e => setPatientAge(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="form-input"
                    value={durationDays}
                    onChange={e => setDurationDays(Number(e.target.value))}
                    required
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
                />
              </div>

              {/* Symptoms Pills */}
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
                          padding: '8px 18px',
                          borderRadius: '9999px',
                          fontSize: '13px',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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

              {/* Red-Flag Checkpoints */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 109, 57, 0.08)',
                border: '1px solid rgba(255, 109, 57, 0.2)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--accent-warm)',
                  marginBottom: '12px',
                }}>
                  <AlertTriangle size={18} />
                  <span>Critical Safety Markers</span>
                </div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={chestPain}
                      onChange={e => setChestPain(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Acute chest pain, pressure, or tightness radiating to arm</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={shortnessOfBreath}
                      onChange={e => setShortnessOfBreath(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Severe difficulty breathing or resting breathlessness</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={fever}
                      onChange={e => setFever(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Body temperature elevated above 101.5°F</span>
                  </label>
                </div>
              </div>

              {/* Pain Scale Slider */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label">Pain Severity: <strong>{painLevel} / 10</strong></label>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
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
                  type="range"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={e => setPainLevel(Number(e.target.value))}
                  style={{ width: '100%', accentColor: painLevel >= 8 ? 'var(--danger)' : 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-primary"
                >
                  Continue to Advisory Assessment <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Automated Urgency Assessment</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 2 of 3 · AI Rule Engine</div>
                </div>
              </div>

              {/* Urgency Highlight Banner */}
              <div style={{
                padding: '24px',
                borderRadius: '16px',
                backgroundColor: advisory.score === 'EMERGENCY' ? 'rgba(192, 57, 43, 0.08)' : advisory.score === 'URGENT' ? 'rgba(255, 109, 57, 0.1)' : 'var(--info)',
                border: `1px solid ${advisory.score === 'EMERGENCY' ? 'rgba(192, 57, 43, 0.25)' : advisory.score === 'URGENT' ? 'rgba(255, 109, 57, 0.25)' : 'var(--border)'}`,
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Triage Status:</span>
                    <span className={`badge-urgency-${advisory.score.toLowerCase()}-warm`}>
                      {advisory.score}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Version: 2.1</span>
                </div>
                <p style={{
                  fontSize: '15px',
                  color: advisory.score === 'EMERGENCY' ? 'var(--danger)' : advisory.score === 'URGENT' ? 'var(--accent-warm)' : 'var(--ink)',
                  lineHeight: '1.6',
                }}>
                  {advisory.reason}
                </p>
              </div>

              <div style={{
                backgroundColor: 'var(--canvas)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '28px',
                fontSize: '14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '10px' }}>Reported Clinical Summary:</div>
                <ul style={{ paddingLeft: '20px', color: 'var(--muted)', lineHeight: '1.8' }}>
                  <li>Primary concern: <em>"{chiefComplaint}"</em></li>
                  <li>Symptoms flagged: {selectedSymptoms.join(', ') || 'None selected'}</li>
                  <li>Pain index: {painLevel} / 10 | Duration: {durationDays} day(s)</li>
                  <li>Cardiopulmonary alert: {chestPain ? 'POSITIVE (Emergency Attention Recommended)' : 'Negative'}</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary"
                >
                  Back to Symptoms
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn btn-primary"
                >
                  Select Doctor & Slot <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteBooking}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Calendar size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Select Doctor & Consultation Mode</h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Step 3 of 3 · Finalize Booking</div>
                </div>
              </div>

              {/* Consultation Type Selector */}
              <div className="form-group">
                <label className="form-label">Consultation Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setConsultationType('VIDEO')}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: consultationType === 'VIDEO' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: consultationType === 'VIDEO' ? 'var(--info)' : 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Video size={24} color={consultationType === 'VIDEO' ? 'var(--primary)' : 'var(--muted)'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>Telehealth Video</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Encrypted Daily.co Call</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultationType('IN_PERSON')}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: consultationType === 'IN_PERSON' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: consultationType === 'IN_PERSON' ? 'var(--info)' : 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <MapPin size={24} color={consultationType === 'IN_PERSON' ? 'var(--primary)' : 'var(--muted)'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>In-Person Clinic</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Hospital Facility Visit</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Doctor Selection */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Available Clinicians</label>
                <div style={{ display: 'grid', gap: '12px', marginTop: '6px' }}>
                  {doctors.map(doc => {
                    const active = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '16px',
                          border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? 'var(--info)' : 'var(--surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={doc.avatar}
                            alt={doc.name}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{doc.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                              {doc.specialty} · {doc.hospital}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '13px' }}>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>★ {doc.rating}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{doc.slots.length} slots today</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slots Pill Selector */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Select Slot Time</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                  {selectedDoctor.slots.map(slot => {
                    const active = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '9999px',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                          color: active ? '#ffffff' : 'var(--ink)',
                          fontWeight: active ? 600 : 400,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Confirm & Schedule Visit
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Real-Time Board Right (20px radius card, warm shadow) */}
        <div>
          <div className="card" style={{ padding: '28px', position: 'sticky', top: '96px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Triage Live Summary</h3>
              </div>
              <span className={`badge-urgency-${advisory.score.toLowerCase()}-warm`}>
                {advisory.score}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div className="text-caption" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Clinical Rationale:
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
                {advisory.reason}
              </p>
            </div>

            {advisory.score === 'EMERGENCY' && (
              <div style={{
                backgroundColor: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid rgba(192, 57, 43, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '13px',
                color: 'var(--danger)',
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
              }}>
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>High Urgency Alert:</strong> Cardiopulmonary indicators detected. Call 911/112 or proceed immediately to nearest emergency room.
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--canvas)',
              borderRadius: '14px',
              padding: '16px',
              display: 'grid',
              gap: '10px',
              fontSize: '13px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Attending Doctor:</span>
                <strong>{selectedDoctor.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Facility:</span>
                <span>{selectedDoctor.hospital}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Mode:</span>
                <span>{consultationType === 'VIDEO' ? 'Telehealth Video' : 'In-Person Hospital'}</span>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: 'var(--info)',
              borderRadius: '10px',
              fontSize: '12px',
              color: 'var(--ink)',
              lineHeight: '1.5',
            }}>
              <strong>Immutable Audit (DR-11):</strong> Pre-visit symptom assessments are cryptographically verified and recorded.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
