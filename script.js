let currentUser = null;
const STORAGE_KEY = "ipt_demo_v1";

window.db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = JSON.parse(raw);
      if (!window.db.accounts) window.db.accounts = [];
      if (!window.db.departments) window.db.departments = [];
      if (!window.db.employees) window.db.employees = [];
      if (!window.db.requests) window.db.requests = [];
      return;
    }
  } catch (e) {}

  window.db = {
    accounts: [
      {
        id: crypto.randomUUID(),
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "Password123!",
        role: "admin",
        verified: true
      }
    ],
    departments: [
      { id: crypto.randomUUID(), name: "Engineering", description: "Builds stuff" },
      { id: crypto.randomUUID(), name: "HR", description: "People ops" }
    ],
    employees: [],
    requests: []
  };

  saveToStorage();
}

function setAuthState(isAuth, user = null) {
  const body = document.body;

  if (isAuth && user) {
    currentUser = user;
    body.classList.remove("not-authenticated");
    body.classList.add("authenticated");

    if (user.role === "admin") body.classList.add("is-admin");
    else body.classList.remove("is-admin");

    updateAccountDropdownLabel();
  } else {
    currentUser = null;
    body.classList.remove("authenticated", "is-admin");
    body.classList.add("not-authenticated");
    updateAccountDropdownLabel();
  }
}

function updateAccountDropdownLabel() {
  const toggle = document.querySelector(".role-logged-in .dropdown-toggle");
  if (!toggle) return;

  if (!currentUser) {
    toggle.textContent = "Account";
    return;
  }

  toggle.textContent = `${currentUser.firstName} ${currentUser.lastName}`.trim();
}

function navigateTo(hash) {
  window.location.hash = hash.startsWith("#") ? hash : `#${hash}`;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");
}

function showLoginVerifiedMsgIfNeeded() {
  const alertEl = document.querySelector("#login-page .alert");
  if (!alertEl) return;

  const flag = sessionStorage.getItem("just_verified");
  if (flag === "1") {
    alertEl.style.display = "block";
    sessionStorage.removeItem("just_verified");
  } else {
    alertEl.style.display = "none";
  }
}

function handleRouting() {
  let hash = window.location.hash || "#/";
  if (hash === "#") hash = "#/";
  const route = hash.replace("#/", "");

  const protectedRoutes = ["dashboard", "profile", "requests", "employees", "departments", "accounts"];
  const adminRoutes = ["employees", "departments", "accounts"];

  if (protectedRoutes.includes(route) && !currentUser) {
    navigateTo("#/login");
    return;
  }

  if (adminRoutes.includes(route) && currentUser && currentUser.role !== "admin") {
    navigateTo("#/dashboard");
    return;
  }

  switch (route) {
    case "":
      showPage("home-page");
      break;

    case "dashboard":
      showPage("dashboard-page");
      renderDashboard();
      break;

    case "login":
      showPage("login-page");
      showLoginVerifiedMsgIfNeeded();
      break;

    case "register":
      showPage("register-page");
      break;

    case "verify-email":
      showPage("verify-email-page");
      renderVerifyEmailMsg();
      break;

    case "profile":
      showPage("profile-page");
      renderProfile();
      break;

    case "requests":
      showPage("requests-page");
      renderRequestsTable();
      break;

    case "employees":
      showPage("employees-page");
      renderDepartmentsDropdown();
      renderEmployeesTable();
      break;

    case "departments":
      showPage("departments-page");
      renderDepartmentsTable();
      break;

    case "accounts":
      showPage("accounts-page");
      renderAccountsTable();
      break;

    case "logout":
      doLogout();
      break;

    default:
      showPage("home-page");
  }
}

function renderDashboard() {
  const h = document.getElementById("dashWelcome");
  const p = document.getElementById("dashSub");
  if (!h || !p) return;

  if (!currentUser) {
    h.textContent = "Welcome";
    p.textContent = "Please log in.";
    return;
  }

  h.textContent = `Welcome, ${currentUser.firstName}!`;
  p.textContent =
    currentUser.role === "admin"
      ? "You are logged in as Admin. Manage the system using the dropdown."
      : "You are logged in. Submit and track your requests.";
}

function doLogout() {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  navigateTo("#/");
}

