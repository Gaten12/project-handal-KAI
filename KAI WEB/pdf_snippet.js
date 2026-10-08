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
    doc.font('Helvetica-Bold');
    
    // Draw Header Box
    const headerTop = 20;
    doc.rect(margin, headerTop, tableWidth, 50).stroke();

    // Logo cell
    doc.moveTo(margin + 120, headerTop).lineTo(margin + 120, headerTop + 50).stroke();
    console.log("Mencoba memuat logo PDF dari:", logoPath);
    console.log("Apakah file logo ada?", fs.existsSync(logoPath));
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin + 20, headerTop + 5, { width: 80 });
    } else {
      console.error("ERROR: File logo tidak ditemukan di", logoPath);
    }
    
    // Right empty cell
    doc.moveTo(margin + tableWidth - 100, headerTop).lineTo(margin + tableWidth - 100, headerTop + 50).stroke();
    
    // Center Text
    doc.fontSize(10).text('PT. KERETA API INDONESIA (PERSERO)', margin + 120, headerTop + 10, { width: tableWidth - 220, align: 'center' });
    doc.fontSize(9).text('Sistem Informasi', margin + 120, headerTop + 25, { width: tableWidth - 220, align: 'center' });

    // Subheader Box
    doc.rect(margin, headerTop + 50, tableWidth, 20).stroke();
    // Yellow "TERBATAS" Box
    doc.rect(margin + 30, headerTop + 53, 60, 14).strokeColor('yellow').lineWidth(2).stroke();
    doc.fillColor('yellow').text('TERBATAS', margin + 30, headerTop + 56, { width: 60, align: 'center' });
    
    // Reset styling
    doc.strokeColor('black').lineWidth(1).fillColor('black');
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('FORMULIR MONITORING', margin, headerTop + 56, { width: tableWidth, align: 'center' });

    // ================= METADATA SECTION =================
    doc.moveDown(1.5);
    const metaTop = doc.y;
    doc.rect(margin, metaTop, 200, 45).stroke();
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateStrLong = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.font('Helvetica').fontSize(9);
    doc.text('No Ref', margin + 5, metaTop + 5);
    doc.text(`: ${dateStr}`, margin + 80, metaTop + 5);
    
    doc.moveTo(margin, metaTop + 15).lineTo(margin + 200, metaTop + 15).stroke();
    doc.text('Tanggal', margin + 5, metaTop + 20);
    doc.text(`: ${dateStrLong}`, margin + 80, metaTop + 20);
    
    doc.moveTo(margin, metaTop + 30).lineTo(margin + 200, metaTop + 30).stroke();
    doc.text('Business Area', margin + 5, metaTop + 35);
    doc.text(': B040', margin + 80, metaTop + 35);

    // ================= TABLE SECTION =================
    doc.moveDown(1.5);
    let startY = doc.y + 10;
    
    // Table Columns Width
    const cols = [
      { width: 25 },  // No
      { width: 80 },  // No Sarana
      { width: 55 },  // CCTV Berfungsi
      { width: 55 },  // CCTV Terbackup
      { width: 45 },  // Sisi A
      { width: 45 },  // Sisi E
      { width: 55 },  // TD Kecil
      { width: 55 },  // TD Besar
      { width: 55 },  // WIFI
      { width: tableWidth - (25+80+55+55+45+45+55+55+55) } // NOTE
    ];
    
    // Background colors for headers
    doc.rect(margin, startY, tableWidth, 60).fillAndStroke('#DCE6F1', 'black');
    doc.fillColor('black');

    // Draw grid lines for header (Vertical lines)
    const x0 = margin;
    const x1 = x0 + cols[0].width;
    const x2 = x1 + cols[1].width;
    const x3 = x2 + cols[2].width + cols[3].width;
    const x4 = x3 + cols[4].width + cols[5].width + cols[6].width + cols[7].width;
    const x5 = x4 + cols[8].width;
    const x6 = x5 + cols[9].width; // end of table

    // Outline
    doc.rect(margin, startY, tableWidth, 60).stroke();
    
    // Vertical Lines in header
    doc.moveTo(x1, startY).lineTo(x1, startY + 60).stroke(); // No | NO SARANA
    doc.moveTo(x2, startY).lineTo(x2, startY + 60).stroke(); // NO SARANA | CCTV
    doc.moveTo(x2 + cols[2].width, startY + 45).lineTo(x2 + cols[2].width, startY + 60).stroke(); // BERFUNGSI | TERBACKUP
    doc.moveTo(x3, startY + 15).lineTo(x3, startY + 60).stroke(); // CCTV | PIDS
    const pidsLuarWidth = cols[4].width + cols[5].width;
    doc.moveTo(x3 + pidsLuarWidth, startY + 30).lineTo(x3 + pidsLuarWidth, startY + 60).stroke(); // PIDS LUAR | PIDS DALAM
    doc.moveTo(x3 + cols[4].width, startY + 45).lineTo(x3 + cols[4].width, startY + 60).stroke(); // SISI A | SISI E
    doc.moveTo(x3 + pidsLuarWidth + cols[6].width, startY + 45).lineTo(x3 + pidsLuarWidth + cols[6].width, startY + 60).stroke(); // TD KECIL | TD BESAR
    doc.moveTo(x4, startY + 15).lineTo(x4, startY + 60).stroke(); // PIDS | WIFI
    doc.moveTo(x5, startY).lineTo(x5, startY + 60).stroke(); // WIFI | NOTE

    // Horizontal Lines in header
    doc.moveTo(x2, startY + 15).lineTo(x5, startY + 15).stroke(); // Below NAMA KA
    doc.moveTo(x3, startY + 30).lineTo(x4, startY + 30).stroke(); // Below PIDS
    doc.moveTo(x2, startY + 45).lineTo(x5, startY + 45).stroke(); // Below CCTV, PIDS LUAR, PIDS DALAM, WIFI
    
    // NAMA KA & NO KA Row (Split in half)
    const namaKAWidth = x5 - x2;
    const halfWidth = namaKAWidth / 2;
    const centerSplit = x2 + halfWidth;
    
    // Vertical line splitting NAMA KA and NO KA
    doc.moveTo(centerSplit, startY).lineTo(centerSplit, startY + 15).stroke();
    
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text(`NAMA KA : ${data.namaKA}`, x2, startY + 4, { width: halfWidth, align: 'center' });
    doc.text(`NO KA : ${data.nomorKA || '-'}`, centerSplit, startY + 4, { width: halfWidth, align: 'center' });

    // PIDS Row
    const pidsWidth = x4 - x3;
    doc.text('PIDS', x3, startY + 20, { width: pidsWidth, align: 'center' });

    // PIDS LUAR & DALAM Row
    const pidsDalamWidth = cols[6].width + cols[7].width;
    doc.text('PIDS LUAR', x3, startY + 35, { width: pidsLuarWidth, align: 'center' });
    doc.text('PIDS DALAM', x3 + pidsLuarWidth, startY + 35, { width: pidsDalamWidth, align: 'center' });

    // Base column headers
    const headersY = startY + 50;
    doc.text('No', x0, startY + 25, { width: cols[0].width, align: 'center' });
    doc.text('NO SARANA', x1, startY + 25, { width: cols[1].width, align: 'center' });
    doc.text('CCTV', x2, startY + 25, { width: cols[2].width + cols[3].width, align: 'center' });
    doc.text('WIFI', x4, startY + 25, { width: cols[8].width, align: 'center' });
    doc.text('NOTE', x5, startY + 25, { width: cols[9].width, align: 'center' });

    // Sub columns text
    doc.text('BERFUNGSI', x2, headersY, { width: cols[2].width, align: 'center' });
    doc.text('TERBACKUP', x2 + cols[2].width, headersY, { width: cols[3].width, align: 'center' });
    doc.text('SISI A', x3, headersY, { width: cols[4].width, align: 'center' });
    doc.text('SISI E', x3 + cols[4].width, headersY, { width: cols[5].width, align: 'center' });
    doc.text('TD KECIL', x3 + pidsLuarWidth, headersY, { width: cols[6].width, align: 'center' });
    doc.text('TD BESAR', x3 + pidsLuarWidth + cols[6].width, headersY, { width: cols[7].width, align: 'center' });
    doc.text('BERFUNGSI', x4, headersY, { width: cols[8].width, align: 'center' });

    // ================= TABLE DATA =================
    startY += 60;
    doc.font('Helvetica').fontSize(8);

    const gerbongList = data.gerbongList || [];
    
    // Only draw rows that exist
    const totalRows = Math.max(1, gerbongList.length);
    
    for (let i = 0; i < totalRows; i++) {
      if (startY > 520) { // adjusted for landscape height
        doc.addPage();
        startY = 30;
        // Re-draw headers if needed, but for simplicity we just continue
      }

      let cctvB = '', cctvT = '', pidsA = '', pidsE = '', pidsKcl = '', pidsBsr = '', wifi = '', note = '';
      let noSarana = '';

      if (i < gerbongList.length) {
        const g = gerbongList[i];
        noSarana = g.nomorSarana || g.namaGerbong || '';
        const items = g.inspeksiItems || g.items || g.fasilitasList || [];
        
        const noteArr = [];

        items.forEach(item => {
          const nm = item.nama.toLowerCase();
          const st = formatStatus(item.status);
          
          if (nm.includes('cctv') && nm.includes('berfungsi')) {
            if (st === 'R') cctvB = 'R';
            else if (st === 'T' && cctvB !== 'R') cctvB = 'T';
            else if (!cctvB) cctvB = st;
          }
          if (nm.includes('cctv') && nm.includes('terbackup')) {
            if (st === 'R') cctvT = 'R';
            else if (st === 'T' && cctvT !== 'R') cctvT = 'T';
            else if (!cctvT) cctvT = st;
          }
          if (nm.includes('pids luar sisi a')) pidsA = st;
          if (nm.includes('pids luar sisi e')) pidsE = st;
          if (nm.includes('td kecil')) pidsKcl = st;
          if (nm.includes('td besar')) pidsBsr = st;
          if (nm.includes('wifi')) wifi = st;

          if (item.deskripsiKerusakan && item.deskripsiKerusakan.trim() !== '') {
            // Bersihkan nama item agar note tidak terlalu panjang (opsional)
            const cleanName = item.nama.replace(' Berfungsi', '').replace(' Terbackup', '');
            noteArr.push(`${cleanName}: ${item.deskripsiKerusakan.trim()}`);
          }
        });
        
        note = noteArr.length > 0 ? noteArr.join(', ') : (g.aggregatedNote || '');
      }

      const rowTexts = [
        (i + 1).toString(), noSarana, cctvB, cctvT, pidsA, pidsE, pidsKcl, pidsBsr, wifi, note
      ];

      // Calculate dynamic row height based on the NOTE column text
      let noteHeight = 15;
      if (note) {
          noteHeight = doc.heightOfString(note, { width: cols[9].width - 4, fontSize: 8 }) + 8;
      }
      const rowHeight = Math.max(15, noteHeight);
      
      // Page break check with dynamic row height
      if (startY + rowHeight > 540) {
        doc.addPage();
        startY = 30; // reset for new page
      }

      doc.rect(margin, startY, tableWidth, rowHeight).stroke();
      
      let cx = margin;

      for (let j = 0; j < cols.length; j++) {
        // draw cell border
        if (j > 0) doc.moveTo(cx, startY).lineTo(cx, startY + rowHeight).stroke();
        
        // draw text
        doc.text(rowTexts[j], cx + 2, startY + 4, { width: cols[j].width - 4, align: j === 1 || j === 9 ? 'left' : 'center' });
        
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
    
    doc.text('B : BAIK', margin, bottomY);
    doc.text('R : RUSAK', margin, bottomY + 12);
    doc.text('T : TIADA', margin, bottomY + 24);

    doc.text('Mengetahui,', margin + 200, bottomY);
    doc.moveTo(margin + 170, bottomY + 50).lineTo(margin + 280, bottomY + 50).stroke();

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Petugas', margin + 450, bottomY);
    doc.moveTo(margin + 420, bottomY + 50).lineTo(margin + 510, bottomY + 50).stroke();
    
    doc.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).send('Error generating PDF');
    }
  }
});

