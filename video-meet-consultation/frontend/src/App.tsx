import React, { useState, useEffect } from 'react';
import { User } from './types';
import { authApi } from './services/api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingRoom } from './components/MeetingRoom';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(authApi.getCurrentUser());
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  // Check URL path or hash for direct meeting link (e.g. #meet-1234 or ?room=meet-1234)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || window.location.hash.replace('#', '');
    if (roomParam && roomParam.startsWith('meet-')) {
      setActiveRoomCode(roomParam);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setActiveRoomCode(null);
  };

  const handleJoinMeeting = (roomCode: string) => {
    setActiveRoomCode(roomCode);
    window.location.hash = roomCode;
  };

  const handleLeaveMeeting = () => {
    setActiveRoomCode(null);
    window.location.hash = '';
  };

  // 1. Not Authenticated -> Show Doctor & Patient Login Screen
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. In an Active Video Consultation -> Show Full Zoom/Meet Interface
  if (activeRoomCode) {
    return (
      <MeetingRoom
        roomCode={activeRoomCode}
        currentUser={currentUser}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  // 3. Authenticated -> Show Portal Dashboard (Create / Join / Summaries)
  return (
    <DashboardPage
      currentUser={currentUser}
      onJoinMeeting={handleJoinMeeting}
      onLogout={handleLogout}
    />
  );
}

export default App;
