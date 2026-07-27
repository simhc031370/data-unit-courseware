"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { StudentClassroom } from "@/components/StudentClassroom";

function StudentInner() {
  const params = useSearchParams();
  const code = (params.get("code") || "").toUpperCase();
  const name = params.get("name") || "";

  const studentId = useMemo(() => {
    if (typeof window === "undefined" || !code) return "";
    const key = `studentId:${code}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `s_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  }, [code]);

  if (!code || !name) {
    return (
      <div className="center-card">
        <h1>입장 정보가 부족합니다</h1>
        <a className="btn primary" href="/">
          처음으로
        </a>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="center-card">
        <h1>준비 중…</h1>
      </div>
    );
  }

  return <StudentClassroom code={code} name={name} studentId={studentId} />;
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="center-card">
          <h1>학생 화면 불러오는 중…</h1>
        </div>
      }
    >
      <StudentInner />
    </Suspense>
  );
}
