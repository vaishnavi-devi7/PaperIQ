import os
import re
from collections import Counter
from typing import Dict, List, Tuple
from io import BytesIO

import pdfplumber
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from huggingface_hub import InferenceClient
from sqlalchemy.orm import Session

from app.db.database import Base, engine, SessionLocal
from app.models.history import PaperHistory, ChatHistory
from app.routes.auth import router as auth_router

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
    "effective", "improved", "success", "strong", "efficient", "robust", "beneficial",
    "significant", "accurate", "novel", "advantage", "better", "reliable", "positive",
    "promising", "valuable", "useful", "clear", "efficiently", "improvement"
}

NEGATIVE_WORDS = {
    "limited", "problem", "issue", "weak", "difficult", "challenge", "poor",
    "negative", "error", "risk", "unclear", "lack", "fails", "failure",
    "constraint", "limitations", "limitation", "hard", "bias", "complex"
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
        "this", "that", "with", "from", "have", "your", "will", "were", "been",
        "about", "their", "which", "there", "would", "could", "should", "while",
        "paper", "document", "using", "used", "into", "than", "then", "them",
        "they", "also", "such", "through", "where", "when", "what", "who",
        "why", "how", "and", "the", "for", "are", "was", "you", "its", "profile",
        "professional", "experience", "results", "method", "methods", "study",
        "research", "analysis", "based", "between", "after", "before", "being",
        "been", "into", "our", "we", "can", "may", "not", "has", "had", "does",
        "did", "these", "those", "over", "under", "more", "most", "some"
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
        "abstract", "introduction", "literature review", "methodology",
        "methods", "results", "discussion", "conclusion", "references"
    }

    for line in lines:
        is_numbered_header = bool(re.match(r"^\d+(\.\d+)*\s+[A-Za-z].{0,60}$", line))
        is_plain_header = (
            line.lower() in common_headers
            or (line.isupper() and 3 < len(line) < 50)
        )

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
            match = re.search(r"\b(however|therefore|although|because|which|that|and|but)\b", sentence, re.IGNORECASE)
            if match:
                suggestion = f"Consider splitting around “{match.group(1)}”."

            results.append({
                "sentence": sentence,
                "word_count": str(len(words)),
                "suggestion": suggestion,
            })

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

            findings.append({
                "weak": weak,
                "better": better,
                "location": ", ".join(found_in) if found_in else "Document"
            })

    unique = []
    seen = set()
    for item in findings:
        key = (item["weak"], item["better"], item["location"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique[:20]


def find_relevant_sentences(question: str, text: str, max_results: int = 4) -> List[str]:
    question_words = {w.lower() for w in extract_words(question) if len(w) > 2}
    if not question_words:
        return []

    sentence_scores = []
    for sentence in split_sentences(text):
        sent_words = {w.lower() for w in extract_words(sentence)}
        overlap = len(question_words & sent_words)
        if overlap > 0:
            sentence_scores.append((overlap, sentence))

    sentence_scores.sort(key=lambda x: x[0], reverse=True)

    unique_sentences = []
    seen = set()
    for _, sentence in sentence_scores:
        if sentence not in seen:
            seen.add(sentence)
            unique_sentences.append(sentence)
        if len(unique_sentences) >= max_results:
            break

    return unique_sentences


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
        "this", "that", "with", "from", "have", "your", "will", "were", "been",
        "about", "their", "which", "there", "would", "could", "should", "while",
        "paper", "document", "using", "used", "into", "than", "then", "them",
        "they", "also", "such", "through", "where", "when", "what", "who",
        "why", "how", "and", "the", "for", "are", "was", "you", "its", "profile",
        "professional", "experience", "results", "method", "methods", "study",
        "research", "analysis", "based"
    }

    words = [
        word.lower()
        for word in extract_words(text)
        if len(word) > 4 and word.lower() not in stop_words
    ]
    freq = Counter(words)
    return [{"keyword": word, "count": count} for word, count in freq.most_common(top_n)]


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
        "however", "therefore", "thus", "consequently", "furthermore",
        "moreover", "meanwhile", "additionally", "nevertheless"
    ]
    transition_count = sum(text.lower().count(t) for t in transition_words)

    reasoning_words = [
        "because", "since", "implies", "therefore", "due to",
        "as a result", "evidence", "hence", "suggests", "indicates"
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
        2
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

    return {
        "scores": scores,
        "stats": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_sentence_len": avg_sentence_len,
            "avg_word_len": avg_word_len,
            "vocab_diversity": vocab_diversity,
            "complex_word_ratio": complex_word_ratio,
        },
        "sections": sections,
        "sections_raw": sections_raw,
        "completeness": completeness,
        "long_sentences": long_sentences,
        "vocab_suggestions": vocab_suggestions,
        "sentiment": sentiment,
        "score_trends": score_trends,
        "keyword_frequency": keyword_frequency,
    }


