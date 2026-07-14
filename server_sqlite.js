const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DB_PATH = path.join(ROOT_DIR, 'grand_hotel.db');

const activeSessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const defaultUsers = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'Admin',
    full_name: 'System Administrator'
  },
  {
    username: 'reception',
    password: 'reception123',
    role: 'Receptionist',
    full_name: 'Front Desk Reception'
  },
  {
    username: 'accountant',
    password: 'accountant123',
    role: 'Accountant',
    full_name: 'Accounts Executive'
  },
  {
    username: 'staff',
    password: 'staff123',
    role: 'Staff',
    full_name: 'Housekeeping Staff'
  }
];

const initialRooms = [
  {
    number: '101',
    type: 'Standard',
    floor: '1',
    capacity: 2,
    rate: 14500,
    status: 'Available',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, TV',
    notes: 'Near the reception area.'
  },
  {
    number: '102',
    type: 'Standard',
    floor: '1',
    capacity: 2,
    rate: 14500,
    status: 'Occupied',
    condition: 'Good',
    amenities: 'Wi-Fi, Air Conditioning, TV',
    notes: ''
  },
  {
    number: '103',
    type: 'Deluxe',
    floor: '1',
    capacity: 2,
    rate: 19500,
    status: 'Reserved',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar',
    notes: 'Late check-in expected.'
  },
  {
    number: '201',
    type: 'Deluxe',
    floor: '2',
    capacity: 2,
    rate: 20500,
    status: 'Cleaning',
    condition: 'Good',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Balcony',
    notes: 'Priority cleaning requested.'
  },
  {
    number: '202',
    type: 'Suite',
    floor: '2',
    capacity: 3,
    rate: 36500,
    status: 'Available',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Jacuzzi',
    notes: ''
  },
  {
    number: '203',
    type: 'Family',
    floor: '2',
    capacity: 4,
    rate: 31500,
    status: 'Maintenance',
    condition: 'Repair Required',
    amenities: 'Wi-Fi, Air Conditioning, TV, Refrigerator',
    notes: 'Bathroom tap replacement pending.'
  },
  {
    number: '301',
    type: 'Suite',
    floor: '3',
    capacity: 3,
    rate: 38500,
    status: 'Occupied',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Balcony',
    notes: ''
  },
  {
    number: '302',
    type: 'Deluxe',
    floor: '3',
    capacity: 2,
    rate: 22500,
    status: 'Available',
    condition: 'Good',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV',
    notes: ''
  },
  {
    number: '303',
    type: 'Family',
    floor: '3',
    capacity: 5,
    rate: 33500,
    status: 'Reserved',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, Two TVs, Refrigerator',
    notes: 'Baby cot requested.'
  },
  {
    number: '401',
    type: 'Suite',
    floor: '4',
    capacity: 2,
    rate: 42500,
    status: 'Cleaning',
    condition: 'Needs Inspection',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Jacuzzi',
    notes: 'Supervisor inspection after cleaning.'
  },
  {
    number: '402',
    type: 'Deluxe',
    floor: '4',
    capacity: 2,
    rate: 24500,
    status: 'Available',
    condition: 'Excellent',
    amenities: 'Wi-Fi, Air Conditioning, Smart TV, Balcony',
    notes: ''
  },
  {
    number: '403',
    type: 'Family',
    floor: '4',
    capacity: 4,
    rate: 34500,
    status: 'Occupied',
    condition: 'Good',
    amenities: 'Wi-Fi, Air Conditioning, TV, Refrigerator',
    notes: ''
  }
];

const initialReservations = [
  {
    guest_name: 'Namal Perera',
    room_number: '103',
    check_in: '2026-07-15',
    check_out: '2026-07-18',
    status: 'Confirmed',
    amount: 58500,
    notes: 'Early arrival requested.'
  },
  {
    guest_name: 'Dilani Silva',
    room_number: '202',
    check_in: '2026-07-20',
    check_out: '2026-07-23',
    status: 'Pending',
    amount: 109500,
    notes: 'Needs baby cot.'
  }
];

