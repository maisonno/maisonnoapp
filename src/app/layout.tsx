import type { Metadata } from 'next'
import { Righteous, Lato } from 'next/font/google'
import './globals.css'

const righteous = Righteous({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tiki',
  display: 'swap',
})

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'maisonno — le lounge',
  description: 'Projets perso & expérimentations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${righteous.variable} ${lato.variable}`}>
      <body>{children}</body>
    </html>
  )
}
