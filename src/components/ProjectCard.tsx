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
  live: { label: 'Live', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400' },
  wip: { label: 'En cours', dot: 'bg-tiki-amber', text: 'text-tiki-amber' },
  idea: { label: 'Idée', dot: 'bg-tiki-teal', text: 'text-tiki-aqua' },
  archived: { label: 'Archivé', dot: 'bg-tiki-mist/40', text: 'text-tiki-mist/50' },
} as const

export default function ProjectCard({ project }: { project: Project }) {
  const status = STATUS[project.status as keyof typeof STATUS] ?? STATUS.idea

  return (
    <article className="tiki-card p-6 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
          <span className={`text-xs font-body uppercase tracking-wider ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tiki-mist/40 hover:text-tiki-bamboo transition-colors text-sm"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tiki-mist/40 hover:text-tiki-amber transition-colors text-base leading-none"
              aria-label="Ouvrir le projet"
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="font-tiki text-tiki-sand text-xl group-hover:text-tiki-gold transition-colors leading-tight">
        {project.title}
      </h2>

      {/* Description */}
      {project.description && (
        <p className="text-tiki-mist text-sm font-body leading-relaxed flex-1">
          {project.description}
        </p>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-0.5 rounded-full bg-tiki-bark text-tiki-bamboo border border-tiki-bamboo/25 font-body"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
