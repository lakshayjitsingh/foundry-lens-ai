"""FoundryLens AI — FastAPI Backend (AI-901 Microsoft Azure AI Fundamentals Showcase)."""

from __future__ import annotations

import base64
import io
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pypdf import PdfReader

load_dotenv(Path(__file__).resolve().parent / ".env")

from foundry_client import (  # noqa: E402
    FOUNDRY_MODEL_CATALOG,
    extract_structured_document,
    get_foundry_config,
    run_grounded_agent,
)
from responsible_ai import (  # noqa: E402
    build_responsible_ai_scorecard,
    check_content_safety,
    quarantine_indirect_injections,
    scan_and_redact_pii,
    verify_line_item_totals,
)
from samples import SAMPLE_DOCUMENTS  # noqa: E402

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI(
    title="FoundryLens AI API",
    description="Compact Multimodal Document Auditor & Responsible AI Agent built on Microsoft Foundry SDK (AI-901).",
    version="1.0.0",
)

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuditRequest(BaseModel):
    document_text: str = Field(default="", max_length=25000)
    image_data_url: str | None = Field(default=None)
    filename: str = Field(default="pasted-document.txt", max_length=180)
    model: str = Field(default="gpt-4o-mini", max_length=80)
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)
    privacy_shield: bool = Field(default=True)


class AgentChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    document_text: str = Field(default="", max_length=25000)
    extracted: dict[str, Any] = Field(default_factory=dict)
    math_audit: dict[str, Any] = Field(default_factory=dict)
    pii_audit: dict[str, Any] = Field(default_factory=dict)
    model: str = Field(default="gpt-4o-mini", max_length=80)
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    cfg = get_foundry_config()
    return {
        "status": "healthy",
        "service": "FoundryLens AI — AI-901 Microsoft Foundry Studio",
        "version": "1.0.0",
        "sdk": "azure-ai-inference",
        "mode": cfg["mode"],
        "provider_label": cfg["provider_label"],
        "live_inference": cfg["live_inference"],
        "default_model": cfg["default_model"],
        "models": FOUNDRY_MODEL_CATALOG,
    }


@app.get("/api/samples")
def list_samples() -> dict[str, Any]:
    return {"samples": SAMPLE_DOCUMENTS}


@app.post("/api/extract-file")
async def extract_uploaded_file(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 8 MB upload limit.")

    filename = file.filename
    ext = Path(filename).suffix.lower()
    content_type = (file.content_type or "").lower()

    if content_type in ALLOWED_IMAGE_TYPES or ext in {".png", ".jpg", ".jpeg", ".webp"}:
        mime = content_type if content_type in ALLOWED_IMAGE_TYPES else (
            "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
        )
        encoded = base64.b64encode(raw).decode("ascii")
        return {
            "kind": "image",
            "filename": filename,
            "size_bytes": len(raw),
            "text": "",
            "image_data_url": f"data:{mime};base64,{encoded}",
        }

    if ext == ".pdf" or content_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(raw))
            pages = [page.extract_text() or "" for page in reader.pages[:25]]
            extracted_text = "\n\n".join(p.strip() for p in pages if p.strip())
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not parse PDF file: {exc}") from exc

        if not extracted_text:
            raise HTTPException(
                status_code=422,
                detail="No selectable text found in PDF. For scanned PDFs, upload a PNG/JPG page image for Vision OCR.",
            )
        return {
            "kind": "pdf",
            "filename": filename,
            "size_bytes": len(raw),
            "page_count": len(reader.pages),
            "text": extracted_text[:24000],
            "image_data_url": None,
        }

    if ext in {".txt", ".md", ".csv", ".json"} or content_type.startswith("text/"):
        decoded = raw.decode("utf-8", errors="replace").strip()
        if not decoded:
            raise HTTPException(status_code=422, detail="Text file contains no readable characters.")
        return {
            "kind": "text",
            "filename": filename,
            "size_bytes": len(raw),
            "text": decoded[:24000],
            "image_data_url": None,
        }

    raise HTTPException(
        status_code=415,
        detail="Unsupported file type. Upload a PNG/JPG/WEBP image, PDF document, or TXT/MD/CSV file.",
    )


