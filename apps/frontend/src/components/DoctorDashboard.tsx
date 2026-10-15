import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  Download,
  X,
} from 'lucide-react';
import type { TriageAssessment } from '../types';

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  slot: string;
  mode: 'VID' | 'IPS';
  urgency: 'EMG' | 'URG' | 'RTN';
  rationale: string;
  confidence: number;
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  history: string;
  questionnaire: { q: string; a: string }[];
  pastVisits: { date: string; doctor: string; diagnosis: string }[];
}

const DEFAULT_QUEUE: QueueItem[] = [
  {
    id: 'case-1',
    patientId: '#a4f1',
    patientName: 'Anonymous Patient',
    age: 42,
    gender: 'M',
    slot: '14:30',
    mode: 'VID',
    urgency: 'EMG',
    rationale: 'Chest pain, SOB 20min duration',
    confidence: 92,
    chiefComplaint: 'Crushing retrosternal chest pain radiating to left shoulder',
    duration: '20 minutes',
    history: 'No prior cardiac history on file. Hypertension treated with Amlodipine.',
    symptoms: ['Chest pain reported, duration 20 minutes', 'Shortness of breath', 'No prior cardiac history on file'],
    questionnaire: [
      { q: 'Pain severity (1-10)?', a: '8/10, acute onset' },
      { q: 'Associated symptoms?', a: 'Diaphoresis, shortness of breath' },
      { q: 'Taken any medication?', a: 'Sorbitrate not taken' },
    ],
    pastVisits: [
      { date: '12 Aug 2026', doctor: 'Dr. Shah', diagnosis: 'Mild Hypertension check' },
      { date: '04 Mar 2026', doctor: 'Dr. Iyer', diagnosis: 'Seasonal bronchitis' },
    ],
  },
  {
    id: 'case-2',
    patientId: '#b219',
    patientName: 'Anonymous Patient',
    age: 29,
    gender: 'F',
    slot: '15:00',
    mode: 'VID',
    urgency: 'URG',
    rationale: 'Severe migraine photophobia',
    confidence: 78,
    chiefComplaint: 'Throbbing hemicranial headache with nausea and light sensitivity',
    duration: '6 hours',
    history: 'Migraine without aura since age 21.',
    symptoms: ['Unilateral pulsating headache', 'Photophobia and phonophobia', 'Nausea present'],
    questionnaire: [
      { q: 'Pain severity (1-10)?', a: '7/10' },
      { q: 'Visual aura present?', a: 'Blurry vision, no scintillating scotoma' },
    ],
    pastVisits: [
      { date: '10 Jan 2026', doctor: 'Dr. Mehta', diagnosis: 'Migraine exacerbation' },
    ],
  },
  {
    id: 'case-3',
    patientId: '#c8d0',
    patientName: 'Anonymous Patient',
    age: 55,
    gender: 'M',
    slot: '15:30',
    mode: 'IPS',
    urgency: 'RTN',
    rationale: 'Routine check-up',
    confidence: 95,
    chiefComplaint: 'Semi-annual cardiovascular wellness evaluation',
    duration: 'Routine schedule',
    history: 'Type 2 Diabetes controlled with Metformin.',
    symptoms: ['No active acute complaints', 'Blood glucose monitoring review requested'],
    questionnaire: [
      { q: 'Recent fasting blood sugar?', a: '112 mg/dL' },
      { q: 'Any chest heaviness or palpitations?', a: 'None reported' },
    ],
    pastVisits: [
      { date: '15 Apr 2026', doctor: 'Dr. Shah', diagnosis: 'Routine diabetic panel normal' },
    ],
  },
  {
    id: 'case-4',
    patientId: '#d7e2',
    patientName: 'Anonymous Patient',
    age: 34,
    gender: 'M',
    slot: '16:00',
    mode: 'VID',
    urgency: 'URG',
    rationale: 'Fever 4 days productive cough',
    confidence: 85,
    chiefComplaint: 'High grade pyrexia with yellowish sputum and pleuritic pain',
    duration: '4 days',
    history: 'Non-smoker, mild asthma in childhood.',
    symptoms: ['Fever up to 102.5°F', 'Productive cough with yellowish phlegm', 'Mild right-sided pleuritic discomfort'],
    questionnaire: [
      { q: 'Highest temperature?', a: '102.8°F recorded last night' },
      { q: 'Difficulty breathing at rest?', a: 'Mild dyspnea with coughing bouts' },
    ],
    pastVisits: [
      { date: '20 Sep 2025', doctor: 'Dr. Rao', diagnosis: 'Contact dermatitis' },
    ],
  },
  {
    id: 'case-5',
    patientId: '#e3f4',
    patientName: 'Anonymous Patient',
    age: 48,
    gender: 'F',
    slot: '16:30',
    mode: 'VID',
    urgency: 'RTN',
    rationale: 'Prescription refill',
    confidence: 88,
    chiefComplaint: 'Renewal of Atorvastatin 20mg and Telmisartan 40mg',
    duration: 'Chronic maintenance',
    history: 'Hyperlipidemia and mild essential hypertension.',
    symptoms: ['Asymptomatic', 'Requesting 3-month regular maintenance prescription'],
    questionnaire: [
      { q: 'Any muscle aches or dark urine?', a: 'None' },
      { q: 'Latest lipid panel date?', a: 'Last month, LDL 78 mg/dL' },
    ],
    pastVisits: [
      { date: '12 Jan 2026', doctor: 'Dr. Shah', diagnosis: 'Maintenance Rx approved' },
    ],
  },
];

