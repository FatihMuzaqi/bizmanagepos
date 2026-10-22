import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import OverviewView from './views/OverviewView';
import PlansView from './views/PlansView';
import UsersView from './views/UsersView';
import BusinessesView from './views/BusinessesView';
import SubscriptionsView from './views/SubscriptionsView';

export default function App() {
  const [developer, setDeveloper] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize auth from localStorage
  useEffect(() => {
    const token = localStorage.getItem('dev_token');
    const userStr = localStorage.getItem('dev_user');
    if (token) {
      setIsAuth(true);
      if (userStr) {
        try {
          setDeveloper(JSON.parse(userStr));
        } catch (_) {}
      }
    }

    const handleAuthChange = () => {
      const t = localStorage.getItem('dev_token');
      setIsAuth(!!t);
    };

    window.addEventListener('dev_auth_changed', handleAuthChange);
    return () => window.removeEventListener('dev_auth_changed', handleAuthChange);
  }, []);

  const handleLoginSuccess = (devUser) => {
    setDeveloper(devUser);
    setIsAuth(true);
    setCurrentTab('overview');
  };

  const handleLogout = () => {
    localStorage.removeItem('dev_token');
    localStorage.removeItem('dev_user');
    setDeveloper(null);
    setIsAuth(false);
  };

  if (!isAuth) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Titles mapping
  const titles = {
    overview: {
      title: 'Dashboard Utama Developer',
      subtitle: 'Monitoring metrik, pendaftaran UMKM, dan analitik pendapatan SaaS',
    },
    plans: {
      title: 'Kontrol Harga & Paket SaaS',
      subtitle: 'Atur nominal harga bulanan, kuota cabang, staf, menu, dan transaksi',
    },
    subscriptions: {
      title: 'Monitoring Status Langganan',
      subtitle: 'Pantau status aktif, masa uji coba 1 bulan, dan perpanjangan langganan',
    },
    users: {
      title: 'Monitoring Pengguna Terdaftar',
      subtitle: 'Kelola akun user UMKM, status aktif, dan data kepemilikan bisnis',
    },
    businesses: {
      title: 'Bisnis & Toko Terdaftar',
      subtitle: 'Pantau seluruh jaringan cabang dan outlet yang beroperasi',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        developer={developer}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar
          title={titles[currentTab]?.title || 'Dashboard'}
          subtitle={titles[currentTab]?.subtitle || ''}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />

        <main className="p-8 flex-1 max-w-7xl w-full mx-auto" key={refreshKey}>
          {currentTab === 'overview' && <OverviewView onNavigate={setCurrentTab} />}
          {currentTab === 'plans' && <PlansView />}
          {currentTab === 'subscriptions' && <SubscriptionsView />}
          {currentTab === 'users' && <UsersView />}
          {currentTab === 'businesses' && <BusinessesView />}
        </main>
      </div>
    </div>
  );
}
