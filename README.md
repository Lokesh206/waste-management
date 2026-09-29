# Smart Waste Management System using AI, IoT, GPS and Predictive Analytics (SWMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-blue.svg)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%20%2B%20Prisma%20SQLite-green.svg)](backend/)
[![AI-Vision](https://img.shields.io/badge/AI-PyTorch%20MobileNetV2-purple.svg)](ai/)
[![Predictive-Analytics](https://img.shields.io/badge/ML-Scikit--Learn%20LinearRegression-orange.svg)](ai/)

---

## 1. Project Overview
The **Smart Waste Management System (SWMS)** is a complete, realistic, modular, secure, and maintainable full-stack platform engineered to solve real-world urban waste problems:
- **Improper Segregation & Mixing**: Real-time image classification across 8 waste categories using PyTorch MobileNetV2 vision models.
- **Overflowing Bins & Irregular Collection**: Ultrasonic distance telemetry transmitted by ESP32 microcontrollers or the built-in IoT Web Simulator with automated threshold alerts.
- **Inefficient Routing & Unnecessary Trips**: Priority-weighted Nearest-Neighbor collection stop sequencer calculating approximate route distances without claiming TSP optimality.
- **Illegal Dumping**: Citizen geo-tagged photo evidence reporting with administrative triage and status workflows.
- **Lack of Predictive Planning**: Time-series regression models forecasting fill rates and hours remaining until critical thresholds.
- **Recycling Tracking**: Material recovery facility portal logging received vs. processed vs. recycled output.

### Complete Engineering Conceptual Workflow
$$\text{Detect} \longrightarrow \text{Classify} \longrightarrow \text{Monitor} \longrightarrow \text{Predict} \longrightarrow \text{Alert} \longrightarrow \text{Collect} \longrightarrow \text{Track} \longrightarrow \text{Segregate} \longrightarrow \text{Recycle} \longrightarrow \text{Analyze}$$

---

## 2. Key Features

| Domain | Implemented Features |
|---|---|
| **AI Vision Classification** | 8 Categories: *Plastic, Paper, Glass, Metal, Organic, E-Waste, Hazardous, Other*. Clear distinction between prediction confidence and model accuracy. Recyclability advice & disposal stream recommendations. Transparent AI Demo Mode fallback. |
| **IoT Telemetry & Sensing** | Authenticated `POST /api/iot/bin-reading` (`x-api-key`). Ultrasonic HC-SR04 distance-to-fill percentage calculation based on actual bin height. Interactive Web Sensor Simulator & ESP32 Arduino C++ firmware. Clearly labeled `[SIMULATED DATA]` tag. |
| **Predictive Analytics** | Scikit-Learn regressor analyzing historical reading intervals to forecast fill velocity (`%/hr`), projected fill in 6h/12h/24h, and hours until the 90% threshold. |
| **GPS & Route Planning** | Interactive Leaflet.js & OpenStreetMap integration with status markers: 🟢 Normal (0-50%), 🟡 Moderate (51-75%), 🟠 Almost Full (76-90%), 🔴 Critical (91-100%), ⚫ Offline. Priority-weighted Nearest-Neighbor routing engine. |
| **Collection Management** | Full task status machine: `Pending` → `Assigned` → `Accepted` → `On the Way` → `Collected` → `Completed`. Waste weight (kg) recording and automatic bin fill reset to 0%. |
| **Illegal Dumping Reports** | Citizen reporting with photo upload and interactive GPS map picker. Administrative review and resolution workflow. |
| **Recycling Portal** | Material recovery tracking: `Pending` → `Received` → `Processing` → `Recycled` / `Rejected`. Real-time mass efficiency calculations. |
| **Centralized Analytics** | 8 Real-time KPI summary cards and Chart.js dynamic visualizations: Doughnut, Bar, and Pie charts driven directly by database records without fabricated metrics. |
| **Reporting & Audit** | One-click CSV report exports for Collections, Recycling, Bins, and Complaints. |

---

## 3. Technology Stack

### Frontend
- **React 18** (Single Page Application via **Vite**)
- **Tailwind CSS** (Modern responsive styling, custom color palettes)
- **Lucide React** (Consistent icon library)
- **Leaflet.js & React-Leaflet** (OpenStreetMap GPS mapping, zero paid API keys)
- **Chart.js & React-Chartjs-2** (Interactive data visualization)
- **Axios** (HTTP client with JWT authorization interceptors)

### Backend
- **Node.js (v20+)** & **Express**
- **Prisma ORM** (Fully typed schema with foreign keys)
- **SQLite** (`prisma/dev.db` database)
- **JWT (JSON Web Tokens)** & **bcryptjs** (Role-based access control & password hashing)
- **Multer** (File upload validation, MIME whitelisting, 5MB limit)
- **Morgan & Custom Logger** (Structured logging without exposing sensitive secrets)

### AI / ML & Telemetry
- **Python 3** (PyTorch, torchvision, Pillow, Scikit-Learn, NumPy)
- **ESP32 & Arduino C++** (WiFi, HTTPClient, ArduinoJson, HC-SR04)
- **Node.js CLI Simulator** (`iot/simulator/simulator.js`)

---

## 4. High-Level Architecture

```
                    ┌────────────────────────────────────────┐
                    │      React 18 Frontend (Vite)          │
                    │   Citizen | Collector | Recycle | Admin│
                    └───────────────────┬────────────────────┘
                                        │ REST APIs / JWT
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       Node.js Express Backend API      │
                    │   Auth | Bins | Collections | Reports  │
                    └───────┬───────────┬────────────┬───────┘
                            │           │            │
            ┌───────────────┘           │            └──────────────┐
            ▼                           ▼                           ▼
┌────────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────┐
│     Prisma SQLite      │  │  Python AI / ML Bridge│  │      IoT Telemetry      │
│  users, bins, readings,│  │  - PyTorch MobileNetV2│  │  - POST /api/iot/reading│
│  collections, recycling│  │  - Scikit Regressor   │  │  - ESP32 / Web Simulator│
└────────────────────────┘  └───────────────────────┘  └─────────────────────────┘
```

---

## 5. Project Directory Structure

```
waste/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # 10 Database Models
│   │   └── seed.js                   # Pre-populates 4 roles & 10 smart bins
│   ├── src/
│   │   ├── controllers/              # Auth, Bins, Collections, IoT, Complaints, etc.
│   │   ├── middleware/               # JWT auth, Role guards, Multer upload
│   │   ├── routes/                   # Modular Express routers mounted at /api
│   │   ├── services/                 # Route planning, Bin thresholding, AI bridge
│   │   └── utils/logger.js           # Structured audit logger
│   ├── tests/                        # Automated Jest / Supertest integration test suite
│   ├── server.js                     # Express entry point
│   ├── .env.example                  # Environment configuration template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar, LeafletMap, StatusBadge, MetricCard
│   │   ├── context/                  # AuthContext & NotificationContext
│   │   ├── pages/                    # Home, Login, Register, Citizen, Collector, Admin
│   │   ├── services/api.js           # Axios API client
│   │   ├── App.jsx                   # Master routing & Protected route guards
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── ai/
│   ├── models/                       # Model storage directory
│   ├── train.py                      # Transfer learning training pipeline
│   ├── evaluate.py                   # Classification report & confusion matrix
│   ├── predict.py                    # PyTorch waste classification CLI
│   └── predict_fill.py               # Scikit-Learn fill-level forecasting CLI
│
├── iot/
│   ├── esp32/
│   │   └── swms_esp32_sensor.ino     # ESP32 ultrasonic firmware sketch
│   └── simulator/
│       └── simulator.js              # Standalone Node.js sensor simulation script
│
├── package.json                      # Root orchestration scripts
└── README.md
```

---

## 6. Installation & Quick Start

### Prerequisites
- **Node.js**: v18 or v20+ (`node -v`)
- **Python**: 3.10+ with `torch`, `torchvision`, `scikit-learn`, `pillow` (`python --version`)

### Step 1: Install Dependencies
From the root `waste/` directory:
```bash
# Install root orchestration tools
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### Step 2: Database Initialization & Seeding
```bash
cd backend
npx prisma db push
node prisma/seed.js
cd ..
```
*This populates the SQLite database with 4 default accounts, 10 smart bins, historical readings, and initial tasks.*

### Step 3: Run Both Backend & Frontend
From the root directory:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000` (API documentation at `/api/health`)
- **React Frontend**: `http://localhost:5173`

---

## 7. Pre-Configured Demonstration Accounts

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@swms.com` | `admin123` | Full system control, bin registry, task assignment, IoT simulator, reports |
| **Waste Collector** | `collector@swms.com` | `collector123` | View assigned tasks, route navigation, mark collected with proof image |
| **Citizen** | `citizen@swms.com` | `citizen123` | AI waste scanner, report dumping with GPS, view nearby smart bins |
| **Recycling Center** | `recycling@swms.com` | `recycling123` | Accept incoming recyclable batches, update processing logs, statistics |

*Tip: The web interface contains **Quick Fill Buttons** on the Login page and a **Demo Switcher Bar** in the Navbar for fast switching during presentations.*

---

## 8. Complete Viva Demonstration Walkthrough (Section 56)

Follow these exact steps during your review to showcase the end-to-end integration:

1. **Step 1 — Admin Login**: Log in as `admin@swms.com` / `admin123`.
2. **Step 2 — Admin Dashboard**: Observe 8 real-time KPI cards, live city map with 10 bins, and zero critical alerts.
3. **Step 3 — IoT Telemetry Simulation**:
   - Navigate to **IoT Web Simulator** (`/admin/simulator`).
   - Select **`BIN-001`**, adjust the slider to **`92%`**, and click **"Send Reading"**.
4. **Step 4 — Status Trigger**:
   - The response confirms status changed to **`Critical`** (🔴).
   - An automated **Critical Priority Collection Request** is generated without duplicate spam.
5. **Step 5 — Task Assignment**:
   - Navigate to **Collection Tasks** (`/admin/assignments`).
   - Click **"Assign"** on `BIN-001` and assign to **Alex Collector (Team Alpha)**.
6. **Step 6 — Collector Login**:
   - Click "Demo Switch: Collector" in the top navbar.
   - Collector sees **`BIN-001 — 92% — Critical`** under Active Tasks.
7. **Step 7 — Route Optimization**:
   - Open **Route Navigation** (`/collector/route`).
   - Observe the Priority Nearest-Neighbor sequenced stop order, distance, and map polyline.
8. **Step 8 — Complete Collection**:
   - In **Assigned Tasks** (`/collector/tasks`), click **"Mark Waste Collected"**.
   - Enter **`Quantity = 25 kg`**, attach an optional photo, and submit.
   - The task moves to `Completed`, and `BIN-001` is instantly reset to **0% (Normal 🟢)**.
9. **Step 9 — Recycling Facility Processing**:
   - Switch to **Recycling Center** (`recycling@swms.com`).
   - View the incoming 25 kg batch of Plastic from `BIN-001`.
   - Click **"Update"** → select **`Processing`** → select **`Recycled`**.
10. **Step 10 — Citizen AI Scan & Dumping Report**:
    - Switch to **Citizen** (`citizen@swms.com`).
    - Go to **AI Waste Scanner** (`/citizen/classify`), upload a waste photo, and view the predicted category (e.g. `Plastic`), confidence score (e.g. `94.2%`), and recyclability advice.
    - Go to **Report Dumping** (`/citizen/report-dumping`), click on the map to place a pin, enter a title, and submit.
11. **Step 11 — Resolution & Centralized Analytics**:
    - Switch back to **Admin**.
    - Open **Dumping Complaints** (`/admin/complaints`) and mark the report **`Resolved`**.
    - Open **Analytics** (`/admin/analytics`) and **Reports** (`/admin/reports`) to observe all charts and CSV exports updated in real-time.

---

## 9. IoT Sensor Integration & Hardware Setup

### Physical ESP32 Sensor Wiring
- **Sensor**: HC-SR04 Ultrasonic Distance Sensor
  - `VCC` → 5V / VIN
  - `GND` → GND
  - `TRIG` → GPIO 5
  - `ECHO` → GPIO 18 (use a simple 1k/2k resistor voltage divider if needed for 3.3V tolerance)

### Firmware Upload
1. Open `iot/esp32/swms_esp32_sensor.ino` in Arduino IDE.
2. Install `ArduinoJson` library via Library Manager.
3. Configure `WIFI_SSID`, `WIFI_PASS`, and your machine's local IP: `http://<YOUR_IP>:5000/api/iot/bin-reading`.
4. Upload to ESP32.

### Testing Without Hardware (Simulation Mode)
Use the interactive web panel at `http://localhost:5173/admin/simulator` or the CLI:
```bash
node iot/simulator/simulator.js BIN-001 92
```

---

## 10. AI Model Training & Evaluation

The vision classifier is structured for transfer learning with PyTorch and MobileNetV2:

### Train on Custom Waste Dataset
Place dataset images into:
```
ai/datasets/
  ├── train/ (Plastic/, Paper/, Glass/, Metal/, Organic/, E-Waste/, Hazardous/, Other/)
  └── val/   (Plastic/, Paper/, Glass/, Metal/, Organic/, E-Waste/, Hazardous/, Other/)
```
Run training:
```bash
python ai/train.py
```
*Trained weights are automatically saved to `ai/models/mobilenetv2_waste.pth`.*

### Generate Evaluation Metrics
```bash
python ai/evaluate.py
```
*Outputs standard Classification Report (Precision, Recall, F1-Score) and Confusion Matrix without fabricating benchmark metrics.*

---

## 11. Automated Testing

Run the automated integration test suite:
```bash
cd backend
npm test
```
*Validates JWT authentication, role guards (403), bin CRUD, IoT authentication (`x-api-key`), threshold alert generation, collection recording, and bin reset.*

---

## 12. Security & Data Protection
- **Password Protection**: Passwords salted and hashed with `bcryptjs` (Cost 10). Plain-text passwords are never persisted.
- **Role Isolation**: Strict middleware guards (`roleMiddleware`) prevent privilege escalation.
- **Upload Hardening**: Whitelisted extensions (`.jpg`, `.jpeg`, `.png`, `.webp`), MIME validation, and 5MB size limit.
- **IoT Authentication**: Dedicated API key verification (`x-api-key`) prevents unauthorized sensor tampering.
- **SQL Injection Prevention**: Completely parameterized SQL queries via Prisma ORM.

---

## 13. Future Enhancements
- Real-time GPS truck telematics via WebSocket streams.
- Edge-AI camera modules directly mounted on municipal collection vehicles.
- Citizen recycling reward tokens & civic loyalty incentives.
- Integration with smart city municipal ERP infrastructure.

---

## 14. License
Developed for academic, research, and demonstration purposes under the MIT License.

