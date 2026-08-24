# ByteDance ModelArk — verifizierter Stand (18.08.2026)

Diese Datei ist die Wahrheitsquelle für die Anbindung. Alle Werte hier stammen
aus der ModelArk-Konsole, nicht aus Blogartikeln. Wo etwas unbestätigt ist,
steht es ausdrücklich unter "Offen".

Wenn du (Cursor) eine Angabe brauchst, die hier nicht steht: **nicht raten**,
sondern nachfragen.

Bild-API-Felder: [modelark-image-generation-api.md](./modelark-image-generation-api.md)
(Abschrift von ModelArk 1541523, Stand 12.08.2026).

---

## Zugang

| | |
|---|---|
| Region | Asia Pacific (Johor), `ap-southeast-1` |
| Basis-URL | `https://ark.ap-southeast.bytepluses.com/api/v3` |
| Auth | `Authorization: Bearer $ARK_API_KEY` |

Modelle werden über ihre Model-ID direkt angesprochen. Ein Inference Endpoint
ist nicht nötig, solange die Modell-ID funktioniert.

## Endpunkte

**Video** — asynchron, Task anlegen und pollen:

```
POST /api/v3/contents/generations
GET  /api/v3/contents/generations/{id}
```

Der Pfad `/v3/contents/generations` steht auf beiden Seedance-Modellseiten
unter "API support" und ist bestätigt.

