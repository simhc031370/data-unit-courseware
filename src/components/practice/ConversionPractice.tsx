"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { PracticeKind } from "@/lib/types";

type FillProblem = {
  id: string;
  prompt: string;
  hint?: string;
  /** 정답 후보(대소문자·공백 무시, 접두어 허용) */
  answers: string[];
  steps: string[];
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^0b/, "")
    .replace(/^0x/, "");
}

function isCorrect(input: string, answers: string[]) {
  const n = normalize(input);
  return answers.some((a) => normalize(a) === n);
}

const RADIX_PROBLEMS: FillProblem[] = [
  {
    id: "r1",
    prompt: "10진수 13을 2진수로 바꾸세요. (예: 1101)",
    hint: "2로 나누며 나머지를 아래에서 위로 읽습니다.",
    answers: ["1101", "0b1101"],
    steps: [
      "13 ÷ 2 = 6 … 나머지 1",
      "6 ÷ 2 = 3 … 나머지 0",
      "3 ÷ 2 = 1 … 나머지 1",
      "1 ÷ 2 = 0 … 나머지 1",
      "나머지를 아래에서 위로: 1101₍₂₎",
    ],
  },
  {
    id: "r2",
    prompt: "2진수 10110을 10진수로 바꾸세요.",
    hint: "자리값: 16 8 4 2 1",
    answers: ["22"],
    steps: [
      "1×16 + 0×8 + 1×4 + 1×2 + 0×1",
      "= 16 + 0 + 4 + 2 + 0",
      "= 22₍₁₀₎",
    ],
  },
  {
    id: "r3",
    prompt: "10진수 45를 16진수로 바꾸세요. (A=10 … F=15, 예: 2D)",
    hint: "16으로 나누며 나머지를 모읍니다.",
    answers: ["2d", "0x2d", "2D", "0x2D"],
    steps: [
      "45 ÷ 16 = 2 … 나머지 13 → D",
      "2 ÷ 16 = 0 … 나머지 2",
      "아래에서 위로: 2D₍₁₆₎",
    ],
  },
  {
    id: "r4",
    prompt: "16진수 3A를 10진수로 바꾸세요. (A=10)",
    answers: ["58"],
    steps: ["3×16 + 10×1 = 48 + 10 = 58₍₁₀₎"],
  },
  {
    id: "r5",
    prompt: "2진수 11010110을 4비트씩 묶어 16진수로 바꾸세요.",
    hint: "1101 0110",
    answers: ["d6", "0xd6", "D6", "0xD6"],
    steps: [
      "앞에서부터 4비트: 1101 0110",
      "1101₍₂₎ = 13 = D₍₁₆₎",
      "0110₍₂₎ = 6₍₁₆₎",
      "결과: D6₍₁₆₎",
    ],
  },
  {
    id: "r6",
    prompt: "10진수 255를 2진수로 바꾸세요.",
    answers: ["11111111", "0b11111111"],
    steps: [
      "255 = 128+64+32+16+8+4+2+1",
      "자리마다 1 → 11111111₍₂₎",
    ],
  },
];

const TEXT_PROBLEMS: FillProblem[] = [
  {
    id: "t1",
    prompt: "ASCII에서 문자 'A'의 10진 코드는?",
    hint: "'A'=65, 'a'=97, '0'=48",
    answers: ["65"],
    steps: ["대문자 A의 ASCII 코드는 65입니다.", "2진수로는 01000001입니다."],
  },
  {
    id: "t2",
    prompt: "ASCII 코드 97이 나타내는 문자는? (소문자 한 글자)",
    answers: ["a"],
    steps: ["'a' = 97, 'b' = 98, … 순서대로 1씩 증가합니다."],
  },
  {
    id: "t3",
    prompt: "문자 'C'의 ASCII 10진 코드를 구하세요.",
    hint: "'A'=65이므로 C는 그보다 2 큽니다.",
    answers: ["67"],
    steps: ["A=65, B=66, C=67"],
  },
  {
    id: "t4",
    prompt: "ASCII 코드 48이 나타내는 문자는?",
    answers: ["0"],
    steps: ["숫자 문자 '0'의 ASCII는 48, '1'은 49입니다."],
  },
  {
    id: "t5",
    prompt: "문자 'A'의 ASCII를 2진수 8비트로 쓰세요.",
    answers: ["01000001", "1000001"],
    steps: [
      "65₍₁₀₎ → 2진 변환",
      "64+1 = 65 → 01000001₍₂₎ (8비트로 앞에 0을 채움)",
    ],
  },
  {
    id: "t6",
    prompt: "문자열 'Hi'의 ASCII 10진 코드 두 개를 쉼표로 이어 쓰세요. (예: 72,105)",
    answers: ["72,105", "72, 105"],
    steps: ["'H' = 72", "'i' = 105", "결과: 72,105"],
  },
];

