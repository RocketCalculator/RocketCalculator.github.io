olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet3.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO modeshape.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/modeshape'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function WWW(X As Double, BigBlock As Double, Freq As Double)
' Generates the normal mode shapes for a uniform beam
Dim arg As Double, sinh As Double, cosh As Double
arg = X * Freq
sinh = (Exp(arg) - Exp(-arg)) / 2
cosh = (Exp(arg) + Exp(-arg)) / 2
WWW = BigBlock * (sinh + Sin(arg)) + cosh + Cos(arg)
End Function
-------------------------------------------------------------------------------
VBA MACRO slopeshape.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/slopeshape'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function WXX(XX As Double, BigBlock As Double, Freq As Double)
' Generates the second spatial derivative of the normal modes for a uniform beam
Dim arg As Double, sinh As Double, cosh As Double
arg = XX * Freq
sinh = (Exp(arg) - Exp(-arg)) / 2
cosh = (Exp(arg) + Exp(-arg)) / 2
Prelm = BigBlock * (sinh - Sin(arg)) + cosh - Cos(arg)
WXX = Prelm * Freq ^ 2
End Function
-------------------------------------------------------------------------------
VBA MACRO Sumit.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sumit'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function JXYst(StepL As Double, StepNo As Long, fwdstiff As Double, aftstiff As Double, fwdsta As Double, aftsta As Double, BigBlockI As Double, FreqI As Double, BigBlockL As Double, FreqL As Double)
Dim XX As Double, X As Double, WWWI As Double, WWWL As Double, sum As Double
' Adjust units
fwdstiff = fwdstiff / 144
aftstiff = aftstiff / 144
fwdsta = fwdsta / 12
aftsta = aftsta / 12
' Initialize prior to looping
X = 0
sum = 0
' Loop:
  For k = 1 To StepNo
  X = X + StepL
  stiff = fwdstiff + (aftstiff - fwdstiff) * X / (aftsta - fwdsta)
  XX = fwdsta + X
  WXXI = WXX(XX, BigBlockI, FreqI)
  WXXL = WXX(XX, BigBlockL, FreqL)
  sum = sum + stiff * WXXI * WXXL * StepL
  If (k = 1) Then sum = sum - 0.5 * stiff * WXXI * WXXL * StepL Else: sum = sum
  Next k
JXYst = sum - 0.5 * stiff * WXXI * WXXL * StepL
End Function
-------------------------------------------------------------------------------
VBA MACRO sumit2.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/sumit2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function JXYma(StepL As Double, StepNo As Long, fwdmass As Double, aftmass As Double, fwdsta As Double, aftsta As Double, BigBlockI As Double, FreqI As Double, BigBlockL As Double, FreqL As Double, gStand As Double)
Dim XX As Double, mass As Double, X As Double, sum As Double, WWWI As Double, WWWL As Double
' Adjust units
fwdmass = 12 * fwdmass / gStand
aftmass = 12 * aftmass / gStand
fwdsta = fwdsta / 12
aftsta = aftsta / 12
' Prepare for the loop
X = 0
sum = 0
' Loop:
  For k = 1 To StepNo
  X = X + StepL
  mass = fwdmass + (aftmass - fwdmass) * X / (aftsta - fwdsta)
  XX = fwdsta + X
  WWWI = WWW(XX, BigBlockI, FreqI)
  WWWL = WWW(XX, BigBlockL, FreqL)
  sum = sum + mass * WWWI * WWWL * StepL
  If (k = 1) Then sum = sum - 0.5 * mass * WWWI * WWWL * StepL Else: sum = sum
  Next k
JXYma = sum - 0.5 * mass * WWWI * WWWL * StepL
End Function

