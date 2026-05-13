"""
Tạo embeddings khuôn mặt từ thư mục data/<MSSV_Ten>/.
Pipeline: Haar Cascade detect -> crop -> resize(160,160) -> embedding.
Mỗi sinh viên lưu riêng: data/<MSSV>/embeddings.npz (không còn file chung data/embeddings.npz).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import cv2
import numpy as np
from utils import data_dir
from face_embedder import embedding_from_face_rgb


def _count_student_folders(root: Path) -> int:
    if not root.is_dir():
        return 0
    n = 0
    for p in root.iterdir():
        if p.is_dir() and not p.name.startswith("."):
            n += 1
    return n


_FACE_SIZE = (160, 160)


def _parse_student_folder(folder_name: str) -> Tuple[str, str]:
    s = (folder_name or "").strip()
    if not s:
        return "", ""
    if "_" in s:
        mssv, rest = s.split("_", 1)
        return mssv.strip(), rest.strip()
    return s, ""


