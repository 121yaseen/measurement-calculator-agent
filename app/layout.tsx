import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OpenClaw',
  description: 'Personal AI gateway interface',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${mono.variable}`} style={{ fontFamily: 'var(--font-mono), monospace', colorScheme: 'light', background: '#f5f4f0' }}>
      <body className="h-full">{children}</body>
    </html>
  )
}
