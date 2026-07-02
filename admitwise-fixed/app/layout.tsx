import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import { MandatoryPhoneGate } from '@/components/mandatory-phone-gate'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://admitwiseedu.com'),
  title: 'AdmitWise — Smart Guidance. Better Admissions.',
  description:
    'India\u2019s data-driven college admission predictor and counselling platform for Engineering and Medical aspirants. Predict your colleges, compare cutoffs, and get expert guidance.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/images/logo.png',
      },
    ],
    apple: '/images/logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: 'white',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <AuthSessionProvider>
          <MandatoryPhoneGate />
          {children}
        </AuthSessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
