const API = 'http://localhost:3000';

let currentUser = null;

function saveToken(token) {
  sessionStorage.setItem('authToken', token);
}

function getToken() {
  return sessionStorage.getItem('authToken');
}

function clearToken() {
  sessionStorage.removeItem('authToken');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function setAuthState(isAuth, user = null) {
  const body = document.body;

  if (isAuth && user) {
    currentUser = user;
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    body.classList.toggle('is-admin', user.role === 'admin');
    updateAccountDropdownLabel();
  } else {
    currentUser = null;
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
    updateAccountDropdownLabel();
  }
}

function updateAccountDropdownLabel() {
  const toggle = document.querySelector('.role-logged-in .dropdown-toggle');
  if (!toggle) return;
  toggle.textContent = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : 'Account';
}

function navigateTo(hash) {
  window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

function showLoginVerifiedMsgIfNeeded() {
  const alertEl = document.querySelector('#login-page .alert');
  if (!alertEl) return;
  const flag = sessionStorage.getItem('just_verified');
  if (flag === '1') {
    alertEl.style.display = 'block';
    sessionStorage.removeItem('just_verified');
  } else {
    alertEl.style.display = 'none';
  }
}

function handleRouting() {
  let hash = window.location.hash || '#/';
  if (hash === '#') hash = '#/';
  const route = hash.replace('#/', '');

  const protectedRoutes = ['dashboard', 'profile', 'requests', 'employees', 'departments', 'accounts'];
  const adminRoutes     = ['employees', 'departments', 'accounts'];

  if (protectedRoutes.includes(route) && !currentUser) {
    navigateTo('#/login');
    return;
  }

  if (adminRoutes.includes(route) && currentUser?.role !== 'admin') {
    navigateTo('#/dashboard');
    return;
  }

  switch (route) {
    case '':
      showPage('home-page');
      break;

    case 'dashboard':
      showPage('dashboard-page');
      renderDashboard();
      break;

    case 'login':
      showPage('login-page');
      showLoginVerifiedMsgIfNeeded();
      break;

    case 'register':
      showPage('register-page');
      break;

    case 'verify-email':
      showPage('verify-email-page');
      renderVerifyEmailMsg();
      break;

    case 'profile':
      showPage('profile-page');
      renderProfile();
      break;

    case 'requests':
      showPage('requests-page');
      loadAndRenderRequests();
      break;

    case 'employees':
      showPage('employees-page');
      loadAndRenderDepartmentsDropdown();
      loadAndRenderEmployees();
      break;

    case 'departments':
      showPage('departments-page');
      loadAndRenderDepartments();
      break;

    case 'accounts':
      showPage('accounts-page');
      loadAndRenderAccounts();
      break;

    case 'logout':
      doLogout();
      break;

    default:
      showPage('home-page');
  }
}

async function initAuthFromToken() {
  if (!getToken()) {
    setAuthState(false);
    return;
  }

  try {
    const res = await fetch(`${API}/api/profile`, {
      headers: authHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      setAuthState(true, data.user);
    } else {
      clearToken();
      setAuthState(false);
    }
  } catch {
    clearToken();
    setAuthState(false);
  }
}

function renderDashboard() {
  const h = document.getElementById('dashWelcome');
  const p = document.getElementById('dashSub');
  if (!h || !p) return;

  if (!currentUser) {
    h.textContent = 'Welcome';
    p.textContent = 'Please log in.';
    return;
  }

  h.textContent = `Welcome, ${currentUser.firstName}!`;
  p.textContent = currentUser.role === 'admin'
    ? 'You are logged in as Admin. Manage the system using the dropdown.'
    : 'You are logged in. Submit and track your requests.';
}

function doLogout() {
  clearToken();
  setAuthState(false);
  navigateTo('#/');
}

function renderProfile() {
  const box = document.querySelector('#profile-page .border');
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
      <button id="saveProfileBtn" class="btn btn-primary">Save</button>
      <button id="cancelProfileBtn" class="btn btn-secondary ms-2">Cancel</button>
    </div>
  `;

  const editBtn   = document.getElementById('editProfileBtn');
  const form      = document.getElementById('editProfileForm');
  const saveBtn   = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelProfileBtn');

  editBtn.addEventListener('click', () => {
    form.classList.remove('d-none');
    editBtn.classList.add('d-none');
  });

  cancelBtn.addEventListener('click', () => {
    form.classList.add('d-none');
    editBtn.classList.remove('d-none');
  });

  saveBtn.addEventListener('click', async () => {
    const first = document.getElementById('editFirst').value.trim();
    const last  = document.getElementById('editLast').value.trim();
    if (first.length < 2 || last.length < 2) return alert('Name too short.');

    try {
      const res = await fetch(`${API}/api/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ firstName: first, lastName: last })
      });

      if (res.ok) {
        currentUser.firstName = first;
        currentUser.lastName  = last;
        updateAccountDropdownLabel();
        renderProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Update failed.');
      }
    } catch {
      alert('Network error. Is the backend running?');
    }
  });
}

