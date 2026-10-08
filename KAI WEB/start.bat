@echo off
echo ================================
echo   SIPARKA Server Manager
echo ================================
echo.

:: Matikan node yang lama jika ada
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo [OK] Server lama dihentikan
) else (
    echo [INFO] Tidak ada server yang berjalan sebelumnya
)

timeout /t 1 /nobreak >nul

:: Jalankan server di background
echo [START] Menjalankan server SIPARKA...
start "SIPARKA Backend" node server.js

:: Tunggu server siap
timeout /t 3 /nobreak >nul

:: Jalankan Cloudflare Tunnel
echo [TUNNEL] Membuka akses internet via Cloudflare...
echo [INFO] Salin URL https://xxxxx.trycloudflare.com yang muncul di bawah
echo [INFO] Tekan Ctrl+C untuk menghentikan tunnel
echo.
.\cloudflared.exe tunnel --url http://localhost:3000
