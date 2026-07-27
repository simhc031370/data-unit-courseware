"use client";

import { useMemo, useState } from "react";
import { FormativeAssessmentBlock } from "@/components/FormativeAssessment";
import { ConversionPractice } from "@/components/practice/ConversionPractice";
import { VideoSection } from "@/components/VideoEmbed";
import { getLesson, LESSONS, type QuizQuestion } from "@/lib/course";
import { getStandard } from "@/lib/standards";

type Props = {
  pageId: string;
  locked?: boolean;
  onNavigate?: (pageId: string) => void;
};

function QuizBlock({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <section className="final-quiz">
      <h2>종합 문제</h2>
      <p className="section-lead">
        개념과 판단을 묻는 문제입니다. 틀린 유형은 해당 파트로 돌아가 복습하세요.
      </p>
      <div className="quiz-list">
        {questions.map((q, index) => {
          const selected = answers[q.id];
          const show = revealed[q.id];
          const correct = selected === q.answer;
          return (
            <article key={q.id} className="quiz-card">
              <h3>
                {index + 1}. {q.prompt}
              </h3>
              <div className="choices">
                {q.choices.map((choice, i) => (
                  <button
                    key={choice}
                    type="button"
                    className={[
                      "choice",
                      selected === i ? "selected" : "",
                      show && i === q.answer ? "correct" : "",
                      show && selected === i && i !== q.answer ? "wrong" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: i }))
                    }
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <div className="quiz-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={selected == null}
                  onClick={() =>
                    setRevealed((prev) => ({ ...prev, [q.id]: true }))
                  }
                >
                  정답 확인
                </button>
                {show && (
                  <p className={`explain ${correct ? "ok" : "bad"}`}>
                    {correct ? "정답입니다. " : "다시 생각해 보세요. "}
                    {q.explanation}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LessonViewer({ pageId, locked, onNavigate }: Props) {
  const lesson = useMemo(() => getLesson(pageId), [pageId]);
  const index = LESSONS.findIndex((l) => l.id === lesson.id);
  const standards = lesson.standardCodes
    .map((code) => getStandard(code))
    .filter(Boolean);

  const go = (id: string) => {
    if (locked) return;
    onNavigate?.(id);
  };

  return (
    <div className="lesson-shell">
      <aside className="lesson-nav" aria-label="학습 목차">
        <p className="nav-label">데이터 단원</p>
        <p className="nav-meta">개념 · 기능 · 문제 해결</p>
        <ol>
          {LESSONS.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === lesson.id ? "active" : ""}
                disabled={locked}
                onClick={() => go(item.id)}
              >
                <span className="num">{i + 1}</span>
                <span>{item.title}</span>
              </button>
            </li>
          ))}
        </ol>
        {locked && (
          <p className="lock-hint">집중 모드: 선생님 화면을 따라갑니다</p>
        )}
      </aside>

      <article className="lesson-main">
        <header className="lesson-hero">
          <p className="eyebrow">
            {index + 1} / {LESSONS.length} · 약 {lesson.minutes}분
          </p>
          <h1>{lesson.title}</h1>
          <p className="subtitle">{lesson.subtitle}</p>
          <ul className="goals">
            {lesson.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </header>

        {lesson.sections.map((section) => (
          <section key={section.heading} className="lesson-section">
            <h2>{section.heading}</h2>
            {section.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}

        {lesson.videos && lesson.videos.length > 0 && (
          <VideoSection videos={lesson.videos} />
        )}

        {lesson.activity && (
          <section className="activity">
            <h2>{lesson.activity.title}</h2>
            <ol>
              {lesson.activity.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        )}

        {lesson.practiceKind && (
          <ConversionPractice key={lesson.id} kind={lesson.practiceKind} />
        )}

        {lesson.formative && (
          <FormativeAssessmentBlock
            key={lesson.id}
            lessonId={lesson.id}
            data={lesson.formative}
          />
        )}

        {lesson.quiz && <QuizBlock questions={lesson.quiz} />}

        {standards.length > 0 && (
          <details className="teacher-ref">
            <summary>교사 참고 · 관련 성취기준 / 내용 요소</summary>
            <div className="teacher-ref-body">
              {standards.map((s) =>
                s ? (
                  <div key={s.code} className="standard-item">
                    <p className="standard-statement">
                      <strong>[{s.code}]</strong> {s.statement}
                    </p>
                    <p className="ref-label">이 기준에서 가르쳐야 할 내용</p>
                    <ul>
                      {s.contentElements.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </details>
        )}

        <footer className="lesson-footer">
          <button
            type="button"
            className="btn ghost"
            disabled={locked || index <= 0}
            onClick={() => go(LESSONS[index - 1].id)}
          >
            이전
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={locked || index >= LESSONS.length - 1}
            onClick={() => go(LESSONS[index + 1].id)}
          >
            다음
          </button>
        </footer>
      </article>
    </div>
  );
}
