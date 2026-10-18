// BodyMapHero.tsx
// Drop-in landing-page section for PulseCare.
// Deps: react ^19, framer-motion, lucide-react.
// Place your anatomy renders at /anatomy-front.png and /anatomy-back.png (or
// pass custom URLs via the frontImage / backImage props).

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export type HotspotId =
  | 'head' | 'mental' | 'chest' | 'abdomen' | 'joints' | 'skin' | 'reproductive'
  | 'knee' | 'ankle'
  | 'neck_back' | 'upper_back' | 'lower_back' | 'hips_back' | 'calf';

export interface Hotspot {
  id: HotspotId;
  view: 'front' | 'back';
  label: string;
  specialties: string[];
  commonConditions: string[];
  triageHint: string;
  /** Position in a 420x640 virtual viewBox (matches both anatomy images at 2:3). */
  x: number;
  y: number;
  /** Mental-health hotspot shows a soft glow halo. */
  glow?: boolean;
}

const HOTSPOTS: Hotspot[] = [
  // FRONT
  { id: 'head',         view: 'front', label: 'Head & neurological',    specialties: ['Neurology','ENT'],                     commonConditions: ['Migraine','Dizziness','Sinus pain'],               triageHint: 'Headaches, dizziness, hearing or sinus trouble.',          x: 210, y: 60  },
  { id: 'mental',       view: 'front', label: 'Mental health',          specialties: ['Psychiatry','Psychology'],             commonConditions: ['Anxiety','Low mood','Sleep issues'],               triageHint: 'Mood, anxiety, sleep, focus — talk to someone trained.',   x: 232, y: 42, glow: true },
  { id: 'chest',        view: 'front', label: 'Chest & heart',          specialties: ['Cardiology','Pulmonology'],            commonConditions: ['Chest pain','Palpitations','Shortness of breath'], triageHint: 'Pressure, breathlessness or irregular heartbeat.',         x: 213, y: 150 },
  { id: 'abdomen',      view: 'front', label: 'Stomach & digestion',    specialties: ['Gastroenterology','General Medicine'], commonConditions: ['Acidity','Abdominal pain','Nausea'],               triageHint: 'Belly pain, reflux, bowel changes, nausea.',               x: 210, y: 232 },
  { id: 'joints',       view: 'front', label: 'Bones & joints',         specialties: ['Orthopedics','Rheumatology'],          commonConditions: ['Joint pain','Back strain','Fractures'],            triageHint: 'Joints, bones, stiffness, old injuries flaring up.',       x: 300, y: 128 },
  { id: 'skin',         view: 'front', label: 'Skin & allergies',       specialties: ['Dermatology'],                         commonConditions: ['Rash','Acne','Itching'],                           triageHint: 'Rashes, acne, itching, or anything that’s changed.',       x: 330, y: 270 },
  { id: 'reproductive', view: 'front', label: 'Reproductive & urinary', specialties: ['Gynecology','Urology'],                commonConditions: ['Routine check-up','Infections','Pain'],            triageHint: 'Pelvic, urinary, or reproductive health.',                 x: 210, y: 310 },
  { id: 'knee',         view: 'front', label: 'Knees',                  specialties: ['Orthopedics','Sports Medicine'],       commonConditions: ['Knee pain','Ligament sprain','Meniscus tear'],     triageHint: 'Knee pain, swelling, instability, old sports injuries.',   x: 180, y: 440 },
  { id: 'ankle',        view: 'front', label: 'Ankles & feet',          specialties: ['Orthopedics','Podiatry'],              commonConditions: ['Ankle sprain','Plantar fasciitis','Fracture'],     triageHint: 'Twisted ankle, foot pain, standing or walking issues.',    x: 240, y: 598 },
  // BACK
  { id: 'neck_back',    view: 'back',  label: 'Neck & upper spine',     specialties: ['Orthopedics','Neurology'],             commonConditions: ['Neck stiffness','Tension headache','Pinched nerve'], triageHint: 'Stiffness, cricks, nerve pain from the neck.',           x: 210, y: 100 },
  { id: 'upper_back',   view: 'back',  label: 'Upper back & shoulders', specialties: ['Orthopedics','Physiotherapy'],         commonConditions: ['Muscle knots','Posture pain','Frozen shoulder'],   triageHint: 'Tight shoulders, desk posture, blade pain.',               x: 210, y: 170 },
  { id: 'lower_back',   view: 'back',  label: 'Lower back & spine',     specialties: ['Orthopedics','Neurology'],             commonConditions: ['Lower back pain','Sciatica','Disc issues'],        triageHint: 'Lumbar pain, sciatica, nerve pain down the legs.',         x: 210, y: 258 },
  { id: 'hips_back',    view: 'back',  label: 'Hips & glutes',          specialties: ['Orthopedics','Physiotherapy'],         commonConditions: ['Hip pain','Piriformis','Stiffness'],               triageHint: 'Hip joint, glute strain, mobility issues.',                x: 210, y: 310 },
  { id: 'calf',         view: 'back',  label: 'Calves & hamstrings',    specialties: ['Orthopedics','Physiotherapy'],         commonConditions: ['Muscle strain','Cramps','Hamstring pull'],         triageHint: 'Calf or hamstring strain, cramps, back-of-leg pain.',      x: 240, y: 495 },
];

