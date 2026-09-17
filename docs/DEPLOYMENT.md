# AWS deployment

## Prerequisites

Use Node 20.19+, Python 3.12, AWS CLI, and AWS SAM CLI. Your Node 20.20.2 is supported. npm 12 requires Node 22.22.2+ and is not needed.

```bash
node --version
python3 --version
aws --version
sam --version
aws sts get-caller-identity
```

If `sam` is missing, install it from the official AWS guide: <https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html>

Or install a project-local copy without changing the system:

```bash
bash scripts/install-sam.sh
SAM=.tools/sam/bin/sam
```

## Deploy the backend

```bash
$SAM build --template-file infra/template.yaml
$SAM deploy --guided \
  --template-file .aws-sam/build/template.yaml \
  --stack-name demosafe \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides FrontendOrigin=http://127.0.0.1:5173
```

Save the `ApiUrl`, `UserPoolId`, and `UserPoolClientId` outputs in the ignored file `frontend/.env`:

```env
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_COGNITO_USER_POOL_CLIENT_ID=YOUR_CLIENT_ID
```

Keep AWS credentials out of the frontend and out of Git. Deploy the frontend with Amplify Hosting after the backend works locally.

The Lambda function intentionally uses the account's unreserved concurrency pool. This keeps the stack compatible with student accounts that have a low initial concurrency quota; API Gateway throttling still limits request bursts.
