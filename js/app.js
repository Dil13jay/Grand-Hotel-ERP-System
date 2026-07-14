// Grand Hotel ERP - Main Application
const BASE_URL = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;
let currentModal = null;
let currentEntity = null;
let currentEntityType = null;

// ========== UTILITIES ==========
function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  const toastMessage = document.getElementById('toastMessage');
  toastMessage.textContent = message;
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  new (window.bootstrap || {}).Toast(toast).show();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    }
  };
  if (data) options.body = JSON.stringify(data);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
    throw error;
  }
}

// ========== AUTHENTICATION ==========
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  if (!username || !password) {
    showToast('Username and password required', 'warning');
    return;
  }
  
  try {
    const result = await apiCall('POST', '/auth/login', { username, password });
    authToken = result.token;
    currentUser = result.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
    loadDashboard();
  } catch (error) {
    showToast('Login failed', 'danger');
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  showLogin();
}

function showLogin() {
  document.getElementById('loginView').classList.remove('d-none');
  document.getElementById('appView').classList.add('d-none');
  document.getElementById('loginForm').reset();
}

function showApp() {
  document.getElementById('loginView').classList.add('d-none');
  document.getElementById('appView').classList.remove('d-none');
  updateUserInfo();
}

function updateUserInfo() {
  const initials = (currentUser.full_name || 'GH').split(' ').map(n => n[0]).join('').toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarUserName').textContent = currentUser.full_name || 'User';
  document.getElementById('sidebarUserRole').textContent = currentUser.role;
  document.getElementById('topAvatar').textContent = initials;
  document.getElementById('topUserName').textContent = currentUser.full_name || 'User';
  document.getElementById('topUserRole').textContent = currentUser.role;
}

