import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.75 }}
      animate={{ opacity: [0.75, 0.35, 0.75] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      className={cn(
        'relative overflow-hidden rounded bg-muted/40 dark:bg-muted/30',
        className
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
}
