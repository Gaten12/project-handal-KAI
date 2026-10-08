// database.js - Inisialisasi database SQLite SIPARKA
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'siparka.db');
const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =============================================
// Buat semua tabel
// =============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama TEXT,
    role TEXT NOT NULL DEFAULT 'petugas',
    signature TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trains (
    id TEXT PRIMARY KEY,
    nomorKA TEXT,
    namaKA TEXT,
    jenis TEXT,
    tanggalPemeriksaan TEXT,
    lokasi TEXT,
    status TEXT,
    petugas TEXT,
    catatan TEXT,
    data TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    trainId TEXT,
    nomorKA TEXT,
    namaKA TEXT,
    petugas TEXT,
    petugasEmail TEXT,
    tanggalInspeksi TEXT,
    status TEXT DEFAULT 'Menunggu',
    emailSent INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hasilPemeriksaan (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    importedAt TEXT DEFAULT (datetime('now'))
  );
`);

// Buat akun admin default jika belum ada
const adminExists = db.prepare("SELECT id FROM users WHERE email = 'admin@kai.id'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  const uid = 'admin-' + Date.now();
  db.prepare(`
    INSERT INTO users (uid, email, password, nama, role) 
    VALUES (?, ?, ?, ?, ?)
  `).run(uid, 'admin@kai.id', hash, 'Administrator', 'admin');
  console.log('✅ Akun admin default dibuat: admin@kai.id / admin123');
  console.log('⚠️  Segera ganti password admin setelah login pertama!');
}

console.log('✅ Database SQLite siap: ' + DB_PATH);

module.exports = db;
