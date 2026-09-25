# Smart Vision Assistant: Rules

Product: mobile-first web app that helps visually impaired users understand their surroundings via camera + voice. Pipeline: camera frame -> Express API -> Gemini -> short text -> speech.

Stack: /client = React + Vite + TypeScript (strict) + Tailwind. /server = Node + Express + TypeScript. AI = Gemini vision API. Later phases: MongoDB Atlas, Firebase Auth, Vercel + Render.

Working rules:
- Build ONLY the phase I name, then stop and wait for me.
- Keep it minimal. No extra abstractions. No new dependencies unless required (say why).
- Don't rewrite working code. Read only the files you need.
- Secrets only in .env (commit .env.example). API keys never reach the frontend.
- Validate all inputs with zod. Centralized error handler. Never show raw model errors to users.
- Gemini model name comes from an env var.
- Use the browser Web Speech API for speech in/out. No paid speech service.
- Resize images client-side (~1024px JPEG) before upload.
- Don't implement OCR, object detection, auth, DB or YOLO until their phase.

Accessibility (every screen):
- Keyboard-operable, aria-labels, touch targets >= 64px, high contrast, state never by color alone.
- Buttons use plain text labels (icons decorative, aria-hidden). No emoji as labels.
- Speak confirmation when an action starts and finishes. Speech must start inside the user's click handler (iOS).
- Always-reachable Stop button: cancels speech and aborts in-flight requests (AbortController).

Safety wording:
- Never claim an area is safe. Use hedged language ("there appears to be...").
- No distances in meters; use relative terms (near, ahead, left, right).
- Say so when unsure. Show a first-run notice that this app does not replace a cane, guide dog or human help.

Response shape for AI endpoints:
{ success, intent, response, confidence, objects: [], text: string|null, error?: string }

End every phase with: what was built, files changed, how to run, env vars, manual test checklist, known issues.

Public-app rules:
- Real users, real phones: mobile-first, tested on an actual device.
- Guest mode is permanent for core vision features. Login is only for history and preferences.
- Never store images, base64 or video. Store only uid, intent, question, response, timestamps and preferences.
- Rate-limit all AI endpoints (per-IP for guests, per-user for signed-in) plus a global daily cap. Return friendly spoken errors on limits.
- Never use VITE_ variables for secrets. Secrets and service-account credentials stay server-side.
- Do not add YOLO, microservices, continuous frame analysis or a separate OCR service unless I explicitly request it.
- The app is an assistive aid, not a navigation or safety tool. Keep hedged wording everywhere.