# EdgeLite — Cost-Effective Edge AI Factory Digital Twin

> **"Smarter Edge. Stronger Factory."**  
> *Deploy cost-effective edge computing solutions for shop-floor digitalization without high IPC (Industrial Personal Computer) infrastructure costs.*

---

## 🏭 1. Project Overview & Challenge Positioning

Modern smart factories often struggle with the steep infrastructure barriers of traditional automation:
* **High IPC Hardware Costs**: Industrial Personal Computers cost thousands of dollars per workstation.
* **Complex Infrastructure & Vendor Lock-in**: Bulky physical enclosures, proprietary fieldbus adapters, and high maintenance overheads.
* **Cloud Latency & Network Dependency**: Transmitting high-frequency sensor streams off-site introduces latency, high bandwidth consumption, and cloud subscription costs.

### The EdgeLite Solution
**EdgeLite** demonstrates that a standard laptop or low-cost commodity edge computer can serve as a fully functional, self-reliant **Industrial Edge Computing Node (`EdgeLite-Node-01`)**. It delivers:
1. **Local Robot Digital-Twin Control**: Real-time forward kinematics and trajectory orchestration for a 6-axis Universal Robots UR5e.
2. **Deterministic Physics Telemetry Engine**: Computes authentic motor loads, thermal heating/cooling, vibration harmonics, torque, and power based on dynamic joint velocities and welding duty cycles.
3. **Physical-Constrained Priority Task Scheduling**: Enforces the physical reality that one robot can execute only one motion task at a time, while concurrent edge analytics (monitoring, AI anomaly checks, quality analysis, reporting) run simultaneously on the edge host.
4. **Local Explainable AI Anomaly Detection**: Lightweight local Isolation Forest ML model combined with deterministic safety boundary tripwires (85°C thermal, 3.5 mm/s vibration, 90% load) running locally with **zero cloud dependency**.
5. **Simulated Demo Fault Injection & Operator Recovery**: Explicitly labeled demo fault injection (`J3 Motor Overload`, `Overheating`, `High Vibration`, `High Torque`) that halts the cell safely, performs AI diagnostics, and guides operator recovery.
6. **Automatic Industrial Reports**: Comprehensive task execution reports generated automatically on task completion/failure, exportable to **PDF**, **CSV**, and **JSON**.
7. **Authentic Host Hardware Telemetry**: Live operating system resource monitoring via `psutil` (genuine laptop CPU %, RAM %, Disk %, and sub-millisecond local loop latency).

---

## 🦾 2. Realistic UR5e 3D Digital Twin Architecture

Unlike toy simulations that assemble generic cubes, cylinders, or boxes, EdgeLite renders the **authentic Universal Robots UR5e industrial arm** using the official visual Collada meshes:
* `base.dae`
* `shoulder.dae`
* `upperarm.dae`
* `forearm.dae`
* `wrist1.dae`
* `wrist2.dae`
* `wrist3.dae`

### Kinematic & Visual Assembly
* **Coordinate System**: Direct geometric URDF kinematics mapping with official visual offsets:
  * **Base**: `yaw = 180°`
  * **Shoulder**: `z = 0.1625m`, `yaw = 180°`
  * **Upper Arm**: `roll = 90°`, `yaw = -90°`, visual `z = 0.138m`
  * **Forearm**: `x = -0.425m`, `roll = 90°`, `yaw = -90°`, visual `z = 0.007m`
  * **Wrist 1**: `x = -0.3922m`, `z = 0.1333m`, visual `z = -0.127m`, `roll = 90°`
  * **Wrist 2**: `y = -0.0997m`, visual `z = -0.0997m`, `roll = 0°`
  * **Wrist 3**: `y = 0.0996m`, visual `y = -0.0005m`, `z = -0.0989m`, `roll = 90°`
* **Default Safe Home Pose**: `[J1: 0°, J2: -90°, J3: 0°, J4: -90°, J5: 0°, J6: 0°]`
* **Industrial End-Effector / Welding Torch**:
  * Metallic gooseneck torch tube, brass/copper gas cup, ceramic contact tip, and wire electrode mounted to the Wrist 3 tool flange.
  * Dynamic point light emitting golden-blue arc flashes during active welding.
  * Real-time particle spark system emitting 80+ dynamic particles with gravity and velocity dispersion during active seam execution.

---

