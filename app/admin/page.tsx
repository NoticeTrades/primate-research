'use client';

import { useState } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  created_at: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Notify state
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyDesc, setNotifyDesc] = useState('');
  const [notifyLink, setNotifyLink] = useState('');
  const [notifyStatus, setNotifyStatus] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Bell notification state
  const [bellTitle, setBellTitle] = useState('');
  const [bellDesc, setBellDesc] = useState('');
  const [bellLink, setBellLink] = useState('');
  const [bellType, setBellType] = useState('update');
  const [bellStatus, setBellStatus] = useState('');
  const [bellSending, setBellSending] = useState(false);

  // Delete all notifications state
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // DB setup state
  const [dbStatus, setDbStatus] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unauthorized');
        return;
      }
      setUsers(data.users);
      setTotalUsers(data.total);
      setIsAuthed(true);
    } catch {
      setError('Failed to connect. Is DATABASE_URL configured?');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDb = async () => {
    setDbStatus('Setting up...');
    try {
      const res = await fetch('/api/db-setup');
      const data = await res.json();
      if (res.ok) {
        setDbStatus('Database tables created successfully!');
      } else {
        setDbStatus(`Error: ${data.error}`);
      }
    } catch {
      setDbStatus('Failed to connect to database.');
    }
  };

  const createBellNotification = async (title: string, description: string, link: string, type: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, link, type, secret }),
      });
    } catch {
      // silently fail — email is the primary channel
    }
  };

  const handleNotify = async () => {
    if (!notifyTitle.trim()) {
      setNotifyStatus('Title is required');
      return;
    }
    setNotifySending(true);
    setNotifyStatus('');
    try {
      // Always create a bell notification for new articles/reports
      await createBellNotification(
        notifyTitle.trim(),
        notifyDesc.trim(),
        notifyLink.trim() || '/research',
        'article'
      );

      // Optionally send email to all subscribers
      if (sendEmail) {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifyTitle.trim(),
            description: notifyDesc.trim(),
            secret,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setNotifyStatus(`Bell notification created + ${data.sent}/${data.total} emails sent.`);
        } else {
          setNotifyStatus(`Bell created, but email error: ${data.error}`);
        }
      } else {
        setNotifyStatus('Bell notification created (no emails sent).');
      }
      setNotifyTitle('');
      setNotifyDesc('');
      setNotifyLink('');
    } catch {
      setNotifyStatus('Failed to send notifications.');
    } finally {
      setNotifySending(false);
    }
  };

  const handleBellOnly = async () => {
    if (!bellTitle.trim()) {
      setBellStatus('Title is required');
      return;
    }
    setBellSending(true);
    setBellStatus('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bellTitle.trim(),
          description: bellDesc.trim(),
          link: bellLink.trim() || null,
          type: bellType,
          secret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBellStatus('Bell notification created!');
        setBellTitle('');
        setBellDesc('');
        setBellLink('');
      } else {
        setBellStatus(`Error: ${data.error}`);
      }
    } catch {
      setBellStatus('Failed to create notification.');
    } finally {
      setBellSending(false);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setDeleteStatus('Click again to confirm deletion');
      setTimeout(() => {
        setConfirmDelete(false);
        setDeleteStatus('');
      }, 4000);
      return;
    }
    setDeleting(true);
    setDeleteStatus('');
    setConfirmDelete(false);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteStatus(data.message);
      } else {
        setDeleteStatus(`Error: ${data.error}`);
      }
    } catch {
      setDeleteStatus('Failed to delete notifications.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Admin Dashboard</h1>
            </Link>
            <p className="text-zinc-500 mt-2 text-sm">Enter your NOTIFY_SECRET to access</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Admin secret key"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <button
              onClick={handleLogin}
              disabled={loading || !secret}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Checking...' : 'Access Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-400 mt-1">Manage subscribers and send notifications</p>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            ← Back to site
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Subscribers</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Database</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSetupDb}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Run Setup
              </button>
              {dbStatus && <span className="text-xs text-zinc-400">{dbStatus}</span>}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</p>
            <button
              onClick={refreshUsers}
              disabled={loading}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors mt-2"
            >
              {loading ? 'Refreshing...' : 'Refresh Users'}
            </button>
          </div>
        </div>

        {/* New Report / Article Notification */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">📢 New Report Notification</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Creates a bell notification for all users and optionally sends an email blast.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Report title (e.g. Weekly Market Outlook — 02/09/2026)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={notifyDesc}
              onChange={(e) => setNotifyDesc(e.target.value)}
              placeholder="Short description (shown in bell dropdown & email)"
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={notifyLink}
              onChange={(e) => setNotifyLink(e.target.value)}
              placeholder="Link (optional — e.g. /research or a PDF URL)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
              />
              Also send email to all {totalUsers} subscriber{totalUsers !== 1 ? 's' : ''}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNotify}
                disabled={notifySending || !notifyTitle.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
              >
                {notifySending ? 'Sending...' : 'Publish Notification'}
              </button>
              {notifyStatus && (
                <span className={`text-sm ${notifyStatus.startsWith('Error') || notifyStatus.startsWith('Bell created, but') ? 'text-yellow-400' : 'text-green-400'}`}>
                  {notifyStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bell-Only Notification */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">🔔 Bell-Only Notification</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Creates a notification that appears in the bell dropdown only (no email). Good for site updates, new features, etc.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={bellTitle}
              onChange={(e) => setBellTitle(e.target.value)}
              placeholder="Title (e.g. New feature: Video section is live!)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={bellDesc}
              onChange={(e) => setBellDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={bellLink}
              onChange={(e) => setBellLink(e.target.value)}
              placeholder="Link (optional — e.g. /videos)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center gap-3">
              <select
                value={bellType}
                onChange={(e) => setBellType(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="update">🟢 Update</option>
                <option value="article">🔵 Article</option>
                <option value="alert">⚪ General</option>
              </select>
              <button
                onClick={handleBellOnly}
                disabled={bellSending || !bellTitle.trim()}
                className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 text-white font-semibold rounded-lg transition-colors"
              >
                {bellSending ? 'Creating...' : 'Create Bell Notification'}
              </button>
              {bellStatus && (
                <span className={`text-sm ${bellStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {bellStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete All Notifications */}
        <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">🗑️ Delete All Notifications</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Permanently removes all bell notifications from the database. New users won&apos;t see any old notifications.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDeleteAllNotifications}
              disabled={deleting}
              className={`px-6 py-2.5 font-semibold rounded-lg transition-colors ${
                confirmDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white'
              } disabled:opacity-50`}
            >
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete All' : 'Delete All Notifications'}
            </button>
            {deleteStatus && (
              <span className={`text-sm ${deleteStatus.startsWith('Error') || deleteStatus.startsWith('Failed') ? 'text-red-400' : deleteStatus.startsWith('Click') ? 'text-yellow-400' : 'text-green-400'}`}>
                {deleteStatus}
              </span>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">Registered Users</h2>
          </div>
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500">
              No users have signed up yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left px-6 py-3 font-medium">#</th>
                    <th className="text-left px-6 py-3 font-medium">Name</th>
                    <th className="text-left px-6 py-3 font-medium">Email</th>
                    <th className="text-left px-6 py-3 font-medium">Username</th>
                    <th className="text-left px-6 py-3 font-medium">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-500">{i + 1}</td>
                      <td className="px-6 py-3 font-medium">{user.name}</td>
                      <td className="px-6 py-3 text-blue-400">{user.email}</td>
                      <td className="px-6 py-3 text-zinc-300">{user.username}</td>
                      <td className="px-6 py-3 text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

