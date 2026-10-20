olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet3.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO FunctionsModule.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/FunctionsModule'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function TailCNA(Sref As Double, CNa As Double, N As Integer, Chrd1 As Double, Chrd2 As Double, b As Double, Rad As Double)
' This function computes the tail assembly normal force coefficient slope
Brkt = Chrd1 * (b - Rad) + Chrd2 * (b ^ 2 + 2 * b * Rad) / 2 + Chrd1 * Rad * b / (b + Rad) + Chrd2 * Rad ^ 2 * Log((b + Rad) / Rad)
TailCNA = (CNa * N / (2 * Sref)) * Brkt
End Function

Function Rolldriver(Sref As Double, lref As Double, CNa As Double, N As Integer, Chrd1 As Double, Chrd2 As Double, b As Double, Rad As Double)
' This function computes the roll moment coefficient derivative with respect to fin cant angle
Brkt = Chrd1 * (b ^ 2 + 2 * Rad * b) / 2 + Chrd2 * (b ^ 3 + 3 * Rad * b ^ 2 + 3 * Rad ^ 2 * b) / 3
Rolldriver = CNa * Brkt / (Sref * lref)
End Function

Function Rolldamping(Sref As Double, lref As Double, CNa As Double, N As Integer, Chrd1 As Double, Chrd2 As Double, b As Double, Rad As Double)
' This function computes the roll moment coefficient due to roll rate
Brkt = Chrd1 * (b ^ 3 + 3 * b ^ 2 * Rad + 3 * b * Rad ^ 2) / 3 + Chrd2 * (b ^ 4 + 4 * Rad * b ^ 3 + 6 * Rad ^ 2 * b ^ 2 + 4 * Rad ^ 3 * b) / 4
Rolldamping = -(2 * CNa * N / (lref ^ 2 * Sref)) * Brkt
End Function

Function f0(vorrad As Double, vorphi As Double, Phi As Double, y As Double)
' This function computes the function zero indefinate integral
deltaphi = vorphi - Phi
f0 = (1 / (vorrad * Sin(deltaphi))) * Atn(y / (vorrad * Sin(deltaphi)) - 1 / Tan(deltaphi))
End Function

Function f1(vorrad As Double, vorphi As Double, Phi As Double, y As Double)
' This function computes the function one indefinate integral
deltaphi = vorphi - Phi
BigY = y ^ 2 - 2 * y * vorrad * Cos(deltaphi) + vorrad ^ 2
f1 = Log(BigY) / 2 + vorrad * Cos(deltaphi) * f0(vorrad, vorphi, Phi, y)
End Function

Function f2(vorrad As Double, vorphi As Double, Phi As Double, y As Double)
' This function computes the function two indefinate integral
deltaphi = vorphi - Phi
BigY = y ^ 2 - 2 * y * vorrad * Cos(deltaphi) + vorrad ^ 2
f2 = y + vorrad * Cos(deltaphi) * Log(BigY) + vorrad ^ 2 * Cos(2 * deltaphi) * f0(vorrad, vorphi, Phi, y)
End Function

Function f3(vorrad As Double, vorphi As Double, Phi As Double, y As Double)
' This function computes the function three indefinate integral
deltaphi = vorphi - Phi
BigY = y ^ 2 - 2 * y * vorrad * Cos(deltaphi) + vorrad ^ 2
f3 = y ^ 2 / 2 + 2 * y * vorrad * Cos(deltaphi) + vorrad ^ 2 * (2 * (Cos(deltaphi)) ^ 2 - 1 / 2) * Log(BigY) + vorrad ^ 3 * Cos(3 * deltaphi) * f0(vorrad, vorphi, Phi, y)
End Function

Function g(Chrd1 As Double, Chrd2 As Double, vorrad As Double, vorphi As Double, Phi As Double, Rad As Double, b As Double)
' This function computes the rolling moment coefficient induced on one fin panel by a single vortex
deltaphi = vorphi - Phi
g = -Chrd1 * vorrad * Cos(deltaphi) * (f1(vorrad, vorphi, Phi, Rad + b) - f1(vorrad, vorphi, Phi, Rad)) + (Chrd1 - Chrd2 * vorrad * Cos(deltaphi)) * (f2(vorrad, vorphi, Phi, Rad + b) - f2(vorrad, vorphi, Phi, Rad)) + Chrd2 * (f3(vorrad, vorphi, Phi, Rad + b) - f3(vorrad, vorphi, Phi, Rad))
End Function

-------------------------------------------------------------------------------
VBA MACRO MainModule.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/MainModule'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

Option Explicit

