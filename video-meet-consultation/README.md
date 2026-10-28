# TeleMeet: Zoom/Google Meet Style Video Consultation with LangChain Clinical Scribe

A standalone, production-ready telehealth video consultation application featuring a Google Meet / Zoom style user interface, real-time WebRTC media, live continuous speech transcription, and a **LangChain AI clinical summarization pipeline** backed by PostgreSQL in Docker.

Designed as an independent, modular application in `/Users/yug_gabani/Desktop/SE_Project/video-meet-consultation` that can be tested on its own and seamlessly integrated into your main healthcare portal in the future.

---

## 1. Architecture & Technology Stack

| Layer | Technology | Rationale & Why This Was Chosen |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Blazing-fast development server, strong type-safety, and responsive UI components. |
| **Video Engine** | Native WebRTC (`RTCPeerConnection`) | Low-latency peer-to-peer audio/video streaming, camera toggle, microphone muting, and screen sharing via `getDisplayMedia`. |
| **Live Speech-to-Text** | Web Speech API (`SpeechRecognition`) | Native browser continuous speech-to-text listener with auto-restart, producing real-time closed-captions and transcript streams with zero latency. |
| **Backend API** | Python FastAPI (`FastAPI`, `Uvicorn`) | High-performance asynchronous REST and WebSocket server for WebRTC signaling and LangChain execution. |
| **AI Scribe Pipeline** | LangChain (`langchain`, `ChatGoogleGenerativeAI`, `ChatOpenAI`) | Orchestrates prompt templates and strict `PydanticOutputParser` schemas to extract clinical diagnoses, prescriptions, and warnings from the dialogue transcript. |
| **Database** | PostgreSQL 16 (in Docker) | ACID-compliant relational storage for user accounts, consultation sessions, dialogue transcripts, and AI clinical summaries. |

---

## 2. Key Features

### 🎥 Zoom & Google Meet Style Video Experience
- **Video Grid & Active Speaker Focus**: Responsive grid layout with active speaker highlighting.
- **Floating Controls Dock**: Mute/Unmute microphone with status LED, Camera on/off, Screen Sharing, Live Closed Captions (`CC`), Participant drawer, and End Call button.
- **In-Call Messaging**: Real-time chat messages broadcast to participants during the call.
- **Meeting Invite Link**: One-click link copying to invite participants directly into any room.

### 🎙️ Real-Time Transcription
- Continuous speech-to-text listens to doctor and patient utterances.
- Displays floating closed captions on-screen in real time (emerald for Doctor, blue for Patient).
- Persists all dialogue chunks into the PostgreSQL `transcript_records` table via WebSocket signaling.
- Includes quick-test dialogue buttons to simulate medical dialogue instantly without requiring a microphone.

### 🧠 LangChain Medical Scribe Pipeline
- Triggered on demand or automatically when the consultation concludes.
- Runs the complete conversation transcript through LangChain:
  1. **Chief Complaint**: The patient's primary symptoms and reason for visit.
  2. **Clinical Observations**: Reported duration, fever, pain, and physical signs.
  3. **Doctor Evaluation & Advice**: Clinical judgment, lifestyle guidance, and diet notes.
  4. **Prescribed Medications**: Structured table with Drug Name, Dosage, Frequency, Duration, and Administration Notes.
  5. **Follow-Up Plan**: When to revisit or which diagnostic tests to perform.
  6. **Red Flags & Emergency Warnings**: Urgent alert signs requiring immediate emergency room care.
- **Universal Provider Support**: Supports Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), and includes a built-in intelligent medical NLP fallback so it works 100% offline out-of-the-box without requiring any paid API key!

---

## 3. Quick Start (1-Click)

### Start Everything:
```bash
cd /Users/yug_gabani/Desktop/SE_Project/video-meet-consultation
./start-app.sh
```

This single command will:
1. Boot PostgreSQL 16 in Docker on port `5433` (avoiding port collisions).
2. Create the Python virtual environment and install dependencies in `backend/venv`.
3. Launch the FastAPI server with LangChain on `http://localhost:8000`.
4. Install npm packages and launch the Vite React frontend on `http://localhost:3000`.

### Stop Everything:
```bash
./stop-app.sh
```

---

## 4. Default Demo Accounts

Ready-to-use seeded accounts with 1-click login buttons on the login screen:

* **Doctor Account:**
  - **Email:** `doctor@telecare.com`
  - **Password:** `Password123!`
  - **Name:** Dr. Sarah Mitchell, MD (Internal Medicine & Telehealth)

* **Patient Account:**
  - **Email:** `patient@telecare.com`
  - **Password:** `Password123!`
  - **Name:** John Doe

---

## 5. Future Integration Guide

To integrate this module into your main healthcare portal (`SE_2`):
1. **Frontend**: The `MeetingRoom.tsx`, `LiveCaptions.tsx`, `TranscriptDrawer.tsx`, and `ClinicalSummaryModal.tsx` components are self-contained and can be imported directly into your existing React dashboard.
2. **Backend**: The `langchain_service.py` and `websocket_manager.py` modules can either run as a microservice on port 8000 (recommended) or be mounted into an existing Python/FastAPI backend.
