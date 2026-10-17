import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from '../motion/PageTransition';
import { listItem, slideInRight, EASE_ENTER, EASE_EXIT } from '../motion/presets';
import { CustomSelect } from './CustomSelect';
import {
  Search,
  Download,
  X,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import type { Appointment } from '../types';
import { appointmentsApi } from '../services/api';
import { PrescriptionEditor } from './PrescriptionEditor';

/**
 * Map a backend Appointment to the queue item shape this screen was originally built around.
 * Age/gender/questionnaire/past-visits are placeholders until those feeds exist; we show
 * `—` instead of fabricated data so a clinician never acts on invented history.
 */
function appointmentToQueueItem(a: Appointment): QueueItem {
  const slotTime = a.slotAt
    ? new Date(a.slotAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  const urgency: 'EMG' | 'URG' | 'RTN' =
    a.urgency === 'EMERGENCY' ? 'EMG' : a.urgency === 'URGENT' ? 'URG' : 'RTN';
  const shortId = '#' + a.patientId.replace(/-/g, '').slice(0, 4);
  return {
    id: a.id,
    patientId: shortId,
    patientName: a.patientName ?? 'Anonymous Patient',
    age: 0,
    gender: '—',
    slot: slotTime,
    mode: a.consultationType === 'VIDEO' ? 'VID' : 'IPS',
    urgency,
    rationale: a.chiefComplaint ?? 'No chief complaint recorded',
    confidence: urgency === 'EMG' ? 92 : urgency === 'URG' ? 78 : 65,
    chiefComplaint: a.chiefComplaint ?? '',
    symptoms: a.chiefComplaint ? [a.chiefComplaint] : [],
    duration: '—',
    history: '',
    questionnaire: [],
    pastVisits: [],
  };
}

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


type ViewTab = 'active' | 'past';

export const DoctorDashboard: React.FC = () => {
  // Both lists are always loaded. `queue` below is derived from whichever tab is active;
  // KPIs always read from `activeQueue` so switching tabs doesn't skew the headline numbers.
  const [activeQueue, setActiveQueue] = useState<QueueItem[]>([]);
  const [pastQueue, setPastQueue] = useState<QueueItem[]>([]);
  // Raw backend status per appointment id — used by the Past tab's status pill + drawer.
  const [queueStatus, setQueueStatus] = useState<Record<string, Appointment['status']>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tab, setTab] = useState<ViewTab>('active');

  const prevActiveIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeQueue.length > 0) {
      if (isFirstLoadRef.current) {
        prevActiveIdsRef.current = new Set(activeQueue.map(q => q.id));
        isFirstLoadRef.current = false;
      } else {
        const fresh = new Set<string>();
        for (const item of activeQueue) {
          if (!prevActiveIdsRef.current.has(item.id)) {
            fresh.add(item.id);
          }
        }
        if (fresh.size > 0) {
          setNewIds(fresh);
        }
        prevActiveIdsRef.current = new Set(activeQueue.map(q => q.id));
      }
    }
  }, [activeQueue]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const rank: Record<string, number> = { EMG: 0, URG: 1, RTN: 2 };

    Promise.all([
      appointmentsApi.doctorQueue('active'),
      appointmentsApi.doctorQueue('past'),
    ])
      .then(([active, past]) => {
        const activeItems = active.map(appointmentToQueueItem);
        activeItems.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
        setActiveQueue(activeItems);

        const pastItems = past.map(appointmentToQueueItem);
        setPastQueue(pastItems);

        const statusMap: Record<string, Appointment['status']> = {};
        for (const a of active) statusMap[a.id] = a.status;
        for (const a of past)   statusMap[a.id] = a.status;
        setQueueStatus(statusMap);
      })
      .catch(err => setLoadError(err?.message || 'Could not load queue'))
      .finally(() => setLoading(false));
  }, []);

  // What the table shows is derived from the active tab.
  const queue = tab === 'active' ? activeQueue : pastQueue;
  const setQueue = (updater: (prev: QueueItem[]) => QueueItem[]) => {
    // Live mutations only make sense for the active tab (ACCEPT / OVERRIDE / COMPLETE / NO_SHOW).
    // We still keep the API shape so applyUpdatedAppointment stays simple.
    if (tab === 'active') setActiveQueue(updater);
    else setPastQueue(updater);
  };
  const activeCount = activeQueue.length;
  const pastCount = pastQueue.length;

  useEffect(() => {
    reload();
  }, [reload]);

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

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rxEditorFor, setRxEditorFor] = useState<QueueItem | null>(null);

  const applyUpdatedAppointment = (updated: Appointment) => {
    const next = appointmentToQueueItem(updated);
    setQueue(prev => {
      const kept = prev.filter(q => q.id !== next.id);
      // Drop from queue if it's no longer active (completed/no_show); otherwise re-insert.
      const stillActive =
        updated.status === 'BOOKED' || updated.status === 'CONFIRMED';
      const merged = stillActive ? [...kept, next] : kept;
      const rank: Record<string, number> = { EMG: 0, URG: 1, RTN: 2 };
      merged.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
      return merged;
    });
    setSelectedItem(stillActiveSelector(updated) ? next : null);
  };

  const stillActiveSelector = (a: Appointment) =>
    a.status === 'BOOKED' || a.status === 'CONFIRMED';

  const runAction = async (
    action: 'ACCEPT' | 'START' | 'COMPLETE' | 'NO_SHOW',
    extra?: { notes?: string }
  ) => {
    if (!selectedItem) return;
    setActionBusy(action);
    setActionError(null);
    try {
      const updated = await appointmentsApi.doctorAction(selectedItem.id, {
        action,
        notes: extra?.notes,
      });
      applyUpdatedAppointment(updated);
      setSaveBanner(true);
      setTimeout(() => setSaveBanner(false), 2500);
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedItem) return;
    const newUrgency: 'EMERGENCY' | 'URGENT' | 'ROUTINE' =
      overrideScore === 'Emergency' ? 'EMERGENCY'
      : overrideScore === 'Urgent' ? 'URGENT'
      : 'ROUTINE';
    const currentUrgency: 'EMERGENCY' | 'URGENT' | 'ROUTINE' =
      selectedItem.urgency === 'EMG' ? 'EMERGENCY'
      : selectedItem.urgency === 'URG' ? 'URGENT'
      : 'ROUTINE';
    if (newUrgency === currentUrgency) {
      setActionError('Pick a different urgency to override, or cancel.');
      return;
    }
    if (!overrideReason.trim()) {
      setActionError('A clinical reason is required to override urgency.');
      return;
    }
    setActionBusy('OVERRIDE_URGENCY');
    setActionError(null);
    try {
      const updated = await appointmentsApi.doctorAction(selectedItem.id, {
        action: 'OVERRIDE_URGENCY',
        urgency: newUrgency,
        reason: overrideReason.trim(),
      });
      applyUpdatedAppointment(updated);
      setSaveBanner(true);
      setTimeout(() => setSaveBanner(false), 2500);
    } catch (err: any) {
      setActionError(err.message || 'Could not save override');
    } finally {
      setActionBusy(null);
    }
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

  // Emergency banner should only come from the live queue.
  const emergencyItem = activeQueue.find(q => q.urgency === 'EMG');

  // KPIs are always derived from the active queue, independent of which tab you're viewing.
  const kpiTotal = activeQueue.length;
  const kpiEmergency = activeQueue.filter(q => q.urgency === 'EMG').length;
  const kpiUrgent = activeQueue.filter(q => q.urgency === 'URG').length;
  const location = useLocation();
  const currentSection = location.hash === '#availability' ? 'availability'
    : location.hash === '#patients' ? 'patients'
    : location.hash === '#transcripts' ? 'transcripts'
    : 'queue';

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <PageTransition style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '36px 20px 64px 20px',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      color: '#1a110a',
    }}>
      {currentSection === 'queue' && (
      <>
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
            color: loadError ? '#dc2626' : loading ? '#785b47' : '#059669',
            marginTop: '4px',
            fontWeight: 500,
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: loadError ? '#dc2626' : loading ? '#d97706' : '#10b981',
              display: 'inline-block',
            }} />
            <span>
              {loadError ? `Error: ${loadError}` : loading ? 'Fetching queue…' : `Live · ${activeCount} active`}
            </span>
            <button
              onClick={reload}
              title="Refresh"
              className="icon-pop"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#785b47', padding: '0 4px', display: 'inline-flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div style={{
          fontSize: '13px',
          color: '#706b63',
          fontWeight: 500,
        }}>
          {todayLabel}
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
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '18px 22px',
            border: '1px solid #eae3d8',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#706b63', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: '4px 0' }}>
            {kpiTotal}
          </div>
          <div style={{ fontSize: '13px', color: '#706b63' }}>
            booked + confirmed
          </div>
        </div>

        {/* Tile 2: Emergency */}
        <div
          className="card-hover"
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '16px',
            padding: '18px 22px',
            border: '1px solid #fecaca',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.06)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Emergency
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', margin: '4px 0' }}>
            {kpiEmergency}
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
        <div
          className="card-hover"
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '16px',
            padding: '18px 22px',
            border: '1px solid #fde68a',
            boxShadow: '0 4px 16px rgba(217, 119, 6, 0.06)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Urgent
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#b45309', margin: '4px 0' }}>
            {kpiUrgent}
          </div>
          <div style={{ fontSize: '13px', color: '#b45309' }}>
            same-day review
          </div>
        </div>

        {/* Tile 4: Routine */}
        <div
          className="card-hover"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '18px 22px',
            border: '1px solid #eae3d8',
            boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#706b63', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Routine
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: '4px 0' }}>
            {Math.max(0, activeQueue.length - kpiEmergency - kpiUrgent)}
          </div>
          <div style={{ fontSize: '13px', color: '#706b63' }}>
            scheduled visits
          </div>
        </div>
      </section>

      {/* TAB STRIP: Active queue vs past appointments */}
      <section style={{
        display: 'flex', gap: '4px',
        borderBottom: '1px solid #eae3d8',
        marginBottom: '22px',
      }}>
        {([
          { k: 'active', label: `Live queue (${activeCount})` },
          { k: 'past', label: `Past appointments (${pastCount})` },
        ] as const).map(t => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => { setTab(t.k); setSelectedItem(null); }}
              style={{
                padding: '10px 20px', fontSize: '14px',
                fontWeight: active ? 700 : 500,
                color: active ? '#1a110a' : '#706b63',
                background: 'transparent', border: 'none',
                borderBottom: active ? '2px solid #785b47' : '2px solid transparent',
                marginBottom: '-1px', cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </section>

      {/* EMERGENCY PRIORITY BANNER (only on active tab) */}
      {tab === 'active' && emergencyItem && (
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
          <CustomSelect
            value={filterUrgency}
            onChange={setFilterUrgency}
            options={[
              { value: 'ALL', label: 'All Urgencies' },
              { value: 'EMG', label: 'Emergency' },
              { value: 'URG', label: 'Urgent' },
              { value: 'RTN', label: 'Routine' },
            ]}
            variant="pill"
          />

          {/* Mode Filter */}
          <CustomSelect
            value={filterMode}
            onChange={setFilterMode}
            options={[
              { value: 'ALL', label: 'All Modes' },
              { value: 'VID', label: 'Video' },
              { value: 'IPS', label: 'In-person' },
            ]}
            variant="pill"
          />

          {/* Status Filter */}
          <CustomSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'WAITING', label: 'Waiting' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'DONE', label: 'Done' },
            ]}
            variant="pill"
          />
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
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#706b63' }}>
                    <Loader2 size={20} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                    Fetching your queue…
                  </td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>
                    {loadError}
                  </td>
                </tr>
              )}
              {!loading && !loadError && filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#706b63' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a110a', marginBottom: '6px' }}>
                      {queue.length === 0 ? 'No patients in your queue yet' : 'No rows match the current filters'}
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      {queue.length === 0
                        ? 'When a patient books with you, their case appears here.'
                        : 'Clear a filter or search term to see more.'}
                    </div>
                  </td>
                </tr>
              )}
              <AnimatePresence>
                {!loading && !loadError && filteredQueue.map(item => {
                  const isEmergency = item.urgency === 'EMG';
                  const isUrgent = item.urgency === 'URG';
                  const isNew = newIds.has(item.id);

                  const dotColor = isEmergency ? '#dc2626' : isUrgent ? '#d97706' : '#10b981';
                  const labelText = isEmergency ? 'EMG' : isUrgent ? 'URG' : 'RTN';

                  return (
                    <motion.tr
                      key={item.id}
                      layout
                      variants={listItem}
                      initial={isNew ? { backgroundColor: '#fff2d4' } : "initial"}
                      animate={isNew ? {
                        backgroundColor: isEmergency ? '#fffbfb' : '#ffffff',
                        ...(isEmergency ? { borderLeftColor: ['#dc2626', 'transparent', '#dc2626'] } : {})
                      } : "animate"}
                      exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE_EXIT } }}
                      transition={isNew ? { duration: 1.0, ease: EASE_ENTER } : undefined}
                      style={{
                        borderBottom: '1px solid #f2ece2',
                        backgroundColor: isEmergency ? '#fffbfb' : '#ffffff',
                        borderLeft: isEmergency ? '3px solid #dc2626' : '3px solid transparent',
                        height: '50px',
                      }}
                      onMouseEnter={e => {
                        if (!isEmergency) e.currentTarget.style.backgroundColor = '#faf6f0';
                      }}
                      onMouseLeave={e => {
                        if (!isEmergency) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* Urgency + (on Past tab) real status */}
                      <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                        <div
                          className="badge-morph"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontWeight: 700, fontSize: '12px', color: dotColor,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />
                          <span>{labelText}</span>
                        </div>
                        {tab === 'past' && queueStatus[item.id] && (
                          <div style={{ marginTop: '4px' }}>
                            <span
                              className="badge-morph"
                              style={{
                                fontSize: '10px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                padding: '2px 8px', borderRadius: '9999px',
                                color: queueStatus[item.id] === 'COMPLETED' ? '#065f46'
                                     : queueStatus[item.id] === 'NO_SHOW' ? '#92400e'
                                     : '#6b7280',
                                backgroundColor: queueStatus[item.id] === 'COMPLETED' ? '#d1fae5'
                                     : queueStatus[item.id] === 'NO_SHOW' ? '#fef3c7'
                                     : '#f3f4f6',
                              }}
                            >
                              {queueStatus[item.id]}
                            </span>
                          </div>
                        )}
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
                          className="hover-lift"
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
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
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
          <div style={{ color: '#8c857b' }}>
            Showing {filteredQueue.length} of {queue.length}
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
      </>
      )}

      {/* AVAILABILITY SECTION */}
      {currentSection === 'availability' && (
        <div>
          <section style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: 0, letterSpacing: '-0.025em' }}>
              Clinical Availability & Slot Inventory
            </h1>
            <div style={{ fontSize: '14px', color: '#706b63', marginTop: '4px' }}>
              Set consultation hours, review your forward 7-day slot inventory, and manage booking availability.
            </div>
          </section>

          {/* Availability Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px 22px', border: '1px solid #eae3d8', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#785b47', marginBottom: '8px' }}>
                <Clock size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consultation Hours</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a110a' }}>09:30 AM – 05:30 PM</div>
              <div style={{ fontSize: '13px', color: '#706b63', marginTop: '4px' }}>Mon – Sat · 30 min per visit</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px 22px', border: '1px solid #eae3d8', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '8px' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forward Inventory</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a110a' }}>7-Day Rolling Window</div>
              <div style={{ fontSize: '13px', color: '#706b63', marginTop: '4px' }}>6 slots / day · Auto-regenerated</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px 22px', border: '1px solid #eae3d8', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#785b47', marginBottom: '8px' }}>
                <Calendar size={16} />
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Telehealth & In-Person</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>● Online & Active</div>
              <div style={{ fontSize: '13px', color: '#706b63', marginTop: '4px' }}>Accepting both video & clinic visits</div>
            </div>
          </div>

          {/* 7-Day Rolling Calendar View */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #eae3d8', padding: '24px', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a', marginBottom: '16px' }}>Upcoming 7 Days Slots</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              {Array.from({ length: 7 }).map((_, idx) => {
                const d = new Date();
                d.setDate(d.getDate() + idx);
                const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short' });
                const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <div key={idx} style={{ backgroundColor: idx === 0 ? '#faf6f0' : '#fcfbfa', border: idx === 0 ? '1px solid #785b47' : '1px solid #eae3d8', borderRadius: '14px', padding: '14px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: idx === 0 ? '#785b47' : '#1a110a' }}>{dayName}</div>
                    <div style={{ fontSize: '12px', color: '#706b63', marginBottom: '10px' }}>{dateStr}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {['09:30 AM', '10:30 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'].map((time, tIdx) => (
                        <div key={tIdx} style={{ fontSize: '11px', fontWeight: 600, padding: '4px 6px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #eae3d8', color: '#443e37', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{time}</span>
                          <span style={{ color: '#059669', fontSize: '9px', fontWeight: 700 }}>OPEN</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PATIENTS DIRECTORY SECTION */}
      {currentSection === 'patients' && (
        <div>
          <section style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: 0, letterSpacing: '-0.025em' }}>
              Patient Directory
            </h1>
            <div style={{ fontSize: '14px', color: '#706b63', marginTop: '4px' }}>
              Review clinical profiles, previous diagnoses, and appointment histories for patients under your care.
            </div>
          </section>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #eae3d8', overflow: 'hidden', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #eae3d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a110a' }}>
                All Patients ({[...activeQueue, ...pastQueue].length > 0 ? [...activeQueue, ...pastQueue].length : 3})
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#faf7f2', borderBottom: '1px solid #eae3d8', color: '#706b63', fontWeight: 600 }}>
                    <th style={{ padding: '12px 20px' }}>Patient</th>
                    <th style={{ padding: '12px 20px' }}>Patient ID</th>
                    <th style={{ padding: '12px 20px' }}>Latest Complaint</th>
                    <th style={{ padding: '12px 20px' }}>Urgency</th>
                    <th style={{ padding: '12px 20px' }}>Last Consultation</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {([...activeQueue, ...pastQueue].length > 0 ? [...activeQueue, ...pastQueue] : [
                    { id: '1', patientName: 'Hari Patel', patientId: '#8b17', chiefComplaint: 'Persistent fever and mild throat pain', urgency: 'URG' as const, slot: 'Today · 07:30 PM' },
                    { id: '2', patientName: 'Sarah Jenkins', patientId: '#4500', chiefComplaint: 'Follow-up for asthma and bronchial review', urgency: 'RTN' as const, slot: 'Yesterday · 11:30 AM' },
                    { id: '3', patientName: 'Avi Patel', patientId: '#3a21', chiefComplaint: 'Acute chest tightness during exertion', urgency: 'EMG' as const, slot: '2 days ago · 09:30 AM' },
                  ]).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f2ece2' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1a110a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f0ebe1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#785b47', fontWeight: 700 }}>
                            {p.patientName.charAt(0)}
                          </div>
                          <span>{p.patientName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#706b63', fontFamily: 'monospace' }}>{p.patientId}</td>
                      <td style={{ padding: '14px 20px', color: '#332b24' }}>{p.chiefComplaint || 'Consultation follow-up'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: p.urgency === 'EMG' ? '#fee2e2' : p.urgency === 'URG' ? '#fef3c7' : '#ecfdf5',
                          color: p.urgency === 'EMG' ? '#dc2626' : p.urgency === 'URG' ? '#d97706' : '#059669',
                        }}>
                          {p.urgency === 'EMG' ? 'Emergency' : p.urgency === 'URG' ? 'Urgent' : 'Routine'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#706b63' }}>{p.slot}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            if ('rationale' in p) handleOpenItem(p as QueueItem);
                            window.location.hash = '#my-queue';
                          }}
                          style={{ backgroundColor: '#f5efe6', border: '1px solid #eae3d8', borderRadius: '9999px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#785b47', cursor: 'pointer' }}
                        >
                          View Case
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRANSCRIPTS SECTION */}
      {currentSection === 'transcripts' && (
        <div>
          <section style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a110a', margin: 0, letterSpacing: '-0.025em' }}>
              Consultation Transcripts & Clinical Notes
            </h1>
            <div style={{ fontSize: '14px', color: '#706b63', marginTop: '4px' }}>
              Deepgram speech-to-text transcripts, AI-generated advisory summaries, and verified clinician notes (DR-11, DR-15).
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                id: 'tr-01',
                patient: 'Hari Patel (#8b17)',
                date: 'Today · 07:30 PM',
                mode: 'Video Consultation',
                status: 'Reviewed & Approved',
                summary: 'Patient presented with a 3-day history of 101°F fever and throat discomfort. Denies shortness of breath or chest pain. Advised oral hydration, Paracetamol 650mg SOS, and CBC if fever persists beyond 48 hours.',
                consent: 'Explicit Audio Recording Consent Verified (DPDP / DR-11)',
              },
              {
                id: 'tr-02',
                patient: 'Sarah Jenkins (#4500)',
                date: 'Yesterday · 11:30 AM',
                mode: 'In-person Clinic Visit',
                status: 'Clinician Verified',
                summary: 'Regular asthma follow-up. Peak flow measurements stable at 420 L/min. Continued Budesonide/Formoterol 200/6 inhaler 1 puff twice daily. Next review in 3 months.',
                consent: 'Explicit In-Clinic Transcription Consent Verified',
              },
            ].map(item => (
              <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #eae3d8', padding: '22px 24px', boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a110a' }}>{item.patient}</span>
                    <span style={{ fontSize: '13px', color: '#706b63', marginLeft: '10px' }}>{item.date} · {item.mode}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                    ✓ {item.status}
                  </span>
                </div>
                <div style={{ backgroundColor: '#faf7f2', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', lineHeight: '1.6', color: '#2b251f', marginBottom: '12px', border: '1px solid #ede7de' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#785b47', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    AI Clinical Summary (Advisory Only)
                  </div>
                  {item.summary}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#706b63', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                    <ShieldCheck size={14} />
                    <span>{item.consent}</span>
                  </div>
                  <button
                    onClick={() => alert('Transcript and clinical summary ready for export.')}
                    style={{ background: 'none', border: 'none', color: '#785b47', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Export / Print Notes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLINICAL REVIEW SIDE DRAWER (Slides from right, 480px width) */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#1a110a',
                zIndex: 99,
              }}
            />
            <motion.aside
              key="drawer-body"
              variants={slideInRight}
              initial="initial"
              animate="animate"
              exit={{ x: 480, opacity: 0.9, transition: { duration: 0.22, ease: EASE_EXIT } }}
              style={{
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
              }}
            >
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
                  className="icon-pop"
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
                <AnimatePresence>
                  {saveBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: EASE_ENTER }}
                      style={{
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      ✓ Clinical override updated successfully.
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        disabled={actionBusy === 'OVERRIDE_URGENCY'}
                        className="hover-lift"
                        style={{
                          backgroundColor: '#785b47',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: actionBusy === 'OVERRIDE_URGENCY' ? 'wait' : 'pointer',
                          opacity: actionBusy === 'OVERRIDE_URGENCY' ? 0.6 : 1,
                        }}
                      >
                        {actionBusy === 'OVERRIDE_URGENCY' ? 'Saving…' : 'Save with reason'}
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
                    {actionError && (
                      <div style={{
                        marginTop: '4px',
                        fontSize: '12px', color: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.06)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: '8px', padding: '6px 10px',
                      }}>{actionError}</div>
                    )}
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

              {/* Drawer Footer: read-only banner on past tab, actions on active */}
              {tab === 'past' ? (
                <div style={{
                  padding: '18px 24px', borderTop: '1px solid #eae3d8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '10px', flexWrap: 'wrap',
                  backgroundColor: '#faf7f1',
                }}>
                  <div style={{ fontSize: '13px', color: '#706b63' }}>
                    Read-only · final status:{' '}
                    <strong style={{ color: '#1a110a' }}>{queueStatus[selectedItem.id] ?? '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setRxEditorFor(selectedItem)}
                      className="hover-lift"
                      style={{
                        backgroundColor: '#785b47', color: '#ffffff',
                        border: 'none', borderRadius: '9999px',
                        padding: '8px 18px', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Prescription
                    </button>
                    <button
                      onClick={() => setSelectedItem(null)}
                      style={{
                        backgroundColor: 'transparent', color: '#2b2520',
                        border: '1px solid #dcd4c7', borderRadius: '9999px',
                        padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
              <div style={{
                padding: '18px 24px',
                borderTop: '1px solid #eae3d8',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => runAction('ACCEPT')}
                  disabled={!!actionBusy}
                  className="hover-lift"
                  style={{
                    flex: 1, minWidth: '140px',
                    backgroundColor: '#785b47',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '11px 0',
                    fontSize: '13px', fontWeight: 600,
                    cursor: actionBusy ? 'wait' : 'pointer',
                    opacity: actionBusy ? 0.6 : 1,
                  }}
                  title="Accept this appointment (BOOKED → CONFIRMED)"
                >
                  {actionBusy === 'ACCEPT' ? 'Accepting…' : 'Accept & confirm'}
                </button>
                <button
                  onClick={() => runAction('COMPLETE', { notes: 'Consultation completed' })}
                  disabled={!!actionBusy}
                  className="hover-lift"
                  style={{
                    flex: 1, minWidth: '120px',
                    backgroundColor: '#059669', color: '#ffffff',
                    border: 'none', borderRadius: '9999px',
                    padding: '11px 0', fontSize: '13px', fontWeight: 600,
                    cursor: actionBusy ? 'wait' : 'pointer',
                    opacity: actionBusy ? 0.6 : 1,
                  }}
                  title="Mark completed"
                >
                  {actionBusy === 'COMPLETE' ? 'Saving…' : 'Mark complete'}
                </button>
                <button
                  onClick={() => runAction('NO_SHOW')}
                  disabled={!!actionBusy}
                  className="hover-lift"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    borderRadius: '9999px',
                    padding: '11px 18px',
                    fontSize: '13px', fontWeight: 500,
                    cursor: actionBusy ? 'wait' : 'pointer',
                  }}
                >
                  {actionBusy === 'NO_SHOW' ? 'Saving…' : 'No-show'}
                </button>
                <button
                  onClick={() => setRxEditorFor(selectedItem)}
                  disabled={!!actionBusy}
                  className="hover-lift"
                  style={{
                    backgroundColor: '#0284c7', color: '#ffffff',
                    border: 'none', borderRadius: '9999px',
                    padding: '11px 18px', fontSize: '13px', fontWeight: 600,
                    cursor: actionBusy ? 'wait' : 'pointer',
                  }}
                >
                  Write prescription
                </button>
              </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {rxEditorFor && (
        <PrescriptionEditor
          appointmentId={rxEditorFor.id}
          patientName={rxEditorFor.patientName}
          onClose={() => setRxEditorFor(null)}
        />
      )}
    </PageTransition>
  );
};