function initAuthFromToken() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    setAuthState(false);
    return;
  }

  const user = window.db.accounts.find(a => a.email === token);
  if (!user) {
    localStorage.removeItem("auth_token");
    setAuthState(false);
    return;
  }

  setAuthState(true, user);
}

function renderProfile() {
  const box = document.querySelector("#profile-page .border");
  if (!box || !currentUser) return;

  box.innerHTML = `
    <h4 id="profName">${currentUser.firstName} ${currentUser.lastName}</h4>
    <p><span>Email : </span> ${currentUser.email}</p>
    <p><span>Role : </span> ${currentUser.role}</p>
    <button id="editProfileBtn" class="text-primary border-primary rounded-3 p-1">Edit Profile</button>

    <div id="editProfileForm" class="mt-3 d-none">
      <div class="mb-2">
        <label class="form-label">First Name</label>
        <input id="editFirst" class="form-control" value="${currentUser.firstName}">
      </div>
      <div class="mb-2">
        <label class="form-label">Last Name</label>
        <input id="editLast" class="form-control" value="${currentUser.lastName}">
      </div>
      <button id="saveProfileBtn" class="btn btn-primary ">Save</button>
      <button id="cancelProfileBtn" class="btn btn-secondary  ms-2">Cancel</button>
    </div>
  `;

  const editBtn = document.getElementById("editProfileBtn");
  const form = document.getElementById("editProfileForm");
  const saveBtn = document.getElementById("saveProfileBtn");
  const cancelBtn = document.getElementById("cancelProfileBtn");

  editBtn.addEventListener("click", () => {
    form.classList.remove("d-none");
    editBtn.classList.add("d-none");
  });

  cancelBtn.addEventListener("click", () => {
    form.classList.add("d-none");
    editBtn.classList.remove("d-none");
  });

  saveBtn.addEventListener("click", () => {
    const first = document.getElementById("editFirst").value.trim();
    const last = document.getElementById("editLast").value.trim();

    if (first.length < 2 || last.length < 2) return alert("Name too short.");

    const acc = window.db.accounts.find(a => a.email === currentUser.email);
    if (!acc) return;

    acc.firstName = first;
    acc.lastName = last;
    currentUser.firstName = first;
    currentUser.lastName = last;

    saveToStorage();
    updateAccountDropdownLabel();
    renderProfile();
  });
}

function renderVerifyEmailMsg() {
  const email = localStorage.getItem("unverified_email") || "";
  const msg = document.querySelector(".verify-message");
  if (msg) msg.innerHTML = `<span>&#9989;</span> A verification link has been sent to ${email}`;
}

function renderDepartmentsDropdown() {
  const sel = document.getElementById("dept-select");
  if (!sel) return;

  sel.innerHTML = "";
  window.db.departments.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

function renderDepartmentsTable() {
  const tbody = document.querySelector("#departments-page tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  window.db.departments.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.description || ""}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" data-edit="${d.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-del="${d.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Delete this department?")) return;
      window.db.departments = window.db.departments.filter(x => x.id !== id);
      saveToStorage();
      renderDepartmentsTable();
      renderDepartmentsDropdown();
    });
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const dept = window.db.departments.find(x => x.id === id);
      if (!dept) return;
      document.getElementById("department-name").value = dept.name;
      document.getElementById("department-description").value = dept.description || "";
      document.getElementById("departments-page").setAttribute("data-editing", id);
    });
  });
}

function renderEmployeesTable() {
  const tbody = document.querySelector("#employees-page tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  window.db.employees.forEach(e => {
    const dept = window.db.departments.find(d => d.id === e.deptId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.employeeId}</td>
      <td>${e.email}</td>
      <td>${e.position}</td>
      <td>${dept ? dept.name : ""}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" data-edit="${e.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-del="${e.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Delete this employee?")) return;
      window.db.employees = window.db.employees.filter(x => x.id !== id);
      saveToStorage();
      renderEmployeesTable();
    });
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const emp = window.db.employees.find(x => x.id === id);
      if (!emp) return;

      document.getElementById("employee-id").value = emp.employeeId;
      document.getElementById("employee-email").value = emp.email;
      document.getElementById("employee-position").value = emp.position;
      document.getElementById("dept-select").value = emp.deptId;
      document.getElementById("hire-date").value = emp.hireDate || "";

      document.getElementById("employees-page").setAttribute("data-editing", id);
    });
  });
}

