"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

const Login = dynamic(() => import("./login"), { ssr: false });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    setIsChecking(false);
  }, []);

  function handleLoginSuccess() {
    setIsLoggedIn(true);
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isChecking ? null : isLoggedIn ? (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="flex-1 overflow-auto">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        ) : (
          <Login onSuccess={handleLoginSuccess} />
        )}
        <Toaster />
      </body>
    </html>
  );
}
