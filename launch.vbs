Option Explicit

Dim WshShell, fso, scriptDir, command

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\tray.ps1"""

WshShell.Run command, 0, False

Set fso = Nothing
Set WshShell = Nothing