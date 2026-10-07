import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = { title: "BiblioCore | Academic Research Workspace", description: "Grounded academic research across your papers." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body><Shell>{children}</Shell></body></html>; }
