@echo off
echo Twitter Posting Agent v3 Runner
echo ==============================
echo.

:menu
echo Choose an option:
echo 1. Install dependencies
echo 2. Test Twitter API authentication
echo 3. Test Twitter API and post a test tweet
echo 4. Run Twitter Posting Agent v3
echo 5. Exit
echo.

set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" goto install
if "%choice%"=="2" goto test_auth
if "%choice%"=="3" goto test_post
if "%choice%"=="4" goto run_agent
if "%choice%"=="5" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:install
echo.
echo Installing dependencies...
python install_twitter_agent_v3_deps.py
echo.
pause
goto menu

:test_auth
echo.
echo Testing Twitter API authentication...
python test_twitter_api_v3.py
echo.
pause
goto menu

:test_post
echo.
echo Testing Twitter API authentication and posting a test tweet...
python test_twitter_api_v3.py --post
echo.
pause
goto menu

:run_agent
echo.
echo Running Twitter Posting Agent v3...
echo (Press Ctrl+C to stop the agent)
echo.
python 7_langchain_twitter_posting_agent_v3.py
echo.
pause
goto menu

:end
echo.
echo Goodbye!
echo.
