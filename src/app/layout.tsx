import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { DialogProvider } from "@/components/DialogProvider";

export const metadata: Metadata = {
  title: "Online IDE",
  description: "A browser-based multi-language IDE",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <DialogProvider>{children}</DialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