app.get('/api/users', async (req, res) => {
    try {
        const querySnapshot = await db.collection("users").get();
        const users = [];
        querySnapshot.forEach((docSnap) => {
            // Only fetch role petugas
            if(docSnap.data().role === 'petugas') {
                users.push({ ...docSnap.data(), id: docSnap.id });
            }
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// -----------------------------
// SCHEDULING & EMAIL ENDPOINTS
// -----------------------------

app.post('/api/schedule', async (req, res) => {
    try {
        const { trainId, nomorKA, namaKA, petugas, tanggalInspeksi } = req.body;
        
        const newSchedule = {
            trainId,
            nomorKA,
            namaKA,
            petugas, // { email, nip, nama }
            tanggalInspeksi,
            status: 'Menunggu',
            emailSent: false,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection("schedules").add(newSchedule);
        res.json({ message: 'Schedule saved', schedule: { id: docRef.id, ...newSchedule } });
    } catch (error) {
        console.error("Error saving schedule:", error);
        res.status(500).json({ message: "Failed to save schedule" });
    }
});

// Alias POST /api/schedules (frontend uses plural)
app.post('/api/schedules', async (req, res) => {
    try {
        const { trainId, nomorKA, namaKA, petugas, tanggalInspeksi, status } = req.body;
        const newSchedule = {
            trainId, nomorKA, namaKA,
            petugas,
            tanggalInspeksi,
            status: status || 'Menunggu',
            emailSent: false,
            createdAt: new Date().toISOString()
        };
        const docRef = await db.collection("schedules").add(newSchedule);
        res.json({ message: 'Schedule saved', schedule: { id: docRef.id, ...newSchedule } });
    } catch (error) {
        console.error("Error saving schedule:", error);
        res.status(500).json({ message: "Failed to save schedule" });
    }
});

app.get('/api/schedules', async (req, res) => {
    try {
        const querySnapshot = await db.collection("schedules").get();
        const schedules = [];
        querySnapshot.forEach((docSnap) => {
            schedules.push({ ...docSnap.data(), id: docSnap.id });
        });
        res.json(schedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ message: "Failed to fetch schedules" });
    }
});

app.put('/api/schedules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection("schedules").doc(id);
        await docRef.update(req.body);
        res.json({ message: "Jadwal berhasil diperbarui" });
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ message: "Failed to update schedule" });
    }
});

app.delete('/api/schedules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection("schedules").doc(id);
        await docRef.delete();
        res.json({ message: "Jadwal berhasil dihapus" });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        res.status(500).json({ message: "Failed to delete schedule" });
    }
});
// -----------------------------
// HASIL PEMERIKSAAN (.SPK) ENDPOINTS
// -----------------------------

