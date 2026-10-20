olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO inputsheet.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/inputsheet'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO solution.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/solution'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO SKYAERO_WindFunction.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SKYAERO_WindFunction'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Function WindCompensation(AWind, BWind, lambdaWind, AltWind)
    WindCompensation = AWind * (1 - Exp(-lambdaWind * AltWind)) + BWind * AltWind * _
        Exp(-lambdaWind * AltWind)
End Function

Function WindVelocityCal(WindNoE As Variant, WindNS As Double, WindEW As Double, trajazimuth As Double, WindVelocity As Double)
If WindNoE = True Then  'in-plane (Northerly Wind)
    WindVelocity = WindNS * Cos(trajazimuth) + WindEW * Sin(trajazimuth)
ElseIf WindNoE = False Then 'cross plane 'Easterly Wind
    WindVelocity = -WindNS * Sin(trajazimuth) + WindEW * Cos(trajazimuth)
ElseIf WindNoE = none Then 'no wind
    WindVelocity = 0
End If

WindVelocityCal = WindVelocity
End Function

Function rowcount()
Dim myVar As Double
Dim Val1

TEMP123 = True

ii = 0
ReDim Val1(1 To 1) As Variant
Do
    myVar = ActiveCell.Value
    ActiveCell.Offset(1, 0).Select
    ii = ii + 1
    ReDim Preserve Val1(1 To ii) As Variant
    Val1(ii) = myVar
    If IsEmpty(ActiveCell) Then
        TEMP123 = False
    Else
    End If
Loop While TEMP123 = True

rowcount = ii
End Function

Function arrayoutput(nrow As Integer) As Variant

Dim myVar As Double
Dim Val1

ReDim Val1(1 To nrow) As Variant
For j2 = 1 To nrow
    myVar = ActiveCell.Value
    Val1(j2) = myVar
    ActiveCell.Offset(1, 0).Select
Next j2

arrayoutput = Val1
End Function

Function windprofileinterp(altwpi As Double, altarray, winspeedarray)
Dim lowerv As Long
Dim upperv As Long
Dim slope As Double

maxlimit = UBound(winspeedarray) - LBound(winspeedarray) + 1
    If altwpi > 0 And altwpi < altarray(maxlimit) Then
        lowerv = WorksheetFunction.Match(altwpi, altarray, 1)
        upperv = lowerv + 1
        y1 = winspeedarray(lowerv)
        y2 = winspeedarray(upperv)
        x1 = altarray(lowerv)
        x2 = altarray(upperv)
        dy = y2 - y1
        dx = x2 - x1
        slope = dy / dx
        windprofileinterp = y1 + slope * (altwpi - x1) 'find y at the desired x val
    ElseIf altwpi <= 0 Then
        windprofileinterp = 0
    Else
        windprofileinterp = winspeedarray(maxlimit)
    End If
    
End Function

-------------------------------------------------------------------------------
VBA MACRO SKYAERO_Subroutines.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SKYAERO_Subroutines'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'############################## SKYAERO_Subroutines ############################
'#                        == Do not remove this notice ==                      #
'#-----------------------------------------------------------------------------#
'#  Program:        SKYAERO                                                    #
'#  Module name     SKYAERO_Subroutines                                        #
'#  Version         7.6 beta                                                   #
'#  Developed by    Charley Hoult, Armando Fuentes, Michael G. Tong, Hien Tran #
'#-----------------------------------------------------------------------------#
'#                                                                             #
'#  Info. go here                                                              #
'#                                                                             #
'###############################################################################
Option Base 1 'Array index 1

Sub SKYaeroSim()
'Written by Armando Fuentes, Michael G. Tong, Hien Tran

Dim i As Long 'long used instead of integer because after ~32000 iterations there is an _
overflow of the integers so visual basic resolves this by using long
Dim j As Integer
Dim icount As Long

' verified variables in the loop
Dim timeold As Double
Dim altold As Double
Dim Vzold As Double

' verified variables
Dim gstand As Double
Dim Rair As Double
Dim GAMMA As Double
Dim PressureSL As Double
Dim alpha As Double
Dim pival As Double
Dim radangle As Double
Dim DensitySL As Double
Dim TempSL As Double
Dim TropAlt As Double
Dim TropPressure As Double
Dim TropTemp As Double

Dim windcase As Boolean
Dim tablearray As Variant
Dim winddataarray As Variant

Dim MSLalt As Double
Dim range1new As Double
Dim Vxnew As Double
Dim Vznew As Double
Dim QEA As Double
Dim simlaunchlength As Double
Dim DIalt As Double
Dim PYWavenumber As Double
Dim LSg As Double
Dim LSer As Double

Dim Vxrelnew As Double
Dim Vxini As Double
Dim Vzini As Double

Dim deltaT 'delta time
Dim tau As Double
Dim tstart
Dim tend
Dim phasetest
Dim massR

Dim dragconst1 As Double
Dim dragconst2 As Double
Dim dragconstnoig As Double

' Reference Area
Dim Area0Co As Double
Dim Sdroguenoig As Double
Dim Area1Po As Double
Dim Area1Co As Double
Dim Area2Po As Double
Dim Area2Co As Double
Dim Area3Po As Double
Dim Area3Co As Double
Dim Sdrogue As Double
Dim Smain As Double

Dim Arearef() As Double

Dim Visp1 As Double
Dim Visp2 As Double
Dim Visp3 As Double

Dim Ae1 As Double
Dim Ae2 As Double
Dim Ae3 As Double

Dim EventN As Integer
Dim Launcher As Boolean

Dim timenew As Double
Dim altnew As Double

Dim eventstime As Double
Dim Sarea As Double
Dim massnew As Double

Dim altchecktemp As Double
Dim altchecker As Double
Dim monitor As Double
Dim timeend As Double
Dim rangInSt#

Dim Vrelnew As Double
Dim distnew As Double
Dim gravity As Double
Dim T As Double
Dim Pnew As Double
Dim rho As Double
Dim Vsound As Double
Dim NewSimLauncherL As Double
  
Dim Machnew As Double
Dim CD As Double
Dim DynamPnew As Double
Dim Vacuumthrust As Double
Dim thrustforcenew As Double
Dim Dragvalnew As Double
Dim flightgammanew As Double
Dim flightgammaold As Double
Dim flightangle2 As Double
Dim az As Double
Dim ax As Double
Dim gsnew As Double
Dim wtruenew As Double
Dim corrnew As Double
Dim wsimnew As Double
Dim wsim As Double

Dim qmax1 As Double
Dim t1qmax As Double
Dim machmax1 As Double
Dim t1machmax As Double
Dim qmax2 As Double
Dim t2qmax As Double
Dim machmax2 As Double
Dim t2machmax As Double
Dim qmax3 As Double
Dim t3qmax As Double
Dim machmax3 As Double
Dim t3machmax As Double

Dim dt As Double
Dim ttemp As Double
Dim alttemp As Double
Dim Vztemp As Double
Dim range1temp As Double
Dim Vxtemp As Double
Dim wsimtemp As Double
Dim Vxreltemp As Double
Dim masstemp As Double
Dim Dmassdt As Double

Dim Dmass(4) As Double
Dim Dalt(4) As Double
Dim Dvz(4) As Double
Dim Dvx(4) As Double
Dim Dvxrel(4) As Double
Dim Drange1(4) As Double
Dim Dvwsim(4) As Double

Dim tAini As Double
Dim VxAini As Double
Dim VzAini As Double
Dim XAini As Double
Dim ZAini As Double
Dim distA As Double
Dim flightangleAini As Double
Dim flightangletemp As Double

gstand = inputsheet.Range("B5") ' conversion factor
Rair = inputsheet.Range("B10") 'Specific Gas Constant
GAMMA = inputsheet.Range("B11")
PressureSL = inputsheet.Range("B12") 'Sea Level Pressure
alpha = inputsheet.Range("B13") 'lapse ratio
pival = inputsheet.Cells(14, 2) 'Value of pi
radangle = inputsheet.Range("G5") 'Conversion factor from radians to angle
DensitySL = inputsheet.Range("G6") 'Sea level density
TempSL = inputsheet.Range("G7") 'Sea Level Temperature
TropAlt = inputsheet.Range("G8") 'Troposhere altitude
TropPressure = inputsheet.Range("G10") 'Troposphere pressure
TropTemp = inputsheet.Range("G11") 'Troposphere temperature

