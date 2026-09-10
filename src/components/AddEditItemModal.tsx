import { useState, useEffect, useRef } from 'react';
import {
  X,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  DollarSign,
  FileText,
  StickyNote,
  UploadCloud,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { WishlistItem, ItemFormData } from '../types';
import { fetchMetadata } from '../lib/metadata';
import { getSafeUrl, isSafeImageUrl, getItemImageUrl } from '../lib/url';

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ItemFormData) => Promise<void>;
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

  // Image Upload States
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [clearExistingImage, setClearExistingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(editItem?.url || '');
    setTitle(editItem?.title || '');
    setImageUrl(editItem?.image_url || '');
    setPrice(editItem?.price || '');
    setNotes(editItem?.notes || '');
    setImageFile(null);
    setClearExistingImage(false);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }

    if (editItem?.image) {
      setExistingImageUrl(getItemImageUrl(editItem));
      setImageMode('upload');
    } else if (editItem?.image_url) {
      setExistingImageUrl(null);
      setImageMode('url');
    } else {
      setExistingImageUrl(null);
      setImageMode('upload');
    }
  }, [editItem]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file (PNG, JPG, WebP, GIF, SVG)', 'error');
      return;
    }
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be under 5MB', 'error');
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setImageFile(file);
    setFilePreviewUrl(preview);
    setClearExistingImage(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setImageFile(null);
    setFilePreviewUrl(null);
    setImageUrl('');
    setClearExistingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
      if (meta.image && isSafeImageUrl(meta.image)) {
        setImageUrl(meta.image);
        if (!imageFile) {
          setImageMode('url');
          setClearExistingImage(false);
        }
      }
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
    if (imageMode === 'url' && imageUrl.trim()) {
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
        imageFile: imageMode === 'upload' ? imageFile : null,
        clearExistingImage: clearExistingImage || (imageMode === 'url' && !!finalImageUrl),
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
              <LinkIcon className="h-3.5 w-3.5" />
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

          {/* Image Section: Upload File or Image URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <ImageIcon className="h-3.5 w-3.5" />
                Item Image <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              {/* Tab Selector */}
              <div className="flex items-center rounded-xl bg-primary-100 dark:bg-primary-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    imageMode === 'upload'
                      ? 'bg-white dark:bg-primary-700 text-black dark:text-white shadow-sm font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <UploadCloud className="h-3 w-3" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    imageMode === 'url'
                      ? 'bg-white dark:bg-primary-700 text-black dark:text-white shadow-sm font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <LinkIcon className="h-3 w-3" />
                  Image URL
                </button>
              </div>
            </div>

            {/* Upload File Mode */}
            {imageMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Preview for newly selected file */}
                {filePreviewUrl ? (
                  <div className="relative rounded-2xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800/60 p-3 flex items-center gap-4">
                    <img
                      src={filePreviewUrl}
                      alt="Selected preview"
                      className="w-20 h-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {imageFile?.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {imageFile ? formatFileSize(imageFile.size) : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Change
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : existingImageUrl && !clearExistingImage ? (
                  /* Preview for existing uploaded image when editing */
                  <div className="relative rounded-2xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800/60 p-3 flex items-center gap-4">
                    <img
                      src={existingImageUrl}
                      alt="Current preview"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block rounded-md bg-primary-200 dark:bg-primary-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-200 mb-1">
                        Current Image
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Uploaded image from your wishlist
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Change
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dropzone when no image is selected */
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      isDragging
                        ? 'border-primary-600 bg-primary-100/50 dark:border-primary-400 dark:bg-primary-800/50'
                        : 'border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800/30 hover:border-primary-400 dark:hover:border-zinc-700 hover:bg-primary-100/30 dark:hover:bg-primary-800/50'
                    }`}
                  >
                    <div className="rounded-full bg-primary-100 dark:bg-primary-800 p-3 mb-2 text-primary-700 dark:text-primary-300">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-black dark:text-white text-center">
                      <span className="text-primary-700 dark:text-primary-300 underline underline-offset-2 font-semibold">
                        Click to upload
                      </span>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-center">
                      PNG, JPG, WebP, GIF or SVG (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Image URL Mode */}
            {imageMode === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setClearExistingImage(false);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-2.5 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
                />
                {imageUrl && isSafeImageUrl(imageUrl) && (
                  <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-36 bg-primary-100 dark:bg-primary-800 group">
                    <img
                      src={imageUrl}
                      alt="URL Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 rounded-lg bg-black/60 hover:bg-black/80 text-white p-1.5 backdrop-blur-sm transition-colors"
                      title="Clear image URL"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? 'Save Changes' : 'Add to Wishlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

