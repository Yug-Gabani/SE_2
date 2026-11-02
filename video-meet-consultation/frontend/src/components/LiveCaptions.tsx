import React from 'react';

interface LiveCaptionsProps {
  speakerName: string;
  speakerRole: string;
  text: string;
  visible: boolean;
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({
  speakerName,
  speakerRole,
  text,
  visible,
}) => {
  if (!visible || !text) return null;

  const isDoctor = speakerRole.toUpperCase() === 'DOCTOR';

  return (
    <div style={{
      position: 'absolute',
      bottom: '90px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      maxWidth: '80%',
      pointerEvents: 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '0.65rem 1.25rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{
          background: isDoctor ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
          color: isDoctor ? '#34d399' : '#60a5fa',
          border: `1px solid ${isDoctor ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          {isDoctor ? '🩺 Doctor' : '👤 Patient'} {speakerName ? `(${speakerName})` : ''}
        </span>
        <span style={{
          color: '#f8fafc',
          fontSize: '0.95rem',
          lineHeight: '1.4',
          fontWeight: 400,
        }}>
          {text}
        </span>
      </div>
    </div>
  );
};
