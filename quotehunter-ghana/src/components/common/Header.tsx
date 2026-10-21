import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Building2, ChevronDown, Check, UserCircle, LogOut, Scale, Shield } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenCreateRfq?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, onOpenCreateRfq }) => {
  const { user, currentOrg, switchPersona, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <Building2 className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold text-slate-900">
            QuoteHunter Ghana
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
              currentTab === 'dashboard' ? 'border-amber-600 text-slate-900 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('rfqs')}
            className={`whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
              currentTab === 'rfqs' || currentTab === 'rfq-detail' ? 'border-amber-600 text-slate-900 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Material RFQs
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className={`whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
              currentTab === 'orders' ? 'border-amber-600 text-slate-900 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => onNavigate('suppliers')}
            className={`whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
              currentTab === 'suppliers' ? 'border-amber-600 text-slate-900 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Suppliers
          </button>
        </nav>

        {/* Zone 3: 1 primary action or profile menu */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <button
              onClick={() => onNavigate('executive-portal')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-slate-900 border border-amber-500/40 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
              title="Open Dedicated Admin App"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin App</span>
            </button>
          )}

          {user?.role === 'contractor' && onOpenCreateRfq && (
            <button
              onClick={onOpenCreateRfq}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Create RFQ
            </button>
          )}

          {/* Persona & Org Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <UserCircle className="w-4 h-4 text-slate-600" />
              <div className="text-left hidden lg:block">
                <div className="font-semibold text-slate-900 leading-tight">{user?.name || 'User'}</div>
                <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-900">{currentOrg?.name || 'Organization'}</div>
                  <div className="text-[11px] text-slate-500">{user?.email}</div>
                  <div className="mt-1 inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Region: {currentOrg?.region || 'Greater Accra'}
                  </div>
                </div>

                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  Switch Active Persona
                </div>

                <button
                  onClick={() => { switchPersona('contractor'); setDropdownOpen(false); onNavigate('dashboard'); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 text-slate-800"
                >
                  <div>
                    <div className="font-semibold">Contractor Mode</div>
                    <div className="text-[11px] text-slate-500">Prime Build Construction Ltd</div>
                  </div>
                  {user?.role === 'contractor' && <Check className="w-4 h-4 text-amber-600" />}
                </button>

                <button
                  onClick={() => { switchPersona('supplier'); setDropdownOpen(false); onNavigate('dashboard'); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 text-slate-800"
                >
                  <div>
                    <div className="font-semibold">Supplier Mode</div>
                    <div className="text-[11px] text-slate-500">Accra Building Supplies Ltd</div>
                  </div>
                  {user?.role === 'supplier' && <Check className="w-4 h-4 text-amber-600" />}
                </button>


                <div className="border-t border-slate-100 mt-1 pt-1.5 pb-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                    Governance & Legal
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); onNavigate('terms'); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Terms & Conditions
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); onNavigate('policy'); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    Privacy & Procurement Policy
                  </button>
                </div>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Reset Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
