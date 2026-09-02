<p align="center">
  <br>
  <span style="font-size: 80px;">🐝</span>
  <h1 align="center">BeeBuzz</h1>
  <p align="center">
    <strong>Digital Freight Matching Ecosystem</strong><br>
    Connecting "Flowers" (Shippers) with "Bees" (Drivers)
  </p>
</p>

<p align="center">
  <a href="https://bee-buzz-nfk3.vercel.app">
    <img src="https://img.shields.io/badge/🌐 Live Demo-Vercel-000000?style=for-the-badge&logo=vercel" alt="Live Demo">
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Status-Active-10B981?style=for-the-badge" alt="Status">
</p>

---

## 🌐 Live Deployment

| Service     | URL                                                                 |
|-------------|---------------------------------------------------------------------|
| **Frontend** | [https://bee-buzz-nfk3.vercel.app](https://bee-buzz-nfk3.vercel.app) |
| **Backend API** | Hosted on [Render](https://render.com) (auto-deployed from `main`) |
| **Database** | Hosted on [Neon](https://neon.tech) (PostgreSQL)                   |

> **Note:** The backend runs on Render's free tier and may take ~30 seconds to cold-start on the first request.

---

## 📸 Screenshots

### 🔐 Authentication

<table>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/01_login.png" alt="Login Page" width="100%"/>
      <br/><strong>Login Page</strong>
      <br/><em>Glassmorphism login screen with plasma blob animations</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/02_register.png" alt="Registration Page" width="100%"/>
      <br/><strong>Registration Page</strong>
      <br/><em>Role-based registration for Shippers & Drivers</em>
    </td>
  </tr>
</table>

---

### 🌸 Shipper Portal

<table>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/03_shipper_dashboard.png" alt="Shipper Dashboard" width="100%"/>
      <br/><strong>Shipper Dashboard</strong>
      <br/><em>Overview of active loads, bids, and shipment stats</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/04_shipper_loads.png" alt="My Loads" width="100%"/>
      <br/><strong>My Loads</strong>
      <br/><em>All posted shipments with status tracking</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/05_shipper_create_load.png" alt="Create Load" width="100%"/>
      <br/><strong>Create Load</strong>
      <br/><em>Post a new shipment with cargo specs, route & pricing</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/06_shipper_load_detail.png" alt="Load Detail" width="100%"/>
      <br/><strong>Load Detail</strong>
      <br/><em>Full shipment view with bids, tracking & POD</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/07_shipper_load_detail_bottom.png" alt="Load Detail - Bids & POD" width="100%"/>
      <br/><strong>Load Detail — Bids & Proof of Delivery</strong>
      <br/><em>Review driver bids and verify proof of delivery</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/08_shipper_notifications.png" alt="Notifications" width="100%"/>
      <br/><strong>Notifications</strong>
      <br/><em>Real-time alerts for bids, status changes & payments</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/09_shipper_profile.png" alt="Shipper Profile" width="100%"/>
      <br/><strong>Shipper Profile</strong>
      <br/><em>Company profile, banking details & account settings</em>
    </td>
    <td></td>
  </tr>
</table>

---

### 🐝 Driver Portal

<table>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/10_driver_dashboard.png" alt="Driver Dashboard" width="100%"/>
      <br/><strong>Driver Dashboard</strong>
      <br/><em>Active jobs, earnings summary & recent deliveries</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/11_driver_job_board.png" alt="Job Board" width="100%"/>
      <br/><strong>Job Board</strong>
      <br/><em>Browse available loads with filters & place bids</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/12_driver_my_bids.png" alt="My Bids" width="100%"/>
      <br/><strong>My Bids</strong>
      <br/><em>Track all submitted bids — Pending, Accepted, Rejected</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/13_driver_earnings.png" alt="Earnings" width="100%"/>
      <br/><strong>Earnings Dashboard</strong>
      <br/><em>Total earnings, escrow status & transaction history</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="screenshots/14_driver_notifications.png" alt="Driver Notifications" width="100%"/>
      <br/><strong>Notifications</strong>
      <br/><em>Bid acceptance, payment releases & load updates</em>
    </td>
    <td align="center" width="50%">
      <img src="screenshots/15_driver_profile.png" alt="Driver Profile" width="100%"/>
      <br/><strong>Driver Profile</strong>
      <br/><em>Driver info, vehicle details & banking for escrow payouts</em>
    </td>
  </tr>
</table>

---

## 📖 About The Project

BeeBuzz is a full-stack web application designed to disrupt the traditional, manual brokerage model in Indian logistics. It replaces chaotic phone calls and WhatsApp group confusion with **instant load matching**, **competitive bidding**, **real-time GPS tracking**, and **automated escrow payments**.

### How It Works

```
  🌸 Shipper                                    🐝 Driver
  ─────────                                    ─────────
  1. Posts a Load ──────────────────────────► 2. Browses Job Board
     (cargo details, route,                     (filters by location,
      price, truck type)                         weight, payout)
                                                     │
  4. Reviews & Accepts ◄──────────────────── 3. Places a Bid
     the best bid                                (competitive amount
                                                  + notes)
         │                                           │
         └──────────── 5. Load Assigned ─────────────┘
                              │
                    6. Real-Time GPS Tracking
                    7. Status Updates (Picked Up → In Transit → Delivered)
                    8. Proof of Delivery (Photos + Signature)
                    9. Escrow Payment Released ✅
```

---

## 🐝 Key Features

### 🧠 Machine Learning & Advanced Logistics Suite
- **Real ML Dynamic Pricing Engine** — Trains a high-performance **Random Forest Regressor** in Python on 5,000+ spot-market freight records, achieving a **98.55% $R^2$ accuracy** with sub-second inference speeds.
- **Corridor & Surcharge Intelligence** — Instantly estimates spot rates based on regional hubs (Mumbai, Bengaluru, Delhi, Chennai), weather premiums (Monsoon surcharge adjustments), cargo weight, and truck configurations.
- **Interactive Cost Breakdown Invoice** — Real-time billing invoice widget displaying **Economy**, **Balanced**, and **Priority** pricing tiers with net driver take-home calculations.
- **Interactive GPS Transit Simulation** — Live coordinate movement along dynamic OSRM route paths, syncing via WebSockets with safe milestone checkpoints.
- **Proof of Delivery (POD) & OTP Escrow Release** — Secure payment escrow release activated only when Driver uploads POD files and Shipper verifies using dynamic OTP matching.

### For Shippers ("Flowers" 🌸)
- **Load Management** — Post loads with detailed cargo specs, pickup/delivery locations, and truck requirements.
- **Bidding System** — Review driver bids, ratings, and past performance; accept or reject offers.
- **Real-Time Tracking** — View driver location on a live map with ETA updates during transit.
- **Proof of Delivery** — Review POD photos and signatures before confirming delivery.
- **Payment & Earnings** — Manage invoices, view transaction history, and track escrow releases.

### For Drivers ("Bees" 🐝)
- **Job Board** — Browse all available loads with powerful filtering (location, weight, payout, truck type).
- **Smart Bidding** — Place competitive bids with notes and track their status (Pending / Accepted / Rejected).
- **Trip Execution** — One-tap status updates through the shipment lifecycle.
- **Earnings Dashboard** — Track total earnings, completed jobs, and pending payouts with interactive charts.
- **In-App Notifications** — Real-time alerts for bid acceptance, load updates, and payment releases.

### System Capabilities
- **Escrow Security** — Funds are held until delivery is verified, protecting both parties.
- **JWT Authentication** — Secure token-based auth with 7-day sessions.
- **WebSocket Real-Time Updates** — Live bid notifications and status changes via persistent connections.
- **Responsive Design** — Fully functional on desktop, tablet, and mobile devices.
- **Glassmorphism UI** — Premium frosted-glass aesthetics with plasma blob animations and micro-interactions.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI library |
| **TypeScript** | Type-safe development |
| **Vite 7** | Lightning-fast build tool & dev server |
| **React Router v6** | Client-side routing & navigation |
| **Axios** | HTTP client for API communication |
| **Recharts** | Interactive earnings charts & data visualization |
| **Leaflet + React-Leaflet** | Interactive maps for route visualization |
| **jsPDF** | Dynamic PDF Invoice & Waybill generation |
| **WebSocket (native)** | Real-time bid & status update notifications |
| **CSS3 (Glassmorphism)** | Custom dark-mode UI with blur effects, gradients, and animations |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | REST API framework |
| **TypeScript** | Type-safe server code |
| **Python 3 / Scikit-Learn** | Machine Learning model building, RandomForest regression training, and inference |
| **Pandas** | ML dataset generation and feature cleaning |
| **PostgreSQL (pg)** | Relational database via connection pool |
| **JSON Web Tokens** | Stateless authentication |
| **bcryptjs** | Password hashing (10 salt rounds) |
| **uuid** | Unique ID generation for all entities |
| **ws** | WebSocket server for real-time communication |
| **express-validator** | Request validation middleware |
| **dotenv** | Environment variable management |

### Cloud Infrastructure
| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting & CDN (auto-deploy from `main`) |
| **Render** | Backend API hosting (free tier) |
| **Neon** | Managed PostgreSQL database (free tier) |
| **GitHub** | Source control & CI/CD trigger |

---

## 📂 Project Structure

```
BeeBuzz/
├── BeeBuzz/
│   ├── client/                     # React Frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/         # Reusable UI components
│   │   │   │   ├── Layout.tsx      # Main app shell (sidebar, topbar, routing)
│   │   │   │   └── LocationPicker.tsx  # Leaflet map for selecting coordinates
│   │   │   ├── context/            # React Context providers
│   │   │   │   ├── AuthContext.tsx  # Authentication state management
│   │   │   │   └── WebSocketContext.tsx  # Real-time WebSocket connection
│   │   │   ├── pages/              # Route-level page components
│   │   │   │   ├── Dashboard.tsx   # Overview stats & recent loads
│   │   │   │   ├── CreateLoad.tsx  # Load posting form (shippers)
│   │   │   │   ├── Loads.tsx       # My loads list
│   │   │   │   ├── LoadDetail.tsx  # Full load view, bids, tracking, POD
│   │   │   │   ├── JobBoard.tsx    # Available loads (drivers)
│   │   │   │   ├── MyBids.tsx      # Driver's bid history
│   │   │   │   ├── Earnings.tsx    # Earnings charts & payment history
│   │   │   │   ├── Notifications.tsx  # Real-time notification feed
│   │   │   │   ├── Login.tsx       # Authentication - login
│   │   │   │   └── Register.tsx    # Authentication - registration
│   │   │   ├── services/
│   │   │   │   └── api.ts          # Axios instance & all API service methods
│   │   │   ├── styles/
│   │   │   │   └── global.css      # Design system (colors, typography, components)
│   │   │   └── App.tsx             # Root component with route definitions
│   │   ├── vite.config.ts          # Vite configuration (proxy, plugins)
│   │   └── package.json
│   │
│   └── server/                     # Express Backend
│       ├── src/
│       │   ├── controllers/        # Business logic handlers
│       │   │   ├── authController.ts       # Register, login, profile, documents
│       │   │   ├── loadController.ts       # CRUD loads, bids, tracking, POD
│       │   │   ├── notificationController.ts  # Notification CRUD
│       │   │   └── paymentController.ts    # Escrow payment management
│       │   ├── middleware/
│       │   │   └── auth.ts         # JWT verification middleware
│       │   ├── routes/             # Express route definitions
│       │   │   ├── auth.ts         # /api/auth/*
│       │   │   ├── loads.ts        # /api/loads/*
│       │   │   ├── bids.ts         # /api/bids/*
│       │   │   ├── chat.ts         # /api/chat/*
│       │   │   ├── notifications.ts  # /api/notifications/*
│       │   │   └── payments.ts     # /api/payments/*
│       │   ├── services/
│       │   │   └── database.ts     # PostgreSQL pool, query helpers, schema init
│       │   ├── app.ts              # Express app entry point
│       │   └── index.ts            # TypeScript interfaces & types
│       ├── tsconfig.json
│       └── package.json
│
├── render.yaml                     # Render deployment blueprint
├── package.json                    # Root workspace scripts
└── README.md
```

---

## 🗄️ Database Schema

BeeBuzz uses **9 interconnected tables** in PostgreSQL:

| Table | Description |
|---|---|
| `users` | All users (shippers & drivers) with profile, documents, ratings |
| `loads` | Shipment postings with route, cargo details, pricing, and status |
| `bids` | Driver bids on loads (amount, notes, status) — unique per load+driver |
| `proof_of_delivery` | POD records (photos, signature, GPS coordinates) |
| `location_updates` | Real-time GPS pings during transit |
| `notifications` | In-app notification feed per user |
| `payments` | Escrow payment tracking (held → released) |
| `chat_messages` | In-load messaging between shipper and driver |
| `ratings` | Post-delivery ratings and reviews |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/profile` | Update profile details |
| `POST` | `/api/auth/documents` | Upload verification documents |

### Loads
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/loads` | List all loads (filtered by role) |
| `POST` | `/api/loads` | Create a new load (shipper) |
| `GET` | `/api/loads/:id` | Get load details with bids |
| `PUT` | `/api/loads/:id/status` | Update load status |
| `POST` | `/api/loads/:id/track` | Submit GPS location update |
| `POST` | `/api/loads/:id/pod` | Submit proof of delivery |

### Bids
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bids` | Place a bid on a load |
| `GET` | `/api/bids/my` | Get all my bids (driver) |
| `PUT` | `/api/bids/:id` | Update bid amount/notes |
| `PUT` | `/api/bids/:id/accept` | Accept a bid (shipper) |
| `PUT` | `/api/bids/:id/reject` | Reject a bid (shipper) |

### Notifications & Payments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get all notifications |
| `GET` | `/api/notifications/unread/count` | Unread notification count |
| `GET` | `/api/payments/earnings` | Get earnings summary |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **npm** v9+
- **PostgreSQL** (local or hosted via [Neon](https://neon.tech))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dheeraj-afk7/BeeBuzz.git
cd BeeBuzz

# 2. Install all dependencies (root, client, server)
npm install
cd BeeBuzz/client && npm install && cd ..
cd server && npm install && cd ../..

# 3. Set up environment variables
# Server: Create BeeBuzz/server/.env
echo "DATABASE_URL=postgresql://user:password@host:5432/dbname" > BeeBuzz/server/.env
echo "JWT_SECRET=your-secret-key" >> BeeBuzz/server/.env
echo "PORT=3000" >> BeeBuzz/server/.env

# Client: Create BeeBuzz/client/.env
echo "VITE_API_URL=http://localhost:3000" > BeeBuzz/client/.env
echo "VITE_WS_URL=ws://localhost:3000" >> BeeBuzz/client/.env

# 4. Build & start the server
cd BeeBuzz/server
npm run build
npm start

# 5. Start the client (in another terminal)
cd BeeBuzz/client
npm run dev
```

The client will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

---

## 🌍 Deployment

### Frontend → Vercel
1. Import the GitHub repo into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `BeeBuzz/client`.
3. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. Add environment variables:
   - `VITE_API_URL` = your Render backend URL
   - `VITE_WS_URL` = your Render WebSocket URL

### Backend → Render
1. Create a new **Web Service** on [Render](https://render.com) from the GitHub repo.
2. Set the **Root Directory** to `BeeBuzz/server`.
3. Set **Build Command** to `npm install && npm run build`.
4. Set **Start Command** to `node dist/app.js`.
5. Add environment variable:
   - `DATABASE_URL` = your Neon PostgreSQL connection string

### Database → Neon
1. Create a free project on [Neon](https://neon.tech).
2. Copy the connection string and set it as `DATABASE_URL` on Render.
3. Tables are automatically created on first server startup.

---

## 🎨 Design Philosophy

BeeBuzz uses a **Glassmorphism-first** design system built with:

- **Deep Space Dark Mode** — Rich void background (`#09090b`) for maximum content contrast
- **Neon Amber Accent** — Vibrant bee-themed yellow (`#FACC15`) for CTAs and highlights
- **Frosted Glass Panels** — `backdrop-filter: blur()` on cards, sidebars, and navigation
- **Plasma Blob Animations** — Floating gradient orbs on authentication screens
- **Magnetic Hover Effects** — Cards lift and glow on interaction
- **Plus Jakarta Sans + Outfit** — Modern, premium typeface pairing

---

## 👥 Authors

- **K Dheeraj** — [@Dheeraj-afk7](https://github.com/Dheeraj-afk7)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
