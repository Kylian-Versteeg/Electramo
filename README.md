# Electramo Voorraadportaal

Dit is de code voor je klantenportaal: klanten loggen in met hun eigen
account en zien altijd de actuele voorraad. Jij logt in als beheerder en
upload dagelijks je voorraadbestand zoals je gewend bent.

## Wat je al hebt (stap 1-3)
- Een Supabase-project met een lege tabel `products`.
- Een Vercel-account.

## Stap 5: dit project op GitHub zetten

1. Ga naar github.com en maak (als je dat nog niet hebt) een gratis account.
2. Klik rechtsboven op **+** → **New repository**. Noem hem bijvoorbeeld
   `electramo-voorraad`. Laat "Public" of "Private" staan naar keuze
   (Private is prima, Vercel kan er ook bij).
3. Volg op de volgende pagina de instructies onder **"...or push an
   existing repository from the command line"** — of, makkelijker: klik op
   **"uploading an existing file"** en sleep alle bestanden uit deze map
   naar dat scherm.

## Stap 6: je huidige artikelen inladen in Supabase

1. Ga in Supabase naar **Table Editor** → tabel `products`.
2. Klik op **Insert** → **Import data from CSV**.
3. Upload het bijgevoegde bestand `products_seed.csv` — dit bevat je
   huidige 813 artikelen met alle gegevens.
4. Klik op importeren. Je tabel is nu gevuld.

## Stap 7: het project koppelen aan Vercel

1. Ga naar vercel.com → **Add New** → **Project**.
2. Kies de GitHub-repository die je in stap 5 hebt aangemaakt.
3. Vercel herkent automatisch dat het een Next.js-project is.
4. Voordat je op **Deploy** klikt: open **Environment Variables** en vul in
   (waarden vind je in Supabase → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (bij "service_role secret")
   - `ADMIN_EMAILS` — jouw e-mailadres (het adres waarmee jij straks als
     beheerder inlogt)
5. Klik op **Deploy**. Na ongeveer een minuut krijg je een link zoals
   `electramo-voorraad.vercel.app` — dat is je portaal.

## Stap 8: accounts aanmaken (voor jezelf en voor klanten)

1. Ga in Supabase naar **Authentication** → **Users** → **Add user**.
2. Maak eerst een account aan met **jouw** e-mailadres (hetzelfde als bij
   `ADMIN_EMAILS`) en een wachtwoord. Zet "Auto Confirm User" aan.
3. Log in op je nieuwe portaal-link met dit account — je ziet nu ook de
   knop **"Beheerder"** rechtsboven, waar je je dagelijkse bestand kunt
   uploaden.
4. Maak op dezelfde manier een account aan voor elke klant (e-mailadres +
   een (tijdelijk) wachtwoord). Geef dit aan hen door.

## Dagelijks gebruik

- **Jij**: inloggen → "Beheerder" → voorraadbestand uploaden (zelfde
  bestand met kolommen Schermnaam, Vrije voorraad, Inkomend als altijd).
  Alleen deze twee kolommen worden bijgewerkt; er worden nooit nieuwe
  artikelen toegevoegd.
- **Klanten**: inloggen met hun eigen account, direct de actuele voorraad
  zien, filteren en zoeken.

## Wat nu nog ontbreekt (fase 2)

Deze eerste versie heeft login, live voorraad, filters, zoeken en jouw
upload-knop. Het winkelmandje, de aanvraag-PDF en de motor-datasheets uit
de vorige versie zitten er nog niet in — die database-kolommen staan al
wel klaar (bijv. `bearing_de`, `weight`, `tropical`), dus dat kunnen we in
een volgende stap toevoegen zodra deze basis goed werkt.