def local_skills_answer(text: str) -> str:
    skill_keywords = [
        "python", "java", "javascript", "typescript", "react", "next.js", "nextjs",
        "fastapi", "sql", "mysql", "postgresql", "machine learning", "data science",
        "html", "css", "tailwind", "streamlit", "full stack", "ai", "nlp", "git",
        "github", "aws", "ec2", "s3", "docker", "linux"
    ]

    text_lower = text.lower()
    found_skills = [skill for skill in skill_keywords if skill in text_lower]

    if found_skills:
        pretty = ", ".join(dict.fromkeys(found_skills))
        return f"Skills found: {pretty}"

    return "No predefined skills were clearly detected in the document."


def local_internship_answer(text: str) -> str:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    internship_lines = []

    for line in lines:
        lower = line.lower()
        if "intern" in lower or "internship" in lower:
            internship_lines.append(line)

    internship_lines = list(dict.fromkeys(internship_lines))

    if internship_lines:
        return "Internships found:\n- " + "\n- ".join(internship_lines[:8])

    return "No internship information was clearly found in the document."


def local_email_answer(text: str) -> str:
    emails = re.findall(r"[\w\.-]+@[\w\.-]+", text)
    unique_emails = list(dict.fromkeys(emails))

    if unique_emails:
        return "Emails found: " + ", ".join(unique_emails)

    return "No email found in the document."


def local_answer(question: str, text: str) -> str:
    q = question.lower().strip()

    if "summary" in q or "summarize" in q:
        return extract_summary(text)

    if "title" in q or "name of the document" in q:
        return extract_title(text)

    if "keyword" in q:
        keywords = extract_keywords(text)
        return "Top keywords: " + ", ".join(keywords) if keywords else "No strong keywords detected."

    if "email" in q:
        return local_email_answer(text)

    if "skill" in q:
        return local_skills_answer(text)

    if "intern" in q:
        return local_internship_answer(text)

    return ""


def ask_huggingface(question: str, text: str) -> str:
    if not HF_API_KEY:
        return "HF_API_KEY missing in backend/.env"

    client = InferenceClient(
        provider="auto",
        api_key=HF_API_KEY,
        timeout=60,
    )

    relevant_sentences = find_relevant_sentences(question, text, max_results=5)
    compact_context = "\n".join(f"- {s}" for s in relevant_sentences) if relevant_sentences else text[:3000]

    system_prompt = (
        "You are a smart academic document assistant. "
        "Answer clearly, concisely, and only from the provided document context. "
        "Do not repeat the entire document. "
        "Prefer short bullet points when useful. "
        "If the answer is not clearly present, say that honestly."
    )

    user_prompt = (
        f"QUESTION:\n{question}\n\n"
        f"RELEVANT DOCUMENT CONTEXT:\n{compact_context}\n\n"
        f"ANSWER:"
    )

    completion = client.chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=220,
        temperature=0.25,
    )

    answer = completion.choices[0].message.content.strip()
    return answer if answer else "AI couldn't understand. Try rephrasing."


