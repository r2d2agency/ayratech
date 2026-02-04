import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import RouteDetailsView from './views/RouteDetailsView';
import ProductCheckView from './views/ProductCheckView';
import CalendarView from './views/CalendarView';
import DocumentsView from './views/DocumentsView';
import TimeClockView from './views/TimeClockView';
import BottomNav from './components/BottomNav';
import LocationTracker from './components/LocationTracker';
import TimeClockAlert from './components/TimeClockAlert';

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pb-20"> {/* Add padding bottom for bottom nav */}
      <LocationTracker />
      <TimeClockAlert />
      <Outlet />
      <BottomNav />
    </div>
  );
};

const App = () => {
  return (
    <BrandingProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<DashboardView />} />
              <Route path="/routes/:id" element={<RouteDetailsView />} />
              <Route path="/routes/:routeId/items/:itemId/check" element={<ProductCheckView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/documents" element={<DocumentsView />} />
              <Route path="/time-clock" element={<TimeClockView />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </BrandingProvider>
  );
};

export default App;
