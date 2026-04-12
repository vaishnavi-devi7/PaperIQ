import os
import re
from collections import Counter
from io import BytesIO
from typing import Dict, List, Tuple

import pdfplumber
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from huggingface_hub import InferenceClient
from sqlalchemy.orm import Session

from app.db.database import Base, SessionLocal, engine
from app.models.history import ChatHistory, PaperHistory
from app.routes.auth import router as auth_router
from app.services.chunking_service import chunk_text
from app.services.retrieval_service import VectorStore

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PaperIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

stored_text = ""
stored_filename = "paperiq_document.pdf"
vector_store = VectorStore()

SECTION_CHECKLIST = {
    "Introduction": {
        "Problem statement": ["problem", "challenge", "issue", "gap", "limitation", "barrier"],
        "Motivation": ["motivation", "importance", "significance", "need", "purpose", "why"],
        "Contributions": ["contribution", "propose", "present", "novel", "introduce", "we present"],
    },
    "Methodology": {
        "Dataset described": ["dataset", "data", "corpus", "samples", "collected", "benchmark"],
        "Algorithm / Model": ["algorithm", "model", "network", "architecture", "classifier", "framework"],
        "Evaluation metrics": ["accuracy", "precision", "recall", "f1", "metric", "evaluate", "benchmark"],
    },
    "Conclusion": {
        "Recap of work": ["summary", "conclude", "achieved", "demonstrated", "showed", "investigated"],
        "Future scope": ["future", "further", "extend", "improve", "next", "direction", "limitation"],
    },
}

SUGGESTIONS_MAP = {
    "very": "considerably",
    "really": "significantly",
    "a lot": "substantially",
    "lots of": "numerous",
    "many": "numerous",
    "a few": "several",
    "good": "effective",
    "bad": "adverse",
    "big": "substantial",
    "small": "minimal",
    "important": "significant",
    "different": "distinct",
    "hard": "challenging",
    "easy": "straightforward",
    "new": "novel",
    "fast": "rapid",
    "show": "demonstrate",
    "use": "employ",
    "get": "obtain",
    "make": "construct",
    "try": "attempt",
    "help": "facilitate",
    "need": "require",
    "change": "modify",
    "look at": "examine",
    "find out": "ascertain",
    "carry out": "conduct",
    "deal with": "address",
    "set up": "establish",
    "shows that": "indicates that",
    "in order to": "to",
    "due to the fact that": "because",
    "in spite of": "despite",
    "at this point in time": "currently",
    "a number of": "several",
}

POSITIVE_WORDS = {
    "effective",
    "improved",
    "success",
    "strong",
    "efficient",
    "robust",
    "beneficial",
    "significant",
    "accurate",
    "novel",
    "advantage",
    "better",
    "reliable",
    "positive",
    "promising",
    "valuable",
    "useful",
    "clear",
    "efficiently",
    "improvement",
}

