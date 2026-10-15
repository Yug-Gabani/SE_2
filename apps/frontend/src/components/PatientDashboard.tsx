import React, { useState, useEffect } from 'react';
import {
  Video,
  MapPin,
  FileText,
  Pill,
  ArrowRight,
  MoreHorizontal,
  Calendar,
  Clock,
  PlusCircle,
  Package,
} from 'lucide-react';

import type { User, TriageAssessment } from '../types';

interface PatientDashboardProps {
  currentUser?: User | null;
  cases?: TriageAssessment[];
  onBookVideo?: () => void;
  onOpenRecords?: () => void;
  onHospitalSearch?: () => void;
  onOrderMeds?: () => void;
  onJoinCall?: () => void;
}

// Identify the 1-2 designated demo / testing accounts
const isDemoPatient = (user?: User | null): boolean => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.fullName || '').toLowerCase().trim();
  const id = user.id || '';
  return (
    email === 'patient.test@pulsecare.com' ||
    email === 'avi.test@pulsecare.com' ||
    name === 'sarah jenkins' ||
    name === 'avi patel' ||
    id === 'demo-patient-uuid' ||
    id === 'guest-patient-id'
  );
};

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  currentUser,
  cases = [],
  onBookVideo,
  onOpenRecords,
  onHospitalSearch,
  onOrderMeds,
  onJoinCall,
}) => {
  const isDemo = isDemoPatient(currentUser);
  const firstName = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'there';

  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // --- DEMO USER DATA (Reserved exclusively for 1-2 testing demo accounts) ---
  const [demoTodos, setDemoTodos] = useState<TodoItem[]>([
    { id: 1, text: 'Fill questionnaire for Dr. Shah', completed: false },
    { id: 2, text: 'Confirm consent for video triage', completed: false },
    { id: 3, text: 'Pay ₹500 pending for Thu appointment', completed: false },
  ]);

  const [demoReminders, setDemoReminders] = useState([
    { id: 1, time: '8:00 AM', med: 'Amoxicillin 500mg', taken: true },
    { id: 2, time: '2:00 PM', med: 'Amoxicillin 500mg', taken: true },
    { id: 3, time: '8:00 PM', med: 'Amoxicillin 500mg', taken: false },
    { id: 4, time: '9:00 PM', med: 'Vitamin D3', taken: false },
  ]);

  // --- REGULAR USER STATE (Their own live personal data) ---
  // Retrieve any user-specific booked cases from props or localStorage
  const [userAppts, setUserAppts] = useState<TriageAssessment[]>(() => {
    if (isDemo) return [];
    const saved = localStorage.getItem(`pulsecare_appts_${currentUser?.id}`);
    const localAppts = saved ? JSON.parse(saved) : [];
    const matchedCases = cases.filter(
      c => c.patientId === currentUser?.id || (currentUser?.fullName && c.patientName.toLowerCase() === currentUser.fullName.toLowerCase())
    );
    // Combine and deduplicate by id
    const combined = [...localAppts, ...matchedCases];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique;
  });

  useEffect(() => {
    if (!isDemo && currentUser?.id) {
      const matchedCases = cases.filter(
        c => c.patientId === currentUser?.id || (currentUser?.fullName && c.patientName.toLowerCase() === currentUser.fullName.toLowerCase())
      );
      setUserAppts(prev => {
        const combined = [...prev, ...matchedCases];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
    }
  }, [cases, currentUser, isDemo]);

  // User-specific todos
  const [userTodos, setUserTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem(`pulsecare_todos_${currentUser?.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [
      { id: 101, text: 'Complete your medical history profile', completed: false },
      { id: 102, text: 'Verify emergency contact & phone number', completed: false },
      { id: 103, text: 'Schedule initial consultation or AI Triage', completed: false },
    ];
  });

  const toggleTodo = (id: number) => {
    if (isDemo) {
      setDemoTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
    } else {
      setUserTodos((prev: TodoItem[]) => {
        const next = prev.map((t: TodoItem) => (t.id === id ? { ...t, completed: !t.completed } : t));
        if (currentUser?.id) {
          localStorage.setItem(`pulsecare_todos_${currentUser.id}`, JSON.stringify(next));
        }
        return next;
      });
    }
  };

  const toggleReminder = (id: number) => {
    setDemoReminders(prev => prev.map(r => (r.id === id ? { ...r, taken: !r.taken } : r)));
  };

  const takenCount = demoReminders.filter(r => r.taken).length;
  const progressPercent = Math.round((takenCount / demoReminders.length) * 100);

  // Active user's next appointment (if any)
  const nextUserAppt = userAppts.length > 0 ? userAppts[0] : null;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px 64px 24px',
      color: '#1a110a',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    }}>
      {/* GREETING SECTION */}
      <section style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#1a110a',
          margin: 0,
          letterSpacing: '-0.025em',
        }}>
          {greetingTime}, {firstName}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#706b63',
          margin: '6px 0 0 0',
        }}>
          {isDemo
            ? "Here's what's happening with your care today."
            : "Welcome to your personal healthcare dashboard. Manage your consultations and medical records."}
        </p>
      </section>

      {/* TOP STRIP - 3 Priority Cards Side-by-Side */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        {/* Next Appointment Card */}
        {isDemo ? (
          // Demo Patient next appointment card
          <div style={{
            backgroundColor: '#785b47',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '28px 26px',
            boxShadow: '0 8px 24px rgba(120, 91, 71, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '210px',
            position: 'relative',
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.75)',
                marginBottom: '10px',
              }}>
                Next Appointment (Test Account)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                Dr. Kavita Shah
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
                Cardiologist · Apollo, Ahmedabad
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 500,
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                <span>Today · 3:00 PM</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>in 2h 14m</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '20px',
            }}>
              <button
                onClick={onJoinCall}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#785b47',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Video size={14} />
                Join Video
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                }}
                title="More options"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        ) : nextUserAppt ? (
          // Actual user's booked appointment
          <div style={{
            backgroundColor: '#785b47',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '28px 26px',
            boxShadow: '0 8px 24px rgba(120, 91, 71, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '210px',
            position: 'relative',
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.75)',
                marginBottom: '10px',
              }}>
                Upcoming Consultation
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                Specialist Consultation
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
                Complaint: {nextUserAppt.chiefComplaint}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 500,
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                <span>Status: Confirmed</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: nextUserAppt.aiAdvisoryScore === 'EMERGENCY' ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                }}>
                  {nextUserAppt.aiAdvisoryScore}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '20px',
            }}>
              <button
                onClick={onJoinCall}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#785b47',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Video size={14} />
                Join Video
              </button>
            </div>
          </div>
        ) : (
          // Regular user without booked appointment: Clean, encouraging empty state
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '28px 26px',
            border: '1.5px dashed #d5cec4',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '210px',
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8c857b',
                marginBottom: '10px',
              }}>
                <Calendar size={13} color="#785b47" />
                Next Appointment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a', marginBottom: '6px' }}>
                No appointments scheduled
              </div>
              <p style={{ fontSize: '13px', color: '#706b63', margin: 0, lineHeight: 1.5 }}>
                You have no upcoming consultations. Book a video appointment with our specialists or run smart AI triage.
              </p>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={onBookVideo}
                style={{
                  backgroundColor: '#785b47',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#644b39')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#785b47')}
              >
                <PlusCircle size={14} />
                Book Consultation
              </button>
            </div>
          </div>
        )}

        {/* To-Do Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '26px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8c857b',
              marginBottom: '16px',
            }}>
              To-Do List
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(isDemo ? demoTodos : userTodos).map((todo: TodoItem) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: todo.completed ? '#a8a29e' : '#2b2621',
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: todo.completed ? '2px solid #785b47' : '1.5px solid #b8b0a5',
                    backgroundColor: todo.completed ? '#785b47' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {todo.completed && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span>{todo.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '26px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8c857b',
              marginBottom: '16px',
            }}>
              Quick Stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Upcoming visits</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                  {isDemo ? 2 : userAppts.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Active prescriptions</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                  {isDemo ? 3 : 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#554f47' }}>Pharmacy orders</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                  {isDemo ? 1 : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS SECTION */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#1a110a',
          marginBottom: '20px',
          letterSpacing: '-0.02em',
        }}>
          Quick actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}>
          {[
            { label: 'Book video', icon: <Video size={18} />, action: onBookVideo },
            { label: 'Hospital search', icon: <MapPin size={18} />, action: onHospitalSearch },
            { label: 'My records', icon: <FileText size={18} />, action: onOpenRecords },
            { label: 'Order meds', icon: <Pill size={18} />, action: onOrderMeds },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eae3d8',
                borderRadius: '9999px',
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#3a342e',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(75, 68, 57, 0.04)',
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

      {/* UPCOMING APPOINTMENTS SECTION */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Upcoming appointments
          </h2>
          {isDemo && (
            <a
              href="#all-appts"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0284c7',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View all →
            </a>
          )}
        </div>

        {isDemo ? (
          // Demo Patient appointments grid
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}>
            {[
              {
                name: 'Dr. Kavita Shah',
                specialty: 'Cardiology · Apollo',
                slot: 'Today 3:00 PM',
                mode: 'Video',
                status: 'confirmed',
                statusColor: '#10b981',
                statusBg: '#ecfdf5',
              },
              {
                name: 'Dr. Suresh Rao',
                specialty: 'Dermatology · KD Hospital',
                slot: 'Thu 11:00 AM',
                mode: 'In-person',
                status: 'confirmed',
                statusColor: '#10b981',
                statusBg: '#ecfdf5',
              },
              {
                name: 'Dr. Neha Mehta',
                specialty: 'Pediatrics · Civil Hospital',
                slot: 'Fri 5:00 PM',
                mode: 'In-person',
                status: 'pending payment',
                statusColor: '#d97706',
                statusBg: '#fef3c7',
              },
              {
                name: 'Dr. Rajesh Iyer',
                specialty: 'General Medicine · Zydus',
                slot: 'Mon 9:00 AM',
                mode: 'Video',
                status: 'confirmed',
                statusColor: '#10b981',
                statusBg: '#ecfdf5',
              },
            ].map((appt, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '22px',
                  border: '1px solid #eae3d8',
                  boxShadow: '0 4px 12px rgba(75, 68, 57, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '190px',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                    {appt.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px' }}>
                    {appt.specialty}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    fontSize: '13px',
                    color: '#443f38',
                  }}>
                    <span style={{ fontWeight: 600 }}>{appt.slot}</span>
                    <span style={{ color: '#706b63' }}>{appt.mode}</span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      color: appt.statusColor,
                      backgroundColor: appt.statusBg,
                    }}>
                      {appt.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={onJoinCall}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: '1px solid #dcd4c7',
                      borderRadius: '9999px',
                      padding: '8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#2c251f',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#f4eee4';
                      e.currentTarget.style.borderColor = '#785b47';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#dcd4c7';
                    }}
                  >
                    Open Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : userAppts.length > 0 ? (
          // Regular user with booked appointments
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}>
            {userAppts.map((appt, idx) => (
              <div
                key={appt.id || idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '22px',
                  border: '1px solid #eae3d8',
                  boxShadow: '0 4px 12px rgba(75, 68, 57, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '190px',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                    Triage Consultation #{idx + 1}
                  </div>
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '4px' }}>
                    {appt.chiefComplaint}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    fontSize: '13px',
                    color: '#443f38',
                  }}>
                    <span style={{ fontWeight: 600 }}>Triage Severity</span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: appt.aiAdvisoryScore === 'EMERGENCY' ? '#fef2f2' : '#ecfdf5',
                      color: appt.aiAdvisoryScore === 'EMERGENCY' ? '#dc2626' : '#059669',
                    }}>
                      {appt.aiAdvisoryScore}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={onJoinCall}
                    style={{
                      width: '100%',
                      backgroundColor: '#785b47',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Record
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Regular user without booked appointments: Clean empty state
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '36px 28px',
            border: '1px solid #eae3d8',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.03)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#f5efe6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#785b47',
            }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a110a', margin: '0 0 6px 0' }}>
              No upcoming appointments found
            </h3>
            <p style={{ fontSize: '13px', color: '#706b63', margin: '0 0 20px 0', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              When you book a consultation with our verified doctors or submit an AI symptom triage, your scheduled visits will appear here.
            </p>
            <button
              onClick={onBookVideo}
              style={{
                backgroundColor: '#785b47',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#644b39')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#785b47')}
            >
              Find a Doctor / Book Visit
            </button>
          </div>
        )}
      </section>

      {/* ACTIVE CARE SPLIT - Active Prescriptions + Medication Reminders */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        {/* Active Prescriptions Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '26px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#1a110a',
              marginBottom: '18px',
            }}>
              Active prescriptions
            </div>

            {isDemo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #f2ece2',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a' }}>
                      Amoxicillin 500mg · 3×/d
                    </div>
                    <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '2px' }}>
                      Dr. Shah · 5 days left
                    </div>
                  </div>
                  <button
                    onClick={onOrderMeds}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #dcd4c7',
                      borderRadius: '9999px',
                      padding: '6px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2b2520',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#785b47')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#dcd4c7')}
                  >
                    Order
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a' }}>
                      Vitamin D3 · 1×/d
                    </div>
                    <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '2px' }}>
                      Dr. Rao · 25 days left
                    </div>
                  </div>
                  <button
                    onClick={onOrderMeds}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #dcd4c7',
                      borderRadius: '9999px',
                      padding: '6px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2b2520',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#785b47')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#dcd4c7')}
                  >
                    Order
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Pill size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#443f38' }}>
                  No active prescriptions
                </div>
                <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '4px', lineHeight: 1.4 }}>
                  Digital prescriptions issued by doctors during consultations will be safely cataloged here.
                </div>
              </div>
            )}
          </div>

          {isDemo && (
            <div style={{ marginTop: '24px' }}>
              <a
                href="#prescriptions"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0284c7',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                View all prescriptions →
              </a>
            </div>
          )}
        </div>

        {/* Medication Reminders Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '26px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#1a110a',
              marginBottom: '18px',
            }}>
              Medication reminders today
            </div>

            {isDemo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {demoReminders.map(rem => (
                  <div
                    key={rem.id}
                    onClick={() => toggleReminder(rem.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '13px',
                      color: '#2c2621',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      backgroundColor: rem.taken ? '#785b47' : 'transparent',
                      border: rem.taken ? '1.5px solid #785b47' : '1.5px solid #b8b0a5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      {rem.taken && '✓'}
                    </div>
                    <span style={{ fontWeight: 600, width: '68px', color: '#554f47' }}>{rem.time}</span>
                    <span style={{ color: rem.taken ? '#9c958c' : '#1a110a', textDecoration: rem.taken ? 'line-through' : 'none' }}>
                      {rem.med}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Clock size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#443f38' }}>
                  No medication reminders set
                </div>
                <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '4px', lineHeight: 1.4 }}>
                  Automated dosage reminders will show up once a treatment course is prescribed.
                </div>
              </div>
            )}
          </div>

          {isDemo && (
            <div style={{ marginTop: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#706b63',
                marginBottom: '6px',
              }}>
                <span>{takenCount} of {demoReminders.length} taken</span>
                <span style={{ fontWeight: 600, color: '#1a110a' }}>{progressPercent}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#eae3d8',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#785b47',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ACTIVE ORDERS SECTION */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Active orders
          </h2>
          {isDemo && (
            <a
              href="#all-orders"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0284c7',
                textDecoration: 'none',
              }}
            >
              View all →
            </a>
          )}
        </div>

        {isDemo ? (
          // Demo Patient active order
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px 28px',
            border: '1px solid #eae3d8',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '28px',
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a110a' }}>
                Order #PC-2847 · MedPlus Vastrapur
              </div>
              <div style={{ fontSize: '13px', color: '#7a736a' }}>
                3 items · ₹650 · placed 2h ago
              </div>
            </div>

            {/* Stepper Timeline */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '720px',
              margin: '0 auto 28px auto',
              padding: '0 10px',
            }}>
              <div style={{
                position: 'absolute',
                top: '7px',
                left: '20px',
                right: '20px',
                height: '2px',
                backgroundColor: '#e6ded3',
                zIndex: 1,
              }} />
              <div style={{
                position: 'absolute',
                top: '7px',
                left: '20px',
                width: '50%',
                height: '2px',
                backgroundColor: '#785b47',
                zIndex: 2,
              }} />

              {[
                { label: 'Placed', done: true },
                { label: 'Verified', done: true },
                { label: 'Packed', done: true },
                { label: 'Shipped', done: false },
                { label: 'Delivered', done: false },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    zIndex: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: step.done ? '#785b47' : '#ffffff',
                    border: step.done ? '3px solid #785b47' : '2px solid #b8b0a5',
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: step.done ? 600 : 400,
                    color: step.done ? '#2b2520' : '#8c857b',
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #f2ece2',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#3c352d' }}>
                ETA tomorrow by 10 AM
              </div>
              <button
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #dcd4c7',
                  borderRadius: '9999px',
                  padding: '6px 20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2b2520',
                  cursor: 'pointer',
                }}
              >
                Track
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid #eae3d8',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.03)',
          }}>
            <Package size={24} color="#b8b0a5" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c251f' }}>
              No active pharmacy orders
            </div>
            <p style={{ fontSize: '13px', color: '#7a736a', margin: '4px 0 16px 0', lineHeight: 1.5 }}>
              Order genuine prescription medications with 1-click home delivery through partner pharmacies.
            </p>
            <button
              onClick={onOrderMeds}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dcd4c7',
                borderRadius: '9999px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#785b47',
                cursor: 'pointer',
              }}
            >
              Order Medicine
            </button>
          </div>
        )}
      </section>

      {/* RECENT NOTIFICATIONS SECTION */}
      <section>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Recent notifications
          </h2>
          <a
            href="#all-notifications"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0284c7',
              textDecoration: 'none',
            }}
          >
            View all →
          </a>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
          overflow: 'hidden',
        }}>
          {(isDemo ? [
            { text: 'Appointment confirmed with Dr. Shah', time: '2m ago' },
            { text: 'Order PC-2847 verified by pharmacy', time: '15m ago' },
            { text: 'Reminder: take Amoxicillin at 2 PM', time: '1h ago' },
            { text: 'Dr. Rao issued a new prescription', time: 'yesterday' },
            { text: 'Payment of ₹500 received', time: 'yesterday' },
          ] : [
            { text: `Welcome to PulseCare portal, ${firstName}!`, time: 'Just now' },
            { text: 'Your patient account is secured with end-to-end encryption under HIPAA standards.', time: 'Today' },
            { text: 'AI Triage & specialist consultations are ready for booking.', time: 'Today' },
          ]).map((notif, idx, arr) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: idx !== arr.length - 1 ? '1px solid #f2ece2' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#faf6f0')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#785b47',
                }} />
                <span style={{ fontSize: '14px', color: '#2b2520' }}>
                  {notif.text}
                </span>
                <span style={{ fontSize: '12px', color: '#8c857b' }}>
                  · {notif.time}
                </span>
              </div>
              <ArrowRight size={15} color="#8c857b" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
