import { useState, useEffect, useMemo } from 'react';
import { X, Globe, Lock, Search, Check, Users, Loader2, Copy } from 'lucide-react';
import { User } from '../types';

interface VisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVisibility?: 'anyone' | 'restricted';
  currentAllowedViewers?: string[];
  allUsers: User[];
  currentUserId: string;
  onSave: (visibility: 'anyone' | 'restricted', allowedViewers: string[]) => Promise<void>;
}

export default function VisibilityModal({
  isOpen,
  onClose,
  currentVisibility = 'anyone',
  currentAllowedViewers = [],
  allUsers,
  currentUserId,
  onSave,
}: VisibilityModalProps) {
  const [visibility, setVisibility] = useState<'anyone' | 'restricted'>(currentVisibility);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentAllowedViewers);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' && currentUserId
    ? `${window.location.origin}/#/friends/${currentUserId}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync state when modal opens or initial values change
  useEffect(() => {
    setVisibility(currentVisibility || 'anyone');
    setSelectedIds(currentAllowedViewers || []);
    setSearchQuery('');
  }, [isOpen, currentVisibility, currentAllowedViewers]);

  // Filter out current user from selectable friends
  const otherUsers = useMemo(() => {
    return allUsers.filter((u) => u.id !== currentUserId);
  }, [allUsers, currentUserId]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return otherUsers;
    return otherUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
  }, [otherUsers, searchQuery]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(otherUsers.map((u) => u.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(visibility, visibility === 'restricted' ? selectedIds : []);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary-950/40 dark:bg-primary-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">Wishlist Visibility</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Control who is allowed to view your wishlist
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Options */}
          <div className="space-y-3">
            {/* Anyone Option */}
            <label
              onClick={() => setVisibility('anyone')}
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === 'anyone'
                  ? 'border-primary-800 dark:border-primary-200 bg-zinc-50 dark:bg-zinc-800/60 ring-1 ring-primary-800 dark:ring-primary-200'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="mt-0.5 rounded-full p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Globe className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    Everyone <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">(Default)</span>
                  </span>
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'anyone'}
                    onChange={() => setVisibility('anyone')}
                    className="h-4 w-4 text-primary-800 dark:text-primary-200 focus:ring-0"
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Anyone with your link can view your wishlist, even if they don't have an account.
                </p>
              </div>
            </label>

            {/* Public Link Box */}
            {visibility === 'anyone' && shareUrl && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-black dark:text-white">Public Wishlist Link</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 select-all">
                    {shareUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-primary-700 px-3 py-1.5 text-xs font-semibold text-black dark:text-white shadow-sm hover:bg-zinc-100 dark:hover:bg-primary-600 border border-zinc-200 dark:border-zinc-600 transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Restricted Option */}
            <label
              onClick={() => setVisibility('restricted')}
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === 'restricted'
                  ? 'border-primary-800 dark:border-primary-200 bg-zinc-50 dark:bg-zinc-800/60 ring-1 ring-primary-800 dark:ring-primary-200'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="mt-0.5 rounded-full p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    Only certain people
                  </span>
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'restricted'}
                    onChange={() => setVisibility('restricted')}
                    className="h-4 w-4 text-primary-800 dark:text-primary-200 focus:ring-0"
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Only the people you select from the list below can view your wishlist.
                </p>
              </div>
            </label>
          </div>

          {/* User Selection List (only active when restricted is selected) */}
          {visibility === 'restricted' && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  <Users className="h-3.5 w-3.5" />
                  Allowed People ({selectedIds.length})
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or username…"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 pl-10 pr-4 py-2 text-sm text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* List of people */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {filteredUsers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {otherUsers.length === 0
                      ? 'No other registered users yet.'
                      : 'No people match your search.'}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-zinc-100/60 dark:bg-zinc-800/40'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 shrink-0 uppercase">
                            {(user.name || user.username || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">
                              {user.name || user.username}
                            </p>
                            {user.name && user.username && user.name !== user.username && (
                              <p className="text-xs text-zinc-400 truncate">@{user.username}</p>
                            )}
                          </div>
                        </div>

                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary-800 border-primary-800 dark:bg-primary-200 dark:border-primary-200 text-white dark:text-black'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary-800 dark:bg-primary-200 px-4 py-2.5 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-sm hover:bg-primary-900 dark:hover:bg-primary-300 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
