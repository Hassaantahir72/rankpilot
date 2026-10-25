@echo off
title RankPilot v2.0 Setup
color 0A
echo.
echo  ============================================
echo    RankPilot v2.0 - Windows Setup
echo  ============================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (echo  [ERROR] Node.js not found. Download: https://nodejs.org & pause & exit /b 1)
for /f "tokens=1" %%v in ('node --version') do echo  [OK] Node.js %%v

echo.
echo  [1/2] Installing backend...
cd backend
npm install
if %errorlevel% neq 0 (echo  [ERROR] Backend install failed. & pause & exit /b 1)
if not exist .env (copy .env.example .env >nul & echo  [OK] backend\.env created) else (echo  [SKIP] .env already exists)
cd ..

echo.
echo  [2/2] Installing frontend...
cd frontend
npm install
if %errorlevel% neq 0 (echo  [ERROR] Frontend install failed. & pause & exit /b 1)
if not exist .env.local (
  (
    echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
    echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
    echo NEXT_PUBLIC_STRIPE_PRICE_STARTER=
    echo NEXT_PUBLIC_STRIPE_PRICE_GROWTH=
    echo NEXT_PUBLIC_STRIPE_PRICE_PRO=
    echo NEXT_PUBLIC_STRIPE_PRICE_AGENCY=
    echo NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL=
    echo NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL=
    echo NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=
    echo NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL=
  ) > .env.local
  echo  [OK] frontend\.env.local created
) else (echo  [SKIP] .env.local exists)
cd ..

echo.
echo  ============================================
echo    SETUP COMPLETE - NEXT STEPS:
echo  ============================================
echo.
echo  1. Set up PostgreSQL database:
echo     a) Open pgAdmin or psql
echo     b) Create database: CREATE DATABASE rankpilot;
echo     c) Run: psql -U postgres -d rankpilot -f backend\schema.sql
echo        OR open pgAdmin, select rankpilot DB, open Query Tool,
echo        paste schema.sql contents, click Run
echo.
echo  2. Edit backend\.env:
echo     - Set DB_PASSWORD to your PostgreSQL password
echo     - Set GROQ_API_KEY (free at console.groq.com)
echo     - Set DATAFORSEO_LOGIN + PASSWORD (free at dataforseo.com)
echo     - Set Gmail SMTP_USER + SMTP_PASS (App Password)
echo     - Stripe keys are OPTIONAL for testing; add real monthly and annual Stripe Price IDs to frontend\.env.local
echo.
echo  3. Double-click START.bat to launch!
echo.
echo  4. After signup, make yourself admin:
echo     UPDATE users SET role='superadmin' WHERE email='your@email.com';
echo.
pause
