/**
 * Shared Type Definitions for Project and Team Task Management Platform
 */

export enum UserRole {
  ADMIN = 'Administrator',
  PROJECT_MANAGER = 'Project Manager',
  TEAM_MEMBER = 'Team Member'
}

export enum UserStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive'
}

export enum ProjectStatus {
  PLANNING = 'Planning',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold'
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  managerId: string;
  teamMemberIds?: string[];
  progressPercentage: number;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedUserId: string;
  projectId: string;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userFullName: string;
  role: UserRole;
  comment: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'TaskAssigned' | 'DeadlineReminder' | 'TaskCompleted' | 'System';
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userFullName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Summary interface for reports
export interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  onHoldTasks: number;
  activeProjects: number;
  completedProjects: number;
}
