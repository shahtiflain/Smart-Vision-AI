# Smart Vision AI

A mobile-first web app that helps visually impaired users understand their surroundings via camera + voice.

## Running Locally on Mobile (HTTPS required)

To access the device camera (`getUserMedia`), modern browsers require a secure context (HTTPS). When running the development server locally, you won't be able to access the camera from your phone by just navigating to your computer's local IP (e.g. `http://192.168.1.X:5173`) because it's not HTTPS.

### Option 1: Local HTTPS with Vite (Recommended for Local Network)
You can use the `@vitejs/plugin-basic-ssl` plugin in your Vite config, or use `vite --host` with an HTTPS proxy like `localtunnel` or `ngrok`.

### Option 2: Using Ngrok (Easiest)
1. Install ngrok: `npm install -g ngrok`
2. Start the client: `cd client && npm run dev` (runs on 5173)
3. Start the server: `cd server && npm run dev` (runs on 3000)
4. Expose the client: `ngrok http 5173`
5. Open the `https://...ngrok-free.app` URL on your phone. The camera will now work!

*(Note: In production, the app will be hosted on a domain with HTTPS enabled automatically).*
