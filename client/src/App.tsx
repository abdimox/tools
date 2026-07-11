import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getCurrentUser, logout } from './localAuth';
import { AppLayout } from './components/AppLayout';
import { ChatPage } from './pages/Chat';
import { CoverStudioPage } from './pages/CoverStudio';
import { DashboardPage } from './pages/Dashboard';
import { HookScorePage } from './pages/HookScore';
import { LoginPage } from './pages/Login';
import { NoteGeneratorPage } from './pages/NoteGenerator';
import { SettingsPage } from './pages/Settings';
import type { AuthUser } from './types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  if (!user) return <LoginPage onSuccess={setUser} />;

  function signOut() { logout(); setUser(null); }

  return (
    <Routes>
      <Route element={<AppLayout user={user} onLogout={signOut} />}>
        <Route index element={<DashboardPage />} />
        <Route path="note" element={<NoteGeneratorPage />} />
        <Route path="score" element={<HookScorePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="cover" element={<CoverStudioPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