tablearray = inputsheet.Range("b21:d62") 'Perturbation Corrections finite inertia
winddataarray = inputsheet.Range("g21:i62") 'wind effects

MSLalt = inputsheet.Range("b65") 'Initial Altitude Mean Sea Level altitude
range1new = inputsheet.Cells(66, 2) 'Initial Range
Vxnew = inputsheet.Cells(67, 2) 'Initial x-Velocity
Vznew = inputsheet.Cells(68, 2) 'Initial z-Velocity
QEA = inputsheet.Cells(69, 5) 'initial flightpath angle or Quadrant elevation angle at launch
simlaunchlength = inputsheet.Range("b78") 'Simulated Launch length
DIalt = inputsheet.Range("b72") 'Desired Impact Altitude
PYWavenumber = inputsheet.Range("b75") 'Pitch/Yaw Wavenumber,
LSg = inputsheet.Range("B76") 'launch site gravity
LSer = inputsheet.Range("b77") 'Launch site earth radius, ft'

Vxrelnew = Vxnew
Vxini = Vxnew
Vzini = Vznew

deltaT = inputsheet.Range("B96:B98")
tau = inputsheet.Cells(103, 2) 'time constant used during inflation of chutes

'time values used throughout to check for phases
tstart = inputsheet.Range("D82:D94")
tend = inputsheet.Range("E82:E94")

phasetest = inputsheet.Range("B82:B94")
'check to see mass values for each phase
massR = inputsheet.Range("C530:C542")

Dim tablearraytvac1 As Range
Dim tablearraytvac2 As Range
Dim tablearraytvac3 As Range
Dim nrow1 As Integer
Dim nrow2 As Integer
Dim nrow3 As Integer
Dim stl1 As Variant
Dim stl2 As Variant
Dim stl3 As Variant
  
Set tablearraytvac1 = inputsheet.Range("b120:d240") 'Motor Thrust Data used during first stage
nrow1 = tablearraytvac1.Rows.Count
ReDim stl1(1 To nrow1) As Variant
For k1 = 1 To nrow1
    stl1(k1) = tablearraytvac1(k1, 1)
Next k1

Set tablearraytvac2 = inputsheet.Range("b260:d380") 'Motor Thrust Data used during second stage
nrow2 = tablearraytvac2.Rows.Count
ReDim stl2(1 To nrow2) As Variant
For k2 = 1 To nrow2
    stl2(k2) = tablearraytvac2(k2, 1)
Next k2

Set tablearraytvac3 = inputsheet.Range("b399:d519") 'Motor Thrust Data used during thirst stage
nrow3 = tablearraytvac3.Rows.Count
ReDim stl3(1 To nrow3) As Variant
For k3 = 1 To nrow3
    stl3(k3) = tablearraytvac3(k3, 1)
Next k3
 
Dim tablearraydrag1 As Range
Dim tablearraydrag2 As Range
Dim tablearraydrag3 As Range
Dim nrow4 As Integer
Dim nrow5 As Integer
Dim nrow6 As Integer
Dim stl4 As Variant
Dim stl5 As Variant
Dim stl6 As Variant

Set tablearraydrag1 = inputsheet.Range("e120:h139") 'Drag coefficient table during first stage
nrow4 = tablearraydrag1.Rows.Count
ReDim stl4(1 To (nrow4)) As Variant
For k4 = 1 To nrow4
    stl4(k4) = tablearraydrag1(k4, 1)
Next k4

Set tablearraydrag2 = inputsheet.Range("e260:h279") 'Drag coefficient table during second stage
nrow5 = tablearraydrag2.Rows.Count
ReDim stl5(1 To nrow5) As Variant
For k5 = 1 To nrow5
    stl5(k5) = tablearraydrag2(k5, 1)
Next k5

Set tablearraydrag3 = inputsheet.Range("e399:h418") 'Drag coefficient table during third stage
nrow6 = tablearraydrag3.Rows.Count
ReDim stl6(1 To nrow6) As Variant
For k6 = 1 To nrow6
    stl6(k6) = tablearraydrag3(k6, 1)
Next k6
   
dragconst1 = inputsheet.Range("f103") 'Drag coefficient during drogue chute deployment
dragconst2 = inputsheet.Range("f101") 'Drag coefficient during main chute deployment
dragconstnoig = inputsheet.Range("f106") 'Drag coefficient during no ignition phase with parachute

Area0Co = inputsheet.Cells(117, 6) 'Reference area Coasting ist stage no parachute
Sdroguenoig = inputsheet.Cells(105, 6) 'Reference area Coasting ist stage on parachute
Area1Po = inputsheet.Cells(117, 6) 'Reference area 1st stage powered flight
Area1Co = inputsheet.Cells(118, 6) 'Reference area 1st stage coasting flight
Area2Po = inputsheet.Cells(257, 6) 'Reference area 2nd stage powered flight
Area2Co = inputsheet.Cells(258, 6) 'Reference area 2nd stage coasting flight
Area3Po = inputsheet.Cells(396, 6) 'Reference area 3rd stage powered flight
Area3Co = inputsheet.Cells(397, 6) 'Reference area 3rd stage coasting flight
Sdrogue = inputsheet.Cells(104, 6) 'Reference area on Drogue Chute
Smain = inputsheet.Cells(102, 6) 'Reference area on Main Chute

ReDim Arearef(1 To 13) As Double
Arearef(1) = Area0Co
Arearef(2) = Sdroguenoig
Arearef(3) = Area1Po
Arearef(4) = Area1Po
Arearef(5) = Area1Co
Arearef(6) = Area2Co
Arearef(7) = Area2Po
Arearef(8) = Area2Co
Arearef(9) = Area3Co
Arearef(10) = Area3Po
Arearef(11) = Area3Co
Arearef(12) = Sdrogue
Arearef(13) = Smain

'Isp values for each stage
Visp1 = inputsheet.Range("B246") 'Vacuum ISP of rocket during stage1
Visp2 = inputsheet.Range("B385") 'Vacuum ISP of rocket during stage2
Visp3 = inputsheet.Range("B525") 'Vacuum ISP of rocket during stage3

Ae1 = inputsheet.Range("b244") 'Exit Area of rocket during stage1
Ae2 = inputsheet.Range("b383") 'Exit Area of rocket during stage2
Ae3 = inputsheet.Range("b523") 'Exit Area of rocket during stage3

'editing
'Dim EventS As String 'ADDED
EventN = 1

' EventN options:
'1  - 1st stage Coasting Flight Launch
'2  - 1st stage Coasting Stabilization Parachute
'3  - 1st stage Launcher
'4  - 1st stage Powerer Free Flight
'5  - 1st stage Coasting Flight
'6  - 2nd stage Coasting Flight
'7  - 2nd stage Powerer Free Flight
'8  - 2nd stage Coasting Flight
'9  - 3rd stage Coasting Flight
'10 - 3rd stage Powerer Free Flight
'11 - 3rd stage Coasting Flight
'12 - Coasting On Drogue Parachute
'13 - Coasting On Main Parachute

If phasetest(1, 1) = True Then 'Dropping
    EventN = 1
    Launcher = False
ElseIf phasetest(3, 1) = True Then 'LaunchRail
    EventN = 3
    Launcher = True
End If

rangInSt = range1new
'Values needed to start simulation at time=0
timenew = 0 'initial values
altnew = 0#
range1new = 0



eventstime = tstart(4, 1)

massnew = massR(EventN, 1)
monitor = inputsheet.Range("B544")
If monitor <> True Then
    monitor = False
End If
    
altchecker = -0.0001

If Launcher = False Then
    altchecker = altchecker - (MSLalt - DIalt)
    If MSLalt < DIalt Then
        MsgBox "Desired Impact Altitude is higher than Initial Altitude", vbQuestion, "Warning"
        Exit Sub
    End If
