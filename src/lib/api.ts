/**
 * Type-safe Client API Helper for the Project and Team Task Management Platform
 */

import { 
  User, Project, Task, TaskComment, TaskAttachment, 
  Notification, ActivityLog, DashboardStats, UserRole 
} from '../types.js';

const API_BASE = '/api';

// Retrieve token from local storage
export function getStoredToken(): string | null {
  return localStorage.getItem('task_platform_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('task_platform_token', token);
}

export function removeStoredToken() {
  localStorage.removeItem('task_platform_token');
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('task_platform_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  localStorage.setItem('task_platform_user', JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem('task_platform_user');
}

// Request wrapper with JWT injection and error translation
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type only if not uploading FormData or if custom method demands it
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `HTTP error! Status: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // --- Auth ---
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setStoredToken(res.token);
      setStoredUser(res.user);
      return res;
    },
    register: async (email: string, password: string, fullName: string) => {
      const res = await request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName })
      });
      setStoredToken(res.token);
      setStoredUser(res.user);
      return res;
    },
    me: async () => {
      const user = await request<User>('/auth/me');
      setStoredUser(user);
      return user;
    },
    updateProfile: async (payload: { fullName?: string; email?: string; password?: string }) => {
      const user = await request<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setStoredUser(user);
      return user;
    },
    logout: () => {
      removeStoredToken();
      removeStoredUser();
    }
  },

  // --- Users ---
  users: {
    list: () => request<User[]>('/users'),
    create: (payload: Omit<User, 'id' | 'createdAt'> & { password?: string }) => 
      request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: Partial<Omit<User, 'id' | 'createdAt'>> & { password?: string }) => 
      request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) => 
      request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Projects ---
  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project & { teamMembers: User[] }>(`/projects/${id}`),
    create: (payload: { name: string; description: string; startDate: string; endDate: string; managerId?: string; teamMemberIds: string[] }) => 
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: { name?: string; description?: string; startDate?: string; endDate?: string; status?: string; managerId?: string; teamMemberIds?: string[] }) => 
      request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) => 
      request<{ success: boolean }>(`/projects/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Tasks ---
  tasks: {
    list: (filters: { projectId?: string; assignedUserId?: string; status?: string; priority?: string; search?: string } = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) query.set(key, val);
      });
      const queryString = query.toString();
      return request<(Task & { projectName: string; assignedUserFullName: string; assignedUserRole: UserRole | null })[]>(
        `/tasks${queryString ? `?${queryString}` : ''}`
      );
    },
    get: (id: string) => request<Task & { projectName: string; assignedUserFullName: string; assignedUserRole: UserRole | null }>(`/tasks/${id}`),
    create: (payload: { title: string; description: string; priority: string; projectId: string; startDate: string; dueDate: string; assignedUserId?: string; estimatedHours?: number }) => 
      request<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: { title?: string; description?: string; status?: string; priority?: string; assignedUserId?: string; startDate?: string; dueDate?: string; estimatedHours?: number }) => 
      request<Task>(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) => request<{ success: boolean }>(`/tasks/${id}`, {
      method: 'DELETE'
    }),
    
    // Comments
    getComments: (taskId: string) => request<TaskComment[]>(`/tasks/${taskId}/comments`),
    addComment: (taskId: string, comment: string) => 
      request<TaskComment>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      }),

    // Attachments
    getAttachments: (taskId: string) => request<TaskAttachment[]>(`/tasks/${taskId}/attachments`),
    addAttachment: (taskId: string, fileName: string, fileType: string, fileContentBase64: string) => 
      request<TaskAttachment>(`/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType, fileContent: fileContentBase64 })
      })
  },

  // --- Notifications ---
  notifications: {
    list: () => request<Notification[]>('/notifications'),
    markRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT'
    }),
    markAllRead: () => request<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT'
    })
  },

  // --- Activity Logs ---
  activityLogs: {
    list: () => request<ActivityLog[]>('/activity-logs')
  },

  // --- Reports & Dashboard Data ---
  reports: {
    dashboard: () => request<{
      stats: DashboardStats;
      charts: {
        projectProgress: { name: string; progress: number; status: string }[];
        taskStatus: { name: string; count: number }[];
        taskPriority: { name: string; count: number }[];
        teamWorkload: { name: string; tasks: number; role: string }[];
      };
      recentActivities: ActivityLog[];
    }>('/reports/dashboard')
  }
};
