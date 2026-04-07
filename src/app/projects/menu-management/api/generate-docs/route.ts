import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'

type RequestBody = {
  menuId: string
  templateId: string
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

  const { menuId, templateId } = body
  if (!menuId || !templateId) {
    return NextResponse.json({ error: 'menuId et templateId sont requis.' }, { status: 400 })
  }

  // Fetch template record
  const { data: templateRecord, error: templateErr } = await supabase
    .from('mnu_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateErr || !templateRecord) {
    return NextResponse.json({ error: 'Modèle introuvable.' }, { status: 404 })
  }

  if (!templateRecord.storage_path) {
    return NextResponse.json({ error: 'Ce modèle n\'a pas de fichier .docx associé.' }, { status: 400 })
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

  const dishesForCat = (cat: string) =>
    items
      .filter((i) => i.dish.category === cat)
      .map((i) => ({
        name: i.dish.name,
        description: i.dish.description ?? '',
        price: i.dish.price !== null ? `${Number(i.dish.price).toFixed(2)} €` : '',
        is_featured: i.is_featured,
      }))

  const templateData = {
    menu_label: menu.label,
    menu_date: menuDate,
    notes: menu.notes ?? '',
    categories,
    entrees:    dishesForCat('entree'),
    a_partager: dishesForCat('a_partager'),
    plats:      dishesForCat('plat'),
    pizzas:     dishesForCat('pizza'),
    salades:    dishesForCat('salade'),
    desserts:   dishesForCat('dessert'),
    glaces:     dishesForCat('glace'),
    has_entrees:    items.some((i) => i.dish.category === 'entree'),
    has_a_partager: items.some((i) => i.dish.category === 'a_partager'),
    has_plats:      items.some((i) => i.dish.category === 'plat'),
    has_pizzas:     items.some((i) => i.dish.category === 'pizza'),
    has_salades:    items.some((i) => i.dish.category === 'salade'),
    has_desserts:   items.some((i) => i.dish.category === 'dessert'),
    has_glaces:     items.some((i) => i.dish.category === 'glace'),
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

  // Download .docx template from Supabase Storage
  const { data: templateFileData, error: downloadErr } = await supabase.storage
    .from('templates')
    .download(templateRecord.storage_path)

  if (downloadErr || !templateFileData) {
    return NextResponse.json(
      { error: `Impossible de télécharger le modèle : ${downloadErr?.message ?? 'fichier introuvable'}` },
      { status: 500 },
    )
  }

  // Fill template with docxtemplater
  let docxBuffer: Buffer
  try {
    const arrayBuffer = await templateFileData.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Return empty string for unknown tags instead of throwing
      nullGetter: () => '',
    })
    doc.render(templateData)
    docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  } catch (err) {
    // docxtemplater throws a structured multi-error — extract details
    let message = 'Erreur docxtemplater.'
    if (err && typeof err === 'object' && 'properties' in err) {
      type DtError = { message: string; properties?: { id?: string; xtag?: string; offset?: number } }
      const props = (err as { properties?: { errors?: DtError[] } }).properties
      if (props?.errors?.length) {
        message = props.errors.map((e) => {
          const tag = e.properties?.xtag ? ` (balise: {${e.properties.xtag}})` : ''
          return `${e.message}${tag}`
        }).join(' | ')
      }
    } else if (err instanceof Error) {
      message = err.message
    }
    return NextResponse.json({ error: `Erreur génération DOCX : ${message}` }, { status: 500 })
  }

  // Upload filled DOCX to Supabase Storage
  const timestamp = Date.now()
  const safeName = templateRecord.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const docxStoragePath = `${menuId}/${safeName}-${timestamp}.docx`
  const pdfStoragePath = `${menuId}/${safeName}-${timestamp}.pdf`

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
  let pdfWarning: string | null = null
  const gotenbergUrl = process.env.GOTENBERG_URL

  if (gotenbergUrl) {
    try {
      const formData = new FormData()
      const docxBlob = new Blob([new Uint8Array(docxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      formData.append('files', docxBlob, `${safeName}.docx`)

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
        } else {
          pdfWarning = `Upload PDF : ${pdfUploadErr.message}`
        }
      } else {
        const body = await gotenbergRes.text()
        pdfWarning = `Gotenberg ${gotenbergRes.status} : ${body.slice(0, 200)}`
      }
    } catch (e) {
      pdfWarning = `Gotenberg inaccessible : ${e instanceof Error ? e.message : String(e)}`
    }
  } else {
    pdfWarning = 'GOTENBERG_URL non configuré.'
  }

  // Generate signed URLs (48h)
  const expiry = 48 * 60 * 60

  const { data: docxUrl } = await supabase.storage
    .from('generated-docs')
    .createSignedUrl(docxStoragePath, expiry)

  const pdfSignedUrl = pdfStoragePathFinal
    ? (await supabase.storage.from('generated-docs').createSignedUrl(pdfStoragePathFinal, expiry)).data
    : null

  // Record in DB — store template id as template_name for lookup
  const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

  const { data: docRecord, error: dbErr } = await supabase
    .from('mnu_generated_docs')
    .insert({
      menu_id: menuId,
      template_name: templateId,
      docx_path: docxUrl?.signedUrl ?? null,
      pdf_path: pdfSignedUrl?.signedUrl ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (dbErr) {
    return NextResponse.json({ error: `DB insert : ${dbErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ doc: docRecord, pdf_warning: pdfWarning })
}
