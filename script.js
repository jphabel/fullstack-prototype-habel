const STORAGE_KEY = "ipt_demo_v1";

let db = { accounts: [], departments: [], employees: [], requests: [] };
let currentUser = null;

/* storage */
function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      db = {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        departments: Array.isArray(parsed.departments) ? parsed.departments : [],
        employees: Array.isArray(parsed.employees) ? parsed.employees : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      };
      return;
    } catch {}
  }

  db = {
    accounts: [
      {
        id: crypto.randomUUID(),
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "Password123!",
        role: "admin",
        verified: true,
      },
    ],
    departments: [
      { id: crypto.randomUUID(), name: "Engineering", description: "Engineering Dept" },
      { id: crypto.randomUUID(), name: "HR", description: "Human Resources Dept" },
    ],
    employees: [],
    requests: [],
  };

  saveDB();
}

/* auth ui */
function setAuth(isAuth, user = null) {
  const body = document.body;

  if (isAuth) {
    currentUser = user;
    body.classList.remove("not-authenticated");
    body.classList.add("authenticated");
    if (user.role === "admin") body.classList.add("is-admin");
    else body.classList.remove("is-admin");

    localStorage.setItem("auth_token", user.email);

    updateUserDropdownLabel();
    renderProfile();
  } else {
    currentUser = null;
    body.classList.remove("authenticated", "is-admin");
    body.classList.add("not-authenticated");
    localStorage.removeItem("auth_token");

    updateUserDropdownLabel();
  }
}

function initAuthFromToken() {
  const token = (localStorage.getItem("auth_token") || "").toLowerCase();
  if (!token) return setAuth(false);

  const user = db.accounts.find((a) => a.email.toLowerCase() === token);
  if (!user) return setAuth(false);

  setAuth(true, user);
}

function updateUserDropdownLabel() {
  const toggles = document.querySelectorAll(".role-logged-in .dropdown-toggle");
  let userToggle = null;

  toggles.forEach((t) => {
    const li = t.closest("li");
    if (li && li.querySelector('a[href="#/profile"]')) userToggle = t;
  });

  if (!userToggle) return;
  userToggle.textContent = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : "User";
}

/* routing */
function navigateTo(route) {
  const r = route.startsWith("/") ? route : `/${route}`;
  window.location.hash = `#${r}`;
}

function getRoute() {
  const h = window.location.hash || "";
  if (h === "" || h === "#" || h === "#/") return "/";
  if (h.startsWith("#/")) return h.slice(2).trim() || "/";
  return h.startsWith("#") ? h.slice(1).trim() : h.trim();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
}

function handleRouting() {
  if (!window.location.hash || window.location.hash === "#") window.location.hash = "#/";

  const route = getRoute();

  if (route === "logout") {
    setAuth(false);
    navigateTo("/");
    return;
  }

  const protectedRoutes = new Set(["profile", "requests", "employees", "departments", "accounts"]);
  const adminRoutes = new Set(["employees", "departments", "accounts"]);

  if (route !== "/" && protectedRoutes.has(route) && !currentUser) {
    navigateTo("/login");
    return;
  }

  if (route !== "/" && adminRoutes.has(route) && (!currentUser || currentUser.role !== "admin")) {
    navigateTo("/profile");
    return;
  }

  const pageId = route === "/" ? "home-page" : `${route}-page`;
  showPage(pageId);

  if (route === "profile") renderProfile();
  if (route === "requests") renderRequests();
  if (route === "verify-email") renderVerifyMessage();
}

/* register */
function registerAccount(e) {
  e.preventDefault();

  const first = (document.getElementById("first_name")?.value || "").trim();
  const last = (document.getElementById("last_name")?.value || "").trim();
  const email = (document.getElementById("email1")?.value || "").trim().toLowerCase();
  const pass = document.getElementById("Password1")?.value || "";

  if (!first || !last || !email) return alert("Fill in first name, last name, email.");
  if (pass.length < 6) return alert("Password must be at least 6 characters.");

  if (db.accounts.some((a) => a.email.toLowerCase() === email)) return alert("Email already exists.");

  db.accounts.push({
    id: crypto.randomUUID(),
    firstName: first,
    lastName: last,
    email,
    password: pass,
    role: "user",
    verified: false,
  });

  saveDB();
  localStorage.setItem("unverified_email", email);
  navigateTo("/verify-email");
}

