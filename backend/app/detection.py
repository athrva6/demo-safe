"""Conservative, reviewable rules over AWS OCR words; no raw text in findings."""
import re

RULES = [
    ("Possible credential", re.compile(r"\b(?:api[_ -]?key|secret|password|token)\b\s*[:=]\s*[\"']?([^\s\"']{4,})", re.I), 1, "Value appears beside a credential label."),
    ("Possible access key", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"), 0, "Matches a supported AWS access-key identifier pattern."),
    ("Possible token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b"), 0, "Matches a supported token pattern; validity was not checked."),
    ("Email address", re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+"), 0, "May identify a person or account."),
    ("Possible phone number", re.compile(r"(?<!\d)(?:\+91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)"), 0, "Matches a supported Indian mobile-number format."),
    ("AWS account ID", re.compile(r"(?<!\d)\d{12}(?!\d)"), 0, "A 12-digit AWS account identifier should usually be hidden in public screenshots."),
    ("Possible IP address", re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])"), 0, "An IP address can reveal infrastructure or network details."),
    ("AWS resource identifier", re.compile(r"\b(?:ami|i|sg|subnet|vpc|sgr|igw|nat|vol|snap|eni|rtb)-[0-9a-f]{8,17}\b", re.I), 0, "Identifies a specific AWS resource."),
    ("AWS ARN", re.compile(r"\barn:aws(?:-[a-z]+)?:[A-Za-z0-9-]+:[A-Za-z0-9-]*:\d{12}:[^\s\"']+\b", re.I), 0, "Identifies an AWS account and resource."),
    ("SSH key name", re.compile(r"--key-name\s+([^\s\"']+)", re.I), 1, "May reveal the name of an SSH key used to access an instance."),
]


def rekognition_blocks(detections: list[dict]) -> list[dict]:
    """Convert Rekognition text detections into the block shape used by the rules."""
    child_ids: dict[str, list[str]] = {}
    for detection in detections:
        if detection.get("Type") == "WORD" and detection.get("ParentId") is not None:
            child_ids.setdefault(str(detection["ParentId"]), []).append(str(detection["Id"]))

    blocks = []
    for detection in detections:
        block_type = detection.get("Type")
        if block_type not in {"LINE", "WORD"}:
            continue
        identifier = str(detection.get("Id"))
        block = {
            "Id": identifier,
            "BlockType": block_type,
            "Text": detection.get("DetectedText", ""),
            "Geometry": detection.get("Geometry", {}),
        }
        if block_type == "LINE" and child_ids.get(identifier):
            block["Relationships"] = [{"Type": "CHILD", "Ids": child_ids[identifier]}]
        blocks.append(block)
    return blocks


def find_sensitive(blocks: list[dict]) -> list[dict]:
    by_id = {b.get("Id"): b for b in blocks}
    findings = []
    seen = set()
    for line in blocks:
        if line.get("BlockType") != "LINE":
            continue
        text = line.get("Text", "")
        words, cursor = [], 0
        for relation in line.get("Relationships", []):
            if relation.get("Type") != "CHILD":
                continue
            for identifier in relation.get("Ids", []):
                word = by_id.get(identifier, {})
                if word.get("BlockType") != "WORD":
                    continue
                value = word.get("Text", "")
                start = text.find(value, cursor)
                if start >= 0 and value:
                    words.append((start, start + len(value), word))
                    cursor = start + len(value)
        for category, pattern, group, reason in RULES:
            for match in pattern.finditer(text):
                start, end = match.span(group)
                selected = [w for left, right, w in words if left < end and right > start]
                # Unmapped OCR fragments get a conservative whole-line box.
                boxes = [w["Geometry"]["BoundingBox"] for w in selected] or [line["Geometry"]["BoundingBox"]]
                left = max(0, min(b["Left"] for b in boxes))
                top = max(0, min(b["Top"] for b in boxes))
                right = min(1, max(b["Left"] + b["Width"] for b in boxes))
                bottom = min(1, max(b["Top"] + b["Height"] for b in boxes))
                key = tuple(round(v, 5) for v in (left, top, right, bottom))
                if key in seen or right <= left or bottom <= top:
                    continue
                seen.add(key)
                findings.append({"id": str(len(findings) + 1), "label": category, "reason": reason,
                                 "box": {"x": left, "y": top, "width": right-left, "height": bottom-top}})
    return findings