-------------------------------------------------------------------------------
VBA MACRO deter3.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/deter3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function determ3(a11 As Double, a12 As Double, a13 As Double, a21 As Double, a22 As Double, a23 As Double, a31 As Double, a32 As Double, a33 As Double)
' Evaluates a 3x3 determinant
determ3 = a11 * a22 * a33 + a12 * a23 * a31 + a13 * a21 * a32 - a31 * a22 * a13 - a32 * a23 * a11 - a33 * a21 * a12
End Function
-------------------------------------------------------------------------------
VBA MACRO deter2.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/deter2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function determ2(a11 As Double, a12 As Double, a21 As Double, a22 As Double)
' Evaluates a 2x2 determinant
determ2 = a11 * a22 - a21 * a12
End Function
-------------------------------------------------------------------------------
VBA MACRO rooter.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/rooter'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function Root(om2u As Double, om2l As Double, st11 As Double, st12 As Double, st13 As Double, st21 As Double, st22 As Double, st23 As Double, st31 As Double, st32 As Double, st33 As Double, ma11 As Double, ma12 As Double, ma13 As Double, ma21 As Double, ma22 As Double, ma23 As Double, ma31 As Double, ma32 As Double, ma33 As Double)
Dim det As Double, detl As Double, detu As Double, ddetdom2 As Double, ele11 As Double, ele12 As Double, ele13 As Double, ele21 As Double, ele22 As Double, ele23 As Double, ele31 As Double, ele32 As Double, ele33 As Double
'
' Bisect to find the critical frequencies squared
' First set up the correct logic
'
om2 = om2u
  ele11 = om2 * ma11 - st11
  ele12 = om2 * ma12 - st12
  ele13 = om2 * ma13 - st13
  ele21 = om2 * ma21 - st21
  ele22 = om2 * ma22 - st22
  ele23 = om2 * ma23 - st23
  ele31 = om2 * ma31 - st31
  ele32 = om2 * ma32 - st32
  ele33 = om2 * ma33 - st33
  detu = determ3(ele11, ele12, ele13, ele21, ele22, ele23, ele31, ele32, ele33)

om2 = om2l
  ele11 = om2 * ma11 - st11
  ele12 = om2 * ma12 - st12
  ele13 = om2 * ma13 - st13
  ele21 = om2 * ma21 - st21
  ele22 = om2 * ma22 - st22
  ele23 = om2 * ma23 - st23
  ele31 = om2 * ma31 - st31
  ele32 = om2 * ma32 - st32
  ele33 = om2 * ma33 - st33
  detl = determ3(ele11, ele12, ele13, ele21, ele22, ele23, ele31, ele32, ele33)
'
  ddetdom2 = (detu - detl) / (om2u - om2l)
'
For i = 1 To 20
  om2 = (om2u + om2l) / 2
  ele11 = om2 * ma11 - st11
  ele12 = om2 * ma12 - st12
  ele13 = om2 * ma13 - st13
  ele21 = om2 * ma21 - st21
  ele22 = om2 * ma22 - st22
  ele23 = om2 * ma23 - st23
  ele31 = om2 * ma31 - st31
  ele32 = om2 * ma32 - st32
  ele33 = om2 * ma33 - st33
  det = determ3(ele11, ele12, ele13, ele21, ele22, ele23, ele31, ele32, ele33)
'
  If (ddetdom2 < 0) Then
     If (det > 0) Then
     om2l = om2
     Else
     om2u = om2
     End If
  Else
  If (det < 0) Then
     om2l = om2
     Else
     om2u = om2
     End If
  End If
Next i
Root = om2 ^ 0.5
End Function
-------------------------------------------------------------------------------
VBA MACRO UserForm1.frm 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO UserForm2.frm 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Class1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Class1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Module1.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Module1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Sub Macro1()
Attribute Macro1.VB_Description = "Macro recorded 9/7/2013 by Owner"
Attribute Macro1.VB_ProcData.VB_Invoke_Func = " \n14"
'
' Macro1 Macro
' Macro recorded 9/7/2013 by Owner
'