// ========== NAVIGATION ==========
function switchPage(pageName) {
  document.querySelectorAll('.page-section').forEach(el => el.classList.add('d-none'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  const pageId = `${pageName}Page`;
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('d-none');
  
  document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
  
  // Update topbar
  const titles = {
    dashboard: ['Dashboard', 'Overview of hotel operations.'],
    rooms: ['Room Management', 'Track room availability, conditions, and assignments.'],
    reservations: ['Reservations', 'Manage guest reservations and check-in/out dates.'],
    billing: ['Billing & Payments', 'Issue bills and record settled payments.'],
    employees: ['Employees', 'Manage hotel staff roles and departments.'],
    inventory: ['Inventory', 'Track stock levels, categories, and reorder status.']
  };
  
  if (titles[pageName]) {
    document.getElementById('pageTitle').textContent = titles[pageName][0];
    document.getElementById('pageDescription').textContent = titles[pageName][1];
  }
  
  // Load page data
  if (pageName === 'employees') loadEmployees();
  if (pageName === 'rooms') loadRooms();
  if (pageName === 'reservations') loadReservations();
  if (pageName === 'billing') loadBills();
  if (pageName === 'inventory') loadInventory();
}

// ========== EMPLOYEE MODULE ==========
async function loadEmployees() {
  try {
    const employees = await apiCall('GET', '/employees');
    renderEmployeeTable(employees);
    document.getElementById('employeeCount').textContent = `${employees.length} employee${employees.length !== 1 ? 's' : ''}`;
    document.getElementById('employeeUpdated').innerHTML = '<i class="bi bi-clock-history"></i> Just now';
    
    // Setup search and filter
    setupEmployeeSearch(employees);
    setupEmployeeFilter(employees);
  } catch (error) {
    document.getElementById('employeeTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">Failed to load employees</td></tr>';
  }
}

function renderEmployeeTable(employees) {
  const tbody = document.getElementById('employeeTableBody');
  if (employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">No employees found</td></tr>';
    return;
  }
  
  tbody.innerHTML = employees.map((emp, idx) => `
    <tr>
      <td><small class="text-muted">#${emp.id}</small></td>
      <td><strong>${emp.name}</strong></td>
      <td>${emp.role}</td>
      <td>${emp.department}</td>
      <td>${emp.phone || '—'}</td>
      <td>
        <span class="badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'}">
          ${emp.status}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="editEmployee(${emp.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployeeConfirm(${emp.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function setupEmployeeSearch(employees) {
  const searchInput = document.getElementById('employeeSearch');
  searchInput.oninput = () => {
    const query = searchInput.value.toLowerCase();
    const filtered = employees.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query)
    );
    renderEmployeeTable(filtered);
  };
}

function setupEmployeeFilter(employees) {
  const filterSelect = document.getElementById('employeeStatusFilter');
  filterSelect.onchange = () => {
    const status = filterSelect.value;
    const filtered = status ? employees.filter(emp => emp.status === status) : employees;
    renderEmployeeTable(filtered);
  };
}

function showAddEmployeeModal() {
  currentEntityType = 'employee';
  currentEntity = null;
  
  const modalLabel = document.getElementById('entityModalLabel');
  const modalBody = document.getElementById('entityModalBody');
  
  modalLabel.textContent = 'Add New Employee';
  modalBody.innerHTML = `
    <div class="row g-3">
      <div class="col-12">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-control" id="empName" placeholder="Enter employee name" required />
      </div>
      <div class="col-md-6">
        <label class="form-label">Role</label>
        <input type="text" class="form-control" id="empRole" placeholder="e.g., Housekeeper, Manager" required />
      </div>
      <div class="col-md-6">
        <label class="form-label">Department</label>
        <select class="form-select" id="empDepartment" required>
          <option value="">Select Department</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Reception">Reception</option>
          <option value="Kitchen">Kitchen</option>
          <option value="Security">Security</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Management">Management</option>
          <option value="General">General</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Phone</label>
        <input type="tel" class="form-control" id="empPhone" placeholder="+94 77 123 4567" />
      </div>
      <div class="col-md-6">
        <label class="form-label">Status</label>
        <select class="form-select" id="empStatus" required>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  `;
  
  const modal = new (window.bootstrap || {}).Modal(document.getElementById('entityModal'));
  modal.show();
}

async function editEmployee(employeeId) {
  try {
    const employees = await apiCall('GET', '/employees');
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) throw new Error('Employee not found');
    
    currentEntityType = 'employee';
    currentEntity = emp;
    
    const modalLabel = document.getElementById('entityModalLabel');
    const modalBody = document.getElementById('entityModalBody');
    
    modalLabel.textContent = `Edit Employee: ${emp.name}`;
    modalBody.innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-control" id="empName" value="${emp.name}" required />
        </div>
        <div class="col-md-6">
          <label class="form-label">Role</label>
          <input type="text" class="form-control" id="empRole" value="${emp.role}" required />
        </div>
        <div class="col-md-6">
          <label class="form-label">Department</label>
          <select class="form-select" id="empDepartment" required>
            <option value="Housekeeping" ${emp.department === 'Housekeeping' ? 'selected' : ''}>Housekeeping</option>
            <option value="Reception" ${emp.department === 'Reception' ? 'selected' : ''}>Reception</option>
            <option value="Kitchen" ${emp.department === 'Kitchen' ? 'selected' : ''}>Kitchen</option>
            <option value="Security" ${emp.department === 'Security' ? 'selected' : ''}>Security</option>
            <option value="Maintenance" ${emp.department === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
            <option value="Management" ${emp.department === 'Management' ? 'selected' : ''}>Management</option>
            <option value="General" ${emp.department === 'General' ? 'selected' : ''}>General</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Phone</label>
          <input type="tel" class="form-control" id="empPhone" value="${emp.phone || ''}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Status</label>
          <select class="form-select" id="empStatus" required>
            <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
    `;
    
    const modal = new (window.bootstrap || {}).Modal(document.getElementById('entityModal'));
    modal.show();
  } catch (error) {
    showToast('Failed to load employee', 'danger');
  }
}

async function saveEmployee() {
  const name = document.getElementById('empName').value.trim();
  const role = document.getElementById('empRole').value.trim();
  const department = document.getElementById('empDepartment').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const status = document.getElementById('empStatus').value.trim();
  
  if (!name || !role || !department) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  try {
    const data = { name, role, department, phone, status };
    
    if (currentEntity) {
      await apiCall('PUT', `/employees/${currentEntity.id}`, data);
      showToast('Employee updated successfully', 'success');
    } else {
      await apiCall('POST', '/employees', data);
      showToast('Employee added successfully', 'success');
    }
    
    (window.bootstrap || {}).Modal.getInstance(document.getElementById('entityModal')).hide();
    loadEmployees();
  } catch (error) {
    showToast('Failed to save employee', 'danger');
  }
}

async function deleteEmployeeConfirm(employeeId) {
  if (!confirm('Are you sure you want to delete this employee?')) return;
  
  try {
    await apiCall('DELETE', `/employees/${employeeId}`);
    showToast('Employee deleted successfully', 'success');
    loadEmployees();
  } catch (error) {
    showToast('Failed to delete employee', 'danger');
  }
}

// ========== ROOMS MODULE (Placeholder) ==========
async function loadRooms() {
  try {
    const rooms = await apiCall('GET', '/rooms');
    document.getElementById('roomCount').textContent = `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`;
  } catch (error) {
    document.getElementById('roomTableBody').innerHTML = '<tr><td colspan="8" class="text-center text-muted p-4">Failed to load rooms</td></tr>';
  }
}

// ========== RESERVATIONS MODULE (Placeholder) ==========
async function loadReservations() {
  try {
    const reservations = await apiCall('GET', '/reservations');
    document.getElementById('reservationCount').textContent = `${reservations.length} reservation${reservations.length !== 1 ? 's' : ''}`;
  } catch (error) {
    document.getElementById('reservationTableBody').innerHTML = '<tr><td colspan="8" class="text-center text-muted p-4">Failed to load reservations</td></tr>';
  }
}

// ========== BILLING MODULE ==========
let billListCache = [];

async function loadBills() {
  try {
    const bills = await apiCall('GET', '/bills');
    billListCache = bills;
    renderBillTable(getFilteredBills());
    document.getElementById('billCount').textContent = `${bills.length} bill${bills.length !== 1 ? 's' : ''}`;
    document.getElementById('billUpdated').innerHTML = '<i class="bi bi-clock-history"></i> Just now';
    setupBillSearchAndFilter();
  } catch (error) {
    document.getElementById('billTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">Failed to load bills</td></tr>';
  }
}

function getFilteredBills() {
  const searchInput = document.getElementById('billSearch');
  const filterSelect = document.getElementById('billStatusFilter');
  const query = (searchInput?.value || '').toLowerCase();
  const status = filterSelect?.value || '';

  return billListCache.filter((bill) => {
    const matchesSearch = !query || [bill.guest_name, bill.notes, String(bill.reservation_id)].some((value) => (value || '').toLowerCase().includes(query));
    const matchesStatus = !status || bill.status === status;
    return matchesSearch && matchesStatus;
  });
}

function renderBillTable(bills) {
  const tbody = document.getElementById('billTableBody');
  if (!tbody) return;

  if (bills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">No bills found</td></tr>';
    return;
  }

  tbody.innerHTML = bills.map((bill, index) => `
    <tr>
      <td><small class="text-muted">#${bill.id}</small></td>
      <td><strong>${bill.guest_name}</strong></td>
      <td>#${bill.reservation_id}</td>
      <td>${Number(bill.amount_due).toLocaleString('en-LK', { maximumFractionDigits: 2 })}</td>
      <td>
        <span class="badge ${bill.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">
          ${bill.status}
        </span>
      </td>
      <td>${bill.notes || '—'}</td>
      <td class="text-end">
        ${bill.status !== 'Paid' ? `<button class="btn btn-sm btn-outline-success me-2" onclick="payBill(${bill.id})"><i class="bi bi-cash-stack"></i></button>` : ''}
        <button class="btn btn-sm btn-outline-primary me-2" onclick="editBill(${bill.id})"><i class="bi bi-pencil"></i></button>
      </td>
    </tr>
  `).join('');
}

function setupBillSearchAndFilter() {
  const searchInput = document.getElementById('billSearch');
  const filterSelect = document.getElementById('billStatusFilter');

  if (searchInput) {
    searchInput.oninput = () => renderBillTable(getFilteredBills());
  }

  if (filterSelect) {
    filterSelect.onchange = () => renderBillTable(getFilteredBills());
  }
}

function showAddBillModal() {
  currentEntityType = 'bill';
  currentEntity = null;

  const modalLabel = document.getElementById('entityModalLabel');
  const modalBody = document.getElementById('entityModalBody');

  modalLabel.textContent = 'Create New Bill';
  modalBody.innerHTML = `
    <div class="row g-3">
      <div class="col-12">
        <label class="form-label">Reservation</label>
        <select class="form-select" id="billReservationId" required></select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Guest Name</label>
        <input type="text" class="form-control" id="billGuestName" required />
      </div>
      <div class="col-md-6">
        <label class="form-label">Amount Due</label>
        <input type="number" min="0" step="0.01" class="form-control" id="billAmountDue" required />
      </div>
      <div class="col-md-6">
        <label class="form-label">Status</label>
        <select class="form-select" id="billStatus">
          <option value="Unpaid">Unpaid</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label">Notes</label>
        <textarea class="form-control" id="billNotes" rows="3"></textarea>
      </div>
    </div>
  `;

  populateBillReservationOptions();
  const modal = new (window.bootstrap || {}).Modal(document.getElementById('entityModal'));
  modal.show();
}

async function populateBillReservationOptions(selectedId = null) {
  try {
    const reservations = await apiCall('GET', '/reservations');
    const select = document.getElementById('billReservationId');
    if (!select) return;

    select.innerHTML = ['<option value="">Select reservation</option>', ...reservations.map((reservation) => `
      <option value="${reservation.id}" ${selectedId && String(selectedId) === String(reservation.id) ? 'selected' : ''}>
        #${reservation.id} - ${reservation.guest_name} (${reservation.room_number})
      </option>
    `)].join('');

    select.addEventListener('change', (event) => {
      const selectedReservation = reservations.find((reservation) => String(reservation.id) === String(event.target.value));
      const guestInput = document.getElementById('billGuestName');
      if (selectedReservation && guestInput) {
        guestInput.value = selectedReservation.guest_name;
      }
    });

    if (selectedId) {
      select.value = String(selectedId);
      const selectedReservation = reservations.find((reservation) => String(reservation.id) === String(selectedId));
      const guestInput = document.getElementById('billGuestName');
      if (selectedReservation && guestInput) {
        guestInput.value = selectedReservation.guest_name;
      }
    }
  } catch (error) {
    showToast('Failed to load reservations for billing', 'danger');
  }
}

async function editBill(billId) {
  try {
    const [bills, reservations] = await Promise.all([
      apiCall('GET', '/bills'),
      apiCall('GET', '/reservations')
    ]);

    const bill = bills.find((item) => item.id === billId);
    if (!bill) throw new Error('Bill not found');

    currentEntityType = 'bill';
    currentEntity = bill;

    const modalLabel = document.getElementById('entityModalLabel');
    const modalBody = document.getElementById('entityModalBody');

    modalLabel.textContent = `Edit Bill #${bill.id}`;
    modalBody.innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Reservation</label>
          <select class="form-select" id="billReservationId" required></select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Guest Name</label>
          <input type="text" class="form-control" id="billGuestName" value="${bill.guest_name}" required />
        </div>
        <div class="col-md-6">
          <label class="form-label">Amount Due</label>
          <input type="number" min="0" step="0.01" class="form-control" id="billAmountDue" value="${bill.amount_due}" required />
        </div>
        <div class="col-md-6">
          <label class="form-label">Status</label>
          <select class="form-select" id="billStatus">
            <option value="Unpaid" ${bill.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="Paid" ${bill.status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="billNotes" rows="3">${bill.notes || ''}</textarea>
        </div>
      </div>
    `;

    const select = document.getElementById('billReservationId');
    select.innerHTML = ['<option value="">Select reservation</option>', ...reservations.map((reservation) => `
      <option value="${reservation.id}" ${String(reservation.id) === String(bill.reservation_id) ? 'selected' : ''}>
        #${reservation.id} - ${reservation.guest_name} (${reservation.room_number})
      </option>
    `)].join('');

    select.addEventListener('change', (event) => {
      const selectedReservation = reservations.find((reservation) => String(reservation.id) === String(event.target.value));
      const guestInput = document.getElementById('billGuestName');
      if (selectedReservation && guestInput) {
        guestInput.value = selectedReservation.guest_name;
      }
    });

    const modal = new (window.bootstrap || {}).Modal(document.getElementById('entityModal'));
    modal.show();
  } catch (error) {
    showToast('Failed to load bill', 'danger');
  }
}

async function saveBill() {
  const reservationId = document.getElementById('billReservationId').value;
  const guestName = document.getElementById('billGuestName').value.trim();
  const amountDue = document.getElementById('billAmountDue').value.trim();
  const status = document.getElementById('billStatus').value;
  const notes = document.getElementById('billNotes').value.trim();

  if (!reservationId || !guestName || !amountDue) {
    showToast('Please complete the reservation, guest name, and amount fields', 'warning');
    return;
  }

  try {
    const payload = {
      reservation_id: Number(reservationId),
      guest_name: guestName,
      amount_due: Number(amountDue),
      status,
      notes
    };

    if (currentEntity) {
      await apiCall('PUT', `/bills/${currentEntity.id}`, payload);
      showToast('Bill updated successfully', 'success');
    } else {
      await apiCall('POST', '/bills', payload);
      showToast('Bill created successfully', 'success');
    }

    (window.bootstrap || {}).Modal.getInstance(document.getElementById('entityModal')).hide();
    loadBills();
  } catch (error) {
    showToast('Failed to save bill', 'danger');
  }
}

async function payBill(billId) {
  if (!confirm('Mark this bill as paid?')) return;

  try {
    await apiCall('PATCH', `/bills/${billId}/pay`);
    showToast('Payment recorded successfully', 'success');
    loadBills();
  } catch (error) {
    showToast('Failed to record payment', 'danger');
  }
}

// ========== INVENTORY MODULE (Placeholder) ==========
async function loadInventory() {
  try {
    const inventory = await apiCall('GET', '/inventory');
    document.getElementById('inventoryCount').textContent = `${inventory.length} item${inventory.length !== 1 ? 's' : ''}`;
  } catch (error) {
    document.getElementById('inventoryTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">Failed to load inventory</td></tr>';
  }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    const [rooms, reservations, bills, employees] = await Promise.all([
      apiCall('GET', '/rooms').catch(() => []),
      apiCall('GET', '/reservations').catch(() => []),
      apiCall('GET', '/bills').catch(() => []),
      apiCall('GET', '/employees').catch(() => [])
    ]);
    
    const stats = [
      { label: 'Available Rooms', value: rooms.filter(r => r.status === 'Available').length, icon: 'door-open-fill', color: 'success' },
      { label: 'Active Employees', value: employees.filter(e => e.status === 'Active').length, icon: 'people-fill', color: 'info' },
      { label: 'Pending Reservations', value: reservations.filter(r => r.status === 'Pending').length, icon: 'calendar-check-fill', color: 'warning' },
      { label: 'Unpaid Bills', value: bills.filter(b => b.status === 'Unpaid').length, icon: 'receipt-cutoff', color: 'danger' }
    ];
    
    const dashboardCards = document.getElementById('dashboardCards');
    dashboardCards.innerHTML = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-icon bg-${stat.color}-subtle text-${stat.color}">
          <i class="bi bi-${stat.icon}"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value">${stat.value}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load dashboard', error);
  }
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showApp();
    loadDashboard();
  } else {
    showLogin();
  }
  
  // Login form
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    login();
  });
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      switchPage(page);
      document.getElementById('sidebarBackdrop').click();
    });
  });
  
  // Sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebarBackdrop').classList.toggle('show');
  });
  
  document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  });
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const page = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
    switchPage(page);
  });
  
  // Billing modal
  document.getElementById('addBillBtn').addEventListener('click', showAddBillModal);

  // Employee modal
  document.getElementById('addEmployeeBtn').addEventListener('click', showAddEmployeeModal);
  document.getElementById('entityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentEntityType === 'bill') {
      saveBill();
    } else if (currentEntityType === 'employee') {
      saveEmployee();
    }
  });
  
  // Set default page
  switchPage('dashboard');
});