Public PhiMin As Double
Public PhiMax As Double
Public Phit As Double
Public CLint As Double
Public LHSt As Double
Public Tem As Double


Sub MainFunc()

Sheet1.Range("BA7:BC1000").ClearContents

Dim pi As Double
pi = Sheet1.Range("AY7").Value

Dim iter As Double
iter = Sheet1.Range("AZ7").Value

Dim dphi As Double
dphi = 2 * pi / (iter)

Dim i As Integer
Dim Phi As Double

For i = 1 To iter + 1
Phi = (i - 1) * dphi
Sheet1.Cells(6 + i, 53) = Phi
Next i

''For i = 1 To iter + 1
''Range("BA6").Select
''ActiveCell.Offset(i, 0).Select
''Application.CutCopyMode = False
''Selection.Copy
''Range("U7").Select
''Selection.PasteSpecial Paste:=xlPasteValues, Operation:=xlNone, SkipBlanks _
''    :=False, Transpose:=False
''
''Range("AV7").Select
''Application.CutCopyMode = False
''Selection.Copy
''Range("BB6").Select
''ActiveCell.Offset(i, 0).Select
''Selection.PasteSpecial Paste:=xlPasteValues, Operation:=xlNone, SkipBlanks _
''    :=False, Transpose:=False
''
''Range("AS7").Select
''Application.CutCopyMode = False
''Selection.Copy
''Range("BC6").Select
''ActiveCell.Offset(i, 0).Select
''Selection.PasteSpecial Paste:=xlPasteValues, Operation:=xlNone, SkipBlanks _
''    :=False, Transpose:=False
''
''Next i
''''
''''Sheets("Sheet1").Select
''''Range("B8").Select
''''U = ActiveCell.Value
''''ActiveCell.Offset(0, 1).Select
''''
''''''Sheet4.Cells(4, 3) = "Phif"

End Sub

Sub OptimAlp()

Sheet1.Range("BG7:BJ1000").ClearContents
LHSt = 0
CLint = 0
Dim pi As Double
pi = Sheet1.Range("AY7").Value

Dim iter As Integer
Dim alphaa As Double
Dim dalpha As Double
Dim Maxalpha As Double

Maxalpha = Sheet1.Range("E32").Value


iter = 177
dalpha = (Maxalpha * pi / 180) / iter
Dim j As Integer

For j = 1 To iter + 1
alphaa = dalpha * (j - 1)
Sheet1.Cells(6 + j, 59).Value = alphaa * 180 / pi

If alphaa = 0 Then
    alphaa = dalpha * 0.01
End If
Sheet1.Cells(7, 50).Value = alphaa
OptimPhi
Sheet1.Cells(6 + j, 60).Value = LHSt
Sheet1.Cells(6 + j, 61).Value = Abs(CLint)
Sheet1.Cells(6 + j, 62).Value = LHSt - CLint

'If Abs(CLint) > LHSt - CLint Then
'    Exit For
'End If

Next j
'Sheets("Sheet1").Select
'Range("A29").Select
End Sub

Sub OptimPhi()

'Sheet1.Range("BA7:BC1000").ClearContents

Dim pi As Double
Dim Nf As Double
Dim PhiMax2 As Double
Dim DPhi_ As Double
Dim i As Integer
Dim j As Double

pi = Sheet1.Range("AY7").Value
Nf = Sheet1.Range("T7").Value
PhiMax2 = 2 * pi
DPhi_ = 2 * pi / Nf
CLint = 0
Tem = 15

For j = 1 To 4
PhiMin = DPhi_ * (j - 1)
PhiMax = DPhi_ * j
For i = 1 To 15
If i > 1 Then
Tem = 5
End If
OptimPhiLoop
Next i
Next j
'''Sheet1.Cells(7, 64).Value = Phit
'''Sheet1.Cells(7, 65).Value = Abs(CLint)

End Sub

Sub OptimPhiLoop()

Dim dphi As Double
Dim Phi As Double
dphi = (PhiMax - PhiMin) / Tem
Phi = PhiMin

Do While Phi <= PhiMax
Sheet1.Cells(7, 21).Value = Phi
If Abs(CLint) < Abs(Sheet1.Range("AS7").Value) Then
CLint = Sheet1.Range("AS7").Value
LHSt = Sheet1.Range("AV7").Value
Phit = Phi
End If

Phi = Phi + dphi
Loop
PhiMax = Phit + dphi
PhiMin = Phit - dphi
End Sub
''Sub Clear_RollLockIn()
''Sheet1.Range("BA7:BC1000").ClearContents
''End Sub

-------------------------------------------------------------------------------
VBA MACRO Sheet4.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/High Alfa Roll Lock-In_rev1.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet4'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet

