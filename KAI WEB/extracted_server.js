Created At: 2026-09-02T20:41:19+07:00
Completed At: 2026-09-02T20:41:19+07:00
File Path: `file:///c:/Users/gaten/Downloads/PROJECT%20TERSEMBUNYI%20KAI/KAI%20WEB/public/auth.js`
Total Lines: 197
Total Bytes: 7585
Showing lines 1 to 197
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: // auth.js - Sistem Autentikasi Lokal (JWT) - Tanpa Firebase
2: // Semua auth diproses oleh server.js lokal
3: 
4: window.currentUser = null;
5: window.currentUserRole = null;
6: 
7: // Helper: simpan/ambil token dari localStorage
8: function saveToken(token) {
9:     localStorage.setItem('siparka_token', token);
10: }
11: function getToken() {
12:     return localStorage.getItem('siparka_token');
13: }
14: function clearToken() {
15:     localStorage.removeItem('siparka_token');
16: }
17: 
18: // Override window.fetch untuk menyertakan JWT token secara otomatis
19: const _originalFetch = window.fetch;
20: window.fetch = async function(resource, config) {
21:     if (typeof resource === 'string' && resource.startsWith('/api/')) {
22:         config = config || {};
23:         config.headers = config.headers || {};
24:         const token = getToken();
25:         if (token) {
26:             config.headers['Authorization'] = 'Bearer ' + token;
27:         }
28:     }
29:     return _originalFetch(resource, config);
30: };
31: 
32: // Tab switcher Login / Register
33: window.switchAuthTab = function(tab) {
34:     const tabLogin = document.getElementById('tabLogin');
35:     const tabRegister = document.getElementById('tabRegister');
36:     const formLogin = document.getElementById('loginForm');
37:     const formRegister = document.getElementById('registerForm');
38: 
39:     if (tab === 'login') {
40:         tabLogin.classList.add('active');
41:         tabLogin.style.borderBottom = '2px solid var(--brand-sky)';
42:         tabLogin.style.color = 'var(--brand-sky)';
43:         tabRegister.classList.remove('active');
44:         tabRegister.style.borderBottom = 'none';
45:         tabRegister.style.color = 'var(--text-muted)';
46:         formLogin.style.display = 'block';
47:         formRegister.style.display = 'none';
48:     } else {
49:         tabRegister.classList.add('active');
50:         tabRegister.style.borderBottom = '2px solid var(--brand-sky)';
51:         tabRegister.style.color = 'var(--brand-sky)';
52:         tabLogin.classList.remove('active');
53:         tabLogin.style.borderBottom = 'none';
54:         tabLogin.style.color = 'var(--text-muted)';
55:         formRegister.style.display = 'block';
56:         formLogin.style.display = 'none';
57:     }
58: };
59: 
60: // LOGIN
61: window.handleLogin = async function(e) {
62:     e.preventDefault();
63:     const email = document.getElementById('loginEmail').value;
64:     const password = document.getElementById('loginPassword').value;
65: 
66:     try {
67:         if (window.showLoading) window.showLoading('Melakukan Autentikasi...');
68:         const res = await _originalFetch('/api/auth/login', {
69:             method: 'POST',
70:             headers: { 'Content-Type': 'application/json' },
71:             body: JSON.stringify({ email, password })
72:         });
73:         const data = await res.json();
74:         if (!res.ok) {
75:             if (window.hideLoading) window.hideLoading();
76:             if (window.showToast) window.showToast('Login gagal: ' + data.message, 'error');
77:             return;
78:         }
79:         saveToken(data.token);
80:         window.currentUser = data.user;
81:         window.currentUserRole = data.user.role;
82:         document.getElementById('authModal').style.display = 'none';
83:         if (window.hideLoading) window.hideLoading();
84:         updateUIPerRole();
85:         if (window.loadSchedules) window.loadSchedules();
86:         if (window.showToast) window.showToast('Selamat datang, ' + data.user.email, 'success');
87:     } catch (error) {
88:         if (window.hideLoading) window.hideLoading();
89:         if (window.showToast) window.showToast('Login gagal: Tidak dapat menghubungi server', 'error');
90:     }
91: };
92: 
93: // REGISTER (tambah user baru - hanya admin yang bisa)
94: window.handleRegister = async function(e) {
95:     e.preventDefault();
96:     const nama = document.getElementById('regName').value;
97:     const email = document.getElementById('regEmail').value;
98:     const password = document.getElementById('regPassword').value;
99:     const nip = document.getElementById('regNIP') ? document.getElementById('regNIP').value : '';
100: 
101:     try {
102:         if (window.showLoading) window.showLoading('Mendaftarkan Petugas...');
103:         const res = await _originalFetch('/api/users', {
104:             method: 'POST',
105:             headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
106:             body: JSON.stringify({ email, password, nama, role: 'petugas', nip })
107:         });
108:         const data = await res.json();
109:         if (window.hideLoading) window.hideLoading();
110:         if (res.ok) {
111:             if (window.showToast) window.showToast('Pendaftaran berhasil! Silakan login.', 'success');
112:             // Otomatis pindah ke tab login
113:             switchAuthTab('login');
114:             document.getElementById('loginEmail').value = email;
115:             document.getElementById('loginPassword').value = '';
116:             document.getElementById('loginPassword').focus();
117:             
118:             // Kosongkan form register
119:             document.getElementById('regName').value = '';
120:             document.getElementById('regEmail').value = '';
121:             document.getElementById('regPassword').value = '';
122:             if (document.getElementById('regNIP')) document.getElementById('regNIP').value = '';
123:         } else {
124:             if (window.showToast) window.showToast('Gagal: ' + data.message, 'error');
125:         }
126:     } catch (error) {
127:         if (window.hideLoading) window.hideLoading();
128:         if (window.showToast) window.showToast('Pendaftaran gagal: Tidak dapat menghubungi server', 'error');
129:     }
130: };
131: 
132: // LOGOUT
133: window.handleLogout = function() {
134:     clearToken();
135:     window.currentUser = null;
136:     window.currentUserRole = null;
137:     document.getElementById('authModal').style.display = 'flex';
138: };
139: 
140: // Cek sesi saat halaman dibuka
141: async function checkSession() {
142:     const token = getToken();
143:     if (!token) {
144:         document.getElementById('authModal').style.display = 'flex';
145:         return;
146:     }
147:     try {
148:         const res = await _originalFetch('/api/auth/me', {
149:             headers: { 'Authorization': 'Bearer ' + token }
150:         });
151:         if (res.ok) {
152:             const data = await res.json();
153:             window.currentUser = data.user;
154:             window.currentUserRole = data.user.role;
155:             document.getElementById('authModal').style.display = 'none';
156:             updateUIPerRole();
157:             if (window.loadSchedules) window.loadSchedules();
158:         } else {
159:             // Token expired atau tidak valid
160:             clearToken();
161:             document.getElementById('authModal').style.display = 'flex';
162:         }
163:     } catch(e) {
164:         // Server tidak bisa dihubungi
165:         clearToken();
166:         document.getElementById('authModal').style.display = 'flex';
167:     }
168: }
169: 
170: // Update UI sesuai role
171: function updateUIPerRole() {
172:     const role = window.currentUserRole;
173:     console.log('Current User Role:', role);
174: 
175:     if (typeof window.fetchTrainData === 'function') {
176:         window.fetchTrainData();
177:     }
178: 
179:     const adminElements = document.querySelectorAll('.admin-only');
180:     const petugasElements = document.querySelectorAll('.petugas-only');
181:     const roleLabel = document.getElementById('displayUserRole');
182: 
183:     if (roleLabel && window.currentUser) {
184:         roleLabel.textContent = `${window.currentUser.email} (${role})`;
185:     }
186: 
187:     if (role === 'admin' || role === 'superadmin') {
188:         adminElements.forEach(el => el.style.display = '');
189:         petugasElements.forEach(el => el.style.display = 'none');
190:     } else {
191:         adminElements.forEach(el => el.style.display = 'none');
192:         petugasElements.forEach(el => el.style.display = '');
193:     }
194: }
195: 
196: // Jalankan pengecekan sesi saat halaman dimuat
197: document.addEventListener('DOMContentLoaded', checkSession);
The above content shows the entire, complete file contents of the requested file.
