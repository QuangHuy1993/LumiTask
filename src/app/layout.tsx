import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { PageTransition } from "@/components/common/PageTransition";
import { PaymentNotificationProvider } from "@/components/common/PaymentNotificationProvider";
import "./globals.css";

const inter = localFont({
  src: "../fonts/Inter-VariableFont_opsz,wght.ttf",
  variable: "--font-inter",
  display: "swap",
});

const geist = localFont({
  src: "../fonts/Geist-VariableFont_wght.ttf",
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LumiTask - Flowbite Admin",
  description: "Hệ thống quản lý việc làm cá nhân tối ưu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geist.variable} antialiased font-sans`}
      >
        <Suspense fallback={null}>
          <PageTransition />
        </Suspense>
        <PaymentNotificationProvider />
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
