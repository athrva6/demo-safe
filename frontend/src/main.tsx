import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  Check,
  Cloud,
  Copy,
  Database,
  Download,
  FileImage,
  FolderOpen,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  cloudAuth,
  configureCloudAuth,
  dateLabel,
  request,
  shareUrl,
  type Share,
} from "./api";
import { exampleFile, exportPng, loadImage, paint, type Mask } from "./image";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";

type Health = {
  status: string;
  mode: string;
  region: string;
  scanner: string;
  agent: string;
};
type AgentReview = {
  overall_risk: "high" | "medium" | "low";
  summary: string;
  priorities: Array<{
    label: string;
    severity: "high" | "medium" | "low";
    action: string;
  }>;
  checklist: string[];
};
const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon">{children}</span>
);
const AuthGate = lazy(async () => {
  await configureCloudAuth();
  return import("./AuthGate");
});
const Brand = () => (
  <a className="brand" href="/">
    <span className="brand-mark">
      <ShieldCheck size={23} />
    </span>
    DemoSafe<span className="brand-dot">.</span>
  </a>
);

function SharedImage({ token }: { token: string }) {
  const [meta, setMeta] = useState<{ title: string; expires_at: number }>();
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      url = "";
    Promise.all([
      request(`/api/public/${token}`).then((r) => r.json()),
      request(`/api/public/${token}/content`).then((r) => r.blob()),
    ])
      .then(([details, blob]) => {
        if (active) {
          url = URL.createObjectURL(blob);
          setSrc(url);
          setMeta(details);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token]);
  return (
    <div className="shared-page">
      <header>
        <Brand />
        <span className="pill">
          <LockKeyhole size={13} /> Shared screenshot
        </span>
      </header>
      <main className="shared-card">
        {error ? (
          <>
            <h1>This share is unavailable.</h1>
            <p>{error}</p>
          </>
        ) : (
          <>
            <span className="eyebrow">REVIEWED BY THE SENDER</span>
            <h1>{meta?.title || "Opening screenshot…"}</h1>
            {src && (
              <img
                src={src}
                alt={meta?.title || "Shared redacted screenshot"}
              />
            )}
            <p>
              {meta
                ? `Link expires ${dateLabel(meta.expires_at)}.`
                : "Checking link access…"}
            </p>
          </>
        )}
      </main>
      <footer>
        Shared with DemoSafe. Automated detection does not guarantee that all
        sensitive content was removed.
      </footer>
    </div>
  );
}

function AwsStatus({
  health,
  busy,
  refresh,
}: {
  health?: Health;
  busy: boolean;
  refresh: () => void;
}) {
  const deployed = health?.mode === "aws";
  const scanner = ["rekognition", "textract"].includes(health?.scanner || "");
  const agent = health?.agent === "strands-bedrock";
  return (
    <section className="status-panel">
      <div className="status-hero">
        <div className="status-hero-icon">
          <Cloud size={29} />
        </div>
        <div>
          <span className="eyebrow">LIVE APPLICATION CHECK</span>
          <h2>{health ? "DemoSafe is responding." : "Checking DemoSafe…"}</h2>
          <p>
            {deployed
              ? `Connected to the AWS deployment in ${health?.region}.`
              : "Connected to the local development backend."}
          </p>
        </div>
        <button className="secondary" onClick={refresh} disabled={busy}>
          <Activity size={16} />
          Check again
        </button>
      </div>
      <div className="status-grid">
        <article className="service-card">
          <Activity size={20} />
          <div>
            <strong>
              {deployed ? "API Gateway + Lambda" : "Local API + Python"}
            </strong>
            <p>
              {deployed
                ? "The public AWS API reached the Lambda backend."
                : "The browser reached the local development backend."}
            </p>
          </div>
          <span className="service-state">
            {health ? "Responding" : "Checking"}
          </span>
        </article>
        <article className="service-card">
          <ScanLine size={20} />
          <div>
            <strong>Amazon Rekognition</strong>
            <p>OCR provider for screenshot text detection.</p>
          </div>
          <span className={scanner ? "service-state" : "service-state muted"}>
            {scanner ? "Configured" : "Unavailable"}
          </span>
        </article>
        <article className="service-card">
          <Sparkles size={20} />
          <div>
            <strong>Strands + Amazon Bedrock</strong>
            <p>Structured privacy priorities and review checklist.</p>
          </div>
          <span className={agent ? "service-state" : "service-state muted"}>
            {agent ? "Configured" : "Disabled"}
          </span>
        </article>
        <article className="service-card">
          <Database size={20} />
          <div>
            <strong>Amazon S3 + DynamoDB</strong>
            <p>Private images and expiring share controls.</p>
          </div>
          <span className={deployed ? "service-state" : "service-state muted"}>
            {deployed ? "Provisioned" : "Local mode"}
          </span>
        </article>
        <article className="service-card">
          <KeyRound size={20} />
          <div>
            <strong>Amazon Cognito</strong>
            <p>Authentication for private workspace operations.</p>
          </div>
          <span className={cloudAuth ? "service-state" : "service-state muted"}>
            {cloudAuth ? "Configured" : "Local mode"}
          </span>
        </article>
      </div>
      <p className="status-note">
        This page proves that the application can reach its deployed backend and
        shows its configured providers. Show the CloudFormation stack and recent
        CloudWatch logs as infrastructure evidence.
      </p>
    </section>
  );
}

function Workspace({ signOut }: { signOut?: () => void }) {
  const [page, setPage] = useState<"editor" | "shares" | "status">("editor");
  const [health, setHealth] = useState<Health>();
  const [image, setImage] = useState<HTMLImageElement>();
  const [filename, setFilename] = useState("");
  const [masks, setMasks] = useState<Mask[]>([]);
  const [draft, setDraft] = useState<Mask>();
  const [selected, setSelected] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [scanSummary, setScanSummary] = useState("");
  const [agentReview, setAgentReview] = useState<AgentReview>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState("86400");
  const [created, setCreated] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const selectedMask = masks.find((mask) => mask.id === selected);

  async function refreshHealth(showBusy = false) {
    if (showBusy) setBusy("Checking AWS services");
    setError("");
    try {
      const response = await request("/api/health");
      setHealth(await response.json());
    } catch {
      setHealth(undefined);
      setError("Backend is offline. Start the project with npm run dev.");
    } finally {
      if (showBusy) setBusy("");
    }
  }
  useEffect(() => {
    void refreshHealth();
  }, []);
  useEffect(() => {
    if (image && canvas.current)
      paint(canvas.current, image, draft ? [...masks, draft] : masks);
  }, [image, masks, draft, page]);
  useEffect(() => {
    setReviewed(false);
    setCreated("");
  }, [image, masks, title, expiry]);
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files || [])].find((item) =>
        item.type.startsWith("image/"),
      );
      if (file && !busy && page === "editor") {
        event.preventDefault();
        void openFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [busy, page]);

  async function openFile(file: File) {
    setError("");
    setNotice("");
    setCreated("");
    setBusy("Opening image");
    try {
      const loaded = await loadImage(file);
      setImage(loaded);
      setFilename(file.name);
      setTitle("Reviewed screenshot");
      setMasks([]);
      setSelected("");
      setCloudConsent(false);
      setScanSummary("");
      setAgentReview(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function refreshShares() {
    setPage("shares");
    setError("");
    setBusy("Loading shares");
    try {
      const result = await request("/api/shares", {}, true);
      setShares((await result.json()).shares);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function scan() {
    if (!image || !cloudConsent) return;
    setBusy("Scanning with AWS");
    setError("");
    setNotice("");
    setScanSummary("");
    setAgentReview(undefined);
    try {
      // Normalize orientation exactly as in the editor before sending to OCR.
      const form = new FormData();
      form.append("file", await exportPng(image, []), "scan.png");
      const response = await request(
        "/api/scan",
        { method: "POST", body: form },
        true,
      );
      const result = await response.json();
      const suggestions: Mask[] = result.findings.map(
        (finding: {
          label: string;
          reason: string;
          box: { x: number; y: number; width: number; height: number };
        }) => ({
          id: crypto.randomUUID(),
          label: finding.label,
          reason: finding.reason,
          x: finding.box.x * image.naturalWidth,
          y: finding.box.y * image.naturalHeight,
          width: finding.box.width * image.naturalWidth,
          height: finding.box.height * image.naturalHeight,
        }),
      );
      setMasks((current) => [
        ...current.filter((mask) => mask.label === "Manual mask"),
        ...suggestions,
      ]);
      setSelected("");
      setScanSummary(
        suggestions.length
          ? `Scan completed: ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} added. Review each highlighted area.`
          : "Scan completed: no supported sensitive text was detected. Review the image and add masks manually.",
      );
      setNotice(
        `${suggestions.length} suggestions. Review the full screenshot; detection can miss sensitive content.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function askAgent() {
    const labels = masks
      .filter((mask) => mask.label !== "Manual mask")
      .map((mask) => mask.label);
    if (!labels.length) return;
    setBusy("Asking the Strands privacy agent");
    setError("");
    setAgentReview(undefined);
    try {
      const response = await request(
        "/api/agent/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labels }),
        },
        true,
      );
      setAgentReview(await response.json());
      setNotice(
        "The agent reviewed detector categories only. It did not receive OCR text or secret values.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function download() {
    if (!image) return;
    setBusy("Exporting");
    setError("");
    try {
      const blob = await exportPng(image, masks);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "demosafe-redacted.png";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "A flattened PNG was exported. Your original file was not changed.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function publish() {
    if (!image || !reviewed) return;
    setBusy("Creating share");
    setError("");
    try {
      const form = new FormData();
      form.append("file", await exportPng(image, masks), "redacted.png");
      form.append("title", title);
      form.append("expires_in", expiry);
      form.append("reviewed", "true");
      const response = await request(
        "/api/shares",
        { method: "POST", body: form },
        true,
      );
      const result: Share = await response.json();
      setCreated(shareUrl(result.id));
      setNotice(
        "Share created. Anyone with the link can view it until it expires or is revoked.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Link copied.");
    } catch {
      setError("Clipboard is unavailable. Select and copy the displayed link.");
    }
  }
  async function revoke(id: string) {
    setError("");
    setBusy("Revoking share");
    try {
      await request(`/api/shares/${id}`, { method: "DELETE" }, true);
      setShares((items) =>
        items.map((item) =>
          item.id === id ? { ...item, revoked: true } : item,
        ),
      );
      setNotice("Link revoked. Previously saved copies cannot be recalled.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(
        image!.naturalWidth,
        Math.max(
          0,
          ((event.clientX - bounds.left) * image!.naturalWidth) / bounds.width,
        ),
      ),
      y: Math.min(
        image!.naturalHeight,
        Math.max(
          0,
          ((event.clientY - bounds.top) * image!.naturalHeight) / bounds.height,
        ),
      ),
    };
  }
  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (busy || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = point(event);
  }
  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!start.current) return;
    const p = point(event),
      s = start.current;
    setDraft({
      id: "draft",
      label: "Manual mask",
      reason: "Added by you.",
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y),
    });
  }
  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!start.current) return;
    const p = point(event),
      s = start.current;
    if (Math.abs(p.x - s.x) >= 4 && Math.abs(p.y - s.y) >= 4) {
      const mask = {
        id: crypto.randomUUID(),
        label: "Manual mask",
        reason: "Added by you.",
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        width: Math.abs(p.x - s.x),
        height: Math.abs(p.y - s.y),
      };
      setMasks((current) => [...current, mask]);
      setSelected(mask.id);
    }
    start.current = undefined;
    setDraft(undefined);
  }
  function addMask() {
    if (!image) return;
    const mask = {
      id: crypto.randomUUID(),
      label: "Manual mask",
      reason: "Added by you.",
      x: image.naturalWidth * 0.25,
      y: image.naturalHeight * 0.25,
      width: image.naturalWidth * 0.25,
      height: image.naturalHeight * 0.1,
    };
    setMasks((items) => [...items, mask]);
    setSelected(mask.id);
  }
  function adjust(field: "x" | "y" | "width" | "height", value: number) {
    if (!image || !Number.isFinite(value)) return;
    setMasks((items) =>
      items.map((mask) => {
        if (mask.id !== selected) return mask;
        const updated = { ...mask, [field]: value };
        updated.x = Math.max(0, Math.min(updated.x, image.naturalWidth - 4));
        updated.y = Math.max(0, Math.min(updated.y, image.naturalHeight - 4));
        updated.width = Math.max(
          4,
          Math.min(updated.width, image.naturalWidth - updated.x),
        );
        updated.height = Math.max(
          4,
          Math.min(updated.height, image.naturalHeight - updated.y),
        );
        return updated;
      }),
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          <button
            className={page === "editor" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setPage("editor");
              setError("");
            }}
          >
            <ScanLine size={18} />
            Screenshot editor
          </button>
          <button
            className={page === "shares" ? "nav-item active" : "nav-item"}
            onClick={() => void refreshShares()}
          >
            <Link2 size={18} />
            My shares
          </button>
          <button
            className={page === "status" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setPage("status");
              setError("");
              void refreshHealth(true);
            }}
          >
            <Activity size={18} />
            AWS system status
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          <strong>
            {health?.mode === "aws" ? "AWS workspace" : "Local development"}
          </strong>
          <p>
            {health?.mode === "aws"
              ? "Private storage. Controlled sharing."
              : "Links work on this computer. Deploy to AWS to share with others."}
          </p>
          {signOut && (
            <button className="text-button" onClick={signOut}>
              <LogOut size={15} />
              Sign out
            </button>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>
              {page === "editor"
                ? "Screenshot editor"
                : page === "shares"
                  ? "My shares"
                  : "AWS system status"}
            </strong>
          </span>
          <span className="pill">
            <LockKeyhole size={13} /> Review before sharing
          </span>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "editor"
                  ? "LESS EXPOSURE. MORE CONTEXT."
                  : page === "shares"
                    ? "YOU CONTROL THE LINK."
                    : "DEPLOYED. CONNECTED. OBSERVABLE."}
              </span>
              <h1>
                {page === "editor"
                  ? "Share the work. Keep the secrets."
                  : page === "shares"
                    ? "Your shared screenshots."
                    : "AWS system status."}
              </h1>
              <p>
                {page === "editor"
                  ? "Review your screenshot, cover sensitive details, and share the final copy."
                  : page === "shares"
                    ? "Manage access to the screenshots you’ve published."
                    : "A presentation-ready view of the AWS services behind DemoSafe."}
              </p>
            </div>
            {page === "shares" && (
              <button className="primary" onClick={() => setPage("editor")}>
                <Plus size={17} />
                New screenshot
              </button>
            )}
          </div>
          {error && (
            <div className="message error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="busy" role="status">
              <span className="spinner" />
              {busy}…
            </div>
          )}
          {page === "editor" ? (
            <>
              <div className="steps">
                <span className="step">
                  <b>01</b> Add screenshot
                </span>
                <span className="step">
                  <b>02</b> Review & redact
                </span>
                <span className="step">
                  <b>03</b> Export or share
                </span>
              </div>
              <div className="editor-layout">
                <section className="editor-panel">
                  <div className="panel-title">
                    <span>
                      <FileImage size={17} />
                      {filename || "Screenshot workspace"}
                    </span>
                    <button
                      className="text-button"
                      disabled={Boolean(busy)}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={15} />
                      {image ? "Replace" : "Upload"}
                    </button>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="visually-hidden"
                    aria-label="Upload screenshot"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void openFile(file);
                      event.target.value = "";
                    }}
                  />
                  {!image ? (
                    <div
                      className="upload-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && !busy) void openFile(file);
                      }}
                    >
                      <div className="upload-icon">
                        <Upload size={29} />
                      </div>
                      <h2>A screenshot worth sharing.</h2>
                      <p>Drop an image here, or paste with Ctrl / ⌘ + V.</p>
                      <button
                        className="primary"
                        disabled={Boolean(busy)}
                        onClick={() => fileInput.current?.click()}
                      >
                        <FolderOpen size={17} />
                        Choose screenshot
                      </button>
                      <small>
                        PNG or JPEG · Up to 3 MB · Up to 6 megapixels
                      </small>
                      <button
                        className="sample-button"
                        disabled={Boolean(busy)}
                        onClick={async () => openFile(await exampleFile())}
                      >
                        Try a fictional example <ArrowUpRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="canvas-workspace">
                        <canvas
                          ref={canvas}
                          aria-label="Screenshot preview. Drag to draw a mask or use Add mask and its position fields."
                          onPointerDown={pointerDown}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={() => {
                            start.current = undefined;
                            setDraft(undefined);
                          }}
                        />
                      </div>
                      <div className="canvas-footer">
                        <span>
                          {image.naturalWidth} × {image.naturalHeight} px
                        </span>
                        <span>Drag on the image to cover an area</span>
                      </div>
                    </>
                  )}
                  <div className="editor-tools">
                    <button
                      className="secondary"
                      onClick={addMask}
                      disabled={!image || Boolean(busy)}
                    >
                      <Plus size={16} />
                      Add mask
                    </button>
                    <button
                      className="text-button"
                      disabled={!masks.length || Boolean(busy)}
                      onClick={() => {
                        setMasks([]);
                        setSelected("");
                        setAgentReview(undefined);
                      }}
                    >
                      Clear masks
                    </button>
                    <span>
                      {masks.length} selected{" "}
                      {masks.length === 1 ? "area" : "areas"}
                    </span>
                  </div>
                </section>
                <aside className="review-panel">
                  <div className="review-heading">
                    <Icon>
                      <ShieldCheck size={20} />
                    </Icon>
                    <div>
                      <h2>Privacy review</h2>
                      <p>You make the final decision.</p>
                    </div>
                  </div>
                  <div className="scan-card">
                    <strong>AWS detection</strong>
                    <p>
                      {health?.scanner === "rekognition" ||
                      health?.scanner === "textract"
                        ? `Amazon ${health.scanner === "rekognition" ? "Rekognition" : "Textract"} suggests areas containing supported secrets and personal details.`
                        : "Manual redaction is ready. Connect AWS OCR to enable automatic suggestions."}
                    </p>
                    {(health?.scanner === "rekognition" ||
                      health?.scanner === "textract") && (
                      <label className="check-line">
                        <input
                          type="checkbox"
                          checked={cloudConsent}
                          onChange={(e) => setCloudConsent(e.target.checked)}
                        />
                        Send this screenshot to AWS for scanning.
                      </label>
                    )}
                    <button
                      className="secondary full"
                      onClick={() => void scan()}
                      disabled={
                        !image ||
                        !["rekognition", "textract"].includes(
                          health?.scanner || "",
                        ) ||
                        !cloudConsent ||
                        Boolean(busy)
                      }
                    >
                      <ScanLine size={16} />
                      Scan with AWS
                    </button>
                    {scanSummary && <p role="status">{scanSummary}</p>}
                  </div>
                  {health?.agent === "strands-bedrock" && (
                    <div className="agent-card">
                      <div className="agent-title">
                        <Sparkles size={15} />
                        <strong>Strands privacy agent</strong>
                      </div>
                      <p>
                        Get a risk order and final visual checklist. Only
                        finding categories and counts are sent to Amazon
                        Bedrock—never OCR text or detected values.
                      </p>
                      <button
                        className="secondary full"
                        onClick={() => void askAgent()}
                        disabled={
                          !masks.some((mask) => mask.label !== "Manual mask") ||
                          Boolean(busy)
                        }
                      >
                        <Sparkles size={15} />
                        Review with Strands agent
                      </button>
                      {agentReview && (
                        <div className="agent-result" role="status">
                          <span
                            className={`risk-badge risk-${agentReview.overall_risk}`}
                          >
                            {agentReview.overall_risk} risk
                          </span>
                          <p>{agentReview.summary}</p>
                          <strong>Priority findings</strong>
                          <ul>
                            {agentReview.priorities.map((priority) => (
                              <li
                                key={`${priority.label}-${priority.severity}`}
                              >
                                <b>{priority.label}</b> · {priority.severity}
                                <small>{priority.action}</small>
                              </li>
                            ))}
                          </ul>
                          <strong>Before sharing</strong>
                          <ul>
                            {agentReview.checklist.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mask-list">
                    {masks.length === 0 ? (
                      <div className="empty-masks">
                        <ScanLine size={24} />
                        <p>No areas selected yet.</p>
                        <small>
                          Draw a mask over anything you want to hide.
                        </small>
                      </div>
                    ) : (
                      masks.map((mask, index) => (
                        <div
                          className={
                            selected === mask.id
                              ? "mask-row selected"
                              : "mask-row"
                          }
                          key={mask.id}
                        >
                          <button
                            className="mask-select"
                            onClick={() => setSelected(mask.id)}
                          >
                            <span className="mask-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span>
                              <strong>{mask.label}</strong>
                              <small>{mask.reason}</small>
                            </span>
                          </button>
                          <button
                            aria-label={`Remove mask ${index + 1}`}
                            onClick={() =>
                              setMasks((items) =>
                                items.filter((item) => item.id !== mask.id),
                              )
                            }
                            disabled={Boolean(busy)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedMask && (
                    <div className="position-grid">
                      {(["x", "y", "width", "height"] as const).map((field) => (
                        <label key={field}>
                          {field}
                          <input
                            type="number"
                            aria-label={`Mask ${field}`}
                            value={Math.round(selectedMask[field])}
                            min={field === "x" || field === "y" ? 0 : 4}
                            onChange={(e) =>
                              adjust(field, Number(e.target.value))
                            }
                            disabled={Boolean(busy)}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="fine-print">
                    Selected pixels are replaced with solid masks in the final
                    PNG. Detection can miss details; review the entire image.
                  </p>
                </aside>
              </div>
              <section className="publish-panel">
                <div className="publish-description">
                  <span className="eyebrow">READY FOR THE NEXT STEP</span>
                  <h2>Share only what you’ve reviewed.</h2>
                  <p>
                    Your original file stays unchanged. Publishing uploads the
                    final PNG.
                  </p>
                </div>
                <div className="publish-fields">
                  <label>
                    Share title
                    <input
                      maxLength={80}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Reviewed screenshot"
                      disabled={!image || Boolean(busy)}
                    />
                  </label>
                  <label>
                    Link expires
                    <select
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      disabled={Boolean(busy)}
                    >
                      <option value="3600">In 1 hour</option>
                      <option value="86400">In 24 hours</option>
                      <option value="604800">In 7 days</option>
                    </select>
                  </label>
                </div>
                <label className="check-line review-check">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                    disabled={!image || Boolean(busy)}
                  />
                  I reviewed the final image and title, including any areas
                  detection may have missed.
                </label>
                <div className="publish-actions">
                  <span>
                    <LockKeyhole size={14} />
                    Anyone with the link can view it until expiry or revocation.
                  </span>
                  <button
                    className="secondary"
                    onClick={() => void download()}
                    disabled={!image || Boolean(busy)}
                  >
                    <Download size={16} />
                    Export PNG
                  </button>
                  <button
                    className="primary"
                    onClick={() => void publish()}
                    disabled={!image || !reviewed || !health || Boolean(busy)}
                  >
                    <Link2 size={16} />
                    Create share link
                  </button>
                </div>
                {created && (
                  <div className="created-link">
                    <Check size={18} />
                    <input
                      aria-label="Created share link"
                      readOnly
                      value={created}
                    />
                    <button
                      className="secondary"
                      onClick={() => void copy(created)}
                    >
                      <Copy size={15} />
                      Copy
                    </button>
                    <a
                      className="text-button"
                      href={created}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open <ArrowUpRight size={15} />
                    </a>
                  </div>
                )}
              </section>
            </>
          ) : page === "shares" ? (
            <section className="shares-panel">
              {shares.length === 0 ? (
                <div className="empty-shares">
                  <Link2 size={35} />
                  <h2>Your first share starts here.</h2>
                  <p>
                    Review a screenshot and create a link. It will appear in
                    this workspace.
                  </p>
                  <button className="primary" onClick={() => setPage("editor")}>
                    Open editor
                  </button>
                </div>
              ) : (
                <div className="share-list">
                  {shares.map((share) => {
                    const expired = share.expires_at * 1000 <= Date.now(),
                      unavailable = share.revoked || expired;
                    return (
                      <article className="share-row" key={share.id}>
                        <div className="file-icon">
                          <FileImage size={23} />
                        </div>
                        <div className="share-info">
                          <h3>{share.title}</h3>
                          <p>
                            {share.revoked
                              ? "Revoked"
                              : expired
                                ? "Expired"
                                : `Expires ${dateLabel(share.expires_at)}`}
                          </p>
                          <input
                            aria-label={`Link for ${share.title}`}
                            readOnly
                            value={shareUrl(share.id)}
                          />
                        </div>
                        <span
                          className={unavailable ? "pill" : "pill active-pill"}
                        >
                          {share.revoked
                            ? "Revoked"
                            : expired
                              ? "Expired"
                              : "Active"}
                        </span>
                        <button
                          className="secondary"
                          disabled={unavailable || Boolean(busy)}
                          onClick={() => void copy(shareUrl(share.id))}
                        >
                          <Copy size={15} />
                          Copy
                        </button>
                        <button
                          className="danger-button"
                          disabled={share.revoked || Boolean(busy)}
                          onClick={() => void revoke(share.id)}
                        >
                          <Trash2 size={15} />
                          Revoke
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
              <p className="fine-print">
                Revoking denies new requests and removes the stored image. It
                cannot recall copies already viewed or saved. Showing up to 100
                recent shares.
              </p>
            </section>
          ) : (
            <AwsStatus
              health={health}
              busy={Boolean(busy)}
              refresh={() => void refreshHealth(true)}
            />
          )}
          <footer className="workspace-footer">
            <span>DemoSafe · Built for thoughtful sharing</span>
            <span>Review → Redact → Share</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

const token = window.location.pathname.match(/^\/s\/([A-Za-z0-9_-]{32})$/)?.[1];
const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(
  window.location.hostname,
);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {token ? (
      <SharedImage token={token} />
    ) : cloudAuth ? (
      <Suspense fallback={<div className="shared-page">Loading sign in…</div>}>
        <AuthGate>{(signOut) => <Workspace signOut={signOut} />}</AuthGate>
      </Suspense>
    ) : localHost ? (
      <Workspace />
    ) : (
      <div className="shared-page">
        <Brand />
        <h1>Configure your AWS workspace.</h1>
        <p>
          Set the Cognito pool, client, and API URL in the frontend environment
          before publishing this application.
        </p>
      </div>
    )}
  </React.StrictMode>,
);
