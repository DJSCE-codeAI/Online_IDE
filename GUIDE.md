# Browser IDE Guide

## Requirements

- Node.js 20 or newer and npm
- A Supabase project for cloud projects
- A Judge0 CE/self-hosted endpoint for Python, JavaScript, C, and C++ execution
- Chrome or Edge for local-folder mode

## Install and start

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Use `npm run lint`, `npx tsc --noEmit`, and `npm run build` for validation and production checks.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configure the browser-safe Supabase client. `JUDGE0_BASE_URL` and `JUDGE0_API_KEY` are read only by the server route. The optional `NEXT_PUBLIC_TERMINAL_WS_URL` must point to a sandboxed WebSocket service; it must not provide direct host shell access.

Do not commit `.env.local`. The public Supabase anon key is protected by database policies, but service-role keys and Judge0 credentials must never use a `NEXT_PUBLIC_` prefix.

## Supabase setup/schema

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. The included initial policies are open for this unauthenticated learning app. Add authentication and user-scoped RLS before production use.

Cloud project and file operations go through the Next.js API routes, which use the Supabase client on the server.

## Judge0 setup

Set `JUDGE0_BASE_URL` to Judge0 CE or your self-hosted endpoint. Set `JUDGE0_API_KEY` when the endpoint requires one. The `/api/run` route accepts the active filename, source, and stdin, then returns stdout, stderr, compilation output, status, time, and memory. Execution is limited to the language IDs in `src/lib/languageMap.ts`.

## How to use the IDE

Create a cloud project from the home page or choose **Open a Local Folder** in Chrome or Edge. Use the file explorer to create nested files and folders. Double-click a name to rename it, use the row actions to create children or delete it, and click files to open multiple tabs. Supported editor and runner files include `.py`, `.js`, `.c`, `.cpp`, `.jsx`, `.html`, and `.css`.

Use **Ctrl/Cmd+S** to save the active file. Select a runnable file and press **Run**. Enter optional stdin in the Console panel before running. The Preview panel inlines local HTML, CSS, and JavaScript into a sandboxed iframe; it does not grant the preview host access to the parent page.

## Local persistence and sync

Cloud project snapshots are cached in IndexedDB (`browser-ide`) after each server refresh, so a refresh can immediately restore the last local snapshot while Supabase is contacted for the current copy. File edits are autosaved to Supabase and the cache. Local-folder mode uses the browser File System Access API, stores the directory handle in IndexedDB, and writes directly to the selected folder after permission is restored.

## Terminal and preview setup

The terminal UI uses xterm.js. It is intentionally disconnected unless `NEXT_PUBLIC_TERMINAL_WS_URL` is configured. A terminal service must enforce authentication, command allowlists, resource limits, and a container or other sandbox. Never point it at an unrestricted host shell. Preview runs with `sandbox="allow-scripts allow-forms allow-modals allow-popups"` and only receives the selected project’s text assets.

## Troubleshooting

- **Supabase errors:** verify both public variables and run `supabase/schema.sql`.
- **Judge0 errors:** check the endpoint URL, API key, language availability, and server logs.
- **No local folder:** use Chrome or Edge and grant read/write permission again after a browser restart.
- **No preview:** add an `index.html` or another `.html` file.
- **Terminal disconnected:** configure a safe WebSocket service; the UI intentionally does not create a host terminal itself.
- **Build type errors:** remove `.next`, run `npm install`, then run `npx tsc --noEmit` and `npm run build` again.
