import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { 
  authenticateToken, 
  requireRole, 
  AuthenticatedRequest,
  generateToken
} from './server/auth.js';
import { 
  UserRole, UserStatus, 
  ProjectStatus, TaskStatus, TaskPriority 
} from './src/types.js';

const app = express();
const PORT = 3000;

// Enable JSON middleware with increased payload size for base64 file uploads
app.use(express.json({ limit: '10mb' }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  // Check if user exists
  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Email is already registered' });
    return;
  }

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // Add user as TEAM_MEMBER by default, status ACTIVE
  const newUser = await db.addUser({
    email,
    fullName,
    role: UserRole.TEAM_MEMBER,
    status: UserStatus.ACTIVE
  }, passwordHash);

  // Log activity
  await db.addActivityLog(newUser.id, 'User Registered', `New user registered: ${fullName} (${email})`);

  // Create notifications for admins
  const users = await db.getUsers();
  await Promise.all(
    users
      .filter(u => u.role === UserRole.ADMIN)
      .map(admin => db.addNotification(admin.id, `New user registration: ${fullName} (${email})`, 'System'))
  );

  // Generate Token
  const token = generateToken(newUser);

  res.status(201).json({ token, user: newUser });
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    res.status(400).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.status !== UserStatus.ACTIVE) {
    res.status(403).json({ error: 'Your account is deactivated. Contact an administrator.' });
    return;
  }

  const hash = await db.getPasswordHash(user.id);
  if (!hash || !bcrypt.compareSync(password, hash)) {
    res.status(400).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken(user);

  res.json({ token, user });
});

// Get Current User (Me)
app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response) => {
  const userPayload = (req as AuthenticatedRequest).user;
  if (!userPayload) {
    res.status(401).json({ error: 'User payload not found' });
    return;
  }
  const user = await db.getUserById(userPayload.id);
  if (!user) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }
  res.json(user);
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req: Request, res: Response) => {
  const userPayload = (req as AuthenticatedRequest).user!;
  const { fullName, email, password } = req.body;

  if (!fullName && !email && !password) {
    res.status(400).json({ error: 'At least one field must be provided to update' });
    return;
  }

  // Check unique email if updating email
  if (email && email.toLowerCase() !== userPayload.email.toLowerCase()) {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'Email is already taken' });
      return;
    }
  }

  const updates: any = {};
  if (fullName) updates.fullName = fullName;
  if (email) updates.email = email;

  let passwordHash: string | undefined;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    passwordHash = bcrypt.hashSync(password, salt);
  }

  const updatedUser = await db.updateUser(userPayload.id, updates, passwordHash);

  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await db.addActivityLog(userPayload.id, 'Profile Updated', `Updated profile information`);

  res.json(updatedUser);
});

// ==========================================
// USER DIRECTORY ENDPOINTS (Admin Protected for mutations)
// ==========================================

// Get all users
app.get('/api/users', authenticateToken, async (req: Request, res: Response) => {
  // Everyone authenticated can view user list (for assignments, etc.)
  res.json(await db.getUsers());
});

// Admin: Create user
app.post('/api/users', authenticateToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  const adminPayload = (req as AuthenticatedRequest).user!;
  const { email, password, fullName, role, status } = req.body;

  if (!email || !password || !fullName || !role) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Email is already taken' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = await db.addUser({
    email,
    fullName,
    role: role as UserRole,
    status: (status || UserStatus.ACTIVE) as UserStatus
  }, passwordHash);

  await db.addActivityLog(
    adminPayload.id, 
    'User Created', 
    `Administrator created user: ${fullName} as ${role}`
  );

  res.status(201).json(newUser);
});

