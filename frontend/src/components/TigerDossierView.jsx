import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Compass, 
  Clock, 
  Image as ImageIcon, 
  TrendingUp, 
  AlertTriangle, 
  Maximize2, 
  Activity, 
  Layers, 
  ChevronRight, 
  ExternalLink,
  Info,
  CheckCircle2,
  Filter,
  User,
  Heart,
  Droplets,
  Share2
} from 'lucide-react';
import { fetchTigerDetail, fetchTigerBehaviorProfile } from '../services/api';

const TIGER_COLORS = {
  'PTR-M-01': '#f97316',
  'PTR-F-02': '#ec4899',
  'PTR-M-03': '#eab308',
  'PTR-F-04': '#06b6d4',
  'PTR-M-07': '#8b5cf6',
};

export default function TigerDossierView({ tigers, initialTigerId, onSelectTigerOnMap }) {
  const [selectedTigerId, setSelectedTigerId] = useState(initialTigerId || tigers[0]?.tiger_id || 'PTR-M-01');
  const [tigerDetail, setTigerDetail] = useState(null);
  const [behaviorProfile, setBehaviorProfile] = useState(null);
  const [activeDossierTab, setActiveDossierTab] = useState('timeline'); // 'timeline' | 'gallery' | 'territory' | 'alerts'
  const [loading, setLoading] = useState(true);
  const [activeModalImage, setActiveModalImage] = useState(null);

  useEffect(() => {
    if (initialTigerId) {
      setSelectedTigerId(initialTigerId);
    }
  }, [initialTigerId]);

  useEffect(() => {
    if (!selectedTigerId) return;

    setLoading(true);
    Promise.all([
      fetchTigerDetail(selectedTigerId),
      fetchTigerBehaviorProfile(selectedTigerId)
    ])
      .then(([detail, profile]) => {
        setTigerDetail(detail);
        setBehaviorProfile(profile);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load tiger dossier:', err);
        setLoading(false);
      });
  }, [selectedTigerId]);

  const currentTiger = tigerDetail?.tiger || tigers.find(t => t.tiger_id === selectedTigerId) || {};
  const sightings = tigerDetail?.sightings || [];
  const alerts = tigerDetail?.alerts || [];
  const color = TIGER_COLORS[selectedTigerId] || '#f97316';

  return (
    <div>
      {/* Top Tiger Switcher Bar */}
      <div className="glass-panel" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Select Individual Tiger:
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tigers.map(t => {
                const isActive = t.tiger_id === selectedTigerId;
                const tColor = TIGER_COLORS[t.tiger_id] || '#10b981';
                return (
                  <button
                    key={t.tiger_id}
                    onClick={() => setSelectedTigerId(t.tiger_id)}
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{
                      borderColor: tColor,
                      background: isActive ? undefined : 'rgba(255, 255, 255, 0.05)',
                      padding: '6px 14px'
                    }}
                  >
                    <span style={{ color: tColor }}>●</span>
                    <strong style={{ marginLeft: 4 }}>{t.tiger_id}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: 4 }}>- {t.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-tiger" style={{ padding: '6px 12px' }}>
              Catalogue Enrolled: {tigers.length} Individuals
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading individual tiger dossier...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero Individual Dossier Header Card */}
          <div className="glass-panel" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 320,
              height: '100%',
              background: `radial-gradient(circle at top right, ${color}22 0%, transparent 70%)`,
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 24, alignItems: 'center' }}>
              {/* Tiger Reference Photo with Flank Highlight */}
              <div 
                style={{ 
                  width: 200, 
                  height: 160, 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  position: 'relative',
                  border: `2px solid ${color}`,
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${color}33`
                }}
                onClick={() => setActiveModalImage(currentTiger.reference_image_url || '/sample_images/ptr_m_01_ref.jpg')}
              >
                <img
                  src={currentTiger.reference_image_url || '/sample_images/ptr_m_01_ref.jpg'}
                  alt={currentTiger.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Maximize2 size={10} />
                  <span>Enlarge</span>
                </div>
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: color,
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: 3
                }}>
                  {currentTiger.tiger_id}
                </div>
              </div>

              {/* Identity & Lineage Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {currentTiger.name}
                  </h1>
                  <span className={`badge ${currentTiger.gender === 'M' ? 'badge-tiger' : 'badge-amber'}`} style={{ fontSize: '0.75rem' }}>
                    {currentTiger.gender === 'M' ? 'Male (M)' : 'Female (F)'}
                  </span>
                  <span className="badge badge-core" style={{ fontSize: '0.75rem' }}>
                    {currentTiger.status || 'RESIDENT'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lineage & Origin</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>
                      {currentTiger.lineage || 'Pench Resident Lineage'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Age</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>
                      {currentTiger.estimated_age ? `${currentTiger.estimated_age} Years` : 'Adult (5-7 yrs)'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Established Territory</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>
                      {currentTiger.known_territory_km2 || '18.5'} km² ({behaviorProfile?.core_use_area_km2 || '6.2'} km² Core)
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Sighting Location</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                      {currentTiger.last_station_id || 'PTR-ST-01'} ({sightings[0]?.zone || 'Core Zone'})
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
                <button
                  onClick={() => onSelectTigerOnMap && onSelectTigerOnMap(selectedTigerId)}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MapPin size={15} />
                  <span>Locate on GIS Map</span>
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Total Sightings: <strong>{sightings.length}</strong> &bull; Alerts: <strong>{alerts.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Biological & Movement Intelligence Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Card 1: 95% Home Range & 50% Core */}
            <div className="glass-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>HOME RANGE & CORE</span>
                <Compass size={16} style={{ color: color }} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                {behaviorProfile?.home_range_area_km2 || currentTiger.known_territory_km2 || 22.0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>km²</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, fontWeight: 600 }}>
                50% Core-Use: {behaviorProfile?.core_use_area_km2 || 8.4} km²
              </div>
            </div>

            {/* Card 2: Average Movement Speed & Step Length */}
            <div className="glass-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DISPLACEMENT DYNAMICS</span>
                <TrendingUp size={16} style={{ color: '#38bdf8' }} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                {behaviorProfile?.movement_dynamics?.avg_speed_kmh || 0.88} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>km/h</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Avg Step: <strong>{behaviorProfile?.movement_dynamics?.avg_step_length_km || 2.4} km</strong> ({behaviorProfile?.movement_dynamics?.heading_direction_cardinal || 'SE'} Heading)
              </div>
            </div>

            {/* Card 3: Circadian Crepuscular Peak */}
            <div className="glass-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CIRCADIAN RHYTHM</span>
                <Clock size={16} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b' }}>
                {behaviorProfile?.circadian_rhythm?.crepuscular_activity_pct || 52.0}% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Crepuscular</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Peak: <strong>18:00 - 22:00 & 04:00 - 07:00</strong>
              </div>
            </div>

            {/* Card 4: Boundary Excursions & Conflict Risk */}
            <div className="glass-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CORRIDOR DISPERSAL RISK</span>
                <AlertTriangle size={16} style={{ color: behaviorProfile?.boundary_excursions?.corridor_dispersal_risk === 'HIGH' ? '#ef4444' : '#10b981' }} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: behaviorProfile?.boundary_excursions?.corridor_dispersal_risk === 'HIGH' ? '#ef4444' : '#10b981' }}>
                {behaviorProfile?.boundary_excursions?.corridor_dispersal_risk || 'LOW'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Nearest: <strong>{behaviorProfile?.boundary_excursions?.nearest_corridor || 'Pench-Kanha Linkage'}</strong>
              </div>
            </div>
          </div>

          {/* Dossier Tabs: Timeline, Flank Gallery, Territorial Dynamics, Alerts */}
          <div className="glass-panel" style={{ padding: 20 }}>
            {/* Dossier Tab Buttons */}
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12, marginBottom: 20 }}>
              <button
                onClick={() => setActiveDossierTab('timeline')}
                className={`btn ${activeDossierTab === 'timeline' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              >
                <Calendar size={14} />
                <span>Historical Sighting Timeline ({sightings.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierTab('gallery')}
                className={`btn ${activeDossierTab === 'gallery' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              >
                <ImageIcon size={14} />
                <span>Flank Stripe Pattern Gallery ({sightings.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierTab('territory')}
                className={`btn ${activeDossierTab === 'territory' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              >
                <Compass size={14} />
                <span>Territorial Shifts & Seasonal Rhythm</span>
              </button>
              <button
                onClick={() => setActiveDossierTab('alerts')}
                className={`btn ${activeDossierTab === 'alerts' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              >
                <AlertTriangle size={14} />
                <span>Movement Alerts & Dispatches ({alerts.length})</span>
              </button>
            </div>

            {/* TAB A: Chronological Sighting Trajectory Timeline */}
            {activeDossierTab === 'timeline' && (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Vertical Line */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  bottom: 10,
                  left: 7,
                  width: 2,
                  background: `linear-gradient(to bottom, ${color}, rgba(255,255,255,0.1))`
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sightings.map((s, sIdx) => {
                    const isLatest = sIdx === 0;
                    return (
                      <div
                        key={s.frame_id || sIdx}
                        style={{
                          position: 'relative',
                          background: isLatest ? 'rgba(249, 115, 22, 0.08)' : 'rgba(15, 23, 33, 0.6)',
                          border: isLatest ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 'var(--radius-md)',
                          padding: 14,
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr auto',
                          gap: 16,
                          alignItems: 'center'
                        }}
                      >
                        {/* Timeline Pin Node */}
                        <div style={{
                          position: 'absolute',
                          left: -24,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: isLatest ? color : '#334155',
                          border: '2px solid #0b1118',
                          boxShadow: isLatest ? `0 0 10px ${color}` : undefined
                        }} />

                        {/* Thumbnail */}
                        <div
                          style={{
                            width: 100,
                            height: 75,
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                          onClick={() => setActiveModalImage(s.thumbnail_url)}
                        >
                          <img
                            src={s.thumbnail_url || '/sample_images/ptr_m_01_ref.jpg'}
                            alt={s.frame_id}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        {/* Sighting Description */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: '0.875rem', color: '#f8fafc' }}>
                              {s.station_name || s.station_id}
                            </strong>
                            <span className={`badge ${s.zone === 'CORE' ? 'badge-core' : 'badge-buffer'}`} style={{ fontSize: '0.65rem' }}>
                              {s.zone || 'CORE'} ZONE
                            </span>
                            {isLatest && <span className="badge badge-tiger" style={{ fontSize: '0.65rem' }}>Latest Capture</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            Timestamp: {new Date(s.captured_at).toLocaleString()} &bull; Flank Aspect: <strong>{s.flank_side === 'right' ? 'Right Flank' : 'Left Flank'}</strong> &bull; Re-ID Match: {Math.round((s.reid_confidence || 0.94) * 100)}%
                          </div>
                        </div>

                        {/* Station GIS Shortcut */}
                        <button
                          onClick={() => onSelectTigerOnMap && onSelectTigerOnMap(selectedTigerId)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <MapPin size={13} />
                          <span>View Station</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB B: Flank Stripe Pattern Gallery */}
            {activeDossierTab === 'gallery' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {sightings.map((s, idx) => (
                    <div
                      key={s.frame_id || idx}
                      style={{
                        background: 'rgba(11, 17, 24, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, border-color 0.2s ease'
                      }}
                      onClick={() => setActiveModalImage(s.thumbnail_url)}
                    >
                      <div style={{ height: 160, position: 'relative' }}>
                        <img
                          src={s.thumbnail_url || '/sample_images/ptr_m_01_ref.jpg'}
                          alt={s.frame_id}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 8,
                          background: 'rgba(0,0,0,0.75)',
                          color: '#f8fafc',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: 3
                        }}>
                          {s.flank_side === 'right' ? 'Right Flank Stripe Fingerprint' : 'Left Flank Stripe Fingerprint'}
                        </div>
                      </div>
                      <div style={{ padding: 12, fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{s.station_name || s.station_id}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
                          {new Date(s.captured_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB C: Territorial Dynamics & Overlap */}
            {activeDossierTab === 'territory' && behaviorProfile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Seasonal Shifts */}
                <div style={{
                  background: 'rgba(11, 17, 24, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-tiger)', margin: '0 0 12px 0' }}>
                    Seasonal Home Range Dynamics
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8125rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6 }}>
                      <strong style={{ color: '#f59e0b' }}>☀️ Dry Summer Season:</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {behaviorProfile.seasonal_patterns.dry_season_behavior} ({behaviorProfile.seasonal_patterns.dry_season_mcp_km2} km² territory envelope).
                      </p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6 }}>
                      <strong style={{ color: '#0ea5e9' }}>🌧️ Monsoon Wet Season:</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {behaviorProfile.seasonal_patterns.monsoon_season_behavior} ({behaviorProfile.seasonal_patterns.monsoon_season_mcp_km2} km² territory envelope).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interspecific Overlap & Core Centers */}
                <div style={{
                  background: 'rgba(11, 17, 24, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 12px 0' }}>
                    Micro-Habitat Preference Index
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Perennial Riverbeds & Nullahs:</span>
                        <strong style={{ color: '#38bdf8' }}>+45% High Affinity</strong>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: '85%', height: '100%', background: '#38bdf8' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Dense Teak & Bamboo Canopy:</span>
                        <strong style={{ color: '#10b981' }}>+30% High Affinity</strong>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: '70%', height: '100%', background: '#10b981' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Savanna Grasslands (Alikatta):</span>
                        <strong style={{ color: '#eab308' }}>+20% Foraging Area</strong>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: '55%', height: '100%', background: '#eab308' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Village Farmland Boundary:</span>
                        <strong style={{ color: '#ef4444' }}>-75% Strong Avoidance</strong>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: '15%', height: '100%', background: '#ef4444' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB D: Movement Alerts & Patrol Dispatches */}
            {activeDossierTab === 'alerts' && (
              <div>
                {alerts.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No critical deviation alerts logged for this individual tiger. Movement remains within expected home range bounds.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {alerts.map(a => (
                      <div
                        key={a.alert_id}
                        style={{
                          background: 'rgba(11, 17, 24, 0.7)',
                          border: a.severity === 'CRITICAL' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: 'var(--radius-md)',
                          padding: 14
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#f8fafc', fontSize: '0.875rem' }}>{a.title}</strong>
                          <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-buffer'}`}>
                            {a.severity}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                          {a.description}
                        </p>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          Logged on {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Modal Lightbox */}
      {activeModalImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setActiveModalImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: 800, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={activeModalImage}
              alt="Enlarged View"
              style={{ width: '100%', height: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', border: `2px solid ${color}` }}
            />
            <button
              onClick={() => setActiveModalImage(null)}
              className="btn btn-secondary btn-sm"
              style={{ position: 'absolute', top: 12, right: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
