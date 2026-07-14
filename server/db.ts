// import fs from 'fs';
// import path from 'path';
// import bcrypt from 'bcryptjs';
// import { Pool } from 'pg';
// import {
//   User,
//   UserRole,
//   UserStatus,
//   Project,
//   ProjectStatus,
//   ProjectMember,
//   Task,
//   TaskStatus,
//   TaskPriority,
//   TaskComment,
//   TaskAttachment,
//   Notification,
//   ActivityLog,
//   DashboardStats
// } from '../src/types.js';

// const DB_FILE = path.join(process.cwd(), 'database.json');
// const pool = process.env.DATABASE_URL
//   ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
//   : null;

// interface Schema {
//   users: User[];
//   passwords: Record<string, string>;
//   projects: Project[];
//   projectMembers: ProjectMember[];
//   tasks: Task[];
//   taskComments: TaskComment[];
//   taskAttachments: TaskAttachment[];
//   notifications: Notification[];
//   activityLogs: ActivityLog[];
// }

// function generateId(prefix: string): string {
//   return `${prefix}-${Date.now().toString(36)}`;
// }

// const getInitialSchema = (): Schema => {
//   const salt = bcrypt.genSaltSync(10);
//   const defaultPasswordHash = bcrypt.hashSync('password123', salt);

//   const users: User[] = [
//     {
//       id: 'usr-admin',
//       email: 'admin@example.com',
//       fullName: 'Chief Administrator',
//       role: UserRole.ADMIN,
//       status: UserStatus.ACTIVE,
//       createdAt: new Date('2026-06-01T09:00:00Z').toISOString()
//     },
//     {
//       id: 'usr-pm',
//       email: 'pm@example.com',
//       fullName: 'Sarah Jenkins',
//       role: UserRole.PROJECT_MANAGER,
//       status: UserStatus.ACTIVE,
//       createdAt: new Date('2026-06-02T10:00:00Z').toISOString()
//     },
//     {
//       id: 'usr-alice',
//       email: 'alice@example.com',
//       fullName: 'Alice Smith',
//       role: UserRole.TEAM_MEMBER,
//       status: UserStatus.ACTIVE,
//       createdAt: new Date('2026-06-03T09:30:00Z').toISOString()
//     }
//   ];

//   const passwords: Record<string, string> = {
//     'usr-admin': defaultPasswordHash,
//     'usr-pm': defaultPasswordHash,
//     'usr-alice': defaultPasswordHash
//   };

//   const projects: Project[] = [
//     {
//       id: 'prj-alpha',
//       name: 'E-Commerce Platform Redesign',
//       description: 'Complete overhaul of the consumer shopping experience, optimizing checkout flows and page performance.',
//       startDate: '2026-06-15',
//       endDate: '2026-08-15',
//       status: ProjectStatus.IN_PROGRESS,
//       managerId: 'usr-pm',
//       progressPercentage: 45,
//       createdAt: new Date('2026-06-10T10:00:00Z').toISOString()
//     }
//   ];

//   const projectMembers: ProjectMember[] = [
//     { projectId: 'prj-alpha', userId: 'usr-alice' }
//   ];

//   const tasks: Task[] = [
//     {
//       id: 'tsk-1',
//       title: 'Design high-fidelity UI landing page mockups',
//       description: 'Create visual mockups for the desktop and mobile landing experience.',
//       status: TaskStatus.COMPLETED,
//       priority: TaskPriority.HIGH,
//       assignedUserId: 'usr-alice',
//       projectId: 'prj-alpha',
//       startDate: '2026-06-16',
//       dueDate: '2026-06-30',
//       estimatedHours: 24,
//       createdById: 'usr-pm',
//       updatedById: 'usr-pm',
//       createdAt: new Date('2026-06-15T12:00:00Z').toISOString(),
//       updatedAt: new Date('2026-06-30T17:00:00Z').toISOString()
//     }
//   ];

//   const taskComments: TaskComment[] = [
//     {
//       id: 'cmt-1',
//       taskId: 'tsk-1',
//       userId: 'usr-pm',
//       userFullName: 'Sarah Jenkins',
//       role: UserRole.PROJECT_MANAGER,
//       comment: 'Excellent progress. Please confirm the responsive breakpoints.',
//       createdAt: new Date('2026-06-16T14:00:00Z').toISOString()
//     }
//   ];

//   const taskAttachments: TaskAttachment[] = [
//     {
//       id: 'att-1',
//       taskId: 'tsk-1',
//       userId: 'usr-pm',
//       fileName: 'wireframe.pdf',
//       fileType: 'application/pdf',
//       fileSize: 1250000,
//       fileUrl: '/uploads/wireframe.pdf',
//       createdAt: new Date('2026-06-16T14:30:00Z').toISOString()
//     }
//   ];

//   const notifications: Notification[] = [
//     {
//       id: 'notif-1',
//       userId: 'usr-alice',
//       message: 'You have been assigned to task: Design high-fidelity UI landing page mockups',
//       type: 'TaskAssigned',
//       isRead: true,
//       createdAt: new Date('2026-06-15T12:01:00Z').toISOString()
//     }
//   ];

//   const activityLogs: ActivityLog[] = [
//     {
//       id: 'act-1',
//       userId: 'usr-pm',
//       userFullName: 'Sarah Jenkins',
//       action: 'Project Created',
//       details: 'Created project E-Commerce Platform Redesign',
//       createdAt: new Date('2026-06-10T10:00:00Z').toISOString()
//     }
//   ];

//   return {
//     users,
//     passwords,
//     projects,
//     projectMembers,
//     tasks,
//     taskComments,
//     taskAttachments,
//     notifications,
//     activityLogs
//   };
// };

// class Database {
//   private schema: Schema;

//   constructor() {
//     this.schema = getInitialSchema();
//     if (!pool) {
//       this.load();
//     }
//   }

//   private load() {
//     try {
//       if (fs.existsSync(DB_FILE)) {
//         const data = fs.readFileSync(DB_FILE, 'utf-8');
//         const parsed = JSON.parse(data);
//         this.schema = {
//           users: parsed.users || [],
//           passwords: parsed.passwords || {},
//           projects: parsed.projects || [],
//           projectMembers: parsed.projectMembers || [],
//           tasks: parsed.tasks || [],
//           taskComments: parsed.taskComments || [],
//           taskAttachments: parsed.taskAttachments || [],
//           notifications: parsed.notifications || [],
//           activityLogs: parsed.activityLogs || []
//         };
//       } else {
//         this.save();
//       }
//     } catch (error) {
//       console.error('Unable to read database.json, initializing fallback schema', error);
//       this.save();
//     }
//   }

//   private save() {
//     try {
//       fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
//     } catch (error) {
//       console.error('Unable to save database.json', error);
//     }
//   }

//   private async runQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
//     if (!pool) {
//       throw new Error('PostgreSQL pool is not configured');
//     }
//     const result = await pool.query<T>(sql, params);
//     return result.rows;
//   }

