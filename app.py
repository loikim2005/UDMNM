<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TNU</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="assets/styles.css" />
    <script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>
  </head>
  <body>
    <div class="overlay-scrim" id="overlay-scrim" aria-hidden="true"></div>

    <div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Điều hướng chính">
        <div class="sidebar-header">
          <div class="brand-icon" aria-hidden="true">
            <i data-lucide="scan-face" style="width: 20px; height: 20px"></i>
          </div>
          <span class="brand-text" id="brand-tnu" style="cursor: pointer">TNU</span>
        </div>
        <nav class="nav-scroll">
          <div class="nav-section-title">Tổng quan</div>
          <button type="button" class="nav-item active" data-view="dashboard">
            <i data-lucide="layout-dashboard" width="20" height="20"></i>
            <span class="nav-label">Dashboard</span>
          </button>
          <div class="nav-section-title">Tổ chức</div>
          <button type="button" class="nav-item" data-view="classes">
            <i data-lucide="layers" width="20" height="20"></i>
            <span class="nav-label">Lớp học</span>
          </button>
          <button type="button" class="nav-item" data-view="students">
            <i data-lucide="users" width="20" height="20"></i>
            <span class="nav-label">Quản lý sinh viên</span>
          </button>
          <button type="button" class="nav-item" id="nav-subjects" data-view="subjects">
            <i data-lucide="book-open" width="20" height="20"></i>
            <span class="nav-label">Quản lý môn học</span>
          </button>
          <button type="button" class="nav-item" data-view="register">
            <i data-lucide="user-plus" width="20" height="20"></i>
            <span class="nav-label">Đăng ký sinh viên</span>
          </button>
          <div class="nav-section-title">AI &amp; Điểm danh</div>
          <button type="button" class="nav-item" data-view="train">
            <i data-lucide="cpu" width="20" height="20"></i>
            <span class="nav-label">Train model</span>
          </button>
          <button type="button" class="nav-item" data-view="live">
            <i data-lucide="video" width="20" height="20"></i>
            <span class="nav-label">Điểm danh</span>
          </button>
          <button type="button" class="nav-item" data-view="logs">
            <i data-lucide="clipboard-list" width="20" height="20"></i>
            <span class="nav-label">Lịch sử điểm danh</span>
          </button>
          <div class="nav-section-title">Báo cáo</div>
          <button type="button" class="nav-item" data-view="export">
            <i data-lucide="file-spreadsheet" width="20" height="20"></i>
            <span class="nav-label">Export Excel</span>
          </button>
          <div class="nav-section-title">Hệ thống</div>
          <button type="button" class="nav-item" data-view="settings">
            <i data-lucide="settings" width="20" height="20"></i>
            <span class="nav-label">Setting</span>
          </button>
        </nav>
        <div class="sidebar-footer">
          <button type="button" class="collapse-toggle" id="collapse-sidebar" title="Thu gọn sidebar">
            <i data-lucide="panel-left-close" width="18" height="18"></i>
            <span>Thu gọn</span>
          </button>
        </div>
      </aside> g a