import React, { useEffect, useState } from 'react';
import { 
  Users, Layers, ClipboardList, CheckCircle2, Clock, 
  AlertTriangle, ArrowRight, Calendar, UserCheck, Play, 
  RefreshCw, TrendingUp, BellRing, MessageSquarePlus
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { api } from '../lib/api.js';
import { User, UserRole, DashboardStats } from '../types.js';

interface DashboardViewProps {
  currentUser: User;
  onNavigateToTab: (tab: string) => void;
  onSelectTask?: (taskId: string) => void;
}

export default function DashboardView({ currentUser, onNavigateToTab, onSelectTask }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: DashboardStats;
    charts: {
      projectProgress: { name: string; progress: number; status: string }[];
      taskStatus: { name: string; count: number }[];
      taskPriority: { name: string; count: number }[];
      teamWorkload: { name: string; tasks: number; role: string }[];
    };
    recentActivities: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.reports.dashboard();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching dashboard stats', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse" />
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Loading Issue</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{error || 'There was an error loading the analytics.'}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { stats, charts, recentActivities } = data;

  // Colors for Pie/Cell charts
  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']; // blue, amber, green, red
  const PRIORITY_COLORS: Record<string, string> = {
    'Low': '#94a3b8',
    'Medium': '#3b82f6',
    'High': '#f59e0b',
    'Critical': '#ef4444'
  };

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Welcome back, {currentUser.fullName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Here is what is happening across your projects and team coordinates today.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </div>

      {/* 1. Bento KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Projects Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {currentUser.role === UserRole.TEAM_MEMBER ? 'My Projects' : 'Total Projects'}
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats.totalProjects}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              <span className="font-semibold text-emerald-600">{stats.completedProjects}</span> Completed
            </span>
            <button 
              onClick={() => onNavigateToTab('projects')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Manage <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {currentUser.role === UserRole.TEAM_MEMBER ? 'My Assigned Tasks' : 'Total System Tasks'}
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats.totalTasks}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              <span className="font-semibold text-indigo-600">{stats.inProgressTasks}</span> In Progress
            </span>
            <button 
              onClick={() => onNavigateToTab('tasks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Task Board <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Completed Tasks Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Completed Tasks
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats.completedTasks}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Completion Rate:{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </span>
            </span>
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium">
              Finished
            </span>
          </div>
        </div>

        {/* Action Needed Card (Pending & On Hold) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending & Hold Tasks
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats.pendingTasks + stats.onHoldTasks}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              <span className="font-semibold text-amber-600">{stats.pendingTasks}</span> Pending •{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{stats.onHoldTasks}</span> Hold
            </span>
            <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium">
              Queue
            </span>
          </div>
        </div>
      </div>

      {/* Role-Specific Secondary Indicators */}
      {currentUser.role === UserRole.ADMIN && (
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold font-sans">Active User Accounts</h4>
              <p className="text-xs text-indigo-100 font-sans mt-0.5">There are currently <span className="font-semibold text-white underline">{stats.totalUsers} configured accounts</span> on the server.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('users')}
            className="px-4 py-2 bg-white text-indigo-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            Manage User Directory
          </button>
        </div>
      )}

      {/* 2. Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Progress Chart (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Project Progression Levels
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Average progress percentage complete of current project deliverables.</p>
            </div>
            <button
              onClick={() => onNavigateToTab('projects')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer"
            >
              View Projects
            </button>
          </div>

          <div className="h-64 flex-1">
            {charts.projectProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.projectProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Progress']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', padding: '10px' }}
                  />
                  <Bar dataKey="progress" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    {charts.projectProgress.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === 'Completed' ? '#10b981' : '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 font-sans border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                No active projects to calculate progress metrics.
              </div>
            )}
          </div>
        </div>

        {/* Task Status Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Task Status Split
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Breakdown of system tasks by operational status.</p>

          <div className="h-48 flex-1 relative flex items-center justify-center">
            {charts.taskStatus.some(s => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.taskStatus.filter(s => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {charts.taskStatus.filter(s => s.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 font-sans">No tasks created yet.</div>
            )}
            <div className="absolute text-center">
              <span className="block text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.totalTasks}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Tasks</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {charts.taskStatus.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                  {item.name}: <span className="font-bold font-mono text-slate-900 dark:text-white">{item.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Team Workloads and Audit Log feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Workloads (bar) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Team Load Balance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assigned task volume currently distributed per engineer.</p>
            </div>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer"
            >
              Reports
            </button>
          </div>

          <div className="h-60 flex-1">
            {charts.teamWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.teamWorkload} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis type="number" allowDecimals={false} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                  <Bar dataKey="tasks" fill="#0d9488" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 font-sans">
                No workload records.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities logs (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Workspace Activity Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time trace logs of modifications and core interactions.</p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
              Live Feed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-60 pr-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((log: any) => (
                <div key={log.id} className="flex gap-3 text-sm items-start hover:bg-slate-50 dark:hover:bg-slate-800/30 p-1.5 rounded-lg transition-colors">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                    {log.action.includes('Status') ? (
                      <RefreshCw className="w-4 h-4 text-amber-500" />
                    ) : log.action.includes('Create') ? (
                      <MessageSquarePlus className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {log.userFullName}
                      </span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-medium">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
                      {log.details}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 text-sm text-slate-400 font-sans gap-2">
                <BellRing className="w-8 h-8 text-slate-300" />
                No core activity has been logged in this workspace workspace yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