const initialBills = [
  {
    reservation_id: 1,
    guest_name: 'Namal Perera',
    amount_due: 58500,
    status: 'Unpaid',
    notes: 'Includes breakfast package.'
  },
  {
    reservation_id: 2,
    guest_name: 'Dilani Silva',
    amount_due: 109500,
    status: 'Unpaid',
    notes: 'Advance pending.'
  }
];

const initialEmployees = [
  {
    name: 'Samitha Fernando',
    role: 'Housekeeper',
    department: 'Housekeeping',
    phone: '+94 77 123 4567',
    status: 'Active'
  },
  {
    name: 'Amal Jayawardena',
    role: 'Front Desk Agent',
    department: 'Reception',
    phone: '+94 71 987 6543',
    status: 'Active'
  }
];

const initialInventory = [
  {
    item_name: 'Bath Towels',
    quantity: 120,
    category: 'Linen',
    status: 'Ready',
    notes: 'Routine reorder in 2 weeks.'
  },
  {
    item_name: 'Mini Bar Water',
    quantity: 260,
    category: 'Beverages',
    status: 'Low Stock',
    notes: 'Request extra delivery.'
  }
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSession(user) {
  const token = crypto.randomUUID();
  const session = {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    created: Date.now()
  };
  activeSessions.set(token, session);
  return token;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now - session.created > SESSION_TTL) {
      activeSessions.delete(token);
    }
  }
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getSession(req) {
  cleanExpiredSessions();
  const token = getAuthToken(req);
  return token ? activeSessions.get(token) : null;
}

function requireAuth(req) {
  const session = getSession(req);
  if (!session) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return session.user;
}

function requireRole(req, allowedRoles) {
  const user = requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  return user;
}

