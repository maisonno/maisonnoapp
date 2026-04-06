import { logout } from '@/app/actions'
import type { User } from '@supabase/supabase-js'

export default function TikiHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-tiki-bamboo/20 bg-tiki-wood/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-6xl h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl select-none">🌴</span>
          <span className="font-tiki text-tiki-gold text-2xl tracking-widest">
            maisonno
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-tiki-mist/50 text-xs font-body hidden sm:block truncate max-w-[180px]">
            {user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-tiki-mist/70 hover:text-tiki-sand text-xs font-body uppercase tracking-wider transition-colors border border-tiki-bamboo/25 hover:border-tiki-bamboo/50 px-3 py-1.5 rounded"
            >
              Sortir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
