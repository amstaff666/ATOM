# Luuna Skillide Register

> Restart-CRM / ATOM platvormi peaagendi Luuna täielik skillide kirjeldus.
> Kõik skillid on modulaarsed sub-agendid mida Luuna orkestreerub vastavalt vajadusele.

---

## 1. `pdf-bank-statement-parser`
**Pangaväljavõtte parser**

### Eesmärk
Parsib Eesti pankade pangaväljavõtteid struktureeritud andmeteks. Tuvastab automaatselt panga, formaadi ja keele.

### Toetatud pangad
| Pank | Formaadid | Keel |
|------|-----------|------|
| LHV | PDF, CSV, XLS | ET, EN |
| Swedbank | PDF, CSV | ET, EN, RU |
| SEB | PDF, XLS | ET, EN |
| Coop Pank | PDF | ET |
| Luminor | PDF, CSV | ET, EN, LV |
| Citadele | PDF | ET, LV |

### Sisend → Väljund
- **Sisend**: PDF fail (kliendi pangaväljavõte)
- **Väljund**: JSON struktuur {konto, periood, saldo, tehingud[], käive_in, käive_out, kvaliteediskoor}

### HITL: EI (madal risk — ainult lugemine)

### Veavõimalused ja käsitlus
- Skännitud PDF → eskaleerib `pdf-orchestrator`'le OCR jaoks
- Tundmatu formaat → logib ja teavitab haldurit
- Mittetäielik periood → märgib puuduvad kuud selgelt

---

## 2. `pdf-orchestrator`
**PDF Täistsükkel Orkestraator**

### Eesmärk
Haldab kogu PDF töötlemise elutsüklit algusest lõpuni. Koordineerib teisi agente.

### Pipeline sammud
```
1. INGEST    → Fail võetakse vastu, kontrollitakse terviklikkust
2. DETECT    → Tüüp (väljavõte / bilanss / arve / muu), keel, pank
3. OCR       → Kui skännitud: Tesseract + vision mudel
4. PARSE     → Struktureeritud andmete eraldamine
5. VALIDATE  → Kvaliteedikontroll (confidence score, puuduvad väljad)
6. MANIFEST  → Case'i manifest uuendatakse
7. ATTACH    → Fail seotakse case'iga (#AN-XXXX)
```

### Kvaliteediskoorid
- **90-100%**: Automaatne kinnitamine
- **70-89%**: Luuna kontrollib manuaalselt
- **< 70%**: Teavitab haldurit, küsib originaali

### HITL: EI (madalrisk) / JAH kui skoor < 70%

---

## 3. `invoice-organizer`
**Arveote Korraldaja**

### Eesmärk
Organiseerib kliendi arved, leiab duplikaadid, jälgib maksetähtaegu ja kategoriseerib kulud.

### Funktsioonid
- Automaatne kategoriseerimine (põhivara, käibekulud, teenused, jne)
- Duplikaatide tuvastamine (sama number / summa / kuupäev)
- Maksetähtaegade kalender
- Ostja/müüja profiilide loomine
- CSV/Excel eksport

### HITL: EI

---

## 4. `proactive-agent`
**Proaktiivne Teavitaja**

### Eesmärk
Luuna teine silm — jälgib kõike pidevalt ja teavitab haldurit enne probleemide tekkimist.

### Monitoorib
- Case'ide seisu (kas midagi on takerdunud?)
- Dokumentide vanusel (väljavõte vanem kui 3 kuud → hoiatus)
- Provider tingimuste muutusi
- OCR järjekorra blokeeringuid
- HITL kinnitusi mis on ootel üle 24h

### Teavituste formaat
```
🔔 PROAKTIIVNE TEAVITUS [kuupäev kell]
Case: #AN-XXXX
Probleem: [kirjeldus]
Soovitatav tegevus: [konkreetne samm]
Prioriteet: [KÕRGE / KESKMINE / MADAL]
```

### Kontrolltsükkel: iga 15 minuti tagant (konfigureeritav)

### HITL: EI (teavitused ainult)

---

## 5. `self-improvement`
**Iseõppimise Moodul**

### Eesmärk
Luuna õpib oma vigadest ja parandab protsesse. Logib kõik ebaõnnestumised ja analüüsib mustreid.

