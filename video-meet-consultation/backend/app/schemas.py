from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# ----------------- Auth Schemas -----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    role: str = "PATIENT"  # DOCTOR or PATIENT
    specialty: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    specialty: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Meeting Schemas -----------------
class CreateMeetingRequest(BaseModel):
    title: str = "Doctor Video Consultation"
    patient_id: Optional[str] = None

class MeetingResponse(BaseModel):
    id: str
    room_code: str
    title: str
    doctor_id: Optional[str] = None
    patient_id: Optional[str] = None
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    has_summary: bool = False

    class Config:
        from_attributes = True

# ----------------- Transcript Schemas -----------------
class TranscriptChunkRequest(BaseModel):
    speaker_name: str
    speaker_role: str  # DOCTOR or PATIENT
    text: str

class TranscriptRecordResponse(BaseModel):
    id: int
    meeting_id: str
    speaker_name: str
    speaker_role: str
    text: str
    timestamp: datetime

    class Config:
        from_attributes = True

# ----------------- LangChain Clinical Summary Schemas -----------------
class MedicationItem(BaseModel):
    name: str = Field(description="Name of the prescribed medicine")
    dosage: str = Field(description="Dosage strength (e.g. 500mg, 10ml)")
    frequency: str = Field(description="Frequency of intake (e.g. Twice daily after meals)")
    duration: Optional[str] = Field(None, description="Course length (e.g. 5 days, 1 month)")
    instructions: Optional[str] = Field(None, description="Specific safety or administration notes")

class ClinicalSummarySchema(BaseModel):
    chief_complaint: str = Field(
        description="The primary symptom or medical concern reported by the patient during the call."
    )
    clinical_observations: str = Field(
        description="Key physical signs, duration of illness, reported vitals, or clinical examination remarks."
    )
    doctor_advice: str = Field(
        description="The doctor's diagnosis, medical evaluation, guidance, and lifestyle/diet recommendations."
    )
    prescribed_medications: List[MedicationItem] = Field(
        default_factory=list,
        description="Structured list of medications prescribed by the doctor during the consultation."
    )
    follow_up_instructions: str = Field(
        description="Scheduled follow-up period, tests requested, or when the patient should re-consult."
    )
    red_flags_and_warnings: str = Field(
        description="Emergency symptoms or critical alert signs requiring immediate emergency room attention."
    )

class ClinicalSummaryResponse(BaseModel):
    id: str
    meeting_id: str
    chief_complaint: Optional[str] = None
    clinical_observations: Optional[str] = None
    doctor_advice: Optional[str] = None
    prescribed_medications: Optional[List[Dict[str, Any]]] = None
    follow_up_instructions: Optional[str] = None
    red_flags_and_warnings: Optional[str] = None
    ai_model_used: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Appointment Schemas -----------------
class CreateAppointmentRequest(BaseModel):
    doctor_id: str
    scheduled_time: str
    reason: str

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    patient_name: str
    doctor_name: str
    doctor_specialty: Optional[str] = None
    scheduled_time: str
    reason: str
    room_code: str
    status: str
    created_at: datetime
    has_summary: bool = False

    class Config:
        from_attributes = True

