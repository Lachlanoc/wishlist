import {
  ExternalLink,
  ShoppingCart,
  StickyNote,
  GripVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Gift,
  ImageOff,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WishlistItem, User } from '../types';
import { getSafeUrl, getItemImageUrl } from '../lib/url';

interface ItemCardProps {
  item: WishlistItem;
  isOwner: boolean;
  currentUserId: string;
  onEdit?: (item: WishlistItem) => void;
  onDelete?: (item: WishlistItem) => void;
  onMoveUp?: (item: WishlistItem) => void;
  onMoveDown?: (item: WishlistItem) => void;
  onClaim?: (item: WishlistItem) => void;
  onUnclaim?: (item: WishlistItem) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ItemCard({
  item,
  isOwner,
  currentUserId,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onClaim,
  onUnclaim,
  isFirst,
  isLast,
}: ItemCardProps) {
  const isClaimed = !!item.claimed_by;
  const isClaimedByMe = item.claimed_by === currentUserId;
  const claimedByUser = item.expand?.claimed_by;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  const safeUrl = getSafeUrl(item.url);
  const itemImageUrl = getItemImageUrl(item);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border bg-primary-50/50 dark:bg-primary-900/30 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${ isClaimed && !isOwner ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/30' : 'border-zinc-200 dark:border-zinc-800' }`}
    >
      <div className="flex flex-row">
        {/* Reorder Controls (owner only) */}
        {isOwner && (
          <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => onMoveUp?.(item)}
              disabled={isFirst}
              className="rounded-lg p-1 text-zinc-500 hover:text-zinc-700 hover:bg-primary-100 dark:hover:text-primary-100 dark:hover:bg-primary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-primary-300 hover:text-primary-500 dark:text-primary-600 dark:hover:text-primary-400 touch-none"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <button
              onClick={() => onMoveDown?.(item)}
              disabled={isLast}
              className="rounded-lg p-1 text-zinc-500 hover:text-zinc-700 hover:bg-primary-100 dark:hover:text-primary-100 dark:hover:bg-primary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Image */}
        <div className="relative w-24 h-24 shrink-0 bg-primary-100 dark:bg-primary-800">
          {itemImageUrl ? (
            <img
              src={itemImageUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${itemImageUrl ? 'hidden' : ''}`}>
            <ImageOff className="h-8 w-8 text-primary-300 dark:text-primary-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Title + Price row */}
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-black dark:text-white truncate">{item.title || 'Untitled item'}</h3>
              {item.price && (
                <span className="shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">${item.price.replace(/^\$/, '')}</span>
              )}
            </div>
            {safeUrl && (
              <a
                href={safeUrl.href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors truncate max-w-full"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{safeUrl.hostname}</span>
              </a>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-primary-50 border border-zinc-200 dark:bg-primary-800 dark:border-zinc-800 px-2.5 py-1.5">
                <StickyNote className="h-3 w-3 text-zinc-500 dark:text-primary-500 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2">{item.notes}</p>
              </div>
            )}
          </div>

          {/* Claimed Status */}
          {isClaimed && (
            <div className="mt-1.5">
              {!isOwner && (
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {isClaimedByMe ? "You're getting this!" : `Claimed by ${claimedByUser?.username || 'someone'}`}
                  </span>
                </div>
              )}
              {isOwner && (
                <div className="flex items-center gap-1.5">
                  <Gift className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Someone is getting this for you! 🎁</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 px-3">
          {isOwner && (
            <>
              <button
                onClick={() => onEdit?.(item)}
                className="rounded-xl p-2 text-zinc-500 hover:text-zinc-700 hover:bg-primary-100 dark:hover:text-primary-100 dark:hover:bg-primary-800 transition-colors"
                title="Edit item"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete?.(item)}
                className="rounded-xl p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          {!isOwner && !isClaimed && (
            <button
              onClick={() => onClaim?.(item)}
              className="flex items-center gap-1.5 rounded-xl bg-primary-800 px-3.5 py-2 text-xs font-semibold text-primary-50 shadow-sm hover:bg-primary-900 dark:bg-primary-200 dark:text-primary-900 dark:hover:bg-primary-300 transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Claim Gift
            </button>
          )}

          {!isOwner && isClaimedByMe && (
            <button
              onClick={() => onUnclaim?.(item)}
              className="flex items-center gap-1.5 rounded-xl border border-primary-300 bg-primary-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-primary-100 dark:border-zinc-800 dark:bg-primary-800 dark:text-primary-200 dark:hover:bg-primary-700 transition-colors"
            >
              Unclaim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