**Bild** — synchron. Vollständige Feldliste:
[modelark-image-generation-api.md](./modelark-image-generation-api.md)
([Konsole](https://console.byteplus.com/ark/region:ap-southeast-1/docs/ModelArk/1541523),
[öffentlich](https://docs.byteplus.com/en/docs/ModelArk/1541523)).

```
POST /api/v3/images/generations
```

Studio (T2I): `model`, `prompt`, `response_format: "url"`, `size: "2K"`,
`watermark: true`. I2I: zusätzlich `image` als URL-String oder Array
(Pro: max. 10). **Kein Seed-Feld** in der Bild-API.

Pro unterstützt nicht: `sequential_image_generation`, Streaming, Websuche.
`stream` nur weglassen oder nicht senden — nicht auf `true` setzen.
`data[].url` gilt 24 Stunden, danach lokal speichern.

Pro-Größe: Default `2K`, Stufen `1K` / `1.5K` / `2K`. 1.5K kostet laut
dieser Referenz dasselbe wie 1K. Pixel-Range bei explizitem `widthxheight`:
`[921_600, 4_624_220]`.

## Modelle

### Bild

| Modell | Model-ID | Preis |
|---|---|---|
| Seedream 5.0 Pro | `dola-seedream-5-0-pro-260628` | 0,045 USD je Ausgabebild |
| Seedream 5.0 Lite | Version 260128 | 0,035 USD je Bild |

Pro: Eingabebild 0,003 USD, **das erste ist frei**. Der Preis ist als
"Output image × 2.61 Million pixels" ausgewiesen — für Bilder bis rund
1616 × 1616 Pixel gilt 0,045. Beide Modelle: Text-zu-Bild und Bild-zu-Bild,
IPM-Grenze 500.

### Video

| Modell | Model-ID | Auflösungen |
|---|---|---|
| Seedance 2.0 | `dreamina-seedance-2-0-260128` | 480p, 720p, 1080p, 4K |
| Seedance 2.0 mini | `dreamina-seedance-2-0-mini-260615` | 480p, 720p |
| Seedance 2.5 | `dreamina-seedance-2-5-260628` | 480p, 720p, 1080p |

Alle: 24 fps, Dauer 4–15 Sekunden.

Preise in USD pro Million Tokens, **abgelesen bei Ausgabeauflösung 480p**:

| Modell | ohne Video-Input | mit Video-Input |
|---|---|---|
| Seedance 2.0 mini | 1,4 (Aktionspreis) | 0,84 (Aktionspreis) |
| Seedance 2.0 | 7,0 | 4,3 |
| Seedance 2.5 | 10,7 | 6,4 |

Der Satz pro Million ändert sich mit der Auflösung. Diese Werte gelten **nur
für 480p** und dürfen nicht auf 1080p hochgerechnet werden.

Aufgabentypen: 2.0 kann Text-zu-Video und Bild-zu-Video. Mini nennt stattdessen
Multimodality-to-video, Edit und Video extension.

## Kostenformel für Video

```
tokens = breite * höhe * 24 * sekunden / 1024
kosten = tokens / 1_000_000 * satzProMillion
```

Gegenprobe: 480p (854 × 480) ergibt 9.607 Tokens je Sekunde. Bei 7,0 USD/M
sind das 0,067 USD pro Sekunde für Seedance 2.0 — deckt sich mit dem
Einstiegspreis, den Drittanbieter für dasselbe Modell ausweisen. Formel und
Konsolenwerte passen zusammen.

Tokens je Sekunde: 480p = 9.607, 720p = 21.600, 1080p = 48.600.

## Gleichzeitigkeit

Seedance 2.0 unterhalb 4K: 10 Tasks, als "Sharing" gekennzeichnet — vermutlich
ein kontoweit geteilter Pool. Bei 4K: exklusiv 1 Task, RPM 15.
Sonst RPM 600.

**Setze das Semaphor im Worker auf 8 insgesamt**, nicht pro Modell, und für
4K-Jobs auf 1.

## Architektur-Entscheidungen

**Bilder haben keine Entwurfsstufe.** Der Abstand zwischen Pro und Lite ist
1 Cent pro Bild. Zwei Modelle und ein Treue-Problem lohnen sich dafür nicht.
Alle Bilder laufen auf Seedream 5.0 Pro.

**Video hat eine Entwurfsstufe, aber sie funktioniert über Referenzmaterial,
nicht über den Seed.** Ein Seed reproduziert ein Ergebnis nur bei identischer
Auflösung und identischem Modell — über Auflösungsgrenzen hinweg trägt er
nicht. Der Entwurf muss deshalb als **Referenzvideo** in den Final-Durchlauf
gegeben werden.

Das ist zusätzlich billiger: mit Video-Input kostet Seedance 2.0 nur 4,3 statt
7,0 pro Million.

Daraus folgt: Ergebnisse müssen im eigenen Bucket unter öffentlich erreichbarer
URL liegen, bevor sie als Referenz dienen können. Das ist zwingend, nicht
optional.

**Der Knopf "als Final nachrendern"** übergibt also die URL des fertigen
Entwurfs als Referenz-Eingabe — nicht Prompt und Seed. Den Seed weiter
speichern, er ist für Wiederholungen bei gleicher Auflösung nützlich.

## Offen — hier nichts annehmen

- Die 1080p-Sätze pro Million für Seedance 2.0 und 2.5. Bisher nur 480p bekannt.
- Ob die Mini-Preise nach Ende der Aktion steigen.
- Ob Mini reines Text-zu-Video ohne Referenzmaterial kann. Falls nicht, taugt
  Mini nicht als erste Entwurfsstufe aus einem Prompt.
- Ob der Bildpreis oberhalb 2,61 Megapixel / bei 2K gegenüber 1K steigt.
  1.5K = 1K ist in 1541523 bestätigt; 2K-Aufpreis nicht.
- Ob die 10 gleichzeitigen Tasks pro Modell oder kontoweit gelten.
- Der genaue Request- und Response-Aufbau der **Video**-Endpunkte, inklusive
  Feldnamen für Auflösung, Dauer, Seed und Referenz-URLs.
- Ob Pro den Request ablehnt, wenn `stream: false` mitgeschickt wird
  (Referenz listet `stream` nur für Lite/4.5/4.0).

Halte alle Modell-IDs, Preissätze und Auflösungsparameter an **einer** Stelle
in der Konfiguration. Diese Werte ändern sich.
