import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket
from sqlalchemy.orm import Session
from .models import TranscriptRecord, MeetingRoom, MeetingStatus
from .database import SessionLocal

logger = logging.getLogger("websocket_manager")

class MeetingRoomManager:
    def __init__(self):
        # room_code -> list of active WebSocket connections
        self.rooms: Dict[str, List[WebSocket]] = {}
        # websocket -> participant info dict {user_id, name, role}
        self.participants: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, room_code: str, websocket: WebSocket, user_info: Dict[str, Any]):
        await websocket.accept()
        if room_code not in self.rooms:
            self.rooms[room_code] = []
        self.rooms[room_code].append(websocket)
        self.participants[websocket] = user_info

        # Auto-ensure meeting room exists in database
        try:
            with SessionLocal() as db:
                meeting = db.query(MeetingRoom).filter(MeetingRoom.room_code == room_code).first()
                if not meeting:
                    meeting = MeetingRoom(
                        room_code=room_code,
                        title=f"Consultation Room ({room_code})",
                        status=MeetingStatus.LIVE
                    )
                    db.add(meeting)
                    db.commit()
        except Exception as e:
            logger.warning(f"Could not check/create room in DB: {e}")


        # Broadcast participant-joined event
        await self.broadcast(
            room_code,
            {
                "type": "participant-joined",
                "participant": user_info,
                "participants": self.get_room_participants(room_code),
            },
            exclude=websocket
        )

        # Send current participants to the newly joined user
        await websocket.send_text(json.dumps({
            "type": "room-state",
            "participants": self.get_room_participants(room_code)
        }))

    async def disconnect(self, room_code: str, websocket: WebSocket):
        if room_code in self.rooms and websocket in self.rooms[room_code]:
            self.rooms[room_code].remove(websocket)
            user_info = self.participants.pop(websocket, None)

            if user_info:
                await self.broadcast(
                    room_code,
                    {
                        "type": "participant-left",
                        "participant": user_info,
                        "participants": self.get_room_participants(room_code)
                    }
                )

            if room_code in self.rooms and not self.rooms[room_code]:
                del self.rooms[room_code]

    def get_room_participants(self, room_code: str) -> List[Dict[str, Any]]:
        if room_code not in self.rooms:
            return []
        return [self.participants[ws] for ws in self.rooms[room_code] if ws in self.participants]

    async def broadcast(self, room_code: str, message: dict, exclude: WebSocket = None):
        if room_code not in self.rooms:
            return
        payload = json.dumps(message)
        for connection in self.rooms[room_code]:
            if connection != exclude:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Error broadcasting to connection in room {room_code}: {e}")

    async def handle_message(self, room_code: str, websocket: WebSocket, data: dict):
        msg_type = data.get("type")

        # 1. WebRTC Signaling: offer, answer, ice-candidate
        if msg_type in ["offer", "answer", "ice-candidate", "ready-for-call"]:
            await self.broadcast(room_code, data, exclude=websocket)

        # 2. In-Call Chat Messages
        elif msg_type == "chat":
            user_info = self.participants.get(websocket, {})
            chat_payload = {
                "type": "chat",
                "sender_id": user_info.get("id"),
                "sender_name": user_info.get("name", "Participant"),
                "sender_role": user_info.get("role", "GUEST"),
                "text": data.get("text", ""),
                "timestamp": data.get("timestamp")
            }
            # Broadcast to all participants including sender
            await self.broadcast(room_code, chat_payload)

        # 3. Live Spoken Transcript Chunks (Broadcast live captions & save to DB)
        elif msg_type == "transcript-chunk":
            user_info = self.participants.get(websocket, {})
            speaker_name = data.get("speaker_name") or user_info.get("name", "Speaker")
            speaker_role = data.get("speaker_role") or user_info.get("role", "PATIENT")
            text = (data.get("text") or "").strip()

            if text:
                # Broadcast live captions to all participants in the room
                await self.broadcast(room_code, {
                    "type": "live-caption",
                    "speaker_name": speaker_name,
                    "speaker_role": speaker_role,
                    "text": text
                })

                # Persist to database asynchronously
                try:
                    with SessionLocal() as db:
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

                        record = TranscriptRecord(
                            meeting_id=meeting.id,
                            speaker_id=user_info.get("id"),
                            speaker_name=speaker_name,
                            speaker_role=speaker_role,
                            text=text
                        )
                        db.add(record)
                        db.commit()
                except Exception as e:
                    logger.error(f"Failed to persist transcript chunk: {e}")

room_manager = MeetingRoomManager()
