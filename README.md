# Graft: Collaborative Plugin Development Studio

> **Graft**: A web-based SaaS application for the structured development, governance, and version control of multi-platform plugins.

---

## Project Overview

Graft is a specialized development environment engineered to bring order to the plugin development lifecycle. It allows developers to scaffold, edit, and collaborate on plugins for major platforms—Chrome, VS Code, WordPress, Figma, Photoshop, and Minecraft—within a unified interface.

Unlike general-purpose version control systems, Graft enforces a strict governance model designed for plugin ecosystems. It implements append-only version history, explicit stability markers, and a request-to-edit workflow that ensures code integrity and clear ownership.

**Core Philosophy**: Graft is not a marketplace or a hosting provider. It is a **Collaborative Studio** that facilitates the creation and maintenance of plugin source code before it reaches public distribution channels.

## Key Features

- **Multi-Platform Scaffolding**: Automated generation of directory structures and manifest files for 6 supported plugin architectures.
- **Append-Only Versioning**: Linear, immutable version history. Every save operation creates a new, distinct version snapshot; no history rewriting or force-pushes are possible.
- **Stable Release Control**: Explicit "Mark Stable" functionality restricted to plugin owners, preventing accidental release of development builds.
- **Request-to-Edit Governance**: Non-owners must request edit access. Approved requests automatically trigger the creation of a **Fork**, isolating changes from the original codebase.
- **Marketplace Publish Tracking**: Database-level tracking of version stability and publication status, bridging the gap between internal development and external release.
- **Real-Time Collaboration**: Synchronized, multi-user editing with presence indicators, allowing teams to pair-program on plugin code in real-time.
- **Platform Capability Logic**: Context-aware system that differentiates between Full Preview, Partial Preview, and Template-Only support based on the target platform's constraints.
- **Activity Timeline**: Comprehensive audit log recording critical actions including creation, versioning, stability marking, forking, and publishing events.

## System Architecture

Graft is built as a high-performance, type-safe web application prioritizing data integrity and real-time state synchronization.

### Frontend

- **Next.js 14 (App Router)**: Server-side rendering and routing.
- **TypeScript**: Strict type enforcement across all components and utilities.
- **Tailwind CSS**: Utility-first styling for a clean, minimal UI.
- **Monaco Editor**: Integrated VS Code editor engine for syntax highlighting and code intelligence.

### Backend & Data

- **Supabase (PostgreSQL)**: Relational database for persistent storage.
- **Row Level Security (RLS)**: Application-layer logic enforcing ownership boundaries.
- **Y.js + WebSockets**: Decentralized Conflict-free Replicated Data Type (CRDT) engine for real-time text synchronization.
- **Y-Monaco Binding**: Bi-directional binding ensuring the editor state reflects the shared Y.js document.

## Database Schema

The comprehensive data model relies on four primary relational tables:

1.  **`plugins`**: Stores metadata (name, type, owner, creation date) and marketplace publication status.
2.  **`versions`**: An append-only log of file snapshots. Each row represents an immutable point in time.
3.  **`edit_requests`**: Manages the governance workflow, tracking requester status and linking to subsequent forks.
4.  **`activity_logs`**: An immutable audit trail recording all system events (Creation, Publishing, Forking, etc.).

## Versioning Model

Graft implements a linear, non-destructive versioning strategy:

- **Metadata Separation**: Plugin identity is stored separately from file contents.
- **Immutable Snapshots**: The `versions` table stores the actual file data. Once written, a version row is never mutated.
- **Stability Gates**: Only versions explicitly marked as "Stable" by the owner are eligible for identifying as "Published".
- **Concurrency Safety**: The editor enforces a new version increment (v1 -> v2) on every save, preventing accidental overwrites.

## Collaboration Model

Real-time collaboration is architected around **Y.js** and **WebSockets**:

- **Room Isolation**: Access is scoped by `plugin_id`, ensuring isolation between projects.
- **File-Level Sync**: Each file within a plugin has its own independent `Y.Text` binding, enabling simultaneous multi-file editing.
- **Manual Persistence**: While edits sync in real-time between connected clients, database persistence is manual. Users must explicitly "Save" to commit the shared state to a new immutable version row.

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/graft.git
    cd graft
    ```
2.  **Install Dependencies**
    ```bash
    npm install
    ```
3.  **Configure Environment**
    Create a `.env.local` file in the root directory:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
4.  **Initialize Database**
    Execute the provided SQL schema in your Supabase SQL Editor to create the necessary tables.
5.  **Start Development Server**
    ```bash
    npm run dev
    ```
    Access the application at `http://localhost:3000`.

## Demonstration Flow

To validate the system's full capability set:

1.  **Dashboard**: Observe the plugin grid and status badges.
2.  **Creation**: Scaffolding a "Minecraft Mod" plugin and inspecting the generated file structure.
3.  **Versioning**: Modifying a file, saving it, and verifying the creation of Version 2 in the history list.
4.  **Collaboration**: Opening the same plugin in a second browser window to demonstrate real-time cursor tracking and text sync.
5.  **Governance**: Simulating a non-owner user, requesting edit access, and as the owner, approving the request to trigger an automatic **Fork**.
6.  **Timeline**: Viewing the "Activity" section on the Plugin Details page to see the audit trail of all performed actions.

## Roadmap

- **Self-Hosted WebSocket Server**: Migration from public signalling to a private Hocuspocus instance.
- **Role-Based Access Control**: Implementation of granular permissions beyond simple Owner/Non-Owner.
- **Automated CI/CD**: Integration with GitHub Actions for automated testing of plugin code.
- **Plugin Analytics**: Dashboard for owners to track view counts and fork statistics.
- **AI Code Assistant**: Integration of LLMs for context-aware code suggestions within the editor.

## Technical Impact

**Graft** demonstrates the architecture of a complex **governance-focused SaaS application**. It moves beyond simple CRUD operations to implement **distributed state synchronization** (Y.js/WebSockets), **immutable data modeling** (Append-Only Versioning), and **hierarchical permission systems** (Request-to-Edit/Forking). The project highlights proficiency in designing systems where data integrity, auditability, and collaborative workflows are critical requirements.