const db = new DatabaseSync(DB_PATH);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      room_type TEXT NOT NULL,
      floor TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 2,
      rate_per_night REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available',
      condition TEXT NOT NULL DEFAULT 'Excellent',
      amenities TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      room_number TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      amount_due REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      notes TEXT,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Ready',
      notes TEXT
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, full_name)
      VALUES (?, ?, ?, ?)
    `);
    defaultUsers.forEach((user) => {
      insertUser.run(user.username, hashPassword(user.password), user.role, user.full_name);
    });
  }

  const roomCount = db.prepare('SELECT COUNT(*) AS count FROM rooms').get().count;
  if (roomCount === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, condition, amenities, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    initialRooms.forEach((room) => {
      insertStmt.run(room.number, room.type, room.floor, room.capacity, room.rate, room.status, room.condition, room.amenities, room.notes);
    });
  }

  const reservationCount = db.prepare('SELECT COUNT(*) AS count FROM reservations').get().count;
  if (reservationCount === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO reservations (guest_name, room_number, check_in, check_out, status, amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    initialReservations.forEach((reservation) => {
      insertStmt.run(reservation.guest_name, reservation.room_number, reservation.check_in, reservation.check_out, reservation.status, reservation.amount, reservation.notes);
    });
  }

  const billCount = db.prepare('SELECT COUNT(*) AS count FROM bills').get().count;
  if (billCount === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO bills (reservation_id, guest_name, amount_due, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    initialBills.forEach((bill) => {
      insertStmt.run(bill.reservation_id, bill.guest_name, bill.amount_due, bill.status, bill.notes);
    });
  }

  const employeeCount = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
  if (employeeCount === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO employees (name, role, department, phone, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    initialEmployees.forEach((employee) => {
      insertStmt.run(employee.name, employee.role, employee.department, employee.phone, employee.status);
    });
  }

  const inventoryCount = db.prepare('SELECT COUNT(*) AS count FROM inventory').get().count;
  if (inventoryCount === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO inventory (item_name, quantity, category, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    initialInventory.forEach((item) => {
      insertStmt.run(item.item_name, item.quantity, item.category, item.status, item.notes);
    });
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname.startsWith('/api/')) {
    return false;
  }

  let filePath = pathname === '/' ? path.join(ROOT_DIR, 'index.html') : path.join(ROOT_DIR, pathname);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return true;
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  res.writeHead(200, { 'Content-Type': getContentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function mapRoom(row) {
  return {
    id: row.id,
    number: row.room_number,
    type: row.room_type,
    floor: row.floor,
    capacity: row.capacity,
    rate: Number(row.rate_per_night),
    status: row.status,
    condition: row.condition,
    amenities: row.amenities,
    notes: row.notes
  };
}

function mapReservation(row) {
  return {
    id: row.id,
    guest_name: row.guest_name,
    room_number: row.room_number,
    check_in: row.check_in,
    check_out: row.check_out,
    status: row.status,
    amount: Number(row.amount),
    notes: row.notes
  };
}

function mapBill(row) {
  return {
    id: row.id,
    reservation_id: row.reservation_id,
    guest_name: row.guest_name,
    amount_due: Number(row.amount_due),
    status: row.status,
    notes: row.notes
  };
}

function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    phone: row.phone,
    status: row.status
  };
}

function mapInventory(row) {
  return {
    id: row.id,
    item_name: row.item_name,
    quantity: row.quantity,
    category: row.category,
    status: row.status,
    notes: row.notes
  };
}

function getRooms() {
  const rows = db.prepare(`
      SELECT id, room_number, room_type, floor, capacity, rate_per_night, status, condition, amenities, notes
      FROM rooms
      ORDER BY CAST(room_number AS INTEGER), room_number
    `).all();
  return rows.map(mapRoom);
}

function getReservations() {
  const rows = db.prepare(`
      SELECT id, guest_name, room_number, check_in, check_out, status, amount, notes
      FROM reservations
      ORDER BY check_in DESC
    `).all();
  return rows.map(mapReservation);
}

function getBills() {
  const rows = db.prepare(`
      SELECT id, reservation_id, guest_name, amount_due, status, notes
      FROM bills
      ORDER BY id DESC
    `).all();
  return rows.map(mapBill);
}

function getEmployees() {
  const rows = db.prepare(`
      SELECT id, name, role, department, phone, status
      FROM employees
      ORDER BY name
    `).all();
  return rows.map(mapEmployee);
}

function getInventory() {
  const rows = db.prepare(`
      SELECT id, item_name, quantity, category, status, notes
      FROM inventory
      ORDER BY item_name
    `).all();
  return rows.map(mapInventory);
}

function addRoom(payload) {
  const roomNumber = String(payload.number || '').trim();
  if (!roomNumber) throw new Error('Room number is required');
  const existing = db.prepare('SELECT id FROM rooms WHERE lower(room_number) = lower(?)').get(roomNumber);
  if (existing) throw new Error('Room number already exists');

  const stmt = db.prepare(`
    INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, condition, amenities, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(roomNumber, payload.type || 'Standard', payload.floor || '1', Number(payload.capacity || 2), Number(payload.rate || 0), payload.status || 'Available', payload.condition || 'Excellent', payload.amenities || '', payload.notes || '');
  return getRoomById(result.lastInsertRowid);
}

function updateRoom(roomId, payload) {
  const roomNumber = String(payload.number || '').trim();
  if (!roomNumber) throw new Error('Room number is required');
  const existing = db.prepare('SELECT id FROM rooms WHERE lower(room_number) = lower(?) AND id != ?').get(roomNumber, roomId);
  if (existing) throw new Error('Room number already exists');

  db.prepare(`
    UPDATE rooms
    SET room_number = ?, room_type = ?, floor = ?, capacity = ?, rate_per_night = ?, status = ?, condition = ?, amenities = ?, notes = ?
    WHERE id = ?
  `).run(roomNumber, payload.type || 'Standard', payload.floor || '1', Number(payload.capacity || 2), Number(payload.rate || 0), payload.status || 'Available', payload.condition || 'Excellent', payload.amenities || '', payload.notes || '', roomId);
  return getRoomById(roomId);
}

