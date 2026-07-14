import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, BarChart3, PieChart as PieIcon, FileText, Download, 
  RefreshCw, AlertTriangle, CheckCircle2, ListFilter, Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { api } from '../lib/api.js';
import { User, UserRole } from '../types.js';

interface ReportsViewProps {
  currentUser: User;
}

export default function ReportsView({ currentUser }: ReportsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.reports.dashboard();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching analytics reports', err);
      setError(err.message || 'Failed to assemble report matrices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [currentUser]);

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workspace_Audit_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!data || !data.charts || !data.charts.projectProgress) return;
    
    // Assemble simple CSV string of project progresses
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Project Name,Progress Percentage,Status\n";
    
    data.charts.projectProgress.forEach((p: any) => {
      const row = `"${p.name.replace(/"/g, '""')}",${p.progress}%,${p.status || 'Active'}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `Project_Progression_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-500 mb-3">{error || 'Unable to build analytical datasets.'}</p>
        <button onClick={fetchReportData} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Retry</button>
      </div>
    );
  }

  const { stats, charts } = data;

  const STATUS_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444']; // Blue, Green, Amber, Red
  const PRIORITY_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444']; // Slate, Blue, Amber, Red

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export comprehensive data audits, monitor team performance, and view deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Progression
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/15"
          >
            <FileText className="w-3.5 h-3.5" />
            Export JSON Audit
          </button>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Progression (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Workspace Mileposts
          </h3>
          <p className="text-[11px] text-slate-400 mb-6">Percentage completeness computed from finalized deliverable components.</p>
          
          <div className="h-64 flex-1">
            {charts.projectProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.projectProgress} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Progress']} contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active projects.</div>
            )}
          </div>
        </div>

        {/* Task Priorities distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Risk & Priority Clusters
          </h3>
          <p className="text-[11px] text-slate-400 mb-6">Grouping of current sprint task coordinates by priority level.</p>

          <div className="h-64 flex-1">
            {charts.taskPriority.some((p: any) => p.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.taskPriority} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={38}>
                    {charts.taskPriority.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No task priorites.</div>
            )}
          </div>
        </div>

        {/* Task Status Share (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Operational Sprints Load
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">Division of all configured project deliverables by execution status.</p>

          <div className="h-56 relative flex items-center justify-center">
            {charts.taskStatus.some((s: any) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.taskStatus.filter((s: any) => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {charts.taskStatus.filter((s: any) => s.count > 0).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No task status coordinates.</div>
            )}
            <div className="absolute text-center">
              <span className="block text-2xl font-black text-slate-850 dark:text-white font-mono">{stats.totalTasks}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Tasks</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {charts.taskStatus.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                  {item.name}: <span className="font-bold font-mono text-slate-900 dark:text-white">{item.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Load Metrics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2 mb-1">
            <ListFilter className="w-4 h-4 text-indigo-600" />
            Roster Workloads
          </h3>
          <p className="text-[11px] text-slate-400 mb-6">Assigned sprints counts allocated across the project team.</p>

          <div className="h-64 flex-1">
            {charts.teamWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.teamWorkload} layout="vertical" margin={{ top: 0, right: 5, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="tasks" fill="#0d9488" radius={[0, 4, 4, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No team workload metrics.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
