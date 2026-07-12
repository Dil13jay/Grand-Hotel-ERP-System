const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'grand_hotel_db'
};

let pool;

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

async function initDb() {
  // First connect to mysql server without a database to ensure database exists
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await connection.end();

  // Create connection pool
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Table definitions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      full_name VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_number VARCHAR(20) NOT NULL UNIQUE,
      room_type VARCHAR(100) NOT NULL,
      floor VARCHAR(20) NOT NULL,
      capacity INT NOT NULL DEFAULT 2,
      rate_per_night DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'Available',
      \`condition\` VARCHAR(50) NOT NULL DEFAULT 'Excellent',
      amenities TEXT,
      notes TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guest_name VARCHAR(255) NOT NULL,
      room_number VARCHAR(20) NOT NULL,
      check_in VARCHAR(20) NOT NULL,
      check_out VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      notes TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reservation_id INT NOT NULL,
      guest_name VARCHAR(255) NOT NULL,
      amount_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
      notes TEXT,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'Active'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      category VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Ready',
      notes TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seeding
  const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (userRows[0].count === 0) {
    for (const user of defaultUsers) {
      await pool.query(
        'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
        [user.username, hashPassword(user.password), user.role, user.full_name]
      );
    }
  }

  const [roomRows] = await pool.query('SELECT COUNT(*) AS count FROM rooms');
  if (roomRows[0].count === 0) {
    for (const room of initialRooms) {
      await pool.query(
        'INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, `condition`, amenities, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [room.number, room.type, room.floor, room.capacity, room.rate, room.status, room.condition, room.amenities, room.notes]
      );
    }
  }

  const [reservationRows] = await pool.query('SELECT COUNT(*) AS count FROM reservations');
  if (reservationRows[0].count === 0) {
    for (const res of initialReservations) {
      await pool.query(
        'INSERT INTO reservations (guest_name, room_number, check_in, check_out, status, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [res.guest_name, res.room_number, res.check_in, res.check_out, res.status, res.amount, res.notes]
      );
    }
  }

  const [billRows] = await pool.query('SELECT COUNT(*) AS count FROM bills');
  if (billRows[0].count === 0) {
    for (const bill of initialBills) {
      await pool.query(
        'INSERT INTO bills (reservation_id, guest_name, amount_due, status, notes) VALUES (?, ?, ?, ?, ?)',
        [bill.reservation_id, bill.guest_name, bill.amount_due, bill.status, bill.notes]
      );
    }
  }

  const [employeeRows] = await pool.query('SELECT COUNT(*) AS count FROM employees');
  if (employeeRows[0].count === 0) {
    for (const emp of initialEmployees) {
      await pool.query(
        'INSERT INTO employees (name, role, department, phone, status) VALUES (?, ?, ?, ?, ?)',
        [emp.name, emp.role, emp.department, emp.phone, emp.status]
      );
    }
  }

  const [inventoryRows] = await pool.query('SELECT COUNT(*) AS count FROM inventory');
  if (inventoryRows[0].count === 0) {
    for (const item of initialInventory) {
      await pool.query(
        'INSERT INTO inventory (item_name, quantity, category, status, notes) VALUES (?, ?, ?, ?, ?)',
        [item.item_name, item.quantity, item.category, item.status, item.notes]
      );
    }
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

async function getRooms() {
  const [rows] = await pool.query(`
    SELECT id, room_number, room_type, floor, capacity, rate_per_night, status, \`condition\`, amenities, notes
    FROM rooms
    ORDER BY CAST(room_number AS UNSIGNED), room_number
  `);
  return rows.map(mapRoom);
}

async function getReservations() {
  const [rows] = await pool.query(`
    SELECT id, guest_name, room_number, check_in, check_out, status, amount, notes
    FROM reservations
    ORDER BY check_in DESC
  `);
  return rows.map(mapReservation);
}