Else
    altchecktemp = altchecker - (MSLalt - DIalt)
End If
timeend = endtime(tend, phasetest)
inputsheet.Cells(547, 4) = timeend

i = 1
icount = 1

qmax1 = 0
t1qmax = 0
machmax1 = 0
t1machmax = 0
qmax2 = 0
t2qmax = 0
machmax2 = 0
t2machmax = 0
qmax3 = 0
t3qmax = 0
machmax3 = 0
t3machmax = 0

'--------------
'\ Loop start /
'--------------

Do While ((altnew) >= altchecker) 'iterate until rocket hits ground

    If timenew > 1 And altnew > DIalt And Launcher = True Then
        altchecker = altchecktemp
    End If
'===========\
'   mark     |
'===========/
    If monitor = True Then
        inputsheet.Cells(546, 2) = EventN
        inputsheet.Cells(547, 2) = timenew
        inputsheet.Cells(548, 2) = Machnew
        inputsheet.Cells(549, 2) = altnew + MSLalt
        inputsheet.Cells(550, 2) = range1new + rangInSt
    End If
    
    'values caclulated at time new
    Sarea = Sref(Arearef(EventN), timenew, tstart(EventN, 1), tau, EventN)
    distnew = distance(altnew, range1new + rangInSt)
    NewSimLauncherL = NewSimLauncherLength(Vxini, Vzini, simlaunchlength, timenew, QEA)
    Vrelnew = Vrelative(Vznew, Vxrelnew)
    gravity = grav(altnew, LSg, LSer, MSLalt)
    T = Temperature(altnew, TropAlt, TempSL, alpha, TropTemp, MSLalt)
    Pnew = pressure(altnew, T, TropAlt, TropTemp, TropPressure, TempSL, PressureSL, _
        alpha, LSg, Rair, MSLalt)
    rho = density(Pnew, T, TempSL, PressureSL, DensitySL)
    Vsound = SOS(T, GAMMA, Rair)
    Machnew = Mach(Vrelnew, Vsound)
    CD = dragcoeff(stl4, stl5, stl6, dragconstnoig, Machnew, tablearraydrag1, _
        tablearraydrag2, tablearraydrag3, dragconst1, dragconst2, EventN)
    DynamPnew = DynamicPress(rho, Vrelnew)
    Vacuumthrust = Thrustvac(stl1, stl2, stl3, timenew, tablearraytvac1, tablearraytvac2, _
        tablearraytvac3, EventN)
    thrustforcenew = thrust(Vacuumthrust, Ae1, Ae2, Ae3, Pnew, EventN)
    Dragvalnew = drag(CD, Sarea, DynamPnew)
    flightgammanew = flightpath(Vxrelnew, Vznew, pival, QEA, EventN)
    wtruenew = truewind(altnew, altchecker, winddataarray, Launcher)
    corrnew = corrected3dofwind(altnew, PYWavenumber, tablearray, altchecker, EventN, Launcher)
    wsim = simwind(wtruenew, corrnew)
    
    flightangletemp = flightgammanew
    If phasetest(2, 1) = True And timenew > 0 Then
        If timenew > eventstime - dt And timenew < eventstime + dt Then
            flightangleAini = flightgammanew
        End If
        If EventN = 4 Then
            If flightgammanew < 0 Then '(distA <= 4.9 * 16.7548) Then
                flightangletemp = pival / 4 - flightangleAini / 2
                tAini = timenew
                VzAini = Vznew
                VxAini = Vxnew
                XAini = range1new
                ZAini = altnew
            Else
                distA = ((range1new - XAini + VxAini * (timenew - tAini)) ^ 2 + (altnew - ZAini + VzAini * (timenew - tAini)) ^ 2) ^ (1 / 2)
                If (distA <= 16.7548) Then
                    flightangletemp = pival / 4 - flightangleAini / 2
                End If
            End If
        End If
    End If

    ax = accelx(QEA, flightangletemp, thrustforcenew, Dragvalnew, massnew, gravity, EventN)
    az = accelz(QEA, flightangletemp, thrustforcenew, Dragvalnew, massnew, gravity, EventN)
    gsnew = ((ax ^ 2 + az ^ 2) ^ (1 / 2)) / gstand
    
    'print solutions at time n
    If EventN = 12 Or EventN = 2 Then
        If (timenew / deltaT(1, 1)) - Int(timenew / deltaT(1, 1)) = 0 Then
            Call printSkyAero(timenew, deltaT, icount, EventN, MSLalt, altnew, _
            Pnew, Vrelnew, Machnew, range1new + rangInSt, Vznew, Vxnew, Vxrelnew, _
            massnew, gstand, distnew, flightgammanew, radangle, az / gstand, _
            thrustforcenew, Dragvalnew, DynamPnew, corrnew, wtruenew, wsim)
        End If
    ElseIf EventN = 13 Then
        If (timenew / deltaT(1, 1)) - Int(timenew / deltaT(1, 1)) = 0 Then
            Call printSkyAero(timenew, deltaT, icount, EventN, MSLalt, altnew, _
            Pnew, Vrelnew, Machnew, range1new + rangInSt, Vznew, Vxnew, Vxrelnew, _
            massnew, gstand, distnew, flightgammanew, radangle, az / gstand, _
            thrustforcenew, Dragvalnew, DynamPnew, corrnew, wtruenew, wsim)
        End If
    Else
        Call printSkyAero(timenew, deltaT, icount, EventN, MSLalt, altnew, _
        Pnew, Vrelnew, Machnew, range1new + rangInSt, Vznew, Vxnew, Vxrelnew, _
        massnew, gstand, distnew, flightgammanew, radangle, az / gstand, _
        thrustforcenew, Dragvalnew, DynamPnew, corrnew, wtruenew, wsim)
    End If

    If Vzold * Vznew <= 0 And timenew > 1 Then
    apogee = (altnew - altold) / (Vznew - Vzold) * (Vzapogee - Vzold) + altold 'where Vzapogee = Vznew = 0
    solution.Cells(4, 36) = apogee
    Lapogee = apogee + MSLalt
    solution.Cells(4, 37) = Lapogee
    Tapogee = (timenew - timeold) / (altnew - altzold) * (apogee - altold) + timeold
    solution.Cells(4, 38) = Tapogee
    End If
''''''
    If timenew = tend(4, 1) Or (timenew < tend(4, 1) + dt And tend(4, 1) - dt < timenew) Then
    VBurnout1 = Vrelative(Vznew, Vxrelnew)
    solution.Cells(4, 42) = VBurnout1
    LAltBurnout1 = altnew '
    solution.Cells(4, 43) = LAltBurnout1
    FPABurnout1 = flightgammanew / radangle                               'where FPA = Flight Path Angle
    solution.Cells(4, 44) = FPABurnout1
    End If
''''''
    If timenew > 1 Then
        If Vznew < 0 And altnew <= altchecker Then '(altnew) * (altold) <= 0
            ImpactTime1 = timenew - ((altnew - altchecker) / Vznew)
            solution.Cells(4, 41) = ImpactTime1
            ImpactVel1 = Vrelative(Vznew, Vxrelnew) - ((altnew - altchecker) * (az ^ 2 + ax ^ 2) ^ 0.5) / Vznew
            solution.Cells(4, 40) = ImpactVel1
            xrange = range1new
            solution.Cells(4, 39) = xrange + rangInSt
        End If
    End If
''''''
    If EventN = 7 Or EventN = 8 Then
        If timenew = tend(7, 1) Or (timenew < tend(7, 1) + dt And tend(7, 1) - dt < timenew) Then
        VBurnout2 = Vrelative(Vznew, Vxrelnew)
        solution.Cells(4, 45) = VBurnout2
        LAltBurnout2 = altnew '- MSLalt
        solution.Cells(4, 46) = LAltBurnout2
        FPABurnout2 = flightgamma / radangle
        solution.Cells(4, 47) = FPABurnout2
        End If
    End If
