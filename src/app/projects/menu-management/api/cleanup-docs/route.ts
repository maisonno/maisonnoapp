import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Variables d\'env manquantes.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Find expired docs
  const { data: expiredDocs, error: fetchErr } = await supabase
    .from('mnu_generated_docs')
    .select('id, docx_path, pdf_path')
    .lt('expires_at', new Date().toISOString())

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!expiredDocs || expiredDocs.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  // Extract storage paths from signed URLs
  const storagePaths: string[] = []
  for (const doc of expiredDocs) {
    for (const urlField of [doc.docx_path, doc.pdf_path]) {
      if (!urlField) continue
      try {
        const url = new URL(urlField)
        // Supabase signed URL path: /storage/v1/object/sign/bucket/path?token=...
        const match = url.pathname.match(/\/storage\/v1\/object\/sign\/generated-docs\/(.+)/)
        if (match?.[1]) storagePaths.push(decodeURIComponent(match[1]))
      } catch {
        // invalid URL, skip
      }
    }
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from('generated-docs').remove(storagePaths)
  }

  // Delete DB records
  const ids = expiredDocs.map((d) => d.id)
  await supabase.from('mnu_generated_docs').delete().in('id', ids)

  return NextResponse.json({ deleted: ids.length })
}
