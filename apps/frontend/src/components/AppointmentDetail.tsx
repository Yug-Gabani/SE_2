import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Video, XCircle } from 'lucide-react';
import type { Appointment } from '../types';
import { appointmentsApi } from '../services/api';

function formatSlot(iso?: string): string {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function urgencyColor(u: Appointment['urgency']): string {
  if (u === 'EMERGENCY') return '#dc2626';
  if (u === 'URGENT') return '#d97706';
  return '#059669';
}

function urgencyBg(u: Appointment['urgency']): string {
  if (u === 'EMERGENCY') return 'rgba(220, 38, 38, 0.08)';
  if (u === 'URGENT') return 'rgba(217, 119, 6, 0.1)';
  return 'rgba(5, 150, 105, 0.08)';
}

export const AppointmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    appointmentsApi
      .get(id)
      .then(setAppt)
      .catch(err => setError(err.message || 'Could not load appointment'))
      .finally(() => setLoading(false));
  }, [id]);

  const canCancel =
    appt &&
    appt.status !== 'CANCELLED' &&
    appt.status !== 'COMPLETED' &&
    appt.status !== 'NO_SHOW';

  const handleCancel = async () => {
    if (!appt) return;
    if (!confirm('Cancel this appointment? The slot will be released.')) return;
    setCancelling(true);
    try {
      const updated = await appointmentsApi.cancel(appt.id);
      setAppt(updated);
    } catch (err: any) {
      alert(err.message || 'Could not cancel this appointment.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '48px auto', padding: '0 24px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'transparent', border: 'none', color: '#785b47',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          padding: '6px 0', marginBottom: '16px',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#706b63' }}>
          <Loader2 size={24} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
          Loading…
        </div>
      )}

      {error && (
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          color: '#dc2626', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {appt && (
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            {appt.doctorAvatarUrl ? (
              <img
                src={appt.doctorAvatarUrl}
                alt={appt.doctorName ?? ''}
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: '#f5efe6', color: '#785b47',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '20px',
              }}>
                {(appt.doctorName ?? 'Dr').split(' ').map(s => s[0]).join('').slice(0, 2)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                {appt.doctorName}
              </h1>
              <div style={{ color: '#706b63', fontSize: '14px' }}>
                {appt.doctorSpecialty} · {appt.doctorHospital}
              </div>
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
              color: urgencyColor(appt.urgency), backgroundColor: urgencyBg(appt.urgency),
            }}>{appt.urgency}</span>
          </div>

          <div style={{
            display: 'grid', gap: '12px',
            backgroundColor: '#faf7f1', borderRadius: '14px',
            padding: '18px 20px', border: '1px solid #eae3d8',
            fontSize: '14px', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color="#785b47" />
              <span><strong>Date:</strong> {formatSlot(appt.slotAt)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {appt.consultationType === 'VIDEO' ? (
                <Video size={16} color="#785b47" />
              ) : (
                <MapPin size={16} color="#785b47" />
              )}
              <span><strong>Mode:</strong> {appt.consultationType === 'VIDEO' ? 'Encrypted video consult' : 'In-person at hospital'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} color="#785b47" />
              <span><strong>Status:</strong> {appt.status}</span>
            </div>
          </div>

          {appt.chiefComplaint && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#706b63', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Reported concern
              </div>
              <div style={{ fontSize: '14px', color: '#1a110a', lineHeight: 1.6 }}>{appt.chiefComplaint}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {appt.consultationType === 'VIDEO' && appt.status !== 'CANCELLED' && (
              <button className="btn btn-primary">
                <Video size={16} /> Join Video (coming soon)
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn btn-secondary"
                style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
              >
                {cancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Cancelling…
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> Cancel appointment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