''''''
    If EventN = 10 Or EventN = 11 Then
        If timenew = tend(10, 1) Or (timenew < tend(10, 1) + dt And tend(10, 1) - dt < timenew) Then
        VBurnout3 = Vrelative(Vznew, Vxrelnew)
        solution.Cells(4, 48) = VBurnout3
        LAltBurnout3 = altnew '- MSLalt
        solution.Cells(4, 49) = LAltBurnout3
        FPABurnout3 = flightgamma / radangle
        solution.Cells(4, 50) = FPABurnout3
        End If
    End If
    
    'store data for AM7-AX9 table
    Select Case EventN
        Case 3, 4
            If DynamPnew > qmax1 Then
                qmax1 = DynamPnew
                t1qmax = timenew
            End If
            If Machnew > machmax1 Then
                machmax1 = Machnew
                t1machmax = timenew
            End If
        Case 7
            If DynamPnew > qmax2 Then
                qmax2 = DynamPnew
                t2qmax = timenew
            End If
            If Machnew > machmax2 Then
                machmax2 = Machnew
                t2machmax = timenew
            End If
        Case 10
            If DynamPnew > qmax3 Then
                qmax3 = DynamPnew
                t3qmax = timenew
            End If
            If Machnew > machmax3 Then
                machmax3 = Machnew
                t3machmax = timenew
            End If
    End Select
 
    'value of dt to be used for calculations
    Select Case EventN
        Case 2, 12
            dt = deltaT(2, 1)
        Case 13
            dt = deltaT(3, 1)
        Case Else
            dt = deltaT(1, 1)
    End Select
    
    'RK4
    If (altnew) >= altchecker Then
        timeold = timenew
        Vzold = Vznew
        altold = altnew
        
        For j = 1 To 4
        
            If j = 1 Then
                ttemp = timeold
                alttemp = altold
                Vztemp = Vzold
                range1temp = range1new
                Vxtemp = Vxnew
                wsimtemp = wsim
                Vxreltemp = Vxrelnew
                masstemp = massnew
            ElseIf j = 4 Then
                ttemp = timeold + dt
                alttemp = altold + Dalt(j - 1)
                Vztemp = Vzold + Dvz(j - 1)
                range1temp = range1new + Drange1(j - 1)
                Vxtemp = Vxnew + Dvx(j - 1)
                wsimtemp = Dvwsim(j - 1)
                Vxreltemp = Vxtemp - wsimtemp
                masstemp = massnew + Dmass(j - 1)
            Else
                ttemp = timeold + dt / 2
                alttemp = altold + Dalt(j - 1) / 2
                Vztemp = Vzold + Dvz(j - 1) / 2
                range1temp = range1new + Drange1(j - 1) / 2
                Vxtemp = Vxnew + Dvx(j - 1) / 2
                wsimtemp = Dvwsim(j - 1) / 2
                Vxreltemp = Vxtemp - wsimtemp
                masstemp = massnew + Dmass(j - 1) / 2
            End If
            
            'Values used during RK4 vary with each j
            Vrelnew = Vrelative(Vztemp, Vxreltemp)
            gravity = grav(alttemp, LSg, LSer, MSLalt)
            T = Temperature(alttemp, TropAlt, TempSL, alpha, TropTemp, MSLalt)
            Pnew = pressure(alttemp, T, TropAlt, TropTemp, TropPressure, TempSL, PressureSL, alpha, LSg, _
                Rair, MSLalt)
            rho = density(Pnew, T, TempSL, PressureSL, DensitySL)
            Vsound = SOS(T, GAMMA, Rair)
            Machnew = Mach(Vrelnew, Vsound)
            CD = dragcoeff(stl4, stl5, stl6, dragconstnoig, Machnew, tablearraydrag1, _
                tablearraydrag2, tablearraydrag3, dragconst1, dragconst2, EventN)
            DynamPnew = DynamicPress(rho, Vrelnew)
            Vacuumthrust = Thrustvac(stl1, stl2, stl3, ttemp, tablearraytvac1, tablearraytvac2, _
                tablearraytvac3, EventN)
            thrustforcenew = thrust(Vacuumthrust, Ae1, Ae2, Ae3, Pnew, EventN)
            Dragvalnew = drag(CD, Sarea, DynamPnew)
            Dmassdt = mdot(Vacuumthrust, gstand, Visp1, Visp2, Visp3, EventN)
            flightgammanew = flightpath(Vxreltemp, Vztemp, pival, QEA, EventN)
            distnew = distance(alttemp, range1temp)
            wtruenew = truewind(alttemp, altchecker, winddataarray, Launcher)
            corrnew = corrected3dofwind(alttemp, PYWavenumber, tablearray, altchecker, EventN, Launcher)
            wsim = simwind(wtruenew, corrnew)
            
            '=====>>>>
            flightangletemp = flightgammanew
            If phasetest(2, 1) = True Then
                If EventN = 4 Then
                    If flightgammanew < 0 Then '(distA <= 4.9 * 16.7548) Then
                        flightangletemp = pival / 4 - flightangleAini / 2
                        tAini = ttemp
                        VzAini = Vztemp
                        VxAini = Vztemp
                        XAini = range1temp
                        ZAini = alttemp
                    Else
                        distA = ((range1temp - XAini + VxAini * (ttemp - tAini)) ^ 2 + (alttemp - ZAini + VzAini * (ttemp - tAini)) ^ 2) ^ (1 / 2)
                        If (distA <= 16.7548) Then
                            flightangletemp = pival / 4 - flightangleAini / 2
                        End If
                    End If
                End If
            End If
            '=====>>>>
        
            ax = accelx(QEA, flightangletemp, thrustforcenew, Dragvalnew, masstemp, gravity, EventN)
            az = accelz(QEA, flightangletemp, thrustforcenew, Dragvalnew, masstemp, gravity, EventN)
            
            'Calculate the delta variables for state vector
            Dmass(j) = dmass1(dt, Dmassdt, EventN)
            Dalt(j) = deltaaltitude(Vztemp, dt)
            Dvz(j) = az * dt
            Dvx(j) = ax * dt
            Dvxrel(j) = ax * dt
            Drange1(j) = Vxtemp * dt
            Dvwsim(j) = simwind(wtruenew, corrnew)
          
        Next j
        
        'Calculate state vector variables at time n+1
        timenew = WorksheetFunction.RoundDown(timeold + dt, 4)
        altnew = altold + (1 / 6) * (Dalt(1) + 2 * Dalt(2) + 2 * Dalt(3) + Dalt(4))
        Vznew = Vzold + (1 / 6) * (Dvz(1) + 2 * Dvz(2) + 2 * Dvz(3) + Dvz(4))
        Vxnew = Vxnew + (1 / 6) * (Dvx(1) + 2 * Dvx(2) + 2 * Dvx(3) + Dvx(4))
        wsimnew = wsim + (1 / 6) * (Dvwsim(1) + 2 * Dvwsim(2) + 2 * Dvwsim(3) + Dvwsim(4))
        Vxrelnew = Vxnew - wsimnew
        range1new = range1new + (1 / 6) * (Drange1(1) + 2 * Drange1(2) + 2 * Drange1(3) + Drange1(4))
        
        'Check n+1 phase based on new values
        Select Case EventN
            Case 3, 4, 7, 10
                massnew = massnew + (1 / 6) * (Dmass(1) + 2 * Dmass(2) + 2 * Dmass(3) + Dmass(4))
            Case Else
                massnew = massR(EventN, 1)
        End Select
        
        EventN = nextevent(timenew, EventN, tstart, distnew, NewSimLauncherL, phasetest)
    End If
    
    If timenew > timeend Then
        GoTo endloopprint
    End If

Loop

endloopprint:

solution.Cells(9, 39) = qmax1 ' Qmax Stage 1, psf
solution.Cells(9, 40) = t1qmax ' Time to Qmax Stage 1, s
solution.Cells(9, 41) = machmax1 ' Machmax Stage 1
solution.Cells(9, 42) = t1machmax ' Time to Machmax Stage 1,s
solution.Cells(9, 43) = qmax2 ' Qmax Stage 2, psf
solution.Cells(9, 44) = t2qmax ' Time to Qmax Stage 2, s
solution.Cells(9, 45) = machmax2 ' Machmax Stage 2
solution.Cells(9, 46) = t2machmax ' Time to Machmax Stage 3,s
solution.Cells(9, 47) = qmax3 ' Qmax Stage 3, psf
solution.Cells(9, 48) = t3qmax ' Time to Qmax Stage 3, s
solution.Cells(9, 49) = machmax3 ' Machmax Stage 3
solution.Cells(9, 50) = t3machmax ' Time to Machmax Stage 3,s

