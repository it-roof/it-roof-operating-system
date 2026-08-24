# Image Generation API — ModelArk 1541523

Lokale Abschrift der offiziellen API-Referenz. Wahrheitsquelle für Bild-Requests
in Studio. Nicht raten, wenn etwas hier nicht steht.

| | |
|---|---|
| Konsole | https://console.byteplus.com/ark/region:ap-southeast-1/docs/ModelArk/1541523 |
| Öffentlich | https://docs.byteplus.com/en/docs/ModelArk/1541523 |
| Stand der Quelle | 12.08.2026 13:59:30 |
| Abgeschrieben | 18.08.2026 |

Verwandt: [modelark-kontext.md](./modelark-kontext.md) (Preise, Modell-IDs, Architektur).

---

## Endpunkt

```
POST https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
```

Nur API-Key-Auth: `Authorization: Bearer $ARK_API_KEY`.

| Region | Base URL |
|---|---|
| ap-southeast-1 | `https://ark.ap-southeast.bytepluses.com/api/v3` |
| eu-west-1 | `https://ark.eu-west.bytepluses.com/api/v3` |

Streaming-Events: [1824137](https://docs.byteplus.com/en/docs/ModelArk/1824137) — gilt nicht für Seedream 5.0 Pro.

---

## Fähigkeiten nach Modell

**Seedream 5.0 Pro** (`dola-seedream-5-0-pro-260628` in der Konsole und im
offiziellen Beispiel):

- Ein Bild aus Text, einem Referenzbild oder 2–10 Referenzbildern + Prompt.
- Layer Decomposition: ein Eingabebild → Basisbild + bis zu 16 Layer (PNG mit Alpha).
- Interactive Editing (Koordinaten, Auswahlboxen, Pfeile).
- **Nicht unterstützt:** `sequential_image_generation`, Websuche, Streaming.

**Seedream 5.0 Lite / 4.5 / 4.0:** Sequenz (Batch) mit
`sequential_image_generation: auto`, bis 14 Referenzbilder, Streaming.
Studio nutzt diese Modelle nicht.

---

## Request-Body

Kein `seed`-Feld. Steht nicht in dieser Referenz und darf nicht miterfunden
werden.

| Feld | Typ | Pflicht | Default | Hinweis |
|---|---|---|---|---|
| `model` | string | ja | — | Model-ID oder Endpoint-ID |
| `prompt` | string | ja (Bild), optional (Layer) | — | Bild: Inhalt. Layer: welche Elemente. Ohne Prompt zerlegt Pro automatisch. Max. ~300 chinesische Zeichen / ~600 englische Wörter. Pro zusätzlich RU, AR, FIL, TH, TR, KO, MS, ES, PT, ID, FR, DE, VI, JA. |
| `image` | string oder string[] | nein (Bild), ja (Layer) | — | URL oder `data:image/<fmt>;base64,...` (fmt klein). Pro: max. 10 Refs. Layer: genau ein Bild, sonst Fehler. |
| `layer_decomposition` | boolean | nein | `false` | nur Pro. `true` = zerlegen. |
| `size` | string | nein | Pro Bild: `2K` | siehe unten |
| `optimize_prompt_options.mode` | string | nein | `standard` | `standard` oder `fast`. `fast` nicht für Lite/4.5. |
| `output_format` | string | nein | `jpeg` | `png` oder `jpeg`. Nur Pro und Lite. Layer: gilt nur fürs Basisbild, Layer immer PNG. |
| `background` | string | nein | `opaque` | nur Pro. `transparent` nur bei genau einem I2I-Bild mit Alpha. Dann kein JPEG. |
| `response_format` | string | nein | `url` | `url` (24 h gültig) oder `b64_json` |
| `sequential_image_generation` | string | nein | `disabled` | `auto` / `disabled`. **Nicht Pro.** |
| `sequential_image_generation_options.max_images` | int | nein | `15` | nur mit `auto`. Eingabe + Ausgabe ≤ 15. **Nicht Pro.** |
| `stream` | boolean | nein | `false` | **Nicht Pro.** |
| `watermark` | boolean | nein | `true` | `true` = „AI-generated“ unten rechts |

### Referenzbild (Bildgenerierung)

jpeg, png, webp, bmp, tiff, gif, heic, heif. Aspect `[1/16, 16]`. Kanten > 14 px.
Max. 30 MB. Pixelprodukt `[196, 36_000_000]`.

### Referenzbild (Layer Decomposition)

png oder jpeg. Aspect `[1/16, 16]`. Max. 30 MB. Pixelprodukt `[262_144, 36_000_000]`.

---

## `size` — Seedream 5.0 Pro (Bild)

Zwei Methoden, nicht kombinieren.

1. Stufe: `1K` · `1.5K` · `2K`. Default `2K`. Aspect/Form im Prompt. **1.5K
   kostet dasselbe wie 1K**, Qualität besser.
2. Pixel `widthxheight`. Pixelprodukt `[921_600, 4_624_220]`, Aspect `[1/16, 16]`.
   Gültig: `2048x1024`. Ungültig: `512x512`.

Mapping Stufe → Pixel (wenn Aspect im Prompt steht):

| Stufe | 1:1 | 4:3 | 3:4 | 16:9 | 9:16 | 3:2 | 2:3 | 21:9 |
|---|---|---|---|---|---|---|---|---|
| 1K | 1024×1024 | 1152×864 | 864×1152 | 1424×800 | 800×1424 | 1248×832 | 832×1248 | 1568×672 |
| 1.5K | 1536×1536 | 1792×1344 | 1344×1792 | 2048×1152 | 1152×2048 | 1872×1248 | 1248×1872 | 2352×1008 |
| 2K | 2048×2048 | 2368×1776 | 1776×2368 | 2816×1584 | 1584×2816 | 2496×1664 | 1664×2496 | 3136×1344 |

Layer-Modus: nur Stufen, Default `auto`. Werte `1K` · `1.5K` · `2K` · `auto`.
Basisbild behält Aspect der Vorlage; Layer ungefähr die gewählte Stufe.

Lite: `2K`/`3K`/`4K` oder Pixel `[3_686_400, 16_777_216]`. Studio nutzt Lite nicht.

---

## Response (nicht-streaming)

| Feld | Bedeutung |
|---|---|
| `created` | Unix-Sekunden |
| `model` | Model-ID |
| `data[]` | Bilder. Immer: `url` / `b64_json`, `size` (`2048x2048`), `output_format` (Pro). |
| `data[].url` | Download, **24 h**, danach weg. |
| `error` | Request hat kein Bild erzeugt. `code` + `message`. |
| `usage.generated_images` | erfolgreiche Bilder — **Abrechnungseinheit** |
| `usage.input_images` | Eingabebilder, nur Pro |
| `usage.output_tokens` | `round(sum(breite × höhe) / 256)` |
| `usage.total_tokens` | aktuell = `output_tokens` (keine Input-Tokens) |

Layer zusätzlich pro Eintrag: `z_index` (Basis = 0), `name`, `description`,
`bounding_box.absolute` `[left, top, right, bottom]`,
`bounding_box.normalized` (0–1000). Basisbild hat keine Bounding Box.

---

## Offizielles Beispiel (Layer Decomposition)

Aus der API-Referenz, Modell-ID identisch mit der Konsole:

```bash
curl https://ark.ap-southeast.bytepluses.com/api/v3/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "dola-seedream-5-0-pro-260628",
    "prompt": "Perform precise layer separation on the image.",
    "image": "https://example.com/input.png",
    "layer_decomposition": true,
    "size": "2K",
    "output_format": "jpeg",
    "response_format": "url",
    "watermark": true
}'
```

Dieselbe Seite hat Tabs für Text-to-Image, Image-to-Image, Multi-Image Blending,
Interactive Editing. Inhalt der Tabs hier nicht extra abgeschrieben — Request-Felder
sind dieselben (`image` weglassen = T2I, String/Array = I2I).

---

## Was Studio sendet

T2I / I2I, kein Layer-Modus:

```json
{
  "model": "dola-seedream-5-0-pro-260628",
  "prompt": "...",
  "response_format": "url",
  "size": "2K",
  "stream": false,
  "watermark": true
}
```

I2I: zusätzlich `image` als URL oder URL-Array.

`stream` steht in dieser Referenz nur bei Lite/4.5/4.0. Das Pro-Beispiel schickt
es nicht. Wenn Pro den Call mit `stream` ablehnt: Feld weglassen, nicht auf `true`
setzen.

Ergebnisse müssen lokal kopiert werden. `data[].url` läuft nach 24 Stunden ab.
