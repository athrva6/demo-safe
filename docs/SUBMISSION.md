# DemoSafe: hackathon submission content

Replace every `[ADD ...]` field before submitting. The remaining sections are ready to copy into a submission form, README, or presentation.

## Project details

**Project name:** DemoSafe

**Tagline:** Share the work. Keep the secrets.

**Track:** Ship It — deployed with a URL

**Repository:** https://github.com/athrva6/demo-safe

**Live application:** `[ADD AMPLIFY OR OTHER PUBLIC FRONTEND URL]`

**Demo video:** `[ADD VIDEO URL]`

**Team members and roles:** `[ADD NAMES AND ROLES]`

## Executive summary

DemoSafe is a privacy release gate for screenshots. It helps developers, support teams, students, educators, founders, and creators find likely sensitive information before an image is published. Amazon Rekognition extracts visible text and coordinates, deterministic rules identify supported risk patterns, and a privacy-bounded Strands agent using Amazon Bedrock turns sanitized finding categories into a review checklist. The user remains in control of every mask.

After review, DemoSafe renders a new flattened PNG in which the selected pixels are permanently replaced. The reviewed image can be downloaded or published through an expiring, owner-revocable link. Amazon Cognito protects the private workspace, API Gateway and Lambda run the backend, S3 stores only the reviewed shared image, and DynamoDB manages ownership, expiry, and revocation.

## Why DemoSafe

Screenshots are easy to create and difficult to recall after sharing. A single image can expose an API token, AWS account ID, public IP address, customer email, internal URL, browser notification, or unrelated tab. Manual editors help only when the sender notices every risky detail. Fully automatic redaction can remove useful context or create false confidence when something is missed.

DemoSafe addresses that gap with a deliberate release workflow:

1. **Assistance instead of blind automation:** AWS helps locate supported risks, while the user makes the final decision.
2. **Permanent redaction:** the exported PNG contains replaced pixels, not a removable webpage overlay.
3. **Controlled distribution:** share links can expire and be revoked by their owner.
4. **Privacy-bounded AI:** the agent receives category names and counts rather than image pixels, OCR text, or detected values.
5. **Graceful fallback:** manual masks remain available when OCR or the agent misses an item or is temporarily unavailable.

## One-sentence pitch

DemoSafe is a privacy release gate that uses AWS-assisted detection and human review to permanently redact sensitive screenshot content before creating an expiring, revocable share link.

## Problem statement

Developers, support teams, educators, founders, and creators regularly share screenshots in bug reports, documentation, tutorials, chats, and social posts. Those images can accidentally reveal account IDs, IP addresses, cloud resource names, credentials, tokens, email addresses, customer information, or unrelated notifications. People often notice the exposure only after the screenshot has been published or copied elsewhere.

Existing manual blur tools depend entirely on the user noticing every risky field. Fully automatic tools create a different problem: false positives can destroy useful context, while false negatives create a misleading sense of safety. Teams need a fast review step that assists the user without removing human judgment.

## Solution

DemoSafe scans an uploaded screenshot with Amazon Rekognition, maps detected text and coordinates to conservative privacy rules, and displays reviewable masking suggestions. The user can accept, remove, adjust, or add masks before exporting a new flattened PNG. After confirmation, the reviewed image can be published through a link with a selected expiry and can be revoked by its owner.

The workflow is:

`Upload → consent to AWS scan → review suggestions → add manual masks → flatten redactions → create expiring link → revoke when needed`

## Demo scenario

Prachi is preparing a technical post about an AWS deployment. Her terminal screenshot contains a fictional account ID, EC2 instance ID, public IP address, email address, and API token. Posting the original image would expose unnecessary infrastructure and personal information.

She uploads the image to DemoSafe and explicitly consents to AWS scanning. Rekognition returns text locations, DemoSafe suggests masks for supported patterns, and the Strands agent prioritizes the finding categories without receiving the screenshot or secret values. Prachi reviews the suggestions, adjusts one mask, and manually covers a detail that OCR did not select. She exports the flattened PNG, creates a 24-hour link, shares it, and later revokes the link from **My shares**.

This scenario demonstrates the complete value chain: discovery, explanation, human judgment, irreversible image redaction, limited sharing, and revocation.

## Before and after

