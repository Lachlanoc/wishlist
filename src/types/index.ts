import PocketBase, { RecordModel } from 'pocketbase';

export interface User extends RecordModel {
  username: string;
  name: string;
  avatar: string;
  visibility?: 'anyone' | 'restricted';
  allowed_viewers?: string[];
}

export interface WishlistItem extends RecordModel {
  title: string;
  url: string;
  image_url: string;
  price: string;
  notes: string;
  priority_order: number;
  user: string;
  claimed_by: string;
  expand?: {
    user?: User;
    claimed_by?: User;
  };
}

export interface MetadataResponse {
  title?: string;
  image?: string;
  price?: string;
  description?: string;
}

export type ViewMode = 'my-wishlist' | 'community' | 'friend-wishlist';

export interface AppState {
  viewMode: ViewMode;
  selectedFriendId: string | null;
  selectedFriendName: string | null;
}
