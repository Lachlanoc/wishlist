/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks for Wishlist App security & privacy.
 */

// 1. Privacy Protection:
//    - Anonymous (unauthenticated) viewers: strip claimed_by entirely
//    - Owner viewing their own items: mask who claimed the gift (keep "claimed" so UI knows it's taken)
onRecordEnrich((e) => {
    try {
        const auth = e.requestInfo?.auth;

        // Anonymous viewer — strip claim info completely
        if (!auth) {
            e.record.set("claimed_by", "");
            const expanded = e.record.expand();
            if (expanded && expanded["claimed_by"]) {
                delete expanded["claimed_by"];
            }
        }
        // Owner viewing their own items — mask the claimer's identity
        else if (e.record && e.record.getString("user") === auth.id) {
            if (e.record.getString("claimed_by")) {
                // Keep it non-empty so the frontend knows it's claimed,
                // but mask the buyer's user ID so the owner cannot inspect who bought it.
                e.record.set("claimed_by", "claimed");
            }
            const expanded = e.record.expand();
            if (expanded && expanded["claimed_by"]) {
                delete expanded["claimed_by"];
            }
        }
    } catch (err) {
        console.error("Error in onRecordEnrich hook:", err);
    }
    e.next();
}, "wishlist_items");

// 2. Data Integrity: When non-owners update an item (to claim or unclaim it),
// ensure they can NEVER modify the wish title, price, url, image, notes, priority, or owner.
onRecordUpdateRequest((e) => {
    try {
        const auth = e.auth;
        if (auth && e.record && e.record.getString("user") !== auth.id) {
            const original = e.record.original();
            if (original) {
                e.record.set("title", original.getString("title"));
                e.record.set("price", original.getString("price"));
                e.record.set("url", original.getString("url"));
                e.record.set("image_url", original.getString("image_url"));
                e.record.set("image", original.getString("image"));
                e.record.set("notes", original.getString("notes"));
                e.record.set("priority_order", original.getInt("priority_order"));
                e.record.set("user", original.getString("user"));
            }
        }
    } catch (err) {
        console.error("Error in onRecordUpdateRequest hook:", err);
    }
    e.next();
}, "wishlist_items");