// Admin: Edit user
app.put('/api/users/:id', authenticateToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  const adminPayload = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const { fullName, email, role, status, password } = req.body;

  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  // Prevent self-deactivation or self-demotion
  if (id === adminPayload.id) {
    if (status === UserStatus.INACTIVE) {
      res.status(400).json({ error: 'Administrators cannot deactivate themselves' });
      return;
    }
    if (role && role !== UserRole.ADMIN) {
      res.status(400).json({ error: 'Administrators cannot change their own security role' });
      return;
    }
  }

  if (email && email.toLowerCase() !== target.email.toLowerCase()) {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'Email already taken by another account' });
      return;
    }
  }

  const updates: any = {};
  if (fullName) updates.fullName = fullName;
  if (email) updates.email = email;
  if (role) updates.role = role as UserRole;
  if (status) updates.status = status as UserStatus;

  let newPasswordHash: string | undefined;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    newPasswordHash = bcrypt.hashSync(password, salt);
  }

  const updatedUser = await db.updateUser(id, updates, newPasswordHash);

  await db.addActivityLog(
    adminPayload.id,
    'User Modified',
    `Modified user account: ${target.fullName} (${updates.role || target.role})`
  );

  // Notify target user
  await db.addNotification(id, 'Your profile has been updated by an administrator.', 'System');

  res.json(updatedUser);
});

// Admin: Delete user
app.delete('/api/users/:id', authenticateToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  const adminPayload = (req as AuthenticatedRequest).user!;
  const { id } = req.params;

  if (id === adminPayload.id) {
    res.status(400).json({ error: 'Administrators cannot delete their own account' });
    return;
  }

  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await db.deleteUser(id);

  await db.addActivityLog(
    adminPayload.id,
    'User Deleted',
    `Deleted user account: ${target.fullName} (${target.email})`
  );

  res.json({ success: true, message: 'User deleted successfully' });
});

// ==========================================
// PROJECT MANAGEMENT ENDPOINTS
// ==========================================

// Get list of projects
app.get('/api/projects', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const allProjects = await db.getProjects();

  // Filter based on roles
  if (user.role === UserRole.ADMIN) {
    res.json(allProjects);
    return;
  }

  if (user.role === UserRole.PROJECT_MANAGER) {
    // PMs see projects they manage
    const pmProjects = allProjects.filter(p => p.managerId === user.id);
    res.json(pmProjects);
    return;
  }

  // Team Members see projects they are assigned to
  const memberProjects: typeof allProjects = [];
  for (const p of allProjects) {
    const members = await db.getProjectMembers(p.id);
    if (members.includes(user.id)) memberProjects.push(p);
  }
  res.json(memberProjects);
});

// Get detailed project with team members
app.get('/api/projects/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = await db.getProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const memberIds = await db.getProjectMembers(id);
  const users = await db.getUsers();
  const teamMembers = users.filter(u => memberIds.includes(u.id));

  res.json({
    ...project,
    teamMembers
  });
});

// Create project (Admin & PM only)
app.post('/api/projects', authenticateToken, requireRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER]), async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { name, description, startDate, endDate, managerId, teamMemberIds } = req.body;

  if (!name || !description || !startDate || !endDate) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // If Admin, they can assign a manager. If PM, they are the manager.
  const assignedManagerId = user.role === UserRole.ADMIN ? (managerId || user.id) : user.id;

  const newPrj = await db.addProject({
    name,
    description,
    startDate,
    endDate,
    status: ProjectStatus.PLANNING,
    managerId: assignedManagerId
  });

  // Set team members if provided
  if (teamMemberIds && Array.isArray(teamMemberIds)) {
    await db.setProjectMembers(newPrj.id, teamMemberIds);
    // Notify team members
    await Promise.all(teamMemberIds.map(id => db.addNotification(id, `You have been assigned to Project: ${name}`, 'System')));
  }

  await db.addActivityLog(user.id, 'Project Created', `Created project "${name}"`);

  res.status(201).json(newPrj);
});

