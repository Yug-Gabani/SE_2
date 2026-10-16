@echo off
title Starting PulseCare...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
