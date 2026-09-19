# DemoSafe technology stack

This document explains the technology used in DemoSafe, why each component exists, how data moves through the system, and the main engineering tradeoffs.

## Stack at a glance

| Layer                 | Technology           | Version or configuration                | Purpose                                                                    |
| --------------------- | -------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Web UI                | React                | 19.2                                    | Component-based screenshot editor and workspace                            |
| Language              | TypeScript           | 5.9                                     | Type-safe frontend development                                             |
| Build tool            | Vite                 | 8.3                                     | Local development and production frontend bundle                           |
| Authentication UI     | AWS Amplify UI React | 6.13                                    | Cognito registration and sign-in interface                                 |
| Authentication client | AWS Amplify          | 6.15                                    | Cognito configuration and access-token retrieval                           |
| Icons                 | Lucide React         | 0.577                                   | Accessible interface icons                                                 |
| Typography            | DM Sans and Manrope  | Variable font packages                  | Product typography without runtime font requests                           |
| Image rendering       | Browser Canvas API   | Browser native                          | Mask editing and flattened PNG generation                                  |
| Backend language      | Python               | 3.12                                    | Serverless API and detection logic                                         |
| API framework         | FastAPI              | 0.115+                                  | Typed HTTP routes and request validation                                   |
| Lambda adapter        | Mangum               | 0.19+                                   | Runs the ASGI FastAPI application on Lambda                                |
| Image processing      | Pillow               | 11–12                                   | Image validation, normalization, metadata removal, and safe PNG conversion |
| AWS SDK               | boto3                | 1.35+                                   | Rekognition, S3, and DynamoDB calls                                        |
| Agent framework       | Strands Agents SDK   | 1.56.0                                  | Agent Skill loading and structured model output                            |
| AI model              | Amazon Nova 2 Lite   | Bedrock model `amazon.nova-2-lite-v1:0` | Risk prioritization and review checklist                                   |
| Infrastructure        | AWS SAM              | CloudFormation transform                | Reproducible serverless deployment                                         |
| Testing               | Pytest               | Locked development requirements         | Backend behavior and security-boundary tests                               |
| CI                    | GitHub Actions       | Ubuntu runner                           | Build and test validation on pushes and pull requests                      |

## Frontend

### React and TypeScript

The frontend is a single-page React application written in TypeScript. It contains:

- Cognito sign-in and registration
- Screenshot upload and replacement
- Suggested and manually drawn masks
- Finding labels and privacy-review controls
- Flattened PNG export
- Expiring-link creation
- Share listing and revocation
- AWS system-status view

The primary files are:

| File                        | Responsibility                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| `frontend/src/main.tsx`     | Main workspace, editor, review, shares, and status screens                    |
| `frontend/src/api.ts`       | API base URL, Cognito token retrieval, authenticated requests, and share URLs |
| `frontend/src/AuthGate.tsx` | Amplify Authenticator integration                                             |
| `frontend/src/image.ts`     | Image loading, canvas drawing, masks, and PNG export                          |
| `frontend/src/styles.css`   | Responsive product styling                                                    |

### Canvas-based redaction

The browser Canvas API renders the final image. Selected regions are drawn directly into a new canvas before PNG export. This matters because the redaction is part of the output pixels rather than a removable DOM or annotation layer.

### Vite

Vite provides:

- Fast local development on `127.0.0.1:5173`
- A development proxy for the local backend
- Environment-variable injection for the API and Cognito identifiers
- Optimized static production assets

## Backend

### FastAPI

FastAPI supplies typed endpoints for:

- Health reporting
- Screenshot scanning
- Strands privacy review
- Share creation
- Owner share listing
- Revocation
- Public share metadata and image retrieval

The same application runs locally under Uvicorn and in AWS Lambda through Mangum.

### Image normalization

Pillow validates each upload before it reaches OCR or storage:

1. Enforces supported formats and size limits
2. Rejects multi-frame or oversized inputs
3. Applies EXIF orientation
4. Converts the image to a clean RGB surface
5. Removes original metadata and hidden alpha-channel content
6. Produces a new PNG

Only the user-reviewed output is eligible for share storage.

### Deterministic detection

`backend/app/detection.py` maps Rekognition text boxes to supported privacy patterns. Rules cover categories such as:

- AWS account and resource identifiers
- ARNs
- IP addresses
- Email addresses
- Indian phone numbers
- Labelled credentials
- Supported key and token formats

The detection layer returns labels and coordinates without returning matched secret values to the frontend.

