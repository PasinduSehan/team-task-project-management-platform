import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Shield, Calendar, Lock, Save, Loader2, AlertTriangle, 
  CheckCircle2, Sun, Moon, Sparkles, UserCircle
} from 'lucide-react';
import { api } from '../lib/api.js';
import { User as UserType } from '../types.js';

interface ProfileViewProps {
  currentUser: UserType;
  onProfileUpdated: (updatedUser: UserType) => void;
}

export default function ProfileView({ currentUser, onProfileUpdated }: ProfileViewProps) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('task_platform_theme') === 'dark';
  });

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('task_platform_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('task_platform_theme', 'light');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      setError('Please fill in Name and Email.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload: any = { fullName, email };
      if (password) payload.password = password;

      const updated = await api.auth.updateProfile(payload);
      onProfileUpdated(updated);
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Account Profile Summary Card */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
          {/* Subtle background visual */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-90" />

          <div className="relative pt-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-teal-600 border-4 border-white dark:border-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-teal-600/10 mb-3.5">
              {currentUser.fullName.charAt(0)}
            </div>

            <h3 className="font-extrabold text-slate-950 dark:text-white font-sans text-lg">{currentUser.fullName}</h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{currentUser.email}</p>
            
            <span className="mt-4 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-[10px] rounded-full uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>

          <div className="mt-6.5 pt-6.5 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 font-sans">Access Permission Level</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{currentUser.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 font-sans">Account Registered On</p>
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {new Date(currentUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Settings & Preferences Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Theme Preferences
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Toggle dark style aesthetics matching light preferences.</p>
          
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-2.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-sans">Dark UI Aesthetics</span>
            </div>
            
            <button
              onClick={toggleDarkMode}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${isDarkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column (2 of 3): Profile Credentials update form */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
        <h3 className="font-bold text-slate-900 dark:text-white font-sans text-base mb-1 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-indigo-600" />
          Profile Credentials
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Modify details, configure emails, or update accounts security passwords.</p>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Change Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to retain current"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-sans"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving updates...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Credentials
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
