import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Adulting - AI Life Assistant",
  description: "Your AI-powered life assistant for managing events, tasks, and daily activities",
}

/**
 * Root layout component for the Next.js app
 * This wraps all pages and provides the base HTML structure
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