function renderVerifyEmailMsg() {
  const email = sessionStorage.getItem('unverified_email') || '';
  const msg   = document.querySelector('.verify-message');
  if (msg) msg.innerHTML = `<span>&#9989;</span> A verification link has been sent to ${email}`;
}

async function loadAndRenderDepartments() {
  try {
    const res   = await fetch(`${API}/api/departments`, { headers: authHeaders() });
    const depts = await res.json();
    renderDepartmentsTable(depts);
    renderDepartmentsDropdown(depts);
  } catch {
    alert('Network error loading departments.');
  }
}

async function loadAndRenderDepartmentsDropdown() {
  try {
    const res   = await fetch(`${API}/api/departments`, { headers: authHeaders() });
    const depts = await res.json();
    renderDepartmentsDropdown(depts);
  } catch {}
}

function renderDepartmentsDropdown(depts = []) {
  const sel = document.getElementById('dept-select');
  if (!sel) return;
  sel.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

function renderDepartmentsTable(depts = []) {
  const tbody = document.querySelector('#departments-page tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  depts.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.description || ''}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" data-edit="${d.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger"       data-del="${d.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this department?')) return;
      const res = await fetch(`${API}/api/departments/${btn.dataset.del}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) loadAndRenderDepartments();
      else alert((await res.json()).error || 'Delete failed.');
    });
  });

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dept = depts.find(d => d.id === btn.dataset.edit);
      if (!dept) return;
      document.getElementById('department-name').value        = dept.name;
      document.getElementById('department-description').value = dept.description || '';
      document.getElementById('departments-page').setAttribute('data-editing', dept.id);
    });
  });
}

async function loadAndRenderEmployees() {
  try {
    const [empRes, deptRes] = await Promise.all([
      fetch(`${API}/api/employees`,   { headers: authHeaders() }),
      fetch(`${API}/api/departments`, { headers: authHeaders() })
    ]);
    const employees   = await empRes.json();
    const departments = await deptRes.json();
    renderEmployeesTable(employees, departments);
    renderDepartmentsDropdown(departments);
  } catch {
    alert('Network error loading employees.');
  }
}

function renderEmployeesTable(employees = [], departments = []) {
  const tbody = document.querySelector('#employees-page tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  employees.forEach(e => {
    const dept = departments.find(d => d.id === e.deptId);
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.employeeId}</td>
      <td>${e.email}</td>
      <td>${e.position}</td>
      <td>${dept ? dept.name : ''}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2" data-edit="${e.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger"       data-del="${e.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this employee?')) return;
      const res = await fetch(`${API}/api/employees/${btn.dataset.del}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) loadAndRenderEmployees();
      else alert((await res.json()).error || 'Delete failed.');
    });
  });

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const emp = employees.find(e => e.id === btn.dataset.edit);
      if (!emp) return;
      document.getElementById('employee-id').value       = emp.employeeId;
      document.getElementById('employee-email').value    = emp.email;
      document.getElementById('employee-position').value = emp.position;
      document.getElementById('dept-select').value       = emp.deptId;
      document.getElementById('hire-date').value         = emp.hireDate || '';
      document.getElementById('employees-page').setAttribute('data-editing', emp.id);
    });
  });
}

async function loadAndRenderAccounts() {
  try {
    const res      = await fetch(`${API}/api/accounts`, { headers: authHeaders() });
    const accounts = await res.json();
    renderAccountsTable(accounts);
  } catch {
    alert('Network error loading accounts.');
  }
}

