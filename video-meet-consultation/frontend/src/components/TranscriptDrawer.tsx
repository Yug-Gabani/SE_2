import React, { useState } from 'react';
import { TranscriptRecord } from '../types';
import { Sparkles, Bot, Clock, Send, MessageSquareText, ShieldAlert } from 'lucide-react';

interface TranscriptDrawerProps {
  transcripts: TranscriptRecord[];
  onAddChunk: (text: string, speakerRole?: string) => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  userRole: string;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  transcripts,
  onAddChunk,
  onGenerateSummary,
  isGeneratingSummary,
  userRole,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddChunk(inputText.trim());
      setInputText('');
    }
  };

  const insertDemoDialogue = (sample: string, role: string) => {
    onAddChunk(sample, role);
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
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>AI Clinical Scribe</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              LangChain Transcript Pipeline
            </span>
          </div>
        </div>

        <span style={{
          fontSize: '0.75rem',
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          padding: '3px 8px',
          borderRadius: '9999px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
          }} />
          {transcripts.length} dialogue entries
        </span>
      </div>

      {/* Quick Test Demo Helpers */}
      <div style={{
        padding: '0.75rem 1.25rem',
        background: 'rgba(30, 41, 59, 0.4)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 }}>
          Quick Test Dialogue Simulation:
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => insertDemoDialogue("Doctor, I have had a severe dry cough, sore throat, and headaches for 3 days.", "PATIENT")}
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#93c5fd',
              cursor: 'pointer',
            }}
          >
            + Patient: Cough & Sore Throat
          </button>
          <button
            type="button"
            onClick={() => insertDemoDialogue("I see. Take Cetirizine 10mg once daily at bedtime and Ibuprofen 400mg twice daily after meals for throat pain. Drink plenty of warm fluids and rest.", "DOCTOR")}
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              cursor: 'pointer',
            }}
          >
            + Doctor: Rx & Telehealth Advice
          </button>
        </div>
      </div>

      {/* Transcript Log Stream */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}>
        {transcripts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#64748b',
            margin: 'auto',
            padding: '2rem 1rem',
          }}>
            <MessageSquareText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: '#94a3b8' }}>No spoken words recorded yet</p>
            <p style={{ fontSize: '0.75rem' }}>Speak into your microphone or use the quick test buttons above to stream dialogue into the LangChain pipeline.</p>
          </div>
        ) : (
          transcripts.map((t, idx) => {
            const isDoctor = (t.speaker_role || '').toUpperCase() === 'DOCTOR';
            return (
              <div
                key={idx}
                style={{
                  background: isDoctor ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                  border: `1px solid ${isDoctor ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem',
                }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: isDoctor ? '#34d399' : '#60a5fa',
                  }}>
                    {isDoctor ? '🩺 ' : '👤 '}{t.speaker_name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} />
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, lineHeight: 1.45 }}>
                  {t.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom LangChain Action & Manual Speech Input */}
      <div style={{
        padding: '1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(15, 23, 42, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {/* Trigger LangChain AI Pipeline Button */}
        <button
          type="button"
          onClick={onGenerateSummary}
          disabled={isGeneratingSummary}
          style={{
            width: '100%',
            background: isGeneratingSummary ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isGeneratingSummary ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <Sparkles size={18} />
          {isGeneratingSummary ? 'Processing LangChain Pipeline (OpenRouter)...' : 'Run LangChain Medical Scribe'}
        </button>

        {/* Manual Speech Text Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Say or type as ${userRole === 'DOCTOR' ? 'Doctor' : 'Patient'}...`}
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
            disabled={!inputText.trim()}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              color: '#ffffff',
              cursor: inputText.trim() ? 'pointer' : 'default',
              opacity: inputText.trim() ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
