@echo off
chcp 65001 >nul
title huimei-page · 深色还原作品页 (port 3082)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 node.exe,请先安装 Node.js
  pause
  exit /b 1
)
rem 端口已被占用则直接打开
netstat -ano | findstr /R ":3082 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  start "" http://127.0.0.1:3082/
  exit /b 0
)
set PORT=3082
start "huimei-page-serve" cmd /c "node serve.js"
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:3082/
echo 已启动: http://127.0.0.1:3082/
echo 关闭本窗口不会停止服务;如需停止请结束 huimei-page-serve 窗口。
pause