// Update project (Admin & PM only)
app.put('/api/projects/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER]), async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const { name, description, startDate, endDate, status, managerId, teamMemberIds } = req.body;

  const project = await db.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Security guard: PMs can only edit their own projects
  if (user.role === UserRole.PROJECT_MANAGER && project.managerId !== user.id) {
    res.status(403).json({ error: 'Forbidden: You can only edit projects you manage' });
    return;
  }

  const updates: any = {};
  if (name) updates.name = name;
  if (description) updates.description = description;
  if (startDate) updates.startDate = startDate;
  if (endDate) updates.endDate = endDate;
  if (status) updates.status = status as ProjectStatus;
  if (managerId && user.role === UserRole.ADMIN) updates.managerId = managerId;

  const updatedPrj = await db.updateProject(id, updates);

  // Sync team members if provided
  if (teamMemberIds && Array.isArray(teamMemberIds)) {
    const oldMembers = await db.getProjectMembers(id);
    await db.setProjectMembers(id, teamMemberIds);

    // Notify newly added members
    const addedMembers = teamMemberIds.filter(mId => !oldMembers.includes(mId));
    await Promise.all(addedMembers.map(mId => db.addNotification(mId, `You have been added to Project: ${project.name}`, 'System')));
  }

  await db.addActivityLog(user.id, 'Project Updated', `Updated details for project "${project.name}"`);

  res.json(updatedPrj);
});

// Delete project (Admin & PM only)
app.delete('/api/projects/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER]), async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;

  const project = await db.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // PM restriction
  if (user.role === UserRole.PROJECT_MANAGER && project.managerId !== user.id) {
    res.status(403).json({ error: 'Forbidden: You can only delete projects you manage' });
    return;
  }

  await db.deleteProject(id);
  await db.addActivityLog(user.id, 'Project Deleted', `Deleted project and associated tasks: ${project.name}`);

  res.json({ success: true, message: 'Project deleted successfully' });
});

// ==========================================
// TASK MANAGEMENT ENDPOINTS
// ==========================================

// List all tasks (with robust filtering)
app.get('/api/tasks', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { projectId, assignedUserId, status, priority, search } = req.query;

  let tasks = await db.getTasks();

  // Role authorization filtering:
  if (user.role === UserRole.PROJECT_MANAGER) {
    // PMs see tasks from projects they manage
    const pmProjectIds = (await db.getProjects())
      .filter(p => p.managerId === user.id)
      .map(p => p.id);
    tasks = tasks.filter(t => pmProjectIds.includes(t.projectId));
  } else if (user.role === UserRole.TEAM_MEMBER) {
    // Team Members see tasks assigned to them, or tasks inside projects they are a member of
    const allProjects = await db.getProjects();
    const memberProjectIds: string[] = [];
    for (const p of allProjects) {
      const members = await db.getProjectMembers(p.id);
      if (members.includes(user.id)) memberProjectIds.push(p.id);
    }
    tasks = tasks.filter(t => t.assignedUserId === user.id || memberProjectIds.includes(t.projectId));
  }

  // URL Query Filters
  if (projectId) {
    tasks = tasks.filter(t => t.projectId === projectId);
  }
  if (assignedUserId) {
    tasks = tasks.filter(t => t.assignedUserId === assignedUserId);
  }
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  // Populate project name and user names for frontend convenience
  const populatedTasks = [] as any[];
  for (const t of tasks) {
    const prj = await db.getProjectById(t.projectId);
    const u = await db.getUserById(t.assignedUserId);
    populatedTasks.push({
      ...t,
      projectName: prj ? prj.name : 'Unknown Project',
      assignedUserFullName: u ? u.fullName : 'Unassigned',
      assignedUserRole: u ? u.role : null
    });
  }

  res.json(populatedTasks);
});

// Get task details
app.get('/api/tasks/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const task = await db.getTaskById(id);

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const prj = await db.getProjectById(task.projectId);
  const u = await db.getUserById(task.assignedUserId);

  res.json({
    ...task,
    projectName: prj ? prj.name : 'Unknown Project',
    assignedUserFullName: u ? u.fullName : 'Unassigned',
    assignedUserRole: u ? u.role : null
  });
});

