Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\HP\Desktop\ANTIGRAVITI"
WshShell.Run "node brito-print-server.js", 0, False
