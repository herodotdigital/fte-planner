import * as z from "zod";

// Data dzienna — ta sama reguła co przy przydziałach: regex nie odsiewa
// 31 lutego, więc sprawdzamy, czy parser odtworzy dokładnie tę datę.
const day = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    error: "Data w formacie RRRR-MM-DD.",
  })
  .refine(
    (value) => {
      const [y, m, d] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      return parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
    },
    { error: "Taka data nie istnieje." }
  );

export const TIME_CATEGORIES = ["project", "leave", "sick", "other"] as const;
export type TimeCategory = (typeof TIME_CATEGORIES)[number];

export const timeCategoryLabels: Record<TimeCategory, string> = {
  project: "Projekt",
  leave: "Urlop",
  sick: "Zwolnienie",
  other: "Inne",
};

export const TimeEntrySchema = z
  .object({
    userId: z.string().trim().min(1, { error: "Wybierz pracownika." }),
    // Puste pole z formularza (brak wyboru roli) traktujemy jak brak wartości.
    projectRoleId: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
      z.string().nullable()
    ),
    date: day,
    hours: z.coerce
      .number({ error: "Podaj liczbę godzin." })
      .gt(0, { error: "Liczba godzin musi być większa od 0." })
      // Doba ma 24 godziny; wyższa wartość to zawsze pomyłka we wpisie.
      .max(24, { error: "W jednym dniu nie da się zaraportować więcej niż 24 h." }),
    category: z.enum(TIME_CATEGORIES, { error: "Wybierz kategorię." }),
    note: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
      z.string().max(200, { error: "Notatka może mieć najwyżej 200 znaków." }).nullable()
    ),
  })
  // Czas projektowy bez roli nie miałby do czego się przypiąć, a urlop z rolą
  // wchodziłby w koszt projektu — oba przypadki blokujemy tu, a nie w UI.
  .refine((d) => d.category !== "project" || d.projectRoleId !== null, {
    error: "Wybierz projekt i rolę dla czasu projektowego.",
    path: ["projectRoleId"],
  })
  .refine((d) => d.category === "project" || d.projectRoleId === null, {
    error: "Urlop, zwolnienie i „inne” nie są księgowane na projekt.",
    path: ["projectRoleId"],
  });

export type TimeEntryFormState =
  | {
      success?: boolean;
      errors?: {
        userId?: string[];
        projectRoleId?: string[];
        date?: string[];
        hours?: string[];
        category?: string[];
        note?: string[];
      };
      message?: string;
    }
  | undefined;
