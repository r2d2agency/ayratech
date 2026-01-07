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
import EmployeesView from './views/EmployeesView';
import LoginView from './views/LoginView';
import { BrandingProvider } from './context/BrandingContext';
import { jwtDecode } from 'jwt-decode';

const MainContent: React.FC<{ onLogout: () => void, userRole: string }> = ({ onLogout, userRole }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleNavigate = (view: ViewType) => {
    setActiveView(view);
  };
  
  const canViewEmployees = ['admin', 'rh', 'manager'].includes(userRole);

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
          {activeView === 'clients' && <ClientsView />}
          {activeView === 'products' && <ProductsView />}
          {activeView === 'categories' && <CategoriesView />}
          {activeView === 'live_map' && <LiveMapView onNavigate={handleNavigate} />}
          {activeView === 'routes' && <RoutesView />}
          {activeView === 'supermarkets_list' && <SupermarketsListView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_form' && <SupermarketFormView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_groups_list' && <SupermarketGroupsListView onNavigate={handleNavigate} />}
          {activeView === 'supermarket_group_form' && <SupermarketGroupFormView onNavigate={handleNavigate} />}
          {activeView === 'employees' && (
            canViewEmployees ? <EmployeesView /> : <div className="p-8 text-center text-red-500">Acesso não autorizado</div>
          )}
          {activeView === 'admin' && <AdminView />}
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
        setUserRole(decoded.role || 'user');
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
        setUserRole(decoded.role || 'user');
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
