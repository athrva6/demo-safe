# DemoSafe: hackathon criteria

## Idea and impact

Developers, support teams, educators, and founders regularly share screenshots in issues, documentation, social posts, and demo videos. A screenshot can expose an email address, API token, account ID, IP address, customer name, internal URL, or browser notification. DemoSafe adds a review step before publication so a useful screenshot can be shared without publishing the original sensitive data.

The measurable outcome is simple: the recipient receives only a flattened, reviewed PNG; the sender can set an expiry and revoke the link.

## Built on AWS

The Ship It architecture uses AWS services for the complete path:

| Product need | AWS service | Role in DemoSafe |
| --- | --- | --- |
| Web hosting | Amplify Hosting | Serves the React frontend over HTTPS |
| Sign-in | Amazon Cognito | Authenticates owners of private shares |
| API | API Gateway | Routes protected and public endpoints |
| Backend | AWS Lambda | Runs the FastAPI application without servers |
| OCR | Amazon Rekognition | Extracts text and bounding boxes from screenshots |
| Storage | Private Amazon S3 | Stores only normalized redacted PNGs |
| Share records | DynamoDB | Stores owner, expiry, and revocation state |
| Operations | CloudWatch | Captures Lambda logs for debugging |

The infrastructure is defined in `infra/template.yaml`. EC2 is intentionally not required.

## Learning

The team learns a first serverless deployment, Cognito JWT authentication, Rekognition OCR, S3 privacy controls, DynamoDB TTL expiry, and API Gateway routing.

## Execution

`Upload screenshot → Rekognition suggestions → human review → flattened PNG → expiring share → revoke`

Manual masks remain available when the scanner is unavailable. Detection is advisory, so the sender must confirm the final image before sharing.

## Three-minute demo script

1. Show a fictional terminal screenshot containing an email, API key, and internal URL.
2. Upload it and run the Rekognition scan.
3. Explain the risk labels and adjust one suggestion.
4. Export the flattened image after review.
5. Create a 24-hour share link and open it privately.
6. Revoke the link and show that it is unavailable.
7. Show the AWS architecture and explain that S3 never stores the original upload.