@app.post("/api/audit")
def audit_document(payload: AuditRequest) -> dict[str, Any]:
    if not payload.document_text.strip() and not payload.image_data_url:
        raise HTTPException(
            status_code=400,
            detail="Provide either document text or an uploaded image to run an audit.",
        )

    # 1. Responsible AI: Prompt Shield & Content Safety pre-check
    # Block harmful content outright; quarantine indirect prompt-injection phrases inside uploaded docs
    safety_audit = check_content_safety(payload.document_text)
    non_injection_flags = [c for c in safety_audit["flagged_categories"] if c != "prompt_injection"]
    if non_injection_flags:
        raise HTTPException(
            status_code=400,
            detail={
                "message": safety_audit["reason"],
                "safety_audit": safety_audit,
            },
        )

    safe_doc_text = payload.document_text
    if safety_audit["prompt_injection_detected"]:
        safe_doc_text = quarantine_indirect_injections(safe_doc_text)
        safety_audit = {
            **safety_audit,
            "blocked": False,
            "risk_level": "medium",
            "reason": "Indirect prompt-injection text inside document was quarantined before model inference.",
        }

    # 2. Responsible AI: Privacy & Security PII Scan + Redaction
    pii_audit = scan_and_redact_pii(safe_doc_text)
    text_for_model = pii_audit["redacted_text"] if payload.privacy_shield else safe_doc_text

    # 3. Microsoft Foundry Content Understanding Extraction
    result = extract_structured_document(
        document_text=text_for_model,
        model_name=payload.model,
        temperature=payload.temperature,
        image_data_url=payload.image_data_url,
    )
    extracted = result["extracted"]
    telemetry = result["telemetry"]

    # 4. Deterministic Agent Tool: Arithmetic & Hallucination Verification
    math_audit = verify_line_item_totals(
        line_items=extracted.get("line_items") or [],
        tax=extracted.get("tax"),
        stated_total=extracted.get("stated_total"),
        currency=extracted.get("currency") or "INR",
    )

    # 5. Microsoft 6 Responsible AI Pillars Scorecard
    scorecard = build_responsible_ai_scorecard(
        pii_audit=pii_audit,
        privacy_shield_enabled=payload.privacy_shield,
        safety_audit=safety_audit,
        math_audit=math_audit,
        provider_label=telemetry["provider_label"],
        model_name=telemetry["model"],
        has_plain_summary=bool(extracted.get("plain_language_summary")),
    )

    return {
        "audit_id": f"aud_{int(datetime.now(timezone.utc).timestamp())}",
        "audited_at": datetime.now(timezone.utc).isoformat(),
        "filename": payload.filename,
        "privacy_shield_enabled": payload.privacy_shield,
        "model_input_text": text_for_model,
        "extracted": extracted,
        "math_audit": math_audit,
        "pii_audit": {
            "total_redacted": pii_audit["total_redacted"],
            "findings": pii_audit["findings"],
        },
        "safety_audit": safety_audit,
        "responsible_ai_scorecard": scorecard,
        "telemetry": telemetry,
        "prompts": result["prompts"],
        "human_in_the_loop_notice": (
            "AI-generated extractions assist human review. Always verify flagged discrepancies "
            "against the original source document before financial or institutional action."
        ),
    }


@app.post("/api/agent/chat")
def agent_chat(payload: AgentChatRequest) -> dict[str, Any]:
    # Prompt Shield protects the grounded agent from jailbreaks / prompt injections
    safety_audit = check_content_safety(payload.question)
    if safety_audit["blocked"]:
        return {
            "blocked": True,
            "safety_audit": safety_audit,
            "answer": (
                f"{safety_audit['reason']} "
                "Please ask a grounded question about the audited document instead."
            ),
            "citations": [],
            "tool_trace": [
                {
                    "tool": "check_content_safety",
                    "arguments": {"question": payload.question[:120]},
                    "result_summary": safety_audit["reason"],
                }
            ],
            "telemetry": {
                "mode": "guardrail_blocked",
                "provider_label": "Responsible AI Prompt Shield",
                "model": payload.model,
                "latency_ms": 2,
                "total_tokens": 0,
            },
        }

    response = run_grounded_agent(
        question=payload.question,
        document_text=payload.document_text,
        extracted=payload.extracted,
        math_audit=payload.math_audit,
        pii_audit=payload.pii_audit,
        model_name=payload.model,
        temperature=payload.temperature,
    )
    return {
        "blocked": False,
        "safety_audit": safety_audit,
        **response,
    }


# Serve compiled React frontend when deployed as a single Render web service
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found.")
        dist_root = FRONTEND_DIST.resolve()
        candidate = (dist_root / full_path).resolve()
        if full_path and candidate.is_relative_to(dist_root) and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(dist_root / "index.html"))
