import PocketBase from 'pocketbase';
import * as readline from 'readline';

const pb = new PocketBase('http://127.0.0.1:8090');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
    console.log("=============================================");
    console.log(" PocketBase 'wishlist_items' Node Creator ");
    console.log("=============================================");
    
    const email = await question("Enter Admin Email: ");
    const password = await question("Enter Admin Password: ");
    
    console.log("\nAuthenticating...");
    
    try {
        await pb.admins.authWithPassword(email, password);
        console.log("✅ Successfully authenticated as admin.");
    } catch (err) {
        console.error("❌ Authentication failed. Did you use an Admin account (not a regular user)?");
        console.error("Error details:", err.response?.message || err.message);
        rl.close();
        return;
    }

    try {
        console.log("\nFetching 'users' collection...");
        const usersCollection = await pb.collections.getOne('users');
        console.log(`✅ Found users collection ID: ${usersCollection.id}`);

        // Ensure users collection has visibility and allowed_viewers fields
        const fields = usersCollection.fields || usersCollection.schema || [];
        const fieldNames = fields.map(f => f.name);
        let fieldsUpdated = false;

        if (!fieldNames.includes('visibility')) {
            fields.push({ name: 'visibility', type: 'select', values: ['anyone', 'restricted'], maxSelect: 1 });
            fieldsUpdated = true;
        }
        if (!fieldNames.includes('allowed_viewers')) {
            fields.push({ name: 'allowed_viewers', type: 'relation', collectionId: usersCollection.id });
            fieldsUpdated = true;
        }

        if (fieldsUpdated) {
            console.log("Adding visibility fields to 'users' collection...");
            await pb.collections.update('users', {
                ...usersCollection,
                fields: fields,
            });
            console.log("✅ 'users' collection updated with visibility fields.");
        }

        console.log("\nChecking 'wishlist_items' collection...");
        let existingCollection = null;
        try {
            existingCollection = await pb.collections.getOne('wishlist_items');
        } catch {
            // Collection does not exist yet
        }

        const imageField = {
            name: "image",
            type: "file",
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
        };

        if (existingCollection) {
            console.log("Found existing 'wishlist_items' collection. Checking fields...");
            const itemFields = existingCollection.fields || existingCollection.schema || [];
            const itemFieldNames = itemFields.map(f => f.name);

            if (!itemFieldNames.includes('image')) {
                console.log("Adding 'image' file field to 'wishlist_items'...");
                itemFields.push(imageField);
                await pb.collections.update('wishlist_items', {
                    ...existingCollection,
                    fields: itemFields,
                });
                console.log("✅ 'wishlist_items' collection updated with 'image' file field.");
            } else {
                console.log("✅ 'wishlist_items' already has 'image' file field.");
            }
        } else {
            console.log("Creating 'wishlist_items' collection...");
            await pb.collections.create({
                name: "wishlist_items",
                type: "base",
                schema: [
                    { name: "title", type: "text", required: true },
                    { name: "url", type: "url" },
                    { name: "image_url", type: "url" },
                    imageField,
                    { name: "price", type: "text" },
                    { name: "notes", type: "text" },
                    { name: "priority_order", type: "number" },
                    {
                        name: "user",
                        type: "relation",
                        required: true,
                        options: {
                            collectionId: usersCollection.id,
                            maxSelect: 1
                        }
                    },
                    {
                        name: "claimed_by",
                        type: "relation",
                        options: {
                            collectionId: usersCollection.id,
                            maxSelect: 1
                        }
                    }
                ],
                listRule: "user.visibility = '' || user.visibility = 'anyone' || (@request.auth.id != '' && (user = @request.auth.id || user.allowed_viewers.id ?= @request.auth.id || user.allowed_viewers ~ @request.auth.id))",
                viewRule: "user.visibility = '' || user.visibility = 'anyone' || (@request.auth.id != '' && (user = @request.auth.id || user.allowed_viewers.id ?= @request.auth.id || user.allowed_viewers ~ @request.auth.id))",
                createRule: "@request.auth.id != '' && user = @request.auth.id",
                updateRule: "@request.auth.id != '' && (user = @request.auth.id || (claimed_by = '' && @request.body.claimed_by = @request.auth.id) || (claimed_by = @request.auth.id && @request.body.claimed_by = ''))",
                deleteRule: "@request.auth.id != '' && user = @request.auth.id"
            });
            console.log(`🎉 Success! Created 'wishlist_items' collection with API Rules enabled.`);
        }
    } catch (err) {
        console.error("❌ Failed to create/update collection.");
        console.error("Error details:", JSON.stringify(err.response?.data || err.message, null, 2));
    }

    rl.close();
}

run();
