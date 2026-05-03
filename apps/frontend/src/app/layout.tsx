import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'AI PM Skills — AI Co-pilot for Product Managers',
    template: '%s | AI PM Skills',
  },
  description:
    'Score features with RICE, write PRDs, manage Epics, detect conflicts, track stakeholders. Plain language. Files you own.',
  keywords: ['product management', 'PRD', 'AI', 'RICE scoring', 'product requirements'],
  authors: [{ name: 'AI PM Skills' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aipmskills.com',
    siteName: 'AI PM Skills',
    title: 'AI PM Skills — AI Co-pilot for Product Managers',
    description: 'Score features with RICE, write PRDs, manage Epics. Plain language. Files you own.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI PM Skills' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI PM Skills',
    description: 'AI Co-pilot for Product Managers',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
