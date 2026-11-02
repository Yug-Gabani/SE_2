import React from 'react';
import { Participant } from '../types';
import { Users, Copy, Check, ShieldCheck, User as UserIcon } from 'lucide-react';

interface ParticipantListProps {
  participants: Participant[];
  roomCode: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants, roomCode }) => {
  const [copied, setCopied] = React.useState(false);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/meet/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      color: '#f8fafc',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
          }}>
            <Users size={18} color="#60a5fa" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>People</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {participants.length} connected
            </span>
          </div>
        </div>
      </div>

      {/* Copy invite button */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <button
          onClick={copyRoomLink}
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '0.65rem 1rem',
            color: '#f8fafc',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
          {copied ? 'Link Copied!' : 'Copy Meeting Invitation Link'}
        </button>
      </div>

      {/* Participant List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {participants.map((p, idx) => {
          const isDoctor = p.role.toUpperCase() === 'DOCTOR';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isDoctor ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                    {p.name}
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    color: isDoctor ? '#34d399' : '#60a5fa',
                    fontWeight: 500,
                  }}>
                    {isDoctor ? 'Lead Physician' : 'Patient'}
                  </span>
                </div>
              </div>

              {isDoctor && (
                <span title="Host / Doctor" style={{ display: 'flex' }}>
                  <ShieldCheck size={16} color="#34d399" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
