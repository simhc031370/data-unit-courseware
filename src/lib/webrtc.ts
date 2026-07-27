"use client";

type SignalPayload = {
  type: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class TeacherScreenShare {
  private stream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private sendSignal: (targetId: string, data: SignalPayload) => void;

  constructor(sendSignal: (targetId: string, data: SignalPayload) => void) {
    this.sendSignal = sendSignal;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    this.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.stop();
    });
    return this.stream;
  }

  async connectStudent(studentSocketId: string) {
    if (!this.stream) return;
    this.closePeer(studentSocketId);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(studentSocketId, pc);

    for (const track of this.stream.getTracks()) {
      pc.addTrack(track, this.stream);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(studentSocketId, {
          type: "ice",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal(studentSocketId, { type: "offer", sdp: offer });
  }

  async handleSignal(fromId: string, data: SignalPayload) {
    const pc = this.peers.get(fromId);
    if (!pc) return;
    if (data.type === "answer" && data.sdp) {
      await pc.setRemoteDescription(data.sdp);
    } else if (data.type === "ice" && data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {
        /* ignore late candidates */
      }
    }
  }

  async connectAll(studentSocketIds: string[]) {
    await Promise.all(studentSocketIds.map((id) => this.connectStudent(id)));
  }

  closePeer(id: string) {
    const pc = this.peers.get(id);
    if (pc) {
      pc.close();
      this.peers.delete(id);
    }
  }

  stop() {
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  get active() {
    return Boolean(this.stream);
  }
}

export class StudentScreenViewer {
  private pc: RTCPeerConnection | null = null;
  private sendSignal: (targetId: string, data: SignalPayload) => void;
  private onStream: (stream: MediaStream | null) => void;

  constructor(
    sendSignal: (targetId: string, data: SignalPayload) => void,
    onStream: (stream: MediaStream | null) => void,
  ) {
    this.sendSignal = sendSignal;
    this.onStream = onStream;
  }

  async handleSignal(fromId: string, data: SignalPayload) {
    if (data.type === "offer" && data.sdp) {
      this.close();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      this.pc = pc;

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        this.onStream(stream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(fromId, {
            type: "ice",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal(fromId, { type: "answer", sdp: answer });
    } else if (data.type === "ice" && data.candidate && this.pc) {
      try {
        await this.pc.addIceCandidate(data.candidate);
      } catch {
        /* ignore */
      }
    }
  }

  close() {
    this.pc?.close();
    this.pc = null;
    this.onStream(null);
  }
}
