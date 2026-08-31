import React from 'react';
import {
  Building2,
  Layers,
  BarChart3,
  FileText,
  Settings,
  FolderPlus,
  LogOut,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onOpenCreateProject: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenCreateProject,
  onLogout,
}) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="brand-logo-badge">FP</div>
        <div className="brand-title-wrap">
          <span className="brand-name">FeasPro</span>
          <span className="brand-tagline">Development Modelling</span>
        </div>
      </div>

      <div className="sidebar-nav">
        <div style={{ padding: '4px 10px 12px' }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onOpenCreateProject}
          >
            <FolderPlus size={16} />
            <span>New Feasibility</span>
          </button>
        </div>

        <span className="nav-section-title">Workspace</span>
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <Building2 size={18} />
          <span>Projects Portfolio</span>
        </button>

        <button
          className={`nav-item ${currentView === 'scenarios' ? 'active' : ''}`}
          onClick={() => onNavigate('scenarios')}
        >
          <Layers size={18} />
          <span>Scenario Manager</span>
        </button>

        <span className="nav-section-title">Analytics & Roadmap</span>
        <button
          className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => onNavigate('analytics')}
        >
          <BarChart3 size={18} />
          <span>Portfolio Analytics</span>
        </button>

        <button
          className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
          onClick={() => onNavigate('reports')}
        >
          <FileText size={18} />
          <span>Executive Reports</span>
        </button>

        <span className="nav-section-title">Preferences</span>
        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="user-avatar">
          {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : 'GU'}
        </div>
        <div className="user-info">
          <span className="user-name">{currentUser?.full_name || 'Guest User'}</span>
          <span className="user-org">{currentUser?.organization?.name || 'No Organization'}</span>
        </div>
        {onLogout && (
          <button
            type="button"
            className="sidebar-logout-btn"
            title="Sign out of FeasPro"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};

