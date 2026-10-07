"""
EdgeLite Deterministic Telemetry Engine
Simulates realistic, physics-grounded telemetry for the UR5e robot based on:
- Joint velocity and acceleration
- Workload factor (Welding vs Inspection vs Idle)
- Welding arc heat flux and electrical power
- Thermal dissipation / cooling curves
- Injected faults and anomalous states
"""
import math
import time
from typing import Dict, Any, Optional

class TelemetryEngine:
    # Baseline idle constants
    BASE_TEMP = 42.0       # °C
    BASE_VIB = 0.40        # mm/s
    BASE_LOAD = 0.0        # %
    BASE_TORQUE = 8.0      # Nm
    BASE_POWER = 120.0     # W

    def __init__(self):
        self.temperature = self.BASE_TEMP
        self.vibration = self.BASE_VIB
        self.motor_load = self.BASE_LOAD
        self.torque = self.BASE_TORQUE
        self.power = self.BASE_POWER
        
        self.last_angles = {"j1": 0.0, "j2": -90.0, "j3": 0.0, "j4": -90.0, "j5": 0.0, "j6": 0.0}
        self.last_time = time.time()
        self.cycle_time = 0.0
        
        # Thermal cooling coefficient (Newton's law of cooling)
        self.k_cooling = 0.04

    def update(self, 
               robot_status: str, 
               task_type: Optional[str], 
               task_progress: float, 
               current_angles: Dict[str, float], 
               welding_active: bool,
               injected_fault: Optional[str] = None) -> Dict[str, float]:
        """
        Computes deterministic telemetry point based on physical states.
        """
        now = time.time()
        dt = max(0.01, min(now - self.last_time, 0.2))
        self.last_time = now

        # Calculate joint velocities (deg/s)
        total_velocity = 0.0
        max_joint_vel = 0.0
        for k in ["j1", "j2", "j3", "j4", "j5", "j6"]:
            v = abs(current_angles.get(k, 0.0) - self.last_angles.get(k, 0.0)) / dt
            total_velocity += v
            if v > max_joint_vel:
                max_joint_vel = v
        self.last_angles = current_angles.copy()

        is_running = (robot_status == "RUNNING")
        
        if is_running:
            self.cycle_time += dt
            
            # Determine dynamic motion coefficient
            motion_factor = min(1.0, total_velocity / 120.0) # normalized velocity
            
            # Workload multiplier based on task type
            if task_type == "Welding":
                workload_multiplier = 1.35
                tool_power = 280.0 if welding_active else 40.0
                tool_heat = 1.4 if welding_active else 0.2
                tool_vib = 0.45 if welding_active else 0.1
            elif task_type == "Inspection":
                workload_multiplier = 0.85
                tool_power = 30.0
                tool_heat = 0.1
                tool_vib = 0.08
            elif task_type == "Maintenance":
                workload_multiplier = 1.0
                tool_power = 20.0
                tool_heat = 0.15
                tool_vib = 0.12
            else:
                workload_multiplier = 0.6
                tool_power = 15.0
                tool_heat = 0.05
                tool_vib = 0.05

            # 1. Motor Load (%): proportional to joint speed and gravitational holding torque
            target_load = (18.0 + motion_factor * 42.0) * workload_multiplier
            self.motor_load += (target_load - self.motor_load) * 0.15

            # 2. Torque (Nm): base holding + dynamic inertia
            target_torque = self.BASE_TORQUE + (motion_factor * 26.0) * workload_multiplier
            self.torque += (target_torque - self.torque) * 0.20

            # 3. Vibration (mm/s): mechanical bearings + harmonics + tool action
            target_vib = self.BASE_VIB + (motion_factor * 0.85) + tool_vib
            # Add subtle deterministic high-frequency micro-harmonic
            harmonic = 0.04 * math.sin(self.cycle_time * 18.0)
            self.vibration += (target_vib + harmonic - self.vibration) * 0.25

            # 4. Power (W): base electronics + motor inverters + welding arc
            target_power = self.BASE_POWER + (self.motor_load * 3.8) + tool_power
            self.power += (target_power - self.power) * 0.18

            # 5. Temperature (°C): heating from motor load + welding arc - cooling
            heat_in = (self.motor_load * 0.08 + tool_heat) * dt
            heat_out = self.k_cooling * (self.temperature - self.BASE_TEMP) * dt
            self.temperature = max(self.BASE_TEMP, self.temperature + heat_in - heat_out)

        else:
            # Robot is STOPPED, PAUSED, READY, or FAULT
            # Motor load rapidly decays to 0%
            self.motor_load += (self.BASE_LOAD - self.motor_load) * 0.15
            # Torque returns to baseline holding torque (static payload hold ~8 Nm)
            self.torque += (self.BASE_TORQUE - self.torque) * 0.15
            # Vibration drops back to baseline ambient
            self.vibration += (self.BASE_VIB - self.vibration) * 0.20
            # Power drops back to idle baseline ~120W
            self.power += (self.BASE_POWER - self.power) * 0.15
            # Temperature decays exponentially back toward ambient 42°C
            heat_out = self.k_cooling * (self.temperature - self.BASE_TEMP) * dt
            self.temperature = max(self.BASE_TEMP, self.temperature - heat_out)

        # Handle Demo / Injected Faults
        if injected_fault:
            if injected_fault == "J3 Motor Overload":
                self.motor_load = 96.4
                self.torque = 68.5
                self.vibration = max(self.vibration, 3.8)
                self.temperature = max(self.temperature, 76.5)
                self.power = max(self.power, 680.0)
            elif injected_fault == "Overheating":
                self.temperature = 87.8
                self.motor_load = max(self.motor_load, 88.0)
                self.power = max(self.power, 620.0)
            elif injected_fault == "High Vibration":
                self.vibration = 3.92
                self.motor_load = max(self.motor_load, 65.0)
                self.torque = max(self.torque, 48.0)
            elif injected_fault == "High Torque":
                self.torque = 64.2
                self.motor_load = 92.0
                self.power = max(self.power, 650.0)

        return {
            "temperature": round(self.temperature, 2),
            "vibration": round(self.vibration, 2),
            "motor_load": round(self.motor_load, 1),
            "torque": round(self.torque, 1),
            "power": round(self.power, 1),
            "cycle_time": round(self.cycle_time, 2)
        }

    def reset(self):
        self.temperature = self.BASE_TEMP
        self.vibration = self.BASE_VIB
        self.motor_load = self.BASE_LOAD
        self.torque = self.BASE_TORQUE
        self.power = self.BASE_POWER
        self.cycle_time = 0.0
