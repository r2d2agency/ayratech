import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import RouteDetailsView from './views/RouteDetailsView';
import CalendarView from './views/CalendarView';
import DocumentsView from './views/DocumentsView';
import BottomNav from './components/BottomNav';

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pb-20"> {/* Add padding bottom for bottom nav */}
      <Outlet />
      <BottomNav />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardView />} />
            <Route path="/routes/:id" element={<RouteDetailsView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/documents" element={<DocumentsView />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
