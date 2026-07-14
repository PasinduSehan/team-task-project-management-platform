import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Briefcase, ClipboardList, Calendar, BarChart3, 
  Users, UserCircle, LogOut, Menu, X, Activity, ShieldCheck, HelpCircle,
  Sun, Moon, Search
} from 'lucide-react';
import LoginView from './components/LoginView.jsx';
import RegisterView from './components/RegisterView.jsx';
import DashboardView from './components/DashboardView.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import TasksView from './components/TasksView.jsx';
import CalendarView from './components/CalendarView.jsx';
import ReportsView from './components/ReportsView.jsx';
import UsersView from './components/UsersView.jsx';
import ProfileView from './components/ProfileView.jsx';
import { api } from './lib/api.js';
import { User, UserRole } from './types.js';
import { useToast } from './lib/ToastContext.js';

type ViewType = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'reports' | 'users' | 'profile';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cross-linking task selection (e.g. from Dashboard or Calendar into Sprints detail)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Toast context hook
  const { addToast } = useToast();

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('task_platform_theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Global Search Component states
  const [globalSearch, setGlobalSearch] = useState('');
  const [allTasksForSearch, setAllTasksForSearch] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  // 1. Theme and session initialization
  useEffect(() => {
    // Bootstrap Dark/Light Theme
    const storedTheme = localStorage.getItem('task_platform_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }

    // Bootstrap Session Auth
    const savedToken = localStorage.getItem('task_platform_token');
    const savedUserStr = localStorage.getItem('task_platform_user');
    if (savedToken && savedUserStr) {
      try {
        const parsedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setCurrentUser(parsedUser);
      } catch (e) {
        console.error('Session loading failed', e);
        handleLogout();
      }
    }
  }, []);

  // Theme toggler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('task_platform_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      addToast('Dark Theme Activated', 'success', 'Workspace theme switched to dark mode.');
    } else {
      document.documentElement.classList.remove('dark');
      addToast('Light Theme Activated', 'success', 'Workspace theme switched to light mode.');
    }
  };

  // Global Search: Fetch all tasks to build local searchable index
  const fetchAllTasks = async () => {
    try {
      const list = await api.tasks.list();
      setAllTasksForSearch(list);
    } catch (e) {
      console.error('Failed to load tasks for search', e);
    }
  };

  useEffect(() => {
    if (token && currentUser) {
      fetchAllTasks();
    }
  }, [token, currentUser]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    fetchAllTasks();
  };

  const filteredSearchTasks = allTasksForSearch.filter(task => {
    const query = globalSearch.toLowerCase();
    if (!query) return false;
    return (
      task.title.toLowerCase().includes(query) ||
      (task.projectName && task.projectName.toLowerCase().includes(query)) ||
      (task.assignedUserFullName && task.assignedUserFullName.toLowerCase().includes(query))
    );
  });

  // Check deadlines of assigned tasks on login/load
  useEffect(() => {
    if (!currentUser || !token) return;

    const checkDeadlines = async () => {
      try {
        const userTasks = await api.tasks.list({ assignedUserId: currentUser.id });
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        const upcomingTasks = userTasks.filter(task => {
          if (task.status === 'Completed') return false;
          const dueDate = new Date(task.dueDate);
          return dueDate >= now && dueDate <= threeDaysFromNow;
        });

        if (upcomingTasks.length > 0) {
          upcomingTasks.forEach(task => {
            addToast(
              'Deadline Approaching',
              'warning',
              `"${task.title}" is due on ${task.dueDate}!`
            );
          });
        }
      } catch (err) {
        console.error('Error checking deadlines', err);
      }
    };

    // Run after a tiny delay so toast displays beautifully
    const timer = setTimeout(() => {
      checkDeadlines();
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentUser, token]);

  const handleLoginSuccess = () => {
    // Session is saved automatically by the api helper, we reload state from localStorage
    const savedToken = localStorage.getItem('task_platform_token');
    const savedUserStr = localStorage.getItem('task_platform_user');
    if (savedToken && savedUserStr) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUserStr));
    }
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('task_platform_token');
    localStorage.removeItem('task_platform_user');
    setActiveView('dashboard');
    setAuthView('login');
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('task_platform_user', JSON.stringify(updatedUser));
  };

  // Navigating tasks with selection details
  const handleSelectTaskAndNavigate = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveView('tasks');
  };

  // Render the currently selected dashboard view
  const renderActiveView = () => {
    if (!currentUser) return null;

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            currentUser={currentUser} 
            onNavigateToTab={(view) => setActiveView(view as ViewType)}
            onSelectTask={handleSelectTaskAndNavigate}
          />
        );
      case 'projects':
        return <ProjectsView currentUser={currentUser} />;
      case 'tasks':
        return (
          <TasksView 
            currentUser={currentUser}
            selectedTaskId={selectedTaskId}
            onClearSelectedTask={() => setSelectedTaskId(null)}
          />
        );
      case 'calendar':
        return <CalendarView onSelectTask={handleSelectTaskAndNavigate} />;
      case 'reports':
        return <ReportsView currentUser={currentUser} />;
      case 'users':
        return <UsersView currentUser={currentUser} />;
      case 'profile':
        return <ProfileView currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />;
      default:
        return (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border rounded-2xl">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-2 animate-bounce" />
            <h3 className="text-lg font-bold">Workspace View Under Construction</h3>
          </div>
        );
    }
  };

  // Authentication Flow Layout (Login & Register)
  if (!token || !currentUser) {
    return authView === 'login' ? (
      <LoginView 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToRegister={() => setAuthView('register')} 
      />
    ) : (
      <RegisterView 
        onRegisterSuccess={handleLoginSuccess} 
        onNavigateToLogin={() => setAuthView('login')} 
      />
    );
  }

  // Sidebar navigation options
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Workspaces', icon: Briefcase },
    { id: 'tasks', label: 'Sprints Board', icon: ClipboardList },
    { id: 'calendar', label: 'Scheduler', icon: Calendar },
    { id: 'reports', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'User Directory', icon: Users, restriction: UserRole.ADMIN },
    { id: 'profile', label: 'Profile Settings', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200 font-sans">
      
      {/* ==========================================
          SIDEBAR: DESKTOP WORKSPACE VIEWPORT
          ========================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none">Synergy</h1>
            <p className="text-[9px] font-mono font-extrabold text-slate-400 mt-0.5 tracking-widest uppercase">WORKSPACE</p>
          </div>
        </div>

        {/* Dynamic Nav list */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            if (item.restriction && currentUser.role !== item.restriction) return null;
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewType)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium tracking-normal cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile footer bar */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate leading-tight">{currentUser.fullName}</h4>
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold px-1.5 py-0.2 rounded uppercase">
              {currentUser.role.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Log out of session"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* ==========================================
          MOBILE FLOATING NAVIGATION SLIDEOUT
          ========================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-xs">
          <div className="w-64 max-w-[80vw] h-full bg-white dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-800 animate-slide-in">
            <div className="h-16 px-6 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/10">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-sm dark:text-white">Synergy</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(item => {
                if (item.restriction && currentUser.role !== item.restriction) return null;
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as ViewType);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium tracking-normal cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8.5 h-8.5 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold font-mono text-xs">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs truncate dark:text-white">{currentUser.fullName}</h4>
                <p className="text-[9px] text-slate-400 uppercase font-mono">{currentUser.role}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MAIN VIEW CONTAINER & APP CONTENT
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Panel (Highly responsive mobile toggler & indicators) */}
        <header className="h-16 px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 lg:hidden cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <h2 className="hidden sm:block text-base font-semibold text-slate-900 dark:text-white font-sans tracking-tight">
              {activeView === 'dashboard' ? 'System Dashboard' : activeView === 'projects' ? 'Project Workspaces' : activeView === 'tasks' ? 'Sprints Board' : activeView === 'calendar' ? 'Scheduler' : activeView === 'reports' ? 'Analytics Reports' : activeView === 'users' ? 'User Directory' : 'Profile Settings'}
            </h2>
          </div>

          {/* Global Search Component */}
          <div className="relative flex-1 max-w-xs sm:max-w-md mx-4 hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks, workspaces, assignees..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border-none rounded-full text-xs font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Global Search Results Dropdown */}
            {searchFocused && globalSearch && (
              <div className="absolute top-11 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto p-2 space-y-1 animate-fade-in pointer-events-auto">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase p-2 border-b border-slate-100 dark:border-slate-800">
                  Search Results ({filteredSearchTasks.length})
                </div>
                {filteredSearchTasks.length > 0 ? (
                  filteredSearchTasks.map((task) => (
                    <button
                      key={task.id}
                      onMouseDown={() => {
                        handleSelectTaskAndNavigate(task.id);
                        setGlobalSearch('');
                        setSearchFocused(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {task.title}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          task.priority === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
                          task.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          task.priority === 'Medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-450'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="truncate">Workspace: <strong className="text-indigo-600 dark:text-indigo-400">{task.projectName}</strong></span>
                        <span className="truncate ml-2">Assignee: <strong className="text-slate-600 dark:text-slate-300">{task.assignedUserFullName}</strong></span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-slate-450 text-center py-6">
                    No tasks match "{globalSearch}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right utility headers (e.g., live UTC status or role status flags) */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-450 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-extrabold uppercase">
              <Activity className="w-3 h-3 animate-pulse" />
              Connected
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded">
              Role: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{currentUser.role}</span>
            </span>
          </div>
        </header>

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
