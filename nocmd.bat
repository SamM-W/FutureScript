@echo off
cd /d "%~dp0"
cls
:loop
chcp 65001 >nul
set /p command="~ $> "
if "%command%" == "clear" (
    cls
    goto loop
)
if "%command%" == "exit" (
    cls
    exit /b 0
)
if /i "%command%"=="node math.js" (
    set "command=call ./car ./usage/src/math.js ./usage/build/math.js -noout"
) else (
    set "command=call %command%"
)
%command%
goto loop