import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { TemplateName } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'

type RequestBody = {
  menuId: string
  template: TemplateName
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { menuId, template } = body
  if (!menuId || !template) {
    return NextResponse.json({ error: 'menuId et template sont requis.' }, { status: 400 })
  }

  const validTemplates: TemplateName[] = ['menu-table', 'affiche-facade', 'grande-affiche']
  if (!validTemplates.includes(template)) {
    return NextResponse.json({ error: 'Template inconnu.' }, { status: 400 })
  }

  // Fetch menu + items
  const { data: menu, error: menuErr } = await supabase
    .from('mnu_menus')
    .select('*')
    .eq('id', menuId)
    .single()

  if (menuErr || !menu) {
    return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 })
  }

  const { data: rawItems } = await supabase
    .from('mnu_menu_items')
    .select('*, dish:mnu_dishes(*)')
    .eq('menu_id', menuId)
    .order('position')

  const items = (rawItems ?? []).sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.dish.category)
    const catB = CATEGORY_ORDER.indexOf(b.dish.category)
    if (catA !== catB) return catA - catB
    return a.position - b.position
  })

  // Build template data
  const menuDate = new Date(menu.menu_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const categories = CATEGORY_ORDER
    .map((cat) => {
      const catItems = items.filter((i) => i.dish.category === cat)
      if (catItems.length === 0) return null
      return {
        label: CATEGORY_LABELS[cat],
        dishes: catItems.map((i) => ({
          name: i.dish.name,
          description: i.dish.description ?? '',
          price: i.dish.price !== null ? `${Number(i.dish.price).toFixed(2)} €` : '',
          is_featured: i.is_featured,
        })),
      }
    })
    .filter(Boolean)

  const templateData = {
    menu_label: menu.label,
    menu_date: menuDate,
    notes: menu.notes ?? '',
    categories,
    featured_dishes: items
      .filter((i) => i.is_featured)
      .map((i) => ({
        name: i.dish.name,
        description: i.dish.description ?? '',
        price: i.dish.price !== null ? `${Number(i.dish.price).toFixed(2)} €` : '',
        category: CATEGORY_LABELS[i.dish.category as keyof typeof CATEGORY_LABELS],
      })),
    has_featured: items.some((i) => i.is_featured),
    all_dishes: items.map((i) => ({
      name: i.dish.name,
      description: i.dish.description ?? '',
      price: i.dish.price !== null ? `${Number(i.dish.price).toFixed(2)} €` : '',
      category: CATEGORY_LABELS[i.dish.category as keyof typeof CATEGORY_LABELS],
      is_featured: i.is_featured,
    })),
  }

  // Load .docx template
  const templatePath = path.join(process.cwd(), 'public', 'templates', `${template}.docx`)

  if (!fs.existsSync(templatePath)) {
    return NextResponse.json(
      { error: `Template "${template}.docx" introuvable dans public/templates/. Veuillez l'uploader.` },
      { status: 500 },
    )
  }

  let docxBuffer: Buffer
  try {
    const content = fs.readFileSync(templatePath)
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })
    doc.render(templateData)
    docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur docxtemplater.'
    return NextResponse.json({ error: `Erreur génération DOCX : ${message}` }, { status: 500 })
  }

  // Upload DOCX to Supabase Storage
  const timestamp = Date.now()
  const docxStoragePath = `${menuId}/${template}-${timestamp}.docx`
  const pdfStoragePath = `${menuId}/${template}-${timestamp}.pdf`

  const { error: docxUploadErr } = await supabase.storage
    .from('generated-docs')
    .upload(docxStoragePath, docxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })

  if (docxUploadErr) {
    return NextResponse.json({ error: `Upload DOCX : ${docxUploadErr.message}` }, { status: 500 })
  }

  // Convert to PDF via Gotenberg
  let pdfStoragePathFinal: string | null = null
  const gotenbergUrl = process.env.GOTENBERG_URL

  if (gotenbergUrl) {
    try {
      const formData = new FormData()
      const docxBlob = new Blob([new Uint8Array(docxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      formData.append('files', docxBlob, `${template}.docx`)

      const gotenbergRes = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
        method: 'POST',
        body: formData,
      })

      if (gotenbergRes.ok) {
        const pdfBuffer = Buffer.from(await gotenbergRes.arrayBuffer())
        const { error: pdfUploadErr } = await supabase.storage
          .from('generated-docs')
          .upload(pdfStoragePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false,
          })

        if (!pdfUploadErr) {
          pdfStoragePathFinal = pdfStoragePath
        }
      }
    } catch {
      // PDF generation failed — continue without PDF (DOCX still available)
    }
  }

  // Generate signed URLs (48h)
  const expiry = 48 * 60 * 60

  const { data: docxUrl } = await supabase.storage
    .from('generated-docs')
    .createSignedUrl(docxStoragePath, expiry)

  const pdfSignedUrl = pdfStoragePathFinal
    ? (await supabase.storage.from('generated-docs').createSignedUrl(pdfStoragePathFinal, expiry)).data
    : null

  // Record in DB
  const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

  const { data: docRecord, error: dbErr } = await supabase
    .from('mnu_generated_docs')
    .insert({
      menu_id: menuId,
      template_name: template,
      docx_path: docxUrl?.signedUrl ?? null,
      pdf_path: pdfSignedUrl?.signedUrl ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (dbErr) {
    return NextResponse.json({ error: `DB insert : ${dbErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ doc: docRecord })
}