//   private async runOne<T>(sql: string, params: any[] = []): Promise<T | undefined> {
//     const rows = await this.runQuery<T>(sql, params);
//     return rows[0];
//   }

//   private buildUpdateClause(fields: Record<string, any>): { setClause: string; values: any[] } {
//     const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
//     return {
//       setClause: entries.map(([key], index) => `${key} = $${index + 1}`).join(', '),
//       values: entries.map(([, value]) => value)
//     };
//   }

//   async getUsers(): Promise<User[]> {
//     if (pool) {
//       return this.runQuery<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
//          FROM users
//          ORDER BY created_at DESC`);
//     }
//     return [...this.schema.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   }

//   async getUserById(id: string): Promise<User | undefined> {
//     if (pool) {
//       return this.runOne<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
//          FROM users
//          WHERE id = $1`, [id]);
//     }
//     return this.schema.users.find((user) => user.id === id);
//   }

//   async getUserByEmail(email: string): Promise<User | undefined> {
//     if (pool) {
//       return this.runOne<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
//          FROM users
//          WHERE LOWER(email) = LOWER($1)`, [email]);
//     }
//     return this.schema.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
//   }

//   async getPasswordHash(userId: string): Promise<string | undefined> {
//     if (pool) {
//       const row = await this.runOne<{ password_hash: string }>(
//         'SELECT password_hash FROM passwords WHERE user_id = $1',
//         [userId]
//       );
//       return row?.password_hash;
//     }
//     return this.schema.passwords[userId];
//   }

//   async addUser(user: Omit<User, 'id' | 'createdAt'>, passwordHash: string): Promise<User> {
//     if (pool) {
//       const id = generateId('usr');
//       const result = await pool.query<User>(`INSERT INTO users (id, email, full_name, role, status, created_at)
//          VALUES ($1, $2, $3, $4, $5, NOW())
//          RETURNING id, email, full_name AS fullName, role, status, created_at AS createdAt`,
//         [id, user.email, user.fullName, user.role, user.status]
//       );
//       await pool.query('INSERT INTO passwords (user_id, password_hash) VALUES ($1, $2)', [id, passwordHash]);
//       return result.rows[0];
//     }

//     const id = generateId('usr');
//     const newUser: User = {
//       ...user,
//       id,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.users.push(newUser);
//     this.schema.passwords[id] = passwordHash;
//     this.save();
//     return newUser;
//   }

//   async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>, newPasswordHash?: string): Promise<User | undefined> {
//     if (pool) {
//       const { setClause, values } = this.buildUpdateClause({
//         email: updates.email,
//         full_name: updates.fullName,
//         role: updates.role,
//         status: updates.status
//       });
//       let user: User | undefined;
//       if (setClause) {
//         const sql = `UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, email, full_name AS fullName, role, status, created_at AS createdAt`;
//         const result = await pool.query<User>(sql, [...values, id]);
//         user = result.rows[0];
//       }
//       if (newPasswordHash) {
//         await pool.query('UPDATE passwords SET password_hash = $1 WHERE user_id = $2', [newPasswordHash, id]);
//       }
//       return user ?? this.getUserById(id);
//     }

//     const index = this.schema.users.findIndex((user) => user.id === id);
//     if (index === -1) return undefined;

//     const updatedUser = {
//       ...this.schema.users[index],
//       ...updates
//     };
//     this.schema.users[index] = updatedUser;

//     if (newPasswordHash) {
//       this.schema.passwords[id] = newPasswordHash;
//     }
//     this.save();
//     return updatedUser;
//   }

//   async deleteUser(id: string): Promise<boolean> {
//     if (pool) {
//       const user = await this.getUserById(id);
//       if (!user) return false;
//       await pool.query('DELETE FROM passwords WHERE user_id = ', [id]);
//       await pool.query('DELETE FROM project_members WHERE user_id = ', [id]);
//       await pool.query('UPDATE tasks SET assigned_user_id = NULL WHERE assigned_user_id = ', [id]);
//       await pool.query('DELETE FROM users WHERE id = ', [id]);
//       return true;
//     }

//     const index = this.schema.users.findIndex((user) => user.id === id);
//     if (index === -1) return false;
//     this.schema.users.splice(index, 1);
//     delete this.schema.passwords[id];
//     this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.userId !== id);
//     this.schema.tasks = this.schema.tasks.map((task) =>
//       task.assignedUserId === id ? { ...task, assignedUserId: '' } : task
//     );
//     this.save();
//     return true;
//   }

//   async getProjects(): Promise<Project[]> {
//     if (pool) {
//       return this.runQuery<Project>(`SELECT id, name, description, start_date AS startDate, end_date AS endDate,
//                 status, manager_id AS managerId, progress_percentage AS progressPercentage,
//                 created_at AS createdAt
//            FROM projects
//            ORDER BY created_at DESC`);
//     }
//     return [...this.schema.projects];
//   }

//   async getProjectById(id: string): Promise<Project | undefined> {
//     if (pool) {
//       return this.runOne<Project>(`SELECT id, name, description, start_date AS startDate, end_date AS endDate,
//                 status, manager_id AS managerId, progress_percentage AS progressPercentage,
//                 created_at AS createdAt
//            FROM projects
//            WHERE id = $1`, [id]);
//     }
//     return this.schema.projects.find((project) => project.id === id);
//   }

//   async addProject(project: Omit<Project, 'id' | 'createdAt' | 'progressPercentage'>): Promise<Project> {
//     if (pool) {
//       const id = generateId('prj');
//       const result = await pool.query<Project>(`INSERT INTO projects (id, name, description, start_date, end_date, status, manager_id, progress_percentage, created_at)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
//          RETURNING id, name, description, start_date AS startDate, end_date AS endDate,
//                    status, manager_id AS managerId, progress_percentage AS progressPercentage,
//                    created_at AS createdAt`,
//         [id, project.name, project.description, project.startDate, project.endDate, project.status, project.managerId]
//       );
//       return result.rows[0];
//     }

//     const id = generateId('prj');
//     const newProject: Project = {
//       ...project,
//       id,
//       progressPercentage: 0,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.projects.push(newProject);
//     this.save();
//     return newProject;
//   }

//   async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | undefined> {
//     if (pool) {
//       const { setClause, values } = this.buildUpdateClause({
//         name: updates.name,
//         description: updates.description,
//         start_date: updates.startDate,
//         end_date: updates.endDate,
//         status: updates.status,
//         manager_id: updates.managerId,
//         progress_percentage: updates.progressPercentage
//       });
//       if (setClause) {
//         const sql = `UPDATE projects SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, name, description, start_date AS startDate, end_date AS endDate,
//                      status, manager_id AS managerId, progress_percentage AS progressPercentage, created_at AS createdAt`;
//         const result = await pool.query<Project>(sql, [...values, id]);
//         return result.rows[0];
//       }
//       return this.getProjectById(id);
//     }