| Stage        | What the user sees                                                                                      | Privacy outcome                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Before       | A terminal screenshot containing an account ID, instance ID, IP address, email, and fictional API token | Publishing it would expose unnecessary identifiers and contact details            |
| Detection    | Suggested boxes and risk labels from Rekognition plus deterministic rules                               | Likely exposure becomes visible, but no publishing decision is made automatically |
| Human review | Editable suggestions, manual masks, and a Strands priority checklist                                    | The user corrects false positives and covers details automation may have missed   |
| After        | A newly rendered PNG with solid masks replacing the selected pixels                                     | The protected pixels are no longer present in the shared image                    |
| Shared       | An expiring link containing only the reviewed PNG                                                       | Access can expire automatically or be revoked early by the owner                  |

**Before screenshot:** `[ADD IMAGE OR REPOSITORY PATH]`

**After screenshot:** `[ADD IMAGE OR REPOSITORY PATH]`

## Intended users

- Developers sharing terminal, cloud-console, log, and error screenshots
- Support teams handling customer screenshots
- Students and educators creating technical tutorials
- Founders and creators publishing product updates or demos
- Teams attaching screenshots to issues and documentation

## Core features

- Amazon Rekognition OCR with bounding-box suggestions
- Strands and Amazon Bedrock review using only sanitized finding categories and counts
- Detection for AWS account IDs, IP addresses, AWS resource IDs, ARNs, SSH key names, emails, Indian phone numbers, labelled credentials, and supported token formats
- Human review with adjustable suggestions and manual masks
- Flattened PNG export that permanently replaces selected pixels
- One-hour, 24-hour, or seven-day share expiry
- Immediate owner-controlled revocation
- Cognito-authenticated private workspace
- Private S3 storage for published redacted images
- DynamoDB ownership, expiry, and revocation records
- Manual workflow when automated detection misses an item

## What makes it different

DemoSafe is not only an OCR scanner or a blur editor. It combines four controls in one release workflow:

1. AWS-assisted discovery reduces the chance that the user overlooks common sensitive patterns.
2. Human review prevents automation from silently deciding what is safe.
3. Flattening removes the selected pixels from the published file instead of applying a removable visual overlay.
4. Expiry and revocation reduce continued access after the image has served its purpose.

The product communicates uncertainty directly: detection can miss content, so users must review the final image before publishing.

## AWS architecture

| AWS service              | Purpose                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| AWS Amplify Hosting      | Hosts the React frontend over HTTPS after the public deployment is completed |
| Amazon Cognito           | Handles user registration, sign-in, and JWT authentication                   |
| Amazon API Gateway       | Exposes protected owner routes and limited public share routes               |
| AWS Lambda               | Runs the FastAPI backend without a continuously running server               |
| Amazon Rekognition       | Extracts screenshot text and bounding boxes for privacy rules                |
| Amazon Bedrock           | Runs Amazon Nova for the structured privacy review                           |
| Strands Agents SDK       | Loads the privacy-review skill and validates structured output               |
| Amazon S3                | Privately stores only normalized, redacted published PNGs                    |
| Amazon DynamoDB          | Stores ownership, expiry, and revocation state with TTL                      |
| Amazon CloudWatch        | Stores Lambda operational logs                                               |
| AWS SAM / CloudFormation | Defines and deploys the reproducible serverless stack                        |

The infrastructure is defined in `infra/template.yaml`. The frontend never contains AWS credentials. API Gateway validates Cognito JWTs before protected requests reach Lambda.

## Privacy and security design

- The user must explicitly opt in before a screenshot is sent to AWS OCR.
- Detection results contain labels and coordinates without returning raw matched secrets.
- The original uploaded screenshot is not stored in the publishing bucket.
- Only the newly rendered redacted PNG is eligible for sharing.
- The S3 bucket blocks public access and requires encrypted transport.
- Public routes expose only safe metadata and the reviewed image associated with an active token.
- Share ownership is derived from verified Cognito claims rather than client-provided identity headers.
- Links expire and can be revoked; previously downloaded copies cannot be recalled.

### Why users can trust the workflow

DemoSafe does not ask users to trust an unexplained AI decision. Its source code and SAM infrastructure make the data flow inspectable. File selection and manual editing happen in the browser. A screenshot is transmitted to AWS only after explicit scan consent, and the original is not stored in the sharing bucket. API Gateway verifies Cognito access tokens before private operations reach Lambda. Only the flattened, reviewed PNG can be uploaded to the private S3 bucket, while DynamoDB stores access-control metadata rather than image content or detected values.

This trust has clear boundaries. Rekognition receives the user-approved image for OCR, an active share link acts as access to its reviewed image, and revocation cannot recall a previously downloaded copy. Users who cannot allow cloud OCR can continue with manual masking but should not enable AWS scanning.

