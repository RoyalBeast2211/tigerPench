import React from 'react';
import { 
  Compass, 
  Layers, 
  ShieldAlert, 
  Camera, 
  Sparkles, 
  Download, 
  Play, 
  Activity,
  Trees
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenIngest, onOpenExport, stats }) {
  return (
    <header style={{
      background: 'rgba(11, 16, 21, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand & Reserve Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(249, 115, 22, 0.4)',
            color: '#fff'
          }}>
            <Trees size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                PENCH TIGER RESERVE
              </h1>
              <span className="badge badge-core">Madhya Pradesh & MH</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Automated Camera Trap Triage & Tiger Movement Intelligence System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(17, 25, 35, 0.8)',
          padding: 4,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('map')}
            className="btn"
            style={{
              background: activeTab === 'map' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: activeTab === 'map' ? 'var(--accent-tiger)' : 'var(--text-secondary)',
              borderColor: activeTab === 'map' ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
              padding: '7px 14px',
              fontSize: '0.8125rem'
            }}
          >
            <Compass size={16} />
            <span>GIS Territory Map</span>
          </button>

          <button
            onClick={() => setActiveTab('triage')}
            className="btn"
            style={{
              background: activeTab === 'triage' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: activeTab === 'triage' ? 'var(--accent-tiger)' : 'var(--text-secondary)',
              borderColor: activeTab === 'triage' ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
              padding: '7px 14px',
              fontSize: '0.8125rem'
            }}
          >
            <Camera size={16} />
            <span>Blank Triage & Quarantine</span>
            {stats?.quarantined_frames > 0 && (
              <span style={{
                background: 'rgba(148, 163, 184, 0.2)',
                color: '#cbd5e1',
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: '0.7rem'
              }}>
                {stats.quarantined_frames}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reid')}
            className="btn"
            style={{
              background: activeTab === 'reid' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: activeTab === 'reid' ? 'var(--accent-tiger)' : 'var(--text-secondary)',
              borderColor: activeTab === 'reid' ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
              padding: '7px 14px',
              fontSize: '0.8125rem'
            }}
          >
            <Sparkles size={16} />
            <span>Tiger Stripe Re-ID</span>
            {stats?.pending_reid_reviews > 0 && (
              <span style={{
                background: 'rgba(249, 115, 22, 0.3)',
                color: '#fed7aa',
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: '0.7rem'
              }}>
                {stats.pending_reid_reviews} Review
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className="btn"
            style={{
              background: activeTab === 'dossier' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: activeTab === 'dossier' ? 'var(--accent-tiger)' : 'var(--text-secondary)',
              borderColor: activeTab === 'dossier' ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
              padding: '7px 14px',
              fontSize: '0.8125rem'
            }}
          >
            <Activity size={16} />
            <span>Tiger Dossiers</span>
            {stats?.total_tigers_enrolled > 0 && (
              <span style={{
                background: 'rgba(249, 115, 22, 0.2)',
                color: '#fed7aa',
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: '0.7rem'
              }}>
                {stats.total_tigers_enrolled}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className="btn"
            style={{
              background: activeTab === 'alerts' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
              color: activeTab === 'alerts' ? 'var(--accent-rose)' : 'var(--text-secondary)',
              borderColor: activeTab === 'alerts' ? 'rgba(244, 63, 94, 0.4)' : 'transparent',
              padding: '7px 14px',
              fontSize: '0.8125rem'
            }}
          >
            <ShieldAlert size={16} />
            <span>Deviation Alerts</span>
            {stats?.critical_alerts > 0 && (
              <span style={{
                background: 'rgba(244, 63, 94, 0.3)',
                color: '#fecdd3',
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {stats.critical_alerts}
              </span>
            )}
          </button>
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenExport}
            className="btn btn-secondary btn-sm"
            title="Export Wildlife Department Report"
          >
            <Download size={15} />
            <span>Export Report</span>
          </button>

          <button
            onClick={onOpenIngest}
            className="btn btn-primary btn-sm"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <Play size={15} fill="currentColor" />
            <span>Run 3-Stage Pipeline</span>
          </button>
        </div>
      </div>
    </header>
  );
}
