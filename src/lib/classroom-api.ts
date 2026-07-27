"use client";

import type { RoomState } from "./types";

export type PollPayload = {
  ok: boolean;
  room?: RoomState;
  signals?: {
    id: string;
    fromId: string;
    targetId: string;
    data: unknown;
    createdAt: number;
  }[];
  handAlerts?: { name: string; at: number }[];
  serverTime?: number;
  error?: string;
};

export async function createRoom() {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", page: "intro" }),
  });
  return res.json();
}

export async function rejoinTeacher(code: string, teacherToken: string) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rejoin", code, teacherToken }),
  });
  return res.json();
}

export async function joinStudent(code: string, name: string, studentId: string) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", code, name, studentId }),
  });
  return res.json();
}

export async function pollRoom(params: {
  code: string;
  role: "teacher" | "student";
  teacherToken?: string;
  studentId?: string;
  peerId?: string;
  since: number;
}): Promise<PollPayload> {
  const q = new URLSearchParams({
    role: params.role,
    since: String(params.since),
  });
  if (params.teacherToken) q.set("teacherToken", params.teacherToken);
  if (params.studentId) q.set("studentId", params.studentId);
  if (params.peerId) q.set("peerId", params.peerId);
  const res = await fetch(`/api/room/${params.code}?${q}`, {
    cache: "no-store",
  });
  return res.json();
}

export async function postRoom(code: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/room/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