function renderAccountsTable() {
  const tbody = document.querySelector("#accounts-page tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  window.db.accounts.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.firstName} ${a.lastName}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.verified ? "✓" : "—"}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" data-edit="${a.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-warning me-2" data-reset="${a.id}">Reset Password</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-del="${a.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      const acc = window.db.accounts.find(x => x.id === id);
      if (!acc) return;

      if (currentUser && acc.email === currentUser.email) {
        alert("You cannot delete your own account.");
        return;
      }

      if (!confirm("Delete this account?")) return;
      window.db.accounts = window.db.accounts.filter(x => x.id !== id);
      saveToStorage();
      renderAccountsTable();
    });
  });

  tbody.querySelectorAll("[data-reset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-reset");
      const acc = window.db.accounts.find(x => x.id === id);
      if (!acc) return;

      const pw = prompt("Enter new password (min 6 chars):");
      if (!pw || pw.length < 6) return alert("Password too short.");
      acc.password = pw;
      saveToStorage();
      renderAccountsTable();
    });
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const acc = window.db.accounts.find(x => x.id === id);
      if (!acc) return;

      document.getElementById("account-firstname").value = acc.firstName;
      document.getElementById("account-lastname").value = acc.lastName;
      document.getElementById("account-email").value = acc.email;
      document.getElementById("account-password").value = acc.password;
      document.getElementById("role").value = acc.role;
      document.getElementById("verify").checked = !!acc.verified;

      document.getElementById("accounts-page").setAttribute("data-editing", id);
    });
  });
}

function renderRequestsTable() {
  const tbody = document.getElementById("requestTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const list = currentUser
    ? window.db.requests.filter(r => r.employeeEmail === currentUser.email)
    : [];

  list.forEach(r => {
    const itemsTxt = (r.items || []).map(i => `${i.name} (x${i.qty})`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date || ""}</td>
      <td>${r.type || ""}</td>
      <td>${itemsTxt}</td>
      <td><span class="badge bg-warning text-dark">${r.status || "Pending"}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function wireInlineRequestForm() {
  const form = document.getElementById("requestInlineForm");
  const itemsBox = document.getElementById("requestInlineItems");
  const addBtn = document.getElementById("addInlineItem");
  const nameEl = document.getElementById("requestItemName");
  const qtyEl = document.getElementById("requestItemQty");
  const typeEl = document.getElementById("requestTypeInline");

  if (!form || !itemsBox || !addBtn || !nameEl || !qtyEl || !typeEl) return;

  function addItem(name, qty) {
    const row = document.createElement("div");
    row.className = "d-flex gap-2 align-items-center mb-2 req-inline-row";
    row.innerHTML = `
      <div class="flex-grow-1">${name} (x${qty})</div>
      <button type="button" class="btn btn-outline-danger btn-sm req-inline-remove">x</button>
    `;
    row.dataset.name = name;
    row.dataset.qty = qty;
    itemsBox.appendChild(row);
  }

  addBtn.addEventListener("click", () => {
    const name = nameEl.value.trim();
    const qty = parseInt(qtyEl.value, 10) || 1;
    if (!name) return;

    addItem(name, qty);
    nameEl.value = "";
    qtyEl.value = "1";
    nameEl.focus();
  });

  itemsBox.addEventListener("click", e => {
    if (e.target.classList.contains("req-inline-remove")) {
      e.target.closest(".req-inline-row")?.remove();
    }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentUser) return alert("Please log in first.");

    const rows = [...itemsBox.querySelectorAll(".req-inline-row")];
    const items = rows.map(r => ({ name: r.dataset.name, qty: parseInt(r.dataset.qty, 10) || 1 }));

    if (items.length === 0) return alert("Add at least 1 item.");

    window.db.requests.push({
      id: crypto.randomUUID(),
      employeeEmail: currentUser.email,
      date: new Date().toLocaleDateString(),
      type: typeEl.value,
      items,
      status: "Pending"
    });

    saveToStorage();
    itemsBox.innerHTML = "";
    renderRequestsTable();
  });
}

function wireRequestModal() {
  const overlay = document.getElementById("reqOverlay");
  const modal = document.getElementById("reqModal");
  const closeBtn = document.getElementById("closeReqModal");
  const form = document.getElementById("reqForm");
  const itemsBox = document.getElementById("reqItems");
  const addBtn = document.getElementById("addReqItem");
  const typeSel = document.getElementById("reqType");

  if (!overlay || !modal || !closeBtn || !form || !itemsBox || !addBtn || !typeSel) return;

  function open() {
    overlay.classList.remove("d-none");
    modal.classList.remove("d-none");
    itemsBox.innerHTML = "";
    addRow();
  }

  function close() {
    overlay.classList.add("d-none");
    modal.classList.add("d-none");
  }

  function addRow() {
    const row = document.createElement("div");
    row.className = "req-row d-flex gap-2 mb-2 align-items-center";
    row.innerHTML = `
      <input class="form-control req-name" placeholder="Item name">
      <input class="form-control req-qty" type="number" min="1" value="1" style="max-width:90px;">
      <button type="button" class="btn btn-outline-danger req-remove">x</button>
    `;
    itemsBox.appendChild(row);
  }

  document.querySelectorAll("[data-open-request]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      open();
    });
  });

  addBtn.addEventListener("click", addRow);

  itemsBox.addEventListener("click", e => {
    if (e.target.classList.contains("req-remove")) {
      e.target.closest(".req-row")?.remove();
    }
  });

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentUser) return alert("Please log in first.");

    const items = [...itemsBox.querySelectorAll(".req-row")]
      .map(r => {
        const name = r.querySelector(".req-name")?.value.trim() || "";
        const qty = parseInt(r.querySelector(".req-qty")?.value, 10) || 1;
        return { name, qty };
      })
      .filter(x => x.name);

    if (items.length === 0) return alert("Add at least 1 item.");

    window.db.requests.push({
      id: crypto.randomUUID(),
      employeeEmail: currentUser.email,
      date: new Date().toLocaleDateString(),
      type: typeSel.value,
      items,
      status: "Pending"
    });

    saveToStorage();
    close();
    renderRequestsTable();
  });
}