//     const index = this.schema.projects.findIndex((project) => project.id === id);
//     if (index === -1) return undefined;
//     const updatedProject = {
//       ...this.schema.projects[index],
//       ...updates
//     };
//     this.schema.projects[index] = updatedProject;
//     this.save();
//     return updatedProject;
//   }

//   async deleteProject(id: string): Promise<boolean> {
//     if (pool) {
//       const project = await this.getProjectById(id);
//       if (!project) return false;
//       await pool.query('DELETE FROM project_members WHERE project_id = ', [id]);
//       await pool.query('DELETE FROM task_comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = )', [id]);
//       await pool.query('DELETE FROM task_attachments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = )', [id]);
//       await pool.query('DELETE FROM tasks WHERE project_id = ', [id]);
//       await pool.query('DELETE FROM projects WHERE id = ', [id]);
//       return true;
//     }

//     const index = this.schema.projects.findIndex((project) => project.id === id);
//     if (index === -1) return false;
//     this.schema.projects.splice(index, 1);
//     const taskIds = this.schema.tasks.filter((task) => task.projectId === id).map((task) => task.id);
//     this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.projectId !== id);
//     this.schema.tasks = this.schema.tasks.filter((task) => task.projectId !== id);
//     this.schema.taskComments = this.schema.taskComments.filter((comment) => !taskIds.includes(comment.taskId));
//     this.schema.taskAttachments = this.schema.taskAttachments.filter((attachment) => !taskIds.includes(attachment.taskId));
//     this.save();
//     return true;
//   }

//   async recalculateProjectProgress(projectId: string): Promise<void> {
//     if (pool) {
//       const row = await this.runOne<{ total: number; completed: number }>(`SELECT COUNT(*)::int AS total,
//                 SUM(CASE WHEN status = $2 THEN 1 ELSE 0 END)::int AS completed
//            FROM tasks
//            WHERE project_id = $1`, [projectId, TaskStatus.COMPLETED]);
//       const total = row?.total ?? 0;
//       const completed = row?.completed ?? 0;
//       const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
//       await this.updateProject(projectId, { progressPercentage: progress });
//       return;
//     }

//     const projectTasks = this.schema.tasks.filter((task) => task.projectId === projectId);
//     const progress = projectTasks.length === 0 ? 0 : Math.round((projectTasks.filter((task) => task.status === TaskStatus.COMPLETED).length / projectTasks.length) * 100);
//     await this.updateProject(projectId, { progressPercentage: progress });
//   }

//   async getProjectMembers(projectId: string): Promise<string[]> {
//     if (pool) {
//       const rows = await this.runQuery<{ user_id: string }>('SELECT user_id FROM project_members WHERE project_id = $1', [projectId]);
//       return rows.map((row) => row.user_id);
//     }
//     return this.schema.projectMembers.filter((member) => member.projectId === projectId).map((member) => member.userId);
//   }

//   async setProjectMembers(projectId: string, userIds: string[]): Promise<void> {
//     if (pool) {
//       await pool.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
//       if (userIds.length > 0) {
//         await Promise.all(userIds.map((uid) => pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', [projectId, uid])));
//       }
//       return;
//     }

//     this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.projectId !== projectId);
//     userIds.forEach((userId) => {
//       this.schema.projectMembers.push({ projectId, userId });
//     });
//     this.save();
//   }

//   async getTasks(): Promise<Task[]> {
//     if (pool) {
//       return this.runQuery<Task>(`SELECT id, title, description, status, priority,
//                 COALESCE(assigned_user_id, '') AS "assignedUserId",
//                 project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
//                 estimated_hours AS "estimatedHours", created_by_id AS "createdById",
//                 updated_by_id AS "updatedById", created_at AS "createdAt",
//                 updated_at AS "updatedAt"
//            FROM tasks`);
//     }
//     return [...this.schema.tasks];
//   }

//   async getTaskById(id: string): Promise<Task | undefined> {
//     if (pool) {
//       return this.runOne<Task>(`SELECT id, title, description, status, priority,
//                 COALESCE(assigned_user_id, '') AS "assignedUserId",
//                 project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
//                 estimated_hours AS "estimatedHours", created_by_id AS "createdById",
//                 updated_by_id AS "updatedById", created_at AS "createdAt",
//                 updated_at AS "updatedAt"
//            FROM tasks
//            WHERE id = $1`, [id]);
//     }
//     return this.schema.tasks.find((task) => task.id === id);
//   }

//   async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
//     if (pool) {
//       const id = generateId('tsk');
//       const now = new Date().toISOString();
//       const result = await pool.query<Task>(`INSERT INTO tasks (id, title, description, status, priority, assigned_user_id, project_id, start_date, due_date, estimated_hours, created_by_id, updated_by_id, created_at, updated_at)
//          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
//          RETURNING id, title, description, status, priority,
//                    COALESCE(assigned_user_id, '') AS "assignedUserId",
//                    project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
//                    estimated_hours AS "estimatedHours", created_by_id AS "createdById",
//                    updated_by_id AS "updatedById", created_at AS "createdAt",
//                    updated_at AS "updatedAt"`,
//         [
//           id,
//           task.title,
//           task.description,
//           task.status,
//           task.priority,
//           task.assignedUserId || null,
//           task.projectId,
//           task.startDate,
//           task.dueDate,
//           task.estimatedHours,
//           task.createdById,
//           task.updatedById,
//           now,
//           now
//         ]
//       );
//       const addedTask = result.rows[0];
//       await this.recalculateProjectProgress(task.projectId);
//       return addedTask;
//     }

//     const id = generateId('tsk');
//     const now = new Date().toISOString();
//     const newTask: Task = {
//       ...task,
//       id,
//       createdAt: now,
//       updatedAt: now
//     };
//     this.schema.tasks.push(newTask);
//     this.save();
//     await this.recalculateProjectProgress(task.projectId);
//     return newTask;
//   }

//   async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>): Promise<Task | undefined> {
//     if (pool) {
//       const { setClause, values } = this.buildUpdateClause({
//         title: updates.title,
//         description: updates.description,
//         status: updates.status,
//         priority: updates.priority,
//         assigned_user_id: updates.assignedUserId,
//         start_date: updates.startDate,
//         due_date: updates.dueDate,
//         estimated_hours: updates.estimatedHours,
//         created_by_id: updates.createdById,
//         updated_by_id: updates.updatedById,
//         updated_at: new Date().toISOString()
//       });
//       if (!setClause) {
//         return this.getTaskById(id);
//       }
//       const sql = `UPDATE tasks SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, title, description, status, priority,
//                    COALESCE(assigned_user_id, '') AS "assignedUserId",
//                    project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
//                    estimated_hours AS "estimatedHours", created_by_id AS "createdById",
//                    updated_by_id AS "updatedById", created_at AS "createdAt",
//                    updated_at AS "updatedAt"`;
//       const result = await pool.query<Task>(sql, [...values, id]);
//       const updated = result.rows[0];
//       if (updated) {
//         await this.recalculateProjectProgress(updated.projectId);
//       }
//       return updated;
//     }

