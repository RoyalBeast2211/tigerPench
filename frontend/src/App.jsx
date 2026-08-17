import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import GisReserveMap from './components/GisReserveMap';
import TriageQuarantineManager from './components/TriageQuarantineManager';
import StripeReidStudio from './components/StripeReidStudio';
import TigerDossierView from './components/TigerDossierView';
import DeviationAlertsFeed from './components/DeviationAlertsFeed';
import BatchIngestionModal from './components/BatchIngestionModal';
import ExportReportModal from './components/ExportReportModal';
import { fetchDashboardStats, fetchStations, fetchTigers } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'triage' | 'reid' | 'dossier' | 'alerts'
  const [stats, setStats] = useState(null);
  const [stations, setStations] = useState([]);
  const [tigers, setTigers] = useState([]);
  const [selectedTigerId, setSelectedTigerId] = useState(null);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const loadGlobalData = async () => {
    try {
      const [sData, stData, tgData] = await Promise.all([
        fetchDashboardStats(),
        fetchStations(),
        fetchTigers()
      ]);
      setStats(sData);
      setStations(stData.stations || []);
      setTigers(tgData.tigers || []);
    } catch (err) {
      console.error('Error fetching global intelligence data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleSelectTigerOnMap = (tigerId) => {
    setSelectedTigerId(tigerId);
    setActiveTab('map');
  };

  const handleOpenTigerDossier = (tigerId) => {
    setSelectedTigerId(tigerId);
    setActiveTab('dossier');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngest={() => setIsIngestModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        stats={stats}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1600, width: '100%', margin: '0 auto', padding: '24px' }}>
        {/* KPI Dashboard Overview */}
        <DashboardOverview
          stats={stats}
          onSelectTab={setActiveTab}
        />

        {/* Tab Viewport */}
        {activeTab === 'map' && (
          <GisReserveMap
            stations={stations}
            tigers={tigers}
            selectedTigerId={selectedTigerId}
            onSelectTiger={setSelectedTigerId}
          />
        )}

        {activeTab === 'triage' && (
          <TriageQuarantineManager
            onRefreshStats={loadGlobalData}
          />
        )}

        {activeTab === 'reid' && (
          <StripeReidStudio
            onSelectTigerOnMap={handleSelectTigerOnMap}
            onRefreshStats={loadGlobalData}
          />
        )}

        {activeTab === 'dossier' && (
          <TigerDossierView
            tigers={tigers}
            initialTigerId={selectedTigerId}
            onSelectTigerOnMap={handleSelectTigerOnMap}
          />
        )}

        {activeTab === 'alerts' && (
          <DeviationAlertsFeed
            onSelectTigerOnMap={handleSelectTigerOnMap}
            onRefreshStats={loadGlobalData}
          />
        )}
      </main>

      {/* 3-Stage Pipeline Ingestion Modal */}
      <BatchIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          loadGlobalData();
          setIsIngestModalOpen(false);
        }}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
