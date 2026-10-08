require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize SQLite database
const db = require('./database.js');

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'siparka-kai-secret-key-ganti-ini-di-production';
const JWT_EXPIRES = '8h';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Prevent caching for all API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// =============================================
// AUTH MIDDLEWARE (JWT)
// =============================================
const checkAuth = (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split('Bearer ')[1].trim();
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: 'Unauthorized: Token kosong' });
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(403).json({ message: 'Unauthorized: Token tidak valid atau kadaluarsa' });
        }
    } else {
        return res.status(401).json({ message: 'Unauthorized: Tidak ada token' });
    }
};

// Protect all /api/ routes EXCEPT auth endpoints
app.use('/api/', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    // Buka akses untuk pendaftaran (Register) secara publik
    if (req.path === '/users' && req.method === 'POST') return next();
    return checkAuth(req, res, next);
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// =============================================
// AUTH ENDPOINTS
// =============================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { nip, password } = req.body;
    if (!nip || !password) {
        return res.status(400).json({ message: 'NIP dan password wajib diisi' });
    }
    const user = db.prepare('SELECT * FROM users WHERE nip = ?').get(nip);
    if (!user) {
        return res.status(401).json({ message: 'NIP atau password salah' });
    }
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
        return res.status(401).json({ message: 'NIP atau password salah' });
    }
    const token = jwt.sign(
        { uid: user.uid, nip: user.nip, email: user.email, nama: user.nama, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, user: { uid: user.uid, nip: user.nip, email: user.email, nama: user.nama, role: user.role } });
});

// GET /api/auth/me - cek token masih valid
app.get('/api/auth/me', checkAuth, (req, res) => {
    res.json({ user: req.user });
});

// POST /api/auth/logout (client side cukup hapus token)
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out' });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', checkAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Password lama dan baru wajib diisi' });
    }
    const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(req.user.uid);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const match = bcrypt.compareSync(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Password lama salah' });

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE uid = ?').run(newHash, req.user.uid);
    res.json({ message: 'Password berhasil diubah' });
});

// =============================================
// HELPER
// =============================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatStatus(status) {
    if (!status) return '';
    if (status.toUpperCase() === 'BAIK') return 'B';
    if (status.toUpperCase() === 'TIADA') return 'T';
    if (status.toUpperCase() === 'RUSAK') return 'R';
    return status;
}

// =============================================
// EXCEL PARSING
// =============================================
app.post('/api/parse-taman-kereta', upload.single('excelFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File Excel tidak ditemukan.' });
        }
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (data.length < 10) {
            return res.status(400).json({ message: 'Format Excel tidak valid.' });
        }

        const headerRow = data[4];
        const namaKaRow = data[5];
        const rangkaianList = [];

        for (let col = 1; col <= 9; col++) {
            const headerNoKA = headerRow[col];
            const namaKA = namaKaRow[col];
            if (!headerNoKA || !namaKA) continue;

            let pilihanNoKA = [];
            const match = headerNoKA.match(/KA\s*([\d\s\/]+)/i);
            if (match) {
                pilihanNoKA = match[1].split('/').map(s => s.trim()).filter(s => s);
            } else {
                const matchPlb = headerNoKA.match(/PLB\s*([\d\w\s\/]+)/i);
                if (matchPlb) {
                    pilihanNoKA = matchPlb[1].split('/').map(s => s.replace(/[^\d]/g, '').trim()).filter(s => s);
                } else {
                    pilihanNoKA = [headerNoKA.replace(/[^\d]/g, '').trim()].filter(s => s);
                }
            }

            const gerbongList = [];
            for (let row = 8; row < data.length; row++) {
                const cellValue = data[row][col];
                if (typeof cellValue === 'string' && cellValue.trim() !== '') {
                    const regex = /^(P|K1lux|K1|K3|M1)(?: ?)(?:SS NG|SS)\.?\s*([\d ]+)/;
                    const m = cellValue.trim().match(regex);
                    if (m) {
                        let tipe = m[1];
                        if (tipe === 'K1lux') tipe = 'K1';
                        const seri = m[2];
                        gerbongList.push({ nomorSarana: `${tipe} ${seri}`, tipeGerbong: tipe, raw: cellValue.trim() });
                    }
                } else if (data[row][0] === 'KRT D. LAIN') {
                    break;
                }
            }

            if (gerbongList.length > 0) {
                rangkaianList.push({ headerNoKA, pilihanNoKA, namaKA, gerbongList });
            }
        }

        res.json({ tanggal: data[1][0] || 'TANGGAL TIDAK DIKETAHUI', rangkaianList });
    } catch (error) {
        console.error('Error parsing excel:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat parsing file Excel.' });
    }
});


