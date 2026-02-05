"""
Data Logger Module
Handles logging of detection results, alerts, and system metrics
"""

import json
import csv
import sqlite3
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataLogger:
    """
    Log hazard detection data to various backends
    """

    def __init__(
        self,
        db_path: str = "data/hazard_detection.db",
        log_dir: str = "data/logs",
        enable_csv: bool = True,
        enable_json: bool = True,
        enable_sqlite: bool = True
    ):
        """
        Initialize data logger

        Args:
            db_path: Path to SQLite database
            log_dir: Directory for log files
            enable_csv: Enable CSV logging
            enable_json: Enable JSON logging
            enable_sqlite: Enable SQLite logging
        """
        self.db_path = Path(db_path)
        self.log_dir = Path(log_dir)
        self.enable_csv = enable_csv
        self.enable_json = enable_json
        self.enable_sqlite = enable_sqlite

        # Create directories
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Initialize backends
        if self.enable_sqlite:
            self._init_database()

        logger.info(f"Data logger initialized: {db_path}")

    def _init_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Create hazards table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hazards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hazard_id TEXT UNIQUE,
                type TEXT,
                description TEXT,
                confidence REAL,
                severity TEXT,
                timestamp TEXT,
                location_json TEXT,
                bbox_json TEXT,
                metadata_json TEXT
            )
        """)

        # Create alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id TEXT UNIQUE,
                hazard_id TEXT,
                severity TEXT,
                title TEXT,
                message TEXT,
                timestamp TEXT,
                acknowledged INTEGER,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                FOREIGN KEY (hazard_id) REFERENCES hazards(hazard_id)
            )
        """)

        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                start_time TEXT,
                end_time TEXT,
                frames_processed INTEGER,
                hazards_detected INTEGER,
                source TEXT,
                metadata_json TEXT
            )
        """)

        # Create metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                metric_name TEXT,
                metric_value REAL,
                metadata_json TEXT
            )
        """)

        conn.commit()
        conn.close()

        logger.info("Database initialized")

    def log_hazard(self, hazard_data: Dict):
        """
        Log a detected hazard

        Args:
            hazard_data: Hazard information dictionary
        """
        # SQLite
        if self.enable_sqlite:
            self._log_hazard_sqlite(hazard_data)

        # CSV
        if self.enable_csv:
            self._log_hazard_csv(hazard_data)

        # JSON
        if self.enable_json:
            self._log_hazard_json(hazard_data)

        logger.debug(f"Logged hazard: {hazard_data.get('hazard_id')}")

    def _log_hazard_sqlite(self, hazard_data: Dict):
        """Log hazard to SQLite database"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT OR REPLACE INTO hazards
                (hazard_id, type, description, confidence, severity, timestamp,
                 location_json, bbox_json, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                hazard_data.get('hazard_id'),
                hazard_data.get('type'),
                hazard_data.get('description'),
                hazard_data.get('confidence'),
                hazard_data.get('severity'),
                hazard_data.get('timestamp', datetime.now().isoformat()),
                json.dumps(hazard_data.get('location')),
                json.dumps(hazard_data.get('bounding_box')),
                json.dumps(hazard_data.get('metadata', {}))
            ))

            conn.commit()
        except Exception as e:
            logger.error(f"Error logging to SQLite: {e}")
        finally:
            conn.close()

    def _log_hazard_csv(self, hazard_data: Dict):
        """Log hazard to CSV file"""
        csv_path = self.log_dir / f"hazards_{datetime.now().strftime('%Y%m%d')}.csv"

        # Check if file exists to write header
        file_exists = csv_path.exists()

        try:
            with open(csv_path, 'a', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'hazard_id', 'type', 'description', 'confidence',
                    'severity', 'timestamp', 'location', 'bounding_box'
                ])

                if not file_exists:
                    writer.writeheader()

                writer.writerow({
                    'hazard_id': hazard_data.get('hazard_id'),
                    'type': hazard_data.get('type'),
                    'description': hazard_data.get('description'),
                    'confidence': hazard_data.get('confidence'),
                    'severity': hazard_data.get('severity'),
                    'timestamp': hazard_data.get('timestamp', datetime.now().isoformat()),
                    'location': json.dumps(hazard_data.get('location')),
                    'bounding_box': json.dumps(hazard_data.get('bounding_box'))
                })
        except Exception as e:
            logger.error(f"Error logging to CSV: {e}")

    def _log_hazard_json(self, hazard_data: Dict):
        """Log hazard to JSON file"""
        json_path = self.log_dir / f"hazards_{datetime.now().strftime('%Y%m%d')}.jsonl"

        try:
            with open(json_path, 'a') as f:
                f.write(json.dumps(hazard_data) + '\n')
        except Exception as e:
            logger.error(f"Error logging to JSON: {e}")

    def log_alert(self, alert_data: Dict):
        """Log an alert"""
        if self.enable_sqlite:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO alerts
                    (alert_id, hazard_id, severity, title, message, timestamp,
                     acknowledged, acknowledged_by, acknowledged_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_data.get('alert_id'),
                    alert_data.get('hazard_id'),
                    alert_data.get('severity'),
                    alert_data.get('title'),
                    alert_data.get('message'),
                    alert_data.get('timestamp', datetime.now().isoformat()),
                    alert_data.get('acknowledged', False),
                    alert_data.get('acknowledged_by'),
                    alert_data.get('acknowledged_at')
                ))

                conn.commit()
            except Exception as e:
                logger.error(f"Error logging alert: {e}")
            finally:
                conn.close()

        logger.debug(f"Logged alert: {alert_data.get('alert_id')}")

    def log_metric(self, metric_name: str, value: float, metadata: Optional[Dict] = None):
        """
        Log a system metric

        Args:
            metric_name: Name of the metric
            value: Metric value
            metadata: Additional metadata
        """
        if self.enable_sqlite:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            try:
                cursor.execute("""
                    INSERT INTO metrics (timestamp, metric_name, metric_value, metadata_json)
                    VALUES (?, ?, ?, ?)
                """, (
                    datetime.now().isoformat(),
                    metric_name,
                    value,
                    json.dumps(metadata or {})
                ))

                conn.commit()
            except Exception as e:
                logger.error(f"Error logging metric: {e}")
            finally:
                conn.close()

    def get_hazards(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        severity: Optional[str] = None,
        hazard_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Query hazards from database

        Args:
            start_date: Start date filter (ISO format)
            end_date: End date filter (ISO format)
            severity: Severity filter
            hazard_type: Hazard type filter
            limit: Maximum number of results

        Returns:
            List of hazard dictionaries
        """
        if not self.enable_sqlite:
            return []

        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = "SELECT * FROM hazards WHERE 1=1"
        params = []

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        if severity:
            query += " AND severity = ?"
            params.append(severity)

        if hazard_type:
            query += " AND type = ?"
            params.append(hazard_type)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        # Convert to dictionaries
        hazards = []
        for row in rows:
            hazard = dict(row)
            # Parse JSON fields
            if hazard.get('location_json'):
                hazard['location'] = json.loads(hazard['location_json'])
            if hazard.get('bbox_json'):
                hazard['bounding_box'] = json.loads(hazard['bbox_json'])
            if hazard.get('metadata_json'):
                hazard['metadata'] = json.loads(hazard['metadata_json'])

            hazards.append(hazard)

        return hazards

    def get_statistics(self, days: int = 7) -> Dict:
        """
        Get statistics for the last N days

        Args:
            days: Number of days to include

        Returns:
            Statistics dictionary
        """
        if not self.enable_sqlite:
            return {}

        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        start_date = (datetime.now() - __import__('datetime').timedelta(days=days)).isoformat()

        # Total hazards
        cursor.execute(
            "SELECT COUNT(*) FROM hazards WHERE timestamp >= ?",
            (start_date,)
        )
        total_hazards = cursor.fetchone()[0]

        # Hazards by severity
        cursor.execute("""
            SELECT severity, COUNT(*) as count
            FROM hazards
            WHERE timestamp >= ?
            GROUP BY severity
        """, (start_date,))
        by_severity = {row[0]: row[1] for row in cursor.fetchall()}

        # Hazards by type
        cursor.execute("""
            SELECT type, COUNT(*) as count
            FROM hazards
            WHERE timestamp >= ?
            GROUP BY type
            ORDER BY count DESC
            LIMIT 10
        """, (start_date,))
        by_type = {row[0]: row[1] for row in cursor.fetchall()}

        # Average confidence
        cursor.execute(
            "SELECT AVG(confidence) FROM hazards WHERE timestamp >= ?",
            (start_date,)
        )
        avg_confidence = cursor.fetchone()[0] or 0

        conn.close()

        return {
            'period_days': days,
            'total_hazards': total_hazards,
            'by_severity': by_severity,
            'by_type': by_type,
            'average_confidence': avg_confidence
        }

    def export_to_json(self, output_path: str, start_date: Optional[str] = None):
        """Export all data to JSON file"""
        hazards = self.get_hazards(start_date=start_date, limit=10000)

        with open(output_path, 'w') as f:
            json.dump({
                'export_date': datetime.now().isoformat(),
                'hazard_count': len(hazards),
                'hazards': hazards
            }, f, indent=2)

        logger.info(f"Exported {len(hazards)} hazards to {output_path}")


if __name__ == "__main__":
    # Test data logger
    logger_instance = DataLogger()

    # Test hazard logging
    test_hazard = {
        'hazard_id': 'TEST-001',
        'type': 'fire',
        'description': 'Test fire detection',
        'confidence': 0.95,
        'severity': 'high',
        'timestamp': datetime.now().isoformat(),
        'location': {'building': 'A', 'floor': 2},
        'bounding_box': [100, 150, 300, 400]
    }

    logger_instance.log_hazard(test_hazard)
    print("Data logger initialized and tested successfully!")
    print(f"Statistics: {logger_instance.get_statistics()}")
