import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, get_db
from .models import User, UserRole, MeetingRoom, MeetingStatus, TranscriptRecord, ClinicalSummary, Appointment
from .schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    CreateMeetingRequest, MeetingResponse,
    TranscriptChunkRequest, TranscriptRecordResponse,
    ClinicalSummaryResponse,
    CreateAppointmentRequest, AppointmentResponse
)
from .auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, seed_default_users
)
from .websocket_manager import room_manager
from .langchain_service import langchain_pipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed default doctor and patient
    with get_db().__next__() as db:
        seed_default_users(db)
    yield

app = FastAPI(
    title="TeleMeet Video Consultation API",
    description="Zoom/Meet Style Video Consultation with Real-Time WebRTC, Transcripts & LangChain AI Summaries",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Health & Info -----------------
@app.get("/health")
def health_check():
    llm_info = (
        f"OpenRouter ({settings.OPENROUTER_MODEL})" if settings.OPENROUTER_API_KEY
        else ("Google Gemini" if settings.GOOGLE_API_KEY
        else ("OpenAI" if settings.OPENAI_API_KEY
        else "Intelligent Medical NLP (Offline Engine)"))
    )
    return {
        "status": "UP",
        "service": "TeleMeet Video Consultation & LangChain Pipeline",
        "llm_provider": llm_info,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ----------------- Auth Endpoints -----------------
@app.post("/api/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    new_user = User(
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role.upper(),
        specialty=req.specialty if req.role.upper() == UserRole.DOCTOR else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id, "email": new_user.email, "role": new_user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(new_user))

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    
    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

# ----------------- Doctors & Appointments Endpoints -----------------
@app.get("/api/doctors", response_model=List[UserResponse])
def list_doctors(db: Session = Depends(get_db)):
    doctors = db.query(User).filter(func.upper(User.role) == UserRole.DOCTOR).order_by(User.full_name.asc()).all()
    return [UserResponse.model_validate(d) for d in doctors]

@app.post("/api/appointments", response_model=AppointmentResponse)
def book_appointment(req: CreateAppointmentRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Restrict booking strictly to patients
    if current_user.role.upper() == UserRole.DOCTOR:
        raise HTTPException(
            status_code=400,
            detail="Physicians cannot book appointments as patients. Please use a patient account to schedule an appointment."
        )

    doctor = db.query(User).filter(
        User.id == req.doctor_id,
        func.upper(User.role) == UserRole.DOCTOR
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor was not found.")
    
    room_code = f"meet-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}"

    # Auto-create MeetingRoom in database linked to both doctor and patient
    meeting = MeetingRoom(
        room_code=room_code,
        title=f"Consultation: {doctor.full_name} & {current_user.full_name}",
        doctor_id=doctor.id,
        patient_id=current_user.id,
        status=MeetingStatus.LIVE
    )
    db.add(meeting)

    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        scheduled_time=req.scheduled_time,
        reason=req.reason,
        room_code=room_code,
        status="CONFIRMED"
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return _to_appointment_response(appointment, db)

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def list_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Appointment)
    if current_user.role.upper() == UserRole.DOCTOR:
        query = query.filter(Appointment.doctor_id == current_user.id)
    else:
        query = query.filter(Appointment.patient_id == current_user.id)
    
    appointments = query.order_by(Appointment.created_at.desc()).all()
    return [_to_appointment_response(a, db) for a in appointments]

@app.get("/api/appointments/{appointment_id}/summary", response_model=ClinicalSummaryResponse)
def get_appointment_summary(appointment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check authorization (must be either the doctor or patient)
    if current_user.id != appointment.patient_id and current_user.id != appointment.doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this appointment's clinical summary")
    
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == appointment.room_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting room for this appointment not found")
    
    summary = db.query(ClinicalSummary).filter(ClinicalSummary.meeting_id == meeting.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="No clinical summary has been generated for this appointment yet.")
    
    return ClinicalSummaryResponse(
        id=summary.id,
        meeting_id=summary.meeting_id,
        chief_complaint=summary.chief_complaint,
        clinical_observations=summary.clinical_observations,
        doctor_advice=summary.doctor_advice,
        prescribed_medications=summary.prescribed_medications,
        follow_up_instructions=summary.follow_up_instructions,
        red_flags_and_warnings=summary.red_flags_and_warnings,
        ai_model_used=summary.ai_model_used,
        created_at=summary.created_at
    )


# ----------------- Meeting Endpoints -----------------
@app.post("/api/meetings", response_model=MeetingResponse)
def create_meeting(req: CreateMeetingRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room_code = f"meet-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}"
    doctor_id = current_user.id if current_user.role == UserRole.DOCTOR else None
    patient_id = req.patient_id or (current_user.id if current_user.role == UserRole.PATIENT else None)

    meeting = MeetingRoom(
        room_code=room_code,
        title=req.title,
        doctor_id=doctor_id,
        patient_id=patient_id,
        status=MeetingStatus.LIVE,
        started_at=datetime.now(timezone.utc)
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return _to_meeting_response(meeting, db)

@app.get("/api/meetings", response_model=List[MeetingResponse])
def list_meetings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(MeetingRoom)
    if current_user.role == UserRole.DOCTOR:
        query = query.filter((MeetingRoom.doctor_id == current_user.id) | (MeetingRoom.doctor_id == None))
    else:
        query = query.filter((MeetingRoom.patient_id == current_user.id) | (MeetingRoom.patient_id == None))
    
    meetings = query.order_by(MeetingRoom.created_at.desc()).limit(25).all()
    return [_to_meeting_response(m, db) for m in meetings]

@app.get("/api/meetings/{room_code}", response_model=MeetingResponse)
def get_meeting(room_code: str, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        # Auto-create if testing with a custom code
        meeting = MeetingRoom(
            room_code=room_code,
            title="Telehealth Consultation Room",
            status=MeetingStatus.LIVE,
            started_at=datetime.now(timezone.utc)
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

    return _to_meeting_response(meeting, db)

@app.post("/api/meetings/{room_code}/end", response_model=MeetingResponse)
async def end_meeting(room_code: str, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting room not found")
    
    meeting.status = MeetingStatus.ENDED
    meeting.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)

    # Broadcast meeting-ended event to active WebSockets
    await room_manager.broadcast(room_code, {"type": "meeting-ended"})

    return _to_meeting_response(meeting, db)

# ----------------- Transcript Endpoints -----------------
@app.get("/api/meetings/{room_code}/transcripts", response_model=List[TranscriptRecordResponse])
def get_transcripts(room_code: str, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcripts = db.query(TranscriptRecord).filter(
        TranscriptRecord.meeting_id == meeting.id
    ).order_by(TranscriptRecord.timestamp.asc()).all()

    return [TranscriptRecordResponse.model_validate(t) for t in transcripts]

@app.post("/api/meetings/{room_code}/transcripts", response_model=TranscriptRecordResponse)
def append_transcript(room_code: str, req: TranscriptChunkRequest, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    record = TranscriptRecord(
        meeting_id=meeting.id,
        speaker_name=req.speaker_name,
        speaker_role=req.speaker_role.upper(),
        text=req.text
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return TranscriptRecordResponse.model_validate(record)

# ----------------- LangChain Clinical Summary Endpoints -----------------
@app.post("/api/meetings/{room_code}/generate-summary", response_model=ClinicalSummaryResponse)
async def generate_summary(room_code: str, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        meeting = MeetingRoom(
            room_code=room_code,
            title=f"Consultation Room ({room_code})",
            status=MeetingStatus.LIVE
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

    transcripts = db.query(TranscriptRecord).filter(
        TranscriptRecord.meeting_id == meeting.id
    ).order_by(TranscriptRecord.timestamp.asc()).all()

    # Find appointment reason if available for context
    appointment = db.query(Appointment).filter(Appointment.room_code == room_code).first()
    context_notes = appointment.reason if appointment else ""

    # Execute LangChain Pipeline with OpenRouter
    summary_schema, model_used = langchain_pipeline.process_transcript(transcripts, context_notes=context_notes)

    # Check if a summary already exists
    summary = db.query(ClinicalSummary).filter(ClinicalSummary.meeting_id == meeting.id).first()
    if not summary:
        summary = ClinicalSummary(meeting_id=meeting.id)
        db.add(summary)

    summary.chief_complaint = summary_schema.chief_complaint
    summary.clinical_observations = summary_schema.clinical_observations
    summary.doctor_advice = summary_schema.doctor_advice
    summary.prescribed_medications = [m.model_dump() for m in summary_schema.prescribed_medications]
    summary.follow_up_instructions = summary_schema.follow_up_instructions
    summary.red_flags_and_warnings = summary_schema.red_flags_and_warnings
    summary.raw_summary_json = summary_schema.model_dump()
    summary.ai_model_used = model_used

    db.commit()
    db.refresh(summary)

    # Broadcast summary-ready event to room
    await room_manager.broadcast(room_code, {
        "type": "summary-ready",
        "summary": summary_schema.model_dump()
    })

    return ClinicalSummaryResponse(
        id=summary.id,
        meeting_id=summary.meeting_id,
        chief_complaint=summary.chief_complaint,
        clinical_observations=summary.clinical_observations,
        doctor_advice=summary.doctor_advice,
        prescribed_medications=summary.prescribed_medications,
        follow_up_instructions=summary.follow_up_instructions,
        red_flags_and_warnings=summary.red_flags_and_warnings,
        ai_model_used=summary.ai_model_used,
        created_at=summary.created_at
    )

@app.get("/api/meetings/{room_code}/summary", response_model=ClinicalSummaryResponse)
def get_summary(room_code: str, db: Session = Depends(get_db)):
    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary = db.query(ClinicalSummary).filter(ClinicalSummary.meeting_id == meeting.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="No clinical summary has been generated for this meeting yet.")

    return ClinicalSummaryResponse(
        id=summary.id,
        meeting_id=summary.meeting_id,
        chief_complaint=summary.chief_complaint,
        clinical_observations=summary.clinical_observations,
        doctor_advice=summary.doctor_advice,
        prescribed_medications=summary.prescribed_medications,
        follow_up_instructions=summary.follow_up_instructions,
        red_flags_and_warnings=summary.red_flags_and_warnings,
        ai_model_used=summary.ai_model_used,
        created_at=summary.created_at
    )

# ----------------- WebSocket Real-Time Endpoint -----------------
@app.websocket("/ws/meeting/{room_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    user_name: str = Query("Participant"),
    user_role: str = Query("PATIENT"),
    user_id: str = Query("")
):
    user_info = {
        "id": user_id or str(uuid.uuid4())[:8],
        "name": user_name,
        "role": user_role.upper()
    }
    await room_manager.connect(room_code, websocket, user_info)
    try:
        while True:
            raw_text = await websocket.receive_text()
            import json
            try:
                data = json.loads(raw_text)
                await room_manager.handle_message(room_code, websocket, data)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await room_manager.disconnect(room_code, websocket)

# ----------------- Helper Functions -----------------
def _to_meeting_response(m: MeetingRoom, db: Session) -> MeetingResponse:
    doctor_name = None
    patient_name = None
    if m.doctor_id:
        doc = db.query(User).filter(User.id == m.doctor_id).first()
        if doc:
            doctor_name = doc.full_name
    if m.patient_id:
        pat = db.query(User).filter(User.id == m.patient_id).first()
        if pat:
            patient_name = pat.full_name

    has_summary = db.query(ClinicalSummary).filter(ClinicalSummary.meeting_id == m.id).first() is not None

    return MeetingResponse(
        id=m.id,
        room_code=m.room_code,
        title=m.title,
        doctor_id=m.doctor_id,
        patient_id=m.patient_id,
        doctor_name=doctor_name,
        patient_name=patient_name,
        status=m.status,
        started_at=m.started_at,
        ended_at=m.ended_at,
        created_at=m.created_at,
        has_summary=has_summary
    )

def _to_appointment_response(a: Appointment, db: Session) -> AppointmentResponse:
    doctor = db.query(User).filter(User.id == a.doctor_id).first()
    patient = db.query(User).filter(User.id == a.patient_id).first()

    meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == a.room_code).first()
    has_summary = False
    if meeting:
        has_summary = db.query(ClinicalSummary).filter(ClinicalSummary.meeting_id == meeting.id).first() is not None

    return AppointmentResponse(
        id=a.id,
        patient_id=a.patient_id,
        doctor_id=a.doctor_id,
        patient_name=patient.full_name if patient else "Patient",
        doctor_name=doctor.full_name if doctor else "Doctor",
        doctor_specialty=doctor.specialty if doctor else None,
        scheduled_time=a.scheduled_time,
        reason=a.reason,
        room_code=a.room_code,
        status=a.status,
        created_at=a.created_at,
        has_summary=has_summary
    )

