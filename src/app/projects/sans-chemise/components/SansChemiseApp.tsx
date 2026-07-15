'use client'

import { useState } from 'react'
import type { Article, Modele, ModeleWithArticles, Mouvement, Vente } from '../lib/types'
import SaleEntry from './SaleEntry'
import SalesList from './SalesList'
import StockView from './StockView'
import ModelesView from './ModelesView'

type Tab = 'vente' | 'ventes' | 'stock' | 'modeles'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'vente', label: 'Vendre', icon: '🛍️' },
  { key: 'ventes', label: 'Ventes', icon: '📋' },
  { key: 'stock', label: 'Stock', icon: '📦' },
  { key: 'modeles', label: 'Modèles', icon: '👕' },
]

type Props = {
  initialTab?: string
  modelesStock: ModeleWithArticles[]
  modeles: Modele[]
  articles: (Article & { modele_nom: string })[]
  ventes: Vente[]
  mouvements: Mouvement[]
}

export default function SansChemiseApp({ initialTab, modelesStock, modeles, articles, ventes, mouvements }: Props) {
  const [tab, setTab] = useState<Tab>(
    (['vente', 'ventes', 'stock', 'modeles'].includes(initialTab ?? '') ? initialTab : 'vente') as Tab,
  )

  return (
    <>
      <div className="min-h-[60vh]">
        {tab === 'vente' && <SaleEntry articles={articles} />}
        {tab === 'ventes' && <SalesList ventes={ventes} modeles={modelesStock} />}
        {tab === 'stock' && <StockView articles={articles} mouvements={mouvements} />}
        {tab === 'modeles' && <ModelesView modeles={modeles} />}
      </div>

      {/* Barre de navigation fixe en bas — ergonomie mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
