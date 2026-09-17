# DemoSafe AWS track: Ship It

DemoSafe is entered in the **Ship It** track because the goal is a deployed application with a public URL. The local Build It mode is only the development fallback.

## Service map

| Service | What our teammate should know |
| --- | --- |
| Amplify Hosting | Hosts the React frontend and gives us the demo URL. |
| Cognito | Signs users in and protects owner actions. |
| API Gateway | Exposes the `/api` routes to the frontend. |
| Lambda | Runs the FastAPI backend without an EC2 server. |
| Textract | Extracts text and bounding boxes from uploaded screenshots. |
| S3 | Stores only normalized, redacted PNGs in a private bucket. |
| DynamoDB | Stores share owner, expiry, and revocation state. |
| CloudWatch | Keeps Lambda logs for debugging and the demo. |

## Deployment order

1. Run `bash scripts/install-sam.sh` if `sam` is not installed.
2. Build and deploy `infra/template.yaml` with SAM.
3. Copy the `ApiUrl`, `UserPoolId`, and `UserPoolClientId` stack outputs into `frontend/.env`.
4. Run the frontend locally against the deployed API.
5. Host the frontend with Amplify and update the SAM `FrontendOrigin` parameter to the Amplify URL.

The complete service definitions and least-privilege Lambda permissions are in [`infra/template.yaml`](../../infra/template.yaml).

## What to show judges

`Upload → Textract scan → review findings → flattened redacted PNG → expiring share → revoke`

EC2 and security groups are not part of this architecture.
