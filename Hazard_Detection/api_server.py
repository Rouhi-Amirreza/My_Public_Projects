"""
REST API Server for Hazard Detection System
Provides endpoints for detection, monitoring, and system management
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import uvicorn
import cv2
import numpy as np
import logging
import asyncio
from pathlib import Path
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Hazard Detection API",
    description="REST API for real-time hazard detection using CV and LLM",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class DetectionRequest(BaseModel):
    """Detection request parameters"""
    threshold: float = Field(0.7, ge=0.0, le=1.0, description="Confidence threshold")
    use_llm: bool = Field(True, description="Enable LLM enhancement")
    return_image: bool = Field(True, description="Return annotated image")


class HazardResponse(BaseModel):
    """Hazard detection response"""
    hazard_id: str
    type: str
    description: str
    confidence: float
    severity: str
    timestamp: str
    bounding_box: Optional[List[int]] = None
    recommendations: List[str] = []


class DetectionResponse(BaseModel):
    """Detection API response"""
    success: bool
    frame_id: int
    hazards: List[HazardResponse]
    processing_time: float
    metadata: Dict


class StreamConfig(BaseModel):
    """Video stream configuration"""
    stream_url: str
    name: Optional[str] = "Unnamed Stream"
    enable_recording: bool = False
    alert_threshold: float = 0.7


class AlertConfig(BaseModel):
    """Alert configuration"""
    min_severity: str = "medium"
    channels: List[str] = ["email", "webhook"]
    recipient_email: Optional[str] = None
    webhook_url: Optional[str] = None


# Global state
detector = None
alert_manager = None
active_streams: Dict[str, Dict] = {}
websocket_connections: List[WebSocket] = []


# Dependency: API Key Authentication
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")

    # Placeholder - implement actual key verification
    valid_keys = ["demo_key_123", "prod_key_456"]
    if x_api_key not in valid_keys:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return x_api_key


# Endpoints

@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    global detector, alert_manager

    logger.info("Starting Hazard Detection API Server...")

    # Initialize detector (placeholder)
    # from hazard_detector import HazardDetector
    # detector = HazardDetector()

    # Initialize alert manager (placeholder)
    # from alert_system import AlertManager
    # alert_manager = AlertManager()

    logger.info("Server initialized successfully")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Hazard Detection API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "detection": "/api/v1/detect",
            "hazards": "/api/v1/hazards",
            "streams": "/api/v1/stream",
            "websocket": "/ws/alerts"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "detector_loaded": detector is not None,
        "active_streams": len(active_streams)
    }


@app.post("/api/v1/detect", response_model=DetectionResponse)
async def detect_hazards(
    file: UploadFile = File(...),
    threshold: float = 0.7,
    use_llm: bool = True,
    api_key: str = Depends(verify_api_key)
):
    """
    Analyze uploaded image for hazards

    - **file**: Image file to analyze
    - **threshold**: Confidence threshold (0.0-1.0)
    - **use_llm**: Enable LLM enhancement
    """
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Placeholder detection
        # result = detector.analyze_image(image, use_llm=use_llm)

        # Mock response
        hazards = [
            HazardResponse(
                hazard_id="HAZ-001",
                type="fire",
                description="Fire detected in the frame",
                confidence=0.92,
                severity="critical",
                timestamp=datetime.now().isoformat(),
                bounding_box=[100, 150, 300, 400],
                recommendations=["Evacuate immediately", "Call emergency services"]
            )
        ]

        response = DetectionResponse(
            success=True,
            frame_id=1,
            hazards=hazards,
            processing_time=0.15,
            metadata={
                "image_shape": list(image.shape),
                "threshold": threshold,
                "llm_enabled": use_llm
            }
        )

        # Broadcast to websocket clients
        await broadcast_alert(hazards[0].dict())

        return response

    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/hazards")
async def list_hazards(
    severity: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    api_key: str = Depends(verify_api_key)
):
    """
    List detected hazards with filtering

    - **severity**: Filter by severity (low/medium/high/critical)
    - **start_date**: Start date (ISO format)
    - **end_date**: End date (ISO format)
    - **limit**: Maximum number of results
    """
    # Placeholder - implement actual database query
    hazards = [
        {
            "hazard_id": "HAZ-001",
            "type": "fire",
            "severity": "critical",
            "timestamp": datetime.now().isoformat(),
            "location": {"building": "A", "floor": 2}
        }
    ]

    return {
        "success": True,
        "count": len(hazards),
        "hazards": hazards
    }


@app.post("/api/v1/stream/start")
async def start_stream(
    config: StreamConfig,
    api_key: str = Depends(verify_api_key)
):
    """
    Start processing a video stream

    - **stream_url**: RTSP/RTMP URL or camera index
    - **name**: Stream name
    - **enable_recording**: Enable video recording
    """
    stream_id = f"stream_{len(active_streams) + 1}"

    # Store stream configuration
    active_streams[stream_id] = {
        "config": config.dict(),
        "status": "active",
        "start_time": datetime.now().isoformat(),
        "frames_processed": 0,
        "hazards_detected": 0
    }

    # Start processing in background (placeholder)
    # asyncio.create_task(process_stream(stream_id, config))

    logger.info(f"Started stream {stream_id}: {config.stream_url}")

    return {
        "success": True,
        "stream_id": stream_id,
        "message": "Stream processing started"
    }


@app.get("/api/v1/stream/{stream_id}")
async def get_stream_info(
    stream_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get information about a specific stream"""
    if stream_id not in active_streams:
        raise HTTPException(status_code=404, detail="Stream not found")

    return {
        "success": True,
        "stream_id": stream_id,
        "info": active_streams[stream_id]
    }


