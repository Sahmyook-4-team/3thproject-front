// src/app/layout.tsx

'use client'; // 클라이언트 컴포넌트로 유지합니다.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. ApolloProvider와 client를 다시 import 합니다.
import { ApolloProvider } from "@apollo/client";
import client from "@/lib/apollo-client";

// 2. AuthProvider는 그대로 둡니다.
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

/* 
   metadata 객체를 사용하려면 export를 다시 활성화해야 합니다.
   단, 클라이언트 컴포넌트에서는 metadata 객체를 직접 export 할 수 없으므로,
   필요하다면 이 부분은 별도 파일로 분리하거나 제거해야 합니다.
   우선은 주석 처리된 상태로 두겠습니다.
*/
/*
export const metadata: Metadata = {
  title: "PACS PLUS",
  description: "DICOM Viewer Project",
};
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 3. ApolloWrapper 대신 ApolloProvider를 직접 사용합니다. */}
        <ApolloProvider client={client}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}