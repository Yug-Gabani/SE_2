import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageTransition } from '../motion/PageTransition';
import { ArrowLeft, Building2, Loader2, MapPin, Phone, Stethoscope } from 'lucide-react';
import type { Doctor, Hospital } from '../types';
import { doctorsApi, hospitalsApi } from '../services/api';

export const HospitalDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    Promise.all([
      hospitalsApi.get(id),
      doctorsApi.list(undefined, id),
    ]).then(([h, docs]) => {
      setHospital(h);
      setDoctors(docs);
    }).catch(e => setError(e?.message || 'Failed to load hospital'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageTransition style={{ maxWidth: '900px', margin: '48px auto', padding: '0 24px' }}>
      <button
        onClick={() => navigate(-1)}
        className="hover-lift"
        style={{
          background: 'transparent', border: 'none', color: '#785b47',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          padding: '6px 0', marginBottom: '16px',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#706b63' }}>
          <Loader2 size={22} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />
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

      {hospital && (
        <>
          <div className="card card-hover" style={{ padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: '#f5efe6', color: '#785b47',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Building2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a110a', margin: 0 }}>
                  {hospital.name}
                </h1>
                {hospital.address && (
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {hospital.address}
                    {[hospital.city, hospital.state, hospital.pincode].filter(Boolean).length > 0 && (
                      <span>, {[hospital.city, hospital.state, hospital.pincode].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                )}
                {hospital.phone && (
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} /> {hospital.phone}
                  </div>
                )}
              </div>
            </div>

            {hospital.specialties.length > 0 && (
              <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {hospital.specialties.map(s => (
                  <span
                    key={s}
                    className="chip"
                    style={{
                      padding: '3px 10px', borderRadius: '9999px',
                      fontSize: '12px', color: '#443e37',
                      backgroundColor: '#faf7f1', border: '1px solid #eae3d8',
                    }}
                  >{s}</span>
                ))}
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a110a', margin: '28px 0 12px 0' }}>
            Doctors at this hospital
          </h2>

          {doctors.length === 0 ? (
            <div className="card card-hover" style={{ padding: '28px', textAlign: 'center' }}>
              <Stethoscope size={24} color="#b8b0a5" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: '14px', color: '#443f38', fontWeight: 600 }}>
                No doctors onboarded here yet
              </div>
              <div style={{ fontSize: '12px', color: '#7a736a', marginTop: 4 }}>
                Try booking via symptom triage — we'll suggest the best match across all hospitals.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {doctors.map(d => (
                <div key={d.id} className="card card-hover" style={{
                  padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {d.avatarUrl ? (
                      <img src={d.avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        backgroundColor: '#f5efe6', color: '#785b47',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                      }}>{d.fullName.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: '#1a110a' }}>{d.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#706b63' }}>
                        {d.specialty} · ★ {Number(d.rating).toFixed(2)} · {d.openSlotCount} slots
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/book')}
                    className="hover-lift"
                    style={{
                      backgroundColor: '#785b47', color: '#ffffff', border: 'none',
                      borderRadius: '9999px', padding: '8px 16px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Book via triage
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
};
