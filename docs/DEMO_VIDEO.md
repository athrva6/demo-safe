# DemoSafe: updated three-minute hackathon video

## What this video must prove

The judges should understand four things within three minutes:

1. Screenshot leakage is a real and common problem.
2. DemoSafe finds likely exposure while keeping the human in control.
3. The final PNG is permanently redacted and the share link can expire or be revoked.
4. The working product uses AWS services, including Rekognition and the Strands privacy agent with Amazon Bedrock.

Do not turn the video into a list of services. Show one complete user journey and explain each AWS service only when it appears in that journey.

## Features currently present in the code

- Amazon Rekognition OCR and bounding-box suggestions
- Deterministic detection of supported credentials, AWS identifiers, IP addresses, emails and phone numbers
- A Strands privacy-review skill using Amazon Bedrock and structured output
- Privacy boundary: the agent receives finding categories and counts, never screenshot pixels, OCR text or detected values
- Suggested masks plus adjustable and manual masks
- Flattened PNG export that permanently replaces selected pixels
- Cognito-authenticated workspace
- Private S3 storage of the reviewed image
- DynamoDB expiry, ownership and revocation records
- One-hour, 24-hour and seven-day share links
- Owner-controlled link revocation
- AWS system status screen
- Manual workflow when AWS scanning or the agent is unavailable

## Required checks before recording

The latest code must be deployed before showing the Strands agent or AWS status screen as live functionality.

### 1. Check the public health endpoint

Use the real route, `/api/health`:

```bash
curl -s https://a8aznijuq0.execute-api.ap-south-1.amazonaws.com/api/health \
  | python3 -m json.tool
```

After the latest backend deployment, it should include these fields:

```json
{
  "status": "ok",
  "mode": "aws",
  "region": "ap-south-1",
  "scanner": "rekognition",
  "agent": "strands-bedrock",
  "max_image_bytes": 3145728
}
```

If `region` and `agent` are missing, the endpoint is healthy but the Lambda is still running an older deployment. Redeploy the backend before recording the Strands feature.

### 2. Test the complete flow

Use a fictional screenshot and verify:

1. Registration and sign-in
2. **Scan with AWS**
3. **Review with Strands agent**
4. Manual mask editing
5. PNG export
6. Share-link creation
7. Public share opening
8. Revocation
9. **AWS system status**

If the Strands request fails, do not claim it is working. Fix the Bedrock deployment or record only the features verified end to end.

### 3. Prepare AWS evidence

Open these before recording so the video has no waiting:

- DemoSafe application
- CloudFormation `demosafe` stack
- CloudWatch log group for the DemoSafe Lambda function
- Terminal with the formatted health command ready

## Safe fictional demo data

Create a clean terminal-style screenshot containing only fictional values:

```text
Demo deployment report
Account: 123456789012
Instance: i-0123456789abcdef0
Public IP: 203.0.113.42
Security group: sg-0123456789abcdef0
Email: demo.user@example.com
API_KEY = sk-fictional-demo-value-123456
Status: Running
```

Never record real credentials, account IDs, customer data, personal messages or billing details. Close unrelated tabs and disable desktop notifications.

## Final timed script

### 0:00–0:18 — The problem

**Show:** The fictional screenshot. Zoom briefly into the account ID, email, IP address and token.

**Say:**

> Developers, students and support teams share screenshots every day. One overlooked email, cloud identifier, IP address or token can turn a useful screenshot into a security incident. DemoSafe adds a privacy release gate before the image is shared.

### 0:18–0:35 — Upload and product promise

**Show:** Sign in to DemoSafe and upload the fictional screenshot.

**Say:**

> DemoSafe combines AWS-assisted discovery with human review. Automation suggests what may be risky, but the person still makes the final decision.

### 0:35–1:00 — Scan with AWS

**Show:** Select the AWS consent checkbox, click **Scan with AWS**, and show the suggested masks and labels.

**Say:**

> After explicit consent, API Gateway sends the request to our FastAPI application on Lambda. Amazon Rekognition reads visible text and its coordinates. Our deterministic rules then suggest masks for supported credentials, personal details and infrastructure identifiers.

### 1:00–1:23 — Strands privacy review

**Show:** Click **Review with Strands agent**. Show the risk badge, priorities and checklist.

**Say:**

> The Strands agent uses Amazon Bedrock to turn the findings into a short review plan. For privacy, the model receives only category names and counts, such as two email findings. It never receives the screenshot, OCR text or secret values, and it cannot publish anything.

### 1:23–1:47 — Human control and permanent redaction

**Show:** Adjust or remove one suggestion, then draw one manual mask. Export the PNG and briefly open it.

**Say:**

> Every suggestion is editable. I can correct a false positive or manually cover something OCR missed. DemoSafe renders a new PNG with the selected pixels permanently replaced, rather than placing a removable webpage overlay over the original.

### 1:47–2:12 — Controlled sharing

**Show:** Choose a 24-hour expiry, confirm the review and create the link. Open it in a private window.

**Say:**

> When I publish, only the normalized redacted PNG is stored in a private S3 bucket. DynamoDB records its owner and expiry. The recipient sees the reviewed copy through a limited public link, never the original upload.

### 2:12–2:27 — Revoke access

**Show:** Open **My shares**, revoke the link, and refresh the public page.

**Say:**

> The owner can revoke access immediately. Expiry is also enforced, and old published images are removed by the storage lifecycle policy.

### 2:27–2:48 — AWS proof

**Show:** Open **AWS system status**, then cut quickly to the CloudFormation stack, formatted health response and recent CloudWatch invocation.

**Say:**

> This is the deployed AWS path: Cognito protects the workspace, API Gateway routes requests, Lambda runs the backend, Rekognition performs OCR, Bedrock powers the Strands review, and S3 with DynamoDB controls sharing. CloudFormation reproduces the stack and CloudWatch provides runtime evidence.

### 2:48–3:00 — Learning and close

**Show:** Return to the successfully redacted screenshot or final DemoSafe screen.

**Say:**

> We learned how to connect authentication, OCR, privacy-bounded AI, serverless compute and controlled storage into one working release flow. DemoSafe helps people share the work while keeping the secrets.

## Recording plan

Record the product flow first and the AWS Console evidence as separate short clips. Edit them together afterward. This prevents network delays or console loading from consuming the three-minute limit.

Suggested clips:

1. Fictional screenshot close-up
2. Upload and Rekognition scan
3. Strands review result
4. Mask edit and exported PNG
5. Share creation and public view
6. Revoked-link result
7. AWS status, CloudFormation, health JSON and CloudWatch
8. Closing product screen

## Final recording checklist

- Keep the finished video at or below three minutes.
- Record at 1080p with browser zoom around 100–125%.
- Use a clean demo account and fictional screenshot.
- Use the public frontend URL for the final submission, not `127.0.0.1`.
- Verify AWS scan and Strands review immediately before recording.
- Show the human changing at least one mask.
- Show the flattened result and revoked-link result.
- Keep AWS Console clips short and readable.
- Add captions and remove typing, loading and deployment waits.
- Do not show account billing, credentials or unrelated browser tabs.
- Do not claim an AWS service is working unless the recorded flow or console evidence proves it.

## Scope decision

Do not add another major feature before recording. The competitive advantage is the complete privacy workflow: AWS-assisted discovery, a bounded agent, human judgment, permanent redaction and controlled sharing. Reliability and a clear story will score better than more unfinished features.
