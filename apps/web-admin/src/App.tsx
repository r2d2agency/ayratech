import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ViewType } from './types';
import DashboardView from './views/DashboardView';
import ClientsView from './views/ClientsView';
import ProductsView from './views/ProductsView';
import LiveMapView from './views/LiveMapView';
import RoutesView from './views/RoutesView';
import SupermarketsListView from './views/SupermarketsListView';
import SupermarketFormView from './views/SupermarketFormView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import { BrandingProvider } from './context/BrandingContext';

const MainContent: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleNavigate = (view: ViewType) => {
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        expanded={sidebarExpanded} 
        setExpanded={setSidebarExpanded} 
      />
      
      <div className={`transition-all duration-300 ${sidebarExpanded ? 'pl-64' : 'pl-20'}`}>
        <Header />
        
        <main className="max-w-[1600px] mx-auto w-full px-6 py-10 md:px-12">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'clients' && <ClientsView />}
          {activeView === 'products' && <ProductsView />}
          {activeView === 'live_map' && <LiveMapView onNavigate={handleNavigate} />}
          {activeView === 'routes' && <RoutesView />}
          {activeView === 'supermarkets_list' && <SupermarketsListView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_form' && <SupermarketFormView onNavigate={handleNavigate} />}
          {activeView === 'admin' && <AdminView />}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <BrandingProvider>
      {isAuthenticated ? <MainContent onLogout={handleLogout} /> : <LoginView onLogin={handleLogin} />}
    </BrandingProvider>
  );
};

export default App;
