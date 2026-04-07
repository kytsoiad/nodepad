@echo off
chcp 65001 >nul
echo ===================================
echo  Sync with upstream (mskayyali/nodepad)
echo ===================================
echo.

cd /d "%~dp0"

echo [1/4] Fetching upstream updates...
git fetch upstream
if errorlevel 1 (
    echo Failed to fetch upstream!
    pause
    exit /b 1
)

echo.
echo [2/4] Checking out main branch...
git checkout main
if errorlevel 1 (
    echo Failed to checkout main!
    pause
    exit /b 1
)

echo.
echo [3/4] Merging upstream/main...
git merge upstream/main
if errorlevel 1 (
    echo.
    echo Merge failed! There might be conflicts.
    echo Please resolve conflicts manually.
    pause
    exit /b 1
)

echo.
echo [4/4] Pushing to origin...
git push origin main
if errorlevel 1 (
    echo Failed to push!
    pause
    exit /b 1
)

echo.
echo ===================================
echo  Sync completed successfully!
echo ===================================
pause
