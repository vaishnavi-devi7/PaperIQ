from __future__ import annotations

from typing import Any, Dict, List

import faiss

from app.services.embedding_service import get_embeddings


class VectorStore:
    def __init__(self) -> None:
        self.index: faiss.IndexFlatIP | None = None
        self.text_chunks: List[str] = []

    def build_index(self, chunks: List[str]) -> None:
        self.text_chunks = chunks

        if not chunks:
            self.index = None
            return

        embeddings = get_embeddings(chunks)
        dimension = embeddings.shape[1]

        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(embeddings)

    def search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        if self.index is None or not self.text_chunks or not query.strip():
            return []

        query_embedding = get_embeddings([query])
        top_k = min(k, len(self.text_chunks))

        scores, indices = self.index.search(query_embedding, top_k)

        results: List[Dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.text_chunks):
                continue
            results.append(
                {
                    "chunk": self.text_chunks[idx],
                    "score": float(score),
                    "index": int(idx),
                }
            )

        return results