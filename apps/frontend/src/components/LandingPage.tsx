import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  MapPin,
  ChevronDown,
  ArrowRight,
  Star,
  Check,
  ClipboardList,
  Video,
  Building2,
  Loader2,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Hospital } from '../types';
import { publicHospitalsApi } from '../services/api';
import { PageTransition } from '../motion/PageTransition';
import { listItem, staggerContainer, EASE_ENTER } from '../motion/presets';

interface LandingPageProps {
  onSelectDoctor?: (doctorName: string) => void;
  onBookSpecialty?: (specialty: string) => void;
  onGetCare?: () => void;
  onSignIn?: () => void;
}

// Wireframe placeholder box with diagonal lines and centered text
const WireframeImagePlaceholder: React.FC<{ text: string; height?: number }> = ({
  text,
  height = 180,
}) => (
  <div style={{
    position: 'relative',
    width: '100%',
    height: `${height}px`,
    backgroundColor: '#ebe5dc',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d8cfc3" strokeWidth="1.2" />
      <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d8cfc3" strokeWidth="1.2" />
    </svg>
    <span style={{
      position: 'relative',
      fontSize: '11px',
      color: '#827a6f',
      fontWeight: 500,
      backgroundColor: 'rgba(235, 229, 220, 0.9)',
      padding: '3px 8px',
      borderRadius: '4px',
    }}>
      {text}
    </span>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectDoctor,
  onBookSpecialty,
  onGetCare,
}) => {
  const navigate = useNavigate();
  const [city, setCity] = useState('Ahmedabad');
  const [searchQuery, setSearchQuery] = useState('');

  // Live hospital search (public endpoint — works for unauthenticated visitors).
  const [results, setResults] = useState<Hospital[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<Hospital | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    // Only query and suggest when the user actually types a name
    if (!q) {
      setResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }

    const cityParam = city && city !== 'All India' ? city : undefined;
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      publicHospitalsApi.search({ q, city: cityParam, limit: 8 })
        .then(list => {
          setResults(list);
          setShowResults(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, city]);

  const goToAuth = (mode: 'login' | 'signup', nextPath?: string) => {
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    navigate(`/${mode}${nextParam}`);
  };

  return (
    <PageTransition style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '56px 24px 80px 24px',
      color: '#1a110a',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    }}>
      {/* HERO SECTION */}
      <section style={{
        textAlign: 'center',
        maxWidth: '820px',
        margin: '0 auto 64px auto',
      }}>
        {/* Verified by doctors Pill Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#ede6da',
          color: '#554e44',
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 16px',
          borderRadius: '9999px',
          marginBottom: '28px',
          border: '1px solid #dfd6c8',
        }}>
          <Check size={13} strokeWidth={2.5} />
          <span>Verified by doctors</span>
        </div>

        {/* Hero Headline (DM Serif Display) */}
        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: '56px',
          lineHeight: '1.12',
          fontWeight: 400,
          color: '#1a110a',
          margin: '0 0 20px 0',
          letterSpacing: '-0.025em',
        }}>
          Care that starts before<br />the appointment.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          lineHeight: '1.5',
          color: '#6e675e',
          margin: '0 auto 40px auto',
          maxWidth: '560px',
        }}>
          Book a doctor, upload what's bothering you, and<br />
          get seen faster when it matters.
        </p>

        {/* Search Band Card */}
        <div id="for-hospitals" ref={searchContainerRef} style={{ position: 'relative', maxWidth: '740px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '8px 10px 8px 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(75, 68, 57, 0.08)',
          border: '1px solid #eae3d8',
          gap: '12px',
        }}>
          {/* Location Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#3b342c',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            paddingRight: '14px',
            borderRight: '1px solid #ede7dc',
            cursor: 'pointer',
          }}>
            <MapPin size={16} color="#785b47" />
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#2a231b',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  paddingRight: '18px',
                }}
              >
                <option value="All India">All India</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Gandhinagar">Gandhinagar</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru Urban</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
              </select>
              <ChevronDown size={14} color="#785b47" style={{ position: 'absolute', right: 0, pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Search Input */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Search size={16} color="#948c80" />
            <input
              type="text"
              placeholder="Search hospitals by name (e.g. Apollo, Lilavati)"
              value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim()) {
                  setShowResults(false);
                  setResults([]);
                }
              }}
              onFocus={() => { if (searchQuery.trim() && results.length) setShowResults(true); }}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#1a110a',
                background: 'transparent',
              }}
            />
            {searching && <Loader2 size={14} className="animate-spin" color="#785b47" />}
          </div>

          {/* Search Button */}
          <button
            onClick={onGetCare}
            className="hover-lift"
            style={{
              backgroundColor: '#785b47',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#644b39')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#785b47')}
          >
            <span>Search</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Live-results dropdown */}
        <AnimatePresence>
          {showResults && searchQuery.trim() && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: EASE_ENTER }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0, right: 0,
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #eae3d8',
                boxShadow: '0 12px 32px rgba(75, 68, 57, 0.12)',
                maxHeight: '360px', overflowY: 'auto',
                zIndex: 20, textAlign: 'left',
              }}
            >
              {results.map(h => (
                <button
                  key={h.id}
                  onClick={() => { setPreview(h); setShowResults(false); }}
                  className="card-hover"
                  style={{
                    display: 'block', width: '100%',
                    padding: '12px 16px',
                    border: 'none', borderBottom: '1px solid #f2ece2',
                    backgroundColor: 'transparent',
                    textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#faf7f1')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a' }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#706b63', marginTop: '2px' }}>
                    <MapPin size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {[h.city, h.state].filter(Boolean).join(', ') || 'Location unknown'}
                    {h.specialties.length > 0 && (
                      <span> · {h.specialties.length} specialt{h.specialties.length === 1 ? 'y' : 'ies'}</span>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setShowResults(false); }}
                style={{
                  display: 'block', width: '100%', padding: '8px',
                  background: 'transparent', border: 'none',
                  fontSize: '11px', color: '#8c857b', cursor: 'pointer',
                }}
              >
                Close results
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {showResults && !searching && results.length === 0 && searchQuery.trim() && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)',
            left: 0, right: 0,
            backgroundColor: '#ffffff', borderRadius: '16px',
            border: '1px solid #eae3d8', padding: '18px',
            fontSize: '13px', color: '#706b63', textAlign: 'left', zIndex: 20,
          }}>
            No hospitals match "{searchQuery}" in {city}.
          </div>
        )}
        </div>
      </section>

      {/* Hospital preview modal */}
      <AnimatePresence mode="wait">
        {preview && (
          <HospitalPreviewModal
            key={preview.id}
            hospital={preview}
            onClose={() => setPreview(null)}
            onLogin={() => goToAuth('login', `/hospitals/${preview.id}`)}
            onSignup={() => goToAuth('signup', `/hospitals/${preview.id}`)}
          />
        )}
      </AnimatePresence>

      {/* SECTION B: 4 CATEGORY TILES */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-20px' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          marginBottom: '72px',
        }}
      >
        {[
          {
            image: '/video-consult.jpg',
            title: 'Video Consult',
            subtitle: 'Connect in 60s',
          },
          {
            image: '/find-doctors.jpg',
            title: 'Find Doctors Near You',
            subtitle: '27k+ hospitals',
          },
          {
            image: '/my-records.jpg',
            title: 'My Records',
            subtitle: 'Visits + meds',
          },
          {
            image: '/order-medicine.jpg',
            title: 'Order Medicine',
            subtitle: 'Fast delivery',
          },
        ].map((tile, idx) => (
          <motion.div
            key={idx}
            variants={listItem}
            id={idx === 0 ? 'video-consult' : idx === 1 ? 'find-doctors' : undefined}
            onClick={onGetCare}
            className="card-hover"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #eae3d8',
              boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '100%',
              height: '180px',
              borderRadius: '14px',
              overflow: 'hidden',
              backgroundColor: '#ede7de',
            }}>
              <img
                src={tile.image}
                alt={tile.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a110a' }}>
                {tile.title}
              </div>
              <div style={{ fontSize: '13px', color: '#7a736a', marginTop: '4px' }}>
                {tile.subtitle}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* SECTION C: CONSULT A DOCTOR FOR (6 shortcuts) */}
      <section style={{ marginBottom: '72px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Consult a doctor for
          </h2>
          <button
            onClick={onGetCare}
            className="hover-lift"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #eae3d8',
              borderRadius: '9999px',
              padding: '6px 18px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3a342e',
              cursor: 'pointer',
            }}
          >
            View all specialties
          </button>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-20px' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { label: 'Fever & cough', image: '/symptom-fever.jpg' },
            { label: 'Headache', image: '/symptom-headache.jpg' },
            { label: 'Chest pain', image: '/symptom-chestpain.jpg' },
            { label: 'Child unwell', image: '/symptom-child.jpg' },
            { label: 'Pregnancy', image: '/symptom-pregnancy.jpg' },
            { label: 'Mental health', image: '/symptom-mentalhealth.jpg' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={listItem}
              onClick={() => onBookSpecialty?.(item.label)}
              className="card-hover"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '18px 12px 16px 12px',
                border: '1px solid #eae3d8',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(75, 68, 57, 0.04)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '162px',
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '10px',
                backgroundColor: '#f5efe6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(75, 68, 57, 0.06)',
              }}>
                <img
                  src={item.image}
                  alt={item.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.25s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#2a241e', marginBottom: '8px' }}>
                {item.label}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0284c7',
                letterSpacing: '0.04em',
              }}>
                BOOK
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* SECTION D: HOW PULSECARE WORKS */}
      <section style={{
        textAlign: 'center',
        margin: '0 auto 72px auto',
        maxWidth: '860px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1a110a',
          marginBottom: '36px',
          letterSpacing: '-0.02em',
        }}>
          How PulseCare works
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
        }}>
          {[
            {
              num: '1',
              icon: <Search size={18} color="#785b47" />,
              title: 'Find your doctor',
            },
            {
              num: '2',
              icon: <ClipboardList size={18} color="#785b47" />,
              title: 'Fill a quick questionnaire',
            },
            {
              num: '3',
              icon: <Video size={18} color="#785b47" />,
              title: 'See the doctor in person or video',
            },
          ].map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #eae3d8',
                boxShadow: '0 4px 12px rgba(75, 68, 57, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '2px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#785b47' }}>
                  {step.num}
                </span>
                {step.icon}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2a231c',
                maxWidth: '200px',
              }}>
                {step.title}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION E: BOOK AN IN-CLINIC APPOINTMENT (4 Doctor Cards) */}
      <section style={{ marginBottom: '72px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Book an in-clinic appointment
          </h2>
          <a
            href="#all-doctors"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0284c7',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            See all doctors →
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
        }}>
          {[
            {
              name: 'Dr. Shah',
              specialty: 'Cardiology · Apollo',
              rating: '4.8',
              slot: 'Next 2pm',
              fee: '₹600',
            },
            {
              name: 'Dr. Mehta',
              specialty: 'Pediatrics · Civil',
              rating: '4.9',
              slot: 'Next 5pm',
              fee: '₹500',
            },
            {
              name: 'Dr. Rao',
              specialty: 'Dermatology · KD',
              rating: '4.7',
              slot: 'Tomorrow',
              fee: '₹400',
            },
            {
              name: 'Dr. Iyer',
              specialty: 'General Medicine · Zydus',
              rating: '4.6',
              slot: 'Today',
              fee: '₹300',
            },
          ].map((doc, idx) => (
            <div
              key={idx}
              className="card-hover"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #eae3d8',
                boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <WireframeImagePlaceholder text="Doctor photo" height={160} />
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a110a' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px' }}>
                    {doc.specialty}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    fontSize: '13px',
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      color: '#1a110a',
                    }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      {doc.rating}
                    </span>
                    <span style={{ color: '#706b63', fontSize: '12px' }}>{doc.slot}</span>
                  </div>

                  <div style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#1a110a',
                    marginTop: '8px',
                  }}>
                    {doc.fee}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => onSelectDoctor?.(doc.name)}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: '1px solid #dcd4c7',
                    borderRadius: '9999px',
                    padding: '8px 0',
                    fontSize: '13px',
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
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION F: BROWSE BY SPECIALTY (12 tiles with Full Names) */}
      <section style={{
        textAlign: 'center',
        marginBottom: '64px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1a110a',
          marginBottom: '28px',
          letterSpacing: '-0.02em',
        }}>
          Browse by specialty
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '14px',
        }}>
          {[
            { name: 'Cardiology', count: '142 doctors' },
            { name: 'Dermatology', count: '76 doctors' },
            { name: 'ENT Specialist', count: '51 doctors' },
            { name: 'General Medicine', count: '203 doctors' },
            { name: 'Gynecology', count: '98 doctors' },
            { name: 'Neurology', count: '44 doctors' },
            { name: 'Orthopedics', count: '118 doctors' },
            { name: 'Pediatrics', count: '89 doctors' },
            { name: 'Psychiatry', count: '22 doctors' },
            { name: 'Pulmonology', count: '29 doctors' },
            { name: 'Urology', count: '47 doctors' },
            { name: 'Ophthalmology', count: '61 doctors' },
          ].map((spec, idx) => (
            <div
              key={idx}
              onClick={() => onBookSpecialty?.(spec.name)}
              className="card-hover"
              style={{
                backgroundColor: '#ede7de',
                borderRadius: '16px',
                padding: '16px 14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a' }}>
                {spec.name}
              </div>
              <div style={{ fontSize: '12px', color: '#7a736a', marginTop: '2px' }}>
                {spec.count}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION G: TRUST STRIP */}
      <section style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '40px',
        padding: '24px 0',
        marginBottom: '64px',
        borderTop: '1px solid #eae3d8',
        borderBottom: '1px solid #eae3d8',
        fontSize: '13px',
        fontWeight: 500,
        color: '#554e44',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} color="#785b47" strokeWidth={2.5} />
          <span>Verified doctors</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} color="#785b47" strokeWidth={2.5} />
          <span>Encrypted records</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} color="#785b47" strokeWidth={2.5} />
          <span>No data sold</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} color="#785b47" strokeWidth={2.5} />
          <span>24/7</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        fontSize: '13px',
        color: '#706b63',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '36px',
          marginBottom: '40px',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1a110a', marginBottom: '10px' }}>PulseCare</div>
            <div style={{ lineHeight: '1.9' }}>Group 6<br />IT314<br />DA-IICT</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1a110a', marginBottom: '10px' }}>For Patients</div>
            <div style={{ lineHeight: '1.9' }}>
              <div>Find doctors</div>
              <div>Book appt</div>
              <div>My account</div>
              <div>Download app</div>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1a110a', marginBottom: '10px' }}>For Providers</div>
            <div style={{ lineHeight: '1.9' }}>
              <div>For doctors</div>
              <div>For hospitals</div>
              <div>For pharmacies</div>
              <div>Partner with us</div>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1a110a', marginBottom: '10px' }}>Legal</div>
            <div style={{ lineHeight: '1.9' }}>
              <div>Privacy</div>
              <div>Terms</div>
              <div>Help</div>
              <div>Contact</div>
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid #eae3d8',
          fontSize: '12px',
          color: '#8c857b',
        }}>
          © 2026 PulseCare – Group 6 – IT314 – DA-IICT
        </div>
      </footer>
    </PageTransition>
  );
};

