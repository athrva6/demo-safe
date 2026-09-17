import io
import os
import re
import secrets
import time
import warnings
from functools import lru_cache

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from mangum import Mangum
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .detection import find_sensitive
from .storage import AwsStore, LocalStore

MAX_BYTES = 3 * 1024 * 1024
MAX_PIXELS = 6_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
MODE = os.getenv("APP_MODE", "local")
if MODE not in {"local", "aws"} or (os.getenv("AWS_LAMBDA_FUNCTION_NAME") and MODE != "aws"):
    raise RuntimeError("Lambda requires APP_MODE=aws; local development authentication must never be deployed.")
ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",")
app = FastAPI(title="DemoSafe API", version="0.1.0", docs_url="/docs" if MODE == "local" else None, redoc_url=None, openapi_url="/openapi.json" if MODE == "local" else None)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"])
if MODE == "local":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"])


@app.middleware("http")
async def limits_and_headers(request: Request, call_next):
    if request.headers.get("content-length", "0").isdigit() and int(request.headers.get("content-length", "0")) > MAX_BYTES + 65536:
        return JSONResponse({"detail": "Upload exceeds the 3 MB image limit."}, status_code=413)
    if MODE == "local" and request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        if origin and origin not in ORIGINS:
            return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
    response = await call_next(request)
    response.headers.update({"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "frame-ancestors 'none'"})
    return response


async def owner(request: Request) -> str:
    if MODE == "local":
        if request.client and request.client.host in {"127.0.0.1", "::1", "testclient"}:
            return "local-developer"
        raise HTTPException(403, "Local mode is for loopback development only.")
    # Claims come only from API Gateway's verified JWT context, never client headers.
    claims = request.scope.get("aws.event", {}).get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    if claims.get("token_use") != "access" or not claims.get("sub"):
        raise HTTPException(401, "Sign in to manage screenshots.")
    return claims["sub"]


@lru_cache
def store():
    return AwsStore() if MODE == "aws" else LocalStore(os.getenv("LOCAL_DATA_DIR", ".local"))


def now() -> int:
    return int(time.time())


def normalize_image(file: UploadFile, *, png_only=False) -> bytes:
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Images must be at most 3 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                allowed = {"PNG"} if png_only else {"PNG", "JPEG"}
                if source.format not in allowed or getattr(source, "n_frames", 1) != 1:
                    raise HTTPException(415, "Use a single-frame PNG" + ("." if png_only else " or JPEG."))
                if source.width * source.height > MAX_PIXELS or max(source.size) > 4096:
                    raise HTTPException(413, "Use an image under 6 megapixels and 4096 pixels per side.")
                source.load()
                rgba = ImageOps.exif_transpose(source).convert("RGBA")
                clean = Image.new("RGB", rgba.size, "white")
                clean.paste(rgba, mask=rgba.getchannel("A"))
                output = io.BytesIO()
                # A new image strips EXIF, PNG text chunks, and hidden alpha-channel RGB.
                clean.save(output, format="PNG")
                result = output.getvalue()
                if len(result) > MAX_BYTES:
                    raise HTTPException(413, "The normalized PNG exceeds 3 MB. Crop or resize the image.")
                return result
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(415, "The file is not a supported readable image.") from None


def public_item(token: str):
    if not re.fullmatch(r"[A-Za-z0-9_-]{32}", token):
        raise HTTPException(404, "Share not found.")
    item = store().get(token)
    if not item or item.get("revoked") or int(item["expires_at"]) <= now():
        raise HTTPException(410, "This share has expired, was revoked, or is unavailable.")
    return item


def safe_metadata(item: dict):
    return {"id": item["id"], "title": item["title"], "created_at": int(item["created_at"]), "expires_at": int(item["expires_at"]), "revoked": bool(item["revoked"])}


@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": MODE, "scanner": os.getenv("SCAN_PROVIDER", "manual"), "max_image_bytes": MAX_BYTES}


@app.post("/api/scan")
async def scan(file: UploadFile = File(...), user: str = Depends(owner)):
    if os.getenv("SCAN_PROVIDER", "manual") != "textract":
        raise HTTPException(503, "AWS scanning is not configured. Manual redaction is available.")
    image = normalize_image(file)
    try:
        import boto3
        from botocore.config import Config
        client = boto3.client("textract", config=Config(connect_timeout=3, read_timeout=18, retries={"total_max_attempts": 1}))
        result = client.detect_document_text(Document={"Bytes": image})
    except Exception:
        # Do not expose provider errors containing request data or credentials.
        raise HTTPException(502, "AWS scan could not finish. Check backend credentials, region, and Textract permission, or continue manually.") from None
    return {"status": "complete", "findings": find_sensitive(result.get("Blocks", [])), "notice": "Review every suggestion. OCR and detection can miss exposures."}


@app.post("/api/shares", status_code=201)
async def create_share(file: UploadFile = File(...), title: str = Form("Screenshot"), expires_in: int = Form(86400), reviewed: bool = Form(False), user: str = Depends(owner)):
    if not reviewed:
        raise HTTPException(422, "Review the final image before sharing.")
    if expires_in not in {3600, 86400, 604800}:
        raise HTTPException(422, "Choose 1 hour, 24 hours, or 7 days.")
    if len(title) > 80:
        raise HTTPException(422, "Use a title of 80 characters or fewer.")
    png = normalize_image(file, png_only=True)
    item = {"id": secrets.token_urlsafe(24), "owner": user, "title": title.strip() or "Screenshot", "created_at": now(), "expires_at": now() + expires_in, "revoked": 0}
    store().create(item, png)
    return safe_metadata(item)


@app.get("/api/shares")
async def list_shares(user: str = Depends(owner)):
    return {"shares": [safe_metadata(item) for item in store().list(user)]}


@app.delete("/api/shares/{token}", status_code=204)
async def revoke_share(token: str, user: str = Depends(owner)):
    if not re.fullmatch(r"[A-Za-z0-9_-]{32}", token):
        raise HTTPException(404, "Share not found.")
    item = store().get(token)
    if not item or item["owner"] != user:
        raise HTTPException(404, "Share not found.")
    store().revoke(item)
    return Response(status_code=204)


@app.get("/api/public/{token}")
async def view_share(token: str):
    item = public_item(token)
    return {"title": item["title"], "expires_at": int(item["expires_at"])}


@app.get("/api/public/{token}/content")
async def share_content(token: str):
    item = public_item(token)
    try:
        data = store().read(item)
    except Exception:
        raise HTTPException(410, "This image is unavailable.") from None
    return Response(data, media_type="image/png", headers={"Content-Disposition": 'inline; filename="demosafe.png"'})


handler = Mangum(app, lifespan="off")
