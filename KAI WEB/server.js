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

const JWT_SECRET = process.env.JWT_SECRET;
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
// PDF GENERATOR
// =============================================
app.post('/api/convert', upload.single('siparkaFile'), async (req, res) => {
    try {
        let data;

        if (req.file) {
            const jsonString = req.file.buffer.toString('utf8');
            data = JSON.parse(jsonString);
        } else if (req.body && (req.body.namaKA || req.body.data)) {
            data = req.body.data || req.body;
        } else {
            return res.status(400).send('File or JSON data missing.');
        }

        // A4 Landscape exact points [width, height]
        const doc = new PDFDocument({ margin: 20, size: [841.89, 595.28] });

        const safeFilename = (data.namaKA || 'laporan').replace(/\s+/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=laporan_${safeFilename}.pdf`);
        doc.pipe(res);

        const logoPath = path.join(__dirname, 'public', 'images', 'Logo_PT_Kereta_Api_Indonesia_(Persero)_2020.png');

        const pageWidth = 841.89; // A4 Landscape width
        const margin = 20;
        const tableWidth = pageWidth - margin * 2;

        // ================= HEADER SECTION =================
        // ================= HEADER SECTION =================
        const headerTop = 20;
        const headerHeight = 60;
        const col1Width = 120;
        const col3Width = 220;
        const col2Width = tableWidth - col1Width - col3Width;

        // Reset styling
        doc.strokeColor('black').lineWidth(1).fillColor('black');

        // Draw Main Header Box
        doc.rect(margin, headerTop, tableWidth, headerHeight).stroke();

        // Vertical split lines
        const x2 = margin + col1Width;
        const x3 = margin + tableWidth - col3Width;
        doc.moveTo(x2, headerTop).lineTo(x2, headerTop + headerHeight).stroke();
        doc.moveTo(x3, headerTop).lineTo(x3, headerTop + headerHeight).stroke();

        // 1. LEFT COLUMN (Logo & TERBATAS)
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin + 20, headerTop + 5, { width: 80 });
        }

        doc.save().strokeColor('#F1C40F').lineWidth(1.5).rect(margin + 25, headerTop + 40, 70, 14).stroke().restore();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#F1C40F').text('TERBATAS', margin + 25, headerTop + 44, { width: 70, align: 'center' });

        // 2. MIDDLE COLUMN (Title)
        doc.moveTo(x2, headerTop + 35).lineTo(x3, headerTop + 35).stroke(); // horizontal line

        doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
        doc.text('PT KERETA API INDONESIA (PERSERO)', x2, headerTop + 8, { width: col2Width, align: 'center' });
        doc.font('Helvetica').fontSize(9);
        doc.text('SISTEM INFORMASI', x2, headerTop + 20, { width: col2Width, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('FORMULIR MONITORING', x2, headerTop + 42, { width: col2Width, align: 'center' });

        // 3. RIGHT COLUMN (Metadata Rows)
        const rowHeight = headerHeight / 4; // 15
        doc.moveTo(x3, headerTop + rowHeight).lineTo(x3 + col3Width, headerTop + rowHeight).stroke();
        doc.moveTo(x3, headerTop + rowHeight * 2).lineTo(x3 + col3Width, headerTop + rowHeight * 2).stroke();
        doc.moveTo(x3, headerTop + rowHeight * 3).lineTo(x3 + col3Width, headerTop + rowHeight * 3).stroke();

        doc.font('Helvetica').fontSize(8);
        const labelX = x3 + 5;
        const valueX = x3 + 70;

        doc.text('Nomor', labelX, headerTop + 4);
        doc.text(':', valueX, headerTop + 4);

        doc.text('Tanggal Terbit', labelX, headerTop + rowHeight + 4);
        doc.text(':', valueX, headerTop + rowHeight + 4);

        doc.text('Versi', labelX, headerTop + rowHeight * 2 + 4);
        doc.text(':', valueX, headerTop + rowHeight * 2 + 4);

        doc.text('Halaman', labelX, headerTop + rowHeight * 3 + 4);
        doc.text(':', valueX, headerTop + rowHeight * 3 + 4);

        // ================= METADATA SECTION =================
        doc.y = headerTop + 85;
        const metaTop = doc.y;

        // Metadata Box (Left)
        doc.rect(margin, metaTop, 200, 45).stroke();

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dateStrLong = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        doc.font('Helvetica').fontSize(9);
        const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const monthRoman = romanMonths[now.getMonth()];
        const yearStr = now.getFullYear();
        const noUrut = String(data.nomorUrut || 1).padStart(2, '0');
        const noRefStr = `${noUrut}/${monthRoman}/${yearStr}`;

        doc.text('No Ref', margin + 5, metaTop + 5);
        doc.text(`: ${noRefStr}`, margin + 80, metaTop + 5);

        doc.moveTo(margin, metaTop + 15).lineTo(margin + 200, metaTop + 15).stroke();
        doc.text('Tanggal', margin + 5, metaTop + 20);
        doc.text(`: ${dateStrLong}`, margin + 80, metaTop + 20);

        doc.moveTo(margin, metaTop + 30).lineTo(margin + 200, metaTop + 30).stroke();
        doc.text('Business Area', margin + 5, metaTop + 35);
        doc.text(': B040', margin + 80, metaTop + 35);

        // NAMA KA & NO KA Box (Right)
        const kaBoxWidth = 280;
        const kaBoxX = margin + tableWidth - kaBoxWidth;

        doc.rect(kaBoxX, metaTop, kaBoxWidth, 45).fillAndStroke('#DCE6F1', 'black');
        doc.fillColor('black');

        doc.moveTo(kaBoxX, metaTop + 22.5).lineTo(kaBoxX + kaBoxWidth, metaTop + 22.5).stroke();

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text(`NAMA KA : ${data.namaKA}`, kaBoxX + 15, metaTop + 6.5, { width: kaBoxWidth - 30, align: 'left' });
        doc.text(`NO KA : ${data.nomorKA || '-'}`, kaBoxX + 15, metaTop + 29, { width: kaBoxWidth - 30, align: 'left' });

        // ================= TABLE SECTION =================
        doc.y = metaTop + 45;
        doc.moveDown(1.5);
        let startY = doc.y;

        // Table Columns Width (Total 17 columns)
        const cols = [
            { width: 25 },  // 0: No
            { width: 75 },  // 1: No Sarana
            // PIDS (9 cols)
            { width: 30 },  // 2: rti1
            { width: 30 },  // 3: rti2
            { width: 30 },  // 4: rtor
            { width: 30 },  // 5: rtol
            { width: 30 },  // 6: csot1
            { width: 30 },  // 7: csot2
            { width: 30 },  // 8: mini pc
            { width: 30 },  // 9: router
            { width: 30 },  // 10: switch
            // CCTV (3 cols)
            { width: 30 },  // 11: cam 1
            { width: 30 },  // 12: cam 2
            { width: 30 },  // 13: nvr
            // WIFI (2 cols)
            { width: 30 },  // 14: modem
            { width: 30 },  // 15: ap
            // NOTE
            { width: tableWidth - 520 } // 16: NOTE
        ];

        const x_cols = [margin];
        let currX = margin;
        cols.forEach(c => { currX += c.width; x_cols.push(currX); });

        const x_pids_start = x_cols[2]; // Start of PIDS
        const x_pids_end = x_cols[11]; // Start of CCTV
        const x_cctv_end = x_cols[14]; // Start of WIFI
        const x_wifi_end = x_cols[16]; // Start of NOTE

        // Background colors for headers
        doc.rect(margin, startY, tableWidth, 80).fillAndStroke('#DCE6F1', 'black');
        doc.fillColor('black');
        doc.rect(margin, startY, tableWidth, 80).stroke(); // Outline

        // Vertical Lines in header
        x_cols.forEach((x, i) => {
            if (i === 1) doc.moveTo(x, startY).lineTo(x, startY + 80).stroke(); // NO | NO SARANA
            else if (i === 2) doc.moveTo(x, startY).lineTo(x, startY + 80).stroke(); // NO SARANA | PIDS
            else if (i === 11) doc.moveTo(x, startY).lineTo(x, startY + 80).stroke(); // PIDS | CCTV
            else if (i === 14) doc.moveTo(x, startY).lineTo(x, startY + 80).stroke(); // CCTV | WIFI
            else if (i === 16) doc.moveTo(x, startY).lineTo(x, startY + 80).stroke(); // WIFI | NOTE
            else if (i > 2 && i < 16) {
                // Inner columns
                doc.moveTo(x, startY + 25).lineTo(x, startY + 80).stroke();
            }
        });

        // Horizontal Lines in header
        doc.moveTo(x_pids_start, startY + 25).lineTo(x_wifi_end, startY + 25).stroke(); // Below PIDS, CCTV, WIFI

        // Group Headers
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('PIDS', x_pids_start, startY + 8, { width: 270, align: 'center' });
        doc.text('CCTV', x_pids_end, startY + 8, { width: 90, align: 'center' });
        doc.text('WIFI', x_cctv_end, startY + 8, { width: 60, align: 'center' });

        // Base column headers
        doc.text('No', x_cols[0], startY + 35, { width: cols[0].width, align: 'center' });
        doc.text('NO SARANA', x_cols[1], startY + 35, { width: cols[1].width, align: 'center' });
        doc.text('NOTE', x_wifi_end, startY + 35, { width: cols[16].width, align: 'center' });

        // Helper to draw vertical text
        function drawVerticalText(doc, text, x, y, width, height) {
            doc.save();
            doc.fontSize(8).font('Helvetica-Bold');
            doc.translate(x + width / 2 + 3, y + height - 2);
            doc.rotate(-90);
            doc.text(text.toUpperCase(), 0, 0, { width: height, align: 'left' });
            doc.restore();
        }

        const colNames = [
            "rti1", "rti2", "rtor", "rtol", "csot1", "csot2", "mini pc", "router", "switch hub",
            "cam 1", "cam 2", "nvr",
            "modem", "ap"
        ];

        for (let i = 0; i < 14; i++) {
            drawVerticalText(doc, colNames[i], x_cols[2 + i], startY + 25, 30, 55);
        }

        // ================= TABLE DATA =================
        startY += 80;
        doc.font('Helvetica').fontSize(8);

        const gerbongList = data.gerbongList || [];
        const totalRows = Math.max(1, gerbongList.length);

        for (let i = 0; i < totalRows; i++) {
            if (startY > 520) {
                doc.addPage();
                startY = 30;
            }

            let colsData = new Array(14).fill('');
            let note = '';
            let noSarana = '';

            if (i < gerbongList.length) {
                const g = gerbongList[i];
                noSarana = g.nomorSarana || g.namaGerbong || '';
                const items = g.inspeksiItems || g.items || g.fasilitasList || [];
                const noteArr = [];

                items.forEach(item => {
                    const nm = item.nama.toLowerCase();
                    const st = formatStatus(item.status);

                    // PIDS (9 cols)
                    if (nm === 'rti1' || nm === 'pids kereta belakang' || nm === 'pids dalam td kecil') colsData[0] = st;
                    else if (nm === 'rti2' || nm === 'pids kereta depan' || nm === 'pids dalam td besar') colsData[1] = st;
                    else if (nm === 'rto r' || nm === 'rtor' || nm === 'running teks 2' || nm === 'pids luar sisi e') colsData[2] = st;
                    else if (nm === 'rto l' || nm === 'rtol' || nm === 'running teks 1' || nm === 'pids luar sisi a') colsData[3] = st;
                    else if (nm === 'csot 1' || nm === 'csot1' || nm === 'tv depan 1' || nm === 'tv belakang 1' || nm === 'tv 1' || nm === 'tv belakang 2') colsData[4] = st;
                    else if (nm === 'csot 2' || nm === 'csot2' || nm === 'tv depan 2') colsData[5] = st;
                    else if (nm === 'panel pids - mini pc') colsData[6] = st;
                    else if (nm === 'panel pids - router(antar gerbong)') colsData[7] = st;
                    else if (nm === 'panel pids - switch hub') colsData[8] = st;

                    // CCTV (3 cols)
                    else if (nm === 'cam 1' || nm === 'cctv depan' || nm === 'cctv depan berfungsi') colsData[9] = st;
                    else if (nm === 'cam 2' || nm === 'cctv belakang' || nm === 'cctv belakang berfungsi') colsData[10] = st;
                    else if (nm === 'panel pids - nvr' || nm === 'nvr') colsData[11] = st;

                    // WIFI (2 cols)
                    else if (nm === 'panel pids - modem') colsData[12] = st;
                    else if (nm === 'ap' || nm === 'router' || nm === 'wifi') colsData[13] = st;

                    if (item.deskripsiKerusakan && item.deskripsiKerusakan.trim() !== '') {
                        const cleanName = item.nama.replace(' Berfungsi', '').replace(' Terbackup', '');
                        noteArr.push(`${cleanName}: ${item.deskripsiKerusakan.trim()}`);
                    }
                });

                note = noteArr.length > 0 ? noteArr.join(', ') : (g.aggregatedNote || '');
            }

            const rowTexts = [
                (i + 1).toString(), noSarana, ...colsData, note
            ];

            let noteHeight = 15;
            if (note) {
                noteHeight = doc.heightOfString(note, { width: cols[16].width - 4, fontSize: 8 }) + 8;
            }
            const rowHeight = Math.max(15, noteHeight);

            if (startY + rowHeight > 540) {
                doc.addPage();
                startY = 30;
            }

            doc.rect(margin, startY, tableWidth, rowHeight).stroke();

            let cx = margin;
            for (let j = 0; j < cols.length; j++) {
                if (j > 0) doc.moveTo(cx, startY).lineTo(cx, startY + rowHeight).stroke();

                if (j >= 2 && j <= 15) {
                    const text = rowTexts[j];
                    if (text === 'B') {
                        doc.save().lineWidth(1.5).strokeColor('green')
                            .moveTo(cx + 11, startY + 8).lineTo(cx + 14, startY + 11).lineTo(cx + 19, startY + 5).stroke().restore();
                    } else if (text === 'R') {
                        doc.save().lineWidth(1.5).strokeColor('red')
                            .moveTo(cx + 11, startY + 5).lineTo(cx + 19, startY + 11)
                            .moveTo(cx + 19, startY + 5).lineTo(cx + 11, startY + 11).stroke().restore();
                    } else if (text === 'T') {
                        doc.save().lineWidth(1.5).strokeColor('gray')
                            .moveTo(cx + 11, startY + 8).lineTo(cx + 19, startY + 8).stroke().restore();
                    }
                } else {
                    doc.font('Helvetica').fontSize(8).fillColor('black');
                    doc.text(rowTexts[j], cx + 2, startY + 4, { width: cols[j].width - 4, align: j === 1 || j === 16 ? 'left' : 'center' });
                }

                cx += cols[j].width;
            }

            startY += rowHeight;
        }


        // ================= CATATAN & KETERANGAN =================
        doc.y = startY;

        // Add EOF between table and Catatan
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('EOF', margin, doc.y, { width: tableWidth, align: 'center' });
        doc.moveDown(0.5);
        doc.text('Catatan :', margin, doc.y);
        doc.rect(margin, doc.y + 2, tableWidth, 20).stroke();

        doc.moveDown(3);
        const bottomY = doc.y;

        // Draw Checkmark (BAIK)
        doc.save().lineWidth(1.5).strokeColor('green')
            .moveTo(margin + 2, bottomY + 4).lineTo(margin + 5, bottomY + 7).lineTo(margin + 10, bottomY + 1).stroke().restore();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('black');
        doc.text(' : BAIK', margin + 15, bottomY);

        // Draw Cross (RUSAK)
        doc.save().lineWidth(1.5).strokeColor('red')
            .moveTo(margin + 2, bottomY + 13).lineTo(margin + 10, bottomY + 19)
            .moveTo(margin + 10, bottomY + 13).lineTo(margin + 2, bottomY + 19).stroke().restore();
        doc.text(' : RUSAK', margin + 15, bottomY + 12);

        // Draw Dash (TIADA)
        doc.save().lineWidth(1.5).strokeColor('gray')
            .moveTo(margin + 2, bottomY + 28).lineTo(margin + 10, bottomY + 28).stroke().restore();
        doc.text(' : TIADA', margin + 15, bottomY + 24);

        // Fetch Admin Signature
        let adminSig = null;
        let adminData = null;
        try {
            const admin = db.prepare("SELECT nama, nip, signature FROM users WHERE role IN ('admin', 'superadmin') ORDER BY (signature IS NOT NULL) DESC, id ASC LIMIT 1").get();
            if (admin) {
                adminData = admin;
                if (admin.signature) {
                    adminSig = admin.signature.replace(/^data:image\/\w+;base64,/, "");
                }
            }
        } catch (e) { }

        // Fetch Petugas Signature
        let petugasSig = null;
        let petugasData = null;
        let petugasKey = data.petugas || data.namaPetugas; // Usually name or NIP is passed via schedule data
        if (data.scheduleId) {
            try {
                const sched = db.prepare("SELECT petugas FROM schedules WHERE id = ?").get(data.scheduleId);
                if (sched && sched.petugas) {
                    const p = JSON.parse(sched.petugas);
                    petugasKey = p.nip || p.nama || petugasKey;
                }
            } catch (e) { }
        }

        // Fallback: If Android sends `petugasData` embedded in JSON payload:
        if (data.petugasData && typeof data.petugasData === 'object') {
            petugasKey = data.petugasData.nip || data.petugasData.nama;
        }

        if (petugasKey) {
            try {
                const pet = db.prepare("SELECT nama, nip, signature FROM users WHERE nip = ? OR nama = ? LIMIT 1").get(petugasKey, petugasKey);
                if (pet) {
                    petugasData = pet;
                    if (pet.signature) {
                        petugasSig = pet.signature.replace(/^data:image\/\w+;base64,/, "");
                    }
                }
            } catch (e) { }
        }

        // DRAW MENGETAHUI
        doc.text('Mengetahui,', margin + 200, bottomY);
        if (adminSig) {
            try {
                const imgBuffer = Buffer.from(adminSig, 'base64');
                doc.image(imgBuffer, margin + 170, bottomY + 15, { width: 110, height: 40 });
            } catch (e) {
                console.error("Gagal meload TTD Admin:", e);
            }
        } else {
            doc.moveTo(margin + 170, bottomY + 50).lineTo(margin + 280, bottomY + 50).stroke();
        }
        if (adminData && adminData.nama) {
            doc.text(adminData.nama, margin + 170, bottomY + 55, { width: 110, align: 'center' });
            if (adminData.nip) doc.text(`NIP: ${adminData.nip}`, margin + 170, bottomY + 67, { width: 110, align: 'center' });
        }

        // DRAW PETUGAS
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('Petugas', margin + 450, bottomY);
        if (petugasSig) {
            try {
                const imgBuffer = Buffer.from(petugasSig, 'base64');
                doc.image(imgBuffer, margin + 420, bottomY + 15, { width: 90, height: 40 });
            } catch (e) {
                console.error("Gagal meload TTD Petugas:", e);
            }
        } else {
            doc.moveTo(margin + 420, bottomY + 50).lineTo(margin + 510, bottomY + 50).stroke();
        }

        if (petugasData && petugasData.nama) {
            doc.text(petugasData.nama, margin + 420, bottomY + 55, { width: 90, align: 'center' });
            if (petugasData.nip) doc.text(`NIP: ${petugasData.nip}`, margin + 420, bottomY + 67, { width: 90, align: 'center' });
        }

        doc.end();
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).send('Error generating PDF');
        }
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
    } catch (e) {
        res.status(500).json({ message: 'Terjadi kesalahan internal' });
    }
});

// GET /api/profile - Ambil data profil (termasuk signature)
app.get('/api/profile', checkAuth, (req, res) => {
    try {
        const user = db.prepare('SELECT uid, nip, email, nama, role, signature FROM users WHERE uid = ?').get(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengambil data profil' });
    }
});

// POST /api/profile/signature - Simpan signature (base64)
app.post('/api/profile/signature', checkAuth, (req, res) => {
    const { signature } = req.body;
    if (!signature) return res.status(400).json({ message: 'Signature tidak valid' });
    try {
        db.prepare('UPDATE users SET signature = ? WHERE uid = ?').run(signature, req.user.uid);
        res.json({ message: 'Signature berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ message: 'Gagal menyimpan signature' });
    }
});

// DELETE /api/profile/signature - Hapus signature
app.delete('/api/profile/signature', checkAuth, (req, res) => {
    try {
        db.prepare('UPDATE users SET signature = NULL WHERE uid = ?').run(req.user.uid);
        res.json({ message: 'Signature berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ message: 'Gagal menghapus signature' });
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
        // Auto-update past schedules to Telat
        try {
            db.prepare("UPDATE schedules SET status = 'Telat' WHERE status = 'Menunggu' AND tanggalInspeksi < date('now', 'localtime')").run();
        } catch (e) {
            console.error('Failed to auto-update Telat status:', e);
        }

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

        // --- UPSERT HASIL PEMERIKSAAN ---
        // Jika update schedule mengirimkan trainData (dari mobile app saat Submit Hasil),
        // maka kita simpan/perbarui ke tabel hasilPemeriksaan agar tidak duplikat.
        if (upd.trainData) {
            const dataToSave = typeof upd.trainData === 'object' ? upd.trainData : JSON.parse(upd.trainData);
            dataToSave.scheduleId = id;
            const importedAt = new Date().toISOString();

            // Cek apakah hasil untuk schedule ini sudah ada
            const existing = db.prepare("SELECT id FROM hasilPemeriksaan WHERE json_extract(data, '$.scheduleId') = ?").get(id);
            if (existing) {
                // Update
                db.prepare('UPDATE hasilPemeriksaan SET data = ?, importedAt = ? WHERE id = ?')
                    .run(JSON.stringify(dataToSave), importedAt, existing.id);
            } else {
                // Insert
                // Biar aman, id bisa pakai id unik baru atau pakai scheduleId
                const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
                db.prepare('INSERT INTO hasilPemeriksaan (id, data, importedAt) VALUES (?, ?, ?)')
                    .run(newId, JSON.stringify(dataToSave), importedAt);
            }
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
    // Mobile app legacy endpoint. Actual saving is now handled in PUT /api/schedules/:id to prevent duplicates.
    res.json({ message: 'Success' });
});

app.get('/api/hasil', (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const hasilList = db.prepare('SELECT * FROM hasilPemeriksaan ORDER BY importedAt DESC').all();
        const schedulesList = db.prepare('SELECT id, petugas FROM schedules').all();
        const schedMap = {};
        schedulesList.forEach(s => {
            try { schedMap[s.id] = JSON.parse(s.petugas || '{}'); } catch (e) { }
        });

        const result = hasilList.map(h => {
            let data = {};
            try { data = JSON.parse(h.data); } catch (e) { }
            if (data.scheduleId && schedMap[data.scheduleId]) {
                data.petugasInspeksi = schedMap[data.scheduleId];
            }
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
// DATABASE MANAGEMENT (ADMIN ONLY)
// =============================================
app.get('/api/db/tables', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        res.json(tables.map(t => t.name));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch tables' });
    }
});

app.get('/api/db/data/:table', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tableName = req.params.table;
        const validTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
        if (!validTables.includes(tableName)) return res.status(400).json({ message: 'Tabel tidak valid' });

        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        let queryStr = `SELECT * FROM "${tableName}"`;
        const params = [];

        if (req.query.search) {
            const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
            const searchConds = cols.map(c => `CAST("${c.name}" AS TEXT) LIKE ?`).join(' OR ');
            queryStr += ` WHERE ${searchConds}`;
            for (let i = 0; i < cols.length; i++) params.push(`%${req.query.search}%`);
        }

        if (req.query.sortCol) {
            const sortOrder = req.query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
            queryStr += ` ORDER BY "${req.query.sortCol}" ${sortOrder}`;
        }

        queryStr += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const data = db.prepare(queryStr).all(...params);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch table data' });
    }
});

app.delete('/api/db/data/:table/:id', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tableName = req.params.table;
        const validTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
        if (!validTables.includes(tableName)) return res.status(400).json({ message: 'Tabel tidak valid' });

        db.prepare(`DELETE FROM "${tableName}" WHERE id = ?`).run(req.params.id);
        res.json({ message: 'Baris data berhasil dihapus' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete data' });
    }
});

app.get('/api/db/stats', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        let totalRows = 0;
        const tableStats = [];

        for (const t of tables) {
            const count = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get().count;
            totalRows += count;
            tableStats.push({ name: t.name, rows: count });
        }

        let dbSize = 0;
        try {
            const stats = fs.statSync('siparka.db');
            dbSize = stats.size;
        } catch (e) { }

        res.json({
            tables: tables.length,
            totalRows: totalRows,
            dbSizeBytes: dbSize,
            tableDetails: tableStats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch db stats' });
    }
});

// Insert baris baru secara dinamis
app.post('/api/db/data/:table', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tableName = req.params.table;
        const validTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
        if (!validTables.includes(tableName)) return res.status(400).json({ message: 'Tabel tidak valid' });

        const data = req.body;
        // Hapus auto-generated fields dari insert payload jika ada
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;

        const keys = Object.keys(data);
        if (keys.length === 0) return res.status(400).json({ message: 'Tidak ada data untuk ditambahkan' });

        const columns = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => data[k]);

        // Tangani id generator manual jika diperlukan, atau andalkan AUTOINCREMENT
        // SQLite AUTOINCREMENT akan meng-handle 'id' jika di omit
        const stmt = db.prepare(`INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`);
        const info = stmt.run(...values);

        res.status(201).json({ message: 'Data berhasil ditambahkan', insertedId: info.lastInsertRowid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to insert data' });
    }
});

app.put('/api/db/data/:table/:id', (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ message: 'Akses ditolak' });
    try {
        const tableName = req.params.table;
        const validTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
        if (!validTables.includes(tableName)) return res.status(400).json({ message: 'Tabel tidak valid' });

        const updates = req.body;
        delete updates.id; // Prevent updating ID
        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ message: 'Tidak ada data untuk diupdate' });

        const setClause = keys.map(k => `"${k}" = ?`).join(', ');
        const values = keys.map(k => updates[k]);
        values.push(req.params.id);

        db.prepare(`UPDATE "${tableName}" SET ${setClause} WHERE id = ?`).run(...values);
        res.json({ message: 'Data berhasil diupdate' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update data' });
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
