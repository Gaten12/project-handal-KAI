const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// 1. Replace POST /api/hasil
server = server.replace(
    /app\.post\('\/api\/hasil', \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ message: 'Failed to save hasil' \}\);\n    \}\n\}\);/,
    `app.post('/api/hasil', (req, res) => {
    // Mobile app legacy endpoint. Actual saving is now handled in PUT /api/schedules/:id to prevent duplicates.
    res.json({ message: 'Success' });
});`
);

// 2. Enhance PUT /api/schedules/:id to upsert hasilPemeriksaan
const putScheduleRegex = /app\.put\('\/api\/schedules\/:id', \(req, res\) => \{[\s\S]*?if \(fields\.length > 0\) \{\n            const values = Object\.values\(upd\)\.map\(v => typeof v === 'object' \? JSON\.stringify\(v\) : v\);\n            db\.prepare\(\`UPDATE schedules SET \$\{fields\} WHERE id = \?\`\)\.run\(\.\.\.values, id\);\n        \}/;

const putScheduleReplacement = `app.put('/api/schedules/:id', (req, res) => {
    try {
        const { id } = req.params;
        const upd = req.body;
        
        const fields = Object.keys(upd).map(k => \`\${k} = ?\`).join(', ');
        if (fields.length > 0) {
            const values = Object.values(upd).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
            db.prepare(\`UPDATE schedules SET \$\{fields\} WHERE id = ?\`).run(...values, id);
        }

        // --- UPSERT HASIL PEMERIKSAAN ---
        // Jika update schedule mengirimkan trainData (dari mobile app saat Submit Hasil),
        // maka kita simpan/perbarui ke tabel hasilPemeriksaan agar tidak duplikat.
        if (upd.trainData) {
            const dataToSave = typeof upd.trainData === 'object' ? upd.trainData : JSON.parse(upd.trainData);
            dataToSave.scheduleId = id;
            const importedAt = new Date().toISOString();
            
            // Cek apakah hasil untuk schedule ini sudah ada
            const existing = db.prepare('SELECT id FROM hasilPemeriksaan WHERE json_extract(data, "$.scheduleId") = ?').get(id);
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
        }`;

server = server.replace(putScheduleRegex, putScheduleReplacement);

fs.writeFileSync('server.js', server);
console.log('Fixed duplication bug in server.js');
