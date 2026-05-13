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


def _get_haar_classifier() -> cv2.CascadeClassifier:
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    clf = cv2.CascadeClassifier(cascade_path)
    if clf.empty():
        raise RuntimeError("Không load được Haar cascade. Kiểm tra cài đặt opencv-python.")
    return clf


_clf: Optional[cv2.CascadeClassifier] = None


def _classifier() -> cv2.CascadeClassifier:
    global _clf
    if _clf is None:
        _clf = _get_haar_classifier()
    return _clf


_embed_model: Optional[tf.keras.Model] = None


def _embedding_model() -> None:
    """
    Deprecated: train dùng DeepFace (embedding_from_face_rgb) để đồng bộ register/train/predict.
    Giữ hàm để tương thích import cũ nếu có.
    """
    return None


def _iter_image_paths(folder: Path) -> List[Path]:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    out: List[Path] = []
    if not folder.is_dir():
        return out
    for p in folder.iterdir():
        if p.is_file() and p.suffix.lower() in exts:
            out.append(p)
    return sorted(out)


def _detect_and_crop_face_bgr(img_bgr: np.ndarray) -> Optional[np.ndarray]:
    if img_bgr is None or img_bgr.size == 0:
        return None
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = _classifier().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    if faces is None or len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda r: int(r[2]) * int(r[3]))
    x, y, w, h = int(x), int(y), int(w), int(h)
    if w <= 0 or h <= 0:
        return None
    h_img, w_img = img_bgr.shape[:2]
    x0 = max(0, x)
    y0 = max(0, y)
    x1 = min(w_img, x + w)
    y1 = min(h_img, y + h)
    crop = img_bgr[y0:y1, x0:x1].copy()
    if crop.size == 0:
        return None
    return crop


def train_from_directory(
    epochs: int = 25,
    batch_size: int = 16,
    validation_split: float = 0.15,
    seed: int = 42,
    data_root: Optional[Path] = None,
    allowed_student_codes: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    """
    Đọc ảnh từ data/<MSSV_Ten>/, detect + crop mặt, tạo embedding và lưu data/<MSSV>/embeddings.npz.
    Các tham số epochs/batch_size/validation_split/seed giữ để tương thích API hiện tại.
    """
    root = Path(data_root) if data_root else data_dir()
    if _count_student_folders(root) < 1:
        raise ValueError(
            "Cần ít nhất một thư mục sinh viên trong data/ (tên MSSV_Ten) và ảnh bên trong."
        )

    unique_students: Set[str] = set()
    saved_npz_paths: List[str] = []

    folders_seen = 0
    folders_used = 0
    images_seen = 0
    images_used = 0
    images_skipped_decode = 0
    images_skipped_no_face = 0

    allowed = set(allowed_student_codes or set())
    for folder in sorted([p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")], key=lambda p: p.name):
        folders_seen += 1
        mssv, name = _parse_student_folder(folder.name)
        if not mssv:
            continue
        if allowed and mssv not in allowed:
            continue

        emb_list: List[np.ndarray] = []
        for img_path in _iter_image_paths(folder):
            images_seen += 1
            try:
                img_bgr = cv2.imread(str(img_path))
            except Exception:
                img_bgr = None
            if img_bgr is None:
                images_skipped_decode += 1
                continue

            face_bgr = _detect_and_crop_face_bgr(img_bgr)
            if face_bgr is None:
                images_skipped_no_face += 1
                continue

            try:
                face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
                face_rgb = cv2.resize(face_rgb, _FACE_SIZE, interpolation=cv2.INTER_AREA)
                emb = embedding_from_face_rgb(face_rgb)
                emb_list.append(emb)
                images_used += 1
            except Exception:
                continue

        if not emb_list:
            continue

        folders_used += 1
        unique_students.add(mssv)
        # Lưu embeddings riêng từng sinh viên: data/<MSSV>/embeddings.npz
        em_arr = np.stack([np.asarray(e, dtype=np.float32) for e in emb_list], axis=0)
        n_rows = int(em_arr.shape[0])
        lab_arr = np.asarray([mssv] * n_rows, dtype=object)
        nam_arr = np.asarray([name] * n_rows, dtype=object)
        out_path = folder / "embeddings.npz"
        np.savez(str(out_path), embeddings=em_arr, labels=lab_arr, names=nam_arr)
        saved_npz_paths.append(str(out_path))

    if not saved_npz_paths:
        raise ValueError("Không có ảnh hợp lệ để train (ảnh lỗi hoặc không detect được mặt).")

    # Xóa file cũ (một file chung) nếu còn sót từ phiên bản trước.
    legacy = root / "embeddings.npz"
    if legacy.is_file():
        try:
            legacy.unlink()
        except Exception:
            pass

    return {
        "ok": True,
        "embeddings_paths": saved_npz_paths,
        "num_students": len(unique_students),
        "folders_seen": folders_seen,
        "folders_used": folders_used,
        "images_seen": images_seen,
        "images_used": images_used,
        "images_skipped_decode": images_skipped_decode,
        "images_skipped_no_face": images_skipped_no_face,
        "message": "Đã tạo embeddings per-student (data/<MSSV>/embeddings.npz).",
    }


def default_train_epochs() -> int:
    return int(os.environ.get("TRAIN_EPOCHS", "30"))


if __name__ == "__main__":
    import argparse
    import json

    p = argparse.ArgumentParser(description="Train CNN từ thư mục data/<MSSV>/")
    p.add_argument("--epochs", type=int, default=default_train_epochs())
    args = p.parse_args()
    out = train_from_directory(epochs=args.epochs)
    print(json.dumps(out, ensure_ascii=False, indent=2))
