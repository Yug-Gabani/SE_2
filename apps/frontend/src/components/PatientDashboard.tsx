import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '../motion/PageTransition';
import { listItem, staggerContainer } from '../motion/presets';
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
import type { Appointment, Prescription, User } from '../types';
import { appointmentsApi, prescriptionsApi } from '../services/api';

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
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([appointmentsApi.mine(), prescriptionsApi.mine()])
      .then(([appts, rx]) => {
        setAppointments(appts);
        setPrescriptions(rx);
      })
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const signedPrescriptions = useMemo(
    () => prescriptions.filter(r => r.status === 'SIGNED'),
    [prescriptions]
  );

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
    <PageTransition style={{
      maxWidth: '1200px', margin: '0 auto',
      padding: '40px 24px 64px 24px', color: '#0b3f3a',
      fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    }}>
      <section style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0b3f3a', margin: 0, letterSpacing: '-0.025em' }}>
          {greetingTime}, {firstName}
        </h1>
        <p style={{ fontSize: '16px', color: '#52736d', margin: '6px 0 0 0' }}>
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

      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px', marginBottom: '48px',
        }}
      >
        {loading ? (
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px 26px',
            border: '1px solid #d9ece7', minHeight: '210px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#52736d',
          }}>
            <Loader2 size={20} className="animate-spin" style={{ marginRight: 8 }} />
            Loading your next appointment…
          </div>
        ) : next ? (
          <motion.div
            variants={listItem}
            className="card-hover card-dark"
            style={{
              backgroundColor: '#0f766e', color: '#ffffff', borderRadius: '20px',
              padding: '28px 26px', boxShadow: '0 8px 24px rgba(15, 118, 110, 0.22)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: '210px', position: 'relative',
            }}
          >
            <div>
              <div style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '10px',
              }}>
                Next Appointment
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                {next.doctorName}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.88)', marginBottom: '14px' }}>
                {next.doctorSpecialty}{next.doctorHospital ? ` · ${next.doctorHospital}` : ''}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '13px', fontWeight: 500,
                paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              }}>
                <span>{formatSlot(next.slotAt)}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{timeUntil(next.slotAt) ?? ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => navigate(`/appointments/${next.id}`)}
                className="hover-lift"
                style={{
                  backgroundColor: '#ffffff', color: '#0f766e', border: 'none',
                  borderRadius: '9999px', padding: '9px 24px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}
              >
                {next.consultationType === 'VIDEO' ? <Video size={14} /> : <MapPin size={14} />}
                View Details
              </button>
              <span className="badge-morph" style={{
                padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                backgroundColor: next.urgency === 'EMERGENCY' ? '#ef4444' : 'rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}>
                {next.urgency}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={listItem}
            className="card-hover"
            style={{
              backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px 26px',
              border: '1.5px dashed #c2e2db',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: '210px',
            }}
          >
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#8aa39d', marginBottom: '10px',
              }}>
                <Calendar size={13} color="#0f766e" />
                Next Appointment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0b3f3a', marginBottom: '6px' }}>
                No appointments scheduled
              </div>
              <p style={{ fontSize: '13px', color: '#52736d', margin: 0, lineHeight: 1.5 }}>
                Start with a short triage questionnaire — we classify urgency and recommend a specialty.
              </p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => navigate('/book')}
                style={{
                  backgroundColor: '#0f766e', color: '#ffffff', border: 'none',
                  borderRadius: '9999px', padding: '9px 20px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                <PlusCircle size={14} /> Start Triage & Book
              </button>
            </div>
          </motion.div>
        )}

        {/* To-Do Card */}
        <motion.div
          variants={listItem}
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
            border: '1px solid #d9ece7', boxShadow: '0 4px 16px rgba(20, 60, 55, 0.05)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8aa39d', marginBottom: '16px',
            }}>
              To-Do List
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {userTodos.map(todo => (
                <div key={todo.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  fontSize: '14px',
                  color: todo.completed ? '#8aa39d' : '#0b3f3a',
                  textDecoration: todo.completed ? 'line-through' : 'none',
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: todo.completed ? '2px solid #0f766e' : '1.5px solid #d9ece7',
                    backgroundColor: todo.completed ? '#0f766e' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {todo.completed && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span>{todo.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          variants={listItem}
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
            border: '1px solid #d9ece7', boxShadow: '0 4px 16px rgba(20, 60, 55, 0.05)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#8aa39d', marginBottom: '16px',
            }}>
              Quick Stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#52736d' }}>Upcoming visits</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0b3f3a' }}>
                  {upcoming.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#52736d' }}>Total consultations</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0b3f3a' }}>
                  {appointments.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#52736d' }}>Active prescriptions</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0b3f3a' }}>
                  {signedPrescriptions.length}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Quick actions */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0b3f3a', marginBottom: '20px', letterSpacing: '-0.02em' }}>
          Quick actions
        </h2>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { label: 'Book consultation', icon: <PlusCircle size={18} />, action: () => navigate('/book') },
            { label: 'My appointments', icon: <Calendar size={18} />, action: () => navigate('/appointments') },
            { label: 'My prescriptions', icon: <FileText size={18} />, action: () => navigate('/prescriptions') },
            { label: 'Order meds', icon: <Pill size={18} />, action: () => alert('Pharmacy ordering coming soon.') },
          ].map((item, idx) => (
            <motion.button
              key={idx}
              variants={listItem}
              onClick={item.action}
              className="card-hover hover-lift"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #d9ece7',
                borderRadius: '9999px', padding: '14px 22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', fontSize: '14px', fontWeight: 600, color: '#0b3f3a',
                cursor: 'pointer', boxShadow: '0 2px 6px rgba(20, 60, 55, 0.04)',
              }}
            >
              <span style={{ color: '#0f766e' }}>{item.icon}</span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Upcoming list */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0b3f3a', margin: 0, letterSpacing: '-0.02em' }}>
            Upcoming appointments
          </h2>
          {upcoming.length > 0 && (
            <button
              onClick={() => navigate('/appointments')}
              style={{
                background: 'none', border: 'none', color: '#0f766e',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              View all →
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#52736d' }}>
            <Loader2 size={20} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
            Loading…
          </div>
        ) : upcoming.length === 0 ? (
          <div
            className="card-hover"
            style={{
              backgroundColor: '#ffffff', borderRadius: '20px', padding: '36px 28px',
              border: '1px solid #d9ece7', textAlign: 'center',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: '#eaf6f2', color: '#0f766e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0b3f3a', margin: '0 0 6px 0' }}>
              No upcoming appointments
            </h3>
            <p style={{ fontSize: '13px', color: '#52736d', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Run a quick symptom triage and book a specialist in under two minutes.
            </p>
            <button
              onClick={() => navigate('/book')}
              className="hover-lift"
              style={{
                backgroundColor: '#0f766e', color: '#ffffff', border: 'none',
                borderRadius: '9999px', padding: '10px 24px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Start Triage & Booking
            </button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {upcoming.slice(0, 6).map(appt => (
              <motion.div
                key={appt.id}
                variants={listItem}
                className="card-hover"
                style={{
                  backgroundColor: '#ffffff', borderRadius: '18px', padding: '22px',
                  border: '1px solid #d9ece7', boxShadow: '0 4px 12px rgba(20, 60, 55, 0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: '190px',
                }}
              >
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#0b3f3a' }}>
                    {appt.doctorName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#52736d', marginTop: '2px' }}>
                    {appt.doctorSpecialty}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '16px', fontSize: '13px', color: '#52736d',
                  }}>
                    <span style={{ fontWeight: 600, color: '#0b3f3a' }}>{formatSlot(appt.slotAt)}</span>
                    <span style={{ color: '#8aa39d' }}>
                      {appt.consultationType === 'VIDEO' ? 'Video' : 'In-person'}
                    </span>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <span
                      className="badge-morph"
                      style={{
                        display: 'inline-block', fontSize: '11px', fontWeight: 700,
                        padding: '3px 10px', borderRadius: '9999px',
                        color: appt.urgency === 'EMERGENCY' ? '#dc2626' : appt.urgency === 'URGENT' ? '#d97706' : '#0f766e',
                        backgroundColor: appt.urgency === 'EMERGENCY' ? 'rgba(220,38,38,0.08)' : appt.urgency === 'URGENT' ? 'rgba(217,119,6,0.1)' : 'rgba(15,118,110,0.1)',
                      }}
                    >
                      {appt.urgency}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className="hover-lift"
                    style={{
                      width: '100%', backgroundColor: 'transparent',
                      border: '1px solid #d9ece7', borderRadius: '9999px',
                      padding: '8px 0', fontSize: '13px', fontWeight: 600,
                      color: '#0b3f3a', cursor: 'pointer',
                    }}
                  >
                    Open details
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Placeholders */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px', marginBottom: '48px',
      }}>
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
            border: '1px solid #d9ece7',
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0b3f3a' }}>
              Active prescriptions
            </div>
            {signedPrescriptions.length > 0 && (
              <button
                onClick={() => navigate('/prescriptions')}
                style={{
                  background: 'none', border: 'none', color: '#0f766e',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                View all →
              </button>
            )}
          </div>
          {signedPrescriptions.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <Pill size={24} color="#8aa39d" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0b3f3a' }}>
                No active prescriptions
              </div>
              <div style={{ fontSize: '12px', color: '#52736d', marginTop: '4px', lineHeight: 1.4 }}>
                Prescriptions issued during a consult will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {signedPrescriptions.slice(0, 3).map(rx => (
                <div key={rx.id} style={{
                  padding: '10px 12px', borderRadius: '12px',
                  backgroundColor: '#eaf6f2', border: '1px solid #d9ece7',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0b3f3a' }}>
                      {rx.doctorName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#52736d' }}>
                      {rx.items.length} medication{rx.items.length === 1 ? '' : 's'}
                      {rx.signedAt ? ` · ${new Date(rx.signedAt).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/prescriptions')}
                    className="hover-lift"
                    style={{
                      background: 'transparent', border: '1px solid #d9ece7',
                      color: '#0b3f3a', borderRadius: '9999px',
                      padding: '5px 14px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '26px',
            border: '1px solid #d9ece7',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0b3f3a', marginBottom: '14px' }}>
            Medication reminders
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Clock size={24} color="#8aa39d" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0b3f3a' }}>
              Nothing scheduled
            </div>
            <div style={{ fontSize: '12px', color: '#52736d', marginTop: '4px', lineHeight: 1.4 }}>
              Reminders activate once a treatment course is prescribed.
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0b3f3a', margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>
          Active orders
        </h2>
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
            border: '1px solid #d9ece7', textAlign: 'center',
          }}
        >
          <Package size={24} color="#8aa39d" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0b3f3a' }}>
            No active pharmacy orders
          </div>
          <p style={{ fontSize: '13px', color: '#52736d', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Pharmacy ordering goes live in a later sprint.
          </p>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0b3f3a', margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>
          Recent notifications
        </h2>
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff', borderRadius: '20px',
            border: '1px solid #d9ece7', overflow: 'hidden',
          }}
        >
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
                borderBottom: idx !== arr.length - 1 ? '1px solid #d9ece7' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0f766e' }} />
                <span style={{ fontSize: '14px', color: '#0b3f3a' }}>{notif.text}</span>
                <span style={{ fontSize: '12px', color: '#8aa39d' }}>· {notif.time}</span>
              </div>
              <ArrowRight size={15} color="#8aa39d" />
            </div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
};