## Strands and Amazon Bedrock

The agent is deliberately placed after deterministic detection.

```text
Rekognition text boxes
        ↓
Deterministic supported-pattern rules
        ↓
Allow-listed category names and counts
        ↓
Strands privacy-review skill
        ↓
Amazon Nova 2 Lite on Bedrock
        ↓
Validated risk summary, priorities, and checklist
```

### Agent privacy boundary

The agent does not receive:

- Screenshot pixels
- OCR text
- Detected values
- Filenames
- User identity
- Share links
- AWS account identifiers from the request

The `backend/skills/privacy-review/SKILL.md` file tells the agent to use only supplied categories and counts, avoid invented findings, avoid safety guarantees, and keep the user responsible for the final sharing decision.

### Structured output

Strands validates the response against Pydantic models. This bounds the response to:

- Overall risk: high, medium, or low
- Present finding labels only
- Severity and recommended review action
- A short visual checklist

Bedrock runs in `us-east-1` because that is the configured inference region for the selected Amazon Nova model. The rest of the DemoSafe stack runs in `ap-south-1`.

## AWS services

### Amazon Cognito

- Email-based accounts
- Auto-verified email
- Strong password policy
- User-pool client without a client secret
- Access tokens used by API Gateway

### Amazon API Gateway HTTP API

- Public HTTPS API endpoint
- Cognito JWT authorizer for private routes
- Explicit public health and share-view routes
- Unauthenticated OPTIONS preflight route
- CORS restricted to the configured frontend origin
- Burst and rate throttling

### AWS Lambda

| Setting          | Value             |
| ---------------- | ----------------- |
| Runtime          | Python 3.12       |
| Architecture     | x86_64            |
| Memory           | 512 MB            |
| Timeout          | 28 seconds        |
| Application mode | `aws`             |
| OCR provider     | `rekognition`     |
| Agent provider   | `strands-bedrock` |

The function uses the account's unreserved concurrency pool to remain compatible with the available student-account quota.

### Amazon Rekognition

`DetectText` receives an image only after explicit user consent. It returns text observations and geometry. DemoSafe applies its own conservative rules to those observations.

### Amazon S3

- Stores only published, normalized reviewed PNGs
- Blocks all public bucket access
- Uses bucket-owner-enforced ownership
- Encrypts objects at rest with SSE-S3
- Denies non-TLS requests
- Deletes old published images through a lifecycle rule

Public viewers receive image content through the Lambda API rather than direct public-bucket access.

### Amazon DynamoDB

- Pay-per-request billing
- Share ID as the primary key
- Owner and creation-time index for **My shares**
- Records expiry and revocation state
- DynamoDB TTL for expired records
- Server-side encryption enabled

### Amazon CloudWatch

CloudWatch stores Lambda logs for seven days. It provides:

- Recent invocation evidence
- Request IDs
- Duration and memory usage
- Sanitized backend error investigation

Application errors intentionally avoid returning provider exceptions that could expose request or credential details.

### AWS SAM and CloudFormation

`infra/template.yaml` defines:

- Cognito user pool and client
- Private S3 bucket and policy
- DynamoDB table and owner index
- API Gateway routes and authorizer
- Lambda function and least-privilege role statements
- CloudWatch log group

This allows the backend to be rebuilt instead of relying on manually created console resources.

### AWS Amplify Hosting

`amplify.yml` contains the frontend build configuration. Amplify is the intended public HTTPS host for the Ship It submission. Public hosting remains a release step until a final URL is added to the project documentation.

## Runtime data flows

### Scan flow

```text
Browser
  → authenticated POST /api/scan
  → API Gateway JWT validation
  → Lambda / FastAPI
  → image normalization
  → Rekognition DetectText
  → deterministic detection
  → labels and boxes returned to browser
```

### Agent-review flow

```text
Browser
  → labels only
  → authenticated POST /api/agent/review
  → Lambda
  → category allow-list and counts
  → Strands Agent Skill
  → Amazon Bedrock
  → validated structured checklist
```

### Share flow

```text
Browser renders flattened PNG
  → authenticated POST /api/shares
  → Lambda validates review and PNG
  → S3 stores reviewed image
  → DynamoDB stores owner, token, expiry, and revocation
  → public token route returns active reviewed share
```

## Local development

| Component          | Address                            |
| ------------------ | ---------------------------------- |
| React / Vite       | `http://127.0.0.1:5173`            |
| FastAPI / Uvicorn  | `http://127.0.0.1:8000`            |
| Local health route | `http://127.0.0.1:8000/api/health` |