// =============================================
// TRAINS (DATASET KA)
// =============================================
app.get('/api/trains', (req, res) => {
    try {
        const trains = db.prepare('SELECT * FROM trains ORDER BY tanggalPemeriksaan DESC').all();
        const result = trains.map(t => {
            let extra = {};
            if (t.data) { try { extra = JSON.parse(t.data); } catch (e) { } }
            // Pastikan properti asli database tidak tertimpa oleh extra data
            return { ...extra, ...t };
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching trains:', error);
        res.status(500).json({ message: 'Failed to fetch train data' });
    }
});

app.post('/api/trains', (req, res) => {
    try {
        const newTrain = req.body;
        // Gunakan ID dari frontend jika ada, jika tidak buat baru
        const id = newTrain.id || generateId();
        const { nomorKA, namaKA, jenis, tanggalPemeriksaan, lokasi, status, petugas, catatan } = newTrain;

        const knownFields = ['id', 'nomorKA', 'namaKA', 'jenis', 'tanggalPemeriksaan', 'lokasi', 'status', 'petugas', 'catatan'];
        const extra = Object.fromEntries(Object.entries(newTrain).filter(([k]) => !knownFields.includes(k)));

        db.prepare(`INSERT INTO trains (id, nomorKA, namaKA, jenis, tanggalPemeriksaan, lokasi, status, petugas, catatan, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, nomorKA || null, namaKA || null, jenis || null,
            tanggalPemeriksaan || null, lokasi || null, status || null,
            petugas || null, catatan || null,
            Object.keys(extra).length ? JSON.stringify(extra) : null
        );
        res.status(201).json({ message: 'Data kereta berhasil disimpan', train: { ...extra, ...newTrain, id } });
    } catch (error) {
        console.error('Error adding train:', error);
        res.status(500).json({ message: 'Failed to save train data' });
    }
});

app.put('/api/trains/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] PUT /api/trains/${id} called with body:`, req.body);
        const upd = req.body;
        const { nomorKA, namaKA, jenis, tanggalPemeriksaan, lokasi, status, petugas, catatan } = upd;

        const knownFields = ['nomorKA', 'namaKA', 'jenis', 'tanggalPemeriksaan', 'lokasi', 'status', 'petugas', 'catatan'];
        const extra = Object.fromEntries(Object.entries(upd).filter(([k]) => !knownFields.includes(k)));

        const stmt = db.prepare(`UPDATE trains SET nomorKA=?, namaKA=?, jenis=?, tanggalPemeriksaan=?, lokasi=?, status=?, petugas=?, catatan=?, data=?, updatedAt=datetime('now') WHERE id=?`);
        const info = stmt.run(
            nomorKA || null, namaKA || null, jenis || null,
            tanggalPemeriksaan || null, lokasi || null, status || null,
            petugas || null, catatan || null,
            Object.keys(extra).length ? JSON.stringify(extra) : null,
            id
        );
        console.log(`[DEBUG] Update result:`, info);
        res.json({ message: 'Data kereta berhasil diperbarui', train: { id, ...upd } });
    } catch (error) {
        console.error('Error updating train:', error);
        res.status(500).json({ message: 'Failed to update train data' });
    }
});

app.delete('/api/trains/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] DELETE /api/trains/${id} called`);
        const info = db.prepare('DELETE FROM trains WHERE id = ?').run(id);
        console.log(`[DEBUG] Delete result:`, info);
        res.json({ message: 'Data berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting train:', error);
        res.status(500).json({ message: 'Failed to delete train data' });
    }
});




// =============================================
// USERS
// =============================================
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare("SELECT uid, nip, email, nama, role, createdAt FROM users WHERE role = 'petugas'").all();
        res.json(users.map(u => ({ ...u, id: u.uid })));
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// POST /api/users - tambah user baru (admin only)
app.post('/api/users', (req, res) => {
    try {
        const { nip, email, password, nama, role } = req.body;
        if (!nip || !password) return res.status(400).json({ message: 'NIP dan password wajib diisi' });

        // Cek manual NIP atau Email (Opsional, tapi bagus untuk validasi awal)
        const existing = db.prepare('SELECT id FROM users WHERE nip = ? OR email = ?').get(nip, email);
        if (existing) return res.status(409).json({ message: 'NIP atau Email sudah terdaftar pada akun lain' });

        const hash = bcrypt.hashSync(password, 10);
        const uid = 'user-' + generateId();
        db.prepare('INSERT INTO users (uid, nip, email, password, nama, role) VALUES (?, ?, ?, ?, ?, ?)').run(uid, nip, email || `${nip}@kai.id`, hash, nama || null, role || 'petugas');
        res.status(201).json({ message: 'User berhasil dibuat', user: { uid, nip, email, nama, role } });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Data duplikat terdeteksi (NIP atau Email sudah terdaftar pada akun lain).' });
        }
        res.status(500).json({ message: 'Gagal membuat akun user. Silakan coba lagi.' });
    }
});