const VB_W = 420;
const VB_H = 640;

export interface BodyMapHeroProps {
  onStartTriage: (hotspotId: HotspotId) => void;
  frontImage?: string;
  backImage?: string;
  /** Override hotspot list if you want to add/remove regions. */
  hotspots?: Hotspot[];
  className?: string;
  style?: React.CSSProperties;
}

export default function BodyMapHero({
  onStartTriage,
  frontImage = '/anatomy-front.png',
  backImage = '/anatomy-back.png',
  hotspots = HOTSPOTS,
  className = '',
  style,
}: BodyMapHeroProps) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: '-20% 0px', once: true });
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 968 : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 968px)');
    const sync = () => setIsWide(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Auto-rotate (3.2s desktop, 4.5s mobile)
  useEffect(() => {
    if (reduced || paused) return;
    const cadence = isWide ? 3200 : 4500;
    const id = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % hotspots.length);
    }, cadence);
    return () => window.clearInterval(id);
  }, [reduced, paused, isWide, hotspots.length]);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 6000);
  }, []);

  const select = useCallback((i: number) => {
    setActiveIdx(i);
    setPaused(true);
    scheduleResume();
  }, [scheduleResume]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % hotspots.length);
      setPaused(true);
      scheduleResume();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + hotspots.length) % hotspots.length);
      setPaused(true);
      scheduleResume();
    }
  }, [hotspots.length, scheduleResume]);

  const active = hotspots[activeIdx];
  const front = useMemo(() => hotspots.filter(h => h.view === 'front'), [hotspots]);
  const back  = useMemo(() => hotspots.filter(h => h.view === 'back'), [hotspots]);

  return (
    <section
      ref={sectionRef}
      className={className}
      style={{
        width: '100%',
        margin: '0 auto 72px',
        ...style,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: '#ffffff',
          border: '1px solid #eae3d8',
          borderRadius: 16,
          padding: isWide ? '40px 44px' : '24px 20px',
          boxShadow: '0 2px 8px rgba(75,68,57,0.04)',
          display: 'grid',
          gridTemplateColumns: isWide ? '1fr 1fr' : '1fr',
          gap: isWide ? 48 : 28,
          alignItems: 'center',
        }}
      >
        {/* LEFT: figures */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isWide ? 'flex-start' : 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#785b47', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Where does it hurt?
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.1, color: '#1a110a' }}>
            Tap where you feel it. We'll do the rest.
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#706b63', margin: '0 0 24px', maxWidth: 420 }}>
            Point to the area on either the front or back view — we'll pre-fill the triage with the right specialty.
          </p>

          <div
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => scheduleResume()}
            style={{ display: 'flex', gap: isWide ? 20 : 12, width: '100%', justifyContent: isWide ? 'flex-start' : 'center' }}
          >
            <FigureCol
              src={frontImage}
              label="Front"
              viewActive={active.view === 'front'}
              hotspots={front}
              allHotspots={hotspots}
              activeIdx={activeIdx}
              onSelect={select}
              onKey={onKey}
              inView={inView}
              reduced={!!reduced}
              isWide={isWide}
            />
            <FigureCol
              src={backImage}
              label="Back"
              viewActive={active.view === 'back'}
              hotspots={back}
              allHotspots={hotspots}
              activeIdx={activeIdx}
              onSelect={select}
              onKey={onKey}
              inView={inView}
              reduced={!!reduced}
              isWide={isWide}
            />
          </div>
        </div>

        {/* RIGHT: label panel */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: '#785b47', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Selected region
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#1a110a', letterSpacing: '-0.01em' }}>
                {active.label}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: '#706b63', margin: '0 0 16px' }}>
                {active.triageHint}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {active.specialties.map(s => (
                  <span key={s} style={pillStyle}>{s}</span>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a110a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Common concerns
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {active.commonConditions.map(c => (
                  <li key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.6, color: '#554e44', padding: '2px 0' }}>
                    <span style={{ color: '#785b47', marginTop: 2 }}>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onStartTriage(active.id)}
                className="hover-lift"
                style={ctaStyle}
              >
                Start triage
                <ArrowRight size={14} strokeWidth={2.4} />
              </button>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eae3d8', fontSize: 12, color: '#706b63', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} />
                Severe symptoms? <a href="#emergency" style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>Get emergency care →</a>
              </div>
            </motion.div>
          </AnimatePresence>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#706b63' }}>
            <kbd style={kbdStyle}>← →</kbd> <span>cycle regions</span>
          </div>
        </motion.aside>
      </motion.div>
    </section>
  );
}

/* ---------- subcomponents + styles ---------- */

interface FigureColProps {
  src: string;
  label: string;
  viewActive: boolean;
  hotspots: Hotspot[];
  allHotspots: Hotspot[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onKey: (e: React.KeyboardEvent) => void;
  inView: boolean;
  reduced: boolean;
  isWide: boolean;
}

function FigureCol({ src, label, viewActive, hotspots, allHotspots, activeIdx, onSelect, onKey, inView, reduced, isWide }: FigureColProps) {
  return (
    <div style={{ position: 'relative', flex: '1 1 0', maxWidth: isWide ? 240 : 180, aspectRatio: '2 / 3' }}>
      <img src={src} alt={`Anatomical ${label.toLowerCase()} view`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />

      {hotspots.map((h) => {
        const i = allHotspots.indexOf(h);
        const isActive = i === activeIdx;
        const dotSize = isWide ? 14 : 16;
        return (
          <motion.button
            key={h.id}
            type="button"
            aria-label={h.label}
            title={h.label}
            onClick={() => onSelect(i)}
            onPointerEnter={() => onSelect(i)}
            onKeyDown={onKey}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={inView ? { opacity: 1, scale: isActive ? 1.15 : 1 } : {}}
            transition={{ duration: 0.3, delay: reduced ? 0 : 0.4 + i * 0.06, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `calc(${(h.x / VB_W) * 100}% - ${dotSize / 2}px)`,
              top:  `calc(${(h.y / VB_H) * 100}% - ${dotSize / 2}px)`,
              width: dotSize, height: dotSize, padding: 0,
              background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none',
              borderRadius: 9999, zIndex: 2,
            }}
          >
            {h.glow && (
              <span style={{ position: 'absolute', left: '50%', top: '50%', width: 22, height: 22, margin: '-11px 0 0 -11px', borderRadius: 9999, background: '#785b47', opacity: 0.35, animation: reduced ? undefined : 'bmh-glow 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
            )}
            {isActive && !reduced && [0, 0.4, 0.8].map(delay => (
              <span key={delay} style={{ position: 'absolute', inset: 0, borderRadius: 9999, border: '1.5px solid #1a110a', animation: `bmh-pulse 1.2s ease-out ${delay}s infinite`, pointerEvents: 'none' }} />
            ))}
            <span style={{
              display: 'block', width: '100%', height: '100%', borderRadius: 9999,
              background: isActive ? '#1a110a' : '#785b47',
              boxShadow: isActive ? '0 0 0 3px rgba(26,17,10,0.08)' : '0 0 0 3px rgba(120,91,71,0.08)',
              transition: 'background 180ms ease',
            }} />
          </motion.button>
        );
      })}

      <div style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span style={viewActive ? activeViewLabelStyle : viewLabelStyle}>{label}</span>
      </div>

      {/* Component-scoped keyframes */}
      <style>{`
        @keyframes bmh-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.6);opacity:0} }
        @keyframes bmh-glow  { 0%,100%{opacity:.35} 50%{opacity:.6} }
      `}</style>
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 9999,
  background: '#faf7f1', border: '1px solid #eae3d8', fontSize: 11, fontWeight: 500, color: '#554e44',
};
const ctaStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, background: '#785b47', color: 'white',
  border: 'none', borderRadius: 9999, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(75,68,57,0.04)',
};
const kbdStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10,
  padding: '2px 6px', borderRadius: 4, background: 'white', border: '1px solid #eae3d8',
};
const viewLabelStyle: React.CSSProperties = {
  display: 'inline-block', padding: '3px 10px', borderRadius: 9999, background: '#faf7f1',
  border: '1px solid #eae3d8', fontSize: 11, fontWeight: 600, color: '#706b63',
  letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 220ms ease',
};
const activeViewLabelStyle: React.CSSProperties = {
  ...viewLabelStyle, background: '#1a110a', borderColor: '#1a110a', color: 'white',
};
