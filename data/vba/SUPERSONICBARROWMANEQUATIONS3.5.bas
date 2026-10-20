olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'############################# Welcome Screen ###########################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        Supersonic Barrowman Equation                       #
'#  Module name     ThisWorkbook                                        #
'#  Version         3.3                                                 #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################
Private Sub Workbook_Open()
    'MsgBox "Supersonic Barrowman Equation 3.3" & vbCrLf & "Developed by: Charley Hoult, Armando Fuentes, Hien Tran" _
    & vbCrLf & "Text Instructions here"
    
    UserForm1.Show
        
End Sub
-------------------------------------------------------------------------------
VBA MACRO tableinput.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/tableinput'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Module3.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Module3'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function delta1(Deltap As Double, wavetype As String)


End Function

-------------------------------------------------------------------------------
VBA MACRO Aerodynamicloading.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Aerodynamicloading'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function DeltaL(tcol As Range, P2 As Double, P1 As Double, epsilon As Double, wavetype As String, M1 As Double, gamma As Double, eta As Double, delta As Double, cnalpha0 As Double, l1 As Double, l2 As Double, delta1 As Double)

valcheck = locrow(tcol)
mu = WorksheetFunction.Asin(1 / M1)

If wavetype = "Expansion" And valcheck = 0 Then

DeltaL = (1 - Exp(-eta)) * Tan(Abs(delta)) * cnalpha0 + (l2 / l1) * Exp(-eta) * delta1

ElseIf wavetype = "Expansion" And valcheck > 0 Then

