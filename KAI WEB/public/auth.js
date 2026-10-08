// auth.js - Sistem Autentikasi Lokal (JWT) - Tanpa Firebase
// Semua auth diproses oleh server.js lokal

window.currentUser = null;
window.currentUserRole = null;

// Helper: simpan/ambil token dari localStorage
function saveToken(token) {
    localStorage.setItem('siparka_token', token);
}
function getToken() {
    return localStorage.getItem('siparka_token');
}
function clearToken() {
    localStorage.removeItem('siparka_token');
}

// Override window.fetch untuk menyertakan JWT token secara otomatis
const _originalFetch = window.fetch;
window.fetch = async function(resource, config) {
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
        config = config || {};
        config.headers = config.headers || {};
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
    }
    return _originalFetch(resource, config);
};

// Tab switcher Login / Register
window.switchAuthTab = function(tab) {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formLogin = document.getElementById('loginForm');
    const formRegister = document.getElementById('registerForm');
    const subtitle = document.getElementById('authSubtitle');

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabLogin.style.borderBottom = '2px solid var(--brand-sky)';
        tabLogin.style.color = 'var(--brand-sky)';
        tabRegister.classList.remove('active');
        tabRegister.style.borderBottom = 'none';
        tabRegister.style.color = 'var(--text-muted)';
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
        if (subtitle) subtitle.style.display = 'block';
    } else {
        tabRegister.classList.add('active');
        tabRegister.style.borderBottom = '2px solid var(--brand-sky)';
        tabRegister.style.color = 'var(--brand-sky)';
        tabLogin.classList.remove('active');
        tabLogin.style.borderBottom = 'none';
        tabLogin.style.color = 'var(--text-muted)';
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
        if (subtitle) subtitle.style.display = 'none';
    }
};

// LOGIN
window.handleLogin = async function(e) {
    e.preventDefault();
    const nip = document.getElementById('loginNIP').value;
    const password = document.getElementById('loginPassword').value;

    try {
        if (window.showLoading) window.showLoading('Melakukan Autentikasi...');
        const res = await _originalFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nip, password })
        });
        const data = await res.json();
        if (!res.ok) {
            if (window.hideLoading) window.hideLoading();
            if (window.showToast) window.showToast('Login gagal: ' + data.message, 'error');
            return;
        }
        saveToken(data.token);
        window.currentUser = data.user;
        window.currentUserRole = data.user.role;
        document.getElementById('authModal').style.display = 'none';
        if (window.hideLoading) window.hideLoading();
        updateUIPerRole();
        if (window.loadSchedules) window.loadSchedules();
        if (window.showToast) window.showToast('Selamat datang, ' + data.user.nama + ' (' + data.user.nip + ')', 'success');
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        if (window.showToast) window.showToast('Login gagal: Tidak dapat menghubungi server', 'error');
    }
};

// REGISTER (tambah user baru - hanya admin yang bisa)
window.handleRegister = async function(e) {
    e.preventDefault();
    const nama = document.getElementById('regName').value;
    const nip = document.getElementById('regNIP').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        if (window.showLoading) window.showLoading('Mendaftarkan Petugas...');
        const res = await _originalFetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ nip, email, password, nama, role: 'petugas' })
        });
        const data = await res.json();
        if (window.hideLoading) window.hideLoading();
        if (res.ok) {
            if (window.showToast) window.showToast('Pendaftaran berhasil! Silakan login.', 'success');
            // Otomatis pindah ke tab login
            switchAuthTab('login');
            document.getElementById('loginNIP').value = nip;
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            
            // Kosongkan form register
            document.getElementById('regName').value = '';
            document.getElementById('regNIP').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
        } else {
            if (window.showToast) window.showToast('Gagal: ' + data.message, 'error');
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        if (window.showToast) window.showToast('Pendaftaran gagal: Tidak dapat menghubungi server', 'error');
    }
};

// LOGOUT
window.handleLogout = function() {
    clearToken();
    window.currentUser = null;
    window.currentUserRole = null;
    document.getElementById('authModal').style.display = 'flex';
    if(typeof switchTab === 'function') switchTab('dashboard');
};

// Cek sesi saat halaman dibuka
async function checkSession() {
    const token = getToken();
    if (!token) {
        document.getElementById('authModal').style.display = 'flex';
        return;
    }
    try {
        const res = await _originalFetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data.user;
            window.currentUserRole = data.user.role;
            document.getElementById('authModal').style.display = 'none';
            updateUIPerRole();
            if (window.loadSchedules) window.loadSchedules();
        } else {
            // Token expired atau tidak valid
            clearToken();
            document.getElementById('authModal').style.display = 'flex';
        }
    } catch(e) {
        // Server tidak bisa dihubungi
        clearToken();
        document.getElementById('authModal').style.display = 'flex';
    }
}

// Update UI sesuai role
function updateUIPerRole() {
    const role = window.currentUserRole;
    console.log('Current User Role:', role);

    if (typeof window.fetchTrainData === 'function') {
        window.fetchTrainData();
    }

    const adminElements = document.querySelectorAll('.admin-only');
    const petugasElements = document.querySelectorAll('.petugas-only');
    const roleLabel = document.getElementById('displayUserRole');

    if (roleLabel && window.currentUser) {
        roleLabel.textContent = `${window.currentUser.nama || window.currentUser.nip} (${role})`;
    }

    if (role === 'admin' || role === 'superadmin') {
        adminElements.forEach(el => el.style.display = '');
        petugasElements.forEach(el => el.style.display = 'none');
    } else {
        adminElements.forEach(el => el.style.display = 'none');
        petugasElements.forEach(el => el.style.display = '');
    }
}

// Jalankan pengecekan sesi saat halaman dimuat
document.addEventListener('DOMContentLoaded', checkSession);