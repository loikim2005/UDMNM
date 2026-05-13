"""
Email service cho hệ thống điểm danh.
- Gửi email qua Gmail SMTP (TLS, port 587)
- Đọc cấu hình từ biến môi trường (.env)
- Có chế độ gửi async bằng threading để không block API
"""

from __future__ import annotations

import os
import smtplib
import threading
import logging
from email.mime.text import MIMEText
from typing import Optional

from dotenv import load_dotenv

# Nạp biến môi trường từ file .env (nếu có)
load_dotenv()
_log = logging.getLogger("mnm")


def send_email(to_email: str, mssv: str, name: str, time: str, status: str, gps: str = "Chưa cập nhật") -> bool:
    """
    Gửi email thông báo điểm danh.

    Args:
        to_email: Email người nhận
        mssv: Mã số sinh viên
        name: Tên sinh viên
        time: Thời gian điểm danh (chuỗi đã format)
        status: Trạng thái điểm danh (ví dụ: "Có mặt")
        gps: Tọa độ GPS dạng chuỗi, ví dụ "10.123456, 106.123456"

    Returns:
        True nếu gửi thành công, False nếu lỗi.
    """
    if not to_email:
        return False

    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_email = os.environ.get("SMTP_EMAIL", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
    mail_subject = os.environ.get("ATTENDANCE_MAIL_SUBJECT", "Thông báo điểm danh")

    # Nếu thiếu cấu hình SMTP thì bỏ qua (không làm hỏng API)
    if not smtp_email or not smtp_password:
        _log.warning("[EMAIL] Missing SMTP_EMAIL/SMTP_PASSWORD. Skip sending email.")
        return False

    body = f"""Xin chào sinh viên {name}...

=>  Bạn đã điểm danh thành công
