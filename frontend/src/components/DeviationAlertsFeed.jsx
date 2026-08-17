import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  MapPin, 
  Radio, 
  Send, 
  Clock, 
  Check, 
  Filter,
  Layers,
  ChevronRight
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert } from '../services/api';

export default function DeviationAlertsFeed({ onSelectTigerOnMap, onRefreshStats }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [actionNotes, setActionNotes] = useState({});
  const [ackSuccess, setAckSuccess] = useState(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSeverity !== 'ALL') params.severity = selectedSeverity;
      const res = await fetchAlerts(params);
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedSeverity]);

  const handleAcknowledge = async (alertId) => {
    try {
      const note = actionNotes[alertId] || 'Rapid Response Patrol unit dispatched to buffer sector.';
      await acknowledgeAlert(alertId, note);
      setAckSuccess(`Alert acknowledged and logged to Forest Division dispatch.`);
      loadAlerts();
      if (onRefreshStats) onRefreshStats();
      setTimeout(() => setAckSuccess(null), 3500);
    } catch (err) {
      alert('Failed to acknowledge alert: ' + err.message);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.is_acknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING' && !a.is_acknowledged).length;
  const acknowledgedCount = alerts.filter(a => a.is_acknowledged).length;

  return (
    <div>
      {/* Alert Header Banner */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Stage 3: Movement Deviation & Early Warning Intelligence
              </h2>
              {criticalCount > 0 && (
                <span className="badge badge-critical">
                  {criticalCount} Critical Action Required
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
              Real-time spatial rules detect buffer dispersal towards human settlements, territory centroid shifts &gt;15 sq km, first-time station captures, and prolonged absence.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <span className="badge badge-buffer" style={{ padding: '6px 12px' }}>
              Buffer Limit: 5.0 km
            </span>
            <span className="badge badge-core" style={{ padding: '6px 12px' }}>
              Core Limit: 15.0 km²
            </span>
          </div>
        </div>

        {ackSuccess && (
          <div style={{
            marginTop: 14,
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Check size={16} />
            <span>{ackSuccess}</span>
          </div>
        )}
      </div>

      {/* Severity Filter Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedSeverity('ALL')}
          className={`btn ${selectedSeverity === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setSelectedSeverity('CRITICAL')}
          className={`btn ${selectedSeverity === 'CRITICAL' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
        >
          <Radio size={13} />
          <span>Critical Buffer Dispersals ({criticalCount})</span>
        </button>
        <button
          onClick={() => setSelectedSeverity('WARNING')}
          className={`btn ${selectedSeverity === 'WARNING' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <AlertTriangle size={13} />
          <span>Centroid Shifts & Absence ({warningCount})</span>
        </button>
      </div>

      {/* Alerts Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading movement alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ marginBottom: 12 }} />
          <div>No active movement deviations detected. All monitored tigers are within normal range parameters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {alerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const isAck = alert.is_acknowledged;
            const evidence = alert.evidence || {};

            return (
              <div
                key={alert.alert_id}
                className="glass-panel"
                style={{
                  padding: 20,
                  border: isAck 
                    ? '1px solid var(--border-subtle)' 
                    : isCritical 
                    ? '1.5px solid rgba(244, 63, 94, 0.5)' 
                    : '1px solid rgba(245, 158, 11, 0.4)',
                  background: isAck ? 'rgba(15, 23, 33, 0.5)' : isCritical ? 'rgba(28, 16, 22, 0.85)' : 'var(--bg-card)',
                  position: 'relative'
                }}
              >
                {/* Top Badge & Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isCritical ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCritical ? '#f43f5e' : '#fbbf24',
                      position: 'relative'
                    }}>
                      {isCritical && !isAck && <div className="radar-ping" />}
                      {isCritical ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                          {alert.title}
                        </h3>
                        <span className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-buffer' : 'badge-core'}`}>
                          {alert.alert_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        Tiger: <strong style={{ color: 'var(--accent-tiger)' }}>{alert.tiger_name} ({alert.tiger_id})</strong> &bull; Station: {alert.station_name || alert.station_id} ({alert.zone || 'Buffer'}) &bull; Logged: {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAck ? (
                      <span className="badge badge-core">
                        <CheckCircle2 size={12} />
                        <span>Acknowledged</span>
                      </span>
                    ) : (
                      <span className="badge badge-critical">Action Required</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: 12, lineHeight: 1.5 }}>
                  {alert.description}
                </p>

                {/* Evidence Metrics Box */}
                <div style={{
                  marginTop: 14,
                  padding: 14,
                  background: 'rgba(11, 16, 21, 0.7)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  fontSize: '0.75rem'
                }}>
                  {evidence.displacement_km && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Centroid Displacement:</span>
                      <div style={{ fontWeight: 700, color: '#fb7185', marginTop: 2, fontSize: '0.85rem' }}>
                        {evidence.displacement_km} km (Threshold: {evidence.zone_threshold_km} km)
                      </div>
                    </div>
                  )}

                  {evidence.conflict_risk && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Human Interface Risk:</span>
                      <div style={{ fontWeight: 700, color: '#fbbf24', marginTop: 2, fontSize: '0.85rem' }}>
                        {evidence.conflict_risk} &bull; {evidence.zone} Zone
                      </div>
                    </div>
                  )}

                  {evidence.days_absent && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Days Absent:</span>
                      <div style={{ fontWeight: 700, color: '#f87171', marginTop: 2, fontSize: '0.85rem' }}>
                        {evidence.days_absent} Days (Threshold: {evidence.threshold_days} d)
                      </div>
                    </div>
                  )}

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>AI Confidence:</span>
                    <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginTop: 2, fontSize: '0.85rem' }}>
                      {Math.round(alert.confidence * 100)}% Verified
                    </div>
                  </div>

                  {evidence.recommended_action && (
                    <div style={{ gridColumn: '1 / -1', color: '#93c5fd', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      <strong>Protocol Action:</strong> {evidence.recommended_action}
                    </div>
                  )}
                </div>

                {/* Dispatch / Acknowledge Action Bar */}
                {!isAck && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="Enter patrol dispatch notes or action taken..."
                      value={actionNotes[alert.alert_id] || ''}
                      onChange={e => setActionNotes({ ...actionNotes, [alert.alert_id]: e.target.value })}
                      style={{ flex: 1, minWidth: 260, fontSize: '0.8125rem' }}
                    />
                    <button
                      onClick={() => handleAcknowledge(alert.alert_id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Send size={13} />
                      <span>Dispatch Patrol & Acknowledge</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
