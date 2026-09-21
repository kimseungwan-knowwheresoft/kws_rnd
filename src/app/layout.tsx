import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { getServerSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "R&D Project Management",
  description: "Internal R&D Project Management Service",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-gray-50 text-gray-800 antialiased font-sans">
        <div className="flex h-screen overflow-hidden">
          <Sidebar isAuthenticated={!!session} />
          <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <Header session={session} />
            <main className="w-full grow p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