function renderAccountsTable(accounts = []) {
  const tbody = document.querySelector('#accounts-page tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  accounts.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.firstName} ${a.lastName}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.verified ? '✓' : '—'}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-primary me-2"  data-edit="${a.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-warning me-2" data-reset="${a.id}">Reset Password</button>
        <button type="button" class="btn btn-sm btn-outline-danger"         data-del="${a.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const acc = accounts.find(a => a.id === btn.dataset.del);
      if (!acc) return;
      if (currentUser && acc.email === currentUser.email)
        return alert('You cannot delete your own account.');
      if (!confirm('Delete this account?')) return;

      const res = await fetch(`${API}/api/accounts/${btn.dataset.del}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) loadAndRenderAccounts();
      else alert((await res.json()).error || 'Delete failed.');
    });
  });

  tbody.querySelectorAll('[data-reset]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pw = prompt('Enter new password (min 6 chars):');
      if (!pw || pw.length < 6) return alert('Password too short.');

      const res = await fetch(`${API}/api/accounts/${btn.dataset.reset}/reset-password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: pw })
      });
      if (!res.ok) alert((await res.json()).error || 'Reset failed.');
    });
  });

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = accounts.find(a => a.id === btn.dataset.edit);
      if (!acc) return;
      document.getElementById('account-firstname').value = acc.firstName;
      document.getElementById('account-lastname').value  = acc.lastName;
      document.getElementById('account-email').value     = acc.email;
      document.getElementById('account-password').value  = '';
      document.getElementById('role').value              = acc.role;
      document.getElementById('verify').checked          = !!acc.verified;
      document.getElementById('accounts-page').setAttribute('data-editing', acc.id);
    });
  });
}

async function loadAndRenderRequests() {
  try {
    const res      = await fetch(`${API}/api/requests`, { headers: authHeaders() });
    const requests = await res.json();
    renderRequestsTable(requests);
  } catch {
    alert('Network error loading requests.');
  }
}

