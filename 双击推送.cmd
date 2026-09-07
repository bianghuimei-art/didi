@echo off
chcp 65001 >nul
title 推送作品页到 GitHub
cd /d "%~dp0"
echo ============================================
echo  正在推送到 GitHub 仓库 bianghuimei-art/didi
echo  如果弹出 GitHub 登录窗口,请用
echo  bianghuimei-art 账号登录并点 Authorize
echo ============================================
echo.
git push -u origin main
echo.
echo ============================================
echo  完成!按任意键关闭本窗口
echo  如显示错误 "could not read Username" 或一直卡住,
echo  请重试一次,并确保在弹出的窗口里完成登录。
echo ============================================
pause