async function getBills() {
  const [rows] = await pool.query(`
    SELECT id, reservation_id, guest_name, amount_due, status, notes
    FROM bills
    ORDER BY id DESC
  `);
  return rows.map(mapBill);
}

async function getEmployees() {
  const [rows] = await pool.query(`
    SELECT id, name, role, department, phone, status
    FROM employees
    ORDER BY name
  `);
  return rows.map(mapEmployee);
}

async function getInventory() {
  const [rows] = await pool.query(`
    SELECT id, item_name, quantity, category, status, notes
    FROM inventory
    ORDER BY item_name
  `);
  return rows.map(mapInventory);
}

async function addRoom(payload) {
  const roomNumber = String(payload.number || '').trim();
  if (!roomNumber) throw new Error('Room number is required');
  const [existing] = await pool.query('SELECT id FROM rooms WHERE lower(room_number) = lower(?)', [roomNumber]);
  if (existing.length > 0) throw new Error('Room number already exists');

  const [result] = await pool.query(`
    INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, \`condition\`, amenities, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    roomNumber,
    payload.type || 'Standard',
    payload.floor || '1',
    Number(payload.capacity || 2),
    Number(payload.rate || 0),
    payload.status || 'Available',
    payload.condition || 'Excellent',
    payload.amenities || '',
    payload.notes || ''
  ]);
  return await getRoomById(result.insertId);
}

async function updateRoom(roomId, payload) {
  const roomNumber = String(payload.number || '').trim();
  if (!roomNumber) throw new Error('Room number is required');
  const [existing] = await pool.query('SELECT id FROM rooms WHERE lower(room_number) = lower(?) AND id != ?', [roomNumber, roomId]);
  if (existing.length > 0) throw new Error('Room number already exists');

  await pool.query(`
    UPDATE rooms
    SET room_number = ?, room_type = ?, floor = ?, capacity = ?, rate_per_night = ?, status = ?, \`condition\` = ?, amenities = ?, notes = ?
    WHERE id = ?
  `, [
    roomNumber,
    payload.type || 'Standard',
    payload.floor || '1',
    Number(payload.capacity || 2),
    Number(payload.rate || 0),
    payload.status || 'Available',
    payload.condition || 'Excellent',
    payload.amenities || '',
    payload.notes || '',
    roomId
  ]);
  return await getRoomById(roomId);
}

async function updateRoomStatus(roomId, status) {
  const room = await getRoomById(roomId);
  if (!room) throw new Error('Room not found');
  let condition = room.condition;
  if (status === 'Maintenance') condition = 'Repair Required';
  if (status === 'Available' && room.condition === 'Repair Required') condition = 'Good';
  await pool.query('UPDATE rooms SET status = ?, \`condition\` = ? WHERE id = ?', [status, condition, roomId]);
  return await getRoomById(roomId);
}

async function deleteRoom(roomId) {
  const room = await getRoomById(roomId);
  if (!room) throw new Error('Room not found');
  await pool.query('DELETE FROM rooms WHERE id = ?', [roomId]);
  return true;
}

async function getRoomById(roomId) {
  const [rows] = await pool.query('SELECT id, room_number, room_type, floor, capacity, rate_per_night, status, \`condition\`, amenities, notes FROM rooms WHERE id = ?', [roomId]);
  return rows.length > 0 ? mapRoom(rows[0]) : null;
}

