import React, { useState, useEffect, useRef } from 'react';
import { User, TranscriptRecord, ClinicalSummary, Participant, ChatMessage } from '../types';
import { WebRTCManager } from '../services/webrtc';
import { speechRecognizer } from '../services/speechRecognition';
import { transcriptApi, summaryApi, meetingApi, WS_BASE_URL } from '../services/api';
import { LiveCaptions } from './LiveCaptions';
import { TranscriptDrawer } from './TranscriptDrawer';
import { ClinicalSummaryModal } from './ClinicalSummaryModal';
import { ParticipantList } from './ParticipantList';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Subtitles,
  MessageSquare,
  Users,
  PhoneOff,
  Copy,
  Check,
  Sparkles,
  Bot,
  Circle,
  Clock,
  Send,
  X,
} from 'lucide-react';

interface MeetingRoomProps {
  roomCode: string;
  currentUser: User;
  onLeave: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomCode,
  currentUser,
  onLeave,
}) => {
  // Media controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  // Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState<'transcripts' | 'chat' | 'participants' | null>('transcripts');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Real-time streams and states
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Transcripts & Chat
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: currentUser.id, name: currentUser.full_name, role: currentUser.role },
  ]);

  // Real-time WebRTC connection state
  const [connectionState, setConnectionState] = useState<string>('connecting');

  // Mic state ref to keep speech recognition synchronized
  const micEnabledRef = useRef(micEnabled);
  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  // Live captions overlay state
  const [activeCaption, setActiveCaption] = useState({ speaker: '', role: '', text: '' });
  const captionTimerRef = useRef<any>(null);

  // Meeting timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Copy meeting code
  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // User role politeness: Doctors act as impolite offerers; Patients act as polite answerers/negotiators
  const isPolite = currentUser.role !== 'DOCTOR';

  // Initialize WebRTC and WebSockets
  useEffect(() => {
    let isMounted = true;

    // Load existing transcripts from backend
    transcriptApi.getTranscripts(roomCode).then((data) => {
      if (isMounted) setTranscripts(data);
    }).catch(console.warn);

    // Load existing summary if available
    summaryApi.getSummary(roomCode).then((sum) => {
      if (isMounted) setClinicalSummary(sum);
    }).catch(() => {});

    // 1. Establish WebSocket Connection
    const wsUrl = `${WS_BASE_URL}/ws/meeting/${roomCode}?user_name=${encodeURIComponent(currentUser.full_name)}&user_role=${currentUser.role}&user_id=${currentUser.id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // 2. Initialize WebRTC Manager with Perfect Negotiation & Connection State Listener
    const rtc = new WebRTCManager(
      (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch((e) => {
            console.log('Autoplay deferred until user click:', e);
          });
        }
      },
      (signal) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(signal));
        }
      },
      isPolite,
      (state) => {
        if (isMounted) setConnectionState(state);
      }
    );
    webrtcRef.current = rtc;

    // Acquire camera & mic
    rtc.getLocalMedia(true, true).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      rtc.createPeerConnection();

      // Signal ready state to counterpart
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ready-for-call' }));
      }
    });

    // 3. WebSocket Event Handlers
    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Participants presence
        if (msg.type === 'room-state' || msg.type === 'participant-joined' || msg.type === 'participant-left') {
          if (msg.participants) {
            setParticipants(msg.participants);
          }
        }

        // When a new participant joins or is ready, initiate negotiation cleanly
        if (msg.type === 'participant-joined' || msg.type === 'ready-for-call') {
          // If we are the designated offerer (Doctor or impolite peer)
          if (!isPolite) {
            try {
              const offer = await rtc.createOffer();
              if (offer && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(offer));
              }
            } catch (e) {
              console.warn('Error creating WebRTC offer:', e);
            }
          }
        }

        // WebRTC Signaling: offer
        if (msg.type === 'offer') {
          const answer = await rtc.handleOffer(msg);
          if (answer && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(answer));
          }
        }

        // WebRTC Signaling: answer
        if (msg.type === 'answer') {
          await rtc.handleAnswer(msg);
        }

        // WebRTC Signaling: ice-candidate
        if (msg.type === 'ice-candidate') {
          await rtc.handleIceCandidate(msg.candidate);
        }

        // In-call chat
        if (msg.type === 'chat') {
          setChatMessages((prev) => [...prev, msg]);
        }

        // Live Captions & Transcripts
        if (msg.type === 'live-caption') {
          setActiveCaption({
            speaker: msg.speaker_name,
            role: msg.speaker_role,
            text: msg.text,
          });
          if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
          captionTimerRef.current = setTimeout(() => {
            setActiveCaption({ speaker: '', role: '', text: '' });
          }, 4500);

          // Append to transcript list
          setTranscripts((prev) => [
            ...prev,
            {
              speaker_name: msg.speaker_name,
              speaker_role: msg.speaker_role,
              text: msg.text,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // LangChain Summary Ready
        if (msg.type === 'summary-ready') {
          summaryApi.getSummary(roomCode).then((s) => {
            setClinicalSummary(s);
            setShowSummaryModal(true);
          });
        }

        // Meeting ended
        if (msg.type === 'meeting-ended') {
          alert('This consultation has concluded. The clinical summary has been generated.');
          onLeave();
        }
      } catch (err) {
        console.warn('Error handling WS message:', err);
      }
    };

    // 4. Start Live Speech-to-Text Recognition
    if (speechRecognizer.isSupported()) {
      speechRecognizer.start({
        onInterim: (interim) => {
          if (captionsEnabled && micEnabledRef.current) {
            setActiveCaption({
              speaker: currentUser.full_name,
              role: currentUser.role,
              text: interim,
            });
          }
        },
        onFinal: (finalText) => {
          // Only emit transcripts if microphone is actually unmuted
          if (micEnabledRef.current && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'transcript-chunk',
              speaker_name: currentUser.full_name,
              speaker_role: currentUser.role,
              text: finalText,
            }));
          }
        },
      });
    }

    return () => {
      isMounted = false;
      speechRecognizer.stop();
      rtc.cleanup();
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [roomCode]);

  // Media Toggle Handlers
  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    webrtcRef.current?.toggleAudio(next);
  };

  const toggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    webrtcRef.current?.toggleVideo(next);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      webrtcRef.current?.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const stream = await webrtcRef.current?.startScreenShare();
      if (stream) {
        setIsScreenSharing(true);
      }
    }
  };

  // Send in-call chat
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        text: chatInput.trim(),
        timestamp: new Date().toISOString(),
      }));
      setChatInput('');
    }
  };

  // Add transcript chunk manually or from simulation
  const addTranscriptChunk = (text: string, overrideRole?: string) => {
    const speakerRole = overrideRole || currentUser.role;
    let speakerName = currentUser.full_name;
    if (overrideRole && overrideRole !== currentUser.role) {
      speakerName = overrideRole === 'DOCTOR' ? 'Attending Physician' : 'Consultation Patient';
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transcript-chunk',
        speaker_name: speakerName,
        speaker_role: speakerRole,
        text,
      }));
    }
  };

  // Trigger LangChain Clinical Scribe Pipeline
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await summaryApi.generateSummary(roomCode);
      setClinicalSummary(summary);
      setShowSummaryModal(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate LangChain summary. Ensure dialogue has been recorded.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // End consultation
  const handleEndCall = async () => {
    if (confirm('End this video consultation for all participants? The LangChain pipeline will automatically finalize the clinical report.')) {
      try {
        await meetingApi.endMeeting(roomCode);
        await handleGenerateSummary();
      } catch {
        onLeave();
      }
    }
  };

  return (
    <div 
      onClick={() => {
        if (remoteVideoRef.current && remoteVideoRef.current.paused) {
          remoteVideoRef.current.play().catch(() => {});
        }
      }}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#090d16',
        overflow: 'hidden',
        position: 'relative',
      }}>
      {/* 1. Top Header Bar */}
      <div style={{
        height: '60px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 20,
      }}>
        {/* Left: Meeting title and timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="animate-live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.02em' }}>
              LIVE CONSULTATION
            </span>
          </div>

          <div style={{ height: '18px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <Clock size={15} />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* WebRTC Connection State Badge */}
          <div style={{
            background: connectionState === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${connectionState === 'connected' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            color: connectionState === 'connected' ? '#34d399' : '#fbbf24',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connectionState === 'connected' ? '#10b981' : '#f59e0b'
            }} />
            {connectionState === 'connected' ? 'Audio/Video Connected' : connectionState === 'connecting' ? 'Connecting Media...' : 'Reconnecting...'}
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            color: '#34d399',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <Bot size={13} />
            LangChain Scribe Active
          </div>
        </div>

        {/* Center: Room Code pill */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px',
          padding: '4px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: '#cbd5e1',
        }}>
          <span>Room: <strong>{roomCode}</strong></span>
          <button
            onClick={copyRoomLink}
            style={{
              background: 'transparent',
              border: 'none',
              color: copiedLink ? '#34d399' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
            }}
            title="Copy Meeting Link"
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* Right: Quick LangChain Summary Trigger Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isGeneratingSummary ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Sparkles size={15} />
            {isGeneratingSummary ? 'Extracting Summary...' : 'Generate AI Summary'}
          </button>
        </div>
      </div>

      {/* 2. Main Video Workspace + Side Drawer */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Video Canvas Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          position: 'relative',
          background: '#020617',
        }}>
          {/* Google Meet / Zoom Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: participants.length > 1 ? '1fr 1fr' : '1fr',
            gap: '1rem',
            width: '100%',
            height: '100%',
            maxHeight: 'calc(100vh - 160px)',
          }}>
            {/* Cell 1: Local Video Stream */}
            <div className="video-cell active-speaker">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`video-element ${isScreenSharing ? 'unmirrored' : ''}`}
                style={{ display: videoEnabled ? 'block' : 'none' }}
              />
              {!videoEnabled && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#94a3b8',
                }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: currentUser.role === 'DOCTOR' ? '#059669' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}>
                    {currentUser.full_name.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Camera Off</span>
                </div>
              )}

              {/* Local Participant Badge */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>{currentUser.full_name} (You)</span>
                {!micEnabled && <MicOff size={13} color="#f87171" />}
              </div>
            </div>

            {/* Cell 2: Remote Video Stream (or Waiting Placeholder) */}
            <div className="video-cell">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="video-element unmirrored"
                style={{ display: participants.length > 1 ? 'block' : 'none' }}
              />

              {participants.length <= 1 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#64748b',
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    <Users size={32} color="#94a3b8" />
                  </div>
                  <h4 style={{ color: '#f1f5f9', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
                    Waiting for {currentUser.role === 'DOCTOR' ? 'Patient' : 'Doctor'} to Join...
                  </h4>
                  <p style={{ fontSize: '0.82rem', maxWidth: '320px', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                    Share the meeting code <strong>{roomCode}</strong> or send the invitation link so they can enter this consultation.
                  </p>
                  <button
                    onClick={copyRoomLink}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Copy size={14} />
                    {copiedLink ? 'Copied to Clipboard!' : 'Copy Invitation Link'}
                  </button>
                </div>
              )}

              {/* Remote Participant Badge */}
              {participants.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                }}>
                  {participants.find(p => p.id !== currentUser.id)?.name || 'Consultation Partner'}
                </div>
              )}
            </div>
          </div>

          {/* Live Captions Overlay */}
          <LiveCaptions
            speakerName={activeCaption.speaker}
            speakerRole={activeCaption.role}
            text={activeCaption.text}
            visible={captionsEnabled}
          />
        </div>

        {/* Side Panel Drawer (AI Scribe Transcripts / Chat / People) */}
        {activeDrawer && (
          <div style={{
            width: '380px',
            height: '100%',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 25,
            transition: 'width 0.3s ease',
          }}>
            {activeDrawer === 'transcripts' && (
              <TranscriptDrawer
                transcripts={transcripts}
                onAddChunk={addTranscriptChunk}
                onGenerateSummary={handleGenerateSummary}
                isGeneratingSummary={isGeneratingSummary}
                userRole={currentUser.role}
              />
            )}

            {activeDrawer === 'participants' && (
              <ParticipantList
                participants={participants}
                roomCode={roomCode}
              />
            )}

            {activeDrawer === 'chat' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#f8fafc',
              }}>
                <div style={{
                  padding: '1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#38bdf8" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>In-Call Messages</h3>
                  </div>
                  <button
                    onClick={() => setActiveDrawer(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>
                      <p style={{ fontSize: '0.85rem' }}>No messages yet. Messages sent during the call are visible to everyone.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>
                            {msg.sender_name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9' }}>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendChatMessage} style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message to everyone..."
                    style={{
                      flex: 1,
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Floating Control Dock (Zoom / Meet Style) */}
      <div style={{
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 30,
      }}>
        <div className="meet-controls-bar">
          {/* Microphone */}
          <button
            onClick={toggleMic}
            className={`ctrl-btn ${micEnabled ? '' : 'inactive-muted'}`}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`ctrl-btn ${videoEnabled ? '' : 'inactive-muted'}`}
            title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`ctrl-btn ${isScreenSharing ? 'active' : ''}`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <MonitorUp size={20} />
          </button>

          {/* Captions Toggle */}
          <button
            onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`ctrl-btn ${captionsEnabled ? 'active' : ''}`}
            title={captionsEnabled ? 'Hide Live Captions' : 'Show Live Captions'}
          >
            <Subtitles size={20} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

          {/* LangChain Transcript Drawer */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'transcripts' ? null : 'transcripts')}
            className={`ctrl-btn ${activeDrawer === 'transcripts' ? 'active' : ''}`}
            title="LangChain AI Scribe Transcripts"
          >
            <Bot size={20} />
            {transcripts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#10b981',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {transcripts.length}
              </span>
            )}
          </button>

          {/* People / Participants */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
            className={`ctrl-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
            title="Meeting Participants"
          >
            <Users size={20} />
          </button>

          {/* In-Call Chat */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
            className={`ctrl-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
            title="In-Call Chat"
          >
            <MessageSquare size={20} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="ctrl-btn danger"
            title="End Video Consultation"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* 4. Post-Consultation Clinical Summary Modal */}
      <ClinicalSummaryModal
        summary={clinicalSummary}
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        roomCode={roomCode}
      />
    </div>
  );
};
