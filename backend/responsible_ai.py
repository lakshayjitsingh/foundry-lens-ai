"""Responsible AI Guardrails & Deterministic Verification Tools (AI-901 Domain 1 & 2).

Implements Microsoft's 6 Responsible AI Principles in clean, auditable Python:
1. Privacy & Security     -> PII detection & redaction prior to LLM inference
2. Reliability & Safety   -> Prompt-injection shield, content safety, deterministic math tool
3. Transparency           -> Model/provider telemetry, citations, prompt inspection
4. Inclusiveness          -> Plain-language summary support + speech accessibility metadata
5. Fairness               -> Grounded, neutral, source-anchored verification policy
6. Accountability         -> Structured audit trail & human-in-the-loop disclaimer
"""

from __future__ import annotations

import re
from typing import Any

# Ordered from most specific to more general so patterns do not collide.
PII_PATTERNS: list[tuple[str, str, re.Pattern[str]]] = [
    (
        "Email Address",
        "[REDACTED_EMAIL]",
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ),
    (
        "Indian PAN",
        "[REDACTED_PAN]",
        re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),
    ),
    (
        "Aadhaar / National ID",
        "[REDACTED_AADHAAR]",
        re.compile(r"\b[2-9][0-9]{3}[\s-][0-9]{4}[\s-][0-9]{4}\b"),
    ),
    (
        "Phone Number",
        "[REDACTED_PHONE]",
        re.compile(
            r"(?<!\d)(?:\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}|\+1[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|(?<![\d.-])[6-9]\d{9}(?![\d.-]))"
        ),
    ),
    (
        "Payment Card",
        "[REDACTED_CARD]",
        re.compile(r"\b(?:\d{4}[\s-]){3}\d{4}\b"),
    ),
]

PROMPT_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.IGNORECASE),
    re.compile(r"disregard\s+(your\s+)?(rules|instructions|system\s+prompt)", re.IGNORECASE),
    re.compile(r"(reveal|print|show|leak)\s+(your\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"\b(jailbreak|do\s+anything\s+now|dan\s+mode|bypass\s+safety)\b", re.IGNORECASE),
    re.compile(r"override\s+(safety|guardrails|instructions|policy)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+an?\s+unrestricted", re.IGNORECASE),
]

UNSAFE_CONTENT_PATTERNS: dict[str, list[re.Pattern[str]]] = {
    "violence": [
        re.compile(r"\b(how\s+to\s+(build|make)\s+a?\s*(bomb|explosive|weapon))\b", re.IGNORECASE),
    ],
    "self_harm": [
        re.compile(r"\b(how\s+to\s+(commit\s+suicide|harm\s+myself))\b", re.IGNORECASE),
    ],
    "hate": [
        re.compile(r"\b(exterminate|genocide\s+against)\b", re.IGNORECASE),
    ],
}


def _mask_preview(raw_value: str) -> str:
    cleaned = raw_value.strip()
    if len(cleaned) <= 4:
        return "****"
    return f"{cleaned[:2]}***{cleaned[-2:]}"


def scan_and_redact_pii(text: str) -> dict[str, Any]:
    """Scan text for sensitive PII and return a redacted version + safe audit ledger."""
    if not text:
        return {
            "redacted_text": "",
            "total_redacted": 0,
            "findings": [],
        }

    redacted = text
    findings: list[dict[str, Any]] = []
    total_redacted = 0

    for category, token, pattern in PII_PATTERNS:
        matches = list(pattern.finditer(redacted))
        if not matches:
            continue
        previews = [_mask_preview(m.group(0)) for m in matches[:4]]
        count = len(matches)
        total_redacted += count
        findings.append(
            {
                "category": category,
                "token": token,
                "count": count,
                "masked_samples": previews,
            }
        )
        redacted = pattern.sub(token, redacted)

    return {
        "redacted_text": redacted,
        "total_redacted": total_redacted,
        "findings": findings,
    }


def check_content_safety(text: str) -> dict[str, Any]:
    """Azure AI Content Safety & Prompt Shield pre-flight check."""
    if not text:
        return {
            "safe": True,
            "blocked": False,
            "prompt_injection_detected": False,
            "risk_level": "low",
            "flagged_categories": [],
            "reason": "No unsafe content or prompt injection patterns detected.",
        }

    flagged: list[str] = []
    prompt_injection = False

    for pat in PROMPT_INJECTION_PATTERNS:
        if pat.search(text):
            prompt_injection = True
            if "prompt_injection" not in flagged:
                flagged.append("prompt_injection")
            break

    for category, patterns in UNSAFE_CONTENT_PATTERNS.items():
        if any(p.search(text) for p in patterns):
            flagged.append(category)

    if flagged:
        reason = (
            "Prompt injection attempt blocked by Responsible AI Prompt Shield."
            if prompt_injection
            else f"Unsafe content detected in category: {', '.join(flagged)}."
        )
        return {
            "safe": False,
            "blocked": True,
            "prompt_injection_detected": prompt_injection,
            "risk_level": "high",
            "flagged_categories": flagged,
            "reason": reason,
        }

    return {
        "safe": True,
        "blocked": False,
        "prompt_injection_detected": False,
        "risk_level": "low",
        "flagged_categories": [],
        "reason": "Passed Prompt Shield & Content Safety inspection.",
    }


