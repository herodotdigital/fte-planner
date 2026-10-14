import type { Metadata } from "next";
import { Trash2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/session";
import { deleteTimeEntry } from "@/app/actions/time";
import { monthBounds } from "@/lib/period";
import { formatMonthLabel, ymd, ym } from "@/lib/timeline";
import { timeCategoryLabels, type TimeCategory } from "@/lib/validation/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/info-hint";
import { TimeEntryForm } from "./_components/time-entry-form";

export const metadata: Metadata = {
  title: "Czas pracy — FTE Planner",
};

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireCapability("manageStaffing");

  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : ym(new Date());
  const { first, last } = monthBounds(month);

  const [people, roles, entries] = await Promise.all([
    prisma.user.findMany({
      where: { status: "approved" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.projectRole.findMany({
      orderBy: [{ project: { name: "asc" } }],
      select: {
        id: true,
        project: { select: { name: true } },
        position: { select: { name: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: { date: { gte: first, lte: last } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        hours: true,
        category: true,
        note: true,
        user: { select: { firstName: true, lastName: true } },
        projectRole: {
          select: { project: { select: { name: true } }, position: { select: { name: true } } },
        },
      },
    }),
  ]);

  const totalHours =
    Math.round(entries.reduce((sum, e) => sum + Number(e.hours), 0) * 100) / 100;
  const projectHours =
    Math.round(
      entries
        .filter((e) => e.category === "project")
        .reduce((sum, e) => sum + Number(e.hours), 0) * 100
    ) / 100;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Czas pracy
          <InfoHint label="Jak działa ewidencja czasu">
            Godziny wpisuje menedżer, dzień po dniu. Kategoria projektowa musi
            mieć wskazaną rolę i wchodzi do porównania plan vs wykonanie na
            stronie projektu. Urlop i zwolnienie są tu po to, żeby dzień się
            domykał — projektu nie obciążają. Import z Jiry jest przewidziany w
            modelu, ale jeszcze nie działa; wszystkie wpisy są dziś ręczne.
          </InfoHint>
        </h1>
        <p className="text-muted-foreground">
          {formatMonthLabel(month)} — zaraportowano {totalHours} h, z czego{" "}
          {projectHours} h na projekty.
        </p>
      </div>

      <TimeEntryForm
        people={people.map((p) => ({
          id: p.id,
          label: `${p.firstName} ${p.lastName}`,
        }))}
        roles={roles.map((r) => ({
          id: r.id,
          label: `${r.project.name} · ${r.position.name}`,
        }))}
        defaultDate={ymd(new Date())}
      />

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brak wpisów w tym miesiącu. Dodaj pierwszy powyżej.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="p-2.5 text-left font-medium whitespace-nowrap">Dzień</th>
                <th className="p-2.5 text-left font-medium">Pracownik</th>
                <th className="p-2.5 text-left font-medium">Kategoria</th>
                <th className="p-2.5 text-left font-medium">Projekt i rola</th>
                <th className="p-2.5 text-right font-medium">Godziny</th>
                <th className="p-2.5 text-left font-medium">Notatka</th>
                <th className="w-0 p-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {ymd(e.date)}
                  </td>
                  <td className="p-2.5">
                    {e.user.firstName} {e.user.lastName}
                  </td>
                  <td className="p-2.5">
                    <Badge variant={e.category === "project" ? "secondary" : "outline"}>
                      {timeCategoryLabels[e.category as TimeCategory]}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {e.projectRole
                      ? `${e.projectRole.project.name} · ${e.projectRole.position.name}`
                      : "—"}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">{Number(e.hours)}</td>
                  <td className="p-2.5 text-muted-foreground">{e.note ?? "—"}</td>
                  <td className="p-2.5">
                    <form action={deleteTimeEntry}>
                      <input type="hidden" name="id" value={e.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Usuń wpis"
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
