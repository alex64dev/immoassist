import { useCallback, useRef, useState } from 'react'

import { createAnnonce } from '@/services/api'
import type { Annonce, CreateAnnoncePayload } from '@/types/annonce'

const MERCURE_URL =
  import.meta.env.VITE_MERCURE_URL ??
  'http://localhost:3002/.well-known/mercure'

// Cadence d'affichage (ms entre deux ticks). À chaque tick, on dépile N caractères
// de la queue selon sa taille pour rattraper si Gemini a pris de l'avance.
const TYPING_INTERVAL_MS = 18

export type GenerationState = 'idle' | 'streaming' | 'success'

type ChunkMessage = { type: 'chunk'; text: string }
type DoneMessage = { type: 'done'; id: number }
type StreamMessage = ChunkMessage | DoneMessage

type GenerateInput = Omit<CreateAnnoncePayload, 'streamId'>

export function useAnnonceGeneration() {
  const [state, setState] = useState<GenerationState>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [annonce, setAnnonce] = useState<Annonce | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const queueRef = useRef<string>('')
  const intervalRef = useRef<number | null>(null)
  const streamFinishedRef = useRef<boolean>(false)
  const finalAnnonceRef = useRef<Annonce | null>(null)

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const startTypingLoop = useCallback(() => {
    if (intervalRef.current !== null) return

    intervalRef.current = window.setInterval(() => {
      const queue = queueRef.current

      if (queue.length === 0) {
        // Plus rien à dépiler. Si le stream est terminé, on finalise.
        if (streamFinishedRef.current) {
          stopInterval()
          if (finalAnnonceRef.current) {
            setAnnonce(finalAnnonceRef.current)
            setStreamingText(finalAnnonceRef.current.contenu ?? '')
          }
          setState('success')
        }
        return
      }

      // Cadence adaptative : si la queue grossit, on dépile plus vite
      // pour ne pas trainer derrière Gemini.
      let charsPerTick = 1
      if (queue.length > 200) charsPerTick = 5
      else if (queue.length > 80) charsPerTick = 3
      else if (queue.length > 30) charsPerTick = 2

      const slice = queue.slice(0, charsPerTick)
      queueRef.current = queue.slice(charsPerTick)
      setStreamingText((prev) => prev + slice)
    }, TYPING_INTERVAL_MS)
  }, [stopInterval])

  const generate = useCallback(
    async (input: GenerateInput): Promise<Annonce> => {
      // Reset complet
      closeStream()
      stopInterval()
      queueRef.current = ''
      streamFinishedRef.current = false
      finalAnnonceRef.current = null

      const streamId = crypto.randomUUID()
      const topic = `annonce/${streamId}`

      const url = new URL(MERCURE_URL)
      url.searchParams.append('topic', topic)
      const es = new EventSource(url.toString())
      eventSourceRef.current = es

      setStreamingText('')
      setAnnonce(null)
      setState('streaming')
      startTypingLoop()

      es.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as StreamMessage
          if (message.type === 'chunk') {
            queueRef.current += message.text
          } else if (message.type === 'done') {
            streamFinishedRef.current = true
            closeStream()
          }
        } catch {
          // ignore malformed messages
        }
      }

      es.onerror = () => {
        // Le finally du POST ferme proprement si nécessaire.
      }

      try {
        const created = await createAnnonce({ ...input, streamId })
        finalAnnonceRef.current = created
        // Le POST renvoie quand le back a fini. Si Mercure n'a pas encore poussé
        // le 'done', on le force ici pour que le typing loop puisse finaliser.
        streamFinishedRef.current = true
        return created
      } catch (err) {
        closeStream()
        stopInterval()
        queueRef.current = ''
        streamFinishedRef.current = false
        finalAnnonceRef.current = null
        setState('idle')
        setStreamingText('')
        throw err
      }
    },
    [closeStream, startTypingLoop, stopInterval],
  )

  const selectAnnonce = useCallback(
    (selected: Annonce) => {
      closeStream()
      stopInterval()
      queueRef.current = ''
      streamFinishedRef.current = false
      finalAnnonceRef.current = null
      setAnnonce(selected)
      setStreamingText(selected.contenu ?? '')
      setState('success')
    },
    [closeStream, stopInterval],
  )

  const reset = useCallback(() => {
    closeStream()
    stopInterval()
    queueRef.current = ''
    streamFinishedRef.current = false
    finalAnnonceRef.current = null
    setState('idle')
    setStreamingText('')
    setAnnonce(null)
  }, [closeStream, stopInterval])

  return { state, streamingText, annonce, generate, selectAnnonce, reset }
}