//     const index = this.schema.tasks.findIndex((task) => task.id === id);
//     if (index === -1) return undefined;

//     const updatedTask = {
//       ...this.schema.tasks[index],
//       ...updates,
//       updatedAt: new Date().toISOString()
//     } as Task;
//     this.schema.tasks[index] = updatedTask;
//     this.save();
//     await this.recalculateProjectProgress(updatedTask.projectId);
//     return updatedTask;
//   }

//   async deleteTask(id: string): Promise<boolean> {
//     if (pool) {
//       const task = await this.getTaskById(id);
//       if (!task) return false;
//       await pool.query('DELETE FROM task_comments WHERE task_id = $1', [id]);
//       await pool.query('DELETE FROM task_attachments WHERE task_id = $1', [id]);
//       await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
//       await this.recalculateProjectProgress(task.projectId);
//       return true;
//     }

//     const index = this.schema.tasks.findIndex((task) => task.id === id);
//     if (index === -1) return false;
//     const projectId = this.schema.tasks[index].projectId;
//     this.schema.tasks.splice(index, 1);
//     this.schema.taskComments = this.schema.taskComments.filter((comment) => comment.taskId !== id);
//     this.schema.taskAttachments = this.schema.taskAttachments.filter((attachment) => attachment.taskId !== id);
//     this.save();
//     await this.recalculateProjectProgress(projectId);
//     return true;
//   }

//   async getTaskComments(taskId: string): Promise<TaskComment[]> {
//     if (pool) {
//       return this.runQuery<TaskComment>(`SELECT id, task_id AS "taskId", user_id AS "userId", user_full_name AS "userFullName",
//                 role, comment, created_at AS "createdAt"
//            FROM task_comments
//            WHERE task_id = $1
//            ORDER BY created_at ASC`, [taskId]);
//     }
//     return this.schema.taskComments.filter((comment) => comment.taskId === taskId);
//   }

//   async addTaskComment(taskId: string, userId: string, comment: string): Promise<TaskComment | undefined> {
//     const user = await this.getUserById(userId);
//     if (!user) return undefined;
//     if (pool) {
//       const id = generateId('cmt');
//       const now = new Date().toISOString();
//       const result = await pool.query<TaskComment>(`INSERT INTO task_comments (id, task_id, user_id, user_full_name, role, comment, created_at)
//          VALUES ($1,$2,$3,$4,$5,$6,$7)
//          RETURNING id, task_id AS "taskId", user_id AS "userId", user_full_name AS "userFullName",
//                    role, comment, created_at AS "createdAt"`, [id, taskId, userId, user.fullName, user.role, comment, now]);
//       return result.rows[0];
//     }

//     const newComment: TaskComment = {
//       id: generateId('cmt'),
//       taskId,
//       userId,
//       userFullName: user.fullName,
//       role: user.role,
//       comment,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.taskComments.push(newComment);
//     this.save();
//     return newComment;
//   }

//   async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
//     if (pool) {
//       return this.runQuery<TaskAttachment>(`SELECT id, task_id AS "taskId", user_id AS "userId", file_name AS "fileName",
//                 file_type AS "fileType", file_size AS "fileSize", file_url AS "fileUrl",
//                 created_at AS "createdAt"
//            FROM task_attachments
//            WHERE task_id = $1
//            ORDER BY created_at ASC`, [taskId]);
//     }
//     return this.schema.taskAttachments.filter((attachment) => attachment.taskId === taskId);
//   }

//   async addTaskAttachment(taskId: string, userId: string, fileName: string, fileType: string, fileSize: number, fileUrl: string): Promise<TaskAttachment> {
//     if (pool) {
//       const id = generateId('att');
//       const now = new Date().toISOString();
//       const result = await pool.query<TaskAttachment>(`INSERT INTO task_attachments (id, task_id, user_id, file_name, file_type, file_size, file_url, created_at)
//          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//          RETURNING id, task_id AS "taskId", user_id AS "userId", file_name AS "fileName",
//                    file_type AS "fileType", file_size AS "fileSize", file_url AS "fileUrl",
//                    created_at AS "createdAt"`, [id, taskId, userId, fileName, fileType, fileSize, fileUrl, now]);
//       return result.rows[0];
//     }

//     const newAttachment: TaskAttachment = {
//       id: generateId('att'),
//       taskId,
//       userId,
//       fileName,
//       fileType,
//       fileSize,
//       fileUrl,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.taskAttachments.push(newAttachment);
//     this.save();
//     return newAttachment;
//   }

//   async getNotificationsForUser(userId: string): Promise<Notification[]> {
//     if (pool) {
//       return this.runQuery<Notification>(`SELECT id, user_id AS "userId", message, type, is_read AS "isRead", created_at AS "createdAt"
//            FROM notifications
//            WHERE user_id = $1
//            ORDER BY created_at DESC`, [userId]);
//     }
//     return this.schema.notifications
//       .filter((notification) => notification.userId === userId)
//       .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   }

//   async addNotification(userId: string, message: string, type: Notification['type']): Promise<Notification> {
//     if (pool) {
//       const id = generateId('notif');
//       const now = new Date().toISOString();
//       const result = await pool.query<Notification>(`INSERT INTO notifications (id, user_id, message, type, is_read, created_at)
//          VALUES ($1,$2,$3,$4,false,$5)
//          RETURNING id, user_id AS "userId", message, type, is_read AS "isRead", created_at AS "createdAt"`, [id, userId, message, type, now]);
//       return result.rows[0];
//     }

//     const notification: Notification = {
//       id: generateId('notif'),
//       userId,
//       message,
//       type,
//       isRead: false,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.notifications.push(notification);
//     this.save();
//     return notification;
//   }

//   async markNotificationRead(id: string, userId: string): Promise<boolean> {
//     if (pool) {
//       const result = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
//       return result.rowCount > 0;
//     }

//     const notification = this.schema.notifications.find((item) => item.id === id && item.userId === userId);
//     if (!notification) return false;
//     notification.isRead = true;
//     this.save();
//     return true;
//   }

//   async markAllNotificationsRead(userId: string): Promise<void> {
//     if (pool) {
//       await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
//       return;
//     }
//     this.schema.notifications.forEach((notification) => {
//       if (notification.userId === userId) {
//         notification.isRead = true;
//       }
//     });
//     this.save();
//   }

//   async getActivityLogs(): Promise<ActivityLog[]> {
//     if (pool) {
//       return this.runQuery<ActivityLog>(`SELECT id, user_id AS "userId", user_full_name AS "userFullName", action, details, created_at AS "createdAt"
//            FROM activity_logs
//            ORDER BY created_at DESC`);
//     }
//     return [...this.schema.activityLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   }

