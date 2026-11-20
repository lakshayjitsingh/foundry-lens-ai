"""Curated realistic sample documents for AI-901 live & offline demonstrations."""

from __future__ import annotations

from typing import Any

SAMPLE_DOCUMENTS: list[dict[str, Any]] = [
    {
        "id": "pharmacy_receipt_discrepancy",
        "title": "CityCare Pharmacy Invoice (Math Discrepancy + PII)",
        "category": "Financial Receipt",
        "badge": "Tests Math Tool + PII Redaction",
        "description": (
            "A realistic medical receipt containing patient PII (phone, email, Aadhaar) "
            "AND a deliberate Rs. 350 overcharge so the Foundry Agent's math verification "
            "tool catches the billing discrepancy automatically."
        ),
        "text": (
            "CITYCARE DIAGNOSTICS & PHARMACY\n"
            "Sector 17, Chandigarh - 160017 | GSTIN: 04AABCC1234F1Z5\n"
            "Invoice No: CC-2026-8841 | Date: 2026-11-18\n"
            "Patient Name: Aarav Mehta\n"
            "Contact: +91 98765 43210 | Email: aarav.mehta@example.com\n"
            "ID Proof (Aadhaar): 4512 8890 3314\n\n"
            "ITEMIZED BILL:\n"
            "1. Complete Blood Count (CBC) Panel         Qty 1   INR 650.00\n"
            "2. Vitamin D3 60K Capsules (Strip of 8)     Qty 2   INR 480.00\n"
            "3. Digital Infrared Thermometer             Qty 1   INR 1250.00\n"
            "4. Consultation & Report Processing Fee     Qty 1   INR 400.00\n\n"
            "Subtotal: INR 2780.00\n"
            "GST (5%): INR 139.00\n"
            "TOTAL AMOUNT DUE: INR 3269.00\n"
            "Payment Mode: UPI | Cashier: Counter #3\n"
            "Note: Original receipt required within 7 days for insurance reimbursement."
        ),
    },
    {
        "id": "university_exam_notice",
        "title": "University AI-901 Submission Notice (Deadlines + PII)",
        "category": "Academic Notice",
        "badge": "Tests Content Extraction + Inclusiveness",
        "description": (
            "An official-style university department circular with submission deadlines, "
            "hardcopy requirements, and coordinator contact PII—great for testing plain-language "
            "accessibility, PII shielding, and grounded Q&A."
        ),
        "text": (
            "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING (AI & ML)\n"
            "CIRCULAR NO: CSE/CERT/2026/114 | Date: 2026-11-19\n"
            "Subject: Mandatory Submission of Microsoft AI-901 Certification & Mini-Project\n\n"
            "All 5th Semester B.E. CSE (AI & ML) students who appeared for the Microsoft Certified: "
            "Azure AI Fundamentals (AI-901) Certiport examination must submit the following items:\n"
            "1. Color hardcopy of Official Certiport Certificate PDF.\n"
            "2. Hardcopy of Official Certiport Score Report displaying numeric score (minimum passing: 700/1000).\n"
            "3. Working mini-project repository demonstrating Microsoft Foundry SDK & Responsible AI practices.\n\n"
            "IMPORTANT DEADLINES:\n"
            "- Hardcopy submission to Academic Cell (Block B1, Room 204): 2026-11-28 by 04:00 PM.\n"
            "- Viva & Live Project Demonstration: 2026-12-03 starting 10:00 AM.\n\n"
            "For queries contact Dr. Neha Sharma at neha.sharma.coord@university.edu.in "
            "or +91 98150 22334. PAN for external examiner honorarium ref: ABCDE1234F."
        ),
    },
    {
        "id": "azure_cloud_invoice",
        "title": "Azure Student Lab Resource Receipt (Clean & Verified)",
        "category": "Cloud Invoice",
        "badge": "Tests Clean Verification Pass",
        "description": (
            "A clean cloud services usage statement where every line item and tax figure "
            "adds up accurately, demonstrating a verified 100% pass across all Responsible AI pillars."
        ),
        "text": (
            "CLOUD LAB INFRASTRUCTURE STATEMENT\n"
            "Statement ID: AZ-LAB-2026-11 | Billing Date: 2026-11-15\n"
            "Account: AI-901 Student Capstone Sandbox\n\n"
            "USAGE LINE ITEMS:\n"
            "1. Microsoft Foundry Model Inference (gpt-4o-mini, 120K tokens)   USD 1.80\n"
            "2. Azure AI Content Safety API (2,500 text records)               USD 0.95\n"
            "3. Azure Content Understanding (45 document pages)                USD 2.25\n"
            "4. Azure Speech Neural TTS (18,000 characters)                    USD 0.50\n\n"
            "Subtotal: USD 5.50\n"
            "Estimated Tax (0% Academic Credit): USD 0.00\n"
            "TOTAL AMOUNT DUE: USD 5.50\n"
            "Status: Covered 100% by Azure for Students Credit ($100.00 grant)."
        ),
    },
]


def get_sample_by_id(sample_id: str) -> dict[str, Any] | None:
    for sample in SAMPLE_DOCUMENTS:
        if sample["id"] == sample_id:
            return sample
    return None
