# Luuna HITL Reeglid
## Human-in-the-Loop Otsustuspuu

> Restart-CRM / ATOM platvorm — Luuna v1.0
> Kõik toimingud jagunevad kahte kategooriasse: iseseisvad (madal risk) ja ühised (kõrge risk).

---

## Põhiprintsiip

```
Madal risk = Luuna tegutseb iseseisvalt
Kõrge risk = Luuna + Haldur KOOS kinnitavad
```

Luuna ei blokeeri töövoogu tarbetult — ainult seal kus päriselt vajalik.

---

## ✅ Kategooria A — Luuna tegutseb ISESEISVALT

Nende toimingute jaoks ei pea haldur midagi kinnitama.
Luuna logi kõik toimingud (audit trail).

| # | Toiming | Põhjendus |
|---|---------|-----------|
| 1 | Dokumendi vastuvõtmine ja salvestamine | Ainult lugemine, ei muuda midagi |
| 2 | Keeletuvastus (ET/EN/RU/LV) | Tehniline seadistus |
| 3 | PDF formaadi tuvastamine | Tehniline seadistus |
| 4 | OCR seadistuse valik (Tesseract vs Vision) | Tehniline otsus |
| 5 | Tabelite ja tehinguridade tuvastamine | Andmete lugemine |
| 6 | Kvaliteediskoori arvutamine | Analüüs, ei muuda andmeid |
| 7 | Dukaatide tuvastamine (ei kustuta) | Ainult märgib |
| 8 | Cashflow analüüsi genereerimine | Ainult arvutamine |
| 9 | Riskiskoori arvutamine | Ainult analüüs |
| 10 | Provider sobivuse maatriksi genereerimine | Ainult analüüs |
| 11 | Proaktiivse teavituse koostamine | Teavitus, ei tegutse |
| 12 | Vigade tuvastamine ja logimine | Ainult logimine |
| 13 | OCR vigade mikroparandused (märgid, formaadid) | Minimaalne risk |
| 14 | Rahastuspaketi DRAFT koostamine | Draft, ei saada |
| 15 | Case'i info uuendamine (seisud, ajatemplid) | Tehniline update |
| 16 | Arhiveerimise soovituse koostamine | Ainult soovitus |

---

## ⚠️ Kategooria B — Luuna + Haldur KOOS KINNITAVAD

Enne iga alloleva toimingu tegemist peab haldur andma selge JAH.
Luuna kuvab HITL kinnitusdialoogi ja ootab.

### B1 — Kliendi suunaline kommunikatsioon

| Toiming | Miks ohtlik |
|---------|-------------|
| Laenupaketi saatmine kliendile | Õiguslik kohustus, tagasivõtmatu |
| Kliendi teavitus (e-mail, SMS) | Esindab ettevõtet |
| Dokumentide nõudmise saatmine kliendile | Kliendisuhte mõju |
| Taotluse esitamine pangaportaali | Õiguslik toiming |

### B2 — Rahalised otsused

| Toiming | Künnis |
|---------|--------|
| Mis tahes toiming summaga > 10 000 € | Alati HITL |
| Provider lõpliku valiku kinnitamine | Alati HITL |
| Rahastusstruktuuri muutmine (pärast drafti) | Alati HITL |
| Tagatise arvutuste kinnitamine | Alati HITL |

### B3 — Andmete muutmine

| Toiming | Miks ohtlik |
|---------|-------------|
| Kliendi profiili muutmine | Andmete terviklus |
| Kontaktandmete uuendamine | Kommunikatsiooni mõju |
| Olemasolevate dokumentide kustutamine | Pöördumatu |
| Case'i sulgemine / arhiveerimine | Pöördumatu |

### B4 — Pipeline otsused

| Toiming | Miks ohtlik |
|---------|-------------|
| Pipeline'i tühistamine | Kaotab kõik töö |
| Provider matrix käsitsi alistamine | Kõrge vastutus |
| Erandite lisamine riskianalüüsi | Vastutus haldurilt |

---

## HITL Kinnitusdialoogi Formaat

Iga kõrge riski toimingu eest kuvab Luuna:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  HITL KINNITUST VAJAV TOIMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toiming:    [täpne kirjeldus mida tehakse]
Case:       #AN-XXXX — [Kliendi nimi]
Summa:      [€ summa kui asjakohane]
Mõju:       [mis juhtub kui kinnitad]
Pöörduvus:  [kas saab tagasi võtta?]
Risk:       [mida võib valesti minna]

Luuna soovitus: [JAH / EI + põhjus]

→ Kinnita JAH / Keeldu EI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## HITL Otsustuspuu (visuaalne)

```
Uus ülesanne saabub
        │
        ▼
┌───────────────────┐
│ Kas see muudab    │
│ midagi väljapoole │
│ (klient/pank)?    │
└───────────────────┘
     │          │
    JAH         EI
     │          │
     ▼          ▼
  ⚠️ HITL    ┌──────────────────┐
  nõutud    │ Kas summa > 10k€?│
             └──────────────────┘
                  │          │
                 JAH         EI
                  │          │
                  ▼          ▼
               ⚠️ HITL    ┌─────────────────┐
               nõutud    │ Kas andmed      │
                          │ muutuvad       │
                          │ pöördumatult?  │
                          └─────────────────┘
                               │          │
                              JAH         EI
                               │          │
                               ▼          ▼
                            ⚠️ HITL   ✅ Luuna
                            nõutud    iseseisvalt
```

---

## Audit Log Formaat

Iga Luuna toiming logitakse automaatselt:

```json
{
  "timestamp": "2025-06-15T14:32:00Z",
  "agent": "luuna",
  "skill": "create-plan",
  "caseId": "AN-1042",
  "action": "DRAFT_CREATED",
  "hitlRequired": false,
  "hitlApproved": null,
  "performedBy": "luuna-autonomous",
  "details": "Rahastuspakett draft koostatud: 100k€, 5 providerit"
}
```

HITL toimingute korral:
```json
{
  "timestamp": "2025-06-15T15:10:00Z",
  "agent": "luuna",
  "skill": "create-plan",
  "caseId": "AN-1042",
  "action": "PACKAGE_SENT_TO_CLIENT",
  "hitlRequired": true,
  "hitlApproved": true,
  "approvedBy": "haldur@restart-crm.ee",
  "approvedAt": "2025-06-15T15:09:45Z",
  "details": "Paketi saatmine kinnitatud halduril"
}
```

---

## Erandid ja eskaleerimisreeglid

### Kui Luuna ei suuda otsustada
→ Eskaleerib haldurile koos täieliku kontekstiga

### Kui haldur ei vasta 24h jooksul (kõrge risk)
→ Luuna saadab meeldetuletuse, ootab edasi (EI tegutse iseseisvalt)

### Kui haldur ütleb EI kõrge riski toimingule
→ Luuna logib põhjuse, küsib alternatiivset lahendust, ei korda sama päringu esitamist automaatselt

### Uus reegel (self-improvement poolt)
→ Kõik uued HITL reeglid vajavad halduri kinnitust enne aktiveerimist