// PUT /api/users/:uid - edit user (admin only)
app.put('/api/users/:uid', (req, res) => {
    try {
        const { nip, email, nama, password } = req.body;

        // Cek apakah NIP sudah dipakai user lain
        const existing = db.prepare('SELECT id FROM users WHERE nip = ? AND uid != ?').get(nip, req.params.uid);
        if (existing) {
            return res.status(409).json({ message: 'NIP tersebut sudah digunakan oleh akun lain. Silakan gunakan NIP yang berbeda.' });
        }

        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET nip = ?, email = ?, nama = ?, password = ? WHERE uid = ?').run(nip, email, nama, hash, req.params.uid);
        } else {
            db.prepare('UPDATE users SET nip = ?, email = ?, nama = ? WHERE uid = ?').run(nip, email, nama, req.params.uid);
        }
        res.json({ message: 'User berhasil diupdate' });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Data duplikat terdeteksi (NIP atau Email sudah terdaftar).' });
        }
        res.status(500).json({ message: 'Gagal memperbarui data user. Silakan coba lagi.' });
    }
});

// DELETE /api/users/:uid
app.delete('/api/users/:uid', (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE uid = ?').run(req.params.uid);
        res.json({ message: 'User berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// =============================================
// SCHEDULES
// =============================================
app.post('/api/schedule', (req, res) => {
    try {
        const { trainId, nomorKA, namaKA, petugas, tanggalInspeksi } = req.body;
        const id = generateId();
        const petugasStr = typeof petugas === 'object' ? JSON.stringify(petugas) : petugas;
        const petugasEmail = typeof petugas === 'object' ? petugas.email : null;
        db.prepare('INSERT INTO schedules (id, trainId, nomorKA, namaKA, petugas, petugasEmail, tanggalInspeksi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, trainId || null, nomorKA || null, namaKA || null, petugasStr, petugasEmail, tanggalInspeksi || null, 'Menunggu');
        const schedule = { id, trainId, nomorKA, namaKA, petugas, tanggalInspeksi, status: 'Menunggu' };
        res.json({ message: 'Schedule saved', schedule });
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({ message: 'Failed to save schedule' });
    }
});

app.post('/api/schedules', (req, res) => {
    try {
        const { trainId, nomorKA, namaKA, petugas, tanggalInspeksi, status } = req.body;
        const id = generateId();
        const petugasStr = typeof petugas === 'object' ? JSON.stringify(petugas) : petugas;
        const petugasEmail = typeof petugas === 'object' ? petugas.email : null;
        db.prepare('INSERT INTO schedules (id, trainId, nomorKA, namaKA, petugas, petugasEmail, tanggalInspeksi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, trainId || null, nomorKA || null, namaKA || null, petugasStr, petugasEmail, tanggalInspeksi || null, status || 'Menunggu');
        const schedule = { id, trainId, nomorKA, namaKA, petugas, tanggalInspeksi, status: status || 'Menunggu' };
        res.json({ message: 'Schedule saved', schedule });
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({ message: 'Failed to save schedule' });
    }
});

app.get('/api/schedules', (req, res) => {
    try {
        const { nip } = req.query;
        let query = 'SELECT * FROM schedules';
        let params = [];

        if (nip) {
            query += ' WHERE petugas LIKE ?';
            params.push(`%"nip":"${nip}"%`);
        }
        query += ' ORDER BY createdAt DESC';

        const schedules = db.prepare(query).all(...params);
        const trains = db.prepare('SELECT id, data FROM trains').all();
        const trainMap = {};
        trains.forEach(t => {
            try { trainMap[t.id] = JSON.parse(t.data); } catch (e) { }
        });

        const result = schedules.map(s => {
            s.petugas = JSON.parse(s.petugas || '{}');
            if (s.trainData) {
                try { s.trainData = JSON.parse(s.trainData); } catch (e) { s.trainData = null; }
            }
            if (!s.trainData) {
                s.trainData = trainMap[s.trainId] || null;
            }
            return s;
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ message: 'Failed to fetch schedules' });
    }
});

app.put('/api/schedules/:id', (req, res) => {
    try {
        const { id } = req.params;
        const upd = req.body;

        const fields = Object.keys(upd).map(k => `${k} = ?`).join(', ');
        if (fields.length > 0) {
            const values = Object.values(upd).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
            db.prepare(`UPDATE schedules SET ${fields} WHERE id = ?`).run(...values, id);
        }
        res.json({ message: 'Jadwal berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ message: 'Failed to update schedule' });
    }
});

app.delete('/api/schedules/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
        res.json({ message: 'Jadwal berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete schedule' });
    }
});

// =============================================
// HASIL PEMERIKSAAN (.SPK)
// =============================================
app.post('/api/hasil', (req, res) => {
    try {
        const hasilData = req.body;
        hasilData.importedAt = new Date().toISOString();
        const id = generateId();
        db.prepare('INSERT INTO hasilPemeriksaan (id, data, importedAt) VALUES (?, ?, ?)').run(id, JSON.stringify(hasilData), hasilData.importedAt);
        res.json({ message: 'Hasil saved', id });
    } catch (error) {
        console.error('Error saving hasil:', error);
        res.status(500).json({ message: 'Failed to save hasil' });
    }
});

app.get('/api/hasil', (req, res) => {
    try {
        const hasilList = db.prepare('SELECT * FROM hasilPemeriksaan ORDER BY importedAt DESC').all();
        const result = hasilList.map(h => {
            let data = {};
            try { data = JSON.parse(h.data); } catch (e) { }
            return { ...data, id: h.id, importedAt: h.importedAt };
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching hasil:', error);
        res.status(500).json({ message: 'Failed to fetch hasil' });
    }
});

app.delete('/api/hasil/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM hasilPemeriksaan WHERE id = ?').run(req.params.id);
        res.json({ message: 'Hasil pemeriksaan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete hasil' });
    }
});

// =============================================
// CRON JOB: Kirim email H-3 inspeksi
// =============================================
cron.schedule('0 8 * * *', () => {
    console.log('Running daily schedule check...');
    try {
        const today = new Date();
        const schedules = db.prepare("SELECT * FROM schedules WHERE status = 'Menunggu' AND emailSent = 0").all();

        schedules.forEach(sched => {
            const schedDate = new Date(sched.tanggalInspeksi);
            const diffDays = Math.ceil(Math.abs(schedDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays <= 3) {
                let petugas = sched.petugas;
                try { petugas = JSON.parse(sched.petugas); } catch (e) { }

                let fullTrainData = {};
                if (sched.trainId) {
                    const trainRow = db.prepare('SELECT * FROM trains WHERE id = ?').get(sched.trainId);
                    if (trainRow) {
                        try { fullTrainData = { ...trainRow, ...(trainRow.data ? JSON.parse(trainRow.data) : {}) }; } catch (e) { }
                    }
                }

                const stConfig = {
                    ...fullTrainData,
                    trainId: sched.trainId,
                    nomorKA: sched.nomorKA,
                    namaKA: sched.namaKA,
                    penugasan: {
                        petugas: petugas.nama || petugas,
                        nip: petugas.nip,
                        email: petugas.email || petugas,
                        targetDate: sched.tanggalInspeksi,
                        status: sched.status
                    },
                    generatedAt: new Date().toISOString()
                };

                console.log(`(Mock) Email sent to ${petugas.email || petugas} for KA ${sched.nomorKA}`);
                db.prepare('UPDATE schedules SET emailSent = 1 WHERE id = ?').run(sched.id);
            }
        });
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});

app.listen(port, () => {
    console.log(`Server SIPARKA berjalan di http://localhost:${port}`);
    console.log('Mode: Full Lokal (SQLite + JWT Auth)');
    console.log('Tidak ada ketergantungan Firebase.');
});

module.exports = app;