## 🧠 3. Edge AI Anomaly Detection & Diagnostics

* **Local Machine Learning**: Local scikit-learn `IsolationForest` trained on baseline nominal digital-twin simulation distributions.
* **Explainable AI (XAI)**: Calculates normalized standard deviations (Z-scores) across 5 core telemetry parameters:
  * Motor Load ($\sigma$)
  * Cell Temperature ($\sigma$)
  * Mechanical Vibration ($\sigma$)
  * Joint Torque ($\sigma$)
  * Power Consumption ($\sigma$)
* **Root-Cause Attribution**: Plain-language explanation diagnosing multi-variable physical coupling (e.g. *"Motor load increased continuously while J3 velocity remained high, causing temperature and vibration to rise."*).
* **Deterministic Safety Envelopes**:
  * Temperature Limit: `85.0°C`
  * Vibration Limit: `3.5 mm/s`
  * Motor Load Limit: `90.0%`
  * Torque Limit: `50.0 Nm`

---

## 📋 4. Demonstration Workflow for Judges (Step-by-Step)

Follow this 11-step sequence during your project demonstration:

1. **Step 1 — Open EdgeLite**:
   * Dashboard displays:
     * `SYSTEM ONLINE` (green pulse)
     * `EdgeLite-Node-01`
     * `LOCAL_EDGE_PROCESSING`
     * `DIGITAL TWIN ACTIVE` (Connection: Software Simulation)
2. **Step 2 — Inspect Realistic 3D Model**:
   * Observe the authentic metallic silver/gray UR5e arm, cylindrical joint housings, mounting pedestal, safety boundary ring (850mm reach), and welding table workpiece.
   * Click **START**: The robot transitions from `READY` to `RUNNING` and articulates smoothly along the S-curve welding trajectory.
3. **Step 3 — Active Production Task**:
   * Task **Welding Part A** starts executing.
   * End-effector torch reaches the workpiece seam, **"WELDING ACTIVE"** badge pulses, dynamic arc flashes illuminate the cell, and sparks spray from the nozzle.
   * Telemetry updates deterministically: motor load rises (~45–65%), temperature rises (~52–68°C), and power consumption increases (~380–520W).
4. **Step 4 — Add a Conflicting Motion Task (Physical Constraint)**:
   * Open **Tasks & Queue** and inspect **Inspection Part A**.
   * Note that it automatically holds in **WAITING** status with the explicit explanation:  
     *`"Waiting — UR5e is currently executing Welding Part A."`*
   * Demonstrates that the digital twin respects physical laws: one physical arm cannot weld and inspect two different components at the same time.
5. **Step 5 — Monitor Authentic Edge Host Resources**:
   * Inspect the **Edge Computing Node Monitor** card showing authentic laptop CPU %, RAM %, and local processing latency (~1–3ms via `psutil`).
6. **Step 6 — Trigger Demo Fault Injection**:
   * Click the **SIMULATE FAULT** button on the live view.
   * Select **J3 Motor Overload** and click **Trigger Demo Fault**.
   * Notice:
     * Banner clearly indicates: `Demo/Test Fault — simulated locally`.
     * Robot stops safely and current task pauses.
     * Alert badge trips to `FAULT`.
7. **Step 7 — AI Diagnostics Display**:
   * The AI diagnostics engine presents:
     * **Problem**: *J3 (Elbow) motor load exceeded safe limit (96.4% > 90%).*
     * **Cause**: *High sustained joint torque during trajectory interpolation combined with continuous welding duty cycle.*
     * **Affected Task**: *Welding Part A*
     * **Recommended Action**: *Reduce operating speed / allow joint cooling / inspect J3 harmonic drive.*
8. **Step 8 — Fault Recovery**:
   * Click **CLEAR FAULT**.
   * Notice the robot safely remains `STOPPED` (preventing hazardous accidental motion).
   * Click **RESUME TASK**: The task resumes from its paused progress and completes the welding seam.
9. **Step 9 — Task Completion**:
   * Progress reaches 100%. Task transitions to `COMPLETED`.
   * Event logged: `[SUCCESS] Task Welding Part A successfully completed.`
10. **Step 10 — Automatic Task Report Generation**:
    * Open **Reports** navigation tab.
    * Click **View** on the newly generated report (`RPT-...-TSK-101`).
    * Review peak motor loads, peak temperatures, authentic host CPU averages, AI status, and final quality results.
    * Click **Download Official PDF**: A formatted, professional industrial PDF report opens.
