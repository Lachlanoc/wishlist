import { Gift, Users, ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  type: 'my-wishlist' | 'community' | 'friend-wishlist';
  friendName?: string;
  onAddItem?: () => void;
}

export default function EmptyState({ type, friendName, onAddItem }: EmptyStateProps) {
  const configs = {
    'my-wishlist': {
      icon: Gift,
      title: 'Your wishlist is empty',
      description: 'Start adding gifts you\u2019d love to receive! Add a link and we\u2019ll fetch the details for you.',
      action: onAddItem ? (
        <button
          onClick={onAddItem}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-800 px-6 py-3 text-sm font-semibold text-primary-50 shadow-md hover:bg-primary-900 dark:bg-primary-200 dark:text-primary-900 dark:hover:bg-primary-300 transition-colors"
        >
          <Gift className="h-4 w-4" />
          Add Your First Wish
        </button>
      ) : null,
    },
    community: {
      icon: Users,
      title: 'No friends yet',
      description: 'When other people sign up, they\u2019ll appear here so you can browse their wishlists.',
      action: null,
    },
    'friend-wishlist': {
      icon: ShoppingBag,
      title: `${friendName || 'This person'} hasn\u2019t added anything yet`,
      description: 'Check back later \u2014 they might be still deciding what to wish for!',
      action: null,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="rounded-full bg-primary-100 dark:bg-primary-800 p-6 mb-6">
        <Icon className="h-12 w-12 text-zinc-500 dark:text-primary-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{config.title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">{config.description}</p>
      {config.action}
    </div>
  );
}
