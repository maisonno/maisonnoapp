import type { Metadata } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'
import './analyse.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Analyse des services — La Pomme d\'Adam',
}

export default function AnalyseLayout({ children }: { children: React.ReactNode }) {
  return <div className={`ana-scope ${bricolage.variable}`}>{children}</div>
}
