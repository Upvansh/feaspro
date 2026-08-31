import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Project } from '../types';

interface HeaderProps {
  currentProject: Project | null;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentProject, onNavigateHome }) => {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <nav className="topbar-breadcrumbs">
          <span className="breadcrumb-link" onClick={onNavigateHome}>
            Projects
          </span>
          {currentProject && (
            <>
              <ChevronRight size={14} className="breadcrumb-separator" />
              <span className="breadcrumb-current">{currentProject.name}</span>
            </>
          )}
        </nav>
      </div>

      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
          <ShieldCheck size={16} color="#059669" />
          <span>Multi-tenant Active</span>
        </div>
      </div>
    </header>
  );
};
