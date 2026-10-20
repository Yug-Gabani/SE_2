import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from '../motion/PageTransition';
import { fadeInUp } from '../motion/presets';
import { CustomSelect } from './CustomSelect';
import { WaveInput } from './WaveInput';
import { ArrowLeft, Loader2, Save, UserCircle2 } from 'lucide-react';
import type { Gender, PatientProfile as PatientProfileT } from '../types';
import { profileApi } from '../services/api';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfileT | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    setLoading(true);
    profileApi.get()
      .then(setProfile)
      .catch(e => setError(e?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof PatientProfileT>(k: K, v: PatientProfileT[K]) =>
    setProfile(p => (p ? { ...p, [k]: v } : p));

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true); setError(null);
    try {
      const saved = await profileApi.update({
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        addressStreet: profile.addressStreet,
        addressCity: profile.addressCity,
        addressState: profile.addressState,
        addressPincode: profile.addressPincode,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
      });
      setProfile(saved);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    } catch (e: any) {
      setError(e?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition style={{ maxWidth: '720px', margin: '48px auto', padding: '0 24px' }}>
      <button
        onClick={() => navigate(-1)}
        className="hover-lift"
        style={{
          background: 'transparent', border: 'none', color: '#0f766e',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          padding: '6px 0', marginBottom: '16px',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0b3f3a', margin: 0, letterSpacing: '-0.02em' }}>
        My profile
      </h1>
      <p style={{ color: '#52736d', margin: '6px 0 24px 0' }}>
        Keeping this up to date helps your doctor provide the best care and lets us reach your emergency contact if needed.
      </p>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#52736d' }}>
          <Loader2 size={22} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} /> Loading…
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          color: '#dc2626', fontSize: '13px', marginBottom: '16px',
        }}>{error}</div>
      )}

      <AnimatePresence>
        {savedBanner && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              padding: '10px 14px', borderRadius: '10px',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              color: '#065f46', fontSize: '13px', marginBottom: '16px',
            }}
          >
            Profile saved ✓
          </motion.div>
        )}
      </AnimatePresence>

      {profile && (
        <div className="card card-hover" style={{ padding: '28px' }}>
          {/* Identity */}
          <SectionHeading icon={<UserCircle2 size={18} />} label="Identity" />
          <Row>
            <WaveInput
              label="Full name"
              value={profile.fullName ?? ''}
              onChange={v => set('fullName', v)}
            />
            <WaveInput
              label="Email (read-only)"
              value={profile.email}
              onChange={() => {}}
              disabled
            />
          </Row>
          <Row>
            <WaveInput
              label="Phone number"
              value={profile.phone ?? ''}
              onChange={v => set('phone', v)}
            />
            <WaveInput
              label="Date of birth"
              type="date"
              value={profile.dateOfBirth ?? ''}
              onChange={v => set('dateOfBirth', v || undefined)}
            />
          </Row>
          <Row>
            <Field label="Gender">
              <CustomSelect
                value={profile.gender ?? ''}
                options={[{ value: '', label: 'Select gender' }, ...GENDERS]}
                onChange={val => set('gender', (val || undefined) as Gender | undefined)}
                variant="input"
              />
            </Field>
            <div />
          </Row>

          {/* Address */}
          <SectionHeading label="Address" />
          <WaveInput
            label="Street Address"
            value={profile.addressStreet ?? ''}
            onChange={v => set('addressStreet', v)}
          />
          <Row>
            <WaveInput
              label="City"
              value={profile.addressCity ?? ''}
              onChange={v => set('addressCity', v)}
            />
            <WaveInput
              label="State"
              value={profile.addressState ?? ''}
              onChange={v => set('addressState', v)}
            />
          </Row>
          <Row>
            <WaveInput
              label="Pincode"
              value={profile.addressPincode ?? ''}
              onChange={v => set('addressPincode', v)}
            />
            <div />
          </Row>

          {/* Emergency contact */}
          <SectionHeading label="Emergency contact" />
          <Row>
            <WaveInput
              label="Emergency Contact Name"
              value={profile.emergencyContactName ?? ''}
              onChange={v => set('emergencyContactName', v)}
            />
            <WaveInput
              label="Emergency Contact Phone"
              value={profile.emergencyContactPhone ?? ''}
              onChange={v => set('emergencyContactPhone', v)}
            />
          </Row>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave} disabled={saving}
              className="hover-lift"
              style={{
                backgroundColor: '#0f766e', color: '#ffffff', border: 'none',
                borderRadius: '9999px', padding: '10px 22px',
                fontSize: '14px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save changes</>}
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

const SectionHeading: React.FC<{ icon?: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '11px', fontWeight: 700, color: '#8aa39d',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    margin: '20px 0 10px 0', paddingTop: '12px',
    borderTop: '1px solid #d9ece7',
  }}>
    {icon}{label}
  </div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#8aa39d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
      {label}
    </div>
    {children}
  </div>
);
