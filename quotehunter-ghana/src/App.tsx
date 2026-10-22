/**
 * QuoteHunter Ghana — Production Construction Material Procurement Platform
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/common/Header.tsx';
import { ContractorDashboard } from './components/contractor/ContractorDashboard.tsx';
import { SupplierDashboard } from './components/supplier/SupplierDashboard.tsx';
import { DedicatedAdminApp } from './components/admin/DedicatedAdminApp.tsx';
import { LoginScreen } from './components/auth/LoginScreen.tsx';
import { RfqListView } from './components/contractor/RfqListView.tsx';
import { QuoteComparisonView } from './components/contractor/QuoteComparisonView.tsx';
import { OrdersView } from './components/orders/OrdersView.tsx';
import { SupplierDirectory } from './components/suppliers/SupplierDirectory.tsx';
import { CreateRfqModal } from './components/contractor/CreateRfqModal.tsx';
import { BoqImportModal } from './components/contractor/BoqImportModal.tsx';
import { NewProjectModal } from './components/contractor/NewProjectModal.tsx';
import { TermsAndConditions } from './components/legal/TermsAndConditions.tsx';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy.tsx';
import { api } from './services/api.ts';
import { Project } from './types/index.ts';
import heroImage from './assets/images/accra_construction_site_1792271318170.jpg';
import { Building2, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, currentOrg, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeRfqId, setActiveRfqId] = useState<string | null>(null);

  // Dedicated Admin App Mode toggle
  const [isAdminAppMode, setIsAdminAppMode] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('app') === 'admin' || window.location.pathname.startsWith('/admin');
  });

  // Modals state
  const [createRfqOpen, setCreateRfqOpen] = useState(false);
  const [selectedProjectForRfq, setSelectedProjectForRfq] = useState<string | null>(null);
  const [importBoqOpen, setImportBoqOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setIsAdminAppMode(urlParams.get('app') === 'admin' || window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isAdminAppMode || currentTab === 'executive-portal') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('app') !== 'admin') {
        url.searchParams.set('app', 'admin');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, [isAdminAppMode, currentTab]);

  const handleOpenCreateRfq = (projId?: string) => {
    setSelectedProjectForRfq(projId || null);
    setCreateRfqOpen(true);
  };
  const handleOpenBoqImport = async () => {
    try {
      const projs = await api.getProjects();
      setProjectsList(projs);
      setImportBoqOpen(true);
    } catch (err) {
      console.error(err);
      setImportBoqOpen(true);
    }
  };
  const handleOpenNewProject = () => setNewProjectOpen(true);

  const handleSelectRfq = (id: string) => {
    setActiveRfqId(id);
    setCurrentTab('rfq-comparison');
  };

  const handleOrderCreated = (_orderId: string) => {
    setCurrentTab('orders');
  };

  // If viewing the Dedicated Administrative Application
  if (isAdminAppMode || currentTab === 'executive-portal') {
    return (
      <DedicatedAdminApp
        onReturnToMarketplace={() => {
          setIsAdminAppMode(false);
          setCurrentTab('dashboard');
          const url = new URL(window.location.href);
          url.searchParams.delete('app');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white mx-auto animate-pulse">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-semibold text-slate-800">QuoteHunter Ghana</div>
          <div className="text-xs text-slate-500">Connecting Ghanaian contractors and suppliers...</div>
        </div>
      </div>
    );
  }

  // Not signed in: show the Google sign-in screen
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract (3 zones) */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => {
          if (tab === 'executive-portal') {
            setIsAdminAppMode(true);
            const url = new URL(window.location.href);
            url.searchParams.set('app', 'admin');
            window.history.pushState({}, '', url.toString());
            return;
          }
          setCurrentTab(tab);
          if (tab !== 'rfq-comparison') setActiveRfqId(null);
        }}
        onOpenCreateRfq={handleOpenCreateRfq}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Architectural Trust Hero Ribbon (shown on overview / dashboard) */}
        {currentTab === 'dashboard' && (
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 text-white shadow-2xs">
            <div className="absolute inset-0 z-0 opacity-25">
              <img
                src={heroImage}
                alt="Construction engineering site in Accra Ghana"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative z-10 p-6 sm:p-8 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-xs font-medium mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified B2B Procurement Network · Ghana
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Direct Building Material Procurement
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Post material requests once and receive comparable quotations from verified Ghanaian suppliers for cement, BS4449 steel rebar, quarry sand, chippings, and concrete blocks.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Bank-grade server calculations
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Real-time price comparisons
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Full audit compliance
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Routing */}
        {currentTab === 'dashboard' && (
          user?.role === 'supplier' ? (
            <SupplierDashboard onNavigateTab={setCurrentTab} />
          ) : (
            <ContractorDashboard
              onOpenCreateRfq={handleOpenCreateRfq}
              onOpenBoqImport={handleOpenBoqImport}
              onOpenNewProject={handleOpenNewProject}
              onSelectRfq={handleSelectRfq}
              onNavigateTab={setCurrentTab}
            />
          )
        )}

        {currentTab === 'rfqs' && (
          <RfqListView
            onOpenCreateRfq={handleOpenCreateRfq}
            onOpenBoqImport={handleOpenBoqImport}
            onSelectRfq={handleSelectRfq}
          />
        )}

        {currentTab === 'rfq-comparison' && activeRfqId && (
          <QuoteComparisonView
            rfqId={activeRfqId}
            onBack={() => {
              setActiveRfqId(null);
              setCurrentTab('rfqs');
            }}
            onOrderCreated={handleOrderCreated}
          />
        )}

        {currentTab === 'orders' && <OrdersView />}

        {currentTab === 'suppliers' && <SupplierDirectory />}

        {currentTab === 'terms' && (
          <TermsAndConditions
            onBack={() => {
              setCurrentTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToPolicy={() => {
              setCurrentTab('policy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'policy' && (
          <PrivacyPolicy
            onBack={() => {
              setCurrentTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToTerms={() => {
              setCurrentTab('terms');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Modals */}
      <CreateRfqModal
        isOpen={createRfqOpen}
        initialProjectId={selectedProjectForRfq}
        onClose={() => {
          setCreateRfqOpen(false);
          setSelectedProjectForRfq(null);
        }}
        onCreated={(id) => {
          setActiveRfqId(id);
          setCurrentTab('rfq-comparison');
        }}
      />

      <BoqImportModal
        isOpen={importBoqOpen}
        projects={projectsList}
        onClose={() => setImportBoqOpen(false)}
        onImportComplete={(id) => {
          setActiveRfqId(id);
          setCurrentTab('rfq-comparison');
        }}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={() => {
          setCurrentTab('dashboard');
        }}
      />

      {/* Quiet Professional Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">QuoteHunter Ghana</span>
            <span>·</span>
            <span>Registered B2B Construction Procurement Platform</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline">Act 772 & Act 843 Compliant</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600">
            <button
              onClick={() => {
                setCurrentTab('terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-amber-600 transition-colors cursor-pointer font-medium ${
                currentTab === 'terms' ? 'text-amber-600 font-semibold underline' : ''
              }`}
            >
              Terms & Conditions
            </button>
            <span>·</span>
            <button
              onClick={() => {
                setCurrentTab('policy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-amber-600 transition-colors cursor-pointer font-medium ${
                currentTab === 'policy' ? 'text-emerald-700 font-semibold underline' : ''
              }`}
            >
              Privacy & Procurement Policy
            </button>
            <span>·</span>
            {/* Discrete link to dedicated executive admin app */}
            <button
              onClick={() => {
                setIsAdminAppMode(true);
                const url = new URL(window.location.href);
                url.searchParams.set('app', 'admin');
                window.history.pushState({}, '', url.toString());
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1 font-mono text-[11px]"
              title="Access Executive Administration Console"
            >
              <Shield className="w-3 h-3 text-slate-400" />
              Executive Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
