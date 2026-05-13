from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import cv2
import numpy as np

from face_embedder import embedding_from_face_rgb
from utils import data_dir
from yolo_detector import FaceDetection

_FACE_SIZE = (160, 160)
_emb_cache: Optional[Dict[str, Any]] = None
_log = logging.getLogger("mnm")


def reset_embeddings_cache() -> None:
    global _emb_cache
    _emb_cache = None


def load_embeddings_db(data_root: Optional[Path] = None) -> Dict[str, Any]:
    """
    Gộp tất cả data/<MSSV>/embeddings.npz thành một DB trong RAM (chuẩn hóa cosine).
    Không còn dùng một file data/embeddings.npz chung.
    """
    global _emb_cache
    if _emb_cache is not None:
        return _emb_cache
    root = Path(data_root) if data_root is not None else data_dir()
    paths = sorted(root.glob("*/embeddings.npz"))
    if not paths:
        raise FileNotFoundError(
            "Chưa có embeddings. Hãy Train để tạo data/<MSSV>/embeddings.npz cho từng sinh viên."
        )
    emb_chunks: List[np.ndarray] = []
    lab_chunks: List[np.ndarray] = []
    nam_chunks: List[np.ndarray] = []
    for p in paths:
        try:
            data = np.load(str(p), allow_pickle=True)
            emb = np.asarray(data["embeddings"], dtype=np.float32)
            labels = np.asarray(data["labels"], dtype=object)
            names = np.asarray(data["names"], dtype=object) if "names" in data.files else np.asarray([], dtype=object)
        except Exception as ex:
            _log.warning("[RECOGNITION] Skip bad npz %s: %s", p, ex)
            continue
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)
        if emb.shape[0] == 0:
            continue
        n = int(emb.shape[0])
        if labels.size < n:
            _log.warning("[RECOGNITION] Skip %s: labels length mismatch", p)
            continue
        if names.size != 0 and names.size < n:
            _log.warning("[RECOGNITION] Skip %s: names length mismatch", p)
            continue
        emb_chunks.append(emb)
        lab_chunks.append(labels.reshape(-1)[:n])
        if names.size >= n:
            nam_chunks.append(names.reshape(-1)[:n])
        else:
            nam_chunks.append(np.asarray([""] * n, dtype=object))

    if not emb_chunks:
        raise ValueError("Không đọc được embeddings hợp lệ từ data/*/embeddings.npz.")

    emb = np.vstack(emb_chunks)
    labels = np.concatenate(lab_chunks)
    names = np.concatenate(nam_chunks) if nam_chunks else np.asarray([], dtype=object)
    if emb.ndim != 2 or emb.shape[0] == 0:
        raise ValueError("embeddings gộp rỗng.")
    emb = emb / (np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12)
    _emb_cache = {"embeddings": emb, "labels": labels, "names": names, "sources": [str(x) for x in paths]}
    return _emb_cache


def _best_match_one_embedding(
    emb: np.ndarray,
    embeddings_db: np.ndarray,
    labels: np.ndarray,
    names: np.ndarray,
) -> Dict[str, Any]:
    # Embedding đầu vào cũng chuẩn hóa để dot() là cosine similarity.
    emb = np.asarray(emb, dtype=np.float32).reshape(-1)
    emb = emb / (np.linalg.norm(emb) + 1e-12)
    print(f"Input emb norm: {np.linalg.norm(emb):.6f}", flush=True)

    best_score = -1.0
    best_idx = -1
    scores: List[tuple[int, float]] = []
    for i in range(int(embeddings_db.shape[0])):
        score = float(np.dot(emb, embeddings_db[i]))
        scores.append((i, score))
        if score > best_score:
            best_score = score
            best_idx = i

    scores.sort(key=lambda x: x[1], reverse=True)
    print("Top 3 similarity:", flush=True)
    top_n = min(3, len(scores))
    for i in range(top_n):
        idx, sc = scores[i]
        mssv = str(labels[idx]) if idx < len(labels) else "?"
        print(f"#{i+1}: MSSV={mssv} | score={sc:.4f}", flush=True)

    if best_idx < 0:
        return {"matched": False, "best_score": -1.0}

    best_label = str(labels[best_idx]) if best_idx < len(labels) else ""
    full_name = str(names[best_idx]) if (names is not None and best_idx < len(names)) else None
    return {
        "matched": True,
        "best_idx": best_idx,
        "best_score": float(best_score),
        "student_code": str(best_label),
        "full_name": full_name,
    }


def recognize_faces_in_frame(
    *,
    frame_rgb: np.ndarray,
    detections: List[FaceDetection],
    embeddings_db: np.ndarray,
    labels: np.ndarray,
    names: np.ndarray,
    fetch_student_by_code: Callable[[str], Optional[Dict[str, Any]]],
    max_faces: int = 3,
