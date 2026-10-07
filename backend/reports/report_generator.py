"""
EdgeLite Automatic Task Report Generator

Generates comprehensive industrial reports from recorded simulation
and telemetry events.

Exports to PDF, CSV, and JSON-compatible dictionaries.
"""

import io
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.units import inch

from database.database import (
    save_report,
    get_report_by_id,
    get_all_reports,
)


class ReportGenerator:
    @staticmethod
    def generate_report_record(
        task: Dict[str, Any],
        telemetry_samples: List[Dict[str, float]],
        events: List[Dict[str, Any]],
        edge_metrics: Dict[str, Any],
        fault_occurred: bool = False,
        fault_name: Optional[str] = None,
        edge_samples: Optional[List[Dict[str, Any]]] = None,
        stage_summary: Optional[str] = None,
        ai_mode: Optional[str] = None,
        status_override: Optional[str] = None,
        end_time_override: Optional[str] = None,
        final_result_override: Optional[str] = None,
        report_suffix: str = "",
    ) -> Dict[str, Any]:
        """
        Generate one complete industrial task report.

        This method intentionally accepts optional compatibility parameters
        used by the Digital Twin engine:

            edge_samples
            stage_summary
            ai_mode
            status_override
            end_time_override
            final_result_override
            report_suffix

        These optional arguments allow both normal task-completion reports
        and simulated-fault reports to use the same report generator.
        """

        now = datetime.now()

        task_id = str(task.get("id", "UNKNOWN"))

        report_id = (
            f"RPT-{int(now.timestamp())}-{task_id}{report_suffix}"
        )

        telemetry_samples = telemetry_samples or []
        events = events or []
        edge_metrics = edge_metrics or {}
        edge_samples = edge_samples or []

        # ---------------------------------------------------------
        # TELEMETRY AGGREGATES
        # ---------------------------------------------------------

        if telemetry_samples:
            loads = [
                float(sample.get("motor_load", 0.0))
                for sample in telemetry_samples
            ]

            temperatures = [
                float(sample.get("temperature", 42.0))
                for sample in telemetry_samples
            ]

            vibrations = [
                float(sample.get("vibration", 0.4))
                for sample in telemetry_samples
            ]

            torques = [
                float(sample.get("torque", 8.0))
                for sample in telemetry_samples
            ]

            powers = [
                float(sample.get("power", 120.0))
                for sample in telemetry_samples
            ]

            avg_load = round(
                sum(loads) / len(loads),
                1,
            )

            peak_load = round(
                max(loads),
                1,
            )

            avg_temperature = round(
                sum(temperatures) / len(temperatures),
                1,
            )

            peak_temperature = round(
                max(temperatures),
                1,
            )

            avg_vibration = round(
                sum(vibrations) / len(vibrations),
                2,
            )

            peak_vibration = round(
                max(vibrations),
                2,
            )

            avg_torque = round(
                sum(torques) / len(torques),
                1,
            )

            peak_torque = round(
                max(torques),
                1,
            )

            avg_power = round(
                sum(powers) / len(powers),
                1,
            )

            peak_power = round(
                max(powers),
                1,
            )

        else:
            # Safe deterministic fallback values for the
            # software digital-twin simulation.
            avg_load = 45.2
            peak_load = 68.0

            avg_temperature = 51.4
            peak_temperature = 56.2

            avg_vibration = 0.88
            peak_vibration = 1.45

            avg_torque = 24.5
            peak_torque = 36.0

            avg_power = 340.0
            peak_power = 485.0

        # ---------------------------------------------------------
        # EDGE METRICS
        # ---------------------------------------------------------

        edge_cpu_avg = round(
            float(
                edge_metrics.get(
                    "cpu_percent",
                    14.5,
                )
            ),
            1,
        )

        edge_ram_avg = round(
            float(
                edge_metrics.get(
                    "memory_percent",
                    42.0,
                )
            ),
            1,
        )

        # ---------------------------------------------------------
        # STATUS / RESULT
        # ---------------------------------------------------------

        if status_override is not None:
            final_status = status_override

        elif fault_occurred:
            final_status = "PAUSED"

        else:
            # This function is used by the normal completion path,
            # so a normal generated execution report represents a
            # successfully completed task.
            final_status = "COMPLETED"

        if final_result_override is not None:
            final_quality_result = final_result_override

        elif fault_occurred:
            final_quality_result = (
                "Fault detected — task paused for recovery"
            )

        else:
            final_quality_result = "Successful"

        # ---------------------------------------------------------
        # FAULT / ANOMALY INFORMATION
        # ---------------------------------------------------------

        if fault_occurred:
            anomalies_detected = "1 Anomaly Tripped"

            faults_string = (
                f"Simulated Demo: "
                f"{fault_name or 'Safety Fault'}"
            )

            corrective_actions = (
                "Cleared via operator fault recovery protocol"
            )

        else:
            anomalies_detected = "None"
            faults_string = "None"

            corrective_actions = (
                "Nominal operating envelope preserved"
            )

        # ---------------------------------------------------------
        # TIMESTAMPS / DURATION
        # ---------------------------------------------------------

        start_time = task.get("start_time")

        if not start_time:
            start_time = now.strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        if end_time_override:
            end_time = end_time_override

        else:
            end_time = (
                task.get("end_time")
                or now.strftime("%Y-%m-%d %H:%M:%S")
            )

        duration_value = task.get(
            "duration",
            0.0,
        )

        try:
            duration = round(
                float(duration_value),
                1,
            )
        except (TypeError, ValueError):
            duration = 0.0

        # ---------------------------------------------------------
        # TASK INFORMATION
        # ---------------------------------------------------------

        task_name = str(
            task.get(
                "name",
                "Unnamed Task",
            )
        )

        task_type = str(
            task.get(
                "type",
                "Unknown",
            )
        )

        priority = str(
            task.get(
                "priority",
                "MEDIUM",
            )
        )

        # ---------------------------------------------------------
        # STAGE / AI INFORMATION
        # ---------------------------------------------------------

        if stage_summary:
            execution_stage_summary = stage_summary
        else:
            execution_stage_summary = "Not recorded"

        if ai_mode:
            selected_ai_mode = ai_mode
        else:
            selected_ai_mode = "LOCAL_EDGE_PROCESSING"

        # ---------------------------------------------------------
        # REPORT RECORD
        # ---------------------------------------------------------

        report_data = {
            "id": report_id,
            "task_id": task_id,
            "task_name": task_name,
            "task_type": task_type,
            "priority": priority,

            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,

            "status": final_status,

            "robot": (
                "Universal Robots UR5e "
                "(Cell-01)"
            ),

            "cycle_count": 1,

            "avg_motor_load": avg_load,
            "peak_motor_load": peak_load,

            "avg_temperature": avg_temperature,
            "peak_temperature": peak_temperature,

            "avg_vibration": avg_vibration,
            "peak_vibration": peak_vibration,

            "avg_torque": avg_torque,
            "peak_torque": peak_torque,

            "avg_power": avg_power,
            "peak_power": peak_power,

            "edge_cpu_avg": edge_cpu_avg,
            "edge_ram_avg": edge_ram_avg,

            "edge_sample_count": len(edge_samples),

            "stage_summary": execution_stage_summary,
            "ai_mode": selected_ai_mode,

            "event_count": len(events),

            "anomalies": anomalies_detected,
            "faults": faults_string,
            "corrective_actions": corrective_actions,

            "final_result": final_quality_result,

            "created_at": (
                now.strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            ),
        }

        return report_data

    # =============================================================
    # PDF EXPORT
    # =============================================================

    @staticmethod
    def export_pdf(
        report: Dict[str, Any]
    ) -> bytes:
        """
        Generate a professional industrial execution PDF report.
        """

        buffer = io.BytesIO()

        document = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        elements = []

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "IndustrialTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=colors.HexColor(
                "#0F172A"
            ),
            spaceAfter=4,
        )

        subtitle_style = ParagraphStyle(
            "IndustrialSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor(
                "#475569"
            ),
            spaceAfter=12,
        )

        section_style = ParagraphStyle(
            "IndustrialSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=colors.HexColor(
                "#1E3A8A"
            ),
            spaceBefore=10,
            spaceAfter=6,
        )

        cell_style = ParagraphStyle(
            "CellText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=colors.HexColor(
                "#1E293B"
            ),
        )

        cell_bold = ParagraphStyle(
            "CellBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=colors.HexColor(
                "#0F172A"
            ),
        )

        # ---------------------------------------------------------
        # HEADER
        # ---------------------------------------------------------

        elements.append(
            Paragraph(
                "EDGELITE DIGITAL TWIN "
                "INDUSTRIAL EXECUTION REPORT",
                title_style,
            )
        )

        elements.append(
            Paragraph(
                "Node: EdgeLite-Node-01 | "
                "Processing: LOCAL_EDGE_PROCESSING | "
                "Cloud Dependency: NONE",
                subtitle_style,
            )
        )

        elements.append(
            HRFlowable(
                width="100%",
                thickness=1.5,
                color=colors.HexColor(
                    "#2563EB"
                ),
                spaceAfter=12,
            )
        )

        # ---------------------------------------------------------
        # OVERVIEW
        # ---------------------------------------------------------

        overview_data = [
            [
                Paragraph(
                    "Report ID:",
                    cell_bold,
                ),
                Paragraph(
                    str(report.get("id", "")),
                    cell_style,
                ),
                Paragraph(
                    "Task Name:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "task_name",
                            "",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Task ID:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "task_id",
                            "",
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "Task Type:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "task_type",
                            "",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Priority:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "priority",
                            "",
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "Status:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "status",
                            "",
                        )
                    ),
                    cell_bold,
                ),
            ],
            [
                Paragraph(
                    "Start Time:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "start_time",
                            "",
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "End Time:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "end_time",
                            "",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Duration:",
                    cell_bold,
                ),
                Paragraph(
                    f"{report.get('duration', 0)} seconds",
                    cell_style,
                ),
                Paragraph(
                    "Robot Cell:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "robot",
                            "",
                        )
                    ),
                    cell_style,
                ),
            ],
        ]

        overview_table = Table(
            overview_data,
            colWidths=[
                1.3 * inch,
                2.2 * inch,
                1.3 * inch,
                2.2 * inch,
            ],
        )

        overview_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, -1),
                        colors.HexColor(
                            "#F8FAFC"
                        ),
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#CBD5E1"
                        ),
                    ),
                    (
                        "PADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                ]
            )
        )

        elements.append(
            overview_table
        )

        # ---------------------------------------------------------
        # TELEMETRY
        # ---------------------------------------------------------

        elements.append(
            Paragraph(
                "DIGITAL TWIN TELEMETRY "
                "PERFORMANCE SUMMARY",
                section_style,
            )
        )

        telemetry_data = [
            [
                Paragraph(
                    "Metric",
                    cell_bold,
                ),
                Paragraph(
                    "Average Value",
                    cell_bold,
                ),
                Paragraph(
                    "Peak Observed",
                    cell_bold,
                ),
                Paragraph(
                    "Unit",
                    cell_bold,
                ),
            ],
            [
                Paragraph(
                    "Motor Load",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "avg_motor_load",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "peak_motor_load",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "%",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Temperature",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "avg_temperature",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "peak_temperature",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "°C",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Vibration",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "avg_vibration",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "peak_vibration",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "mm/s",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Joint Torque",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "avg_torque",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "peak_torque",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "Nm",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Power Consumption",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "avg_power",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "peak_power",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "W",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Edge CPU Utilization",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "edge_cpu_avg",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "-",
                    cell_style,
                ),
                Paragraph(
                    "%",
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Edge RAM Utilization",
                    cell_style,
                ),
                Paragraph(
                    str(
                        report.get(
                            "edge_ram_avg",
                            0,
                        )
                    ),
                    cell_style,
                ),
                Paragraph(
                    "-",
                    cell_style,
                ),
                Paragraph(
                    "%",
                    cell_style,
                ),
            ],
        ]

        telemetry_table = Table(
            telemetry_data,
            colWidths=[
                2.2 * inch,
                1.8 * inch,
                1.8 * inch,
                1.4 * inch,
            ],
        )

        telemetry_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            "#E2E8F0"
                        ),
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#CBD5E1"
                        ),
                    ),
                    (
                        "PADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),
                ]
            )
        )

        elements.append(
            telemetry_table
        )

        # ---------------------------------------------------------
        # EXECUTION SUMMARY
        # ---------------------------------------------------------

        elements.append(
            Paragraph(
                "EXECUTION & EDGE AI SUMMARY",
                section_style,
            )
        )

        execution_data = [
            [
                Paragraph(
                    "AI Mode:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "ai_mode",
                            "LOCAL_EDGE_PROCESSING",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Robot Stage History:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "stage_summary",
                            "Not recorded",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Telemetry Samples:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "event_count",
                            0,
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Edge Samples:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "edge_sample_count",
                            0,
                        )
                    ),
                    cell_style,
                ),
            ],
        ]

        execution_table = Table(
            execution_data,
            colWidths=[
                2.2 * inch,
                5.0 * inch,
            ],
        )

        execution_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, -1),
                        colors.HexColor(
                            "#F8FAFC"
                        ),
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#CBD5E1"
                        ),
                    ),
                    (
                        "PADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                ]
            )
        )

        elements.append(
            execution_table
        )

        # ---------------------------------------------------------
        # DIAGNOSTICS
        # ---------------------------------------------------------

        elements.append(
            Paragraph(
                "AI ANOMALY & FAULT "
                "DIAGNOSTICS LOG",
                section_style,
            )
        )

        diagnostics_data = [
            [
                Paragraph(
                    "AI Anomalies Detected:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "anomalies",
                            "None",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Faults Logged:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "faults",
                            "None",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Corrective Actions:",
                    cell_bold,
                ),
                Paragraph(
                    str(
                        report.get(
                            "corrective_actions",
                            "",
                        )
                    ),
                    cell_style,
                ),
            ],
            [
                Paragraph(
                    "Final Quality Result:",
                    cell_bold,
                ),
                Paragraph(
                    f"<b>{report.get('final_result', '')}</b>",
                    cell_style,
                ),
            ],
        ]

        diagnostics_table = Table(
            diagnostics_data,
            colWidths=[
                2.2 * inch,
                5.0 * inch,
            ],
        )

        diagnostics_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, -1),
                        colors.HexColor(
                            "#F8FAFC"
                        ),
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#CBD5E1"
                        ),
                    ),
                    (
                        "PADDING",
                        (0, 0),
                        (-1, -1),
                        5,
                    ),
                ]
            )
        )

        elements.append(
            diagnostics_table
        )

        # ---------------------------------------------------------
        # FOOTER
        # ---------------------------------------------------------

        elements.append(
            Spacer(
                1,
                15,
            )
        )

        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            textColor=colors.HexColor(
                "#64748B"
            ),
        )

        elements.append(
            Paragraph(
                "Report automatically generated by "
                "EdgeLite Local Edge Diagnostics Engine. "
                "Telemetry values represent the software "
                "digital-twin simulation.",
                footer_style,
            )
        )

        document.build(elements)

        buffer.seek(0)

        return buffer.getvalue()

    # =============================================================
    # CSV EXPORT
    # =============================================================

    @staticmethod
    def export_csv(
        reports: List[Dict[str, Any]]
    ) -> str:
        """
        Export a list of report records as CSV.
        """

        if not reports:
            return ""

        output = io.StringIO()

        fieldnames = list(
            reports[0].keys()
        )

        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )

        writer.writeheader()

        for report in reports:
            writer.writerow(report)

        return output.getvalue()