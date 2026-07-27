export type LessonId =
  | "intro"
  | "s0201"
  | "radix"
  | "text-code"
  | "image-digital"
  | "s0202"
  | "s0203"
  | "s0204"
  | "s0205"
  | "summary";

export type PracticeKind = "radix" | "text-code" | "image-digital";

export type StudentState = {
  id: string;
  name: string;
  currentPage: LessonId | string;
  handRaised: boolean;
  connected: boolean;
  lastSeen: number;
};

export type RoomState = {
  code: string;
  focusMode: boolean;
  teacherPage: LessonId | string;
  teacherConnected: boolean;
  students: StudentState[];
};

export type Role = "teacher" | "student";