/** Preview panel shown when an unauthenticated visitor clicks a hospital search result. */
const HospitalPreviewModal: React.FC<{
  hospital: Hospital;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}> = ({ hospital, onClose, onLogin, onSignup }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18, ease: EASE_ENTER }}
    style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      backgroundColor: 'rgba(26, 17, 10, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.22, ease: EASE_ENTER }}
      style={{
        backgroundColor: '#ffffff', borderRadius: '20px',
        maxWidth: '600px', width: '100%', maxHeight: '88vh', overflow: 'auto',
        boxShadow: '0 24px 64px rgba(75, 68, 57, 0.25)',
        border: '1px solid #eae3d8',
        padding: '28px',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            backgroundColor: '#f5efe6', color: '#785b47',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a110a' }}>
              {hospital.name}
            </h2>
            <div style={{ fontSize: '13px', color: '#706b63', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} />
              {[hospital.city, hospital.state].filter(Boolean).join(', ') || 'Location unknown'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="icon-pop"
          style={{ background: 'transparent', border: 'none', color: '#706b63', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {hospital.address && (
        <div style={{ fontSize: '13px', color: '#443e37', marginBottom: '14px' }}>
          {hospital.address}
          {hospital.pincode ? ` — ${hospital.pincode}` : ''}
        </div>
      )}

      <div style={{
        fontSize: '11px', fontWeight: 700, color: '#8c857b',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
      }}>
        Available specialties ({hospital.specialties.length})
      </div>
      {hospital.specialties.length === 0 ? (
        <div style={{
          padding: '14px', borderRadius: '12px',
          backgroundColor: '#faf7f1', border: '1px solid #eae3d8',
          fontSize: '13px', color: '#706b63',
          marginBottom: '18px',
        }}>
          Specialty details are not published for this hospital in the government directory.
          You can still find a doctor via symptom triage after signing in.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
          {hospital.specialties.map(s => (
            <span key={s} className="chip" style={{
              padding: '4px 12px', borderRadius: '9999px',
              fontSize: '12px', color: '#443e37',
              backgroundColor: '#faf7f1', border: '1px solid #eae3d8',
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* Auth CTA panel */}
      <div style={{
        padding: '16px 18px', borderRadius: '14px',
        backgroundColor: '#fff8ec',
        border: '1px solid #f6e5c0',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a110a', marginBottom: '4px' }}>
          Sign in to book an appointment
        </div>
        <div style={{ fontSize: '13px', color: '#706b63', marginBottom: '14px' }}>
          You need an account to run symptom triage and book a slot with a doctor at this hospital.
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onLogin}
            className="hover-lift"
            style={{
              backgroundColor: '#785b47', color: '#ffffff', border: 'none',
              borderRadius: '9999px', padding: '10px 20px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          ><LogIn size={14} /> Log in</button>
          <button
            onClick={onSignup}
            className="hover-lift"
            style={{
              backgroundColor: 'transparent', color: '#785b47',
              border: '1px solid #785b47',
              borderRadius: '9999px', padding: '10px 20px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          ><UserPlus size={14} /> Sign up</button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);
