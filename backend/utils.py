"""
Tiện ích: giải mã base64, chuẩn hóa ảnh, đường dẫn cấu hình.
"""
from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
from PIL import Image

# Kích thước đầu vào CNN (đồng bộ với model.py / train.py)
IMG_SIZE = int(os.environ.get("FACE_IMG_SIZE", "128"))


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", str(project_root() / "data")))


def models_dir() -> Path:
    return Path(os.environ.get("MODELS_DIR", str(project_root() / "models")))


def model_h5_path() -> Path:
    return models_dir() / "face_cnn.h5"


def label_map_path() -> Path:
    return models_dir() / "label_map.json"


def load_label_map() -> Dict[int, str]:
    p = label_map_path()
    if not p.is_file():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        raw: Dict[str, str] = json.load(f)
    return {int(k): v for k, v in raw.items()}


def save_label_map(index_to_student: Dict[int, str]) -> None:
    models_dir().mkdir(parents=True, exist_ok=True)
    serializable = {str(k): v for k, v in sorted(index_to_student.items())}
    with open(label_map_path(), "w", encoding="utf-8") as f:
        json.dump(serializable, f, ensure_ascii=False, indent=2)


def decode_base64_to_numpy_rgb(data_url_or_b64: str) -> np.ndarray:
    """
    Nhận chuỗi base64 thuần hoặc data URL (data:image/jpeg;base64,...).
    Trả về RGB uint8, shape (H, W, 3).
    """
    s = data_url_or_b64.strip()
    if "," in s and s.lower().startswith("data:"):
        s = s.split(",", 1)[1]
    raw = base64.b64decode(s)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.asarray(img, dtype=np.uint8)


def rgb_to_bgr(arr_rgb: np.ndarray) -> np.ndarray:
    return arr_rgb[:, :, ::-1].copy()


def bgr_to_rgb(arr_bgr: np.ndarray) -> np.ndarray:
    return arr_bgr[:, :, ::-1].copy()


def resize_rgb(arr_rgb: np.ndarray, size: int = IMG_SIZE) -> np.ndarray:
    img = Image.fromarray(arr_rgb)
    img = img.resize((size, size), Image.Resampling.BILINEAR)
    return np.asarray(img, dtype=np.uint8)


def to_model_input_batch(face_rgb: np.ndarray, size: int = IMG_SIZE) -> np.ndarray:
    """(1, size, size, 3) uint8 — model có lớp Rescaling."""
    x = resize_rgb(face_rgb, size)
    return np.expand_dims(x, axis=0)


def safe_json_load(path: Path) -> Optional[Any]:
    if not path.is_file():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def confidence_from_probs(probs: np.ndarray) -> Tuple[int, float]:
    """Trả về (index, confidence 0..1)."""
    idx = int(np.argmax(probs))
    conf = float(np.max(probs))
    return idx, conf
