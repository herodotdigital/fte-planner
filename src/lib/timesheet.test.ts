import { describe, expect, it } from "vitest";

import { parseYmd } from "@/lib/timeline";
import {
  DEVIATION_THRESHOLD,
  compareMonth,
  compareMonths,
  plannedHoursInMonth,
  reportedHoursInMonth,
  summarize,
  type TimeEntryLike,
} from "@/lib/timesheet";

const d = parseYmd;

describe("plannedHoursInMonth", () => {
  it("liczy godziny z planu dla pełnego miesiąca", () => {
    // Lipiec 2026 ma 23 dni robocze → 1.0 FTE to 184 godziny.
    expect(
      plannedHoursInMonth(
        [{ startDate: d("2026-07-01"), endDate: d("2026-07-31"), fte: 1 }],
        "2026-07"
      )
    ).toBe(184);
  });

  it("przydział na część miesiąca planuje proporcjonalnie mniej", () => {
    expect(
      plannedHoursInMonth(
        [{ startDate: d("2026-07-12"), endDate: d("2026-07-26"), fte: 1 }],
        "2026-07"
      )
    ).toBe(80);
  });

  it("sumuje wiele przydziałów", () => {
    expect(
      plannedHoursInMonth(
        [
          { startDate: d("2026-07-01"), endDate: d("2026-07-31"), fte: 0.5 },
          { startDate: d("2026-07-01"), endDate: d("2026-07-31"), fte: 0.5 },
        ],
        "2026-07"
      )
    ).toBe(184);
  });
});

describe("reportedHoursInMonth", () => {
  const entries: TimeEntryLike[] = [
    { date: d("2026-07-06"), hours: 8, category: "project" },
    { date: d("2026-07-07"), hours: 6, category: "project" },
    { date: d("2026-07-08"), hours: 8, category: "leave" },
    { date: d("2026-07-09"), hours: 8, category: "sick" },
    { date: d("2026-08-03"), hours: 8, category: "project" },
  ];

  it("sumuje wyłącznie godziny projektowe z danego miesiąca", () => {
    expect(reportedHoursInMonth(entries, "2026-07")).toBe(14);
  });

  it("urlop i zwolnienie nie obciążają projektu", () => {
    const tylkoNieobecnosci = entries.filter((e) => e.category !== "project");
    expect(reportedHoursInMonth(tylkoNieobecnosci, "2026-07")).toBe(0);
  });

  it("nie miesza miesięcy", () => {
    expect(reportedHoursInMonth(entries, "2026-08")).toBe(8);
  });
});

describe("compareMonth", () => {
  it("mieści się w progu → status ok", () => {
    const c = compareMonth("2026-07", 100, 110);
    expect(c.deviation).toBe(0.1);
    expect(c.status).toBe("ok");
  });

  it("dokładnie na progu jeszcze nie alarmuje", () => {
    expect(compareMonth("2026-07", 100, 120).status).toBe("ok");
    expect(compareMonth("2026-07", 100, 80).status).toBe("ok");
  });

  it("powyżej progu w górę → over, w dół → under", () => {
    expect(compareMonth("2026-07", 100, 121).status).toBe("over");
    expect(compareMonth("2026-07", 100, 79).status).toBe("under");
  });

  it("godziny bez planu to osobny stan, nie zerowe odchylenie", () => {
    const c = compareMonth("2026-07", 0, 40);
    expect(c.deviation).toBeNull();
    expect(c.status).toBe("unplanned");
  });

  it("brak planu i brak godzin to pusty miesiąc", () => {
    expect(compareMonth("2026-07", 0, 0).status).toBe("empty");
  });

  it("różnica godzin niesie znak: plus znaczy więcej niż w planie", () => {
    expect(compareMonth("2026-07", 100, 130).diffHours).toBe(30);
    expect(compareMonth("2026-07", 100, 70).diffHours).toBe(-30);
  });

  it("próg jest jedną stałą, nie liczbą rozsianą po kodzie", () => {
    expect(DEVIATION_THRESHOLD).toBe(0.2);
  });
});

describe("compareMonths", () => {
  it("zestawia plan z wykonaniem miesiąc po miesiącu", () => {
    const wynik = compareMonths(
      ["2026-07", "2026-08"],
      [{ startDate: d("2026-07-01"), endDate: d("2026-07-31"), fte: 1 }],
      [{ date: d("2026-07-06"), hours: 8, category: "project" }]
    );
    expect(wynik).toHaveLength(2);
    expect(wynik[0].plannedHours).toBe(184);
    expect(wynik[0].reportedHours).toBe(8);
    expect(wynik[0].status).toBe("under");
    // Sierpień bez planu i bez godzin — pusty, a nie „niedowykonany".
    expect(wynik[1].status).toBe("empty");
  });
});

describe("summarize", () => {
  it("liczy procent z sum, nie ze średniej miesięcy", () => {
    const s = summarize([
      compareMonth("2026-07", 100, 50),
      compareMonth("2026-08", 900, 900),
    ]);
    expect(s.plannedHours).toBe(1000);
    expect(s.reportedHours).toBe(950);
    // -5% z sum. Średnia miesięcznych procentów dałaby -25% i wyglądałaby
    // dramatycznie z powodu jednego małego miesiąca.
    expect(s.deviation).toBe(-0.05);
  });

  it("wskazuje miesiące wymagające uwagi", () => {
    const s = summarize([
      compareMonth("2026-07", 100, 50),
      compareMonth("2026-08", 100, 105),
      compareMonth("2026-09", 0, 20),
    ]);
    expect(s.monthsOffPlan).toEqual(["2026-07", "2026-09"]);
  });

  it("bez planu nie produkuje procentu", () => {
    expect(summarize([compareMonth("2026-07", 0, 0)]).deviation).toBeNull();
  });
});
