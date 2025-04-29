@echo off
node ./src/index.js ./usage/src/regex.pfs ./usage/build/regex.js -noout
node ./usage/build/regex.js