'
    Application.CommandBars("Stop Recording").Visible = False
    ActiveWorkbook.Save
    ActiveWindow.SmallScroll ToRight:=2
    Range("BU5").Select
    ActiveWindow.SmallScroll Down:=-4
    ActiveWindow.SmallScroll ToRight:=-26
    Range("AO3").Select
    ActiveWindow.SmallScroll ToRight:=30
    Range("BU3").Select
    ActiveCell.FormulaR1C1 = "Natural Mode Shapes ?"
    With ActiveCell.Characters(Start:=1, Length:=21).Font
        .Name = "Arial"
        .FontStyle = "Bold"
        .Size = 14
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BU5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=7).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BV5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "q3 / q1"
    With ActiveCell.Characters(Start:=1, Length:=7).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BU5").Select
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("BV5").Select
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("BU6").Select
    ActiveCell.FormulaR1C1 = _
        "=R[-4]C[-56](RC[-7],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15],R[11]C[-24],R[11]C[-14])"
    Range("BU6").Select
    ActiveWindow.SmallScroll ToRight:=1
    Selection.AutoFill Destination:=Range("BU6:BV6"), Type:=xlFillDefault
    Range("BU6:BV6").Select
    Range("BV6").Select
    ActiveCell.FormulaR1C1 = _
        "=R[-3]C[-57](RC[-8],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15])"
    Range("BV6").Select
    ActiveCell.FormulaR1C1 = _
        "=R[-3]C[-57](RC[-8],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15])"
    Range("BU6").Select
    ActiveCell.FormulaR1C1 = _
        "=R[-4]C[-56](RC[-7],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15],R[11]C[-24],R[11]C[-14])"
    Range("BU5").Select
    ActiveCell.FormulaR1C1 = "Fundamentalq2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=18).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    ActiveCell.FormulaR1C1 = "Fundamental  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=20).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Columns("BU:BU").ColumnWidth = 10
    Columns("BU:BU").ColumnWidth = 10.71
    Range("BV5").Select
    ActiveCell.FormulaR1C1 = "Fundamental  q3 / q1"
    With ActiveCell.Characters(Start:=1, Length:=20).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Columns("BV:BV").ColumnWidth = 10.14
    Columns("BV:BV").ColumnWidth = 11.14
    Range("BU5").Select
    ActiveCell.FormulaR1C1 = "Fundamental  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=20).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BY5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "First Harmonic  q2 / q1"
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "First Harmonic  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=23).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BZ5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "First Harmonic  q2 / q1"
    Range("BZ5").Select
    ActiveCell.FormulaR1C1 = "First Harmonic  q3 / q1"
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = False
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Range("BU6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q2q1(RC[-7],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15],R[11]C[-24],R[11]C[-14])"
    Range("BV6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q3q1(RC[-8],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15])"
    Range("BU6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q2q1(RC[-7],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15],R[11]C[-24],R[11]C[-14])"
    Range("BV6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q3q1(RC[-8],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15])"
    Range("BV6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q3q1(RC[-8],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18],R[11]C[-27],R[11]C[-17],R[11]C[-26],R[11]C[-16],R[11]C[-25],R[11]C[-15])"
    Range("BY6").Select
    ActiveCell.FormulaR1C1 = ""
    Range("BY6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q2q1(RC[-8],R[11]C[-33],R[11]C[-23],R[11]C[-32],R[11]C[-22],R[11]C[-31],R[11]C[-21],R[11]C[-30],R[11]C[-20],R[11]C[-29],R[11]C[-19],R[11]C[-28],R[11]C[-18])"
    Range("BY26:BZ27").Select
    Range("BY27").Activate
    ActiveWindow.SmallScroll ToRight:=2
    Range("BY6").Select
    Selection.AutoFill Destination:=Range("BY6:BZ6"), Type:=xlFillDefault
    Range("BY6:BZ6").Select
    Range("BZ6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q3q1(RC[-9],R[11]C[-34],R[11]C[-24],R[11]C[-33],R[11]C[-23],R[11]C[-32],R[11]C[-22],R[11]C[-31],R[11]C[-21],R[11]C[-31],R[11]C[-20],R[11]C[-29],R[11]C[-19])"
    Range("BW5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "Fundamental Normalizing Factor"
    With ActiveCell.Characters(Start:=1, Length:=30).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Columns("BX:BX").Select
    Selection.Insert Shift:=xlToRight
    Range("BX5").Select
    ActiveCell.FormulaR1C1 = "X / L"
    With ActiveCell.Characters(Start:=1, Length:=5).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("BX5").Select
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("BY5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "Fundamental Natural Mode Shape"
    With ActiveCell.Characters(Start:=1, Length:=30).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("BX18").Select
    Columns("BY:BY").ColumnWidth = 10
    Columns("BY:BY").ColumnWidth = 11
    ActiveWindow.SmallScroll ToRight:=3
    Range("CB5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "First Harmonic Normalizing Factor"
    With ActiveCell.Characters(Start:=1, Length:=33).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Columns("CB:CB").ColumnWidth = 9.86
    Columns("CB:CB").ColumnWidth = 11.57
    Columns("CB:CB").ColumnWidth = 12
    Columns("CB:CB").ColumnWidth = 13.29
    Columns("CB:CB").ColumnWidth = 12.57
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("CC5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "x /L"
    With ActiveCell.Characters(Start:=1, Length:=4).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    ActiveCell.FormulaR1C1 = "X / L"
    With ActiveCell.Characters(Start:=1, Length:=5).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("CB21:CC22").Select
    Range("CB22").Activate
    Columns("BX:BX").ColumnWidth = 7.86
    Range("BZ5").Select
    ActiveCell.FormulaR1C1 = "First Harmonic  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=23).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("CD5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "Second Harmonic  q2 / q1"
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveWindow.SmallScroll ToRight:=2
    ActiveCell.FormulaR1C1 = "Second Harmonic  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=24).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("CE5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "Second Harmonic  q3 / q1"
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Range("CB5").Select
    ActiveCell.FormulaR1C1 = "First Harmonic Normalizing Factor"
    With ActiveCell.Characters(Start:=1, Length:=33).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("CF5").Select
    ActiveSheet.Paste
    Columns("CF:CF").ColumnWidth = 10.29
    ActiveCell.FormulaR1C1 = "Second Harmonic Normalizing Factor"
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Columns("CF:CF").ColumnWidth = 12.71
    Columns("CF:CF").ColumnWidth = 16
    Columns("CF:CF").ColumnWidth = 14.71
    ActiveWindow.SmallScroll ToRight:=2
    Range("CH6").Select
    Columns("CB:CB").ColumnWidth = 13.57
    Columns("BW:BW").ColumnWidth = 13.86
    Range("CG5").Select
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlEdgeTop).LineStyle = xlNone
    Selection.Borders(xlEdgeBottom).LineStyle = xlNone
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlInsideVertical).LineStyle = xlNone
    Selection.Borders(xlInsideHorizontal).LineStyle = xlNone
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    ActiveCell.FormulaR1C1 = "X / L "
    With ActiveCell.Characters(Start:=1, Length:=6).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    Range("BY5").Select
    ActiveCell.FormulaR1C1 = "Fundamental Natural Mode Shape"
    With ActiveCell.Characters(Start:=1, Length:=30).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Columns("CE:CE").Select
    Selection.Insert Shift:=xlToRight
    Selection.Delete Shift:=xlToLeft
    Columns("CC:CC").Select
    Selection.Insert Shift:=xlToRight
    Selection.Delete Shift:=xlToLeft
    Columns("CD:CD").Select
    Selection.Insert Shift:=xlToRight
    Range("CD5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "First Harmonic Natural Mode Shape"
    With ActiveCell.Characters(Start:=1, Length:=33).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Columns("CD:CD").ColumnWidth = 10.43
    Columns("CD:CD").ColumnWidth = 11.86
    Columns("CD:CD").ColumnWidth = 12.86
    Range("CD9").Select
    ActiveWindow.SmallScroll ToRight:=2
    Range("CD5").Select
    ActiveCell.FormulaR1C1 = "First Harmonic Natural Mode Shape"
    With ActiveCell.Characters(Start:=1, Length:=33).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("CI5").Select
    ActiveSheet.Paste
    ActiveCell.FormulaR1C1 = "Second Harmonic Natural Mode Shape"
    With Selection
        .HorizontalAlignment = xlGeneral
        .VerticalAlignment = xlBottom
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Selection.Borders(xlDiagonalDown).LineStyle = xlNone
    Selection.Borders(xlDiagonalUp).LineStyle = xlNone
    With Selection.Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeTop)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .ColorIndex = xlAutomatic
    End With
    With Selection.Interior
        .ColorIndex = 44
        .Pattern = xlSolid
        .PatternColorIndex = xlAutomatic
    End With
    Columns("CI:CI").ColumnWidth = 11.71
    Columns("CI:CI").ColumnWidth = 12.86
    Columns("CI:CI").ColumnWidth = 14
    Columns("CI:CI").ColumnWidth = 15.43
    Columns("CI:CI").ColumnWidth = 15
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlBottom
        .WrapText = True
        .Orientation = 0
        .AddIndent = False
        .IndentLevel = 0
        .ShrinkToFit = False
        .ReadingOrder = xlContext
        .MergeCells = False
    End With
    Range("CE5").Select
    ActiveCell.FormulaR1C1 = "Second Harmonic  q2 / q1"
    With ActiveCell.Characters(Start:=1, Length:=24).Font
        .Name = "Arial"
        .FontStyle = "Regular"
        .Size = 10
        .Strikethrough = False
        .Superscript = False
        .Subscript = False
        .OutlineFont = False
        .Shadow = False
        .Underline = xlUnderlineStyleNone
        .ColorIndex = xlAutomatic
    End With
    Range("CA5").Select
    Columns("BY:BY").ColumnWidth = 13.14
    Columns("BY:BY").ColumnWidth = 14
    ChDir "C:\Users\Owner\Desktop\Body Bending"
    ActiveWorkbook.SaveAs Filename:= _
        "C:\Users\Owner\Desktop\Body Bending\FLEXIT.xls", FileFormat:=xlNormal, _
        Password:="", WriteResPassword:="", ReadOnlyRecommended:=False, _
        CreateBackup:=False
    Range("CE21").Select
    ActiveWindow.SmallScroll ToRight:=-6
    Range("BY29").Select
    ActiveWindow.SmallScroll ToRight:=4
    Range("CE6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q2q1(RC[-11],R[11]C[-39],R[11]C[-29],R[11]C[-38],R[11]C[-28],R[11]C[-37],R[11]C[-27],R[11]C[-36],R[11]C[-26],R[11]C[-35],R[11]C[-25],R[11]C[-34],R[11]C[-24])"
    ActiveWindow.SmallScroll ToRight:=5
    Range("CE6").Select
    Selection.AutoFill Destination:=Range("CE6:CF6"), Type:=xlFillDefault
    Range("CE6:CF6").Select
    Range("CF6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q2q1(RC[-12],R[11]C[-40],R[11]C[-30],R[11]C[-39],R[11]C[-29],R[11]C[-38],R[11]C[-28],R[11]C[-37],R[11]C[-27],R[11]C[-36],R[11]C[-26],R[11]C[-35],R[11]C[-25])"
    Range("CF6").Select
    ActiveCell.FormulaR1C1 = _
        "=Q3q1(RC[-12],R[11]C[-40],R[11]C[-30],R[11]C[-39],R[11]C[-29],R[11]C[-38],R[11]C[-28],R[11]C[-37],R[11]C[-27],R[11]C[-36],R[11]C[-26],R[11]C[-35],R[11]C[-25])"
    ActiveWindow.SmallScroll ToRight:=-4
    ActiveWorkbook.SaveAs Filename:= _
        "C:\Users\Owner\Desktop\Body Bending\FLEXIT.xls", FileFormat:=xlNormal, _
        Password:="", WriteResPassword:="", ReadOnlyRecommended:=False, _
        CreateBackup:=False
    ActiveWindow.SmallScroll ToRight:=1
    Range("BX8").Select
    ActiveCell.FormulaR1C1 = "0"
    Range("BX9").Select
    ActiveCell.FormulaR1C1 = "=R[-1]C+0.02"
    Selection.AutoFill Destination:=Range("BX9:BX40"), Type:=xlFillDefault
    Range("BX9:BX40").Select
    ActiveWindow.SmallScroll Down:=12
    Selection.AutoFill Destination:=Range("BX9:BX54"), Type:=xlFillDefault
    Range("BX9:BX54").Select
    ActiveWindow.SmallScroll Down:=10
    Selection.AutoFill Destination:=Range("BX9:BX61"), Type:=xlFillDefault
    Range("BX9:BX61").Select
    Range("BX59:BX61").Select
    Selection.ClearContents
    Range("BZ62").Select
    ActiveWindow.SmallScroll Down:=-22
    Range("CC8").Select
    ActiveCell.FormulaR1C1 = "=RC[-5]"
    Range("CC8").Select
    Selection.AutoFill Destination:=Range("CC8:CC58"), Type:=xlFillDefault
    Range("CC8:CC58").Select
    Range("CD59").Select
    ActiveWindow.SmallScroll Down:=-18
    ActiveWindow.SmallScroll ToRight:=4
    Range("CH8").Select
    ActiveCell.FormulaR1C1 = "=RC[-10]"
    Range("CH8").Select
    Selection.AutoFill Destination:=Range("CH8:CH58"), Type:=xlFillDefault
    Range("CH8:CH58").Select
    Range("CI57").Select
    ActiveWindow.SmallScroll Down:=-15
    ActiveWorkbook.Save
End Sub
-------------------------------------------------------------------------------
VBA MACRO Module3.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/FLEXIT(Aries).xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Module3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function q2q1(omegan As Double, j11ma As Double, j11st As Double, j12ma As Double, j12st As Double, j13ma As Double, j13st As Double, j21ma As Double, j21st As Double, j22ma As Double, j22st As Double, j23ma As Double, j23st As Double)
' find A's
a11 = j11ma * omegan ^ 2 - j11st
a12 = j12ma * omegan ^ 2 - j12st
a13 = j13ma * omegan ^ 2 - l13st
a21 = j21ma * omegan ^ 2 - j21st
a22 = j22ma * omegan ^ 2 - j22st
a23 = j23ma * omegan ^ 2 - j23st
'  find q2/q1
numer = a23 * a11 - a21 * a13
denom = a22 * a13 - a23 * a12
q2q1 = numer / denom
End Function

Function q3q1(omegan As Double, j11ma As Double, j11st As Double, j12ma As Double, j12st As Double, j13ma As Double, j13st As Double, j21ma As Double, j21st As Double, j22ma As Double, j22st As Double, j23ma As Double, j23st As Double)
' find A's
a11 = j11ma * omegan ^ 2 - j11st
a12 = j12ma * omegan ^ 2 - j12st
a13 = j13ma * omegan ^ 2 - l13st
a21 = j21ma * omegan ^ 2 - j21st
a22 = j22ma * omegan ^ 2 - j22st
a23 = j23ma * omegan ^ 2 - j23st
'  find q3/q1
numer = a12 * a21 - a11 * a22
denom = a22 * a13 - a23 * a12
q3q1 = numer / denom
End Function
-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet

