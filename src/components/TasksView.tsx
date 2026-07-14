import React, { useEffect, useState } from 'react';
import { 
  ClipboardList, Plus, Search, User, Calendar, Paperclip, 
  MessageSquare, Trash2, Edit2, CheckCircle2, AlertCircle, 
  Filter, Loader2, X, Clock, HelpCircle, ArrowRight, ArrowLeft,
  FileText, Upload, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api.js';
import { 
  Task, Project, User as UserType, UserRole, 
  TaskStatus, TaskPriority, TaskComment, TaskAttachment 
} from '../types.js';
import { useToast } from '../lib/ToastContext.js';

interface TasksViewProps {
  currentUser: UserType;
  selectedTaskId: string | null;
  onClearSelectedTask: () => void;
}

export default function TasksView({ currentUser, selectedTaskId, onClearSelectedTask }: TasksViewProps) {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View settings
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters state
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (Create/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Task Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [projectId, setProjectId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  // Task detail modal state
  const [detailTask, setDetailTask] = useState<any | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const isManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PROJECT_MANAGER;

  const loadTasksData = async () => {
    try {
      setLoading(true);
      setError(null);

      const prjs = await api.projects.list();
      setProjects(prjs);

      const usrs = await api.users.list();
      setUsers(usrs);

      const tskList = await api.tasks.list({
        projectId: filterProject,
        assignedUserId: filterUser,
        priority: filterPriority,
        search: searchQuery
      });
      setTasks(tskList);
    } catch (err: any) {
      console.error('Error loading tasks', err);
      setError(err.message || 'Failed to load task board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksData();
  }, [filterProject, filterUser, filterPriority, searchQuery]);

  // Handle auto-opening of task if selectedTaskId is passed from dashboard
  useEffect(() => {
    if (selectedTaskId) {
      handleOpenDetailModal(selectedTaskId);
      onClearSelectedTask();
    }
  }, [selectedTaskId]);

  const handleOpenDetailModal = async (taskId: string) => {
    try {
      const fullTask = await api.tasks.get(taskId);
      setDetailTask(fullTask);

      // Load comments & attachments in parallel
      const [cmts, atts] = await Promise.all([
        api.tasks.getComments(taskId),
        api.tasks.getAttachments(taskId)
      ]);
      setComments(cmts);
      setAttachments(atts);
    } catch (err: any) {
      alert(err.message || 'Failed to retrieve task details.');
    }
  };

  const handleStatusChange = async (taskId: string, currentStatus: TaskStatus, newStatus: TaskStatus) => {
    if (currentStatus === newStatus) return;
    try {
      await api.tasks.update(taskId, { status: newStatus });
      
      // Update local task list
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      // If the detailed modal is open, refresh it too
      if (detailTask && detailTask.id === taskId) {
        setDetailTask((prev: any) => ({ ...prev, status: newStatus }));
      }

      // Fetch and sync the Progress Percentage field from the API immediately
      try {
        const updatedProjects = await api.projects.list();
        setProjects(updatedProjects);
      } catch (prjErr) {
        console.error('Failed to sync progress percentage on status change:', prjErr);
      }

      // Display Toast Alerts
      const updatedTask = tasks.find(t => t.id === taskId);
      const taskTitle = updatedTask ? updatedTask.title : 'Task';
      if (newStatus === TaskStatus.COMPLETED) {
        addToast('Task Completed 🎉', 'success', `"${taskTitle}" has been marked as Completed.`);
      } else {
        addToast('Task Status Updated', 'success', `"${taskTitle}" moved to status: ${newStatus}.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to modify task status.');
    }
  };

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setProjectId(filterProject || (projects[0]?.id || ''));
    setAssignedUserId('');
    setStartDate('');
    setDueDate('');
    setEstimatedHours('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (task: Task) => {
    setFormMode('edit');
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setProjectId(task.projectId);
    setAssignedUserId(task.assignedUserId);
    setStartDate(task.startDate);
    setDueDate(task.dueDate);
    setEstimatedHours(String(task.estimatedHours));
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      alert('You must assign the task to an active project workspace.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title,
        description,
        priority,
        projectId,
        assignedUserId,
        startDate,
        dueDate,
        estimatedHours: Number(estimatedHours) || 0
      };

      if (formMode === 'create') {
        await api.tasks.create(payload);
        const assignedUser = users.find(u => u.id === assignedUserId);
        if (assignedUser) {
          addToast('Task Assigned', 'success', `"${title}" has been assigned to ${assignedUser.fullName}.`);
        } else {
          addToast('Task Created', 'success', `"${title}" has been added to Sprints.`);
        }
      } else if (editingTaskId) {
        const originalTask = tasks.find(t => t.id === editingTaskId);
        await api.tasks.update(editingTaskId, payload);
        
        if (detailTask && detailTask.id === editingTaskId) {
          handleOpenDetailModal(editingTaskId);
        }

        // Notify if assignee changed
        if (originalTask && originalTask.assignedUserId !== assignedUserId) {
          const assignedUser = users.find(u => u.id === assignedUserId);
          if (assignedUser) {
            addToast('Task Reassigned', 'info', `"${title}" has been reassigned to ${assignedUser.fullName}.`);
          } else {
            addToast('Task Unassigned', 'info', `"${title}" is now unassigned.`);
          }
        } else {
          addToast('Task Updated', 'success', `"${title}" parameters saved successfully.`);
        }
      }

      setIsFormOpen(false);
      loadTasksData();
    } catch (err: any) {
      alert(err.message || 'Failed to persist task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Permanently delete task "${taskTitle}"?`)) return;
    try {
      setLoading(true);
      await api.tasks.delete(taskId);
      setDetailTask(null);
      loadTasksData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
      setLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !detailTask) return;

    try {
      setCommentLoading(true);
      const cmt = await api.tasks.addComment(detailTask.id, newComment.trim());
      if (cmt) {
        setComments(prev => [...prev, cmt]);
        setNewComment('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to publish comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Upload Attachment via Base64 conversion
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailTask) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Content = reader.result as string;
        const att = await api.tasks.addAttachment(
          detailTask.id,
          file.name,
          file.type,
          base64Content
        );
        setAttachments(prev => [...prev, att]);
      } catch (err: any) {
        alert(err.message || 'Failed to upload attachment file.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      alert('Error parsing file into base64 binary buffer.');
      setUploading(false);
    };
  };

  // Render priority bullet
  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.LOW:
        return <span className="priority-badge px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">Low</span>;
      case TaskPriority.MEDIUM:
        return <span className="priority-badge px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 uppercase">Medium</span>;
      case TaskPriority.HIGH:
        return <span className="priority-badge px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 uppercase">High</span>;
      case TaskPriority.CRITICAL:
        return <span className="priority-badge critical px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 uppercase">Critical</span>;
    }
  };

  // Columns for Kanban
  const COLUMNS = [
    { status: TaskStatus.PENDING, title: 'Pending', color: 'border-slate-300 bg-slate-50 dark:bg-slate-900/60' },
    { status: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'border-blue-300 bg-blue-50/20 dark:bg-slate-900/60' },
    { status: TaskStatus.ON_HOLD, title: 'On Hold', color: 'border-amber-300 bg-amber-50/20 dark:bg-slate-900/60' },
    { status: TaskStatus.COMPLETED, title: 'Completed', color: 'border-emerald-300 bg-emerald-50/20 dark:bg-slate-900/60' }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Workspace Task Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Coordinate sprints, update progression milestones, and attach project assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Kanban/List */}
          <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
            >
              List Ledger
            </button>
          </div>

          {isManager && (
            <button
              onClick={handleOpenCreateForm}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Workspace Real-time Progress Tracker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Workspace Progression Tracker
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live progression tracker synced dynamically with task status completions.
            </p>
          </div>
          {filterProject && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
              Filter Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {projects
            .filter(p => !filterProject || p.id === filterProject)
            .map(p => {
              const progress = p.progressPercentage ?? 0;
              return (
                <div 
                  key={p.id} 
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl flex flex-col gap-2 hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={p.name}>
                        {p.name}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-medium">Workspace</span>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {progress}%
                    </span>
                  </div>

                  {/* Progress bar wrapper */}
                  <div className="w-full bg-slate-200 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span className="capitalize">Status: {p.status}</span>
                    <span>Synced</span>
                  </div>
                </div>
              );
            })}
          {projects.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-slate-400">
              No project workspaces found.
            </div>
          )}
        </div>
      </div>

      {/* 2. Search & Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />
        </div>

        {/* Project Filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.fullName} ({u.role.split(' ')[0]})</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value={TaskPriority.LOW}>Low</option>
          <option value={TaskPriority.MEDIUM}>Medium</option>
          <option value={TaskPriority.HIGH}>High</option>
          <option value={TaskPriority.CRITICAL}>Critical</option>
        </select>

        {/* Reset button */}
        {(filterProject || filterUser || filterPriority || searchQuery) && (
          <button
            onClick={() => {
              setFilterProject('');
              setFilterUser('');
              setFilterPriority('');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center justify-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Boards or Lists Container */}
      {loading && tasks.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500">
          {error}
        </div>
      ) : viewMode === 'kanban' ? (
        // ==========================================
        // KANBAN BOARD VIEW
        // ==========================================
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div 
                key={col.status} 
                className={`border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col min-h-[500px] ${col.color}`}
              >
                {/* Column header */}
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm font-sans flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      col.status === TaskStatus.COMPLETED ? 'bg-emerald-500' :
                      col.status === TaskStatus.IN_PROGRESS ? 'bg-blue-500' :
                      col.status === TaskStatus.ON_HOLD ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    {col.title}
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task cards stack */}
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-1">
                  {colTasks.length > 0 ? (
                    colTasks.map(task => {
                      const isAssigned = task.assignedUserId === currentUser.id;
                      const hasMutateAccess = isManager || isAssigned;
                      return (
                        <div
                          key={task.id}
                          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group flex flex-col"
                          onClick={() => handleOpenDetailModal(task.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {getPriorityBadge(task.priority)}
                            
                            {/* Fast status moving arrows */}
                            {hasMutateAccess && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                {col.status !== TaskStatus.PENDING && (
                                  <button
                                    title="Move left"
                                    onClick={() => {
                                      const prevStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, TaskStatus.COMPLETED];
                                      const idx = prevStatuses.indexOf(col.status);
                                      if (idx > 0) handleStatusChange(task.id, col.status, prevStatuses[idx - 1]);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {col.status !== TaskStatus.COMPLETED && (
                                  <button
                                    title="Move right"
                                    onClick={() => {
                                      const nextStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, TaskStatus.COMPLETED];
                                      const idx = nextStatuses.indexOf(col.status);
                                      if (idx < 3) handleStatusChange(task.id, col.status, nextStatuses[idx + 1]);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </h4>

                          <p className="text-[10px] bg-slate-100 dark:bg-slate-800 font-medium text-slate-500 px-2 py-0.5 rounded mt-3 self-start max-w-full truncate">
                            Prj: {task.projectName}
                          </p>

                          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">{task.assignedUserFullName}</span>
                            </div>
                            <div className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              <span>{task.dueDate.split('-').slice(1).join('/')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 text-xs text-center border border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-xl">
                      <HelpCircle className="w-6 h-6 text-slate-300 mb-1" />
                      <p>No tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ==========================================
        // LIST VIEW LEDGER
        // ==========================================
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Task Details</th>
                  <th className="p-4">Project Workspace</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Timeline</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {tasks.length > 0 ? (
                  tasks.map(task => (
                    <tr 
                      key={task.id}
                      onClick={() => handleOpenDetailModal(task.id)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{task.title}</span>
                          <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {task.projectName}
                      </td>
                      <td className="p-4">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold font-mono">
                            {task.assignedUserFullName.charAt(0)}
                          </div>
                          <span>{task.assignedUserFullName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {task.startDate} to {task.dueDate}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          task.status === TaskStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                          task.status === TaskStatus.ON_HOLD ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                      No tasks found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: TASK DETAILED DETAILS (WITH COMMENTS & UPLOADS)
          ========================================== */}
      {detailTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2.5">
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold px-2 py-0.5 rounded">
                  TASK DETAILS
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {detailTask.id}</span>
              </div>
              <button
                onClick={() => {
                  setDetailTask(null);
                  onClearSelectedTask();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Body (Scrollable Split columns) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 dark:divide-slate-800">
              {/* Left Column (3 of 5): Core Details, Files, Comments */}
              <div className="lg:col-span-3 p-6 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white font-sans leading-tight">
                    {detailTask.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <span>In Project:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 underline font-sans">{detailTask.projectName}</span>
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50 leading-relaxed font-sans">
                    {detailTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      Task Attachments ({attachments.length})
                    </h4>
                    
                    {/* Native file upload button */}
                    <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {uploading ? 'Uploading...' : 'Upload File'}
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        disabled={uploading} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {attachments.length > 0 ? (
                      attachments.map(att => (
                        <a 
                          key={att.id} 
                          href={att.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-900/40 rounded-xl transition-colors text-xs"
                        >
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{att.fileName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{(att.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800/55 rounded-xl text-xs text-slate-400">
                        No files uploaded. Drop or select a document to attach.
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Thread Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Commentaries & Sprints ({comments.length})
                  </h4>

                  {/* Add comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Post progress update or blocker..."
                      className="flex-1 px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={commentLoading}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors shrink-0"
                    >
                      {commentLoading ? '...' : 'Post'}
                    </button>
                  </form>

                  {/* Comments Feed List */}
                  <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                    {comments.length > 0 ? (
                      comments.map(c => (
                        <div key={c.id} className="text-xs space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{c.userFullName}</span>
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded font-semibold font-mono">
                                {c.role}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-sans leading-relaxed">{c.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-xs py-2">No comments published yet. Be the first to update!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (2 of 5): Status, Metadata Actions */}
              <div className="lg:col-span-2 p-6 space-y-6">
                {/* Status Toggle Box */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-900">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Progression</h4>
                  <select
                    value={detailTask.status}
                    onChange={(e) => handleStatusChange(detailTask.id, detailTask.status, e.target.value as TaskStatus)}
                    className="w-full mt-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={TaskStatus.PENDING}>Pending</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.ON_HOLD}>On Hold</option>
                    <option value={TaskStatus.COMPLETED}>Completed</option>
                  </select>
                </div>

                {/* Metadata Details List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Parameters</h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500 font-sans">Priority:</span>
                      {getPriorityBadge(detailTask.priority)}
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500 font-sans">Assignee:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{detailTask.assignedUserFullName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500 font-sans">Estimated Hours:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{detailTask.estimatedHours || 0} Hours</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500 font-sans">Start Date:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{detailTask.startDate}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500 font-sans">Due Date:</span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{detailTask.dueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Admin/PM Mutation Actions */}
                {isManager && (
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => {
                        handleOpenEditForm(detailTask);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Task Parameters
                    </button>
                    <button
                      onClick={() => handleDeleteTask(detailTask.id, detailTask.title)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete This Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL FORM: CREATE OR EDIT TASK
          ========================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white font-sans">
                {formMode === 'create' ? 'Create New Sprints Task' : 'Modify Task Parameters'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement bcrypt encryption tests"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
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
                  placeholder="What is the core target deliverable..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
                />
              </div>

              {/* Project select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Project</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">Select Target Project Workspace...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Assignee select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Team Member</label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">Select Assignee (Unassigned)...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role.split(' ')[0]})</option>
                  ))}
                </select>
              </div>

              {/* Priority & Est Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                    <option value={TaskPriority.CRITICAL}>Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Hours</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                  />
                </div>
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              {/* Buttons */}
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
                  {formMode === 'create' ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