function renderRequestsTable(requests = []) {
  const tbody = document.getElementById('requestTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  requests.forEach(r => {
    const itemsTxt = (r.items || []).map(i => `${i.name} (x${i.qty})`).join(', ');
    const badgeClass = { Pending: 'warning text-dark', Approved: 'success', Rejected: 'danger' }[r.status] || 'secondary';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date || ''}</td>
      <td>${r.type || ''}</td>
      <td>${itemsTxt}</td>
      <td><span class="badge bg-${badgeClass}">${r.status || 'Pending'}</span></td>`;
    tbody.appendChild(tr);
  });
}

function wireEvents() {
  const getStarted = document.querySelector('#home-page .submit');
  if (getStarted) getStarted.addEventListener('click', () => navigateTo('#/login'));

  const regForm = document.querySelector('#register-page form');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault();

      const firstName = document.getElementById('first_name').value.trim();
      const lastName  = document.getElementById('last_name').value.trim();
      const email     = document.getElementById('email1').value.trim().toLowerCase();
      const password  = document.getElementById('Password1').value;

      if (firstName.length < 2 || lastName.length < 2) return alert('Name too short.');
      if (!email)                                        return alert('Email required.');
      if (!password || password.length < 6)             return alert('Password must be at least 6 chars.');

      try {
        const res  = await fetch(`${API}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, password })
        });
        const data = await res.json();

        if (res.ok) {
          sessionStorage.setItem('unverified_email', email);
          navigateTo('#/verify-email');
        } else {
          alert(data.error || 'Registration failed.');
        }
      } catch {
        alert('Network error. Is the backend running?');
      }
    });
  }

  const verifyPage = document.getElementById('verify-email-page');
  if (verifyPage) {
    const btns        = verifyPage.querySelectorAll('button');
    const simulateBtn = btns[0];
    const goLoginBtn  = btns[1];

    simulateBtn?.addEventListener('click', async () => {
      const email = sessionStorage.getItem('unverified_email');
      if (!email) return alert('No pending verification found.');

      try {
        const res  = await fetch(`${API}/api/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
          sessionStorage.removeItem('unverified_email');
          sessionStorage.setItem('just_verified', '1');
          navigateTo('#/login');
        } else {
          alert(data.error || 'Verification failed.');
        }
      } catch {
        alert('Network error. Is the backend running?');
      }
    });

    goLoginBtn?.addEventListener('click', () => navigateTo('#/login'));
  }

  const loginBtn = document.querySelector('#login-page button.btn.btn-primary');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email    = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      try {
        const res  = await fetch(`${API}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          saveToken(data.token);
          setAuthState(true, data.user);
          navigateTo('#/dashboard');
        } else {
          alert(data.error || 'Invalid login or email not verified.');
        }
      } catch {
        alert('Network error. Is the backend running?');
      }
    });
  }

  const deptForm = document.querySelector('#departments-page form');
  if (deptForm) {
    deptForm.addEventListener('submit', async e => {
      e.preventDefault();

      const name = document.getElementById('department-name').value.trim();
      const desc = document.getElementById('department-description').value.trim();
      if (!name) return alert('Department name required.');

      const page      = document.getElementById('departments-page');
      const editingId = page.getAttribute('data-editing');
      const url       = editingId ? `${API}/api/departments/${editingId}` : `${API}/api/departments`;
      const method    = editingId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify({ name, description: desc })
        });

        if (res.ok) {
          page.removeAttribute('data-editing');
          deptForm.reset();
          loadAndRenderDepartments();
        } else {
          alert((await res.json()).error || 'Save failed.');
        }
      } catch {
        alert('Network error.');
      }
    });
  }

  const empForm = document.querySelector('#employees-page form');
  if (empForm) {
    empForm.addEventListener('submit', async e => {
      e.preventDefault();

      const employeeId = document.getElementById('employee-id').value.trim();
      const email      = document.getElementById('employee-email').value.trim().toLowerCase();
      const position   = document.getElementById('employee-position').value.trim();
      const deptId     = document.getElementById('dept-select').value;
      const hireDate   = document.getElementById('hire-date').value;

      if (!employeeId) return alert('Employee ID required.');
      if (!email)      return alert('User Email required.');
      if (!position)   return alert('Position required.');
      if (!deptId)     return alert('Department required.');

      const page      = document.getElementById('employees-page');
      const editingId = page.getAttribute('data-editing');
      const url       = editingId ? `${API}/api/employees/${editingId}` : `${API}/api/employees`;
      const method    = editingId ? 'PUT' : 'POST';
      const body      = editingId
        ? { employeeId, email, position, deptId, hireDate }
        : { employeeId, email, position, deptId, hireDate };

      try {
        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(body)
        });

        if (res.ok) {
          page.removeAttribute('data-editing');
          empForm.reset();
          loadAndRenderEmployees();
        } else {
          alert((await res.json()).error || 'Save failed.');
        }
      } catch {
        alert('Network error.');
      }
    });
  }

  const accForm = document.querySelector('#accounts-page form');
  if (accForm) {
    accForm.addEventListener('submit', async e => {
      e.preventDefault();

      const firstName = document.getElementById('account-firstname').value.trim();
      const lastName  = document.getElementById('account-lastname').value.trim();
      const email     = document.getElementById('account-email').value.trim().toLowerCase();
      const password  = document.getElementById('account-password').value;
      const role      = document.getElementById('role').value.trim() || 'user';
      const verified  = document.getElementById('verify').checked;

      if (firstName.length < 2 || lastName.length < 2) return alert('Name too short.');
      if (!email)    return alert('Email required.');

      const page      = document.getElementById('accounts-page');
      const editingId = page.getAttribute('data-editing');
      const url       = editingId ? `${API}/api/accounts/${editingId}` : `${API}/api/accounts`;
      const method    = editingId ? 'PUT' : 'POST';

      if (!editingId && (!password || password.length < 6))
        return alert('Password must be at least 6 chars.');

      const body = editingId
        ? { firstName, lastName, email, role, verified, ...(password ? { password } : {}) }
        : { firstName, lastName, email, password, role, verified };

      try {
        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(body)
        });

        if (res.ok) {
          page.removeAttribute('data-editing');
          accForm.reset();
          loadAndRenderAccounts();
        } else {
          alert((await res.json()).error || 'Save failed.');
        }
      } catch {
        alert('Network error.');
      }
    });
  }
}

