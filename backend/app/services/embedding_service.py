from __future__ import annotations

from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

_MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def get_embeddings(text_chunks: List[str]) -> np.ndarray:
    if not text_chunks:
        return np.array([], dtype="float32")

    embeddings = _MODEL.encode(
        text_chunks,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embeddings.astype("float32")