11. **Step 11 — Audit History**:
    * Open **History** tab to inspect the complete timestamped SQLite transaction audit log.

---

## 💻 5. Tech Stack & Directory Structure

```
aic/
├── backend/
│   ├── .venv/                   # Python virtual environment
│   ├── ai/
│   │   ├── anomaly_detector.py  # Isolation Forest ML & explainable Z-scores
│   │   └── diagnostics.py       # Root-cause analysis & demo fault mappings
│   ├── database/
│   │   └── database.py          # SQLite database persistence layer (edgelite.db)
│   ├── models/
│   │   └── schemas.py           # Pydantic data models & status enums
│   ├── monitoring/
│   │   └── system_monitor.py    # Authentic host telemetry (psutil & latency)
│   ├── reports/
│   │   └── report_generator.py  # Automated report generator (ReportLab PDF / CSV)
│   ├── robot/
│   │   ├── digital_twin.py      # Core UR5e runtime & 25Hz simulation loop
│   │   ├── kinematics.py        # UR5e forward kinematics & trajectory generator
│   │   └── telemetry.py         # Deterministic multi-variable physics model
│   ├── main.py                  # FastAPI server with REST & WebSockets
│   ├── requirements.txt         # Frozen Python dependencies
│   ├── test_e2e.py              # Automated 12-point verification suite
│   └── test_report.py           # Automatic report verification test
│
├── frontend/
│   ├── public/
│   │   └── models/ur5e/         # Official Universal Robots UR5e DAE meshes
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddTaskModal.tsx # Task scheduler dialog
│   │   │   ├── FaultModal.tsx   # Demo fault injection dialog
│   │   │   ├── Header.tsx       # Industrial header with live clock & status
│   │   │   ├── ReportModal.tsx  # Detailed report viewer with PDF download
│   │   │   └── Sidebar.tsx      # Sidebar with 8 sections & UR5e spec card
│   │   ├── pages/
│   │   │   ├── AIAnalyticsPage.tsx  # Health gauges, XAI feature deviations
│   │   │   ├── HistoryPage.tsx      # Chronological audit timeline
│   │   │   ├── LiveDataPage.tsx     # High-frequency telemetry & host charts
│   │   │   ├── OverviewPage.tsx     # 3D digital twin, controls, KPI cards
│   │   │   ├── ReportsPage.tsx      # Reports list & CSV export
│   │   │   ├── RobotControlPage.tsx # Joint sliders, jog micro-stepper, presets
│   │   │   ├── SettingsPage.tsx     # Node parameters & safety thresholds
│   │   │   └── TasksPage.tsx        # Priority queue & physical constraint tabs
│   │   ├── robot/
│   │   │   └── UR5eViewer.tsx   # Three.js 3D UR5e viewer & welding spark system
│   │   ├── services/
│   │   │   └── api.ts           # REST API client & 25Hz WebSocket manager
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── App.tsx              # Router & WebSocket state manager
│   │   ├── index.css            # Industrial styling & Tailwind setup
│   │   └── main.tsx             # React entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── start_edgelite.bat           # 1-Click Windows Launcher
└── README.md
```

---

## 🚀 6. Quickstart Guide

### Option A: One-Click Windows Launch (Recommended)
Double-click `start_edgelite.bat` in the project root. This automatically starts:
1. The FastAPI backend server on `http://127.0.0.1:8000`
2. The Vite React digital-twin frontend on `http://127.0.0.1:5173`
3. Automatically opens your browser to the EdgeLite dashboard.

### Option B: Manual Terminal Execution

#### 1. Backend Terminal
```powershell
cd backend
.\.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Terminal
```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔒 7. Compliance with Realism & Digital Twin Standards

* **No Fake Hardware Claims**: The dashboard transparently designates `Hardware Connected: False`, `Hardware: Software Digital Twin`, and `Robot Source: EdgeLite Robot Simulator`.
* **Authentic Host Metrics**: CPU and Memory numbers are gathered dynamically from the running host via `psutil`.
* **Explainable Fault Origin**: Injected faults are visibly badged as `Demo/Test Fault — simulated locally`.
* **Deterministic Kinematics**: Joint rotations strictly adhere to Universal Robots UR5e Denavit-Hartenberg and URDF parameter specifications.
