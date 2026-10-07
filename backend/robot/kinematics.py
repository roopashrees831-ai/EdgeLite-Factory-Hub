"""
Universal Robots UR5e Kinematics & Trajectory Engine
Implements forward kinematics, joint limits, and smooth multi-axis trajectory interpolation.
"""
import math
import numpy as np
from typing import Dict, List, Tuple

class UR5eKinematics:
    # UR5e standard DH parameters / kinematic link lengths (meters)
    D1 = 0.1625   # Base to Shoulder
    A2 = -0.425   # Upper Arm length
    A3 = -0.3922  # Forearm length
    D4 = 0.1333   # Wrist 1
    D5 = 0.0997   # Wrist 2
    D6 = 0.0996   # Wrist 3

    # Safe Home Pose in Degrees
    HOME_POSE_DEG = {
        "j1": 0.0,
        "j2": -90.0,
        "j3": 0.0,
        "j4": -90.0,
        "j5": 0.0,
        "j6": 0.0
    }

    # Joint limits (degrees)
    JOINT_LIMITS = {
        "j1": (-360.0, 360.0),
        "j2": (-360.0, 360.0),
        "j3": (-360.0, 360.0),
        "j4": (-360.0, 360.0),
        "j5": (-360.0, 360.0),
        "j6": (-360.0, 360.0)
    }

    @staticmethod
    def deg2rad(val: float) -> float:
        return math.radians(val)

    @staticmethod
    def rad2deg(val: float) -> float:
        return math.degrees(val)

    @classmethod
    def forward_kinematics(cls, angles_deg: Dict[str, float]) -> Tuple[float, float, float]:
        """
        Compute end-effector Cartesian position (x, y, z) in meters from joint angles.
        Uses UR5e kinematic parameters.
        """
        theta1 = cls.deg2rad(angles_deg.get("j1", 0.0))
        theta2 = cls.deg2rad(angles_deg.get("j2", -90.0))
        theta3 = cls.deg2rad(angles_deg.get("j3", 0.0))
        theta4 = cls.deg2rad(angles_deg.get("j4", -90.0))
        theta5 = cls.deg2rad(angles_deg.get("j5", 0.0))
        theta6 = cls.deg2rad(angles_deg.get("j6", 0.0))

        # Direct geometric FK calculation for UR5e
        # Shoulder center
        s_z = cls.D1
        
        # Upper arm
        # in sagittal plane rotated by theta1
        t23 = theta2 + theta3
        t234 = theta2 + theta3 + theta4

        # Planar reach
        r = -cls.A2 * math.cos(theta2) - cls.A3 * math.cos(t23) + cls.D5 * math.sin(t234)
        z = s_z + cls.A2 * math.sin(theta2) + cls.A3 * math.sin(t23) - cls.D5 * math.cos(t234)

        # Account for wrist 1 & 2 lateral offset D4, D6
        x = r * math.cos(theta1) - cls.D4 * math.sin(theta1)
        y = r * math.sin(theta1) + cls.D4 * math.cos(theta1)

        # Tool tip extension (welding torch length ~0.15m)
        tool_length = 0.15
        x += tool_length * math.sin(t234) * math.cos(theta1)
        y += tool_length * math.sin(t234) * math.sin(theta1)
        z += tool_length * math.cos(t234)

        return round(float(x), 4), round(float(y), 4), round(float(z), 4)

    @classmethod
    def get_trajectory_pose(cls, task_type: str, progress: float) -> Tuple[Dict[str, float], bool]:
        """
        Generates realistic joint poses along a smooth trajectory based on task type and progress (0.0 to 1.0).
        Returns: (joint_angles_deg, welding_active)
        """
        p = max(0.0, min(progress, 1.0))
        welding_active = False

        if task_type == "Welding":
            # Phase 1 (0.0 - 0.15): Approach to weld start
            # Phase 2 (0.15 - 0.85): Active seam welding with weaving sinusoidal motion
            # Phase 3 (0.85 - 1.0): Torch retract and return toward home
            if p < 0.15:
                sub = p / 0.15
                s = 0.5 * (1.0 - math.cos(sub * math.pi)) # S-curve
                j1 = 0.0 + 35.0 * s
                j2 = -90.0 + 25.0 * s
                j3 = 0.0 + 40.0 * s
                j4 = -90.0 - 15.0 * s
                j5 = 0.0 + 35.0 * s
                j6 = 0.0
                welding_active = False
            elif p <= 0.85:
                sub = (p - 0.15) / 0.70
                welding_active = True
                # Weld seam linear travel + weaving oscillation
                weave = math.sin(sub * 24.0 * math.pi) * 3.5  # rapid high precision weave
                j1 = 35.0 + sub * 20.0 + weave * 0.8
                j2 = -65.0 - sub * 8.0 + math.cos(sub * 12.0 * math.pi) * 1.5
                j3 = 40.0 + sub * 12.0 - weave * 0.5
                j4 = -105.0 + sub * 6.0 + weave * 0.7
                j5 = 35.0 + math.sin(sub * 6.0 * math.pi) * 4.0
                j6 = sub * 90.0 + weave * 1.2
            else:
                sub = (p - 0.85) / 0.15
                s = 0.5 * (1.0 - math.cos(sub * math.pi))
                j1 = 55.0 - 55.0 * s
                j2 = -73.0 - 17.0 * s
                j3 = 52.0 - 52.0 * s
                j4 = -99.0 + 9.0 * s
                j5 = 35.0 - 35.0 * s
                j6 = 90.0 - 90.0 * s
                welding_active = False

        elif task_type == "Pick & Place":
            # Smooth factory material-handling cycle.
            waypoints = [
                (0.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
                (0.12, (24.0, -78.0, 8.0, -98.0, 0.0, 0.0)),
                (0.22, (32.0, -64.0, 12.0, -104.0, 0.0, 0.0)),
                (0.32, (32.0, -64.0, 12.0, -104.0, 0.0, 0.0)),
                # Distinct lift after gripping
                (0.50, (32.0, -35.0, -12.0, -86.0, 0.0, 0.0)),
                # Carry while the part stays elevated
                (0.70, (-32.0, -35.0, -12.0, -86.0, 0.0, 0.0)),
                # Lower at destination
                (0.82, (-32.0, -64.0, 12.0, -104.0, 0.0, 0.0)),
                (0.90, (-32.0, -64.0, 12.0, -104.0, 0.0, 0.0)),
                (1.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
            ]
            def smoothstep(value: float) -> float:
                value = max(0.0, min(1.0, value))
                return value * value * (3.0 - 2.0 * value)
            for index in range(len(waypoints) - 1):
                start_p, start_pose = waypoints[index]
                end_p, end_pose = waypoints[index + 1]
                if p <= end_p or index == len(waypoints) - 2:
                    span = max(0.0001, end_p - start_p)
                    local = smoothstep((p - start_p) / span)
                    pose = tuple(start_pose[j] + (end_pose[j] - start_pose[j]) * local for j in range(6))
                    j1, j2, j3, j4, j5, j6 = pose
                    break
            welding_active = False

        elif task_type == "Sorting":
            # Synthetic sorting cycle: pick at input, transfer to sorting bay, return home.
            waypoints = [
                (0.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
                (0.16, (28.0, -78.0, -8.0, -102.0, 0.0, 0.0)),
                (0.30, (28.0, -62.0, 8.0, -106.0, 0.0, 0.0)),
                (0.44, (28.0, -80.0, -10.0, -100.0, 0.0, 0.0)),
                (0.64, (-28.0, -80.0, -10.0, -100.0, 0.0, 0.0)),
                (0.78, (-28.0, -64.0, 8.0, -106.0, 0.0, 0.0)),
                (0.90, (-28.0, -80.0, -10.0, -100.0, 0.0, 0.0)),
                (1.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
            ]
            def smoothstep(value: float) -> float:
                value = max(0.0, min(1.0, value))
                return value * value * (3.0 - 2.0 * value)
            for index in range(len(waypoints) - 1):
                start_p, start_pose = waypoints[index]
                end_p, end_pose = waypoints[index + 1]
                if p <= end_p or index == len(waypoints) - 2:
                    span = max(0.0001, end_p - start_p)
                    local = smoothstep((p - start_p) / span)
                    pose = tuple(start_pose[j] + (end_pose[j] - start_pose[j]) * local for j in range(6))
                    j1, j2, j3, j4, j5, j6 = pose
                    break
            welding_active = False

        elif task_type == "Palletizing":
            # Synthetic palletizing cycle: pick, raise, move to pallet slot, place, return.
            waypoints = [
                (0.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
                (0.16, (-24.0, -80.0, -8.0, -102.0, 0.0, 0.0)),
                (0.30, (-24.0, -62.0, 10.0, -106.0, 0.0, 0.0)),
                (0.45, (-6.0, -82.0, -12.0, -98.0, 0.0, 0.0)),
                (0.64, (18.0, -72.0, -6.0, -102.0, 0.0, 0.0)),
                (0.78, (30.0, -62.0, 10.0, -106.0, 0.0, 0.0)),
                (0.90, (18.0, -82.0, -12.0, -98.0, 0.0, 0.0)),
                (1.00, (0.0, -90.0, 0.0, -90.0, 0.0, 0.0)),
            ]
            def smoothstep(value: float) -> float:
                value = max(0.0, min(1.0, value))
                return value * value * (3.0 - 2.0 * value)
            for index in range(len(waypoints) - 1):
                start_p, start_pose = waypoints[index]
                end_p, end_pose = waypoints[index + 1]
                if p <= end_p or index == len(waypoints) - 2:
                    span = max(0.0001, end_p - start_p)
                    local = smoothstep((p - start_p) / span)
                    pose = tuple(start_pose[j] + (end_pose[j] - start_pose[j]) * local for j in range(6))
                    j1, j2, j3, j4, j5, j6 = pose
                    break
            welding_active = False

        elif task_type == "Welding Path":
            # Synthetic welding path separate from the Pick & Place motion.
            if p < 0.18:
                sub = p / 0.18
                s = 0.5 * (1.0 - math.cos(sub * math.pi))
                j1 = 0.0 + 30.0 * s
                j2 = -90.0 + 22.0 * s
                j3 = 0.0 + 30.0 * s
                j4 = -90.0 - 12.0 * s
                j5 = 0.0
                j6 = 0.0
                welding_active = False
            elif p <= 0.84:
                sub = (p - 0.18) / 0.66
                weave = math.sin(sub * 18.0 * math.pi) * 2.2
                j1 = 30.0 + sub * 24.0 + weave
                j2 = -68.0 - sub * 10.0
                j3 = 30.0 + sub * 12.0 - weave
                j4 = -102.0 + sub * 8.0 + weave
                j5 = math.sin(sub * 4.0 * math.pi) * 4.0
                j6 = sub * 80.0
                welding_active = True
            else:
                sub = (p - 0.84) / 0.16
                s = 0.5 * (1.0 - math.cos(sub * math.pi))
                j1 = 54.0 - 54.0 * s
                j2 = -78.0 - 12.0 * s
                j3 = 42.0 - 42.0 * s
                j4 = -94.0 + 4.0 * s
                j5 = 0.0
                j6 = 80.0 - 80.0 * s
                welding_active = False

        elif task_type == "Inspection":
            # Inspection camera orbital inspection around parts
            sub = p
            angle_sweep = sub * 2.0 * math.pi
            j1 = 25.0 * math.sin(angle_sweep)
            j2 = -90.0 + 30.0 * math.cos(angle_sweep * 0.5)
            j3 = 35.0 * math.sin(angle_sweep * 0.5)
            j4 = -90.0 + 20.0 * math.cos(angle_sweep)
            j5 = 45.0 * math.sin(angle_sweep)
            j6 = sub * 180.0
            welding_active = False

        elif task_type == "Maintenance":
            # Joint range validation sequence
            cycle = p * 6.0
            idx = int(cycle)
            frac = cycle - idx
            s = math.sin(frac * math.pi)
            j1 = cls.HOME_POSE_DEG["j1"] + (40.0 * s if idx == 0 else 0.0)
            j2 = cls.HOME_POSE_DEG["j2"] + (30.0 * s if idx == 1 else 0.0)
            j3 = cls.HOME_POSE_DEG["j3"] + (35.0 * s if idx == 2 else 0.0)
            j4 = cls.HOME_POSE_DEG["j4"] + (30.0 * s if idx == 3 else 0.0)
            j5 = cls.HOME_POSE_DEG["j5"] + (45.0 * s if idx == 4 else 0.0)
            j6 = cls.HOME_POSE_DEG["j6"] + (60.0 * s if idx == 5 else 0.0)
            welding_active = False

        else:
            # Subtle standby breathing / minimal idle pose
            j1 = cls.HOME_POSE_DEG["j1"]
            j2 = cls.HOME_POSE_DEG["j2"]
            j3 = cls.HOME_POSE_DEG["j3"]
            j4 = cls.HOME_POSE_DEG["j4"]
            j5 = cls.HOME_POSE_DEG["j5"]
            j6 = cls.HOME_POSE_DEG["j6"]
            welding_active = False

        return {
            "j1": round(j1, 2),
            "j2": round(j2, 2),
            "j3": round(j3, 2),
            "j4": round(j4, 2),
            "j5": round(j5, 2),
            "j6": round(j6, 2)
        }, welding_active
