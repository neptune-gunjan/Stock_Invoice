# Phase 2 — Handwriting Extraction

## Goal
Turn a photographed handwritten note into raw structured JSON: a list of
item-name guesses with quantity/unit if legible. This is the ONLY phase in
the whole system that calls an LLM.

## Why an LLM here and nowhere else
Classical OCR (Tesseract, EasyOCR) is trained on printed text and performs
poorly on handwriting, especially mixed-language/abbreviated shop notes. A
vision-capable LLM uses surrounding context ("atta" next to "kg" is very
likely flour, not a name) and handles messy handwriting far better. This
call happens once per uploaded image — not once per invoice, not repeated
during matching or PDF generation.

## Functionality to build

1. `POST /extract` — accepts an image file
   - saves the image (local disk for MVP, path stored in `extraction_jobs`)
   - sends it to the Claude API with a prompt that requests ONLY structured
     JSON output (no prose, no markdown fences)
   - persists raw LLM output verbatim in `extraction_jobs.raw_llm_output`
     for debugging/audit purposes
   - parses the JSON into `extracted_items` rows (raw_text, qty, unit if present)
2. Prompt should explicitly instruct: "Return only valid JSON. If quantity
   or unit is not legible, return null for that field rather than guessing."
3. Handle failure cases explicitly:
   - image unreadable / API error → return 4xx/5xx with a clear message
   - LLM returns non-JSON → log raw output, return an error, do not attempt
     to silently parse partial garbage

## Data model addition

`extraction_jobs`:
| Column | Type |
|---|---|
| id | UUID |
| image_path | text |
| raw_llm_output | text |
| status | text (`pending`, `success`, `failed`) |
| created_at | timestamptz |

`extracted_items`:
| Column | Type |
|---|---|
| id | UUID |
| extraction_job_id | UUID FK |
| raw_text | text (as read from the image, unmatched) |
| qty | numeric nullable |
| unit | text nullable |
| created_at | timestamptz |

Note: `matched_stock_id`, `confidence_score`, and `needs_review` are added
in Phase 3 — don't build matching logic here, this phase only reads the image.

## Acceptance criteria

- Uploading a clear test image returns a JSON list of item guesses
- Uploading a blurry/unreadable image returns a clean error, not a crash
- Raw LLM output is always stored for audit, even on partial failures
- No other part of the codebase calls the LLM API — grep the repo before
  finishing this phase to confirm

## Out of scope for this phase
- No matching against the stock catalog yet (Phase 3)
- No review UI yet (Phase 4) — this phase just returns raw JSON
