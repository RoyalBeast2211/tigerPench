const API_BASE = '/api';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error('Failed to fetch camera stations');
  return res.json();
}

export async function fetchTigers() {
  const res = await fetch(`${API_BASE}/tigers`);
  if (!res.ok) throw new Error('Failed to fetch tigers');
  return res.json();
}

export async function fetchTigerDetail(tigerId) {
  const res = await fetch(`${API_BASE}/tigers/${encodeURIComponent(tigerId)}`);
  if (!res.ok) throw new Error(`Failed to fetch tiger details for ${tigerId}`);
  return res.json();
}

export async function fetchFrames(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.is_quarantined !== undefined) query.set('is_quarantined', params.is_quarantined);
  if (params.station_id) query.set('station_id', params.station_id);
  if (params.tiger_id) query.set('tiger_id', params.tiger_id);
  if (params.needs_review) query.set('needs_review', 'true');
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);

  const res = await fetch(`${API_BASE}/frames?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch frames');
  return res.json();
}

export async function toggleQuarantine(frameId, isQuarantined, reason = 'Manual Forest Staff Action') {
  const res = await fetch(`${API_BASE}/frames/${encodeURIComponent(frameId)}/quarantine/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_quarantined: isQuarantined, reason }),
  });
  if (!res.ok) throw new Error('Failed to toggle quarantine');
  return res.json();
}

export async function verifyReID(frameId, { tigerId, isNewEnrollment = false, newTigerName = '', gender = 'U', notes = '' }) {
  const res = await fetch(`${API_BASE}/frames/${encodeURIComponent(frameId)}/reid/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tiger_id: tigerId,
      is_new_enrollment: isNewEnrollment,
      new_tiger_name: newTigerName,
      gender,
      notes,
    }),
  });
  if (!res.ok) throw new Error('Failed to verify tiger re-ID match');
  return res.json();
}

export async function fetchTerritories() {
  const res = await fetch(`${API_BASE}/territories`);
  if (!res.ok) throw new Error('Failed to fetch territories');
  return res.json();
}

export async function fetchEcologicalLayers() {
  const res = await fetch(`${API_BASE}/gis/ecological-layers`);
  if (!res.ok) throw new Error('Failed to fetch ecological GIS layers');
  return res.json();
}

export async function fetchTigerBehaviorProfile(tigerId) {
  const res = await fetch(`${API_BASE}/tigers/${encodeURIComponent(tigerId)}/behavior-profile`);
  if (!res.ok) throw new Error(`Failed to fetch behavior profile for ${tigerId}`);
  return res.json();
}

export async function fetchTigerPredictiveSteps(tigerId) {
  const res = await fetch(`${API_BASE}/tigers/${encodeURIComponent(tigerId)}/predictive-steps`);
  if (!res.ok) throw new Error(`Failed to fetch predictive steps for ${tigerId}`);
  return res.json();
}

export async function fetchAlerts(params = {}) {
  const query = new URLSearchParams();
  if (params.alert_type) query.set('alert_type', params.alert_type);
  if (params.severity) query.set('severity', params.severity);
  if (params.is_acknowledged !== undefined) query.set('is_acknowledged', params.is_acknowledged);

  const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch movement alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId, actionNotes = 'Patrol team dispatched to station sector') {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_notes: actionNotes }),
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function triggerIngestBatch(payload = { batch_name: 'Pench Cycle 2026', use_bundled_sample: true }) {
  const res = await fetch(`${API_BASE}/pipeline/ingest-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to trigger pipeline batch ingestion');
  return res.json();
}

export async function fetchIntelligenceReport() {
  const res = await fetch(`${API_BASE}/export/report`);
  if (!res.ok) throw new Error('Failed to generate intelligence report');
  return res.json();
}