### Screenshot scope

DemoSafe accepts single-frame PNG and JPEG images up to 3 MB, under 6 megapixels, and at most 4096 pixels per side. Automatic detection is optimized for text-heavy developer, cloud-console, dashboard, configuration, error, documentation, admin, and support screenshots. Manual masks work on any supported image.

The current automatic path is not designed to reliably detect faces, QR codes, handwriting, notifications, browser tabs, non-text graphics, unsupported languages, or video frames. The final visual checklist and mandatory human review exist because these areas can be missed.

## Responsible AI

DemoSafe treats AI as a review assistant rather than an authority. The product does not claim that an image is safe, and it does not publish, delete, or alter content without a direct user action.

- **Data minimization:** the Strands agent receives only allow-listed finding categories and counts. It does not receive the screenshot, raw OCR text, detected values, filenames, share links, or account identifiers.
- **Deterministic detection boundary:** pattern rules identify supported categories before the agent is called. The model prioritizes known findings; it does not invent image coordinates.
- **Human oversight:** every suggested mask can be accepted, adjusted, removed, or supplemented manually.
- **Clear uncertainty:** the interface states that OCR and detection can miss content and requires review before sharing.
- **No autonomous publishing:** the agent cannot export an image, create a share, or revoke a link.
- **Structured output:** Strands validates the model response against a bounded schema containing risk level, priorities, actions, and a checklist.
- **Fallback behavior:** if Bedrock is unavailable, deterministic suggestions and manual masking remain usable.
- **Honest limitations:** false positives and false negatives remain possible; revocation cannot recall files that recipients already downloaded.

### Agent workflow

DemoSafe uses the open-source Strands Agents SDK with Amazon Bedrock and Amazon Nova 2 Lite. Rekognition and deterministic rules perform detection first. The backend then allow-lists the resulting labels and sends only category names and counts to the agent. The `privacy-review` Agent Skill instructs the model to prioritize only supplied findings, avoid invented detections, avoid safety guarantees, and return a final visual checklist. Strands validates the output against a bounded Pydantic schema.

The agent has no access to the screenshot, raw OCR text, detected values, S3, DynamoDB, share publishing, revocation, or mask-editing actions. It provides advice; the person remains the decision-maker.

## Screenshots and product walkthrough

Add the following screenshots to the final submission in this order. Use only fictional data and crop out unrelated tabs, notifications, account details, and billing information.

1. **Sign-in screen** — Cognito-protected DemoSafe workspace.
2. **Original fictional screenshot** — the example before any masks are applied.
3. **AWS scan results** — Rekognition suggestions and supported risk labels.
4. **Strands privacy review** — risk badge, priority list, and final visual checklist.
5. **Human mask editing** — one adjusted suggestion and one manually drawn mask.
6. **Before/after comparison** — original fictional image beside the flattened PNG.
7. **Controlled sharing** — expiry selector and newly created link.
8. **My shares** — active item with its expiry and revoke action.
9. **Revoked link** — unavailable public-share result after revocation.
10. **AWS system status** — deployed mode, region, Rekognition, and Strands/Bedrock configuration.
11. **AWS proof** — CloudFormation stack and a recent CloudWatch Lambda invocation.

Suggested caption format:

> **Figure [NUMBER] — [SCREEN NAME].** [One sentence explaining the user value and the AWS service involved.]

## Idea and impact

DemoSafe addresses a narrow, frequent, and understandable security mistake: accidentally sharing sensitive information in screenshots. Its value is immediate for the person publishing the image and for the organization whose infrastructure or customer information could otherwise be exposed.

The practical outcome is measurable inside the product: the sender reviews suggested regions, publishes only a flattened copy, selects an expiry, and can revoke access. The recipient never needs access to the original screenshot.

## Execution evidence

- The AWS backend is deployed in `ap-south-1`.
- Cognito registration and authenticated API access work.
- Rekognition scanning was verified end to end through the deployed Lambda execution role.
- API Gateway CORS and Cognito authorization were tested from the browser.
- The current local validation passes 26 backend tests and the frontend production build.
- Manual masking, PNG export, expiring links, share listing, and revocation are implemented.

## Validation and testing

The project uses automated checks plus manual end-to-end validation.

### Automated validation

```bash
npm run check
```

The current result is:

- Frontend TypeScript validation and Vite production build: passed
- Backend Pytest suite: 26 tests passed
- Privacy-review Agent Skill discovery and strict validation: passed
- Detection, sharing, expiry, revocation, image normalization, and agent response-schema tests: passed

