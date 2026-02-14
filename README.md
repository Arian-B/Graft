# Graft: Plugin Governance OS

> **Graft**: A governance-first development environment for building, versioning, and publishing plugins across Chrome, VS Code, WordPress, Figma, and Minecraft.

---

## Overview

Graft is a specialized development environment engineered to solve the fragmentation and governance challenges inherent in plugin development. Unlike general-purpose version control platforms, Graft enforces strict lifecycle management, append-only versioning, and platform-specific compliance from the initial scaffold.

The system provides a unified interface to scaffold, edit, and publish plugins while abstracting the complexities of fork management, ownership transfers, and marketplace submission requirements. It is designed for teams that require auditability and stability in their plugin ecosystems.

## Core Features

- **Multi-Platform Scaffolding**: Automated boilerplate generation for 6 major plugin architectures.
- **Append-Only Versioning**: Immutable version history ensures code integrity; history cannot be rewritten or force-pushed.
- **Stable Release Control**: Explicit "Mark Stable" workflows prevent accidental releases of development or beta code to production channels.
- **Request-to-Edit Governance**: Strict permissioning model where non-owners must request edit access, creating a verifiable audit trail.
- **Fork System**: Automated forking mechanism upon request approval preserves the integrity of the original codebase while enabling community contributions.
- **Marketplace Publish Tracking**: Database-level tracking of versions published to external marketplaces versus internal development builds.
- **Real-Time Collaboration**: Synchronized multi-cursor editing with user presence indicators, powered by Y.js CRDTs.
- **Platform Guidance System**: Context-aware validation logic advising developers on platform-specific limitations (e.g., "Partial Preview" capabilities for Chrome Extensions).

## System Architecture

Graft is architected as a high-performance web application prioritizing data integrity and real-time state synchronization.

### Frontend Stack

- **Next.js 14 (App Router)**: robust server-side rendering and routing architecture.
- **TypeScript**: Strict type safety enforced across the entire codebase.
- **Tailwind CSS**: Utility-first styling framework implementing a clean, accessible UI design system.
- **Monaco Editor**: Integration of the VS Code editor engine for a professional-grade coding experience.

### Backend & Data

- **Supabase (PostgreSQL)**: Relational database management for plugin metadata, version history, and governance logs.
- **Row Level Security (RLS)**: Application-layer security ensuring strict ownership boundaries and data privacy.

### Real-Time Layer

- **Y.js + WebSockets**: Decentralized state synchronization engine for collaborative editing.
- **Monaco Binding**: Bi-directional data binding typically used in enterprise-grade collaborative editors.

## Database Schema

The application logic relies on four primary relational tables:

1.  `plugins`: Stores metadata (name, type, owner) and marketplace publication status.
2.  `versions`: An append-only log of file states specific to each plugin. Each save operation creates a new immutable record.
3.  `edit_requests`: Manages the governance workflow for forking and merging access rights between users.
4.  `activity_logs`: An immutable audit trail recording all critical system actions including creation, publishing, and forking events.

## Versioning Strategy

Graft implements a linear, **Append-Only** model optimized for the specific needs of plugin development cycles, departing from traditional branching models.

- **Immutable History**: Committed versions are locked and cannot be modified.
- **Stable Tags**: Versions must be explicitly marked as "Stable" by the owner before they are eligible for publication.
- **Concurrency Safety**: The editor safeguards against overwrites by enforcing new version increments (v1 -> v2) on every save operation.

## Collaboration Layer

Real-time collaboration features are embedded directly into the editor interface:

- **Room Logic**: Plugin IDs serve as unique WebSocket channels.
- **Awareness**: User presence indicators notify active participants of new joins.
- **Conflict Resolution**: Utilization of Conflict-free Replicated Data Types (CRDTs) to handle concurrent edits without data loss.
- **File Sync**: The shared data model is keyed by filename, enabling simultaneous multi-file editing sessions.

## Marketplace Integration

Graft bridges the gap between internal development and public release channels.

- **Publish State**: The database tracks `marketplace_published` status and the specific `marketplace_version`.
- **Redirects**: Dynamic linking to external submission platforms (e.g., Chrome Web Store Dashboard).
- **Validation**: The interface restricts publishing of unstable versions, serving as an automated quality gate.

## Folder Structure

```
graft/
├── src/
│   ├── app/
│   │   ├── dashboard/       # Main user dashboard
│   │   ├── editor/          # Monaco editor + Y.js logic
│   │   ├── plugin/          # Plugin details & Activity timeline
│   │   └── requests/        # Governance inbox
│   ├── components/
│   │   ├── editor/          # Editor UI shell & components
│   │   └── ui/              # Shared UI elements
│   ├── lib/
│   │   ├── activity.ts      # Logging utility
│   │   ├── pluginTypes.ts   # Platform metadata definitions
│   │   ├── supabase.ts      # Database client
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── useCollaboration.ts # Y.js Hook
│   └── ...
├── public/
├── .env.local               # Environment secrets
└── package.json
```

## Local Development Setup

Follow these steps to configure the Graft environment locally:

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/graft.git
cd graft
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

Configure a Supabase project and execute the SQL schema provided in `docs/schema.sql`.

### 4. Environment Variables

Create a `.env.local` file in the root directory with the following keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run Development Server

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000).

## Demonstration Flow

To validate the system capabilities, execute the following workflow:

1.  **Dashboard**: Verify the plugin grid view and publication status indicators.
2.  **Creation**: Generate a new "Chrome Extension" project and inspect the boilerplate code.
3.  **Versioning**: Modify a file, save, and confirm the version increment (v1 -> v2).
4.  **Governance**: Simulate a non-owner identity, attempt to edit, and submit a "Request to Edit".
5.  **Approval**: As the owner, approve the request and verify the automatic creation of a **Fork**.
6.  **Comparison**: Utilize the diff tool to inspect code changes between version iterations.

## Roadmap

- **AI-Assisted Plugin Generation**: Integration of LLMs to generate functional plugin scaffolding from natural language prompts.
- **Self-Hosted WebSocket Server**: Implementation of a private Hocuspocus instance to replace public signalling servers.
- **Role-Based Authentication**: Migration from simulated identity to comprehensive Supabase Auth policies.
- **Automated Publishing**: GitHub Actions pipelines for automated package building and marketplace upload.
- **Analytics Dashboard**: Aggregated metrics for tracking plugin usage and downloads.

## Technical Impact

**Graft** demonstrates advanced proficiency in **Full-Stack Application Architecture**. It showcases the ability to architect complex **governance systems** (Permissioning, Versioning), implement **real-time synchronization** (WebSockets, CRDTs), and design **relational database schemas** tailored to complex business logic (Audit trails, Forking). The project adheres to strict **System Design** principles where data integrity, auditability, and user intent are prioritized over CRUD simplicity.
