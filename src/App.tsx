import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, RefreshCw, Globe, Lock } from 'lucide-react';
import pb from './lib/pocketbase';
import { fireConfetti, fireClaimConfetti } from './lib/confetti';
import { useToast } from './hooks/useToast';
import { useDarkMode } from './hooks/useDarkMode';
import { WishlistItem, User, ViewMode } from './types';

import AuthModal from './components/AuthModal';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import AddEditItemModal from './components/AddEditItemModal';
import VisibilityModal from './components/VisibilityModal';
import FriendGrid from './components/FriendGrid';
import EmptyState from './components/EmptyState';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  // ─── Auth ───
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid);
  const [currentUser, setCurrentUser] = useState<User | null>(
    pb.authStore.isValid ? (pb.authStore.record as unknown as User) : null
  );

  // ─── Navigation ───
  const [viewMode, setViewMode] = useState<ViewMode>('my-wishlist');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string | null>(null);

  // ─── Data ───
  const [myItems, setMyItems] = useState<WishlistItem[]>([]);
  const [friendItems, setFriendItems] = useState<WishlistItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Modals ───
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WishlistItem | null>(null);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  // ─── Toast ───
  const { toasts, addToast, removeToast } = useToast();

  // ─── Dark Mode ───
  const { isDark, toggle: toggleDark } = useDarkMode();

  // ─── Auth Handlers ───
  const handleAuthenticated = useCallback(() => {
    setIsLoggedIn(true);
    setCurrentUser(pb.authStore.record as unknown as User);
  }, []);

  const handleLogout = useCallback(() => {
    pb.authStore.clear();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setMyItems([]);
    setFriendItems([]);
    setAllUsers([]);
    setViewMode('my-wishlist');
    addToast('Logged out', 'info');
  }, [addToast]);

  // ─── Fetch My Items ───
  const fetchMyItems = useCallback(async () => {
    if (!currentUser) return;
    try {
      const records = await pb.collection('wishlist_items').getFullList<WishlistItem>({
        filter: `user = "${currentUser.id}"`,
        sort: 'priority_order',
      });
      setMyItems(records);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  }, [currentUser]);

  // ─── Fetch Friend Items ───
  const fetchFriendItems = useCallback(async (friendId: string) => {
    try {
      const records = await pb.collection('wishlist_items').getFullList<WishlistItem>({
        filter: `user = "${friendId}"`,
        sort: 'priority_order',
        expand: 'claimed_by',
      });
      setFriendItems(records);
    } catch (err) {
      console.error('Failed to fetch friend items:', err);
    }
  }, []);

  // ─── Fetch All Users ───
  const fetchAllUsers = useCallback(async () => {
    try {
      const records = await pb.collection('users').getFullList<User>({
        sort: 'username',
      });
      setAllUsers(records);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  // ─── Initial Data Load ───
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      setLoading(true);
      Promise.all([fetchMyItems(), fetchAllUsers()]).finally(() => setLoading(false));
    }
  }, [isLoggedIn, currentUser, fetchMyItems, fetchAllUsers]);

  // ─── Load friend items when navigating to friend wishlist ───
  useEffect(() => {
    if (viewMode === 'friend-wishlist' && selectedFriendId) {
      setLoading(true);
      fetchFriendItems(selectedFriendId).finally(() => setLoading(false));
    }
  }, [viewMode, selectedFriendId, fetchFriendItems]);

  // ─── Navigation ───
  const handleNavigate = useCallback((view: ViewMode) => {
    setViewMode(view);
    if (view !== 'friend-wishlist') {
      setSelectedFriendId(null);
      setSelectedFriendName(null);
    }
    if (view === 'community') {
      fetchAllUsers();
    }
  }, [fetchAllUsers]);

  const handleSelectFriend = useCallback((friendId: string, friendName: string) => {
    setSelectedFriendId(friendId);
    setSelectedFriendName(friendName);
    setViewMode('friend-wishlist');
  }, []);

  // ─── CRUD Operations ───
  const handleAddItem = useCallback(async (data: {
    title: string;
    url: string;
    image_url: string;
    price: string;
    notes: string;
  }) => {
    if (!currentUser) return;
    const maxOrder = myItems.reduce((max, item) => Math.max(max, item.priority_order || 0), 0);
    await pb.collection('wishlist_items').create({
      ...data,
      user: currentUser.id,
      priority_order: maxOrder + 1,
    });
    fireConfetti();
    addToast('Wish added! ✨', 'success');
    await fetchMyItems();
  }, [currentUser, myItems, fetchMyItems, addToast]);

  const handleEditItem = useCallback(async (data: {
    title: string;
    url: string;
    image_url: string;
    price: string;
    notes: string;
  }) => {
    if (!editingItem) return;
    await pb.collection('wishlist_items').update(editingItem.id, data);
    addToast('Wish updated!', 'success');
    setEditingItem(null);
    await fetchMyItems();
  }, [editingItem, fetchMyItems, addToast]);

  const handleDeleteItem = useCallback((item: WishlistItem) => {
    setDeletingItem(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    await pb.collection('wishlist_items').delete(deletingItem.id);
    addToast('Wish removed', 'info');
    setDeletingItem(null);
    await fetchMyItems();
  }, [deletingItem, fetchMyItems, addToast]);

  // ─── Reordering ───
  const handleMoveUp = useCallback(async (item: WishlistItem) => {
    const idx = myItems.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const prevItem = myItems[idx - 1];
    const currentOrder = item.priority_order;
    const prevOrder = prevItem.priority_order;
    await Promise.all([
      pb.collection('wishlist_items').update(item.id, { priority_order: prevOrder }),
      pb.collection('wishlist_items').update(prevItem.id, { priority_order: currentOrder }),
    ]);
    await fetchMyItems();
  }, [myItems, fetchMyItems]);

  const handleMoveDown = useCallback(async (item: WishlistItem) => {
    const idx = myItems.findIndex((i) => i.id === item.id);
    if (idx < 0 || idx >= myItems.length - 1) return;
    const nextItem = myItems[idx + 1];
    const currentOrder = item.priority_order;
    const nextOrder = nextItem.priority_order;
    await Promise.all([
      pb.collection('wishlist_items').update(item.id, { priority_order: nextOrder }),
      pb.collection('wishlist_items').update(nextItem.id, { priority_order: currentOrder }),
    ]);
    await fetchMyItems();
  }, [myItems, fetchMyItems]);

  // ─── Drag & Drop ───
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = myItems.findIndex((i) => i.id === active.id);
    const newIdx = myItems.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    // Collect all items in their new order
    const reordered = [...myItems];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);

    // Reassign priority_order values based on new positions
    const updates = reordered.map((item, idx) => {
      if (item.priority_order !== idx) {
        return pb.collection('wishlist_items').update(item.id, { priority_order: idx });
      }
      return null;
    }).filter(Boolean);

    await Promise.all(updates);
    await fetchMyItems();
  }, [myItems, fetchMyItems]);

  // ─── Claim / Unclaim ───
  const handleClaim = useCallback(async (item: WishlistItem) => {
    if (!currentUser) return;
    if (item.claimed_by) {
      addToast('This gift has already been claimed!', 'error');
      return;
    }
    try {
      await pb.collection('wishlist_items').update(item.id, { claimed_by: currentUser.id });
      fireClaimConfetti();
      addToast("You claimed this gift! 🎁", 'success');
      if (selectedFriendId) await fetchFriendItems(selectedFriendId);
    } catch {
      addToast('Failed to claim item. It may have already been claimed.', 'error');
      if (selectedFriendId) await fetchFriendItems(selectedFriendId);
    }
  }, [currentUser, selectedFriendId, fetchFriendItems, addToast]);

  const handleUnclaim = useCallback(async (item: WishlistItem) => {
    if (!currentUser) return;
    if (item.claimed_by !== currentUser.id) {
      addToast('You can only unclaim gifts you claimed!', 'error');
      return;
    }
    try {
      await pb.collection('wishlist_items').update(item.id, { claimed_by: '' });
      addToast('Gift unclaimed', 'info');
      if (selectedFriendId) await fetchFriendItems(selectedFriendId);
    } catch {
      addToast('Failed to unclaim gift', 'error');
      if (selectedFriendId) await fetchFriendItems(selectedFriendId);
    }
  }, [currentUser, selectedFriendId, fetchFriendItems, addToast]);

  // ─── Open Edit Modal ───
  const openEditModal = useCallback((item: WishlistItem) => {
    setEditingItem(item);
    setShowAddEditModal(true);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setShowAddEditModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowAddEditModal(false);
    setEditingItem(null);
  }, []);

  const handleSaveVisibility = useCallback(async (visibility: 'anyone' | 'restricted', allowedViewers: string[]) => {
    if (!currentUser) return;
    try {
      const updated = await pb.collection('users').update<User>(currentUser.id, {
        visibility,
        allowed_viewers: allowedViewers,
      });
      setCurrentUser(updated);
      addToast(
        visibility === 'restricted'
          ? `Visibility set to ${allowedViewers.length} ${allowedViewers.length === 1 ? 'person' : 'people'}`
          : 'Wishlist is now visible to everyone',
        'success'
      );
    } catch (err) {
      console.error('Failed to update visibility:', err);
      addToast('Failed to update visibility settings', 'error');
    }
  }, [currentUser, addToast]);

  // ─── Render Auth Screen ───
  if (!isLoggedIn) {
    return (
      <>
        <AuthModal onAuthenticated={handleAuthenticated} addToast={addToast} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // ─── Render Main App ───
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navbar
        username={currentUser?.username || ''}
        currentView={viewMode}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleDark={toggleDark}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ═══ My Wishlist ═══ */}
        {viewMode === 'my-wishlist' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">My Wishlist</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {myItems.length} {myItems.length === 1 ? 'wish' : 'wishes'} — drag or use arrows to prioritize
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 rounded-2xl bg-primary-800 dark:bg-primary-200 px-5 py-2.5 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-md hover:bg-primary-900 dark:hover:bg-primary-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Wish
                </button>
                <button
                  onClick={() => setShowVisibilityModal(true)}
                  className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors"
                  title="Change wishlist visibility"
                >
                  {currentUser?.visibility === 'restricted' ? (
                    <>
                      <Lock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Only certain people</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Everyone</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {myItems.length === 0 ? (
              <EmptyState type="my-wishlist" onAddItem={openAddModal} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={myItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {myItems.map((item, idx) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        isOwner={true}
                        currentUserId={currentUser?.id || ''}
                        onEdit={openEditModal}
                        onDelete={handleDeleteItem}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        isFirst={idx === 0}
                        isLast={idx === myItems.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {/* ═══ Community View ═══ */}
        {viewMode === 'community' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">Everyone's Wishlists</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Browse your friends' wishes and claim gifts
                </p>
              </div>
              <button
                onClick={() => fetchAllUsers()}
                className="rounded-xl p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {allUsers.filter((u) => u.id !== currentUser?.id).length === 0 ? (
              <EmptyState type="community" />
            ) : (
              <FriendGrid
                users={allUsers}
                currentUserId={currentUser?.id || ''}
                onSelectFriend={handleSelectFriend}
              />
            )}
          </>
        )}

        {/* ═══ Friend's Wishlist ═══ */}
        {viewMode === 'friend-wishlist' && selectedFriendId && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigate('community')}
                  className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-black dark:text-white">{selectedFriendName}'s Wishlist</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {friendItems.length} {friendItems.length === 1 ? 'wish' : 'wishes'} — claim a gift to mark it as yours
                  </p>
                </div>
              </div>
              <button
                onClick={() => selectedFriendId && fetchFriendItems(selectedFriendId)}
                className="rounded-xl p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {friendItems.length === 0 ? (
              <EmptyState type="friend-wishlist" friendName={selectedFriendName || undefined} />
            ) : (
              <div className="space-y-4">
                {friendItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isOwner={false}
                    currentUserId={currentUser?.id || ''}
                    onClaim={handleClaim}
                    onUnclaim={handleUnclaim}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-primary-600 dark:border-t-primary-300" />
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddEditItemModal
        isOpen={showAddEditModal}
        onClose={closeModal}
        onSave={editingItem ? handleEditItem : handleAddItem}
        editItem={editingItem}
        addToast={addToast}
      />

      {/* Visibility Settings Modal */}
      <VisibilityModal
        isOpen={showVisibilityModal}
        onClose={() => setShowVisibilityModal(false)}
        currentVisibility={currentUser?.visibility || 'anyone'}
        currentAllowedViewers={currentUser?.allowed_viewers || []}
        allUsers={allUsers}
        currentUserId={currentUser?.id || ''}
        onSave={handleSaveVisibility}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Delete this wish?"
        message={`"${deletingItem?.title}" will be permanently removed from your wishlist.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingItem(null)}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
