"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const joinStudent = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setError("수업 코드를 입력해 주세요.");
      return;
    }
    if (!cleanName) {
      setError("이름을 입력해 주세요.");
      return;
    }
    const studentId =
      sessionStorage.getItem(`studentId:${cleanCode}`) ||
      `s_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(`studentId:${cleanCode}`, studentId);
    sessionStorage.setItem(`studentName:${cleanCode}`, cleanName);
    router.push(
      `/student?code=${encodeURIComponent(cleanCode)}&name=${encodeURIComponent(cleanName)}`,
    );
  };

  return (
    <main className="landing">
      <div className="landing-glow" aria-hidden />
      <section className="landing-hero">
        <p className="brand">데이터실</p>
        <h1>
          중학교 정보
          <br />
          데이터 영역 코스웨어
        </h1>
        <p className="lead">
          디지털 표현, 수집·관리, 구조화, 해석, 융합 문제 해결을 배웁니다.
          한 교실에서 접속·위치·손들기·집중 모드가 실시간으로 이어집니다.
        </p>
      </section>

      <section className="landing-panels">
        <article className="panel teacher-panel">
          <h2>선생님</h2>
          <p>
            수업을 만들고 학생 접속, 현재 학습 위치, 손들기를 확인합니다.
            집중하기로 화면을 공유할 수 있습니다.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => router.push("/teacher")}
          >
            수업 시작하기
          </button>
        </article>

        <article className="panel student-panel-join">
          <h2>학생</h2>
          <p>선생님에게 받은 수업 코드와 이름을 입력해 입장합니다.</p>
          <form onSubmit={joinStudent} className="join-form">
            <label>
              수업 코드
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예: AB12CD"
                maxLength={8}
                autoComplete="off"
              />
            </label>
            <label>
              이름
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                maxLength={20}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary">
              교실 입장
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
