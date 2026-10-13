@echo off
setlocal
cd /d "%~dp0"
title EasyReader Local Launcher
set "APP_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined APP_NODE set "APP_NODE=%%N"
if not defined APP_NODE if exist "%LOCALAPPDATA%\pi-node\current\node.exe" set "APP_NODE=%LOCALAPPDATA%\pi-node\current\node.exe"
if not defined APP_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "APP_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined APP_NODE (
  echo Node.js was not found. Please install Node.js 22.19 or newer.
  if not "%EASYREADER_SILENT%"=="1" pause
  exit /b 1
)
echo Starting EasyReader. Please keep this window open.
"%APP_NODE%" "%~dp0launcher.mjs"
if errorlevel 1 (
  echo.
  echo Startup failed. See the error above.
  echo Use the address printed by the launcher above.
  if not "%EASYREADER_SILENT%"=="1" pause
  exit /b 1
)
