"""
Video Processing Module
Handles video stream capture, processing, and recording
"""

import cv2
import numpy as np
from typing import Optional, Callable, Dict, List
from pathlib import Path
from datetime import datetime
import threading
import queue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoStream:
    """
    Video stream handler with multi-threading support
    """

    def __init__(
        self,
        source: str,
        name: str = "Stream",
        frame_buffer_size: int = 128
    ):
        """
        Initialize video stream

        Args:
            source: Video source (file, URL, or camera index)
            name: Stream name
            frame_buffer_size: Size of frame buffer
        """
        self.source = source
        self.name = name
        self.frame_buffer = queue.Queue(maxsize=frame_buffer_size)
        self.stopped = False

        # Open video capture
        self.capture = cv2.VideoCapture(source)
        if not self.capture.isOpened():
            raise ValueError(f"Could not open video source: {source}")

        # Get stream properties
        self.fps = int(self.capture.get(cv2.CAP_PROP_FPS))
        self.width = int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.frame_count = 0

        logger.info(f"Stream '{name}' initialized: {self.width}x{self.height} @ {self.fps} FPS")

    def start(self):
        """Start the video stream in a separate thread"""
        thread = threading.Thread(target=self._update, daemon=True)
        thread.start()
        return self

    def _update(self):
        """Continuously read frames from video source"""
        while not self.stopped:
            if not self.frame_buffer.full():
                ret, frame = self.capture.read()

                if not ret:
                    self.stop()
                    break

                self.frame_buffer.put(frame)
                self.frame_count += 1
            else:
                # If buffer is full, sleep briefly
                threading.Event().wait(0.01)

    def read(self) -> Optional[np.ndarray]:
        """Read next frame from buffer"""
        if not self.frame_buffer.empty():
            return self.frame_buffer.get()
        return None

    def stop(self):
        """Stop the video stream"""
        self.stopped = True
        if self.capture:
            self.capture.release()
        logger.info(f"Stream '{self.name}' stopped")

    def is_active(self) -> bool:
        """Check if stream is active"""
        return not self.stopped


