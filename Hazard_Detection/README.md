# 🚨 Hazard Detection System

> Advanced real-time hazard detection system powered by Computer Vision and Large Language Models

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

## 📋 Overview

The Hazard Detection System is a state-of-the-art solution that combines Computer Vision (CV) and Large Language Models (LLM) to identify, classify, and respond to various hazards in real-time. The system processes video streams, images, and sensor data to detect potential dangers and provide intelligent alerts with contextual understanding.

## ✨ Key Features

### 🎯 Core Detection Capabilities
- **Multi-Modal Hazard Detection**: Identify hazards through video, images, and sensor fusion
- **Real-Time Processing**: Process video streams with low latency (< 100ms)
- **Object Detection**: YOLO-based detection for vehicles, people, obstacles, and hazardous materials
- **Scene Understanding**: Deep contextual analysis using vision transformers
- **Anomaly Detection**: Identify unusual patterns and behaviors
- **Environmental Hazard Detection**: Fire, smoke, flood, and gas leak detection

### 🤖 LLM Integration
- **Contextual Understanding**: GPT-4 Vision integration for complex scene analysis
- **Natural Language Alerts**: Generate human-readable hazard descriptions
- **Risk Assessment**: AI-powered severity and urgency classification
- **Decision Support**: Recommend actions based on detected hazards
- **Multi-Language Support**: Alerts in 50+ languages
- **Conversational Interface**: Chat-based hazard reporting and queries

### 📊 Advanced Analytics
- **Hazard Tracking**: Track hazards across frames with unique IDs
- **Heatmap Generation**: Visualize high-risk zones over time
- **Predictive Analytics**: Forecast potential hazards using historical data
- **Statistical Reporting**: Automated daily/weekly/monthly reports
- **Pattern Recognition**: Identify recurring hazard patterns
- **Trend Analysis**: Long-term hazard trend visualization

### 🔔 Alert & Notification System
- **Multi-Channel Alerts**: Email, SMS, push notifications, webhooks
- **Priority-Based Routing**: Route alerts based on severity levels
- **Escalation Policies**: Automatic escalation for unacknowledged alerts
- **Custom Alert Rules**: Define custom detection and alert criteria
- **Geofencing**: Location-based alert filtering
- **Integration APIs**: Slack, Discord, Telegram, PagerDuty, Twilio

### 🎥 Video Processing
- **Multi-Stream Support**: Process multiple camera feeds simultaneously
- **RTSP/RTMP Support**: Compatible with IP cameras and streaming protocols
- **Video Recording**: Automatic recording when hazards detected
- **Frame Extraction**: Extract key frames for detailed analysis
- **Video Annotation**: Overlay detection boxes and labels
- **Playback Control**: Review historical footage with hazard markers

### 🧠 Machine Learning Pipeline
- **Custom Model Training**: Train on your own hazard datasets
- **Transfer Learning**: Fine-tune pre-trained models
- **Active Learning**: Improve model with user feedback
- **Model Versioning**: Track and manage model versions
- **A/B Testing**: Compare model performance
- **Automated Retraining**: Schedule periodic model updates

### 🌐 Web Interface & API
- **RESTful API**: Complete API for integration
- **WebSocket Support**: Real-time updates via WebSockets
- **Dashboard**: Web-based monitoring dashboard
- **Live Preview**: View camera feeds in browser
- **Configuration UI**: Web-based system configuration
- **Mobile Responsive**: Works on phones and tablets

### 🔒 Security & Privacy
- **Encrypted Storage**: AES-256 encryption for sensitive data
- **Access Control**: Role-based access control (RBAC)
- **Audit Logging**: Complete audit trail of all actions
- **Privacy Masking**: Blur faces and license plates
- **Secure API**: JWT authentication and API key management
- **GDPR Compliant**: Privacy-first design

### 📈 Performance & Scalability
- **Distributed Processing**: Scale across multiple machines
- **GPU Acceleration**: CUDA and TensorRT support
- **Edge Computing**: Run on edge devices (Jetson, Raspberry Pi)
- **Cloud Integration**: AWS, Azure, GCP deployment ready
- **Load Balancing**: Automatic workload distribution
- **Caching**: Redis-based caching for faster responses

### 🔧 Configuration & Customization
- **YAML Configuration**: Easy-to-edit configuration files
- **Plugin System**: Extend functionality with custom plugins
- **Custom Detectors**: Add your own detection models
- **Flexible Pipelines**: Configure detection pipelines
- **Environment Variables**: Override settings via environment
- **Hot Reload**: Update configuration without restart

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Input Layer                              │
│  (Video Streams, Images, Sensors, API Requests)             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 Processing Pipeline                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  CV Engine   │  │  LLM Engine  │  │   Sensor     │     │
│  │   (YOLO,     │  │  (GPT-4V,    │  │  Fusion      │     │
│  │  ViT, etc)   │  │  Claude)     │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   Analysis & Decision Layer                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Risk Assessment │ Tracking │ Pattern Recognition  │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                     Output Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Alerts  │  │  Logging │  │    API   │  │ Dashboard│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