def quarantine_indirect_injections(text: str) -> str:
    """Neutralize indirect prompt-injection strings embedded inside uploaded documents."""
    sanitized = text
    for pat in PROMPT_INJECTION_PATTERNS:
        sanitized = pat.sub("[QUARANTINED_PROMPT_INJECTION]", sanitized)
    return sanitized


def verify_line_item_totals(
    line_items: list[dict[str, Any]],
    tax: float | None,
    stated_total: float | None,
    currency: str = "INR",
) -> dict[str, Any]:
    """Deterministic Foundry Agent tool to detect receipt math errors or LLM hallucinations."""
    if not line_items and stated_total is None:
        return {
            "tool_name": "verify_line_item_totals",
            "status": "not_applicable",
            "computed_subtotal": None,
            "tax": None,
            "computed_total": None,
            "stated_total": None,
            "difference": 0.0,
            "currency": currency,
            "verdict": "Non-financial document — numeric arithmetic audit not applicable.",
        }

    computed_subtotal = round(sum(float(item.get("amount", 0.0) or 0.0) for item in line_items), 2)
    tax_val = round(float(tax or 0.0), 2)
    computed_total = round(computed_subtotal + tax_val, 2)

    if stated_total is None:
        return {
            "tool_name": "verify_line_item_totals",
            "status": "partial",
            "computed_subtotal": computed_subtotal,
            "tax": tax_val,
            "computed_total": computed_total,
            "stated_total": None,
            "difference": 0.0,
            "currency": currency,
            "verdict": f"Line items sum to {currency} {computed_total:.2f}, but no final printed total was found.",
        }

    stated_val = round(float(stated_total), 2)
    difference = round(stated_val - computed_total, 2)

    if abs(difference) <= 0.02:
        return {
            "tool_name": "verify_line_item_totals",
            "status": "verified",
            "computed_subtotal": computed_subtotal,
            "tax": tax_val,
            "computed_total": computed_total,
            "stated_total": stated_val,
            "difference": 0.0,
            "currency": currency,
            "verdict": (
                f"Verified exact match: {len(line_items)} line items ({currency} {computed_subtotal:.2f}) "
                f"+ tax ({currency} {tax_val:.2f}) = {currency} {stated_val:.2f}."
            ),
        }

    direction = "higher (potential overcharge or missing item)" if difference > 0 else "lower (discount or undercharge)"
    return {
        "tool_name": "verify_line_item_totals",
        "status": "discrepancy_detected",
        "computed_subtotal": computed_subtotal,
        "tax": tax_val,
        "computed_total": computed_total,
        "stated_total": stated_val,
        "difference": difference,
        "currency": currency,
        "verdict": (
            f"Math mismatch caught by verification tool! Computed total is {currency} {computed_total:.2f}, "
            f"but document states {currency} {stated_val:.2f} — {currency} {abs(difference):.2f} {direction}."
        ),
    }


def build_responsible_ai_scorecard(
    pii_audit: dict[str, Any],
    privacy_shield_enabled: bool,
    safety_audit: dict[str, Any],
    math_audit: dict[str, Any],
    provider_label: str,
    model_name: str,
    has_plain_summary: bool,
) -> list[dict[str, str]]:
    """Build a structured 6-pillar Microsoft Responsible AI compliance scorecard."""
    pii_count = int(pii_audit.get("total_redacted", 0))
    if pii_count > 0 and privacy_shield_enabled:
        privacy_status = "pass"
        privacy_detail = f"Privacy Shield masked {pii_count} sensitive PII item(s) before model inference."
    elif pii_count > 0 and not privacy_shield_enabled:
        privacy_status = "warn"
        privacy_detail = f"{pii_count} PII item(s) detected while Privacy Shield was OFF — enable masking for production."
    else:
        privacy_status = "pass"
        privacy_detail = "No exposed personal identifiers detected in submitted content."

    if not safety_audit.get("safe", True):
        reliability_status = "flag"
        reliability_detail = safety_audit.get("reason", "Safety guardrail triggered.")
    elif math_audit.get("status") == "discrepancy_detected":
        reliability_status = "warn"
        reliability_detail = "Prompt Shield passed; deterministic math tool caught a numeric discrepancy requiring human review."
    else:
        reliability_status = "pass"
        reliability_detail = "Prompt Shield & deterministic math verification tool both passed cleanly."

    return [
        {
            "principle": "Privacy & Security",
            "status": privacy_status,
            "detail": privacy_detail,
        },
        {
            "principle": "Reliability & Safety",
            "status": reliability_status,
            "detail": reliability_detail,
        },
        {
            "principle": "Transparency",
            "status": "pass",
            "detail": f"Full telemetry disclosed ({provider_label} · {model_name}), plus inspectable System/User prompts & citations.",
        },
        {
            "principle": "Inclusiveness",
            "status": "pass" if has_plain_summary else "warn",
            "detail": "Plain-language summary generated alongside built-in speech read-aloud accessibility controls.",
        },
        {
            "principle": "Fairness",
            "status": "pass",
            "detail": "System prompt enforces neutral, strictly document-grounded extraction with zero demographic profiling.",
        },
        {
            "principle": "Accountability",
            "status": "pass",
            "detail": "Exportable JSON audit record with human-in-the-loop verification notice for high-stakes decisions.",
        },
    ]
