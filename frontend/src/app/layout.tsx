import './globals.css'
import type { Metadata } from 'next'
import ChatWidgetWrapper from '@/components/chat/ChatWidgetWrapper'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: { default: 'RankPilot — AI SEO & Marketing Autopilot', template: '%s | RankPilot' },
  description: 'AI-assisted SEO and marketing workflows. Review website audits, prepare search-focused content, and organise campaign work from one workspace.',
  keywords: ['SEO automation','AI marketing','Google Ads AI','SEO audit tool','digital marketing automation'],
  openGraph: {
    title: 'RankPilot — AI SEO & Marketing Autopilot',
    description: 'Paste your URL. AI does your full SEO, content, and ad campaigns automatically.',
    type: 'website',
  },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ChatWidgetWrapper />
      </body>
    </html>
  )
}