```bash
Python 3.8+
CUDA 11.0+ (optional, for GPU acceleration)
Redis (optional, for caching)
PostgreSQL or MongoDB (optional, for persistence)
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hazard-detection.git
cd hazard-detection

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install additional CV dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Download pre-trained models
python scripts/download_models.py

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Basic Usage

#### 1. Real-Time Video Stream Detection

```python
from hazard_detection import HazardDetector

# Initialize detector
detector = HazardDetector(
    cv_model="yolov8x",
    llm_model="gpt-4-vision",
    confidence_threshold=0.7
)

# Process video stream
detector.process_stream(
    source="rtsp://camera.ip.address:554/stream",
    output_path="output/annotated_video.mp4",
    alert_callback=lambda hazard: print(f"Alert: {hazard}")
)
```

#### 2. Image Analysis

```python
from hazard_detection import HazardDetector

detector = HazardDetector()

# Analyze single image
results = detector.analyze_image("path/to/image.jpg")

print(f"Detected {len(results.hazards)} hazards:")
for hazard in results.hazards:
    print(f"  - {hazard.type}: {hazard.description} (confidence: {hazard.confidence:.2f})")
```

#### 3. API Server

```bash
# Start the API server
python api_server.py --host 0.0.0.0 --port 8000

# Or use uvicorn directly
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. Web Dashboard

```bash
# Start the dashboard
python dashboard.py

# Access at http://localhost:5000
```

## 📡 API Reference

### REST Endpoints

#### POST /api/v1/detect
Analyze an image or video for hazards

```bash
curl -X POST http://localhost:8000/api/v1/detect \
  -F "file=@image.jpg" \
  -F "threshold=0.7" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### GET /api/v1/hazards
List all detected hazards with filtering

```bash
curl http://localhost:8000/api/v1/hazards?severity=high&start_date=2024-01-01
```

#### POST /api/v1/stream/start
Start processing a video stream

```bash
curl -X POST http://localhost:8000/api/v1/stream/start \
  -H "Content-Type: application/json" \
  -d '{"stream_url": "rtsp://camera:554/stream", "name": "Camera 1"}'
```

#### WebSocket /ws/alerts
Real-time hazard alerts

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/alerts');
ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('New hazard:', alert);
};
```

## 🎓 Training Custom Models

```bash
# Prepare your dataset
python scripts/prepare_dataset.py --input data/raw --output data/processed

# Train a custom detector
python train_model.py \
  --dataset data/processed \
  --model yolov8 \
  --epochs 100 \
  --batch-size 16 \
  --device cuda

# Evaluate the model
python evaluate_model.py --model models/custom_yolov8.pt --test-data data/test
```

## 🔧 Configuration

Edit `config.yaml` to customize the system:

```yaml
detection:
  cv_model: "yolov8x"
  llm_model: "gpt-4-vision-preview"
  confidence_threshold: 0.7
  nms_threshold: 0.45
  max_detections: 100

processing:
  video_fps: 30
  frame_skip: 0
  resize_width: 1280
  resize_height: 720
  enable_gpu: true

alerts:
  enabled: true
  min_severity: "medium"
  channels:
    - email
    - webhook
  email:
    smtp_host: "smtp.gmail.com"
    smtp_port: 587
    from_address: "alerts@example.com"
  webhook:
    url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

storage:
  type: "postgresql"  # postgresql, mongodb, sqlite
  host: "localhost"
  port: 5432
  database: "hazard_detection"
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=hazard_detection tests/

# Run specific test suite
pytest tests/test_cv_processor.py -v
```

## 📊 Example Use Cases

1. **Construction Site Safety**: Monitor construction sites for worker safety violations, equipment hazards, and unauthorized access
2. **Industrial Facility Monitoring**: Detect fire, smoke, gas leaks, and equipment malfunctions in real-time
3. **Traffic Management**: Identify accidents, road hazards, and traffic violations
4. **Public Safety**: Monitor public spaces for suspicious activities and emergency situations
5. **Warehouse Operations**: Detect spills, blocked exits, forklift hazards, and unsafe stacking
6. **Smart City**: Integrate with city infrastructure for comprehensive hazard monitoring
7. **Healthcare Facilities**: Monitor for falls, unauthorized access to restricted areas
8. **Environmental Monitoring**: Detect pollution, illegal dumping, and environmental hazards

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YOLOv8 by Ultralytics
- OpenAI GPT-4 Vision
- Anthropic Claude
- PyTorch and TensorFlow teams
- OpenCV contributors

## 📞 Contact

- Project Lead: [Your Name](mailto:your.email@example.com)
- Documentation: [https://docs.hazard-detection.io](https://docs.hazard-detection.io)
- Issues: [GitHub Issues](https://github.com/yourusername/hazard-detection/issues)

## 🗺️ Roadmap

- [x] Basic CV hazard detection
- [x] LLM integration
- [x] Multi-stream processing
- [ ] Edge device optimization
- [ ] Mobile app (iOS/Android)
- [ ] Drone integration
- [ ] 3D scene reconstruction
- [ ] AR visualization
- [ ] Blockchain audit trail
- [ ] Federated learning support

---

**Made with ❤️ by the Hazard Detection Team**
