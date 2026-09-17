# DemoSafe

DemoSafe is a privacy release gate for screenshots and product demos. It scans for likely sensitive text, lets a person review every suggestion, permanently flattens approved redactions, and creates an expiring, revocable share link.

## Run locally

```bash
bash scripts/setup.sh
npm run dev
```

Open <http://127.0.0.1:5173>. Manual redaction works locally; AWS scanning is enabled after deployment.

## Hackathon documents

- [Hackathon criteria and judging map](docs/HACKATHON.md)
- [AWS deployment guide](docs/DEPLOYMENT.md)
