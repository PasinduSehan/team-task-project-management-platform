import React, { useEffect, useState } from 'react';
import { 
  Layers, Plus, Calendar, User, Users, Trash2, Edit2, 
  ArrowLeft, CheckSquare, TrendingUp, Check, Search, 
  Loader2, AlertTriangle, Play, ChevronRight, FileText
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Project, User as UserType, UserRole, ProjectStatus } from '../types.js';

interface ProjectsViewProps {
  currentUser: UserType;
  onSelectTask?: (taskId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function ProjectsView({ currentUser, onSelectTask, onNavigateToTab }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drill-down
  const [selectedProject, setSelectedProject] = useState<(Project & { teamMembers: UserType[]; tasks: any[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [managerId, setManagerId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const isAuthorizedToModify = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PROJECT_MANAGER;

  const loadProjectsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const prjs = await api.projects.list();
      setProjects(prjs);

      // Load users list for selection dropdowns
      const usrs = await api.users.list();
      setUsers(usrs);
    } catch (err: any) {
      console.error('Error loading projects', err);
      setError(err.message || 'Failed to retrieve projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectsData();
  }, []);

  const handleSelectProject = async (projectId: string) => {
    try {
      setDetailLoading(true);
      const prjDetails = await api.projects.get(projectId);
      const prjTasks = await api.tasks.list({ projectId });
      setSelectedProject({
        ...prjDetails,
        tasks: prjTasks
      });
    } catch (err: any) {
      alert(err.message || 'Failed to load project details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setStatus(ProjectStatus.PLANNING);
    setManagerId(currentUser.role === UserRole.PROJECT_MANAGER ? currentUser.id : '');
    setSelectedMembers([]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (prj: Project, memberIds: string[]) => {
    setFormMode('edit');
    setEditingProjectId(prj.id);
    setName(prj.name);
    setDescription(prj.description);
    setStartDate(prj.startDate);
    setEndDate(prj.endDate);
    setStatus(prj.status);
    setManagerId(prj.managerId);
    setSelectedMembers(memberIds);
    setIsFormOpen(true);
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot fall after the End date.');
      return;
    }

    try {
      setLoading(true);
      if (formMode === 'create') {
        const payload = {
          name,
          description,
          startDate,
          endDate,
          managerId: currentUser.role === UserRole.ADMIN ? managerId : currentUser.id,
          teamMemberIds: selectedMembers
        };
        await api.projects.create(payload);
      } else if (editingProjectId) {
        const payload = {
          name,
          description,
          startDate,
          endDate,
          status,
          managerId,
          teamMemberIds: selectedMembers
        };
        await api.projects.update(editingProjectId, payload);
        if (selectedProject && selectedProject.id === editingProjectId) {
          handleSelectProject(editingProjectId);
        }
      }
      setIsFormOpen(false);
      loadProjectsData();
    } catch (err: any) {
      alert(err.message || 'Failed to persist project.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string, prjName: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${prjName}"? This action will permanently delete all associated tasks, commentaries, and attachments!`)) {
      return;
    }

    try {
      setLoading(true);
      await api.projects.delete(id);
      setSelectedProject(null);
      loadProjectsData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
      setLoading(false);
    }
  };

  // Get status color tag
  const getStatusBadge = (st: ProjectStatus) => {
    switch (st) {
      case ProjectStatus.PLANNING:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Planning</span>;
      case ProjectStatus.IN_PROGRESS:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">In Progress</span>;
      case ProjectStatus.COMPLETED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Completed</span>;
      case ProjectStatus.ON_HOLD:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">On Hold</span>;
    }
  };

  // Managers list
  const pmsList = users.filter(u => u.role === UserRole.PROJECT_MANAGER || u.role === UserRole.ADMIN);
  // Team members list
  const membersList = users.filter(u => u.role === UserRole.TEAM_MEMBER);

  return (
    <div className="space-y-6">
      {/* 1. Projects List Dashboard View */}
      {!selectedProject ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-600" />
                Project Directory
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create, track, and delegate team workspaces to manage tasks collectively.
              </p>
            </div>
            {isAuthorizedToModify && (
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            )}
          </div>

          {loading && projects.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm text-slate-500">{error}</p>
              <button onClick={loadProjectsData} className="text-sm font-semibold text-indigo-600 hover:underline">Retry</button>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl mx-auto space-y-4">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Assigned Projects</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You currently do not have any active projects assigned. If you are an administrator or project manager, you can initiate a workspace by creating one.
              </p>
              {isAuthorizedToModify && (
                <button
                  onClick={handleOpenCreateForm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Create Your First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map(prj => {
                const manager = users.find(u => u.id === prj.managerId);
                const assignedMemberIds = prj.teamMemberIds || [];
                return (
                  <div 
                    key={prj.id} 
                    onClick={() => handleSelectProject(prj.id)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col group"
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800" />
                    <div className="absolute top-0 left-0 h-1.5 bg-indigo-600 transition-all duration-300" style={{ width: `${prj.progressPercentage}%` }} />
                    
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(prj.status)}
                      <span className="text-xs font-mono font-medium text-slate-400">
                        {prj.progressPercentage}% Complete
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white font-sans text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {prj.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 font-sans flex-1">
                      {prj.description}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[11px] truncate max-w-[120px] font-sans">
                          PM: {manager ? manager.fullName : 'System'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-mono">
                          {prj.endDate}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // 2. Project Drill-Down Detailed View
        <div className="space-y-6">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </button>

          {detailLoading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse h-96" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Core Info & Roster */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{selectedProject.name}</h2>
                        {getStatusBadge(selectedProject.status)}
                      </div>
                      <p className="text-xs font-mono text-slate-400">Project Workspace ID: {selectedProject.id}</p>
                    </div>

                    {isAuthorizedToModify && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const memberIds = selectedProject.teamMembers.map(m => m.id);
                            handleOpenEditForm(selectedProject, memberIds);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Description</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                      {selectedProject.description}
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-900">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-sans">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        Completion Progress Meter
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedProject.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${selectedProject.progressPercentage}%` }} />
                    </div>
                  </div>

                  {/* Associated Tasks Feed list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Associated Deliverable Tasks</h4>
                      {onNavigateToTab && (
                        <button 
                          onClick={() => onNavigateToTab('tasks')}
                          className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Open Task Board
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                        selectedProject.tasks.map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => onSelectTask && onSelectTask(task.id)}
                            className="p-3.5 bg-slate-50 hover:bg-indigo-50/20 dark:bg-slate-950 border border-slate-100 dark:border-slate-900/50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="space-y-1 min-w-0 pr-4">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm line-clamp-1 hover:text-indigo-600 transition-colors">
                                {task.title}
                              </span>
                              <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                                <span>Assigned: {task.assignedUserFullName}</span>
                                <span>•</span>
                                <span className="font-mono">Due: {task.dueDate}</span>
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                              task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                              task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                          <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          <p className="text-xs">No tasks added to this project yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Roles & Members Panel */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Timeline widget */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm">Schedule Timeline</h3>
                    <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Start Date:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{selectedProject.startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Target End Date:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{selectedProject.endDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Manager widget */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm">Project Manager</h3>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {users.find(u => u.id === selectedProject.managerId)?.fullName.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {users.find(u => u.id === selectedProject.managerId)?.fullName || 'Assigned Manager'}
                        </p>
                        <p className="text-[10px] text-slate-400">Authorized Overseer</p>
                      </div>
                    </div>
                  </div>

                  {/* Team roster checklist */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-500" />
                        Assigned Roster
                      </h3>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-mono font-semibold">
                        {selectedProject.teamMembers.length} Members
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {selectedProject.teamMembers.length > 0 ? (
                        selectedProject.teamMembers.map(member => (
                          <div key={member.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-lg transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7.5 h-7.5 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {member.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{member.fullName}</p>
                                <p className="text-[9px] text-slate-400 truncate">{member.email}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono shrink-0">
                              Team Member
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No team members delegated yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Create / Edit Project Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white font-sans">
                {formMode === 'create' ? 'Initiate New Project Workspace' : 'Modify Project Workspace'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Project Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Pipeline Audit"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the core goal and team scope..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Timelines row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>
              </div>

              {/* If edit mode: show status option */}
              {formMode === 'edit' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    <option value={ProjectStatus.PLANNING}>Planning</option>
                    <option value={ProjectStatus.IN_PROGRESS}>In Progress</option>
                    <option value={ProjectStatus.COMPLETED}>Completed</option>
                    <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                  </select>
                </div>
              )}

              {/* Admin only: Manager assignment */}
              {currentUser.role === UserRole.ADMIN && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Manager Overseer</label>
                  <select
                    required
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    <option value="">Select an Authorized Manager...</option>
                    {pmsList.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.fullName} ({pm.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assign Team Members checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delegate Team Roster</label>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                  {membersList.length > 0 ? (
                    membersList.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => handleToggleMember(m.id)}
                        className="flex items-center justify-between p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(m.id)}
                            readOnly
                            className="rounded-sm text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0"
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{m.email}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-slate-400">No active Team Member accounts are currently configured.</p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {formMode === 'create' ? 'Create Project' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
