"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormativeAssessment as FormativeData } from "@/lib/course";
import { VideoEmbed } from "@/components/VideoEmbed";

type Props = {
  lessonId: string;
  data: FormativeData;
};

type StoredResult = {
  answers: Record<string, number | null>;
  submitted: boolean;
};

function storageKey(lessonId: string) {
  return `formative:${lessonId}`;
}

export function FormativeAssessmentBlock({ lessonId, data }: Props) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(lessonId));
      if (!raw) {
        setAnswers({});
        setSubmitted(false);
        return;
      }
      const parsed = JSON.parse(raw) as StoredResult;
      setAnswers(parsed.answers || {});
      setSubmitted(Boolean(parsed.submitted));
    } catch {
      setAnswers({});
      setSubmitted(false);
    }
  }, [lessonId]);

  const score = useMemo(() => {
    return data.questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.answer ? 1 : 0);
    }, 0);
  }, [answers, data.questions]);

  const allAnswered = data.questions.every((q) => answers[q.id] != null);
  const passed = score >= data.passScore;
  const track = submitted ? (passed ? "enrichment" : "remedial") : null;
  const material = track === "enrichment" ? data.enrichment : data.remedial;

  const persist = (nextAnswers: Record<string, number | null>, nextSubmitted: boolean) => {
    const payload: StoredResult = {
      answers: nextAnswers,
      submitted: nextSubmitted,
    };
    sessionStorage.setItem(storageKey(lessonId), JSON.stringify(payload));
  };

  const submit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    persist(answers, true);
  };

  const retry = () => {
    const empty = Object.fromEntries(data.questions.map((q) => [q.id, null]));
    setAnswers(empty);
    setSubmitted(false);
    persist(empty, false);
  };

  return (
    <section className="formative">
      <div className="formative-head">
        <h2>형성평가</h2>
        <p>
          {data.questions.length}문항 중 {data.passScore}문항 이상 맞히면 심화자료,
          미만이면 보충자료가 열립니다.
        </p>
      </div>

      <div className="quiz-list">
        {data.questions.map((q, index) => {
          const selected = answers[q.id];
          return (
            <article key={q.id} className="quiz-card">
              <h3>
                {index + 1}. {q.prompt}
              </h3>
              <div className="choices">
                {q.choices.map((choice, i) => {
                  const show = submitted;
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={submitted}
                      className={[
                        "choice",
                        selected === i ? "selected" : "",
                        show && i === q.answer ? "correct" : "",
                        show && selected === i && i !== q.answer ? "wrong" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        const next = { ...answers, [q.id]: i };
                        setAnswers(next);
                        persist(next, false);
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p
                  className={`explain ${
                    selected === q.answer ? "ok" : "bad"
                  }`}
                >
                  {selected === q.answer ? "정답입니다. " : "오답입니다. "}
                  {q.explanation}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="formative-actions">
        {!submitted ? (
          <button
            type="button"
            className="btn primary"
            disabled={!allAnswered}
            onClick={submit}
          >
            채점하고 맞춤 자료 보기
          </button>
        ) : (
          <>
            <div className={`score-banner ${passed ? "pass" : "fail"}`}>
              <strong>
                {score} / {data.questions.length} 문항 정답
              </strong>
              <span>
                {passed
                  ? "기준을 통과했습니다. 심화자료로 더 넓혀 보세요."
                  : "아직 부족합니다. 보충자료로 핵심을 다시 잡아 보세요."}
              </span>
            </div>
            <button type="button" className="btn secondary" onClick={retry}>
              다시 풀기
            </button>
          </>
        )}
      </div>

      {submitted && material && (
        <div className={`support-panel ${track}`}>
          <p className="support-label">
            {track === "enrichment" ? "심화자료" : "보충자료"}
          </p>
          <h3>{material.title}</h3>
          <p className="support-summary">{material.summary}</p>
          <ul>
            {material.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {material.tips && material.tips.length > 0 && (
            <div className="support-tips">
              <strong>자기주도 팁</strong>
              <ul>
                {material.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {material.video && (
            <div className="support-video">
              <p className="support-video-label">맞춤 추천 영상</p>
              <VideoEmbed video={material.video} />
            </div>
          )}
          <div className="support-alt">
            <details>
              <summary>
                {track === "enrichment"
                  ? "보충자료도 함께 보기"
                  : "심화자료도 함께 보기"}
              </summary>
              <div className="support-alt-body">
                <h4>
                  {(track === "enrichment"
                    ? data.remedial
                    : data.enrichment
                  ).title}
                </h4>
                <p>
                  {
                    (track === "enrichment"
                      ? data.remedial
                      : data.enrichment
                    ).summary
                  }
                </p>
                <ul>
                  {(track === "enrichment"
                    ? data.remedial
                    : data.enrichment
                  ).points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
