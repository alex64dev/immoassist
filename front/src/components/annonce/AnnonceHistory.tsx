import { History, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { deleteAnnonce, listAnnonces } from '@/services/api'
import type { Annonce } from '@/types/annonce'

type Props = {
  refreshKey: number
  onSelect: (annonce: Annonce) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatPrix(prix: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(prix)
}

export function AnnonceHistory({ refreshKey, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<Annonce | null>(null)

  useEffect(() => {
    let cancelled = false
    listAnnonces()
      .then((items) => {
        if (!cancelled) setAnnonces(items)
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de charger l'historique")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleSelect = (annonce: Annonce) => {
    onSelect(annonce)
    setOpen(false)
  }

  const askDelete = (e: React.MouseEvent, annonce: Annonce) => {
    e.stopPropagation()
    setPendingDelete(annonce)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    try {
      await deleteAnnonce(id)
      setAnnonces((prev) => prev.filter((a) => a.id !== id))
      toast.success('Annonce supprimée')
    } catch {
      toast.error('Suppression impossible')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="size-4" />
          Historique
          {annonces.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-xs">
              {annonces.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Annonces générées</SheetTitle>
          <SheetDescription>
            Clique sur une annonce pour la réafficher.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2 overflow-y-auto px-4 pb-6">
          {loading && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Chargement...
            </div>
          )}

          {!loading && annonces.length === 0 && (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Aucune annonce générée pour l'instant.
            </p>
          )}

          {!loading &&
            annonces.map((a) => (
              <div
                key={a.id}
                className="hover:border-foreground/30 hover:bg-muted/50 group relative rounded-lg border p-3 transition"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(a)}
                  className="flex w-full flex-col items-start gap-1 pr-8 text-left"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">
                      {a.type} · {a.surface} m² · {a.pieces} pièces
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
                    <span className="truncate">{a.localisation}</span>
                    <span className="shrink-0 font-medium">
                      {formatPrix(a.prix)}
                    </span>
                  </div>
                  {a.contenu && (
                    <p className="text-muted-foreground/80 mt-1 line-clamp-2 text-xs">
                      {a.contenu}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => askDelete(e, a)}
                  aria-label="Supprimer l'annonce"
                  className="text-muted-foreground hover:text-destructive absolute top-2 right-2 rounded-md p-1.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
        </div>
      </SheetContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  {pendingDelete.type} de {pendingDelete.surface} m² à{' '}
                  {pendingDelete.localisation}. Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
