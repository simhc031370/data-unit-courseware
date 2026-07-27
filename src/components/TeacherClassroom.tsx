"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonViewer } from "@/components/LessonViewer";
import { StudentList } from "@/components/StudentList";
import {
  createRoom,
  pollRoom,
  postRoom,
  rejoinTeacher,
} from "@/lib/classroom-api";
import type { RoomState } from "@/lib/types";
import { TeacherScreenShare } from "@/lib/webrtc";

type Props = {
  initialCode?: string;
};

export function TeacherClassroom({ initialCode }: Props) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [page, setPage] = useState("intro");
  const [error, setError] = useState("");
  const [alertName, setAlertName] = useState<string | null>(null);
  const [focusBusy, setFocusBusy] = useState(false);
  const [teacherToken, setTeacherToken] = useState("");
  const shareRef = useRef<TeacherScreenShare | null>(null);
  const sinceRef = useRef(0);
  const codeRef = useRef(initialCode || "");
  const tokenRef = useRef("");

  const bindShare = useCallback(() => {
    if (!shareRef.current) {
      shareRef.current = new TeacherScreenShare((targetId, data) => {
        const code = codeRef.current;
        if (!code) return;
        void postRoom(code, {
          action: "signal",
          fromId: "teacher",
          targetId,
          data,
        });
      });
    }
    return shareRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (initialCode) {
        const saved =
          sessionStorage.getItem(`teacherToken:${initialCode}`) || "";
        if (!saved) {
          setError("교사 토큰이 없습니다. 홈에서 수업을 다시 시작해 주세요.");
          return;
        }
        const res = await rejoinTeacher(initialCode, saved);
        if (cancelled) return;
        if (!res?.ok) {
          setError(res?.error || "재접속에 실패했습니다.");
          return;
        }
        tokenRef.current = saved;
        setTeacherToken(saved);
        codeRef.current = initialCode;
        setRoom(res.room);
        setPage(res.room.teacherPage || "intro");
        return;
      }

      const res = await createRoom();
      if (cancelled) return;
      if (!res?.ok) {
        setError("수업 생성에 실패했습니다.");
        return;
      }
      tokenRef.current = res.teacherToken;
      setTeacherToken(res.teacherToken);
      codeRef.current = res.room.code;
      sessionStorage.setItem(`teacherToken:${res.room.code}`, res.teacherToken);
      setRoom(res.room);
      window.history.replaceState(null, "", `/teacher?code=${res.room.code}`);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  useEffect(() => {
    if (!room?.code || !teacherToken) return;
    const code = room.code;

    const timer = window.setInterval(async () => {
      const res = await pollRoom({
        code,
        role: "teacher",
        teacherToken,
        since: sinceRef.current,
      });
      if (!res?.ok || !res.room) return;
      setRoom(res.room);
      if (res.serverTime) sinceRef.current = res.serverTime;

      if (res.handAlerts?.length) {
        const last = res.handAlerts[res.handAlerts.length - 1];
        setAlertName(last.name);
        window.setTimeout(() => setAlertName(null), 4000);
      }

      for (const sig of res.signals || []) {
        await shareRef.current?.handleSignal(
          sig.fromId,
          sig.data as Parameters<TeacherScreenShare["handleSignal"]>[1],
        );
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [room?.code, teacherToken]);

  useEffect(() => {
    if (!room?.code || !teacherToken) return;
    void postRoom(room.code, {
      action: "teacher-page",
      teacherToken,
      page,
    });
  }, [page, room?.code, teacherToken]);

  const toggleFocus = async () => {
    if (!room || !teacherToken || focusBusy) return;
    setFocusBusy(true);
    setError("");
    try {
      const enabling = !room.focusMode;
      if (enabling) {
        const share = bindShare();
        await share?.start();
        const res = await postRoom(room.code, {
          action: "focus",
          teacherToken,
          enabled: true,
        });
        if (res?.ok && res.studentPeers?.length) {
          await share?.connectAll(
            res.studentPeers.map(
              (p: { peerId: string }) => p.peerId,
            ),
          );
        }
      } else {
        shareRef.current?.stop();
        await postRoom(room.code, {
          action: "focus",
          teacherToken,
          enabled: false,
        });
      }
    } catch {
      setError(
        "화면 공유를 시작하지 못했습니다. 브라우저에서 화면 공유를 허용해 주세요.",
      );
      await postRoom(room.code, {
        action: "focus",
        teacherToken,
        enabled: false,
      });
    } finally {
      setFocusBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      shareRef.current?.stop();
    };
  }, []);

  if (!room) {
    return (
      <div className="center-card">
        <h1>수업 준비 중…</h1>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="classroom teacher">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">데이터실</p>
          <h1>교사 콘솔</h1>
        </div>
        <div className="room-code">
          <span>수업 코드</span>
          <strong>{room.code}</strong>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className={`btn focus ${room.focusMode ? "on" : ""}`}
            onClick={toggleFocus}
            disabled={focusBusy}
          >
            {room.focusMode ? "집중 해제" : "집중하기"}
          </button>
        </div>
      </header>

      {alertName && (
        <div className="toast hand-toast" role="status">
          {alertName} 학생이 손을 들었습니다
        </div>
      )}
      {error && <div className="toast error-toast">{error}</div>}
      {room.focusMode && (
        <div className="focus-banner">
          집중 모드 켜짐 · 화면 공유 중 · 학생 페이지 이동이 잠겨 있습니다
        </div>
      )}

      <div className="classroom-grid">
        <LessonViewer pageId={page} onNavigate={setPage} />
        <StudentList
          students={room.students}
          onDismissHand={(id) =>
            void postRoom(room.code, {
              action: "dismiss-hand",
              teacherToken,
              studentId: id,
            })
          }
          onDismissAllHands={() =>
            void postRoom(room.code, {
              action: "dismiss-hand",
              teacherToken,
            })
          }
        />
      </div>
    </div>
  );
}
