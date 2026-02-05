"""
Alert and Notification System
Handles multi-channel alert delivery and escalation
"""

import logging
import json
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import threading
import queue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class AlertChannel(Enum):
    """Available alert channels"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"
    SLACK = "slack"
    DISCORD = "discord"
    TELEGRAM = "telegram"
    PAGERDUTY = "pagerduty"
    CONSOLE = "console"


@dataclass
class AlertRecipient:
    """Alert recipient configuration"""
    name: str
    channels: List[AlertChannel]
    email: Optional[str] = None
    phone: Optional[str] = None
    webhook_url: Optional[str] = None
    slack_channel: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    severity_threshold: AlertSeverity = AlertSeverity.LOW
    active_hours: Optional[Dict] = None  # {'start': '09:00', 'end': '17:00'}

    def should_receive_alert(self, severity: AlertSeverity, current_time: datetime) -> bool:
        """Check if recipient should receive alert"""
        # Check severity threshold
        if severity.value < self.severity_threshold.value:
            return False

        # Check active hours
        if self.active_hours:
            current_hour = current_time.strftime('%H:%M')
            if not (self.active_hours['start'] <= current_hour <= self.active_hours['end']):
                return False

        return True


@dataclass
class Alert:
    """Alert message"""
    alert_id: str
    hazard_id: str
    severity: AlertSeverity
    title: str
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    location: Optional[Dict] = None
    image_path: Optional[str] = None
    metadata: Dict = field(default_factory=dict)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        """Convert alert to dictionary"""
        return {
            'alert_id': self.alert_id,
            'hazard_id': self.hazard_id,
            'severity': self.severity.name,
            'title': self.title,
            'message': self.message,
            'timestamp': self.timestamp.isoformat(),
            'location': self.location,
            'image_path': self.image_path,
            'metadata': self.metadata,
            'acknowledged': self.acknowledged
        }


class AlertManager:
    """
    Manages alert routing, delivery, and escalation
    """

    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize alert manager

        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.recipients: List[AlertRecipient] = []
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []

        # Alert queue for async processing
        self.alert_queue = queue.Queue()
        self.processing_thread = threading.Thread(target=self._process_alerts, daemon=True)
        self.processing_thread.start()

        # Channel handlers
        self.channel_handlers = self._initialize_handlers()

        # Escalation configuration
        self.escalation_config = {
            'enabled': True,
            'timeout': timedelta(minutes=5),  # Time before escalation
            'max_escalations': 3
        }

        logger.info("Alert Manager initialized")

    def _initialize_handlers(self) -> Dict[AlertChannel, Callable]:
        """Initialize channel handlers"""
        return {
            AlertChannel.EMAIL: self._send_email,
            AlertChannel.SMS: self._send_sms,
            AlertChannel.PUSH: self._send_push,
            AlertChannel.WEBHOOK: self._send_webhook,
            AlertChannel.SLACK: self._send_slack,
            AlertChannel.DISCORD: self._send_discord,
            AlertChannel.TELEGRAM: self._send_telegram,
            AlertChannel.PAGERDUTY: self._send_pagerduty,
            AlertChannel.CONSOLE: self._send_console,
        }

    def add_recipient(self, recipient: AlertRecipient):
        """Add alert recipient"""
        self.recipients.append(recipient)
        logger.info(f"Added recipient: {recipient.name}")

    def send_alert(self, alert: Alert):
        """
        Send alert to appropriate recipients

        Args:
            alert: Alert to send
        """
        logger.info(f"Sending alert: {alert.title} (severity: {alert.severity.name})")

        # Add to active alerts
        self.active_alerts[alert.alert_id] = alert

        # Queue for processing
        self.alert_queue.put(alert)

        # Store in history
        self.alert_history.append(alert)

    def _process_alerts(self):
        """Background thread for processing alerts"""
        while True:
            try:
                alert = self.alert_queue.get(timeout=1)
                self._deliver_alert(alert)

                # Schedule escalation check
                if self.escalation_config['enabled']:
                    threading.Timer(
                        self.escalation_config['timeout'].total_seconds(),
                        self._check_escalation,
                        args=[alert.alert_id]
                    ).start()

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing alert: {e}")

    def _deliver_alert(self, alert: Alert):
        """Deliver alert to all eligible recipients"""
        current_time = datetime.now()

        for recipient in self.recipients:
            # Check if recipient should receive alert
            if not recipient.should_receive_alert(alert.severity, current_time):
                continue

            # Send through each channel
            for channel in recipient.channels:
                try:
                    handler = self.channel_handlers.get(channel)
                    if handler:
                        handler(alert, recipient)
                    else:
                        logger.warning(f"No handler for channel: {channel}")

                except Exception as e:
                    logger.error(f"Failed to send alert via {channel} to {recipient.name}: {e}")

    def _send_email(self, alert: Alert, recipient: AlertRecipient):
        """Send alert via email"""
        logger.info(f"Sending email to {recipient.email}")
        # Placeholder - implement actual email sending
        # import smtplib
        # ...

    def _send_sms(self, alert: Alert, recipient: AlertRecipient):
        """Send alert via SMS"""
        logger.info(f"Sending SMS to {recipient.phone}")
        # Placeholder - implement Twilio or similar

    def _send_push(self, alert: Alert, recipient: AlertRecipient):
        """Send push notification"""
        logger.info(f"Sending push notification to {recipient.name}")
        # Placeholder - implement push notification service

    def _send_webhook(self, alert: Alert, recipient: AlertRecipient):
        """Send alert to webhook"""
        logger.info(f"Sending webhook to {recipient.webhook_url}")
        # Placeholder - implement HTTP POST
        # import requests
        # requests.post(recipient.webhook_url, json=alert.to_dict())

    def _send_slack(self, alert: Alert, recipient: AlertRecipient):
        """Send alert to Slack"""
        logger.info(f"Sending to Slack channel: {recipient.slack_channel}")

        # Format Slack message
        slack_message = {
            "channel": recipient.slack_channel,
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🚨 {alert.title}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Severity:*\n{alert.severity.name}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Time:*\n{alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": alert.message
                    }
                }
            ]
        }

        # Placeholder - implement actual Slack API call

    def _send_discord(self, alert: Alert, recipient: AlertRecipient):
        """Send alert to Discord"""
        logger.info(f"Sending to Discord: {recipient.name}")
        # Placeholder - implement Discord webhook

    def _send_telegram(self, alert: Alert, recipient: AlertRecipient):
        """Send alert to Telegram"""
        logger.info(f"Sending to Telegram chat: {recipient.telegram_chat_id}")
        # Placeholder - implement Telegram Bot API

    def _send_pagerduty(self, alert: Alert, recipient: AlertRecipient):
        """Send alert to PagerDuty"""
        logger.info(f"Creating PagerDuty incident for {recipient.name}")
        # Placeholder - implement PagerDuty Events API

    def _send_console(self, alert: Alert, recipient: AlertRecipient):
        """Print alert to console"""
        print("\n" + "="*60)
        print(f"ALERT: {alert.title}")
        print(f"Severity: {alert.severity.name}")
        print(f"Time: {alert.timestamp}")
        print(f"Message: {alert.message}")
        print("="*60 + "\n")

    def acknowledge_alert(self, alert_id: str, acknowledged_by: str):
        """
        Acknowledge an alert

        Args:
            alert_id: Alert ID to acknowledge
            acknowledged_by: Name of person acknowledging
        """
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.acknowledged = True
            alert.acknowledged_by = acknowledged_by
            alert.acknowledged_at = datetime.now()

            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")

            # Remove from active alerts
            del self.active_alerts[alert_id]

    def _check_escalation(self, alert_id: str):
        """
        Check if alert needs escalation

        Args:
            alert_id: Alert ID to check
        """
        if alert_id not in self.active_alerts:
            return  # Alert already acknowledged

        alert = self.active_alerts[alert_id]

        # Check if timeout exceeded
        time_since_alert = datetime.now() - alert.timestamp
        if time_since_alert >= self.escalation_config['timeout']:
            logger.warning(f"Alert {alert_id} not acknowledged, escalating...")
            self._escalate_alert(alert)

    def _escalate_alert(self, alert: Alert):
        """
        Escalate alert to higher priority recipients

        Args:
            alert: Alert to escalate
        """
        # Increase severity if not already critical
        if alert.severity != AlertSeverity.CRITICAL:
            alert.severity = AlertSeverity(alert.severity.value + 1)

        # Add escalation note
        alert.metadata['escalated'] = True
        alert.metadata['escalation_count'] = alert.metadata.get('escalation_count', 0) + 1

        # Re-send alert
        self.alert_queue.put(alert)

        logger.info(f"Alert {alert.alert_id} escalated (count: {alert.metadata['escalation_count']})")

    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """
        Get list of active (unacknowledged) alerts

        Args:
            severity: Filter by severity

        Returns:
            List of active alerts
        """
        alerts = list(self.active_alerts.values())

        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        return alerts

    def get_alert_statistics(self) -> Dict:
        """Get alert statistics"""
        return {
            'total_alerts': len(self.alert_history),
            'active_alerts': len(self.active_alerts),
            'acknowledged_alerts': len([a for a in self.alert_history if a.acknowledged]),
            'by_severity': {
                severity.name: len([a for a in self.alert_history if a.severity == severity])
                for severity in AlertSeverity
            },
            'average_acknowledgment_time': self._calculate_avg_ack_time()
        }

    def _calculate_avg_ack_time(self) -> float:
        """Calculate average acknowledgment time in minutes"""
        ack_times = []
        for alert in self.alert_history:
            if alert.acknowledged and alert.acknowledged_at:
                delta = (alert.acknowledged_at - alert.timestamp).total_seconds() / 60
                ack_times.append(delta)

        return sum(ack_times) / len(ack_times) if ack_times else 0.0


# Example usage and configuration
def create_default_config() -> Dict:
    """Create default alert configuration"""
    return {
        'email': {
            'smtp_host': 'smtp.gmail.com',
            'smtp_port': 587,
            'from_address': 'alerts@hazarddetection.com',
            'use_tls': True
        },
        'sms': {
            'provider': 'twilio',
            'account_sid': 'your_account_sid',
            'auth_token': 'your_auth_token'
        },
        'slack': {
            'webhook_url': 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
            'default_channel': '#hazard-alerts'
        },
        'pagerduty': {
            'integration_key': 'your_integration_key'
        }
    }


if __name__ == "__main__":
    # Test alert system
    manager = AlertManager()

    # Add test recipient
    recipient = AlertRecipient(
        name="Test User",
        channels=[AlertChannel.CONSOLE, AlertChannel.EMAIL],
        email="test@example.com",
        severity_threshold=AlertSeverity.MEDIUM
    )
    manager.add_recipient(recipient)

    # Create test alert
    alert = Alert(
        alert_id="TEST-001",
        hazard_id="HAZ-001",
        severity=AlertSeverity.HIGH,
        title="Fire Detected",
        message="A fire has been detected in Building A, Floor 2. Immediate evacuation required.",
        location={'building': 'A', 'floor': 2}
    )

    # Send alert
    manager.send_alert(alert)

    print("\nAlert System initialized and test alert sent!")
    print(f"Statistics: {manager.get_alert_statistics()}")
