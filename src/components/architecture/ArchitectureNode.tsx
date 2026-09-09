import { Bot, Cable, Database, FolderOpen, Mail, User, type LucideIcon } from 'lucide-react'
import type { ArchitectureIcon, ArchitectureNode as Node } from '../../data/architecture'

const ICONS: Record<ArchitectureIcon, LucideIcon> = {
  database: Database,
  mail: Mail,
  bot: Bot,
  user: User,
  folder: FolderOpen,
  cable: Cable,
}

interface ArchitectureNodeProps {
  node: Node
  active: boolean
  dimmed: boolean
  trigger?: boolean
  compact?: boolean
  nodeRef: (el: HTMLDivElement | null) => void
}

export function ArchitectureNode({
  node,
  active,
  dimmed,
  trigger,
  compact,
  nodeRef,
}: ArchitectureNodeProps) {
  const gap = Boolean(node.gap)
  const Icon = ICONS[node.icon]
  const agent = node.layer === 'agents'

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 shadow-[0_1px_2px_rgba(8,30,50,0.04)] transition-all duration-300 relative z-20 ${
        compact ? 'min-w-0 flex-1 basis-0' : 'min-w-[136px] max-w-[176px]'
      } ${
        trigger
          ? 'border-amber bg-amber-light ring-1 ring-amber/40'
          : gap
            ? 'border-dashed border-rose/70 bg-white'
            : agent
              ? 'border-[#7ec8e8] bg-white'
              : 'border-line bg-white'
      } ${active && trigger ? 'ring-2 ring-amber' : ''} ${
        active && !trigger && !gap ? 'border-ink shadow-[0_0_0_1px_#081e32]' : ''
      } ${active && gap ? 'shadow-[0_0_0_1px_rgba(190,18,60,0.35)]' : ''} ${
        dimmed ? 'opacity-[0.22]' : 'opacity-100'
      }`}
    >
      <Icon
        className={`mt-0.5 size-3.5 shrink-0 ${
          trigger ? 'text-amber' : gap ? 'text-rose' : agent ? 'text-ink' : 'text-ink-soft'
        }`}
      />
      <div className="min-w-0">
        <p className="text-[11px] leading-tight font-semibold text-ink">{node.title}</p>
        <p className={`mt-0.5 text-[10px] leading-snug ${gap ? 'font-medium text-rose' : 'text-muted'}`}>
          {node.subtitle}
        </p>
        {trigger && (
          <span className="mt-1 inline-block rounded-full bg-white/80 px-1.5 text-[9px] font-semibold tracking-wide text-amber uppercase">
            Trigger
          </span>
        )}
      </div>
    </div>
  )
}
