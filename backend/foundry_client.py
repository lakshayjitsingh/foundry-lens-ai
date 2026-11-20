"""Microsoft Foundry SDK Client (azure-ai-inference) for AI-901 Domain 2.

Demonstrates official AI-901 implementation patterns:
- ChatCompletionsClient + AzureKeyCredential (Microsoft Foundry / GitHub Models)
- SystemMessage vs. UserMessage prompt engineering with structured JSON output
- Multimodal vision extraction via ImageContentItem + TextContentItem
- Single-agent tool calling via ChatCompletionsToolDefinition + ToolMessage
- Graceful deterministic Offline Demo Mode when no API key is configured
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import (
    AssistantMessage,
    ChatCompletionsToolDefinition,
    FunctionDefinition,
    ImageContentItem,
    ImageUrl,
    SystemMessage,
    TextContentItem,
    ToolMessage,
    UserMessage,
)
from azure.core.credentials import AzureKeyCredential
from azure.core.pipeline.policies import RetryPolicy

from responsible_ai import scan_and_redact_pii, verify_line_item_totals

GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference"

GITHUB_MODEL_ID_MAP: dict[str, str] = {
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "Phi-4": "microsoft/Phi-4",
    "Llama-3.3-70B-Instruct": "meta/Llama-3.3-70B-Instruct",
}

FOUNDRY_MODEL_CATALOG: list[dict[str, Any]] = [
    {
        "id": "gpt-4o-mini",
        "name": "GPT-4o mini",
        "provider": "Azure OpenAI (Microsoft Foundry)",
        "supports_vision": True,
        "supports_tools": True,
        "summary": "Fast multimodal model for vision + structured document extraction & tool-calling agents.",
    },
    {
        "id": "Phi-4",
        "name": "Microsoft Phi-4",
        "provider": "Microsoft Research (Foundry Catalog)",
        "supports_vision": False,
        "supports_tools": True,
        "summary": "Compact high-reasoning Small Language Model (SLM) ideal for text analysis & structured logic.",
    },
    {
        "id": "Llama-3.3-70B-Instruct",
        "name": "Meta Llama 3.3 70B",
        "provider": "Meta (Foundry Serverless Catalog)",
        "supports_vision": False,
        "supports_tools": True,
        "summary": "Open-weight model available via Microsoft Foundry serverless inference endpoints.",
    },
]

EXTRACTION_SYSTEM_PROMPT = (
    "You are FoundryLens AI, an official Microsoft Foundry Content Understanding and Document "
    "Verification assistant. Extract factual information strictly from the provided document text "
    "or image. Never invent line items, dates, or figures that are not present. Maintain neutral, "
    "fair, non-discriminatory phrasing. Write a clear plain-language summary accessible to all "
    "readers (Microsoft Inclusiveness principle). Return ONLY valid JSON matching this exact schema:\n"
    "{\n"
    '  "document_type": "Invoice | Receipt | Academic Notice | Policy | General Document",\n'
    '  "issuer": "Organization or sender name",\n'
    '  "document_date": "YYYY-MM-DD or N/A",\n'
    '  "reference_id": "Invoice/circular number or N/A",\n'
    '  "currency": "INR | USD | EUR | N/A",\n'
    '  "line_items": [{"description": "Item name", "quantity": 1, "amount": 0.0}],\n'
    '  "subtotal": null,\n'
    '  "tax": null,\n'
    '  "stated_total": null,\n'
    '  "key_dates": [{"label": "Event or deadline", "date": "Date/time string"}],\n'
    '  "key_requirements": ["Important rules, obligations, or action items"],\n'
    '  "plain_language_summary": "2-3 simple sentences summarizing the document clearly.",\n'
    '  "citations": ["Verbatim short quote 1", "Verbatim short quote 2"],\n'
    '  "confidence": 0.95\n'
    "}"
)

AGENT_SYSTEM_PROMPT = (
    "You are FoundryLens Grounded Agent running on Microsoft Foundry. Answer the user's question "
    "EXCLUSIVELY using the provided audited document text, extracted JSON fields, and tool outputs. "
    "If the answer is not in the document, explicitly state that the document does not contain "
    "that information—never hallucinate. Always call `verify_line_item_totals` when asked about "
    "math, totals, or overcharges, and call `scan_and_redact_pii` when asked about sensitive "
    "personal data or privacy. Include 1-2 short verbatim quotes from the document to back your answer."
)


def get_foundry_config() -> dict[str, Any]:
    """Detect active Microsoft Foundry / GitHub Models credentials from environment."""
    azure_endpoint = os.getenv("AZURE_FOUNDRY_ENDPOINT", "").strip()
    azure_key = os.getenv("AZURE_FOUNDRY_KEY", "").strip()
    github_token = os.getenv("GITHUB_TOKEN", "").strip()
    default_model = os.getenv("DEFAULT_FOUNDRY_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"

    if azure_endpoint and azure_key:
        return {
            "mode": "microsoft_foundry",
            "provider_label": "Microsoft Foundry (Azure AI)",
            "endpoint": azure_endpoint,
            "credential": azure_key,
            "default_model": default_model,
            "live_inference": True,
        }
    if github_token:
        return {
            "mode": "github_models_azure",
            "provider_label": "GitHub Models (Azure Foundry Catalog)",
            "endpoint": GITHUB_MODELS_ENDPOINT,
            "credential": github_token,
            "default_model": default_model,
            "live_inference": True,
        }
    return {
        "mode": "offline_demo",
        "provider_label": "Offline Deterministic Demo (Foundry SDK Ready)",
        "endpoint": "local://offline-demo",
        "credential": "",
        "default_model": default_model,
        "live_inference": False,
    }


def _build_client(cfg: dict[str, Any]) -> ChatCompletionsClient:
    return ChatCompletionsClient(
        endpoint=cfg["endpoint"],
        credential=AzureKeyCredential(cfg["credential"]),
        connection_timeout=6.0,
        read_timeout=20.0,
        retry_policy=RetryPolicy(retry_total=0),
    )


def _resolve_model_id(cfg: dict[str, Any], model_name: str) -> str:
    if cfg["mode"] == "github_models_azure":
        return GITHUB_MODEL_ID_MAP.get(model_name, model_name)
    return model_name


def _strip_json_fences(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_number(val: str) -> float | None:
    cleaned = val.replace(",", "").strip()
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def _offline_extract_document(
    text: str,
    has_image: bool = False,
    temperature: float = 0.2,
    model_name: str = "gpt-4o-mini",
) -> dict[str, Any]:
    """Deterministic fallback parser that adapts tone/style to both Model and Temperature (T)."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines and has_image:
        return {
            "document_type": "Uploaded Image (Offline Mode)",
            "issuer": "Visual Document (Connect Foundry Key for Live Vision OCR)",
            "document_date": "N/A",
            "reference_id": "IMG-OFFLINE",
            "currency": "N/A",
            "line_items": [],
            "subtotal": None,
            "tax": None,
            "stated_total": None,
            "key_dates": [],
            "key_requirements": [
                "Image received and formatted as an Azure Foundry ImageContentItem data URL.",
                "Set AZURE_FOUNDRY_ENDPOINT + AZURE_FOUNDRY_KEY or GITHUB_TOKEN in backend/.env to run live GPT-4o mini Vision extraction.",
            ],
            "plain_language_summary": (
                "An image was uploaded successfully. Connect a free GitHub Models token or "
                "Microsoft Foundry key in backend/.env to run live multimodal GPT-4o mini extraction."
            ),
            "citations": ["Multimodal image payload prepared for azure-ai-inference ImageContentItem."],
            "confidence": 0.85,
        }

    full_lower = text.lower()
    issuer = lines[0] if lines else "Unknown Issuer"

    if any(k in full_lower for k in ("circular", "department of", "viva", "submission", "semester")):
        doc_type = "Academic Notice"
    elif any(k in full_lower for k in ("statement", "usage line items", "billing date", "cloud")):
        doc_type = "Cloud Invoice"
    elif any(k in full_lower for k in ("invoice", "receipt", "pharmacy", "subtotal", "total amount")):
        doc_type = "Invoice / Receipt"
    else:
        doc_type = "General Document"

    currency = "INR"
    if "usd" in full_lower or "$" in text:
        currency = "USD"
    elif "eur" in full_lower or "€" in text:
        currency = "EUR"
    elif not any(k in full_lower for k in ("inr", "rs.", "₹", "subtotal", "total amount")):
        currency = "N/A"

    date_match = re.search(r"(?:Date|Billing Date)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}/[0-9]{2}/[0-9]{4})", text, re.IGNORECASE)
    doc_date = date_match.group(1) if date_match else "N/A"

    ref_match = re.search(
        r"(?:Invoice No|Circular No|Statement ID|Ref(?:erence)? No?)\s*:\s*([A-Za-z0-9/_-]+)",
        text,
        re.IGNORECASE,
    )
    reference_id = ref_match.group(1) if ref_match else "N/A"

    line_items: list[dict[str, Any]] = []
    item_pattern = re.compile(
        r"^\d+\.\s+(.+?)\s+(?:Qty\s*(\d+)\s+)?(?:INR|USD|EUR|Rs\.?|₹|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*$",
        re.IGNORECASE,
    )
    for ln in lines:
        m = item_pattern.match(ln)
        if m:
            desc = m.group(1).strip()
            qty = int(m.group(2)) if m.group(2) else 1
            amt = _parse_number(m.group(3)) or 0.0
            line_items.append({"description": desc, "quantity": qty, "amount": amt})

    subtotal_match = re.search(
        r"(?mi)^\s*Subtotal\s*:\s*(?:INR|USD|EUR|Rs\.?|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        text,
    )
    tax_match = re.search(
        r"(?mi)^\s*(?:GST|Tax|Estimated Tax|VAT)\b[^:\n]*:\s*(?:INR|USD|EUR|Rs\.?|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        text,
    )
    total_match = re.search(
        r"(?mi)^\s*(?:TOTAL AMOUNT DUE|Grand Total|Net Total|Total Due)\s*:\s*(?:INR|USD|EUR|Rs\.?|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        text,
    )

    subtotal = _parse_number(subtotal_match.group(1)) if subtotal_match else None
    tax = _parse_number(tax_match.group(1)) if tax_match else None
    stated_total = _parse_number(total_match.group(1)) if total_match else None

    key_dates: list[dict[str, str]] = []
    for ln in lines:
        if ln.startswith("-") and re.search(r"20\d{2}-\d{2}-\d{2}", ln):
            parts = ln.lstrip("- ").split(":", 1)
            if len(parts) == 2:
                key_dates.append({"label": parts[0].strip(), "date": parts[1].strip()})

    key_requirements: list[str] = []
    for ln in lines:
        if re.match(r"^\d+\.\s+", ln) and not item_pattern.match(ln):
            key_requirements.append(re.sub(r"^\d+\.\s+", "", ln))
        elif ln.lower().startswith(("note:", "status:")):
            key_requirements.append(ln)

    if model_name == "Phi-4":
        model_prefix = "Phi-4 SLM Reasoning"
        conf_offset = -0.01
    elif model_name == "Llama-3.3-70B-Instruct":
        model_prefix = "Llama 3.3 70B Analysis"
        conf_offset = -0.02
    else:
        model_prefix = "GPT-4o mini Extraction"
        conf_offset = 0.0

    if temperature <= 0.3:
        # Strict deterministic regime: terse, clinical, fact-only summary
        if line_items and stated_total is not None:
            if model_name == "Phi-4":
                summary = (
                    f"[{model_prefix} · T={temperature:.1f}] Parsed {len(line_items)} charge entries "
                    f"from {issuer} ({doc_date}). Printed total: {currency} {stated_total:.2f}. "
                    f"Arithmetic cross-check delegated to deterministic tool."
                )
            elif model_name == "Llama-3.3-70B-Instruct":
                summary = (
                    f"[{model_prefix} · T={temperature:.1f}] Structured audit complete for {issuer} "
                    f"({doc_type}, Ref {reference_id}): {len(line_items)} itemized lines totaling "
                    f"{currency} {stated_total:.2f} printed."
                )
            else:
                summary = (
                    f"[{model_prefix} · T={temperature:.1f}] {doc_type} | Issuer: {issuer} | Date: {doc_date} | "
                    f"{len(line_items)} line item(s) | Stated Total: {currency} {stated_total:.2f}."
                )
        elif key_dates:
            summary = (
                f"[{model_prefix} · T={temperature:.1f}] {doc_type} | Issuer: {issuer} | "
                f"{len(key_requirements)} requirement(s), {len(key_dates)} deadline(s) extracted."
            )
        else:
            summary = (
                f"[{model_prefix} · T={temperature:.1f}] {doc_type} from {issuer} ({doc_date}). "
                f"Structured fields extracted deterministically."
            )
        confidence = round(0.96 + conf_offset, 2)
    elif temperature <= 0.6:
        # Balanced plain-English regime
        if line_items and stated_total is not None:
            if model_name == "Phi-4":
                summary = (
                    f"Phi-4 SLM summary: {issuer} issued this {doc_type.lower()} on {doc_date} with "
                    f"{len(line_items)} billed items and a stated balance of {currency} {stated_total:.2f}. "
                    f"Verify the computed subtotal against the printed total below."
                )
            elif model_name == "Llama-3.3-70B-Instruct":
                summary = (
                    f"Llama 3.3 70B review: This {doc_type.lower()} from {issuer} ({doc_date}) contains "
                    f"{len(line_items)} itemized charges amounting to a printed {currency} {stated_total:.2f}, "
                    f"audited alongside Responsible AI privacy and arithmetic checks."
                )
            else:
                summary = (
                    f"This {doc_type.lower()} from {issuer} (dated {doc_date}) lists {len(line_items)} "
                    f"itemized charges with a stated total of {currency} {stated_total:.2f}. "
                    f"Review the deterministic math audit below to confirm all charges add up accurately."
                )
        elif key_dates:
            summary = (
                f"[{model_prefix}] This {doc_type.lower()} from {issuer} outlines {len(key_requirements)} mandatory "
                f"action item(s) and {len(key_dates)} key deadline(s). Sensitive contact details were "
                f"checked by the Responsible AI Privacy Shield."
            )
        else:
            summary = (
                f"[{model_prefix}] Extracted structured metadata from {issuer} ({doc_type}). "
                f"You can inspect redacted identifiers and ask grounded follow-up questions below."
            )
        confidence = round(0.93 + conf_offset, 2)
    else:
        # Expressive / high-temperature regime: richer narrative + advisory phrasing
        if line_items and stated_total is not None:
            summary = (
                f"[{model_prefix}] Looking closely at this {doc_type.lower()} issued by {issuer} on {doc_date}, "
                f"there are {len(line_items)} separate billed items totaling a printed {currency} {stated_total:.2f}. "
                f"Before approving payment or claiming reimbursement, cross-check the deterministic math audit "
                f"and verify every redacted personal detail under the PII tab."
            )
        elif key_dates:
            summary = (
                f"[{model_prefix}] Here is a clear walkthrough of the {doc_type.lower()} from {issuer}: it lays out "
                f"{len(key_requirements)} key action item(s) alongside {len(key_dates)} upcoming deadline(s) "
                f"you should put on your calendar right away, while Privacy Shield keeps staff contact info safe."
            )
        else:
            summary = (
                f"[{model_prefix}] I analyzed this {doc_type.lower()} from {issuer} in expressive mode (T={temperature:.1f}). "
                f"Key metadata, privacy findings, and citations are ready below—note that lower temperatures "
                f"(T <= 0.3) are recommended when auditing strict financial figures."
            )
        confidence = round(0.87 + conf_offset, 2)

    citations = [ln for ln in lines[:6] if len(ln) > 15][:3]
    if total_match:
        for ln in lines:
            if "total" in ln.lower():
                citations.append(ln)
                break

    return {
        "document_type": doc_type,
        "issuer": issuer,
        "document_date": doc_date,
        "reference_id": reference_id,
        "currency": currency,
        "line_items": line_items,
        "subtotal": subtotal,
        "tax": tax,
        "stated_total": stated_total,
        "key_dates": key_dates,
        "key_requirements": key_requirements[:6],
        "plain_language_summary": summary,
        "citations": list(dict.fromkeys(citations))[:4],
        "confidence": confidence,
    }


