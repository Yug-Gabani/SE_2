import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  MapPin,
  FileText,
  Pill,
  ArrowRight,
  Calendar,
  Clock,
  PlusCircle,
  Package,
  Loader2,
} from 'lucide-react';
import type { Appointment, User } from '../types';
import { appointmentsApi } from '../services/api';

interface PatientDashboardProps {
  currentUser: User;
}

function formatSlot(iso?: string): string {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

function timeUntil(iso?: string): string | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'starts now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const firstName = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'there';
  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    appointmentsApi
      .mine()
      .then(setAppointments)
      .catch(err => setError(err.message || 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(a => a.status === 'BOOKED' || a.status === 'CONFIRMED')
        .sort((a, b) => (a.slotAt && b.slotAt ? a.slotAt.localeCompare(b.slotAt) : 0)),
    [appointments]
  );

  const next = upcoming[0] ?? null;

  const userTodos = useMemo(() => {
    const base = [
      { id: 101, text: 'Complete your medical history profile', completed: false },
      { id: 102, text: 'Verify emergency contact & phone number', completed: !!currentUser?.phone },
      { id: 103, text: 'Book your first consultation via AI Triage', completed: appointments.length > 0 },
    ];
    return base;
  }, [currentUser?.phone, appointments.length]);

  return (
    <div style={{
      maxWidth: '1200px', margin: '0 auto',
      padding: '40px 24px 64px 24px', color: '#1a110a',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    }}>
      <section style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1a110a', margin: 0, letterSpacing: '-0.025em' }}>
          {greetingTime}, {firstName}
        </h1>
        <p style={{ fontSize: '16px', color: '#706b63', margin: '6px 0 0 0' }}>
          Welcome back. Manage your consultations and health records from one place.
        </p>
      </section>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          color: '#dc2626', fontSize: '14px', marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px', marginBottom: '48px',
      }}>
        {loading ? (
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px 26px',
            border: '1px solid #eae3d8', minHeight: '210px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#706b63',
          }}>
            <Loader2 size={20} className="animate-spin" style={{ marginRight: 8 }} />
            Loading your next appointment…
          </div>
        ) : next ? (
          <div style={{
            backgroundColor: '#785b47', color: '#ffffff', borderRadius: '20px',
            padding: '28px 26px', boxShadow: '0 8px 24px rgba(120, 91, 71, 0.22)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '210px', position: 'relative',
          }}>
            <div>
              <div style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '10px',
              }}>
                Next Appointment
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                {next.doctorName}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
                {next.doctorSpecialty}{next.doctorHospital ? ` · ${next.doctorHospital}` : ''}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '13px', fontWeight: 500,
                paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                <span>{formatSlot(next.slotAt)}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{timeUntil(next.slotAt) ?? ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => navigate(`/appointments/${next.id}`)}
                style={{
                  backgroundColor: '#ffffff', color: '#785b47', border: 'none',
                  borderRadius: '9999px', padding: '9px 24px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}
              >
                {next.consultationType === 'VIDEO' ? <Video size={14} /> : <MapPin size={14} />}
                View Details
              </button>
              <span style={{
                padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                backgroundColor: next.urgency === 'EMERGENCY' ? '#ef4444' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
              }}>
                {next.urgency}
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px 26px',
            border: '1.5px dashed #d5cec4',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '210px',
          }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#8c857b', marginBottom: '10px',
              }}>
                <Calendar size={13} color="#785b47" />
                Next Appointment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a', marginBottom: '6px' }}>
                No appointments scheduled
              </div>
              <p style={{ fontSize: '13px', color: '#706b63', margin: 0, lineHeight: 1.5 }}>
                Start with a short triage questionnaire — we classify urgency and recommend a specialty.
              </p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => navigate('/book')}
                style={{
                  backgroundColor: '#785b47', color: '#ffffff', border: 'none',
                  borderRadius: '9999px', padding: '9px 20px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                <PlusCircle size={14} /> Start Triage & Book
              </button>
            </div>
          </div>
        )}

        {/* To-Do Card */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
          border: '1px solid #eae3d8', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8c857b', marginBottom: '16px',
            }}>
              To-Do List
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {userTodos.map(todo => (
                <div key={todo.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  fontSize: '14px',
                  color: todo.completed ? '#a8a29e' : '#2b2621',
                  textDecoration: todo.completed ? 'line-through' : 'none',
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: todo.completed ? '2px solid #785b47' : '1.5px solid #b8b0a5',
                    backgroundColor: todo.completed ? '#785b47' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {todo.completed && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span>{todo.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
          border: '1px solid #eae3d8', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8c857b', marginBottom: '16px',
            }}>
              Quick Stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Upcoming visits</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                  {upcoming.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Total consultations</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                  {appointments.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Active prescriptions</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a110a', marginBottom: '20px', letterSpacing: '-0.02em' }}>
          Quick actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}>
          {[
            { label: 'Book consultation', icon: <PlusCircle size={18} />, action: () => navigate('/book') },
            { label: 'My appointments', icon: <Calendar size={18} />, action: () => navigate('/appointments') },
            { label: 'My records', icon: <FileText size={18} />, action: () => alert('Medical records coming soon.') },
            { label: 'Order meds', icon: <Pill size={18} />, action: () => alert('Pharmacy ordering coming soon.') },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              style={{
                backgroundColor: '#ffffff', border: '1px solid #eae3d8',
                borderRadius: '9999px', padding: '14px 22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', fontSize: '14px', fontWeight: 600, color: '#3a342e',
                cursor: 'pointer', boxShadow: '0 2px 6px rgba(75, 68, 57, 0.04)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#785b47';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#eae3d8';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ color: '#785b47' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Upcoming list */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a110a', margin: 0, letterSpacing: '-0.02em' }}>
            Upcoming appointments
          </h2>
          {upcoming.length > 0 && (
            <button
              onClick={() => navigate('/appointments')}
              style={{
                background: 'none', border: 'none', color: '#0284c7',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              View all →
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#706b63' }}>
            <Loader2 size={20} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
            Loading…
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '36px 28px',
            border: '1px solid #eae3d8', textAlign: 'center',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: '#f5efe6', color: '#785b47',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a110a', margin: '0 0 6px 0' }}>
              No upcoming appointments
            </h3>
            <p style={{ fontSize: '13px', color: '#706b63', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Run a quick symptom triage and book a specialist in under two minutes.
            </p>
            <button
              onClick={() => navigate('/book')}
              style={{
                backgroundColor: '#785b47', color: '#ffffff', border: 'none',
                borderRadius: '9999px', padding: '10px 24px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Start Triage & Booking
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}>
            {upcoming.slice(0, 6).map(appt => (
              <div
                key={appt.id}
                style={{
                  backgroundColor: '#ffffff', borderRadius: '18px', padding: '22px',
                  border: '1px solid #eae3d8', boxShadow: '0 4px 12px rgba(75, 68, 57, 0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: '190px',
                }}
              >
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a110a' }}>
                    {appt.doctorName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px' }}>
                    {appt.doctorSpecialty}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '16px', fontSize: '13px', color: '#443f38',
                  }}>
                    <span style={{ fontWeight: 600 }}>{formatSlot(appt.slotAt)}</span>
                    <span style={{ color: '#706b63' }}>
                      {appt.consultationType === 'VIDEO' ? 'Video' : 'In-person'}
                    </span>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: '11px', fontWeight: 700,
                      padding: '3px 10px', borderRadius: '9999px',
                      color: appt.urgency === 'EMERGENCY' ? '#dc2626' : appt.urgency === 'URGENT' ? '#d97706' : '#059669',
                      backgroundColor: appt.urgency === 'EMERGENCY' ? 'rgba(220,38,38,0.08)' : appt.urgency === 'URGENT' ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.08)',
                    }}>
                      {appt.urgency}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    style={{
                      width: '100%', backgroundColor: 'transparent',
                      border: '1px solid #dcd4c7', borderRadius: '9999px',
                      padding: '8px 0', fontSize: '13px', fontWeight: 600,
                      color: '#2c251f', cursor: 'pointer',
                    }}
                  >
                    Open details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Placeholders */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px', marginBottom: '48px',
      }}>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
          border: '1px solid #eae3d8',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a110a', marginBottom: '14px' }}>
            Active prescriptions
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Pill size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#443f38' }}>
              No active prescriptions
            </div>
            <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '4px', lineHeight: 1.4 }}>
              Prescriptions issued during a consult will appear here.
            </div>
          </div>
        </div>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
          border: '1px solid #eae3d8',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a110a', marginBottom: '14px' }}>
            Medication reminders
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Clock size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#443f38' }}>
              Nothing scheduled
            </div>
            <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '4px', lineHeight: 1.4 }}>
              Reminders activate once a treatment course is prescribed.
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a110a', margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>
          Active orders
        </h2>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
          border: '1px solid #eae3d8', textAlign: 'center',
        }}>
          <Package size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c251f' }}>
            No active pharmacy orders
          </div>
          <p style={{ fontSize: '13px', color: '#7a736a', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Pharmacy ordering goes live in a later sprint.
          </p>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a110a', margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>
          Recent notifications
        </h2>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px',
          border: '1px solid #eae3d8', overflow: 'hidden',
        }}>
          {[
            { text: `Welcome to PulseCare, ${firstName}!`, time: 'Just now' },
            { text: 'Your account is secured with JWT + refresh token rotation.', time: 'Today' },
            { text: 'AI triage and specialist booking are live.', time: 'Today' },
          ].map((notif, idx, arr) => (
            <div
              key={idx}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px',
                borderBottom: idx !== arr.length - 1 ? '1px solid #f2ece2' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#785b47' }} />
                <span style={{ fontSize: '14px', color: '#2b2520' }}>{notif.text}</span>
                <span style={{ fontSize: '12px', color: '#8c857b' }}>· {notif.time}</span>
              </div>
              <ArrowRight size={15} color="#8c857b" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
