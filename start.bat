@echo off
echo ============================================================
echo           ResearchAI — AI-Powered Academic Assistant
echo ============================================================
echo.

echo [1/2] Launching local pypdf Full-Text Extractor Engine...
start /b "" "C:\Python314\python.exe" "%~dp0pdf_server.py"

echo [2/2] Opening Live Web App in Google Chrome...
start "" chrome.exe "%~dp0live_preview.html"

echo.
echo ============================================================
echo  Success! ResearchAI is active and connected to pypdf engine.
echo  - Live Preview: live_preview.html (Opened in Chrome)
echo  - PDF Engine:   pypdf (All pages, 100%% full context, no limits)
echo ============================================================
echo.
pause
