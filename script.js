const card = document.getElementById("card");
const form = document.getElementById("login-form");
const err = document.getElementById("login-error");
const btn = document.getElementById("login-submit");

window.addEventListener("mousemove", (e) => {
  const x = (window.innerWidth / 2 - e.clientX) / 45;
  const y = (window.innerHeight / 2 - e.clientY) / 45;
  card.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
});

window.addEventListener("mouseleave", () => {
  card.style.transform = "rotateY(0deg) rotateX(0deg)";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();

  err.textContent = "";
  if (!user || !pass) {
    err.textContent = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Đang đăng nhập...";

  window.setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
    err.style.color = "#7bffff";
    err.textContent = "Giao diện demo: bạn có thể gắn API đăng nhập vào đây.";
  }, 550);
});
