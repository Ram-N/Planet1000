import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planet1000 — See the World Differently",
  description:
    "An educational game that scales the entire world down to 1,000 people, building your intuition for global statistics.",
  openGraph: {
    title: "Planet1000",
    description: "What if the world had just 1,000 people?",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-emerald-700 tracking-tight">
              🌍 Planet1000
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/play/world-of-1000" className="text-slate-600 hover:text-emerald-700 transition-colors">
                Play
              </Link>
              <Link href="/play/daily" className="text-slate-600 hover:text-emerald-700 transition-colors">
                Daily
              </Link>
              <Link
                href="/stats"
                className="text-slate-600 hover:text-emerald-700 transition-colors"
              >
                Stats
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200 bg-white">
          Planet1000 — Quantitative world literacy, one question at a time.
        </footer>
      </body>
    </html>
  );
}
