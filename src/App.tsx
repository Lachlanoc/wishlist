import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, RefreshCw, Settings, LogIn, Gift, Sun, Moon, Lock, Share2 } from 'lucide-react';
import pb from './lib/pocketbase';
import { fireConfetti, fireClaimConfetti } from './lib/confetti';
import { useToast } from './hooks/useToast';
import { useDarkMode } from './hooks/useDarkMode';
import { useRouter } from './hooks/useRouter';
import { WishlistItem, User, ViewMode, ItemFormData } from './types';

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
  const {
    route,
    navigate,
    goBack,
    openModalWithHistory,
    closeModalWithHistory,
  } = useRouter();

  const viewMode = route.view;
  const selectedFriendId = route.view === 'friend-wishlist' ? route.friendId : null;
  const [selectedFriendName, setSelectedFriendName] = useState<string | null>(null);
  const [friendFetchError, setFriendFetchError] = useState<string | null>(null);

  // ─── Data ───
  const [myItems, setMyItems] = useState<WishlistItem[]>([]);
  const [friendItems, setFriendItems] = useState<WishlistItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // ─── Modals ───
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WishlistItem | null>(null);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    setItemCounts({});
    setSelectedFriendName(null);
    navigate('my-wishlist', undefined, { replace: true });
    addToast('Logged out', 'info');
  }, [navigate, addToast]);

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
    setFriendFetchError(null);
    try {
      const records = await pb.collection('wishlist_items').getFullList<WishlistItem>({
        filter: `user = "${friendId}"`,
        sort: 'priority_order',
        expand: pb.authStore.isValid ? 'claimed_by' : undefined,
      });
      setFriendItems(records);
    } catch (err) {
      console.error('Failed to fetch friend items:', err);
      setFriendFetchError('Unable to load wishlist');
      setFriendItems([]);
    }
  }, []);

  // ─── Fetch All Users ───
  const fetchAllUsers = useCallback(async () => {
    try {
      const userPromise = pb.collection('users').getFullList<User>({
        sort: 'username',
      });
      const itemsPromise = pb.collection('wishlist_items').getFullList<{ id: string; user: string }>({
        fields: 'id,user',
      }).catch(() => [] as { id: string; user: string }[]);

      const [userRecords, itemRecords] = await Promise.all([userPromise, itemsPromise]);
      setAllUsers(userRecords);

      const counts: Record<string, number> = {};
      for (const item of itemRecords) {
        if (item.user) {
          counts[item.user] = (counts[item.user] || 0) + 1;
        }
      }
      setItemCounts(counts);
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

  // ─── Load friend items & resolve username when navigating to friend wishlist ───
  useEffect(() => {
    if (route.view === 'friend-wishlist' && route.friendId) {
      setLoading(true);
      setFriendFetchError(null);
      fetchFriendItems(route.friendId).finally(() => setLoading(false));

      // Resolve friend's name
      const friend = allUsers.find((u) => u.id === route.friendId);
      if (friend) {
        setSelectedFriendName(friend.username);
      } else {
        pb.collection('users')
          .getOne<User>(route.friendId)
          .then((user) => setSelectedFriendName(user.username))
          .catch(() => setSelectedFriendName('Friend'));
      }
    } else {
      setSelectedFriendName(null);
      setFriendFetchError(null);
    }
  }, [route.view, route.friendId, allUsers, fetchFriendItems]);

  // ─── Refresh community users when viewing community ───
  useEffect(() => {
    if (route.view === 'community') {
      fetchAllUsers();
    }
  }, [route.view, fetchAllUsers]);

  // ─── Navigation ───
  const handleNavigate = useCallback(
    (view: ViewMode) => {
      navigate(view);
    },
    [navigate]
  );

  const handleSelectFriend = useCallback(
    (friendId: string, friendName: string) => {
      setSelectedFriendName(friendName);
      navigate('friend-wishlist', friendId);
    },
    [navigate]
  );

  // ─── CRUD Operations ───
  const handleAddItem = useCallback(async (data: ItemFormData) => {
    if (!currentUser) return;
    const maxOrder = myItems.reduce((max, item) => Math.max(max, item.priority_order || 0), 0);

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('url', data.url);
    formData.append('image_url', data.image_url);
    formData.append('price', data.price);
    formData.append('notes', data.notes);
    formData.append('user', currentUser.id);
    formData.append('priority_order', String(maxOrder + 1));

    if (data.imageFile) {
      formData.append('image', data.imageFile);
    }

    await pb.collection('wishlist_items').create(formData);
    fireConfetti();
    addToast('Wish added! ✨', 'success');
    await fetchMyItems();
  }, [currentUser, myItems, fetchMyItems, addToast]);

  const handleEditItem = useCallback(async (data: ItemFormData) => {
    if (!editingItem) return;

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('url', data.url);
    formData.append('image_url', data.image_url);
    formData.append('price', data.price);
    formData.append('notes', data.notes);

    if (data.imageFile) {
      formData.append('image', data.imageFile);
    } else if (data.clearExistingImage) {
      // Pass empty string to remove the file from PocketBase record
      formData.append('image', '');
    }

    await pb.collection('wishlist_items').update(editingItem.id, formData);
    addToast('Wish updated!', 'success');
    setEditingItem(null);
    await fetchMyItems();
  }, [editingItem, fetchMyItems, addToast]);

  const closeDeleteModal = useCallback(() => {
    setDeletingItem(null);
    closeModalWithHistory();
  }, [closeModalWithHistory]);

  const handleDeleteItem = useCallback(
    (item: WishlistItem) => {
      setDeletingItem(item);
      openModalWithHistory(() => {
        setDeletingItem(null);
      });
    },
    [openModalWithHistory]
  );

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    await pb.collection('wishlist_items').delete(deletingItem.id);
    addToast('Wish removed', 'info');
    closeDeleteModal();
    await fetchMyItems();
  }, [deletingItem, fetchMyItems, addToast, closeDeleteModal]);

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

  // ─── Modal Handlers with Back-Button Integration ───
  const openEditModal = useCallback(
    (item: WishlistItem) => {
      setEditingItem(item);
      setShowAddEditModal(true);
      openModalWithHistory(() => {
        setShowAddEditModal(false);
        setEditingItem(null);
      });
    },
    [openModalWithHistory]
  );

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setShowAddEditModal(true);
    openModalWithHistory(() => {
      setShowAddEditModal(false);
      setEditingItem(null);
    });
  }, [openModalWithHistory]);

  const closeModal = useCallback(() => {
    setShowAddEditModal(false);
    setEditingItem(null);
    closeModalWithHistory();
  }, [closeModalWithHistory]);

  const openVisibilityModal = useCallback(() => {
    setShowVisibilityModal(true);
    openModalWithHistory(() => {
      setShowVisibilityModal(false);
    });
  }, [openModalWithHistory]);

  const closeVisibilityModal = useCallback(() => {
    setShowVisibilityModal(false);
    closeModalWithHistory();
  }, [closeModalWithHistory]);

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

  const handleShareWishlist = useCallback(() => {
    if (!currentUser) return;
    const shareUrl = `${window.location.origin}/#/friends/${currentUser.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => addToast('Wishlist link copied to clipboard! 📋', 'success'))
        .catch(() => addToast('Failed to copy link', 'error'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        addToast('Wishlist link copied to clipboard! 📋', 'success');
      } catch {
        addToast('Failed to copy link', 'error');
      }
      document.body.removeChild(textArea);
    }
  }, [currentUser, addToast]);

  // ─── Public View Detection ───
  const isPublicView = !isLoggedIn && route.view === 'friend-wishlist';

  // ─── Render Auth Screen (unless viewing a public wishlist) ───
  if (!isLoggedIn && !isPublicView) {
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
      {isPublicView ? (
        <nav className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-lg text-black dark:text-white">
                <div className="rounded-xl bg-primary-800 dark:bg-primary-200 p-1.5">
                  <Gift className="h-5 w-5 text-primary-50 dark:text-primary-900" />
                </div>
                Wishlist
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDark}
                  className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary-800 dark:bg-primary-200 px-4 py-2 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-sm hover:bg-primary-900 dark:hover:bg-primary-300 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </nav>
      ) : (
        <Navbar
          username={currentUser?.username || ''}
          currentView={viewMode}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleDark={toggleDark}
        />
      )}

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ═══ My Wishlist ═══ */}
        {viewMode === 'my-wishlist' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">My Wishlist</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {myItems.length} {myItems.length === 1 ? 'wish' : 'wishes'} — drag or use arrows to prioritize
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 rounded-2xl bg-primary-800 dark:bg-primary-200 px-5 py-2.5 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-md hover:bg-primary-900 dark:hover:bg-primary-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Wish
                </button>
                <button
                  onClick={handleShareWishlist}
                  className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors"
                  title="Copy share link"
                >
                  <Share2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={openVisibilityModal}
                  className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors"
                  title={currentUser?.visibility === 'restricted' ? 'Only certain people' : 'Everyone'}
                >
                  <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="hidden sm:inline">
                    {currentUser?.visibility === 'restricted' ? 'Only certain people' : 'Everyone'}
                  </span>
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
                itemCounts={itemCounts}
                onSelectFriend={handleSelectFriend}
              />
            )}
          </>
        )}

        {/* ═══ Friend's Wishlist ═══ */}
        {viewMode === 'friend-wishlist' && selectedFriendId && (
          <>
            <div className="flex items-start sm:items-center justify-between gap-2 mb-8">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {!isPublicView && (
                  <button
                    onClick={() => goBack('community')}
                    className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors shrink-0 mt-0.5 sm:mt-0"
                    title="Back to Everyone's Lists"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white break-words">{selectedFriendName}'s Wishlist</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {isPublicView
                      ? `${friendItems.length} ${friendItems.length === 1 ? 'wish' : 'wishes'}`
                      : `${friendItems.length} ${friendItems.length === 1 ? 'wish' : 'wishes'} - claim a gift to indicate you're buying it (${selectedFriendName} can't see)`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => selectedFriendId && fetchFriendItems(selectedFriendId)}
                className="rounded-xl p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors shrink-0"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Sign-in banner for public viewers */}
            {isPublicView && (
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-900/30 px-5 py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Sign in to claim gifts and create your own wishlist
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary-800 dark:bg-primary-200 px-4 py-2 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-sm hover:bg-primary-900 dark:hover:bg-primary-300 transition-colors shrink-0"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </div>
            )}

            {friendFetchError ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="rounded-full bg-primary-100 dark:bg-primary-800 p-6 mb-6">
                  <Lock className="h-12 w-12 text-zinc-500 dark:text-primary-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-black dark:text-white mb-2">Wishlist not available</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
                  This wishlist may be private or does not exist.
                </p>
              </div>
            ) : friendItems.length === 0 ? (
              <EmptyState type="friend-wishlist" friendName={selectedFriendName || undefined} />
            ) : (
              <div className="space-y-4">
                {friendItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isOwner={false}
                    currentUserId={currentUser?.id || ''}
                    onClaim={isPublicView ? undefined : handleClaim}
                    onUnclaim={isPublicView ? undefined : handleUnclaim}
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
        onClose={closeVisibilityModal}
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
        onCancel={closeDeleteModal}
      />

      {/* Auth Modal overlay for public viewers */}
      {showAuthModal && (
        <AuthModal
          onAuthenticated={() => {
            setShowAuthModal(false);
            handleAuthenticated();
          }}
          addToast={addToast}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
