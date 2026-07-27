"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LessonViewer } from "@/components/LessonViewer";
import { joinStudent, pollRoom, postRoom } from "@/lib/classroom-api";
import type { RoomState } from "@/lib/types";
import { StudentScreenViewer } from "@/lib/webrtc";

type Props = {
  code: string;
  name: string;
  studentId: string;
};

export function StudentClassroom({ code, name, studentId }: Props) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [page, setPage] = useState("intro");
  const [handRaised, setHandRaised] = useState(false);
  const [error, setError] = useState("");
  const [peerId, setPeerId] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewerRef = useRef<StudentScreenViewer | null>(null);
  const sinceRef = useRef(0);
  const focusMode = room?.focusMode ?? false;

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const res = await joinStudent(code, name, studentId);
      if (cancelled) return;
      if (!res?.ok) {
        setError(res?.error || "입장에 실패했습니다.");
        return;
      }
      setPeerId(res.peerId);
      setRoom(res.room);
      setPage(res.room.focusMode ? res.room.teacherPage : "intro");
    }
    void boot();
    return () => {
      cancelled = true;
      viewerRef.current?.close();
    };
  }, [code, name, studentId]);

  useEffect(() => {
    if (!room || !peerId) return;

    const timer = window.setInterval(async () => {
      const res = await pollRoom({
        code,
        role: "student",
        studentId,
        peerId,
        since: sinceRef.current,
      });
      if (!res?.ok || !res.room) return;
      setRoom(res.room);
      if (res.serverTime) sinceRef.current = res.serverTime;

      const me = res.room.students.find((s) => s.id === studentId);
      if (me) setHandRaised(me.handRaised);

      if (res.room.focusMode) {
        setPage(res.room.teacherPage);
      }

      for (const sig of res.signals || []) {
        if (!viewerRef.current) {
          viewerRef.current = new StudentScreenViewer(
            (targetId, data) => {
              void postRoom(code, {
                action: "signal",
                fromId: peerId,
                targetId,
                data,
              });
            },
            (stream) => setRemoteStream(stream),
          );
        }
        await viewerRef.current.handleSignal(
          sig.fromId,
          sig.data as Parameters<StudentScreenViewer["handleSignal"]>[1],
        );
      }

      if (!res.room.focusMode) {
        viewerRef.current?.close();
        setRemoteStream(null);
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [room, peerId, code, studentId]);

  useEffect(() => {
    if (!room || focusMode) return;
    void postRoom(code, {
      action: "student-page",
      studentId,
      page,
    }).then((res) => {
      if (res?.forcedPage) setPage(res.forcedPage);
    });
  }, [page, room, focusMode, code, studentId]);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    void postRoom(code, {
      action: "hand",
      studentId,
      raised: next,
    });
  };

  const statusText = useMemo(() => {
    if (!room) return "연결 중…";
    if (!room.teacherConnected) return "선생님 연결 대기";
    if (focusMode) return "집중 모드";
    return "학습 중";
  }, [room, focusMode]);

  if (error) {
    return (
      <div className="center-card">
        <h1>입장 실패</h1>
        <p className="error">{error}</p>
        <a className="btn primary" href="/">
          처음으로
        </a>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="center-card">
        <h1>교실 입장 중…</h1>
        <p>
          {name} · 코드 {code.toUpperCase()}
        </p>
      </div>
    );
  }

  return (
    <div className="classroom student">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">데이터실</p>
          <h1>{name}</h1>
        </div>
        <div className="room-code">
          <span>상태</span>
          <strong>{statusText}</strong>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className={`btn hand ${handRaised ? "on" : ""}`}
            onClick={toggleHand}
          >
            {handRaised ? "손 내리기" : "손들기"}
          </button>
        </div>
      </header>

      {focusMode && (
        <div className="focus-banner">
          선생님이 집중하기를 켰습니다. 화면을 보고, 다른 페이지로 이동할 수
          없습니다.
        </div>
      )}

      {focusMode && remoteStream && (
        <div className="screen-share">
          <video ref={videoRef} autoPlay playsInline muted />
          <p>선생님 화면 공유</p>
        </div>
      )}

      <LessonViewer
        pageId={page}
        locked={focusMode}
        onNavigate={(id) => {
          if (focusMode) return;
          setPage(id);
        }}
      />
    </div>
  );
}
