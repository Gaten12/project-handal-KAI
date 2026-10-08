// Fetch interceptor dipindahkan ke auth.js

/* ==========================================================================
   SIPERKA - Sistem Inspeksi Perangkat Kereta Api
   PT Kereta Api Indonesia (Persero)
   Frontend Interactive Controller & Logic
   ========================================================================== */

let trains = [];
let currentFilteredHasil = [];
let selectedFileForImport = null;
let currentPdfBlobUrl = null;
let currentPdfFileName = null;
// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    await loadViews();
    initClock();
    initNavigation();
    initDropzones();
});

async function loadViews() {
    const container = document.getElementById('views-container');
    if (!container) return;
    const views = ['dataset', 'hasil', 'taman_kereta'];
    for (const view of views) {
        try {
            const res = await fetch(`/pages/${view}.html`);
            if (res.ok) {
                const html = await res.text();
                container.innerHTML += html;
            }
        } catch (e) {
            console.error(`Failed to load view ${view}:`, e);
        }
    }
}

/* ==========================================================================
   1. Live Clock Controller
   ========================================================================== */
function initClock() {
    const clockEl = document.getElementById('liveClock');
    function updateClock() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        if (clockEl) {
            let dateStr = now.toLocaleDateString('id-ID', options);
            dateStr = dateStr.replace(' pukul ', ', Pukul ');
            clockEl.innerHTML = `${dateStr}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

/* ==========================================================================
   2. Tab Navigation Controller
   ========================================================================== */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewPages = document.querySelectorAll('.view-page');
    
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuBtn && sidebar && overlay) {
        function openMobileSidebar(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
        }
        
        function closeMobileSidebar() {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        }
        
        mobileMenuBtn.addEventListener('click', openMobileSidebar);
        mobileMenuBtn.addEventListener('touchend', openMobileSidebar);
        
        overlay.addEventListener('click', closeMobileSidebar);
        overlay.addEventListener('touchend', closeMobileSidebar);
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                closeMobileSidebar();
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.classList.contains('has-submenu')) {
                const group = item.closest('.nav-group');
                if (group) {
                    group.classList.toggle('expanded');
                    const subNav = group.querySelector('.sub-nav');
                    if (subNav) subNav.classList.toggle('expanded');
                }
            }

            const targetTab = item.getAttribute('data-tab');
            if (!targetTab) return;

            if (targetTab === 'setting') {
                const datasetBtn = document.querySelector('.nav-item[data-tab="dataset"]');
                if (datasetBtn) {
                    datasetBtn.click();
                    return;
                }
            }

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            if (item.classList.contains('sub-item')) {
                const parentNav = item.closest('.nav-group').querySelector('.has-submenu');
                if (parentNav) parentNav.classList.add('active');
            }

            viewPages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${targetTab}View`) {
                    page.classList.add('active');
                }
            });

            // Data Sync on Tab Switch
            if (targetTab === 'jadwal' && typeof window.loadSchedules === 'function') {
                window.loadSchedules();
            } else if ((targetTab === 'hasil' || targetTab === 'dataset' || targetTab === 'home') && typeof fetchTrainData === 'function') {
                fetchTrainData();
            } else if (targetTab === 'users' && typeof fetchUsers === 'function') {
                fetchUsers();
            } else if (targetTab === 'profil' && typeof loadProfile === 'function') {
                loadProfile();
            } else if (targetTab === 'database' && typeof loadDatabaseTables === 'function') {
                loadDatabaseTables();
            }
            
            // Close sidebar on mobile after clicking a tab
            if (window.innerWidth <= 1024 && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    });
}

/* ==========================================================================
   3. Data Fetching & Rendering Engine
   ========================================================================== */
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

