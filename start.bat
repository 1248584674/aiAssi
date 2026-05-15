@echo off
chcp 65001 >/dev/null
echo ============================================
echo   AI 企业效率助手 — 生产模式
echo ============================================
echo.

echo [1/2] 构建前端...
call npx vite build apps/web
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 前端构建完成
echo.

echo [2/2] 启动服务...
echo.
set NODE_ENV=production
npx tsx apps/api/src/main.ts
pause
