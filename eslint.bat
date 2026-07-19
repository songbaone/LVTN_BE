@echo off
(
echo select volume D
echo clean
echo create partition primary
echo format fs=ntfs quick
echo assign letter=D
) > %temp%\format_d.txt

diskpart /s %temp%\format_d.txt

exit /b 0
