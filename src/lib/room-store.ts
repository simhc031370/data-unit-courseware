import type { RoomState, StudentState } from "./types";

export type SignalMessage = {
  id: string;
  fromId: string;
  targetId: string;
  data: unknown;
  createdAt: number;
};

export type RoomRecord = {
  code: string;
  teacherToken: string;
  teacherPage: string;
  focusMode: boolean;
  teacherConnected: boolean;
  teacherLastSeen: number;
  students: Record<string, StudentState & { peerId: string }>;
  signals: SignalMessage[];
  handAlerts: { name: string; at: number }[];
};

type Store = {
  rooms: Map<string, RoomRecord>;
};

function getStore(): Store {
  const g = globalThis as typeof globalThis & { __dataRoomStore?: Store };
  if (!g.__dataRoomStore) {
    g.__dataRoomStore = { rooms: new Map() };
  }
  return g.__dataRoomStore;
}

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (getStore().rooms.has(code)) return createCode();
  return code;
}

function createToken() {
  return `t_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function snapshot(room: RoomRecord): RoomState {
  return {
    code: room.code,
    focusMode: room.focusMode,
    teacherPage: room.teacherPage,
    teacherConnected:
      room.teacherConnected && Date.now() - room.teacherLastSeen < 12000,
    students: Object.values(room.students).map((s) => ({
      id: s.id,
      name: s.name,
      currentPage: s.currentPage,
      handRaised: s.handRaised,
      connected: s.connected && Date.now() - s.lastSeen < 12000,
      lastSeen: s.lastSeen,
    })),
  };
}

export function createRoom(page = "intro") {
  const code = createCode();
  const teacherToken = createToken();
  const room: RoomRecord = {
    code,
    teacherToken,
    teacherPage: page,
    focusMode: false,
    teacherConnected: true,
    teacherLastSeen: Date.now(),
    students: {},
    signals: [],
    handAlerts: [],
  };
  getStore().rooms.set(code, room);
  return { room, teacherToken };
}

export function getRoom(code: string) {
  return getStore().rooms.get(code.toUpperCase()) || null;
}

export function touchTeacher(room: RoomRecord) {
  room.teacherConnected = true;
  room.teacherLastSeen = Date.now();
}

export function joinStudent(
  room: RoomRecord,
  name: string,
  studentId?: string,
) {
  const id = studentId || `s_${Math.random().toString(36).slice(2, 10)}`;
  const peerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  const existing = Object.values(room.students).find((s) => s.id === id);
  room.students[id] = {
    id,
    peerId,
    name: name.trim().slice(0, 20),
    currentPage: existing?.currentPage || room.teacherPage || "intro",
    handRaised: existing?.handRaised || false,
    connected: true,
    lastSeen: Date.now(),
  };
  return room.students[id];
}

export function pruneSignals(room: RoomRecord) {
  const cutoff = Date.now() - 30000;
  room.signals = room.signals.filter((s) => s.createdAt >= cutoff);
  room.handAlerts = room.handAlerts.filter((a) => a.at >= Date.now() - 8000);
}

export function pushSignal(
  room: RoomRecord,
  fromId: string,
  targetId: string,
  data: unknown,
) {
  pruneSignals(room);
  room.signals.push({
    id: `sig_${Math.random().toString(36).slice(2)}`,
    fromId,
    targetId,
    data,
    createdAt: Date.now(),
  });
}