### AWS deployment validation

The `demosafe` CloudFormation stack was updated successfully in `ap-south-1`. The public health endpoint returns deployed mode, region, Rekognition, and Strands/Bedrock configuration:

```bash
curl -s https://a8aznijuq0.execute-api.ap-south-1.amazonaws.com/api/health \
  | python3 -m json.tool
```

Expected response:

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

The health response proves that API Gateway reached the deployed Lambda and shows its configured providers. It does not by itself prove that a Rekognition or Bedrock operation succeeded. End-to-end evidence should therefore also include a successful scan, successful Strands review, and a recent CloudWatch invocation produced during that test.

### Manual release test

Before submitting, test this sequence from the final public frontend URL:

`Register → sign in → upload → scan → agent review → edit masks → export → share → open → revoke`

Record the date, browser, public URL, result, and tester in the final submission notes:

| Date         | Browser         | Public URL  | Result        | Tester       |
| ------------ | --------------- | ----------- | ------------- | ------------ |
| `[ADD DATE]` | `[ADD BROWSER]` | `[ADD URL]` | `[PASS/FAIL]` | `[ADD NAME]` |

## Demo instructions

### Preparation

1. Deploy the latest backend and confirm the CloudFormation stack is `UPDATE_COMPLETE`.
2. Deploy the frontend and update the backend `FrontendOrigin` to the exact HTTPS origin.
3. Use a clean Cognito demo account and only fictional screenshot data.
4. Run the complete manual release test once immediately before recording.
5. Open DemoSafe, CloudFormation, CloudWatch, and the formatted health command in advance.

### Three-minute walkthrough

1. **Problem:** show the fictional unredacted screenshot and identify the exposure risk.
2. **AWS scan:** upload it, consent, and select **Scan with AWS**.
3. **Responsible AI:** select **Review with Strands agent** and explain that the agent sees only categories and counts.
4. **Human control:** adjust one suggestion and add one manual mask.
5. **Permanent result:** export and open the flattened PNG.
6. **Controlled sharing:** create a 24-hour link and open it in a private window.
7. **Revocation:** revoke the link from **My shares** and refresh the public page.
8. **AWS proof:** briefly show **AWS system status**, the CloudFormation stack, health JSON, and recent CloudWatch invocation.

Use the timed narration in [DEMO_VIDEO.md](DEMO_VIDEO.md). Do not spend recording time on installation, terminal typing, deployment, or loading screens; record short working clips and edit them together.

Before submission, add evidence for the final public frontend:

- Public URL: `[ADD URL]`
- Deployment screenshot or commit: `[ADD REFERENCE]`
- Final GitHub Actions run: `[ADD RUN URL]`

## What we learned

We learned how to connect browser authentication, protected APIs, serverless compute, OCR, a privacy-bounded Strands agent, private object storage, expiry, and revocation into one working product. During deployment, we diagnosed API Gateway preflight authorization, Lambda concurrency restrictions in a student account, and service availability differences. When Textract was unavailable for the account, we validated Amazon Rekognition with a synthetic image, updated the IAM policy and OCR adapter, and verified the complete deployed path rather than presenting an untested architecture.

We also learned an important product lesson: privacy detection should assist judgment rather than claim certainty. That led us to keep manual masks, require final confirmation, and explain that OCR may miss information.

## Limitations

- OCR and pattern matching can miss sensitive visual or textual content.
- Pattern rules can produce false positives and currently cover a defined set of common identifiers.
- Revocation prevents future access through DemoSafe but cannot delete copies already downloaded by a viewer.
- The current product scans still screenshots rather than complete video recordings.
- Rekognition receives the selected image only after consent; teams with stricter requirements may prefer an entirely local scanner.

## Roadmap

1. Browser extension and share-sheet integration for review before posting
2. Organization-specific detection policies and custom patterns
3. QR-code, face, notification, and browser-tab detection
4. Batch review for documentation and support workflows
5. Audit summaries that record categories and decisions without storing detected secrets
6. Video-frame scanning for recorded demos

## Final submission checklist

- Deploy the frontend and replace the live URL placeholder.
- Test sign-up, sign-in, scan, export, share, public view, expiry, and revoke on the public URL.
- Update the SAM `FrontendOrigin` parameter to the exact public HTTPS origin.
- Record a video no longer than three minutes using only fictional data.
- Add the final video URL, public URL, team roles, and GitHub Actions link.
- Confirm the repository branch containing the submission is merged into `main`.
- Verify every team member has the required hackathon profile and registration.
