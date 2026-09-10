import { useState, useEffect } from 'react';
import { X, Link, Loader2, Sparkles, Image, DollarSign, FileText, StickyNote } from 'lucide-react';
import { WishlistItem } from '../types';
import { fetchMetadata } from '../lib/metadata';
import { getSafeUrl, isSafeImageUrl } from '../lib/url';

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    url: string;
    image_url: string;
    price: string;
    notes: string;
  }) => Promise<void>;
  editItem?: WishlistItem | null;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AddEditItemModal({
  isOpen,
  onClose,
  onSave,
  editItem,
  addToast,
}: AddEditItemModalProps) {
  const [url, setUrl] = useState(editItem?.url || '');
  const [title, setTitle] = useState(editItem?.title || '');
  const [imageUrl, setImageUrl] = useState(editItem?.image_url || '');
  const [price, setPrice] = useState(editItem?.price || '');
  const [notes, setNotes] = useState(editItem?.notes || '');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(editItem?.url || '');
    setTitle(editItem?.title || '');
    setImageUrl(editItem?.image_url || '');
    setPrice(editItem?.price || '');
    setNotes(editItem?.notes || '');
  }, [editItem]);

  if (!isOpen) return null;

  const handleFetchMetadata = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      addToast('Please enter a URL first', 'error');
      return;
    }
    const safe = getSafeUrl(trimmed);
    if (!safe) {
      addToast('Please enter a valid URL (http:// or https://)', 'error');
      return;
    }
    setUrl(safe.href);
    setFetching(true);
    addToast('Fetching details…', 'info');
    try {
      const meta = await fetchMetadata(safe.href);
      if (meta.title && !title) setTitle(meta.title.slice(0, 200));
      if (meta.image && !imageUrl && isSafeImageUrl(meta.image)) setImageUrl(meta.image);
      if (meta.price && !price) setPrice(meta.price.slice(0, 50));
      addToast('Details filled! Review and edit as needed.', 'success');
    } catch {
      addToast('Could not fetch details — fill them in manually.', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      addToast('Please add a title', 'error');
      return;
    }
    if (trimmedTitle.length > 200) {
      addToast('Title must be under 200 characters', 'error');
      return;
    }

    let finalUrl = '';
    if (url.trim()) {
      const safe = getSafeUrl(url.trim());
      if (!safe) {
        addToast('Please enter a valid product URL (http:// or https://)', 'error');
        return;
      }
      finalUrl = safe.href;
    }

    let finalImageUrl = '';
    if (imageUrl.trim()) {
      if (!isSafeImageUrl(imageUrl.trim())) {
        addToast('Please enter a valid image URL (http:// or https://)', 'error');
        return;
      }
      finalImageUrl = imageUrl.trim();
    }

    if (price.trim().length > 50) {
      addToast('Price must be under 50 characters', 'error');
      return;
    }

    if (notes.trim().length > 2000) {
      addToast('Notes must be under 2,000 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        url: finalUrl,
        image_url: finalImageUrl,
        price: price.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch {
      addToast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary-950/40 dark:bg-primary-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-900/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-primary-900/95 backdrop-blur-sm px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {editItem ? 'Edit Wish' : 'Add a Wish'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:text-zinc-700 hover:bg-primary-100 dark:text-primary-500 dark:hover:text-zinc-200 dark:hover:bg-primary-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              <FileText className="h-3.5 w-3.5" />
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="What do you want?"
              className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
            />
          </div>

          {/* Price */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Estimated Price <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49.99"
              className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
            />
          </div>

          {/* URL + Auto-fetch */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              <Link className="h-3.5 w-3.5" />
              Product URL <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://store.com/cool-thing"
                className="flex-1 rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={fetching || !url.trim()}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary-100 dark:bg-primary-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-primary-300 dark:border-zinc-800 hover:bg-primary-200 dark:hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Auto-Fetch
              </button>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              <Image className="h-3.5 w-3.5" />
              Image URL <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
            />
            {imageUrl && isSafeImageUrl(imageUrl) && (
              <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-32 bg-primary-100 dark:bg-primary-800">
                <img
                  src={imageUrl}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notes / Instructions <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Size L, blue color, available at Target…"
              className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-primary-300 dark:border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary-800 dark:bg-primary-100 px-4 py-3 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-md hover:bg-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {editItem ? 'Save Changes' : 'Add to Wishlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