Machu = SupersonicCalculations.Cells(valcheck + 15, 12)
Deltau1 = SupersonicCalculations.Cells(valcheck + 15, 47)
deltau = SupersonicCalculations.Cells(valcheck + 14, 7)
deltad = SupersonicCalculations.Cells(valcheck + 15, 7)
pd = SupersonicCalculations.Cells(valcheck + 15, 21)
Pinf = SupersonicCalculations.Cells(2, 7)
sigma = TBM(M1, Abs(epsilon), gamma, 0)
Top = ((gamma + 1) * Tan(deltad - deltau) * Cos(sigma - deltau) - Sin(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2 + Sin(sigma - deltau)
Bottom = 1 + (1 - 2 * ((Sin(sigma - deltau)) ^ 2) + 2 * Tan(deltad - deltau) * Sin(sigma - deltau) * Cos(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2
F = (4 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M1 ^ 2) * Sin(sigma - deltau) * Top / Bottom
ta1 = ((Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2) - 1) ^ 2
ta2 = ((gamma - 1) * (Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2) + 2) * (Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2)
G = (F / (pd / Pinf)) * ta1 / ta2
DeltaL = (1 - Exp(-eta)) * Tan(delta) * cnalpha0 + (l2 / l1) * Exp(-eta) * delta1 + (P2 / Pinf - l2 / l1 * P1 / Pinf) * G * deltau


ElseIf wavetype = "Compression" Then
'when convex
sigma = TBM(M1, Abs(epsilon), gamma, 0)
Top = ((gamma + 1) * Tan(deltad - deltau) * Cos(sigma - deltau) - Sin(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2 + Sin(sigma - deltau)
Bottom = 1 + (1 - 2 * ((Sin(sigma - deltau)) ^ 2) + 2 * Tan(deltad - deltau) * Sin(sigma - deltau) * Cos(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2
F = (4 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M1 ^ 2) * Sin(sigma - deltau) * Top / Bottom
Deltau1 = delta1
pd = P2
pu = P1
DeltaL = (1 - Exp(-eta)) * Tan(delta) * cnalpha0 + (pd / pu - F) * Exp(-eta) * Deltau1

ElseIf wavetype = "No change" And valcheck > 0 Then

Machu = SupersonicCalculations.Cells(valcheck + 15, 12)
Deltau1 = SupersonicCalculations.Cells(valcheck + 15, 47)
deltau = SupersonicCalculations.Cells(valcheck + 14, 7)
deltad = SupersonicCalculations.Cells(valcheck + 15, 7)
pd = SupersonicCalculations.Cells(valcheck + 15, 21)
Pinf = SupersonicCalculations.Cells(2, 7)
sigma = TBM(M1, Abs(epsilon), gamma, 0)
Top = ((gamma + 1) * Tan(deltad - deltau) * Cos(sigma - deltau) - Sin(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2 + Sin(sigma - deltau)
Bottom = 1 + (1 - 2 * ((Sin(sigma - deltau)) ^ 2) + 2 * Tan(deltad - deltau) * Sin(sigma - deltau) * Cos(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2
F = (4 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M1 ^ 2) * Sin(sigma - deltau) * Top / Bottom
ta1 = ((Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2) - 1) ^ 2
ta2 = ((gamma - 1) * (Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2) + 2) * (Machu ^ 2) * ((Sin(sigma - deltau)) ^ 2)
G = (F / (pd / Pinf)) * ta1 / ta2
DeltaL = (1 - Exp(-eta)) * Tan(delta) * cnalpha0 + (l2 / l1) * Exp(-eta) * delta1 + (P2 / Pinf - l2 / l1 * P1 / Pinf) * G * deltau


Else
DeltaL = (1 - Exp(-eta)) * Tan(delta) * cnalpha0 + (l2 / l1) * Exp(-eta) * delta1

End If


End Function
-------------------------------------------------------------------------------
VBA MACRO SupersonicCalculations.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SupersonicCalculations'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'##################### SupersonicCalculations(SupersonicCalulations) ####################
'#                            == Do not remove this notice ==                           #
'#--------------------------------------------------------------------------------------#
'#  Program:        Supersonic Barrowman Equation                                       #
'#  Module name     SupersonicCalculations(SupersonicCalulations)                       #
'#  Version         3.3                                                                 #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran                           #
'#--------------------------------------------------------------------------------------#
'#                                                                                      #
'# <Info>                                                                               #
'#                                                                                      #
'#                                                                                      #
'#                                                                                      #
'# <Changes in v3.3>                                                                    #
'# (5-13-2013)                                                                          #
'# - Edit the error function to support older excel (2003)                              #
'# - Table lookup for M1 for Hemispherical Cap                                          #
'# - Add or edit cells comments                                                         #
'#                                                                                      #
'# (5-8-2013)                                                                           #
'# - Add detection for compression corner downstream                                    #
'# - Implement Slender Body Theory for detached Shockwave downstream                    #
'# - Fix hemisphere to nose cone problem                                                #
'# - Fix CDw solution for flat-plate                                                    #
'#                                                                                      #
'# (5-1-2013)                                                                           #
'# - Add Hemispherical Cap warning                                                      #
'# - Implement Slender Body Theory for detached Shockwave for nose cone                 #
'# - Add segment Center of Pressure aft of nose tip                                     #
'# - Edit nose cone warning for detached Shockwave                                      #
'#                                                                                      #
'# (before 4-14-2013)                                                                   #
'# - rename the Lowsupersonic Barrowman Equation3.2 to Supersonic Barrowman Equation3.3 #
'# - support most supersonic regime with few limitations.                               #
'# - add supersonic leading edges for normal force and center of pressure.              #
'# - add supersonic single wedge airfoil.                                               #
'# - fix minor bug for fin interference.                                                #
'# - add limitation table, illustrations figures, and summary table.                    #
'# - design warning popup.                                                              #
'# - welcome window and tips window.                                                    #
'# - add hints in cell comment.                                                         #
'# - add comments in the codes.                                                         #
'# - format code layout.                                                                #
'# - add change logs SupersonicCalculations(SupersonicCalculations).                    #
'#                                                                                      #
'########################################################################################

'Option Explicit

Private Sub Worksheet_Change(ByVal Target As Range)
Select Case Target.Address
    Case "$A$2"
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MinimumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MaximumScale = ActiveSheet.Range("R10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MinimumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MaximumScale = ActiveSheet.Range("V10").Value

        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MinimumScale = ActiveSheet.Range("M9").Value
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MaximumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MinimumScale = ActiveSheet.Range("M9").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MaximumScale = ActiveSheet.Range("M10").Value
    Case "$D$6"
        MachInfChecker = ActiveSheet.Range("D6").Value 'Mach Infinity
        If MachInfChecker <= 1 Then
            MsgBox "Mach No. need to be greater than 1" & vbCrLf & "EXIT Calculation", vbExclamation
            Exit Sub
        Else
            GoTo 1
        End If
            
    Case Else
1:
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MinimumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MaximumScale = ActiveSheet.Range("R10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MinimumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlCategory) _
            .MaximumScale = ActiveSheet.Range("V10").Value
            
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MinimumScale = ActiveSheet.Range("M9").Value
        ActiveSheet.ChartObjects("1st Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MaximumScale = ActiveSheet.Range("M10").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MinimumScale = ActiveSheet.Range("M9").Value
        ActiveSheet.ChartObjects("2nd Stage Fin Model Chart").Chart.Axes(xlValue) _
            .MaximumScale = ActiveSheet.Range("M10").Value
            
        MachInfChecker = ActiveSheet.Range("D6").Value 'Mach Infinity
        ConeHalfAngle = ActiveSheet.Range("G15").Value 'Cone Half Angle Checker for Supersonic flow, rad
        MaxConeAngleSCSF = ActiveSheet.Range("B10").Value 'Maximum Cone Half Angle for Supersonic Cone Surface Flow, rad
        MinM_SubSonicTP1 = ActiveSheet.Range("C10").Value 'Minimum Mach No. Subsonic Tip Interference 1st stage
        MaxM_SubSonicLE1 = ActiveSheet.Range("D10").Value 'Maximum Mach No. Subsonic Leading Edge 1st stage
        MinM_SupersonicLE1 = ActiveSheet.Range("E10").Value 'Minimum Mach No. Supersonic Tip Interference 1st stage
        MinM_TISubSonic2 = ActiveSheet.Range("F10").Value 'Minimum Mach No. Subsonic Tip Interference 2nd stage
        MaxM_SubSonicLE2 = ActiveSheet.Range("G10").Value 'Maximum Mach No. Subsonic Leading Edge 2nd stage
        MinM_SupersonicLE2 = ActiveSheet.Range("H10").Value 'Minimum Mach No. Supersonic Tip Interference 2nd stage
        StageNoChecker = ActiveSheet.Range("B64").Value 'Number of Stage, 1 or 2
        
        WedgeAngle1 = ActiveSheet.Range("J64").Value 'Wedge Angle Checker for Supersonic flow, rad
        WedgeAngle2 = ActiveSheet.Range("J67").Value 'Wedge Angle Checker for Supersonic flow, rad
        MaxWedgeAngle = ActiveSheet.Range("I10").Value 'Maximum allow Wedge Angle for fin Supersonic Surface Flow, rad
        
                        
        If ConeHalfAngle >= MaxConeAngleSCSF Then
            MsgBox "Detached Shockwave at nose tip: Slender Body Theory is applied.", vbExclamation
        End If
        
        If WedgeAngle1 >= MaxWedgeAngle Then
            MsgBox "The wedge angle design for stage 1 is inapplicable.", vbExclamation
        End If
        
        If StageNoChecker > 1 Then
            If WedgeAngle2 >= MaxWedgeAngle Then
                MsgBox "The wedge angle design for stage 2 is inapplicable.", vbExclamation
            End If
        End If
        
        If MachInfChecker < MinM_SubSonicTP1 Then
            MsgBox "The fin design is inapplicable. Check Fig.1", vbExclamation
        Else
            If MachInfChecker > MaxM_SubSonicLE1 And MachInfChecker < MinM_SupersonicLE1 Then
                MsgBox "The fin design is inapplicable. Check Fig.1", vbExclamation
            End If
        End If
        If StageNoChecker > 1 Then
            If MachInfChecker < MinM_SubSonicTP2 Then
            MsgBox "The fin design for second stage is inapplicable. Check Fig.2", vbExclamation
            Else
                If MachInfChecker > MaxM_SubSonicLE2 And MachInfChecker < MinM_SupersonicLE2 Then
                    MsgBox "The fin design for second stage is inapplicable. Check Fig.2", vbExclamation
                End If
            End If
        End If
        
End Select
End Sub



-------------------------------------------------------------------------------
VBA MACRO interpolationfunction.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/interpolationfunction'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'Option Explicit

Function BILINTERP(Table As Range, dCol As Double, dRow As Double) As Double
    ' Returns the bilinear interpolation of Table using dCol and dRow
    
    ' Table must be in ascending order left to right by the first row,
    '    and top to bottom by the first column
    'Dim Table As Range
    
    
    Dim nRow As Long, nCol As Long  ' dimensions of table
    Dim lRow1 As Long, lRow2 As Long 'bounding rows
    Dim lCol1 As Long, lCol2 As Long ' bounding columns
    Dim rf As Double, cf As Double  ' row and column fractions, 0..1
    Dim sL As Double, sR As Double  ' column header values flanking dCol
    Dim sT As Double, sB As Double  ' row header values flanking dRow
    
    ' four corner table values flanking dCol, dRow
    Dim sTL As Double, sTR As Double, sBR As Double, sBL As Double
    
    'Table = Table1
    
    nRow = Table.Rows.Count
    nCol = Table.Columns.Count
    
    ' Table must be at least 3x3 including header row and column
    'If nRow < 3 Or nCol < 3 Then GoTo BadTable
    
    ' value to be interpolated must lie within row and column data
    'If dCol < Table(1, 2) Then GoTo BadData
    'If dCol > Table(1, nCol) Then GoTo BadData
    'If dRow < Table(2, 1) Then GoTo BadData
    'If dRow > Table(nRow, 1) Then GoTo BadData
    
    lCol1 = Application.Match(dCol, Table(1, 2).Resize(, nCol - 1)) + 1
    sL = Table(1, lCol1)
    If dCol = sL Then
        lCol2 = lCol1
        sR = sL
        cf = 0#
    Else
        lCol2 = lCol1 + 1
        sR = Table(1, lCol2)
        cf = (dCol - sL) / (sR - sL)  ' column fraction
    End If
    
    lRow1 = Application.Match(dRow, Table(2, 1).Resize(nRow - 1)) + 1
    sT = Table(lRow1, 1)
    If dRow = sT Then
        lRow2 = lRow1
        sT = sB
        rf = 0#
    Else
        lRow2 = lRow1 + 1
        sB = Table(lRow2, 1)
        rf = (dRow - sT) / (sB - sT)
    End If
    
    sTL = Table(lRow1, lCol1)
    sTR = Table(lRow1, lCol2)
    sBR = Table(lRow2, lCol2)
    sBL = Table(lRow2, lCol1)
    
    ' Compute the weighted sum of four locations in Table
    BILINTERP = sTL * (1 - rf) * (1 - cf) _
              + sTR * (1 - rf) * cf _
              + sBR * rf * cf _
              + sBL * rf * (1 - cf)
    
   ' Exit Function

'BadTable:
 '   BILINTERP = "Table must be at least 3x3"
  '  Exit Function
'BadData:
 '   BILINTERP = "Value not within table extents"
  '  Exit Function
End Function

-------------------------------------------------------------------------------
VBA MACRO momentcoeff.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/momentcoeff'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function cmalpha1(x2 As Double, x3 As Double, r2 As Double, r3 As Double, delta As Double, Pcone As Double, P2 As Double, eta As Double, dpds2 As Double, lambda1 As Double, lambda2 As Double, l1 As Double, dcnalpha0 As Double, Ab As Double, d As Double)


'x3=x1, xi+1=xi-1
pival = 3.14159265
M = (r3 - r2) / (x3 - x2)

If x2 = 0 Then

term = (1 / 3) * (x3 ^ 3 - x2 ^ 3) * M + 0.5 * (M * x2 + r2) * (x2 ^ 2 - x3 ^ 2)
Else

nx = dpds2 * (1 / ((Pcone - P2) * Cos(delta)))
Q = Tan(delta) * dcnalpha0

If lambda1 = 0 Then
W = 1
Else
W = (lambda2 / lambda1) * l1
End If

k1 = -M * Q + M * W
k2 = (M * x2 - r2) * (Q - W)
k3 = Q * (M * x2 - r2)
k4 = M * Q

If nx = 0 Then
term = 0
Else
term = (k4 / 3) * (x3 ^ 3 - x2 ^ 3) - (k3 / 2) * (x3 ^ 2 - x2 ^ 2) + k2 * ((-x3 / nx) * Exp(-eta) - (1 / nx ^ 2) * Exp(-eta) + x2 / nx + 1 / nx ^ 2) + k1 * (((-x3 ^ 2) / nx) * Exp(-eta) - (2 / nx) * ((x3 / nx) * Exp(-eta) + (1 / nx ^ 2) * Exp(-eta)) + (x2 ^ 2) / nx + (2 / nx) * (x2 / nx + 1 / nx ^ 2))
End If

End If

cmalpha1 = (-2 * pival / (Ab * d)) * term

End Function


-------------------------------------------------------------------------------
VBA MACRO Chart2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Chart2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO noseeqn.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/noseeqn'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function noseconetype(x As Variant, L As Double, R As Double, l2 As Double, r2 As Double, conevar As Integer)

Dim pi As Double

pi = 3.1415
'1 is for ogive
'2 is for haack series with C=0 von karman
'3 is for user defined

        If conevar = 1 Then
        
        noseconetype = ogive(L, 2 * R, x)
        
        ElseIf conevar = 2 Then
        
        noseconetype = haackseries(pi, R, x, L, 0)
        
        End If


End Function


-------------------------------------------------------------------------------
VBA MACRO Chart1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Chart1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO a_MostofFunction.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/a_MostofFunction'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function B(gamma As Double, M As Double, p As Double)
'betafunction

B = gamma * p * (M ^ 2) / (2 * ((M ^ 2) - 1))

End Function

Function deltaeqn(x1 As Variant, x2 As Variant, y1 As Variant, y2 As Variant)
'deltafunction
deltaeqn = Atn((y2 - y1) / (x2 - x1))

End Function

Function d2_d1(Mach As Double, gamma As Double) As Double
'density_ratio
d2_d1 = ((gamma + 1) * Mach ^ 2) / 2 + (gamma - 1) * Mach ^ 2

End Function

Function dpds1cap(P1 As Double, Mach1 As Double, cpt As Double, thetaM As Double, R As Double, gamma As Double)
'dpds1forcapelement
dpds1cap = -(0.5 * gamma * P1 * Mach1 ^ 2) * cpt * Sin(thetaM) * Cos(thetaM) / R
'dpds1cap = (gamma * p1 * Mach1 ^ 2) * cpt * Cos(thetaM) / R

End Function

Function dpds3(Pcone As Double, P2 As Double, P3 As Double, dpds2 As Double)
'dpdsfunc
dpds3 = ((Pcone - P3) / (Pcone - P2)) * dpds2

End Function

Function Machfinder(p2p3 As Double, M2 As Double, gamma As Double)
'eqntofindmachno
k1 = (p2p3 * (1 + (gamma - 1) / 2 * M2 ^ 2) ^ (gamma / (gamma - 1))) ^ ((gamma - 1) / gamma)
k2 = (k1 - 1) * 2 / (gamma - 1)
Machfinder = k2 ^ (1 / 2)

End Function

Function eta(dpds2 As Double, Pcone As Double, P2 As Double, delta2 As Double, x2 As Double, x As Double)
'etafunction
If Pcone = P2 Then
eta = 1
Else

eta = dpds2 * (x - x2) / ((Pcone - P2) * Cos(delta2))
End If

End Function

Function locrow(tcol As Range)
'Fnrofindlastcompression
nRow = tcol.Rows.Count
Dim counter1 As Variant
Dim count2 As Integer
count2 = 0

For i = 1 To nRow


If tcol(i) = "Compression" Then
counter1 = i
count2 = 1
ElseIf count2 = 1 Then
counter1 = 0
count2 = 0

End If

Next i

locrow = counter1
End Function

Function haackseries(pi As Double, R As Double, x As Variant, L As Double, C As Double)
'haack
alpha = WorksheetFunction.Acos(1 - (2 * x / L))

haackseries = (R * (alpha - (Sin(2 * alpha) / 2) + C * (Sin(alpha)) ^ 3)) ^ (1 / 2) / (pi) ^ (1 / 2)

'C = 1/3 for LV-haack and C = 0 for LD-haack (Von Karman)

End Function

Function M2oblique(M1 As Double, defangle As Double, gamma As Double)
'M2findobliquerelations
defangle = Abs(defangle)
sigma = TBM(M1, (defangle), gamma, 0)
a = 1 / Sin(sigma - defangle)
bt = 1 + ((gamma - 1) / 2) * (M1 ^ 2) * (Sin(sigma)) ^ 2
bu = gamma * (M1 ^ 2) * ((Sin(sigma)) ^ 2) - (gamma - 1) / 2
M2oblique = a * (bt / bu) ^ (1 / 2)
End Function

Function M1cap(P1 As Double, pt As Double, gamma As Double)
'Mach1forcapeqn

M1cap = ((((P1 / pt) ^ (-(gamma - 1) / gamma)) - 1) * 2 / (gamma - 1)) ^ (1 / 2)

End Function

Function epsilonangle(delta1 As Double, delta2 As Double)
'epsilonangle
'delta1 is from previous element
'delta2 is angle of current element

'If delta1 >= delta2 Then
epsilonangle = WorksheetFunction.RoundDown((delta1 - delta2), 6)
'Else
'epsilonangle = delta2 - delta1
'End If

End Function

Function p1p2oblique(M1 As Double, defangle As Double, gamma As Double)
'p1p2oblique

defangle = Abs(defangle)
sigma = TBM(M1, (defangle), gamma, 0)
prat = 1 + (2 * gamma / (gamma + 1)) * ((M1 ^ 2) * ((Sin(sigma)) ^ 2) - 1)
p1p2oblique = 1 / prat

End Function

Function findnu2(epsilon As Double, nu1 As Double, delta1 As Double, M1 As Double, ds As Double, r1 As Double)
'nu2findeqn
term = (((M1 ^ 2) - 1) ^ (1 / 2))
aa2 = (Cos(delta1) / (2 * r1 * term))
bb2 = term * (Tan(delta1)) - 1
findnu2 = nu1 + epsilon - (aa2 * bb2 * ds * epsilon)

End Function

Function dnu(M As Double, gamma As Double)
'nu derivative
Dim a As Double

a = (gamma + 1) / (gamma - 1)

dnu = (M / (M ^ 2 - 1)) * ((1 + a ^ -2 * (M ^ 2 - 1)) ^ -1 - M ^ -2)

End Function

Function ogive(L As Double, d As Double, x As Variant)
'ogiveprofile
R = d / 2
rho = (R ^ 2 + L ^ 2) / (2 * R)
ogive = (rho ^ 2 - (L - x) ^ 2) ^ (1 / 2) + R - rho
End Function

Function nu(Mach As Double, gamma As Double)
'prandtlmayerfunction
Dim aa1 As Double
Dim bb1 As Double
Dim cc1 As Double

aa1 = (gamma + 1) / (gamma - 1)
bb1 = ((gamma - 1) / (gamma + 1) * (Mach ^ (2) - 1))
cc1 = (Mach ^ (2) - 1)

nu = (aa1) ^ (1 / 2) * Atn(bb1 ^ (1 / 2)) - Atn((cc1) ^ (1 / 2))

End Function

Function p1cap(cpt As Double, Mach1 As Double, P1 As Double, thetaM As Double, gamma As Double)
'pressureforcap

p1cap = P1 + (0.5 * gamma * P1 * Mach1 ^ 2) * cpt * (Cos(thetaM)) ^ 2

End Function

Function Pmainval(Pcone As Double, P2 As Double, eta As Double)
'pressurepapereqn
Pmainval = Pcone - (Pcone - P2) * Exp(-eta)

End Function

Function p1p2(Mach1 As Double, Mach2 As Double, gamma As Double)
'ratioofpressures

p1p2 = ((1 + ((gamma - 1) / 2) * (Mach2 ^ 2)) / (1 + ((gamma - 1) / 2) * (Mach1 ^ 2))) ^ (gamma / (gamma - 1))

'p2p1 = 1 / p1p2

End Function


Function ptotalratio(Mach1 As Double, gamma As Double)
'ratiototalpresure
'Dim a11 As Double
'Dim a22 As Double

a11 = ((1 / 2) * (gamma + 1) * Mach1 ^ 2) ^ (gamma / (gamma - 1))
Bottom = (2 * gamma * Mach1 ^ 2 - (gamma - 1))
Top = (gamma + 1)
a22 = (Top / Bottom) ^ (1 / (gamma - 1))

ptotalratio = a11 * a22

End Function

Function cpt(MInf As Double, ptpinf As Double, gamma As Double)
'totalpressurecoefficient
cpt = (ptpinf - 1) / (0.5 * gamma * MInf ^ 2)

End Function

Function efunc(e0 As Variant, e1 As Variant)
'turnangleepsilon
efunc = e0 - e1

End Function

Function omega(M As Double, gamma As Double)
'Womega
Dim aval As Double
Dim bval As Double
Dim cval As Double

aval = 1 + M ^ 2 * ((gamma - 1) / 2)
bval = (gamma + 1) / 2
cval = (gamma + 1) / (2 * (gamma - 1))
omega = (1 / M) * (aval / bval) ^ cval

End Function
-------------------------------------------------------------------------------
VBA MACRO drageqn.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/drageqn'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function drag(x2 As Double, x3 As Double, r2 As Double, r3 As Double, delta As Double, Pcone As Double, P2 As Double, eta As Double, dpds2 As Double)

Dim pival As Double
Dim M As Double
Dim delta_x As Double
Dim k As Double
Dim delta_P As Double
Dim L As Double
Dim term_1 As Double
Dim term_2 As Double
Dim term_3 As Double
Dim term_4 As Double
Dim term_5 As Double
Dim rmax As Double
Dim qinf As Double
Pinf = SupersonicCalculations.Range("G2")
qinf = SupersonicCalculations.Range("g8")
rmax = SupersonicCalculations.Range("d5")
pival = 3.1415927

M = (r3 - r2) / (x3 - x2)

delta_x = x3 - x2
Pk = Pcone - P2
'W = dpds2 * (1 / (Pk * Cos(delta)))
rk = r2 - M * x2
'k = 2 * pival * (1 + M ^ 2) ^ 0.5 * Sin(delta)



'term_1 = (M / 2) * (x3 ^ 2 - x2 ^ 2)

'term_2 = M * x2 * delta_x

'term_3 = -r2 * delta_x

'Left_Side = Pcone * (term_1 - term_2 - term_3)



If x2 = 0 Then

'drag = (2 * M * (Pcone) / (qinf * rmax ^ 2)) * (0.5 * M * (x3 - x2) ^ 2 + r2 * x3 - r2 * x2)

drag = (2 * M * (Pcone - Pinf) / (qinf * rmax ^ 2)) * (0.5 * M * (x3 - x2) ^ 2 + r2 * x3 - r2 * x2) 'includes Pinf

'drag = 2 * pival * ((1 + M ^ 2) ^ (1 / 2)) * Sin(delta) * Pcone * (0.5 * M * (x3 ^ 2 - x2 ^ 2) - (r2 - M * x2) * (x3 - x2)) using first method
'


Else

'delta_P = Pcone - P2

W = dpds2 * (1 / (Pk * Cos(delta)))

    If W = 0 Then
    drag = 0
    Else

coeff0 = M * Pinf * (r2 * x3 + 0.5 * M * (x3 - x2) ^ 2 - r2 * x2) 'one due to Pinf, unsure if it must be included
'coeff0 = 0
coeff1 = Pcone * (rk * x3 + 0.5 * M * x3 ^ 2)
coeff2 = Pk * Exp(-W * (x3 - x2)) * (rk / W + ((M / W ^ 2)) * (1 + W * x3))
coeff3 = Pcone * (rk * x2 + 0.5 * M * x2 ^ 2)
coeff4 = Pk * (rk / W + ((M / W ^ 2)) * (1 + W * x2))

drag = (2 / (qinf * rmax ^ 2)) * (M * (coeff1 + coeff2 - coeff3 - coeff4) - coeff0)

'term_4 = (-M / L) * delta_x * Exp(-eta) - (1 / L ^ 2) * Exp(-eta) from previous method

'term_5 = (-M / L ^ 2) - (r2 / L)

'drag = k * (Left_Side - delta_P * (term_4 - term_5))

End If
End If
End Function

-------------------------------------------------------------------------------
VBA MACRO Z_SuperFinFunction.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Z_SuperFinFunction'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'####################### Supersonic Fin Functions #######################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        Supersonic Barrowman Equation                       #
'#  Module name     Z_SuperFinFunction                                  #
'#  Version         3.3                                                 #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################

Function LEsweepangle(cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'LE Sweep Angle, rad
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
LEsweepangle = Atn((cr - ct) / xB)

End Function

Function Finarea(cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Fin Area, in
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
Finarea = xB * (cr + ct) / 2

End Function

Function FAMomentCRLE(cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Fin Area Moment about Root Chord Leading Edge, in^3
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
FAMomentCRLE = xB * (2 * cr ^ 2 + 2 * cr * ct - ct ^ 2) / 6

End Function

Function minMangle(cr As Double, xB As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Min. Mach Angle, rad
'cr root chord, in
'xB exposedSemispan, in
minMangle = Atn(xB / cr)

End Function

Function minMnum(mMangle As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Min. Mach number
'mMangle Min. Mach Angle, rad
minMnum = 1 / Sin(mMangle)

End Function

Function minManglenoregIV(cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Min. Mach Angle(no Reg.IV), rad
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
minManglenoregIV = Atn(xB / (cr + ct))

End Function

Function minMnumnoregIV(mManglenoregIV As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Min. Mach number (no Reg.IV)
'mManglenoregIV Min. Mach Angle (no Reg.IV), rad
minMnumnoregIV = 1 / Sin(mManglenoregIV)

End Function

Function muMangle(M As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'mu Mach Angle, rad
'M Mach number
muMangle = arcsin(1 / M)

End Function

Function arcsin(v As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
If Abs(v) > 1 Then
MsgBox "Invalid argument"
Exit Function
ElseIf v = 1 Then
arcsin = WorksheetFunction.pi / 2
Exit Function
End If
arcsin = Atn(v / Sqr(1 - v * v))

End Function

Function RefAreaRegionII(ct As Double, mu As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Ref. Area Region II, in^2
'ct tip chord, in
'mu Mach Angle, rad
RefAreaRegionII = ct ^ 2 * Tan(mu) / 2

End Function

Function RefAreaRegionIII(cr As Double, mu As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Ref. Area Region III, in^2
'cr root chord, in
'mu Mach Angle, rad
RefAreaRegionIII = cr ^ 2 * Tan(mu) / 2

End Function

Function RefAreaRegionI(M As Double, xB As Double, LESA As Double, _
FinA As Double, minMnoRegIV As Double, mu As Double, refAII As Double, refAIII As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Ref. Area Region I, in^2
'M mach number
'xB exposedSemispan, in
'LESA LE. Sweep Angle, rad
'FinA Fin Area, in^2
'minMnoRegIV min Mach number (no Reg.IV)
'mu Mach Angle, rad
'refAII Ref Area Region II, in^2
'refAIII Ref Area Region III, in^2

' S1 = ST - S2 - S3 + S4 new equ base on eq23 replace eq12

If M > minMnoRegIV Then
    RefAreaRegionI = FinA - refAII - refAIII
Else
    RefAreaRegionI = xB ^ 2 * ((Cos(LESA)) ^ 2 * (Cos(mu)) ^ 2 - _
    (Sin(LESA)) ^ 2 * (Sin(mu)) ^ 2) / (2 * (Cos(LESA)) ^ 2 * Sin(2 * mu))
End If

End Function

Function RefAreaRegionIV(M As Double, cr As Double, ct As Double, _
xB As Double, minMnoRegIV As Double, mu As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Ref. Area Region IV, in^2
'M mach number
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
'minMnoRegIV min Mach number (no Reg.IV)
'mu Mach Angle, rad
If M < minMnoRegIV Then
    RefAreaRegionIV = ((xB - (cr + ct) * Tan(mu)) * Cos(mu)) ^ 2 / (2 * Sin(2 * mu))
Else
    RefAreaRegionIV = 0
End If

End Function

Function DeltapI(M As Double, LESA As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Delta P I
'M mach number
'LESA LE. Sweep Angle, rad
DeltapI = 4 * Cos(LESA) / (M ^ 2 * (Cos(LESA) ^ 2) - 1) ^ (1 / 2)

End Function

Function DeltapII(dPI As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Delta P II
'dPI delta P I
DeltapII = dPI / 2

End Function

Function DeltapIII(M As Double, LESA As Double, dPI As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Delta P III
'M mach number
'LESA LE. Sweep Angle, rad
'dPI delta P I
DeltapIII = dPI * ((M ^ 2 * (Cos(LESA)) ^ 2 - 1) ^ (1 / 2) / Tan(LESA) - _
Cos(LESA) * ((M ^ 2 - 1) ^ (1 / 2) / Tan(LESA) - 1))

End Function

Function SrefCnalpha(SII As Double, SIII As Double, SI As Double, _
SIV As Double, dPI As Double, dPII As Double, dPIII As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'SrefCnalpha, in^2
'SI Ref. Area Region I, in^2
'SII Ref. Area Region II, in^2
'SIII Ref. Area Region III, in^2
'SIV Ref. Area Region IV, in^2
'dPI delta P I
'dPII delta P II
'dPIII delta P III
SrefCnalpha = SI * dPI + SII * dPII + SIII * dPIII - SIV * dPI

End Function

Function AreamomentII(cr As Double, ct As Double, mu As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Area Moment II, in^3
'cr root chord, in
'ct tip chord, in
'mu Mach Angle, rad
AreamomentII = (cr * ct ^ 2 - ct ^ 3 / 3) * Tan(mu) / 2

End Function

Function AreamomentIII(cr As Double, mu As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Area Moment III, in^3
'cr root chord, in
'ct tip chord, in
'mu Mach Angle, rad
AreamomentIII = cr ^ 3 * Tan(mu) / 3

End Function

Function AreamomentIV(M As Double, cr As Double, ct As Double, _
xB As Double, minMnoRegIV As Double, mu As Double, SIV As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Area Moment IV, in^3
'M Mach Number
'cr root chord, in
'ct tip chord, in
'xB exposedSemispan, in
'minMnoRegIV min Mach number (no Reg.IV)
'mu Mach Angle, rad
'SIV Ref. Area Region IV, in^2
If M < minMnoRegIV Then
    AreamomentIV = SIV * (cr - (xB - (cr + ct) * Tan(mu)) / (6 * Tan(mu)))
Else
    AreamomentIV = 0
End If

End Function

Function AreamomentI(FAMcrLE As Double, AMII As Double, AMIII As Double, AMIV As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'Area Moment I, in^3
'FAMcrLE Fin Area Moment about Root Chord Leading Edge, in^3
'AMII Area Moment II, in^3
'AMIII Area Moment III, in^3
'AMIV Area Moment IV, in^3
AreamomentI = FAMcrLE - AMII - AMIII + AMIV

End Function

Function NFmom(dPI As Double, dPII As Double, dPIII As Double, _
AMII As Double, AMIII As Double, AMIV As Double, AMI As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'NFmom, in^3
'dPI delta P I
'dPII delta P II
'dPIII delta P III
'AMII Area Moment II, in^3
'AMIII Area Moment III, in^3
'AMIV Area Moment IV, in^3
'AMI Area Moment I, in^3
NFmom = AMI * dPI + AMII * dPII + AMIII * dPIII - AMIV * dPI

End Function

Function XcpaftcrLE(SrefCnal As Double, NFm As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
'XcpaftcrLE XCP in aft of root chord Leading Edge, in
'SrefCnal SrefCnalpha, in^2
'NFm NFmom, in^3
XcpaftcrLE = NFm / SrefCnal

End Function


Function Wedge_multiplier(M As Double, delta As Double, cr As Double, ct As Double, xB As Double)
'========================================================================
'\                     == Function Wedge_multiplier() ==                /
'\                                                                      /
'\      This function is to calculate the ratio of the Busemann         /
'\  (quadratic) and the linear Ackeret. It is multiplier that can be    /
'\  applied to wedge fin with a supersonic leading edge.                /
'\                                                                      /
'========================================================================
Application.Volatile
'delta leading edge wedge angle, rad
Dim beta As Double
Dim gamma As Double
Dim M2 As Double
Dim beta2 As Double
Dim Slope As Double
Dim Intercept As Double
Dim W_m2 As Double
gamma = 1.4 'specific heats ratio for air

LEangle = LEsweepangle(cr, ct, xB)
M = M * Cos(LEangle)

M2 = 2
beta2 = M2 ^ 2 - 1
W_m2 = 1 + delta * ((gamma + 1) * M2 ^ 4 - 4 * beta2) / (2 * beta2 ^ (3 / 2)) + _
    ((gamma + 1) ^ 2 * M2 ^ 8 / 16 - (7 + 12 * gamma - 3 * gamma ^ 2) * M2 ^ 6 / 12 + _
    3 * (gamma + 1) * M2 ^ 4 / 2 - 2 * M2 ^ 2 + 4 / 3) * 3 * delta ^ 2 / (2 * beta2 ^ (6 / 2))
Slope = (W_m2 - 1) / (M2 - 1)
Intercept = 1 - Slope
beta = M ^ 2 - 1
If M >= M2 Then
    Wedge_multiplier = 1 + delta * ((gamma + 1) * M ^ 4 - 4 * beta) / (2 * beta ^ (3 / 2)) + _
    ((gamma + 1) ^ 2 * M ^ 8 / 16 - (7 + 12 * gamma - 3 * gamma ^ 2) * M ^ 6 / 12 + _
    3 * (gamma + 1) * M ^ 4 / 2 - 2 * M ^ 2 + 4 / 3) * 3 * delta ^ 2 / (2 * beta ^ (6 / 2))
ElseIf M > 1 Then
    Wedge_multiplier = (Slope * M) + Intercept
Else
    Wedge_multiplier = 1
End If

End Function

Function Wedge_wavedrageCoef(M As Double, delta As Double, cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function Wedge_wavedrageCoef() ==              /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim beta As Double
Dim gamma As Double
gamma = 1.4 'specific heats ratio for air

LEangle = LEsweepangle(cr, ct, xB)
M = M * Cos(LEangle)

Mmin = Wedge_MinMachNo(delta)

beta = M ^ 2 - 1

If M > Mmin Then
    Wedge_wavedrageCoef = 4 * delta / beta ^ (1 / 2) + _
    delta ^ 2 * ((gamma + 1) * M ^ 4 - 4 * beta) / (beta ^ 2) + _
    ((gamma + 1) ^ 2 * M ^ 8 / 16 - (7 + 12 * gamma - 3 * gamma ^ 2) * M ^ 6 / 12 + _
    3 * (gamma + 1) * M ^ 4 / 2 - 2 * M ^ 2 + 4 / 3) * 2 * delta ^ 3 / beta ^ (7 / 2)
Else
    Wedge_wavedrageCoef = 0
End If
If delta = 0 Then
    Wedge_wavedrageCoef = 0
End If

End Function

Function Wedge_PressureCoef(M As Double, delta As Double, cr As Double, ct As Double, xB As Double)
'========================================================================
'\                    == Function Wedge_PressureCoef() ==               /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim beta As Double
Dim gamma As Double
gamma = 1.4 'specific heats ratio for air

'LEangle = LEsweepangle(cr, ct, xB)
'M = M * Cos(LEangle)

beta = M ^ 2 - 1
If M >= 1 Then
    Wedge_PressureCoef = 2 * delta / beta ^ (1 / 2) + _
    delta ^ 2 * ((gamma + 1) * M ^ 4 - 4 * beta) / (2 * beta ^ 2) + _
    ((gamma + 1) ^ 2 * M ^ 8 / 16 - (7 + 12 * gamma - 3 * gamma ^ 2) * M ^ 6 / 12 + _
    3 * (gamma + 1) * M ^ 4 / 2 - 2 * M ^ 2 + 4 / 3) * delta ^ 3 / beta ^ (7 / 2)
Else
    Wedge_PressureCoef = "Inapplicable"
End If
If delta = 0 Then
    Wedge_PressureCoef = "Inapplicable"
End If
End Function

Function Wedge_HalfAngle(M As Double, cr As Double, ct As Double, xB As Double)
'========================================================================
'\                      == Function Wedge_HalfAngle() ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim gamma As Double
Dim Mp As Double
gamma = 1.4 'specific heats ratio for air

LEangle = LEsweepangle(cr, ct, xB)
Mp = M * Cos(LEangle)

If Mp > 1 Then
    Wedge_HalfAngle = (4 / (3 * Sqr(3) * (1.4 + 1))) * (Mp ^ 2 - 1) ^ (3 / 2) / Mp ^ 2
Else
    Wedge_HalfAngle = "M is less than 1"
End If

End Function

Function Wedge_MinMachNo(delta As Double)
'========================================================================
'\                     == Function Wedge_MinMachNo() ==                 /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim d1 As Double
Dim M1 As Double
Dim d2 As Double
Dim M2 As Double
Dim d3 As Double
Dim M3 As Double
d1 = 0.212930169
M1 = 1.5
d2 = 0.404916386
M2 = 2
d3 = 0.598647933
M3 = 3

f1 = (M1 - 1) / d1
f2 = (M2 - M1) / (d2 - d1) - (M1 - 1) / d1
f3 = (M3 - M2) / ((d3 - d2) * (d3 - d1)) - (M2 - M1) / ((d3 - d1) * (d2 - d1)) - _
(M2 - M1) / (d2 * (d2 - d1)) - (M1 - 1) / (d2 * d1)

'Wedge_MinMachNo = 1 + delta * f1 + (delta - d1) * delta * f2 / d2 + (delta - d2) * (delta - d1) * delta * f3 / d3
Wedge_MinMachNo = 172.87 * delta ^ 5 - 257.59 * delta ^ 4 + 143.46 * delta ^ 3 - 33.651 * delta ^ 2 + 5.129 * delta + 0.9867


End Function


-------------------------------------------------------------------------------
VBA MACRO normalcoeff.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/normalcoeff'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function CNalpha(x2 As Double, x3 As Double, r2 As Double, r3 As Double, delta As Double, Pcone As Double, P2 As Double, eta As Double, dpds2 As Double, lambda1 As Double, lambda2 As Double, l1 As Double, dcnalpha0 As Double, Ab As Double)



'x3=x1, xi+1=xi-1
pival = 3.14159265
M = (r3 - r2) / (x3 - x2)

If x2 = 0 Then

term = l1 * (0.5 * M * (x3 - x2) ^ 2 + r2 * (x3 - x2))

Else

nx = dpds2 * (1 / ((Pcone - P2) * Cos(delta)))
Q = Tan(delta) * dcnalpha0
If lambda1 = 0 Then
W = 1
Else
W = (lambda2 / lambda1) * l1
End If

k1 = -M * Q + M * W
k2 = (M * x2 - r2) * (Q - W)
k3 = Q * (M * x2 - r2)
k4 = M * Q

    If nx = 0 Then
    term = 0
    Else
    term = (k4 / 2) * (x3 ^ 2 - x2 ^ 2) + k3 * (x2 - x3) + (k2 / nx) * (1 - Exp(-eta)) - k1 * ((x3 / nx) * Exp(-eta) + (1 / nx ^ 2) * Exp(-eta) - x2 / nx - (1 / nx ^ 2))
    End If
End If

CNalpha = (2 * pival / Ab) * term

End Function




-------------------------------------------------------------------------------
VBA MACRO rootfinder.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/rootfinder'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function newtonmethod(Mguess As Double, nuval As Double)

Dim eps1 As Double
Dim er1 As Double
Dim Mnew As Double
eps1 = 0.0000001
er1 = 100

Dim k As Integer
k = 1000

For i = 0 To k

Mnew = Mguess - ((nu(Mguess, 1.4) - nuval) / dnu(Mguess, 1.4))
er1 = Abs(Mnew - Mguess)

If er1 <= eps1 Then
newtonmethod = WorksheetFunction.RoundDown(Mnew, 6)
'kiter = i
'Output.Cells(10, 1) = kiter
Exit For

End If

Mguess = Mnew

Next i

End Function

-------------------------------------------------------------------------------
VBA MACRO thetabetamacheqn.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/thetabetamacheqn'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


Function TBM(M As Double, theta As Double, gamma As Double, n As Long)

'% This function returns the oblique shock wave angle (beta) for a given
'% deflection angle (theta) in degrees and ratio of specific heats (gamma).
'% and Mach number M. Specify 0 for the weak oblique shock
'% or 1 for the strong shock.
'%
'% Syntax:
'% beta(M,theta,gamma,n)     where n specifies weak or strong shock returned
'%
'% NOTE: Angles supplied and returned from this function are in DEGREES.
'%
'% Based on an analytical solution to the theta-beta-Mach relation given in
'% the following reference:  Rudd, L., and Lewis, M. J., "Comparison of
'% Shock Calculation Methods", AIAA Journal of Aircraft, Vol. 35, No. 4,
'% July-August, 1998, pp. 647-649.
'%
'% By Chris Plumley, undergraduate, University of Maryland.

pi = 3.141592
'theta = theta * pi / 180       '% convert to radians
Dim mu As Double
Dim C1 As Double
Dim a1 As Double
Dim B1 As Double
Dim dterm As Double
Dim beta1 As Double
mu = WorksheetFunction.Asin(1 / M)               '% Mach wave angle
C1 = Tan(mu) ^ 2
a1 = ((gamma - 1) / 2 + (gamma + 1) * C1 / 2) * Tan(theta)
B1 = ((gamma + 1) / 2 + (gamma + 3) * C1 / 2) * Tan(theta)

d1a = (1 - 3 * a1 * B1) ^ 3
d1b = (27 * (a1 ^ 2) * C1 + 9 * a1 * B1 - 2) ^ 2
dterm = (4 * d1a / d1b - 1) ^ (1 / 2)

If theta = 0 And n = 0 Then
TBM = (1 / M ^ 2) ^ (1 / 2)
ElseIf theta = 0 And n = 1 Then
TBM = pi / 2

Else

beta1 = Atn((B1 + 9 * a1 * C1) / (2 * (1 - 3 * a1 * B1)) - (dterm * (27 * a1 ^ 2 * C1 + 9 * a1 * B1 - 2)) / (6 * a1 * (1 - 3 * a1 * B1)) * Tan(n * pi / 3 + 1 / 3 * Atn(1 / dterm))) '* 180 / pi
TBM = beta1

End If

End Function

-------------------------------------------------------------------------------
VBA MACRO dpdsafter.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/dpdsafter'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function dpds2(gamma As Double, epsilon As Double, M1 As Double, M2 As Double, P1 As Double, P2 As Double, beta1 As Double, beta2 As Double, R As Variant, omega1 As Double, omega2 As Double, delta1 As Variant, delta2 As Variant, dpds1 As Double)


Dim sigma As Double
Dim bd As Double
Dim bu As Double

'dpdsu = dpds1
'Bd = beta2
'bu = beta1
'deltau = Delta1
'deltad = delta2
'pd = P2
'pu = P1
'Mud = WorksheetFunction.Asin(1 / M2)
'sigma = TBM(M1, Abs(epsilon), gamma, 0)
'Top = ((gamma + 1) * Tan(deltad - deltau) * Cos(sigma - deltau) - Sin(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2 + Sin(sigma - deltau)
'Bottom = 1 + (1 - 2 * ((Sin(sigma - deltau)) ^ 2) + 2 * Tan(deltad - deltau) * Sin(sigma - deltau) * Cos(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2
'F = (4 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M1 ^ 2) * Sin(sigma - deltau) * Top / Bottom
'term1 = (2 * Bd / R) * (Sin(sigma - deltau) * Sin(deltau) / Sin(sigma - deltad) - Sin(deltad))
'term2 = dpdsu * ((Bd / bu) * (Sin(sigma - deltau) / Sin(sigma - deltad)) + (pd / pu - F) * (Cos(sigma - deltau) * Tan(Mud) / Sin(sigma - deltad)))
'u means upstream
'd downstream
'sigma is shock-wave angle
'delta is flow deflection angle
'Mu is mach wave angle

'Bd is the same as beta2
'deltad is delta2


If delta1 >= delta2 Then

dpds2 = (beta2 / R) * ((omega1 / omega2) * Sin(delta1) - Sin(delta2)) + (beta2 / beta1) * (omega1 / omega2) * dpds1
Else

dpdsu = dpds1
bd = beta2
bu = beta1
deltau = delta1
deltad = delta2
pd = P2
pu = P1
Mud = WorksheetFunction.Asin(1 / M2)
sigma = TBM(M1, Abs(epsilon), gamma, 0)
Top = ((gamma + 1) * Tan(deltad - deltau) * Cos(sigma - deltau) - Sin(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2 + Sin(sigma - deltau)
Bottom = 1 + (1 - 2 * ((Sin(sigma - deltau)) ^ 2) + 2 * Tan(deltad - deltau) * Sin(sigma - deltau) * Cos(sigma - deltau)) * mu ^ 2 * (Sin(sigma - deltau)) ^ 2
F = (4 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M1 ^ 2) * Sin(sigma - deltau) * Top / Bottom
term1 = (2 * bd / R) * (Sin(sigma - deltau) * Sin(deltau) / Sin(sigma - deltad) - Sin(deltad))
term2 = dpdsu * ((bd / bu) * (Sin(sigma - deltau) / Sin(sigma - deltad)) + (pd / pu - F) * (Cos(sigma - deltau) * Tan(Mud) / Sin(sigma - deltad)))
dpds2 = (term1 + term2) / (1 + Tan(Mud) / Tan(sigma - deltad))
End If

End Function


-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Z_SupersonicRoutine.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Z_SupersonicRoutine'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'################### Supersonic Fin Functions Routine ###################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        Supersonic Barrowman Equation                       #
'#  Module name     Z_SupersonicRoutine                                 #
'#  Version         3.3                                                 #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################

Function Cnalpha_WingAlone(MinM_SubSonicTP As Double, MaxM_SubSonicLE As Double, _
MinM_SupersonicLE As Double, cr As Double, ct As Double, xB As Double, _
twopanelAR As Double, Wedgemultiplier As Double, dCndalAR As Double)
'========================================================================
'\                    == Function Cnalpha_WingAlone() ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Dim MInf As Double
MInf = ActiveSheet.Range("D6").Value 'Mach Infinity
'MinM_SubSonicTP Minimum Mach No. Subsonic Tip Interference
'MaxM_SubSonicLE Maximum Mach No. Subsonic Leading Edge
'MinM_SupersonicLE Minimum Mach No. Supersonic Tip Interference
        
TEMP = Wedgemultiplier

If MInf > MinM_SubSonicTP Then
    If MInf < MaxM_SubSonicLE Then
        Cnalpha_WingAlone = twopanelAR * dCndalAR * TEMP
    Else
        If MInf > MinM_SupersonicLE Then
            Cnalpha_WingAlone = Cnalpha_routine(MInf, cr, ct, xB) * TEMP
        Else
            Cnalpha_WingAlone = "Inapplicable"
        End If
    End If
Else
    Cnalpha_WingAlone = "Inapplicable"
End If

End Function


Function HC_FinCP_aft(MinM_SubSonicTP As Double, MaxM_SubSonicLE As Double, _
MinM_SupersonicLE As Double, cr As Double, ct As Double, xB As Double, _
Table As Range, dCol As Double, dRow As Double, CnatypeChecker As Variant)
'========================================================================
'\                       == Function HC_FinCP_aft() ==                  /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Dim MInf As Double
MInf = ActiveSheet.Range("D6").Value 'Mach Infinity
'MinM_SubSonicTP Minimum Mach No. Subsonic Tip Interference
'MaxM_SubSonicLE Maximum Mach No. Subsonic Leading Edge
'MinM_SupersonicLE Minimum Mach No. Supersonic Tip Interference

TEMP = 1
If CnatypeChecker = "Inapplicable" Then
    HC_FinCP_aft = "Inapplicable"
Else

Dim Cna As Double
Cna = CnatypeChecker
If MInf > MinM_SubSonicTP Then
    If MInf < MaxM_SubSonicLE Then
        HC_FinCP_aft = BILINTERP(Table, dCol, dRow) * TEMP
    Else
        If MInf > MinM_SupersonicLE Then
            HC_FinCP_aft = Finxcp_aftLEcr(MInf, cr, ct, xB, Cna) * TEMP
        End If
    End If
End If


End If

End Function

Function Cnalpha_routine(M As Double, cr As Double, ct As Double, xB As Double)
'========================================================================
'\                     == Function Cnalpha_routine() ==                 /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim LESA As Double
Dim FinA As Double
Dim MFA_LEcr As Double
Dim minMA As Double
Dim minM As Double
Dim minMAnoR4 As Double
Dim minMnoR4 As Double
Dim mu As Double
Dim S2 As Double
Dim S3 As Double
Dim S1 As Double
Dim S4 As Double
Dim dp1 As Double
Dim dp2 As Double
Dim dp3 As Double
Dim SrefCna As Double

LESA = LEsweepangle(cr, ct, xB)
FinA = Finarea(cr, ct, xB)
MFA_LEcr = FAMomentCRLE(cr, ct, xB)
minMA = minMangle(cr, xB)
minM = minMnum(minMA)
minMAnoR4 = minManglenoregIV(cr, ct, xB)
minMnoR4 = minMnumnoregIV(minMAnoR4)
mu = muMangle(M)
S2 = RefAreaRegionII(ct, mu)
S3 = RefAreaRegionIII(cr, mu)
S1 = RefAreaRegionI(M, xB, LESA, FinA, minMnoR4, mu, S2, S3)
S4 = RefAreaRegionIV(M, cr, ct, xB, minMnoR4, mu)
dp1 = DeltapI(M, LESA)
dp2 = DeltapII(dp1)
dp3 = DeltapIII(M, LESA, dp1)
SrefCna = SrefCnalpha(S2, S3, S1, S4, dp1, dp2, dp3)

Cnalpha_routine = SrefCna / FinA

End Function

Function Finxcp_aftLEcr(M As Double, cr As Double, ct As Double, xB As Double, Cna As Double)
'========================================================================
'\                      == Function Finxcp_aftLEcr() ==                 /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
Application.Volatile
Dim LESA As Double
Dim FinA As Double
Dim mu As Double
Dim MFA_LEcr As Double
Dim minMAnoR4 As Double
Dim minMnoR4 As Double
Dim dp1 As Double
Dim dp2 As Double
Dim dp3 As Double
Dim S4 As Double
Dim SrefCnal As Double
LESA = LEsweepangle(cr, ct, xB)
FinA = Finarea(cr, ct, xB)
mu = muMangle(M)
MFA_LEcr = FAMomentCRLE(cr, ct, xB)
minMAnoR4 = minManglenoregIV(cr, ct, xB)
minMnoR4 = minMnumnoregIV(minMAnoR4)
dp1 = DeltapI(M, LESA)
dp2 = DeltapII(dp1)
dp3 = DeltapIII(M, LESA, dp1)
S4 = RefAreaRegionIV(M, cr, ct, xB, minMnoR4, mu)
SrefCnal = Cna * FinA

Dim Ma2 As Double
Dim Ma3 As Double
Dim Ma4 As Double
Dim Ma1 As Double
Dim NFm As Double
Dim xcp As Double
Ma2 = AreamomentII(cr, ct, mu)
Ma2 = AreamomentIII(cr, mu)
Ma4 = AreamomentIV(M, cr, ct, xB, minMnoR4, mu, S4)
Ma1 = AreamomentI(MFA_LEcr, Ma2, Ma3, Ma4)
NFm = NFmom(dp1, dp2, dp3, Ma2, Ma3, Ma4, Ma1)
xcp = XcpaftcrLE(SrefCnal, NFm)


Finxcp_aftLEcr = xcp / cr

End Function


-------------------------------------------------------------------------------
VBA MACRO UserForm1.frm 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Private Sub CommandButton1_Click()
Unload UserForm1
End Sub

Private Sub CommandButton2_Click()
Unload UserForm1
UserForm2.Show
End Sub

Private Sub Label3_Click()

End Sub
-------------------------------------------------------------------------------
VBA MACRO UserForm2.frm 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Private Sub CommandButton1_Click()
Unload UserForm2
End Sub

-------------------------------------------------------------------------------
VBA MACRO test.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/test'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'################### SlenderBodyTheory Functions Routine ###################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        Supersonic Barrowman Equation                       #
'#  Module name     Z_SlenderBody                                 #
'#  Version         3.3                                                 #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################

Function Segment_Cnalpha(r1 As Double, r2 As Double, Saeroref As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================

Segment_Cnalpha = 2 * WorksheetFunction.pi * (r2 ^ 2 - r1 ^ 2) / Saeroref

End Function

Function Segment_Vol(x1 As Double, x2 As Double, r1 As Double, r2 As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================

Segment_Vol = WorksheetFunction.pi * r2 ^ 2 * (x2 - x1) * ((r1 ^ 2 / r2 ^ 2) + (r1 / r2) + 1) / 3

End Function

Function Segment_CP(x1 As Double, x2 As Double, r1 As Double, r2 As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================
SegVol = Segment_Vol(x1, x2, r1, r2)

If r1 = r2 Then
    Segment_CP = 0
Else
    Segment_CP = (x2 * WorksheetFunction.pi * r2 ^ 2 - x1 * WorksheetFunction.pi * r1 ^ 2 - SegVol) / (WorksheetFunction.pi * r2 ^ 2 - WorksheetFunction.pi * r1 ^ 2)
End If

End Function


Function Segment_CMalpha(SegCNalpha As Double, SegCP As Double)
'========================================================================
'\                    == Function () ==                /
'\                                                                      /
'\      This function is to calculate                                   /
'\                                                                      /
'\                                                                      /
'\                                                                      /
'========================================================================

Segment_CMalpha = -SegCNalpha * SegCP

End Function

-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     19 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  inputtable
' 0085     20 BOUNDSHEET : Sheet Information - chart, visible -  nose profil
' 0085     23 BOUNDSHEET : Sheet Information - chart, visible -  Cp distributio
' 0085     30 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  SupersonicCalculation
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Developed by: Charley Hoult, Armando Fuentes, Hien Tran
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Supersonic Barrowman Equation 3.3
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Closea
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Tips�	
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Changelogs in VBA code in SupersonicCalculations sheetn
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Tips: 
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- Table of Summary at A71
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- When design please watch the Limitations Table Range from B9 to J10
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- Check for comments on the cell for hints
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�Closea
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- If wedge delta = 0 then the fin is flat plate�
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- WARNING: The Minf need to be between C10-D10 or greater than E10 for 1st stage and F10-G10 or greater H10 for 2nd stage. Check Fig.1 and Fig.2
-------------------------------------------------------------------------------
VBA FORM STRING IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2/o'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
�- ChecK Fig.3 for 2 stage Fin locations
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label1'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label2'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'CommandButton1'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'CommandButton2'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label3'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label1'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label7'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label2'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label3'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'CommandButton1'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label4'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label5'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None
-------------------------------------------------------------------------------
VBA FORM Variable "b'Label6'" IN '/home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SUPERSONICBARROWMANEQUATIONS3.5.xls' - OLE stream: '_VBA_PROJECT_CUR/UserForm2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
None