NEGATIVE_WORDS = {
    "limited",
    "problem",
    "issue",
    "weak",
    "difficult",
    "challenge",
    "poor",
    "negative",
    "error",
    "risk",
    "unclear",
    "lack",
    "fails",
    "failure",
    "constraint",
    "limitations",
    "limitation",
    "hard",
    "bias",
    "complex",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def split_sentences(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def extract_words(text: str) -> List[str]:
    return re.findall(r"\b[a-zA-Z]+\b", text)


def count_syllables(word: str) -> int:
    word = word.lower().strip()
    if not word:
        return 1

    vowels = "aeiouy"
    count = 0
    prev_is_vowel = False

    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_is_vowel:
            count += 1
        prev_is_vowel = is_vowel

    if word.endswith("e") and count > 1:
        count -= 1

    return max(1, count)


def flesch_reading_ease(text: str) -> float:
    sentences = split_sentences(text)
    words = extract_words(text)

    if not sentences or not words:
        return 0.0

    syllables = sum(count_syllables(word) for word in words)
    words_per_sentence = len(words) / len(sentences)
    syllables_per_word = syllables / len(words)

    score = 206.835 - 1.015 * words_per_sentence - 84.6 * syllables_per_word
    return max(0.0, min(100.0, score))


def extract_title(text: str) -> str:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return lines[0] if lines else "Untitled Document"


def extract_summary(text: str) -> str:
    sentences = split_sentences(text)
    if not sentences:
        return "No summary available."
    return " ".join(sentences[:4])[:900]


def extract_keywords(text: str, top_n: int = 10) -> List[str]:
    stop_words = {
        "this",
        "that",
        "with",
        "from",
        "have",
        "your",
        "will",
        "were",
        "been",
        "about",
        "their",
        "which",
        "there",
        "would",
        "could",
        "should",
        "while",
        "paper",
        "document",
        "using",
        "used",
        "into",
        "than",
        "then",
        "them",
        "they",
        "also",
        "such",
        "through",
        "where",
        "when",
        "what",
        "who",
        "why",
        "how",
        "and",
        "the",
        "for",
        "are",
        "was",
        "you",
        "its",
        "profile",
        "professional",
        "experience",
        "results",
        "method",
        "methods",
        "study",
        "research",
        "analysis",
        "based",
        "between",
        "after",
        "before",
        "being",
        "our",
        "we",
        "can",
        "may",
        "not",
        "has",
        "had",
        "does",
        "did",
        "these",
        "those",
        "over",
        "under",
        "more",
        "most",
        "some",
    }

    words = [
        word.lower()
        for word in extract_words(text)
        if len(word) > 4 and word.lower() not in stop_words
    ]

    freq = Counter(words)
    return [word for word, _ in freq.most_common(top_n)]


def extract_sections(text: str) -> Tuple[Dict[str, str], Dict[str, str]]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    sections_raw: Dict[str, List[str]] = {}
    current_header = "Introduction / Preamble"
    sections_raw[current_header] = []

    common_headers = {
        "abstract",
        "introduction",
        "literature review",
        "methodology",
        "methods",
        "results",
        "discussion",
        "conclusion",
        "references",
    }

    for line in lines:
        is_numbered_header = bool(re.match(r"^\d+(\.\d+)*\s+[A-Za-z].{0,60}$", line))
        is_plain_header = line.lower() in common_headers or (line.isupper() and 3 < len(line) < 50)

        if is_numbered_header or is_plain_header:
            current_header = line
            if current_header not in sections_raw:
                sections_raw[current_header] = []
        else:
            sections_raw[current_header].append(line)

    cleaned_raw = {
        header: " ".join(content).strip()
        for header, content in sections_raw.items()
        if " ".join(content).strip()
    }

    sections_summary = {}
    for header, content in cleaned_raw.items():
        sents = split_sentences(content)
        sections_summary[header] = " ".join(sents[:2])[:500] if sents else content[:500]

    return sections_summary, cleaned_raw


def normalize_section_lookup(sections_raw: Dict[str, str]) -> Dict[str, str]:
    mapped = {}
    for key, value in sections_raw.items():
        kl = key.lower()
        if "intro" in kl:
            mapped["Introduction"] = value
        elif "method" in kl:
            mapped["Methodology"] = value
        elif "conclusion" in kl:
            mapped["Conclusion"] = value
    return mapped


def check_section_completeness(sections_raw: Dict[str, str]) -> Dict[str, Dict[str, str]]:
    results = {}
    mapped = normalize_section_lookup(sections_raw)

    for section, criteria in SECTION_CHECKLIST.items():
        text = mapped.get(section, "").lower()
        results[section] = {}
        for criterion, keywords in criteria.items():
            count = sum(1 for kw in keywords if kw in text)
            if count >= 2:
                results[section][criterion] = "Present"
            elif count == 1:
                results[section][criterion] = "Weak"
            else:
                results[section][criterion] = "Missing"

    return results


def find_long_sentences(text: str, threshold: int = 30) -> List[Dict[str, str]]:
    sentences = split_sentences(text)
    results = []

    for sentence in sentences:
        words = extract_words(sentence)
        if len(words) > threshold:
            suggestion = "Consider splitting this sentence into 2 shorter ones."
            match = re.search(
                r"\b(however|therefore|although|because|which|that|and|but)\b",
                sentence,
                re.IGNORECASE,
            )
            if match:
                suggestion = f"Consider splitting around “{match.group(1)}”."

            results.append(
                {
                    "sentence": sentence,
                    "word_count": str(len(words)),
                    "suggestion": suggestion,
                }
            )

    return results[:12]


def find_vocab_suggestions(text: str, sections_raw: Dict[str, str]) -> List[Dict[str, str]]:
    findings = []
    text_lower = text.lower()

    for weak, better in SUGGESTIONS_MAP.items():
        if weak in text_lower:
            found_in = []
            for sec_name, sec_text in sections_raw.items():
                if weak in sec_text.lower():
                    found_in.append(sec_name)

            findings.append(
                {
                    "weak": weak,
                    "better": better,
                    "location": ", ".join(found_in) if found_in else "Document",
                }
            )

    unique = []
    seen = set()
    for item in findings:
        key = (item["weak"], item["better"], item["location"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique[:20]


def analyze_sentiment(text: str) -> Dict[str, float]:
    words = [w.lower() for w in extract_words(text)]
    if not words:
        return {"polarity": 0.0, "label": "Neutral"}

    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    total = len(words)

    polarity = round((pos - neg) / max(total, 1) * 10, 2)

    if polarity > 0.15:
        label = "Positive"
    elif polarity < -0.15:
        label = "Negative"
    else:
        label = "Neutral"

    return {"polarity": polarity, "label": label}


def build_score_trends(scores: Dict[str, float]) -> List[Dict[str, float]]:
    order = ["Language", "Coherence", "Reasoning", "Sophistication", "Readability", "Composite"]
    return [{"metric": key, "value": scores[key]} for key in order]


def build_keyword_frequency(text: str, top_n: int = 8) -> List[Dict[str, int]]:
    stop_words = {
        "this",
        "that",
        "with",
        "from",
        "have",
        "your",
        "will",
        "were",
        "been",
        "about",
        "their",
        "which",
        "there",
        "would",
        "could",
        "should",
        "while",
        "paper",
        "document",
        "using",
        "used",
        "into",
        "than",
        "then",
        "them",
        "they",
        "also",
        "such",
        "through",
        "where",
        "when",
        "what",
        "who",
        "why",
        "how",
        "and",
        "the",
        "for",
        "are",
        "was",
        "you",
        "its",
        "profile",
        "professional",
        "experience",
        "results",
        "method",
        "methods",
        "study",
        "research",
        "analysis",
        "based",
    }

    words = [
        word.lower()
        for word in extract_words(text)
        if len(word) > 4 and word.lower() not in stop_words
    ]
    freq = Counter(words)
    return [{"keyword": word, "count": count} for word, count in freq.most_common(top_n)]


def detect_research_gaps(sections_raw: Dict[str, str], full_text: str) -> List[str]:
    gaps: List[str] = []

    mapped = normalize_section_lookup(sections_raw)

    intro_text = mapped.get("Introduction", "").lower()
    method_text = mapped.get("Methodology", "").lower()
    conclusion_text = mapped.get("Conclusion", "").lower()
    full_text_lower = full_text.lower()

    dataset_keywords = ["dataset", "data collected", "benchmark", "corpus", "samples", "training data"]
    metric_keywords = ["accuracy", "precision", "recall", "f1", "auc", "evaluation", "metric"]
    baseline_keywords = [
        "baseline",
        "compared with",
        "comparison",
        "state-of-the-art",
        "existing methods",
        "prior work",
        "versus",
        "outperforms",
    ]
    limitation_keywords = [
        "limitation",
        "limitations",
        "future work",
        "future scope",
        "can be improved",
        "further work",
        "next step",
    ]
    real_world_keywords = ["real-world", "practical", "deployment", "industry", "production", "applied setting"]
    sample_size_keywords = ["sample size", "participants", "subjects", "observations", "instances"]

    if not any(keyword in method_text for keyword in dataset_keywords):
        gaps.append("Limited or missing dataset description.")

    if not any(keyword in method_text or keyword in full_text_lower for keyword in metric_keywords):
        gaps.append("Evaluation metrics are weak or not clearly described.")

    if not any(keyword in full_text_lower for keyword in baseline_keywords):
        gaps.append("No strong baseline or comparison terms detected.")

    if not any(keyword in conclusion_text or keyword in full_text_lower for keyword in limitation_keywords):
        gaps.append("Future work or limitations are not clearly discussed.")

    if not any(keyword in full_text_lower for keyword in real_world_keywords):
        gaps.append("Real-world applicability or deployment context is not clearly mentioned.")

    if not any(keyword in full_text_lower for keyword in sample_size_keywords):
        gaps.append("Sample size or scale of experimentation is not clearly stated.")

    if "novel" not in intro_text and "contribution" not in intro_text and "propose" not in intro_text:
        gaps.append("Core contribution is not strongly framed in the introduction.")

    unique_gaps = []
    seen = set()
    for gap in gaps:
        if gap not in seen:
            seen.add(gap)
            unique_gaps.append(gap)

    return unique_gaps[:6]


def analyze_document(text: str) -> Dict:
    sentences = split_sentences(text)
    words = extract_words(text)

    if not sentences or not words:
        raise ValueError("Not enough text to analyze.")

    word_count = len(words)
    sentence_count = len(sentences)

    avg_sentence_len = round(word_count / sentence_count, 2)
    avg_word_len = round(sum(len(w) for w in words) / word_count, 2)

    vocab_diversity = round(len(set(w.lower() for w in words)) / word_count, 2)
    complex_words = [w for w in words if len(w) > 6]
    complex_word_ratio = round(len(complex_words) / word_count, 2)

    readability = round(flesch_reading_ease(text), 2)

    transition_words = [
        "however",
        "therefore",
        "thus",
        "consequently",
        "furthermore",
        "moreover",
        "meanwhile",
        "additionally",
        "nevertheless",
    ]
    transition_count = sum(text.lower().count(t) for t in transition_words)

    reasoning_words = [
        "because",
        "since",
        "implies",
        "therefore",
        "due to",
        "as a result",
        "evidence",
        "hence",
        "suggests",
        "indicates",
    ]
    reasoning_count = sum(text.lower().count(w) for w in reasoning_words)

    language_score = min(100, round((avg_sentence_len * 1.5) + (avg_word_len * 5) + 35, 2))
    coherence_score = min(100, round((transition_count * 5) + (sentence_count * 0.15) + 30, 2))
    reasoning_score = min(100, round((reasoning_count * 7) + 28, 2))
    sophistication_score = min(100, round(complex_word_ratio * 300, 2))

    composite = round(
        (language_score * 0.28)
        + (coherence_score * 0.20)
        + (reasoning_score * 0.20)
        + (sophistication_score * 0.17)
        + (readability * 0.15),
        2,
    )

    scores = {
        "Language": language_score,
        "Coherence": coherence_score,
        "Reasoning": reasoning_score,
        "Sophistication": sophistication_score,
        "Readability": readability,
        "Composite": composite,
    }

    sections, sections_raw = extract_sections(text)
    completeness = check_section_completeness(sections_raw)
    long_sentences = find_long_sentences(text)
    vocab_suggestions = find_vocab_suggestions(text, sections_raw)
    sentiment = analyze_sentiment(text)
    score_trends = build_score_trends(scores)
    keyword_frequency = build_keyword_frequency(text)
    research_gaps = detect_research_gaps(sections_raw, text)

    return {
        "scores": scores,
        "stats": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_sentence_len": avg_sentence_len,
            "avg_word_len": avg_word_len,
            "vocab_diversity":