Call CreateCharts
Worksheets("inputsheet").Activate
Range("A550").Select
MsgBox "The simulation has finished. Go to solution tab sheet for results."

End Sub

Sub Clear_SkyAeroData()

inputsheet.Range("B546:B550").Clear
inputsheet.Range("d547").Clear
solution.Range("a4:ax4").Clear
solution.Range("al9:ax9").Clear
solution.Range("a5:ai65536").Clear
solution.Range("aj6:al65536").Clear

'Remove Charts
Application.DisplayAlerts = False
On Error Resume Next
Sheets("Altitude vs. time").Delete
Sheets("Range vs. time").Delete
Sheets("Flight Angle").Delete
Sheets("Wind Profile").Delete
Sheets("Mach vs. time").Delete
Sheets("Weight vs. time").Delete
Sheets("Dyn.Press vs. time").Delete
Sheets("Vz vs. time").Delete
Sheets("Vx vs. time").Delete
Sheets("accel vs. time").Delete
Sheets("Thrust vs. time").Delete
Sheets("Drag vs. time").Delete
Sheets("Velocity vs. time").Delete
Application.DisplayAlerts = True
On Error GoTo 0

End Sub

Sub GenWindProfile()

Dim degPrad As Double
Dim knot2fts As Double
degPrad = 57.3  'deg per rad
knot2fts = 1.68778  'knot per ft/s

Sheets("inputsheet").Select

WindAlt = inputsheet.Range("g21:g62") 'wind effects Alt.
WAsize = UBound(WindAlt) - LBound(WindAlt) + 1

Dim trajazimuth As Double
trajazimuth = inputsheet.Range("G17") / degPrad 'trajectory azimuth angle, radians
Dim WindNoE As Variant
WindNoE = Range("G18")   'in-plane pr cross-plane (formerly Northerly or Easterly Wind,)

'======== Body Profile Data ========
Dim TEMP123 As Boolean
Dim jj As Integer
Dim nrowNS As Integer
Dim nrowEW As Integer
Dim NSWind() As Variant
Dim EWWind() As Variant
Dim NSAlt() As Variant
Dim EWAlt() As Variant
Dim myVar As Double

Range("M21").Select
nrowNS = rowcount()
Range("N21").Select
nrowEW = rowcount()

For jj = 1 To 4
    Select Case jj
    Case 1
        Range("L21").Select
        NSAlt = arrayoutput(nrowNS)
    Case 2
        Range("L21").Select
        EWAlt = arrayoutput(nrowEW)
    Case 3
        Range("M21").Select
        NSWind = arrayoutput(nrowNS)
    Case 4
        Range("N21").Select
        EWWind = arrayoutput(nrowEW)
    End Select
Next jj

Dim AltWind As Double
Dim WindVelocity As Double
Dim WindNS As Double
Dim WindEW As Double

Dim ii As Integer
For ii = 1 To WAsize
AltWind = inputsheet.Cells(20 + ii, 7)

WindNS = windprofileinterp(AltWind, NSAlt, NSWind)
WindEW = windprofileinterp(AltWind, EWAlt, EWWind)

WindVelocity = 0
inputsheet.Cells(20 + ii, 8) = WindVelocityCal(WindNoE, WindNS, WindEW, trajazimuth, WindVelocity)

Next ii
Range("F21").Select
MsgBox "The wind profile is generated"

End Sub


Sub Clear_WindProfile()
inputsheet.Range("h21:h62").Clear

End Sub



Sub printSkyAero(time As Double, deltaT As Variant, icount As Long, EventN As Integer, _
    MSLalt As Double, alt As Double, P As Double, Vrel As Double, Mach As Double, _
    range1 As Double, Vz As Double, Vx As Double, Vxrel As Double, mass As Double, _
    gstand As Double, dist As Double, flightgamma As Double, radangle As Double, _
    gs As Double, thrustforce As Double, dragval As Double, DynamP As Double, _
    corr As Double, wtrue As Double, wsim As Double)
    solution.Cells(4 + icount, 1) = time
    solution.Cells(4 + icount, 2) = stagename(EventN)
    solution.Cells(4 + icount, 3) = eventname(EventN)
    solution.Cells(4 + icount, 4) = printtruefalse(EventN, 1)
    solution.Cells(4 + icount, 5) = printtruefalse(EventN, 2)
    solution.Cells(4 + icount, 6) = printtruefalse(EventN, 3)
    solution.Cells(4 + icount, 7) = printtruefalse(EventN, 4)
    solution.Cells(4 + icount, 8) = printtruefalse(EventN, 5)
    solution.Cells(4 + icount, 9) = printtruefalse(EventN, 6)
    solution.Cells(4 + icount, 10) = printtruefalse(EventN, 7)
    solution.Cells(4 + icount, 11) = printtruefalse(EventN, 8)
    solution.Cells(4 + icount, 12) = printtruefalse(EventN, 9)
    solution.Cells(4 + icount, 13) = printtruefalse(EventN, 10)
    solution.Cells(4 + icount, 14) = printtruefalse(EventN, 11)
    solution.Cells(4 + icount, 15) = printtruefalse(EventN, 12)
    solution.Cells(4 + icount, 16) = printtruefalse(EventN, 13)
    
    solution.Cells(4 + icount, 17) = alt
    solution.Cells(4 + icount, 18) = alt + MSLalt
    solution.Cells(4 + icount, 19) = P
    solution.Cells(4 + icount, 20) = Vrel
    solution.Cells(4 + icount, 21) = Mach
    solution.Cells(4 + icount, 22) = range1
    solution.Cells(4 + icount, 23) = Vz
    solution.Cells(4 + icount, 24) = Vx
    solution.Cells(4 + icount, 25) = Vxrel
    solution.Cells(4 + icount, 26) = mass * gstand
    solution.Cells(4 + icount, 27) = dist
    solution.Cells(4 + icount, 28) = flightgamma / radangle
    solution.Cells(4 + icount, 29) = gs
    solution.Cells(4 + icount, 30) = thrustforce
    solution.Cells(4 + icount, 31) = dragval
    solution.Cells(4 + icount, 32) = DynamP
    solution.Cells(4 + icount, 33) = corr
    solution.Cells(4 + icount, 34) = wtrue
    solution.Cells(4 + icount, 35) = wsim
       
    icount = icount + 1

End Sub

