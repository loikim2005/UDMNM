(function () {
  const FA_TOKEN_KEY = "fa_token";
  let __faToken = null;
  try {
    __faToken = sessionStorage.getItem(FA_TOKEN_KEY);
  } catch (e) {
    __faToken = null;
  }
  if (!__faToken) {
    window.location.replace("index.html");
    return;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Chạy 1 địa chỉ qua Apache/Laragon:
  //   UI:  http://localhost:8080/mnm/
  //   API: http://localhost:8080/mnm/api/
  const API_BASE = (window.API_BASE || (location.origin + "/mnm/api")).replace(/\/$/, "");

  function authHeaders(extra) {
    const h = Object.assign({}, extra || {});
    let t = null;
    try {
      t = sessionStorage.getItem(FA_TOKEN_KEY);
    } catch (e) {
      t = null;
    }
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  async function apiJson(path, opts = {}) {
    const url = API_BASE + path;
    // Luôn bypass HTTP cache trình duyệt để mỗi lần vào view có dữ liệu mới nhất.
    const headers = Object.assign(
      { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      authHeaders(opts.headers || {})
    );
    const res = await fetch(url, Object.assign({ cache: "no-store" }, opts, { headers }));
    // Đọc text rồi JSON.parse — dễ log khi server trả HTML/text; tránh mất body sau res.json().
    const rawText = await res.text();
    let data = null;
    if (!rawText || !String(rawText).trim()) {
      data = {};
    } else {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn("[apiJson] Không parse được JSON:", url, res.status, res.statusText, parseErr);
        console.log("[apiJson] Response object:", res);
        console.log("[apiJson] Raw body (đầu):", String(rawText).slice(0, 800));
        data = { error: "Phản hồi không phải JSON." };
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        try {
          sessionStorage.removeItem(FA_TOKEN_KEY);
        } catch (e) {}
        window.location.replace("index.html");
      }
      const err = new Error(data.error || data.message || res.statusText || "HTTP " + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const sidebar = $("#sidebar");
  const mainWrap = $(".main-wrap");
  const overlay = $("#overlay-scrim");

  function setView(id) {
    $$(".view-panel").forEach((p) => p.classList.add("hidden"));
    const panel = $("#view-" + id);
    if (panel) panel.classList.remove("hidden");
    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === id);
    });
    if (window.lucide) lucide.createIcons();
    history.replaceState(null, "", "#" + id);
    if (window.__lastView === "register" && id !== "register") stopRegisterCaptureCleanup();
    window.__lastView = id;
    if (id === "dashboard") loadDashboard();
    if (id === "dashboard") startDashboardAutoRefresh();
    else stopDashboardAutoRefresh();
    if (id === "classes") loadClasses();
    if (id === "students") loadStudentsManagement();
    if (id === "register") {
      refreshRegClassSelect();
      loadSubjectSelectors();
    }
    if (id === "train") {
      loadTrainClassOptions();
    }
    if (id === "logs") loadAttendanceLogs();
    if (id === "export") {
      loadExportClasses();
      const dt = $("#export-date");
      if (dt && !dt.value) dt.value = new Date().toISOString().slice(0, 10);
    }
    if (id === "settings") loadSettings();
    if (id === "subjects") loadSubjects();
    if (id === "subject-attendance") loadSubjectAttendance();
    if (id === "live") {
      loadLiveClassOptions();
      loadSubjectSelectors(); // dropdown môn trên trang điểm danh realtime — luôn sync với server
    }
    if (id !== "live") stopLiveCamera();
  }

  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      setView(btn.dataset.view);
      sidebar.classList.remove("mobile-open");
      overlay?.classList.remove("open");
    });
  });

  $("#btn-dashboard-refresh")?.addEventListener("click", () => {
    loadDashboard();
    showToast("Đã làm mới dữ liệu.", "success");
  });

  $("#collapse-sidebar")?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  $("#menu-mobile")?.addEventListener("click", () => {
    sidebar.classList.add("mobile-open");
    overlay?.classList.add("open");
  });

  overlay?.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("open");
  });

  $("#toggle-dark")?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    showToast(
      document.documentElement.classList.contains("dark")
        ? "Đã bật dark mode"
        : "Đã tắt dark mode",
      "success"
    );
  });

  /* Search (lọc theo từ khóa trên view đang mở) */
  const searchInput = $(".search-wrap input[type='search']");
  let searchTimer = null;
  function applySearchFilter(keyword) {
    const q = String(keyword || "").trim().toLowerCase();
    const visiblePanel = $$(".view-panel").find((p) => !p.classList.contains("hidden"));
    const panelId = visiblePanel?.id || "";
    const map = {
      "view-classes": "#classes-tbody",
      "view-students": "#students-manage-tbody",
      "view-logs": "#attendance-logs-tbody",
    };
    const tbodySel = map[panelId];
    const tbody = tbodySel ? $(tbodySel) : null;
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll("tr")];
    for (const tr of rows) {
      const txt = tr.textContent ? tr.textContent.toLowerCase() : "";
      tr.style.display = !q || txt.includes(q) ? "" : "none";
    }
  }
  searchInput?.addEventListener("input", () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applySearchFilter(searchInput.value), 120);
  });

  const modalLogoutConfirm = $("#modal-logout-confirm");
  const modalLogoutDone = $("#modal-logout-done");
  const modalRegisterSuccess = $("#modal-register-success");
  const modalGpsFail = $("#modal-gps-fail");
  /** Modal xác nhận chung cho các nút trên trang Setting */
  const modalSettingsActionConfirm = $("#modal-settings-action-confirm");

  $("#logout-btn")?.addEventListener("click", () => {
    modalLogoutConfirm?.classList.add("open");
    if (window.lucide) lucide.createIcons();
  });

  $("#modal-logout-cancel")?.addEventListener("click", () => {
    modalLogoutConfirm?.classList.remove("open");
  });

  modalLogoutConfirm?.addEventListener("click", (e) => {
    if (e.target === modalLogoutConfirm) modalLogoutConfirm.classList.remove("open");
  });

  $("#modal-logout-submit")?.addEventListener("click", () => {
    modalLogoutConfirm?.classList.remove("open");
    try {
      sessionStorage.removeItem(FA_TOKEN_KEY);
    } catch (e) {}
    modalLogoutDone?.classList.add("open");
    if (window.lucide) lucide.createIcons();
  });

  modalLogoutDone?.addEventListener("click", (e) => {
    if (e.target === modalLogoutDone) modalLogoutDone.classList.remove("open");
  });

  $("#modal-logout-done-ok")?.addEventListener("click", () => {
    window.location.replace("index.html");
  });

  function openRegisterSuccessModal() {
    modalRegisterSuccess?.classList.add("open");
  }
  function closeRegisterSuccessModal() {
    modalRegisterSuccess?.classList.remove("open");
  }
  $("#modal-register-success-ok")?.addEventListener("click", closeRegisterSuccessModal);
  modalRegisterSuccess?.addEventListener("click", (e) => {
    if (e.target === modalRegisterSuccess) closeRegisterSuccessModal();
  });

  function openGpsFailModal() {
    modalGpsFail?.classList.add("open");
    modalGpsFail?.setAttribute("aria-hidden", "false");
  }
  function closeGpsFailModal() {
    modalGpsFail?.classList.remove("open");
    modalGpsFail?.setAttribute("aria-hidden", "true");
  }
  $("#modal-gps-fail-ok")?.addEventListener("click", closeGpsFailModal);
  modalGpsFail?.addEventListener("click", (e) => {
    if (e.target === modalGpsFail) closeGpsFailModal();
  });

  // Click logo TNU để về dashboard.
  $("#brand-tnu")?.addEventListener("click", () => {
    window.location.hash = "dashboard";
    setView("dashboard");
  });

  /* Toast */
  const toastContainer = $("#toast-container");
  function showToast(message, type = "success", title = null) {
    if (!toastContainer) return;
    const el = document.createElement("div");
    el.className = "toast " + (type === "error" ? "error" : "success");
    el.innerHTML =
      "<div><strong>" +
      (title || (type === "error" ? "Lỗi" : "Thành công")) +
      "</strong>" +
      message +
      "</div>";
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "0.2s ease";
      setTimeout(() => el.remove(), 220);
    }, 4000);
  }
  window.showToast = showToast;

  /* Dashboard (data thật từ backend) */
  let dashboardTimer = null;
  function renderRecentAttendance(items) {
    const ul = $("#recentAttendance");
    if (!ul) return;
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      ul.innerHTML = '<li class="recent-item"><span class="text-muted">Chưa có dữ liệu</span><span class="text-muted">—</span></li>';
      return;
    }
    ul.innerHTML = "";
    for (const r of rows.slice(0, 10)) {
      const li = document.createElement("li");
      const st = String((r && r.status) || "").toLowerCase();
      const statusBadge =
        st === "success"
          ? '<span class="badge badge-success">success</span>'
          : '<span class="badge badge-danger">failed</span>';
      li.className = "recent-item";
      li.innerHTML =
        '<div class="recent-left"><strong>' +
        esc((r && (r.name || r.student_code)) || "—") +
        "</strong>" +
        statusBadge +
        "</div><span class=\"text-muted recent-time\">" +
        esc((r && r.time) || "—") +
        "</span>";
      ul.appendChild(li);
    }
  }

  async function loadDashboard() {
    // chỉ chạy khi panel dashboard đang hiển thị (tránh spam API)
    const panel = $("#view-dashboard");
    if (!panel || panel.classList.contains("hidden")) return;
    try {
      const res = await apiJson("/dashboard");
      if (!res || !res.success) return;
      const d = res.data || {};
      const elStudents = $("#totalStudents");
      const elClasses = $("#totalClasses");
      const elToday = $("#attendanceToday");
      const elRate = $("#attendanceRate");
      if (elStudents) elStudents.textContent = String(d.total_students ?? "0");
      if (elClasses) elClasses.textContent = String(d.total_classes ?? "0");
      if (elToday) elToday.textContent = String(d.total_attendance_today ?? "0");
      if (elRate) elRate.textContent = (d.attendance_rate != null ? String(d.attendance_rate) : "0") + "%";
      renderRecentAttendance(d.recent_attendance || []);
    } catch (e) {
      // im lặng để dashboard không bị toast spam
    }
  }

  function startDashboardAutoRefresh() {
    if (dashboardTimer) return;
    dashboardTimer = setInterval(loadDashboard, 5000);
  }
  function stopDashboardAutoRefresh() {
    if (!dashboardTimer) return;
    clearInterval(dashboardTimer);
    dashboardTimer = null;
  }

  /* Modal */
  const trainModal = $("#modal-train-done");
  function openTrainModal() {
    trainModal?.classList.add("open");
  }
  function closeTrainModal() {
    trainModal?.classList.remove("open");
  }
  $("#modal-train-close")?.addEventListener("click", closeTrainModal);
  $("#modal-train-goto")?.addEventListener("click", () => {
    closeTrainModal();
    setView("live");
  });
  trainModal?.addEventListener("click", (e) => {
    // chạm/click ở bất kỳ đâu trên modal đều đóng
    closeTrainModal();
  });

  /* Lớp học — API /classes */
  let classesCache = [];
  const modalClass = $("#modal-class");
  const modalRoster = $("#modal-class-roster");
  const modalClassDeleteConfirm = $("#modal-class-delete-confirm");
  let pendingClassDelete = null;

  function closeClassModal() {
    modalClass?.classList.remove("open");
  }
  function closeRosterModal() {
    modalRoster?.classList.remove("open");
  }

  let regStream = null;
  let regAutoTimer = null;
  let regAutoRemaining = 0;

  async function refreshRegClassSelect() {
    const sel = $("#reg-class");
    if (!sel) return;
    const prev = sel.value;
    try {
      const data = await apiJson("/classes");
      sel.innerHTML = '<option value="">— Không chọn lớp —</option>';
      for (const c of data.classes || []) {
        const opt = document.createElement("option");
        opt.value = c.class_code;
        opt.textContent = c.class_code + " — " + c.class_name;
        sel.appendChild(opt);
      }
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
      updateRegCameraGate();
    } catch (e) {
      showToast(e.message || "Không tải được danh sách lớp", "error");
    }
  }

  function updateRegCameraGate() {
    const selClass = $("#reg-class");
    const selSub = $("#reg-subjects");
    const hasClass = !!(selClass && selClass.value && String(selClass.value).trim());
    const hasSub = !!(selSub && selSub.value && String(selSub.value).trim());
    const ok = hasClass && hasSub;
    const camOn = !!regStream;
    const ph = $("#reg-video-placeholder");
    if (ph && !camOn) {
      ph.textContent = ok ? "Bật camera để chụp" : "Chọn lớp và môn học, sau đó bật camera để chụp";
    }
    const bStart = $("#reg-cam-start");
    const bStop = $("#reg-cam-stop");
    const bSnap = $("#reg-snap-manual");
    const bAuto = $("#reg-auto-start");
    if (bStart) bStart.disabled = !ok || camOn;
    if (bStop) bStop.disabled = !camOn;
    if (bSnap) bSnap.disabled = !ok || !camOn;
    if (bAuto) bAuto.disabled = !ok || !camOn;
  }

  async function loadClasses() {
    const tb = $("#classes-tbody");
    if (!tb) return;
    tb.innerHTML =
      '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:1rem">Đang tải…</td></tr>';
    try {
      const data = await apiJson("/classes");
      classesCache = data.classes || [];
      if (!classesCache.length) {
        tb.innerHTML =
          '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:1.5rem">Chưa có lớp.</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
      }
      tb.innerHTML = "";
      for (const c of classesCache) {
        const tr = document.createElement("tr");
        const id = c.id;
        const code = esc(c.class_code);
        const name = esc(c.class_name);
        const lec = esc(c.lecturer || "—");
        const dt = esc(c.created_at || "—");
        const sc = String(c.student_count != null ? c.student_count : 0);
        tr.innerHTML =
          "<td><strong>" +
          code +
          "</strong></td><td>" +
          name +
          "</td><td>" +
          esc(sc) +
          "</td><td>" +
          lec +
          "</td><td>" +
          dt +
          '</td><td><div class="table-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm edit-class-btn" data-id="' +
          id +
          '">Sửa</button>' +
          '<button type="button" class="btn btn-danger-outline btn-sm del-class-btn" data-id="' +
          id +
          '" data-count="' +
          esc(sc) +
          '">Xóa lớp</button>' +
          "</div></td>";
        tb.appendChild(tr);
      }
      tb.querySelectorAll(".edit-class-btn").forEach((btn) => {
        btn.addEventListener("click", () => openClassModalEdit(parseInt(btn.getAttribute("data-id") || "0", 10)));
      });
      tb.querySelectorAll(".del-class-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          deleteClassPrompt(
            parseInt(btn.getAttribute("data-id") || "0", 10),
            btn.closest("tr")?.querySelector("strong")?.textContent?.trim() || "",
            parseInt(btn.getAttribute("data-count") || "0", 10) || 0
          )
        );
      });
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      tb.innerHTML =
        '<tr><td colspan="6" class="text-muted" style="text-align:center;color:var(--danger)">' +
        esc(e.message || String(e)) +
        "</td></tr>";
    }
  }

  function openClassModalAdd() {
    $("#class-edit-id").value = "";
    $("#class-form-code").value = "";
    $("#class-form-name").value = "";
    $("#class-form-lecturer").value = "";
    $("#class-form-notes").value = "";
    $("#class-form-code").disabled = false;
    $("#class-form-code-hint").style.display = "none";
    $("#modal-class-title").textContent = "Thêm lớp";
    modalClass?.classList.add("open");
    if (window.lucide) lucide.createIcons();
  }

  function openClassModalEdit(id) {
    const c = classesCache.find((x) => Number(x.id) === Number(id));
    if (!c) {
      showToast("Không tìm thấy lớp.", "error");
      return;
    }
    $("#class-edit-id").value = String(c.id);
    $("#class-form-code").value = c.class_code || "";
    $("#class-form-name").value = c.class_name || "";
    $("#class-form-lecturer").value = c.lecturer || "";
    $("#class-form-notes").value = c.notes || "";
    $("#class-form-code").disabled = true;
    $("#class-form-code-hint").style.display = "block";
    $("#modal-class-title").textContent = "Sửa lớp";
    modalClass?.classList.add("open");
    if (window.lucide) lucide.createIcons();
  }

  $("#btn-class-add")?.addEventListener("click", () => openClassModalAdd());
  $("#modal-class-cancel")?.addEventListener("click", closeClassModal);
  modalClass?.addEventListener("click", (e) => {
    if (e.target === modalClass) closeClassModal();
  });

  $("#modal-class-save")?.addEventListener("click", async () => {
    const editId = ($("#class-edit-id")?.value || "").trim();
    const code = ($("#class-form-code")?.value || "").trim();
    const name = ($("#class-form-name")?.value || "").trim();
    const lecturer = ($("#class-form-lecturer")?.value || "").trim() || null;
    const notes = ($("#class-form-notes")?.value || "").trim() || null;
    if (!name) {
      showToast("Nhập tên lớp.", "error");
      return;
    }
    if (!editId && !code) {
      showToast("Nhập mã lớp.", "error");
      return;
    }
    const btn = $("#modal-class-save");
    const old = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang lưu…";
    }
    try {
      if (editId) {
        await apiJson("/classes/" + editId, {
          method: "PUT",
          body: JSON.stringify({ class_name: name, lecturer, notes }),
        });
        showToast("Đã cập nhật lớp.", "success");
      } else {
        await apiJson("/classes", {
          method: "POST",
          body: JSON.stringify({ class_code: code, class_name: name, lecturer, notes }),
        });
        showToast("Đã thêm lớp.", "success");
      }
      closeClassModal();
      await loadClasses();
      await refreshRegClassSelect();
    } catch (e) {
      showToast(e.message || "Lưu lớp thất bại", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = old || "Lưu";
      }
    }
  });

  function openClassDeleteModal(id, classCode, studentCount) {
    if (!id) return;
    pendingClassDelete = {
      id: Number(id),
      classCode: classCode || "",
      studentCount: Number(studentCount || 0),
    };
    modalClassDeleteConfirm?.classList.add("open");
  }

  function closeClassDeleteModal() {
    modalClassDeleteConfirm?.classList.remove("open");
    pendingClassDelete = null;
  }

  async function submitClassDelete() {
    if (!pendingClassDelete || !pendingClassDelete.id) return;
    const btn = $("#modal-class-delete-submit");
    const old = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang xóa…";
    }
    try {
      const p = pendingClassDelete;
      await apiJson("/classes/" + p.id, { method: "DELETE" });
      closeClassDeleteModal();
      showToast("Đã xóa lớp.", "success");
      await loadClasses();
      await refreshRegClassSelect();
    } catch (e) {
      showToast(e.message || "Xóa lớp thất bại", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = old || "Xóa";
      }
    }
  }

  async function deleteClassPrompt(id, classCode, studentCount) {
    openClassDeleteModal(id, classCode, studentCount);
  }

  $("#modal-class-delete-cancel")?.addEventListener("click", closeClassDeleteModal);
  $("#modal-class-delete-submit")?.addEventListener("click", submitClassDelete);
  modalClassDeleteConfirm?.addEventListener("click", (e) => {
    if (e.target === modalClassDeleteConfirm) closeClassDeleteModal();
  });

  /* Môn học — API /subjects */
  let subjectsCache = [];
  let currentSubjectAttendanceId = null;
  let subjectAttendanceLoading = false;
  let subjectAttendanceReqSeq = 0;
  const modalSubject = $("#modal-subject");

  function closeSubjectModal() {
    modalSubject?.classList.remove("open");
  }

  function openSubjectModalAdd() {
    $("#subject-edit-id").value = "";
    $("#subject-form-code").value = "";
    $("#subject-form-name").value = "";
    $("#subject-form-teacher").value = "";
    $("#subject-form-description").value = "";
    $("#modal-subject-title").textContent = "Thêm môn học";
    modalSubject?.classList.add("open");
  }

  function openSubjectModalEdit(id) {
    const s = subjectsCache.find((x) => Number(x.id) === Number(id));
    if (!s) {
      showToast("Không tìm thấy môn học.", "error");
      return;
    }
    $("#subject-edit-id").value = String(s.id);
    $("#subject-form-code").value = s.subject_code || "";
    $("#subject-form-name").value = s.subject_name || "";
    $("#subject-form-teacher").value = s.teacher || "";
    $("#subject-form-description").value = s.description || "";
    $("#modal-subject-title").textContent = "Sửa môn học";
    modalSubject?.classList.add("open");
  }

  /** Danh sách lớp cho trang Điểm danh (kèm môn bắt buộc để bật camera). */
  async function loadLiveClassOptions() {
    const sel = $("#live-class-id");
    if (!sel) return;
    const prev = sel.value;
    try {
      const data = await apiJson("/classes");
      sel.innerHTML = '<option value="">— Chọn lớp —</option>';
      for (const c of data.classes || []) {
        const opt = document.createElement("option");
        opt.value = String(c.id);
        opt.textContent = (c.class_code || "") + " — " + (c.class_name || "");
        sel.appendChild(opt);
      }
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
    } catch (e) {
      showToast(e.message || "Không tải được danh sách lớp", "error");
    }
    updateLiveCameraGate();
  }

  async function loadSubjectSelectors() {
    const regSel = $("#reg-subjects");
    const liveSel = $("#live-subject-id");
    try {
      const res = await apiJson("/subjects");
      subjectsCache = res.subjects || [];
    } catch {
      subjectsCache = [];
    }
    const fill = (sel, emptyLabel) => {
      if (!sel) return;
      const old = sel.value;
      sel.innerHTML = '<option value="">' + emptyLabel + "</option>";
      for (const s of subjectsCache) {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = (s.subject_code || "") + " - " + (s.subject_name || "");
        sel.appendChild(opt);
      }
      if (old && [...sel.options].some((o) => o.value === old)) sel.value = old;
    };
    fill(regSel, "— Chọn môn học —");
    fill(liveSel, "— Chọn môn học —");
    updateLiveCameraGate();
    updateRegCameraGate();
  }

  async function loadSubjects() {
    const tb = $("#subjects-tbody");
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:1rem">Đang tải…</td></tr>';
    try {
      const data = await apiJson("/subjects");
      subjectsCache = data.subjects || [];
      if (!subjectsCache.length) {
        tb.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:1rem">Chưa có môn học.</td></tr>';
        return;
      }
      tb.innerHTML = "";
      for (const s of subjectsCache) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><strong>" +
          esc(s.subject_code || "") +
          "</strong></td><td>" +
          esc(s.subject_name || "") +
          "</td><td>" +
          esc(s.teacher || "—") +
          "</td><td>" +
          esc(String(s.student_count || 0)) +
          "</td><td>" +
          esc(s.description || "—") +
          '</td><td><div class="table-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm btn-subject-att" data-id="' +
          esc(String(s.id)) +
          '">Xem điểm danh</button>' +
          '<button type="button" class="btn btn-ghost btn-sm btn-subject-edit" data-id="' +
          esc(String(s.id)) +
          '">Sửa</button>' +
          '<button type="button" class="btn btn-danger-outline btn-sm btn-subject-del" data-id="' +
          esc(String(s.id)) +
          '">Xóa</button></div></td>';
        tb.appendChild(tr);
      }
      tb.querySelectorAll(".btn-subject-edit").forEach((btn) => {
        btn.addEventListener("click", () => openSubjectModalEdit(parseInt(btn.getAttribute("data-id") || "0", 10)));
      });
      tb.querySelectorAll(".btn-subject-del").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.getAttribute("data-id") || "0", 10);
          if (!id) return;
          if (!confirm("Bạn có chắc muốn xóa môn học này?")) return;
          try {
            await apiJson("/subjects/" + id, { method: "DELETE" });
            showToast("Đã xóa môn học.", "success");
            await loadSubjects();
            await loadSubjectSelectors();
          } catch (e) {
            showToast(e.message || "Xóa môn học thất bại", "error");
          }
        });
      });
      tb.querySelectorAll(".btn-subject-att").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentSubjectAttendanceId = parseInt(btn.getAttribute("data-id") || "0", 10) || null;
          setView("subject-attendance");
        });
      });
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;color:var(--danger)">' + esc(e.message || "") + "</td></tr>";
    }
  }

  async function loadSubjectAttendance() {
    const tb = $("#subject-att-tbody");
    if (!tb || !currentSubjectAttendanceId) return;
    if (subjectAttendanceLoading) return;
    const dateInput = $("#subject-att-date");
    const filterBtn = $("#btn-subject-att-filter");
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    if (dateInput?.value && !/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    const qs = new URLSearchParams();
    if (dateInput?.value) qs.set("date", dateInput.value);
    tb.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Đang tải…</td></tr>';
    subjectAttendanceLoading = true;
    subjectAttendanceReqSeq += 1;
    const reqSeq = subjectAttendanceReqSeq;
    if (filterBtn) filterBtn.disabled = true;
    try {
      const res = await apiJson("/subjects/" + currentSubjectAttendanceId + "/attendance?" + qs.toString());
      // Bỏ qua response cũ nếu có request mới hơn.
      if (reqSeq !== subjectAttendanceReqSeq) return;
      const items = res.items || [];
      const title = $("#subject-att-title");
      if (title) title.textContent = "Điểm danh môn: " + (res.subject?.subject_name || "");
      if (!items.length) {
        tb.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Chưa có sinh viên thuộc môn này.</td></tr>';
        return;
      }
      tb.innerHTML = "";
      for (const it of items) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          esc(it.mssv || "") +
          "</td><td>" +
          esc(it.name || "") +
          "</td><td>" +
          esc(it.class || "—") +
          "</td><td>" +
          (it.present
            ? '<span class="badge badge-success">Đã điểm danh</span>'
            : '<span class="badge badge-warning">Chưa điểm danh</span>') +
          "</td><td>" +
          esc(it.time || "—") +
          "</td>";
        tb.appendChild(tr);
      }
    } catch (e) {
      if (reqSeq !== subjectAttendanceReqSeq) return;
      tb.innerHTML =
        '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Không có dữ liệu</td></tr>';
    } finally {
      if (reqSeq === subjectAttendanceReqSeq) subjectAttendanceLoading = false;
      if (filterBtn) filterBtn.disabled = false;
    }
  }

  $("#btn-subject-add")?.addEventListener("click", openSubjectModalAdd);
  $("#modal-subject-cancel")?.addEventListener("click", closeSubjectModal);
  modalSubject?.addEventListener("click", (e) => {
    if (e.target === modalSubject) closeSubjectModal();
  });
  $("#modal-subject-save")?.addEventListener("click", async () => {
    const editId = ($("#subject-edit-id")?.value || "").trim();
    const payload = {
      subject_code: ($("#subject-form-code")?.value || "").trim(),
      subject_name: ($("#subject-form-name")?.value || "").trim(),
      teacher: ($("#subject-form-teacher")?.value || "").trim() || null,
      description: ($("#subject-form-description")?.value || "").trim() || null,
    };
    if (!payload.subject_code || !payload.subject_name) {
      showToast("Nhập mã môn và tên môn.", "error");
      return;
    }
    try {
      if (editId) {
        await apiJson("/subjects/" + editId, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Đã cập nhật môn học.", "success");
      } else {
        await apiJson("/subjects", { method: "POST", body: JSON.stringify(payload) });
        showToast("Đã thêm môn học.", "success");
      }
      closeSubjectModal();
      await loadSubjects();
      await loadSubjectSelectors();
    } catch (e) {
      showToast(e.message || "Lưu môn học thất bại", "error");
    }
  });
  $("#btn-subject-att-filter")?.addEventListener("click", loadSubjectAttendance);
  $("#btn-subject-att-back")?.addEventListener("click", () => {
    setView("subjects");
  });

  let rosterClassCode = "";

  async function openClassRoster(classCode) {
    rosterClassCode = classCode || "";
    $("#modal-roster-title").textContent = rosterClassCode ? "Sinh viên — " + rosterClassCode : "Sinh viên lớp";
    modalRoster?.classList.add("open");
    await loadClassRosterBody();
    if (window.lucide) lucide.createIcons();
  }

  async function loadClassRosterBody() {
    const tbody = $("#class-roster-tbody");
    if (!tbody) return;
    if (!rosterClassCode) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Không có mã lớp.</td></tr>';
      return;
    }
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Đang tải…</td></tr>';
    try {
      const data = await apiJson("/students?class_code=" + encodeURIComponent(rosterClassCode));
      const studs = data.students || [];
      if (!studs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Chưa có sinh viên trong lớp này.</td></tr>';
        return;
      }
      tbody.innerHTML = "";
      for (const s of studs) {
        const tr = document.createElement("tr");
        const att = s.attended_today
          ? '<span class="badge badge-success">Đã điểm danh</span>'
          : '<span class="badge badge-warning">Chưa điểm danh</span>';
        tr.innerHTML =
          "<td><strong>" +
          esc(s.student_code) +
          "</strong></td><td>" +
          esc(s.full_name) +
          "</td><td>" +
          att +
          '</td><td><button type="button" class="btn btn-secondary btn-sm view-stud-btn" data-id="' +
          s.id +
          '">Xem</button> ' +
          '<button type="button" class="btn btn-danger-outline btn-sm del-stud-btn" data-id="' +
          s.id +
          '">Xóa</button></td>';
        tr.querySelector(".view-stud-btn")?.addEventListener("click", () => {
          $("#svv-code").textContent = s.student_code || "—";
          $("#svv-name").textContent = s.full_name || "—";
          $("#svv-email").textContent = s.email || "—";
          $("#svv-phone").textContent = s.phone || "—";
          $("#svv-class").textContent = s.class_code || "—";
          $("#svv-notes").textContent = s.notes || "—";
          modalStudentView?.classList.add("open");
          modalStudentView?.setAttribute("aria-hidden", "false");
        });
        tr.querySelector(".del-stud-btn")?.addEventListener("click", async () => {
          const ok = await openStudentDeleteConfirm(s.student_code);
          if (!ok) return;
          try {
            await apiJson("/students/" + s.id, { method: "DELETE" });
            showToast("Đã xóa sinh viên.", "success");
            await loadClassRosterBody();
            await loadClasses();
            await refreshRegClassSelect();
          } catch (e) {
            showToast(e.message || "Xóa thất bại", "error");
          }
        });
        tbody.appendChild(tr);
      }
    } catch (e) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-muted" style="color:var(--danger)">' + esc(e.message) + "</td></tr>";
    }
  }

  $("#modal-roster-close")?.addEventListener("click", closeRosterModal);
  modalRoster?.addEventListener("click", (e) => {
    if (e.target === modalRoster) closeRosterModal();
  });

  const modalStudentView = $("#modal-student-view");
  let studentsFilterBound = false;
  function closeStudentViewModal() {
    modalStudentView?.classList.remove("open");
    modalStudentView?.setAttribute("aria-hidden", "true");
  }
  $("#modal-student-view-close")?.addEventListener("click", closeStudentViewModal);
  modalStudentView?.addEventListener("click", (e) => {
    if (e.target === modalStudentView) closeStudentViewModal();
  });

  function formatStudentCreatedAt(input) {
    if (!input) return "—";
    const dt = new Date(String(input).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return esc(String(input));
    const pad = (n) => String(n).padStart(2, "0");
    return (
      pad(dt.getDate()) +
      "/" +
      pad(dt.getMonth() + 1) +
      "/" +
      dt.getFullYear() +
      " " +
      pad(dt.getHours()) +
      ":" +
      pad(dt.getMinutes())
    );
  }

  /** Mỗi lần vào / quay lại trang Sinh viên: làm mới dropdown lớp từ API (không giữ cache một lần). */
  async function ensureStudentsClassFilter() {
    const sel = $("#students-filter-class");
    if (!sel) return;
    const data = await apiJson("/classes");
    sel.innerHTML = '<option value="all">Tất cả lớp</option>';
    for (const c of data.classes || []) {
      const opt = document.createElement("option");
      opt.value = String(c.id);
      opt.textContent = (c.class_code || "") + (c.class_name ? " — " + c.class_name : "");
      sel.appendChild(opt);
    }
  }

  async function loadStudentsManagement() {
    const tb = $("#students-manage-tbody");
    if (!tb) return;
    if (!studentsFilterBound) {
      $("#students-filter-class")?.addEventListener("change", () => {
        loadStudentsManagement();
      });
      studentsFilterBound = true;
    }
    try {
      await ensureStudentsClassFilter();
    } catch (_) {}
    tb.innerHTML = '<tr><td colspan="9" class="text-muted" style="text-align:center;padding:1.25rem">Đang tải…</td></tr>';
    try {
      const selectedClassId = ($("#students-filter-class")?.value || "all").trim() || "all";
      const qs = new URLSearchParams();
      qs.set("class_id", selectedClassId);
      const data = await apiJson("/students?" + qs.toString());
      const students = data.students || [];
      if (!students.length) {
        tb.innerHTML = '<tr><td colspan="9" class="text-muted" style="text-align:center;padding:1.25rem">Chưa có sinh viên.</td></tr>';
        return;
      }
      tb.innerHTML = "";
      for (const s of students) {
        const tr = document.createElement("tr");
        const statusBadge = s.attended_today
          ? '<span class="badge badge-success">Đã điểm danh</span>'
          : '<span class="badge badge-warning">Chưa điểm danh</span>';
        tr.innerHTML =
          "<td><strong>" +
          esc(s.student_code || "") +
          "</strong></td><td>" +
          esc(s.full_name || "") +
          "</td><td>" +
          esc(s.class_code || "—") +
          "</td><td>" +
          esc(s.email || "—") +
          "</td><td>" +
          esc(s.phone || "—") +
          "</td><td>" +
          esc((s.notes || "").trim() ? s.notes : "-") +
          "</td><td>" +
          esc(formatStudentCreatedAt(s.created_at)) +
          "</td><td>" +
          statusBadge +
          '</td><td><button type="button" class="btn btn-danger-outline btn-sm del-student-manage-btn" data-id="' +
          esc(s.id) +
          '" data-code="' +
          esc(s.student_code || "") +
          '">Xóa</button></td>';
        tb.appendChild(tr);
      }
      tb.querySelectorAll(".del-student-manage-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const sid = parseInt(btn.getAttribute("data-id") || "0", 10);
          const scode = btn.getAttribute("data-code") || "";
          const ok = await openStudentDeleteConfirm(scode);
          if (!ok) return;
          try {
            await apiJson("/students/" + sid, { method: "DELETE" });
            showToast("Đã xóa sinh viên.", "success");
            await loadStudentsManagement();
            await loadClasses();
            await refreshRegClassSelect();
          } catch (e) {
            showToast(e.message || "Xóa thất bại", "error");
          }
        });
      });
    } catch (e) {
      tb.innerHTML =
        '<tr><td colspan="9" class="text-muted" style="text-align:center;color:var(--danger)">' +
        esc(e.message || String(e)) +
        "</td></tr>";
    }
  }

  async function openStudentDeleteConfirm(studentCode) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay open";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML =
        '<div class="modal" style="max-width: 420px">' +
        '<h3 style="margin-top:0;text-align:center">Xác nhận xóa sinh viên</h3>' +
        '<p style="text-align:center">Bạn có chắc muốn xóa sinh viên ' +
        esc(studentCode || "") +
        "?</p>" +
        '<div class="modal-actions" style="justify-content:center">' +
        '<button type="button" class="btn btn-secondary" id="student-del-cancel">Hủy</button>' +
        '<button type="button" class="btn btn-danger-outline" id="student-del-ok">Xóa</button>' +
        "</div>" +
        "</div>";
      document.body.appendChild(overlay);
      const done = (ans) => {
        overlay.classList.remove("open");
        overlay.remove();
        resolve(ans);
      };
      overlay.querySelector("#student-del-cancel")?.addEventListener("click", () => done(false));
      overlay.querySelector("#student-del-ok")?.addEventListener("click", () => done(true));
      overlay.addEventListener("click", (ev) => {
        if (ev.target === overlay) done(false);
      });
    });
  }

  /* Demo actions */
  async function exportExcel() {
    // tải file Excel (dữ liệu thật) từ backend, kèm Authorization
    const btn = $("#demo-export");
    const old = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang xuất...';
    }
    try {
      const cls = ($("#export-class")?.value || "").trim();
      const dt = ($("#export-date")?.value || "").trim();
      const qs = new URLSearchParams();
      if (cls) qs.set("ma_lop", cls);
      if (dt) qs.set("date", dt);
      const res = await fetch(API_BASE + "/export-excel" + (qs.toString() ? "?" + qs.toString() : ""), {
        method: "GET",
        headers: authHeaders({}),
      });
      if (!res.ok) {
        let msg = res.statusText || ("HTTP " + res.status);
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast("Đã tạo file Excel.", "success");
    } catch (e) {
      showToast(e.message || "Không xuất được Excel", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = old || "Xuất Excel";
      }
    }
  }

  $("#demo-export")?.addEventListener("click", () => exportExcel());

  async function loadExportClasses() {
    const sel = $("#export-class");
    if (!sel) return;
    try {
      const data = await apiJson("/classes");
      sel.innerHTML = '<option value="">Tất cả</option>';
      for (const c of data.classes || []) {
        const opt = document.createElement("option");
        opt.value = c.class_code || "";
        opt.textContent = (c.class_code || "") + (c.class_name ? " — " + c.class_name : "");
        sel.appendChild(opt);
      }
    } catch (e) {
      /* giữ dropdown rỗng/minimal nếu lỗi */
    }
  }

  async function exportPreview() {
    const tb = $("#export-preview-tbody");
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:1rem">Đang tải…</td></tr>';
    const cls = ($("#export-class")?.value || "").trim();
    const dt = ($("#export-date")?.value || "").trim();
    const qs = new URLSearchParams();
    if (cls) qs.set("ma_lop", cls);
    if (dt) {
      qs.set("from_date", dt);
      qs.set("to_date", dt);
    }
    qs.set("limit", "10");
    try {
      const data = await apiJson("/attendance?" + qs.toString());
      const items = data.data || data.items || [];
      if (!items.length) {
        tb.innerHTML =
          '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:1.25rem">Không có dữ liệu.</td></tr>';
        return;
      }
      tb.innerHTML = "";
      for (const it of items.slice(0, 10)) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          esc(it.name || it.full_name || "") +
          "</td><td>" +
          esc(it.mssv || it.student_code || "") +
          "</td><td>" +
          esc(it.time || it.checked_at || "") +
          "</td><td>" +
          esc(it.status || "") +
          "</td>";
        tb.appendChild(tr);
      }
    } catch (e) {
      tb.innerHTML =
        '<tr><td colspan="4" class="text-muted" style="text-align:center;color:var(--danger)">' +
        esc(e.message || String(e)) +
        "</td></tr>";
    }
  }

  $("#btn-export-preview")?.addEventListener("click", () => exportPreview());

  /* Settings */
  async function loadSettings() {
    try {
      const res = await apiJson("/settings");
      const cfg = (res && res.settings) || {};
      const cb = $("#settings-enable-email");
      const gpsInput = $("#settings-gps");
      if (cb) cb.checked = !!cfg.enable_email;
      if (gpsInput) gpsInput.value = cfg.gps || "";
    } catch (e) {
      showToast(e.message || "Không tải được settings", "error");
    }
  }

  /* —— Setting: modal xác nhận (không dùng alert/confirm) —— */
  let settingsPendingAction = null;

  function openSettingsActionModal(action) {
    settingsPendingAction = action;
    modalSettingsActionConfirm?.classList.add("open");
    if (window.lucide) lucide.createIcons();
  }

  function closeSettingsActionModal() {
    settingsPendingAction = null;
    modalSettingsActionConfirm?.classList.remove("open");
  }

  $("#modal-settings-action-cancel")?.addEventListener("click", () => {
    closeSettingsActionModal();
  });

  modalSettingsActionConfirm?.addEventListener("click", (e) => {
    if (e.target === modalSettingsActionConfirm) closeSettingsActionModal();
  });

  /** Gửi POST /settings — chỉ gọi sau khi người dùng bấm Xác nhận trên modal */
  async function saveSettingsToServer() {
    const cb = $("#settings-enable-email");
    const gpsInput = $("#settings-gps");
    const gpsText = (gpsInput?.value || "").trim();
    try {
      await apiJson("/settings", {
        method: "POST",
        body: JSON.stringify({
          enable_email: !!cb?.checked,
          gps: gpsText || null,
        }),
      });
      showToast("Đã lưu settings.", "success");
    } catch (e) {
      showToast(e.message || "Lưu settings thất bại", "error");
    }
  }

  /** Xóa dữ liệu theo scope — chỉ gọi sau khi người dùng bấm Xác nhận trên modal */
  async function performSettingsWipe(scope) {
    try {
      const res = await apiJson("/settings/wipe", {
        method: "POST",
        body: JSON.stringify({ scope }),
      });
      if (res && res.success) {
        showToast("Đã xóa dữ liệu theo yêu cầu.", "success");
      } else {
        showToast(res?.error || "Thao tác thất bại", "error");
      }
    } catch (e) {
      showToast(e.message || "Thao tác thất bại", "error");
    }
  }

  $("#modal-settings-action-submit")?.addEventListener("click", async () => {
    const action = settingsPendingAction;
    modalSettingsActionConfirm?.classList.remove("open");
    settingsPendingAction = null;
    if (!action) return;
    if (action.type === "save") {
      await saveSettingsToServer();
    } else if (action.type === "wipe" && action.scope) {
      await performSettingsWipe(action.scope);
    }
  });

  $("#btn-settings-save")?.addEventListener("click", () => {
    const gpsInput = $("#settings-gps");
    const gpsText = (gpsInput?.value || "").trim();
    if (gpsText && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(gpsText)) {
      showToast("GPS không đúng định dạng lat,lon", "error");
      return;
    }
    openSettingsActionModal({ type: "save" });
  });

  $("#btn-wipe-classes")?.addEventListener("click", () => {
    openSettingsActionModal({ type: "wipe", scope: "classes" });
  });
  $("#btn-wipe-students")?.addEventListener("click", () => {
    openSettingsActionModal({ type: "wipe", scope: "students" });
  });
  $("#btn-wipe-full")?.addEventListener("click", () => {
    openSettingsActionModal({ type: "wipe", scope: "full" });
  });

  function selectedTrainMode() {
    const selected = document.querySelector('input[name="train-mode"]:checked');
    return (selected && selected.value) || "all";
  }

  function updateTrainModeUI() {
    const mode = selectedTrainMode();
    const wrap = $("#train-class-wrap");
    if (wrap) wrap.style.display = mode === "class" ? "block" : "none";
  }

  async function loadTrainClassOptions() {
    const sel = $("#train-class-id");
    if (!sel) return;
    try {
      const data = await apiJson("/classes");
      sel.innerHTML = '<option value="">— Chọn lớp —</option>';
      for (const c of data.classes || []) {
        const opt = document.createElement("option");
        opt.value = String(c.id || "");
        opt.textContent = (c.class_code || "") + (c.class_name ? " — " + c.class_name : "");
        sel.appendChild(opt);
      }
    } catch (e) {}
  }

  /* Đăng ký sinh viên — camera chụp + danh sách */
  const regCaptures = [];
  const regVideo = $("#reg-video");
  const regSnapCanvas = $("#reg-snap-canvas");
  const regVideoPh = $("#reg-video-placeholder");
  const regCaptureCountEl = $("#reg-capture-count");

  $("#reg-class")?.addEventListener("change", () => {
    const sel = $("#reg-class");
    if (!sel || !String(sel.value || "").trim()) {
      stopRegisterCaptureCleanup();
    }
    updateRegCameraGate();
  });
  $("#reg-subjects")?.addEventListener("change", () => {
    updateRegCameraGate();
  });

  function updateRegCaptureCount() {
    if (regCaptureCountEl) regCaptureCountEl.textContent = String(regCaptures.length);
  }

  function addRegCaptureDataUrl(dataUrl) {
    if (!dataUrl) return;
    regCaptures.push(dataUrl);
    updateRegCaptureCount();
  }

  function captureFrameFromRegVideo() {
    const v = regVideo;
    const c = regSnapCanvas;
    if (!v || !c || !v.videoWidth) return null;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const rw = 3;
    const rh = 4;
    let sx;
    let sy;
    let cw;
    let ch;
    if (vw / vh <= rw / rh) {
      cw = vw;
      ch = (vw * rh) / rw;
      sx = 0;
      sy = Math.max(0, Math.floor((vh - ch) / 2));
    } else {
      ch = vh;
      cw = (vh * rw) / rh;
      sx = Math.max(0, Math.floor((vw - cw) / 2));
      sy = 0;
    }
    const outW = 360;
    const outH = 480;
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, sx, sy, cw, ch, 0, 0, outW, outH);
    return c.toDataURL("image/jpeg", 0.88);
  }

  function stopRegAuto() {
    if (regAutoTimer) {
      clearTimeout(regAutoTimer);
      regAutoTimer = null;
    }
    regAutoRemaining = 0;
    const btnS = $("#reg-auto-stop");
    if (btnS) btnS.disabled = true;
    updateRegCameraGate();
  }

  function stopRegisterCaptureCleanup() {
    stopRegAuto();
    if (regStream) {
      regStream.getTracks().forEach((t) => t.stop());
      regStream = null;
    }
    if (regVideo) {
      regVideo.srcObject = null;
      regVideo.style.display = "none";
    }
    if (regVideoPh) regVideoPh.style.display = "block";
    updateRegCameraGate();
  }

  $("#reg-cam-start")?.addEventListener("click", async () => {
    if (!regVideo) return;
    try {
      try {
        regStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", aspectRatio: { ideal: 3 / 4 } },
          audio: false,
        });
      } catch (_) {
        regStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      }
      regVideo.srcObject = regStream;
      await regVideo.play();
      regVideo.style.display = "block";
      if (regVideoPh) regVideoPh.style.display = "none";
      updateRegCameraGate();
    } catch (e) {
      showToast("Không mở được camera: " + (e.message || String(e)), "error");
    }
  });

  $("#reg-cam-stop")?.addEventListener("click", () => {
    stopRegAuto();
    if (regStream) {
      regStream.getTracks().forEach((t) => t.stop());
      regStream = null;
    }
    if (regVideo) {
      regVideo.srcObject = null;
      regVideo.style.display = "none";
    }
    if (regVideoPh) regVideoPh.style.display = "block";
    updateRegCameraGate();
  });

  $("#reg-snap-manual")?.addEventListener("click", () => {
    const url = captureFrameFromRegVideo();
    if (!url) {
      showToast("Chưa có khung hình camera.", "error");
      return;
    }
    addRegCaptureDataUrl(url);
  });

  function scheduleNextAutoShot() {
    const delaySec = parseFloat($("#reg-auto-delay")?.value || "1.5");
    const delayMs = Math.max(500, Math.round((isNaN(delaySec) ? 1.5 : delaySec) * 1000));
    regAutoTimer = setTimeout(() => {
      regAutoTimer = null;
      const url = captureFrameFromRegVideo();
      if (url) addRegCaptureDataUrl(url);
      regAutoRemaining -= 1;
      if (regAutoRemaining > 0) scheduleNextAutoShot();
      else {
        stopRegAuto();
        showToast("Đã chụp xong chuỗi tự động.", "success");
      }
    }, delayMs);
  }

  $("#reg-auto-start")?.addEventListener("click", () => {
    if (!regStream) {
      showToast("Bật camera trước.", "error");
      return;
    }
    let n = parseInt($("#reg-auto-count")?.value || "5", 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 30) n = 30;
    stopRegAuto();
    regAutoRemaining = n;
    $("#reg-auto-stop").disabled = false;
    const btnAs = $("#reg-auto-start");
    if (btnAs) btnAs.disabled = true;
    const url0 = captureFrameFromRegVideo();
    if (url0) addRegCaptureDataUrl(url0);
    regAutoRemaining -= 1;
    if (regAutoRemaining > 0) scheduleNextAutoShot();
    else {
      stopRegAuto();
      showToast("Đã chụp xong.", "success");
    }
  });

  $("#reg-auto-stop")?.addEventListener("click", () => {
    stopRegAuto();
    showToast("Đã dừng chụp tự động.", "success");
  });

  $("#reg-clear-captures")?.addEventListener("click", () => {
    regCaptures.length = 0;
    updateRegCaptureCount();
  });

  /** Fallback khi không có field location — tránh trùng lat,lng với location_text giống hệt. */
  function formatLogLocation(row) {
    const lat = row.latitude;
    const lng = row.longitude;
    const lt = row.location_text != null && row.location_text !== "" ? String(row.location_text).trim() : "";
    let coordStr = "";
    // Không dùng truthy (lat && lng): tọa độ 0 hợp lệ (ví dụ 0,0) phải hiển thị được.
    if (lat != null && lat !== "" && lng != null && lng !== "") {
      const la = Number(lat);
      const lo = Number(lng);
      if (!Number.isNaN(la) && !Number.isNaN(lo)) {
        coordStr = la.toFixed(6) + ", " + lo.toFixed(6);
      } else {
        coordStr = String(lat) + ", " + String(lng);
      }
    }
    if (!coordStr && !lt) return "—";
    if (coordStr && lt) {
      const norm = (s) => s.replace(/\s+/g, "");
      if (norm(coordStr) === norm(lt)) return coordStr;
      const nums = lt.match(/-?\d+\.?\d*/g);
      if (nums && nums.length === 2) {
        const la = parseFloat(lat);
        const lo = parseFloat(lng);
        if (
          !Number.isNaN(la) &&
          !Number.isNaN(lo) &&
          Math.abs(parseFloat(nums[0]) - la) < 1e-4 &&
          Math.abs(parseFloat(nums[1]) - lo) < 1e-4
        ) {
          return coordStr;
        }
      }
      return coordStr + " · " + lt;
    }
    return coordStr || lt || "—";
  }

  function attendanceStatusBadge(status) {
    const s = String(status || "").toLowerCase();
    if (s === "success") return '<span class="badge badge-success">Thành công</span>';
    if (s === "failure" || s === "failed") return '<span class="badge badge-danger">Thất bại</span>';
    return '<span class="badge badge-warning">' + esc(status || "—") + "</span>";
  }

  let logsFilterBound = false;

  /** Mỗi lần mở Lịch sử: làm mới dropdown lớp (không dùng cache chỉ load một lần). */
  async function loadLogsClassOptions() {
    const select = $("#filterClass");
    if (!select) return;
    try {
      const data = await apiJson("/classes");
      const classes = data.classes || [];
      select.innerHTML = '<option value="">Tất cả lớp</option>';
      for (const cls of classes) {
        const opt = document.createElement("option");
        opt.value = cls.class_code || "";
        opt.textContent = cls.class_name || cls.class_code || "";
        select.appendChild(opt);
      }
    } catch (e) {
      /* giữ dropdown mặc định nếu API lỗi */
    }
  }

  async function loadAttendanceLogs() {
    const tb = $("#attendance-logs-tbody");
    if (!tb) return;
    tb.innerHTML =
      '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:1rem">Đang tải…</td></tr>';
    try {
      await loadLogsClassOptions();
      if (!logsFilterBound) {
        $("#btnFilterClass")?.addEventListener("click", loadAttendanceLogs);
        logsFilterBound = true;
      }

      const maLop = ($("#filterClass")?.value || "").trim();
      const url = maLop ? "/attendance?ma_lop=" + encodeURIComponent(maLop) + "&limit=300" : "/attendance?limit=300";
      const data = await apiJson(url);
      const items = data.data || data.items || [];
      if (!items.length) {
        tb.innerHTML =
          '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:1.25rem">Chưa có bản ghi điểm danh.</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
      }
      tb.innerHTML = "";
      for (const item of items) {
        const tr = document.createElement("tr");
        const when = esc(item.time || item.checked_at || "—");
        const displayName = item.name || item.full_name || "";
        const displayMssv = item.mssv || item.student_code || "";
        const conf = item && item.confidence != null ? Number(item.confidence) : null;
        const confPct = conf != null && !isNaN(conf) ? Math.round(conf * 1000) / 10 : null; // 1 chữ số thập phân
        const subj = esc(item.subject_name || item.subject || "—");
        // Không dùng `item.location || formatLogLocation`: nếu location là 0 (số) sẽ bị coi falsy và ô bị trống.
        const locPre =
          item.location != null && String(item.location).trim() !== "" ? String(item.location).trim() : formatLogLocation(item);
        const loc = esc(locPre);
        tr.innerHTML =
          "<td>" +
          esc(displayName) +
          "</td><td>" +
          esc(displayMssv) +
          "</td><td>" +
          esc(item.class || item.class_code || "—") +
          "</td><td>" +
          subj +
          "</td><td>" +
          when +
          "</td><td>" +
          attendanceStatusBadge(item.status) +
          "</td><td>" +
          esc(confPct != null ? confPct + "%" : "—") +
          '</td><td class="text-muted">' +
          loc +
          "</td>";
        tb.appendChild(tr);
      }
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      tb.innerHTML =
        '<tr><td colspan="8" class="text-muted" style="text-align:center;color:var(--danger)">' +
        esc(e.message || String(e)) +
        "</td></tr>";
    }
  }

  updateRegCameraGate();

  $("#demo-register-student")?.addEventListener("click", async () => {
    const full_name = ($("#reg-fullname")?.value || "").trim();
    const student_code = ($("#reg-code")?.value || "").trim();
    const class_code = ($("#reg-class")?.value || "").trim();
    if (!full_name || !student_code) {
      showToast("Nhập họ tên và MSSV.", "error");
      return;
    }
    if (!class_code) {
      showToast("Chọn lớp trước khi lưu.", "error");
      return;
    }
    const regSubj = Number($("#reg-subjects")?.value || 0);
    if (!regSubj || isNaN(regSubj)) {
      showToast("Chọn môn học trước khi lưu.", "error");
      return;
    }
    const btn = $("#demo-register-student");
    btn.disabled = true;
    const old = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Đang lưu...';
    try {
      const chkClass = await apiJson("/classes/check?class_code=" + encodeURIComponent(class_code));
      if (!chkClass.exists) {
        showToast("Lớp không tồn tại trong hệ thống.", "error");
        return;
      }
      const chkSt = await apiJson("/students/check?student_code=" + encodeURIComponent(student_code));
      if (chkSt.exists) {
        showToast("MSSV đã tồn tại trong hệ thống.", "error");
        return;
      }
      if (chkSt.data_folder_exists) {
        showToast("Đã tồn tại thư mục ảnh (data/) cho MSSV này.", "error");
        return;
      }
      const face_images = regCaptures.slice();
      const payload = {
        full_name,
        student_code,
        email: ($("#reg-email")?.value || "").trim() || null,
        phone: ($("#reg-phone")?.value || "").trim() || null,
        class_code: class_code,
        notes: ($("#reg-notes")?.value || "").trim() || null,
        subject_ids: [regSubj],
        face_images,
      };
      await apiJson("/students", { method: "POST", body: JSON.stringify(payload) });
      // reset form sau khi đăng ký thành công
      $("#reg-fullname").value = "";
      $("#reg-code").value = "";
      $("#reg-email").value = "";
      $("#reg-phone").value = "";
      $("#reg-notes").value = "";
      $("#reg-class").value = "";
      if ($("#reg-subjects")) $("#reg-subjects").value = "";
      $("#reg-auto-count").value = "5";
      $("#reg-auto-delay").value = "1.5";
      regCaptures.length = 0;
      updateRegCaptureCount();
      stopRegisterCaptureCleanup();
      await loadClasses();
      openRegisterSuccessModal();
    } catch (e) {
      if (e && e.status === 409 && e.data && e.data.error === "Khuôn mặt đã tồn tại trong hệ thống") {
        const existing = e.data.existing_student ? String(e.data.existing_student) : "—";
        const sim = typeof e.data.similarity === "number" ? Math.round(e.data.similarity * 10000) / 100 : null;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay open";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.innerHTML =
          '<div class="modal" style="max-width: 520px">' +
          '<h3 style="margin-top:0;text-align:center;color:var(--danger)">ĐĂNG KÝ THẤT BẠI</h3>' +
          '<p style="text-align:center;margin:0.5rem 0 0.25rem">Khuôn mặt đã tồn tại:</p>' +
          '<p style="text-align:center;margin:0 0 0.75rem;font-weight:700">' +
          esc(existing) +
          "</p>" +
          '<p style="text-align:center;margin:0 0 1rem" class="text-muted">Độ giống: ' +
          (sim != null ? esc(sim) + "%" : "—") +
          "</p>" +
          '<p style="text-align:center;margin:0 0 1.25rem">Vui lòng sử dụng khuôn mặt khác</p>' +
          '<div class="modal-actions" style="justify-content:center">' +
          '<button type="button" class="btn btn-secondary" id="dup-close">Đóng</button>' +
          "</div>" +
          "</div>";
        document.body.appendChild(overlay);
        const close = () => {
          overlay.classList.remove("open");
          overlay.remove();
        };
        overlay.addEventListener("click", (ev) => {
          if (ev.target === overlay) close();
        });
        overlay.querySelector("#dup-close")?.addEventListener("click", close);
        return;
      }
      const detail = e && e.data && (e.data.last_error || e.data.error) ? String(e.data.last_error || e.data.error) : "";
      showToast((e.message || "Lỗi lưu sinh viên") + (detail ? " — " + detail : ""), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });

  /* Train model → Flask */
  let trainTimer = null;
  $("#btn-start-train")?.addEventListener("click", async () => {
    const btn = $("#btn-start-train");
    const fill = $("#train-progress-fill");
    const pct = $("#train-pct");
    const log = $("#train-log");
    if (!btn || !fill || !pct || !log) return;
    if (trainTimer) clearInterval(trainTimer);
    fill.style.width = "0%";
    pct.textContent = "0%";
    log.textContent = "Đang gửi yêu cầu train tới backend...";
    btn.disabled = true;
    let p = 0;
    trainTimer = setInterval(() => {
      p += Math.random() * 4 + 1;
      if (p > 92) p = 92;
      fill.style.width = p + "%";
      pct.textContent = Math.round(p) + "%";
    }, 500);
    try {
      const mode = selectedTrainMode();
      const classId = ($("#train-class-id")?.value || "").trim();
      if (mode === "class" && !classId) {
        throw new Error("Vui lòng chọn lớp khi train theo lớp.");
      }
      const data = await apiJson("/train", {
        method: "POST",
        body: JSON.stringify({
          epochs: 30,
          mode,
          class_id: mode === "class" ? classId : null,
        }),
      });
      clearInterval(trainTimer);
      trainTimer = null;
      fill.style.width = "100%";
      pct.textContent = "100%";
      log.textContent = "Hoàn tất.";
      openTrainModal();
    } catch (e) {
      clearInterval(trainTimer);
      trainTimer = null;
      fill.style.width = "0%";
      pct.textContent = "0%";
      log.textContent = "Lỗi: " + (e.message || String(e));
      showToast(e.message || "Train thất bại", "error");
    } finally {
      btn.disabled = false;
    }
  });

  /* Live camera + predict */
  let camOn = false;
  let stream = null;
  let predictTimer = null;
  let lastSnap = null;
  let lastRecognition = null;
  let detecting = false;
  let currentLocation = null;
  /** ID watchPosition — clear khi tắt camera để không rò rỉ callback. */
  let gpsWatchId = null;

  function stopGpsTracking() {
    if (gpsWatchId != null && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(gpsWatchId);
      } catch (e) {}
      gpsWatchId = null;
    }
  }

  /** Gán tọa độ số (đồng bộ với payload gửi /predict). */
  function applyLiveGpsCoords(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    currentLocation = { lat: la, lng: lo };
    const geoText = $("#rec-gps");
    if (geoText) geoText.textContent = la.toFixed(6) + ", " + lo.toFixed(6);
  }

  /** Chờ lần định vị đầu tiên — tránh predict chạy khi latitude/longitude chưa có (JSON bị thiếu/null → DB sai). */
  function waitInitialGps(maxMs) {
    const limit = typeof maxMs === "number" ? maxMs : 12000;
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve();
        return;
      }
      const finish = () => resolve();
      const to = window.setTimeout(finish, limit);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(to);
          applyLiveGpsCoords(pos.coords.latitude, pos.coords.longitude);
          finish();
        },
        () => {
          window.clearTimeout(to);
          finish();
        },
        { enableHighAccuracy: false, timeout: limit, maximumAge: 0 }
      );
    });
  }

  function startGpsTracking() {
    stopGpsTracking();
    if (!navigator.geolocation) return;
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => applyLiveGpsCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        const geoText = $("#rec-gps");
        if (geoText && !currentLocation) geoText.textContent = "Không lấy được GPS";
      },
      { enableHighAccuracy: false, maximumAge: 4000, timeout: 15000 }
    );
  }

  /** Bật camera chỉ khi đã chọn cả lớp và môn học (môn học bắt buộc). */
  function updateLiveCameraGate() {
    const classSel = $("#live-class-id");
    const subjSel = $("#live-subject-id");
    const btnStart = $("#btnStartCam");
    const btnStop = $("#btnStopCam");
    const hasClass = !!(classSel && String(classSel.value || "").trim());
    const hasSubject = !!(subjSel && String(subjSel.value || "").trim());
    const canStart = hasClass && hasSubject;
    if (btnStart) btnStart.disabled = camOn ? true : !canStart;
    if (btnStop) btnStop.disabled = !camOn;
  }

  $("#live-class-id")?.addEventListener("change", () => {
    updateLiveCameraGate();
  });
  $("#live-subject-id")?.addEventListener("change", () => {
    updateLiveCameraGate();
  });

  const cameraStage = $("#camera-stage");
  const liveVideo = $("#live-video");
  const liveCanvas = $("#live-canvas");
  const liveBoxLayer = $("#live-box-layer");
  const camBadge = $("#cam-badge");
  const sessionFeed = $("#session-feed");
  const multiRecognitionList = $("#multi-recognition-list");

  function toConfidencePercent(confidence, confidencePercent) {
    if (confidencePercent != null && !Number.isNaN(Number(confidencePercent))) {
      const p = Number(confidencePercent);
      return p > 1 ? p : p * 100;
    }
    if (confidence != null && !Number.isNaN(Number(confidence))) {
      const c = Number(confidence);
      return c <= 1 ? c * 100 : c;
    }
    return null;
  }

  function updateResultPanel(data) {
    const nameEl = $("#rName");
    const mssvEl = $("#rMssv");
    const confEl = $("#rConf");
    const statusEl = $("#rStatus");
    if (nameEl) nameEl.innerText = (data && (data.name || data.full_name)) || "";
    if (mssvEl) mssvEl.innerText = (data && (data.mssv || data.student_code)) || "";
    const confPctRaw = data ? toConfidencePercent(data.confidence, data.confidence_percent) : null;
    const confPct = confPctRaw != null ? Math.round(confPctRaw * 10) / 10 : null;
    if (confEl) confEl.innerText = confPct != null ? confPct + "%" : "";
    if (statusEl) {
      statusEl.innerText = "";
      statusEl.style.color = "";
    }
  }

  function renderMultiRecognitionList(matches) {
    if (!multiRecognitionList) return;
    const rows = Array.isArray(matches) ? matches : [];
    if (!rows.length) {
      multiRecognitionList.innerHTML = '<li><span>—</span><span class="text-muted">—</span></li>';
      return;
    }
    multiRecognitionList.innerHTML = "";
    for (const m of rows) {
      const name = m.full_name || m.name || "";
      const mssv = m.student_code || m.mssv || "";
      const conf = m.confidence_percent != null ? Number(m.confidence_percent) : Math.round(Number(m.confidence || 0) * 1000) / 10;
      const li = document.createElement("li");
      li.innerHTML =
        "<span><strong>" +
        esc(name || mssv) +
        "</strong><span class=\"text-muted\" style=\"margin-left:0.35rem\">" +
        esc(mssv) +
        "</span></span><span class=\"text-muted\">" +
        esc(conf.toFixed(1) + "%") +
        "</span>";
      multiRecognitionList.appendChild(li);
    }
  }

  function renderFaceBoxes(matches) {
    if (!liveBoxLayer || !liveVideo || !cameraStage) return;
    liveBoxLayer.innerHTML = "";
    const rows = Array.isArray(matches) ? matches : [];
    if (!rows.length || !liveVideo.videoWidth || !liveVideo.videoHeight) return;

    const containerW = cameraStage.clientWidth;
    const containerH = cameraStage.clientHeight;
    const videoW = liveVideo.videoWidth;
    const videoH = liveVideo.videoHeight;

    const scale = Math.max(containerW / videoW, containerH / videoH);
    const renderedW = videoW * scale;
    const renderedH = videoH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;

    for (const m of rows) {
      const b = m && m.bbox ? m.bbox : null;
      if (!b) continue;
      const x = offsetX + Number(b.x || 0) * scale;
      const y = offsetY + Number(b.y || 0) * scale;
      const w = Number(b.w || 0) * scale;
      const h = Number(b.h || 0) * scale;
      if (w <= 0 || h <= 0) continue;

      const box = document.createElement("div");
      box.className = "live-face-box";
      box.style.left = x + "px";
      box.style.top = y + "px";
      box.style.width = w + "px";
      box.style.height = h + "px";

      const tag = document.createElement("span");
      tag.className = "live-face-tag";
      const boxPctRaw = toConfidencePercent(m.confidence, m.confidence_percent);
      const boxPct = boxPctRaw != null ? Math.round(boxPctRaw * 10) / 10 : null;
      tag.textContent =
        String(m.full_name || m.name || m.student_code || m.mssv || "") + (boxPct != null ? " " + boxPct + "%" : "");
      box.appendChild(tag);
      liveBoxLayer.appendChild(box);
    }
  }

  function appendSessionLine(text, sub) {
    if (!sessionFeed) return;
    const li = document.createElement("li");
    li.innerHTML = "<span>" + text + "</span><span class=\"text-muted\">" + sub + "</span>";
    sessionFeed.prepend(li);
    while (sessionFeed.children.length > 8) sessionFeed.lastChild.remove();
  }

  function setRecognitionUI(payload, snapDataUrl) {
    const nameEl = $("#rec-name");
    const idEl = $("#rec-id");
    const confEl = $("#rec-conf");
    const bar = $("#conf-bar-inner");
    const thumb = $("#rec-thumb");
    const thumbPh = $("#rec-thumb-ph");
    const hasRecognition =
      !!payload &&
      (payload.face_detected === true ||
        !!payload.student_code ||
        !!payload.mssv ||
        !!payload.full_name ||
        !!payload.name);
    if (!hasRecognition) {
      if (nameEl) nameEl.textContent = "—";
      if (idEl) idEl.textContent = "—";
      if (confEl) confEl.textContent = "—";
      if (bar) bar.style.width = "0%";
      if (thumb) {
        thumb.style.display = "none";
        thumb.removeAttribute("src");
      }
      if (thumbPh) thumbPh.style.display = "block";
      lastRecognition = null;
      return;
    }
    const pctRaw = toConfidencePercent(payload.confidence, payload.confidence_percent);
    const pct = pctRaw != null ? Math.round(pctRaw * 10) / 10 : 0;
    if (nameEl) nameEl.textContent = payload.full_name || "(Chưa có trong DB)";
    if (idEl) idEl.textContent = payload.student_code || "—";
    if (confEl) confEl.textContent = pct + "%";
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (thumb && snapDataUrl) {
      if (thumbPh) thumbPh.style.display = "none";
      thumb.style.display = "block";
      thumb.src = snapDataUrl;
    }
    lastRecognition = {
      student_code: payload.student_code,
      full_name: payload.full_name,
      confidence: payload.confidence,
      class_code: $("#reg-class")?.value || null,
    };
  }

  function captureFrame() {
    if (!liveVideo || !liveCanvas) return null;
    const w = liveVideo.videoWidth;
    const h = liveVideo.videoHeight;
    if (!w || !h) return null;
    liveCanvas.width = w;
    liveCanvas.height = h;
    const ctx = liveCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(liveVideo, 0, 0, w, h);
    return liveCanvas.toDataURL("image/jpeg", 0.82);
  }

  async function captureAndSend() {
    if (!camOn) return;
    const image = captureFrame();
    if (!image) return;
    lastSnap = image;
    try {
      const subjRaw = ($("#live-subject-id")?.value || "").trim();
      const predictBody = {
        image,
        subject_id: subjRaw || null,
      };
      // Luôn gửi key latitude/longitude (number hoặc null) để backend parse float đúng — không omit undefined.
      if (
        currentLocation &&
        Number.isFinite(Number(currentLocation.lat)) &&
        Number.isFinite(Number(currentLocation.lng))
      ) {
        predictBody.latitude = Number(currentLocation.lat);
        predictBody.longitude = Number(currentLocation.lng);
      } else {
        predictBody.latitude = null;
        predictBody.longitude = null;
      }
      const data = await apiJson("/predict", {
        method: "POST",
        body: JSON.stringify(predictBody),
      });
      if (String(data?.status || "").toLowerCase() === "fail") {
        const failMsg = String(data?.message || "");
        if (failMsg.includes("đúng vị trí")) openGpsFailModal();
        else showToast(failMsg || "Điểm danh thất bại", "error");
        const statusEl = $("#rStatus");
        if (statusEl) {
          statusEl.innerText = "Điểm danh thất bại";
          statusEl.style.color = "var(--danger)";
        }
        if (camBadge) camBadge.textContent = failMsg || "Điểm danh thất bại";
        return;
      }
      const matches = Array.isArray(data && data.matches) ? data.matches : [];
      const first = matches.length ? matches[0] : data;
      setRecognitionUI(first, image);
      updateResultPanel(first);
      renderMultiRecognitionList(matches);
      renderFaceBoxes(matches);

      const conf = Number(first && first.confidence != null ? first.confidence : 0) || 0;
      const statusEl = $("#rStatus");

      const newAttendance = Array.isArray(data && data.new_attendance) ? data.new_attendance : [];
      const duplicateAttendance = Array.isArray(data && data.duplicate_attendance) ? data.duplicate_attendance : [];

      // Chỉ báo "điểm danh thành công" khi backend xác nhận đã ghi nhận.
      if (newAttendance.length > 0) {
        if (statusEl) {
          statusEl.innerText = "Điểm danh thành công";
          statusEl.style.color = "var(--success)";
        }
      } else if (duplicateAttendance.length > 0) {
        if (statusEl) {
          statusEl.innerText = "Đã điểm danh trước đó";
          statusEl.style.color = "var(--warning)";
        }
      } else if (matches.length > 0) {
        if (statusEl) {
          statusEl.innerText = "Nhận diện thành công (chưa ghi nhận)";
          statusEl.style.color = "var(--danger)";
        }
      } else {
        if (statusEl) {
          statusEl.innerText = "Điểm danh thất bại";
          statusEl.style.color = "var(--danger)";
        }
      }
      if (newAttendance.length) {
        appendSessionLine(newAttendance.join(", "), "Mới điểm danh");
        const sid = ($("#live-subject-id")?.value || "").trim();
        if (
          sid &&
          location.hash === "#subject-attendance" &&
          currentSubjectAttendanceId &&
          String(currentSubjectAttendanceId) === String(sid)
        ) {
          loadSubjectAttendance();
        }
      }
      if (duplicateAttendance.length) {
        appendSessionLine(duplicateAttendance.join(", "), "Đã ghi nhận trước đó");
      }
      if (camBadge) camBadge.textContent = matches.length ? "Đã nhận diện" : "Đang nhận diện...";
      cameraStage?.classList.remove("matched");
    } catch (e) {
      if (camBadge) camBadge.textContent = "Lỗi API";
      // tránh spam toast liên tục
    }
  }

  async function tickPredictOnce() {
    if (!camOn) return;
    if (detecting) return;
    detecting = true;
    try {
      await captureAndSend();
    } finally {
      detecting = false;
    }
  }

  async function startLiveCamera() {
    if (!liveVideo) return;
    // Chỉ cần lớp; nút đã disable khi chưa chọn — không modal, không bắt buộc môn.
    const cls = ($("#live-class-id")?.value || "").trim();
    const subj = ($("#live-subject-id")?.value || "").trim();
    if (!cls || !subj) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      liveVideo.srcObject = stream;
      await liveVideo.play();
      liveVideo.style.display = "block";
      if (camBadge) camBadge.textContent = "Đang nhận diện...";
      cameraStage?.classList.remove("matched");
      camOn = true;
      detecting = false;
      currentLocation = null;
      await waitInitialGps(12000);
      startGpsTracking();
      updateLiveCameraGate();
      // chống lag: không chồng request, 1.2s/lần
      if (predictTimer) clearInterval(predictTimer);
      predictTimer = setInterval(tickPredictOnce, 1200);
    } catch (e) {
      if (camBadge) camBadge.textContent = "Không mở được camera";
      showToast("Không mở được camera: " + (e.message || String(e)), "error");
    }
  }

  /**
   * Tắt stream camera.
   * @param {object} opts
   * @param {boolean} [opts.keepRecognitionResults] — true: chỉ tắt video, giữ Tên/MSSV/độ tin cậy/trạng thái và UI nhận diện.
   * @param {boolean} [opts.clearPanel] — mặc định true nếu không keepRecognitionResults
   * @param {boolean} [opts.resetUi] — mặc định true nếu không keepRecognitionResults
   */
  function stopLiveCamera(opts = {}) {
    const keep = opts.keepRecognitionResults === true;
    const clearPanel = keep ? false : opts.clearPanel !== false;
    const resetUi = keep ? false : opts.resetUi !== false;
    camOn = false;
    detecting = false;
    stopGpsTracking();
    if (predictTimer) {
      clearInterval(predictTimer);
      predictTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (liveVideo) {
      liveVideo.srcObject = null;
      liveVideo.style.display = "none";
    }
    if (liveBoxLayer) liveBoxLayer.innerHTML = "";
    cameraStage?.classList.remove("matched");
    /* Khi chỉ tắt camera, badge không gợi ý đã xóa kết quả nhận diện */
    if (camBadge) camBadge.textContent = keep ? "Camera đã tắt" : "Đang chờ";
    if (resetUi) {
      setRecognitionUI({ face_detected: false }, null);
      renderMultiRecognitionList([]);
      $("#rec-gps").textContent = "Chưa có vị trí";
    }
    if (clearPanel) {
      updateResultPanel({ name: "", mssv: "", confidence: null });
      const statusEl = $("#rStatus");
      if (statusEl) {
        statusEl.innerText = "";
        statusEl.style.color = "";
      }
    }
    updateLiveCameraGate();
  }

  $("#btnStartCam")?.addEventListener("click", async () => startLiveCamera());

  /** Tắt camera: chỉ dừng stream; không reset form Kết quả nhận diện (Tên, MSSV, …). */
  $("#btnStopCam")?.addEventListener("click", () => stopLiveCamera({ keepRecognitionResults: true }));

  /* Hash routing */
  const pathView = (location.pathname.split("/").filter(Boolean).pop() || "").toLowerCase();
  const defaultView = pathView === "students" ? "students" : "dashboard";
  const initial = (location.hash || "#" + defaultView).slice(1);
  $$('input[name="train-mode"]').forEach((el) => el.addEventListener("change", updateTrainModeUI));
  updateTrainModeUI();
  /* Chỉ setView(initial) — mỗi view tự gọi load tương ứng (tránh prefetch trùng + dữ liệu cũ). */
  setView(
    [
      "dashboard",
      "classes",
      "students",
      "subjects",
      "subject-attendance",
      "register",
      "train",
      "live",
      "logs",
      "export",
      "settings",
    ].includes(initial)
      ? initial
      : "dashboard"
  );

  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (
      [
        "dashboard",
        "classes",
        "students",
        "subjects",
        "subject-attendance",
        "register",
        "train",
        "live",
        "logs",
        "export",
        "settings",
      ].includes(h)
    ) {
      setView(h);
    }
  });
})();
