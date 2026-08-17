import React, { useState } from 'react';
import { 
  Play, 
  X, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  Camera, 
  ShieldCheck, 
  HardDrive, 
  Clock, 
  Radio, 
  Loader2 
} from 'lucide-react';
import { triggerIngestBatch } from '../services/api';

export default function BatchIngestionModal({ isOpen, onClose, onSuccess }) {
  const [batchName, setBatchName] = useState('Pench SD Card Dump - Cycle 2026-A');
  const [useSample, setUseSample] = useState(true);
  const [folderPath, setFolderPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0); // 0 = idle, 1 = Stage 1, 2 = Stage 2, 3 = Stage 3, 4 = complete
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleRunPipeline = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setCurrentStage(1);

      // Simulate step progress for user feedback
      setTimeout(() => setCurrentStage(2), 700);
      setTimeout(() => setCurrentStage(3), 1400);

      const res = await triggerIngestBatch({
        batch_name: batchName,
        source_folder_path: useSample ? null : folderPath,
        use_bundled_sample: useSample,
      });

      setCurrentStage(4);
      setResultData(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Pipeline execution failed');
      setCurrentStage(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 640, padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Play size={18} fill="currentColor" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>
                Run 3-Stage Camera Trap Pipeline
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automated Triage, Stripe Re-ID & Spatial Territory Engine
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Batch Ingestion Name:
            </label>
            <input
              type="text"
              className="input-control"
              value={batchName}
              onChange={e => setBatchName(e.target.value)}
              disabled={isProcessing}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{
            background: 'rgba(15, 23, 33, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 14
          }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: 8 }}>
              Input Source:
            </label>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sourceOption"
                  checked={useSample}
                  onChange={() => setUseSample(true)}
                  disabled={isProcessing}
                />
                <span>Bundled Pench Sample Batch (14 camera trap frames)</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sourceOption"
                  checked={!useSample}
                  onChange={() => setUseSample(false)}
                  disabled={isProcessing}
                />
                <span>Custom SD Card / Local Folder Path</span>
              </label>
            </div>

            {!useSample && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="/media/sdcard/DCIM/100MEDIA or local image path"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                  disabled={isProcessing}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>
            )}
          </div>

          {/* 3-Stage Progress Visualizer */}
          <div style={{
            background: 'rgba(11, 16, 21, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Pipeline Execution Sequence:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Stage 1 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: currentStage >= 1 ? '#f8fafc' : 'var(--text-muted)'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: currentStage > 1 ? 'var(--accent-emerald)' : currentStage === 1 ? 'var(--accent-tiger)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                  {currentStage > 1 ? <CheckCircle2 size={16} /> : currentStage === 1 ? <Loader2 size={16} className="spin" /> : '1'}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Stage 1: Google SpeciesNet (Tiger vs Non-Tiger Separator)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Classifies Panthera tigris vs non-tigers (blanks, other fauna, humans). Only tigers proceed to Stages 2 & 3.</div>
                </div>
              </div>

              {/* Stage 2 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: currentStage >= 2 ? '#f8fafc' : 'var(--text-muted)'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: currentStage > 2 ? 'var(--accent-emerald)' : currentStage === 2 ? 'var(--accent-tiger)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                  {currentStage > 2 ? <CheckCircle2 size={16} /> : currentStage === 2 ? <Loader2 size={16} className="spin" /> : '2'}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Stage 2: Tiger Stripe Re-ID</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Extracts flank stripe topologies and matches against known Pench catalogue</div>
                </div>
              </div>

              {/* Stage 3 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: currentStage >= 3 ? '#f8fafc' : 'var(--text-muted)'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: currentStage >= 4 ? 'var(--accent-emerald)' : currentStage === 3 ? 'var(--accent-tiger)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                  {currentStage >= 4 ? <CheckCircle2 size={16} /> : currentStage === 3 ? <Loader2 size={16} className="spin" /> : '3'}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Stage 3: Spatial Territory & Deviations</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Computes MCP home range polygons, centroid shifts, and buffer conflict alerts</div>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.8125rem'
            }}>
              {errorMsg}
            </div>
          )}

          {currentStage === 4 && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <CheckCircle2 size={20} />
              <div>
                <strong>Pipeline Execution Succeeded!</strong>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  All 3 stages completed. Blanks quarantined, tigers re-identified, and territories updated.
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isProcessing}
            >
              {currentStage === 4 ? 'Close' : 'Cancel'}
            </button>
            {currentStage !== 4 && (
              <button
                onClick={handleRunPipeline}
                className="btn btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Processing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" />
                    <span>Start Ingestion Run</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
