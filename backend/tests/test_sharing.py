import io
import anyio
import httpx
import pytest
from PIL import Image, PngImagePlugin
from app import main


class AppClient:
    def request(self, method, path, **kwargs):
        async def send():
            transport = httpx.ASGITransport(
                app=main.app, client=("127.0.0.1", 50000)
            )
            async with httpx.AsyncClient(
                transport=transport, base_url="http://testserver"
            ) as client:
                return await client.request(method, path, **kwargs)

        return anyio.run(send)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def delete(self, path, **kwargs):
        return self.request("DELETE", path, **kwargs)


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCAL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("SCAN_PROVIDER", "manual")
    main.store.cache_clear()
    client = AppClient()
    yield client
    main.app.dependency_overrides.clear()
    main.store.cache_clear()


def png():
    image = Image.new("RGBA", (80, 50), (255, 255, 255, 255))
    # Actual redacted pixels, and fully transparent pixels carrying hidden RGB.
    for x in range(10, 30):
        for y in range(10, 20):
            image.putpixel((x, y), (16, 23, 34, 255))
    image.putpixel((1, 1), (101, 27, 222, 0))
    info = PngImagePlugin.PngInfo()
    info.add_text("original-secret", "must-not-survive-export")
    stream = io.BytesIO()
    image.save(stream, format="PNG", pnginfo=info)
    return stream.getvalue()


def publish(client, **fields):
    return client.post("/api/shares", data={"title": "Test screenshot", "reviewed": "true", "expires_in": "3600", **fields}, files={"file": ("redacted.png", png(), "image/png")})


def test_share_delivers_pixels_without_metadata_or_hidden_alpha(client):
    response = publish(client)
    assert response.status_code == 201
    identifier = response.json()["id"]
    assert len(identifier) == 32
    result = client.get(f"/api/public/{identifier}/content")
    assert result.status_code == 200
    assert result.headers["cache-control"] == "no-store"
    assert result.headers["referrer-policy"] == "no-referrer"
    assert b"must-not-survive-export" not in result.content
    image = Image.open(io.BytesIO(result.content))
    assert image.mode == "RGB"
    assert image.getpixel((15, 15)) == (16, 23, 34)
    assert image.getpixel((60, 30)) == (255, 255, 255)
    assert image.getpixel((1, 1)) == (255, 255, 255)
    assert client.get(f"/api/public/{identifier}").json() == {"title":"Test screenshot", "expires_at":response.json()["expires_at"]}


def test_revocation_denies_both_metadata_and_content_and_removes_file(client):
    identifier = publish(client).json()["id"]
    assert client.delete(f"/api/shares/{identifier}").status_code == 204
    assert client.get(f"/api/public/{identifier}").status_code == 410
    assert client.get(f"/api/public/{identifier}/content").status_code == 410
    assert not (main.store().root / "images" / f"{identifier}.png").exists()
    assert client.get("/api/shares").json()["shares"][0]["revoked"] is True


def test_expiry_enforced_at_boundary_without_waiting_for_storage_deletion(client, monkeypatch):
    monkeypatch.setattr(main, "now", lambda: 1000)
    identifier = publish(client).json()["id"]
    monkeypatch.setattr(main, "now", lambda: 4599)
    assert client.get(f"/api/public/{identifier}/content").status_code == 200
    monkeypatch.setattr(main, "now", lambda: 4600)
    assert main.store().get(identifier) is not None
    assert client.get(f"/api/public/{identifier}").status_code == 410
    assert client.get(f"/api/public/{identifier}/content").status_code == 410


def test_another_owner_cannot_list_or_revoke(client):
    identifier = publish(client).json()["id"]
    async def another_owner():
        return "another-user"

    main.app.dependency_overrides[main.owner] = another_owner
    assert client.get("/api/shares").json()["shares"] == []
    assert client.delete(f"/api/shares/{identifier}").status_code == 404
    assert client.get(f"/api/public/{identifier}/content").status_code == 200


@pytest.mark.parametrize("fields", [{"reviewed":"false"}, {"expires_in":"-1"}, {"expires_in":"99999999"}, {"title":"x"*81}])
def test_publication_validation(client, fields):
    assert publish(client, **fields).status_code == 422


def test_disguised_non_image_is_rejected(client):
    response = client.post("/api/shares", data={"reviewed":"true"}, files={"file":("image.png",b"<svg onload='alert(1)'/>","image/png")})
    assert response.status_code == 415


def test_oversized_request_rejected(client):
    response = client.post("/api/shares", content=b"x" * (main.MAX_BYTES + 65537), headers={"content-type":"image/png"})
    assert response.status_code == 413


def test_local_cross_origin_mutation_rejected(client):
    response = client.post("/api/shares", headers={"origin":"https://untrusted.example"})
    assert response.status_code == 403


def test_aws_mode_does_not_trust_forged_authorization_header(client, monkeypatch):
    monkeypatch.setattr(main, "MODE", "aws")
    assert client.get("/api/shares", headers={"authorization":"Bearer forged", "x-user-id":"local-developer"}).status_code == 401


def test_manual_mode_never_fabricates_scan_findings(client):
    response = client.post("/api/scan", files={"file":("sample.png",png(),"image/png")})
    assert response.status_code == 503
    assert "findings" not in response.json()


def test_provider_failure_is_not_reported_as_zero_findings(client, monkeypatch):
    import boto3
    monkeypatch.setenv("SCAN_PROVIDER", "textract")
    def fail(*args, **kwargs):
        raise RuntimeError("secret-from-provider-error")
    monkeypatch.setattr(boto3, "client", fail)
    response = client.post("/api/scan", files={"file":("sample.png",png(),"image/png")})
    assert response.status_code == 502
    assert "secret-from-provider-error" not in response.text
