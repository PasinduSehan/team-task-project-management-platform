import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, description }]);
    
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = 'text-blue-500';
          let borderTheme = 'border-slate-200 dark:border-slate-800';
          let pillBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'text-emerald-500';
            pillBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
            pillBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
            pillBg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white dark:bg-slate-900 border ${borderTheme} rounded-2xl shadow-lg p-4 flex gap-3.5 items-start transition-all duration-300 animate-slide-in-right font-sans`}
              role="alert"
            >
              <div className={`p-1.5 rounded-xl ${pillBg} shrink-0 mt-0.5`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                  {toast.message}
                </p>
                {toast.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
