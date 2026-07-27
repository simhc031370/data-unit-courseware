import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const display = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "데이터실 | 2022 개정 중학교 정보 데이터 영역",
  description:
    "2022 개정 교육과정 중학교 정보 [9정02-01]~[9정02-05] 기반 실시간 코스웨어. 형성평가·보충/심화, 손들기, 집중 모드를 지원합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