### Logimise struktuur
```json
{
  "timestamp": "2025-06-15T10:30:00",
  "skill": "pdf-bank-statement-parser",
  "caseId": "AN-1042",
  "error": "Tuvastamata tabeli formaat",
  "resolution": "Manuaalne OCR",
  "learningNote": "Luminor Q1 2025 uus PDF formaat"
}
```

### Soovitused
- Iganädalane raport haldurile: "Luuna õppis sel nädalal..."
- Automaatsed reeglite uuendused (madal risk)
- Protsessiparanduste ettepanekud (kõrge risk → HITL)

### HITL: EI (logimine) / JAH (protsessimuudatused)

---

## 6. `analytics-data-analysis`
**Andmeanalüüs**

### Eesmärk
Sügav finantsanalüüs kliendi andmetest — mitte ainult numbrid, vaid tähendus.

### Analüüside tüübid

#### Cashflow analüüs
- Kuised käibed (in/out) 12 kuu graafik
- Sessonaalsuse tuvastamine
- Anomaaliate tuvastamine (ühekordne suur tehing jne)

#### Riskiskoor (0-100)
| Skoor | Tähendus |
|-------|----------|
| 80-100 | Madal risk — kõik providerid sobivad |
| 60-79 | Keskmine risk — vali providereid hoolikalt |
| 40-59 | Kõrgem risk — tagatisnõue tõenäoline |
| < 40 | Kõrge risk — laen tõenäoliselt ei sobi |

#### Provider sobivuse matriiks
Iga providerite kohta: sobivusskoor, max summa, nõutavad dokumendid, kliendi profiili vastavus

### HITL: EI (analüüs) / JAH (soovituste rakendamine)

---

## 7. `create-plan`
**Rahastusplaani Koostaja**

### Eesmärk
Koostab realistlikud multi-provider rahastuspaketid. Kui üks provider annab max 20k€, siis 100k€ paketi jaoks on vaja 5 providerit — Luuna koordineerib seda automaatselt.

### Paketi variandid

| Variant | Kirjeldus | Kiirus | Risk |
|---------|-----------|--------|------|
| Konservatiivne | Ainult madalrisk pangad | Aeglane (4-6 nädalat) | Madal |
| Kiire katvus | Mitu providerit paralleelselt | Kiire (1-2 nädalat) | Kesk |
| Etapiline | Faasidena, esimene faas kiire | Moodulne | Madal/kesk |

### Paketi struktuur
```
Provider 1: LHV — 20 000 € (pank / business loan)
Provider 2: Coop — 20 000 € (pank / väikelaen)
Provider 3: SEB — 20 000 € (pank / business loan)
Provider 4: Bigbank — 20 000 € (krediidiasutus)
Provider 5: Nordic Hypo — 20 000 € (tagatis)
────────────────────────────────────────
KOKKU: 100 000 €
```

### ⚠️ HITL: JAH — ALATI enne kliendile saatmist

---

## 8. `fix-errors`
**Vigade Automaatne Parandaja**

### Eesmärk
Tuvastab ja parandab automaatselt vead pipeline'is ilma haldurit segamata.

### Parandab automaatselt (madal risk)
- OCR vigane märk (nt `l` → `1` numbrites)
- Kuupäeva formaadi teisendus (15/06/2025 → 15.06.2025)
- IBAN formaadi normaliseerimine
- Duplikaatse tehingurea eemaldamine
- Tühikute ja tühiväljade puhastamine
- Valuuta märgi normaliseerimine (EUR, €, eur → €)

### Eskaleerib haldurile (kõrge risk)
- Saldo lahknevus (parsitud vs deklareeritud)
- Puuduv periood (kuu puudub täielikult)
- Võimalik andmepettus (ebaregulaarne tehing)

### HITL: EI (minimaalsed korrektsioonid) / JAH (saldo/andme lahknevused)

---

## Skillide koostoime

```
Klient laeb üles PDF
       ↓
pdf-orchestrator (koordineerib)
       ├→ pdf-bank-statement-parser (kui väljavõte)
       ├→ invoice-organizer (kui arve)
       └→ OCR moodul (kui skännitud)
              ↓
analytics-data-analysis (analüüsib tulemust)
              ↓
create-plan (koostab rahastusplaani)
              ↓
       ⚠️ HITL — Haldur kinnitab
              ↓
       Paketi saatmine kliendile
```

`proactive-agent` ja `self-improvement` töötavad pidevalt taustal kogu protsessi vältel.
`fix-errors` sekkub automaatselt igas etapis kui avastab korrektsioonivajaduse.
