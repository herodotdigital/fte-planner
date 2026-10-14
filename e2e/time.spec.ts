import { expect, test } from "@playwright/test";
import { Client } from "pg";

// Wpisy czasu sprzątamy po notatce — ta sama konwencja co reszta danych e2e,
// które żyją we wspólnej bazie.
const NOTE = "e2e-czas-pracy";

// Data MUSI być z bieżącego miesiąca: ekran pokazuje jeden miesiąc naraz, a
// wpisy do miesięcy zamkniętych są blokowane. Sztywna data przestaje działać
// z dnia na dzień, co już raz wywróciło te testy.
const DZIS = new Date().toISOString().slice(0, 10);

async function sql(q: string, params: unknown[] = []) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(q, params)).rows;
  } finally {
    await client.end();
  }
}

test.afterAll(async () => {
  await sql(`DELETE FROM "TimeEntry" WHERE note = $1`, [NOTE]);
});

test("zaraportowany czas pojawia się w zestawieniu plan vs wykonanie", async ({
  page,
}) => {
  await page.goto("/app/czas");

  await page.getByLabel("Pracownik").click();
  await page.getByRole("option").first().click();

  await page.getByLabel("Projekt i rola").click();
  const rola = page.getByRole("option").first();
  const projekt = ((await rola.textContent()) ?? "").split("·")[0].trim();
  await rola.click();

  await page.getByLabel("Dzień").fill(DZIS);
  await page.getByLabel("Godziny").fill("6");
  await page.getByLabel("Notatka (opcjonalnie)").fill(NOTE);
  await page.getByRole("button", { name: "Dodaj wpis" }).click();

  // Wpis widoczny bez przeładowania strony.
  await expect(page.getByRole("row").filter({ hasText: NOTE })).toBeVisible();

  // …i policzony w zestawieniu projektu, którego dotyczy.
  await page.goto("/app/projekty");
  await page.getByRole("link", { name: projekt, exact: true }).click();

  const sekcja = page.locator('[data-section="plan-vs-actual"]');
  await expect(sekcja).toBeVisible();
  await expect(sekcja).toContainText("6 h");
});

test("czas nieprojektowy nie obciąża projektu", async ({ page }) => {
  await page.goto("/app/czas");

  await page.getByLabel("Pracownik").click();
  await page.getByRole("option").first().click();

  // Po wybraniu urlopu pole roli znika — nie ma czego księgować na projekt.
  await page.getByLabel("Kategoria").click();
  await page.getByRole("option", { name: "Urlop" }).click();
  await expect(page.getByLabel("Projekt i rola")).toBeHidden();

  await page.getByLabel("Dzień").fill(DZIS);
  await page.getByLabel("Godziny").fill("8");
  await page.getByLabel("Notatka (opcjonalnie)").fill(NOTE);
  await page.getByRole("button", { name: "Dodaj wpis" }).click();

  const wiersz = page.getByRole("row").filter({ hasText: NOTE }).first();
  await expect(wiersz).toContainText("Urlop");
});
