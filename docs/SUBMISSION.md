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

## One-sentence pitch

DemoSafe is a privacy release gate that uses AWS-assisted detection and human review to permanently redact sensitive screenshot content before creating an expiring, revocable share link.

## Problem statement

Developers, support teams, educators, founders, and creators regularly share screenshots in bug reports, documentation, tutorials, chats, and social posts. Those images can accidentally reveal account IDs, IP addresses, cloud resource names, credentials, tokens, email addresses, customer information, or unrelated notifications. People often notice the exposure only after the screenshot has been published or copied elsewhere.

Existing manual blur tools depend entirely on the user noticing every risky field. Fully automatic tools create a different problem: false positives can destroy useful context, while false negatives create a misleading sense of safety. Teams need a fast review step that assists the user without removing human judgment.

## Solution

DemoSafe scans an uploaded screenshot with Amazon Rekognition, maps detected text and coordinates to conservative privacy rules, and displays reviewable masking suggestions. The user can accept, remove, adjust, or add masks before exporting a new flattened PNG. After confirmation, the reviewed image can be published through a link with a selected expiry and can be revoked by its owner.

The workflow is:

`Upload → consent to AWS scan → review suggestions → add manual masks → flatten redactions → create expiring link → revoke when needed`

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
