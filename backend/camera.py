"""
OpenCV: phát hiện khuôn mặt (Haar Cascade), crop trong RAM, resize.
Không lưu file — trừ khi tầng trên (Flask) chủ động lưu dataset.
"""
from __future__ import annotations

import os
from typing import List, Optional, Tuple

import cv2
import numpy as np

from utils import IMG_SIZE, bgr_to_rgb, resize_rgb

# Đường dẫn cascade chuẩn của OpenCV
_CASCADE_PATH = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")


def _classifier() -> cv2.CascadeClassifier:
    clf = cv2.CascadeClassifier(_CASCADE_PATH)
    if clf.empty():
        raise RuntimeError("Không load được Haar cascade. Kiểm tra cài đặt opencv-python.")
    return clf


_clf: Optional[cv2.CascadeClassifier] = None


def get_classifier() -> cv2.CascadeClassifier:
    global _clf
    if _clf is None:
        _clf = _classifier()
    return _clf


def detect_faces_bgr(
    frame_bgr: np.ndarray,
    scale_factor: float = 1.1,
    min_neighbors: int = 5,
    min_size: Tuple[int, int] = (48, 48),
) -> List[Tuple[int, int, int, int]]:
    """
    Trả về danh sách (x, y, w, h) theo tọa độ ảnh gốc.
    """
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = get_classifier().detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size,
    )
    return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]


def largest_face_roi(faces: List[Tuple[int, int, int, int]]) -> Optional[Tuple[int, int, int, int]]:
    if not faces:
        return None
    return max(faces, key=lambda r: r[2] * r[3])


def crop_face_bgr(frame_bgr: np.ndarray, roi: Tuple[int, int, int, int], pad_ratio: float = 0.12) -> np.ndarray:
    h, w = frame_bgr.shape[:2]
    x, y, rw, rh = roi
    pad_x = int(rw * pad_ratio)
    pad_y = int(rh * pad_ratio)
    x0 = max(0, x - pad_x)
    y0 = max(0, y - pad_y)
    x1 = min(w, x + rw + pad_x)
    y1 = min(h, y + rh + pad_y)
    return frame_bgr[y0:y1, x0:x1].copy()


def extract_face_rgb_from_bgr(
    frame_bgr: np.ndarray,
) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
    """
    Phát hiện mặt lớn nhất, crop, resize về IMG_SIZE (RGB).
    Trả về (face_rgb hoặc None, roi hoặc None).
    """
    faces = detect_faces_bgr(frame_bgr)
    roi = largest_face_roi(faces)
    if roi is None:
        return None, None
    crop_bgr = crop_face_bgr(frame_bgr, roi)
    if crop_bgr.size == 0:
        return None, roi
    crop_rgb = bgr_to_rgb(crop_bgr)
    face_rgb = resize_rgb(crop_rgb, IMG_SIZE)
    return face_rgb, roi


def extract_face_rgb_from_rgb(frame_rgb: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
    """Tiện ích khi đầu vào đã là RGB (ví dụ từ browser)."""
    frame_bgr = frame_rgb[:, :, ::-1].copy()
    return extract_face_rgb_from_bgr(frame_bgr)


def open_capture(device_id: int = 0) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(device_id)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được camera index={device_id}")
    return cap


def read_frame_rgb(cap: cv2.VideoCapture) -> Optional[np.ndarray]:
    ok, frame_bgr = cap.read()
    if not ok or frame_bgr is None:
        return None
    return bgr_to_rgb(frame_bgr)
