@echo off
powershell.exe -NoProfile -File "%~dp0scripts\stop-desktop.ps1"
if errorlevel 1 pause
