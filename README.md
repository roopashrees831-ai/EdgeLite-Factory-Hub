# EdgeLite Factory Hub

### Cost-Effective Edge AI & Digital Twin for Smart Shop-Floor Automation

**Hyundai Innovation Challenge 2026**

---

## 🚀 Project Overview

**EdgeLite Factory Hub** is a software-based Edge AI and Digital Twin platform designed for cost-effective smart shop-floor automation.

The platform demonstrates how industrial monitoring, robot simulation, task scheduling, fault detection, telemetry, and reporting can be handled through a lightweight edge-processing architecture without depending on expensive Industrial PCs or continuous cloud processing.

The system provides a realistic **UR5e robotic digital twin**, real-time machine telemetry, edge computing monitoring, task management, fault simulation, and operational reports through a unified web dashboard.

---


## 🎥 Live Demo

[**Open**](https://edgelite-factory.onrender.com)

---

## 🎯 Problem Statement

Industrial shop floors traditionally depend on expensive Industrial PCs and centralized infrastructure for monitoring and automation.

This increases:

- Infrastructure cost
- Processing dependency
- Deployment complexity
- Maintenance requirements
- Cloud dependency
- Latency for real-time operations

The challenge is to provide a **cost-effective edge computing solution** capable of supporting shop-floor digitalization while maintaining real-time monitoring and automation capabilities.

---

## 💡 Proposed Solution

EdgeLite Factory Hub provides a software-based solution that combines:

- Edge computing
- Digital Twin technology
- Robot simulation
- Real-time telemetry
- AI-assisted monitoring
- Fault simulation
- Task scheduling
- Performance monitoring
- Automated reporting

The platform processes operational information through an edge-oriented architecture and visualizes the results through a centralized dashboard.

---

## 🤖 Digital Twin

The project includes a simulated **UR5e 6-axis collaborative robot** representing a shop-floor robotic system.

The Digital Twin provides:

- Real-time robot visualization
- Joint movement simulation
- Robot task execution
- Part handling simulation
- Sorting operations
- Welding simulation
- Robot status monitoring
- Fault simulation
- Cycle tracking

The system demonstrates how a physical industrial robot can be represented digitally for monitoring, simulation, and operational analysis.

---

## ⚡ Edge Computing

The **Edge Computing Node Monitor** displays real-time host metrics collected through the local edge-processing environment.

The dashboard monitors:

- CPU utilization
- RAM utilization
- Processing latency
- Active tasks
- Queued tasks
- Edge processing mode
- Cloud dependency

The system is designed around:

> **LOCAL EDGE PROCESSING**

with minimal dependency on cloud infrastructure.

---

## 📊 Live Machine Telemetry

The platform provides real-time machine telemetry for the simulated production environment.

Monitored parameters include:

- 🌡️ Temperature
- 📳 Vibration
- ⚙️ Motor Load
- 🔩 Joint Torque
- ⚡ Electrical Power
- ⏱️ Cycle Duration

These values help visualize the operational condition of the simulated machine and identify abnormal conditions.

---

## 🧠 AI & Fault Simulation

The platform supports intelligent monitoring and simulated fault scenarios.

The system can simulate abnormal operating conditions and observe their effect on:

- Machine parameters
- Robot operation
- Task execution
- System status
- Production monitoring

This demonstrates how AI-assisted edge monitoring can support predictive and preventive maintenance concepts.

---

## 🏭 Shop-Floor Operations

The Digital Twin demonstrates multiple production operations.

### Part A — Pick & Place

The UR5e robot performs a simulated pick-and-place operation between defined locations.

### Part B — Sorting

The robot identifies and sorts simulated parts into designated locations.

### Part C — Assembly

The robot performs a simulated assembly workflow involving multiple components.

### Part D — Welding

The robot performs a simulated welding operation with a welding visualization that appears during the active welding process.

---

## 📋 Task Management

The **Tasks & Queue** section provides visibility into production tasks.

Tasks can be:

- Queued
- Waiting
- Running
- Completed
- Monitored during execution

This allows the platform to represent a simplified production scheduling workflow.

---

## 📄 Reports

The platform provides operational reporting for the simulated production environment.

Reports can be used to analyze:

- Task execution
- Robot activity
- Production cycles
- Machine conditions
- System performance
- Operational events

---

## 🕐 History

The **History** section provides a record of previous operational activities and system events.

This helps users review past machine and task activity.

---

## ⚙️ Settings

The platform includes a settings section for managing dashboard-related configuration and preferences.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │       Web Dashboard      │
                    │     React + TypeScript   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       API Layer          │
                    │        FastAPI            │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ Edge Monitoring│ │ Robot Digital  │ │ Task & Queue   │
     │                │ │ Twin           │ │ Management     │
     └────────────────┘ └────────────────┘ └────────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │     Local Edge Node      │
                    │ CPU • RAM • Latency      │
                    │ Telemetry • Processing   │
                    └─────────────────────────┘
