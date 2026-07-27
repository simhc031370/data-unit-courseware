import { NextResponse } from "next/server";
import { createRoom, getRoom, joinStudent, snapshot, touchTeacher } from "@/lib/room-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "create") {
    const { room, teacherToken } = createRoom(body?.page || "intro");
    return NextResponse.json({
      ok: true,
      teacherToken,
      room: snapshot(room),
    });
  }

  if (action === "rejoin") {
    const code = String(body?.code || "").toUpperCase();
    const token = String(body?.teacherToken || "");
    const room = getRoom(code);
    if (!room || room.teacherToken !== token) {
      return NextResponse.json(
        { ok: false, error: "수업을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 },
      );
    }
    touchTeacher(room);
    return NextResponse.json({ ok: true, room: snapshot(room) });
  }

  if (action === "join") {
    const code = String(body?.code || "").toUpperCase();
    const name = String(body?.name || "").trim();
    const room = getRoom(code);
    if (!room) {
      return NextResponse.json(
        { ok: false, error: "수업 코드가 올바르지 않습니다." },
        { status: 404 },
      );
    }
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "이름을 입력해 주세요." },
        { status: 400 },
      );
    }
    const student = joinStudent(room, name, body?.studentId);
    return NextResponse.json({
      ok: true,
      studentId: student.id,
      peerId: student.peerId,
      room: snapshot(room),
    });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
