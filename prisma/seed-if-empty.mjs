/**
 * Zasiew danych demonstracyjnych, ale TYLKO na pustej bazie.
 *
 *   node prisma/seed-if-empty.mjs
 *
 * Sam `seed-demo.mjs` odtwarza role i przydziały od zera — to jest pożądane
 * przed pokazem, ale zgubne przy wdrożeniu. Build na Render wykonuje się przy
 * każdym pushu, więc bezwarunkowy zasiew kasowałby wszystko, co testerzy
 * zdążyli wyklikać między jednym wdrożeniem a drugim.
 *
 * Dlatego sprawdzamy, czy w bazie jest ktokolwiek. Jeśli tak — nie ruszamy
 * niczego. Pierwsze wdrożenie dostaje komplet danych do przeklikania, każde
 * następne zostawia stan, jaki zastało.
 */
import dotenv from "dotenv";
import { Client } from "pg";

// Ta sama konwencja co w `seed-demo.mjs`: lokalnie adres bazy bierzemy z .env,
// na Render DATABASE_URL jest zwykłą zmienną środowiskową i dotenv jej nie rusza.
dotenv.config({ quiet: true });

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let pusta;
try {
  const { rows } = await client.query('SELECT count(*)::int AS ile FROM "User"');
  pusta = rows[0].ile === 0;
} finally {
  await client.end();
}

if (!pusta) {
  console.log("[seed] Baza nie jest pusta — pomijam zasiew danych demo.");
  process.exit(0);
}

console.log("[seed] Pusta baza — wsiewam dane demonstracyjne.");
await import("./seed-demo.mjs");