//   async addActivityLog(userId: string, action: string, details: string): Promise<ActivityLog> {
//     const user = await this.getUserById(userId);
//     const userFullName = user ? user.fullName : 'System / Unknown';
//     if (pool) {
//       const id = generateId('act');
//       const now = new Date().toISOString();
//       const result = await pool.query<ActivityLog>(`INSERT INTO activity_logs (id, user_id, user_full_name, action, details, created_at)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          RETURNING id, user_id AS "userId", user_full_name AS "userFullName", action, details, created_at AS "createdAt"`, [id, userId, userFullName, action, details, now]);
//       return result.rows[0];
//     }

//     const log: ActivityLog = {
//       id: generateId('act'),
//       userId,
//       userFullName,
//       action,
//       details,
//       createdAt: new Date().toISOString()
//     };
//     this.schema.activityLogs.push(log);
//     if (this.schema.activityLogs.length > 500) {
//       this.schema.activityLogs = this.schema.activityLogs
//         .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
//         .slice(0, 500);
//     }
//     this.save();
//     return log;
//   }

//   async getDashboardStats(role: UserRole, userId: string): Promise<DashboardStats> {
//     const allUsers = await this.getUsers();
//     const allProjects = await this.getProjects();
//     const allTasks = await this.getTasks();

//     let targetProjects = allProjects;
//     let targetTasks = allTasks;

//     if (role === UserRole.PROJECT_MANAGER) {
//       targetProjects = allProjects.filter((project) => project.managerId === userId);
//       const projectIds = targetProjects.map((project) => project.id);
//       targetTasks = allTasks.filter((task) => projectIds.includes(task.projectId));
//     } else if (role === UserRole.TEAM_MEMBER) {
//       const projectIds = await this.getProjectMembers(userId);
//       targetProjects = allProjects.filter((project) => projectIds.includes(project.id));
//       targetTasks = allTasks.filter((task) => task.assignedUserId === userId || projectIds.includes(task.projectId));
//     }

//     const totalProjects = targetProjects.length;
//     const totalTasks = targetTasks.length;
//     const completedTasks = targetTasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
//     const pendingTasks = targetTasks.filter((task) => task.status === TaskStatus.PENDING).length;
//     const inProgressTasks = targetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
//     const onHoldTasks = targetTasks.filter((task) => task.status === TaskStatus.ON_HOLD).length;
//     const activeProjects = targetProjects.filter((project) => project.status === ProjectStatus.IN_PROGRESS || project.status === ProjectStatus.PLANNING).length;
//     const completedProjects = targetProjects.filter((project) => project.status === ProjectStatus.COMPLETED).length;

//     return {
//       totalUsers: allUsers.length,
//       totalProjects,
//       totalTasks,
//       completedTasks,
//       pendingTasks,
//       inProgressTasks,
//       onHoldTasks,
//       activeProjects,
//       completedProjects
//     };
//   }
// }

// export const db = new Database();




import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool, QueryResultRow, Submittable } from 'pg';
import {
  User,
  UserRole,
  UserStatus,
  Project,
  ProjectStatus,
  ProjectMember,
  Task,
  TaskStatus,
  TaskPriority,
  TaskComment,
  TaskAttachment,
  Notification,
  ActivityLog,
  DashboardStats
} from '../src/types.js';

const DB_FILE = path.join(process.cwd(), 'database.json');
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

interface Schema {
  users: User[];
  passwords: Record<string, string>;
  projects: Project[];
  projectMembers: ProjectMember[];
  tasks: Task[];
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

const getInitialSchema = (): Schema => {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  const users: User[] = [
    {
      id: 'usr-admin',
      email: 'admin@example.com',
      fullName: 'Chief Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-06-01T09:00:00Z').toISOString()
    },
    {
      id: 'usr-pm',
      email: 'pm@example.com',
      fullName: 'Sarah Jenkins',
      role: UserRole.PROJECT_MANAGER,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-06-02T10:00:00Z').toISOString()
    },
    {
      id: 'usr-alice',
      email: 'alice@example.com',
      fullName: 'Alice Smith',
      role: UserRole.TEAM_MEMBER,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-06-03T09:30:00Z').toISOString()
    }
  ];

  const passwords: Record<string, string> = {
    'usr-admin': defaultPasswordHash,
    'usr-pm': defaultPasswordHash,
    'usr-alice': defaultPasswordHash
  };

  const projects: Project[] = [
    {
      id: 'prj-alpha',
      name: 'E-Commerce Platform Redesign',
      description: 'Complete overhaul of the consumer shopping experience, optimizing checkout flows and page performance.',
      startDate: '2026-06-15',
      endDate: '2026-08-15',
      status: ProjectStatus.IN_PROGRESS,
      managerId: 'usr-pm',
      progressPercentage: 45,
      createdAt: new Date('2026-06-10T10:00:00Z').toISOString()
    }
  ];

  const projectMembers: ProjectMember[] = [
    { projectId: 'prj-alpha', userId: 'usr-alice' }
  ];

  const tasks: Task[] = [
    {
      id: 'tsk-1',
      title: 'Design high-fidelity UI landing page mockups',
      description: 'Create visual mockups for the desktop and mobile landing experience.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      assignedUserId: 'usr-alice',
      projectId: 'prj-alpha',
      startDate: '2026-06-16',
      dueDate: '2026-06-30',
      estimatedHours: 24,
      createdById: 'usr-pm',
      updatedById: 'usr-pm',
      createdAt: new Date('2026-06-15T12:00:00Z').toISOString(),
      updatedAt: new Date('2026-06-30T17:00:00Z').toISOString()
    }
  ];

  const taskComments: TaskComment[] = [
    {
      id: 'cmt-1',
      taskId: 'tsk-1',
      userId: 'usr-pm',
      userFullName: 'Sarah Jenkins',
      role: UserRole.PROJECT_MANAGER,
      comment: 'Excellent progress. Please confirm the responsive breakpoints.',
      createdAt: new Date('2026-06-16T14:00:00Z').toISOString()
    }
  ];

  const taskAttachments: TaskAttachment[] = [
    {
      id: 'att-1',
      taskId: 'tsk-1',
      userId: 'usr-pm',
      fileName: 'wireframe.pdf',
      fileType: 'application/pdf',
      fileSize: 1250000,
      fileUrl: '/uploads/wireframe.pdf',
      createdAt: new Date('2026-06-16T14:30:00Z').toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: 'notif-1',
      userId: 'usr-alice',
      message: 'You have been assigned to task: Design high-fidelity UI landing page mockups',
      type: 'TaskAssigned',
      isRead: true,
      createdAt: new Date('2026-06-15T12:01:00Z').toISOString()
    }
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act-1',
      userId: 'usr-pm',
      userFullName: 'Sarah Jenkins',
      action: 'Project Created',
      details: 'Created project E-Commerce Platform Redesign',
      createdAt: new Date('2026-06-10T10:00:00Z').toISOString()
    }
  ];

  return {
    users,
    passwords,
    projects,
    projectMembers,
    tasks,
    taskComments,
    taskAttachments,
    notifications,
    activityLogs
  };
};

class Database {
  private schema: Schema;

