# DemoSafe: project and setup guide

This is the first document a new team member should read. It explains what DemoSafe is, how the code is organized, which AWS services are involved, and how to run or deploy it.

## 1. The project in simple words

People share screenshots in GitHub issues, tutorials, support chats and social posts. Those screenshots can accidentally contain email addresses, API tokens, AWS account IDs, IP addresses, internal URLs or notifications.

DemoSafe is a privacy review step before sharing a screenshot:

1. The user uploads a screenshot.
2. The user explicitly chooses whether to send it to AWS for scanning.
3. Amazon Rekognition reads visible text and returns text locations.
4. DemoSafe's deterministic rules identify supported sensitive patterns.
5. Suggested masks appear over risky areas.
6. The Strands privacy agent can prioritize the finding categories and produce a review checklist. It receives categories and counts, never the screenshot or detected values.
7. The user accepts, adjusts, removes or adds masks.
8. DemoSafe renders a new PNG with the selected pixels permanently replaced.
9. The user can download it or create an expiring, revocable share link.

The product does not claim that AI makes a screenshot safe. OCR and rules can miss details, so the human always makes the final decision.

## 2. Problem statement

> Developers, students, support teams and creators can accidentally expose sensitive information when sharing screenshots. Build a privacy release gate that detects likely exposure, keeps a human in control, permanently redacts approved regions and shares only the reviewed copy through an expiring, revocable link.

## 3. Why this is more than a blur tool

- **Assisted discovery:** AWS OCR and conservative rules help find details the user may overlook.
- **Privacy-aware agent:** Strands with Amazon Bedrock explains the risk order using sanitized category counts.
- **Human review:** the user can correct false positives and cover details automation missed.
- **Permanent output:** masks are flattened into a new PNG rather than placed as removable webpage overlays.
- **Controlled sharing:** links expire and can be revoked.
- **Private storage:** the share bucket receives only the normalized, reviewed PNG, never the original upload.

## 4. Architecture

```text
React browser application
        |
        | Cognito access token
        v
Amazon API Gateway
        |
        v
AWS Lambda running FastAPI
   |          |            |
   |          |            +--> Strands Agents SDK --> Amazon Bedrock
   |          +---------------> Amazon Rekognition OCR
   +--> Amazon S3 + DynamoDB

CloudWatch receives Lambda logs.
AWS SAM and CloudFormation define and deploy the backend.
```

### AWS services and their jobs

| Service                  | Role                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Amazon Cognito           | Registration, sign-in and access tokens for private operations                      |
| Amazon API Gateway       | Public API URL, routing, CORS, throttling and JWT protection                        |
| AWS Lambda               | Runs the FastAPI backend without a continuously running server                      |
| Amazon Rekognition       | Extracts screenshot text and bounding boxes after user consent                      |
| Amazon Bedrock           | Runs Amazon Nova for the structured privacy review                                  |
| Strands Agents SDK       | Loads the privacy-review skill and requests structured model output                 |
| Amazon S3                | Privately stores normalized redacted PNGs used by share links                       |
| Amazon DynamoDB          | Stores owner, expiration and revocation records                                     |
| Amazon CloudWatch        | Stores Lambda execution logs                                                        |
| AWS SAM / CloudFormation | Creates the serverless resources from `infra/template.yaml`                         |
| AWS Amplify Hosting      | Intended public hosting for the React frontend; deploy this before final submission |

## 5. Repository map