async function addReservation(payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  const [result] = await pool.query(`
    INSERT INTO reservations (guest_name, room_number, check_in, check_out, status, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    guest,
    String(payload.room_number || '').trim(),
    String(payload.check_in || '').trim(),
    String(payload.check_out || '').trim(),
    payload.status || 'Pending',
    Number(payload.amount || 0),
    payload.notes || ''
  ]);
  return await getReservationById(result.insertId);
}

async function updateReservation(reservationId, payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  await pool.query(`
    UPDATE reservations
    SET guest_name = ?, room_number = ?, check_in = ?, check_out = ?, status = ?, amount = ?, notes = ?
    WHERE id = ?
  `, [
    guest,
    String(payload.room_number || '').trim(),
    String(payload.check_in || '').trim(),
    String(payload.check_out || '').trim(),
    payload.status || 'Pending',
    Number(payload.amount || 0),
    payload.notes || '',
    reservationId
  ]);
  return await getReservationById(reservationId);
}

async function deleteReservation(reservationId) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');
  await pool.query('DELETE FROM reservations WHERE id = ?', [reservationId]);
  await pool.query('DELETE FROM bills WHERE reservation_id = ?', [reservationId]);
  return true;
}

async function getReservationById(reservationId) {
  const [rows] = await pool.query('SELECT id, guest_name, room_number, check_in, check_out, status, amount, notes FROM reservations WHERE id = ?', [reservationId]);
  return rows.length > 0 ? mapReservation(rows[0]) : null;
}

async function addBill(payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  const reservationId = Number(payload.reservation_id || 0);
  if (!reservationId) throw new Error('Reservation ID is required');
  const [result] = await pool.query(`
    INSERT INTO bills (reservation_id, guest_name, amount_due, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `, [
    reservationId,
    guest,
    Number(payload.amount_due || 0),
    payload.status || 'Unpaid',
    payload.notes || ''
  ]);
  return await getBillById(result.insertId);
}

async function updateBill(billId, payload) {
  const guest = String(payload.guest_name || '').trim();
  if (!guest) throw new Error('Guest name is required');
  await pool.query(`
    UPDATE bills
    SET reservation_id = ?, guest_name = ?, amount_due = ?, status = ?, notes = ?
    WHERE id = ?
  `, [
    Number(payload.reservation_id || 0),
    guest,
    Number(payload.amount_due || 0),
    payload.status || 'Unpaid',
    payload.notes || '',
    billId
  ]);
  return await getBillById(billId);
}

async function markBillPaid(billId) {
  const bill = await getBillById(billId);
  if (!bill) throw new Error('Bill not found');
  await pool.query('UPDATE bills SET status = ? WHERE id = ?', ['Paid', billId]);
  return await getBillById(billId);
}

async function getBillById(billId) {
  const [rows] = await pool.query('SELECT id, reservation_id, guest_name, amount_due, status, notes FROM bills WHERE id = ?', [billId]);
  return rows.length > 0 ? mapBill(rows[0]) : null;
}

async function addEmployee(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Employee name is required');
  const [result] = await pool.query(`
    INSERT INTO employees (name, role, department, phone, status)
    VALUES (?, ?, ?, ?, ?)
  `, [
    name,
    payload.role || 'Staff',
    payload.department || 'General',
    String(payload.phone || '').trim(),
    payload.status || 'Active'
  ]);
  return await getEmployeeById(result.insertId);
}

async function updateEmployee(employeeId, payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Employee name is required');
  await pool.query(`
    UPDATE employees
    SET name = ?, role = ?, department = ?, phone = ?, status = ?
    WHERE id = ?
  `, [
    name,
    payload.role || 'Staff',
    payload.department || 'General',
    String(payload.phone || '').trim(),
    payload.status || 'Active',
    employeeId
  ]);
  return await getEmployeeById(employeeId);
}

async function deleteEmployee(employeeId) {
  const employee = await getEmployeeById(employeeId);
  if (!employee) throw new Error('Employee not found');
  await pool.query('DELETE FROM employees WHERE id = ?', [employeeId]);
  return true;
}

async function getEmployeeById(employeeId) {
  const [rows] = await pool.query('SELECT id, name, role, department, phone, status FROM employees WHERE id = ?', [employeeId]);
  return rows.length > 0 ? mapEmployee(rows[0]) : null;
}

async function addInventory(payload) {
  const name = String(payload.item_name || '').trim();
  if (!name) throw new Error('Item name is required');
  const [result] = await pool.query(`
    INSERT INTO inventory (item_name, quantity, category, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `, [
    name,
    Number(payload.quantity || 0),
    payload.category || 'General',
    payload.status || 'Ready',
    payload.notes || ''
  ]);
  return await getInventoryById(result.insertId);
}

async function updateInventory(itemId, payload) {
  const name = String(payload.item_name || '').trim();
  if (!name) throw new Error('Item name is required');
  await pool.query(`
    UPDATE inventory
    SET item_name = ?, quantity = ?, category = ?, status = ?, notes = ?
    WHERE id = ?
  `, [
    name,
    Number(payload.quantity || 0),
    payload.category || 'General',
    payload.status || 'Ready',
    payload.notes || '',
    itemId
  ]);
  return await getInventoryById(itemId);
}

async function deleteInventory(itemId) {
  const item = await getInventoryById(itemId);
  if (!item) throw new Error('Inventory item not found');
  await pool.query('DELETE FROM inventory WHERE id = ?', [itemId]);
  return true;
}

async function getInventoryById(itemId) {
  const [rows] = await pool.query('SELECT id, item_name, quantity, category, status, notes FROM inventory WHERE id = ?', [itemId]);
  return rows.length > 0 ? mapInventory(rows[0]) : null;
}

async function findUserByUsername(username) {
  const [rows] = await pool.query('SELECT id, username, password_hash, role, full_name FROM users WHERE lower(username)=lower(?)', [username]);
  return rows.length > 0 ? rows[0] : null;
}

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
      const user = await findUserByUsername(String(payload.username || '').trim());
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
      sendJson(res, 200, await getRooms());
      return;
    }

    if (pathname === '/api/rooms' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Receptionist']);
      const payload = await parseJsonBody(req);
      const room = await addRoom(payload);
      sendJson(res, 201, room);
      return;
    }

    if (pathname === '/api/rooms/reset' && req.method === 'POST') {
      requireRole(req, ['Admin']);
      await pool.query('DELETE FROM rooms');
      for (const room of initialRooms) {
        await pool.query(
          'INSERT INTO rooms (room_number, room_type, floor, capacity, rate_per_night, status, `condition`, amenities, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [room.number, room.type, room.floor, room.capacity, room.rate, room.status, room.condition, room.amenities, room.notes]
        );
      }
      sendJson(res, 200, { message: 'Rooms restored' });
      return;
    }

    const roomMatch = pathname.match(/^\/api\/rooms\/(\d+)$/);
    if (roomMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Receptionist']);
      const roomId = Number(roomMatch[1]);
      const payload = await parseJsonBody(req);
      const room = await updateRoom(roomId, payload);
      sendJson(res, 200, room);
      return;
    }

    if (roomMatch && req.method === 'PATCH') {
      requireRole(req, ['Admin', 'Receptionist', 'Staff']);
      const roomId = Number(roomMatch[1]);
      const payload = await parseJsonBody(req);
      const room = await updateRoomStatus(roomId, payload.status);
      sendJson(res, 200, room);
      return;
    }

    if (roomMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin', 'Receptionist']);
      const roomId = Number(roomMatch[1]);
      await deleteRoom(roomId);
      sendJson(res, 200, { message: 'Room deleted' });
      return;
    }

    if (pathname === '/api/reservations' && req.method === 'GET') {
      requireAuth(req);
      sendJson(res, 200, await getReservations());
      return;
    }

    if (pathname === '/api/reservations' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Receptionist']);
      const payload = await parseJsonBody(req);
      const reservation = await addReservation(payload);
      sendJson(res, 201, reservation);
      return;
    }

    const reservationMatch = pathname.match(/^\/api\/reservations\/(\d+)$/);
    if (reservationMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Receptionist']);
      const reservationId = Number(reservationMatch[1]);
      const payload = await parseJsonBody(req);
      const reservation = await updateReservation(reservationId, payload);
      sendJson(res, 200, reservation);
      return;
    }

    if (reservationMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const reservationId = Number(reservationMatch[1]);
      await deleteReservation(reservationId);
      sendJson(res, 200, { message: 'Reservation deleted' });
      return;
    }

    if (pathname === '/api/bills' && req.method === 'GET') {
      requireRole(req, ['Admin', 'Accountant']);
      sendJson(res, 200, await getBills());
      return;
    }

    if (pathname === '/api/bills' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Accountant']);
      const payload = await parseJsonBody(req);
      const bill = await addBill(payload);
      sendJson(res, 201, bill);
      return;
    }

    const billMatch = pathname.match(/^\/api\/bills\/(\d+)$/);
    if (billMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Accountant']);
      const billId = Number(billMatch[1]);
      const payload = await parseJsonBody(req);
      const bill = await updateBill(billId, payload);
      sendJson(res, 200, bill);
      return;
    }

    if (pathname.match(/^\/api\/bills\/(\d+)\/pay$/) && req.method === 'PATCH') {
      requireRole(req, ['Admin', 'Accountant']);
      const billId = Number(pathname.split('/')[3]);
      const bill = await markBillPaid(billId);
      sendJson(res, 200, bill);
      return;
    }

    if (pathname === '/api/employees' && req.method === 'GET') {
      requireRole(req, ['Admin']);
      sendJson(res, 200, await getEmployees());
      return;
    }

    if (pathname === '/api/employees' && req.method === 'POST') {
      requireRole(req, ['Admin']);
      const payload = await parseJsonBody(req);
      const employee = await addEmployee(payload);
      sendJson(res, 201, employee);
      return;
    }

    const employeeMatch = pathname.match(/^\/api\/employees\/(\d+)$/);
    if (employeeMatch && req.method === 'PUT') {
      requireRole(req, ['Admin']);
      const employeeId = Number(employeeMatch[1]);
      const payload = await parseJsonBody(req);
      const employee = await updateEmployee(employeeId, payload);
      sendJson(res, 200, employee);
      return;
    }

    if (employeeMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const employeeId = Number(employeeMatch[1]);
      await deleteEmployee(employeeId);
      sendJson(res, 200, { message: 'Employee deleted' });
      return;
    }

    if (pathname === '/api/inventory' && req.method === 'GET') {
      requireAuth(req);
      sendJson(res, 200, await getInventory());
      return;
    }

    if (pathname === '/api/inventory' && req.method === 'POST') {
      requireRole(req, ['Admin', 'Staff']);
      const payload = await parseJsonBody(req);
      const item = await addInventory(payload);
      sendJson(res, 201, item);
      return;
    }

    const inventoryMatch = pathname.match(/^\/api\/inventory\/(\d+)$/);
    if (inventoryMatch && req.method === 'PUT') {
      requireRole(req, ['Admin', 'Staff']);
      const itemId = Number(inventoryMatch[1]);
      const payload = await parseJsonBody(req);
      const item = await updateInventory(itemId, payload);
      sendJson(res, 200, item);
      return;
    }

    if (inventoryMatch && req.method === 'DELETE') {
      requireRole(req, ['Admin']);
      const itemId = Number(inventoryMatch[1]);
      await deleteInventory(itemId);
      sendJson(res, 200, { message: 'Inventory item deleted' });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.status || 400;
    sendJson(res, status, { error: error.message || 'Server error' });
  }
});

async function startServer() {
  try {
    await initDb();
    server.listen(PORT, () => {
      console.log(`Grand Hotel ERP backend is running on http://localhost:${PORT}`);
      console.log(`MySQL Database: ${dbConfig.database} at ${dbConfig.host}`);
    });
  } catch (error) {
    console.error('Failed to initialize database or start server:', error);
    process.exit(1);
  }
}

startServer();