Sub CreateCharts()
Dim i As Integer
Dim RangeX As String, RangeY As String, NameInput As String, TitleInput As String
Dim Xlable As String, Ylable As String, OName As String
    For i = 1 To 13
        Select Case i
            Case 1
                OName = "launcherangles"
                RangeX = "A5:A32000"
                RangeY = "Q5:Q32000"
                NameInput = "Altitude vs. time"
                TitleInput = "Local ALtitude vs. time"
                Xlable = "Time, s"
                Ylable = "Altitude, ft"
            Case 2
                OName = NameInput
                RangeX = "V5:V32000"
                RangeY = "A5:A32000"
                NameInput = "Range vs. time"
                TitleInput = "Range vs. time"
                Xlable = "Range, ft"
                Ylable = "Time, s"
            Case 3
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "AB5:AB32000"
                NameInput = "Flight Angle"
                TitleInput = "Flight Angle"
                Xlable = "Time, s"
                Ylable = "Flight Path Angle, degrees"
            Case 4
                OName = NameInput
                RangeX = "Q5:Q32000"
                RangeY = "AH5:AH32000"
                NameInput = "Wind Profile"
                TitleInput = inputsheet.Range("H20") & " vs. time"
                Xlable = "Altitude, ft"
                Ylable = "True Wind Speed, ft/s"
            Case 5
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "U5:U32000"
                NameInput = "Mach vs. time"
                TitleInput = "Mach vs. time"
                Xlable = "Time, s"
                Ylable = "Mach No."
            Case 6
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "Z5:Z32000"
                NameInput = "Weight vs. time"
                TitleInput = "Weight vs. time"
                Xlable = "Time, s"
                Ylable = "Weight, lbs"
            Case 7
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "AF5:AF32000"
                NameInput = "Dyn.Press vs. time"
                TitleInput = "Dynamic Pressure vs time"
                Xlable = "Time, s"
                Ylable = "P. dynamic, lb/ft^2"
            Case 8
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "W5:W32000"
                NameInput = "Vz vs. time"
                TitleInput = "Vz vs. time"
                Xlable = "Time, s"
                Ylable = "Vz, ft/s"
            Case 9
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "X5:X32000"
                NameInput = "Vx vs. time"
                TitleInput = "Vx vs. time"
                Xlable = "Time, s"
                Ylable = "Vx, ft/s"
            Case 10
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "AC5:AC32000"
                NameInput = "accel vs. time"
                TitleInput = "Acceleration in Z vs. time (drogue and main chutes are present)"
                Xlable = "Time, s"
                Ylable = "g's"
            Case 11
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "AD5:AD32000"
                NameInput = "Thrust vs. time"
                TitleInput = "Thrust vs. time"
                Xlable = "Time, s"
                Ylable = "Thrust, lbs"
            Case 12
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "AE5:AE32000"
                NameInput = "Drag vs. time"
                TitleInput = "Drag vs. time (main and drogue chute present)"
                Xlable = "Time, s"
                Ylable = "Drag, lbs"
            Case 13
                OName = NameInput
                RangeX = "A5:A32000"
                RangeY = "T5:T32000"
                NameInput = "Velocity vs. time"
                TitleInput = "Velocity vs. time"
                Xlable = "Time, s"
                Ylable = "Velocity, ft/s"
        End Select
        Call AddChartSheets(RangeX, RangeY, NameInput, TitleInput, Xlable, Ylable, OName, i)
    Next i
    
End Sub

Sub AddChartSheets(RangeX As String, RangeY As String, NameInput As String, TitleInput As String, _
    Xlable As String, Ylable As String, OName As String, Ctype As Integer)
    Dim chtChart As Chart
    'Create a new chart.
    Set chtChart = Charts.Add(after:=ActiveWorkbook.Sheets(OName))

    With chtChart
        .Name = NameInput
        'Link to the source data range.
'        get source data 1
'        .SetSourceData Source:=Sheets("solution").Range(RangeY), _
'            PlotBy:=xlColumns
'        get source data 2
'        .SeriesCollection.NewSeries
'        .SeriesCollection(1).XValues = "=solution!" & RangeX
'        .SeriesCollection(1).Values = "=solution!" & RangeY
'        get source data 3
        .SeriesCollection.NewSeries
        .SeriesCollection(1).XValues = Sheets("solution").Range(RangeX)
        .SeriesCollection(1).Values = Sheets("solution").Range(RangeY)
        
        If Ctype = 6 Then
            .ChartType = xlXYScatter ' xlXYScatterSmoothNoMarkers 'xlXYScatterLinesNoMarkers
            .SeriesCollection(1).MarkerSize = 4
        Else
            .ChartType = xlXYScatterSmoothNoMarkers 'xlXYScatterLinesNoMarkers
            .SeriesCollection(1).Border.Weight = xlThick
        End If
        
        .HasTitle = True
        .ChartTitle.Text = TitleInput
        .Axes(xlCategory, xlPrimary).HasTitle = True
        .Axes(xlCategory, xlPrimary).AxisTitle.Characters.Text = Xlable
        .Axes(xlValue, xlPrimary).HasTitle = True
        .Axes(xlValue, xlPrimary).AxisTitle.Characters.Text = Ylable
        'Formatting
'        .Axes(xlCategory).HasMinorGridlines = False
'        .Axes(xlValue).HasMajorGridlines = True
'        .Axes(xlValue).HasMinorGridlines = False
        .HasLegend = False
    End With
End Sub

-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO SKYAERO_Functions.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/SKYAERO7.6.2.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SKYAERO_Functions'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'############################### SKYAERO_Functions #############################
'#                        == Do not remove this notice ==                      #
'#-----------------------------------------------------------------------------#
'#  Program:        SKYAERO                                                    #
'#  Module name     SKYAERO_Functions                                          #
'#  Version         7.6 beta                                                   #
'#  Developed by    Charley Hoult, Armando Fuentes, Michael G. Tong, Hien Tran #
'#-----------------------------------------------------------------------------#
'#                                                                             #
'#  Info. go here                                                              #
'#                                                                             #
'###############################################################################
Function accelx(QEA As Double, flightangle As Double, thrust As Double, _
        drag As Double, mass As Double, gravity As Double, EventN As Integer)
    
    Dim angle As Double
    
    angle = flightangle
    If EventN = 3 Then 'Launcher
        angle = QEA
    End If
    
    Select Case EventN
        Case 1, 2, 5, 6, 8, 9, 11 To 13
            accelx = -(drag / mass) * Cos(angle)
        Case 3
            If thrust / mass < gravity * Sin(angle) Then
                accelx = 0
            ElseIf thrust / mass >= gravity * Sin(angle) Then
                accelx = (thrust / mass - drag / mass - gravity * Sin(angle)) * Cos(angle)
            End If
        Case 4, 7, 10
            accelx = (thrust / mass - drag / mass) * Cos(angle)
    End Select
End Function


Function accelz(QEA As Double, flightangle As Double, thrust As Double, _
        drag As Double, mass As Double, gravity As Double, EventN As Integer)
    
    Dim angle As Double
    angle = flightangle
    If EventN = 3 Then 'Launcher
        angle = QEA
    End If
    
    Select Case EventN
        Case 1, 2, 5, 6, 8, 9, 11 To 13
            accelz = -(drag / mass) * Sin(angle) - gravity
        Case 3
            If thrust / mass < gravity * Sin(angle) Then
                accelz = 0
            ElseIf thrust / mass >= gravity * Sin(angle) Then
                accelz = (thrust / mass - drag / mass - gravity * Sin(angle)) * Sin(angle)
            End If
        Case 4, 7, 10
            accelz = (thrust / mass - drag / mass) * Sin(angle) - gravity
    End Select
End Function


Function corrected3dofwind(alt As Double, PYWavenumber As Double, tablearray, altDif As Double, _
        EventN As Integer, Launcher As Boolean)
    If Launcher = False Then
        altW = alt - altDif
    Else
        altW = alt
    End If
    
    If altW <= 0 Then
        altW = 0
    End If
    
    corrected3dofwind = 1
    Select Case EventN
        Case 3
            corrected3dofwind = 0
        Case 4, 7, 10
            corrected3dofwind = WorksheetFunction.VLookup(PYWavenumber * (altW), tablearray, 2, True) _
                + WorksheetFunction.VLookup(PYWavenumber * (altW), tablearray, 3, True) * (PYWavenumber * (altW) _
                - WorksheetFunction.VLookup(PYWavenumber * (altW), tablearray, 1, True))
    End Select
End Function


Function density(pressure As Double, Temperature As Double, TempSL As Double, _
        PressureSL As Double, DensitySL As Double)
    density = pressure * TempSL * DensitySL / (PressureSL * Temperature)
End Function


Function drag(cdvalue As Double, Sreference As Double, DynamP As Double)
    drag = cdvalue * Sreference * DynamP
End Function