def safe_pdf_text(text: str) -> str:
    return text.encode("latin-1", "replace").decode("latin-1")


def create_pdf_report(filename: str, text: str) -> bytes:
    analytics = analyze_document(text)
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, safe_pdf_text("PaperIQ Analysis Report"), ln=True)

    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 8, safe_pdf_text(f"Document: {filename}"), ln=True)
    pdf.ln(4)

    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Scores"), ln=True)
    pdf.set_font("Arial", "", 11)
    for key, value in analytics["scores"].items():
        pdf.cell(0, 7, safe_pdf_text(f"{key}: {value}"), ln=True)

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Statistics"), ln=True)
    pdf.set_font("Arial", "", 11)
    for key, value in analytics["stats"].items():
        label = key.replace("_", " ").title()
        pdf.cell(0, 7, safe_pdf_text(f"{label}: {value}"), ln=True)

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Summary"), ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, safe_pdf_text(extract_summary(text)))

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Keywords"), ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 7, safe_pdf_text(", ".join(extract_keywords(text, top_n=12))))

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Section Summaries"), ln=True)
    for section_title, section_summary in analytics["sections"].items():
        pdf.set_font("Arial", "B", 11)
        pdf.multi_cell(0, 7, safe_pdf_text(section_title))
        pdf.set_font("Arial", "", 11)
        pdf.multi_cell(0, 7, safe_pdf_text(section_summary))
        pdf.ln(1)

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Long Sentence Issues"), ln=True)
    pdf.set_font("Arial", "", 11)
    if analytics["long_sentences"]:
        for item in analytics["long_sentences"][:6]:
            pdf.multi_cell(0, 7, safe_pdf_text(f"- {item['sentence']}"))
            pdf.multi_cell(0, 7, safe_pdf_text(f"  Suggestion: {item['suggestion']}"))
            pdf.ln(1)
    else:
        pdf.cell(0, 7, safe_pdf_text("No long sentence issues found."), ln=True)

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Vocabulary Suggestions"), ln=True)
    pdf.set_font("Arial", "", 11)
    if analytics["vocab_suggestions"]:
        for item in analytics["vocab_suggestions"][:10]:
            pdf.cell(
                0,
                7,
                safe_pdf_text(
                    f"- Replace '{item['weak']}' with '{item['better']}' (Location: {item['location']})"
                ),
                ln=True,
            )
    else:
        pdf.cell(0, 7, safe_pdf_text("No weak vocabulary flagged."), ln=True)

    pdf.ln(3)
    pdf.set_font("Arial", "B", 13)
    pdf.cell(0, 8, safe_pdf_text("Section Completeness"), ln=True)
    pdf.set_font("Arial", "", 11)
    for section_name, criteria in analytics["completeness"].items():
        pdf.cell(0, 7, safe_pdf_text(section_name), ln=True)
        for criterion, status in criteria.items():
            pdf.cell(0, 7, safe_pdf_text(f"  - {criterion}: {status}"), ln=True)

    raw = pdf.output(dest="S")
    if isinstance(raw, str):
        return raw.encode("latin-1")
    return bytes(raw)


