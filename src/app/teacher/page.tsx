"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherClassroom } from "@/components/TeacherClassroom";

function TeacherInner() {
  const params = useSearchParams();
  const code = params.get("code") || undefined;
  return <TeacherClassroom initialCode={code} />;
}

export default function TeacherPage() {
  return (
    <Suspense
      fallback={
        <div className="center-card">
          <h1>교사 화면 불러오는 중…</h1>
        </div>
      }
    >
      <TeacherInner />
    </Suspense>
  );
}
