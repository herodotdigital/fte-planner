import { formatMonthLabel } from "@/lib/timeline";
import { DEVIATION_THRESHOLD, type MonthComparison } from "@/lib/timesheet";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/info-hint";

const statusMeta = {
  under: { label: "Poniżej planu", variant: "warning" as const },
  over: { label: "Powyżej planu", variant: "destructive" as const },
  ok: { label: "Zgodnie z planem", variant: "secondary" as const },
  unplanned: { label: "Bez planu", variant: "warning" as const },
  empty: { label: "—", variant: "outline" as const },
};

function formatDeviation(deviation: number | null): string {
  if (deviation === null) return "—";
  const percent = Math.round(deviation * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

export function PlanVsActual({
  months,
  summary,
}: {
  months: MonthComparison[];
  summary: {
    plannedHours: number;
    reportedHours: number;
    diffHours: number;
    deviation: number | null;
    monthsOffPlan: string[];
  };
}) {
  const nothingReported = summary.reportedHours === 0;

  return (
    <div data-section="plan-vs-actual" className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        Plan vs wykonanie
        <InfoHint label="Jak liczymy plan vs wykonanie">
          Plan to godziny wynikające z obsady: FTE razy pokryte dni robocze razy
          8 h. Wykonanie to godziny zaraportowane w zakładce Czas pracy, wyłącznie
          w kategorii projektowej — urlop i zwolnienie tu nie wchodzą. Miesiąc
          jest oznaczany, gdy odchylenie przekracza{" "}
          {Math.round(DEVIATION_THRESHOLD * 100)}% w którąkolwiek stronę; bez
          progu każdy projekt świeciłby na czerwono, bo plan nigdy nie zgadza się
          co do godziny.
        </InfoHint>
      </h2>

      {nothingReported ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nikt jeszcze nie zaraportował czasu na ten projekt. Plan opiewa na{" "}
          {summary.plannedHours} h.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Plan" value={`${summary.plannedHours} h`} />
            <Tile label="Wykonanie" value={`${summary.reportedHours} h`} />
            <Tile
              label="Różnica"
              value={`${summary.diffHours > 0 ? "+" : ""}${summary.diffHours} h`}
              tone={summary.diffHours === 0 ? "default" : "warn"}
            />
            <Tile
              label="Odchylenie"
              value={formatDeviation(summary.deviation)}
              tone={
                summary.deviation !== null &&
                Math.abs(summary.deviation) > DEVIATION_THRESHOLD
                  ? "warn"
                  : "default"
              }
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="p-2.5 text-left font-medium">Miesiąc</th>
                  <th className="p-2.5 text-right font-medium">Plan</th>
                  <th className="p-2.5 text-right font-medium">Wykonanie</th>
                  <th className="p-2.5 text-right font-medium">Różnica</th>
                  <th className="p-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="p-2.5 capitalize">{formatMonthLabel(m.month)}</td>
                    <td className="p-2.5 text-right tabular-nums">{m.plannedHours}</td>
                    <td className="p-2.5 text-right tabular-nums">{m.reportedHours}</td>
                    <td
                      className={cn(
                        "p-2.5 text-right tabular-nums",
                        m.status === "over" && "text-destructive",
                        m.status === "under" && "text-amber-600 dark:text-amber-500"
                      )}
                    >
                      {m.diffHours > 0 ? "+" : ""}
                      {m.diffHours}
                    </td>
                    <td className="p-2.5">
                      <Badge variant={statusMeta[m.status].variant}>
                        {statusMeta[m.status].label}
                        {m.deviation !== null && m.status !== "ok" && (
                          <span className="tabular-nums">
                            {" "}
                            · {formatDeviation(m.deviation)}
                          </span>
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-medium tabular-nums",
          tone === "warn" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}
