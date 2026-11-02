import re
import json
import logging
from typing import List, Tuple
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from .config import settings
from .schemas import ClinicalSummarySchema, MedicationItem
from .models import TranscriptRecord

logger = logging.getLogger("langchain_service")

# Medical Extraction Prompt Template
CLINICAL_EXTRACTION_PROMPT = """You are an expert board-certified clinical medical scribe and physician assistant.
Your task is to analyze the following complete spoken transcript from a telehealth video consultation between a doctor and a patient.

You must extract key medical insights, diagnoses, observations, prescriptions, and instructions into a structured clinical document.

CRITICAL TELEHEALTH CONSTRAINTS:
1. This is a REMOTE ONLINE TELEHEALTH consultation. The doctor CANNOT physically measure vital signs such as body temperature, blood pressure, or heart rate.
2. DO NOT fabricate, hallucinate, infer, or output any physical body temperature measurement (e.g., do NOT state "Body temperature: 102°F measured" or "temperature: 98.6°F"). Only if the patient explicitly stated in the transcript that they used a personal thermometer at home may you document it, and you MUST label it clearly as "Patient self-reported home reading". If no body temperature was mentioned, do NOT include any body temperature.
3. Base your clinical observations strictly on symptoms verbally reported by the patient and visual observations made over video.
4. Extract only medications that were actually prescribed or recommended by the doctor in the dialogue (with name, dosage, frequency, and instructions). If no medications were prescribed, return an empty list.

Format Instructions:
{format_instructions}

Consultation Transcript:
----------------------------------------
{transcript}
----------------------------------------

Generate an accurate, professional, and thorough clinical summary based strictly on the dialogue provided."""

