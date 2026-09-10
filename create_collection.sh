#!/bin/bash

# PocketBase Setup Script - Creating 'wishlist_items' collection
# Ensure your PocketBase server is running before executing this script!

PB_URL="http://127.0.0.1:8090"

echo "============================================="
echo " PocketBase 'wishlist_items' Creator "
echo "============================================="
read -p "Enter Admin Email: " ADMIN_EMAIL
read -s -p "Enter Admin Password: " ADMIN_PASS
echo ""

echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\", \"password\":\"$ADMIN_PASS\"}")

# Parse token without requiring jq
TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "Authentication failed! Please check your credentials or PocketBase server."
    exit 1
fi
echo "✅ Successfully authenticated."

echo "Fetching 'users' collection ID..."
USERS_ID=$(curl -s -X GET "$PB_URL/api/collections/users" \
  -H "Authorization: $TOKEN" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$USERS_ID" ]; then
    echo "❌ Could not find 'users' collection ID. Is PocketBase running?"
    exit 1
fi
echo "✅ Found users collection ID: $USERS_ID"

echo "Creating 'wishlist_items' collection..."

PAYLOAD=$(cat <<EOF
{
  "name": "wishlist_items",
  "type": "base",
  "schema": [
    { "name": "title", "type": "text", "required": true },
    { "name": "url", "type": "url" },
    { "name": "image_url", "type": "url" },
    { "name": "image", "type": "file", "maxSelect": 1, "maxSize": 5242880, "mimeTypes": ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"] },
    { "name": "price", "type": "text" },
    { "name": "notes", "type": "text" },
    { "name": "priority_order", "type": "number" },
    {
      "name": "user",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "$USERS_ID",
        "maxSelect": 1
      }
    },
    {
      "name": "claimed_by",
      "type": "relation",
      "options": {
        "collectionId": "$USERS_ID",
        "maxSelect": 1
      }
    }
  ],
  "listRule": "@request.auth.id != '' && (user = @request.auth.id || user.visibility = '' || user.visibility = 'anyone' || user.allowed_viewers ?= @request.auth.id)",
  "viewRule": "@request.auth.id != '' && (user = @request.auth.id || user.visibility = '' || user.visibility = 'anyone' || user.allowed_viewers ?= @request.auth.id)",
  "createRule": "@request.auth.id != '' && user = @request.auth.id",
  "updateRule": "@request.auth.id != '' && (user = @request.auth.id || (claimed_by = '' && @request.body.claimed_by = @request.auth.id) || (claimed_by = @request.auth.id && @request.body.claimed_by = ''))",
  "deleteRule": "@request.auth.id != '' && user = @request.auth.id"
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check if response contains an ID
NEW_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -n "$NEW_ID" ]; then
    echo "🎉 Success! Created 'wishlist_items' collection with API Rules enabled."
else
    echo "❌ Failed to create collection. PocketBase responded with:"
    echo "$CREATE_RESPONSE"
fi
