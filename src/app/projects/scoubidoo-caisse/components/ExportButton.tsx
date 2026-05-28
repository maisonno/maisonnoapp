'use client'

import { useState } from 'react'
import { exportCaisseCSV } from '../actions'

export default function ExportButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    const result = await exportCaisseCSV()
    setLoading(false)

    if (result.error || !result.csv) {
      alert(result.error ?? 'Erreur lors de l\'export.')
      return
    }

    const bom = '﻿'
    const blob = new Blob([bom + result.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caisse_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
    >
      {loading ? '…' : '↓ CSV'}
    </button>
  )
}
