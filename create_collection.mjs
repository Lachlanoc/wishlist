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

        console.log("\nCreating 'wishlist_items' collection...");
        const collection = await pb.collections.create({
            name: "wishlist_items",
            type: "base",
            schema: [
                { name: "title", type: "text", required: true },
                { name: "url", type: "url" },
                { name: "image_url", type: "url" },
                { name: "price", type: "text" },
                { name: "notes", "type": "text" },
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
            listRule: "@request.auth.id != '' && (user = @request.auth.id || user.visibility = '' || user.visibility = 'anyone' || user.allowed_viewers ?= @request.auth.id)",
            viewRule: "@request.auth.id != '' && (user = @request.auth.id || user.visibility = '' || user.visibility = 'anyone' || user.allowed_viewers ?= @request.auth.id)",
            createRule: "@request.auth.id != '' && user = @request.auth.id",
            updateRule: "@request.auth.id != '' && (user = @request.auth.id || (claimed_by = '' && @request.body.claimed_by = @request.auth.id) || (claimed_by = @request.auth.id && @request.body.claimed_by = ''))",
            deleteRule: "@request.auth.id != '' && user = @request.auth.id"
        });

        console.log(`🎉 Success! Created 'wishlist_items' collection with API Rules enabled.`);
    } catch (err) {
        console.error("❌ Failed to create collection.");
        console.error("Error details:", JSON.stringify(err.response?.data || err.message, null, 2));
    }

    rl.close();
}

run();
