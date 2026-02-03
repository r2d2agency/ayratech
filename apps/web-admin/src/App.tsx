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
import SupermarketGroupsListView from './views/SupermarketGroupsListView';
import SupermarketGroupFormView from './views/SupermarketGroupFormView';
import AdminView from './views/AdminView';
import CategoriesView from './views/CategoriesView';
import BrandsView from './views/BrandsView';
import EmployeesView from './views/EmployeesView';
import SupervisorsView from './views/SupervisorsView';
import AiConfigView from './views/AiConfigView';
import PhotoProcessingView from './views/PhotoProcessingView';
import AppAccessView from './views/AppAccessView';
import DocumentsView from './views/DocumentsView';
import SystemLogsView from './views/SystemLogsView';
import RoutesReportView from './views/RoutesReportView';
import PhotoGalleryView from './views/PhotoGalleryView';
import TimeClockManagementView from './views/TimeClockManagementView';
import LoginView from './views/LoginView';
import ClientDashboardView from './views/ClientDashboardView';
import { BrandingProvider } from './context/BrandingContext';
import { jwtDecode } from 'jwt-decode';

const MainContent: React.FC<{ onLogout: () => void, userRole: string }> = ({ onLogout, userRole }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
      } else {
        setSidebarExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (view: ViewType) => {
    setActiveView(view);
  };
  
  const canViewEmployees = ['admin', 'rh', 'manager', 'superadmin', 'administrador do sistema', 'supervisor de operações'].includes(userRole);

  // If user is client, force client_dashboard
  useEffect(() => {
    if (userRole === 'client' && activeView !== 'client_dashboard') {
      setActiveView('client_dashboard');
    }
  }, [userRole, activeView]);

  if (userRole === 'client') {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Sidebar 
          activeView={activeView} 
          onNavigate={handleNavigate} 
          expanded={sidebarExpanded} 
          setExpanded={setSidebarExpanded}
          userRole={userRole}
          onLogout={onLogout}
        />
        
        <div className={`transition-all duration-300 ${sidebarExpanded ? 'pl-64' : 'pl-20'}`}>
          <Header />
          
          <main className="max-w-[1600px] mx-auto w-full px-6 py-10 md:px-12">
            <ClientDashboardView />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        expanded={sidebarExpanded} 
        setExpanded={setSidebarExpanded}
        userRole={userRole}
        onLogout={onLogout}
      />
      
      <div className={`transition-all duration-300 ${sidebarExpanded ? 'pl-64' : 'pl-20'}`}>
        <Header />
        
        <main className="max-w-[1600px] mx-auto w-full px-6 py-10 md:px-12">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'client_dashboard' && <ClientDashboardView />}
          {activeView === 'clients' && <ClientsView />}
          {activeView === 'products' && <ProductsView />}
          {activeView === 'categories' && <CategoriesView />}
          {activeView === 'brands' && <BrandsView />}
          {activeView === 'live_map' && <LiveMapView onNavigate={handleNavigate} />}
          {activeView === 'routes' && <RoutesView />}
          {activeView === 'supermarkets_list' && <SupermarketsListView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_form' && <SupermarketFormView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_groups_list' && <SupermarketGroupsListView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_group_form' && <SupermarketGroupFormView onNavigate={handleNavigate} />}
          {activeView === 'employees' && (
            <div className="animate-in fade-in duration-500">
              <EmployeesView />
            </div>
          )}
          {activeView === 'app_access' && (
            canViewEmployees ? <AppAccessView /> : <div className="p-8 text-center text-red-500">Acesso não autorizado</div>
          )}
          {activeView === 'supervisors' && <SupervisorsView />}
          {activeView === 'admin' && <AdminView />}
          {activeView === 'documents' && <DocumentsView />}
          {activeView === 'logs' && <SystemLogsView />}
          {activeView === 'reports_routes' && <RoutesReportView />}
          {activeView === 'gallery' && <PhotoGalleryView />}
          {activeView === 'photo_processing' && <PhotoProcessingView />}
          {activeView === 'ai_config' && <AiConfigView />}
          {activeView === 'ai_prompts' && <AiPromptsView />}
          {activeView === 'time_clock' && <TimeClockManagementView />}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      try {
        const decoded: any = jwtDecode(token);
        setUserRole(decoded.role?.toLowerCase() || 'user');
      } catch (e) {
        console.error("Invalid token", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUserRole(decoded.role?.toLowerCase() || 'user');
      } catch (e) {
        console.error("Invalid token", e);
      }
    }
    setIsAuthenticated(true);
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <BrandingProvider>
      {isAuthenticated ? <MainContent onLogout={handleLogout} userRole={userRole} /> : <LoginView onLogin={handleLogin} />}
    </BrandingProvider>
  );
};

export default App;
