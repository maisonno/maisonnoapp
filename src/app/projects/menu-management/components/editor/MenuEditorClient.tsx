'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { removeDishFromMenu, reorderMenuItems, toggleFeatured } from '../../actions'
import type { Dish, MenuWithItems, DishCategory } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'
import DishPickerModal from './DishPickerModal'
import DishFormModal from '../dishes/DishFormModal'

type Props = {
  menu: MenuWithItems
  allDishes: Dish[]
}

type MenuItem = MenuWithItems['items'][number]

const CATEGORY_ADD_LABEL: Record<DishCategory, string> = {
  entree: 'une entrée',
  a_partager: 'un plat à partager',
  plat: 'un plat',
  pizza: 'une pizza',
  salade: 'une salade',
  dessert: 'un dessert',
  glace: 'une glace',
}

// Sortable item row
function SortableItem({
  item,
  isPending,
  onToggleFeatured,
  onEdit,
  onRemove,
}: {
  item: MenuItem
  isPending: boolean
  onToggleFeatured: (id: string, current: boolean) => void
  onEdit: (dish: Dish) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-sm touch-none"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        disabled={isPending}
        className="shrink-0 cursor-grab active:cursor-grabbing rounded p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"
        title="Réordonner"
        aria-label="Réordonner"
      >
        <GripIcon />
      </button>

      {/* Dish info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-800 text-sm">{item.dish.name}</span>
        {item.dish.price !== null && (
          <span className="ml-2 text-xs text-gray-500">{item.dish.price.toFixed(2)} €</span>
        )}
        {item.dish.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.dish.description}</p>
        )}
      </div>

      {/* Featured toggle */}
      <button
        onClick={() => onToggleFeatured(item.id, item.is_featured)}
        disabled={isPending}
        title={item.is_featured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
        className="shrink-0 p-1 text-amber-400 hover:text-amber-500 disabled:opacity-30"
      >
        {item.is_featured ? <StarFilled /> : <StarOutline />}
      </button>

      {/* Edit dish */}
      <button
        onClick={() => onEdit(item.dish)}
        className="shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
        title="Modifier le plat"
      >
        <PencilIcon />
      </button>

      {/* Remove from menu */}
      <button
        onClick={() => onRemove(item.id)}
        disabled={isPending}
        className="shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
        title="Retirer du menu"
      >
        <XIcon />
      </button>
    </div>
  )
}

export default function MenuEditorClient({ menu, allDishes }: Props) {
  const [pickerCategory, setPickerCategory] = useState<DishCategory | null>(null)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [showCreateDish, setShowCreateDish] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Local state for optimistic reorder — per category
  const [localItems, setLocalItems] = useState(menu.items)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  )

  const assignedDishIds = new Set(localItems.map((i) => i.dish_id))

  const grouped = CATEGORY_ORDER.reduce<Record<DishCategory, typeof localItems>>((acc, cat) => {
    acc[cat] = localItems.filter((i) => i.dish.category === cat).sort((a, b) => a.position - b.position)
    return acc
  }, {} as Record<DishCategory, typeof localItems>)

  const handleDragEnd = (event: DragEndEvent, cat: DishCategory) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const catItems = grouped[cat]
    const oldIndex = catItems.findIndex((i) => i.id === active.id)
    const newIndex = catItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(catItems, oldIndex, newIndex)

    // Optimistic update
    setLocalItems((prev) => {
      const otherItems = prev.filter((i) => i.dish.category !== cat)
      return [...otherItems, ...reordered]
    })

    startTransition(async () => {
      await reorderMenuItems(reordered.map((i) => i.id))
    })
  }

  const handleRemove = (itemId: string) => {
    setLocalItems((prev) => prev.filter((i) => i.id !== itemId))
    startTransition(async () => {
      const result = await removeDishFromMenu(itemId)
      if (result?.error) alert(result.error)
    })
  }

  const handleToggleFeatured = (itemId: string, current: boolean) => {
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_featured: !current } : i)),
    )
    startTransition(async () => { await toggleFeatured(itemId, current) })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{localItems.length} plat(s) dans ce menu</p>
        <button
          onClick={() => setShowCreateDish(true)}
          className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          + Créer un nouveau plat
        </button>
      </div>

      <div className={`space-y-5 transition-opacity ${isPending ? 'opacity-70' : ''}`}>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat]
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {CATEGORY_LABELS[cat]}{items.length > 0 ? ` (${items.length})` : ''}
                </h3>
                <button
                  onClick={() => setPickerCategory(cat)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  + Ajouter {CATEGORY_ADD_LABEL[cat]}
                </button>
              </div>

              {items.length === 0 ? (
                <p className="py-2 text-xs text-gray-300 italic">Aucun plat dans cette catégorie</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, cat)}
                >
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          isPending={isPending}
                          onToggleFeatured={handleToggleFeatured}
                          onEdit={setEditingDish}
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )
        })}
      </div>

      {pickerCategory !== null && (
        <DishPickerModal
          menuId={menu.id}
          assignedDishIds={assignedDishIds}
          dishes={allDishes}
          defaultCategory={pickerCategory}
          onClose={() => setPickerCategory(null)}
        />
      )}
      {editingDish && <DishFormModal dish={editingDish} onClose={() => setEditingDish(null)} />}
      {showCreateDish && <DishFormModal onClose={() => setShowCreateDish(false)} />}
    </div>
  )
}

function GripIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function StarFilled() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function StarOutline() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}
