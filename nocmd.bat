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
if /i "%command%"=="r" (
    cls
    set "command=call ./car ./usage/src/syntaxv4-Finalizing/compose.pfs ./usage/build/math.js -noreview"
) else (
    set "command=call %command%"
)
%command%
goto loop