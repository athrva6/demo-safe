"""Bounded Strands review over finding categories; never send OCR text or values."""

import json
import os
from collections import Counter
from pathlib import Path
from typing import Literal

from botocore.config import Config
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .detection import RULES

SUPPORTED_LABELS = frozenset(rule[0] for rule in RULES)


class AgentReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    labels: list[str] = Field(min_length=1, max_length=30)

    @field_validator("labels")
    @classmethod
    def supported_labels_only(cls, labels: list[str]) -> list[str]:
        if any(label not in SUPPORTED_LABELS for label in labels):
            raise ValueError("Only detector-generated categories can be reviewed.")
        return labels


class ReviewPriority(BaseModel):
    label: str = Field(max_length=80)
    severity: Literal["high", "medium", "low"]
    action: str = Field(max_length=180)


class AgentReview(BaseModel):
    overall_risk: Literal["high", "medium", "low"]
    summary: str = Field(max_length=280)
    priorities: list[ReviewPriority] = Field(min_length=1, max_length=6)
    checklist: list[str] = Field(min_length=2, max_length=5)


def category_counts(labels: list[str]) -> list[dict[str, int | str]]:
    """Aggregate an allow-listed category list before it reaches the model."""
    counts = Counter(labels)
    return [{"label": label, "count": counts[label]} for label in sorted(counts)]


def build_review(labels: list[str]) -> AgentReview:
    """Use Strands with Bedrock structured output over sanitized metadata."""
    from strands import Agent, AgentSkills
    from strands.models import BedrockModel

    model = BedrockModel(
        model_id=os.getenv("AGENT_MODEL_ID", "amazon.nova-2-lite-v1:0"),
        region_name=os.getenv("AGENT_REGION", "us-east-1"),
        temperature=0.1,
        max_tokens=500,
        boto_client_config=Config(
            connect_timeout=3,
            read_timeout=18,
            retries={"total_max_attempts": 1},
        ),
    )
    skills = AgentSkills(
        skills=str(Path(__file__).resolve().parent.parent / "skills"),
        strict=True,
    )
    agent = Agent(
        model=model,
        plugins=[skills],
        callback_handler=None,
        system_prompt=(
            "You are DemoSafe's privacy review agent. Activate the privacy-review "
            "skill before evaluating the supplied detector categories."
        ),
    )
    prompt = (
        "Review these detected categories and counts. Base every priority on this "
        "JSON only:\n" + json.dumps(category_counts(labels), separators=(",", ":"))
    )
    return agent.structured_output(AgentReview, prompt)
