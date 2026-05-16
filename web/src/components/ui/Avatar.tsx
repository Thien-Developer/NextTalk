import Image from 'next/image'
import { clsx } from 'clsx'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
}

const sizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 }
const textSizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' }

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function getColor(name: string) {
  const colors = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#1ABC9C','#3498DB','#9B59B6','#E91E63']
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const px = sizes[size]

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="rounded-full object-cover"
          style={{ width: px, height: px }}
        />
      ) : (
        <div
          className={clsx('rounded-full flex items-center justify-center font-semibold text-white', textSizes[size])}
          style={{ width: px, height: px, backgroundColor: getColor(name) }}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-bg-primary',
            online ? 'bg-status-online' : 'bg-status-offline',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
          )}
        />
      )}
    </div>
  )
}
