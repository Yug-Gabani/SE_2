import React, { useState, useEffect } from 'react';
import { User, Meeting, ClinicalSummary, Appointment } from '../types';
import { meetingApi, summaryApi, appointmentApi, transcriptApi } from '../services/api';
import { ClinicalSummaryModal } from '../components/ClinicalSummaryModal';
import {
  Video,
  PlusCircle,
  LogIn,
  FileText,
  LogOut,
  Stethoscope,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle,
  Shield,
  ArrowRight,
  UserCheck,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react';

interface DashboardPageProps {
  currentUser: User;
  onJoinMeeting: (roomCode: string) => void;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  onJoinMeeting,
  onLogout,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Today at 5:30 PM');
  const [reasonInput, setReasonInput] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Summary Modal State
  const [selectedSummary, setSelectedSummary] = useState<ClinicalSummary | null>(null);
  const [summaryRoomCode, setSummaryRoomCode] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Pending Modal State (when call hasn't happened yet)
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<Appointment | null>(null);

  const isDoctor = currentUser.role === 'DOCTOR';

  const loadData = async () => {
    try {
      const [appList, docList, meetList] = await Promise.all([
        appointmentApi.listAppointments().catch(() => []),
        appointmentApi.listDoctors().catch(() => []),
        meetingApi.listMeetings().catch(() => []),
      ]);
      setAppointments(appList);
      setDoctors(docList);
      setMeetings(meetList);
      if (docList.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docList[0].id);
      }
    } catch (e) {
      console.warn('Error loading dashboard data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dynamically refresh doctor list whenever booking modal opens
  const openBookingModal = async () => {
    setShowBookModal(true);
    try {
      const docList = await appointmentApi.listDoctors();
      setDoctors(docList);
      if (docList.length > 0) {
        if (!selectedDoctorId || !docList.some((d) => d.id === selectedDoctorId)) {
          setSelectedDoctorId(docList[0].id);
        }
      }
    } catch (e) {
      console.warn('Error refreshing doctors list:', e);
    }
  };

  // Helper to extract clean room code from text or pasted full URL
  const sanitizeRoomCode = (raw: string): string => {
    let cleaned = raw.trim();
    if (cleaned.includes('/meet/')) {
      cleaned = cleaned.split('/meet/').pop() || '';
    } else if (cleaned.includes('/')) {
      cleaned = cleaned.split('/').filter(Boolean).pop() || '';
    }
    cleaned = cleaned.replace(/^meet-/, '');
    return cleaned ? `meet-${cleaned}` : '';
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const title = meetingTitle.trim() || `${isDoctor ? 'Clinical Consultation Room' : 'Doctor Appointment Room'}`;
      const newMeeting = await meetingApi.createMeeting(title);
      onJoinMeeting(newMeeting.room_code);
    } catch (err) {
      alert('Failed to start new meeting. Make sure the backend server is running.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = sanitizeRoomCode(roomCodeInput);
    if (cleanCode) {
      onJoinMeeting(cleanCode);
    } else {
      alert('Please enter a valid room code (e.g. meet-sarah-john-consult or meet-a1b2-c3d4)');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert('Please select a doctor.');
      return;
    }
    if (!reasonInput.trim()) {
      alert('Please specify your symptoms or reason for the consultation.');
      return;
    }

    setIsBooking(true);
    try {
      const newApp = await appointmentApi.bookAppointment(
        selectedDoctorId,
        selectedTimeSlot,
        reasonInput.trim()
      );
      setShowBookModal(false);
      setReasonInput('');
      await loadData();

      if (confirm(`Appointment successfully scheduled with ${newApp.doctor_name}!\n\nRoom Code: ${newApp.room_code}\n\nWould you like to enter the video room now?`)) {
        onJoinMeeting(newApp.room_code);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to book appointment. Please check connection.');
    } finally {
      setIsBooking(false);
    }
  };

  const openSummary = async (code: string, app?: Appointment) => {
    setLoadingSummary(true);
    setSummaryRoomCode(code);
    try {
      // 1. Try to get existing generated clinical summary
      const summary = await summaryApi.getSummary(code);
      setSelectedSummary(summary);
      setShowSummaryModal(true);
    } catch (err) {
      // 2. If no summary, check if actual conversation transcripts exist from a completed call
      try {
        const transcripts = await transcriptApi.getTranscripts(code);
        if (transcripts && transcripts.length > 0) {
          const generated = await summaryApi.generateSummary(code);
          setSelectedSummary(generated);
          setShowSummaryModal(true);
          await loadData();
          return;
        }
      } catch (genErr) {
        console.warn('Transcripts check failed:', genErr);
      }

      // 3. No transcripts & no summary -> Call has not taken place yet!
      // Do NOT synthesize fake body temperature/vitals notes. Show honest pending modal.
      const targetApp = app || appointments.find((a) => a.room_code === code) || null;
      setPendingAppointment(targetApp);
      setShowPendingModal(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 10%, #172554 0%, #090d16 100%)',
      color: '#f8fafc',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2rem',
          background: 'rgba(17, 24, 39, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              padding: '10px',
              display: 'flex',
            }}>
              <Stethoscope size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                TeleMeet Portal
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Zoom / Google Meet Video Consultation & LangChain AI Scribe
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isDoctor ? '#059669' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}>
                {currentUser.full_name.charAt(0)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.full_name}</div>
                <div style={{ fontSize: '0.68rem', color: isDoctor ? '#34d399' : '#60a5fa' }}>
                  {isDoctor ? `Physician • ${currentUser.specialty || 'General'}` : 'Patient'}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Hero Banner with Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '1.25rem 1.75rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', color: '#f1f5f9' }}>
              {isDoctor
                ? `👨‍⚕️ Welcome, ${currentUser.full_name}! You have ${appointments.length} patient consultation(s) waiting.`
                : `👋 Welcome, ${currentUser.full_name}! Ready to consult with your doctor in HD video.`}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Both Doctor and Patient join the <strong>same consultation room</strong> with real-time video, transcripts, and OpenRouter AI summary notes.
            </p>
          </div>

          {!isDoctor && (
            <button
              onClick={openBookingModal}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Calendar size={18} />
              <span>Book Doctor Appointment</span>
            </button>
          )}
        </div>

        {/* Action Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}>
          {/* Card 1: Start Instant Meeting */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
            }}>
              <Video size={22} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
              Start Instant Video Call
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Launch a live Google Meet / Zoom style room immediately with microphone, camera, and LangChain medical transcription.
            </p>

            <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Consultation Title (optional)..."
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.7rem 0.9rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isCreating}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
                }}
              >
                <PlusCircle size={17} />
                <span>{isCreating ? 'Creating Room...' : 'Start New Video Call'}</span>
              </button>
            </form>
          </div>

          {/* Card 2: Join Existing Room */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.35)',
            }}>
              <LogIn size={22} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
              Join with Meeting Code
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Enter or paste the meeting code or invitation link to join your doctor or patient in the same room.
            </p>

            <form onSubmit={handleJoinWithCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                required
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="e.g. meet-sarah-john-consult or meet-a1b2-c3d4"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.7rem 0.9rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 16px rgba(59, 130, 246, 0.35)',
                }}
              >
                <ArrowRight size={17} />
                <span>Join Video Room</span>
              </button>
            </form>
          </div>
        </div>

        {/* PRIMARY SECTION: Scheduled Consultations (Shared Doctor & Patient Room) */}
        <div className="glass-panel" style={{ borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  {isDoctor ? "Today's Patient Consultations" : 'My Scheduled Doctor Appointments'}
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0' }}>
                Both you and your {isDoctor ? 'patient' : 'doctor'} enter the <strong>exact same video room</strong> when clicking Join Call.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isDoctor && (
                <button
                  onClick={openBookingModal}
                  style={{
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <PlusCircle size={14} />
                  Book New
                </button>
              )}
              <button
                onClick={loadData}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Calendar size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No scheduled appointments found.</p>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                {!isDoctor ? 'Book an appointment with a physician above to test the shared video consultation room.' : 'Waiting for patients to book a consultation.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {appointments.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isDoctor ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${isDoctor ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDoctor ? '#60a5fa' : '#34d399',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}>
                      {isDoctor ? app.patient_name.charAt(0) : '🩺'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                          {isDoctor ? `Patient: ${app.patient_name}` : app.doctor_name}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}>
                          {app.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                        {isDoctor ? (
                          <span>Chief Complaint: <strong style={{ color: '#e2e8f0' }}>"{app.reason}"</strong></span>
                        ) : (
                          <span>Specialty: <strong style={{ color: '#38bdf8' }}>{app.doctor_specialty || 'General Physician'}</strong> • Reason: "{app.reason}"</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>🕒 {app.scheduled_time}</span>
                        <span>🔑 Room: <code style={{ color: '#38bdf8', background: 'rgba(15, 23, 42, 0.6)', padding: '1px 6px', borderRadius: '4px' }}>{app.room_code}</code></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => openSummary(app.room_code, app)}
                      disabled={loadingSummary}
                      style={{
                        background: app.has_summary ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                        border: `1px solid ${app.has_summary ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.35)'}`,
                        color: app.has_summary ? '#6ee7b7' : '#93c5fd',
                        borderRadius: '10px',
                        padding: '0.65rem 1.1rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Sparkles size={15} />
                      <span>
                        {loadingSummary && summaryRoomCode === app.room_code
                          ? 'Checking...'
                          : app.has_summary
                          ? 'View Clinical Summary'
                          : 'View Clinical Summary (Pending)'}
                      </span>
                    </button>

                    <button
                      onClick={() => onJoinMeeting(app.room_code)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.65rem 1.25rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      <Video size={16} />
                      <span>Join Consultation</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COMPLETED CLINICAL SUMMARIES & MEDICAL RECORDS SECTION */}
        <div className="glass-panel" style={{ borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  {isDoctor ? 'Finalized Patient Clinical Notes' : 'My Consultation Records & AI Summaries'}
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0' }}>
                Official telehealth medical reports generated from your live video consultations.
              </p>
            </div>
          </div>

          {appointments.filter((a) => a.has_summary).length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#64748b',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '14px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}>
              <Sparkles size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>No clinical summaries generated yet.</p>
              <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                Join your scheduled consultation above. Once the video call concludes, the LangChain AI medical scribe will record your summary here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {appointments
                .filter((a) => a.has_summary)
                .map((app) => (
                  <div
                    key={`summary-card-${app.id}`}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                        fontWeight: 700,
                      }}>
                        ✓
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                            {isDoctor ? `Patient: ${app.patient_name}` : app.doctor_name}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 7px',
                            borderRadius: '9999px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                          }}>
                            Summary Ready
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          Reason: "{app.reason}" • Time: {app.scheduled_time} • Room: <code>{app.room_code}</code>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openSummary(app.room_code, app)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.55rem 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <FileText size={15} />
                      <span>View & Print Medical Report</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            color: '#f8fafc',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                }}>
                  <Calendar size={18} color="#ffffff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Book Doctor Consultation</h3>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Doctor Selection */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Select Physician:
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {doctors.length === 0 ? (
                    <option value="">No physicians registered yet</option>
                  ) : (
                    doctors.map((d) => (
                      <option key={d.id} value={d.id} style={{ background: '#0f172a' }}>
                        {d.full_name} • {d.specialty || 'General Physician'} ({d.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Consultation Time Slot */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Preferred Time Slot:
                </label>
                <input
                  type="text"
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  placeholder="e.g. Today at 5:00 PM or Tomorrow 11:00 AM"
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Symptoms / Chief Complaint */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Chief Symptoms & Complaint:
                </label>
                <textarea
                  rows={3}
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Describe your symptoms, duration, or what you want the doctor to evaluate..."
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
                {/* Quick Autofill Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setReasonInput("Persistent dry cough, mild throat irritation, and fatigue for 3 days.")}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#93c5fd',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    + Cough & Fatigue
                  </button>
                  <button
                    type="button"
                    onClick={() => setReasonInput("Severe headache, sensitivity to light, and neck tension.")}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#6ee7b7',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    + Migraine & Headache
                  </button>
                  <button
                    type="button"
                    onClick={() => setReasonInput("Routine medical checkup and prescription renewal follow-up.")}
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#d8b4fe',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    + Routine Follow-up
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: isBooking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle size={16} />
                  <span>{isBooking ? 'Confirming...' : 'Confirm Appointment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Honest Pending Status Modal (Call hasn't happened yet) */}
      {showPendingModal && pendingAppointment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            color: '#f8fafc',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                }}>
                  <Clock size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Consultation Summary Pending</h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live Speech-to-Text & AI Scribe Pipeline</span>
                </div>
              </div>
              <button
                onClick={() => setShowPendingModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.88rem',
              lineHeight: 1.6,
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#cbd5e1' }}>Consultation With:</strong>{' '}
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                  {isDoctor ? pendingAppointment.patient_name : pendingAppointment.doctor_name}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#cbd5e1' }}>Scheduled Time:</strong> {pendingAppointment.scheduled_time}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#cbd5e1' }}>Chief Complaint:</strong> "{pendingAppointment.reason}"
              </div>
              <div>
                <strong style={{ color: '#cbd5e1' }}>Room Code:</strong> <code style={{ color: '#34d399', background: 'rgba(15, 23, 42, 0.8)', padding: '2px 8px', borderRadius: '4px' }}>{pendingAppointment.room_code}</code>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              ℹ️ The LangChain AI Medical Scribe generates a structured clinical note and prescriptions strictly from your <strong>live spoken video consultation</strong>. Because this online consultation has not taken place yet, no medical notes or false vital signs have been created.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowPendingModal(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPendingModal(false);
                  onJoinMeeting(pendingAppointment.room_code);
                }}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Video size={16} />
                <span>Join Consultation Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Consultation Clinical Summary Modal */}
      <ClinicalSummaryModal
        summary={selectedSummary}
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        roomCode={summaryRoomCode}
      />
    </div>
  );
};
