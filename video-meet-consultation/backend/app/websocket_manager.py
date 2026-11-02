import json
import logging
import uuid
from datetime import datetime, timezone
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

        # Prune any previous stale connections for the exact same user_id in this room
        current_user_id = user_info.get("id")
        if current_user_id:
            stale_connections = [
                ws for ws in self.rooms[room_code]
                if self.participants.get(ws, {}).get("id") == current_user_id
            ]
            for stale_ws in stale_connections:
                try:
                    await stale_ws.close()
                except Exception:
                    pass
                if stale_ws in self.rooms[room_code]:
                    self.rooms[room_code].remove(stale_ws)
                self.participants.pop(stale_ws, None)

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

        # Broadcast participant-joined event to others
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

            # Check if user has any other active connection in this room
            user_id = user_info.get("id") if user_info else None
            user_still_present = any(
                self.participants.get(ws, {}).get("id") == user_id
                for ws in self.rooms[room_code]
            )

            if user_info and not user_still_present:
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
        seen_ids = set()
        unique_participants = []
        for ws in self.rooms[room_code]:
            info = self.participants.get(ws)
            if info:
                pid = info.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    unique_participants.append(info)
                elif not pid:
                    unique_participants.append(info)
        return unique_participants

    async def broadcast(self, room_code: str, message: dict, exclude: WebSocket = None):
        if room_code not in self.rooms:
            return
        payload = json.dumps(message)
        # Create shallow copy of room connections to avoid mutation errors during loop
        active_connections = list(self.rooms[room_code])
        for connection in active_connections:
            if connection != exclude:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Error broadcasting to connection in room {room_code}: {e}")

    async def handle_message(self, room_code: str, websocket: WebSocket, data: dict):
        msg_type = data.get("type")

        # 1. WebRTC Signaling: offer, answer, ice-candidate, ready-for-call
        if msg_type in ["offer", "answer", "ice-candidate", "ready-for-call"]:
            await self.broadcast(room_code, data, exclude=websocket)

        # 2. In-Call Chat Messages
        elif msg_type == "chat":
            user_info = self.participants.get(websocket, {})
            msg_id = data.get("id") or str(uuid.uuid4())
            timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()
            chat_payload = {
                "type": "chat",
                "id": msg_id,
                "sender_id": user_info.get("id"),
                "sender_name": user_info.get("name", "Participant"),
                "sender_role": user_info.get("role", "GUEST"),
                "text": data.get("text", ""),
                "timestamp": timestamp
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
