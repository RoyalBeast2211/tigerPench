import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Eye, 
  Maximize2, 
  Navigation, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Compass,
  Activity,
  Droplets,
  TreePine,
  Footprints,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  SunMedium,
  Moon
} from 'lucide-react';
import { 
  fetchEcologicalLayers, 
  fetchTigerBehaviorProfile, 
  fetchTigerPredictiveSteps 
} from '../services/api';

const TIGER_COLORS = {
  'PTR-M-01': '#f97316', // Raiyakassa Male - Orange
  'PTR-F-02': '#ec4899', // Langdi Tigress - Pink
  'PTR-M-03': '#eab308', // L-Mark Male - Amber
  'PTR-F-04': '#06b6d4', // Bari Mada - Cyan
  'PTR-M-07': '#8b5cf6', // Chhota Ambewali - Purple
};

export default function GisReserveMap({ stations, tigers, onSelectTiger, selectedTigerId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    coreZone: null,
    bufferZone: null,
    waterbodies: null,
    infrastructure: null,
    villages: null,
    corridors: null,
    stations: null,
    homeRange: null,
    coreUseArea: null,
    trajectories: null,
    predictions: null
  });

  // Layer A Toggles (Ecological GIS)
  const [layerA, setLayerA] = useState({
    coreZone: true,
    bufferZone: true,
    waterbodies: true,
    infrastructure: true,
    villages: true,
    corridors: true
  });

  // Layer B Toggles (Individual Tiger Behavior)
  const [layerB, setLayerB] = useState({
    stations: true,
    homeRange: true,
    coreUseArea: true,
    trajectories: true,
    predictions: true
  });

  const [activeTigerFilter, setActiveTigerFilter] = useState(selectedTigerId || 'ALL');
  const [ecologicalData, setEcologicalData] = useState(null);
  const [behaviorProfile, setBehaviorProfile] = useState(null);
  const [predictiveSteps, setPredictiveSteps] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Sync selected tiger prop
  useEffect(() => {
    if (selectedTigerId) {
      setActiveTigerFilter(selectedTigerId);
    }
  }, [selectedTigerId]);

  // Fetch Ecological GIS Layer A Data once
  useEffect(() => {
    fetchEcologicalLayers()
      .then(data => setEcologicalData(data))
      .catch(err => console.error('Failed to load ecological GIS:', err));
  }, []);

  // Fetch Individual Tiger Behavioral Profile & Next-Step Predictions (Layer B)
  useEffect(() => {
    if (activeTigerFilter && activeTigerFilter !== 'ALL') {
      setIsLoadingProfile(true);
      Promise.all([
        fetchTigerBehaviorProfile(activeTigerFilter),
        fetchTigerPredictiveSteps(activeTigerFilter)
      ])
        .then(([profile, predictions]) => {
          setBehaviorProfile(profile);
          setPredictiveSteps(predictions);
          setIsLoadingProfile(false);
        })
        .catch(err => {
          console.error('Failed to fetch tiger behavior profile:', err);
          setIsLoadingProfile(false);
        });
    } else {
      setBehaviorProfile(null);
      setPredictiveSteps(null);
    }
  }, [activeTigerFilter]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.7500, 79.3300],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Clean Satellite / Topographic Hybrid Basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initialize Layer Groups
    layersRef.current.coreZone = L.layerGroup().addTo(map);
    layersRef.current.bufferZone = L.layerGroup().addTo(map);
    layersRef.current.waterbodies = L.layerGroup().addTo(map);
    layersRef.current.infrastructure = L.layerGroup().addTo(map);
    layersRef.current.villages = L.layerGroup().addTo(map);
    layersRef.current.corridors = L.layerGroup().addTo(map);
    layersRef.current.stations = L.layerGroup().addTo(map);
    layersRef.current.homeRange = L.layerGroup().addTo(map);
    layersRef.current.coreUseArea = L.layerGroup().addTo(map);
    layersRef.current.trajectories = L.layerGroup().addTo(map);
    layersRef.current.predictions = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Layer A: Ecological GIS Landscape
  useEffect(() => {
    if (!mapInstanceRef.current || !ecologicalData) return;

    // A1. Core Zone Polygon
    layersRef.current.coreZone.clearLayers();
    if (layerA.coreZone && ecologicalData.core_zone) {
      const coords = ecologicalData.core_zone.geometry.coordinates[0].map(c => [c[1], c[0]]);
      L.polygon(coords, {
        color: '#10b981',
        weight: 2.5,
        dashArray: '5, 5',
        fillColor: '#10b981',
        fillOpacity: 0.12
      }).bindTooltip('<b>Pench Inviolate Core Zone (CTH)</b><br/>Area: 411.33 km²', { sticky: true }).addTo(layersRef.current.coreZone);
    }

    // A2. Buffer Zone Polygon
    layersRef.current.bufferZone.clearLayers();
    if (layerA.bufferZone && ecologicalData.buffer_zone) {
      const coords = ecologicalData.buffer_zone.geometry.coordinates[0].map(c => [c[1], c[0]]);
      L.polygon(coords, {
        color: '#eab308',
        weight: 1.8,
        dashArray: '8, 6',
        fillColor: '#eab308',
        fillOpacity: 0.05
      }).bindTooltip('<b>Pench Multiple-Use Buffer Zone</b><br/>Area: 768.20 km²', { sticky: true }).addTo(layersRef.current.bufferZone);
    }

    // A3. Waterbodies & Drainage
    layersRef.current.waterbodies.clearLayers();
    if (layerA.waterbodies && ecologicalData.waterbodies) {
      ecologicalData.waterbodies.forEach(wb => {
        const coords = wb.coordinates.map(c => [c[1], c[0]]);
        if (wb.type === 'RESERVOIR') {
          L.polygon(coords, {
            color: '#0284c7',
            weight: 2,
            fillColor: '#38bdf8',
            fillOpacity: 0.4
          }).bindTooltip(`<b>💧 ${wb.name}</b><br/>Suitability: ${Math.round(wb.suitability_score * 100)}%`, { sticky: true }).addTo(layersRef.current.waterbodies);
        } else {
          L.polyline(coords, {
            color: '#0ea5e9',
            weight: 4,
            opacity: 0.85
          }).bindTooltip(`<b>💧 ${wb.name}</b>`, { sticky: true }).addTo(layersRef.current.waterbodies);
        }
      });
    }

    // A4. Linear Infrastructure (NH-44 Expressway & Wildlife Underpasses)
    layersRef.current.infrastructure.clearLayers();
    if (layerA.infrastructure && ecologicalData.infrastructure) {
      ecologicalData.infrastructure.forEach(inf => {
        if (inf.type === 'HIGHWAY') {
          const coords = inf.coordinates.map(c => [c[1], c[0]]);
          L.polyline(coords, {
            color: '#ef4444',
            weight: 3.5,
            opacity: 0.75
          }).bindTooltip(`<b>🛣️ ${inf.name}</b><br/>Linear Barrier Resistance: High`, { sticky: true }).addTo(layersRef.current.infrastructure);
        } else if (inf.type === 'WILDLIFE_UNDERPASS') {
          const icon = L.divIcon({
            className: 'custom-underpass-pin',
            html: `<div style="background: #10b981; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">🛡️</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          L.marker([inf.lat, inf.lng], { icon })
            .bindPopup(`<b>🛡️ ${inf.name}</b><br/>Status: Dedicated Eco-Mitigation Passage<br/>Permeability: 85% Safe Animal Crossing`)
            .addTo(layersRef.current.infrastructure);
        }
      });
    }

    // A5. Fringe Human Settlements & Conflict Risk
    layersRef.current.villages.clearLayers();
    if (layerA.villages && ecologicalData.villages) {
      ecologicalData.villages.forEach(v => {
        const isHigh = v.conflict_risk === 'HIGH';
        const icon = L.divIcon({
          className: 'custom-village-pin',
          html: `<div style="background: ${isHigh ? 'rgba(239, 68, 68, 0.9)' : 'rgba(234, 179, 8, 0.9)'}; color: white; width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 1.5px solid white;">🏡</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        L.marker([v.lat, v.lng], { icon })
          .bindPopup(`<b>🏡 ${v.name}</b><br/>Conflict Risk: <span style="color: ${isHigh ? '#ef4444' : '#eab308'}; font-weight: bold;">${v.conflict_risk}</span><br/>Households: ${v.households} &bull; Livestock: ${v.livestock}`)
          .addTo(layersRef.current.villages);
      });
    }

    // A6. WII Defined Tiger Dispersal Corridors
    layersRef.current.corridors.clearLayers();
    if (layerA.corridors && ecologicalData.corridors) {
      ecologicalData.corridors.forEach(corr => {
        const coords = corr.path.map(c => [c[1], c[0]]);
        L.polyline(coords, {
          color: '#8b5cf6',
          weight: 4,
          dashArray: '10, 8',
          opacity: 0.9
        }).bindTooltip(`<b>🐾 ${corr.name}</b><br/>Destination: ${corr.destination}<br/>Permeability: ${Math.round(corr.permeability * 100)}%`, { sticky: true }).addTo(layersRef.current.corridors);
      });
    }

  }, [ecologicalData, layerA]);

  // 3. Render Layer B: Individual Tiger Behavior & Empirical Telemetry
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // B1. Camera Trap Stations
    layersRef.current.stations.clearLayers();
    if (layerB.stations && stations) {
      stations.forEach(st => {
        const isCore = st.zone === 'CORE';
        const markerColor = isCore ? '#10b981' : '#eab308';
        const icon = L.divIcon({
          className: 'custom-station-pin',
          html: `<div style="background: ${markerColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid rgba(0,0,0,0.6); box-shadow: 0 0 8px ${markerColor}66;">📷</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([st.latitude, st.longitude], { icon })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 12px;">
              <strong>${st.station_id} - ${st.name}</strong><br/>
              <span style="color: ${markerColor}; font-weight: bold;">[${st.zone} ZONE]</span> &bull; ${st.range_office}<br/>
              Captures: ${st.total_captures || 0} (🐅 ${st.tiger_captures || 0} Tigers)
            </div>
          `)
          .addTo(layersRef.current.stations);
      });
    }

    // B2. Home Range (95% MCP) & Core-Use Area (50% Kernel Core)
    layersRef.current.homeRange.clearLayers();
    layersRef.current.coreUseArea.clearLayers();
    layersRef.current.trajectories.clearLayers();
    layersRef.current.predictions.clearLayers();

    if (activeTigerFilter !== 'ALL' && behaviorProfile) {
      const color = TIGER_COLORS[activeTigerFilter] || '#f97316';

      // 95% Home Range
      if (layerB.homeRange && behaviorProfile.home_range_95_geojson && behaviorProfile.home_range_95_geojson.length > 0) {
        const coords = behaviorProfile.home_range_95_geojson.map(c => [c[1], c[0]]);
        L.polygon(coords, {
          color: color,
          weight: 2.5,
          fillColor: color,
          fillOpacity: 0.15
        }).bindTooltip(`<b>${behaviorProfile.name} (95% Home Range)</b><br/>Area: ${behaviorProfile.home_range_area_km2} km²`, { sticky: true }).addTo(layersRef.current.homeRange);
      }

      // 50% Core-Use Area (High Intensity Marking/Breeding Core)
      if (layerB.coreUseArea && behaviorProfile.core_use_50_geojson && behaviorProfile.core_use_50_geojson.length > 0) {
        const coreCoords = behaviorProfile.core_use_50_geojson.map(c => [c[1], c[0]]);
        L.polygon(coreCoords, {
          color: '#ef4444',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#ef4444',
          fillOpacity: 0.25
        }).bindTooltip(`<b>${behaviorProfile.name} (50% Core-Use Area)</b><br/>Area: ${behaviorProfile.core_use_area_km2} km² (High Marking Intensity)`, { sticky: true }).addTo(layersRef.current.coreUseArea);
      }

      // Centroid Marker
      if (behaviorProfile.centroid) {
        const cIcon = L.divIcon({
          className: 'custom-centroid-pin',
          html: `<div style="background: ${color}; color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 0 12px ${color};">🎯</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker([behaviorProfile.centroid.lat, behaviorProfile.centroid.lng], { icon: cIcon })
          .bindPopup(`<b>${behaviorProfile.name} Centroid</b><br/>Lat: ${behaviorProfile.centroid.lat}, Lng: ${behaviorProfile.centroid.lng}`)
          .addTo(layersRef.current.homeRange);
      }

      // Step-Selection Next Movement Predictions (Layer A + B Vector)
      if (layerB.predictions && predictiveSteps && predictiveSteps.predictions) {
        const top3 = predictiveSteps.predictions.slice(0, 3);
        const lastSt = stations?.find(s => s.station_id === predictiveSteps.current_station_id);

        if (lastSt) {
          top3.forEach((pred, pIdx) => {
            const predSt = stations?.find(s => s.station_id === pred.station_id);
            if (predSt && predSt.station_id !== lastSt.station_id) {
              const lineCoords = [
                [lastSt.latitude, lastSt.longitude],
                [predSt.latitude, predSt.longitude]
              ];
              L.polyline(lineCoords, {
                color: pIdx === 0 ? '#38bdf8' : '#94a3b8',
                weight: pIdx === 0 ? 3.5 : 2,
                dashArray: '6, 6',
                opacity: 0.85
              }).bindTooltip(`<b>SSF Next Step Prediction (#${pIdx + 1})</b><br/>Target: ${pred.station_name}<br/>Probability: ${pred.transition_probability_pct}%`, { sticky: true }).addTo(layersRef.current.predictions);
            }
          });
        }
      }
    } else if (activeTigerFilter === 'ALL' && tigers) {
      // Render all tigers' territories simultaneously
      tigers.forEach(t => {
        const color = TIGER_COLORS[t.tiger_id] || '#10b981';
        if (t.stations && t.stations.length > 0 && stations) {
          const tStations = stations.filter(s => t.stations.includes(s.station_id));
          if (tStations.length >= 3) {
            const pts = tStations.map(s => [s.latitude, s.longitude]);
            L.polygon(pts, {
              color: color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.12
            }).bindTooltip(`<b>${t.name} (${t.tiger_id})</b><br/>Territory: ${t.known_territory_km2 || 15} km²`, { sticky: true }).addTo(layersRef.current.homeRange);
          }
        }
      });
    }

  }, [stations, tigers, activeTigerFilter, behaviorProfile, predictiveSteps, layerB]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, height: 'calc(100vh - 160px)', minHeight: 650 }}>
      {/* Left: Interactive Map Container with Layer A / B HUD Controls */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
        {/* Top Floating Control Bar */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          background: 'rgba(11, 17, 24, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Individual Tiger Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Individual Tiger:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setActiveTigerFilter('ALL'); if (onSelectTiger) onSelectTiger(null); }}
                className={`btn ${activeTigerFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                All Tigers ({tigers?.length || 0})
              </button>
              {tigers?.map(t => (
                <button
                  key={t.tiger_id}
                  onClick={() => { setActiveTigerFilter(t.tiger_id); if (onSelectTiger) onSelectTiger(t.tiger_id); }}
                  className={`btn ${activeTigerFilter === t.tiger_id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderColor: TIGER_COLORS[t.tiger_id] || '#10b981',
                    background: activeTigerFilter === t.tiger_id ? undefined : 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <span style={{ color: TIGER_COLORS[t.tiger_id] }}>●</span> {t.tiger_id}
                </button>
              ))}
            </div>
          </div>

          {/* Quick HUD Legend Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.7rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Core CTH
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }}></span> Buffer ESZ
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9' }}></span> Pench River
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></span> WII Corridor
            </span>
          </div>
        </div>

        {/* Map Canvas */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Bottom Layer Switcher Float */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1000,
          background: 'rgba(11, 17, 24, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: 16,
          fontSize: '0.75rem'
        }}>
          {/* Layer A Controls */}
          <div>
            <div style={{ fontWeight: 800, color: '#10b981', marginBottom: 4, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Layer A: Ecological GIS
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerA.coreZone} onChange={e => setLayerA({ ...layerA, coreZone: e.target.checked })} />
                Core Zone
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerA.waterbodies} onChange={e => setLayerA({ ...layerA, waterbodies: e.target.checked })} />
                Rivers & Dams
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerA.infrastructure} onChange={e => setLayerA({ ...layerA, infrastructure: e.target.checked })} />
                NH-44 & Underpasses
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerA.corridors} onChange={e => setLayerA({ ...layerA, corridors: e.target.checked })} />
                WII Corridors
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerA.villages} onChange={e => setLayerA({ ...layerA, villages: e.target.checked })} />
                Fringe Villages
              </label>
            </div>
          </div>

          {/* Layer B Controls */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 14 }}>
            <div style={{ fontWeight: 800, color: 'var(--accent-tiger)', marginBottom: 4, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Layer B: Individual Behavior
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerB.homeRange} onChange={e => setLayerB({ ...layerB, homeRange: e.target.checked })} />
                95% MCP Range
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerB.coreUseArea} onChange={e => setLayerB({ ...layerB, coreUseArea: e.target.checked })} />
                50% Core Area
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={layerB.predictions} onChange={e => setLayerB({ ...layerB, predictions: e.target.checked })} />
                SSF Next Step
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Movement Ecology & Behavior Side-Panel */}
      <div className="glass-panel" style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--accent-tiger)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              {activeTigerFilter === 'ALL' ? 'Pench Metapopulation Overview' : `${behaviorProfile?.name || activeTigerFilter} Intelligence`}
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            WII Two-Layer Synthesis: Combining biophysical landscape suitability (Layer A) with empirical individual ethology (Layer B).
          </p>
        </div>

        {activeTigerFilter !== 'ALL' && behaviorProfile ? (
          <>
            {/* Territory Summary Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-tiger)' }}>
                  Home Range & Core Space
                </span>
                <span className="badge badge-tiger" style={{ fontSize: '0.65rem' }}>
                  {behaviorProfile.gender === 'M' ? 'Adult Resident Male' : 'Breeding Female'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>95% MCP Home Range</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                    {behaviorProfile.home_range_area_km2} km²
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>50% Core-Use Area</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>
                    {behaviorProfile.core_use_area_km2} km²
                  </div>
                </div>
              </div>
            </div>

            {/* Movement Dynamics & Displacement */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: 14
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Compass size={14} />
                <span>Movement Speed & Heading Vector</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Avg Speed</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{behaviorProfile.movement_dynamics.avg_speed_kmh} km/h</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Avg Step</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{behaviorProfile.movement_dynamics.avg_step_length_km} km</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Primary Axis</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-tiger)' }}>
                    {behaviorProfile.movement_dynamics.heading_direction_cardinal} ({behaviorProfile.movement_dynamics.primary_heading_deg}°)
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Circadian Activity Profile */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} />
                  <span>24-Hour Circadian Activity Pattern</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Peak: 18-22h & 04-07h</span>
              </div>

              {/* 24 Bar Mini Histogram */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 45, marginBottom: 8 }}>
                {behaviorProfile.circadian_rhythm.hourly_percentages.map((pct, hIdx) => {
                  const isCrepuscular = (hIdx >= 4 && hIdx <= 7) || (hIdx >= 17 && hIdx <= 21);
                  const isDiurnal = hIdx >= 8 && hIdx <= 16;
                  return (
                    <div
                      key={hIdx}
                      style={{
                        flex: 1,
                        height: `${Math.max(10, Math.min(100, pct * 4))}%`,
                        background: isCrepuscular ? 'var(--accent-tiger)' : isDiurnal ? 'rgba(255,255,255,0.1)' : '#38bdf8',
                        borderRadius: 1
                      }}
                      title={`${hIdx}:00 - ${pct}% activity`}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span style={{ color: '#38bdf8' }}>🌙 Nocturnal ({behaviorProfile.circadian_rhythm.nocturnal_activity_pct}%)</span>
                <span style={{ color: 'var(--accent-tiger)' }}>🌅 Crepuscular ({behaviorProfile.circadian_rhythm.crepuscular_activity_pct}%)</span>
                <span>☀️ Diurnal ({behaviorProfile.circadian_rhythm.diurnal_activity_pct}%)</span>
              </div>
            </div>

            {/* Step-Selection Function (SSF) Next-Station Predictions */}
            {predictiveSteps && predictiveSteps.predictions && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 14
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} />
                  <span>Predicted Next Step (SSF Probability)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {predictiveSteps.predictions.slice(0, 4).map((p, pIdx) => (
                    <div
                      key={p.station_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: pIdx === 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: pIdx === 0 ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          #{pIdx + 1} {p.station_name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {p.distance_km} km away &bull; Suitability: {Math.round(p.ecological_suitability * 100)}%
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          color: pIdx === 0 ? '#38bdf8' : 'var(--text-secondary)'
                        }}>
                          {p.transition_probability_pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonal Shifts & Boundary Conflict Risk */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              fontSize: '0.75rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-tiger)', marginBottom: 6 }}>
                Seasonal Rhythms & Corridor Proximity:
              </div>
              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                &bull; <strong>Summer Dry Season:</strong> {behaviorProfile.seasonal_patterns.dry_season_behavior} ({behaviorProfile.seasonal_patterns.dry_season_mcp_km2} km²)
              </p>
              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                &bull; <strong>Monsoon Expansion:</strong> {behaviorProfile.seasonal_patterns.monsoon_season_behavior} ({behaviorProfile.seasonal_patterns.monsoon_season_mcp_km2} km²)
              </p>
              <p style={{ margin: 0, color: behaviorProfile.boundary_excursions.corridor_dispersal_risk === 'HIGH' ? '#ef4444' : '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
                &bull; <strong>Corridor Dispersal Risk:</strong> {behaviorProfile.boundary_excursions.corridor_dispersal_risk} ({behaviorProfile.boundary_excursions.nearest_corridor})
              </p>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                Pench Metapopulation Landscape
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Select an individual tiger from the top bar to inspect its empirical 95% Home Range, 50% Core-Use Area, 24h Circadian rhythm, and predictive Step-Selection Function (SSF) vectors.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>
                WII Ecological Corridor Linkages
              </div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <li><strong>Pench - Kanha (140 km NE):</strong> Major genetic flow corridor through Balaghat/Seoni forests.</li>
                <li><strong>Pench - Nagzira (95 km SE):</strong> Connectivity across Maharashtra-MP border.</li>
                <li><strong>NH-44 Mitigation Zone:</strong> 7 dedicated eco-underpasses protecting Khawasa corridor.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
