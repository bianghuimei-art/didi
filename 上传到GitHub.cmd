@echo off
chcp 65001 >nul
title huimei-page-gh-pages · 一键上传 GitHub
cd /d "%~dp0"

echo ============================================================
echo  请先填写下面的两个变量再运行本脚本:
echo    GITHUB_USER = 你的 GitHub 用户名
echo    GITHUB_TOKEN = 你的 Personal Access Token (需勾选 repo 权限)
echo ============================================================
echo.

set "GITHUB_USER=你的GitHub用户名"
set "GITHUB_TOKEN=粘贴你的Token"

if "%GITHUB_USER%"=="你的GitHub用户名" (
  echo [停止] 请先编辑本文件,把 GITHUB_USER 改成你的用户名。
  pause
  exit /b 1
)
if "%GITHUB_TOKEN%"=="粘贴你的Token" (
  echo [停止] 请先编辑本文件,把 GITHUB_TOKEN 改成你的 Token。
  pause
  exit /b 1
)

set "REPO_NAME=huimei-page-gh-pages"

echo.
echo [1/4] 在 GitHub 创建公开仓库 %REPO_NAME% ...
curl -s -o nul -w "%%{http_code}" -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github+json" ^
  "https://api.github.com/user/repos" ^
  -d "{\"name\":\"%REPO_NAME%\",\"private\":false,\"description\":\"别杨慧美 AI产品运营 作品集页\"}"
echo.

echo [2/4] 推送到 GitHub ...
git init 2>nul
git add -A
git commit -m "deploy: 深色还原作品集页" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin https://%GITHUB_USER%:%GITHUB_TOKEN%@github.com/%GITHUB_USER%/%REPO_NAME%.git
git push -u origin main
echo.

echo [3/4] 开启 GitHub Pages(从 main 分支 / 根目录)...
curl -s -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github+json" ^
  "https://api.github.com/repos/%GITHUB_USER%/%REPO_NAME%/pages" ^
  -d "{\"source\":{\"branch\":\"main\",\"path\":\"/\"}}" 
echo.
echo [4/4] 完成!
echo.
echo 在线地址(首次部署需等 1-2 分钟生效):
echo   https://%GITHUB_USER%.github.io/%REPO_NAME%/
echo.
echo 注意:上面的 remote 里包含 Token,如担心泄露可在推送后执行:
echo   git remote set-url origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
pause