Function dragcoeff(stl4 As Variant, stl5 As Variant, stl6 As Variant, _
        dragconstnoig As Double, Mach As Double, tablearraydrag1 As Range, _
        tablearraydrag2 As Range, tablearraydrag3 As Range, dragconst1 As Double, _
        dragconst2 As Double, EventN As Integer)
    
    Select Case EventN
        Case 1, 5 '1st stage Coasting Flight Launch' & '1st stage Coasting Flight'
            dragcoeff = interpfn(stl4, tablearraydrag1, Mach, 4)
        Case 2  '1st stage Coasting On Parachute'
            dragcoeff = dragconstnoig
        Case 3, 4 '1st stage Launcher' & '1st stage Powerer Free Flight'
            dragcoeff = interpfn(stl4, tablearraydrag1, Mach, 2)
        Case 6, 8 '2nd stage Coasting Flight' & '2nd stage Coasting Flight'
            dragcoeff = interpfn(stl5, tablearraydrag2, Mach, 4)
        Case 7  '2nd stage Powerer Free Flight'
            dragcoeff = interpfn(stl5, tablearraydrag2, Mach, 2)
        Case 9, 11 '3rd stage Coasting Flight' & '3rd stage Coasting Flight'
            dragcoeff = interpfn(stl6, tablearraydrag3, Mach, 4)
        Case 10 '3rd stage Powerer Free Flight'
            dragcoeff = interpfn(stl6, tablearraydrag3, Mach, 2)
        Case 12 'Coasting On Drogue Parachute'
            dragcoeff = dragconst1
        Case 13 'Coasting On Main Parachute'
            dragcoeff = dragconst2
    End Select
End Function


Function deltaaltitude(Vz As Double, deltaT As Double)
    deltaaltitude = Vz * deltaT
End Function


Function distance(alt As Double, range1 As Double)
    distance = ((alt) ^ 2 + range1 ^ 2) ^ (1 / 2)
End Function


Function dmass1(deltaT As Double, mflowrate As Double, EventN As Integer)

    Select Case EventN
        Case 1, 2, 5, 6, 8, 9, 11 To 13
            dmass1 = 0
        Case 3, 4, 7, 10
            dmass1 = mflowrate * deltaT
    End Select
End Function


Function DynamicPress(density As Double, Vrel As Double)
    DynamicPress = 0.5 * density * (Vrel ^ 2)
End Function


Function flightpath(Vx As Double, Vz As Double, pival As Double, _
    flightangle As Double, EventN As Integer)
    
    Select Case EventN
        Case 3
            flightpath = flightangle
        Case 1, 2, 4 To 13
            If Vx > 0 Then
                flightpath = Atn(Vz / Vx)
            ElseIf Vz >= 0 And Vx < 0 Then
                flightpath = Atn(Vz / Vx) + pival
            ElseIf Vz < 0 And Vx < 0 Then
                flightpath = Atn(Vz / Vx) - pival
            ElseIf Vz > 0 And Vx = 0 Then
                flightpath = pival / 2
            ElseIf Vz < 0 And Vx = 0 Then
                flightpath = -pival / 2
            End If
    End Select
End Function


Function grav(alt As Double, LSg As Double, LSer As Double, MSLalt As Double)
    'gravity as a function of altitude and site location'
    altG = alt + MSLalt
    grav = LSg * (LSer / (LSer + altG)) ^ 2
End Function


Function interpfn(xtl As Variant, table As Range, xval As Double, colnum As Long) As Double
    'This function interpolates between two points by first finding the relative
    'position of the desired value in a table containing multiple data points
    '------------------------------------------------------------------------------------
    'obtain number of rows and columns in input table
    'nrow = table.Rows.Count
    'ncol = table.Columns.Count
    '-------------------------------------------------------------------------------------
    'declare variables to use in function
    'ReDim xtl(1 To nrow) As Variant
    Dim lowerval As Long
    Dim upperval As Long
    Dim m As Double
    '-------------------------------------------------------------------------------------
    'generate 1d array containing x values to use later in match function
    'For i = 1 To nrow
    'xtl(i) = table(i, 1)
    'Next i
    '--------------------------------------------------------------------------------------
    'colnum = 2 'column number where we are searching for value
    lowerval = WorksheetFunction.Match(xval, xtl, 1) 'find position of lower bound
    upperval = lowerval + 1 ' position of upper bound
    y1 = table(lowerval, colnum)
    y2 = table(upperval, colnum)
    x1 = table(lowerval, 1)
    x2 = table(upperval, 1)
    dy = y2 - y1 'table(upperval, colnum) - table(lowerval, colnum)
    dx = x2 - x1 'table(upperval, 1) - table(lowerval, 1)
    m = dy / dx 'calculate slope
    interpfn = y1 + m * (xval - x1) 'find y at the desired x val
End Function


Function Mach(Vrel As Double, SOS As Double)
    Mach = (Vrel / SOS)
End Function


Function mdot(tvac As Double, gstand As Double, Visp1 As Double, Visp2 As Double, _
        Visp3 As Double, EventN As Integer)
    
    Visp = 1
    Select Case EventN
        Case 3, 4
            Visp = Visp1
        Case 7
            Visp = Visp2
        Case 10
            Visp = Visp3
    End Select
    mdot = (-tvac) / (Visp * gstand)
End Function


Function pressure(alt As Double, Temperature As Double, TropAlt As Double, _
        TropTemp As Double, TropPressure As Double, TempSL As Double, PressureSL As Double, _
        alpha As Double, LSg As Double, Rair As Double, MSLalt As Double)
    
    altP = alt + MSLalt
    
    alpha2 = 0.000549005
    T2 = TropTemp
    P2 = TropPressure * Exp(-LSg * (65616.7979 - TropAlt) / (Rair * TropTemp))
    
    If altP < TropAlt Then
        pressure = PressureSL * (TempSL / Temperature) ^ (LSg / (alpha * Rair))
    ElseIf altP > TropAlt And altP <= 65616.7979 Then
        pressure = TropPressure * Exp(-LSg * (altP - TropAlt) / (Rair * TropTemp))
    ElseIf altP > 65616.7979 And altP <= 154199 Then
        pressure = P2 * (T2 / Temperature) ^ (LSg / (alpha2 * Rair))
    End If
End Function


Function simwind(truewind As Double, corrected3dofwind As Double)
    simwind = corrected3dofwind * truewind
End Function


Function SOS(Temperature As Double, GAMMA As Double, Rair As Double) 'sound of speed function'
    SOS = (GAMMA * Rair * Temperature) ^ 0.5
End Function


Function Sref(area As Double, time As Double, tdeploychute As Variant, tau As Double, EventN)
      
    Select Case EventN
        Case 2, 12, 13 'Coasting Stabilization Parachute''Drogue Parachute''Main Parachute'
            Sref = area * (1 - Exp(-(time - tdeploychute) / tau))
        Case Else
            Sref = area
    End Select
End Function


Function Temperature(alt As Double, TropAlt As Double, TempSL As Double, alpha As Double, _
        TropTemp As Double, MSLalt As Double)
    alpha2 = 0.000549005
    T2 = TropTemp
    alpha3 = 0
    T3 = T2 + alpha2 * (104986.87664 - 65616.7979)
    
    altT = alt + MSLalt
    If altT <= TropAlt Then
        Temperature = TempSL + alpha * altT
    ElseIf altT > TropAlt And altT <= 65616.7979 Then
        Temperature = TropTemp
    ElseIf altT > 65616.7979 And altT <= 104986.87664 Then
        Temperature = T2 + alpha2 * (altT - 65616.7979)
    ElseIf altT > 104986.87664 And altT <= 10 Then
        Temperature = T3 + alpha3 * (altT - 104986.87664)
    End If
End Function


Function thrust(Thrustvac As Double, Ae1 As Double, Ae2 As Double, Ae3 As Double, _
        pressure As Double, EventN As Integer)
    
    Ae = 0
    Select Case EventN
        Case 3, 4
            Ae = Ae1
        Case 7
            Ae = Ae2
        Case 10
            Ae = Ae3
    End Select
    
    If Thrustvac > 0 Then
        thrust = Thrustvac - pressure * Ae
    Else
        thrust = 0
    End If
End Function


Function Thrustvac(stl1 As Variant, stl2 As Variant, stl3 As Variant, time As Double, _
        tablearraytvac1 As Range, tablearraytvac2 As Range, tablearraytvac3 As Range, _
        EventN As Integer)
    
    Thrustvac = 0
    Select Case EventN
        Case 3, 4
            Thrustvac = interpfn(stl1, tablearraytvac1, time, 3)
        Case 7
            Thrustvac = interpfn(stl2, tablearraytvac2, time, 3)
        Case 10
            Thrustvac = interpfn(stl3, tablearraytvac3, time, 3)
    End Select
