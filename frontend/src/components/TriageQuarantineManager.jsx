import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  Shield, 
  AlertTriangle, 
  HardDrive, 
  Clock, 
  Eye, 
  Lock,
  Layers,
  Search,
  Sparkles
} from 'lucide-react';
import { fetchFrames, toggleQuarantine } from '../services/api';

export default function TriageQuarantineManager({ onRefreshStats }) {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showOnlyQuarantined, setShowOnlyQuarantined] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadFramesData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (showOnlyQuarantined) params.is_quarantined = true;
      const res = await fetchFrames(params);
      setFrames(res.frames || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFramesData();
  }, [selectedCategory, showOnlyQuarantined]);

  const handleToggleQuarantine = async (frameId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await toggleQuarantine(frameId, nextStatus, nextStatus ? 'Quarantined by Officer' : 'Restored to Working Dataset by Officer');
      setActionMessage({
        type: 'success',
        text: nextStatus ? `Frame ${frameId} moved to safe quarantine.` : `Frame ${frameId} safely restored to working dataset!`
      });
      loadFramesData();
      if (onRefreshStats) onRefreshStats();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Action failed: ' + err.message });
    }
  };

  // Filtered frames
  const filteredFrames = frames.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.frame_id.toLowerCase().includes(q) ||
      f.station_id.toLowerCase().includes(q) ||
      (f.animal_species && f.animal_species.toLowerCase().includes(q)) ||
      (f.assigned_tiger_id && f.assigned_tiger_id.toLowerCase().includes(q))
    );
  });

  const quarantinedCount = frames.filter(f => f.is_quarantined).length;
  const blankCount = frames.filter(f => f.category === 'blank').length;
  const tigerCount = frames.filter(f => f.category === 'tiger').length;
  const otherCount = frames.filter(f => f.category === 'animal_other').length;
  const humanCount = frames.filter(f => f.category === 'human').length;

  return (
    <div>
      {/* Triage Header Banner */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Stage 1: Google SpeciesNet (Tiger vs Non-Tiger Classifier)
              </h2>
              <span className="badge badge-tiger">Google CameraTrapAI</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
              SpeciesNet separates raw camera trap images based on whether a Bengal Tiger is present. Only verified tiger frames proceed downstream to Stage 2 (Stripe Re-ID) and Stage 3 (Territory Intelligence).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tiger Separation Gate</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-tiger)' }}>
                {tigerCount} Tigers &bull; {frames.length - tigerCount} Non-Tigers
              </div>
            </div>
          </div>
        </div>

        {/* Action alert toast */}
        {actionMessage && (
          <div style={{
            marginTop: 14,
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: actionMessage.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSelectedCategory('ALL'); setShowOnlyQuarantined(false); }}
            className={`btn ${selectedCategory === 'ALL' && !showOnlyQuarantined ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            All Images ({frames.length})
          </button>
          <button
            onClick={() => { setSelectedCategory('tiger'); setShowOnlyQuarantined(false); }}
            className={`btn ${selectedCategory === 'tiger' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ borderColor: 'var(--accent-tiger)', background: selectedCategory === 'tiger' ? undefined : 'rgba(249, 115, 22, 0.1)' }}
          >
            <span>🐅 Tigers Only &rarr; Stages 2 & 3 ({tigerCount})</span>
          </button>
          <button
            onClick={() => { setSelectedCategory('blank'); setShowOnlyQuarantined(true); }}
            className={`btn ${selectedCategory === 'blank' || showOnlyQuarantined ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <Trash2 size={13} />
            <span>Non-Tiger: Blanks ({quarantinedCount})</span>
          </button>
          <button
            onClick={() => { setSelectedCategory('animal_other'); setShowOnlyQuarantined(false); }}
            className={`btn ${selectedCategory === 'animal_other' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <span>🦌 Non-Tiger: Other Fauna ({otherCount})</span>
          </button>
          <button
            onClick={() => { setSelectedCategory('human'); setShowOnlyQuarantined(false); }}
            className={`btn ${selectedCategory === 'human' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            <Lock size={13} />
            <span>Non-Tiger: Human ({humanCount})</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-control"
            placeholder="Search frame, station ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, fontSize: '0.8125rem' }}
          />
        </div>
      </div>

      {/* Frame Gallery Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading camera trap dataset...
        </div>
      ) : filteredFrames.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          No images match the selected filter criteria.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18
        }}>
          {filteredFrames.map(frame => {
            const isQuarantined = frame.is_quarantined;
            const isTiger = frame.category === 'tiger';
            const isHuman = frame.category === 'human';

            return (
              <div
                key={frame.frame_id}
                className="glass-panel"
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isQuarantined 
                    ? '1px solid rgba(148, 163, 184, 0.25)' 
                    : isTiger 
                    ? '1px solid rgba(249, 115, 22, 0.4)' 
                    : '1px solid var(--border-subtle)',
                  background: isQuarantined ? 'rgba(15, 20, 28, 0.6)' : 'var(--bg-card)',
                  opacity: isQuarantined ? 0.85 : 1
                }}
              >
                {/* Image Viewport */}
                <div style={{ position: 'relative', height: 210, background: '#0a0e14', overflow: 'hidden' }}>
                  <img
                    src={frame.thumbnail_url || frame.file_path}
                    alt={frame.filename}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: isHuman ? 'blur(4px)' : 'none',
                      transition: 'transform 0.3s'
                    }}
                  />

                  {/* Privacy Flag Badge for Human Patrols */}
                  {isHuman && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(2px)'
                    }}>
                      <div className="badge badge-human" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                        <Lock size={14} />
                        <span>Privacy Safeguard Active</span>
                      </div>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    right: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span className={`badge ${
                      isTiger ? 'badge-tiger' :
                      isHuman ? 'badge-human' :
                      frame.category === 'blank' ? 'badge-blank' : 'badge-core'
                    }`}>
                      {frame.category === 'tiger' ? '🐅 Bengal Tiger' :
                       frame.category === 'blank' ? '🍃 Blank / False Trigger' :
                       frame.category === 'human' ? '👤 Patrol Team' : '🦌 ' + (frame.animal_species || 'Wildlife')}
                    </span>

                    <span style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#f8fafc',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {Math.round(frame.triage_confidence * 100)}% Conf
                    </span>
                  </div>

                  {/* Bottom Strip: Station ID & Timestamp */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    padding: '16px 12px 6px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    fontSize: '0.75rem',
                    color: '#e2e8f0'
                  }}>
                    <span style={{ fontWeight: 700 }}>{frame.station_id}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {new Date(frame.captured_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Card Details & Actions */}
                <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {frame.frame_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: frame.zone === 'CORE' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {frame.station_name || frame.zone || 'Core Zone'}
                      </span>
                    </div>

                    {/* Tiger Specific Re-ID details */}
                    {isTiger && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'rgba(249, 115, 22, 0.1)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Assigned Individual:</span>
                          <strong style={{ color: 'var(--accent-tiger)' }}>{frame.assigned_tiger_id || 'Pending Match'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Territory Status:</span>
                          <span className={`badge ${frame.territory_status === 'INSIDE_TERRITORY' ? 'badge-inside' : 'badge-outside'}`} style={{ fontSize: '0.65rem' }}>
                            {frame.territory_status || 'Unmapped'}
                          </span>
                        </div>
                      </div>
                    )}

                    {frame.quarantine_reason && (
                      <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
                        Reason: {frame.quarantine_reason}
                      </div>
                    )}
                  </div>

                  {/* Reversible Action Controls */}
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                    {isQuarantined ? (
                      <button
                        onClick={() => handleToggleQuarantine(frame.frame_id, true)}
                        className="btn btn-success btn-sm"
                        style={{ width: '100%' }}
                        title="Restore misclassified image back into working dataset"
                      >
                        <RotateCcw size={13} />
                        <span>Restore to Dataset (Safe)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleQuarantine(frame.frame_id, false)}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', color: 'var(--text-muted)' }}
                        title="Quarantine this frame"
                      >
                        <Trash2 size={13} />
                        <span>Quarantine Frame</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
