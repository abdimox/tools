import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { clearToken, getToken } from './api';
import { AppLayout } from './components/AppLayout';
import { AccountAnalyzerPage } from './pages/AccountAnalyzer';
import { CompetitorAnalyzerPage } from './pages/CompetitorAnalyzer';
import { CoverStudioPage } from './pages/CoverStudio';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { NoteGeneratorPage } from './pages/NoteGenerator';
import { SettingsPage } from './pages/Settings';

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));

  if (!authenticated) return <LoginPage onSuccess={() => setAuthenticated(true)} />;

  return (
    <Routes>
      <Route element={<AppLayout onLogout={() => { clearToken(); setAuthenticated(false); }} />}>
        <Route index element={<DashboardPage />} />
        <Route path="note" element={<NoteGeneratorPage />} />
        <Route path="cover" element={<CoverStudioPage />} />
        <Route path="account" element={<AccountAnalyzerPage />} />
        <Route path="competitor" element={<CompetitorAnalyzerPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
