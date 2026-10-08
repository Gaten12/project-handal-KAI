const db = require('./database.js');
function calculateStatusSummary(train) {
    let sum = { cctvBaik: 0, cctvTotal: 0, pidsBaik: 0, pidsTotal: 0, runningTextBaik: 0, runningTextTotal: 0, tvBaik: 0, tvTotal: 0, wifiBaik: 0, wifiTotal: 0 };
    let gerbongs = train.gerbongList || [];
    if (typeof gerbongs === 'string') { try { gerbongs = JSON.parse(gerbongs); } catch (e) { gerbongs = []; } }
    let hasData = false;
    if (Array.isArray(gerbongs)) {
        gerbongs.forEach(g => {
            let items = g.inspeksiItems || [];
            if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
            if (Array.isArray(items)) {
                items.forEach(item => {
                    hasData = true;
                    const n = (item.nama || '').toUpperCase();
                    const isBaik = item.status === 'BAIK' ? 1 : 0;
                    if (n.includes('CCTV') || n.includes('CAM 1') || n.includes('CAM 2') || n === 'NVR' || n.includes('PANEL PIDS - NVR')) { sum.cctvTotal++; sum.cctvBaik += isBaik; }
                    else if (n.includes('WIFI') || n.includes('ROUTER') || n === 'MODEM' || n === 'AP') { sum.wifiTotal++; sum.wifiBaik += isBaik; }
                    else if (n.includes('TV') || n.includes('CSOT 1') || n.includes('CSOT 2') || n === 'CSOT1' || n === 'CSOT2') { sum.tvTotal++; sum.tvBaik += isBaik; }
                    else if (n.includes('RUNNING') || n.includes('SISI A') || n.includes('SISI E') || n.includes('LUAR') || n.includes('RTO R') || n.includes('RTO L') || n === 'RTOR' || n === 'RTOL') { sum.runningTextTotal++; sum.runningTextBaik += isBaik; }
                    else if (n.includes('PIDS') || n.includes('TD BESAR') || n.includes('TD KECIL') || n.includes('KERETA') || n.includes('RTI1') || n.includes('RTI2') || n.includes('MINI PC') || n.includes('SWITCH')) { sum.pidsTotal++; sum.pidsBaik += isBaik; }
                });
            }
        });
    }
    if (!hasData) return train.statusSummary || { cctvBaik: 18, cctvTotal: 18, pidsBaik: 20, pidsTotal: 20, runningTextBaik: 18, runningTextTotal: 18, tvBaik: 18, tvTotal: 18, wifiBaik: 18, wifiTotal: 18 };
    return sum;
}
const rows = db.prepare('SELECT data FROM trains').all();
rows.forEach(r => {
    const t = JSON.parse(r.data);
    if (t.namaKA && t.namaKA.includes('Taksaka YK')) {
        console.log(calculateStatusSummary(t));
    }
});