app.post('/api/hasil', async (req, res) => {
    try {
        const hasilData = req.body;
        hasilData.importedAt = new Date().toISOString();
        
        const docRef = await db.collection("hasilPemeriksaan").add(hasilData);
        res.json({ message: 'Hasil saved', id: docRef.id });
    } catch (error) {
        console.error("Error saving hasil:", error);
        res.status(500).json({ message: "Failed to save hasil" });
    }
});

app.get('/api/hasil', async (req, res) => {
    try {
        const querySnapshot = await db.collection("hasilPemeriksaan").get();
        const hasilList = [];
        querySnapshot.forEach((docSnap) => {
            hasilList.push({ ...docSnap.data(), id: docSnap.id });
        });
        res.json(hasilList);
    } catch (error) {
        console.error("Error fetching hasil:", error);
        res.status(500).json({ message: "Failed to fetch hasil" });
    }
});

app.delete('/api/hasil/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = doc(db, "hasilPemeriksaan", id);
        await deleteDoc(docRef);
        res.json({ message: "Hasil pemeriksaan berhasil dihapus" });
    } catch (error) {
        console.error("Error deleting hasil:", error);
        res.status(500).json({ message: "Failed to delete hasil" });
    }
});


// CRON JOB: Run every day at 08:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log('Running daily schedule check...');
    
    try {
        const today = new Date();
        const schedulesRef = db.collection("schedules");
        const q = query(schedulesRef, where("status", "==", "Menunggu"), where("emailSent", "==", false));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (docSnap) => {
            const sched = docSnap.data();
            const schedId = docSnap.id;
            
            const schedDate = new Date(sched.tanggalInspeksi);
            const diffTime = Math.abs(schedDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If the inspection is within 3 days (H-3)
            if (diffDays <= 3) {
                console.log(`Sending reminder to ${sched.petugas.email} for KA ${sched.nomorKA}...`);
                
                // 1. Fetch the full Train Dataset from Firestore
                let fullTrainData = {};
                if (sched.trainId) {
                    try {
                        const trainDoc = await db.collection("trainDataset").doc(sched.trainId).get();
                        if (trainDoc.exists()) {
                            fullTrainData = trainDoc.data();
                        }
                    } catch (e) {
                        console.error("Gagal mengambil data kereta untuk cron job:", e);
                    }
                }

                // 2. Generate the .st config file
                const stConfig = {
                    ...fullTrainData, // Spread the raw train data (gerbongList, etc)
                    trainId: sched.trainId,
                    nomorKA: sched.nomorKA,
                    namaKA: sched.namaKA,
                    penugasan: {
                        petugas: sched.petugas.nama,
                        nip: sched.petugas.nip,
                        email: sched.petugas.email,
                        targetDate: sched.tanggalInspeksi,
                        status: sched.status
                    },
                    generatedAt: new Date().toISOString()
                };
                
                const stBuffer = Buffer.from(JSON.stringify(stConfig, null, 2));
                
                // 2. Send Email
                const mailOptions = {
                    from: 'SIPERKA Admin <admin@siperka.com>',
                    to: sched.petugas.email,
                    subject: `[SIPERKA] Penugasan Inspeksi KA ${sched.nomorKA} - ${sched.namaKA}`,
                    text: `Halo ${sched.petugas.nama},\n\nAnda ditugaskan untuk melakukan inspeksi pada KA ${sched.nomorKA} (${sched.namaKA}) pada tanggal ${sched.tanggalInspeksi}.\n\nSilakan unduh file .st terlampir dan masukkan ke aplikasi SIPERKA Mobile Anda untuk mulai bekerja.\n\nSalam,\nAdmin SIPERKA`,
                    attachments: [
                        {
                            filename: `KA${sched.nomorKA}_${sched.tanggalInspeksi}.st`,
                            content: stBuffer
                        }
                    ]
                };
                
                try {
                    // This will fail in dev mode until user provides real credentials
                    // await transporter.sendMail(mailOptions);
                    console.log(`(Mock) Email sent to ${sched.petugas.email} with .st attachment`);
                    const docRef = db.collection("schedules").doc(schedId);
                    await docRef.update({ emailSent: true });
                } catch (err) {
                    console.error('Failed to send email', err);
                }
            }
        });
    } catch (error) {
        console.error("Error in cron job fetching schedules:", error);
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;