End Function


Function truewind(alt As Double, altDif As Double, tablearray2, Launcher As Boolean)
    If Launcher = False Then
        altTW = alt - altDif
    Else
        altTW = alt
    End If
    If altTW >= 0 Then
        truewind = WorksheetFunction.VLookup((altTW), tablearray2, 2, True) + _
            WorksheetFunction.VLookup((altTW), tablearray2, 3, True) * ((altTW) - _
            WorksheetFunction.VLookup((altTW), tablearray2, 1, True))
    ElseIf altTW < 0 Then
        truewind = 0
    End If
End Function


Function Vrelative(Vz As Double, Vxrel As Double)
    Vrelative = (Vz ^ 2 + Vxrel ^ 2) ^ (1 / 2)
End Function


Function nextevent(time As Double, EventN, tstart As Variant, _
        distance As Double, simlaunchlength As Double, phasetest As Variant)
    Dim EventS As Integer
    Select Case EventN
        Case 1  '1st stage Coasting Flight Launch'
            If phasetest(2, 1) = True And time >= tstart(2, 1) Then
                EventS = 2
            ElseIf phasetest(4, 1) = True And time >= tstart(4, 1) Then
                EventS = 4
            ElseIf phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 1
            End If
        Case 2  '1st stage Coasting On Parachute'
            If phasetest(4, 1) = True And time >= tstart(4, 1) Then
                EventS = 4
            Else
                EventS = 2
            End If
        Case 3  '1st stage Launcher'
            If simlaunchlength < distance Then
                EventS = 4
            Else
                EventS = 3
            End If
        Case 4  '1st stage Powerer Free Flight'
            If phasetest(5, 1) = True And time >= tstart(5, 1) Then
                EventS = 5
            ElseIf phasetest(6, 1) = True And time >= tstart(6, 1) Then
                EventS = 6
            Else
                EventS = 4
            End If
            
        Case 5  '1st stage Coasting Flight'
            If phasetest(6, 1) = True And time >= tstart(6, 1) Then
                EventS = 6
            ElseIf phasetest(7, 1) = True And time >= tstart(7, 1) Then
                EventS = 7
            ElseIf phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 5
            End If
        Case 6  '2nd stage Coasting Flight'
            If phasetest(7, 1) = True And time >= tstart(7, 1) Then
                EventS = 7
            ElseIf phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 6
            End If
        Case 7  '2nd stage Powerer Free Flight'
            If phasetest(8, 1) = True And time >= tstart(8, 1) Then
                EventS = 8
            ElseIf phasetest(9, 1) = True And time >= tstart(9, 1) Then
                EventS = 9
            Else
                EventS = 7
            End If
        Case 8  '2nd stage Coasting Flight'
            If phasetest(9, 1) = True And time >= tstart(9, 1) Then
                EventS = 9
            ElseIf phasetest(10, 1) = True And time >= tstart(10, 1) Then
                EventS = 10
            ElseIf phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 8
            End If
        Case 9  '3rd stage Coasting Flight'
            If phasetest(10, 1) = True And time >= tstart(10, 1) Then
                EventS = 10
            ElseIf phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 9
            End If
        Case 10 '3rd stage Powerer Free Flight'
            If phasetest(11, 1) = True And time >= tstart(11, 1) Then
                EventS = 11
            Else
                EventS = 10
            End If
        Case 11 '3rd stage Coasting Flight'
            If phasetest(12, 1) = True And time >= tstart(12, 1) Then
                EventS = 12
            ElseIf phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 11
            End If
        Case 12 'Coasting On Drogue Parachute'
            If phasetest(13, 1) = True And time >= tstart(13, 1) Then
                EventS = 13
            Else
                EventS = 12
            End If
        Case 13
            EventS = 13
    End Select
    nextevent = EventS
End Function

Function endtime(tend As Variant, phasetest As Variant)
    If phasetest(13, 1) = True Then
        finishedtime = tend(13, 1)
        GoTo timeis
    ElseIf phasetest(12, 1) = True Then
        finishedtime = tend(12, 1)
        GoTo timeis
    ElseIf phasetest(11, 1) = True Then
        finishedtime = tend(11, 1)
        GoTo timeis
    ElseIf phasetest(9, 1) = True Then
        finishedtime = tend(9, 1)
        GoTo timeis
    ElseIf phasetest(8, 1) = True Then
        finishedtime = tend(8, 1)
        GoTo timeis
    ElseIf phasetest(6, 1) = True Then
        finishedtime = tend(6, 1)
        GoTo timeis
    ElseIf phasetest(5, 1) = True Then
        finishedtime = tend(5, 1)
        GoTo timeis
    ElseIf phasetest(2, 1) = True Then
        finishedtime = tend(2, 1)
        GoTo timeis
    ElseIf phasetest(1, 1) = True Then
        finishedtime = tend(1, 1)
        GoTo timeis
    End If
timeis:
    endtime = finishedtime
End Function

Function stagename(EventN As Integer) As String
    Select Case EventN
        Case 1  '1st stage Coasting Flight Launch'
            stagename = "Coasting Flight Launch"

        Case 2  '1st stage Coasting Stabilization Parachute'
            stagename = "Stabilization Parachute"
            
        Case 3  '1st stage Launcher'
            stagename = "Launcher"

        Case 4, 5 '1st stage Powered Free Flight''Coasting Flight'
            stagename = "1st Stage"
            
        Case 6, 7, 8 '2nd stage Coasting Flight''Powered Free Flight''Coasting Flight'
            stagename = "2nd Stage"
            
        Case 9, 10, 11 '3rd stage Coasting Flight''Powered Free Flight''Coasting Flight'
            stagename = "3rd Stage"

        Case 12 'Coasting On Drogue Parachute'
            stagename = "Drogue"
            
        Case 13 'Coasting On Main Parachute'
            stagename = "Main"
    End Select
End Function


Function eventname(EventN As Integer) As String
    Select Case EventN
        Case 1, 5, 6, 8, 9, 11 '1st stage Coasting Flight Launch''1st stage' _
            '2nd stage''3rd staget'
            eventname = "Coasting Flight"

        Case 2, 12, 13 'Coasting On Stabilization Parachute''Drogue Parachute''Main Parachute'
            eventname = "Parachute"
            
        Case 3  '1st stage Launcher'
            eventname = "Powered Flight on Launch Rail"

        Case 4, 7, 10 '1st stage Powered Free Flight''2nd stage''3rd stage'
            eventname = "Powered Free Flight"
            
    End Select
End Function


Function printtruefalse(EventN As Integer, phase As Integer) As String
    If (EventN = phase) Then
        printtruefalse = True
    Else
        printtruefalse = False
    End If
End Function

Function NewSimLauncherLength(Vxinit As Double, Vzinit As Double, LauncherLength As Double, time As Double, QE As Double)

Dim flightangleinit As Double
Dim Vinit As Double
If Vxinit > 0 Then
    flightangleinit = Atn(Vzinit / Vxinit)
ElseIf Vzinit >= 0 And Vxinit < 0 Then
    flightangleinit = Atn(Vzinit / Vxinit) + pival
ElseIf Vzinit < 0 And Vxinit < 0 Then
    flightangleinit = Atn(Vzinit / Vxinit) - pival
ElseIf Vzinit > 0 And Vxinit = 0 Then
    flightangleinit = pival / 2
ElseIf Vzinit < 0 And Vxinit = 0 Then
    flightangleinit = -pival / 2
End If

Vinit = (Vzinit ^ 2 + Vxinit ^ 2) ^ (1 / 2)

NewSimLauncherLength = LauncherLength + Vinit * time * Cos(QE - flightangleinit)

End Function

Function DistanceTraveledonLauncher(AltDTL As Double, RangeDTL As Double, Vxinit As Double, Vzinit As Double, time As Double)

DistanceTraveledonLauncher = ((AltDTL - Vzinit * time) ^ 2 + (RangeDTL - Vxinit * time) ^ 2) ^ (1 / 2)
End Function
-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     18 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  inputshee
' 0085     16 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  solutio
' 0085     22 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  launcherangle
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet

