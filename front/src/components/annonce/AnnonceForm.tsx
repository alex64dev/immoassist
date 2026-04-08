import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddressAutocomplete } from '@/components/annonce/AddressAutocomplete'
import { PROPERTY_TYPES } from '@/components/annonce/property-types'
import { TONS } from '@/types/annonce'
import {
  annonceFormSchema,
  type AnnonceFormInput,
  type AnnonceFormValues,
} from '@/types/annonce-schema'

const DEFAULT_VALUES: AnnonceFormInput = {
  type: 'appartement',
  surface: 75,
  pieces: 3,
  prix: 250000,
  localisation: 'Paris 11e',
  pointsForts: [
    { value: "Parquet d'origine" },
    { value: 'Balcon plein sud' },
    { value: 'Quartier calme' },
  ],
  ton: 'familial',
}

const MAX_POINTS_FORTS = 5

type Props = {
  onSubmit: (values: AnnonceFormValues) => void | Promise<void>
  isSubmitting: boolean
}

export function AnnonceForm({ onSubmit, isSubmitting }: Props) {
  const form = useForm<AnnonceFormInput, undefined, AnnonceFormValues>({
    resolver: zodResolver(annonceFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pointsForts',
  })

  const { isValid } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type + Localisation */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de bien</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="localisation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localisation</FormLabel>
                <FormControl>
                  <AddressAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Surface + Pièces + Prix */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="surface"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Surface (m²)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pieces"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pièces</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={10000}
                    max={100000000}
                    step={1000}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Points forts (liste dynamique) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Points forts</Label>
            <span className="text-muted-foreground text-xs">
              {fields.length} / {MAX_POINTS_FORTS}
            </span>
          </div>

          <div className="space-y-2">
            {fields.map((fieldItem, index) => (
              <FormField
                key={fieldItem.id}
                control={form.control}
                name={`pointsForts.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder={`Point fort ${index + 1}`}
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label="Supprimer ce point fort"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ value: '' })}
            disabled={fields.length >= MAX_POINTS_FORTS}
          >
            <Plus className="mr-1 size-4" />
            Ajouter un point fort
          </Button>
        </div>

        {/* Ton */}
        <FormField
          control={form.control}
          name="ton"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ton de l'annonce</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un ton" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Générer l'annonce
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
