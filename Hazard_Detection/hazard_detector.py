"""
Main Hazard Detection Engine
Coordinates CV and LLM models for comprehensive hazard detection
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Callable, Union
from dataclasses import dataclass
from datetime import datetime
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class HazardResult:
    """Represents a detected hazard"""
    hazard_id: str
    type: str
    description: str
    confidence: float
    severity: str  # low, medium, high, critical
    bounding_box: Optional[tuple] = None
    timestamp: datetime = None
    location: Optional[Dict] = None
    recommendations: List[str] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.recommendations is None:
            self.recommendations = []


@dataclass
class DetectionResult:
    """Container for all detection results from a single frame/image"""
    frame_id: int
    hazards: List[HazardResult]
    annotated_frame: Optional[np.ndarray] = None
    metadata: Dict = None
    processing_time: float = 0.0

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class HazardDetector:
    """
    Main hazard detection system combining CV and LLM capabilities
    """

    def __init__(
        self,
        cv_model: str = "yolov8x",
        llm_model: str = "gpt-4-vision",
        confidence_threshold: float = 0.7,
        enable_gpu: bool = True,
        config_path: Optional[str] = None
    ):
        """
        Initialize the hazard detector

        Args:
            cv_model: Computer vision model to use
            llm_model: LLM model for contextual understanding
            confidence_threshold: Minimum confidence for detections
            enable_gpu: Whether to use GPU acceleration
            config_path: Path to configuration file
        """
        self.cv_model_name = cv_model
        self.llm_model_name = llm_model
        self.confidence_threshold = confidence_threshold
        self.enable_gpu = enable_gpu

        logger.info(f"Initializing HazardDetector with CV model: {cv_model}, LLM: {llm_model}")

        # Initialize components
        self._load_cv_model()
        self._load_llm_model()
        self._load_config(config_path)

        # Statistics
        self.stats = {
            'total_frames_processed': 0,
            'total_hazards_detected': 0,
            'processing_times': []
        }

    def _load_cv_model(self):
        """Load computer vision model"""
        logger.info(f"Loading CV model: {self.cv_model_name}")
        # Placeholder - implement actual model loading
        self.cv_model = None

    def _load_llm_model(self):
        """Load LLM model"""
        logger.info(f"Loading LLM model: {self.llm_model_name}")
        # Placeholder - implement actual model loading
        self.llm_model = None

    def _load_config(self, config_path: Optional[str]):
        """Load configuration from file"""
        if config_path:
            logger.info(f"Loading configuration from: {config_path}")
        self.config = {
            'hazard_classes': [
                'fire', 'smoke', 'flood', 'obstacle', 'vehicle',
                'person_in_danger', 'hazmat', 'spill', 'fall_risk',
                'unauthorized_access', 'equipment_malfunction'
            ],
            'severity_mapping': {
                'fire': 'critical',
                'smoke': 'high',
                'person_in_danger': 'critical',
                'hazmat': 'high',
                'obstacle': 'medium'
            }
        }

    def analyze_image(
        self,
        image_path: Union[str, np.ndarray],
        use_llm: bool = True,
        return_annotated: bool = True
    ) -> DetectionResult:
        """
        Analyze a single image for hazards

        Args:
            image_path: Path to image or numpy array
            use_llm: Whether to use LLM for enhanced analysis
            return_annotated: Whether to return annotated image

        Returns:
            DetectionResult object with all detected hazards
        """
        start_time = datetime.now()

        # Load image
        if isinstance(image_path, str):
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
        else:
            image = image_path

        logger.info(f"Analyzing image of shape: {image.shape}")

        # Run CV detection
        cv_detections = self._run_cv_detection(image)

        # Enhance with LLM if enabled
        if use_llm and cv_detections:
            hazards = self._enhance_with_llm(image, cv_detections)
        else:
            hazards = self._convert_cv_to_hazards(cv_detections)

        # Annotate image if requested
        annotated_frame = None
        if return_annotated:
            annotated_frame = self._annotate_image(image.copy(), hazards)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()

        # Update statistics
        self.stats['total_frames_processed'] += 1
        self.stats['total_hazards_detected'] += len(hazards)
        self.stats['processing_times'].append(processing_time)

        result = DetectionResult(
            frame_id=self.stats['total_frames_processed'],
            hazards=hazards,
            annotated_frame=annotated_frame,
            processing_time=processing_time,
            metadata={
                'image_shape': image.shape,
                'cv_model': self.cv_model_name,
                'llm_enhanced': use_llm
            }
        )

        logger.info(f"Detected {len(hazards)} hazards in {processing_time:.3f}s")
        return result

    def _run_cv_detection(self, image: np.ndarray) -> List[Dict]:
        """
        Run computer vision detection on image

        Args:
            image: Input image as numpy array

        Returns:
            List of detection dictionaries
        """
        # Placeholder implementation - replace with actual model inference
        detections = []

        # Simulate some detections
        if np.random.random() > 0.5:
            detections.append({
                'class': 'fire',
                'confidence': 0.92,
                'bbox': (100, 150, 250, 300)
            })

        return detections

    def _enhance_with_llm(
        self,
        image: np.ndarray,
        cv_detections: List[Dict]
    ) -> List[HazardResult]:
        """
        Enhance CV detections with LLM contextual understanding

        Args:
            image: Input image
            cv_detections: CV detection results

        Returns:
            List of enhanced HazardResult objects
        """
        hazards = []

        for idx, detection in enumerate(cv_detections):
            if detection['confidence'] < self.confidence_threshold:
                continue

            # Generate contextual description using LLM
            description = self._generate_llm_description(detection)

            # Assess severity
            severity = self._assess_severity(detection)

            # Generate recommendations
            recommendations = self._generate_recommendations(detection)

            hazard = HazardResult(
                hazard_id=f"HAZ-{datetime.now().strftime('%Y%m%d%H%M%S')}-{idx}",
                type=detection['class'],
                description=description,
                confidence=detection['confidence'],
                severity=severity,
                bounding_box=detection.get('bbox'),
                recommendations=recommendations
            )

            hazards.append(hazard)

        return hazards

    def _convert_cv_to_hazards(self, cv_detections: List[Dict]) -> List[HazardResult]:
        """Convert basic CV detections to HazardResult objects"""
        hazards = []

        for idx, detection in enumerate(cv_detections):
            if detection['confidence'] < self.confidence_threshold:
                continue

            hazard = HazardResult(
                hazard_id=f"HAZ-{datetime.now().strftime('%Y%m%d%H%M%S')}-{idx}",
                type=detection['class'],
                description=f"Detected {detection['class']}",
                confidence=detection['confidence'],
                severity=self.config['severity_mapping'].get(detection['class'], 'medium'),
                bounding_box=detection.get('bbox')
            )

            hazards.append(hazard)

        return hazards

    def _generate_llm_description(self, detection: Dict) -> str:
        """Generate natural language description of hazard using LLM"""
        # Placeholder - implement actual LLM call
        hazard_type = detection['class']
        return f"A {hazard_type} has been detected with high confidence. Immediate attention recommended."

    def _assess_severity(self, detection: Dict) -> str:
        """Assess severity of detected hazard"""
        hazard_type = detection['class']
        confidence = detection['confidence']

        # Get base severity from config
        base_severity = self.config['severity_mapping'].get(hazard_type, 'medium')

        # Adjust based on confidence
        if confidence > 0.9 and base_severity in ['high', 'critical']:
            return 'critical'

        return base_severity

    def _generate_recommendations(self, detection: Dict) -> List[str]:
        """Generate action recommendations for detected hazard"""
        hazard_type = detection['class']

        recommendations_map = {
            'fire': [
                'Evacuate the area immediately',
                'Call emergency services (911)',
                'Use fire extinguisher if safe to do so',
                'Alert all personnel in the vicinity'
            ],
            'smoke': [
                'Investigate source immediately',
                'Evacuate if necessary',
                'Activate fire alarm',
                'Contact emergency services'
            ],
            'person_in_danger': [
                'Send immediate assistance',
                'Contact emergency services',
                'Clear the area of other hazards',
                'Provide first aid if trained'
            ],
            'obstacle': [
                'Mark the hazard clearly',
                'Reroute traffic if necessary',
                'Remove obstacle if safe',
                'Alert maintenance team'
            ]
        }

        return recommendations_map.get(hazard_type, ['Investigate and assess situation'])

    def _annotate_image(self, image: np.ndarray, hazards: List[HazardResult]) -> np.ndarray:
        """
        Annotate image with detection boxes and labels

        Args:
            image: Input image
            hazards: List of detected hazards

        Returns:
            Annotated image
        """
        severity_colors = {
            'low': (0, 255, 0),      # Green
            'medium': (0, 255, 255),  # Yellow
            'high': (0, 165, 255),    # Orange
            'critical': (0, 0, 255)   # Red
        }

        for hazard in hazards:
            if hazard.bounding_box:
                x1, y1, x2, y2 = hazard.bounding_box
                color = severity_colors.get(hazard.severity, (255, 255, 255))

                # Draw bounding box
                cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

                # Prepare label
                label = f"{hazard.type} ({hazard.confidence:.2f})"

                # Draw label background
                (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(image, (x1, y1 - label_h - 10), (x1 + label_w, y1), color, -1)

                # Draw label text
                cv2.putText(image, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return image

    def process_stream(
        self,
        source: Union[str, int],
        output_path: Optional[str] = None,
        alert_callback: Optional[Callable] = None,
        max_frames: Optional[int] = None
    ):
        """
        Process video stream for hazard detection

        Args:
            source: Video source (file path, URL, or camera index)
            output_path: Path to save annotated video
            alert_callback: Function to call when hazard detected
            max_frames: Maximum number of frames to process (None for unlimited)
        """
        logger.info(f"Starting stream processing from: {source}")

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            raise ValueError(f"Could not open video source: {source}")

        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Setup video writer if output path provided
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_count = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Analyze frame
                result = self.analyze_image(frame, use_llm=False, return_annotated=True)

                # Call alert callback if hazards detected
                if alert_callback and result.hazards:
                    for hazard in result.hazards:
                        alert_callback(hazard)

                # Write annotated frame
                if writer and result.annotated_frame is not None:
                    writer.write(result.annotated_frame)

                frame_count += 1
                if max_frames and frame_count >= max_frames:
                    break

                # Log progress
                if frame_count % 30 == 0:
                    logger.info(f"Processed {frame_count} frames, detected {len(result.hazards)} hazards")

        finally:
            cap.release()
            if writer:
                writer.release()
            logger.info(f"Stream processing completed. Processed {frame_count} frames")

    def get_statistics(self) -> Dict:
        """Get detection statistics"""
        avg_processing_time = np.mean(self.stats['processing_times']) if self.stats['processing_times'] else 0

        return {
            'total_frames_processed': self.stats['total_frames_processed'],
            'total_hazards_detected': self.stats['total_hazards_detected'],
            'average_processing_time': avg_processing_time,
            'average_hazards_per_frame': (
                self.stats['total_hazards_detected'] / self.stats['total_frames_processed']
                if self.stats['total_frames_processed'] > 0 else 0
            )
        }


if __name__ == "__main__":
    # Example usage
    detector = HazardDetector()

    # Test with a sample image
    print("Hazard Detection System initialized successfully!")
    print(f"Statistics: {detector.get_statistics()}")