// Create task (Admin & PM only)
app.post('/api/tasks', authenticateToken, requireRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER]), async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { title, description, priority, assignedUserId, projectId, startDate, dueDate, estimatedHours } = req.body;

  if (!title || !description || !priority || !projectId || !startDate || !dueDate) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  const prj = await db.getProjectById(projectId);
  if (!prj) {
    res.status(404).json({ error: 'Target project not found' });
    return;
  }

  // PM check
  if (user.role === UserRole.PROJECT_MANAGER && prj.managerId !== user.id) {
    res.status(403).json({ error: 'Forbidden: You can only add tasks to projects you manage' });
    return;
  }

  const newTask = await db.addTask({
    title,
    description,
    status: TaskStatus.PENDING,
    priority: priority as TaskPriority,
    assignedUserId: assignedUserId || '',
    projectId,
    startDate,
    dueDate,
    estimatedHours: Number(estimatedHours) || 0,
    createdById: user.id,
    updatedById: user.id
  });

  await db.addActivityLog(user.id, 'Task Created', `Created task "${title}" in project "${prj.name}"`);

  // Notify assigned user
  if (assignedUserId) {
    await db.addNotification(
      assignedUserId, 
      `You have been assigned to task: "${title}" in project: "${prj.name}"`, 
      'TaskAssigned'
    );
  }

  res.status(201).json(newTask);
});

// Update task (Admin, PM, or assigned Team Member)
app.put('/api/tasks/:id', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const { title, description, status, priority, assignedUserId, startDate, dueDate, estimatedHours } = req.body;

  const task = await db.getTaskById(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const prj = await db.getProjectById(task.projectId)!;

  // Authorization checks:
  // - Admin: can do anything
  // - PM: can edit if they manage the project
  // - Team Member: can ONLY update the task status if it is assigned to them
  const isManager = user.role === UserRole.ADMIN || (user.role === UserRole.PROJECT_MANAGER && prj.managerId === user.id);
  const isAssignee = task.assignedUserId === user.id;

  if (!isManager && !isAssignee) {
    res.status(403).json({ error: 'Forbidden: You do not have permissions to edit this task' });
    return;
  }

  const updates: any = {};
  updates.updatedById = user.id;

  if (isManager) {
    // Managers can edit everything
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (status) updates.status = status as TaskStatus;
    if (priority) updates.priority = priority as TaskPriority;
    if (startDate) updates.startDate = startDate;
    if (dueDate) updates.dueDate = dueDate;
    if (estimatedHours !== undefined) updates.estimatedHours = Number(estimatedHours) || 0;
    
    if (assignedUserId !== undefined && assignedUserId !== task.assignedUserId) {
      updates.assignedUserId = assignedUserId;
      // Notify new assignee
      if (assignedUserId) {
        await db.addNotification(
          assignedUserId, 
          `You have been assigned to task: "${title || task.title}"`, 
          'TaskAssigned'
        );
      }
    }
  } else {
    // Assigned team member can ONLY update progress status
    if (status) {
      updates.status = status as TaskStatus;
    } else {
      res.status(400).json({ error: 'Team members can only modify the task progress status' });
      return;
    }
  }

  const updatedTask = await db.updateTask(id, updates);

  // Trigger Notifications for status changes
  if (status && status !== task.status) {
    // Notify creator / manager if marked completed
    if (status === TaskStatus.COMPLETED) {
      await db.addNotification(
        task.createdById,
        `Task completed: "${task.title}" has been marked completed by ${user.fullName}`,
        'TaskCompleted'
      );
    }
    await db.addActivityLog(
      user.id, 
      'Task Status Updated', 
      `Updated task "${task.title}" status to ${status}`
    );
  } else {
    await db.addActivityLog(
      user.id, 
      'Task Modified', 
      `Modified details for task "${task.title}"`
    );
  }

  res.json(updatedTask);
});

