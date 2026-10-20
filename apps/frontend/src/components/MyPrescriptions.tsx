import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from '../motion/PageTransition';
import { listItem } from '../motion/presets';
import { Download, FileText, Loader2, Pill } from 'lucide-react';
import type { Prescription } from '../types';
import { describePrescriptionItem } from '../types';
import { prescriptionsApi } from '../services/api';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const MyPrescriptions: React.FC = () => {
  const navigate = useNavigate();
  const [rxList, setRxList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    prescriptionsApi
      .mine()
      .then(setRxList)
      .catch(e => setError(e?.message || 'Failed to load prescriptions'))
      .finally(() => setLoading(false));
  }, []);

  const downloadPdf = (id: string) => {
    const token = localStorage.getItem('pulsecare_token');
    fetch(prescriptionsApi.pdfUrl(id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Download failed'));
  };

  return (
    <PageTransition style={{ maxWidth: '960px', margin: '48px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0b3f3a', margin: 0, letterSpacing: '-0.02em' }}>
        My prescriptions
      </h1>
      <p style={{ color: '#52736d', margin: '6px 0 24px 0' }}>
        Prescriptions issued by your doctors. Download the PDF to show at the pharmacy.
      </p>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#52736d' }}>
          <Loader2 size={24} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
          Loading…
        </div>
      )}

      {error && (
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          color: '#dc2626', fontSize: '14px',
        }}>{error}</div>
      )}

      {!loading && !error && rxList.length === 0 && (
        <div className="card card-hover" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: '#eaf6f2', color: '#0f766e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Pill size={26} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0b3f3a', margin: '0 0 8px 0' }}>
            No prescriptions yet
          </h2>
          <p style={{ color: '#52736d', marginBottom: '24px' }}>
            After your doctor completes a consultation and issues a prescription, it will appear here.
          </p>
          <button onClick={() => navigate('/appointments')} className="btn btn-primary hover-lift">
            View my appointments
          </button>
        </div>
      )}

      {!loading && !error && rxList.length > 0 && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <AnimatePresence>
            {rxList.map(rx => {
              const voided = rx.status === 'VOIDED';
              const supersededVoid = !voided
                ? rxList
                    .filter(r =>
                      r.appointmentId === rx.appointmentId &&
                      r.status === 'VOIDED' &&
                      new Date(r.createdAt).getTime() < new Date(rx.createdAt).getTime(),
                    )
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                : null;
              const isSupersededSigned = !voided && rxList.some(r =>
                r.status === 'VOIDED' && r.voidOf === rx.id,
              );
              return (
                <motion.div
                  key={rx.id}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="card card-hover"
                  style={{ padding: '20px' }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '12px', flexWrap: 'wrap', gap: '10px',
                  }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0b3f3a' }}>
                        {rx.doctorName ?? 'Doctor'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#52736d' }}>
                        {rx.doctorSpecialty} · {rx.doctorHospital}
                      </div>
                    </div>
                    <span
                      className="badge-morph"
                      style={{
                        padding: '3px 12px', borderRadius: '9999px',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                        color: voided || isSupersededSigned ? '#991b1b' : '#065f46',
                        backgroundColor: voided || isSupersededSigned ? '#fee2e2' : '#d1fae5',
                      }}
                    >{isSupersededSigned ? 'SUPERSEDED' : rx.status}</span>
                  </div>

                  {/* Primary "signed by / on" / "voided on" line */}
                  <div style={{ fontSize: '13px', color: '#52736d', marginBottom: '6px' }}>
                    {voided
                      ? `Voided on ${formatDate(rx.createdAt)}`
                      : <>Signed by <strong style={{ color: '#0b3f3a' }}>{rx.doctorName ?? 'Attending physician'}</strong> on {formatDate(rx.signedAt ?? rx.createdAt)}</>}
                    {voided && rx.voidReason ? ` · ${rx.voidReason}` : ''}
                  </div>

                  {/* "Replaces voided prescription from…" annotation */}
                  {supersededVoid && (
                    <div
                      className="badge-morph"
                      style={{
                        fontSize: '12px', color: '#92400e',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        padding: '6px 10px', borderRadius: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      This replaces a voided prescription from {formatDate(supersededVoid.createdAt)}
                      {supersededVoid.voidReason ? ` — ${supersededVoid.voidReason}` : ''}.
                    </div>
                  )}

                  {/* SUPERSEDED banner on the earlier SIGNED copy */}
                  {isSupersededSigned && (
                    <div
                      className="badge-morph"
                      style={{
                        fontSize: '12px', color: '#991b1b',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '6px 10px', borderRadius: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      This prescription was voided and replaced by a newer one. Do not act on it.
                    </div>
                  )}

                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#0b3f3a', lineHeight: 1.7 }}>
                    {rx.items.map(it => (
                      <li key={it.id ?? it.drugName} style={{ marginBottom: '6px' }}>
                        <strong>{it.drugName}</strong> — {describePrescriptionItem(it)}
                        {it.instructions ? (
                          <div style={{ fontSize: '12px', color: '#52736d', marginTop: '2px' }}>
                            Notes: {it.instructions}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {rx.notes && (
                    <div style={{
                      marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                      backgroundColor: '#eaf6f2', border: '1px solid #d9ece7',
                      fontSize: '13px', color: '#0b3f3a',
                    }}>
                      <strong>Notes:</strong> {rx.notes}
                    </div>
                  )}

                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => downloadPdf(rx.id)} className="btn btn-secondary hover-lift">
                      <Download size={14} /> PDF
                    </button>
                    <button onClick={() => navigate(`/appointments/${rx.appointmentId}`)} className="btn btn-secondary hover-lift">
                      <FileText size={14} /> View appointment
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </PageTransition>
  );
};
