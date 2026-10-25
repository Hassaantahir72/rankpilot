@echo off
title RankPilot v2.0
color 0A
if not exist backend\.env (echo  [ERROR] Run SETUP.bat first! & pause & exit /b 1)
echo  Starting RankPilot v2.0...
start "RankPilot API :5000"      cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul
start "RankPilot Frontend :3000" cmd /k "cd frontend && npm run dev"
timeout /t 4 /nobreak >nul
echo.
echo  ============================================
echo    RankPilot is running!
echo  ============================================
echo.
echo    App:      http://localhost:3000
echo    API:      http://localhost:5000/api/health
echo    Admin:    http://localhost:3000/dashboard/admin
echo    Support:  http://localhost:3000/dashboard/support
echo.
start http://localhost:3000
pause