/* verify */
function renderVerifyMessage() {
  const email = localStorage.getItem("unverified_email") || "";
  const p = document.querySelector("#verify-email-page .verify-message");
  if (p) p.innerHTML = `<span>&#9989;</span> A verification link has been sent to ${email}`;
}

function simulateVerify() {
  const email = (localStorage.getItem("unverified_email") || "").toLowerCase();
  if (!email) return alert("Register first.");

  const acc = db.accounts.find((a) => a.email.toLowerCase() === email);
  if (!acc) return alert("Account not found.");

  acc.verified = true;
  saveDB();
  localStorage.removeItem("unverified_email");

  sessionStorage.setItem("just_verified", "1");
  navigateTo("/login");
}

/* login */
function showLoginVerifiedMsg(show) {
  const p = document.querySelector("#login-page .alert");
  if (p) p.style.display = show ? "block" : "none";
}

function login() {
  const email = (document.getElementById("login-email")?.value || "").trim().toLowerCase();
  const pass = document.getElementById("login-password")?.value || "";

  const user = db.accounts.find(
    (a) => a.email.toLowerCase() === email && a.password === pass && a.verified === true
  );

  if (!user) return alert("Invalid login or email not verified.");
  setAuth(true, user);
  navigateTo("/profile");
}

/* profile + edit modal */
function renderProfile() {
  if (!currentUser) return;

  const page = document.getElementById("profile-page");
  if (!page) return;

  page.querySelector("h4").textContent = `${currentUser.firstName} ${currentUser.lastName}`.trim();

  const ps = page.querySelectorAll("p");
  if (ps[0]) ps[0].innerHTML = `<span>Email : </span> ${currentUser.email}`;
  if (ps[1]) ps[1].innerHTML = `<span>Role : </span> ${currentUser.role}`;

  const btn = page.querySelector("button");
  if (btn) btn.onclick = openEditProfileModal;
}

