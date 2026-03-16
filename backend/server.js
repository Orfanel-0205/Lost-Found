require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   PATHS / UPLOAD FOLDER
========================= */
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================
   DATABASE POOL
========================= */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lost_found_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   TEST DATABASE CONNECTION
========================= */
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database: lost_found_db');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
}

/* =========================
   DATABASE INITIALIZATION
========================= */
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Running database schema checks...');

    // ITEMS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS items (
        ItemID INT AUTO_INCREMENT PRIMARY KEY,
        ItemName VARCHAR(255) NOT NULL,
        ItemType VARCHAR(255),
        ItemColor VARCHAR(255),
        ItemQuantity INT DEFAULT 1,
        Location VARCHAR(255),
        Description TEXT,
        Status VARCHAR(50) NOT NULL DEFAULT 'pending',
        ReportType VARCHAR(50) NOT NULL,
        ReportedBy INT NOT NULL,
        DateReported DATE,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ReportedBy) REFERENCES users(UserID) ON DELETE CASCADE
      )
    `);

    // ITEM IMAGES TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS item_images (
        ItemImageID INT AUTO_INCREMENT PRIMARY KEY,
        ItemID INT NOT NULL,
        ImagePath VARCHAR(255) NOT NULL,
        FOREIGN KEY (ItemID) REFERENCES items(ItemID) ON DELETE CASCADE
      )
    `);

    // CLAIMS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS claims (
        ClaimID INT AUTO_INCREMENT PRIMARY KEY,
        ItemID INT NOT NULL,
        UserID INT NOT NULL,
        description TEXT NOT NULL,
        ImagePath VARCHAR(255) NOT NULL,
        Status VARCHAR(50) NOT NULL DEFAULT 'pending',
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ItemID) REFERENCES items(ItemID) ON DELETE CASCADE,
        FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
      )
    `);

    console.log('Database schema is up to date.');
    connection.release();
  } catch (err) {
    console.error('Error during database initialization:', err.message);
    process.exit(1);
  }
}

/* =========================
   MIDDLEWARE
========================= */
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

app.use(session({
  secret: process.env.SESSION_SECRET || 'unifind_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

/* =========================
   HELPERS / GUARDS
========================= */
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.session.user || req.session.user.roleName !== 'staff') {
    return res.status(403).json({ error: 'Staff access only' });
  }
  next();
}

/* =========================
   BASIC HEALTH CHECK
========================= */
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ success: true, db: rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   AUTH ROUTES
========================= */
app.post('/api/register', async (req, res) => {
  const { fname, lname, email, password, studentId, contactNo } = req.body;

  if (!fname || !lname || !email || !password) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT UserID FROM users WHERE Email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (RoleID, FName, LName, Email, Password, StudentID, ContactNo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [1, fname, lname, email, hashedPassword, studentId || null, contactNo || null]
    );

    res.json({
      success: true,
      message: 'Account created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, r.RoleName
       FROM users u
       JOIN roles r ON u.RoleID = r.RoleID
       WHERE u.Email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
      id: user.UserID,
      fname: user.FName,
      lname: user.LName,
      email: user.Email,
      roleId: user.RoleID,
      roleName: user.RoleName
    };

    res.json({
      success: true,
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

/* =========================
   ITEM ROUTES
========================= */
app.get('/api/items', async (req, res) => {
  const { search, status, type } = req.query;

  let query = `
    SELECT
      i.*,
      u.FName,
      u.LName,
      u.StudentID,
      (
        SELECT ImagePath
        FROM item_images
        WHERE ItemID = i.ItemID
        LIMIT 1
      ) AS ThumbnailPath
    FROM items i
    LEFT JOIN users u ON i.ReportedBy = u.UserID
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    query += `
      AND (
        i.ItemName LIKE ?
        OR i.Description LIKE ?
        OR i.ItemColor LIKE ?
        OR i.Location LIKE ?
        OR i.ItemType LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ' AND i.Status = ?';
    params.push(status);
  }

  if (type) {
    query += ' AND i.ReportType = ?';
    params.push(type);
  }

  query += ' ORDER BY i.CreatedAt DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT
         i.*,
         u.FName,
         u.LName,
         u.StudentID,
         u.ContactNo,
         u.Email AS ReporterEmail
       FROM items i
       LEFT JOIN users u ON i.ReportedBy = u.UserID
       WHERE i.ItemID = ?`,
      [req.params.id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [images] = await pool.query(
      'SELECT * FROM item_images WHERE ItemID = ? ORDER BY ItemImageID ASC',
      [req.params.id]
    );

    res.json({
      ...items[0],
      images
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', requireLogin, upload.array('images', 5), async (req, res) => {
  const {
    itemName,
    itemType,
    itemColor,
    itemQuantity,
    description,
    location,
    reportType,
    dateReported
  } = req.body;

  if (!itemName || !reportType) {
    return res.status(400).json({ error: 'Item name and report type are required' });
  }

  if (!['found', 'lost'].includes(reportType)) {
    return res.status(400).json({ error: 'Invalid report type' });
  }

  const status = reportType === 'found' ? 'found' : 'lost';

  try {
    const [result] = await pool.query(
      `INSERT INTO items
      (ItemName, ItemType, ItemColor, ItemQuantity, Description, Location, Status, ReportType, ReportedBy, DateReported)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemName,
        itemType || null,
        itemColor || null,
        Number(itemQuantity) || 1,
        description || null,
        location || null,
        status,
        reportType,
        req.session.user.id,
        dateReported || null
      ]
    );

    const itemId = result.insertId;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          'INSERT INTO item_images (ItemID, ImagePath) VALUES (?, ?)',
          [itemId, '/uploads/' + file.filename]
        );
      }
    }

    res.json({
      success: true,
      itemId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/items/:id', requireStaff, async (req, res) => {
  const {
    status,
    itemName,
    itemType,
    itemColor,
    description,
    location
  } = req.body;

  try {
    await pool.query(
      `UPDATE items
       SET Status = ?, ItemName = ?, ItemType = ?, ItemColor = ?, Description = ?, Location = ?
       WHERE ItemID = ?`,
      [status, itemName, itemType, itemColor, description, location, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id', requireStaff, async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE ItemID = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CLAIM ROUTES
========================= */

// Submit claim
app.post('/api/claims', requireLogin, upload.single('image'), async (req, res) => {
  const { description, itemId } = req.body;
  const imagePath = req.file ? '/uploads/' + req.file.filename : null;

  if (!description || !description.trim() || !imagePath) {
    return res.status(400).json({
      error: 'Description and proof image are required'
    });
  }

  try {
    if (itemId) {
      const [itemRows] = await pool.query(
        'SELECT ItemID, Status FROM items WHERE ItemID = ?',
        [itemId]
      );

      if (itemRows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const [existingClaim] = await pool.query(
        `SELECT ClaimID
         FROM claims
         WHERE ItemID = ? AND UserID = ? AND Status = 'pending'`,
        [itemId, req.session.user.id]
      );

      if (existingClaim.length > 0) {
        return res.status(400).json({
          error: 'You already have a pending claim for this item'
        });
      }
    }

    const effectiveItemId = itemId || null;
    const [result] = await pool.query(
      `INSERT INTO claims (ItemID, UserID, description, ImagePath)
       VALUES (?, ?, ?, ?)`,
      [effectiveItemId, req.session.user.id, description.trim(), imagePath]
    );

    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student: view own claims
app.get('/api/my-claims', requireLogin, async (req, res) => {
  try {
    const [claims] = await pool.query(`
      SELECT
        c.ClaimID,
        c.description AS ProofDescription,
        c.ImagePath AS ClaimImagePath,
        c.Status AS ClaimStatus,
        c.CreatedAt AS ClaimDate,
        i.ItemID,
        i.ItemName,
        i.ItemColor,
        i.ItemType,
        i.Status AS ItemStatus,
        (
          SELECT ImagePath
          FROM item_images
          WHERE ItemID = i.ItemID
          LIMIT 1
        ) AS ThumbnailPath
      FROM claims c
      JOIN items i ON c.ItemID = i.ItemID
      WHERE c.UserID = ?
      ORDER BY c.CreatedAt DESC
    `, [req.session.user.id]);

    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff: view all claims
app.get('/api/claims/all', requireStaff, async (req, res) => {
  try {
    const [claims] = await pool.query(`
      SELECT
        c.ClaimID,
        c.ItemID,
        c.description AS ClaimDescription,
        c.ImagePath AS ClaimImagePath,
        c.Status AS ClaimStatus,
        c.CreatedAt AS ClaimDate,
        i.ItemName,
        i.ItemType,
        i.ItemColor,
        i.Description AS ItemDescription,
        i.Status AS ItemStatus,
        (
          SELECT ImagePath
          FROM item_images
          WHERE ItemID = i.ItemID
          LIMIT 1
        ) AS ItemThumbnail,
        u.FName,
        u.LName,
        u.Email,
        u.StudentID,
        u.ContactNo
      FROM claims c
      LEFT JOIN items i ON c.ItemID = i.ItemID
      JOIN users u ON c.UserID = u.UserID
      ORDER BY c.CreatedAt DESC
    `);

    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff: approve claim
app.put('/api/claims/:id/approve', requireStaff, async (req, res) => {
  const claimId = req.params.id;

  try {
    const [claimRows] = await pool.query(
      'SELECT ClaimID, ItemID FROM claims WHERE ClaimID = ?',
      [claimId]
    );

    if (claimRows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const itemId = claimRows[0].ItemID;

    await pool.query(
      `UPDATE claims SET Status = 'approved' WHERE ClaimID = ?`,
      [claimId]
    );

    if (itemId) {
      await pool.query(
        `UPDATE items SET Status = 'pickup_ready' WHERE ItemID = ?`,
        [itemId]
      );
    }

    res.json({ success: true, message: 'Claim approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff: reject claim
app.put('/api/claims/:id/reject', requireStaff, async (req, res) => {
  const claimId = req.params.id;

  try {
    const [claimRows] = await pool.query(
      'SELECT ClaimID FROM claims WHERE ClaimID = ?',
      [claimId]
    );

    if (claimRows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    await pool.query(
      `UPDATE claims SET Status = 'rejected' WHERE ClaimID = ?`,
      [claimId]
    );

    res.json({ success: true, message: 'Claim rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DASHBOARD STATISTICS
========================= */
app.get('/api/dashboard-stats', requireStaff, async (req, res) => {
  try {
    const [[found]] = await pool.query(
      `SELECT COUNT(*) AS count FROM items WHERE Status = 'found'`
    );
    const [[lost]] = await pool.query(
      `SELECT COUNT(*) AS count FROM items WHERE Status = 'lost'`
    );
    const [[claimed]] = await pool.query(
      `SELECT COUNT(*) AS count FROM items WHERE Status = 'claimed'`
    );
    const [[returned]] = await pool.query(
      `SELECT COUNT(*) AS count FROM items WHERE Status = 'returned'`
    );
    const [[total]] = await pool.query(
      `SELECT COUNT(*) AS count FROM items`
    );

    res.json({
      found: found.count,
      lost: lost.count,
      claimed: claimed.count,
      returned: returned.count,
      total: total.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
async function startServer() {
  await testDatabaseConnection();
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`FEU Lost & Found Server running at http://localhost:${PORT}`);
  });
}

startServer();