import PocketBase from 'pocketbase';

const pb = new PocketBase(window.location.origin);

// Disable auto-cancellation so multiple requests can fire
pb.autoCancellation(false);

export default pb;
