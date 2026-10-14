// Zestawienie planu z wykonaniem. Warstwa czysta — bez bazy i bez Next.js.
//
// Plan i wykonanie celowo mieszkają w osobnych tabelach i są tu zestawiane
// dopiero na końcu. Gdyby jedno nadpisywało drugie, zniknęłoby pytanie, na
// które ta warstwa ma odpowiadać: czy pracowaliśmy tak, jak zaplanowaliśmy.

import { assignmentHoursInMonth } from "@/lib/cost";
import { ym } from "@/lib/timeline";

/**
 * Od jakiego odchylenia od planu miesiąc wymaga uwagi. Bez progu każdy projekt
 * świeciłby na czerwono, bo plan nigdy nie zgadza się co do godziny.
 */
export const DEVIATION_THRESHOLD = 0.2;

/** Kategorie czasu, które obciążają projekt. Reszta domyka dzień pracownika. */
export type TimeCategory = "project" | "leave" | "sick" | "other";

export type TimeEntryLike = {
  date: Date;
  hours: number;
  category: TimeCategory;
};

export type PlannedAssignment = {
  startDate: Date;
  endDate: Date;
  fte: number;
};

/** Godziny zaplanowane w danym miesiącu, ze wszystkich przydziałów. */
export function plannedHoursInMonth(
  assignments: PlannedAssignment[],
  month: string
): number {
  const total = assignments.reduce(
    (sum, a) => sum + assignmentHoursInMonth(a, month),
    0
  );
  return Math.round(total * 100) / 100;
}

/**
 * Godziny zaraportowane w danym miesiącu. Liczymy wyłącznie kategorię
 * projektową — urlop i zwolnienie są w tej samej tabeli, żeby dzień się
 * domykał, ale projektu nie kosztują.
 */
export function reportedHoursInMonth(
  entries: TimeEntryLike[],
  month: string
): number {
  const total = entries
    .filter((e) => e.category === "project" && ym(e.date) === month)
    .reduce((sum, e) => sum + e.hours, 0);
  return Math.round(total * 100) / 100;
}

export type ComparisonStatus =
  /** Zaraportowano wyraźnie mniej, niż zaplanowano. */
  | "under"
  /** Mieści się w progu. */
  | "ok"
  /** Zaraportowano wyraźnie więcej, niż zaplanowano. */
  | "over"
  /** Są godziny, ale nie było planu — nie ma do czego ich odnieść. */
  | "unplanned"
  /** Ani planu, ani godzin. */
  | "empty";

export type MonthComparison = {
  month: string;
  plannedHours: number;
  reportedHours: number;
  /** Różnica w godzinach: dodatnia = zrobiono więcej, niż planowano. */
  diffHours: number;
  /** Odchylenie jako ułamek planu. null, gdy planu nie było. */
  deviation: number | null;
  status: ComparisonStatus;
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Zestawienie jednego miesiąca. */
export function compareMonth(
  month: string,
  plannedHours: number,
  reportedHours: number
): MonthComparison {
  const diffHours = round2(reportedHours - plannedHours);

  if (plannedHours === 0) {
    return {
      month,
      plannedHours,
      reportedHours,
      diffHours,
      deviation: null,
      // Godziny bez planu to nie jest „zero odchylenia" — to sytuacja, o
      // której trzeba powiedzieć wprost, bo procent by tu skłamał.
      status: reportedHours === 0 ? "empty" : "unplanned",
    };
  }

  const deviation = round2(diffHours / plannedHours);
  const status =
    deviation > DEVIATION_THRESHOLD
      ? "over"
      : deviation < -DEVIATION_THRESHOLD
        ? "under"
        : "ok";

  return { month, plannedHours, reportedHours, diffHours, deviation, status };
}

/** Zestawienie po miesiącach dla jednego projektu. */
export function compareMonths(
  months: string[],
  assignments: PlannedAssignment[],
  entries: TimeEntryLike[]
): MonthComparison[] {
  return months.map((month) =>
    compareMonth(
      month,
      plannedHoursInMonth(assignments, month),
      reportedHoursInMonth(entries, month)
    )
  );
}

export type ComparisonSummary = {
  plannedHours: number;
  reportedHours: number;
  diffHours: number;
  deviation: number | null;
  /** Miesiące wymagające uwagi — przekraczające próg w którąkolwiek stronę. */
  monthsOffPlan: string[];
};

/**
 * Podsumowanie całego okresu. Procent liczymy z sum, a nie ze średniej
 * miesięcznych procentów — inaczej miesiąc z jedną zaraportowaną godziną
 * ważyłby tyle samo co miesiąc pełnego zespołu.
 */
export function summarize(months: MonthComparison[]): ComparisonSummary {
  const plannedHours = round2(months.reduce((s, m) => s + m.plannedHours, 0));
  const reportedHours = round2(months.reduce((s, m) => s + m.reportedHours, 0));
  const diffHours = round2(reportedHours - plannedHours);

  return {
    plannedHours,
    reportedHours,
    diffHours,
    deviation: plannedHours === 0 ? null : round2(diffHours / plannedHours),
    monthsOffPlan: months
      .filter((m) => m.status === "under" || m.status === "over" || m.status === "unplanned")
      .map((m) => m.month),
  };
}