function wireEvents() {
  const getStarted = document.querySelector("#home-page .submit");
  if (getStarted) getStarted.addEventListener("click", () => navigateTo("#/login"));

  const regForm = document.querySelector("#register-page form");
  if (regForm) {
    regForm.addEventListener("submit", e => {
      e.preventDefault();

      const firstName = document.getElementById("first_name").value.trim();
      const lastName = document.getElementById("last_name").value.trim();
      const email = document.getElementById("email1").value.trim().toLowerCase();
      const password = document.getElementById("Password1").value;

      if (firstName.length < 2 || lastName.length < 2) return alert("Name too short.");
      if (!email) return alert("Email required.");
      if (!password || password.length < 6) return alert("Password must be at least 6 chars.");
      if (window.db.accounts.some(a => a.email === email)) return alert("Email already registered.");

      window.db.accounts.push({
        id: crypto.randomUUID(),
        firstName,
        lastName,
        email,
        password,
        role: "user",
        verified: false
      });

      saveToStorage();
      localStorage.setItem("unverified_email", email);
      navigateTo("#/verify-email");
    });
  }

  const verifyPage = document.getElementById("verify-email-page");
  if (verifyPage) {
    const btns = verifyPage.querySelectorAll("button");
    const simulateBtn = btns[0];
    const goLoginBtn = btns[1];

    simulateBtn?.addEventListener("click", () => {
      const email = localStorage.getItem("unverified_email");
      const acc = window.db.accounts.find(a => a.email === email);
      if (!acc) return alert("No pending email found.");
      acc.verified = true;
      saveToStorage();

      sessionStorage.setItem("just_verified", "1");
      navigateTo("#/login");
    });

    goLoginBtn?.addEventListener("click", () => navigateTo("#/login"));
  }

  const loginBtn = document.querySelector("#login-page button.btn.btn-primary");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;

      const user = window.db.accounts.find(a => a.email === email && a.password === password && a.verified);
      if (!user) return alert("Invalid login or email not verified.");

      localStorage.setItem("auth_token", user.email);
      setAuthState(true, user);
      navigateTo("#/dashboard");
    });
  }

  const deptForm = document.querySelector("#departments-page form");
  if (deptForm) {
    deptForm.addEventListener("submit", e => {
      e.preventDefault();

      const name = document.getElementById("department-name").value.trim();
      const desc = document.getElementById("department-description").value.trim();
      if (!name) return alert("Department name required.");

      const page = document.getElementById("departments-page");
      const editingId = page.getAttribute("data-editing");

      if (editingId) {
        const dept = window.db.departments.find(d => d.id === editingId);
        if (dept) {
          dept.name = name;
          dept.description = desc;
        }
        page.removeAttribute("data-editing");
      } else {
        window.db.departments.push({ id: crypto.randomUUID(), name, description: desc });
      }

      saveToStorage();
      deptForm.reset();
      renderDepartmentsTable();
      renderDepartmentsDropdown();
    });
  }

  const empForm = document.querySelector("#employees-page form");
  if (empForm) {
    empForm.addEventListener("submit", e => {
      e.preventDefault();

      const employeeId = document.getElementById("employee-id").value.trim();
      const email = document.getElementById("employee-email").value.trim().toLowerCase();
      const position = document.getElementById("employee-position").value.trim();
      const deptId = document.getElementById("dept-select").value;
      const hireDate = document.getElementById("hire-date").value;

      if (!employeeId) return alert("Employee ID required.");
      if (!email) return alert("User Email required.");
      if (!position) return alert("Position required.");
      if (!deptId) return alert("Department required.");

      const account = window.db.accounts.find(a => a.email === email);
      if (!account) return alert("That email is not registered in Accounts.");

      const page = document.getElementById("employees-page");
      const editingId = page.getAttribute("data-editing");

      if (editingId) {
        const emp = window.db.employees.find(x => x.id === editingId);
        if (emp) {
          emp.employeeId = employeeId;
          emp.email = email;
          emp.position = position;
          emp.deptId = deptId;
          emp.hireDate = hireDate;
        }
        page.removeAttribute("data-editing");
      } else {
        window.db.employees.push({
          id: crypto.randomUUID(),
          employeeId,
          email,
          position,
          deptId,
          hireDate
        });
      }

      saveToStorage();
      empForm.reset();
      renderEmployeesTable();
    });
  }

  const accForm = document.querySelector("#accounts-page form");
  if (accForm) {
    accForm.addEventListener("submit", e => {
      e.preventDefault();

      const firstName = document.getElementById("account-firstname").value.trim();
      const lastName = document.getElementById("account-lastname").value.trim();
      const email = document.getElementById("account-email").value.trim().toLowerCase();
      const password = document.getElementById("account-password").value;
      const role = document.getElementById("role").value.trim() || "user";
      const verified = document.getElementById("verify").checked;

      if (firstName.length < 2 || lastName.length < 2) return alert("Name too short.");
      if (!email) return alert("Email required.");
      if (!password || password.length < 6) return alert("Password must be at least 6 chars.");

      const page = document.getElementById("accounts-page");
      const editingId = page.getAttribute("data-editing");

      if (editingId) {
        const acc = window.db.accounts.find(x => x.id === editingId);
        if (acc) {
          acc.firstName = firstName;
          acc.lastName = lastName;
          acc.email = email;
          acc.password = password;
          acc.role = role;
          acc.verified = verified;
        }
        page.removeAttribute("data-editing");
      } else {
        if (window.db.accounts.some(a => a.email === email)) return alert("Email already registered.");
        window.db.accounts.push({
          id: crypto.randomUUID(),
          firstName,
          lastName,
          email,
          password,
          role,
          verified
        });
      }

      saveToStorage();
      accForm.reset();
      renderAccountsTable();
    });
  }
}


document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
  initAuthFromToken();
  wireEvents();
  wireRequestModal();
  wireInlineRequestForm(); 

  window.addEventListener("hashchange", handleRouting);

  if (!window.location.hash) navigateTo("#/");
  handleRouting();

  renderDepartmentsDropdown();
  renderDepartmentsTable();
  renderEmployeesTable();
  renderAccountsTable();
  renderRequestsTable();
});