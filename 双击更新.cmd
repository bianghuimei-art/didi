@echo off
chcp 65001 >nul
title 提交并推送修改到 GitHub
cd /d "%~dp0"
echo ============================================
echo  正在把本地修改提交并推送到 GitHub
echo  (如果弹出 GitHub 登录窗口,请用 bianghuimei-art 账号登录)
echo ============================================
echo.
git add -A
git commit -m "update content"
git push origin main
echo.
echo ============================================
echo  完成!等约 1 分钟 GitHub Pages 重建后,
echo  访问: https://bianghuimei-art.github.io/didi/
echo ============================================
pause
