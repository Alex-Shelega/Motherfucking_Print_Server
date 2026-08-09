Option Explicit

Dim WshShell, fso, scriptDir, pidFile, objFile, pid

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
pidFile = scriptDir & "\server.pid"

If fso.FileExists(pidFile) Then
    On Error Resume Next
    Set objFile = fso.OpenTextFile(pidFile, 1)
    pid = Trim(objFile.ReadLine)
    objFile.Close
    On Error GoTo 0

    If pid <> "" Then
        ' Kill process by tracked PID
        WshShell.Run "taskkill /F /PID " & pid, 0, True
    End If
    
    ' Clean up PID file
    If fso.FileExists(pidFile) Then
        fso.DeleteFile pidFile, True
    End If
Else
    ' Fallback: Kill any node process running server.js
    WshShell.Run "powershell -Command ""Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }""", 0, True
End If

Set objFile = Nothing
Set fso = Nothing
Set WshShell = Nothing