function ensureEditProfileModal() {
  if (document.getElementById("editProfileModal")) return;

  const div = document.createElement("div");
  div.innerHTML = `
    <div id="editProfileModal" class="modal d-none" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Profile</h5>
            <button type="button" class="btn-close" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">First Name</label>
              <input id="editFirst" class="form-control" type="text">
            </div>
            <div class="mb-3">
              <label class="form-label">Last Name</label>
              <input id="editLast" class="form-control" type="text">
            </div>
            <button id="saveProfileBtn" class="btn btn-primary" type="button">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div.firstElementChild);

  const modal = document.getElementById("editProfileModal");
  modal.querySelector(".btn-close").addEventListener("click", closeEditProfileModal);

  modal.addEventListener("click", (e) => {
    const dialog = modal.querySelector(".modal-dialog");
    if (dialog && !dialog.contains(e.target)) closeEditProfileModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("d-none")) closeEditProfileModal();
  });

  document.getElementById("saveProfileBtn").addEventListener("click", saveProfileEdits);
}

function openEditProfileModal() {
  ensureEditProfileModal();

  document.getElementById("editFirst").value = currentUser.firstName || "";
  document.getElementById("editLast").value = currentUser.lastName || "";

  const modal = document.getElementById("editProfileModal");
  modal.classList.remove("d-none");
  document.body.style.overflow = "hidden";
}

function closeEditProfileModal() {
  const modal = document.getElementById("editProfileModal");
  if (!modal) return;
  modal.classList.add("d-none");
  document.body.style.overflow = "";
}

function saveProfileEdits() {
  const first = (document.getElementById("editFirst").value || "").trim();
  const last = (document.getElementById("editLast").value || "").trim();
  if (!first || !last) return alert("Fill first + last name.");

  const acc = db.accounts.find((a) => a.id === currentUser.id);
  if (!acc) return;

  acc.firstName = first;
  acc.lastName = last;
  saveDB();

  currentUser = acc;
  updateUserDropdownLabel();
  renderProfile();
  closeEditProfileModal();
}

/* requests modal + table */
function openRequestModal() {
  const modal = document.getElementById("requestModal");
  if (!modal) return;
  modal.classList.remove("d-none");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRequestModal() {
  const modal = document.getElementById("requestModal");
  if (!modal) return;
  modal.classList.add("d-none");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initRequestModalUI() {
  const modal = document.getElementById("requestModal");
  const items = document.getElementById("requestItems");
  const submitBtn = document.getElementById("submitRequestBtn");
  if (!modal || !items || !submitBtn) return;

  document.getElementById("openRequestModal")?.addEventListener("click", openRequestModal);
  document.getElementById("openRequestModal2")?.addEventListener("click", openRequestModal);

  modal.querySelector(".btn-close")?.addEventListener("click", closeRequestModal);

  modal.addEventListener("click", (e) => {
    const dialog = modal.querySelector(".modal-dialog");
    if (dialog && !dialog.contains(e.target)) closeRequestModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("d-none")) closeRequestModal();
  });

  items.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.textContent.trim() === "+") {
      const row = document.createElement("div");
      row.className = "input-group";
      row.innerHTML = `
        <input class="form-control" placeholder="Item name">
        <input class="form-control" type="number" value="1" min="1" style="max-width:90px">
        <button class="btn btn-outline-danger" type="button">&times;</button>
      `;
      items.appendChild(row);
      return;
    }

    if (btn.textContent.includes("×") || btn.innerHTML.includes("&times;")) {
      const row = btn.closest(".input-group");
      if (row && items.children.length > 1) row.remove();
    }
  });

  submitBtn.addEventListener("click", submitRequestFromModal);
}

function submitRequestFromModal() {
  if (!currentUser) return navigateTo("/login");

  const type = (document.getElementById("requestType")?.value || "").trim() || "Equipment";

  const itemsWrap = document.getElementById("requestItems");
  const rows = [...itemsWrap.querySelectorAll(".input-group")];

  const items = rows
    .map((r) => {
      const name = (r.querySelector('input[placeholder="Item name"]')?.value || "").trim();
      const qty = Number(r.querySelector('input[type="number"]')?.value || 0);
      return { name, qty };
    })
    .filter((x) => x.name && x.qty > 0);

  if (items.length === 0) return alert("Add at least one item.");

  db.requests.push({
    id: crypto.randomUUID(),
    type,
    items,
    status: "Pending",
    date: new Date().toLocaleDateString(),
    employeeEmail: currentUser.email,
  });

  saveDB();
  closeRequestModal();
  renderRequests();
}

function ensureRequestsTable() {
  const page = document.getElementById("requests-page");
  if (!page) return null;

  const container = page.querySelector(".request-container");
  if (!container) return null;

  let table = container.querySelector("table");
  if (table) return table;

  const wrap = document.createElement("div");
  wrap.className = "mt-3";
  wrap.innerHTML = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Items</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
  container.appendChild(wrap);
  return wrap.querySelector("table");
}

function renderRequests() {
  if (!currentUser) return;

  const table = ensureRequestsTable();
  if (!table) return;

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  const my = db.requests.filter((r) => r.employeeEmail === currentUser.email);

  my.forEach((r) => {
    const itemsText = r.items.map((it) => `${it.name} (x${it.qty})`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(itemsText)}</td>
      <td>${statusBadge(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return `<span class="badge bg-success">Approved</span>`;
  if (s === "rejected") return `<span class="badge bg-danger">Rejected</span>`;
  return `<span class="badge bg-warning text-dark">Pending</span>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

/* handlers */
function initHandlers() {
  document.querySelector("#register-page form")?.addEventListener("submit", registerAccount);

  const verifyBtns = document.querySelectorAll("#verify-email-page button");
  verifyBtns[0]?.addEventListener("click", simulateVerify);
  verifyBtns[1]?.addEventListener("click", () => navigateTo("/login"));

  document.querySelector("#login-page button.btn.btn-primary")?.addEventListener("click", login);

  document.querySelector("#home-page button.submit")?.addEventListener("click", () => {
    if (currentUser) navigateTo("/profile");
    else navigateTo("/register");
  });

  initRequestModalUI();
}

window.addEventListener("hashchange", handleRouting);

document.addEventListener("DOMContentLoaded", () => {
  loadDB();
  initAuthFromToken();
  initHandlers();

  const justVerified = sessionStorage.getItem("just_verified");
  showLoginVerifiedMsg(justVerified === "1");
  if (justVerified === "1") sessionStorage.removeItem("just_verified");

  if (!window.location.hash || window.location.hash === "#") window.location.hash = "#/";
  handleRouting();
});