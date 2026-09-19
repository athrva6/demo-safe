# Strands Privacy Review Agent

DemoSafe uses the open-source [Strands Agents SDK](https://strandsagents.com/) with Amazon Bedrock to turn deterministic detector results into a short review plan.

## What the agent does

1. Amazon Rekognition reads text from the screenshot.
2. DemoSafe's deterministic rules locate supported secrets and personal details.
3. The user can request an agent review.
4. The backend sends only allow-listed category names and counts to the model, such as `Email address: 2`.
5. The agent returns structured output: overall risk, priority order, recommended action and a final visual checklist.
6. The user accepts, removes or adjusts masks and makes the final sharing decision.

The agent never receives raw OCR text, detected values, image pixels, share links or account identifiers. It cannot publish, delete or modify a screenshot.

## AWS implementation

- **Framework:** Strands Agents SDK for Python
- **Model provider:** Amazon Bedrock
- **Model:** Amazon Nova 2 Lite
- **Inference region:** `us-east-1`
- **Runtime:** the existing AWS Lambda backend
- **Permission:** least-privilege `bedrock:InvokeModel` for the selected foundation model
- **Output:** a Pydantic schema validated by Strands structured output

The Rekognition scan remains available if Bedrock fails. Agent errors are returned as a generic message and do not expose provider details.

## Demo flow

1. Upload the fictional sample screenshot.
2. Select **Send this screenshot to AWS for scanning**.
3. Click **Scan with AWS**.
4. Click **Review with Strands agent**.
5. Show the risk badge, priority findings and final checklist.
6. Explain that the model saw categories and counts only.

## Local development

The agent is disabled by default locally. Set these values in `backend/.env` when testing with AWS credentials:

```env
AGENT_PROVIDER=strands-bedrock
AGENT_MODEL_ID=amazon.nova-2-lite-v1:0
AGENT_REGION=us-east-1
```

The AWS Lambda configuration is defined in `infra/template.yaml`.

## Honest limitations

- The agent explains known findings; it does not discover new image regions.
- OCR and deterministic detection can miss content.
- Model advice is not a guarantee that a screenshot is safe.
- Human review remains mandatory before sharing.