def extract_text_from_pdf_file(file: UploadFile) -> str:
    text = ""
    with pdfplumber.open(file.file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def build_keyword_matrix(multi_results: List[Dict], top_n: int = 20):
    kw_data = {}
    for result in multi_results:
        kw_data[result["filename"]] = set(extract_keywords(result["text"], top_n=top_n))

    all_keywords = set()
    for values in kw_data.values():
        all_keywords |= values

    matrix_rows = []
    for keyword in sorted(all_keywords):
        presence = {filename: (keyword in kws) for filename, kws in kw_data.items()}
        matrix_rows.append({"keyword": keyword, "presence": presence})

    return matrix_rows


def literature_summary(multi_results: List[Dict], top_n: int = 20):
    kw_data = {}
    for result in multi_results:
        kw_data[result["filename"]] = set(extract_keywords(result["text"], top_n=top_n))

    common = set.intersection(*kw_data.values()) if kw_data else set()
    unique = {filename: sorted(list(keywords - common))[:8] for filename, keywords in kw_data.items()}

    return {
        "shared_topics": sorted(list(common)),
        "unique_topics": unique,
    }


@app.get("/")
def root():
    return {"message": "PaperIQ backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    global stored_text, stored_filename

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        text = extract_text_from_pdf_file(file)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        stored_text = text[:10000]
        stored_filename = file.filename

        title = extract_title(stored_text)
        summary = extract_summary(stored_text)
        keywords = extract_keywords(stored_text)
        analytics = analyze_document(stored_text)

        paper = PaperHistory(
            filename=file.filename,
            content=stored_text,
            title=title,
            summary=summary,
        )
        db.add(paper)
        db.commit()

        return {
            "message": "File processed successfully 🎉",
            "filename": file.filename,
            "preview": stored_text[:2500],
            "title": title,
            "summary": summary,
            "keywords": keywords,
            "scores": analytics["scores"],
            "stats": analytics["stats"],
            "sections": analytics["sections"],
            "completeness": analytics["completeness"],
            "long_sentences": analytics["long_sentences"],
            "vocab_suggestions": analytics["vocab_suggestions"],
            "sentiment": analytics["sentiment"],
            "score_trends": analytics["score_trends"],
            "keyword_frequency": analytics["keyword_frequency"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
async def compare_documents(files: List[UploadFile] = File(...)):
    try:
        if len(files) < 2:
            raise HTTPException(status_code=400, detail="Upload at least 2 PDF files.")
        if len(files) > 3:
            raise HTTPException(status_code=400, detail="Upload at most 3 PDF files.")

        multi_results = []

        for file in files:
            if not file.filename or not file.filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

            text = extract_text_from_pdf_file(file)
            if not text.strip():
                continue

            trimmed_text = text[:10000]
            analytics = analyze_document(trimmed_text)

            multi_results.append({
                "filename": file.filename,
                "text": trimmed_text,
                "scores": analytics["scores"],
                "stats": analytics["stats"],
                "keywords": extract_keywords(trimmed_text, top_n=10),
                "summary": extract_summary(trimmed_text),
            })

        if len(multi_results) < 2:
            raise HTTPException(status_code=400, detail="Could not analyze enough valid PDF files.")

        return {
            "documents": multi_results,
            "literature_map": literature_summary(multi_results, top_n=20),
            "keyword_matrix": build_keyword_matrix(multi_results, top_n=15),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask")
async def ask(data: dict, db: Session = Depends(get_db)):
    global stored_text

    try:
        question = data.get("question", "").strip()

        if not question:
            raise HTTPException(status_code=400, detail="Question is required")

        if not stored_text:
            raise HTTPException(status_code=400, detail="No document uploaded yet")

        fallback = local_answer(question, stored_text)
        if fallback:
            answer = fallback
        else:
            try:
                answer = ask_huggingface(question, stored_text)
            except Exception as e:
                answer = f"AI temporarily unavailable. {str(e)}"

        chat = ChatHistory(question=question, answer=answer)
        db.add(chat)
        db.commit()

        return {"answer": answer}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
def get_history(db: Session = Depends(get_db), limit: int = 20):
    chats = (
        db.query(ChatHistory)
        .order_by(ChatHistory.id.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": chat.id,
            "question": chat.question,
            "answer": chat.answer
        }
        for chat in chats
    ]


@app.get("/report")
def download_report():
    global stored_text, stored_filename

    if not stored_text:
        raise HTTPException(status_code=400, detail="No document uploaded yet")

    pdf_bytes = create_pdf_report(stored_filename, stored_text)
    filename = stored_filename.rsplit(".", 1)[0] + "_PaperIQ_Report.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )