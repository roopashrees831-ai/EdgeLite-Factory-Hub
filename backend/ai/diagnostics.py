"""
EdgeLite AI Diagnostics & Fault Resolution Engine
Provides deterministic, explainable root-cause analysis and actionable recovery steps
for detected anomalies and locally simulated demo faults.
"""
from typing import Dict, Any, Optional

class DiagnosticsEngine:
    FAULT_MAPPINGS = {
        "J3 Motor Overload": {
            "problem": "J3 (Elbow) motor load exceeded safe limit (96.4% > 90%).",
            "cause": "High sustained joint torque during trajectory interpolation combined with continuous welding duty cycle.",
            "recommended_action": "Reduce operating speed / allow joint cooling / inspect J3 harmonic drive.",
            "severity": "CRITICAL"
        },
        "Overheating": {
            "problem": "Robot thermal threshold exceeded (87.8°C > 85.0°C).",
            "cause": "High sustained motor load and continuous welding arc power without adequate dwell interval.",
            "recommended_action": "Reduce welding duty cycle, inspect cooling passages, and allow temperature to normalize below 55°C.",
            "severity": "HIGH"
        },
        "High Vibration": {
            "problem": "Harmonic mechanical vibration exceeded safety threshold (3.92 mm/s > 3.50 mm/s).",
            "cause": "Wrist assembly resonance and high tool-tip acceleration during rapid trajectory weaving.",
            "recommended_action": "Re-calibrate joint PID damping, inspect tool flange mounting bolts, and lower weave frequency.",
            "severity": "HIGH"
        },
        "High Torque": {
            "problem": "Torque limit safety trip triggered (64.2 Nm > 50.0 Nm).",
            "cause": "Mechanical resistance on J2/J3 axes or simulated fixture clearance impedance.",
            "recommended_action": "Verify tool clearance envelopes, check joint axis friction, and recalibrate payload offset.",
            "severity": "CRITICAL"
        }
    }

    @classmethod
    def diagnose_fault(cls, fault_type: str, affected_task_id: Optional[str], affected_task_name: Optional[str]) -> Dict[str, Any]:
        """
        Produce structured diagnostic report for an injected or triggered fault.
        Clearly labels simulated demo origin per Requirement 15.
        """
        mapping = cls.FAULT_MAPPINGS.get(fault_type, {
            "problem": f"Abnormal condition detected: {fault_type}",
            "cause": "Unexpected digital twin telemetry divergence.",
            "recommended_action": "Pause active task, inspect telemetry trends, and clear fault when nominal.",
            "severity": "WARNING"
        })

        return {
            "is_demo_fault": True,
            "origin_label": "Demo/Test Fault — simulated locally",
            "fault_type": fault_type,
            "problem": mapping["problem"],
            "cause": mapping["cause"],
            "affected_task_id": affected_task_id,
            "affected_task_name": affected_task_name or "Current Motion Task",
            "recommended_action": mapping["recommended_action"],
            "severity": mapping["severity"],
            "status": "ACTIVE"
        }

    @classmethod
    def diagnose_threshold_breach(cls, threshold_name: str, current_value: float, limit_value: float, affected_task_name: Optional[str]) -> Dict[str, Any]:
        """Produce structured diagnosis when a physical threshold is breached during running operation."""
        return {
            "is_demo_fault": False,
            "origin_label": "Deterministic Safety Threshold Alert",
            "fault_type": f"{threshold_name} Threshold Breach",
            "problem": f"Robot {threshold_name} reached {current_value} (threshold: {limit_value}).",
            "cause": f"Sustained operating load pushed {threshold_name.lower()} past safety boundary.",
            "affected_task_name": affected_task_name or "Active Task",
            "recommended_action": "Reduce operating speed and allow cooling / stabilization.",
            "severity": "HIGH",
            "status": "ACTIVE"
        }

diagnostics = DiagnosticsEngine()
