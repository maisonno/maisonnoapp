import Link from 'next/link'

type Project = {
  id: string
  title: string
  slug: string
  description: string | null
  tags: string[] | null
  status: string
  url: string | null
  github_url: string | null
  featured: boolean
}

const STATUS = {
  live:     { label: 'Live',     className: 'bg-emerald-950 text-emerald-400 border border-emerald-900' },
  wip:      { label: 'En cours', className: 'bg-blue-950 text-blue-400 border border-blue-900' },
  idea:     { label: 'Idée',     className: 'bg-slate-800 text-slate-400 border border-slate-700' },
  archived: { label: 'Archivé',  className: 'bg-slate-800 text-slate-500 border border-slate-700' },
} as const

export default function ProjectCard({ project }: { project: Project }) {
  const status = STATUS[project.status as keyof typeof STATUS] ?? STATUS.idea
  const href = project.url ?? `/projects/${project.slug}`

  return (
    <Link href={href} className="block group">
      <article className="card p-6 flex flex-col gap-2 h-full cursor-pointer group-hover:border-slate-600">
        {/* Title + GitHub */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-white font-semibold text-base leading-snug group-hover:text-blue-400 transition-colors">
            {project.title}
          </h2>
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-slate-400 text-sm leading-relaxed">
            {project.description}
          </p>
        )}
      </article>
    </Link>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