type ImageProblem = {
  id: string;
  prompt: string;
  kind: "fill" | "rgb";
  answers?: string[];
  steps: string[];
  rgb?: { r: number; g: number; b: number };
};

const IMAGE_PROBLEMS: ImageProblem[] = [
  {
    id: "i1",
    kind: "fill",
    prompt: "가로 4픽셀, 세로 3픽셀 이미지의 총 픽셀 수는?",
    answers: ["12"],
    steps: ["총 픽셀 수 = 가로 × 세로 = 4 × 3 = 12"],
  },
  {
    id: "i2",
    kind: "fill",
    prompt:
      "한 픽셀이 R,G,B 각 8비트(총 24비트)일 때, 픽셀 하나의 바이트 수는? (8비트=1바이트)",
    answers: ["3"],
    steps: ["24비트 ÷ 8 = 3바이트"],
  },
  {
    id: "i3",
    kind: "fill",
    prompt:
      "해상도 10×8, 픽셀당 3바이트(24비트 컬러)일 때 대략적인 데이터 크기(바이트)는? (압축 없다고 가정)",
    answers: ["240"],
    steps: ["10 × 8 × 3 = 240바이트"],
  },
  {
    id: "i4",
    kind: "fill",
    prompt: "흑백(픽셀당 1비트) 이미지 8×8의 총 비트 수는?",
    answers: ["64"],
    steps: ["8 × 8 × 1비트 = 64비트"],
  },
  {
    id: "i5",
    kind: "rgb",
    prompt: "RGB(255, 0, 0)는 어떤 색에 가깝습니까? 보기에서 고르세요.",
    rgb: { r: 255, g: 0, b: 0 },
    answers: ["빨강", "빨간색", "red", "적색"],
    steps: ["R만 최대이고 G·B가 0이면 빨간색입니다."],
  },
  {
    id: "i6",
    kind: "rgb",
    prompt: "RGB(0, 255, 0)는 어떤 색에 가깝습니까?",
    rgb: { r: 0, g: 255, b: 0 },
    answers: ["초록", "녹색", "초록색", "green"],
    steps: ["G만 최대이면 초록색입니다."],
  },
  {
    id: "i7",
    kind: "fill",
    prompt:
      "회색은 R=G=B일 때 만듭니다. RGB(120, 120, ?)에서 ?에 들어갈 수는?",
    answers: ["120"],
    steps: ["무채색 회색은 R, G, B 값이 같습니다."],
  },
];

function PracticeShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="practice-panel">
      <h2>{title}</h2>
      <p className="section-lead">
        먼저 위 이론의 변환 순서를 떠올린 뒤 풀이하세요. 제출 후 풀이 과정을 확인할
        수 있습니다.
      </p>
      {children}
    </section>
  );
}

function FillPractice({ problems }: { problems: FillProblem[] }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({});

  const score = useMemo(() => {
    return problems.reduce((acc, p) => {
      if (!checked[p.id]) return acc;
      return acc + (isCorrect(inputs[p.id] || "", p.answers) ? 1 : 0);
    }, 0);
  }, [checked, inputs, problems]);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="practice-list">
      {problems.map((p, index) => {
        const done = checked[p.id];
        const ok = done && isCorrect(inputs[p.id] || "", p.answers);
        return (
          <article key={p.id} className="practice-card">
            <h3>
              {index + 1}. {p.prompt}
            </h3>
            {p.hint && <p className="practice-hint">힌트: {p.hint}</p>}
            <div className="practice-row">
              <input
                value={inputs[p.id] || ""}
                disabled={done}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                placeholder="정답 입력"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn secondary small"
                disabled={done || !(inputs[p.id] || "").trim()}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [p.id]: true }))
                }
              >
                채점
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={() =>
                  setShowSteps((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                }
              >
                {showSteps[p.id] ? "풀이 닫기" : "풀이 보기"}
              </button>
            </div>
            {done && (
              <p className={`explain ${ok ? "ok" : "bad"}`}>
                {ok
                  ? "정답입니다."
                  : `오답입니다. 정답 예: ${p.answers[0]}`}
              </p>
            )}
            {showSteps[p.id] && (
              <ol className="practice-steps">
                {p.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </article>
        );
      })}
      {checkedCount > 0 && (
        <div className="practice-score">
          현재 채점: {score} / {checkedCount} 문항 정답
          {checkedCount === problems.length &&
            (score === problems.length
              ? " · 모두 맞았습니다!"
              : " · 틀린 문항은 풀이를 다시 보며 고쳐 보세요.")}
        </div>
      )}
    </div>
  );
}

