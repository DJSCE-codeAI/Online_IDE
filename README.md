# 🌐 Cloud & Local Online IDE

> A modern, browser-based development environment featuring multi-language code execution in secure Docker sandboxes, live sandboxed web previews, and dual-mode storage (Supabase Cloud + Local File System Access API).

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [How the Core Components Work](#-how-the-core-components-work)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup (Supabase)](#database-setup-supabase)
  - [Running the Execution Sandbox](#running-the-execution-sandbox)
  - [Running the Next.js Frontend](#running-the-nextjs-frontend)
- [Core Implementation Concepts for Mentees](#-core-implementation-concepts-for-mentees)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Roadmap: How to Build This From Scratch](#-roadmap-how-to-build-this-from-scratch)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

Building a browser-based IDE is one of the most rewarding full-stack engineering challenges. It sits at the intersection of:
- **Complex frontend state management** (nested file trees, multi-tab editors, unsaved state tracking).
- **Modern Web APIs** (the W3C File System Access API, IndexedDB, sandboxed `<iframe>` DOM manipulation).
- **Backend systems and security** (ephemeral Docker sandboxing, process confinement, resource limits, and network isolation).

This project demonstrates two complementary storage paradigms:
1. **Cloud Projects**: Backed by **Supabase (PostgreSQL)** with local snapshot caching via **IndexedDB (Dexie.js)** for instant responsiveness and offline survivability.
2. **Local Folder Mode**: Uses the native **File System Access API** to open, edit, and save files directly to the user's local disk without uploading anything to a server.

---

## ✨ Key Features

- **Monaco Code Editor**: Powered by VS Code's editor engine (`@monaco-editor/react`), supporting syntax highlighting, intelligent indentation, cursor tracking, and keyboard navigation.
- **Isolated Multi-Language Execution**: Run Python, JavaScript, JSX, TSX, C, and C++ safely. Every run executes inside a locked-down, ephemeral Docker container with stdin support and timeout limits.
- **Live Sandboxed Web Preview**: Instant preview of HTML/CSS/JavaScript projects. Automatically parses local stylesheets and scripts, bundles them in-memory, and renders them in an isolated `iframe` with responsive device views (Laptop, Tablet, Mobile).
- **Dual Workspace System**:
  - *Cloud Mode*: Persistent hierarchical project storage in PostgreSQL via Supabase.
  - *Local Mode*: Direct disk read/write access via Chrome/Edge File System Access API.
- **Offline & Cache Resilience**: IndexedDB caching ensures fast page reloads even before remote database queries resolve.
- **Embedded xterm.js Terminal**: Terminal UI integration ready to connect to any sandboxed WebSocket PTY daemon.
- **macOS-Inspired Design**: Resizable panels with width memory (`localStorage`), clean typography, custom modal dialogs, and native dark/light theme integration.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                   │
│                                                                        │
│  ┌───────────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │    File Tree      │    │  Monaco Editor  │    │  Output / Stdin  │  │
│  │ (Nested Explorer) │    │  (Multi-Tabs)   │    │ (Console/Status) │  │
│  └─────────┬─────────┘    └────────┬────────┘    └────────▲─────────┘  │
│            │                       │                      │            │
│            ▼                       ▼                      │            │
│     [State Coordinator: openFiles, activeId, dirty flags] │            │
│            │                                              │            │
│            ├──────────────────────┬───────────────────────┤            │
│            ▼                      ▼                       ▼            │
│     ┌──────────────┐      ┌───────────────┐      ┌─────────────────┐   │
│     │ Local Disk   │      │   IndexedDB   │      │ Preview Panel   │   │
│     │ (W3C FS API) │      │  (Dexie Cache)│      │(Isolated iframe)│   │
│     └──────────────┘      └───────────────┘      └─────────────────┘   │
└────────────┼──────────────────────────────────────────────▲────────────┘
             │ (Cloud Projects & Code Runs)                 │
             ▼                                              │
┌──────────────────────── Next.js 16 Backend ───────────────┼────────────┐
│                                                           │            │
│   GET/POST/DELETE /api/projects                           │            │
│   POST/PATCH/DELETE /api/files ──► Supabase (PostgreSQL)  │            │
│                                                           │            │
│   POST /api/run                                           │            │
│         │ (HTTP proxy)                                    │            │
│         ▼                                                 │            │
│   ┌──────────────────────────────────────────────┐        │            │
│   │   Executor Service (:4000)                  │        │            │
│   │   ┌────────────────────────────────────────┐ │        │            │
│   │   │ Docker Sandbox (isolated container)    │ │        │            │
│   │   │ • --network none    • --memory 128m    │ │        │            │
│   │   │ • --cpus 0.5        • --read-only      │ │────────┘            │
│   │   │ • --pids-limit 64   • user 1000:1000   │ │ (stdout / stderr)   │
│   │   │ • 5-second timeout  • 1MB output cap   │ │                     │
│   │   └────────────────────────────────────────┘ │                     │
│   └──────────────────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Full-stack framework, SSR, and API route handlers |
| **UI Library** | [React 19](https://react.dev/) | Client components, declarative state, hooks |
| **Editor** | [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) | Desktop-grade code editor powered by VS Code |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Semantic CSS variables, responsive design, dark mode |
| **Terminal** | [@xterm/xterm](https://xtermjs.org/) + [@xterm/addon-fit](https://www.npmjs.com/package/@xterm/addon-fit) | Web-based terminal emulator component |
| **Client Storage** | [Dexie.js](https://dexie.org/) | Type-safe IndexedDB wrapper for local caching |
| **Cloud Database** | [Supabase](https://supabase.com/) | Managed PostgreSQL database with Row Level Security |
| **Code Sandbox** | Docker + Node.js Microservice | Ephemeral containerized execution with strict resource limits |
| **Transpiler** | [esbuild](https://esbuild.github.io/) | Near-instant bundling and execution for JSX and TSX scripts |

---

## 📁 Repository Structure

```
├── .env.local.example         # Template for required environment variables
├── docker-compose.yml         # Container specification for the execution microservice
├── package.json               # Node.js dependencies and run scripts
├── tsconfig.json              # TypeScript configuration
├── executor/                  # Execution microservice
│   ├── Dockerfile             # Sandbox base image (Node 22, Python 3, GCC, G++, esbuild)
│   └── server.js              # HTTP server managing secure Docker sub-processes
├── supabase/
│   └── schema.sql             # SQL schema for projects and files tables + RLS policies
└── src/
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # Global HTML layout and Toast/Dialog provider wrappers
    │   ├── globals.css        # Theme variables, semantic design tokens, and editor styles
    │   ├── page.tsx           # Dashboard: list projects, create projects, open local folder
    │   ├── project/[id]/      # Cloud Project Workspace route
    │   │   └── page.tsx       # Core IDE coordinator for Supabase-backed projects
    │   ├── local/             # Local Folder Workspace route
    │   │   └── page.tsx       # Core IDE coordinator for File System Access API
    │   └── api/               # Serverless Route Handlers
    │       ├── projects/      # GET (list) / POST (create)
    │       │   └── [id]/      # GET (tree + project) / DELETE (remove project)
    │       ├── files/         # POST (create file/folder) / PATCH (update content/rename) / DELETE
    │       └── run/           # POST (dispatches code to the Docker executor service)
    ├── components/            # Reusable UI Components
    │   ├── Editor.tsx         # Monaco editor wrapper with theme and cursor listeners
    │   ├── FileTree.tsx       # Recursive hierarchical tree component with file actions
    │   ├── Tabs.tsx           # Open files tab bar with dirty indicators and close buttons
    │   ├── OutputPanel.tsx    # Run status, execution timing, stdin input, stdout/stderr display
    │   ├── PreviewPanel.tsx   # Sandboxed iframe with device frames (Phone, Tablet, Laptop)
    │   ├── TerminalPanel.tsx  # xterm.js terminal panel with WebSocket hooks
    │   ├── StatusBar.tsx      # Bottom status line (active file type, cursor line/col)
    │   ├── DialogProvider.tsx # Context provider for custom accessible alert/confirm/prompt modals
    │   ├── ToastProvider.tsx  # Context provider for non-blocking toast notifications
    │   └── icons.tsx          # SVG icon library
    └── lib/                   # Utilities & Shared Logic
        ├── types.ts           # TypeScript interfaces (Project, FileNode, TreeNode, WorkspaceNode)
        ├── supabase.ts        # Supabase JS client initializer
        ├── executor.ts        # Client helper for communicating with the executor service
        ├── languageMap.ts     # Maps extensions (.py, .js, .cpp) to editor & runner modes
        ├── previewFiles.ts    # Parses HTML and inlines CSS/JS into a self-contained string
        ├── localFs.ts         # Wrapper around the browser File System Access API
        ├── localDb.ts         # Dexie IndexedDB cache implementation
        ├── localHandleStore.ts# Persists FileSystemHandle in IndexedDB for session restore
        └── useResizableWidth.ts# Custom hook for draggable, localStorage-persisted panel splitters
```

---

## ⚙️ How the Core Components Work

### 1. Unified Workspace Tree (`WorkspaceNode`)
Both Cloud Projects (stored as rows in Supabase) and Local Folders (stored as files on your OS) implement the common `WorkspaceNode` interface:
```typescript
export interface WorkspaceNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: WorkspaceNode[];
}
```
Because the UI components (`FileTree`, `Tabs`, `Editor`) only depend on `WorkspaceNode`, the exact same UI seamlessly handles cloud and local files without separate component implementations.

### 2. The Multi-Language Sandbox (`executor/server.js`)
When you click **Run**:
1. The client sends `{ filename, content, stdin }` to `/api/run`.
2. Next.js determines the language runner from [languageMap.ts](src/lib/languageMap.ts) and forwards the request to `http://localhost:4000/execute`.
3. The executor creates a temporary directory in a shared Docker volume and writes the source file.
4. It launches an **ephemeral Docker container** with strict security flags:
   ```bash
   docker run --rm --init -i \
     --network none \
     --cpus 0.5 \
     --memory 128m \
     --pids-limit 64 \
     --read-only \
     --tmpfs /tmp:rw,exec,nosuid,size=64m \
     --cap-drop ALL \
     --security-opt no-new-privileges \
     --user 1000:1000 \
     --mount type=volume,source=executor-work,destination=/workspace,readonly \
     executor-sandbox:local sh -lc "<execution command>"
   ```
5. If the program runs longer than **5 seconds**, it is killed with `SIGKILL` and returns a `timeout` status.
6. Output is capped at **1 MB** to prevent buffer overflow attacks or infinite logging loops.

### 3. Zero-Server Sandboxed HTML Preview (`previewFiles.ts`)
Instead of spinning up a temporary HTTP server for static web projects, the IDE builds a self-contained HTML document completely in the browser:
- Reads the entry HTML file (e.g., `index.html`).
- Parses the HTML with `DOMParser`.
- Traverses `<link rel="stylesheet">` and `<script src="...">` tags.
- Replaces them with inline `<style>` and `<script>` elements matching local project files.
- Injects the resulting bundle into an `iframe` with `srcDoc` and restrictive sandbox permissions (`sandbox="allow-scripts allow-forms allow-modals allow-popups"`).

---

## 🚀 Getting Started

### Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (version 20 or newer) and `npm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2 supported)
- [Google Chrome](https://www.google.com/chrome/) or [Microsoft Edge](https://www.microsoft.com/edge) (required if using the **Local Folder** feature)

---

### Environment Configuration

1. Clone this repository and navigate to the project directory:
   ```bash
   git clone <repo-url>
   cd "collaborative IDE with VCS"
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.local.example .env.local
   # On Windows PowerShell:
   copy .env.local.example .env.local
   ```

3. Update `.env.local` with your configuration:
   ```env
   # Supabase credentials (from your Supabase project settings)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key

   # Docker executor URL (defaults to http://localhost:4000)
   EXECUTOR_URL=http://localhost:4000

   # Optional WebSocket URL for interactive terminal (leave blank to disable)
   NEXT_PUBLIC_TERMINAL_WS_URL=
   ```

---

### Database Setup (Supabase)

1. Create a free account at [Supabase](https://supabase.com) and start a new project.
2. Under **Project Settings > API**, copy your **Project URL** and **anon / public key** into `.env.local`.
3. Open the **SQL Editor** tab in your Supabase dashboard.
4. Copy and paste the contents of [supabase/schema.sql](supabase/schema.sql), then click **Run**:

```sql
create extension if not exists "pgcrypto";

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  parent_id   uuid references files(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('file', 'folder')),
  content     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists files_project_id_idx on files(project_id);
create index if not exists files_parent_id_idx on files(parent_id);

alter table projects enable row level security;
alter table files enable row level security;

create policy "allow all on projects" on projects for all using (true) with check (true);
create policy "allow all on files" on files for all using (true) with check (true);
```

---

### Running the Execution Sandbox

Start the execution container service using Docker Compose:

```bash
docker compose up --build -d
```

To verify that the executor service is healthy:
```bash
curl http://localhost:4000/health
# Response: {"ok":true}
```

To view logs if a code execution fails:
```bash
docker compose logs -f executor
```

To stop the executor when you're done:
```bash
docker compose down
```

---

### Running the Next.js Frontend

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

To run code quality and type checks:
```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

## 🧠 Core Implementation Concepts for Mentees

This repository was designed as an educational reference. Here are key patterns and techniques to study:

### 1. Sandboxing Untrusted Code (Principle of Least Privilege)
Allowing users to execute arbitrary code is dangerous. The backend protects the host machine through Defense-in-Depth:
- **`--network none`**: Prohibits any network access, preventing SSRF attacks, cryptomining calls, or botnet connections.
- **`--cpus 0.5` & `--memory 128m`**: Stops `while(true)` CPU spin locks and fork-bombs from exhausting host resources.
- **`--pids-limit 64`**: Restricts the maximum number of processes to prevent process-table exhaustion.
- **`--read-only` root filesystem**: The container cannot modify any system files; only a small `/tmp` tmpfs is writable for compiled binaries.
- **`--cap-drop ALL` & `--security-opt no-new-privileges`**: Strips all Linux capabilities and stops privilege escalation.
- **`--user 1000:1000`**: Code never runs as root.

### 2. Browser File System Access API
Look at [src/lib/localFs.ts](src/lib/localFs.ts) to learn how modern web applications can interact with the user's hard drive:
- `window.showDirectoryPicker()` prompts the user for folder permission.
- The `FileSystemDirectoryHandle` is stored in IndexedDB so the IDE can re-prompt for permission on next visit without needing the user to select the folder again.
- Files are saved directly to disk with `handle.createWritable()`.

### 3. Tree Reconstruction from Relational Data
Look at [src/lib/types.ts](src/lib/types.ts#L43-L66) (`buildTree`):
- In PostgreSQL, files and folders are stored flat with a `parent_id` foreign key referencing the parent file's `id`.
- `buildTree` converts this flat list into a recursive `TreeNode[]` in $O(N)$ time using a `Map<string, TreeNode>`, sorting folders before files alphabetically.

### 4. Debounced Auto-Save with Race-Condition Protection
Look at [src/app/project/[id]/page.tsx](src/app/project/[id]/page.tsx):
- As the user types, state updates immediately in React, marking `dirty: true`.
- A 900ms debounce timer is scheduled.
- To prevent a slow response from overwriting newer edits, the app passes the exact `fileId` to `saveFile(fileId)` rather than saving whatever file is currently active when the timer expires.
- Sequence counters (`loadSeq.current`) ensure stale network responses are discarded if a newer fetch completes first.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Notes |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save Active File | Triggers immediate persistence and clears the dirty indicator |
| <kbd>Alt</kbd> + <kbd>N</kbd> | New File | Opens modal to create a file at the project root |
| <kbd>Alt</kbd> + <kbd>W</kbd> | Close Active Tab | Confirms if unsaved changes exist |
| <kbd>Alt</kbd> + <kbd>B</kbd> | Toggle Sidebar | Shows / hides the file tree to maximize editor room |

*(Note: We use `Alt` combinations for navigation because browsers reserve shortcuts like `Ctrl+W` and `Ctrl+N` for browser tabs and windows).*

---

## 🗺 Roadmap: How to Build This From Scratch

If you want to build a similar project for your portfolio, follow this step-by-step milestone plan:

```
Phase 1: Editor & Layout (Frontend Foundation)
   ├── Setup Next.js with Tailwind CSS
   ├── Embed @monaco-editor/react with tab switching
   └── Implement custom resizable panel splitters using mouse events

Phase 2: Virtual File System & Cloud Persistence
   ├── Design PostgreSQL schema (projects and files tables with parent_id)
   ├── Write buildTree() to convert flat database records into a nested UI tree
   ├── Implement create, rename, and delete actions in Next.js Route Handlers
   └── Add IndexedDB caching with Dexie for offline speed

Phase 3: Native Local Folder Editing
   ├── Integrate window.showDirectoryPicker()
   ├── Recursively traverse DirectoryHandle entries
   └── Abstract file operations behind a unified WorkspaceNode interface

Phase 4: Docker Code Execution Sandbox
   ├── Create an isolated Dockerfile with compilers (gcc, python, node)
   ├── Build a Node.js microservice to spawn docker run with safety flags
   ├── Connect Next.js API /api/run to the executor microservice
   └── Support stdin, execution timing, and compiler error diagnostics

Phase 5: In-Browser Web Preview
   ├── Use DOMParser to parse HTML files
   ├── Recursively bundle local CSS (<link>) and JS (<script>) into inline tags
   └── Render inside a sandboxed <iframe> with viewport preset toggles

Phase 6: Collaboration & Real-Time Polish
   ├── Add Supabase Auth to restrict project access per user
   ├── Integrate Y.js or Supabase Realtime for collaborative multi-cursor editing
   └── Connect the xterm.js terminal to a WebSocket PTY container
```

---

## 🔧 Troubleshooting

### 1. "Missing NEXT_PUBLIC_SUPABASE_URL..."
- **Cause**: `.env.local` is missing or keys were not loaded.
- **Fix**: Copy `.env.local.example` to `.env.local` and restart the Next.js dev server (`npm run dev`).

### 2. "Executor failed: 502 / Connection Refused"
- **Cause**: The Docker container for the code executor is not running.
- **Fix**: Ensure Docker Desktop is open and run `docker compose up --build -d`. Verify with `curl http://localhost:4000/health`.

### 3. "Local folder editing needs Chrome or Edge"
- **Cause**: The browser does not support the Chromium-based W3C File System Access API (e.g., Firefox or Safari).
- **Fix**: Open the project in Google Chrome, Microsoft Edge, Brave, or Opera.

### 4. Code Execution Times Out
- **Cause**: Programs taking longer than 5 seconds (such as infinite loops or blocking input prompts without stdin) are terminated automatically.
- **Fix**: If your code requires user input (e.g., `input()` in Python or `scanf()` in C), enter the required input into the **Stdin** box in the Console panel before clicking **Run**.

---

## 📄 License

Distributed under the MIT License. Feel free to use this project as a template, reference, or starting point for your own cloud development tools!
