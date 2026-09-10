import { User } from '../types';
import { Gift, ChevronRight } from 'lucide-react';

interface FriendGridProps {
  users: User[];
  currentUserId: string;
  itemCounts?: Record<string, number>;
  onSelectFriend: (userId: string, username: string) => void;
}

export default function FriendGrid({
  users,
  currentUserId,
  itemCounts = {},
  onSelectFriend,
}: FriendGridProps) {
  const friends = users.filter((u) => {
    if (u.id === currentUserId) return false;
    // If the friend restricted their wishlist, only show them if currentUserId is allowed
    if (u.visibility === 'restricted') {
      const allowed = Array.isArray(u.allowed_viewers) ? u.allowed_viewers : [];
      return allowed.includes(currentUserId);
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map((friend) => {
        const count = itemCounts[friend.id] ?? 0;

        return (
          <button
            key={friend.id}
            onClick={() => onSelectFriend(friend.id, friend.username)}
            className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-300 dark:bg-primary-900 dark:border-zinc-800 dark:hover:border-primary-600 transition-all text-left"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-lg font-bold text-white shrink-0 uppercase">
              {friend.username[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-black dark:text-white truncate">
                  {friend.username}
                </h3>
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 border border-primary-200/80 dark:border-primary-700/60 shrink-0"
                  title={`${count} ${count === 1 ? 'item' : 'items'}`}
                >
                  {count}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                View their wishlist
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary-300 group-hover:text-primary-500 dark:text-primary-600 dark:group-hover:text-primary-400 transition-all shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
