"""
Computer Vision Processor
Handles all CV-related operations including object detection, segmentation, and tracking
"""

import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Detection:
    """Single detection result"""
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    mask: Optional[np.ndarray] = None
    track_id: Optional[int] = None


class CVProcessor:
    """
    Computer Vision processing engine for hazard detection
    Supports multiple CV models and tasks
    """

    def __init__(
        self,
        model_name: str = "yolov8x",
        device: str = "cuda",
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.45
    ):
        """
        Initialize CV processor

        Args:
            model_name: Name of the detection model
            device: Device to run inference on ('cuda' or 'cpu')
            confidence_threshold: Minimum confidence for detections
            nms_threshold: NMS IoU threshold
        """
        self.model_name = model_name
        self.device = device
        self.confidence_threshold = confidence_threshold
        self.nms_threshold = nms_threshold

        logger.info(f"Initializing CVProcessor with model: {model_name}")

        # Load model
        self.model = self._load_model()

        # Class names for hazard detection
        self.class_names = self._get_class_names()

        # Tracking
        self.tracker = MultiObjectTracker()

    def _load_model(self):
        """Load the detection model"""
        logger.info(f"Loading model: {self.model_name}")
        # Placeholder - implement actual model loading
        # Example: from ultralytics import YOLO
        # return YOLO(f'{self.model_name}.pt')
        return None

    def _get_class_names(self) -> List[str]:
        """Get class names for the model"""
        return [
            'person', 'vehicle', 'fire', 'smoke', 'spill',
            'obstacle', 'hazmat', 'flood', 'fallen_person',
            'unauthorized_access', 'equipment', 'warning_sign'
        ]

    def detect(
        self,
        image: np.ndarray,
        enable_tracking: bool = False
    ) -> List[Detection]:
        """
        Perform object detection on image

        Args:
            image: Input image (BGR format)
            enable_tracking: Whether to track objects across frames

        Returns:
            List of Detection objects
        """
        # Preprocess image
        processed_image = self._preprocess(image)

        # Run inference
        raw_detections = self._inference(processed_image)

        # Post-process detections
        detections = self._postprocess(raw_detections, image.shape[:2])

        # Apply tracking if enabled
        if enable_tracking:
            detections = self.tracker.update(detections)

        logger.debug(f"Detected {len(detections)} objects")
        return detections

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for model input"""
        # Resize to model input size
        input_size = (640, 640)
        resized = cv2.resize(image, input_size)

        # Normalize
        normalized = resized.astype(np.float32) / 255.0

        # Convert BGR to RGB
        rgb = cv2.cvtColor(normalized, cv2.COLOR_BGR2RGB)

        return rgb

    def _inference(self, image: np.ndarray) -> List[Dict]:
        """Run model inference"""
        # Placeholder - implement actual inference
        # Example with YOLO:
        # results = self.model(image)
        # return results[0].boxes.data.cpu().numpy()

        # Return dummy detections for testing
        return [
            {
                'class_id': 2,
                'confidence': 0.95,
                'bbox': [100, 150, 300, 400]
            }
        ]

    def _postprocess(
        self,
        raw_detections: List[Dict],
        original_shape: Tuple[int, int]
    ) -> List[Detection]:
        """Post-process raw model outputs"""
        detections = []

        for det in raw_detections:
            if det['confidence'] < self.confidence_threshold:
                continue

            # Scale bbox to original image size
            bbox = self._scale_bbox(det['bbox'], original_shape)

            detection = Detection(
                class_id=det['class_id'],
                class_name=self.class_names[det['class_id']],
                confidence=det['confidence'],
                bbox=tuple(bbox)
            )

            detections.append(detection)

        # Apply NMS
        detections = self._apply_nms(detections)

        return detections

    def _scale_bbox(
        self,
        bbox: List[float],
        target_shape: Tuple[int, int]
    ) -> List[int]:
        """Scale bounding box to target shape"""
        # Assuming bbox is in [x1, y1, x2, y2] format
        h, w = target_shape
        x1, y1, x2, y2 = bbox

        return [
            int(x1 * w / 640),
            int(y1 * h / 640),
            int(x2 * w / 640),
            int(y2 * h / 640)
        ]

    def _apply_nms(self, detections: List[Detection]) -> List[Detection]:
        """Apply Non-Maximum Suppression"""
        if not detections:
            return []

        # Convert to format for NMS
        boxes = np.array([d.bbox for d in detections])
        scores = np.array([d.confidence for d in detections])

        # Apply NMS using OpenCV
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(),
            scores.tolist(),
            self.confidence_threshold,
            self.nms_threshold
        )

        if len(indices) > 0:
            indices = indices.flatten()
            return [detections[i] for i in indices]

        return []

    def segment(self, image: np.ndarray) -> Tuple[np.ndarray, List[Detection]]:
        """
        Perform instance segmentation

        Args:
            image: Input image

        Returns:
            Tuple of (segmentation mask, list of detections)
        """
        # Placeholder for segmentation
        logger.info("Running segmentation...")

        # Dummy implementation
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        detections = self.detect(image)

        return mask, detections

    def detect_anomalies(self, image: np.ndarray) -> List[Dict]:
        """
        Detect anomalies in the image

        Args:
            image: Input image

        Returns:
            List of anomaly detections
        """
        logger.info("Running anomaly detection...")

        # Placeholder for anomaly detection
        # Could use autoencoders, GANs, or other anomaly detection methods
        anomalies = []

        return anomalies

    def estimate_depth(self, image: np.ndarray) -> np.ndarray:
        """
        Estimate depth map from image

        Args:
            image: Input image

        Returns:
            Depth map as numpy array
        """
        logger.info("Estimating depth...")

        # Placeholder - could use MiDaS or other depth estimation models
        depth_map = np.zeros(image.shape[:2], dtype=np.float32)

        return depth_map

    def detect_motion(
        self,
        current_frame: np.ndarray,
        previous_frame: np.ndarray,
        threshold: int = 25
    ) -> np.ndarray:
        """
        Detect motion between frames

        Args:
            current_frame: Current frame
            previous_frame: Previous frame
            threshold: Motion detection threshold

        Returns:
            Binary motion mask
        """
        # Convert to grayscale
        gray_current = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        gray_previous = cv2.cvtColor(previous_frame, cv2.COLOR_BGR2GRAY)

        # Compute absolute difference
        diff = cv2.absdiff(gray_current, gray_previous)

        # Threshold
        _, motion_mask = cv2.threshold(diff, threshold, 255, cv2.THRESH_BINARY)

        # Morphological operations to reduce noise
        kernel = np.ones((5, 5), np.uint8)
        motion_mask = cv2.morphologyEx(motion_mask, cv2.MORPH_CLOSE, kernel)
        motion_mask = cv2.morphologyEx(motion_mask, cv2.MORPH_OPEN, kernel)

        return motion_mask


class MultiObjectTracker:
    """
    Multi-object tracker using various tracking algorithms
    """

    def __init__(self, max_age: int = 30, min_hits: int = 3):
        """
        Initialize tracker

        Args:
            max_age: Maximum frames to keep track without detection
            min_hits: Minimum hits before track is confirmed
        """
        self.max_age = max_age
        self.min_hits = min_hits
        self.tracks: List[Track] = []
        self.next_id = 0

    def update(self, detections: List[Detection]) -> List[Detection]:
        """
        Update tracks with new detections

        Args:
            detections: New detections

        Returns:
            Detections with track IDs assigned
        """
        # Predict new locations of tracks
        for track in self.tracks:
            track.predict()

        # Match detections to tracks
        matches, unmatched_dets, unmatched_tracks = self._match(detections)

        # Update matched tracks
        for det_idx, track_idx in matches:
            self.tracks[track_idx].update(detections[det_idx])
            detections[det_idx].track_id = self.tracks[track_idx].id

        # Create new tracks for unmatched detections
        for det_idx in unmatched_dets:
            track = Track(self.next_id, detections[det_idx])
            self.tracks.append(track)
            detections[det_idx].track_id = self.next_id
            self.next_id += 1

        # Remove dead tracks
        self.tracks = [t for t in self.tracks if t.time_since_update < self.max_age]

        return detections

    def _match(
        self,
        detections: List[Detection]
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """
        Match detections to tracks using IoU

        Returns:
            Tuple of (matches, unmatched_detections, unmatched_tracks)
        """
        if not self.tracks or not detections:
            return [], list(range(len(detections))), list(range(len(self.tracks)))

        # Compute IoU matrix
        iou_matrix = np.zeros((len(detections), len(self.tracks)))
        for d, det in enumerate(detections):
            for t, track in enumerate(self.tracks):
                iou_matrix[d, t] = self._compute_iou(det.bbox, track.bbox)

        # Simple greedy matching
        matches = []
        unmatched_dets = list(range(len(detections)))
        unmatched_tracks = list(range(len(self.tracks)))

        while iou_matrix.size > 0 and iou_matrix.max() > 0.3:
            max_idx = np.unravel_index(iou_matrix.argmax(), iou_matrix.shape)
            det_idx, track_idx = max_idx

            matches.append((det_idx, track_idx))
            unmatched_dets.remove(det_idx)
            unmatched_tracks.remove(track_idx)

            iou_matrix[det_idx, :] = 0
            iou_matrix[:, track_idx] = 0

        return matches, unmatched_dets, unmatched_tracks

    def _compute_iou(self, bbox1: Tuple, bbox2: Tuple) -> float:
        """Compute IoU between two bounding boxes"""
        x1_min, y1_min, x1_max, y1_max = bbox1
        x2_min, y2_min, x2_max, y2_max = bbox2

        # Compute intersection
        x_min = max(x1_min, x2_min)
        y_min = max(y1_min, y2_min)
        x_max = min(x1_max, x2_max)
        y_max = min(y1_max, y2_max)

        if x_max < x_min or y_max < y_min:
            return 0.0

        intersection = (x_max - x_min) * (y_max - y_min)

        # Compute union
        area1 = (x1_max - x1_min) * (y1_max - y1_min)
        area2 = (x2_max - x2_min) * (y2_max - y2_min)
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0


@dataclass
class Track:
    """Represents a tracked object"""
    id: int
    bbox: Tuple[int, int, int, int]
    confidence: float = 0.0
    time_since_update: int = 0
    hits: int = 1

    def __init__(self, track_id: int, detection: Detection):
        self.id = track_id
        self.bbox = detection.bbox
        self.confidence = detection.confidence
        self.time_since_update = 0
        self.hits = 1

    def predict(self):
        """Predict next position (simple: keep same position)"""
        self.time_since_update += 1

    def update(self, detection: Detection):
        """Update track with new detection"""
        self.bbox = detection.bbox
        self.confidence = detection.confidence
        self.time_since_update = 0
        self.hits += 1


if __name__ == "__main__":
    # Test CV processor
    processor = CVProcessor()
    print("CV Processor initialized successfully!")
