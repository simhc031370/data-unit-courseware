"use client";

import { LESSON_TITLE } from "@/lib/course";
import type { StudentState } from "@/lib/types";

type Props = {
  students: StudentState[];
  onDismissHand?: (studentId: string) => void;
  onDismissAllHands?: () => void;
};

export function StudentList({
  students,
  onDismissHand,
  onDismissAllHands,
}: Props) {
  const online = students.filter((s) => s.connected).length;
  const hands = students.filter((s) => s.handRaised && s.connected);

  return (
    <div className="student-panel">
      <div className="student-panel-head">
        <div>
          <h2>접속 학생</h2>
          <p>
            온라인 {online}명 · 전체 {students.length}명
            {hands.length > 0 ? ` · 손들기 ${hands.length}` : ""}
          </p>
        </div>
        {hands.length > 0 && (
          <button
            type="button"
            className="btn secondary small"
            onClick={onDismissAllHands}
          >
            손들기 모두 확인
          </button>
        )}
      </div>

      {students.length === 0 ? (
        <p className="empty">아직 입장한 학생이 없습니다.</p>
      ) : (
        <ul className="student-list">
          {[...students]
            .sort((a, b) => {
              if (a.handRaised !== b.handRaised) return a.handRaised ? -1 : 1;
              if (a.connected !== b.connected) return a.connected ? -1 : 1;
              return a.name.localeCompare(b.name, "ko");
            })
            .map((s) => (
              <li
                key={s.id}
                className={[
                  "student-row",
                  s.connected ? "online" : "offline",
                  s.handRaised ? "hand" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="student-main">
                  <span className="status-dot" aria-hidden />
                  <div>
                    <strong>{s.name}</strong>
                    <span className="page">
                      {LESSON_TITLE[s.currentPage] || s.currentPage}
                    </span>
                  </div>
                </div>
                <div className="student-meta">
                  {!s.connected && <span className="badge muted">오프라인</span>}
                  {s.handRaised && (
                    <button
                      type="button"
                      className="badge hand-badge"
                      onClick={() => onDismissHand?.(s.id)}
                    >
                      손들기 · 확인
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
