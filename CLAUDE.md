# Electramo Voorraadportaal — context voor Claude

Dit is een Next.js 14 (app router) + Supabase applicatie voor Electramo: een
voorraad- en prijzenportaal voor elektromotoren. Klanten loggen in en zien
hun eigen voorraad/prijzen; beheerders kunnen klanten, kortingen en de
voorraad beheren.

## Supabase

- Project: **Voorraad**, project id `lwjmkhgtfhkubkieiyma`.
- Claude heeft volledige lees-/schrijftoegang tot dit Supabase-project en
  mag zelfstandig migraties toepassen (`apply_migration`) en data
  aanpassen (`execute_sql`) wanneer dat nodig is voor een verzoek — dit
  hoeft niet apart gevraagd te worden.
- Belangrijkste tabellen:
  - `products` — de vaste artikellijst (motoren + onderdelen). Kolommen
    o.a. `code` (artikelcode, primary key-achtig, uniek), `omschrijving`,
    `bouwgrootte`, `vermogen`, `polen`, `bouwvorm` (B3/B5/B35/V1),
    `ie_klasse`, `materiaal`, `categorie` (prijscategorie, zie hieronder),
    `vrije_voorraad`, `inkomend`, `prijs_bruto_2023`, `prijs_bruto_2025`,
    `prijs_bruto_2025_b5`, en diverse technische specificatievelden.
  - `klanten` — klantaccounts, gekoppeld via `email` aan het Supabase Auth
    account. Kolommen: `prijslijst` ('2023' / '2025' / '2025_b5'),
    `naamplaat_actief`, `naamplaat_prijs`.
  - `kortingen` — per klant en categorie een kortingspercentage
    (`klant_id`, `categorie`, `korting_percentage`).
  - `upload_log` — geschiedenis van voorraad-uploads (datum/tijd, door
    wie, hoeveel bijgewerkt/genegeerd).
- **Let op — CHECK constraints**: `products.categorie` heeft de constraint
  `categorie_geldig`, `kortingen.categorie` heeft
  `kortingen_categorie_check`, en `klanten.prijslijst` heeft
  `klanten_prijslijst_check`. Bij het toevoegen van een nieuwe categorie of
  prijslijst-optie MOETEN deze drie constraints tegelijk worden
  bijgewerkt (`ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...`),
  anders geeft de app een "violates check constraint"-fout bij opslaan.
  De centrale lijst met geldige categorieën in de code staat in
  `lib/categorieen.js` (`CATEGORIEEN`) — deze moet consistent blijven met
  de database-constraints.

## Belangrijke domeinkennis

- `categorie` (prijscategorie, bv. `ie3_gietijzer`) is iets anders dan
  `bouwvorm` (montagevorm: B3/B5/B35/V1). `categorie = 'flenzen'` zijn 96
  losse onderdeelproducten (`bouwvorm` = null), niet B5-gemonteerde
  motoren.
- Artikelcodes coderen het motortype: bv. `3M005.50D4D4.` — prefix/familie,
  vermogen, en een letter voor montagetype: `F` = B3 (voetmontage), `D` =
  B5 (flensmontage), `FD` = B35 (beide), `V` = V1 (verticaal, grote
  motoren).
- Prijslijst `2025_b5`: B5/B35/V1-gemonteerde motoren staan in de catalogus
  vaak geprijsd als B3-prijs + 10%, maar sommige klanten moeten deze juist
  tegen B3-prijs + 5% krijgen. Vandaar de aparte kolom
  `prijs_bruto_2025_b5` en de derde prijslijst-optie, zodat dit per klant
  (nieuw en bestaand) instelbaar is.
- Naamplaat-toeslag: als `klanten.naamplaat_actief` aan staat, wordt
  `naamplaat_prijs` bovenop de nettoprijs van elk artikel opgeteld (na de
  kortingsberekening), voor alle categorieën BEHALVE `flenzen`.
- Nettoprijsberekening (in `app/page.js`):
  `netto = bruto * (1 - korting/100)`, daarna eventueel + naamplaat,
  afgerond op 2 decimalen.

## Navigatie / UI-conventies

- Beheerders zien bovenaan de hoofdpagina direct de knoppen "Klanten" en
  "Upload" (geen los "Beheerder"-tussenmenu meer). Niet-beheerders zien
  deze knoppen nooit (bepaald via `isAdmin`).
- Zowel de Klanten- als de Upload-pagina hebben maar één terugknop:
  "← Terug naar hoofdmenu", die naar "/" gaat.
- UI-teksten zijn in het Nederlands.

## Voorraad-upload

- Het dagelijkse voorraadbestand (kolommen "Schermnaam", "Vrije
  voorraad", "Inkomend") wordt gematcht op `products.code`. Rijen die niet
  matchen (onderdelen/lagers/accessoires die niet in de vaste
  artikellijst staan) worden genegeerd — dat is normaal gedrag, geen bug.
  Sinds kort wordt elke upload gelogd in `upload_log` zodat er een
  geschiedenis zichtbaar is in de admin-UI.

## Werkwijze

- Wijzigingen mogen zelfstandig in Supabase én in de GitHub-repo worden
  doorgevoerd (committen + pushen) zonder dat de gebruiker dit handmatig
  hoeft te doen — dat is precies de reden dat deze sessie rechtstreeks
  toegang tot de repo heeft.
- Wees precies met prijzen/kortingen: reken voor, en dubbelcheck tegen
  bestaande waarden in Supabase voor je iets aanpast, zeker bij
  prijsberekeningen.