@app.delete("/api/v1/stream/{stream_id}")
async def stop_stream(
    stream_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Stop processing a video stream"""
    if stream_id not in active_streams:
        raise HTTPException(status_code=404, detail="Stream not found")

    # Stop processing (placeholder)
    active_streams[stream_id]["status"] = "stopped"

    logger.info(f"Stopped stream {stream_id}")

    return {
        "success": True,
        "message": "Stream stopped"
    }


@app.get("/api/v1/streams")
async def list_streams(api_key: str = Depends(verify_api_key)):
    """List all active streams"""
    return {
        "success": True,
        "count": len(active_streams),
        "streams": active_streams
    }


@app.post("/api/v1/alerts/configure")
async def configure_alerts(
    config: AlertConfig,
    api_key: str = Depends(verify_api_key)
):
    """Configure alert settings"""
    # Placeholder - store configuration
    logger.info(f"Alert configuration updated: {config}")

    return {
        "success": True,
        "message": "Alert configuration updated"
    }


@app.get("/api/v1/statistics")
async def get_statistics(api_key: str = Depends(verify_api_key)):
    """Get system statistics"""
    # Placeholder statistics
    stats = {
        "uptime": "2 hours 34 minutes",
        "total_frames_processed": 15420,
        "total_hazards_detected": 23,
        "active_streams": len(active_streams),
        "average_processing_time": 0.12,
        "hazards_by_type": {
            "fire": 5,
            "smoke": 8,
            "obstacle": 10
        },
        "hazards_by_severity": {
            "low": 8,
            "medium": 10,
            "high": 3,
            "critical": 2
        }
    }

    return {
        "success": True,
        "statistics": stats
    }


# WebSocket endpoint for real-time alerts
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time hazard alerts

    Connect to receive live alerts:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/ws/alerts');
    ws.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        console.log('New hazard:', alert);
    };
    ```
    """
    await websocket.accept()
    websocket_connections.append(websocket)

    logger.info("WebSocket client connected")

    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()

            # Echo back for testing
            await websocket.send_text(json.dumps({
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            }))

    except WebSocketDisconnect:
        websocket_connections.remove(websocket)
        logger.info("WebSocket client disconnected")


async def broadcast_alert(alert: Dict):
    """Broadcast alert to all connected WebSocket clients"""
    message = json.dumps({
        "type": "hazard_alert",
        "data": alert,
        "timestamp": datetime.now().isoformat()
    })

    # Send to all connected clients
    disconnected = []
    for connection in websocket_connections:
        try:
            await connection.send_text(message)
        except:
            disconnected.append(connection)

    # Remove disconnected clients
    for conn in disconnected:
        websocket_connections.remove(conn)


if __name__ == "__main__":
    # Run server
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
