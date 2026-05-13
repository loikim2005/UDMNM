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
      </aside>

      <div class="main-wrap">
        <header class="topbar">
          <button type="button" class="menu-mobile" id="menu-mobile" aria-label="Mở menu">
            <i data-lucide="menu" width="22" height="22"></i>
          </button>
          <div class="search-wrap">
            <i data-lucide="search" width="18" height="18"></i>
            <input type="search" placeholder="Tìm sinh viên, lớp, log điểm danh…" aria-label="Tìm kiếm" />
          </div>
          <div class="topbar-actions">
            <button type="button" class="icon-btn" id="toggle-dark" title="Dark mode">
              <i data-lucide="moon" width="20" height="20"></i>
            </button>
            <button type="button" class="user-pill">
              <span class="user-avatar">AD</span>
              <span class="nav-label" style="font-weight: 600">Admin</span>
              <i data-lucide="chevron-down" width="16" height="16" style="color: var(--text-secondary)"></i>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="logout-btn">Đăng xuất</button>
          </div>
        </header>

        <main class="page-content">
          <!-- Dashboard -->
          <section class="view-panel" id="view-dashboard">
            <div class="page-header">
              <div>
                <h1>Dashboard</h1>
              </div>
              <div class="page-header-actions">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-dashboard-refresh">
                  <i data-lucide="refresh-cw" width="16" height="16"></i>
                  Làm mới
                </button>
              </div>
            </div>

            <div class="stats-grid">
              <div class="card stat-card">
                <div>
                  <p class="label">Tổng sinh viên</p>
                  <p class="value" id="totalStudents">—</p>
                </div>
                <div class="stat-icon"><i data-lucide="users" width="22" height="22"></i></div>
              </div>
              <div class="card stat-card">
                <div>
                  <p class="label">Tổng lớp</p>
                  <p class="value" id="totalClasses">—</p>
                </div>
                <div class="stat-icon"><i data-lucide="layers" width="22" height="22"></i></div>
              </div>
              <div class="card stat-card">
                <div>
                  <p class="label">Tỷ lệ điểm danh (hôm nay)</p>
                  <p class="value" id="attendanceRate">—</p>
                </div>
                <div class="stat-icon"><i data-lucide="percent" width="22" height="22"></i></div>
              </div>
              <div class="card stat-card">
                <div>
                  <p class="label">Điểm danh hôm nay</p>
                  <p class="value" id="attendanceToday">—</p>
                </div>
                <div class="stat-icon"><i data-lucide="check-circle" width="22" height="22"></i></div>
              </div>
            </div>

            <div class="chart-row">
              <div class="card">
                <h3 style="margin: 0 0 1rem; font-size: 1rem">Điểm danh 7 ngày gần nhất</h3>
                <div class="chart-placeholder" aria-hidden="true">
                  <div class="chart-bar" style="height: 45%"></div>
                  <div class="chart-bar" style="height: 62%"></div>
                  <div class="chart-bar" style="height: 55%"></div>
                  <div class="chart-bar" style="height: 78%"></div>
                  <div class="chart-bar" style="height: 70%"></div>
                  <div class="chart-bar" style="height: 88%"></div>
                  <div class="chart-bar" style="height: 82%"></div>
                </div>
              </div>
              <div class="card recent-activity-card">
                <h3 style="margin: 0 0 1rem; font-size: 1rem">Hoạt động gần đây</h3>
                <ul class="feed-list" id="recentAttendance">
                  <li><span class="text-muted">Đang tải…</span><span class="text-muted">—</span></li>
                </ul>
              </div>
            </div>
          </section>

          <!-- Classes -->
          <section class="view-panel hidden" id="view-classes">
            <div class="page-header">
              <div>
                <h1>Quản lý lớp học</h1>
                <p class="desc"></p>
              </div>
              <div class="page-header-actions">
                <button type="button" class="btn btn-primary" id="btn-class-add">
                  <i data-lucide="plus" width="18" height="18"></i>
                  Thêm lớp
                </button>
              </div>
            </div>
            <div class="card table-card">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Mã lớp</th>
                      <th>Tên lớp</th>
                      <th>Sĩ số</th>
                      <th>Giảng viên</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody id="classes-tbody">
                    <tr>
                      <td colspan="6" class="text-muted" style="text-align: center; padding: 1.5rem">Đang tải…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Students -->
          <section class="view-panel hidden" id="view-students">
            <div class="page-header">
              <div>
                <h1>Quản lý sinh viên</h1>
              </div>
              <div class="page-header-actions">
                <div class="form-group" style="margin: 0; min-width: 220px">
                  <select id="students-filter-class">
                    <option value="all">Tất cả lớp</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="card table-card">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Tên</th>
                      <th>Lớp</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Ghi chú</th>
                      <th>Thời gian đăng ký</th>
                      <th>Trạng thái điểm danh</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody id="students-manage-tbody">
                    <tr>
                      <td colspan="9" class="text-muted" style="text-align: center; padding: 1.5rem">Đang tải…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Register -->
          <section class="view-panel hidden" id="view-register">
            <div class="page-header">
              <div>
                <h1>Đăng ký sinh viên</h1>
                <p class="desc"></p>
              </div>
            </div>
            <div class="card">
              <div class="register-split" style="display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start">
                <div style="flex: 1; min-width: 260px; min-height: 0">
                  <div class="form-group">
                    <label>Họ và tên</label>
                    <input type="text" id="reg-fullname" placeholder="Nguyễn Văn A" />
                  </div>
                  <div class="form-group">
                    <label>Mã sinh viên</label>
                    <input type="text" id="reg-code" placeholder="SV2026-001" />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Email</label>
                      <input type="email" id="reg-email" placeholder="a@school.edu.vn" />
                    </div>
                    <div class="form-group">
                      <label>Số điện thoại</label>
                      <input type="tel" id="reg-phone" placeholder="09xx xxx xxx" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Lớp <span class="text-muted" style="font-weight: 400">(bắt buộc trước khi chụp)</span></label>
                    <select id="reg-class">
                      <option value="">— Chọn lớp —</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Môn học <span class="text-muted" style="font-weight: 400">(bắt buộc trước khi chụp)</span></label>
                    <select id="reg-subjects">
                      <option value="">— Chọn môn học —</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Ghi chú</label>
                    <textarea id="reg-notes" rows="2" placeholder="Tùy chọn"></textarea>
                  </div>
                </div>
                <div class="register-cam-col" style="flex: 0 1 380px; max-width: 100%; margin-left: auto; width: 100%">
                  <div
                    class="preview-box reg-face-preview"
                    style="padding: 0; overflow: hidden; position: relative; background: #111827; border-radius: 12px; aspect-ratio: 3 / 4; width: 100%; max-width: 360px; min-height: 420px; margin-left: auto"
                  >
                    <video
                      id="reg-video"
                      playsinline
                      muted
                      autoplay
                      style="display: none; position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"
                    ></video>
                    <canvas id="reg-snap-canvas" width="360" height="480" style="display: none"></canvas>
                    <span id="reg-video-placeholder" style="padding: 1.25rem; display: block; color: var(--text-secondary); position: relative; z-index: 1"
                      >Chọn lớp và môn học, sau đó bật camera để chụp</span
                    >
                  </div>
                </div>
              </div>
              <div style="margin-top: 1.25rem">
                <div style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center">
                  <button type="button" class="btn btn-primary btn-sm" id="reg-cam-start" disabled>Bật camera</button>
                  <button type="button" class="btn btn-danger-outline btn-sm" id="reg-cam-stop" disabled>Tắt camera</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="reg-snap-manual" disabled>Chụp ảnh</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="reg-clear-captures">Xóa ảnh đã chụp</button>
                  <span class="text-muted" style="font-size: 0.85rem">Đã chụp: <strong id="reg-capture-count">0</strong></span>
                </div>
                <p class="text-muted" style="margin: 0.75rem 0 0.35rem; font-size: 0.8rem; font-weight: 600">Chụp tự động</p>
                <div class="form-row">
                  <div class="form-group">
                    <label>Số ảnh</label>
                    <input type="number" id="reg-auto-count" min="1" max="30" value="5" />
                  </div>
                  <div class="form-group">
                    <label>Delay (giây)</label>
                    <input type="number" id="reg-auto-delay" min="0.5" max="10" step="0.5" value="1.5" />
                  </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center">
                  <button type="button" class="btn btn-primary btn-sm" id="reg-auto-start" disabled>Bắt đầu tự động</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="reg-auto-stop" disabled>Dừng tự động</button>
                </div>
                <p class="text-muted" style="margin: 0.75rem 0 0">Gợi ý: mặt rõ, đủ sáng, không khẩu trang.</p>
              </div>
              <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem; flex-wrap: wrap">
                <button type="button" class="btn btn-primary" id="demo-register-student">Lưu sinh viên</button>
                <button type="button" class="btn btn-secondary">Hủy</button>
              </div>
            </div>
          </section>

          <!-- Train -->
          <section class="view-panel hidden" id="view-train">
            <div class="page-header">
              <div>
                <h1>Train model</h1>
              </div>
            </div>
            <div class="card" style="max-width: 640px">
              <h3 style="margin: 0 0 0.5rem; font-size: 1.05rem">Huấn luyện nhận diện</h3>
              <div class="form-group" style="margin-bottom: 0.5rem">
                <label>Chế độ train</label>
                <div class="checkbox-row" style="margin-bottom: 0.35rem">
                  <input type="radio" id="train-mode-all" name="train-mode" value="all" checked />
                  <label for="train-mode-all">Train tất cả sinh viên</label>
                </div>
                <div class="checkbox-row" style="margin-bottom: 0.35rem">
                  <input type="radio" id="train-mode-class" name="train-mode" value="class" />
                  <label for="train-mode-class">Train theo lớp cụ thể</label>
                </div>
              </div>
              <div class="form-group" id="train-class-wrap" style="display: none; margin-bottom: 0.75rem">
                <label>Chọn lớp</label>
                <select id="train-class-id">
                  <option value="">— Chọn lớp —</option>
                </select>
              </div>
              <button type="button" class="btn btn-primary" id="btn-start-train">
                <i data-lucide="play" width="18" height="18"></i>
                Bắt đầu train
              </button>
              <div class="progress-block">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem">
                  <span class="text-muted" style="font-size: 0.85rem">Tiến độ</span>
                  <span id="train-pct" style="font-weight: 700; font-size: 0.9rem">0%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="train-progress-fill"></div>
                </div>
                <pre class="progress-log" id="train-log">Chưa chạy.</pre>
              </div>
            </div>
          </section>

          <!-- Live attendance -->
          <section class="view-panel hidden" id="view-live">
            <div class="page-header">
              <div>
                <h1>Điểm danh</h1>
              </div>
              <div class="page-header-actions" style="flex-wrap: wrap; gap: 0.75rem">
                <div class="form-group" style="margin: 0; min-width: 220px">
                  <label style="margin-bottom: 0.25rem">Lớp</label>
                  <select id="live-class-id">
                    <option value="">— Chọn lớp —</option>
                  </select>
                </div>
                <div class="form-group" style="margin: 0; min-width: 260px">
                  <label style="margin-bottom: 0.25rem">Môn học <span class="text-muted" style="font-weight: 400">(bắt buộc trước khi bật camera)</span></label>
                  <select id="live-subject-id">
                    <option value="">— Chọn môn học —</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="live-grid">
              <div class="card">
                <h3 style="margin: 0 0 0.75rem; font-size: 1rem">Camera trực tiếp</h3>
                <div class="live-camera-shell">
                  <div class="camera-stage" id="camera-stage" style="position: relative">
                  <video id="live-video" playsinline muted autoplay style="display: none; position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0"></video>
                  <div id="live-box-layer" class="live-box-layer"></div>
                  <canvas id="live-canvas" width="640" height="360" style="display: none"></canvas>
                  <span class="camera-badge" id="cam-badge">Đang chờ</span>
                  </div>
                </div>
                <div class="camera-controls">
                  <button type="button" class="btn btn-primary" id="btnStartCam">
                    <i data-lucide="video" width="18" height="18"></i>
                    Bật camera
                  </button>
                  <button type="button" class="btn btn-danger-outline" id="btnStopCam" disabled>Tắt camera</button>
                </div>
              </div>
              <div class="card recognition-panel">
                <h3 style="margin: 0 0 1rem; font-size: 1rem">Kết quả nhận diện</h3>
                <div id="resultPanel" style="margin-bottom: 1rem">
                  <p style="margin: 0.15rem 0">
                    Tên:
                    <span id="rName" style="font-weight: 700"></span>
                  </p>
                  <p style="margin: 0.15rem 0">
                    MSSV:
                    <span id="rMssv" style="font-weight: 700"></span>
                  </p>
                  <p style="margin: 0.15rem 0">
                    Độ tin cậy:
                    <span id="rConf" style="font-weight: 700"></span>
                  </p>
                  <p style="margin: 0.15rem 0">
                    Trạng thái:
                    <span id="rStatus" style="font-weight: 800"></span>
                  </p>
                </div>
                <div style="margin-bottom: 1rem">
                  <p style="margin: 0 0 0.45rem; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em">
                    Sinh viên trong khung
                  </p>
                  <ul class="feed-list" id="multi-recognition-list">
                    <li><span>—</span><span class="text-muted">—</span></li>
                  </ul>
                </div>
                <div style="margin-top: 1rem">
                  <div style="display: flex; justify-content: space-between">
                    <span class="text-muted" style="font-size: 0.85rem">Confidence</span>
                    <span id="rec-conf" style="font-weight: 700">—</span>
                  </div>
                  <div class="confidence-bar"><span id="conf-bar-inner" style="width: 0%"></span></div>
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border)">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem">
                    <i data-lucide="map-pin" width="18" height="18" class="text-muted" style="display: inline-flex"></i>
                    <span style="font-weight: 600; font-size: 0.9rem">Vị trí GPS</span>
                  </div>
                  <p class="text-muted" style="margin: 0; font-size: 0.9rem" id="rec-gps">Chưa có vị trí</p>
                </div>
                <div style="margin-top: 1.25rem">
                  <p style="margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em">Phiên hiện tại</p>
                  <ul class="feed-list" id="session-feed">
                    <li><span>—</span><span class="text-muted">—</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <!-- Logs -->
          <section class="view-panel hidden" id="view-logs">
            <div class="page-header">
              <div>
                <h1>Lịch sử điểm danh</h1>
              </div>
              <div class="page-header-actions">
                <button type="button" class="btn btn-secondary btn-sm" onclick="location.hash='export'">
                  <i data-lucide="download" width="16" height="16"></i>
                  Xuất Excel
                </button>
              </div>
            </div>
            <div class="filter-bar card" style="padding: 0.75rem 1rem; margin-bottom: 1rem">
              <div class="form-group">
                <select id="filterClass">
                  <option>Tất cả lớp</option>
                  <option>CNTT-K62</option>
                  <option>KT-01</option>
                </select>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btnFilterClass">Lọc</button>
              <div class="form-group">
                <input type="date" />
              </div>
              <div class="form-group">
                <select>
                  <option>Mọi trạng thái</option>
                  <option>Thành công</option>
                  <option>Không nhận diện</option>
                  <option>Nghi vấn</option>
                </select>
              </div>
              <div class="form-group" style="flex: 1; min-width: 180px">
                <input type="search" placeholder="Tên / MSSV…" />
              </div>
            </div>
            <div class="card table-card">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>MSSV</th>
                      <th>Lớp</th>
                      <th>Môn học</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Độ tin cậy</th>
                      <th>Vị trí</th>
                    </tr>
                  </thead>
                  <tbody id="attendance-logs-tbody">
                    <tr>
                      <td colspan="8" class="text-muted" style="text-align: center; padding: 1.25rem">Đang tải…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Export -->
          <section class="view-panel hidden" id="view-export">
            <div class="page-header">
              <div>
                <h1>Export Excel</h1>
              </div>
            </div>
            <div class="card" style="max-width: 720px; margin-bottom: 1rem">
              <div class="form-row">
                <div class="form-group">
                  <label>Lớp</label>
                  <select id="export-class">
                    <option value="">Tất cả</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Ngày</label>
                  <input type="date" id="export-date" />
                </div>
              </div>
              <p class="text-muted" style="margin: 0 0 0.75rem; font-size: 0.85rem">Cột xuất (UX: checkbox)</p>
              <div class="checkbox-row" style="margin-bottom: 0.35rem">
                <input type="checkbox" checked id="c1" /><label for="c1">Tên, MSSV, Lớp</label>
              </div>
              <div class="checkbox-row" style="margin-bottom: 0.35rem">
                <input type="checkbox" checked id="c2" /><label for="c2">Thời gian, trạng thái</label>
              </div>
              <div class="checkbox-row" style="margin-bottom: 1rem">
                <input type="checkbox" id="c3" /><label for="c3">GPS / địa chỉ</label>
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
                <button type="button" class="btn btn-secondary" id="btn-export-preview">Xem trước</button>
                <button type="button" class="btn btn-primary" id="demo-export">
                  <i data-lucide="file-down" width="18" height="18"></i>
                  Xuất Excel
                </button>
              </div>
            </div>
            <div class="card">
              <h3 style="margin: 0 0 1rem; font-size: 1rem">Xem trước (10 dòng đầu)</h3>
              <div class="export-preview">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>MSSV</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody id="export-preview-tbody">
                    <tr>
                      <td colspan="4" class="text-muted" style="text-align: center; padding: 1.25rem">Nhấn “Xem trước” để tải dữ liệu.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Settings -->
          <section class="view-panel hidden" id="view-settings">
            <div class="page-header">
              <div>
                <h1>Setting</h1>
              </div>
            </div>
            <div class="card" style="max-width: 640px">
              <div class="checkbox-row" style="margin-bottom: 1rem">
                <input type="checkbox" id="settings-enable-email" />
                <label for="settings-enable-email">Bật gửi email thông báo điểm danh</label>
              </div>
              <div class="form-group">
                <label for="settings-gps">GPS (format: lat,lon)</label>
                <input type="text" id="settings-gps" placeholder="12.654078,108.032674" />
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
                <button type="button" class="btn btn-primary" id="btn-settings-save">Save</button>
              </div>
              <div style="margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border)">
                <p style="margin: 0 0 0.75rem; font-weight: 600; color: var(--danger)">Vùng nguy hiểm</p>
                <p class="text-muted" style="margin: 0 0 1rem; font-size: 0.9rem">
                  Thao tác không thể hoàn tác. Yêu cầu xác nhận trước khi thực hiện.
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 420px">
                  <button type="button" class="btn btn-danger-outline btn-sm" id="btn-wipe-classes">Xóa tất cả lớp</button>
                  <button type="button" class="btn btn-danger-outline btn-sm" id="btn-wipe-students">Xóa tất cả sinh viên (kèm ảnh &amp; train)</button>
                  <button type="button" class="btn btn-danger-outline btn-sm" id="btn-wipe-full">Xóa toàn bộ dữ liệu hệ thống</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Subjects -->
          <section class="view-panel hidden" id="view-subjects">
            <div class="page-header">
              <div>
                <h1>Quản lý môn học</h1>
              </div>
              <div class="page-header-actions">
                <button type="button" class="btn btn-primary" id="btn-subject-add">
                  <i data-lucide="plus" width="18" height="18"></i>
                  Thêm môn học
                </button>
              </div>
            </div>
            <div class="card table-card">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Mã môn</th>
                      <th>Tên môn</th>
                      <th>Giảng viên</th>
                      <th>Sĩ số</th>
                      <th>Mô tả</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody id="subjects-tbody">
                    <tr>
                      <td colspan="6" class="text-muted" style="text-align: center; padding: 1.5rem">Đang tải…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Subject attendance list -->
          <section class="view-panel hidden" id="view-subject-attendance">
            <div class="page-header">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem">
                  <button type="button" class="btn btn-sm btn-back-green" id="btn-subject-att-back">◀️ Quay về</button>
                  <h1 id="subject-att-title" style="margin: 0">Danh sách điểm danh môn học</h1>
                </div>
              </div>
              <div class="page-header-actions">
                <div class="form-group" style="margin: 0">
                  <label for="subject-att-date">Ngày</label>
                  <input type="date" id="subject-att-date" />
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-subject-att-filter">Lọc</button>
              </div>
            </div>
            <div class="card table-card">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Tên sinh viên</th>
                      <th>Lớp</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody id="subject-att-tbody">
                    <tr>
                      <td colspan="5" class="text-muted" style="text-align: center; padding: 1.25rem">Đang tải…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>

    <!-- Modal: thêm / sửa lớp -->
    <div class="modal-overlay" id="modal-class" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 440px">
        <h3 id="modal-class-title" style="margin-top: 0">Thêm lớp</h3>
        <input type="hidden" id="class-edit-id" value="" />
        <div class="form-group">
          <label>Mã lớp</label>
          <input type="text" id="class-form-code" placeholder="CNTT-K62" />
        </div>
        <div class="form-group">
          <label>Tên lớp</label>
          <input type="text" id="class-form-name" placeholder="Công nghệ thông tin K62" />
        </div>
        <div class="form-group">
          <label>Giảng viên</label>
          <input type="text" id="class-form-lecturer" placeholder="TS. Nguyễn A" />
        </div>
        <div class="form-group">
          <label>Ghi chú</label>
          <textarea id="class-form-notes" rows="2" placeholder="Tùy chọn"></textarea>
        </div>
        <p class="text-muted" id="class-form-code-hint" style="font-size: 0.8rem; display: none">Mã lớp không đổi khi sửa.</p>
        <div class="modal-actions" style="margin-top: 1rem">
          <button type="button" class="btn btn-secondary" id="modal-class-cancel">Hủy</button>
          <button type="button" class="btn btn-primary" id="modal-class-save">Lưu</button>
        </div>
      </div>
    </div>

    <!-- Modal: sinh viên trong lớp -->
    <div class="modal-overlay" id="modal-class-roster" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 640px">
        <h3 id="modal-roster-title" style="margin-top: 0">Sinh viên lớp</h3>
        <p class="text-muted" style="margin-top: 0"></p>
        <div class="table-wrap" style="max-height: 320px; overflow: auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Họ tên</th>
                <th>Điểm danh hôm nay</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="class-roster-tbody"></tbody>
          </table>
        </div>
        <div class="modal-actions" style="margin-top: 1rem">
          <button type="button" class="btn btn-secondary" id="modal-roster-close">Đóng</button>
        </div>
      </div>
    </div>

    <!-- Modal: xác nhận xóa lớp -->
    <div class="modal-overlay" id="modal-class-delete-confirm" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 420px">
        <h3 style="margin-top: 0; text-align: center">Xác nhận xóa lớp</h3>
        <p style="text-align: center; margin-bottom: 0">Bạn có chắc muốn xóa lớp này không?</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1.25rem; gap: 0.5rem">
          <button type="button" class="btn btn-secondary" id="modal-class-delete-cancel">Hủy</button>
          <button type="button" class="btn btn-danger-outline" id="modal-class-delete-submit">Xóa</button>
        </div>
      </div>
    </div>

    <!-- Modal: xem chi tiết sinh viên -->
    <div class="modal-overlay" id="modal-student-view" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 520px">
        <h3 style="margin-top: 0">Thông tin sinh viên</h3>
        <div style="display: grid; gap: 0.35rem">
          <p style="margin: 0">MSSV: <strong id="svv-code">—</strong></p>
          <p style="margin: 0">Họ tên: <strong id="svv-name">—</strong></p>
          <p style="margin: 0">Email: <strong id="svv-email">—</strong></p>
          <p style="margin: 0">SĐT: <strong id="svv-phone">—</strong></p>
          <p style="margin: 0">Lớp: <strong id="svv-class">—</strong></p>
          <p style="margin: 0">Ghi chú: <strong id="svv-notes">—</strong></p>
        </div>
        <div class="modal-actions" style="margin-top: 1rem">
          <button type="button" class="btn btn-secondary" id="modal-student-view-close">Đóng</button>
        </div>
      </div>
    </div>

    <!-- Modal train done -->
    <div class="modal-overlay" id="modal-train-done" role="dialog" aria-modal="true" aria-labelledby="modal-train-title">
      <div class="modal">
        <div style="text-align: center; margin-bottom: 0.75rem">
          <span class="stat-icon" style="margin: 0 auto; background: rgba(5, 150, 105, 0.12); color: var(--success)">
            <i data-lucide="check-circle" width="28" height="28"></i>
          </span>
        </div>
        <h3 id="modal-train-title" style="text-align: center">Train hoàn tất</h3>
        <div class="modal-actions" style="justify-content: center">
          <button type="button" class="btn btn-secondary" id="modal-train-close">Đóng</button>
          <button type="button" class="btn btn-primary" id="modal-train-goto">Đi tới điểm danh</button>
        </div>
      </div>
    </div>

    <!-- Modal: xác nhận thao tác trang Setting (Save / xóa dữ liệu / …) -->
    <div class="modal-overlay" id="modal-settings-action-confirm" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 440px">
        <h3 style="margin-top: 0; text-align: center">Xác nhận</h3>
        <p style="text-align: center; margin-bottom: 0">Bạn có chắc chắn muốn thực hiện thao tác này?</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1.25rem; gap: 0.5rem">
          <button type="button" class="btn btn-secondary" id="modal-settings-action-cancel">Hủy</button>
          <button type="button" class="btn btn-primary" id="modal-settings-action-submit">Xác nhận</button>
        </div>
      </div>
    </div>

    <!-- Modal đăng xuất -->
    <div class="modal-overlay" id="modal-logout-confirm" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 420px">
        <h3 style="margin-top: 0; text-align: center">Đăng xuất</h3>
        <p style="text-align: center; margin-bottom: 0">Bạn có chắc muốn đăng xuất khỏi hệ thống?</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1.25rem; gap: 0.5rem">
          <button type="button" class="btn btn-secondary" id="modal-logout-cancel">Hủy</button>
          <button type="button" class="btn btn-danger-outline" id="modal-logout-submit">Đăng xuất</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="modal-logout-done" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 400px">
        <h3 style="margin-top: 0; text-align: center">Đã đăng xuất</h3>
        <p style="text-align: center; margin-bottom: 0">Phiên làm việc đã kết thúc.</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1.25rem">
          <button type="button" class="btn btn-primary" id="modal-logout-done-ok">Về trang đăng nhập</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="modal-register-success" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 400px">
        <h3 style="margin-top: 0; text-align: center">Đăng ký thành công</h3>
        <div class="modal-actions" style="justify-content: center; margin-top: 1rem">
          <button type="button" class="btn btn-primary" id="modal-register-success-ok">OK</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="modal-subject" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 460px">
        <h3 id="modal-subject-title" style="margin-top: 0">Thêm môn học</h3>
        <input type="hidden" id="subject-edit-id" value="" />
        <div class="form-group">
          <label>Mã môn</label>
          <input type="text" id="subject-form-code" placeholder="MATH101" />
        </div>
        <div class="form-group">
          <label>Tên môn</label>
          <input type="text" id="subject-form-name" placeholder="Toán cao cấp" />
        </div>
        <div class="form-group">
          <label>Giảng viên</label>
          <input type="text" id="subject-form-teacher" placeholder="TS. Nguyễn Văn A" />
        </div>
        <div class="form-group">
          <label>Mô tả</label>
          <textarea id="subject-form-description" rows="2"></textarea>
        </div>
        <div class="modal-actions" style="margin-top: 1rem">
          <button type="button" class="btn btn-secondary" id="modal-subject-cancel">Hủy</button>
          <button type="button" class="btn btn-primary" id="modal-subject-save">Lưu</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="modal-gps-fail" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal" style="max-width: 400px">
        <h3 style="margin-top: 0; text-align: center">Thông báo</h3>
        <p style="text-align: center; margin-bottom: 0">Vui lòng ở đúng vị trí để điểm danh</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1rem">
          <button type="button" class="btn btn-primary" id="modal-gps-fail-ok">OK</button>
        </div>
      </div>
    </div>
    <div class="toast-container" id="toast-container" aria-live="polite"></div>

    <script src="assets/app.js"></script>
    <script>
      if (window.lucide) lucide.createIcons();
    </script>
  </body>
</html>