Root commands:

```bash
bash scripts/setup.sh
npm run dev
npm run build
npm test
npm run check
```

## Environment configuration

### Backend

| Variable             | Local default      | Purpose                                             |
| -------------------- | ------------------ | --------------------------------------------------- |
| `APP_MODE`           | `local`            | Selects local or AWS security and storage behavior  |
| `SCAN_PROVIDER`      | `manual`           | Enables Rekognition only when explicitly configured |
| `AWS_DEFAULT_REGION` | `ap-south-1`       | Default AWS service region                          |
| `LOCAL_DATA_DIR`     | `.local`           | Ignored local share data                            |
| `ALLOWED_ORIGINS`    | Local Vite origins | CORS allow-list                                     |

### Frontend

| Variable                           | Purpose                          |
| ---------------------------------- | -------------------------------- |
| `VITE_API_BASE_URL`                | Deployed API Gateway base URL    |
| `VITE_COGNITO_USER_POOL_ID`        | Cognito user pool                |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Browser-safe user-pool client ID |

These identifiers configure the client but are not AWS secret access keys. AWS credentials must never be placed in frontend variables or committed.

## Testing and CI

### Backend tests

Pytest covers:

- Supported detection rules
- Rekognition bounding-box conversion
- Image validation and normalization
- Share creation requirements
- Expiry and revocation
- Owner isolation
- Public-token validation
- Agent request and response bounds
- Agent Skill discovery

### Frontend validation

`npm run build` performs TypeScript checking and a production Vite build.

### GitHub Actions

The workflow runs for pushes and pull requests. It installs the locked Python dependencies, installs Node dependencies, builds the frontend, and runs the backend suite.

## Security decisions

| Decision                           | Reason                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| No AWS credentials in the frontend | Browser code is public and cannot protect long-term secrets                |
| JWT validation at API Gateway      | Identity is established before protected requests reach application routes |
| Owner from verified claims         | Clients cannot select another user's identity through headers              |
| Private S3 bucket                  | Shared images are served through controlled application routes             |
| Normalized PNG only                | Removes source metadata and unsupported image complexity                   |
| Generic provider errors            | Avoids exposing credentials, request content, or infrastructure details    |
| Explicit consent for OCR           | Makes cloud processing visible to the user                                 |
| Sanitized agent input              | Minimizes data disclosed to the foundation model                           |
| Human confirmation                 | Prevents automation from silently deciding what is safe                    |

## Technology choices and tradeoffs

### Rekognition instead of Textract

Rekognition was available and verifiable in the selected account. The adapter isolates OCR geometry conversion so another OCR provider can be added later.

### Serverless instead of EC2

API Gateway, Lambda, DynamoDB, and S3 scale to zero and reduce operational work for a weekend prototype. The tradeoff is cold-start latency and Lambda package constraints.

### Solid masks instead of blur

Solid masks have a clearer privacy meaning than mild blur or pixelation. The final image is flattened, but human review is still required to confirm mask placement.

### Rules plus an agent instead of an unrestricted vision model

Rules provide reproducible coordinates and keep raw content out of the agent. The tradeoff is narrower detection coverage, which manual masks and future detectors address.

### DynamoDB and S3 instead of a single database

S3 efficiently stores binary PNG files, while DynamoDB stores small access-control records. The tradeoff is coordinating deletion and expiry across two services.

## Cost profile

DemoSafe uses serverless, pay-per-use services suited to a prototype:

- Lambda charges per request and execution duration
- API Gateway charges per API call
- Rekognition charges per analyzed image
- Bedrock charges per model input and output
- DynamoDB uses on-demand requests
- S3 charges for storage and requests
- CloudWatch charges for log ingestion and retention

The application limits image size, throttles the API, uses short log retention, and does not invoke OCR or Bedrock without a user action. Actual charges depend on region, traffic, and current AWS pricing.

## Planned stack additions

- Amplify public hosting and custom domain
- Optional local OCR engine
- QR-code and face detectors
- Password-protected and one-view links
- Organization-specific pattern policies
- CloudWatch metrics and alarms
- Evaluation dataset and detection-quality dashboard

## Related documents

- [README](../README.md)
- [Project and setup guide](PROJECT_GUIDE.md)
- [AWS deployment](DEPLOYMENT.md)
- [Strands privacy agent](AGENTS.md)
- [Hackathon submission](SUBMISSION.md)
- [Demo video](DEMO_VIDEO.md)
