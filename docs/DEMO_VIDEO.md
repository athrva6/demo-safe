# DemoSafe: three-minute hackathon video

## The story to tell

DemoSafe prevents accidental data exposure when developers, support teams, students, and creators share screenshots. It uses AWS OCR to suggest sensitive regions, keeps a human in control, permanently flattens approved redactions, and publishes only the reviewed copy through an expiring, revocable link.

The strongest demo is one complete journey. Do not spend the video listing every screen or promising unfinished features.

## Features the judges should see

1. **Amazon Rekognition detection** finds AWS account IDs, IP addresses, resource IDs, ARNs, SSH key names, emails, phone numbers, credentials, and supported tokens.
2. **Human privacy review** lets the user accept, remove, adjust, or draw masks. Detection remains advisory because OCR can miss information.
3. **Flattened redaction** replaces selected pixels in the exported PNG. The hidden pixels are not recoverable by removing an overlay.
4. **Controlled sharing** creates a link that expires after one hour, one day, or seven days and can be revoked early.
5. **Privacy-focused storage** sends an image to AWS only after consent and stores only the normalized, redacted PNG when the user publishes it.
6. **Authenticated workspace** uses Amazon Cognito so each owner sees and revokes only their own shares.
7. **Manual fallback** keeps the core workflow usable if automated detection misses an item.

## Recording data

Use a fictional terminal screenshot containing examples such as:

```text
Account: 123456789012
Instance: i-0123456789abcdef0
Public IP: 203.0.113.42
Security group: sg-0123456789abcdef0
Email: demo.user@example.com
API_KEY = sk-fictional-demo-value-123456
```

Never record real credentials, personal messages, AWS access keys, account IDs, or billing pages. Keep browser notifications and unrelated tabs closed.

## Timed storyboard and narration

### 0:00–0:20 — Problem and impact

**Screen:** Show the unredacted fictional screenshot and briefly zoom into the risky fields.

**Say:**

> Developers share screenshots in issues, tutorials, support chats, and social posts every day. One overlooked account ID, IP address, email, or token can turn a useful screenshot into a security incident. DemoSafe adds a privacy release gate before that image is shared.

### 0:20–0:40 — Product promise

**Screen:** Open DemoSafe and upload the screenshot.

**Say:**

> DemoSafe combines AWS-assisted detection with human review. It never pretends automation is perfect: the user makes the final decision, and only the reviewed result is published.

### 0:40–1:15 — AWS detection

**Screen:** Check the consent box, click **Scan with AWS**, and show the suggested masks and labels.

**Say:**

> After explicit consent, the screenshot is sent to Amazon Rekognition. Our Lambda backend maps OCR bounding boxes to privacy rules for AWS identifiers, network details, credentials, tokens, email addresses, and phone numbers. The response contains categories and coordinates, not raw detected secrets.

### 1:15–1:40 — Human review and redaction

**Screen:** Select a suggestion, remove or adjust one if useful, then draw one manual mask.

**Say:**

> Every suggestion is reviewable. The user can remove a false positive, adjust an area, or cover something OCR missed. On export, DemoSafe draws the masks into a new PNG, so the covered pixels are permanently replaced rather than hidden behind removable HTML.

### 1:40–2:10 — Controlled share

**Screen:** Choose a 24-hour expiry, confirm review, and create the share link. Open the link in a private window.

**Say:**

> Publishing stores only the normalized redacted image in a private S3 bucket. DynamoDB records the owner and expiry, while the public link exposes only the reviewed copy. The original screenshot is never placed in the share bucket.

### 2:10–2:30 — Revoke access

**Screen:** Open **My shares**, revoke the link, then refresh its public page.

**Say:**

> The owner can revoke the link immediately. Expired records also use DynamoDB TTL, and S3 lifecycle rules remove old published images.

### 2:30–2:50 — AWS architecture

**Screen:** Show the architecture section in `docs/aws/README.md` or a clean diagram.

**Say:**

> The React frontend talks to API Gateway. Cognito protects private routes, Lambda runs FastAPI, Rekognition performs OCR, S3 stores redacted images, DynamoDB controls access, and CloudWatch provides operational logs. The stack is reproducible with AWS SAM.

### 2:50–3:00 — Learning and close

**Screen:** Return to the successful redacted share.

**Say:**

> We learned how to build and debug a secure serverless workflow across authentication, OCR, storage, expiry, and deployment. DemoSafe helps people share the work while keeping the secrets.

## Recording checklist

- Keep the finished video at or below three minutes.
- Record at 1080p with browser zoom around 100–125%.
- Use a fresh fictional screenshot and a clean demo account.
- Preload the app and verify the AWS scan before recording.
- Show the deployed public frontend URL, not `127.0.0.1`, in the final submission.
- Keep the AWS architecture visible long enough to read the service names.
- Add captions and remove long waits, typing delays, and deployment output.
- Verify the final video shows the problem, user, working feature, AWS role, impact, and learning.

## Scope decision

Do not add another major feature before recording. If time remains after the public deployment is stable, add only a small visible privacy summary such as “six suggestions reviewed, six masks applied.” Reliability and a clear end-to-end story will score better than several incomplete features.
