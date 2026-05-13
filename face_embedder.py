from __future__ import annotations

import os
from typing import Any, Dict, Optional

import numpy as np

_df_model: Optional[Any] = None
_df_model_name: Optional[str] = None


def _to_uint8_image(arr: np.ndarray) -> np.ndarray:
    x = np.asarray(arr)
    if x.dtype != np.uint8:
        # assume 0..255 float or 0..1 float; clip defensively
        x = np.clip(x, 0, 255).astype(np.uint8)
    return x


def _rgb_to_bgr_uint8(arr_rgb: np.ndarray) -> np.ndarray:
    x = _to_uint8_image(arr_rgb)
    if x.ndim != 3 or x.shape[2] != 3:
        raise ValueError("Ảnh phải có shape (H,W,3)")
    return x[:, :, ::-1].copy()


def _deepface():
    try:
        from deepface import DeepFace  # type: ignore

        return DeepFace
    except Exception as e:
        raise RuntimeError(
            "Chưa cài deepface. Hãy cài dependency trong backend/requirements.txt (pip install -r backend/requirements.txt)."
        ) from e


def _model_name() -> str:
    return str(os.environ.get("DEEPFACE_MODEL", "Facenet512")).strip() or "Facenet512"


def _build_model():
    global _df_model, _df_model_name
    name = _model_name()
    if _df_model is not None and _df_model_name == name:
        return _df_model
    DeepFace = _deepface()
    _df_model = DeepFace.build_model(name)
    _df_model_name = name
    return _df_model


def embedding_from_face_rgb(face_rgb: np.ndarray) -> np.ndarray:
    """
    Nhận ảnh mặt RGB uint8/float, trả embedding float32 đã normalize.
    Dùng DeepFace (model_name=DEEPFACE_MODEL, mặc định Facenet512), detector_backend='skip'
    vì mặt đã được detect+crop từ trước.
    """
    if face_rgb is None or getattr(face_rgb, "size", 0) == 0:
        raise ValueError("face_rgb rỗng")

    DeepFace = _deepface()
    # DeepFace/detector thường dùng OpenCV nên ổn định hơn với BGR
    face_bgr = _rgb_to_bgr_uint8(face_rgb)

    reps = DeepFace.represent(
        img_path=face_bgr,
        model_name=_model_name(),
        detector_backend="skip",
        enforce_detection=False,
        align=False,
    )
    if not reps:
        raise ValueError("DeepFace.represent không trả về embedding")

    rep0: Dict[str, Any] = reps[0] if isinstance(reps, list) else reps
    emb = rep0.get("embedding")
    if emb is None:
        raise ValueError("DeepFace output thiếu key embedding")

    emb = np.asarray(emb, dtype=np.float32).reshape(-1)
    n = float(np.linalg.norm(emb) + 1e-12)
    return (emb / n).astype(np.float32)


def embedding_from_image_rgb(image_rgb: np.ndarray) -> np.ndarray:
    """
    Nhận ảnh RGB bất kỳ (chưa crop), DeepFace sẽ tự detect mặt để tạo embedding.
    Dùng khi Haar detect/crop không ra mặt (đăng ký).
    """
    if image_rgb is None or getattr(image_rgb, "size", 0) == 0:
        raise ValueError("image_rgb rỗng")

    DeepFace = _deepface()
    preferred = str(os.environ.get("DEEPFACE_DETECTOR", "opencv")).strip() or "opencv"
    detectors = [preferred]
    for d in ("opencv", "retinaface"):
        if d not in detectors:
            detectors.append(d)

    img_bgr = _rgb_to_bgr_uint8(image_rgb)
    last_err: Optional[Exception] = None
    for detector in detectors:
        try:
            reps = DeepFace.represent(
                img_path=img_bgr,
                model_name=_model_name(),
                detector_backend=detector,
                enforce_detection=False,
                align=True,
            )
            if not reps:
                raise ValueError(f"DeepFace.represent rỗng (detector={detector})")

            rep0: Dict[str, Any] = reps[0] if isinstance(reps, list) else reps
            emb = rep0.get("embedding")
            if emb is None:
                raise ValueError(f"DeepFace output thiếu key embedding (detector={detector})")

            emb = np.asarray(emb, dtype=np.float32).reshape(-1)
            n = float(np.linalg.norm(emb) + 1e-12)
            return (emb / n).astype(np.float32)
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"Không tạo được embedding từ ảnh (DeepFace detect fail). Lỗi cuối: {last_err}") from last_err

