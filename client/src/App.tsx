import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getCurrentUser, logout } from './api';
import { AppLayout } from './components/AppLayout';
import { AccountAnalyzerPage } from './pages/AccountAnalyzer';
import { ChatPage } from './pages/Chat';
import { CompetitorAnalyzerPage } from './pages/CompetitorAnalyzer';
import { CoverStudioPage } from './pages/CoverStudio';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { NoteGeneratorPage } from './pages/NoteGenerator';
import { SettingsPage } from './pages/Settings';
import type { AuthUser } from './types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void getCurrentUser().then(setUser).finally(() => setChecking(false));
    const expired = () => setUser(null);
    window.addEventListener('loho-auth-expired', expired);
    return () => window.removeEventListener('loho-auth-expired', expired);
  }, []);

  if (checking) return <main className="app-checking">正在打开工作台...</main>;
  if (!user) return <LoginPage onSuccess={setUser} />;

  async function signOut() { await logout(); setUser(null); }

  return (
    <Routes>
      <Route element={<AppLayout user={user} onLogout={signOut} />}>
        <Route index element={<DashboardPage />} />
        <Route path="note" element={<NoteGeneratorPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="cover" element={<CoverStudioPage />} />
        <Route path="account" element={<AccountAnalyzerPage />} />
        <Route path="competitor" element={<CompetitorAnalyzerPage />} />
        {user.role === 'admin' && <Route path="settings" element={<SettingsPage />} />}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
