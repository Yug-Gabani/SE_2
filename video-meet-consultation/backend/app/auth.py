from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import bcrypt

from .config import settings
from .database import get_db
from .models import User, UserRole

# Cryptographic password hashing using native bcrypt
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def seed_default_users(db: Session):
    """Seed ready-to-test Doctor and Patient accounts and initial shared appointment."""
    from .models import MeetingRoom, MeetingStatus, Appointment

    # 1. Doctor 1: Dr. Sarah Mitchell
    doctor1 = db.query(User).filter(User.email == "doctor@telecare.com").first()
    if not doctor1:
        doctor1 = User(
            email="doctor@telecare.com",
            password_hash=get_password_hash("Password123!"),
            full_name="Dr. Sarah Mitchell, MD",
            role=UserRole.DOCTOR,
            specialty="Internal Medicine & Cardiology",
            avatar_url="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200"
        )
        db.add(doctor1)
        db.commit()
        db.refresh(doctor1)

    # 2. Doctor 2: Dr. Robert Chen
    doctor2 = db.query(User).filter(User.email == "robert.chen@telecare.com").first()
    if not doctor2:
        doctor2 = User(
            email="robert.chen@telecare.com",
            password_hash=get_password_hash("Password123!"),
            full_name="Dr. Robert Chen, MD",
            role=UserRole.DOCTOR,
            specialty="General Physician & Pulmonology",
            avatar_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
        )
        db.add(doctor2)
        db.commit()

    # 3. Doctor 3: Dr. Emily Davis
    doctor3 = db.query(User).filter(User.email == "emily.davis@telecare.com").first()
    if not doctor3:
        doctor3 = User(
            email="emily.davis@telecare.com",
            password_hash=get_password_hash("Password123!"),
            full_name="Dr. Emily Davis, MD",
            role=UserRole.DOCTOR,
            specialty="Pediatrics & Family Medicine",
            avatar_url="https://images.unsplash.com/photo-1594824813591-137bfa0a8b94?auto=format&fit=crop&q=80&w=200"
        )
        db.add(doctor3)
        db.commit()

    # 4. Patient: John Doe
    patient = db.query(User).filter(User.email == "patient@telecare.com").first()
    if not patient:
        patient = User(
            email="patient@telecare.com",
            password_hash=get_password_hash("Password123!"),
            full_name="John Doe",
            role=UserRole.PATIENT,
            specialty=None,
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    # 5. Shared Appointment between John Doe and Dr. Sarah Mitchell
    room_code = "meet-sarah-john-consult"
    existing_app = db.query(Appointment).filter(Appointment.room_code == room_code).first()
    if not existing_app:
        app = Appointment(
            patient_id=patient.id,
            doctor_id=doctor1.id,
            scheduled_time="Today at 5:00 PM",
            reason="Persistent high fever (102°F), dry chest cough, and mild shortness of breath for 3 days.",
            room_code=room_code,
            status="CONFIRMED"
        )
        db.add(app)

        # Ensure meeting room exists
        existing_meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
        if not existing_meeting:
            meeting = MeetingRoom(
                room_code=room_code,
                title="Consultation: Fever & Cough Review",
                doctor_id=doctor1.id,
                patient_id=patient.id,
                status=MeetingStatus.LIVE
            )
            db.add(meeting)

        db.commit()

