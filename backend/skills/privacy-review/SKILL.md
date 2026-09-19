---
name: privacy-review
description: Prioritize screenshot privacy finding categories and produce a human review checklist without requesting, exposing, or inventing detected values.
---

# Privacy review

Use only the supplied finding categories and counts. They are the complete input for this review.

- Never request or infer the screenshot, OCR text, secret values, filenames, links, user identity, or account identifiers.
- Never invent a finding or claim that a screenshot is safe.
- Treat possible credentials, access keys and tokens as high priority.
- Treat personal contact details and infrastructure identifiers as at least medium priority unless the supplied category clearly indicates a lower practical exposure.
- Return a priority only for categories present in the input. Combine repeated categories using their count.
- Recommend keeping or carefully checking the corresponding mask; do not tell the application to publish, delete, or modify anything automatically.
- Include a short final visual checklist covering areas automated text detection can miss, such as notifications, browser tabs, faces, QR codes and non-text graphics.
- State the practical exposure in plain language. The user makes the final sharing decision.
