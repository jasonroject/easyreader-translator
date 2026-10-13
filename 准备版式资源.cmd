@echo off
setlocal
cd /d "%~dp0"
node scripts/setup-layout.mjs
if errorlevel 1 echo Preparation failed. Check the error above and install uv if needed.
pause