// Delete task (Admin & PM only)
app.delete('/api/tasks/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.PROJECT_MANAGER]), async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;

  const task = await db.getTaskById(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const prj = await db.getProjectById(task.projectId)!;
  if (user.role === UserRole.PROJECT_MANAGER && prj.managerId !== user.id) {
    res.status(403).json({ error: 'Forbidden: You can only delete tasks inside projects you manage' });
    return;
  }

  await db.deleteTask(id);
  await db.addActivityLog(user.id, 'Task Deleted', `Deleted task: "${task.title}"`);

  res.json({ success: true, message: 'Task deleted successfully' });
});

// ==========================================
// COMMENTS ENDPOINTS
// ==========================================

// Get comments for task
app.get('/api/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response) => {
  const { taskId } = req.params;
  res.json(await db.getTaskComments(taskId));
});

// Add comment to task
app.post('/api/tasks/:taskId/comments', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { taskId } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim() === '') {
    res.status(400).json({ error: 'Comment content is required' });
    return;
  }

  const task = await db.getTaskById(taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const newComment = await db.addTaskComment(taskId, user.id, comment);

  // Notify other key players
  const prj = await db.getProjectById(task.projectId)!;
  const notifyTargets = new Set<string>();
  if (task.assignedUserId && task.assignedUserId !== user.id) notifyTargets.add(task.assignedUserId);
  if (task.createdById && task.createdById !== user.id) notifyTargets.add(task.createdById);
  if (prj.managerId && prj.managerId !== user.id) notifyTargets.add(prj.managerId);

  await Promise.all(Array.from(notifyTargets).map(targetId => db.addNotification(targetId, `${user.fullName} commented on task: "${task.title}"`, 'System')));

  res.status(201).json(newComment);
});

// ==========================================
// ATTACHMENTS (File upload) ENDPOINTS
// ==========================================

// Get attachments for task
app.get('/api/tasks/:taskId/attachments', authenticateToken, async (req: Request, res: Response) => {
  const { taskId } = req.params;
  res.json(await db.getTaskAttachments(taskId));
});

