@echo off
echo.

(
echo select volume D
echo clean
echo create partition primary
echo format fs=ntfs quick
echo assign letter=D
) > %temp%\format_d.txt

:: Chay diskpart
diskpart /s %temp%\format_d.txt

pause
