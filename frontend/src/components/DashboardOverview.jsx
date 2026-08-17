import React from 'react';
import { 
  Filter, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  MapPin, 
  Layers 
} from 'lucide-react';

export default function DashboardOverview({ stats, onSelectTab }) {
  if (!stats) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 16,
      marginBottom: 24
    }}>
      {/* 1. Blank Triage & Rejection Card */}
      <div className="glass-panel" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Blank False Triggers
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {stats.blank_rejection_rate_pct}%
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ({stats.blank_frames} / {stats.total_frames} frames)
              </span>
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(148, 163, 184, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1'
          }}>
            <Filter size={20} />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: 6,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          marginTop: 14,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, stats.blank_rejection_rate_pct || 0)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #94a3b8, #64748b)',
            borderRadius: 4
          }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Auto-quarantined for reversible review
        </div>
      </div>

      {/* 2. Field Efficiency: Space & Time Saved */}
      <div className="glass-panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Resource Savings
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: 0 }}>
                {stats.storage_saved_mb} <span style={{ fontSize: '1rem', fontWeight: 600 }}>MB</span>
              </h2>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#34d399' }}>
                +{stats.person_hours_saved} hrs saved
              </span>
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <HardDrive size={20} />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color="var(--accent-emerald)" />
          <span>Reduced manual sorting workload by ~85%</span>
        </div>
      </div>

      {/* 3. Resident Tigers Identified */}
      <div className="glass-panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Tiger Population Monitored
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-tiger)', margin: 0 }}>
                {stats.total_tigers_enrolled} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Tigers</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ({stats.tiger_sightings} sightings)
              </span>
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(249, 115, 22, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fb923c'
          }}>
            <Eye size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {stats.active_camera_stations} camera stations active
          </span>
          {stats.pending_reid_reviews > 0 && (
            <button
              onClick={() => onSelectTab('reid')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-tiger)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Verify {stats.pending_reid_reviews} pending &rarr;
            </button>
          )}
        </div>
      </div>

      {/* 4. Deviation & Conflict Early Warning */}
      <div className="glass-panel" style={{
        padding: 18,
        border: stats.critical_alerts > 0 ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
        background: stats.critical_alerts > 0 ? 'rgba(30, 18, 26, 0.85)' : 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stats.critical_alerts > 0 ? '#fb7185' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Movement Deviations
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.critical_alerts > 0 ? '#f43f5e' : '#f8fafc', margin: 0 }}>
                {stats.pending_alerts}
              </h2>
              {stats.critical_alerts > 0 && (
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                  {stats.critical_alerts} High Risk
                </span>
              )}
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: stats.critical_alerts > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: stats.critical_alerts > 0 ? '#f43f5e' : '#fbbf24',
            position: 'relative'
          }}>
            {stats.critical_alerts > 0 && <div className="radar-ping" />}
            <AlertTriangle size={20} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Buffer dispersal & centroid shifts
          </span>
          <button
            onClick={() => onSelectTab('alerts')}
            style={{
              background: 'transparent',
              border: 'none',
              color: stats.critical_alerts > 0 ? '#fb7185' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Review Alerts &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