class VideoProcessor:
    """
    Process video streams with hazard detection
    """

    def __init__(
        self,
        detector,
        output_dir: str = "output",
        save_detections: bool = True,
        save_video: bool = False
    ):
        """
        Initialize video processor

        Args:
            detector: Hazard detector instance
            output_dir: Output directory for results
            save_detections: Whether to save detection images
            save_video: Whether to save annotated video
        """
        self.detector = detector
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.save_detections = save_detections
        self.save_video = save_video

        # Statistics
        self.stats = {
            'frames_processed': 0,
            'hazards_detected': 0,
            'processing_times': [],
            'start_time': None
        }

    def process_video(
        self,
        video_path: str,
        frame_skip: int = 0,
        max_frames: Optional[int] = None,
        alert_callback: Optional[Callable] = None
    ) -> Dict:
        """
        Process video file

        Args:
            video_path: Path to video file
            frame_skip: Number of frames to skip between detections
            max_frames: Maximum frames to process
            alert_callback: Callback for hazard alerts

        Returns:
            Processing statistics
        """
        logger.info(f"Processing video: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        logger.info(f"Video: {width}x{height} @ {fps} FPS, {total_frames} frames")

        # Setup video writer
        writer = None
        if self.save_video:
            output_path = self.output_dir / f"processed_{Path(video_path).name}"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        self.stats['start_time'] = datetime.now()
        frame_idx = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Skip frames if configured
                if frame_skip > 0 and frame_idx % (frame_skip + 1) != 0:
                    frame_idx += 1
                    continue

                # Process frame
                start_time = datetime.now()
                result = self.detector.analyze_image(
                    frame,
                    use_llm=False,
                    return_annotated=True
                )
                processing_time = (datetime.now() - start_time).total_seconds()

                # Update statistics
                self.stats['frames_processed'] += 1
                self.stats['hazards_detected'] += len(result.hazards)
                self.stats['processing_times'].append(processing_time)

                # Save detection image
                if self.save_detections and result.hazards:
                    self._save_detection(result.annotated_frame, frame_idx, result.hazards)

                # Call alert callback
                if alert_callback and result.hazards:
                    for hazard in result.hazards:
                        alert_callback(hazard)

                # Write frame to output video
                if writer and result.annotated_frame is not None:
                    writer.write(result.annotated_frame)

                frame_idx += 1

                # Check max frames
                if max_frames and frame_idx >= max_frames:
                    break

                # Log progress
                if frame_idx % 100 == 0:
                    logger.info(f"Processed {frame_idx}/{total_frames} frames")

        finally:
            cap.release()
            if writer:
                writer.release()

        # Calculate final statistics
        return self._get_final_stats()

    def process_stream(
        self,
        stream_source: str,
        stream_name: str = "Stream",
        alert_callback: Optional[Callable] = None,
        duration: Optional[int] = None
    ):
        """
        Process live video stream

        Args:
            stream_source: Stream URL or camera index
            stream_name: Name for the stream
            alert_callback: Callback for hazard alerts
            duration: Duration in seconds (None for continuous)
        """
        logger.info(f"Starting stream processing: {stream_name}")

        # Start video stream
        stream = VideoStream(stream_source, stream_name).start()

        # Setup video writer
        writer = None
        if self.save_video:
            output_path = self.output_dir / f"stream_{stream_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(str(output_path), fourcc, stream.fps, (stream.width, stream.height))

        self.stats['start_time'] = datetime.now()
        start_time = datetime.now()

        try:
            while stream.is_active():
                # Check duration
                if duration:
                    elapsed = (datetime.now() - start_time).total_seconds()
                    if elapsed >= duration:
                        break

                # Read frame
                frame = stream.read()
                if frame is None:
                    continue

                # Process frame
                result = self.detector.analyze_image(
                    frame,
                    use_llm=False,
                    return_annotated=True
                )

                # Update statistics
                self.stats['frames_processed'] += 1
                self.stats['hazards_detected'] += len(result.hazards)

                # Handle hazards
                if result.hazards:
                    if self.save_detections:
                        self._save_detection(result.annotated_frame, self.stats['frames_processed'], result.hazards)

                    if alert_callback:
                        for hazard in result.hazards:
                            alert_callback(hazard)

                # Write to output video
                if writer and result.annotated_frame is not None:
                    writer.write(result.annotated_frame)

                # Log progress
                if self.stats['frames_processed'] % 100 == 0:
                    logger.info(f"Stream processed {self.stats['frames_processed']} frames")

        finally:
            stream.stop()
            if writer:
                writer.release()

        logger.info(f"Stream processing completed: {stream_name}")
        return self._get_final_stats()

    def _save_detection(self, frame: np.ndarray, frame_idx: int, hazards: List):
        """Save detection image"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"detection_{timestamp}_frame{frame_idx}.jpg"
        output_path = self.output_dir / "detections" / filename

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), frame)

        logger.debug(f"Saved detection: {filename}")

    def _get_final_stats(self) -> Dict:
        """Calculate final processing statistics"""
        if self.stats['start_time']:
            total_time = (datetime.now() - self.stats['start_time']).total_seconds()
        else:
            total_time = 0

        avg_processing_time = (
            np.mean(self.stats['processing_times'])
            if self.stats['processing_times'] else 0
        )

        return {
            'frames_processed': self.stats['frames_processed'],
            'hazards_detected': self.stats['hazards_detected'],
            'total_time': total_time,
            'average_fps': self.stats['frames_processed'] / total_time if total_time > 0 else 0,
            'average_processing_time': avg_processing_time,
            'hazards_per_frame': (
                self.stats['hazards_detected'] / self.stats['frames_processed']
                if self.stats['frames_processed'] > 0 else 0
            )
        }


class MultiStreamProcessor:
    """
    Process multiple video streams simultaneously
    """

    def __init__(self, detector, max_streams: int = 4):
        """
        Initialize multi-stream processor

        Args:
            detector: Hazard detector instance
            max_streams: Maximum number of concurrent streams
        """
        self.detector = detector
        self.max_streams = max_streams
        self.active_streams: Dict[str, VideoStream] = {}
        self.processors: Dict[str, VideoProcessor] = {}

    def add_stream(
        self,
        stream_id: str,
        source: str,
        alert_callback: Optional[Callable] = None
    ):
        """Add a new stream to process"""
        if len(self.active_streams) >= self.max_streams:
            raise ValueError(f"Maximum number of streams ({self.max_streams}) reached")

        # Create stream and processor
        stream = VideoStream(source, stream_id).start()
        processor = VideoProcessor(self.detector)

        self.active_streams[stream_id] = stream
        self.processors[stream_id] = processor

        # Start processing in background thread
        thread = threading.Thread(
            target=self._process_stream_thread,
            args=(stream_id, alert_callback),
            daemon=True
        )
        thread.start()

        logger.info(f"Added stream: {stream_id}")

    def _process_stream_thread(self, stream_id: str, alert_callback: Optional[Callable]):
        """Process stream in background thread"""
        stream = self.active_streams[stream_id]
        processor = self.processors[stream_id]

        while stream.is_active():
            frame = stream.read()
            if frame is None:
                continue

            # Process frame
            result = self.detector.analyze_image(frame, use_llm=False, return_annotated=True)

            # Handle alerts
            if result.hazards and alert_callback:
                for hazard in result.hazards:
                    alert_callback(stream_id, hazard)

    def remove_stream(self, stream_id: str):
        """Remove a stream"""
        if stream_id in self.active_streams:
            self.active_streams[stream_id].stop()
            del self.active_streams[stream_id]
            del self.processors[stream_id]
            logger.info(f"Removed stream: {stream_id}")

    def get_stream_stats(self, stream_id: str) -> Dict:
        """Get statistics for a specific stream"""
        if stream_id in self.processors:
            return self.processors[stream_id]._get_final_stats()
        return {}

    def stop_all(self):
        """Stop all streams"""
        for stream_id in list(self.active_streams.keys()):
            self.remove_stream(stream_id)
        logger.info("All streams stopped")


if __name__ == "__main__":
    print("Video Processor module loaded successfully!")
