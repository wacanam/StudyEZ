import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyEZ - AI-Powered Study Platform",
  description: "An AI-powered RAG platform for effective study skills using LlamaIndex, PGVector, and Gemini.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
