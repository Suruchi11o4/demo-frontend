# TrustLayer — Frontend Application

Production-style web frontend for **TrustLayer**, a real-time hallucination-grounding and tool-call-security firewall for AI agents applied to a **Banking Support Assistant**.

Built with React 18, Vite, Tailwind CSS v3, React Router v6, Recharts, and Lucide React. Typography set in **Lora** (headings, brand, KPIs) and **Inter** (UI elements).

---

## 1. Quick Start

### Installation

From the project directory:

```bash
cd docs/demo
npm install
```

### Running Locally

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 2. Authorized Credentials

All accounts share the default password `trustlayer`. Direct role shortcut buttons are also provided on the sign-in screen:

| Username | Name | Role | Primary Viewport | Accounts / Details |
| :--- | :--- | :--- | :--- | :--- |
| `aarav` | Aarav Mehta | **Customer** | `/chat` | Savings ₹48,250.00 • Credit Limit ₹1,00,000 (Late fee ₹500) |
| `priya` | Priya Nair | **Approver** | `/approvals` | Senior Staff / Risk Officer queue & decision engine |
| `rohan` | Rohan Kulkarni | **Admin** | `/dashboard` | Executive security metrics, anomaly logs & operations console |

---

## 3. Architecture & Live/Local Engine

The frontend includes a self-contained local state engine (`src/engine.js`) that persists state to `localStorage` under `tl_state` and synchronizes state across browser tabs and windows via the `BroadcastChannel('tl')` API.

All network calls are mediated by `src/api.js`.

### Connecting to a Real Backend

1. Create a `.env` file in `docs/demo/`:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```

2. When `VITE_API_BASE_URL` is set:
   - Every request is attempted against the live backend with a 4-second timeout and `Authorization: Bearer <token>`.
   - On network error, timeout, 404, or 5xx, the API layer silently falls back to `src/engine.js` so user operations never fail.
   - Endpoint paths are centralized in the `ENDPOINTS` dictionary at the top of `src/api.js`.
   - Data shapes are transformed via `normalize*` functions in `src/api.js`. Adjust these when the backend API contracts finalize.

### Debug Telemetry Mode

Add `?debug=1` to any URL in the browser (e.g. `http://localhost:5173/chat?debug=1`). A fixed bottom-right indicator badge will display whether the most recent network call was routed through `live` or `local engine`.

---

## 4. Feature Highlights

- **Virtual Banking Assistant (`/chat`)**: Multi-turn conversation thread with inline `DecisionBadge` chips (Allowed / Pending review / Blocked). Quick request chips for rapid evaluation. Automatic 3-second polling for live resolution delivery.
- **Approval Queue (`/approvals`)**: Dual-pane workflow. Inspects natural-language claims against retrieved knowledge base evidence chunks, monitors `ScoreBar` metrics for grounding confidence and policy risk, and provides one-click approve/deny execution with audit notes.
- **Security & Analytics Dashboard (`/dashboard`)**: KPI row, stacked bar chart of decisions over time, top retrieved knowledge documents with share indicators, security event & anomaly log, and degraded-mode fallback monitor with 5-second polling.
- **Live Operations View (`/operations`)**: Split-screen console displaying the customer chat and approver queue side-by-side with cross-role state synchronization.
