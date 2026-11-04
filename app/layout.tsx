import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineVerse - Modern Movie Discovery",
  description: "Discover, review, and track trending movies across global and regional industries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        <AuthProvider>
          <WatchlistProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}