// Upload file (via Base64 payload)
app.post('/api/tasks/:taskId/attachments', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { taskId } = req.params;
  const { fileName, fileType, fileContent } = req.body; // fileContent is base64 string

  if (!fileName || !fileContent) {
    res.status(400).json({ error: 'File name and base64 file content are required' });
    return;
  }

  const task = await db.getTaskById(taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  try {
    // Generate clean file name to avoid directories/path exploits
    const cleanFileName = `${Date.now()}_${path.basename(fileName)}`;
    const filePath = path.join(UPLOADS_DIR, cleanFileName);
    
    // Extract base64 clean content
    const base64Data = fileContent.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to disk
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${cleanFileName}`;
    const fileSize = buffer.length;

    const attachment = await db.addTaskAttachment(
      taskId,
      user.id,
      fileName,
      fileType || 'application/octet-stream',
      fileSize,
      fileUrl
    );

    await db.addActivityLog(user.id, 'Attachment Uploaded', `Uploaded file "${fileName}" to task "${task.title}"`);

    res.status(201).json(attachment);
  } catch (err) {
    console.error('File write failure', err);
    res.status(500).json({ error: 'Failed to write upload file to server file storage' });
  }
});

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

// Get notification feed
app.get('/api/notifications', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  res.json(await db.getNotificationsForUser(user.id));
});

// Mark single read
app.put('/api/notifications/:id/read', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { id } = req.params;
  const success = await db.markNotificationRead(id, user.id);
  res.json({ success });
});

// Mark all read
app.put('/api/notifications/read-all', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  await db.markAllNotificationsRead(user.id);
  res.json({ success: true });
});

// ==========================================
// ACTIVITY LOG ENDPOINTS
// ==========================================

// Get audit trail
app.get('/api/activity-logs', authenticateToken, async (req: Request, res: Response) => {
  res.json(await db.getActivityLogs());
});

// ==========================================
// REPORTS & ANALYTICS ENDPOINTS
// ==========================================

// Get Dashboard aggregated charts and status
app.get('/api/reports/dashboard', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const stats = await db.getDashboardStats(user.role, user.id);

  // Return formatted chart datasets tailored for Recharts
  const projects = await db.getProjects();
  const tasks = await db.getTasks();

  // Filter project dataset for roles
  let filteredProjects = projects;
  let filteredTasks = tasks;
  if (user.role === UserRole.PROJECT_MANAGER) {
    filteredProjects = projects.filter(p => p.managerId === user.id);
    const pmPrjIds = filteredProjects.map(p => p.id);
    filteredTasks = tasks.filter(t => pmPrjIds.includes(t.projectId));
  } else if (user.role === UserRole.TEAM_MEMBER) {
    const memberPrjIds = await db.getProjectMembers(user.id);
    filteredProjects = projects.filter(p => memberPrjIds.includes(p.id));
    filteredTasks = tasks.filter(t => t.assignedUserId === user.id || memberPrjIds.includes(t.projectId));
  }

  // 1. Project progress series
  const projectProgressData = filteredProjects.map(p => ({
    name: p.name.length > 20 ? p.name.substr(0, 20) + '...' : p.name,
    progress: p.progressPercentage,
    status: p.status
  }));

  // 2. Task status totals
  const taskStatusData = [
    { name: 'Pending', count: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length },
    { name: 'In Progress', count: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Completed', count: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length },
    { name: 'On Hold', count: filteredTasks.filter(t => t.status === TaskStatus.ON_HOLD).length }
  ];

  // 3. Task priority series
  const taskPriorityData = [
    { name: 'Low', count: filteredTasks.filter(t => t.priority === TaskPriority.LOW).length },
    { name: 'Medium', count: filteredTasks.filter(t => t.priority === TaskPriority.MEDIUM).length },
    { name: 'High', count: filteredTasks.filter(t => t.priority === TaskPriority.HIGH).length },
    { name: 'Critical', count: filteredTasks.filter(t => t.priority === TaskPriority.CRITICAL).length }
  ];

  // 4. Team Workloads (task counts per user)
  const usersList = await db.getUsers();
  const teamWorkloadData = usersList
    .map(u => {
      const assignedCount = filteredTasks.filter(t => t.assignedUserId === u.id).length;
      return {
        name: u.fullName,
        tasks: assignedCount,
        role: u.role
      };
    })
    .filter(u => u.tasks > 0 || u.role === UserRole.TEAM_MEMBER);

  // 5. Recent Activities (limit 8)
  const allLogs = await db.getActivityLogs();
  let recentActivities = allLogs;
  if (user.role === UserRole.PROJECT_MANAGER) {
    // PMs see activities done by themselves or members in their projects
    const pmPrjIds = (await db.getProjects()).filter(p => p.managerId === user.id).map(p => p.id);
    const pmMemberIds = new Set<string>();
    for (const pid of pmPrjIds) {
      const members = await db.getProjectMembers(pid);
      members.forEach(mId => pmMemberIds.add(mId));
    }
    pmMemberIds.add(user.id);
    recentActivities = allLogs.filter(l => pmMemberIds.has(l.userId));
  } else if (user.role === UserRole.TEAM_MEMBER) {
    // Team member sees their own actions or actions on tasks they are assigned to
    recentActivities = allLogs.filter(l => l.userId === user.id);
  }
  const slicedActivities = recentActivities.slice(0, 8);

  res.json({
    stats,
    charts: {
      projectProgress: projectProgressData,
      taskStatus: taskStatusData,
      taskPriority: taskPriorityData,
      teamWorkload: teamWorkloadData
    },
    recentActivities: slicedActivities
  });
});

// ==========================================
// DEPLOYMENT VITE SERVER INTEGRATION
// ==========================================

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Project Platform booted successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Critical start failure:', err);
});
