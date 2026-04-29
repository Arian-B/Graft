import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/auth/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Graft — Private Browser Extension Platform',
    template: '%s · Graft',
  },
  description:
    'Write browser automation scripts in your browser. Deploy to your entire team in one click — no Chrome Web Store, no IT tickets, no zip files.',
  keywords: ['browser extension', 'developer tools', 'team deployment', 'automation', 'chrome extension'],
  icons: {
    icon:  [{ url: '/graftlogo.png', type: 'image/png' }],
    apple: [{ url: '/graftlogo.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'Graft — Private Browser Extension Platform',
    description: 'Write once. Deploy to your entire team instantly.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}