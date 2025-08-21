import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ▼▼▼ 1. AuthProvider를 import 합니다. ▼▼▼
import { AuthProvider } from "./context/AuthContext"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ▼▼▼ 2. (선택 사항) 프로젝트에 맞게 title, description을 수정합니다. ▼▼▼
  title: "PACS PLUS",
  description: "DICOM Viewer Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ▼▼▼ 3. 기존의 html 태그와 lang 속성은 그대로 둡니다. ▼▼▼
    <html lang="en"> 
      {/* ▼▼▼ 4. 기존의 body 태그와 className(폰트 설정)은 그대로 둡니다. ▼▼▼ */}
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* ▼▼▼ 5. AuthProvider로 children을 감싸줍니다. ▼▼▼ */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
