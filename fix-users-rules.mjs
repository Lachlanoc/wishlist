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
    console.log(" PocketBase 'users' Collection Fixer ");
    console.log("=============================================");
    
    const email = await question("Enter Admin Email: ");
    const password = await question("Enter Admin Password: ");
    
    console.log("\nAuthenticating...");
    
    try {
        await pb.admins.authWithPassword(email, password);
        console.log("✅ Successfully authenticated as admin.");
    } catch (err) {
        console.error("❌ Authentication failed. Did you use an Admin account?");
        console.error("Error details:", err.response?.message || err.message);
        rl.close();
        return;
    }

    try {
        console.log("\nUpdating 'users' collection API rules...");
        const usersCollection = await pb.collections.getOne('users');
        
        await pb.collections.update('users', {
            ...usersCollection,
            listRule: "@request.auth.id != ''",
            viewRule: "@request.auth.id != ''",
        });

        console.log(`🎉 Success! Updated 'users' collection API Rules.`);
        console.log(`The 'Everyone's list' tab should now work!`);
    } catch (err) {
        console.error("❌ Failed to update collection.");
        console.error("Error details:", JSON.stringify(err.response?.data || err.message, null, 2));
    }

    rl.close();
}

run();
