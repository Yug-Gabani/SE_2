import React, { useState } from 'react';
import {
  Search,
  MapPin,
  ChevronDown,
  ArrowRight,
  Star,
  Check,
  ClipboardList,
  Video,
} from 'lucide-react';

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
  const [city, setCity] = useState('Ahmedabad');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{
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
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '8px 10px 8px 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(75, 68, 57, 0.08)',
          border: '1px solid #eae3d8',
          maxWidth: '740px',
          margin: '0 auto',
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
              }}
            >
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Gandhinagar">Gandhinagar</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Bengaluru">Bengaluru</option>
            </select>
            <ChevronDown size={14} color="#785b47" />
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
              placeholder="Doctor, hospital, specialty"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#1a110a',
                background: 'transparent',
              }}
            />
          </div>

          {/* Search Button */}
          <button
            onClick={onGetCare}
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
      </section>

      {/* SECTION B: 4 CATEGORY TILES */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '72px',
      }}>
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
          <div
            key={idx}
            onClick={onGetCare}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #eae3d8',
              boxShadow: '0 4px 16px rgba(75, 68, 57, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(75, 68, 57, 0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(75, 68, 57, 0.04)';
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
          </div>
        ))}
      </section>

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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}>
          {[
            { label: 'Fever & cough', image: '/symptom-fever.jpg' },
            { label: 'Headache', image: '/symptom-headache.jpg' },
            { label: 'Chest pain', image: '/symptom-chestpain.jpg' },
            { label: 'Child unwell', image: '/symptom-child.jpg' },
            { label: 'Pregnancy', image: '/symptom-pregnancy.jpg' },
            { label: 'Mental health', image: '/symptom-mentalhealth.jpg' },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => onBookSpecialty?.(item.label)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '18px 12px 16px 12px',
                border: '1px solid #eae3d8',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(75, 68, 57, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '162px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#785b47';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(75, 68, 57, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#eae3d8';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 68, 57, 0.04)';
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
            </div>
          ))}
        </div>
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
              style={{
                backgroundColor: '#ede7de',
                borderRadius: '16px',
                padding: '16px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#e5ded3';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ede7de';
                e.currentTarget.style.transform = 'translateY(0)';
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
    </div>
  );
};