function updateRoomStatus(roomId, status) {
  const room = getRoomById(roomId);
  if (!room) throw new Error('Room not found');
  let condition = room.condition;
  if (status === 'Maintenance') condition = 'Repair Required';
  if (status === 'Available' && room.condition === 'Repair Required') condition = 'Good';
  db.prepare('UPDATE rooms SET status = ?, condition = ? WHERE id = ?').run(status, condition, roomId);
  return getRoomById(roomId);
}

function deleteRoom(roomId) {
  const room = getRoomById(roomId);
  if (!room) throw new Error('Room not found');
  db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
  return true;
}

function getRoomById(roomId) {
  const row = db.prepare('SELECT id, room_number, room_type, floor, capacity, rate_per_night, status, condition, amenities, notes FROM rooms WHERE id = ?').get(roomId);
  return row ? mapRoom(row) : null;
}

function addReservation(payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  const stmt = db.prepare(`
    INSERT INTO reservations (guest_name, room_number, check_in, check_out, status, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(guest, String(payload.room_number || '').trim(), String(payload.check_in || '').trim(), String(payload.check_out || '').trim(), payload.status || 'Pending', Number(payload.amount || 0), payload.notes || '');
  return getReservationById(result.lastInsertRowid);
}

function updateReservation(reservationId, payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  db.prepare(`
    UPDATE reservations
    SET guest_name = ?, room_number = ?, check_in = ?, check_out = ?, status = ?, amount = ?, notes = ?
    WHERE id = ?
  `).run(guest, String(payload.room_number || '').trim(), String(payload.check_in || '').trim(), String(payload.check_out || '').trim(), payload.status || 'Pending', Number(payload.amount || 0), payload.notes || '', reservationId);
  return getReservationById(reservationId);
}

function deleteReservation(reservationId) {
  const reservation = getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  db.prepare('DELETE FROM reservations WHERE id = ?').run(reservationId);
  db.prepare('DELETE FROM bills WHERE reservation_id = ?').run(reservationId);
  return true;
}

function getReservationById(reservationId) {
  const row = db.prepare('SELECT id, guest_name, room_number, check_in, check_out, status, amount, notes FROM reservations WHERE id = ?').get(reservationId);
  return row ? mapReservation(row) : null;
}

function addBill(payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  const reservationId = Number(payload.reservation_id || 0);
  if (!reservationId) throw new Error('Reservation ID is required');
  const stmt = db.prepare(`
    INSERT INTO bills (reservation_id, guest_name, amount_due, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(reservationId, guest, Number(payload.amount_due || 0), payload.status || 'Unpaid', payload.notes || '');
  return getBillById(result.lastInsertRowid);
}

function updateBill(billId, payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  db.prepare(`
    UPDATE bills
    SET reservation_id = ?, guest_name = ?, amount_due = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(Number(payload.reservation_id || 0), guest, Number(payload.amount_due || 0), payload.status || 'Unpaid', payload.notes || '', billId);
  return getBillById(billId);
}

function markBillPaid(billId) {
  const bill = getBillById(billId);
  if (!bill) throw new Error('Bill not found');
  db.prepare('UPDATE bills SET status = ? WHERE id = ?').run('Paid', billId);
  return getBillById(billId);
}

function getBillById(billId) {
  const row = db.prepare('SELECT id, reservation_id, guest_name, amount_due, status, notes FROM bills WHERE id = ?').get(billId);
  return row ? mapBill(row) : null;
}

function addEmployee(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Employee name is required');
  const stmt = db.prepare(`
    INSERT INTO employees (name, role, department, phone, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, payload.role || 'Staff', payload.department || 'General', String(payload.phone || '').trim(), payload.status || 'Active');
  return getEmployeeById(result.lastInsertRowid);
}

function updateEmployee(employeeId, payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Employee name is required');
  db.prepare(`
    UPDATE employees
    SET name = ?, role = ?, department = ?, phone = ?, status = ?
    WHERE id = ?
  `).run(name, payload.role || 'Staff', payload.department || 'General', String(payload.phone || '').trim(), payload.status || 'Active', employeeId);
  return getEmployeeById(employeeId);
}

function deleteEmployee(employeeId) {
  const employee = getEmployeeById(employeeId);
  if (!employee) throw new Error('Employee not found');
  db.prepare('DELETE FROM employees WHERE id = ?').run(employeeId);
  return true;
}

function getEmployeeById(employeeId) {
  const row = db.prepare('SELECT id, name, role, department, phone, status FROM employees WHERE id = ?').get(employeeId);
  return row ? mapEmployee(row) : null;
}

function addInventory(payload) {
  const name = String(payload.item_name || '').trim();
  if (!name) throw new Error('Item name is required');
  const stmt = db.prepare(`
    INSERT INTO inventory (item_name, quantity, category, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, Number(payload.quantity || 0), payload.category || 'General', payload.status || 'Ready', payload.notes || '');
  return getInventoryById(result.lastInsertRowid);
}

function updateInventory(itemId, payload) {
  const name = String(payload.item_name || '').trim();
  if (!name) throw new Error('Item name is required');
  db.prepare(`
    UPDATE inventory
    SET item_name = ?, quantity = ?, category = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(name, Number(payload.quantity || 0), payload.category || 'General', payload.status || 'Ready', payload.notes || '', itemId);
  return getInventoryById(itemId);
}

function deleteInventory(itemId) {
  const item = getInventoryById(itemId);
  if (!item) throw new Error('Inventory item not found');
  db.prepare('DELETE FROM inventory WHERE id = ?').run(itemId);
  return true;
}

function getInventoryById(itemId) {
  const row = db.prepare('SELECT id, item_name, quantity, category, status, notes FROM inventory WHERE id = ?').get(itemId);
  return row ? mapInventory(row) : null;
}

function findUserByUsername(username) {
  return db.prepare('SELECT id, username, password_hash, role, full_name FROM users WHERE lower(username)=lower(?)').get(username);
}

initDb();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (serveStatic(req, res)) {
    return;
  }

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const user = findUserByUsername(String(payload.username || '').trim());
      if (!user || user.password_hash !== hashPassword(String(payload.password || ''))) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }
      const token = createSession(user);
      sendJson(res, 200, { token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = getAuthToken(req);
      if (token) activeSessions.delete(token);
      sendJson(res, 200, { message: 'Logged out' });
      return;
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = requireAuth(req);
      sendJson(res, 200, { user });
      return;
    }

    if (pathname === '/api/rooms' && req.method === 'GET') {
      requireAuth(req);
      sendJson(res, 200, getRooms());
      return;
    }

    if (pathname === '/api/rooms' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Receptionist']);
      const payload = await parseJsonBody(req);
      const room = addRoom(payload);
      sendJson(res, 201, room);
      return;
    }

    if (pathname === '/api/rooms/reset' && req.method === 'POST') {
      requireRole(req, ['Admin']);
      db.prepare('DELETE FROM rooms').run();
      const insertStmt = db.prepare(`
        INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, condition, amenities, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      initialRooms.forEach((room) => {
        insertStmt.run(room.number, room.type, room.floor, room.capacity, room.rate, room.status, room.condition, room.amenities, room.notes);
      });
      sendJson(res, 200, { message: 'Rooms restored' });
      return;
    }

    const roomMatch = pathname.match(/^\/api\/rooms\/(\d+)$/);
    if (roomMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Receptionist']);
      const roomId = Number(roomMatch[1]);
      const payload = await parseJsonBody(req);
      const room = updateRoom(roomId, payload);
      sendJson(res, 200, room);
      return;
    }

    if (roomMatch && req.method === 'PATCH') {
      requireRole(req, ['Admin', 'Receptionist', 'Staff']);
      const roomId = Number(roomMatch[1]);
      const payload = await parseJsonBody(req);
      const room = updateRoomStatus(roomId, payload.status);
      sendJson(res, 200, room);
      return;
    }

    if (roomMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin', 'Receptionist']);
      const roomId = Number(roomMatch[1]);
      deleteRoom(roomId);
      sendJson(res, 200, { message: 'Room deleted' });
      return;
    }

    if (pathname === '/api/reservations' && req.method === 'GET') {
      requireAuth(req);
      sendJson(res, 200, getReservations());
      return;
    }

    if (pathname === '/api/reservations' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Receptionist']);
      const payload = await parseJsonBody(req);
      const reservation = addReservation(payload);
      sendJson(res, 201, reservation);
      return;
    }

    const reservationMatch = pathname.match(/^\/api\/reservations\/(\d+)$/);
    if (reservationMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Receptionist']);
      const reservationId = Number(reservationMatch[1]);
      const payload = await parseJsonBody(req);
      const reservation = updateReservation(reservationId, payload);
      sendJson(res, 200, reservation);
      return;
    }

    if (reservationMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const reservationId = Number(reservationMatch[1]);
      deleteReservation(reservationId);
      sendJson(res, 200, { message: 'Reservation deleted' });
      return;
    }

    if (pathname === '/api/bills' && req.method === 'GET') {
      requireRole(req, ['Admin', 'Accountant']);
      sendJson(res, 200, getBills());
      return;
    }

    if (pathname === '/api/bills' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Accountant']);
      const payload = await parseJsonBody(req);
      const bill = addBill(payload);
      sendJson(res, 201, bill);
      return;
    }

    const billMatch = pathname.match(/^\/api\/bills\/(\d+)$/);
    if (billMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Accountant']);
      const billId = Number(billMatch[1]);
      const payload = await parseJsonBody(req);
      const bill = updateBill(billId, payload);
      sendJson(res, 200, bill);
      return;
    }

    if (pathname.match(/^\/api\/bills\/(\d+)\/pay$/) && req.method === 'PATCH') {
      requireRole(req, ['Admin', 'Accountant']);
      const billId = Number(pathname.split('/')[3]);
      const bill = markBillPaid(billId);
      sendJson(res, 200, bill);
      return;
    }

    if (pathname === '/api/employees' && req.method === 'GET') {
      requireRole(req, ['Admin']);
      sendJson(res, 200, getEmployees());
      return;
    }

    if (pathname === '/api/employees' && req.method === 'POST') {
      requireRole(req, ['Admin']);
      const payload = await parseJsonBody(req);
      const employee = addEmployee(payload);
      sendJson(res, 201, employee);
      return;
    }

    const employeeMatch = pathname.match(/^\/api\/employees\/(\d+)$/);
    if (employeeMatch && req.method === 'PUT') {
      requireRole(req, ['Admin']);
      const employeeId = Number(employeeMatch[1]);
      const payload = await parseJsonBody(req);
      const employee = updateEmployee(employeeId, payload);
      sendJson(res, 200, employee);
      return;
    }

    if (employeeMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const employeeId = Number(employeeMatch[1]);
      deleteEmployee(employeeId);
      sendJson(res, 200, { message: 'Employee deleted' });
      return;
    }

    if (pathname === '/api/inventory' && req.method === 'GET') {
      requireAuth(req);
      sendJson(res, 200, getInventory());
      return;
    }

    if (pathname === '/api/inventory' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Staff']);
      const payload = await parseJsonBody(req);
      const item = addInventory(payload);
      sendJson(res, 201, item);
      return;
    }

    const inventoryMatch = pathname.match(/^\/api\/inventory\/(\d+)$/);
    if (inventoryMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Staff']);
      const itemId = Number(inventoryMatch[1]);
      const payload = await parseJsonBody(req);
      const item = updateInventory(itemId, payload);
      sendJson(res, 200, item);
      return;
    }

    if (inventoryMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const itemId = Number(inventoryMatch[1]);
      deleteInventory(itemId);
      sendJson(res, 200, { message: 'Inventory item deleted' });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.status || 400;
    sendJson(res, status, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Grand Hotel ERP backend is running on http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
