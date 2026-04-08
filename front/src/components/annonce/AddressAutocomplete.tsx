import { Loader2, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'

type AddressFeature = {
  properties: {
    label: string
    city?: string
    postcode?: string
  }
}

type Props = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
}

const API_URL = 'https://api-adresse.data.gouv.fr/search/'
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

export function AddressAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = 'Commence à taper une adresse...',
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Marqueur posé après une sélection : empêche le useEffect de relancer
  // une recherche à la prochaine prop change synchrone.
  const skipNextFetch = useRef(false)

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }

    const query = value.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `${API_URL}?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('Erreur API Adresse')
        const data: { features: AddressFeature[] } = await res.json()
        setSuggestions(data.features ?? [])
        setOpen(data.features.length > 0)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([])
          setOpen(false)
        }
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [value])

  const handleSelect = (label: string) => {
    skipNextFetch.current = true
    onChange(label)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete="off"
            className="pr-8"
          />
          {loading && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="space-y-0.5">
          {suggestions.map((feat, idx) => (
            <li key={`${feat.properties.label}-${idx}`}>
              <button
                type="button"
                onClick={() => handleSelect(feat.properties.label)}
                className="hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors"
              >
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>{feat.properties.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