  constructor() {
    this.schema = getInitialSchema();
    if (!pool) {
      this.load();
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        this.schema = {
          users: parsed.users || [],
          passwords: parsed.passwords || {},
          projects: parsed.projects || [],
          projectMembers: parsed.projectMembers || [],
          tasks: parsed.tasks || [],
          taskComments: parsed.taskComments || [],
          taskAttachments: parsed.taskAttachments || [],
          notifications: parsed.notifications || [],
          activityLogs: parsed.activityLogs || []
        };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Unable to read database.json, initializing fallback schema', error);
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (error) {
      console.error('Unable to save database.json', error);
    }
  }

  private async runQuery<T extends any[] | QueryResultRow | Submittable>(sql: string, params: any[] = []): Promise<T[]> {
    if (!pool) {
      throw new Error('PostgreSQL pool is not configured');
    }
    const result = await pool.query<T>(sql, params);
    return result.rows;
  }

  private async runOne<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const rows = await this.runQuery<T>(sql, params);
    return rows[0];
  }

  private buildUpdateClause(fields: Record<string, any>): { setClause: string; values: any[] } {
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    return {
      setClause: entries.map(([key], index) => `${key} = $${index + 1}`).join(', '),
      values: entries.map(([, value]) => value)
    };
  }

  async getUsers(): Promise<User[]> {
    if (pool) {
      return this.runQuery<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
         FROM users
         ORDER BY created_at DESC`);
    }
    return [...this.schema.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (pool) {
      return this.runOne<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
         FROM users
         WHERE id = $1`, [id]);
    }
    return this.schema.users.find((user) => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (pool) {
      return this.runOne<User>(`SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
         FROM users
         WHERE LOWER(email) = LOWER($1)`, [email]);
    }
    return this.schema.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  async getPasswordHash(userId: string): Promise<string | undefined> {
    if (pool) {
      const row = await this.runOne<{ password_hash: string }>(
        'SELECT password_hash FROM passwords WHERE user_id = $1',
        [userId]
      );
      return row?.password_hash;
    }
    return this.schema.passwords[userId];
  }

  async addUser(user: Omit<User, 'id' | 'createdAt'>, passwordHash: string): Promise<User> {
    if (pool) {
      const id = generateId('usr');
      const result = await pool.query<User>(`INSERT INTO users (id, email, full_name, role, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, email, full_name AS fullName, role, status, created_at AS createdAt`,
        [id, user.email, user.fullName, user.role, user.status]
      );
      await pool.query('INSERT INTO passwords (user_id, password_hash) VALUES ($1, $2)', [id, passwordHash]);
      return result.rows[0];
    }

    const id = generateId('usr');
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString()
    };
    this.schema.users.push(newUser);
    this.schema.passwords[id] = passwordHash;
    this.save();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>, newPasswordHash?: string): Promise<User | undefined> {
    if (pool) {
      const { setClause, values } = this.buildUpdateClause({
        email: updates.email,
        full_name: updates.fullName,
        role: updates.role,
        status: updates.status
      });
      let user: User | undefined;
      if (setClause) {
        const sql = `UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, email, full_name AS fullName, role, status, created_at AS createdAt`;
        const result = await pool.query<User>(sql, [...values, id]);
        user = result.rows[0];
      }
      if (newPasswordHash) {
        await pool.query('UPDATE passwords SET password_hash = $1 WHERE user_id = $2', [newPasswordHash, id]);
      }
      return user ?? this.getUserById(id);
    }

    const index = this.schema.users.findIndex((user) => user.id === id);
    if (index === -1) return undefined;

    const updatedUser = {
      ...this.schema.users[index],
      ...updates
    };
    this.schema.users[index] = updatedUser;

    if (newPasswordHash) {
      this.schema.passwords[id] = newPasswordHash;
    }
    this.save();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    if (pool) {
      const user = await this.getUserById(id);
      if (!user) return false;
      await pool.query('DELETE FROM passwords WHERE user_id = $1', [id]);
      await pool.query('DELETE FROM project_members WHERE user_id = $1', [id]);
      await pool.query('UPDATE tasks SET assigned_user_id = NULL WHERE assigned_user_id = $1', [id]);
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return true;
    }

    const index = this.schema.users.findIndex((user) => user.id === id);
    if (index === -1) return false;
    this.schema.users.splice(index, 1);
    delete this.schema.passwords[id];
    this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.userId !== id);
    this.schema.tasks = this.schema.tasks.map((task) =>
      task.assignedUserId === id ? { ...task, assignedUserId: '' } : task
    );
    this.save();
    return true;
  }

  async getProjects(): Promise<Project[]> {
    if (pool) {
      return this.runQuery<Project>(`SELECT id, name, description, start_date AS startDate, end_date AS endDate,
                status, manager_id AS managerId, progress_percentage AS progressPercentage,
                created_at AS createdAt
           FROM projects
           ORDER BY created_at DESC`);
    }
    return [...this.schema.projects];
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    if (pool) {
      return this.runOne<Project>(`SELECT id, name, description, start_date AS startDate, end_date AS endDate,
                status, manager_id AS managerId, progress_percentage AS progressPercentage,
                created_at AS createdAt
           FROM projects
           WHERE id = $1`, [id]);
    }
    return this.schema.projects.find((project) => project.id === id);
  }

  async addProject(project: Omit<Project, 'id' | 'createdAt' | 'progressPercentage'>): Promise<Project> {
    if (pool) {
      const id = generateId('prj');
      const result = await pool.query<Project>(`INSERT INTO projects (id, name, description, start_date, end_date, status, manager_id, progress_percentage, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
         RETURNING id, name, description, start_date AS startDate, end_date AS endDate,
                   status, manager_id AS managerId, progress_percentage AS progressPercentage,
                   created_at AS createdAt`,
        [id, project.name, project.description, project.startDate, project.endDate, project.status, project.managerId]
      );
      return result.rows[0];
    }

    const id = generateId('prj');
    const newProject: Project = {
      ...project,
      id,
      progressPercentage: 0,
      createdAt: new Date().toISOString()
    };
    this.schema.projects.push(newProject);
    this.save();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | undefined> {
    if (pool) {
      const { setClause, values } = this.buildUpdateClause({
        name: updates.name,
        description: updates.description,
        start_date: updates.startDate,
        end_date: updates.endDate,
        status: updates.status,
        manager_id: updates.managerId,
        progress_percentage: updates.progressPercentage
      });
      if (setClause) {
        const sql = `UPDATE projects SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, name, description, start_date AS startDate, end_date AS endDate,
                     status, manager_id AS managerId, progress_percentage AS progressPercentage, created_at AS createdAt`;
        const result = await pool.query<Project>(sql, [...values, id]);
        return result.rows[0];
      }
      return this.getProjectById(id);
    }

    const index = this.schema.projects.findIndex((project) => project.id === id);
    if (index === -1) return undefined;
    const updatedProject = {
      ...this.schema.projects[index],
      ...updates
    };
    this.schema.projects[index] = updatedProject;
    this.save();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (pool) {
      const project = await this.getProjectById(id);
      if (!project) return false;
      await pool.query('DELETE FROM project_members WHERE project_id = $1', [id]);
      await pool.query('DELETE FROM task_comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)', [id]);
      await pool.query('DELETE FROM task_attachments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)', [id]);
      await pool.query('DELETE FROM tasks WHERE project_id = $1', [id]);
      await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      return true;
    }

    const index = this.schema.projects.findIndex((project) => project.id === id);
    if (index === -1) return false;
    this.schema.projects.splice(index, 1);
    const taskIds = this.schema.tasks.filter((task) => task.projectId === id).map((task) => task.id);
    this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.projectId !== id);
    this.schema.tasks = this.schema.tasks.filter((task) => task.projectId !== id);
    this.schema.taskComments = this.schema.taskComments.filter((comment) => !taskIds.includes(comment.taskId));
    this.schema.taskAttachments = this.schema.taskAttachments.filter((attachment) => !taskIds.includes(attachment.taskId));
    this.save();
    return true;
  }

  async recalculateProjectProgress(projectId: string): Promise<void> {
    if (pool) {
      const row = await this.runOne<{ total: number; completed: number }>(`SELECT COUNT(*)::int AS total,
                SUM(CASE WHEN status = $2 THEN 1 ELSE 0 END)::int AS completed
           FROM tasks
           WHERE project_id = $1`, [projectId, TaskStatus.COMPLETED]);
      const total = row?.total ?? 0;
      const completed = row?.completed ?? 0;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      await this.updateProject(projectId, { progressPercentage: progress });
      return;
    }

    const projectTasks = this.schema.tasks.filter((task) => task.projectId === projectId);
    const progress = projectTasks.length === 0 ? 0 : Math.round((projectTasks.filter((task) => task.status === TaskStatus.COMPLETED).length / projectTasks.length) * 100);
    await this.updateProject(projectId, { progressPercentage: progress });
  }

  async getProjectMembers(projectId: string): Promise<string[]> {
    if (pool) {
      const rows = await this.runQuery<{ user_id: string }>('SELECT user_id FROM project_members WHERE project_id = $1', [projectId]);
      return rows.map((row) => row.user_id);
    }
    return this.schema.projectMembers.filter((member) => member.projectId === projectId).map((member) => member.userId);
  }

  async setProjectMembers(projectId: string, userIds: string[]): Promise<void> {
    if (pool) {
      await pool.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
      if (userIds.length > 0) {
        await Promise.all(userIds.map((uid) => pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', [projectId, uid])));
      }
      return;
    }

    this.schema.projectMembers = this.schema.projectMembers.filter((member) => member.projectId !== projectId);
    userIds.forEach((userId) => {
      this.schema.projectMembers.push({ projectId, userId });
    });
    this.save();
  }

  async getTasks(): Promise<Task[]> {
    if (pool) {
      return this.runQuery<Task>(`SELECT id, title, description, status, priority,
                COALESCE(assigned_user_id, '') AS "assignedUserId",
                project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
                estimated_hours AS "estimatedHours", created_by_id AS "createdById",
                updated_by_id AS "updatedById", created_at AS "createdAt",
                updated_at AS "updatedAt"
           FROM tasks`);
    }
    return [...this.schema.tasks];
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    if (pool) {
      return this.runOne<Task>(`SELECT id, title, description, status, priority,
                COALESCE(assigned_user_id, '') AS "assignedUserId",
                project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
                estimated_hours AS "estimatedHours", created_by_id AS "createdById",
                updated_by_id AS "updatedById", created_at AS "createdAt",
                updated_at AS "updatedAt"
           FROM tasks
           WHERE id = $1`, [id]);
    }
    return this.schema.tasks.find((task) => task.id === id);
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (pool) {
      const id = generateId('tsk');
      const now = new Date().toISOString();
      const result = await pool.query<Task>(`INSERT INTO tasks (id, title, description, status, priority, assigned_user_id, project_id, start_date, due_date, estimated_hours, created_by_id, updated_by_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, title, description, status, priority,
                   COALESCE(assigned_user_id, '') AS "assignedUserId",
                   project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
                   estimated_hours AS "estimatedHours", created_by_id AS "createdById",
                   updated_by_id AS "updatedById", created_at AS "createdAt",
                   updated_at AS "updatedAt"`,
        [
          id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.assignedUserId || null,
          task.projectId,
          task.startDate,
          task.dueDate,
          task.estimatedHours,
          task.createdById,
          task.updatedById,
          now,
          now
        ]
      );
      const addedTask = result.rows[0];
      await this.recalculateProjectProgress(task.projectId);
      return addedTask;
    }

    const id = generateId('tsk');
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.schema.tasks.push(newTask);
    this.save();
    await this.recalculateProjectProgress(task.projectId);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>): Promise<Task | undefined> {
    if (pool) {
      const { setClause, values } = this.buildUpdateClause({
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        assigned_user_id: updates.assignedUserId,
        start_date: updates.startDate,
        due_date: updates.dueDate,
        estimated_hours: updates.estimatedHours,
        created_by_id: updates.createdById,
        updated_by_id: updates.updatedById,
        updated_at: new Date().toISOString()
      });
      if (!setClause) {
        return this.getTaskById(id);
      }
      const sql = `UPDATE tasks SET ${setClause} WHERE id = $${values.length + 1} RETURNING id, title, description, status, priority,
                   COALESCE(assigned_user_id, '') AS "assignedUserId",
                   project_id AS "projectId", start_date AS "startDate", due_date AS "dueDate",
                   estimated_hours AS "estimatedHours", created_by_id AS "createdById",
                   updated_by_id AS "updatedById", created_at AS "createdAt",
                   updated_at AS "updatedAt"`;
      const result = await pool.query<Task>(sql, [...values, id]);
      const updated = result.rows[0];
      if (updated) {
        await this.recalculateProjectProgress(updated.projectId);
      }
      return updated;
    }

    const index = this.schema.tasks.findIndex((task) => task.id === id);
    if (index === -1) return undefined;

    const updatedTask = {
      ...this.schema.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    } as Task;
    this.schema.tasks[index] = updatedTask;
    this.save();
    await this.recalculateProjectProgress(updatedTask.projectId);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    if (pool) {
      const task = await this.getTaskById(id);
      if (!task) return false;
      await pool.query('DELETE FROM task_comments WHERE task_id = $1', [id]);
      await pool.query('DELETE FROM task_attachments WHERE task_id = $1', [id]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      await this.recalculateProjectProgress(task.projectId);
      return true;
    }

    const index = this.schema.tasks.findIndex((task) => task.id === id);
    if (index === -1) return false;
    const projectId = this.schema.tasks[index].projectId;
    this.schema.tasks.splice(index, 1);
    this.schema.taskComments = this.schema.taskComments.filter((comment) => comment.taskId !== id);
    this.schema.taskAttachments = this.schema.taskAttachments.filter((attachment) => attachment.taskId !== id);
    this.save();
    await this.recalculateProjectProgress(projectId);
    return true;
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    if (pool) {
      return this.runQuery<TaskComment>(`SELECT id, task_id AS "taskId", user_id AS "userId", user_full_name AS "userFullName",
                role, comment, created_at AS "createdAt"
           FROM task_comments
           WHERE task_id = $1
           ORDER BY created_at ASC`, [taskId]);
    }
    return this.schema.taskComments.filter((comment) => comment.taskId === taskId);
  }

  async addTaskComment(taskId: string, userId: string, comment: string): Promise<TaskComment | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    if (pool) {
      const id = generateId('cmt');
      const now = new Date().toISOString();
      const result = await pool.query<TaskComment>(`INSERT INTO task_comments (id, task_id, user_id, user_full_name, role, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, task_id AS "taskId", user_id AS "userId", user_full_name AS "userFullName",
                   role, comment, created_at AS "createdAt"`, [id, taskId, userId, user.fullName, user.role, comment, now]);
      return result.rows[0];
    }

    const newComment: TaskComment = {
      id: generateId('cmt'),
      taskId,
      userId,
      userFullName: user.fullName,
      role: user.role,
      comment,
      createdAt: new Date().toISOString()
    };
    this.schema.taskComments.push(newComment);
    this.save();
    return newComment;
  }

  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    if (pool) {
      return this.runQuery<TaskAttachment>(`SELECT id, task_id AS "taskId", user_id AS "userId", file_name AS "fileName",
                file_type AS "fileType", file_size AS "fileSize", file_url AS "fileUrl",
                created_at AS "createdAt"
           FROM task_attachments
           WHERE task_id = $1
           ORDER BY created_at ASC`, [taskId]);
    }
    return this.schema.taskAttachments.filter((attachment) => attachment.taskId === taskId);
  }

  async addTaskAttachment(taskId: string, userId: string, fileName: string, fileType: string, fileSize: number, fileUrl: string): Promise<TaskAttachment> {
    if (pool) {
      const id = generateId('att');
      const now = new Date().toISOString();
      const result = await pool.query<TaskAttachment>(`INSERT INTO task_attachments (id, task_id, user_id, file_name, file_type, file_size, file_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, task_id AS "taskId", user_id AS "userId", file_name AS "fileName",
                   file_type AS "fileType", file_size AS "fileSize", file_url AS "fileUrl",
                   created_at AS "createdAt"`, [id, taskId, userId, fileName, fileType, fileSize, fileUrl, now]);
      return result.rows[0];
    }

    const newAttachment: TaskAttachment = {
      id: generateId('att'),
      taskId,
      userId,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      createdAt: new Date().toISOString()
    };
    this.schema.taskAttachments.push(newAttachment);
    this.save();
    return newAttachment;
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    if (pool) {
      return this.runQuery<Notification>(`SELECT id, user_id AS "userId", message, type, is_read AS "isRead", created_at AS "createdAt"
           FROM notifications
           WHERE user_id = $1
           ORDER BY created_at DESC`, [userId]);
    }
    return this.schema.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addNotification(userId: string, message: string, type: Notification['type']): Promise<Notification> {
    if (pool) {
      const id = generateId('notif');
      const now = new Date().toISOString();
      const result = await pool.query<Notification>(`INSERT INTO notifications (id, user_id, message, type, is_read, created_at)
         VALUES ($1,$2,$3,$4,false,$5)
         RETURNING id, user_id AS "userId", message, type, is_read AS "isRead", created_at AS "createdAt"`, [id, userId, message, type, now]);
      return result.rows[0];
    }

    const notification: Notification = {
      id: generateId('notif'),
      userId,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.schema.notifications.push(notification);
    this.save();
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (pool) {
      const result = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
      return result.rowCount > 0;
    }

    const notification = this.schema.notifications.find((item) => item.id === id && item.userId === userId);
    if (!notification) return false;
    notification.isRead = true;
    this.save();
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (pool) {
      await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
      return;
    }
    this.schema.notifications.forEach((notification) => {
      if (notification.userId === userId) {
        notification.isRead = true;
      }
    });
    this.save();
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    if (pool) {
      return this.runQuery<ActivityLog>(`SELECT id, user_id AS "userId", user_full_name AS "userFullName", action, details, created_at AS "createdAt"
           FROM activity_logs
           ORDER BY created_at DESC`);
    }
    return [...this.schema.activityLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addActivityLog(userId: string, action: string, details: string): Promise<ActivityLog> {
    const user = await this.getUserById(userId);
    const userFullName = user ? user.fullName : 'System / Unknown';
    if (pool) {
      const id = generateId('act');
      const now = new Date().toISOString();
      const result = await pool.query<ActivityLog>(`INSERT INTO activity_logs (id, user_id, user_full_name, action, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, user_id AS "userId", user_full_name AS "userFullName", action, details, created_at AS "createdAt"`, [id, userId, userFullName, action, details, now]);
      return result.rows[0];
    }

    const log: ActivityLog = {
      id: generateId('act'),
      userId,
      userFullName,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    this.schema.activityLogs.push(log);
    if (this.schema.activityLogs.length > 500) {
      this.schema.activityLogs = this.schema.activityLogs
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 500);
    }
    this.save();
    return log;
  }

  async getDashboardStats(role: UserRole, userId: string): Promise<DashboardStats> {
    const allUsers = await this.getUsers();
    const allProjects = await this.getProjects();
    const allTasks = await this.getTasks();

    let targetProjects = allProjects;
    let targetTasks = allTasks;

    if (role === UserRole.PROJECT_MANAGER) {
      targetProjects = allProjects.filter((project) => project.managerId === userId);
      const projectIds = targetProjects.map((project) => project.id);
      targetTasks = allTasks.filter((task) => projectIds.includes(task.projectId));
    } else if (role === UserRole.TEAM_MEMBER) {
      const projectIds = await this.getProjectMembers(userId);
      targetProjects = allProjects.filter((project) => projectIds.includes(project.id));
      targetTasks = allTasks.filter((task) => task.assignedUserId === userId || projectIds.includes(task.projectId));
    }

    const totalProjects = targetProjects.length;
    const totalTasks = targetTasks.length;
    const completedTasks = targetTasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
    const pendingTasks = targetTasks.filter((task) => task.status === TaskStatus.PENDING).length;
    const inProgressTasks = targetTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
    const onHoldTasks = targetTasks.filter((task) => task.status === TaskStatus.ON_HOLD).length;
    const activeProjects = targetProjects.filter((project) => project.status === ProjectStatus.IN_PROGRESS || project.status === ProjectStatus.PLANNING).length;
    const completedProjects = targetProjects.filter((project) => project.status === ProjectStatus.COMPLETED).length;

    return {
      totalUsers: allUsers.length,
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      onHoldTasks,
      activeProjects,
      completedProjects
    };
  }
}

export const db = new Database();