```text
demo-safe/
├── frontend/                 React and TypeScript user interface
│   ├── src/main.tsx          Main editor, sharing and AWS status screens
│   ├── src/api.ts            API requests and Cognito token handling
│   ├── src/AuthGate.tsx      Cognito sign-in and registration screen
│   ├── src/image.ts          Image loading, masking and flattened PNG export
│   └── .env.example          Frontend environment variable template
├── backend/                  Python FastAPI application packaged for Lambda
│   ├── app/main.py           API routes, uploads, scanning and sharing
│   ├── app/detection.py      Sensitive-pattern rules and OCR box conversion
│   ├── app/storage.py        Local and AWS storage implementations
│   ├── app/agent_review.py   Strands and Bedrock structured privacy review
│   ├── skills/privacy-review/SKILL.md
│   │                          Agent privacy policy and review instructions
│   ├── tests/                Backend tests
│   └── .env.example          Local backend configuration template
├── infra/template.yaml       Complete AWS SAM infrastructure definition
├── scripts/setup.sh          Installs local Node and Python dependencies
├── scripts/install-sam.sh    Installs a project-local SAM CLI
├── docs/                     Team, deployment, demo and submission guides
├── amplify.yml               Amplify frontend build configuration
└── .github/workflows/        GitHub Actions checks
```

## 6. First-time local setup

### Requirements

- Git
- Node.js 20.19 or newer compatible version
- Python 3.12
- npm 10 is sufficient; npm 12 is not required

Check them:

```bash
git --version
node --version
npm --version
python3 --version
```

Clone and select the team branch:

```bash
git clone https://github.com/athrva6/demo-safe.git
cd demo-safe
git switch prachi
```

Install dependencies and create local environment files:

```bash
bash scripts/setup.sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

For a completely local run, keep `SCAN_PROVIDER=manual` and leave the three frontend AWS variables empty.

Start both applications:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. The frontend runs on port `5173`; the FastAPI backend runs on port `8000`. Stop both with `Ctrl+C`.

### Useful commands

```bash
npm run dev       # frontend and backend together
npm run build     # TypeScript check and production frontend build
npm test          # backend tests
npm run check     # build and tests together
```

Do not run `npm install -g npm@12` on Node 20.20.2. That npm version requires a newer Node release and is unnecessary for DemoSafe.

## 7. Connect the local frontend to the deployed AWS backend

Select the credited AWS CLI profile and verify the account before deploying:

```bash
export AWS_PROFILE=credits
aws sts get-caller-identity
```

The returned account must be the account where the hackathon credits and DemoSafe stack belong. Never commit AWS credentials.

Read the CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name demosafe \
  --region ap-south-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

Put the API, user-pool and client outputs in the ignored `frontend/.env` file:

```env
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_COGNITO_USER_POOL_CLIENT_ID=YOUR_CLIENT_ID
```

Restart `npm run dev` after editing an environment file. Cognito sign-in will appear when all three values are present.

## 8. Deploy or update the AWS backend

Install SAM if required:

```bash
bash scripts/install-sam.sh
SAM=.tools/sam/bin/sam
```

Build and deploy with the correct AWS profile:

```bash
export AWS_PROFILE=credits
$SAM build --template-file infra/template.yaml
$SAM deploy --guided \
  --template-file .aws-sam/build/template.yaml \
  --stack-name demosafe \
  --region ap-south-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides FrontendOrigin=http://127.0.0.1:5173
```

During guided deployment:

- keep the stack name `demosafe`;
- use `ap-south-1`;
- allow SAM to create IAM roles;
- save settings to `samconfig.toml`;
- use `samconfig.toml` as the configuration filename, not `y`;
- keep rollback enabled unless debugging a failed resource creation.

When the public frontend is deployed, redeploy with its exact HTTPS origin instead of the localhost origin.

## 9. Confirm the deployment

### Application-friendly proof

Sign in and open **AWS system status** in the DemoSafe sidebar. It presents the backend response and configured providers. A configured label is not a live probe of every service, so use the AWS Console evidence below as well.

### Terminal health proof

The correct route is `/api/health`:

```bash
curl -s https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/api/health \
  | python3 -m json.tool
