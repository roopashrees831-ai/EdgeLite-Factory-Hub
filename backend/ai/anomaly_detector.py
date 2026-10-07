"""
EdgeLite AI Anomaly Detection Engine

Runs locally on the EdgeLite node with zero cloud dependency.

This detector uses explainable statistical anomaly scoring plus hard
industrial safety thresholds. The main workload-management ML model
(Random Forest Regressor) remains responsible for FULL/LITE workload
selection.

A scikit-learn IsolationForest is intentionally not imported here because
some Windows security configurations block scikit-learn native SVM/liblinear
DLL loading during FastAPI startup.
"""

from typing import Dict, Any, Optional

import numpy as np


class AnomalyDetector:
    def __init__(self):
        self.feature_names = [
            "temperature",
            "vibration",
            "motor_load",
            "torque",
            "power",
        ]

        # ------------------------------------------------------------
        # Normal operating baseline
        # ------------------------------------------------------------
        self.baseline_stats = {
            "temperature": {
                "mean": 48.0,
                "std": 6.5,
                "unit": "°C",
            },
            "vibration": {
                "mean": 0.85,
                "std": 0.35,
                "unit": "mm/s",
            },
            "motor_load": {
                "mean": 38.0,
                "std": 14.0,
                "unit": "%",
            },
            "torque": {
                "mean": 24.0,
                "std": 8.5,
                "unit": "Nm",
            },
            "power": {
                "mean": 290.0,
                "std": 70.0,
                "unit": "W",
            },
        }

        # ------------------------------------------------------------
        # Hard safety thresholds
        # ------------------------------------------------------------
        self.thresholds = {
            "temperature": 85.0,
            "vibration": 3.5,
            "motor_load": 90.0,
            "torque": 55.0,
        }

        self.data_source = (
            "Digital-Twin Baseline Simulation Dataset "
            "(Local Edge Statistical Model)"
        )

        self.model_name = "Explainable Edge Anomaly Detector"

    # ================================================================
    # Shared helpers
    # ================================================================

    def _get_deviations(
        self,
        telemetry: Dict[str, float],
    ) -> Dict[str, float]:
        """
        Calculate explainable Z-score deviations for every telemetry
        feature.
        """
        deviations: Dict[str, float] = {}

        for feature in self.feature_names:
            value = float(
                telemetry.get(
                    feature,
                    self.baseline_stats[feature]["mean"],
                )
            )

            mean = self.baseline_stats[feature]["mean"]
            std = max(self.baseline_stats[feature]["std"], 0.0001)

            z = (value - mean) / std

            deviations[feature] = round(float(z), 2)

        return deviations

    def _find_highest_deviation(
        self,
        deviations: Dict[str, float],
    ):
        highest_feature: Optional[str] = None
        highest_abs = 0.0

        for feature, value in deviations.items():
            magnitude = abs(float(value))

            if magnitude > highest_abs:
                highest_abs = magnitude
                highest_feature = feature

        return highest_feature, highest_abs

    def _check_thresholds(
        self,
        telemetry: Dict[str, float],
    ) -> Optional[str]:
        """
        Check deterministic industrial safety limits.
        """

        if float(
            telemetry.get("temperature", 0.0)
        ) >= self.thresholds["temperature"]:
            return "Temperature"

        if float(
            telemetry.get("vibration", 0.0)
        ) >= self.thresholds["vibration"]:
            return "Vibration"

        if float(
            telemetry.get("motor_load", 0.0)
        ) >= self.thresholds["motor_load"]:
            return "Motor Load"

        if float(
            telemetry.get("torque", 0.0)
        ) >= self.thresholds["torque"]:
            return "Torque"

        return None

    def _threshold_message(
        self,
        telemetry: Dict[str, float],
        breached: str,
    ) -> str:
        key = breached.lower().replace(" ", "_")

        value = telemetry.get(key, 0.0)
        limit = self.thresholds[key]

        return (
            f"Safety limit breached: {breached} reached "
            f"{value} (limit: {limit}). "
            f"Sustained operation exceeded the safe "
            f"digital-twin envelope."
        )

    # ================================================================
    # LITE model
    # ================================================================

    def analyze_lite(
        self,
        telemetry: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Fast lightweight local safety screening.

        Used when EdgeLite selects LITE LOCAL AI.
        """

        deviations = self._get_deviations(telemetry)

        highest_feature, highest_abs = (
            self._find_highest_deviation(deviations)
        )

        breached = self._check_thresholds(telemetry)

        # Lightweight anomaly score.
        score = min(
            0.99,
            max(
                0.01,
                highest_abs / 5.0,
            ),
        )

        score = round(float(score), 3)

        is_anomaly = (
            breached is not None
            or highest_abs >= 3.2
        )

        if breached:
            explanation = self._threshold_message(
                telemetry,
                breached,
            )

        elif is_anomaly:
            explanation = (
                "Fast edge screening found an unusual "
                f"statistical deviation in "
                f"{highest_feature}."
            )

        else:
            explanation = (
                "Fast edge safety screening is within "
                "the nominal operating envelope."
            )

        return {
            "ai_health": (
                "ANOMALY DETECTED"
                if is_anomaly
                else "NORMAL"
            ),
            "anomaly_score": score,
            "threshold_breached": breached,
            "feature_contributions": deviations,
            "explanation": explanation,
            "data_source": (
                "Local lightweight edge safety model"
            ),
            "model_mode": "LITE",
            "model_name": self.model_name,
        }

    # ================================================================
    # FULL model
    # ================================================================

    def analyze(
        self,
        telemetry: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Full explainable local anomaly analysis.

        Combines normalized telemetry deviation across all monitored
        robot-health features and deterministic safety thresholds.
        """

        deviations = self._get_deviations(telemetry)

        values = np.asarray(
            list(deviations.values()),
            dtype=float,
        )

        highest_feature, highest_abs = (
            self._find_highest_deviation(deviations)
        )

        # Overall deviation.
        mean_abs = float(
            np.mean(np.abs(values))
        )

        # Give the strongest abnormal feature more influence while
        # still considering the complete robot-health vector.
        composite_deviation = (
            (highest_abs * 0.70)
            + (mean_abs * 0.30)
        )

        norm_score = (
            0.5
            + (composite_deviation / 6.0)
        )

        norm_score = round(
            float(
                np.clip(
                    norm_score,
                    0.01,
                    0.99,
                )
            ),
            3,
        )

        # Industrial safety thresholds always override statistical
        # scoring.
        breached_threshold = (
            self._check_thresholds(telemetry)
        )

        is_anomaly = (
            breached_threshold is not None
            or norm_score > 0.65
            or highest_abs > 3.2
        )

        if breached_threshold:

            explanation = self._threshold_message(
                telemetry,
                breached_threshold,
            )

        elif is_anomaly:

            explanation = (
                "Unusual statistical deviation detected "
                f"in {highest_feature} "
                f"({round(highest_abs, 1)}σ from nominal "
                "baseline). Edge analysis indicates "
                "increased robot-health deviation."
            )

        else:

            explanation = (
                "All operating metrics are within the "
                "nominal digital-twin baseline envelope. "
                "Motor loading, vibration, thermal level "
                "and power consumption remain stable."
            )

        return {
            "ai_health": (
                "ANOMALY DETECTED"
                if is_anomaly
                else "NORMAL"
            ),
            "anomaly_score": norm_score,
            "threshold_breached": breached_threshold,
            "feature_contributions": deviations,
            "explanation": explanation,
            "data_source": self.data_source,
            "model_mode": "FULL",
            "model_name": self.model_name,
        }


# Global detector instance
anomaly_detector = AnomalyDetector()