def extract_structured_document(
    document_text: str,
    model_name: str = "gpt-4o-mini",
    temperature: float = 0.2,
    image_data_url: str | None = None,
) -> dict[str, Any]:
    """Run Content Understanding extraction via Microsoft Foundry SDK (or offline fallback)."""
    cfg = get_foundry_config()
    chosen_model = model_name or cfg["default_model"]
    started = time.perf_counter()

    user_prompt_text = (
        "Analyze the following document and return ONLY the required JSON object:\n\n"
        f"{document_text or '[Inspect the attached document image and extract all structured fields.]'}"
    )

    if cfg["live_inference"]:
        try:
            client = _build_client(cfg)
            if image_data_url:
                user_content: Any = [
                    TextContentItem(text=user_prompt_text),
                    ImageContentItem(image_url=ImageUrl(url=image_data_url)),
                ]
            else:
                user_content = user_prompt_text

            response = client.complete(
                model=_resolve_model_id(cfg, chosen_model),
                messages=[
                    SystemMessage(content=EXTRACTION_SYSTEM_PROMPT),
                    UserMessage(content=user_content),
                ],
                temperature=temperature,
                max_tokens=1200,
            )
            raw_content = response.choices[0].message.content or "{}"
            extracted = json.loads(_strip_json_fences(raw_content))
            elapsed_ms = round((time.perf_counter() - started) * 1000)
            usage = response.usage
            return {
                "extracted": extracted,
                "telemetry": {
                    "mode": cfg["mode"],
                    "provider_label": cfg["provider_label"],
                    "model": chosen_model,
                    "temperature": temperature,
                    "latency_ms": elapsed_ms,
                    "prompt_tokens": getattr(usage, "prompt_tokens", 0) if usage else 0,
                    "completion_tokens": getattr(usage, "completion_tokens", 0) if usage else 0,
                    "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
                    "fallback_reason": None,
                },
                "prompts": {
                    "system_prompt": EXTRACTION_SYSTEM_PROMPT,
                    "user_prompt_preview": user_prompt_text[:1200],
                },
            }
        except Exception as exc:
            fallback_reason = f"Live Foundry request fell back to deterministic offline engine: {exc}"
    else:
        fallback_reason = "No AZURE_FOUNDRY_KEY or GITHUB_TOKEN set — running deterministic Offline Demo mode."

    extracted = _offline_extract_document(
        document_text,
        has_image=bool(image_data_url),
        temperature=temperature,
        model_name=chosen_model,
    )
    elapsed_ms = max(18, round((time.perf_counter() - started) * 1000))
    est_prompt_tokens = max(120, len(user_prompt_text.split()) * 2)
    est_completion_tokens = max(90, len(json.dumps(extracted).split()) * 2)

    return {
        "extracted": extracted,
        "telemetry": {
            "mode": "offline_demo",
            "provider_label": "Offline Deterministic Demo (Foundry SDK Ready)",
            "model": chosen_model,
            "temperature": temperature,
            "latency_ms": elapsed_ms,
            "prompt_tokens": est_prompt_tokens,
            "completion_tokens": est_completion_tokens,
            "total_tokens": est_prompt_tokens + est_completion_tokens,
            "fallback_reason": fallback_reason,
        },
        "prompts": {
            "system_prompt": EXTRACTION_SYSTEM_PROMPT,
            "user_prompt_preview": user_prompt_text[:1200],
        },
    }


