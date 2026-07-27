import { NextResponse } from "next/server";
import {
  getRoom,
  pruneSignals,
  pushSignal,
  snapshot,
  touchTeacher,
} from "@/lib/room-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const role = url.searchParams.get("role");
  const teacherToken = url.searchParams.get("teacherToken") || "";
  const studentId = url.searchParams.get("studentId") || "";
  const peerId = url.searchParams.get("peerId") || "";
  const since = Number(url.searchParams.get("since") || "0");

  pruneSignals(room);

  if (role === "teacher" && teacherToken === room.teacherToken) {
    touchTeacher(room);
  }

  if (role === "student" && studentId && room.students[studentId]) {
    const s = room.students[studentId];
    s.connected = true;
    s.lastSeen = Date.now();
    if (peerId) s.peerId = peerId;
  }

  const signals = room.signals.filter((sig) => {
    if (sig.createdAt <= since) return false;
    if (role === "teacher") {
      return sig.targetId === "teacher" || sig.targetId === room.teacherToken;
    }
    if (role === "student") {
      const me = room.students[studentId];
      return (
        sig.targetId === studentId ||
        sig.targetId === me?.peerId ||
        sig.targetId === "students"
      );
    }
    return false;
  });

  const handAlerts =
    role === "teacher" && teacherToken === room.teacherToken
      ? room.handAlerts.filter((a) => a.at > since)
      : [];

  // clear delivered hand alerts for teacher
  if (handAlerts.length && role === "teacher") {
    const ids = new Set(handAlerts.map((a) => a.at + a.name));
    room.handAlerts = room.handAlerts.filter(
      (a) => !ids.has(a.at + a.name),
    );
  }

  return NextResponse.json({
    ok: true,
    room: snapshot(room),
    signals,
    handAlerts,
    serverTime: Date.now(),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "teacher-page") {
    if (body?.teacherToken !== room.teacherToken) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    touchTeacher(room);
    room.teacherPage = String(body?.page || "intro");
    if (room.focusMode) {
      for (const s of Object.values(room.students)) {
        s.currentPage = room.teacherPage;
      }
    }
    return NextResponse.json({ ok: true, room: snapshot(room) });
  }

  if (action === "student-page") {
    const student = room.students[body?.studentId];
    if (!student) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    student.lastSeen = Date.now();
    student.connected = true;
    if (room.focusMode) {
      return NextResponse.json({
        ok: true,
        forcedPage: room.teacherPage,
        room: snapshot(room),
      });
    }
    student.currentPage = String(body?.page || "intro");
    return NextResponse.json({ ok: true, room: snapshot(room) });
  }

  if (action === "hand") {
    const student = room.students[body?.studentId];
    if (!student) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    student.handRaised = Boolean(body?.raised);
    student.lastSeen = Date.now();
    if (student.handRaised) {
      room.handAlerts.push({ name: student.name, at: Date.now() });
    }
    return NextResponse.json({ ok: true, room: snapshot(room) });
  }

  if (action === "dismiss-hand") {
    if (body?.teacherToken !== room.teacherToken) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    touchTeacher(room);
    const studentId = body?.studentId as string | undefined;
    for (const s of Object.values(room.students)) {
      if (!studentId || s.id === studentId) s.handRaised = false;
    }
    return NextResponse.json({ ok: true, room: snapshot(room) });
  }

  if (action === "focus") {
    if (body?.teacherToken !== room.teacherToken) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    touchTeacher(room);
    room.focusMode = Boolean(body?.enabled);
    if (room.focusMode) {
      for (const s of Object.values(room.students)) {
        s.currentPage = room.teacherPage;
      }
    }
    const studentPeers = Object.values(room.students)
      .filter((s) => s.connected)
      .map((s) => ({ studentId: s.id, peerId: s.peerId }));
    return NextResponse.json({
      ok: true,
      focusMode: room.focusMode,
      studentPeers,
      room: snapshot(room),
    });
  }

  if (action === "signal") {
    const fromId = String(body?.fromId || "");
    const targetId = String(body?.targetId || "");
    if (!fromId || !targetId) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    pushSignal(room, fromId, targetId, body?.data);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
