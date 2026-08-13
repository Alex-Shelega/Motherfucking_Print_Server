Option Explicit

Dim WshShell, fso, scriptDir, pidFile, trayPidFile

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
pidFile = scriptDir & "\server.pid"
trayPidFile = scriptDir & "\tray.pid"

' Helper subroutine to read PID and kill process
Sub KillProcessFromPidFile(filePath)
    Dim objFile, pid
    If fso.FileExists(filePath) Then
        On Error Resume Next
        Set objFile = fso.OpenTextFile(filePath, 1)
        pid = Trim(objFile.ReadLine)
        objFile.Close
        On Error GoTo 0

        If pid <> "" Then
            ' Force kill process quietly
            WshShell.Run "taskkill /F /PID " & pid, 0, True
        End If
        
        ' Delete the PID file
        On Error Resume Next
        fso.DeleteFile filePath, True
        On Error GoTo 0
    End If
End Sub

' 1. Nuke PowerShell Tray app first
KillProcessFromPidFile(trayPidFile)

' 2. Nuke Node Server
KillProcessFromPidFile(pidFile)

Set fso = Nothing
Set WshShell = Nothing