def _build_foundry_tools() -> list[ChatCompletionsToolDefinition]:
    return [
        ChatCompletionsToolDefinition(
            function=FunctionDefinition(
                name="verify_line_item_totals",
                description="Deterministically sum extracted line items + tax and compare against the stated total to catch arithmetic errors or hallucinations.",
                parameters={
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Why the agent is invoking arithmetic verification.",
                        }
                    },
                    "required": ["reason"],
                },
            )
        ),
        ChatCompletionsToolDefinition(
            function=FunctionDefinition(
                name="scan_and_redact_pii",
                description="Inspect the document text for exposed PII (emails, phone numbers, Aadhaar, PAN, payment cards) under Microsoft Privacy & Security guidelines.",
                parameters={
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Why the agent is checking PII status.",
                        }
                    },
                    "required": ["reason"],
                },
            )
        ),
    ]


def _offline_grounded_agent(
    question: str,
    document_text: str,
    extracted: dict[str, Any],
    math_audit: dict[str, Any],
    pii_audit: dict[str, Any],
) -> tuple[str, list[dict[str, Any]], list[str]]:
    q = question.lower()
    tool_trace: list[dict[str, Any]] = []
    citations: list[str] = list(extracted.get("citations", []))[:2]

    if any(k in q for k in ("math", "total", "add up", "overcharge", "discrepancy", "bill", "amount", "cost", "price", "tax")):
        recomputed = verify_line_item_totals(
            extracted.get("line_items", []),
            extracted.get("tax"),
            extracted.get("stated_total"),
            extracted.get("currency", "INR"),
        )
        tool_trace.append(
            {
                "tool": "verify_line_item_totals",
                "arguments": {"reason": "User asked to verify totals/charges against line items."},
                "result_summary": recomputed["verdict"],
            }
        )
        if recomputed["status"] == "discrepancy_detected":
            answer = (
                f"No — the printed total does NOT match the line items. I invoked the deterministic "
                f"`verify_line_item_totals` tool: the {len(extracted.get('line_items', []))} line items "
                f"sum to {recomputed['currency']} {recomputed['computed_subtotal']:.2f}, plus tax "
                f"{recomputed['currency']} {recomputed['tax']:.2f} = **{recomputed['currency']} "
                f"{recomputed['computed_total']:.2f}**, whereas the document states "
                f"**{recomputed['currency']} {recomputed['stated_total']:.2f}** "
                f"(a discrepancy of {recomputed['currency']} {abs(recomputed['difference']):.2f}). "
                f"Human review is recommended before paying or reimbursing."
            )
        elif recomputed["status"] == "verified":
            answer = (
                f"Yes — verified cleanly via `verify_line_item_totals`. All {len(extracted.get('line_items', []))} "
                f"line items ({recomputed['currency']} {recomputed['computed_subtotal']:.2f}) plus tax "
                f"({recomputed['currency']} {recomputed['tax']:.2f}) exactly equal the stated total of "
                f"**{recomputed['currency']} {recomputed['stated_total']:.2f}**."
            )
        else:
            answer = recomputed["verdict"]
        return answer, tool_trace, citations

    if any(k in q for k in ("pii", "privacy", "personal", "phone", "email", "aadhaar", "pan", "redact", "sensitive")):
        tool_trace.append(
            {
                "tool": "scan_and_redact_pii",
                "arguments": {"reason": "User asked about sensitive personal identifiers in the document."},
                "result_summary": f"{pii_audit.get('total_redacted', 0)} PII item(s) detected across {len(pii_audit.get('findings', []))} categories.",
            }
        )
        findings = pii_audit.get("findings", [])
        if findings:
            cats = ", ".join(f"{f['category']} ({f['count']})" for f in findings)
            answer = (
                f"The `scan_and_redact_pii` Responsible AI tool identified **{pii_audit['total_redacted']} "
                f"sensitive identifier(s)**: {cats}. When Privacy Shield is active, every identifier is "
                f"replaced with redaction tokens (e.g., `[REDACTED_EMAIL]`, `[REDACTED_PHONE]`) before "
                f"text ever leaves the backend for model inference."
            )
        else:
            answer = "The `scan_and_redact_pii` tool scanned the document and found **0 exposed personal identifiers**."
        return answer, tool_trace, citations

    if any(k in q for k in ("deadline", "date", "when", "due", "viva", "submit")):
        key_dates = extracted.get("key_dates", [])
        if key_dates:
            date_lines = "; ".join(f"**{d['label']}**: {d['date']}" for d in key_dates)
            answer = f"Based on the document from {extracted.get('issuer', 'the issuer')}, the key dates are: {date_lines}."
            citations = [f"{d['label']}: {d['date']}" for d in key_dates[:2]]
        else:
            answer = f"The document date listed is **{extracted.get('document_date', 'N/A')}**. No additional submission deadlines were extracted."
        return answer, tool_trace, citations

    if any(k in q for k in ("summary", "summarize", "explain", "simple", "plain", "about")):
        answer = extracted.get("plain_language_summary", "Document audited successfully.")
        reqs = extracted.get("key_requirements", [])
        if reqs:
            answer += " Key action items: " + " | ".join(reqs[:3])
        return answer, tool_trace, citations

    # Keyword-grounded lookup in document lines to prevent hallucination
    q_words = [w for w in re.findall(r"[a-zA-Z0-9]{4,}", q) if w not in {"what", "does", "this", "document", "about", "there", "have", "with"}]
    matched_lines = [
        ln.strip()
        for ln in document_text.splitlines()
        if ln.strip() and any(w in ln.lower() for w in q_words)
    ]
    if matched_lines:
        answer = (
            f"From the audited document ({extracted.get('issuer', 'Source')}): "
            + " ".join(matched_lines[:2])
        )
        citations = matched_lines[:2]
    else:
        answer = (
            "The uploaded document does not contain verified information to answer that question. "
            "Under Microsoft Foundry grounding guardrails, I avoid guessing facts outside the source text."
        )
    return answer, tool_trace, citations


