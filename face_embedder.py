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


