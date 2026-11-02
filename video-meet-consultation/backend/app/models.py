import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Integer
from sqlalchemy.orm import relationship
from .database import Base

class UserRole(str):
    DOCTOR = "DOCTOR"
    PATIENT = "PATIENT"

class MeetingStatus(str):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    ENDED = "ENDED"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PATIENT)
    specialty = Column(String(255), nullable=True)  # e.g., "Internal Medicine"
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    doctor_meetings = relationship("MeetingRoom", foreign_keys="MeetingRoom.doctor_id", back_populates="doctor")
    patient_meetings = relationship("MeetingRoom", foreign_keys="MeetingRoom.patient_id", back_populates="patient")

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_code = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, default="Telehealth Video Consultation")
    doctor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), nullable=False, default=MeetingStatus.SCHEDULED)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_meetings")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_meetings")
    transcripts = relationship("TranscriptRecord", back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptRecord.timestamp")
    summary = relationship("ClinicalSummary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")

class TranscriptRecord(Base):
    __tablename__ = "transcript_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String(36), ForeignKey("meeting_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_id = Column(String(36), nullable=True)
    speaker_name = Column(String(255), nullable=False)
    speaker_role = Column(String(50), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    meeting = relationship("MeetingRoom", back_populates="transcripts")

class ClinicalSummary(Base):
    __tablename__ = "clinical_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meeting_rooms.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    chief_complaint = Column(Text, nullable=True)
    clinical_observations = Column(Text, nullable=True)
    doctor_advice = Column(Text, nullable=True)
    prescribed_medications = Column(JSON, nullable=True)  # List of objects: [{name, dosage, frequency, instructions}]
    follow_up_instructions = Column(Text, nullable=True)
    red_flags_and_warnings = Column(Text, nullable=True)
    raw_summary_json = Column(JSON, nullable=True)
    ai_model_used = Column(String(100), nullable=False, default="LangChain-NLP")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    meeting = relationship("MeetingRoom", back_populates="summary")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    scheduled_time = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    room_code = Column(String(64), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="CONFIRMED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

