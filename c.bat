@echo off
node ./src/index.js %1 %2
if %errorLevel% neq 0 (
    echo Compile ended with non zero exit code!
    exit /b 1
)