async function fetchTrainData() {
    showLoading('Memuat data KAI...');
    try {
        const [resTrains, resHasil, resSched] = await Promise.all([
            fetch('/api/trains'),
            fetch('/api/hasil'),
            fetch('/api/schedules')
        ]);
        
        if (!resTrains.ok) throw new Error('Gagal memuat data kereta');
        if (!resHasil.ok) throw new Error('Gagal memuat data hasil');
        if (!resSched.ok) throw new Error('Gagal memuat data jadwal');
        
        trains = await resTrains.json();
        hasilPemeriksaanData = await resHasil.json();
        const scheds = await resSched.json();
        window.schedulesData = scheds;
        
        trains.forEach(t => t.statusSummary = calculateStatusSummary(t));
        hasilPemeriksaanData.forEach(t => {
            t.statusSummary = calculateStatusSummary(t);
            const sched = scheds.find(s => (s.nomorKA && t.nomorKA && s.nomorKA.toString() === t.nomorKA.toString()) || (s.id && t.scheduleId && s.id === t.scheduleId));
            t.tanggalInspeksi = sched ? sched.tanggalInspeksi : null;
        });
        
        currentFilteredHasil = [...hasilPemeriksaanData];
        
        renderDashboardStats();
        renderDatasetTable(trains);
        renderHasilCards(currentFilteredHasil);
    } catch (err) {
        console.error('Error fetching data:', err);
        showToast('Gagal memuat data: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// Dashboard Metrics & Gauge Score Calculator
function renderDashboardStats() {
    const totalKereta = trains.length;
    const totalSudahCek = hasilPemeriksaanData.length;
    
    animateCounter('statJumlahKereta', totalKereta);
    animateCounter('statSudahCek', totalSudahCek);

    let cctvTotal = 0, cctvBaik = 0;
    let pidsTotal = 0, pidsBaik = 0;
    let rtTotal = 0, rtBaik = 0;
    let tvTotal = 0, tvBaik = 0;
    let wifiTotal = 0, wifiBaik = 0;

    hasilPemeriksaanData.forEach(train => {
        const s = train.statusSummary || {};
        cctvTotal += s.cctvTotal || 18; cctvBaik += s.cctvBaik || 18;
        pidsTotal += s.pidsTotal || 20; pidsBaik += s.pidsBaik || 20;
        rtTotal += s.runningTextTotal || 18; rtBaik += s.runningTextBaik || 18;
        tvTotal += s.tvTotal || 18; tvBaik += s.tvBaik || 18;
        wifiTotal += s.wifiTotal || 18; wifiBaik += s.wifiBaik || 18;
    });

    const totalAllBaik = cctvBaik + pidsBaik + rtBaik + tvBaik + wifiBaik;
    const totalAllDevices = cctvTotal + pidsTotal + rtTotal + tvTotal + wifiTotal;
    const healthPercentage = totalAllDevices > 0 ? ((totalAllBaik / totalAllDevices) * 100).toFixed(1) : "100.0";
    
    const kondisiBadge = document.getElementById('badge-kondisi-perangkat');
    if (kondisiBadge) {
        kondisiBadge.textContent = healthPercentage + '% Baik';
    }

    const scoreEl = document.getElementById('systemHealthScore');
    if (scoreEl) scoreEl.textContent = `${healthPercentage}%`;

    // Count how many trains are 100% fine
    let perfectCount = 0;
    hasilPemeriksaanData.forEach(t => {
        const s = t.statusSummary || {};
        if (s.cctvBaik === s.cctvTotal && s.pidsBaik === s.pidsTotal && s.runningTextBaik === s.runningTextTotal && s.tvBaik === s.tvTotal && s.wifiBaik === s.wifiTotal) {
            perfectCount++;
        }
    });
    animateCounter('statKondisiBagus', perfectCount);

    updateDeviceBar('dashCctvText', 'dashCctvBar', cctvBaik, cctvTotal);
    updateDeviceBar('dashPidsText', 'dashPidsBar', pidsBaik, pidsTotal);
    updateDeviceBar('dashRtText', 'dashRtBar', rtBaik, rtTotal);
    updateDeviceBar('dashTvText', 'dashTvBar', tvBaik, tvTotal);
    updateDeviceBar('dashWifiText', 'dashWifiBar', wifiBaik, wifiTotal);
}

function updateDeviceBar(textId, barId, baik, total) {
    const textEl = document.getElementById(textId);
    const barEl = document.getElementById(barId);
    if (!textEl || !barEl) return;

    const pct = total > 0 ? Math.round((baik / total) * 100) : 100;
    
    let klasifikasi = "Baik";
    barEl.className = 'progress-bar-fill'; // Reset kelas warna sebelumnya

    if (pct === 100) {
        klasifikasi = "Baik";
        barEl.classList.add('bg-emerald'); // Hijau
        barEl.style.backgroundColor = ""; // Clear inline override if any
        textEl.style.color = "var(--accent-emerald, #16a34a)";
    } else if (pct >= 50) {
        klasifikasi = "Sedang";
        barEl.classList.add('bg-orange');  // Oranye
        barEl.style.backgroundColor = ""; // Clear inline override if any
        textEl.style.color = "var(--accent-amber, #f59e0b)";
    } else {
        klasifikasi = "Rusak";
        barEl.style.backgroundColor = "var(--accent-rose, #dc2626)"; // Merah
        textEl.style.color = "var(--accent-rose, #dc2626)";
    }

    textEl.textContent = `${pct}% ${klasifikasi} (${baik}/${total})`;
    barEl.style.width = `${pct}%`;
}

function animateCounter(elementId, targetVal) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let start = 0;
    const duration = 600;
    const stepTime = Math.abs(Math.floor(duration / (targetVal || 1)));
    
    if (targetVal === 0) {
        el.textContent = '0';
        return;
    }

    const timer = setInterval(() => {
        start += 1;
        el.textContent = start;
        if (start >= targetVal) {
            clearInterval(timer);
        }
    }, Math.max(stepTime, 25));
}

// Render Dataset Table
function renderDatasetTable(dataList) {
    const tbody = document.getElementById('datasetTableBody');
    const countInfo = document.getElementById('datasetCountInfo');
    if (!tbody) return;

    tbody.innerHTML = '';
    countInfo.textContent = `Menampilkan ${dataList.length} data`;

    if (dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 40px;">Tidak ada data kereta terdaftar.</td></tr>`;
        return;
    }

    dataList.forEach((train, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><span class="train-no-badge">KA ${train.nomorKA || '-'}</span></td>
            <td><strong>${train.namaKA}</strong></td>
            <td>${train.gerbongList ? train.gerbongList.length : 0} Gerbong</td>
            <td style="white-space: nowrap; text-align: center;">
                <div class="action-btns" style="justify-content: center; flex-wrap: nowrap;">
                    <button class="action-btn edit" title="Edit Data" onclick="openEditModal('${train.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn delete" title="Hapus Data" onclick="deleteTrainData('${train.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// Filter dataset table
window.filterDataset = function() {
    const el = document.getElementById('datasetSearch');
    if (!el) return;
    const term = el.value.toLowerCase();
    const filtered = trains.filter(t => 
        (t.namaKA || '').toLowerCase().includes(term) || 
        (t.nomorKA || '').toString().toLowerCase().includes(term)
    );
    renderDatasetTable(filtered);
};

// Filter Hasil Cards (Semua, 100% Baik, Ada Catatan)
function filterHasilCards(filterType, btnEl) {
    if (btnEl) {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        btnEl.classList.add('active');
    }

    if (filterType === 'perfect') {
        currentFilteredHasil = hasilPemeriksaanData.filter(t => {
            const s = t.statusSummary || {};
            return s.cctvBaik === s.cctvTotal && s.pidsBaik === s.pidsTotal && s.runningTextBaik === s.runningTextTotal;
        });
    } else if (filterType === 'issue') {
        currentFilteredHasil = hasilPemeriksaanData.filter(t => {
            const s = t.statusSummary || {};
            return s.cctvBaik < s.cctvTotal || s.pidsBaik < s.pidsTotal || s.runningTextBaik < s.runningTextTotal;
        });
    } else {
        currentFilteredHasil = [...hasilPemeriksaanData];
    }

    renderHasilCards(currentFilteredHasil);
}

// Render View 3 Cards: Hasil Pemeriksaan
function renderHasilCards(dataList) {
    const grid = document.getElementById('hasilCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (dataList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: var(--text-muted); padding: 50px;">Tidak ada hasil pemeriksaan yang sesuai kriteria.</div>`;
        return;
    }

    dataList.forEach(train => {
        const s = train.statusSummary || calculateStatusSummary(train);

        const hasIssue = s.cctvBaik < s.cctvTotal || s.pidsBaik < s.pidsTotal || s.runningTextBaik < s.runningTextTotal || s.tvBaik < s.tvTotal || s.wifiBaik < s.wifiTotal;

        let dateBadge = '';
        if (train.tanggalInspeksi) {
            const dateStr = new Date(train.tanggalInspeksi).toLocaleDateString('id-ID');
            dateBadge = `<span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 4px;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${dateStr}</span>`;
        }
        
        let petugasBadge = '';
        if (train.petugasInspeksi && train.petugasInspeksi.nama) {
            petugasBadge = `<span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px;"><i class="fa-solid fa-user-check" style="margin-right: 4px; color: var(--brand-sky);"></i>Diperiksa oleh: <strong>${train.petugasInspeksi.nama}</strong></span>`;
        }

        const card = document.createElement('div');
        card.className = 'glass-card hasil-card';
        card.innerHTML = `
            <div>
                <div class="hasil-card-header">
                    <div class="train-title-tag">
                        <input type="checkbox" class="hasil-checkbox" value="${train.id}" onchange="handleHasilCheckboxChange()" style="transform: scale(1.2); cursor: pointer; margin-right: 8px;">
                        <i class="fa-solid fa-train icon-accent"></i>
                        <div>
                            <h3>${train.namaKA}</h3>
                            <span class="train-no-badge">KA ${train.nomorKA || '-'}</span>
                            ${dateBadge}
                            ${petugasBadge}
                        </div>
                    </div>
                    <span class="stat-badge ${hasIssue ? 'bg-orange-subtle' : 'bg-emerald-subtle'}">
                        <i class="fa-solid ${hasIssue ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                        ${hasIssue ? 'Ada Catatan' : '100% Baik'}
                    </span>
                </div>

                <div class="device-metrics-grid">
                    <div class="metric-pill">
                        <span class="metric-pill-label"><i class="fa-solid fa-video"></i> CCTV</span>
                        <span class="metric-pill-value ${s.cctvBaik < s.cctvTotal ? 'has-issue' : ''}">${s.cctvBaik}/${s.cctvTotal}</span>
                    </div>
                    <div class="metric-pill">
                        <span class="metric-pill-label"><i class="fa-solid fa-desktop"></i> PIDS</span>
                        <span class="metric-pill-value ${s.pidsBaik < s.pidsTotal ? 'has-issue' : ''}">${s.pidsBaik}/${s.pidsTotal}</span>
                    </div>
                    <div class="metric-pill">
                        <span class="metric-pill-label"><i class="fa-solid fa-pager"></i> Running Text</span>
                        <span class="metric-pill-value ${s.runningTextBaik < s.runningTextTotal ? 'has-issue' : ''}">${s.runningTextBaik}/${s.runningTextTotal}</span>
                    </div>
                    <div class="metric-pill">
                        <span class="metric-pill-label"><i class="fa-solid fa-tv"></i> TV Information</span>
                        <span class="metric-pill-value ${s.tvBaik < s.tvTotal ? 'has-issue' : ''}">${s.tvBaik}/${s.tvTotal}</span>
                    </div>
                    <div class="metric-pill">
                        <span class="metric-pill-label"><i class="fa-solid fa-wifi"></i> Router WIFI</span>
                        <span class="metric-pill-value ${s.wifiBaik < s.wifiTotal ? 'has-issue' : ''}">${s.wifiBaik}/${s.wifiTotal}</span>
                    </div>
                </div>
            </div>

            <div class="hasil-card-footer">
                <button class="btn btn-secondary btn-sm" onclick="viewTrainPDF('${train.id}')">
                    <i class="fa-solid fa-eye"></i> Detail
                </button>
                <button class="btn btn-emerald btn-sm" onclick="printTrainPDF('${train.id}')">
                    <i class="fa-solid fa-print"></i> Print PDF
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.deleteHasilPemeriksaan = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus hasil pemeriksaan ini?')) return;
    
    showLoading('Menghapus data...');
    try {
        const res = await fetch(`/api/hasil/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal menghapus data');
        
        showToast('Data hasil pemeriksaan berhasil dihapus!', 'success');
        await fetchTrainData(); // Refresh data and re-render
    } catch (err) {
        showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

window.handleHasilCheckboxChange = function() {
    const checkboxes = document.querySelectorAll('.hasil-checkbox:checked');
    const count = checkboxes.length;
    const btn = document.getElementById('btnBulkDeleteHasil');
    const countSpan = document.getElementById('bulkDeleteCount');
    
    if (btn && countSpan) {
        if (count > 0) {
            btn.style.display = 'inline-block';
            countSpan.textContent = count;
        } else {
            btn.style.display = 'none';
        }
    }
}

window.bulkDeleteHasil = async function() {
    const checkboxes = document.querySelectorAll('.hasil-checkbox:checked');
    if (checkboxes.length === 0) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus ${checkboxes.length} hasil pemeriksaan yang dipilih?`)) return;

    showLoading(`Menghapus ${checkboxes.length} data...`);
    try {
        // Send delete requests sequentially or in parallel
        // If there's no bulk delete API, we map over individual deletes
        const deletePromises = Array.from(checkboxes).map(cb => 
            fetch(`/api/hasil/${cb.value}`, { method: 'DELETE' })
        );
        
        await Promise.all(deletePromises);
        
        showToast(`${checkboxes.length} data hasil pemeriksaan berhasil dihapus!`, 'success');
        
        // Hide bulk delete button
        const btn = document.getElementById('btnBulkDeleteHasil');
        if (btn) btn.style.display = 'none';
        
        await fetchTrainData(); // Refresh data and re-render
    } catch (err) {
        showToast('Terjadi kesalahan saat menghapus data: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

/* ==========================================================================
   4. Drag & Drop Upload Handlers
   ========================================================================== */
function initDropzones() {
    // Add dummy function if undefined to prevent ReferenceError crashing the rest of the dropzones
    if (typeof handleSiparkaFileSelect === 'undefined') {
        window.handleSiparkaFileSelect = function() { console.log('Siparka file select not implemented'); };
    }
    setupDropzone('dashboardDropZone', 'dashFileInput', handleSiparkaFileSelect);
    setupDropzone('modalDropZone', 'modalFileInput', handleModalFileSelect);
    setupDropzone('tamanKeretaDropZone', 'tkFileInput', handleTamanKeretaFileSelect);
}

function setupDropzone(zoneId, inputId, onFileSelect) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
    });

    ['dragenter', 'dragover'].forEach(evt => {
        zone.addEventListener(evt, () => zone.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, () => zone.classList.remove('dragover'));
    });

    zone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) onFileSelect(files[0]);
    });

    input.addEventListener('change', async function() {
        if (this.files.length > 0) {
            await onFileSelect(this.files[0]);
            this.value = ''; // Reset after upload is completely processed
        }
    });
}


function handleModalFileSelect(file) {
    selectedFileForImport = file;
    const infoEl = document.getElementById('modalFileSelectedInfo');
    if (infoEl) {
        infoEl.style.display = 'flex';
        infoEl.innerHTML = `<i class="fa-solid fa-file-check"></i> File dipilih: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.nomorKA) document.getElementById('importNoKA').value = data.nomorKA;
            if (data.namaKA) document.getElementById('importNamaKA').value = data.namaKA;
            document.getElementById('importTanggal').value = new Date().toISOString().split('T')[0];
        } catch (err) {
            console.log('File raw .siparka parsing');
        }
    };
    reader.readAsText(file);
}

// ---------------- Taman Kereta Upload & Generate ---------------- //
let tkParsedData = null;

async function handleTamanKeretaFileSelect(file) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showToast('Silakan pilih file Excel (.xlsx / .xls)', 'error');
        return;
    }

    showLoading('Memproses file Excel...');
    try {
        const formData = new FormData();
        formData.append('excelFile', file);

        const res = await fetch('/api/parse-taman-kereta', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Gagal memproses Excel');
        }

        tkParsedData = await res.json();
        renderParsedTamanKereta(tkParsedData);
        showToast(`${tkParsedData.rangkaianList.length} rangkaian berhasil dibaca`, 'success');
        
        // Update step indicators & show results
        document.getElementById('tkUploadArea').style.display = 'none';
        document.getElementById('tkResultContainer').style.display = 'block';
        document.getElementById('tkStep1Indicator').classList.remove('active');
        document.getElementById('tkStep2Indicator').classList.add('active');
    } catch (err) {
        showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderParsedTamanKereta(data) {
    const grid = document.getElementById('tkCardsGrid');
    document.getElementById('tkTanggalLabel').textContent = data.tanggal || '-';
    if (!grid) return;

    grid.innerHTML = '';
    
    if (!data.rangkaianList || data.rangkaianList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Tidak ada rangkaian ditemukan dalam file ini.</div>`;
        return;
    }

    data.rangkaianList.forEach((r, idx) => {
        const optionsHtml = r.pilihanNoKA.map(n => `<option value="${n}">KA ${n}</option>`).join('');
        
        // Build gerbong chips (max 8 visible)
        const maxVisible = 8;
        let chipsHtml = '';
        r.gerbongList.slice(0, maxVisible).forEach((g, gIdx) => {
            chipsHtml += `<span class="tk-gerbong-chip"><span class="chip-num">${gIdx + 1}.</span>${g.nomorSarana}</span>`;
        });
        let moreHtml = '';
        if (r.gerbongList.length > maxVisible) {
            moreHtml = `<div class="tk-gerbong-more">+${r.gerbongList.length - maxVisible} gerbong lainnya</div>`;
        }

        const card = document.createElement('div');
        card.className = 'tk-card';
        card.innerHTML = `
            <div class="tk-card-head">
                <input type="checkbox" class="tk-train-checkbox" value="${idx}" style="transform: scale(1.3); margin-right: 15px; cursor: pointer;">
                <div class="tk-card-icon"><i class="fa-solid fa-train"></i></div>
                <div class="tk-card-title">
                    <h4>${r.namaKA}</h4>
                    <small>${r.headerNoKA}</small>
                </div>
            </div>
            <div class="tk-card-body">
                <label class="tk-field-label">Nama KA</label>
                <input type="text" id="tkNamaKa_${idx}" value="${r.namaKA}" class="tk-nama-input">

                <div class="tk-gerbong-list" style="margin-top: 12px;">
                    <label class="tk-field-label">Rangkaian (${r.gerbongList.length} gerbong)</label>
                    <div class="tk-gerbong-list-items">
                        ${chipsHtml}
                    </div>
                    ${moreHtml}
                </div>
            </div>
            <div class="tk-card-foot">
                <button class="btn btn-primary" onclick="generateSiparkaFile(${idx})">
                    <i class="fa-solid fa-file-export"></i> Download .st
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}


window.saveSelectedTrains = async function() {
    if (!tkParsedData || !tkParsedData.rangkaianList) return;
    const checkboxes = document.querySelectorAll('.tk-train-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast('Pilih setidaknya satu rangkaian untuk disimpan', 'error');
        return;
    }

    showLoading(`Menyimpan ${checkboxes.length} rangkaian ke database...`);
    let successCount = 0;
    
    try {
        for (let cb of checkboxes) {
            const idx = cb.value;
            const r = tkParsedData.rangkaianList[idx];
            const namaKA = document.getElementById(`tkNamaKa_${idx}`).value;

            // Generate items per gerbong based on logic from handleImportSubmit
            const formattedGerbongList = r.gerbongList.map(g => {
                return {
                    nomorSarana: g.nomorSarana,
                    tipeGerbong: g.tipeGerbong || 'K1',
                    inspeksiItems: [
                        { nama: "CCTV Berfungsi", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "CCTV Terbackup", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "PIDS Luar Sisi A", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "PIDS Luar Sisi E", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "TD Kecil", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "TD Besar", status: "BAIK", deskripsiKerusakan: "" },
                        { nama: "WIFI", status: "BAIK", deskripsiKerusakan: "" }
                    ]
                };
            });

            const newTrain = {
                id: Date.now().toString() + "_" + idx,
                nomorKA: r.pilihanNoKA[0] || '', // take first match
                namaKA: namaKA,
                tanggalPemeriksaan: new Date().toISOString().split('T')[0],
                petugas: "Petugas Inspeksi KAI",
                statusSummary: {
                    cctvBaik: 18, cctvTotal: 18,
                    pidsBaik: 20, pidsTotal: 20,
                    runningTextBaik: 18, runningTextTotal: 18,
                    tvBaik: 18, tvTotal: 18,
                    wifiBaik: 18, wifiTotal: 18
                },
                gerbongList: formattedGerbongList
            };

            const res = await fetch('/api/trains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTrain)
            });

            if (res.ok) {
                successCount++;
            }
        }

        if (successCount > 0) {
            showToast(`${successCount} rangkaian berhasil disimpan!`, 'success');
            // Move to step 3 visually
            document.getElementById('tkStep2Indicator').classList.remove('active');
            document.getElementById('tkStep3Indicator').classList.add('active');
            
            // Refresh table
            await fetchTrainData();
            
            // Auto navigate to Dataset tab after a short delay
            setTimeout(() => {
                const datasetBtn = document.querySelector('.nav-item[data-tab="dataset"]');
                if (datasetBtn) datasetBtn.click();
                
                // Reset the upload view for next time
                document.getElementById('tkResultContainer').style.display = 'none';
                document.getElementById('tkUploadArea').style.display = 'block';
                document.getElementById('tkStep3Indicator').classList.remove('active');
                document.getElementById('tkStep1Indicator').classList.add('active');
            }, 1500);
        } else {
            throw new Error('Gagal menyimpan semua rangkaian terpilih');
        }
    } catch (err) {
        showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
};

/* ==========================================================================
   5. Modal Dialogs Management & Detail Viewer
   ========================================================================== */
function openImportModal() {
    selectedFileForImport = null;
    document.getElementById('importForm').reset();
    const infoEl = document.getElementById('modalFileSelectedInfo');
    if (infoEl) infoEl.style.display = 'none';
    
    document.getElementById('importTanggal').value = new Date().toISOString().split('T')[0];
    openModal('importModal');
}

async function handleImportSubmit(e) {
    e.preventDefault();
    const noKA = document.getElementById('importNoKA').value;
    const namaKA = document.getElementById('importNamaKA').value;
    const tanggal = document.getElementById('importTanggal').value;

    showLoading('Menyimpan data inspeksi...');

    try {
        let gerbongList = [
            {
                nomorSarana: `K1 0 26 01`,
                inspeksiItems: [
                    { nama: "CCTV Berfungsi", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "CCTV Terbackup", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "PIDS Luar Sisi A", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "PIDS Luar Sisi E", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "TD Kecil", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "TD Besar", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "WIFI", status: "BAIK", deskripsiKerusakan: "" }
                ]
            }
        ];

        if (selectedFileForImport) {
            const text = await selectedFileForImport.text();
            try {
                const parsed = JSON.parse(text);
                if (parsed.gerbongList) gerbongList = parsed.gerbongList;
            } catch (err) {}
        }

        const newTrain = {
            id: noKA || Date.now().toString(),
            nomorKA: noKA,
            namaKA: namaKA,
            tanggalPemeriksaan: tanggal,
            petugas: "Petugas Inspeksi KAI",
            statusSummary: {
                cctvBaik: 18, cctvTotal: 18,
                pidsBaik: 20, pidsTotal: 20,
                runningTextBaik: 18, runningTextTotal: 18,
                tvBaik: 18, tvTotal: 18,
                wifiBaik: 18, wifiTotal: 18
            },
            gerbongList: gerbongList
        };

        const res = await fetch('/api/trains', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTrain)
        });

        if (!res.ok) throw new Error('Gagal menyimpan data');

        showToast(`Data ${namaKA} berhasil disimpan!`, 'success');
        closeModal('importModal');
        fetchTrainData();
    } catch (err) {
        showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// Enhanced Detail & Preview Modal with Gerbong Breakdown Table
function openPreviewModal(id) {
    let train = trains.find(t => t.id === id || t.nomorKA === id);
    if (!train) train = hasilPemeriksaanData.find(t => t.id === id || t.nomorKA === id);
    if (!train) return;

    document.getElementById('previewTitle').innerHTML = `<i class="fa-solid fa-train icon-accent"></i> Detail Inspeksi - ${train.namaKA} (KA ${train.nomorKA || '-'})`;
    
    const s = train.statusSummary || { cctvBaik:18, cctvTotal:18, pidsBaik:20, pidsTotal:20, runningTextBaik:18, runningTextTotal:18, tvBaik:18, tvTotal:18 };

    let gerbongHtml = '';
    if (train.gerbongList && train.gerbongList.length > 0) {
        gerbongHtml = `
            <div style="margin-top:20px;">
                <h4 style="font-size:15px; margin-bottom:12px; color:var(--brand-sky);"><i class="fa-solid fa-layer-group"></i> Rangkaian Gerbong & Item Inspeksi</h4>
                <div style="max-height:260px; overflow-y:auto; border:1px solid var(--border-glass); border-radius:12px;">
                    <table class="gerbong-preview-table">
                        <thead>
                            <tr>
                                <th>No. Sarana</th>
                                <th>Item Perangkat</th>
                                <th>Status</th>
                                <th>Catatan</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        train.gerbongList.forEach(g => {
            (g.inspeksiItems || []).forEach(item => {
                const isBaik = item.status === 'BAIK';
                gerbongHtml += `
                    <tr>
                        <td><strong>${g.nomorSarana}</strong></td>
                        <td>${item.nama}</td>
                        <td><span class="item-status-pill ${isBaik ? 'status-baik' : 'status-rusak'}">${item.status}</span></td>
                        <td style="color:var(--text-muted);">${item.deskripsiKerusakan || '-'}</td>
                    </tr>
                `;
            });
        });

        gerbongHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    document.getElementById('previewBody').innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:14px; color:var(--text-subtle); background:rgba(255,255,255,0.03); padding:12px 16px; border-radius:10px; border:1px solid var(--border-glass);">
            <span><i class="fa-regular fa-calendar" style="color:var(--brand-sky);"></i> <strong>Tanggal Inspeksi:</strong> ${formatDate(train.tanggalPemeriksaan)}</span>
            <span><i class="fa-solid fa-user-check" style="color:var(--accent-emerald);"></i> <strong>Petugas:</strong> ${train.petugas || 'Petugas Inspeksi KAI'}</span>
        </div>
        
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:12px; padding:18px;">
            <h4 style="font-size:15px; margin-bottom:12px; color:var(--brand-sky);"><i class="fa-solid fa-chart-pie"></i> Ringkasan Kelaikan Perangkat</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:14px;">
                <div>📹 CCTV: <strong>${s.cctvBaik}/${s.cctvTotal} Baik</strong></div>
                <div>🖥️ PIDS: <strong>${s.pidsBaik}/${s.pidsTotal} Baik</strong></div>
                <div>📟 Running Text: <strong>${s.runningTextBaik}/${s.runningTextTotal} Baik</strong></div>
                <div>📺 TV Display: <strong>${s.tvBaik}/${s.tvTotal} Baik</strong></div>
            </div>
        </div>

        ${gerbongHtml}
    `;
    openModal('previewModal');
}

// Edit Modal
// Edit Modal Dataset Mentah
function openEditModal(id) {
    const train = trains.find(t => t.id === id);
    if (!train) return;

    document.getElementById('editTrainId').value = train.id;
    document.getElementById('editNoKA').value = train.nomorKA || '';
    document.getElementById('editNamaKA').value = train.namaKA || '';

    // Render gerbong list
    const gerbongList = train.gerbongList || [];
    renderEditGerbongList(gerbongList);
    
    openModal('editModal');
}

function renderEditGerbongList(gerbongList) {
    const container = document.getElementById('editGerbongList');
    if (!container) return;
    container.innerHTML = '';

    if (gerbongList.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">Belum ada gerbong. Klik "Tambah Gerbong" untuk menambahkan.</div>`;
        return;
    }

    gerbongList.forEach((g, idx) => {
        const row = document.createElement('div');
        row.className = 'gerbong-edit-row';
        row.style.cssText = 'display:flex; gap:8px; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:8px;';
        row.dataset.idx = idx;
        row.innerHTML = `
            <span style="color:var(--text-muted); font-size:12px; min-width:24px; text-align:center;">${idx + 1}</span>
            <input type="text" placeholder="Nomor Sarana (mis: K1 0 26 01)" value="${g.nomorSarana || ''}"
                data-field="nomorSarana" data-idx="${idx}"
                class="form-control" style="flex:2; font-size:13px;">
            <input type="text" placeholder="Tipe Gerbong (mis: K1, MP1)" value="${g.tipeGerbong || ''}"
                data-field="tipeGerbong" data-idx="${idx}"
                class="form-control" style="flex:1; font-size:13px;">
            <button type="button" onclick="removeGerbongRow(${idx})"
                style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444; border-radius:6px; width:32px; height:32px; cursor:pointer; flex-shrink:0;">
                <i class="fa-solid fa-trash" style="font-size:11px;"></i>
            </button>
        `;
        container.appendChild(row);
    });
}

function addGerbongRow() {
    const container = document.getElementById('editGerbongList');
    if (!container) return;

    // Clear "empty" message if present
    const emptyMsg = container.querySelector('div:not(.gerbong-edit-row)');
    if (emptyMsg) emptyMsg.remove();

    const idx = container.querySelectorAll('.gerbong-edit-row').length;
    const row = document.createElement('div');
    row.className = 'gerbong-edit-row';
    row.style.cssText = 'display:flex; gap:8px; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:8px;';
    row.dataset.idx = idx;
    row.innerHTML = `
        <span style="color:var(--text-muted); font-size:12px; min-width:24px; text-align:center;">${idx + 1}</span>
        <input type="text" placeholder="Nomor Sarana (mis: K1 0 26 01)" value=""
            data-field="nomorSarana" data-idx="${idx}"
            class="form-control" style="flex:2; font-size:13px;">
        <input type="text" placeholder="Tipe Gerbong (mis: K1, MP1)" value=""
            data-field="tipeGerbong" data-idx="${idx}"
            class="form-control" style="flex:1; font-size:13px;">
        <button type="button" onclick="removeGerbongRow(${idx})"
            style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444; border-radius:6px; width:32px; height:32px; cursor:pointer; flex-shrink:0;">
            <i class="fa-solid fa-trash" style="font-size:11px;"></i>
        </button>
    `;
    container.appendChild(row);
}

function removeGerbongRow(idx) {
    const container = document.getElementById('editGerbongList');
    const rows = container.querySelectorAll('.gerbong-edit-row');
    if (rows[idx]) rows[idx].remove();
    // Re-number remaining rows
    const remaining = container.querySelectorAll('.gerbong-edit-row');
    remaining.forEach((r, i) => {
        r.querySelector('span').textContent = i + 1;
        r.querySelectorAll('[data-idx]').forEach(el => el.setAttribute('data-idx', i));
        const btn = r.querySelector('button');
        btn.setAttribute('onclick', `removeGerbongRow(${i})`);
    });
    if (remaining.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">Belum ada gerbong. Klik "Tambah Gerbong" untuk menambahkan.</div>`;
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editTrainId').value;
    
    const rows = document.getElementById('editGerbongList').querySelectorAll('.gerbong-edit-row');
    const gerbongList = [];
    rows.forEach(row => {
        const nomorSarana = row.querySelector('[data-field="nomorSarana"]').value.trim();
        const tipeGerbong = row.querySelector('[data-field="tipeGerbong"]').value.trim();
        if (nomorSarana) {
            gerbongList.push({ 
                nomorSarana, 
                tipeGerbong,
                inspeksiItems: [
                    { nama: "CCTV Berfungsi", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "CCTV Terbackup", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "PIDS Luar Sisi A", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "PIDS Luar Sisi E", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "TD Kecil", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "TD Besar", status: "BAIK", deskripsiKerusakan: "" },
                    { nama: "WIFI", status: "BAIK", deskripsiKerusakan: "" }
                ]
            });
        }
    });

    const updatedData = {
        nomorKA: document.getElementById('editNoKA').value,
        namaKA: document.getElementById('editNamaKA').value,
        gerbongList
    };

    showLoading('Memperbarui data...');
    try {
        const res = await fetch(`/api/trains/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) throw new Error('Gagal memperbarui data');

        showToast('Perubahan berhasil disimpan!', 'success');
        closeModal('editModal');
        fetchTrainData();
    } catch (err) {
        showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// Delete Train Record
async function deleteTrainData(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data kereta ini dari sistem?')) return;

    showLoading('Menghapus data...');
    try {
        const res = await fetch(`/api/trains/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal menghapus data');

        showToast('Data berhasil dihapus', 'success');
        fetchTrainData();
    } catch (err) {
        showToast('Gagal menghapus: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// View PDF preview in Modal
async function viewTrainPDF(id) {
    let train = trains.find(t => t.id === id || t.nomorKA === id);
    if (!train) train = hasilPemeriksaanData.find(t => t.id === id || t.nomorKA === id);
    if (!train) return;



    showLoading(`Menyiapkan PDF Laporan ${train.namaKA}...`);

    try {
        const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(train)
        });

        if (!res.ok) throw new Error('Gagal membuat PDF');

        const blob = await res.blob();
        currentPdfFileName = `Laporan_KA_${train.namaKA || 'TanpaNama'}_${train.tanggalInspeksi || 'TanpaTanggal'}.pdf`;
        displayPDFInModal(blob);
    } catch (err) {
        showToast('Gagal membuat PDF: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// Print PDF directly
async function printTrainPDF(id) {
    let train = trains.find(t => t.id === id || t.nomorKA === id);
    if (!train) train = hasilPemeriksaanData.find(t => t.id === id || t.nomorKA === id);
    if (!train) return;

    showLoading(`Menyiapkan Dokumen Print ${train.namaKA}...`);

    try {
        const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(train)
        });

        if (!res.ok) throw new Error('Gagal membuat PDF');

        const blob = await res.blob();
        if (currentPdfBlobUrl) {
            window.URL.revokeObjectURL(currentPdfBlobUrl);
        }
        currentPdfBlobUrl = URL.createObjectURL(blob);
        
        openModal('wordPrintModal');
        renderPdfBlobToCanvas(blob, 'wordPrintCanvasContainer');
    } catch (err) {
        showToast('Gagal mencetak dokumen: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// Configure PDF.js worker
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function renderPdfBlobToCanvas(blob, containerId = 'pdfCanvasContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="pdf-loading-spinner">
            <div class="spinner"></div>
            <p>Rendering halaman PDF Laporan...</p>
        </div>
    `;

    try {
        const arrayBuffer = await blob.arrayBuffer();
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library belum siap');
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            
            const viewportDefault = page.getViewport({ scale: 1.0 });
            const containerWidth = container.clientWidth || 900;
            const targetWidth = Math.max(containerWidth - 40, 800);
            const scale = targetWidth / viewportDefault.width;
            const viewport = page.getViewport({ scale: Math.max(scale, 1.2) });

            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page-wrapper';
            pageWrapper.appendChild(canvas);
            
            // Add page indicator
            const pageLabel = document.createElement('div');
            pageLabel.className = 'pdf-page-num';
            pageLabel.textContent = `Halaman ${pageNum} dari ${pdf.numPages}`;
            pageWrapper.appendChild(pageLabel);

            container.appendChild(pageWrapper);

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        }
    } catch (err) {
        console.error('Error rendering PDF with PDF.js:', err);
        container.innerHTML = `
            <div class="pdf-fallback-box">
                <i class="fa-solid fa-file-pdf icon-accent" style="font-size: 48px; margin-bottom: 12px;"></i>
                <h3>Pratinjau PDF Siap</h3>
                <p>Dokumen Laporan A4 Landscape berhasil dibuat.</p>
                <div style="display:flex; gap:12px; margin-top:16px;">
                    <button class="btn btn-primary" onclick="openPDFInNewTab()"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka PDF di Tab Baru</button>
                    <button class="btn btn-emerald" onclick="downloadCurrentPDF()"><i class="fa-solid fa-download"></i> Unduh File PDF</button>
                </div>
            </div>
        `;
    }
}

function displayPDFInModal(blob) {
    if (currentPdfBlobUrl) {
        window.URL.revokeObjectURL(currentPdfBlobUrl);
    }
    currentPdfBlobUrl = window.URL.createObjectURL(blob);
    
    openModal('pdfViewerModal');
    renderPdfBlobToCanvas(blob);
}

function openPDFInNewTab() {
    if (currentPdfBlobUrl) {
        window.open(currentPdfBlobUrl, '_blank');
    } else {
        showToast('File PDF belum siap', 'error');
    }
}

function executeNativePrint() {
    if (currentPdfBlobUrl) {
        const printWindow = window.open(currentPdfBlobUrl, '_blank');
        if (printWindow) {
            setTimeout(() => {
                printWindow.print();
            }, 800);
        } else {
            showToast('Harap izinkan pop-up browser untuk mencetak', 'error');
        }
    }
}

function downloadCurrentPDF() {
    if (currentPdfBlobUrl) {
        const a = document.createElement('a');
        a.href = currentPdfBlobUrl;
        a.download = currentPdfFileName || `Laporan_SIPERKA_KAI_${Date.now()}.pdf`;
        a.click();
    }
}

// Generic Modal Helpers
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

/* ==========================================================================
   6. Toast & Loading Helpers
   ========================================================================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showLoading(text = 'Memproses data...') {
    const overlay = document.getElementById('globalLoading');
    const textEl = document.getElementById('loadingText');
    if (textEl) textEl.textContent = text;
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('globalLoading');
    if (overlay) overlay.classList.remove('active');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

/* ==========================================================================
   10. Sistem Penugasan & Jadwal
   ========================================================================== */
window.openNewScheduleModal = async function() {
    // Populate Trains
    const trainSelect = document.getElementById('assignTrainId');
    trainSelect.innerHTML = `<option value="">Memuat data kereta...</option>`;
    if (trains && trains.length > 0) {
        let trainOptions = `<option value="">-- Pilih Rangkaian KA --</option>`;
        trains.forEach(t => {
            trainOptions += `<option value="${t.id}">KA ${t.nomorKA || '-'} (${t.namaKA})</option>`;
        });
        trainSelect.innerHTML = trainOptions;
    } else {
        trainSelect.innerHTML = `<option value="">Belum ada data kereta. Import Stamformasi dulu.</option>`;
    }
    
    // Populate Petugas
    const petugasSelect = document.getElementById('assignPetugas');
    petugasSelect.innerHTML = `<option value="">Memuat data petugas...</option>`;
    
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        
        let options = `<option value="">-- Pilih Petugas --</option>`;
        users.forEach(u => {
            options += `<option value="${u.email}|${u.nip}|${u.nama}">${u.nama} (${u.nip || 'NIP -'})</option>`;
        });
        petugasSelect.innerHTML = options;
    } catch(e) {
        petugasSelect.innerHTML = `<option value="">Gagal memuat data petugas</option>`;
    }
    
    // Set default date to today
    document.getElementById('assignDate').value = new Date().toISOString().split('T')[0];
    openModal('assignModal');
};

window.handleAssign = async function(e) {
    e.preventDefault();
    const trainId = document.getElementById('assignTrainId').value;
    const petugasData = document.getElementById('assignPetugas').value;
    const assignDate = document.getElementById('assignDate').value;
    
    if (!trainId) {
        showToast('Pilih rangkaian KA terlebih dahulu', 'error');
        return;
    }
    if (!petugasData) {
        showToast('Pilih petugas terlebih dahulu', 'error');
        return;
    }
    
    const [email, nip, nama] = petugasData.split('|');
    const train = trains.find(t => t.id === trainId);
    
    showLoading('Menyimpan Penugasan...');
    
    try {
        // Send to backend to save schedule and set up email cron
        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trainId: trainId,
                nomorKA: train.nomorKA,
                namaKA: train.namaKA,
                petugas: { email, nip, nama },
                tanggalInspeksi: assignDate,
                status: 'Menunggu'
            })
        });
        
        if (res.ok) {
            showToast(`Berhasil menugaskan KA ${train.nomorKA} ke ${nama}`, 'success');
            closeModal('assignModal');
            loadSchedules(); // Refresh schedules table
        } else {
            throw new Error('Gagal menyimpan jadwal di server');
        }
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
        closeModal('assignModal');
    } finally {
        hideLoading();
    }
};

window.loadSchedules = async function() {
    const tbody = document.getElementById('jadwalTableBody');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/schedules');
        let schedules = await res.json();
        
        if (window.currentUserRole === 'petugas' && window.currentUser) {
            const loginId = window.currentUser.email.toLowerCase();
            schedules = schedules.filter(s => {
                if (!s.petugas) return false;
                const matchEmail = s.petugas.email && s.petugas.email.toLowerCase() === loginId;
                const matchName = s.petugas.nama && s.petugas.nama.toLowerCase().includes(loginId);
                return matchEmail || matchName;
            });
        }

        window.schedulesData = schedules; // Store for edit reference
        
        renderSchedules(schedules);
        
    } catch(e) {
        console.error("Error loading schedules:", e);
        const tbody = document.getElementById('jadwalTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Gagal memuat jadwal.</td></tr>`;
    }
};

window.renderSchedules = function(schedules) {
    const tbody = document.getElementById('jadwalTableBody');
    if (!tbody) return;
    if (schedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Belum ada jadwal penugasan.</td></tr>`;
        return;
    }
    
    let html = '';
    let dashboardHtml = '';
    let completedCount = 0;
    
    schedules.forEach((s, index) => {
        const dateObj = new Date(s.tanggalInspeksi);
        const statusColor = s.status === 'Selesai' ? '#16a34a' : '#f59e0b';
        
        if (s.status === 'Selesai') completedCount++;
        
        let actionColumn = '';
        if (window.currentUserRole !== 'petugas') {
            actionColumn = `
                <td class="admin-only">
                    <div class="action-btns" style="justify-content: flex-start;">
                        <button class="action-btn edit admin-only" title="Edit Jadwal" onclick="openEditScheduleModal('${s.id}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn delete admin-only" title="Hapus Jadwal" onclick="deleteSchedule('${s.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <button class="action-btn view admin-only" title="Kirim Ulang Email" onclick="alert('Fitur Kirim Ulang Email belum diimplementasikan')">
                            <i class="fa-solid fa-envelope"></i>
                        </button>
                    </div>
                </td>
            `;
        }

        html += `
            <tr>
                <td><strong>${dateObj.toLocaleDateString('id-ID')}</strong></td>
                <td>${s.petugas ? s.petugas.nama : '-'}</td>
                <td>${s.petugas ? s.petugas.nip : '-'}</td>
                <td>KA ${s.nomorKA} (${s.namaKA})</td>
                <td><span class="badge" style="background:${statusColor};color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;">${s.status}</span></td>
                ${actionColumn}
            </tr>
        `;

        if (index < 4) {
            const badgeClass = s.status === 'Selesai' ? 'jadwal-badge-selesai' : (s.status === 'Telat' ? 'jadwal-badge-telat' : 'jadwal-badge-menunggu');
            dashboardHtml += `
                <tr>
                    <td>${dateObj.toLocaleDateString('id-ID')}</td>
                    <td>${s.petugas ? s.petugas.nama.split(' ').join('<br>') : '-'}</td>
                    <td>KA ${s.nomorKA}<br>(${s.namaKA})</td>
                    <td><span class="${badgeClass}">${s.status}</span></td>
                </tr>
            `;
        }
    });
    tbody.innerHTML = html;
    
    const dashboardBody = document.getElementById('dashboardJadwalBody');
    if (dashboardBody) {
        dashboardBody.innerHTML = dashboardHtml;
    }
    
    const badge = document.getElementById('badge-jadwal-penugasan');
    if (badge && schedules.length > 0) {
        const pct = Math.round((completedCount / schedules.length) * 100);
        badge.textContent = `${pct}% Selesai`;
    } else if (badge) {
        badge.textContent = `0% Selesai`;
    }
    
    if (window.updateUIPerRole) {
        window.updateUIPerRole();
    }
};

window._sortStates = {};
window.sortLocalData = function(dataArrayName, col, renderFuncStr) {
    let arr = window[dataArrayName];
    if (!arr) return;
    
    let state = window._sortStates[dataArrayName] || { col: null, order: 'ASC' };
    
    if (state.col === col) {
        state.order = state.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
        state.col = col;
        state.order = 'ASC';
    }
    window._sortStates[dataArrayName] = state;
    
    arr.sort((a, b) => {
        let valA = a;
        let valB = b;
        
        if (col.includes('.')) {
            const parts = col.split('.');
            for(let p of parts) { 
                valA = valA ? valA[p] : ''; 
                valB = valB ? valB[p] : ''; 
            }
        } else {
            valA = valA[col];
            valB = valB[col];
        }
        
        valA = valA !== undefined && valA !== null ? valA : '';
        valB = valB !== undefined && valB !== null ? valB : '';
        
        let parsedA = valA;
        let parsedB = valB;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            // Intelligent Date parsing
            // Check if it matches typical date patterns (e.g. YYYY-MM-DD or DD/MM/YYYY)
            if (/^\d{4}-\d{2}-\d{2}/.test(valA) || /^\d{2}\/\d{2}\/\d{4}/.test(valA)) {
                const dA = new Date(valA.includes('/') ? valA.split('/').reverse().join('-') : valA).getTime();
                const dB = new Date(valB.includes('/') ? valB.split('/').reverse().join('-') : valB).getTime();
                if (!isNaN(dA) && !isNaN(dB)) {
                    parsedA = dA;
                    parsedB = dB;
                } else {
                    parsedA = valA.toLowerCase();
                    parsedB = valB.toLowerCase();
                }
            } else {
                parsedA = valA.toLowerCase();
                parsedB = valB.toLowerCase();
            }
        }
        
        if (parsedA < parsedB) return state.order === 'ASC' ? -1 : 1;
        if (parsedA > parsedB) return state.order === 'ASC' ? 1 : -1;
        return 0;
    });
    
    document.querySelectorAll(`.sort-icon-${dataArrayName}`).forEach(el => {
        el.innerHTML = '<i class="fa-solid fa-sort" style="color: rgba(255,255,255,0.2); font-size: 0.8em; margin-left: 5px;"></i>';
    });
    
    const activeIcon = document.getElementById(`sort-icon-${dataArrayName}-${col.replace('.','-')}`);
    if (activeIcon) {
        activeIcon.innerHTML = state.order === 'ASC' 
            ? '<i class="fa-solid fa-arrow-up" style="color: var(--brand-sky); font-size: 0.8em; margin-left: 5px;"></i>' 
            : '<i class="fa-solid fa-arrow-down" style="color: var(--brand-sky); font-size: 0.8em; margin-left: 5px;"></i>';
    }
    
    if (renderFuncStr === 'renderUsers') renderUsers();
    if (renderFuncStr === 'filterDataset') filterDataset(); 
    if (renderFuncStr === 'renderSchedules') renderSchedules(window.schedulesData); 
};

window.openEditScheduleModal = async function(id) {
    const s = (window.schedulesData || []).find(x => x.id === id);
    if (!s) return;

    document.getElementById('editSchedId').value = s.id;
    document.getElementById('editSchedDate').value = s.tanggalInspeksi;

    showLoading('Memuat referensi...');
    try {
        // Load Petugas list
        const resUsers = await fetch('/api/users');
        const users = await resUsers.json();
        const selPetugas = document.getElementById('editSchedPetugas');
        selPetugas.innerHTML = '<option value="">-- Pilih Petugas --</option>';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ email: u.email, nip: u.nip, nama: u.nama });
            opt.textContent = `${u.nama} (NIP: ${u.nip || '-'})`;
            if (s.petugas && s.petugas.email === u.email) opt.selected = true;
            selPetugas.appendChild(opt);
        });

        // Load Trains list
        const resTrains = await fetch('/api/trains');
        const trainList = await resTrains.json();
        const selTrain = document.getElementById('editSchedTrainId');
        selTrain.innerHTML = '<option value="">-- Pilih Rangkaian --</option>';
        trainList.forEach(t => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ trainId: t.id, nomorKA: t.nomorKA, namaKA: t.namaKA });
            opt.textContent = `KA ${t.nomorKA} - ${t.namaKA}`;
            if (s.trainId === t.id) opt.selected = true;
            selTrain.appendChild(opt);
        });

        openModal('editScheduleModal');
    } catch(e) {
        console.error(e);
        showToast('Gagal memuat daftar referensi', 'error');
    } finally {
        hideLoading();
    }
};

window.handleEditScheduleSubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editSchedId').value;
    
    try {
        const petugasData = JSON.parse(document.getElementById('editSchedPetugas').value);
        const trainData = JSON.parse(document.getElementById('editSchedTrainId').value);
        const date = document.getElementById('editSchedDate').value;

        showLoading('Menyimpan perubahan jadwal...');

        const payload = {
            trainId: trainData.trainId,
            nomorKA: trainData.nomorKA,
            namaKA: trainData.namaKA,
            petugas: petugasData,
            tanggalInspeksi: date
        };

        const res = await fetch(`/api/schedules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Gagal memperbarui jadwal');

        showToast('Jadwal berhasil diperbarui', 'success');
        closeModal('editScheduleModal');
        loadSchedules();
    } catch(err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteSchedule = async function(id) {
    if (!confirm('Hapus jadwal ini? Jadwal yang sudah terkirim ke email petugas tidak bisa ditarik kembali dari inbox mereka.')) return;

    showLoading('Menghapus jadwal...');
    try {
        const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal menghapus jadwal');
        
        showToast('Jadwal berhasil dihapus', 'success');
        loadSchedules();
    } catch(err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
};

// Also load schedules when the view is active
document.addEventListener('DOMContentLoaded', () => {
    loadSchedules();
});


/* ==========================================================================
   User Management (Admin Only)
   ========================================================================== */
let usersList = [];

async function fetchUsers() {
    if (!window.currentUser || window.currentUser.role !== 'admin') return;
    try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Gagal memuat pengguna');
        usersList = await res.json();
        renderUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function renderUsers(list = usersList) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:40px; color:var(--text-muted);"><i class="fa-solid fa-users-slash" style="font-size:2rem; margin-bottom:10px;"></i><br>Belum ada data pegawai atau tidak ditemukan.</td></tr>`;
        return;
    }

    list.forEach((user, index) => {
        const tr = document.createElement('tr');
        const avatarLetter = (user.nama || 'U').charAt(0).toUpperCase();
        const roleBadge = user.role === 'admin' 
            ? `<span class="item-status-pill status-rusak" style="background:rgba(139, 92, 246, 0.15); color:var(--accent-purple);"><i class="fa-solid fa-crown"></i> Admin</span>` 
            : `<span class="item-status-pill status-baik" style="background:rgba(16, 185, 129, 0.15); color:var(--accent-emerald);"><i class="fa-solid fa-user"></i> Petugas</span>`;
            
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><span class="train-no-badge" style="background:var(--bg-tertiary);"><i class="fa-solid fa-id-card"></i> ${user.nip || '-'}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--brand-sky), var(--brand-blue)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; box-shadow:0 4px 10px rgba(14, 165, 233, 0.2);">${avatarLetter}</div>
                    <strong style="font-size:14px;">${user.nama || '-'}</strong>
                </div>
            </td>
            <td style="color:var(--text-secondary);"><i class="fa-regular fa-envelope" style="color:var(--text-muted); margin-right:5px;"></i>${user.email || '-'}</td>
            <td>${roleBadge}</td>
            <td class="text-center" style="white-space: nowrap;">
                <div class="action-btns" style="justify-content: center; flex-wrap: nowrap;">
                    <button class="action-btn view" onclick="editUser('${user.uid}')" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser('${user.uid}')" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterUsers = function() {
    const el = document.getElementById('searchUserInput');
    if (!el) return;
    const query = el.value.toLowerCase();
    const filtered = usersList.filter(u => 
        (u.nip || '').toLowerCase().includes(query) || 
        (u.nama || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
    );
    renderUsers(filtered);
};

function editUser(uid) {
    const user = usersList.find(u => u.uid === uid);
    if (!user) return;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="fa-solid fa-user-pen icon-accent"></i> Edit Akun';
    document.getElementById('userUid').value = user.uid;
    document.getElementById('userNip').value = user.nip || '';
    document.getElementById('userNama').value = user.nama || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPassword').value = ''; // Kosongkan
    document.getElementById('userPassword').required = false;
    
    openModal('userModal');
}

// Override modal open to handle user add specifically
const _origOpenModal = openModal;
window.openModal = function(id) {
    if (id === 'userModal' && !document.getElementById('userUid').value) {
        document.getElementById('userModalTitle').innerHTML = '<i class="fa-solid fa-user-plus icon-accent"></i> Tambah Akun Baru';
        document.getElementById('userForm').reset();
        document.getElementById('userUid').value = '';
        document.getElementById('userPassword').required = true;
    }
    _origOpenModal(id);
};

const _origCloseModal = closeModal;
window.closeModal = function(id) {
    if (id === 'userModal') {
        document.getElementById('userUid').value = '';
    }
    _origCloseModal(id);
};

async function handleUserSubmit(e) {
    e.preventDefault();
    const uid = document.getElementById('userUid').value;
    const nip = document.getElementById('userNip').value;
    const nama = document.getElementById('userNama').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    
    const payload = { nip, email, nama, role: 'petugas' };
    if (password) payload.password = password;
    
    const url = uid ? `/api/users/${uid}` : '/api/users';
    const method = uid ? 'PUT' : 'POST';
    
    try {
        showLoading('Menyimpan akun...');
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Gagal menyimpan');
        }
        
        showToast('Berhasil menyimpan akun', 'success');
        closeModal('userModal');
        fetchUsers();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUser(uid) {
    if (!confirm('Yakin ingin menghapus akun ini?')) return;
    try {
        const res = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal menghapus akun');
        showToast('Akun dihapus', 'success');
        fetchUsers();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

// Ensure users are fetched on load if admin
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.currentUser && window.currentUser.role === 'admin') {
            fetchUsers();
        }
    }, 1000); // wait for session
});

// =============================================
// PROFIL SAYA & SIGNATURE PAD
// =============================================
let sigCanvas, sigCtx, isDrawing = false;
let lastX = 0, lastY = 0;

document.addEventListener('DOMContentLoaded', () => {
    sigCanvas = document.getElementById('signatureCanvas');
    if(sigCanvas) {
        sigCtx = sigCanvas.getContext('2d');
        sigCtx.lineWidth = 3;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';
        sigCtx.strokeStyle = '#0f172a';

        // Mouse Events
        sigCanvas.addEventListener('mousedown', startDrawing);
        sigCanvas.addEventListener('mousemove', draw);
        sigCanvas.addEventListener('mouseup', stopDrawing);
        sigCanvas.addEventListener('mouseout', stopDrawing);

        // Touch Events
        sigCanvas.addEventListener('touchstart', startDrawingTouch, {passive: false});
        sigCanvas.addEventListener('touchmove', drawTouch, {passive: false});
        sigCanvas.addEventListener('touchend', stopDrawing);
    }
});

function getMousePos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function getTouchPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    lastX = pos.x; lastY = pos.y;
}
function startDrawingTouch(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getTouchPos(e);
    lastX = pos.x; lastY = pos.y;
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(lastX, lastY);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
    lastX = pos.x; lastY = pos.y;
}
function drawTouch(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(lastX, lastY);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
    lastX = pos.x; lastY = pos.y;
}

function stopDrawing() {
    isDrawing = false;
}

function clearSignature() {
    if(sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

// Intercept tab switching to load profile data
const origSwitchTabForProfile = window.switchTab;
window.switchTab = function(tabId) {
    if(origSwitchTabForProfile) origSwitchTabForProfile(tabId);
    else {
        // Fallback if orig is somehow not defined
        document.querySelectorAll('.view-page').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId + 'View').classList.add('active');
        const btn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if(btn) btn.classList.add('active');
    }
    
    if (tabId === 'profil') {
        loadProfile();
    }
};

async function loadProfile() {
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('siparka_token') }
        });
        if (!res.ok) throw new Error('Gagal load profil');
        const data = await res.json();
        const user = data.user;
        
        document.getElementById('profilNama').textContent = user.nama || user.nip || 'Admin';
        document.getElementById('profilNip').textContent = 'NIP: ' + (user.nip || '-');
        document.getElementById('profilEmail').textContent = user.email || '-';
        
        const badge = document.getElementById('profilRoleBadge');
        badge.textContent = (user.role === 'admin' || user.role === 'superadmin') ? 'Manager / Admin' : 'Petugas';
        badge.style.background = (user.role === 'admin') ? 'var(--danger-red)' : 'var(--brand-sky)';

        if (user.signature) {
            document.getElementById('existingSignatureContainer').style.display = 'block';
            document.getElementById('existingSignatureImg').src = user.signature;
        } else {
            document.getElementById('existingSignatureContainer').style.display = 'none';
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function saveSignature() {
    // Check if canvas is empty
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width;
    blank.height = sigCanvas.height;
    if (sigCanvas.toDataURL() === blank.toDataURL()) {
        showToast('Tanda tangan masih kosong!', 'error');
        return;
    }

    const dataURL = sigCanvas.toDataURL('image/png');
    try {
        showLoading('Menyimpan tanda tangan...');
        const res = await fetch('/api/profile/signature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('siparka_token')
            },
            body: JSON.stringify({ signature: dataURL })
        });
        if (!res.ok) throw new Error('Gagal menyimpan');
        showToast('Tanda tangan berhasil disimpan', 'success');
        clearSignature();
        loadProfile(); // refresh
    } catch(e) {
        showToast(e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteSignature() {
    if (!confirm('Yakin ingin menghapus tanda tangan Anda?')) return;
    try {
        showLoading('Menghapus...');
        const res = await fetch('/api/profile/signature', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('siparka_token') }
        });
        if (!res.ok) throw new Error('Gagal menghapus');
        showToast('Tanda tangan dihapus', 'success');
        loadProfile();
    } catch(e) {
        showToast(e.message, 'error');
    } finally {
        hideLoading();
    }
}

/* ==========================================================================
   DATABASE MANAGEMENT
   ========================================================================== */
let currentDbPage = 0;
const DB_LIMIT = 50;
let currentDbData = []; // Store current page data for editing
let currentDbSortCol = '';
let currentDbSortOrder = 'ASC';

window.loadDatabaseTables = async function() {
    try {
        // Load stats
        const resStats = await fetch('/api/db/stats');
        if (resStats.ok) {
            const stats = await resStats.json();
            document.getElementById('statDbTables').textContent = stats.tables;
            document.getElementById('statDbRows').textContent = stats.totalRows;
            document.getElementById('statDbSize').textContent = (stats.dbSizeBytes / 1024).toFixed(2) + ' KB';
            
            const listContainer = document.getElementById('dbSidebarList');
            if (listContainer) {
                listContainer.innerHTML = '';
                stats.tableDetails.forEach(t => {
                    const div = document.createElement('div');
                    div.className = 'db-table-item';
                    div.dataset.table = t.name;
                    div.innerHTML = `
                        <div><i class="fa-solid fa-table"></i> ${t.name}</div>
                        <div class="row-count">${t.rows}</div>
                    `;
                    div.onclick = () => selectDbTable(t.name);
                    listContainer.appendChild(div);
                });
            }
        } else {
            if (resStats.status === 401) {
                showToast('Sesi kedaluwarsa. Silakan logout dan login kembali.', 'error');
            }
            const listContainer = document.getElementById('dbSidebarList');
            if (listContainer) {
                listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Gagal memuat data. (Error ${resStats.status})</div>`;
            }
        }
    } catch (e) {
        console.error('Failed to load DB stats:', e);
        const listContainer = document.getElementById('dbSidebarList');
        if (listContainer) {
            listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Error jaringan: ${e.message}</div>`;
        }
    }
};

window.selectDbTable = function(tableName) {
    document.getElementById('activeDbTable').value = tableName;
    
    // Highlight sidebar
    document.querySelectorAll('.db-table-item').forEach(el => {
        if (el.dataset.table === tableName) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    currentDbPage = 0;
    fetchTableData();
};

window.debounceFetchTableData = function() {
    clearTimeout(window.dbFetchTimeout);
    window.dbFetchTimeout = setTimeout(fetchTableData, 500);
};

window.changeDbPage = function(dir) {
    currentDbPage += dir;
    if (currentDbPage < 0) currentDbPage = 0;
    fetchTableData();
};

window.setDbSort = function(col) {
    if (currentDbSortCol === col) {
        currentDbSortOrder = currentDbSortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        currentDbSortCol = col;
        currentDbSortOrder = 'ASC';
    }
    // reset to first page on sort
    currentDbPage = 0;
    fetchTableData();
};

window.fetchTableData = async function() {
    const tableName = document.getElementById('activeDbTable').value;
    if (!tableName) return;
    
    document.getElementById('dbTableTitle').innerHTML = `<i class="fa-solid fa-table"></i> Tabel: ${tableName}`;
    const btnDbAdd = document.getElementById('btnDbAdd');
    if (btnDbAdd) btnDbAdd.style.display = 'inline-flex';
    const search = document.getElementById('dbSearchInput').value || '';
    
    const headEl = document.getElementById('dbTableHead');
    const bodyEl = document.getElementById('dbTableBody');
    
    headEl.innerHTML = '<tr><th>Loading...</th></tr>';
    bodyEl.innerHTML = '<tr><td style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</td></tr>';
    
    try {
        const offset = currentDbPage * DB_LIMIT;
        let url = `/api/db/data/${tableName}?search=${encodeURIComponent(search)}&offset=${offset}&limit=${DB_LIMIT}`;
        if (currentDbSortCol) {
            url += `&sortCol=${encodeURIComponent(currentDbSortCol)}&sortOrder=${currentDbSortOrder}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal memuat data tabel');
        const data = await res.json();
        currentDbData = data;
        
        if (data.length === 0 && currentDbPage === 0) {
            headEl.innerHTML = '<tr><th>Informasi</th></tr>';
            bodyEl.innerHTML = '<tr><td style="text-align:center;padding:40px;">Tidak ada data ditemukan.</td></tr>';
            document.getElementById('dbPaginationInfo').textContent = 'Halaman 1';
            document.getElementById('dbPrevBtn').disabled = true;
            document.getElementById('dbNextBtn').disabled = true;
            return;
        }

        if (data.length > 0) {
            let columns = Object.keys(data[0]);
            
            // Render Header
            let headHtml = '<tr>';
            columns.forEach(col => {
                let sortIcon = '<i class="fa-solid fa-sort" style="color: rgba(255,255,255,0.2); font-size: 0.8em; margin-left: 5px;"></i>';
                if (currentDbSortCol === col) {
                    sortIcon = currentDbSortOrder === 'ASC' 
                        ? '<i class="fa-solid fa-arrow-up" style="color: var(--brand-sky); font-size: 0.8em; margin-left: 5px;"></i>' 
                        : '<i class="fa-solid fa-arrow-down" style="color: var(--brand-sky); font-size: 0.8em; margin-left: 5px;"></i>';
                }
                headHtml += `<th style="white-space: nowrap; cursor: pointer; user-select: none;" onclick="setDbSort('${col}')">${col} ${sortIcon}</th>`;
            });
            headHtml += '<th style="text-align: center; width: 100px;">Aksi</th></tr>';
            headEl.innerHTML = headHtml;

            // Render Body
            let bodyHtml = '';
            data.forEach((row, rowIndex) => {
                bodyHtml += `<tr id="db-row-${row.id || rowIndex}" style="cursor: pointer;" onclick="viewDbRowDetails(${rowIndex})" class="db-table-row-hover">`;
                columns.forEach(col => {
                    let cellVal = row[col];
                    if (typeof cellVal === 'string' && cellVal.length > 50) cellVal = cellVal.substring(0, 50) + '...';
                    if (cellVal === null) cellVal = '<span style="color:#94a3b8;font-style:italic;">NULL</span>';
                    
                    bodyHtml += `<td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" class="db-cell" data-col="${col}">${cellVal}</td>`;
                });
                bodyHtml += `<td style="text-align: center;" onclick="event.stopPropagation()">
                    <div class="action-btns" style="justify-content: center; gap: 5px;">
                        <button class="action-btn edit" onclick="event.stopPropagation(); editDbRow('${tableName}', ${rowIndex}, '${row.id || ''}')" title="Edit Baris" ${!row.id ? 'disabled' : ''}>
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteDbRow('${tableName}', '${row.id || ''}')" title="Hapus Baris" ${!row.id ? 'disabled' : ''}>
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td></tr>`;
            });
            bodyEl.innerHTML = bodyHtml;
        }

        // Pagination Info
        document.getElementById('dbPaginationInfo').textContent = `Halaman ${currentDbPage + 1} (Menampilkan ${data.length} baris)`;
        document.getElementById('dbPrevBtn').disabled = (currentDbPage === 0);
        document.getElementById('dbNextBtn').disabled = (data.length < DB_LIMIT);

    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.editDbRow = function(table, rowIndex, rowId) {
    if (!rowId) return;
    const rowData = currentDbData[rowIndex];
    if (!rowData) return;

    document.getElementById('dbEditTableName').textContent = table;
    document.getElementById('dbEditRowId').value = rowId;

    let columns = Object.keys(rowData);
    const fieldsContainer = document.getElementById('dbEditFields');
    fieldsContainer.innerHTML = '';

    columns.forEach(col => {
        if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return; // Skip auto fields

        let inputType = 'text';
        if (typeof rowData[col] === 'number') inputType = 'number';
        
        const val = rowData[col] !== null ? String(rowData[col]).replace(/"/g, '&quot;') : '';

        fieldsContainer.innerHTML += `
            <div class="form-group" style="text-align: left;">
                <label style="font-weight: 600; font-size: 0.9rem; margin-bottom: 5px; display: block;">${col}</label>
                <input type="${inputType}" name="${col}" class="form-control" value="${val}" placeholder="Masukkan ${col}..." style="width: 100%;">
            </div>
        `;
    });

    openModal('dbEditModal');
};

window.submitDbEdit = async function(e) {
    e.preventDefault();
    const tableName = document.getElementById('activeDbTable').value;
    const rowId = document.getElementById('dbEditRowId').value;
    if (!tableName || !rowId) return;
    
    const form = document.getElementById('dbEditForm');
    const formData = new FormData(form);
    const updates = {};
    
    for (let [key, value] of formData.entries()) {
        if (key !== '_rowId') {
            updates[key] = value;
        }
    }
    
    if (Object.keys(updates).length === 0) {
        showToast('Tidak ada data untuk diupdate', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/db/data/${tableName}/${rowId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('siparka_token')}`
            },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Gagal update baris');
        
        showToast('Data berhasil diperbarui', 'success');
        closeModal('dbEditModal');
        fetchTableData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};

window.deleteDbRow = async function(table, id) {
    if (!confirm(`Yakin ingin menghapus baris (ID: ${id}) dari tabel ${table}?`)) return;
    try {
        const res = await fetch(`/api/db/data/${table}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('siparka_token')}`
            }
        });
        if (!res.ok) throw new Error('Gagal menghapus baris');
        showToast('Baris berhasil dihapus', 'success');
        
        // Refresh stats and table
        loadDatabaseTables();
        fetchTableData();
    } catch(e) {
        showToast(e.message, 'error');
    }
};

window.viewDbRowDetails = function(rowIndex) {
    const rowData = currentDbData[rowIndex];
    if (!rowData) return;
    
    const tbody = document.getElementById('dbDetailBody');
    tbody.innerHTML = '';
    
    for (const [key, value] of Object.entries(rowData)) {
        let displayVal = value;
        if (displayVal === null) {
            displayVal = '<span style="color:#94a3b8;font-style:italic;">NULL</span>';
        } else if (typeof displayVal === 'object') {
            displayVal = JSON.stringify(displayVal, null, 2);
        } else {
            // Check if it's an image or signature
            if ((key.toLowerCase().includes('signature') || String(value).startsWith('data:image/')) && typeof value === 'string' && value.length > 20) {
                displayVal = `<img src="${value}" alt="Signature/Image" style="max-height: 150px; border-radius: 8px; border: 1px solid var(--border-glass); background: white; padding: 5px;">`;
            } else {
                // Escape HTML to prevent XSS
                displayVal = String(displayVal).replace(/&/g, "&amp;")
                                             .replace(/</g, "&lt;")
                                             .replace(/>/g, "&gt;");
            }
        }
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600; color: var(--brand-sky);">${key}</td>
                <td style="word-break: break-all; white-space: pre-wrap; font-family: monospace; font-size: 0.9rem;">${displayVal}</td>
            </tr>
        `;
    }
    
    openModal('dbDetailModal');
};

window.openDbInsertModal = function() {
    const tableName = document.getElementById('activeDbTable').value;
    if (!tableName) return;
    
    document.getElementById('dbInsertTableName').textContent = tableName;
    
    // Asumsikan struktur kolom dari data yang sedang tampil (jika kosong, tidak bisa nambah otomatis dari sini unless we fetch schema, we will try our best from currentDbData[0])
    if (!currentDbData || currentDbData.length === 0) {
        showToast('Tidak dapat memuat struktur tabel karena tabel kosong. Masukkan minimal 1 data via backend terlebih dahulu.', 'error');
        return;
    }

    const sampleRow = currentDbData[0];
    const columns = Object.keys(sampleRow);
    const fieldsContainer = document.getElementById('dbInsertFields');
    fieldsContainer.innerHTML = '';
    
    columns.forEach(col => {
        if (col === 'id' || col === 'createdAt' || col === 'updatedAt') return; // Skip auto fields
        
        // Coba tentukan tipe input
        let inputType = 'text';
        if (typeof sampleRow[col] === 'number') inputType = 'number';
        
        fieldsContainer.innerHTML += `
            <div class="form-group" style="text-align: left;">
                <label style="font-weight: 600; font-size: 0.9rem; margin-bottom: 5px; display: block;">${col}</label>
                <input type="${inputType}" name="${col}" class="form-control" placeholder="Masukkan ${col}..." style="width: 100%;">
            </div>
        `;
    });
    
    openModal('dbInsertModal');
};

window.submitDbInsert = async function(e) {
    e.preventDefault();
    const tableName = document.getElementById('activeDbTable').value;
    if (!tableName) return;
    
    const form = document.getElementById('dbInsertForm');
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
            data[key] = value;
        }
    }
    
    if (Object.keys(data).length === 0) {
        showToast('Mohon isi minimal satu kolom', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/db/data/${tableName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('siparka_token')}`
            },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) throw new Error('Gagal menambahkan data');
        
        showToast('Data berhasil ditambahkan', 'success');
        closeModal('dbInsertModal');
        
        loadDatabaseTables();
        fetchTableData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};

