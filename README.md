# DevFlow AI — Intelligent Software Development Workspace

DevFlow AI is an all-in-one developer workspace bringing project management, AI code analysis, issue tracking, software architecture visualization, and release intelligence into a single developer-first platform.

---

## ⚡ Features & Workspaces

1. **Engineering Overview Dashboard**
   - Real-time metrics calculated from actual project, task, and issue records.
   - Recharts visual graphs for issue severity breakdown (Critical, High, Medium, Low) and sprint task workflows.
   - Project health stability indicators and activity audit log.

2. **Project Management & Workspaces**
   - Full CRUD: Create, view, edit, archive, and delete projects with keys, tech stacks, repository links, and deadlines.
   - Dedicated project workspaces with Kanban board (To Do, In Progress, Completed), drag-friendly status progressions, and tag management.
   - Real persistent database storage across reloads.

3. **AI Code Intelligence Workspace**
   - Upload source files (<500KB) or paste code snippets in TypeScript, Python, Go, Rust, and SQL.
   - Deep analysis powered by Gemini 3.8 Flash (server-side via `@google/genai`).
   - Categorized findings:
     - 🐞 **Bugs & Anti-Patterns**: Line references and concrete fixes.
     - 🛡️ **Security Weaknesses**: CWE classifications, exploit vectors, and mitigations.
     - 🧹 **Maintainability**: Modularity and readability scores (0-100).
     - 💡 **Code Improvements**: Before/after optimized diff comparisons.
     - 🧪 **Unit Tests**: Framework-specific test generation (Vitest, Jest, PyTest).
   - One-click "Convert Bug to Tracked Issue" integration!

4. **Software Architecture Visualizer**
   - Interactive diagram powered by React Flow (`@xyflow/react`).
   - Drag-and-drop node canvas with pan, zoom, and fit-view controls.
   - Component palette: API Gateways, Microservices, Databases, Caches, Message Queues, and Auth Providers.
   - Component Inspector: Edit label, tech stack, health status, and descriptions.
   - Save directly to active project database and Export/Import JSON topologies.

5. **Issue Tracker & Security Registry**
   - Filter by Project, Severity (Critical, High, Medium, Low), Category (Bug, Security, Perf, Maintainability, Architecture), and Status.
   - Detailed inspection drawer with file path, line numbers, and workflow states.
   - Resolution notes tracking with timestamp recording.

6. **AI Project Assistant & Release Intelligence**
   - Context-aware engineering assistant with verified repository knowledge injection.
   - One-click actions:
     - 📑 Executive Status Summary
     - 📦 Generate Release Notes from actual completed deliverables and closed bugs
     - 📝 Draft Production README
     - 🎯 Recommend Next Sprint Focus
     - 🔍 Audit Recurring Defects & Architectural Smells

7. **Dual Backend Architecture**
   - **Integrated Express Server (`server.ts`)**: Powers the live port 3000 web runtime with REST APIs, persistent JSON/SQLite store, and Gemini API proxy.
   - **Standalone Python FastAPI Backend (`backend/`)**: Complete standalone codebase with SQLAlchemy ORM, Pydantic schemas, SQLite persistence, and pytest unit tests.

---

## 🛠️ Environment Variables

Copy `.env.example` to `.env`:

```bash
# GEMINI_API_KEY: Injected by AI Studio or set locally for Gemini 3.8 Flash
GEMINI_API_KEY="your-gemini-api-key"

# Port (defaults to 3000)
PORT=3000
```

---

## 🚀 Running the Application

### 1. Run the Full-Stack Workspace (Node.js + Express + Vite)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run the Python FastAPI Backend (Standalone)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --port 8000 --reload
```
Interactive Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Run Backend Automated Tests
```bash
pytest backend/tests/test_api.py -v
```

---

## 📐 Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion.
- **Visualizations**: React Flow (`@xyflow/react`), Recharts.
- **Backend**: Express + Python FastAPI (dual implementation).
- **ORM / Database**: SQLAlchemy + SQLite.
- **AI Models**: Gemini 3.8 Flash (`@google/genai` TypeScript SDK on server).
