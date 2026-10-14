"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createTimeEntry } from "@/app/actions/time";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { TIME_CATEGORIES, timeCategoryLabels } from "@/lib/validation/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

export function TimeEntryForm({
  people,
  roles,
  defaultDate,
}: {
  people: Option[];
  roles: Option[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(createTimeEntry, undefined);
  const [formKey, setFormKey] = useState(0);
  // Kategoria steruje tym, czy rola jest w ogóle wybierana — urlop nie jest
  // księgowany na projekt, więc pole roli znika, zamiast być ignorowane.
  const [category, setCategory] = useState<string>("project");

  useActionEffect(state, (s) => {
    if (s?.success) setFormKey((k) => k + 1);
  });

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId">Pracownik</Label>
          <Select name="userId">
            <SelectTrigger id="userId">
              <SelectValue placeholder="Wybierz" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.userId && (
            <p className="text-sm text-destructive">{state.errors.userId[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Kategoria</Label>
          <Select name="category" defaultValue="project" onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {timeCategoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category === "project" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="projectRoleId">Projekt i rola</Label>
            <Select name="projectRoleId">
              <SelectTrigger id="projectRoleId">
                <SelectValue placeholder="Wybierz" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.projectRoleId && (
              <p className="text-sm text-destructive">{state.errors.projectRoleId[0]}</p>
            )}
          </div>
        ) : (
          <div className="flex items-end text-sm text-muted-foreground">
            Nie jest księgowane na projekt.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Dzień</Label>
          <Input id="date" name="date" type="date" defaultValue={defaultDate} />
          {state?.errors?.date && (
            <p className="text-sm text-destructive">{state.errors.date[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hours">Godziny</Label>
          <Input
            id="hours"
            name="hours"
            type="number"
            step="0.25"
            min="0"
            max="24"
            placeholder="8"
          />
          {state?.errors?.hours && (
            <p className="text-sm text-destructive">{state.errors.hours[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="note">Notatka (opcjonalnie)</Label>
          <Input id="note" name="note" placeholder="np. czego dotyczyły godziny" />
        </div>
        <Button type="submit" disabled={pending}>
          <Plus />
          {pending ? "Zapisywanie…" : "Dodaj wpis"}
        </Button>
      </div>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
