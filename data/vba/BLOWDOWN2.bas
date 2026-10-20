olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet3.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO linearinterp.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/linearinterp'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function linearintrp(table As Range, xval As Double, column1 As Long)
nrow = table.Rows.Count
ncol = table.Columns.Count
ReDim xtl(1 To nrow) As Variant
Dim upperval As Long
Dim lowerval As Long
   For i = 1 To nrow
   xtl(i) = table(i, 1)
   Next i
lowerval = WorksheetFunction.Match(xval, xtl, 1)
upperval = lowerval + 1
y1 = table(lowerval, column1)
y2 = table(upperval, column1)
x1 = table(lowerval, 1)
x2 = table(upperval, 1)
linearintrp = y1 + (y2 - y1) * (xval - x1) / (x2 - x1)
End Function
'This function has been debugged
-------------------------------------------------------------------------------
VBA MACRO ThroatMach.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThroatMach'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function MachThroat(gamma As Double, pex As Double, pC As Double)

Dim SonicPratio As Double
Dim Pratio As Double
If (pC >= pex) Then
Pratio = pC / pex
Else
Pratio = pex / pC
End If
SonicPratio = (2 / (gamma + 1)) ^ (gamma / (gamma - 1))
If (Pratio <= SonicPratio) Then
MachThroat = 1
Else
MachThroat = ((2 / (gamma - 1)) * ((Pratio) ^ ((gamma - 1) / gamma) - 1)) ^ (1 / 2)
End If
End Function
 

-------------------------------------------------------------------------------
VBA MACRO Altitude.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Altitude'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function hALT1(table As Range, xval As Double, column1 As Long)
hALT1 = linearintrp(table, xval, column1)
End Function
'This Functionhas been debugged

-------------------------------------------------------------------------------
VBA MACRO Velocity.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Velocity'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function Veloc(table As Range, xval As Double, column1 As Long)
Veloc = linearintrp(table, xval, column1)
End Function
'This function has been debugged

-------------------------------------------------------------------------------
VBA MACRO dpCdtyme.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/dpCdtyme'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function DPDT(CONSTANT As Double, CNOZ As Double, MT As Double, gamma As Double, pC As Double, pex As Double)
If (pC > pex) Then
DPDT = CONSTANT * CNOZ * MT * (1 + ((gamma - 1) / 2) * MT ^ 2) ^ (-(gamma + 1) / (2 * (gamma - 1))) * pC ^ ((3 * gamma - 1) / (2 * gamma))
Else
DPDT = -CONSTANT * CNOZ * MT * (1 + ((gamma - 1) / 2) * MT ^ 2) ^ (-(gamma + 1) / (2 * (gamma - 1))) * pC ^ ((3 * gamma - 1) / (2 * gamma))
End If
End Function
-------------------------------------------------------------------------------
VBA MACRO freeMach.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/freeMach'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function Mch(Vel As Double, Temp As Double, Rair As Double, gamma As Double)
Mch = Vel / (gamma * Rair * Temp) ^ (1 / 2)
End Function
'This function has been debugged
-------------------------------------------------------------------------------
VBA MACRO quadAltitude.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/quadAltitude'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function quadinterp(table As Range, xval As Double, column1 As Long, column2 As Long)
nrow = table.Rows.Count
ncol = table.Columns.Count
ReDim xtl(1 To nrow) As Variant
Dim upperval As Long
Dim lowerval As Long
   For i = 1 To nrow
   xtl(i) = table(i, 1)
   Next i
lowerval = WorksheetFunction.Match(xval, xtl, 1)
upperval = lowerval + 1
h1 = table(lowerval, column1)
h2 = table(upperval, column1)
x1 = table(lowerval, 1)
x2 = table(upperval, 1)
v1 = table(lowerval, column2)
v2 = table(upperval, column2)
a = (v2 ^ 2 - v1 ^ 2) / (2 * (h2 - h1))
Hbias = h1 + v1 * (x2 - x1) + 0.5 * a * (x2 - x1) ^ 2
deltah = h2 - Hbias
quadinterp = h1 + (v1 + deltah) * (xval - x1) + 0.5 * a * (xval - x1) ^ 2
End Function
-------------------------------------------------------------------------------
VBA MACRO EXtpresscoef.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/EXtpresscoef'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function Cpex(Cp0 As Double, Mach As Double, Mcr As Double, table As Range)
If (Mach < Mcr) Then
'Karman-Tsien subsonic pressure correction)
beta = (1 - Mach ^ 2) ^ (1 / 2)
Cpex = Cp0 / (beta + (Cp0 / 2) * (1 - beta))
Else
Cpex = linearintrp(table, Mach, 2)
End If
End Function
'This function has been debugged
-------------------------------------------------------------------------------
VBA MACRO SfcPress.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SfcPress'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function pex(pa As Double, Mach As Double, gamma As Double, Cpex As Double)
qDYNP = gamma * pa * Mach ^ 2 / 2
pex = pa + qDYNP * Cpex
End Function
-------------------------------------------------------------------------------
VBA MACRO OrifCoef.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/OrifCoef'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function CN(MachThroat As Double, CSON As Double, CINC As Double)
Dim beta As Double
'This function uses Busemann's hodograph solution for a subsonic slit to interpolate for the subsonic orifice coefficient
  If MachThroat < 1 Then
  beta = (1 - MachThroat ^ 2) ^ (1 / 2)
  CN = CSON / (1 + beta * ((CSON / CINC) - 1))
  Else
  CN = CSON
  End If
End Function
-------------------------------------------------------------------------------
VBA MACRO Module1.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BLOWDOWN2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Module1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Sub rhs()
Dim a As Double
Dim table As Range
'must use the commnd set before table can be used
a = 20
'puts a value to cell a2 on the main worksheet
Blowdown.Cells(2, 1) = a
Set table = Blowdown.Range("g13:i33")
hALT1 = hALT(table, 2, 2)
Blowdown.Cells(2, 3) = hALT1
End Sub

-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     16 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Blowdow
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet

