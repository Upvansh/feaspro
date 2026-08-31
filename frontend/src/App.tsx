import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectListItem, User } from './types';
import { api, getToken, onUnauthorized } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ProjectDetailView, TabType } from './views/ProjectDetailView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ScenarioManagerView } from './views/ScenarioManagerView';
import { PortfolioAnalyticsView } from './views/PortfolioAnalyticsView';

export const App: React.FC = () => {
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState<'dashboard' | 'project-detail' | 'scenarios' | 'analytics'>('dashboard');
  const [activeProjectTab, setActiveProjectTab] = useState<TabType | undefined>();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);


  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      setProjects(res.items);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial session check on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }

      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        await fetchProjects();
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        api.logout();
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    initAuth();

    // Register 401 unauthorized handler
    const unsubscribe = onUnauthorized(() => {
      setCurrentUser(null);
      setProjects([]);
      setSelectedProject(null);
      setCurrentView('dashboard');
    });

    return () => {
      unsubscribe();
    };
  }, [fetchProjects]);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    setSelectedProject(null);
    await fetchProjects();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setProjects([]);
    setSelectedProject(null);
    setCurrentView('dashboard');
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      setLoading(true);
      const proj = await api.getProject(projectId);
      setSelectedProject(proj);
      setActiveProjectTab(undefined);
      setCurrentView('project-detail');
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProjectScenarios = async (projectId: string) => {
    try {
      setLoading(true);
      const proj = await api.getProject(projectId);
      setSelectedProject(proj);
      setActiveProjectTab('scenarios');
      setCurrentView('project-detail');
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setSelectedProject(newProject);
    setCurrentView('project-detail');
    fetchProjects();
  };

  const handleProjectUpdated = (updated: Project) => {
    setSelectedProject(updated);
    fetchProjects();
  };

  const handleNavigateHome = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
    fetchProjects();
  };

  // Auth checking splash state
  if (isAuthChecking) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="login-logo-badge pulse">FP</div>
          <p className="auth-loading-text">Validating FeasPro session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated view (Login or Register)
  if (!currentUser) {
    return authScreen === 'register' ? (
      <RegisterView
        onRegisterSuccess={handleLoginSuccess}
        onNavigateToLogin={() => setAuthScreen('login')}
      />
    ) : (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => setAuthScreen('register')}
      />
    );
  }


  // Authenticated workspace shell
  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        onNavigate={async (view) => {
          if (view === 'dashboard') handleNavigateHome();
          else if (view === 'scenarios') setCurrentView('scenarios');
          else if (view === 'analytics') {
            setSelectedProject(null);
            setCurrentView('analytics');
          } else if (view === 'reports') {
            if (selectedProject) {
              setActiveProjectTab('reports');
              setCurrentView('project-detail');
            } else if (projects.length > 0) {
              try {
                setLoading(true);
                const proj = await api.getProject(projects[0].id);
                setSelectedProject(proj);
                setActiveProjectTab('reports');
                setCurrentView('project-detail');
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            } else {
              handleNavigateHome();
            }
          }
        }}
        currentUser={currentUser}
        onOpenCreateProject={() => setIsCreateModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="app-main">
        <Header currentProject={selectedProject} onNavigateHome={handleNavigateHome} />

        {currentView === 'dashboard' ? (
          <DashboardView
            projects={projects}
            loading={loading}
            onOpenCreateProject={() => setIsCreateModalOpen(true)}
            onSelectProject={handleSelectProject}
            onOpenAnalytics={() => {
              setSelectedProject(null);
              setCurrentView('analytics');
            }}
          />
        ) : currentView === 'analytics' ? (
          <PortfolioAnalyticsView
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenCreateProject={() => setIsCreateModalOpen(true)}
          />
        ) : currentView === 'scenarios' ? (
          <ScenarioManagerView
            projects={projects}
            onSelectProjectScenarios={handleSelectProjectScenarios}
          />
        ) : selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            initialTab={activeProjectTab}
            onBack={handleNavigateHome}
            onProjectUpdated={handleProjectUpdated}
          />
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading project workspace...</p>
          </div>
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};

export default App;

