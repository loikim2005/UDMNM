from __future__ import annotations

import logging
import os
import threading
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import List

import numpy as np

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - handled at runtime
    YOLO = None  # type: ignore

_log = logging.getLogger("mnm")


@dataclass
class FaceDetection:
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float


class YoloFaceDetector:
    def __init__(self, model_path: str, conf_threshold: float = 0.25) -> None:
        if YOLO is None:
            raise RuntimeError("Thiếu ultralytics. Hãy cài dependency `ultralytics`.")
        self.model = YOLO(model_path)
        self.conf_threshold = float(conf_threshold)

    def detect(self, frame_bgr: np.ndarray, max_faces: int = 3) -> List[FaceDetection]:
        if frame_bgr is None or getattr(frame_bgr, "size", 0) == 0:
            return []

        results = self.model.predict(
            source=frame_bgr,
            verbose=False,
            conf=self.conf_threshold,
            max_det=max(int(max_faces), 1),
        )
        if not results:
            return []

        boxes = getattr(results[0], "boxes", None)
        if boxes is None or boxes.xyxy is None:
            return []

        h, w = frame_bgr.shape[:2]
        out: List[FaceDetection] = []
        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy() if boxes.conf is not None else np.zeros((xyxy.shape[0],), dtype=np.float32)
        for i in range(min(xyxy.shape[0], max_faces)):
            x1, y1, x2, y2 = xyxy[i].tolist()
            x1i = max(0, min(w - 1, int(round(x1))))
            y1i = max(0, min(h - 1, int(round(y1))))
            x2i = max(0, min(w - 1, int(round(x2))))
            y2i = max(0, min(h - 1, int(round(y2))))
            if x2i <= x1i or y2i <= y1i:
                continue
            out.append(
                FaceDetection(
                    x1=x1i,
                    y1=y1i,
                    x2=x2i,
                    y2=y2i,
                    confidence=float(confs[i]) if i < len(confs) else 0.0,
                )
            )
        out.sort(key=lambda d: d.confidence, reverse=True)
        return out[: max(int(max_faces), 1)]


_detector_lock = threading.Lock()
_detector: YoloFaceDetector | None = None
_load_attempted = False
_yolo_status = "missing_model"
_yolo_error = ""
_yolo_model_path = ""


def _default_model_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Project root là thư mục mnm (cha của backend).
    return os.path.abspath(os.path.join(base_dir, "..", "yolov8n-face.pt"))


def _model_path_str() -> str:
    env_path = (os.environ.get("YOLO_MODEL_PATH") or "").strip()
    if env_path:
        return os.path.abspath(env_path)
    return _default_model_path()


def _model_name() -> str:
    return Path(_model_path_str()).name or "yolov8n-face.pt"


def _download_model_if_configured(model_path: Path) -> bool:
    """
    Fallback download nếu thiếu file model và có YOLO_MODEL_URL.
    """
    model_url = (os.environ.get("YOLO_MODEL_URL") or "").strip()
    if not model_url:
        return False
    model_path.parent.mkdir(parents=True, exist_ok=True)
    print("[YOLO] Model not found -> fallback triggered", flush=True)
    print("[YOLO] Downloading model...", flush=True)
    _log.warning("[YOLO] Model not found -> fallback triggered")
    _log.info("[YOLO] Downloading model...")
    urllib.request.urlretrieve(model_url, str(model_path))
    return model_path.is_file()


def _resolve_model_file() -> Path:
    model_path_str = _model_path_str()
    model_path = Path(model_path_str)
    if not model_path.is_file():
        _log.error(f"[YOLO] Model not found at {model_path}")
        _log.error(f"[YOLO] Expected model: {_model_name()}")
        downloaded = _download_model_if_configured(model_path)
        if not downloaded:
            raise FileNotFoundError(f"YOLO model not found at {model_path}")
    return model_path


def get_yolo_status() -> dict:
    return {
        "status": _yolo_status,
        "path": _yolo_model_path,
        "model_name": _model_name(),
        "error": _yolo_error,
        "loaded": _detector is not None,
        "attempted": _load_attempted,
    }


def get_yolo_detector() -> YoloFaceDetector:
    global _detector, _load_attempted, _yolo_status, _yolo_error, _yolo_model_path
    if _detector is not None:
        return _detector
    with _detector_lock:
        if _detector is not None:
            return _detector
        _load_attempted = True
        print("[YOLO] Loading model...", flush=True)
        _log.info("[YOLO] Loading model...")
        try:
            model_path = _resolve_model_file()
            _yolo_model_path = str(model_path)
            conf = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
            _detector = YoloFaceDetector(model_path=str(model_path), conf_threshold=conf)
            _yolo_status = "ok"
            _yolo_error = ""
            print("[YOLO] Model loaded successfully", flush=True)
            _log.info("[YOLO] Model loaded successfully")
            return _detector
        except FileNotFoundError as e:
            _yolo_status = "missing_model"
            _yolo_error = str(e)
            _yolo_model_path = _model_path_str()
            print("[YOLO] Model not found", flush=True)
            print("[YOLO] Model not found -> fallback triggered", flush=True)
            _log.error("[YOLO] Model not found")
            _log.error("[YOLO] Model not found -> fallback triggered")
            _log.error(f"[YOLO] Expected model: {_model_name()}")
            _log.error(str(e))
            raise
        except Exception as e:
            _yolo_status = "error"
            _yolo_error = str(e)
            _log.error(f"[YOLO] Load failed: {e}")
            raise