function wireRequestModal() {
  const overlay  = document.getElementById('reqOverlay');
  const modal    = document.getElementById('reqModal');
  const closeBtn = document.getElementById('closeReqModal');
  const form     = document.getElementById('reqForm');
  const itemsBox = document.getElementById('reqItems');
  const addBtn   = document.getElementById('addReqItem');
  const typeSel  = document.getElementById('reqType');

  if (!overlay || !modal || !closeBtn || !form || !itemsBox || !addBtn || !typeSel) return;

  function open() {
    overlay.classList.remove('d-none');
    modal.classList.remove('d-none');
    itemsBox.innerHTML = '';
    addRow();
  }

  function close() {
    overlay.classList.add('d-none');
    modal.classList.add('d-none');
  }

  function addRow() {
    const row = document.createElement('div');
    row.className = 'req-row d-flex gap-2 mb-2 align-items-center';
    row.innerHTML = `
      <input class="form-control req-name" placeholder="Item name">
      <input class="form-control req-qty" type="number" min="1" value="1" style="max-width:90px;">
      <button type="button" class="btn btn-outline-danger req-remove">x</button>`;
    itemsBox.appendChild(row);
  }

  document.querySelectorAll('[data-open-request]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); open(); });
  });

  addBtn.addEventListener('click', addRow);

  itemsBox.addEventListener('click', e => {
    if (e.target.classList.contains('req-remove'))
      e.target.closest('.req-row')?.remove();
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('Please log in first.');

    const items = [...itemsBox.querySelectorAll('.req-row')]
      .map(r => ({
        name: r.querySelector('.req-name')?.value.trim() || '',
        qty:  parseInt(r.querySelector('.req-qty')?.value, 10) || 1
      }))
      .filter(x => x.name);

    if (items.length === 0) return alert('Add at least 1 item.');

    try {
      const res = await fetch(`${API}/api/requests`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: typeSel.value, items })
      });

      if (res.ok) {
        close();
        loadAndRenderRequests();
      } else {
        alert((await res.json()).error || 'Submission failed.');
      }
    } catch {
      alert('Network error.');
    }
  });
}

function wireInlineRequestForm() {
  const form     = document.getElementById('requestInlineForm');
  const itemsBox = document.getElementById('requestInlineItems');
  const addBtn   = document.getElementById('addInlineItem');
  const nameEl   = document.getElementById('requestItemName');
  const qtyEl    = document.getElementById('requestItemQty');
  const typeEl   = document.getElementById('requestTypeInline');

  if (!form || !itemsBox || !addBtn || !nameEl || !qtyEl || !typeEl) return;

  function addItem(name, qty) {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center mb-2 req-inline-row';
    row.dataset.name = name;
    row.dataset.qty  = qty;
    row.innerHTML = `
      <div class="flex-grow-1">${name} (x${qty})</div>
      <button type="button" class="btn btn-outline-danger btn-sm req-inline-remove">x</button>`;
    itemsBox.appendChild(row);
  }

  addBtn.addEventListener('click', () => {
    const name = nameEl.value.trim();
    const qty  = parseInt(qtyEl.value, 10) || 1;
    if (!name) return;
    addItem(name, qty);
    nameEl.value = '';
    qtyEl.value  = '1';
    nameEl.focus();
  });

  itemsBox.addEventListener('click', e => {
    if (e.target.classList.contains('req-inline-remove'))
      e.target.closest('.req-inline-row')?.remove();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('Please log in first.');

    const rows  = [...itemsBox.querySelectorAll('.req-inline-row')];
    const items = rows.map(r => ({ name: r.dataset.name, qty: parseInt(r.dataset.qty, 10) || 1 }));
    if (items.length === 0) return alert('Add at least 1 item.');

    try {
      const res = await fetch(`${API}/api/requests`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: typeEl.value, items })
      });

      if (res.ok) {
        itemsBox.innerHTML = '';
        loadAndRenderRequests();
      } else {
        alert((await res.json()).error || 'Submission failed.');
      }
    } catch {
      alert('Network error.');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthFromToken();

  wireEvents();
  wireRequestModal();
  wireInlineRequestForm();

  window.addEventListener('hashchange', handleRouting);

  if (!window.location.hash) navigateTo('#/');
  handleRouting();
});