```

Expected fields include:

```json
{
  "status": "ok",
  "mode": "aws",
  "region": "ap-south-1",
  "scanner": "rekognition",
  "agent": "strands-bedrock"
}
```

This proves API Gateway can reach Lambda. It does not by itself prove that an OCR or Bedrock request succeeded.

### Strong AWS Console proof

1. Open CloudFormation and show the `demosafe` stack in `CREATE_COMPLETE` or `UPDATE_COMPLETE` state.
2. Perform **Scan with AWS** in DemoSafe using fictional data.
3. Perform **Review with Strands agent**.
4. Open CloudWatch and show a recent invocation for the DemoSafe Lambda function.
5. Show the S3 bucket's public-access block and the DynamoDB table without exposing private content.

## 10. Demo flow for the hackathon

Use only fictional data. A simple three-minute story is stronger than a long feature list:

1. Explain how a screenshot can leak an account ID, email, IP address or token.
2. Upload the fictional screenshot.
3. Consent to AWS scanning and select **Scan with AWS**.
4. Show the suggested masks and the Strands risk checklist.
5. Adjust one suggestion and draw one manual mask to prove human control.
6. Export the flattened PNG.
7. Create a 24-hour share link and open it.
8. Revoke the link and show that it becomes unavailable.
9. Open **AWS system status**, then briefly show CloudFormation and CloudWatch.

## 11. Suggested team responsibilities

| Area                  | Responsibility                                                          |
| --------------------- | ----------------------------------------------------------------------- |
| Product and demo      | Problem story, fictional test image, narration and final recording      |
| Frontend              | Editor usability, status screen, responsive layout and public hosting   |
| Backend and detection | API behavior, detection rules, Strands output and tests                 |
| AWS and evidence      | SAM deployment, Amplify, CloudFormation, CloudWatch and cost monitoring |
| Submission            | README, screenshots, public URL, video URL and final form               |

One person can own multiple areas, but every team member should understand the complete upload-to-share flow.

## 12. Common problems

### The frontend does not open

Run `npm run dev` from the repository root. Read the first Vite error above the lifecycle message; the lifecycle message alone is only a summary.

### `Failed to fetch`

Check that the backend is running, `VITE_API_BASE_URL` is correct and API Gateway allows the exact frontend origin. Restart Vite after changing `.env`.

### The API returns `401`

Protected routes need a valid Cognito access token. Sign in again. The public `/api/health` endpoint should not require authentication.

### AWS scan fails

Verify the selected AWS profile, region, Lambda role permission for `rekognition:DetectText`, and recent CloudWatch error logs.

### Strands review fails

The deterministic scan remains usable. Check Bedrock model access in `us-east-1`, the Lambda permission for `bedrock:InvokeModel`, the `AGENT_PROVIDER` setting and CloudWatch logs. Never send raw secret values to the agent while debugging.

### SAM deployment rolls back

Inspect the first failed CloudFormation event rather than only the final rollback message:

```bash
aws cloudformation describe-stack-events \
  --stack-name demosafe \
  --region ap-south-1 \
  --query 'StackEvents[?contains(ResourceStatus, `FAILED`)].[Timestamp,LogicalResourceId,ResourceStatusReason]' \
  --output table
```

## 13. Current limitations

- OCR and pattern matching can miss sensitive information or produce false positives.
- The Strands agent prioritizes known categories; it does not inspect the screenshot or discover new regions.
- Link revocation prevents future DemoSafe access but cannot recall a copy someone already downloaded.
- The project currently handles screenshots, not complete video files.
- Amplify hosting must be completed before the final submission can claim a public frontend URL.

## 14. Before the final submission

- Deploy the frontend and replace all live-URL placeholders.
- Test registration, sign-in, scan, agent review, manual masking, export, share, expiry and revocation from the public URL.
- Confirm the CloudFormation stack and Lambda logs are in the credited AWS account.
- Record a video under three minutes with fictional data.
- Add the final video URL, application URL, GitHub Actions run and team roles.
- Merge the accepted submission version into `main` only after the team reviews it.

For deeper details, continue with [DEPLOYMENT.md](DEPLOYMENT.md), [AGENTS.md](AGENTS.md), [DEMO_VIDEO.md](DEMO_VIDEO.md) and [SUBMISSION.md](SUBMISSION.md).
