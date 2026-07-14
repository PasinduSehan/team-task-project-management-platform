import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckSquare, 
  Loader2, AlertTriangle, HelpCircle, AlertCircle 
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Task, TaskPriority } from '../types.js';

interface CalendarViewProps {
  onSelectTask: (taskId: string) => void;
}

export default function CalendarView({ onSelectTask }: CalendarViewProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadTasksForCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.tasks.list();
      setTasks(res);
    } catch (err: any) {
      console.error('Error loading calendar tasks', err);
      setError(err.message || 'Failed to retrieve task calendars.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksForCalendar();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day of the week month starts on (0 = Sunday, 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create array of days representing the calendar grid
  const daysArray: (number | null)[] = [];
  
  // Fill preceding blank days
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }

  // Fill actual calendar days
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get tasks matching a specific day
  const getTasksForDay = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === formattedDate);
  };

  // Get task priority styling class
  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.CRITICAL:
        return 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
      case TaskPriority.HIGH:
        return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
      case TaskPriority.MEDIUM:
        return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            Calendar Deadlines
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track upcoming target milestones on an interactive monthly scheduler grid.
          </p>
        </div>

        {/* Month selector navigation */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-xs shrink-0 self-start sm:self-center gap-3">
          <button 
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm font-sans min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="h-96 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : (
        /* Calendar Grid wrapper */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Days of week titles */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
            {daysOfWeek.map(day => (
              <div 
                key={day} 
                className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar boxes grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-850 bg-slate-100/10 dark:bg-slate-900/10">
            {daysArray.map((day, idx) => {
              const dayTasks = day ? getTasksForDay(day) : [];
              return (
                <div 
                  key={idx} 
                  className={`min-h-[110px] p-2 flex flex-col gap-1.5 transition-colors ${
                    day ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-950/30'
                  }`}
                >
                  {/* Date number */}
                  {day && (
                    <span className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 self-start">
                      {String(day).padStart(2, '0')}
                    </span>
                  )}

                  {/* Tasks on this day list */}
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-[85px] pr-0.5">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        title={`${task.title} (Status: ${task.status})`}
                        className={`px-1.5 py-1 border text-[10px] font-medium rounded-md truncate cursor-pointer transition-all hover:scale-[1.01] ${getPriorityColor(task.priority)} ${
                          task.status === 'Completed' ? 'opacity-55 line-through' : ''
                        }`}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
