# Wdrożenie na Render

Konfiguracja siedzi w [`render.yaml`](render.yaml), więc środowisko powstaje z
repozytorium, a nie z klikania w panelu. Region to Frankfurt — aplikacja trzyma
dane osobowe pracowników, więc zostają w Unii Europejskiej.

## Pierwsze uruchomienie

1. W Render: **New → Blueprint**, wskaż repozytorium `adrianczyrek-herodot/fte-planner`.
2. Zatwierdź plan z `render.yaml`. Powstaną dwie rzeczy: serwis `fte-planner`
   i baza `fte-planner-db`.
3. Poczekaj na pierwsze wdrożenie. Migracje Prismy wykonają się same, jako część
   budowania.
4. Wejdź na `/register` i załóż konto. **Pierwsze konto na pustej bazie
   automatycznie dostaje rolę administratora i jest od razu aktywne** — każde
   kolejne czeka na zatwierdzenie.

`DATABASE_URL` i `AUTH_SECRET` wypełnią się same: pierwszy z bazy, drugi
wygeneruje Render. Nie trzeba ich nigdzie wpisywać ani nigdzie przechowywać.

## Czego to wdrożenie NIE załatwia

**Poczta nie działa.** [`src/lib/mail.ts`](src/lib/mail.ts) tylko wypisuje treść
do logów serwera — nic nie jest wysyłane. W praktyce: żeby zaprosić pracownika
albo zresetować komuś hasło, trzeba wejść w logi serwisu na Render i wyjąć
stamtąd link. Do uruchomienia prawdziwej poczty wystarczy podmienić jedną
funkcję `sendMail`; reszta kodu jest od tego odcięta.

**Załączniki projektów nie działają.** Kod używa `@vercel/blob`, który wymaga
`BLOB_READ_WRITE_TOKEN`. Bez tokenu cała reszta aplikacji działa normalnie —
nie da się tylko dodawać i pobierać plików przy projektach. Docelowo warto
przestawić to na magazyn zgodny z S3 (Cloudflare R2, Backblaze B2), bo
przywiązanie do Vercela przy hostingu na Render nie ma sensu.

**Backupy bazy.** Darmowy plan Postgresa na Render ma ograniczenia co do
retencji i czasu życia instancji — sprawdź aktualne warunki przed wrzuceniem
tam czegokolwiek, czego szkoda stracić. To jest ten sam punkt, który pojawił
się w feedbacku: comiesięczne ręczne pobieranie pliku nie jest backupem.

**Darmowy plan serwisu usypia** po okresie bezczynności, więc pierwsze wejście
po przerwie potrafi trwać kilkadziesiąt sekund. Do prezentacji i UAT wystarczy,
do codziennej pracy zespołu — nie.

## Własna domena

Dopóki `APP_URL` nie jest ustawiony, aplikacja bierze adres z
`RENDER_EXTERNAL_URL`, czyli działa od pierwszego wdrożenia. Przy podpinaniu
własnej domeny ustaw `APP_URL` ręcznie w zmiennych środowiskowych serwisu —
od tego zależą linki w zaproszeniach i resetach hasła.

## Kolejne wdrożenia

Każdy push na gałąź `staging` uruchamia nowe wdrożenie wraz z migracjami.
`prisma migrate deploy` jest idempotentny, więc wdrożenie bez nowych migracji
niczego w bazie nie rusza.
