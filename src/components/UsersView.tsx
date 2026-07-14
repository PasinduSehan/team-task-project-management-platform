import React, { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Trash2, Edit2, Search, ShieldCheck, Check, X, 
  Shield, AlertTriangle, Mail, Loader2, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';
import { api } from '../lib/api.js';
import { User, UserRole, UserStatus } from '../types.js';

interface UsersViewProps {
  currentUser: User;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [status, setStatus] = useState<UserStatus>(UserStatus.ACTIVE);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.users.list();
      setUsers(res);
    } catch (err: any) {
      console.error('Error loading users list', err);
      setError(err.message || 'Failed to retrieve the user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [currentUser]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg mx-auto space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Restriction</h3>
        <p className="text-sm text-slate-500">
          The User Directory module is exclusively restricted to the system **Administrator** security role.
        </p>
      </div>
    );
  }

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setEmail('');
    setPassword('');
    setFullName('');
    setRole(UserRole.TEAM_MEMBER);
    setStatus(UserStatus.ACTIVE);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (usr: User) => {
    setFormMode('edit');
    setEditingUserId(usr.id);
    setEmail(usr.email);
    setPassword(''); // Leave blank to skip password change
    setFullName(usr.fullName);
    setRole(usr.role);
    setStatus(usr.status);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (usr: User) => {
    if (usr.id === currentUser.id) {
      alert('You cannot deactivate your own active Administrator session.');
      return;
    }

    const nextStatus = usr.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    try {
      setLoading(true);
      await api.users.update(usr.id, { status: nextStatus });
      setUsers(prev => prev.map(u => u.id === usr.id ? { ...u, status: nextStatus } : u));
    } catch (err: any) {
      alert(err.message || 'Failed to modify account status.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'create' && !password) {
      alert('You must provide a password for new accounts.');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        email,
        fullName,
        role,
        status
      };
      if (password) payload.password = password;

      if (formMode === 'create') {
        await api.users.create(payload);
      } else if (editingUserId) {
        // Prevent demoting oneself
        if (editingUserId === currentUser.id && role !== UserRole.ADMIN) {
          alert('You cannot demote yourself from the Administrator security role.');
          setLoading(false);
          return;
        }
        await api.users.update(editingUserId, payload);
      }

      setIsFormOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to save account.');
      setLoading(false);
    }
  };

  const handleDeleteUser = async (usr: User) => {
    if (usr.id === currentUser.id) {
      alert('You cannot delete your own active administrator account!');
      return;
    }

    if (!confirm(`Are you absolutely sure you want to delete user "${usr.fullName}"? This will run a cascade clean, removing their project memberships and unassigning them from tasks!`)) {
      return;
    }

    try {
      setLoading(true);
      await api.users.delete(usr.id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
      setLoading(false);
    }
  };

  // Stats calculation
  const totalCount = users.length;
  const activeCount = users.filter(u => u.status === UserStatus.ACTIVE).length;
  const adminCount = users.filter(u => u.role === UserRole.ADMIN).length;
  const pmCount = users.filter(u => u.role === UserRole.PROJECT_MANAGER).length;
  const memberCount = users.filter(u => u.role === UserRole.TEAM_MEMBER).length;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            User Access & Roles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control platform roles, provision credentials, and manage team access states.
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-colors cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4" />
          Add User Account
        </button>
      </div>

      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Directory</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">{totalCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active State</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{activeCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrators</p>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">{adminCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proj Managers</p>
          <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">{pmCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
          <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono mt-1">{memberCount}</h3>
        </div>
      </div>

      {/* 2. Search & List Layout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs">
        <div className="flex items-center gap-3 mb-4.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>
          <button 
            onClick={loadUsers} 
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* User directory table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Full Name</th>
                <th className="p-4">Security Role</th>
                <th className="p-4 text-center">Status Toggle</th>
                <th className="p-4">Created On</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading Directory...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(usr => (
                  <tr key={usr.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-colors">
                    {/* Name & Email */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center text-white text-xs font-bold font-sans shrink-0 ${
                          usr.role === UserRole.ADMIN ? 'bg-indigo-600' :
                          usr.role === UserRole.PROJECT_MANAGER ? 'bg-blue-600' : 'bg-teal-600'
                        }`}>
                          {usr.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            {usr.fullName}
                            {usr.id === currentUser.id && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-mono font-medium shrink-0">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 font-sans truncate">{usr.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Tag */}
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        usr.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        usr.role === UserRole.PROJECT_MANAGER ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                        'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400'
                      }`}>
                        {usr.role}
                      </span>
                    </td>

                    {/* Status Toggle check */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(usr)}
                        disabled={usr.id === currentUser.id}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-xl cursor-pointer select-none transition-colors ${
                          usr.status === UserStatus.ACTIVE 
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                        title={usr.id === currentUser.id ? 'Protected administrator session' : 'Toggle Access Status'}
                      >
                        {usr.status === UserStatus.ACTIVE ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            Deactivated
                          </>
                        )}
                      </button>
                    </td>

                    {/* Created On */}
                    <td className="p-4 text-xs font-mono text-slate-400">
                      {new Date(usr.createdAt).toLocaleDateString()}
                    </td>

                    {/* Delete and Edit */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenEditForm(usr)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Modify Account"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr)}
                          disabled={usr.id === currentUser.id}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-30 cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 text-xs">
                    No matching user accounts discovered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Create / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/10">
              <h3 className="font-bold text-slate-900 dark:text-white font-sans">
                {formMode === 'create' ? 'Provision Team Account' : 'Modify Access Parameters'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Douglas Miller"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. douglas@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {formMode === 'create' ? 'Access Password' : 'New Password (Optional)'}
                </label>
                <input
                  type="password"
                  required={formMode === 'create'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={formMode === 'create' ? 'At least 6 characters' : 'Leave blank to retain current'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value={UserRole.ADMIN}>Administrator</option>
                  <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                  <option value={UserRole.TEAM_MEMBER}>Team Member</option>
                </select>
              </div>

              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Access Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value={UserStatus.ACTIVE}>Active</option>
                  <option value={UserStatus.INACTIVE}>Inactive (Deactivated)</option>
                </select>
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
                  {formMode === 'create' ? 'Provision User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
