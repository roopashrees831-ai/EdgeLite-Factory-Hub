@echo off
title EdgeLite — Industrial Edge AI Factory Digital Twin
echo =====================================================================
echo  EdgeLite - Cost-Effective Edge AI Factory Digital Twin
echo  "Deploy cost-effective edge computing solutions for shop floor
echo   digitalization without high IPC infrastructure costs."
echo =====================================================================
echo.
echo [1/2] Starting Edge Computing Backend (FastAPI, SQLite, Local AI)...
start "EdgeLite Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Digital Twin Frontend (Vite, React, Three.js)...
start "EdgeLite Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo  EdgeLite is running!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo =====================================================================
timeout /t 5 >nul
start http://localhost:5173
