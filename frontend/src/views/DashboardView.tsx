import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Layers, Building2, Plus, Search, LayoutGrid, List, FolderOpen } from 'lucide-react';
import { ProjectListItem } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectTable } from '../components/ProjectTable';

interface DashboardViewProps {
  projects: ProjectListItem[];
  loading: boolean;
  onOpenCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenAnalytics?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  loading,
  onOpenCreateProject,
  onSelectProject,
  onOpenAnalytics,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'ALL' || p.development_type === selectedType;
      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [projects, searchTerm, selectedType, selectedStatus]);

  // Summary Metrics
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const draftCount = projects.filter((p) => p.status === 'draft').length;
  const totalScenarios = projects.reduce((acc, curr) => acc + (curr.scenario_count || 0), 0);

  return (
    <div className="view-container">
      <div className="page-header">
        <div className="page-title-wrap">
          <h1>Development Projects</h1>
          <p className="page-subtitle">
            Manage development feasibilities, project scenarios, and financial workspaces.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onOpenAnalytics && (
            <button className="btn btn-outline" onClick={onOpenAnalytics}>
              <BarChart3 size={18} />
              <span>Portfolio Analytics</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={onOpenCreateProject}>
            <Plus size={18} />
            <span>New Feasibility</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Portfolio Projects</span>
            <Building2 size={18} color="#2563eb" />
          </div>
          <div className="kpi-card-value">{projects.length}</div>
          <span className="kpi-card-sub">Total active & planned ventures</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Active Feasibilities</span>
            <TrendingUp size={18} color="#059669" />
          </div>
          <div className="kpi-card-value">{activeCount}</div>
          <span className="kpi-card-sub">In appraisal / active review</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Draft Concepts</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div className="kpi-card-value">{draftCount}</div>
          <span className="kpi-card-sub">Initial scoping stage</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Total Scenarios</span>
            <Layers size={18} color="#7c3aed" />
          </div>
          <div className="kpi-card-value">{totalScenarios}</div>
          <span className="kpi-card-sub">Comparative modelling branches</span>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search projects by name, location, or scope..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="select-control"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Typologies</option>
            <option value="multi_unit_residential">Multi-Unit Residential</option>
            <option value="townhouses">Townhouses</option>
            <option value="residential_subdivision">Land Subdivision</option>
            <option value="commercial_mixed_use">Commercial / Mixed-Use</option>
            <option value="industrial">Industrial</option>
            <option value="retail">Retail</option>
          </select>

          <select
            className="select-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>

          <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
            <button
              className={`btn btn-secondary btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
              style={{ backgroundColor: viewMode === 'grid' ? '#f1f5f9' : '#ffffff' }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn btn-secondary btn-sm ${viewMode === 'table' ? 'active' : ''}`}
              style={{ backgroundColor: viewMode === 'table' ? '#f1f5f9' : '#ffffff' }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <p>Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FolderOpen size={28} />
          </div>
          <h3 className="empty-state-title">No development projects found</h3>
          <p className="empty-state-desc">
            {searchTerm || selectedType !== 'ALL' || selectedStatus !== 'ALL'
              ? 'Try adjusting your filters or search terms to find what you need.'
              : 'Create your first development feasibility project to start modelling financial returns, land acquisition, and development costs.'}
          </p>
          <button className="btn btn-primary" onClick={onOpenCreateProject}>
            <Plus size={16} />
            <span>Create New Project</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="projects-grid">
          {filteredProjects.map((proj) => (
            <ProjectCard key={proj.id} project={proj} onSelect={onSelectProject} />
          ))}
        </div>
      ) : (
        <ProjectTable projects={filteredProjects} onSelect={onSelectProject} />
      )}
    </div>
  );
};
