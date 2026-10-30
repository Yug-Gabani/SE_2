/**
 * WebRTC Peer Connection Manager for TeleMeet Video Consulting.
 * Implements the W3C Perfect Negotiation Pattern for glare-free, reliable bi-directional
 * audio/video streaming, screen sharing, STUN connectivity, and ICE handling.
 */

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export type ConnectionStateCallback = (state: RTCPeerConnectionState) => void;

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onSignalCallback: ((signal: any) => void) | null = null;
  private onConnectionStateCallback: ConnectionStateCallback | null = null;

  // Perfect Negotiation State
  private isPolite: boolean = true;
  private makingOffer: boolean = false;
  private ignoreOffer: boolean = false;
  private mediaInitPromise: Promise<MediaStream> | null = null;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];

  constructor(
    onRemoteStream: (stream: MediaStream) => void,
    onSignal: (signal: any) => void,
    isPolite: boolean = true,
    onConnectionState?: ConnectionStateCallback
  ) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onSignalCallback = onSignal;
    this.isPolite = isPolite;
    this.onConnectionStateCallback = onConnectionState || null;
  }

  public setPolite(polite: boolean): void {
    this.isPolite = polite;
  }

  /**
   * Acquire local camera and microphone with resilient fallbacks.
   */
  public async getLocalMedia(video = true, audio = true): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    this.mediaInitPromise = (async () => {
      try {
        // Attempt full video + audio
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        });
      } catch (err) {
        console.warn('Initial camera/mic acquisition failed, attempting audio-only fallback:', err);
        try {
          // Fallback: Audio-only
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audio ? { echoCancellation: true, noiseSuppression: true } : true,
          });
          // Synthesize a visual canvas track so video pipeline still works
          const canvasTrack = this.createSyntheticVideoTrack('Audio Call Active');
          if (canvasTrack) {
            this.localStream.addTrack(canvasTrack);
          }
        } catch (audioErr) {
          console.warn('Microphone access also unavailable. Using simulated canvas/audio fallback:', audioErr);
          const canvasTrack = this.createSyntheticVideoTrack('Camera Unavailable');
          this.localStream = new MediaStream();
          if (canvasTrack) {
            this.localStream.addTrack(canvasTrack);
          }
        }
      }

      this.attachLocalTracks();
      return this.localStream;
    })();

    return this.mediaInitPromise;
  }

  private createSyntheticVideoTrack(label: string): MediaStreamTrack | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#10b981';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 320, 240);
      }
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
      return stream ? stream.getVideoTracks()[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Attaches all tracks of localStream to the RTCPeerConnection senders without duplicates.
   */
  public attachLocalTracks(): void {
    if (!this.pc || !this.localStream) return;

    const currentSenders = this.pc.getSenders();
    this.localStream.getTracks().forEach((track) => {
      const existingSender = currentSenders.find((s) => s.track && s.track.kind === track.kind);
      if (existingSender) {
        if (existingSender.track?.id !== track.id) {
          existingSender.replaceTrack(track).catch((err) => console.warn('replaceTrack error:', err));
        }
      } else {
        try {
          this.pc?.addTrack(track, this.localStream!);
        } catch (e) {
          console.warn('Could not add track to PC:', e);
        }
      }
    });
  }

  /**
   * Initializes or returns existing RTCPeerConnection with listeners.
   */
  public createPeerConnection(): RTCPeerConnection {
    if (this.pc && this.pc.signalingState !== 'closed') {
      this.attachLocalTracks();
      return this.pc;
    }

    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();

    // Attach local tracks if already available
    this.attachLocalTracks();

    // Remote Track Listener
    this.pc.ontrack = (event) => {
      if (event.track) {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream.addTrack(track);
          }
        });
      }
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // ICE Candidate Generation
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onSignalCallback) {
        this.onSignalCallback({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    // Connection State Change
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState || 'new';
      console.log(`[WebRTC] Connection state changed: ${state}`);
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(state);
      }
      if (state === 'failed') {
        console.warn('[WebRTC] Connection failed, attempting ICE restart...');
        this.restartIce();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state: ${this.pc?.iceConnectionState}`);
    };

    return this.pc;
  }

  /**
   * Creates and dispatches an Offer (initiated by caller or on participant join).
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) this.createPeerConnection();

    // Await local media if still loading
    if (this.mediaInitPromise) {
      await this.mediaInitPromise;
    }
    this.attachLocalTracks();

    try {
      this.makingOffer = true;
      const offer = await this.pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      // Avoid setting if closed or wrong state
      if (this.pc!.signalingState !== 'stable') {
        return null;
      }

      await this.pc!.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
      return null;
    } finally {
      this.makingOffer = false;
    }
  }

  /**
   * Handles an incoming Offer adhering to the Perfect Negotiation Pattern.
   */
  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) this.createPeerConnection();

    // Ensure our local media is ready so answer includes our senders
    if (this.mediaInitPromise) {
      await this.mediaInitPromise;
    }
    this.attachLocalTracks();

    // Check for glare / offer collision
    const offerCollision = this.makingOffer || (this.pc && this.pc.signalingState !== 'stable');
    this.ignoreOffer = !this.isPolite && !!offerCollision;

    if (this.ignoreOffer) {
      console.log('[WebRTC] Glare detected: Impolite peer ignoring incoming offer.');
      return null;
    }

    if (offerCollision && this.pc) {
      console.log('[WebRTC] Glare detected: Polite peer rolling back local offer to accept remote offer.');
      try {
        await this.pc.setLocalDescription({ type: 'rollback' });
      } catch (e) {
        console.warn('[WebRTC] Rollback error:', e);
      }
    }

    try {
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
      await this.drainIceQueue();

      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error('[WebRTC] Error handling offer:', err);
      return null;
    }
  }

  /**
   * Handles an incoming Answer.
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;

    try {
      if (this.pc.signalingState === 'have-local-offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.drainIceQueue();
      } else {
        console.log(`[WebRTC] Ignoring answer in signaling state: ${this.pc.signalingState}`);
      }
    } catch (err) {
      console.error('[WebRTC] Error handling answer:', err);
    }
  }

  /**
   * Handles an incoming ICE candidate with filtering and buffering.
   */
  public async handleIceCandidate(candidate: RTCIceCandidateInit | null): Promise<void> {
    if (!candidate || !candidate.candidate) {
      return; // Ignore end-of-candidate markers
    }

    if (this.pc && this.pc.remoteDescription && this.pc.remoteDescription.type) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        if (!this.ignoreOffer) {
          console.warn('[WebRTC] Error adding received ICE candidate:', e);
        }
      }
    } else {
      this.iceCandidatesQueue.push(candidate);
    }
  }

  /**
   * Drains queued ICE candidates once remote description is set.
   */
  private async drainIceQueue(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;

    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate && candidate.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Error draining queued ICE candidate:', e);
        }
      }
    }
  }

  /**
   * Attempts an ICE restart on connection failure.
   */
  public async restartIce(): Promise<void> {
    if (!this.pc || this.pc.signalingState === 'closed') return;
    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      if (this.onSignalCallback) {
        this.onSignalCallback(offer);
      }
    } catch (e) {
      console.warn('[WebRTC] Error during ICE restart:', e);
    }
  }

  public toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (this.pc) {
        const senders = this.pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
      return null;
    }
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    // Revert to camera track
    if (this.localStream && this.pc) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      const videoSender = this.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
    }
  }

  public isReady(): boolean {
    return !!this.localStream;
  }

  public cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.iceCandidatesQueue = [];
  }
}
