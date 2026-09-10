# !!THIS GUIDE HAS NOT BEEN UPDATED AS THE REST OF THE PROJECT HAS BEWARE

# PocketBase Setup Guide

This document walks you through setting up PocketBase to work with the Wishlist app.

## 1. Download & Run PocketBase

```bash
# Download from https://pocketbase.io/docs/
# Extract and run:
./pocketbase serve
```

The Admin UI will be at `http://127.0.0.1:8090/_/`.

---

## 2. Disable "Email Required" for Users

1. Go to **Settings** → **Auth providers** in the Admin UI.
2. Click on the **users** collection.
3. Under **Auth options**, find **"Require email"** and **uncheck** it (toggle off).
4. Click **Save**.

This allows users to sign up with just a username and password.

---

## 3. Create the `wishlist_items` Collection

Go to **Collections** → **New collection** and create a collection with:

- **Name:** `wishlist_items`
- **Type:** Base collection

### Fields

| Field Name       | Type       | Required | Details                                    |
| ---------------- | ---------- | -------- | ------------------------------------------ |
| `title`          | Plain text | ✅ Yes   | Max length: 500                            |
| `url`            | URL        | No       |                                            |
| `image_url`      | URL        | No       | External image URL                         |
| `image`          | File       | No       | Max size: 5MB, Single, MIME types: images  |
| `price`          | Plain text | No       | Max length: 100                            |
| `notes`          | Plain text | No       | Max length: 2000                           |
| `priority_order` | Number     | No       | Default: 0                                 |
| `user`           | Relation   | ✅ Yes   | Related to `users`, single, cascade delete |
| `claimed_by`     | Relation   | No       | Related to `users`, single                 |

### Steps in the Admin UI

1. Click **"New collection"**
2. Name it `wishlist_items`
3. Add each field using the **"New field"** button
4. For `user` relation: Select `users` collection, set to **Single** relation, enable **Cascade delete**
5. For `claimed_by` relation: Select `users` collection, set to **Single** relation

---

## 4. API Rules (Permissions)

Set the following API rules on the `wishlist_items` collection. Go to the collection → **API Rules** tab.

### List / Search Rule

```
// Owner can view, or public lists, or restricted lists if current user is in allowed_viewers
@request.auth.id != "" && (user = @request.auth.id || user.visibility = "" || user.visibility = "anyone" || user.allowed_viewers ?= @request.auth.id)
```

### View Rule

```
@request.auth.id != "" && (user = @request.auth.id || user.visibility = "" || user.visibility = "anyone" || user.allowed_viewers ?= @request.auth.id)
```

### Create Rule

```
// Users can only create items for themselves
@request.auth.id != "" && user = @request.auth.id
```

### Update Rule

**Option A (Recommended - strict field checks):**

```
@request.auth.id != "" && (user = @request.auth.id || (claimed_by = "" && @request.body.claimed_by = @request.auth.id) || (claimed_by = @request.auth.id && @request.body.claimed_by = ""))
```

*(Note: In PocketBase API rules, incoming request body fields use `@request.body`, not `@request.data`)*

**Option B (Simple):**

```
@request.auth.id != ""
```

*(This allows any logged-in user to send updates, relying on our server-side hook in `pb_hooks/wishlist.pb.js` to protect against unauthorized modifications)*

### Delete Rule

```
// Only the owner can delete their items
@request.auth.id != "" && user = @request.auth.id
```

---

## 5. Users Collection Fields & API Rules

### Custom Fields on `users` Collection

To support the visibility feature, the `users` collection requires two fields:

1. **`visibility`**: Type `Select` with options `anyone` and `restricted` (Max Select: 1)
2. **`allowed_viewers`**: Type `Relation` pointing to `users` collection (Allow multiple)

*(If you run `node create_collection.mjs`, these fields are automatically added for you)*

### Users Collection API Rules

By default PocketBase locks down the `users` collection. You need to allow logged-in users to list other users so the "Everyone's Wishlists" and friends selection views work.

Go to the `users` collection → **API Rules**:

### List / Search Rule

```
@request.auth.id != ""
```

### View Rule

```
@request.auth.id != ""
```

Leave **Create**, **Update**, and **Delete** as default (managed by PocketBase auth).

---

## 6. Build & Deploy the Frontend

```bash
# Install dependencies
npm install

# Build the production bundle
npm run build

# The output will be in dist/
# Copy it into PocketBase's pb_public directory:
cp -r dist/* /path/to/pocketbase/pb_public/

# Or via scp to a remote server:
scp -r dist/* user@server:/path/to/pocketbase/pb_public/
```

PocketBase will serve the static files from `pb_public/` automatically at the root URL.

---

## 7. Development Mode

During development, run both PocketBase and Vite dev server:

```bash
# Terminal 1: Start PocketBase
./pocketbase serve

# Terminal 2: Start Vite dev server (proxies API to PocketBase)
npm run dev
```

The Vite config includes a proxy that forwards `/api` and `/_` requests to PocketBase at `http://127.0.0.1:8090`.

---

## Architecture Overview

```
┌──────────────┐       ┌─────────────────────┐
│   Browser    │──────▶│   PocketBase         │
│  (React App) │       │   :8090              │
│              │       │                      │
│  - Auth      │◀──────│  /api/... (REST API) │
│  - Wishlist  │       │  /_ (Admin UI)       │
│  - Friends   │       │  /* (pb_public SPA)  │
└──────────────┘       └─────────────────────┘
```