interface DoctorDashboardProps {
  cases?: TriageAssessment[];
  onUpdateCase?: (updatedCase: TriageAssessment) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = () => {
  const [queue, setQueue] = useState<QueueItem[]>(DEFAULT_QUEUE);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawer Override form state
  const [overrideScore, setOverrideScore] = useState<string>('Routine');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [saveBanner, setSaveBanner] = useState<boolean>(false);

  const handleOpenItem = (item: QueueItem) => {
    setSelectedItem(item);
    setOverrideScore(item.urgency === 'EMG' ? 'Emergency' : item.urgency === 'URG' ? 'Urgent' : 'Routine');
    setOverrideReason('');
    setSaveBanner(false);
  };

  const handleSaveOverride = () => {
    if (!selectedItem) return;
    const newUrgency = overrideScore === 'Emergency' ? 'EMG' : overrideScore === 'Urgent' ? 'URG' : 'RTN';
    setQueue(prev =>
      prev.map(item =>
        item.id === selectedItem.id
          ? {
              ...item,
              urgency: newUrgency,
              rationale: `${item.rationale} (Overridden to ${overrideScore})`,
            }
          : item
      )
    );
    setSelectedItem(prev => (prev ? { ...prev, urgency: newUrgency } : null));
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  // Filtered queue rows
  const filteredQueue = queue.filter(item => {
    const matchesUrgency =
      filterUrgency === 'ALL' ||
      (filterUrgency === 'EMG' && item.urgency === 'EMG') ||
      (filterUrgency === 'URG' && item.urgency === 'URG') ||
      (filterUrgency === 'RTN' && item.urgency === 'RTN');

    const matchesMode =
      filterMode === 'ALL' || item.mode === filterMode;

    const matchesSearch =
      item.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rationale.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesUrgency && matchesMode && matchesSearch;
  });

  const emergencyItem = queue.find(q => q.urgency === 'EMG');

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '36px 20px 64px 20px',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      color: '#1a110a',
    }}>
      {/* PAGE HEADER: Today's queue + Timestamp + SSE */}
      <section style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.025em',
          }}>
            Today's queue
          </h1>
          <div style={{ fontSize: '14px', color: '#706b63', marginTop: '4px' }}>
            Live queue · updates automatically
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#059669',
            marginTop: '4px',
            fontWeight: 500,
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }} />
            <span>SSE connected · last update 3s ago</span>
          </div>
        </div>

        <div style={{
          fontSize: '13px',
          color: '#706b63',
          fontWeight: 500,
        }}>
          Thursday · 15 Oct 2026
        </div>
      </section>

      {/* KPI STRIP - 4 Tiles with Warm Cream / Brown Aesthetic */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}>
        {/* Tile 1: Today */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '18px 22px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
        }}>
          <div style={{ fontSize: '12px', color: '#706b63', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: '4px 0' }}>
            12
          </div>
          <div style={{ fontSize: '13px', color: '#706b63' }}>
            7 done
          </div>
        </div>

        {/* Tile 2: Emergency */}
        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '16px',
          padding: '18px 22px',
          border: '1px solid #fecaca',
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.06)',
        }}>
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Emergency
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', margin: '4px 0' }}>
            1
          </div>
          <div style={{
            fontSize: '13px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 500,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
            needs now
          </div>
        </div>

        {/* Tile 3: Pending questions */}
        <div style={{
          backgroundColor: '#fffbeb',
          borderRadius: '16px',
          padding: '18px 22px',
          border: '1px solid #fde68a',
          boxShadow: '0 4px 16px rgba(217, 119, 6, 0.06)',
        }}>
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending questions
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#b45309', margin: '4px 0' }}>
            3
          </div>
          <div style={{ fontSize: '13px', color: '#b45309' }}>
            waiting
          </div>
        </div>

        {/* Tile 4: Follow-up due */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '18px 22px',
          border: '1px solid #eae3d8',
          boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
        }}>
          <div style={{ fontSize: '12px', color: '#706b63', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Follow-up due
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: '4px 0' }}>
            5
          </div>
          <div style={{ fontSize: '13px', color: '#706b63' }}>
            this week
          </div>
        </div>
      </section>

      {/* EMERGENCY PRIORITY BANNER */}
      {emergencyItem && (
        <section style={{
          backgroundColor: '#dc2626',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '14px 22px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 6px 20px rgba(220, 38, 38, 0.22)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>▲</span>
            <span>EMERGENCY · Patient {emergencyItem.patientId} · {emergencyItem.rationale}</span>
          </div>
          <button
            onClick={() => handleOpenItem(emergencyItem)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 14px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
          >
            Open now →
          </button>
        </section>
      )}

      {/* FILTERS STRIP */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {/* Left Filter selects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#554e46' }}>
          <span style={{ fontWeight: 600, marginRight: '4px' }}>Filter:</span>

          {/* All Urgency Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eae3d8',
                borderRadius: '9999px',
                padding: '7px 28px 7px 14px',
                fontSize: '13px',
                color: '#2b251f',
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(75, 68, 57, 0.03)',
              }}
            >
              <option value="ALL">All ⌄</option>
              <option value="EMG">Emergency</option>
              <option value="URG">Urgent</option>
              <option value="RTN">Routine</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', pointerEvents: 'none', color: '#785b47' }} />
          </div>

          {/* Mode Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eae3d8',
                borderRadius: '9999px',
                padding: '7px 28px 7px 14px',
                fontSize: '13px',
                color: '#2b251f',
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(75, 68, 57, 0.03)',
              }}
            >
              <option value="ALL">Mode ⌄</option>
              <option value="VID">Video</option>
              <option value="IPS">In-person</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', pointerEvents: 'none', color: '#785b47' }} />
          </div>

          {/* Status Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eae3d8',
                borderRadius: '9999px',
                padding: '7px 28px 7px 14px',
                fontSize: '13px',
                color: '#2b251f',
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(75, 68, 57, 0.03)',
              }}
            >
              <option value="ALL">Status ⌄</option>
              <option value="WAITING">Waiting</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', pointerEvents: 'none', color: '#785b47' }} />
          </div>
        </div>

        {/* Right Search Patient ID */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search patient ID"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #eae3d8',
              borderRadius: '9999px',
              padding: '7px 14px 7px 32px',
              fontSize: '13px',
              color: '#1a110a',
              outline: 'none',
              width: '210px',
              boxShadow: '0 2px 6px rgba(75, 68, 57, 0.03)',
            }}
          />
          <Search size={14} color="#785b47" style={{ position: 'absolute', left: '12px' }} />
        </div>
      </section>

      {/* QUEUE TABLE */}
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #eae3d8',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(75, 68, 57, 0.05)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left',
          }}>
            <thead>
              <tr style={{
                borderBottom: '2px solid #eae3d8',
                backgroundColor: '#ffffff',
                color: '#706b63',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                <th style={{ padding: '14px 20px', width: '110px' }}>URGENCY</th>
                <th style={{ padding: '14px 20px', width: '90px' }}>SLOT</th>
                <th style={{ padding: '14px 20px', width: '100px' }}>PATIENT</th>
                <th style={{ padding: '14px 20px', width: '80px' }}>MODE</th>
                <th style={{ padding: '14px 20px' }}>AI RATIONALE</th>
                <th style={{ padding: '14px 20px', width: '90px' }}>CONF</th>
                <th style={{ padding: '14px 20px', width: '90px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map(item => {
                const isEmergency = item.urgency === 'EMG';
                const isUrgent = item.urgency === 'URG';

                const dotColor = isEmergency ? '#dc2626' : isUrgent ? '#d97706' : '#10b981';
                const labelText = isEmergency ? 'EMG' : isUrgent ? 'URG' : 'RTN';

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #f2ece2',
                      backgroundColor: isEmergency ? '#fffbfb' : '#ffffff',
                      borderLeft: isEmergency ? '3px solid #dc2626' : '3px solid transparent',
                      transition: 'background-color 0.15s ease',
                      height: '50px',
                    }}
                    onMouseEnter={e => {
                      if (!isEmergency) e.currentTarget.style.backgroundColor = '#faf6f0';
                    }}
                    onMouseLeave={e => {
                      if (!isEmergency) e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* Urgency */}
                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: dotColor,
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                        }} />
                        <span>{labelText}</span>
                      </div>
                    </td>

                    {/* Slot */}
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#3a332a' }}>
                      {item.slot}
                    </td>

                    {/* Patient */}
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#1a110a' }}>
                      {item.patientId}
                    </td>

                    {/* Mode */}
                    <td style={{ padding: '12px 20px', color: '#706b63', fontSize: '12px' }}>
                      {item.mode}
                    </td>

                    {/* AI Rationale */}
                    <td style={{ padding: '12px 20px', color: '#2c251f' }}>
                      {item.rationale}
                    </td>

                    {/* Confidence */}
                    <td style={{ padding: '12px 20px', color: '#706b63', fontSize: '12px' }}>
                      {item.confidence}%
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenItem(item)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #dcd4c7',
                          borderRadius: '9999px',
                          padding: '5px 16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2b2520',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#785b47';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#785b47';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#2b2520';
                          e.currentTarget.style.borderColor = '#dcd4c7';
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid #eae3d8',
          fontSize: '12px',
          color: '#706b63',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#1a110a' }}>1</span>
            <span>2</span>
            <span>·</span>
            <span>3</span>
            <span>...</span>
            <span>7</span>
            <span style={{ marginLeft: '12px', color: '#8c857b' }}>Showing 5 of 32</span>
          </div>

          <button
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #dcd4c7',
              borderRadius: '9999px',
              padding: '6px 18px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#332b24',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#785b47')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#dcd4c7')}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* CLINICAL REVIEW SIDE DRAWER (Slides from right, 480px width) */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(75, 68, 57, 0.15)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #eae3d8',
          fontFamily: "'Inter', sans-serif",
          animation: 'fadeIn 0.2s ease',
        }}>
          {/* Drawer Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #eae3d8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
                Patient {selectedItem.patientId} · {selectedItem.age} {selectedItem.gender}
              </div>
              <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px' }}>
                Appointment {selectedItem.slot} · {selectedItem.mode === 'VID' ? 'Video consult' : 'In-person consult'}
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#706b63',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {saveBanner && (
              <div style={{
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                ✓ Clinical override updated successfully.
              </div>
            )}

            {/* AI Advisory Box */}
            <div style={{
              backgroundColor: '#faf6f0',
              border: '1px solid #eae3d8',
              borderRadius: '16px',
              padding: '18px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#785b47',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}>
                AI ADVISORY
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: selectedItem.urgency === 'EMG' ? '#dc2626' : selectedItem.urgency === 'URG' ? '#d97706' : '#10b981',
                marginBottom: '16px',
              }}>
                <span>Urgency: {selectedItem.urgency === 'EMG' ? 'EMERGENCY' : selectedItem.urgency === 'URG' ? 'URGENT' : 'ROUTINE'}</span>
                <span style={{ color: '#706b63', fontWeight: 400 }}>· {selectedItem.confidence}% confidence</span>
              </div>

              {/* Override Controls */}
              <div style={{
                paddingTop: '12px',
                borderTop: '1px solid #eae3d8',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#332b24' }}>
                  Override Urgency:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={overrideScore}
                    onChange={e => setOverrideScore(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: '1px solid #eae3d8',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '13px',
                      color: '#1a110a',
                      outline: 'none',
                    }}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                  <button
                    onClick={handleSaveOverride}
                    style={{
                      backgroundColor: '#785b47',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save with reason
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Clinical reason for override (e.g., patient vitals stable)"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #eae3d8',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    fontSize: '12px',
                    color: '#1a110a',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Why Section */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a110a', marginBottom: '8px' }}>
                Why
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '13px',
                color: '#332b24',
                lineHeight: '1.7',
              }}>
                {selectedItem.symptoms.map((sym, idx) => (
                  <li key={idx}>{sym}</li>
                ))}
              </ul>
            </div>

            {/* Questionnaire responses */}
            <div style={{
              border: '1px solid #eae3d8',
              borderRadius: '16px',
              padding: '16px',
              backgroundColor: '#ffffff',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a110a', marginBottom: '8px' }}>
                Questionnaire responses
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {selectedItem.questionnaire.map((q, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid #f2ece2', paddingBottom: '6px' }}>
                    <div style={{ color: '#706b63' }}>{q.q}</div>
                    <div style={{ fontWeight: 600, color: '#1a110a', marginTop: '2px' }}>{q.a}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Visits */}
            <div style={{
              border: '1px solid #eae3d8',
              borderRadius: '16px',
              padding: '16px',
              backgroundColor: '#ffffff',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a110a', marginBottom: '8px' }}>
                Past visits ({selectedItem.pastVisits.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {selectedItem.pastVisits.map((pv, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#332b24' }}>
                    <span>{pv.date} · {pv.doctor}</span>
                    <span style={{ color: '#706b63' }}>{pv.diagnosis}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Images */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a110a', marginBottom: '8px' }}>
                Attached images (2)
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '10px',
                  backgroundColor: '#ede7de',
                  border: '1px solid #dfd6c8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#706b63',
                  fontWeight: 600,
                }}>
                  ECG
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '10px',
                  backgroundColor: '#ede7de',
                  border: '1px solid #dfd6c8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#706b63',
                  fontWeight: 600,
                }}>
                  Vitals
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div style={{
            padding: '18px 24px',
            borderTop: '1px solid #eae3d8',
            display: 'flex',
            gap: '12px',
          }}>
            <button
              onClick={() => alert(`Starting consultation for patient ${selectedItem.patientId}`)}
              style={{
                flex: 1,
                backgroundColor: '#785b47',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '11px 0',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Start consultation
            </button>
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                backgroundColor: 'transparent',
                color: '#706b63',
                border: '1px solid #dcd4c7',
                borderRadius: '9999px',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Mark no-show
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
