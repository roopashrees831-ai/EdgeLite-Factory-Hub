"""
EdgeLite Workload Manager

Local ML workload prediction and automatic FULL / LITE / DELAY selection.

Important:
This implementation uses a small pure-Python Random Forest style
regression ensemble so the EdgeLite backend does not depend on
scikit-learn's native DLLs. This avoids Windows Application Control
blocking the backend startup.

The model is trained from deterministic calibration data initially
and can continuously add real measurements collected on the laptop.
"""

from __future__ import annotations

import csv
import math
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple


# ================================================================
# SIMPLE REGRESSION TREE
# ================================================================

@dataclass
class TreeNode:
    prediction: float
    feature_index: Optional[int] = None
    threshold: Optional[float] = None
    left: Optional["TreeNode"] = None
    right: Optional["TreeNode"] = None


class RegressionTree:
    """
    Small regression tree used by the local Random Forest ensemble.
    """

    def __init__(
        self,
        max_depth: int = 7,
        min_samples_leaf: int = 4,
        max_features: int = 3,
        random_state: int = 42,
    ):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.random = random.Random(random_state)
        self.root: Optional[TreeNode] = None

    @staticmethod
    def _mean(values: Sequence[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    @staticmethod
    def _sse(values: Sequence[float]) -> float:
        if not values:
            return 0.0

        mean = sum(values) / len(values)

        return sum(
            (value - mean) ** 2
            for value in values
        )

    def _best_split(
        self,
        X: List[List[float]],
        y: List[float],
        feature_indices: List[int],
    ) -> Tuple[Optional[int], Optional[float], float]:

        best_feature = None
        best_threshold = None
        best_error = float("inf")

        n = len(y)

        if n < self.min_samples_leaf * 2:
            return None, None, best_error

        parent_error = self._sse(y)

        if parent_error <= 1e-9:
            return None, None, best_error

        # Try a limited number of candidate thresholds per feature.
        for feature_index in feature_indices:

            values = sorted(
                row[feature_index]
                for row in X
            )

            unique_values = sorted(set(values))

            if len(unique_values) < 2:
                continue

            candidates: List[float] = []

            # Use evenly distributed candidates for stability.
            if len(unique_values) <= 12:
                for i in range(len(unique_values) - 1):
                    candidates.append(
                        (
                            unique_values[i]
                            + unique_values[i + 1]
                        )
                        / 2.0
                    )
            else:
                positions = [
                    int(
                        i
                        * (len(unique_values) - 2)
                        / 10
                    )
                    for i in range(11)
                ]

                seen = set()

                for pos in positions:
                    pos = max(
                        0,
                        min(
                            pos,
                            len(unique_values) - 2,
                        ),
                    )

                    threshold = (
                        unique_values[pos]
                        + unique_values[pos + 1]
                    ) / 2.0

                    if threshold not in seen:
                        candidates.append(threshold)
                        seen.add(threshold)

            for threshold in candidates:

                left_y: List[float] = []
                right_y: List[float] = []

                for row, target in zip(X, y):

                    if row[feature_index] <= threshold:
                        left_y.append(target)
                    else:
                        right_y.append(target)

                if (
                    len(left_y) < self.min_samples_leaf
                    or len(right_y) < self.min_samples_leaf
                ):
                    continue

                error = (
                    self._sse(left_y)
                    + self._sse(right_y)
                )

                if error < best_error:
                    best_error = error
                    best_feature = feature_index
                    best_threshold = threshold

        # Only split when it produces a useful improvement.
        if best_feature is None:
            return None, None, best_error

        if best_error >= parent_error * 0.995:
            return None, None, best_error

        return (
            best_feature,
            best_threshold,
            best_error,
        )

    def _build(
        self,
        X: List[List[float]],
        y: List[float],
        depth: int,
    ) -> TreeNode:

        prediction = self._mean(y)

        node = TreeNode(
            prediction=prediction,
        )

        if (
            depth >= self.max_depth
            or len(y) < self.min_samples_leaf * 2
        ):
            return node

        n_features = len(X[0])

        count = min(
            self.max_features,
            n_features,
        )

        feature_indices = self.random.sample(
            list(range(n_features)),
            count,
        )

        (
            feature_index,
            threshold,
            _,
        ) = self._best_split(
            X,
            y,
            feature_indices,
        )

        if feature_index is None:
            return node

        left_X: List[List[float]] = []
        left_y: List[float] = []

        right_X: List[List[float]] = []
        right_y: List[float] = []

        for row, target in zip(X, y):

            if row[feature_index] <= threshold:
                left_X.append(row)
                left_y.append(target)

            else:
                right_X.append(row)
                right_y.append(target)

        if (
            len(left_y) < self.min_samples_leaf
            or len(right_y) < self.min_samples_leaf
        ):
            return node

        node.feature_index = feature_index
        node.threshold = threshold

        node.left = self._build(
            left_X,
            left_y,
            depth + 1,
        )

        node.right = self._build(
            right_X,
            right_y,
            depth + 1,
        )

        return node

    def fit(
        self,
        X: List[List[float]],
        y: List[float],
    ) -> None:

        self.root = self._build(
            X,
            y,
            0,
        )

    def _predict_one(
        self,
        row: Sequence[float],
    ) -> float:

        if self.root is None:
            return 0.0

        node = self.root

        while (
            node.feature_index is not None
            and node.threshold is not None
        ):

            if row[node.feature_index] <= node.threshold:

                if node.left is None:
                    break

                node = node.left

            else:

                if node.right is None:
                    break

                node = node.right

        return float(node.prediction)

    def predict(
        self,
        X: List[List[float]],
    ) -> List[float]:

        return [
            self._predict_one(row)
            for row in X
        ]


# ================================================================
# RANDOM FOREST REGRESSOR
# ================================================================

class LocalRandomForestRegressor:
    """
    Pure-Python bagged regression forest.

    This is a real ensemble of randomized regression trees and avoids
    importing scikit-learn.
    """

    def __init__(
        self,
        n_estimators: int = 24,
        max_depth: int = 7,
        min_samples_leaf: int = 4,
        random_state: int = 42,
    ):

        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.random_state = random_state

        self.trees: List[RegressionTree] = []

    def fit(
        self,
        X: List[List[float]],
        y: List[float],
    ) -> None:

        self.trees = []

        master_random = random.Random(
            self.random_state
        )

        sample_count = len(X)

        for estimator_index in range(
            self.n_estimators
        ):

            tree_random_state = master_random.randint(
                0,
                10_000_000,
            )

            # Bootstrap sample.
            sample_indices = [
                master_random.randrange(sample_count)
                for _ in range(sample_count)
            ]

            sample_X = [
                X[index]
                for index in sample_indices
            ]

            sample_y = [
                y[index]
                for index in sample_indices
            ]

            tree = RegressionTree(
                max_depth=self.max_depth,
                min_samples_leaf=self.min_samples_leaf,
                max_features=max(
                    2,
                    int(
                        math.sqrt(
                            len(X[0])
                        )
                    ),
                ),
                random_state=tree_random_state,
            )

            tree.fit(
                sample_X,
                sample_y,
            )

            self.trees.append(tree)

    def predict(
        self,
        X: List[List[float]],
    ) -> List[float]:

        if not self.trees:
            return [
                0.0
                for _ in X
            ]

        predictions_by_tree = [
            tree.predict(X)
            for tree in self.trees
        ]

        predictions: List[float] = []

        for row_index in range(len(X)):

            values = [
                tree_predictions[row_index]
                for tree_predictions in predictions_by_tree
            ]

            predictions.append(
                sum(values) / len(values)
            )

        return predictions


# ================================================================
# WORKLOAD MANAGER
# ================================================================

class WorkloadManager:

    JOB_CODES = {
        "Pick & Place": 1,
        "Telemetry Analysis": 2,
        "Anomaly Detection": 2,
        "Quality Analysis": 3,
        "Report Generation": 4,
        "Inspection": 5,
        "Welding": 6,
        "Maintenance": 7,
        "Material Handling": 1,
    }

    VERSION_CODES = {
        "FULL": 1,
        "LITE": 2,
    }

    def __init__(self):

        self.model_name = (
            "Random Forest Regressor"
        )

        self.training_source = (
            "Deterministic bootstrap calibration "
            "+ local measured workload data"
        )

        self.feature_names = [
            "cpu_percent",
            "memory_percent",
            "active_tasks",
            "queue_length",
            "job_code",
            "version_code",
            "latency_ms",
        ]

        self.measurements_file = (
            Path(__file__).resolve().parents[1]
            / "data"
            / "workload_measurements.csv"
        )

        self.measurements_file.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.model = LocalRandomForestRegressor(
            n_estimators=24,
            max_depth=7,
            min_samples_leaf=4,
            random_state=42,
        )

        self.bootstrap_rows = (
            self._create_bootstrap_dataset()
        )

        self.measurement_count = (
            self._count_measurements()
        )

        self.training_rows = (
            self.bootstrap_rows
            + self._load_measurements()
        )

        self.last_retrain = 0.0
        self.last_decision: Dict[str, Any] = {}

        self._train()

    # ============================================================
    # DATASET CREATION
    # ============================================================

    def _create_bootstrap_dataset(
        self,
    ) -> List[Dict[str, float]]:

        rng = random.Random(42)

        rows: List[Dict[str, float]] = []

        for _ in range(1008):

            job_code = rng.randint(1, 7)

            version_code = rng.choice(
                [1, 2]
            )

            cpu_percent = round(
                rng.uniform(8, 92),
                2,
            )

            memory_percent = round(
                rng.uniform(30, 90),
                2,
            )

            active_tasks = rng.randint(
                0,
                5,
            )

            queue_length = rng.randint(
                0,
                6,
            )

            latency_ms = round(
                rng.uniform(1.0, 20.0),
                2,
            )

            base_times = {
                1: 195.0,
                2: 215.0,
                3: 230.0,
                4: 180.0,
                5: 240.0,
                6: 260.0,
                7: 220.0,
            }

            base = base_times.get(
                job_code,
                200.0,
            )

            load_penalty = (
                cpu_percent * 0.78
                + memory_percent * 0.35
                + active_tasks * 13.0
                + queue_length * 8.0
                + latency_ms * 1.6
            )

            version_factor = (
                1.0
                if version_code == 1
                else 0.50
            )

            noise = rng.uniform(
                -12.0,
                12.0,
            )

            elapsed_ms = (
                base
                + load_penalty
            ) * version_factor + noise

            elapsed_ms = max(
                55.0,
                elapsed_ms,
            )

            rows.append(
                {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory_percent,
                    "active_tasks": float(active_tasks),
                    "queue_length": float(queue_length),
                    "job_code": float(job_code),
                    "version_code": float(version_code),
                    "latency_ms": latency_ms,
                    "elapsed_ms": round(
                        elapsed_ms,
                        2,
                    ),
                }
            )

        return rows

    # ============================================================
    # CSV SUPPORT
    # ============================================================

    def _count_measurements(self) -> int:

        if not self.measurements_file.exists():
            return 0

        try:

            with self.measurements_file.open(
                "r",
                newline="",
                encoding="utf-8",
            ) as file:

                reader = csv.DictReader(file)

                return sum(
                    1
                    for _ in reader
                )

        except Exception:
            return 0

    def _load_measurements(
        self,
    ) -> List[Dict[str, float]]:

        if not self.measurements_file.exists():
            return []

        rows: List[Dict[str, float]] = []

        try:

            with self.measurements_file.open(
                "r",
                newline="",
                encoding="utf-8",
            ) as file:

                reader = csv.DictReader(file)

                for row in reader:

                    try:

                        rows.append(
                            {
                                key: float(
                                    row[key]
                                )
                                for key in self.feature_names
                            }
                            | {
                                "elapsed_ms": float(
                                    row["elapsed_ms"]
                                )
                            }
                        )

                    except Exception:
                        continue

        except Exception:
            return []

        return rows

    # ============================================================
    # TRAIN
    # ============================================================

    def _train(self) -> None:

        X = [
            [
                row[name]
                for name in self.feature_names
            ]
            for row in self.training_rows
        ]

        y = [
            row["elapsed_ms"]
            for row in self.training_rows
        ]

        self.model.fit(
            X,
            y,
        )

        self.last_retrain = time.time()

    # ============================================================
    # FEATURE HELPERS
    # ============================================================

    def _job_code(
        self,
        job_type: str,
    ) -> int:

        return self.JOB_CODES.get(
            job_type,
            1,
        )

    def _feature_vector(
        self,
        job_type: str,
        version: str,
        resources: Dict[str, Any],
        active_tasks: int,
        queue_length: int,
    ) -> List[float]:

        cpu = float(
            resources.get(
                "cpu_percent",
                0.0,
            )
        )

        memory = float(
            resources.get(
                "memory_percent",
                0.0,
            )
        )

        latency = float(
            resources.get(
                "latency_ms",
                1.0,
            )
        )

        return [
            cpu,
            memory,
            float(active_tasks),
            float(queue_length),
            float(
                self._job_code(job_type)
            ),
            float(
                self.VERSION_CODES.get(
                    version,
                    1,
                )
            ),
            latency,
        ]

    # ============================================================
    # RESOURCE PRESSURE
    # ============================================================

    @staticmethod
    def _pressure(
        cpu_percent: float,
        memory_percent: float,
    ) -> str:

        if (
            cpu_percent >= 80
            or memory_percent >= 88
        ):
            return "HIGH"

        if (
            cpu_percent >= 55
            or memory_percent >= 75
        ):
            return "MEDIUM"

        return "LOW"

    # ============================================================
    # PREDICT
    # ============================================================

    def predict(
        self,
        job_type: str,
        version: str,
        resources: Dict[str, Any],
        active_tasks: int = 1,
        queue_length: int = 0,
    ) -> float:

        vector = self._feature_vector(
            job_type,
            version,
            resources,
            active_tasks,
            queue_length,
        )

        prediction = self.model.predict(
            [vector]
        )[0]

        return round(
            max(
                20.0,
                float(prediction),
            ),
            2,
        )

    # ============================================================
    # DECISION ENGINE
    # ============================================================

    def decide(
        self,
        job_type: str,
        priority: str,
        deadline_ms: float,
        resources: Dict[str, Any],
        active_tasks: int = 1,
        queue_length: int = 0,
    ) -> Dict[str, Any]:

        cpu = float(
            resources.get(
                "cpu_percent",
                0.0,
            )
        )

        memory = float(
            resources.get(
                "memory_percent",
                0.0,
            )
        )

        latency = float(
            resources.get(
                "latency_ms",
                1.0,
            )
        )

        pressure = self._pressure(
            cpu,
            memory,
        )

        predicted_full = self.predict(
            job_type,
            "FULL",
            resources,
            active_tasks,
            queue_length,
        )

        predicted_lite = self.predict(
            job_type,
            "LITE",
            resources,
            active_tasks,
            queue_length,
        )

        priority = (
            priority or "NORMAL"
        ).upper()

        deadline_ms = float(
            deadline_ms
        )

        # --------------------------------------------------------
        # Automatic scheduling logic
        # --------------------------------------------------------

        if (
            priority == "CRITICAL"
            and predicted_full <= deadline_ms
            and pressure == "LOW"
        ):

            mode = "FULL"
            reason = (
                "Critical workload fits the deadline "
                "and edge resources have sufficient headroom."
            )

        elif (
            predicted_lite <= deadline_ms
        ):

            mode = "LITE"

            reason = (
                "Lightweight local AI satisfies the "
                "deadline while protecting edge responsiveness."
            )

        elif (
            priority == "CRITICAL"
            and pressure != "HIGH"
        ):

            mode = "LITE"

            reason = (
                "Critical workload remains local; "
                "lightweight AI is selected to protect responsiveness."
            )

        elif (
            pressure == "HIGH"
            and priority != "CRITICAL"
        ):

            mode = "DELAY"

            reason = (
                "Edge resources are heavily loaded and "
                "the workload is not critical, so execution is delayed."
            )

        else:

            mode = "DELAY"

            reason = (
                "Predicted execution exceeds the available "
                "deadline under current edge conditions."
            )

        predicted_ms = (
            predicted_full
            if mode == "FULL"
            else predicted_lite
        )

        mode_labels = {
            "FULL": "FULL LOCAL AI",
            "LITE": "LITE LOCAL AI",
            "DELAY": "DELAY / QUEUE",
        }

        decision = {
            "job_type": job_type,
            "priority": priority,
            "mode": mode,
            "mode_label": mode_labels[mode],
            "predicted_ms": round(
                predicted_ms,
                2,
            ),
            "predicted_full_ms": round(
                predicted_full,
                2,
            ),
            "predicted_lite_ms": round(
                predicted_lite,
                2,
            ),
            "deadline_ms": round(
                deadline_ms,
                2,
            ),
            "resource_pressure": pressure,
            "cpu_percent": round(
                cpu,
                1,
            ),
            "memory_percent": round(
                memory,
                1,
            ),
            "reason": reason,
            "model_name": self.model_name,
            "training_source": self.training_source,
            "training_samples": len(
                self.training_rows
            ),
        }

        self.last_decision = decision

        return decision

    # ============================================================
    # REAL MEASUREMENTS
    # ============================================================

    def record_measurement(
        self,
        job_type: str,
        version: str,
        resources: Dict[str, Any],
        active_tasks: int,
        queue_length: int,
        elapsed_ms: float,
    ) -> Dict[str, Any]:

        file_exists = (
            self.measurements_file.exists()
        )

        with self.measurements_file.open(
            "a",
            newline="",
            encoding="utf-8",
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=[
                    *self.feature_names,
                    "elapsed_ms",
                    "timestamp",
                ],
            )

            if not file_exists:
                writer.writeheader()

            writer.writerow(
                {
                    "cpu_percent": float(
                        resources.get(
                            "cpu_percent",
                            0.0,
                        )
                    ),
                    "memory_percent": float(
                        resources.get(
                            "memory_percent",
                            0.0,
                        )
                    ),
                    "active_tasks": int(
                        active_tasks
                    ),
                    "queue_length": int(
                        queue_length
                    ),
                    "job_code": self._job_code(
                        job_type
                    ),
                    "version_code": self.VERSION_CODES.get(
                        version,
                        1,
                    ),
                    "latency_ms": float(
                        resources.get(
                            "latency_ms",
                            1.0,
                        )
                    ),
                    "elapsed_ms": float(
                        elapsed_ms
                    ),
                    "timestamp": time.time(),
                }
            )

        self.measurement_count += 1

        # Rebuild the training set occasionally.
        if self.measurement_count % 10 == 0:

            self.training_rows = (
                self.bootstrap_rows
                + self._load_measurements()
            )

            self._train()

        return {
            "saved": True,
            "measurement_count": self.measurement_count,
            "retrained": (
                self.measurement_count % 10 == 0
            ),
        }

    # ============================================================
    # STATUS
    # ============================================================

    def status(self) -> Dict[str, Any]:

        return {
            "model_name": self.model_name,
            "feature_names": self.feature_names,
            "training_source": self.training_source,
            "training_samples": len(
                self.training_rows
            ),
            "measurements_file": str(
                self.measurements_file
            ),
            "last_retrain": self.last_retrain,
            "last_decision": self.last_decision,
        }


# ================================================================
# GLOBAL INSTANCE
# ================================================================

workload_manager = WorkloadManager()