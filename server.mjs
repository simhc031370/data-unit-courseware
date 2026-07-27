import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** @typedef {{ id: string, name: string, currentPage: string, handRaised: boolean, connected: boolean, lastSeen: number }} Student */
/** @typedef {{ code: string, teacherSocketId: string | null, focusMode: boolean, teacherPage: string, students: Map<string, Student> }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (rooms.has(code)) return createRoomCode();
  return code;
}

function publicStudent(student) {
  return {
    id: student.id,
    name: student.name,
    currentPage: student.currentPage,
    handRaised: student.handRaised,
    connected: student.connected,
    lastSeen: student.lastSeen,
  };
}

function roomSnapshot(room) {
  return {
    code: room.code,
    focusMode: room.focusMode,
    teacherPage: room.teacherPage,
    teacherConnected: Boolean(room.teacherSocketId),
    students: Array.from(room.students.values()).map(publicStudent),
  };
}

function emitRoom(io, room) {
  io.to(room.code).emit("room:state", roomSnapshot(room));
}

await app.prepare();

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
  path: "/socket.io",
});

io.on("connection", (socket) => {
  /** @type {{ role: 'teacher' | 'student' | null, roomCode: string | null, studentId: string | null }} */
  socket.data.meta = { role: null, roomCode: null, studentId: null };

  socket.on("teacher:create", (payload, ack) => {
    const code = createRoomCode();
    const room = {
      code,
      teacherSocketId: socket.id,
      focusMode: false,
      teacherPage: payload?.page || "intro",
      students: new Map(),
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.meta = { role: "teacher", roomCode: code, studentId: null };
    if (typeof ack === "function") ack({ ok: true, room: roomSnapshot(room) });
    emitRoom(io, room);
  });

  socket.on("teacher:rejoin", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      if (typeof ack === "function") ack({ ok: false, error: "수업을 찾을 수 없습니다." });
      return;
    }
    room.teacherSocketId = socket.id;
    socket.join(code);
    socket.data.meta = { role: "teacher", roomCode: code, studentId: null };
    if (typeof ack === "function") ack({ ok: true, room: roomSnapshot(room) });
    emitRoom(io, room);
  });

  socket.on("student:join", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase();
    const name = String(payload?.name || "").trim().slice(0, 20);
    const room = rooms.get(code);
    if (!room) {
      if (typeof ack === "function") ack({ ok: false, error: "수업 코드가 올바르지 않습니다." });
      return;
    }
    if (!name) {
      if (typeof ack === "function") ack({ ok: false, error: "이름을 입력해 주세요." });
      return;
    }

    const studentId = payload?.studentId || `s_${Math.random().toString(36).slice(2, 10)}`;
    const existing = [...room.students.values()].find((s) => s.id === studentId);
    const student = {
      id: studentId,
      name,
      currentPage: existing?.currentPage || room.teacherPage || "intro",
      handRaised: existing?.handRaised || false,
      connected: true,
      lastSeen: Date.now(),
    };

    // Remove stale socket entries with same student id
    for (const [sid, s] of room.students.entries()) {
      if (s.id === studentId) room.students.delete(sid);
    }
    room.students.set(socket.id, student);
    socket.join(code);
    socket.data.meta = { role: "student", roomCode: code, studentId };

    if (typeof ack === "function") {
      ack({
        ok: true,
        studentId,
        room: roomSnapshot(room),
      });
    }
    emitRoom(io, room);

    if (room.focusMode && room.teacherSocketId) {
      io.to(room.teacherSocketId).emit("webrtc:need-offer", { studentSocketId: socket.id });
    }
  });

  socket.on("presence:page", (payload) => {
    const { roomCode, role } = socket.data.meta;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    const page = String(payload?.page || "intro");

    if (role === "teacher") {
      room.teacherPage = page;
      if (room.focusMode) {
        for (const student of room.students.values()) {
          student.currentPage = page;
        }
        io.to(roomCode).emit("focus:force-page", { page });
      }
      emitRoom(io, room);
      return;
    }

    if (role === "student") {
      if (room.focusMode) {
        socket.emit("focus:force-page", { page: room.teacherPage });
        return;
      }
      const student = room.students.get(socket.id);
      if (!student) return;
      student.currentPage = page;
      student.lastSeen = Date.now();
      emitRoom(io, room);
    }
  });

  socket.on("student:hand", (payload) => {
    const { roomCode, role } = socket.data.meta;
    if (role !== "student" || !roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    const student = room.students.get(socket.id);
    if (!student) return;
    student.handRaised = Boolean(payload?.raised);
    student.lastSeen = Date.now();
    emitRoom(io, room);
    if (student.handRaised && room.teacherSocketId) {
      io.to(room.teacherSocketId).emit("student:hand-alert", {
        studentId: student.id,
        name: student.name,
      });
    }
  });

  socket.on("teacher:dismiss-hand", (payload) => {
    const { roomCode, role } = socket.data.meta;
    if (role !== "teacher" || !roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    const studentId = payload?.studentId;
    for (const student of room.students.values()) {
      if (!studentId || student.id === studentId) {
        student.handRaised = false;
      }
    }
    emitRoom(io, room);
  });

  socket.on("teacher:focus", async (payload, ack) => {
    const { roomCode, role } = socket.data.meta;
    if (role !== "teacher" || !roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    const enabled = Boolean(payload?.enabled);
    room.focusMode = enabled;
    if (enabled) {
      for (const student of room.students.values()) {
        student.currentPage = room.teacherPage;
      }
      io.to(roomCode).emit("focus:force-page", { page: room.teacherPage });
      const studentSocketIds = [...room.students.entries()]
        .filter(([, s]) => s.connected)
        .map(([sid]) => sid);
      socket.emit("focus:peer-list", { studentSocketIds });
    }
    io.to(roomCode).emit("focus:changed", { enabled, page: room.teacherPage });
    emitRoom(io, room);
    if (typeof ack === "function") ack({ ok: true, focusMode: enabled });
  });

  socket.on("teacher:focus-peers", () => {
    const { roomCode, role } = socket.data.meta;
    if (role !== "teacher" || !roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || !room.focusMode) return;
    const studentSocketIds = [...room.students.entries()]
      .filter(([, s]) => s.connected)
      .map(([sid]) => sid);
    socket.emit("focus:peer-list", { studentSocketIds });
  });

  socket.on("webrtc:signal", (payload) => {
    const targetId = payload?.targetId;
    if (!targetId) return;
    io.to(targetId).emit("webrtc:signal", {
      fromId: socket.id,
      data: payload?.data,
    });
  });

  socket.on("disconnect", () => {
    const { role, roomCode } = socket.data.meta;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === "teacher" && room.teacherSocketId === socket.id) {
      room.teacherSocketId = null;
      room.focusMode = false;
      io.to(roomCode).emit("focus:changed", { enabled: false, page: room.teacherPage });
      emitRoom(io, room);
      return;
    }

    if (role === "student") {
      const student = room.students.get(socket.id);
      if (student) {
        student.connected = false;
        student.lastSeen = Date.now();
        // Keep for a short while so teacher sees "offline", then remove
        setTimeout(() => {
          const current = rooms.get(roomCode);
          if (!current) return;
          const still = current.students.get(socket.id);
          if (still && !still.connected) {
            current.students.delete(socket.id);
            emitRoom(io, current);
            if (current.students.size === 0 && !current.teacherSocketId) {
              rooms.delete(roomCode);
            }
          }
        }, 15000);
      }
      emitRoom(io, room);
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
});
