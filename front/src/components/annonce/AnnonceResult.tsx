import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, FileText, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Annonce } from '@/types/annonce'

type Props = {
  state: 'idle' | 'loading' | 'success'
  annonce: Annonce | null
}

export function AnnonceResult({ state, annonce }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!annonce?.contenu) return
    try {
      await navigator.clipboard.writeText(annonce.contenu)
      setCopied(true)
      toast.success('Annonce copiée dans le presse-papier')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-muted-foreground size-4" />
          Annonce générée
        </CardTitle>
        {state === 'success' && annonce?.contenu && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            aria-label="Copier l'annonce"
          >
            {copied ? (
              <Check className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="ml-1.5">{copied ? 'Copié' : 'Copier'}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm"
            >
              <FileText className="size-10 opacity-30" />
              <p>
                Remplis le formulaire et clique sur{' '}
                <span className="font-medium">Générer l'annonce</span> pour
                voir le résultat ici.
              </p>
            </motion.div>
          )}

          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[97%]" />
              <Skeleton className="h-4 w-[88%]" />
              <Skeleton className="h-4 w-[94%]" />
              <Skeleton className="h-4 w-2/3" />
            </motion.div>
          )}

          {state === 'success' && annonce?.contenu && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {annonce.contenu}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
