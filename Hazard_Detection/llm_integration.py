"""
LLM Integration Module
Handles integration with various LLM providers for contextual understanding
"""

import base64
import json
import logging
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    """Response from LLM"""
    text: str
    confidence: float
    metadata: Dict
    model: str
    tokens_used: int = 0


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    def analyze_image(
        self,
        image: np.ndarray,
        prompt: str,
        **kwargs
    ) -> LLMResponse:
        """Analyze image with prompt"""
        pass

    @abstractmethod
    def generate_description(
        self,
        context: Dict,
        **kwargs
    ) -> str:
        """Generate natural language description"""
        pass


class GPT4VisionProvider(LLMProvider):
    """OpenAI GPT-4 Vision provider"""

    def __init__(self, api_key: str, model: str = "gpt-4-vision-preview"):
        """
        Initialize GPT-4 Vision provider

        Args:
            api_key: OpenAI API key
            model: Model name
        """
        self.api_key = api_key
        self.model = model
        logger.info(f"Initialized GPT4VisionProvider with model: {model}")

    def analyze_image(
        self,
        image: np.ndarray,
        prompt: str,
        max_tokens: int = 500,
        **kwargs
    ) -> LLMResponse:
        """
        Analyze image using GPT-4 Vision

        Args:
            image: Input image as numpy array
            prompt: Analysis prompt
            max_tokens: Maximum tokens in response

        Returns:
            LLMResponse object
        """
        logger.info("Analyzing image with GPT-4 Vision")

        # Encode image to base64
        image_base64 = self._encode_image(image)

        # Prepare API request
        # Placeholder - implement actual API call
        # import openai
        # response = openai.ChatCompletion.create(...)

        # Dummy response
        return LLMResponse(
            text="This image shows a potential fire hazard in the industrial area. "
                 "Immediate evacuation and fire suppression recommended.",
            confidence=0.92,
            metadata={"analysis_type": "hazard_detection"},
            model=self.model,
            tokens_used=150
        )

    def generate_description(
        self,
        context: Dict,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """
        Generate natural language description of hazard

        Args:
            context: Context dictionary with hazard information
            temperature: Sampling temperature

        Returns:
            Generated description
        """
        prompt = self._create_description_prompt(context)

        # Placeholder - implement actual API call
        description = f"A {context.get('hazard_type', 'hazard')} has been detected " \
                     f"with {context.get('confidence', 0) * 100:.1f}% confidence."

        return description

    def _encode_image(self, image: np.ndarray) -> str:
        """Encode image to base64"""
        import cv2
        _, buffer = cv2.imencode('.jpg', image)
        return base64.b64encode(buffer).decode('utf-8')

    def _create_description_prompt(self, context: Dict) -> str:
        """Create prompt for description generation"""
        return f"""
        Generate a detailed description of the following hazard:
        Type: {context.get('hazard_type')}
        Confidence: {context.get('confidence')}
        Location: {context.get('location')}

        Provide a clear, actionable description for emergency responders.
        """


class ClaudeProvider(LLMProvider):
    """Anthropic Claude provider"""

    def __init__(self, api_key: str, model: str = "claude-3-opus-20240229"):
        """
        Initialize Claude provider

        Args:
            api_key: Anthropic API key
            model: Model name
        """
        self.api_key = api_key
        self.model = model
        logger.info(f"Initialized ClaudeProvider with model: {model}")

    def analyze_image(
        self,
        image: np.ndarray,
        prompt: str,
        max_tokens: int = 500,
        **kwargs
    ) -> LLMResponse:
        """
        Analyze image using Claude

        Args:
            image: Input image
            prompt: Analysis prompt
            max_tokens: Maximum tokens

        Returns:
            LLMResponse object
        """
        logger.info("Analyzing image with Claude")

        # Encode image
        image_base64 = self._encode_image(image)

        # Placeholder - implement actual API call
        # import anthropic
        # response = anthropic.messages.create(...)

        return LLMResponse(
            text="Analysis shows a critical safety violation. "
                 "Personnel are in proximity to hazardous equipment without proper PPE.",
            confidence=0.88,
            metadata={"analysis_type": "safety_violation"},
            model=self.model,
            tokens_used=120
        )

    def generate_description(self, context: Dict, **kwargs) -> str:
        """Generate description using Claude"""
        prompt = f"""
        Analyze this hazard situation and provide a comprehensive description:
        {json.dumps(context, indent=2)}

        Include:
        1. Nature of the hazard
        2. Immediate risks
        3. Recommended actions
        """

        # Placeholder - implement actual API call
        description = f"Critical {context.get('hazard_type')} detected requiring immediate response."

        return description

    def _encode_image(self, image: np.ndarray) -> str:
        """Encode image to base64"""
        import cv2
        _, buffer = cv2.imencode('.jpg', image)
        return base64.b64encode(buffer).decode('utf-8')


class LLMIntegration:
    """
    Main LLM integration class that manages multiple providers
    """

    def __init__(
        self,
        provider: str = "gpt4v",
        api_key: Optional[str] = None,
        fallback_provider: Optional[str] = None
    ):
        """
        Initialize LLM integration

        Args:
            provider: Primary LLM provider ('gpt4v', 'claude', 'gemini')
            api_key: API key for the provider
            fallback_provider: Fallback provider if primary fails
        """
        self.provider_name = provider
        self.fallback_provider_name = fallback_provider

        # Initialize providers
        self.provider = self._initialize_provider(provider, api_key)
        self.fallback_provider = None
        if fallback_provider:
            self.fallback_provider = self._initialize_provider(fallback_provider, api_key)

        logger.info(f"LLM Integration initialized with provider: {provider}")

    def _initialize_provider(self, provider: str, api_key: Optional[str]) -> LLMProvider:
        """Initialize specific LLM provider"""
        providers = {
            'gpt4v': GPT4VisionProvider,
            'claude': ClaudeProvider,
        }

        if provider not in providers:
            raise ValueError(f"Unknown provider: {provider}")

        provider_class = providers[provider]
        return provider_class(api_key=api_key or "dummy_key")

    def analyze_hazard(
        self,
        image: np.ndarray,
        detections: List[Dict],
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Comprehensive hazard analysis using LLM

        Args:
            image: Input image
            detections: CV detection results
            context: Additional context

        Returns:
            Analysis results dictionary
        """
        # Create analysis prompt
        prompt = self._create_hazard_prompt(detections, context)

        try:
            # Analyze with primary provider
            response = self.provider.analyze_image(image, prompt)

        except Exception as e:
            logger.error(f"Primary provider failed: {e}")

            if self.fallback_provider:
                logger.info("Attempting with fallback provider")
                response = self.fallback_provider.analyze_image(image, prompt)
            else:
                raise

        # Parse and structure response
        analysis = self._parse_analysis(response, detections)

        return analysis

    def _create_hazard_prompt(
        self,
        detections: List[Dict],
        context: Optional[Dict]
    ) -> str:
        """Create comprehensive prompt for hazard analysis"""
        detection_summary = "\n".join([
            f"- {d.get('class_name', 'unknown')}: {d.get('confidence', 0):.2f}"
            for d in detections
        ])

        prompt = f"""
        Analyze this scene for potential hazards.

        Detected objects:
        {detection_summary}

        Additional context:
        {json.dumps(context, indent=2) if context else 'None'}

        Provide:
        1. Detailed description of each hazard
        2. Severity assessment (low/medium/high/critical)
        3. Immediate risks to people and property
        4. Recommended actions in priority order
        5. Estimated time criticality

        Format your response as JSON.
        """

        return prompt

    def _parse_analysis(self, response: LLMResponse, detections: List[Dict]) -> Dict:
        """Parse LLM response into structured analysis"""
        return {
            'summary': response.text,
            'confidence': response.confidence,
            'severity': self._extract_severity(response.text),
            'recommendations': self._extract_recommendations(response.text),
            'risk_factors': self._extract_risk_factors(response.text, detections),
            'metadata': response.metadata
        }

    def _extract_severity(self, text: str) -> str:
        """Extract severity from response text"""
        text_lower = text.lower()
        if 'critical' in text_lower:
            return 'critical'
        elif 'high' in text_lower:
            return 'high'
        elif 'medium' in text_lower:
            return 'medium'
        return 'low'

    def _extract_recommendations(self, text: str) -> List[str]:
        """Extract action recommendations from response"""
        # Simple extraction - could be improved with more sophisticated parsing
        recommendations = []

        if 'evacuate' in text.lower():
            recommendations.append('Evacuate the area immediately')
        if 'call emergency' in text.lower() or '911' in text:
            recommendations.append('Contact emergency services')
        if 'fire' in text.lower():
            recommendations.append('Activate fire suppression systems')

        return recommendations or ['Investigate and assess situation']

    def _extract_risk_factors(self, text: str, detections: List[Dict]) -> List[str]:
        """Extract specific risk factors"""
        risk_factors = []

        # Based on detections
        for det in detections:
            class_name = det.get('class_name', '')
            if class_name in ['fire', 'smoke']:
                risk_factors.append('Fire/smoke hazard detected')
            elif class_name == 'person':
                risk_factors.append('Personnel at risk')

        return risk_factors

    def generate_alert_message(
        self,
        hazard_data: Dict,
        recipient_type: str = "general"
    ) -> str:
        """
        Generate alert message tailored for specific recipient

        Args:
            hazard_data: Hazard information
            recipient_type: Type of recipient (general, technical, executive)

        Returns:
            Formatted alert message
        """
        context = {
            'hazard_data': hazard_data,
            'recipient_type': recipient_type
        }

        return self.provider.generate_description(context)

    def translate_alert(self, message: str, target_language: str) -> str:
        """
        Translate alert message to target language

        Args:
            message: Original message
            target_language: Target language code

        Returns:
            Translated message
        """
        prompt = f"Translate this hazard alert to {target_language}: {message}"

        # Placeholder - implement actual translation
        translated = f"[{target_language}] {message}"

        return translated


if __name__ == "__main__":
    # Test LLM integration
    llm = LLMIntegration(provider="gpt4v")
    print("LLM Integration initialized successfully!")
    print(f"Provider: {llm.provider_name}")
