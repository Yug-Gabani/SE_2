import React from 'react';
import { Calendar, Clock, MapPin, Video, FileText } from 'lucide-react';
import type { Doctor, TriageAssessment } from '../types';

interface MyAppointmentsProps {
  cases: TriageAssessment[];
  doctors: Doctor[];
  onBookNew: () => void;
  onExplainTriage: () => void;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({
  cases,
  doctors,
  onBookNew,
  onExplainTriage,
}) => {
  return (
    <div style={{ maxWidth: '1000px', margin: '48px auto', padding: '0 24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '36px',
      }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            My Consultations & Care Plan
          </h1>
          <p className="text-body" style={{ color: 'var(--muted)' }}>
            Track your appointment details, clinical triage categories, and attending physician notes.
          </p>
        </div>
        <button
          onClick={onBookNew}
          className="btn btn-primary"
        >
          <Calendar size={16} />
          Book New Consultation
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--info)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Calendar size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Consultations Scheduled</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
            Complete an intake to book an appointment with our specialist physicians.
          </p>
          <button
            onClick={onBookNew}
            className="btn btn-primary"
          >
            Start Triage Intake
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {cases.map(c => {
            const doc = doctors.find(d => d.id === c.selectedDoctorId) || doctors[0];
            const finalScore = c.doctorConfirmedScore || c.aiAdvisoryScore;

            return (
              <div key={c.id} className="card" style={{ padding: '28px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '20px',
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>{doc.name}</h2>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        {doc.specialty} · {doc.hospital}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={onExplainTriage}
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
                    >
                      Explain Triage ↗
                    </button>
                    <span className={`badge-urgency-${finalScore.toLowerCase()}-warm`}>
                      {finalScore}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  backgroundColor: 'var(--canvas)',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--primary)" />
                    <span><strong>Slot:</strong> {c.appointmentTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {c.consultationType === 'VIDEO' ? (
                      <Video size={16} color="var(--primary)" />
                    ) : (
                      <MapPin size={16} color="var(--primary)" />
                    )}
                    <span><strong>Mode:</strong> {c.consultationType === 'VIDEO' ? 'Telehealth Video Call' : 'In-Person Hospital Visit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="var(--primary)" />
                    <span><strong>Case Reference:</strong> {c.id}</span>
                  </div>
                </div>

                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--ink)' }}>
                  <strong>Reported Concern:</strong> {c.chiefComplaint}
                </div>

                {c.doctorNotes && (
                  <div style={{
                    backgroundColor: 'rgba(50, 138, 59, 0.08)',
                    border: '1px solid rgba(50, 138, 59, 0.2)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '14px',
                    color: 'var(--success)',
                  }}>
                    <strong>Attending Doctor's Notes:</strong> {c.doctorNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
