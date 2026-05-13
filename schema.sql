-- Chạy thủ công nếu cần (Flask cũng tự tạo bảng khi khởi động)
CREATE DATABASE IF NOT EXISTS face_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE face_attendance;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(64) NOT NULL UNIQUE,
  class_name VARCHAR(255) NOT NULL,
  lecturer VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(64) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  class_code VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_db_id INT NULL,
  student_code VARCHAR(64) NULL,
  full_name VARCHAR(255) NULL,
  class_code VARCHAR(64) NULL,
  class_id INT NULL,
  subject_id INT NULL,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confidence DECIMAL(6,3) NULL,
  status VARCHAR(32) NOT NULL,
  latitude DECIMAL(10,6) NULL,
  longitude DECIMAL(10,6) NULL,
  location_text VARCHAR(512) NULL,
  CONSTRAINT fk_att_student FOREIGN KEY (student_db_id) REFERENCES students(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_code VARCHAR(64) NOT NULL UNIQUE,
  subject_name VARCHAR(255) NOT NULL,
  teacher VARCHAR(255) NULL,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS student_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  UNIQUE KEY uq_student_subject (student_id, subject_id),
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_att_subject_date_student ON attendance(subject_id, checked_at, student_db_id);
CREATE INDEX idx_ss_subject_student ON student_subjects(subject_id, student_id);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  enable_email BOOLEAN NOT NULL DEFAULT TRUE,
  gps VARCHAR(64) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO settings (id, enable_email, gps)
VALUES (1, TRUE, NULL)
ON DUPLICATE KEY UPDATE id = VALUES(id);