def run_grounded_agent(
    question: str,
    document_text: str,
    extracted: dict[str, Any],
    math_audit: dict[str, Any],
    pii_audit: dict[str, Any],
    model_name: str = "gpt-4o-mini",
    temperature: float = 0.2,
) -> dict[str, Any]:
    """Execute a single-agent grounded Q&A turn with Foundry tool calling (or offline fallback)."""
    cfg = get_foundry_config()
    chosen_model = model_name or cfg["default_model"]
    started = time.perf_counter()

    context_block = (
        f"AUDITED DOCUMENT TEXT (PII-Safe):\n{document_text[:4500]}\n\n"
        f"EXTRACTED STRUCTURED JSON:\n{json.dumps(extracted, indent=2)[:2500]}\n\n"
        f"USER QUESTION:\n{question}"
    )

    if cfg["live_inference"]:
        try:
            client = _build_client(cfg)
            tools = _build_foundry_tools()
            messages: list[Any] = [
                SystemMessage(content=AGENT_SYSTEM_PROMPT),
                UserMessage(content=context_block),
            ]
            tool_trace: list[dict[str, Any]] = []

            first = client.complete(
                model=_resolve_model_id(cfg, chosen_model),
                messages=messages,
                tools=tools,
                temperature=temperature,
                max_tokens=600,
            )
            choice = first.choices[0]
            msg = choice.message

            if getattr(msg, "tool_calls", None):
                messages.append(
                    AssistantMessage(
                        content=msg.content or "",
                        tool_calls=msg.tool_calls,
                    )
                )
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    try:
                        fn_args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        fn_args = {}

                    if fn_name == "verify_line_item_totals":
                        tool_res = verify_line_item_totals(
                            extracted.get("line_items", []),
                            extracted.get("tax"),
                            extracted.get("stated_total"),
                            extracted.get("currency", "INR"),
                        )
                        summary = tool_res["verdict"]
                    elif fn_name == "scan_and_redact_pii":
                        tool_res = pii_audit
                        summary = f"{pii_audit.get('total_redacted', 0)} PII item(s) scanned."
                    else:
                        tool_res = {"error": f"Unknown tool: {fn_name}"}
                        summary = tool_res["error"]

                    tool_trace.append(
                        {
                            "tool": fn_name,
                            "arguments": fn_args,
                            "result_summary": summary,
                        }
                    )
                    messages.append(
                        ToolMessage(
                            content=json.dumps(tool_res),
                            tool_call_id=tc.id,
                        )
                    )

                final = client.complete(
                    model=_resolve_model_id(cfg, chosen_model),
                    messages=messages,
                    temperature=temperature,
                    max_tokens=600,
                )
                answer_text = final.choices[0].message.content or "Unable to generate response."
                usage = final.usage
            else:
                answer_text = msg.content or "Unable to generate response."
                usage = first.usage

            elapsed_ms = round((time.perf_counter() - started) * 1000)
            return {
                "answer": answer_text,
                "citations": list(extracted.get("citations", []))[:2],
                "tool_trace": tool_trace,
                "telemetry": {
                    "mode": cfg["mode"],
                    "provider_label": cfg["provider_label"],
                    "model": chosen_model,
                    "latency_ms": elapsed_ms,
                    "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
                },
            }
        except Exception:
            pass

    answer_text, tool_trace, citations = _offline_grounded_agent(
        question=question,
        document_text=document_text,
        extracted=extracted,
        math_audit=math_audit,
        pii_audit=pii_audit,
    )
    elapsed_ms = max(14, round((time.perf_counter() - started) * 1000))
    return {
        "answer": answer_text,
        "citations": citations,
        "tool_trace": tool_trace,
        "telemetry": {
            "mode": "offline_demo",
            "provider_label": "Offline Deterministic Demo (Foundry SDK Ready)",
            "model": chosen_model,
            "latency_ms": elapsed_ms,
            "total_tokens": max(65, len(answer_text.split()) * 3),
        },
    }
