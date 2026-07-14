import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '../src/types.js';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'project-team-platform-super-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export function generateToken(user: { id: string; email: string; fullName: string; role: UserRole }): string {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Authentication Middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; fullName: string; role: UserRole };

    // Verify user still exists and is active
    const user = await db.getUserById(decoded.id as string);
    if (!user) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({ error: 'User account is deactivated' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired access token' });
  }
}

// Role Authorization Middleware Guard
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthenticated request' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}