function ImagePractice() {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({});
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => "#ffffff")),
  );

  const paint = (r: number, c: number, color: string) => {
    setGrid((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? color : cell)),
      ),
    );
  };

  const blackCount = grid.flat().filter((c) => c === "#000000").length;

  return (
    <div className="practice-list">
      <article className="practice-card">
        <h3>픽셀 격자 체험 (4×4)</h3>
        <p className="practice-hint">
          색을 고른 뒤 칸을 눌러 칠해 보세요. 이미지는 픽셀의 색 값 모임입니다.
        </p>
        <PaletteGrid grid={grid} onPaint={paint} />
        <p className="practice-hint">검은색(#000000) 픽셀 수: {blackCount}</p>
      </article>

      {IMAGE_PROBLEMS.map((p, index) => {
        const done = checked[p.id];
        const ok =
          done && isCorrect(inputs[p.id] || "", p.answers || []);
        return (
          <article key={p.id} className="practice-card">
            <h3>
              {index + 1}. {p.prompt}
            </h3>
            {p.rgb && (
              <div className="rgb-preview">
                <span
                  className="rgb-chip"
                  style={{
                    background: `rgb(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b})`,
                  }}
                />
                <code>
                  R={p.rgb.r}, G={p.rgb.g}, B={p.rgb.b}
                </code>
              </div>
            )}
            <div className="practice-row">
              <input
                value={inputs[p.id] || ""}
                disabled={done}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                placeholder="정답 입력"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn secondary small"
                disabled={done || !(inputs[p.id] || "").trim()}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [p.id]: true }))
                }
              >
                채점
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={() =>
                  setShowSteps((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                }
              >
                {showSteps[p.id] ? "풀이 닫기" : "풀이 보기"}
              </button>
            </div>
            {done && (
              <p className={`explain ${ok ? "ok" : "bad"}`}>
                {ok
                  ? "정답입니다."
                  : `오답입니다. 정답 예: ${p.answers?.[0]}`}
              </p>
            )}
            {showSteps[p.id] && (
              <ol className="practice-steps">
                {p.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PaletteGrid({
  grid,
  onPaint,
}: {
  grid: string[][];
  onPaint: (r: number, c: number, color: string) => void;
}) {
  const [color, setColor] = useState("#000000");
  const palette = ["#000000", "#ffffff", "#e11d48", "#2563eb", "#16a34a", "#f59e0b"];

  return (
    <div>
      <div className="palette">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${color === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}
      </div>
      <div className="pixel-grid">
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              className="pixel-cell"
              style={{ background: cell }}
              onClick={() => onPaint(r, c, color)}
              aria-label={`${r},${c}`}
            />
          )),
        )}
      </div>
    </div>
  );
}

export function ConversionPractice({ kind }: { kind: PracticeKind }) {
  if (kind === "radix") {
    return (
      <PracticeShell title="실전 문제 · 진법 변환">
        <FillPractice problems={RADIX_PROBLEMS} />
      </PracticeShell>
    );
  }
  if (kind === "text-code") {
    return (
      <PracticeShell title="실전 문제 · 문자 코드 변환">
        <FillPractice problems={TEXT_PROBLEMS} />
      </PracticeShell>
    );
  }
  return (
    <PracticeShell title="실전 문제 · 이미지 디지털 표현">
      <ImagePractice />
    </PracticeShell>
  );
}
