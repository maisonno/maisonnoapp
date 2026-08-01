import Link from 'next/link'
import { Suspense } from 'react'
import TabBar from './TabBar'

export default function PageHeader({ sub }: { sub?: string }) {
  return (
    <>
      <header>
        <div className="topnav">
          <Link href="/">← Accueil</Link>
          <span className="sep">/</span>
          <span>Analyse des services</span>
        </div>
        <div className="eyebrow">La Pomme d&apos;Adam · Île du Levant</div>
        <h1>
          Analyse des <span className="blue">services</span>
        </h1>
        {sub ? <p className="sub">{sub}</p> : null}
        <div className="triline">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
      </header>
      <Suspense fallback={<div className="anatabs" />}>
        <TabBar />
      </Suspense>
    </>
  )
}