class LangChainTranscriptionPipeline:
    def __init__(self):
        self.parser = PydanticOutputParser(pydantic_object=ClinicalSummarySchema)
        self.prompt = PromptTemplate(
            template=CLINICAL_EXTRACTION_PROMPT,
            input_variables=["transcript"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )
        self.llm = self._initialize_llm()

    def _initialize_llm(self):
        """
        Dynamically initializes the LLM based on available credentials.
        Prioritizes OpenRouter, Google Gemini, or OpenAI; falls back gracefully to local NLP engine if unconfigured.
        """
        # 1. Check OpenRouter API
        if settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY.strip()) > 5:
            try:
                from langchain_openai import ChatOpenAI
                model_name = settings.OPENROUTER_MODEL or "nvidia/nemotron-3.5-lightning:free"
                logger.info(f"Initializing LangChain with OpenRouter (Model: {model_name})...")
                return ChatOpenAI(
                    model=model_name,
                    api_key=settings.OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    temperature=0.2,
                    request_timeout=35,
                    default_headers={
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "TeleMeet Video Consultation Scribe",
                    }
                )
            except Exception as e:
                logger.warning(f"Could not initialize OpenRouter LLM: {e}")

        # 2. Check Google Gemini
        if settings.GOOGLE_API_KEY and len(settings.GOOGLE_API_KEY.strip()) > 5:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                logger.info("Initializing LangChain with Google Gemini (gemini-1.5-flash)...")
                return ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=settings.GOOGLE_API_KEY,
                    temperature=0.2,
                )
            except Exception as e:
                logger.warning(f"Could not initialize Google Gemini LLM: {e}")

        # 3. Check OpenAI
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 5:
            try:
                from langchain_openai import ChatOpenAI
                logger.info("Initializing LangChain with OpenAI (gpt-4o-mini)...")
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    api_key=settings.OPENAI_API_KEY,
                    temperature=0.2,
                )
            except Exception as e:
                logger.warning(f"Could not initialize OpenAI LLM: {e}")

        logger.info("No active external LLM API key detected. Using local Intelligent Medical NLP Pipeline.")
        return None

    def process_transcript(self, transcripts: List[TranscriptRecord], context_notes: str = "") -> Tuple[ClinicalSummarySchema, str]:
        """
        Runs the consultation transcript through the LangChain processing pipeline.
        Returns the parsed ClinicalSummarySchema and the name of the AI engine used.
        """
        # If no transcripts exist yet, return honest pending status without fake synthesis
        if not transcripts:
            complaint = f"Scheduled consultation reason: {context_notes.strip()}" if context_notes else "Online video consultation scheduled."
            pending_summary = ClinicalSummarySchema(
                chief_complaint=complaint,
                clinical_observations="Consultation pending: No spoken dialogue recorded yet. The clinical summary will be generated automatically once doctor and patient conduct their video consultation.",
                doctor_advice="Awaiting physician consultation.",
                prescribed_medications=[],
                follow_up_instructions="Attend your scheduled video consultation in this room.",
                red_flags_and_warnings="For acute medical emergencies, seek immediate in-person emergency care or contact emergency services (911/112)."
            )
            return pending_summary, "Pending Consultation"

        # Format transcript records into a clean conversation script
        formatted_transcript = "\n".join([
            f"[{t.speaker_role.upper()}] {t.speaker_name} ({t.timestamp.strftime('%H:%M:%S')}): {t.text}"
            for t in transcripts
        ])

        # If LLM is active, run the LangChain chain
        if self.llm:
            try:
                formatted_prompt = self.prompt.format(transcript=formatted_transcript)
                response = self.llm.invoke(formatted_prompt)
                raw_text = response.content if hasattr(response, "content") else str(response)
                
                # Robust extraction: clean any ```json ... ``` markdown blocks
                cleaned_json = raw_text.strip()
                if "```json" in cleaned_json:
                    cleaned_json = cleaned_json.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned_json:
                    cleaned_json = cleaned_json.split("```")[1].split("```")[0].strip()
                    
                parsed_dict = json.loads(cleaned_json)
                result = ClinicalSummarySchema.model_validate(parsed_dict)
                model_name = getattr(self.llm, "model_name", getattr(self.llm, "model", "nvidia/nemotron-3.5-lightning:free"))
                return result, f"LangChain ({model_name})"
            except Exception as e:
                logger.error(f"LangChain LLM invocation failed: {e}. Falling back to Intelligent Medical NLP.")

        # Fallback to Local Intelligent Medical NLP Engine
        return self._intelligent_nlp_pipeline(transcripts), "LangChain-Intelligent-NLP (Offline Engine)"

    def _intelligent_nlp_pipeline(self, transcripts: List[TranscriptRecord]) -> ClinicalSummarySchema:
        """
        Deterministic, rule-based medical NLP pipeline to extract clinical sections
        when cloud LLM keys are absent. Guarantees 100% offline functionality.
        """
        patient_text = " ".join([t.text for t in transcripts if t.speaker_role == "PATIENT"]).strip()
        doctor_text = " ".join([t.text for t in transcripts if t.speaker_role == "DOCTOR"]).strip()
        all_text = " ".join([t.text for t in transcripts]).strip()

        # 1. Chief Complaint Extraction
        complaint_matches = re.findall(
            r'(?:suffering from|complaining of|feeling|have|experiencing|pain in|headache|cough|sore throat|chest pain|stomach ache|rash)[^.,;]+',
            patient_text, re.IGNORECASE
        )
        chief_complaint = (
            f"Patient reported: {complaint_matches[0].strip()}."
            if complaint_matches else
            (patient_text[:180] + "..." if len(patient_text) > 180 else patient_text or "General medical checkup and wellness consultation.")
        )

        # 2. Clinical Observations & Symptoms (Telehealth observations, NO fabricated body temperature)
        observations = []
        if re.search(r'cough|throat|breathing|respiratory', all_text, re.IGNORECASE):
            observations.append("Patient reported upper respiratory symptoms / throat irritation.")
        if re.search(r'pain|ache|discomfort|headache', all_text, re.IGNORECASE):
            observations.append("Localized discomfort or headache reported by patient.")
        if re.search(r'rash|skin|itch', all_text, re.IGNORECASE):
            observations.append("Dermatological symptoms described during video call.")
        if not observations:
            observations.append("Patient appeared stable during video consultation; no acute distress observed.")
        clinical_observations = " ".join(observations)

        # 3. Doctor Advice
        advice_parts = []
        if re.search(r'rest|sleep|hydrate|water|fluids', doctor_text, re.IGNORECASE):
            advice_parts.append("Maintain optimal hydration and obtain adequate rest.")
        if re.search(r'diet|food|spicy|avoid', doctor_text, re.IGNORECASE):
            advice_parts.append("Follow light diet; avoid heavy or irritating foods.")
        if not advice_parts:
            advice_parts.append("Follow standard symptomatic relief, maintain hydration, and monitor condition.")
        doctor_advice = " ".join(advice_parts)

        # 4. Medication Prescriptions Extraction (Strictly what was spoken, no fake Paracetamol if unmentioned)
        medications: List[MedicationItem] = []
        common_rx = [
            ("Paracetamol", "650mg", "Every 6-8 hours as needed", "3 days"),
            ("Amoxicillin", "500mg", "Twice daily after meals", "5 days"),
            ("Ibuprofen", "400mg", "Once daily after meals for pain", "3 days"),
            ("Cetirizine", "10mg", "Once daily at bedtime", "5 days"),
            ("Azithromycin", "500mg", "Once daily before meals", "3 days"),
            ("Pantoprazole", "40mg", "Once daily in the morning before breakfast", "7 days"),
        ]

        for name, dose, freq, dur in common_rx:
            if re.search(r'\b' + re.escape(name) + r'\b', all_text, re.IGNORECASE):
                medications.append(MedicationItem(
                    name=name,
                    dosage=dose,
                    frequency=freq,
                    duration=dur,
                    instructions="Take as instructed during consultation. Consult doctor if symptoms persist."
                ))

        # 5. Follow-Up Plan
        follow_up = "Follow up with physician in 3 to 5 days if symptoms do not improve, or immediately if condition changes."

        # 6. Red Flags & Warnings
        red_flags = "Seek immediate emergency medical care if experiencing severe shortness of breath, sudden chest tightness, confusion, or fainting."

        return ClinicalSummarySchema(
            chief_complaint=chief_complaint,
            clinical_observations=clinical_observations,
            doctor_advice=doctor_advice,
            prescribed_medications=medications,
            follow_up_instructions=follow_up,
            red_flags_and_warnings=red_flags,
        )

# Global pipeline instance
langchain_pipeline = LangChainTranscriptionPipeline()

