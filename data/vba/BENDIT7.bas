olevba 0.60.2 on Python 3.14.7 - http://decalage.info/python/oletools
===============================================================================
FILE: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls
Type: OLE
-------------------------------------------------------------------------------
VBA MACRO InputDataBendit.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/InputDataBendit'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO BenditSolution.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/BenditSolution'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO UserForm1.frm 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/UserForm1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Module1.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Module1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO FunctionsModule.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/FunctionsModule'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'################################ BENDIT 7 ##############################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        BENDIT                                              #
'#  Module name     FunctionsModule                                     #
'#  Version         7_alpha                                             #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################

'===================================
'============ Sub Main() ===========
'===================================

Function bodyprofile(TEMP123 As Boolean)
'========================================================================
'\                         Function bodyprofile() ==                    /
'\                                                                      /
'\   Add 06/25/2013                                                     /
'\   This function is to read in the table of Body Profile Data         /
'\ (Finless). The function is to input a column till the cell is empty. /
'\ The it will output that column to the variable define in Sub Main(). /
'\ The code in Sub Main() will create the five columns below:           /
'\     - xi, Element aft face body station, inches from nose tip, in    /
'\     - Ri, Element body external radius at body station xi, in        /
'\     - wi, Element weight (finless), lb                               /
'\     - Element CNai (finless), per radian                             /
'\     - Element Xcpi, (finless) from element front, in                 /
'\                                                                      /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    TEMP123 = True/False to stop the input loop                       /
'\                                                                      /
'\  Output:                                                             /
'\    bodyprofile = output column                                       /
'\                                                                      /
'========================================================================

Dim ii As Integer
Dim Val1() As Variant
Dim myVar As Double
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
bodyprofile = Val1
End Function
'-------------------------------------------------------------------------

Function xcm(cr As Double, ct As Double, gamma As Double, B As Double)
'========================================================================
'\                            == Function xcm() ==                      /
'\                                                                      /
'\   This function is for XCM, Fin center of mass from the the root     /
'\ chord LE, ft                                                         /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    d2r = degree to radian                                            /
'\    B = Exposed semispan                                         /
'\    cr = root fin chord                                          /
'\    ct = tip fin chord                                            /
'\    gamma = leading edge sweep angle, degrees                         /
'\                                                                      /
'\  Output:                                                             /
'\    xcm = Fin center of mass from the the root chord LE           /
'\                                                                      /
'========================================================================

xcm = 2 * ((cr ^ 2 - cr * (cr - ct) + (1 / 3) * (cr - ct) ^ 2) / 2 + _
    cr * B * (Tan(gamma * d2r) / 2) - _
    B * (cr - ct) * (Tan(gamma * d2r) / 3)) / ((cr + ct))
End Function
'-------------------------------------------------------------------------

Function ycm(cr As Double, ct As Double, B As Double)
'========================================================================
'\                            == Function ycm() ==                      /
'\                                                                      /
'\   This function is for YCM, Fin center of mass from the the root     /
'\ chord LE, ft                                                         /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    B = Exposed semispan                                        /
'\    cr = root fin chord                                           /
'\    ct = tip fin chord                                           /
'\                                                                      /
'\  Output:                                                             /
'\    ycm = Fin center of mass from the the root chord LE         /
'\                                                                      /
'========================================================================

ycm = 2 * B * (cr / 6 + ct / 3) / (cr + ct)

End Function
'-------------------------------------------------------------------------

Function Afinpanel(B As Double, cr As Double, ct As Double)
'========================================================================
'\                        == Function Afinpanel() ==                    /
'\                                                                      /
'\   This function is for Fin panel area, ft^2                          /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    B = exposed semispan                                          /
'\    cr = fin root chord                                           /
'\    ct = fin tip chord                                          /
'\                                                                      /
'\  Output:                                                             /
'\    Afinpanel = fin panel area                                  /
'\                                                                      /
'========================================================================

Afinpanel = B * (cr + ct) / 2
End Function
'-------------------------------------------------------------------------

Function mufin(fpw As Double, FPA As Double)
'========================================================================
'\                            == Function mufin() ==                    /
'\                                                                      /
'\   This function is for Fin mu, sl/ft^2                               /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    fpw = fin panel weight, lbs                                       /
'\    fpa = fin panel area, ft^2                                        /
'\                                                                      /
'\  Output:                                                             /
'\    mufin = Fin mu, sl/ft^2                                           /
'\                                                                      /
'========================================================================

mufin = fpw / (FPA * gstand)
End Function
'-------------------------------------------------------------------------

Function Jofn(cr As Double, ct As Double, mu As Double, gamma As Double, B As Double)
'========================================================================
'\                            == Function Jofn() ==                     /
'\                                                                      /
'\   This function is for Fin MOI parallel 2 Bending Moment vector,     /
'\ sl-ft^2, Jo                                                          /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    Mu = fin mu, sl/ft^2                                              /
'\    B = exposed semispan                                         /
'\    cr = fin root chord                                           /
'\    ct = fin tip chord                                            /
'\    gamma = leading edge sweep angle, degrees                         /
'\    d2r = degree to radian                                            /
'\                                                                      /
'\  Output:                                                             /
'\    Jofn = Fin Moment of Inertia parallel to bending vector, sl-ft^2  /
'\                                                                      /
'========================================================================

Jofn = mu * B * ((cr + 3 * ct) * (B ^ 2) * (Tan(gamma * d2r) ^ 2) + _
    B * Tan(gamma * d2r) * (cr ^ 2 + 2 * cr * ct + 3 * ct ^ 2) + _
    cr ^ 3 + cr ^ 2 * ct + ct ^ 2 * cr + ct ^ 3) / 12
End Function
'-------------------------------------------------------------------------

Function J1fn(cr As Double, ct As Double, mu As Double, gamma As Double, B As Double)
'========================================================================
'\                            == Function J1fn() ==                     /
'\                                                                      /
'\   This function is for Fin MOI normal 2 Bending Moment vector,       /
'\ sl-ft^2, J1                                                          /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    Mu = fin mu, sl/ft^2                                              /
'\    B = exposed semispan                                          /
'\    cr = fin root chord                                           /
'\    ct = fin tip chord                                            /
'\    gamma = leading edge sweep angle, degrees                         /
'\    d2r = degree to radian                                            /
'\                                                                      /
'\  Output:                                                             /
'\    J1fn = Fin Moment of Inertia normal to bending vector, sl-ft^2    /
'\                                                                      /
'========================================================================

J1fn = mu * B * ((cr ^ 3 + cr ^ 2 * ct + ct ^ 2 * cr + ct ^ 3) + _
    (B ^ 2) * (cr + 3 * ct) * (Cos(gamma * d2r)) ^ (-2) + _
    B * (cr ^ 2 + 2 * cr * ct + 3 * ct ^ 2) * Tan(gamma * d2r)) / 12
End Function
'-------------------------------------------------------------------------

Function masselement(element As Integer, mfinless As Double, fspar1 As Integer, _
    fspar2 As Integer, fpw1 As Double, fpw2 As Double)
'========================================================================
'\                         == Function masselement() ==                 /
'\                                                                      /
'\   This function is for Element mass, sl                              /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    element = Element Counter                                         /
'\    mfinless = Element mass (finless), sl                             /
'\    fspar1 = fin spar attachment element in section 1                 /
'\    fspar2 = fin spar attachment element in section 2                 /
'\    fpw1 = fin panel weight for first section fins, lb                /
'\    fpw2 = fin panel weight for second section fins, lb               /
'\                                                                      /
'\  Output:                                                             /
'\    masselement = Element mass, sl                                    /
'\                                                                      /
'========================================================================

masselement = mfinless
If element = fspar1 Then
    masselement = mfinless + Nf * fpw1 / gstand
ElseIf StagesNo = 2 And element = fspar2 Then
    masselement = mfinless + Nf * fpw2 / gstand
End If
End Function
'-------------------------------------------------------------------------

Function ki(R1 As Double, R2 As Double)
'========================================================================
'\                             == Function ki() ==                      /
'\                                                                      /
'\   This function is for ki                                            /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    r1 = previous element body external radius                    /
'\    r2 = element body external radius                             /
'\                                                                      /
'\  Output:                                                             /
'\    ki                                                                /
'\                                                                      /
'========================================================================

Dim z As Double
'z=smaller/bigger  (radius)
If R1 < R2 Then
z = R1 / R2
ki = (1 + 2 * z + 3 * (z) ^ 2) / (4 * (1 + z + (z) ^ 2))
Else
z = R2 / R1
ki = (1 + 2 * z + 3 * (z) ^ 2) / (4 * (1 + z + (z) ^ 2))
End If
End Function
'-------------------------------------------------------------------------

Function xcgfinless1(x1 As Double, R1 As Double, R2 As Double, li0 As Variant, ki0 As Double)
'========================================================================
'\                         == Function xcgfinless1() ==                 /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    x1 = previous Element Aft Body Station from Nose Tip         /
'\    r1 = previous element body external radius                    /
'\    r2 = element body external radius                            /
'\    li = element length, ft                                           /
'\    ki                                                                /
'\                                                                      /
'\  Output:                                                             /
'\    xcgfinless1 =  Element center of mass (finless) from nose tip, ft /
'\                                                                      /
'========================================================================

If R2 < R1 Then
xcgfinless1 = x1 + li0 * ki0
Else
xcgfinless1 = x1 + li0 * (1 - ki0)
End If

End Function
'-------------------------------------------------------------------------

Function Xcgfn(element As Integer, xcgifinless As Double, finspar1 As Integer, _
    finspar2 As Integer, wfinpanel1 As Double, wfinpanel2 As Double, _
    xcm1 As Double, xcm2 As Double, xF1 As Double, xF2 As Double, _
    wi As Double)
'========================================================================
'\                            == Function Xcgfn() ==                    /
'\                                                                      /
'\   This function is for Element center of mass (finless) from nose    /
'\ tip, ft                                                              /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    element = Element Counter                                         /
'\    xcgfinless1 =  Element center of mass (finless) from nose tip, ft /
'\    finspar1 = fin spar attachment element in section 1               /
'\    finspar2 = fin spar attachment element in section 2               /
'\    wfinpanel1 = fin panel weight for first section fins, lb          /
'\    wfinpanel2 = fin panel weight for second section fins, lb         /
'\    xcm1 = Fin center of mass from the root chord LE section 1, ft    /
'\    xcm2 = Fin center of mass from the root chord LE section 2, ft    /
'\    xF1 = Root Chord LE Body Station first fin section            /
'\    xF2 = Root Chord LE Body Station second fin section           /
'\    wi = Element weight (finless), lb                                 /
'\                                                                      /
'\  Output:                                                             /
'\    Xcgfn = Element center of mass from nose tip, ft                  /
'\                                                                      /
'========================================================================

If finspar1 = element Then
Xcgfn = (wi * xcgifinless + Nf * wfinpanel1 * (xcm1 + xF1)) / (wi + Nf * wfinpanel1)
ElseIf finspar2 = element And StagesNo = 2 Then
Xcgfn = (wi * xcgifinless + Nf * wfinpanel2 * (xcm2 + xF2)) / (wi + Nf * wfinpanel2)
Else
Xcgfn = xcgifinless
End If
End Function
'-------------------------------------------------------------------------

Function Mw(mi As Variant, xcgi As Variant)
'========================================================================
'\                             == Function Mw() ==                      /
'\                                                                      /
'\   This function is for Body Station weight moment, lb-in             /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    mass = Element mass, sl                                           /
'\    Xcgfn = Element center of mass from nose tip, ft                  /
'\                                                                      /
'\  Output:                                                             /
'\    Mw = Body Station weight moment, lb-ft                            /
'\                                                                      /
'========================================================================

Mw = gstand * xcgi * mi
End Function
'-------------------------------------------------------------------------

Function Jifinlessfn(mifinless As Double, li As Variant, ravg As Double)
'========================================================================
'\                        == Function Jifinlessfn() ==                  /
'\                                                                      /
'\   This function is for Element moment of inertia (finless), sl-ft^2  /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    mifinless = element mass assuming no fins present, sl             /
'\    li = element length, ft                                           /
'\    ravg = average element radius, ft                                 /
'\                                                                      /
'\  Output:                                                             /
'\    Jifinlessfn = Element moment of inertia (finless), sl-ft^2        /
'\                                                                      /
'========================================================================

Jifinlessfn = mifinless * (li ^ 2 + 3 * ravg ^ 2) / 12
End Function
'-------------------------------------------------------------------------

Function Jifn(element As Integer, mifinless As Double, Jifinless As Double, _
    finspar1 As Integer, finspar2 As Integer, xcgi As Variant, _
    xcgifinless As Double, Jo1 As Double, Jo2 As Double, _
    J11 As Double, J12 As Double, fpw1 As Double, fpw2 As Double, _
    xF1 As Double, xF2 As Double, xcm1 As Double, xcm2 As Double, _
    ycm1 As Double, ycm2 As Double, ravg As Double)
'========================================================================
'\                            == Function Jifn() ==                     /
'\                                                                      /
'\   This function is for element moment of inertia, sl-ft^2            /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    element = Element Counter                                         /
'\    mifinless = element mass assuming no fins present, sl             /
'\    Jifinless = Element moment of inertia (finless), sl-ft^2          /
'\    finspar1 = fin spar attachment element in section 1               /
'\    finspar2 = fin spar attachment element in section 2               /
'\    xcgi = Element center of mass from nose tip, ft                   /
'\    xcgifinless =  Element center of mass (finless) from nose tip, ft /
'\    Jo1 = Fin Moment of Inertia parallel to bending vector, sl-ft^2   /
'\    Jo2 = Fin Moment of Inertia parallel to bending vector, sl-ft^2   /
'\    J11 = Fin Moment of Inertia normal to bending vector, sl-ft^2     /
'\    J12 = Fin Moment of Inertia normal to bending vector, sl-ft^2     /
'\    fpw1 = fin panel weight for first section fins, lb                /
'\    fpw2 = fin panel weight for second section fins, lb               /
'\    xF1 = Root Chord LE Body Station first fin section            /
'\    xF2 = Root Chord LE Body Station second fin section           /
'\    xcm1 = x Fin center of mass from the root chord LE section 1, ft  /
'\    xcm2 = x Fin center of mass from the root chord LE section 2, ft  /
'\    ycm1 = y Fin center of mass from the root chord LE section 1, ft  /
'\    ycm2 = y Fin center of mass from the root chord LE section 2, ft  /
'\    ravg = average element radius, ft                                 /
'\                                                                      /
'\  Output:                                                             /
'\    Ji = Element moment of inertia, sl-ft^2                           /
'\                                                                      /
'========================================================================

Jifn = Jifinless
If finspar1 = element Then
Jifn = Jifinless + mifinless * (xcgi - xcgifinless) ^ 2 + 0.5 * Nf * _
    (Jo1 + J11) + 0.5 * Nf * fpw1 / gstand * (2 * ((xF1 - xcgi + xcm1) ^ 2 - _
    xcm1 ^ 2) + (ycm1 + ravg) ^ 2 - ycm1 ^ 2)
ElseIf finspar2 = element And StagesNo = 2 Then
Jifn = Jifinless + mifinless * (xcgi - xcgifinless) ^ 2 + 0.5 * Nf * _
    (Jo2 + J12) + 0.5 * Nf * fpw2 / gstand * (2 * ((xF2 - xcgi + xcm2) ^ 2 - _
    xcm2 ^ 2) + (ycm2 + ravg) ^ 2 - ycm2 ^ 2)
End If
End Function
'-------------------------------------------------------------------------

Function cnalphai(element As Integer, finspar1 As Integer, finspar2 As Integer, _
    cnaifinless As Double, cnalphatail1 As Double, cnalphatail2 As Double)
'========================================================================
'\                          == Function cnalphai() ==                   /
'\                                                                      /
'\   This function is for Element CNai, per radian                      /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    element = Element Counter                                         /
'\    finspar1 = fin spar attachment element in section 1               /
'\    finspar2 = fin spar attachment element in section 2               /
'\    cnaifinless = element CNalphai finless, per radian                /
'\    cnalphatail1 = tail assembly cn alpha in section 1,  per radian   /
'\    cnalphatail2 = tail assembly cn alpha in section 2,  per radian   /
'\                                                                      /
'\  Output:                                                             /
'\    cnalphai = Element CNai, per radian                               /
'\                                                                      /
'========================================================================

cnalphai = cnaifinless
If element = finspar1 Then
cnalphai = cnaifinless + cnalphatail1
ElseIf element = finspar2 And StagesNo = 2 Then
cnalphai = cnaifinless + cnalphatail2
End If

End Function
'-------------------------------------------------------------------------

Function xcpifn(element As Integer, xcpifinless As Double, CNai As Variant, _
    xim1 As Double, xcpassy1 As Double, xcpassy2 As Double, _
    finspar1 As Integer, finspar2 As Integer, cnaifinless As Double, _
    cnalphatail1 As Double, cnalphatail2 As Double, xF1 As Double, _
    xF2 As Double)
'========================================================================
'\                           == Function xcpifn() ==                    /
'\                                                                      /
'\   This function is for Element Xcpi, from nose tip, in               /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    element = Element Counter                                         /
'\    xcpifinless =  Element Xcpi, (finless) from element front     /
'\    cnai = Element CNai, per radian                                   /
'\    xim1 = previous Element Aft Body Station from Nose Tip        /
'\    xcpassy1 = Fin ass'y Xcp, from the root chord LE              /
'\    xcpassy2 = Fin ass'y Xcp, from the root chord LE              /
'\    finspar1 = fin spar attachment element in section 1               /
'\    finspar2 = fin spar attachment element in section 2               /
'\    cnaifinless = element CNalphai finless, per radian                /
'\    cnalphatail1 = tail assembly cn alpha in section 1,  per radian   /
'\    cnalphatail2 = tail assembly cn alpha in section 2,  per radian   /
'\    xF1 = Root Chord LE Body Station first fin section           /
'\    xF2 = Root Chord LE Body Station second fin section          /
'\                                                                      /
'\  Output:                                                             /
'\    xcpifn =  Element Xcpi, from nose tip                         /
'\                                                                      /
'========================================================================

xcpifn = xcpifinless + xim1
If element = finspar1 Then
xcpifn = (cnaifinless * (xcpifinless + xim1) + (xF1 + xcpassy1) * cnalphatail1) / CNai
ElseIf element = finspar2 And StagesNo = 2 Then
xcpifn = (cnaifinless * (xcpifinless + xim1) + (xF2 + xcpassy2) * cnalphatail2) / CNai
End If

End Function
'-------------------------------------------------------------------------

Function sumfn(myarray As Variant)
'========================================================================
'\                            == Function sumfn() ==                    /
'\                                                                      /
'\   This function is to calculate the sum of the array                 /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    myarray = 1-D array                                               /
'\                                                                      /
'\  Output:                                                             /
'\    the sum of the array                                              /
'\                                                                      /
'========================================================================
'summationfunction

k = LBound(myarray)
j = UBound(myarray)
N = j - k + 1
Sum = 0

For i = 1 To N
Sum = Sum + myarray(i)
Next i
sumfn = Sum
End Function
'-------------------------------------------------------------------------

Function Iyyfn(xcg As Double, massi As Variant, xcgi As Variant, Ji As Variant)
'========================================================================
'\                            == Function Iyyfn() ==                    /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\    xcg = center of mass from nose tip                           /
'\    massi = Element mass, sl                                          /
'\    xcgi = Element center of mass from nose tip, ft                   /
'\    Ji = Element moment of inertia, sl-ft^2                           /
'\                                                                      /
'\  Output:                                                             /
'\    Iyyfn = Iyy, sl-ft2                                               /
'\                                                                      /
'========================================================================

k = LBound(massi)
L = UBound(massi)
ISum = 0

For i = k To L
Iy = Ji(i) + massi(i) * (xcg - xcgi(i)) ^ 2
ISum = ISum + Iy
Next i

Iyyfn = ISum

End Function
'-------------------------------------------------------------------------

Function lambdarf(stage As Integer, lambdap As Double, rhoSref As Double, _
    R1 As Double, R2 As Double, CLp1 As Double, CLp2 As Double, _
    CLd1 As Double, CLd2 As Double, deltafin1 As Double, deltafin2 As Double)
'========================================================================
'\                          == Function lambdarf() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'rollwavenumber need to check

If StagesNo = 2 Then
    If stage = 1 Then
        RollOp = Rollopts_01
        SCLp = CLp1 + CLp2
        Rtemp = Rref
        RollrevN = Rollrevs
        Rollwavepercent = Rollwavepercent_01
        deltaf1 = deltafin1
        deltaf2 = deltafin2
    Else
        RollOp = Rollopts_02
        SCLp = CLp2
        Rtemp = R2
        RollrevN = 0
        Rollwavepercent = Rollwavepercent_02
        deltaf1 = 0
        deltaf2 = deltafin2
    End If
Else
    RollOp = Rollopts_01
    SCLp = CLp1
    Rtemp = Rref
    RollrevN = Rollrevs
    Rollwavepercent = Rollwavepercent_01
    deltaf1 = deltafin1
    deltaf2 = 0
End If

'JJ1 = 1 + 4 * Ic / (2 * pi * rhoSref / Sref * (alt - l_length - l_alt) * Rtemp ^ 4 * SCLp)
JJ1 = (2 * pi * rhoSref / Sref * (alt - l_length - l_alt) * Rtemp ^ 4 * SCLp) / _
    (2 * pi * rhoSref / Sref * (alt - l_length - l_alt) * Rtemp ^ 4 * SCLp - Ic)

Select Case RollOp
Case 1
    k = Ic / (2 * pi * rhoSref / Sref * Rtemp ^ 4 * SCLp)
    If alt - l_length - l_alt < 0 Then
        lambdarf = 0
    Else
        lambdarf = 2 * pi * RollrevN / (alt - l_length - l_alt + k * Log((alt - l_length - l_alt - k) / -k))
    End If
Case 2
    lambdarf = Rollwavepercent * lambdap
Case 3
    lambdarf = -(CLd1 * deltaf1 + CLd2 * deltaf2) / (Rref * SCLp) * Nf * JJ1
End Select

End Function
'-------------------------------------------------------------------------

''Function lambdar0f(lambdap As Double, CLd1 As Double, CLd2 As Double, _
''    R1 As Double, R2 As Double, CLp1 As Double, CLp2 As Double, _
''    rhoSref As Double, deltafin1 As Double, deltafin2 As Double)
'''========================================================================
'''\                         == Function lambdar0f() ==                   /
'''\                                                                      /
'''\   This function is to                                                /
'''\----------------------------------------------------------------------/
'''\  Called by:                                                          /
'''\    Sub Main()                                                        /
'''\                                                                      /
'''\  Input:                                                              /
'''\                                                                      /
'''\  Output:                                                             /
'''\                                                                      /
'''\                                                                      /
'''========================================================================
'''rollwavenumber need to check
''
''Select Case Rollopts
''Case 1
''    k = Ic / (2 * pi * rhoSref / Sref * R1 ^ 4 * CLp1)
''    lambdar0f = 2 * pi * Rollrevs / (alt - l_length - l_alt + k * Log((alt - l_length - l_alt - k) / -k))
''Case 2
''    JJ1 = Ic / (2 * pi * rhoSref / Sref * (alt - l_length - l_alt) * R1 ^ 4 * (CLp1))
''    lambdar0f = (1 - JJ1) * Rollwavepercent * lambdap
''Case 3
''    lambdar0f = Abs(CLd1 / (R1 / 12 * CLp1)) * (2 * Nf / pi) ^ (1 / 2) * deltafin1
''    If StagesNo = 2 Then
''        lambdar0f = Abs((CLd1 * deltafin1 + CLd2 * deltafin2) / (Rref / 12 * (CLp1 + CLp2))) * (2 * Nf / pi) ^ (1 / 2)
''    End If
''End Select
''End Function
'''-------------------------------------------------------------------------
Function rhoSreffn()
'========================================================================
'\                          == Function rhoSreffn() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'density  Sref

rhoSreffn = 2 * q * Sref / U ^ 2

End Function
'-------------------------------------------------------------------------

Function bodyloadm()
'========================================================================
'\                         == Function bodyloadm() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'bodyloadmultiplier

bodyloadm = (-2 * WorksheetFunction.lN(1 - Pr)) ^ (1 / 2)

End Function
'-------------------------------------------------------------------------

Function Azfn(alpha As Double, cnalpha As Double, W As Double)
'========================================================================
'\                            == Function Azfn() ==                     /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub Main()                                                        /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'Azfunction

Azfn = -gstand * q * Sref * alpha * cnalpha / W

End Function
'-------------------------------------------------------------------------


'===================================
'============ Sub shear() ==========
'===================================

Function sigma1taub(sigma1taubm1 As Double, CNai As Variant, _
    sigma1totalalpha As Double, mi As Variant, xcg As Double, _
    xcgi As Variant, d2a_dt2 As Double, Az As Double)
'========================================================================
'\                         == Function sigma1taub() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub shear()                                                       /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'sigma1shearforcebody
' One Sigma Body Shear Force, lb
' this function evalues the 1 sigma shear body force

sigma1taub = sigma1taubm1 + q * Sref * CNai * sigma1totalalpha + _
    mi * (-(xcg - xcgi) * d2a_dt2 + Az)

End Function
'-------------------------------------------------------------------------

Function sigma1Momentb(sigma1Momentbm1 As Double, sigma1taubm1 As Double, _
    sigma1taub As Double, CNai As Variant, sigma1totalalpha As Double, _
    li As Variant, xi As Variant, xim1 As Variant, mi As Variant, _
    xcg As Double, xcgi As Variant, xcpi As Variant, Ji As Variant, _
    d2a_dt2 As Double, Az As Double)
'========================================================================
'\                        == Function sigma1Momentb() ==                /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub shear()                                                       /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'sigma1bodybendingmoment
' One Sigma Body Bending Moment, ft-lb
' this function evalues the 1 sigma body bending moment

sigma1Momentb = sigma1Momentbm1 + ((xcgi - xim1) * sigma1taubm1 + _
    (xim1 + li - xcgi) * sigma1taub + q * Sref * CNai * sigma1totalalpha * _
    (xcgi - xcpi) - Ji * d2a_dt2)

End Function
'-------------------------------------------------------------------------

Function norminvfn(mean_val As Double, std_dev_val As Double)
'========================================================================
'\                          == Function norminvfn() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub shear()                                                       /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'norminvequation
'Pr=probability of failure
'mean_val = mean of the distribution
'std_dev_val = standard deviation of the distribution
'norminvfn= fin design bending moment

norminvfn = WorksheetFunction.NormInv(Pr, mean_val, std_dev_val)

End Function
'-------------------------------------------------------------------------


'===================================
'========== Sub finshear() =========
'===================================

Function finplanformA(BR As Double, cr As Double, ct As Double, B As Double, R As Double)
'========================================================================
'\                        == Function finplanformA() ==                 /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  BR=Total Fin Semispan from centerline (B+R)                    /
'\  B=Exposed semispan                                              /
'\  R= Radius of segment at station of motor                            /
'\  cr= root chord                                                      /
'\  ct= tip chord                                                       /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'finplanformAequation

finplanformA = (cr * BR - ct * R) / (B)

End Function
'-------------------------------------------------------------------------

Function finplanformC(B As Double, cr As Double, ct As Double)
'========================================================================
'\                        == Function finplanformC() ==                 /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  B = Exposed semispan                                           /
'\  cr = root chord                                                     /
'\  ct = tip chord                                                      /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'finplanformCequation

finplanformC = (cr - ct) / (B)

End Function
'-------------------------------------------------------------------------

Function CLp(cnalpha As Double, B As Double, R As Double, cr As Double, ct As Double)
'========================================================================
'\                             == Function CLp() ==                     /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\  cnalpha = Taken as the airfoil normal force slope with respect to   /
'\      local angle of attack, which is an average across the fin span. /
'\  R = Element body external radius at body station xi             /
'\  B = Exposed semispan                                          /
'\  cr = root fin chord                                            /
'\  ct = tip fin chord                                              /
'\  N = number of fins                                                  /
'\                                                                      /
'\  Output:                                                             /
'\  CLp = roll stability derivative in z direction, radians             /
'\                                                                      /
'========================================================================
'zrollingstabilityderivatice

CLp = -cnalpha * Nf * B * (cr / 12 * (B ^ 2 + 4 * B * R + 6 * R ^ 2) + ct / 12 * _
    (3 * B ^ 2 + 8 * B * R + 6 * R ^ 2)) / (2 * R ^ 4)

End Function
'-------------------------------------------------------------------------

Function CLdelta(cnalpha As Double, B As Double, R As Double, cr As Double, ct As Double)
'========================================================================
'\                          == Function CLdelta() ==                    /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\  cnalpha = Taken as the airfoil normal force slope with respect to   /
'\      local angle of attack, which is an average across the fin span. /
'\  R = Element body external radius at body station xi             /
'\  B = Exposed semispan                                            /
'\  cr = root fin chord                                             /
'\  ct = tip fin chord                                              /
'\                                                                      /
'\  Output:                                                             /
'\  CLdelta =                                                           /
'\                                                                      /
'========================================================================
'airfoidnormalforceslope

CLdelta = cnalpha * B * (cr * (B / 6 + R / 2) + ct * (B / 3 + R / 2)) / (2 * R ^ 3)

End Function
'-------------------------------------------------------------------------

Function meandelta(stage As Integer, lambdar As Double, rhoSref As Double, _
    R1 As Double, R2 As Double, CLp1 As Double, CLp2 As Double, _
    CLd1 As Double, CLd2 As Double, deltafin1 As Double, deltafin2 As Double)
'========================================================================
'\                          == Function meandelta() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'deltamean

If StagesNo = 2 Then
    If stage = 1 Then
        RollOp = Rollopts_01
        SCLp = CLp1 + CLp2
        Rtemp = Rref
        CLdtemp = CLd1
        deltaf2 = deltafin2
        deltaf = deltafin1
    Else
        RollOp = Rollopts_02
        SCLp = CLp2
        Rtemp = R2
        CLdtemp = CLd2
        deltaf2 = 0
        deltaf = deltafin2
    End If
Else
    RollOp = Rollopts_01
    SCLp = CLp1
    Rtemp = Rref
    CLdtemp = CLd1
    deltaf2 = 0
    deltaf = deltafin1
End If

If RollOp = 3 Then
    meandelta = deltaf
Else
    JJ1 = 1 + 4 * Ic / (2 * pi * rhoSref / Sref * (alt - l_length - l_alt) * Rtemp ^ 4 * SCLp)
    meandelta = -SCLp * lambdar * Rtemp / (Nf * CLdtemp * JJ1) - CLd2 * deltaf2 / CLdtemp
End If

End Function
'-------------------------------------------------------------------------

Function finM_AplusCy(FPA As Double, FPC As Double, yfin As Double)
'========================================================================
'\                         == Function finM_AplusCy() ==                /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  yfin = fin spanwise ordinate from fin root                          /
'\  FPA =                                             /
'\  FPC =                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'yfinspanwisevalue1

finM_AplusCy = FPA + FPC * yfin

End Function
'-------------------------------------------------------------------------

Function finM_Ay(FPA As Double, yfin As Double)
'========================================================================
'\                           == Function finM_Ay() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  yfin = fin spanwise ordinate from fin root                          /
'\  FPA =                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'yfinspanwisevalue1

finM_Ay = FPA * yfin

End Function
'-------------------------------------------------------------------------

Function finM_by(BR As Double, yfin As Double)
'========================================================================
'\                           == Function finM_by() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  yfin = fin spanwise ordinate from fin root                          /
'\  BR = total fin semispan from centerline                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'yfinspanwisevalue1

finM_by = BR - yfin

End Function
'-------------------------------------------------------------------------

Function finM_by2(BR As Double, yfin As Double)
'========================================================================
'\                           == Function finM_by2() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  yfin = fin spanwise ordinate from fin root                          /
'\  BR = total fin semispan from centerline                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'yfinspanwisevalue1

finM_by2 = (BR ^ 2 - yfin ^ 2) / 2

End Function
'-------------------------------------------------------------------------

Function finM_by3(BR As Double, yfin As Double)
'========================================================================
'\                           == Function finM_by3() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\    Sub finshear()                                                    /
'\                                                                      /
'\  Input:                                                              /
'\  yfin = fin spanwise ordinate from fin root                          /
'\  BR = total fin semispan from centerline                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'yfinspanwisevalue1

finM_by3 = (BR ^ 3 - yfin ^ 3) / 3

End Function
'-------------------------------------------------------------------------


Function finmeanbending(cnafin As Double, mudelta As Double, FPA As Double, _
    yf1 As Double, ANCRC As Double, yf2 As Double, CNRC As Double, yf3 As Double)
'========================================================================
'\                       == Function finmeanbending() ==                /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'meanbendingmomentfin

finmeanbending = q * cnafin * mudelta * (FPA * yf1 + ANCRC * yf2 - CNRC * yf3)

End Function
'-------------------------------------------------------------------------


Function sigmaMaero(yfin1 As Double, yfin2 As Double, yfin4 As Double, _
    yfin5 As Double, cnalpha As Double, FPA As Double, FPC As Double)
'========================================================================
'\                         == Function sigmaMaero() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'aeroonlysigmaMeqn
'sigmaMaero(q, yf1, yf2, yf3, yf4, cnafin, FPA, FPC)
sigmaMaero = (q * cnalpha) * (yfin4 + FPA * yfin1 - _
    FPC * yfin2 + yfin5) ^ (1 / 2)
End Function
'-------------------------------------------------------------------------

Function sigmaMIy(finmu As Double, Az As Double, xF As Double, xcm As Double, _
    xcg As Double, wn As Double, onesalpha As Double, FPA As Double, _
    FPC As Double, yfin1 As Double, yfin2 As Double)
'========================================================================
'\                          == Function sigmaMIy() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'sigmaMIyeqn

sigmaMIy = finmu * (wn ^ 2 * (xF + xcm - xcg) + Az / onesalpha) * _
    (FPA * yfin1 - FPC * yfin2)

End Function
'-------------------------------------------------------------------------


Function varMyd(sd1 As Double, cnalpha As Double, yfin6 As Double, _
    CldRClp As Double, yfin7 As Double, sa1 As Double, yfin4 As Double, _
    yfin5 As Double, FPA As Double, yfin1 As Double, FPC As Double, _
    yfin2 As Double)
'========================================================================
'\                           == Function varMyd() ==                    /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'Varmydelta

'sd1 = 1sigmadelta
'CldRclp = Cldelta/(Clp*R)
'sa1 = 1sigmaalpha
'FPA = fin planform A
'FPC = fin planform C

''''varMyd = (sd1 * q / 144 * cnalpha) ^ 2 * (yfin6 ^ 2 - CldRClp * yfin6 * _
''''    yfin7 + Nf * (CldRClp * yfin7) ^ 2) - (sd1 ^ 2 * sa1 * (8 / Nf) ^ 0.5) * _
''''    (yfin4 + yfin5 + (12 * FPA * yfin1 - (FPC * yfin2))) * (-12 * FPA * yfin1 - _
''''    (FPC * yfin2))

varMyd = (sd1 * q * cnalpha) ^ 2 * ((yfin6) ^ 2 - 2 * CldRClp * _
    yfin6 * yfin7 + Nf * (CldRClp * yfin7) ^ 2) - _
    (sd1 ^ 2 * sa1 * (8 / Nf) ^ 0.5) * (yfin4 + yfin5 + FPA * yfin1 - _
    FPC * yfin2) * (-FPA * yfin1 - FPC * yfin2)

End Function
'-------------------------------------------------------------------------

Function sigmamfn(T1sa As Double, ASMA As Double, SMIy As Double, varMyd As Double)
'========================================================================
'\                          == Function sigmamfn() ==                   /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================
'Msigma

'T1sa = Total1sigmaalpha
'ASMA = Aero only sigma My
'SMIy = sigma miy

sigmamfn = ((T1sa ^ 2) * (ASMA ^ 2 + SMIy ^ 2 - 2 * ASMA * SMIy) + varMyd) ^ 0.5

'SQRT(($AI$27^2)*(I29^2+J29^2-2*I29*J29)+M29)

End Function
'-------------------------------------------------------------------------

Function tensileload(mu As Double, omega As Double, c_r As Double, c_t As Double, _
    R_r As Double, b_r As Double, y_f As Double)
'========================================================================
'\                        == Function tensileload() ==                  /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================

temp_1 = (1 / 2) * (c_r * b_r - c_t * R_r) * (b_r ^ 2 - y_f ^ 2) / (b_r - R_r)
temp_2 = (1 / 3) * (c_r - c_t) * (b_r ^ 3 - y_f ^ 3) / (b_r - R_r)
tensileload = mu * omega ^ 2 * (temp_1 - temp_2)

End Function
'-------------------------------------------------------------------------

Function ampliaxforce(mass As Double, sumMass As Double)
'========================================================================
'\                        == Function ampliaxforce() ==                 /
'\                                                                      /
'\   This function is to                                                /
'\----------------------------------------------------------------------/
'\  Called by:                                                          /
'\                                                                      /
'\  Input:                                                              /
'\                                                                      /
'\  Output:                                                             /
'\                                                                      /
'\                                                                      /
'========================================================================

temp_m = (2.4142 - 2#) / (2 / 3 - 1 / 3) ' from Appendix J (1/3,2.00) (2/3,2.4142) (mratio,AmpF)
temp_b = 2.4142 - (temp_m * 2 / 3)
ampliaxforce = temp_m * mass / sumMass + temp_b ' y=mx+b

End Function
'-------------------------------------------------------------------------
-------------------------------------------------------------------------------
VBA MACRO SubroutinesModule.bas 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/SubroutinesModule'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
'################################ BENDIT 7 ##############################
'#                    == Do not remove this notice ==                   #
'#----------------------------------------------------------------------#
'#  Program:        BENDIT                                              #
'#  Module name     SubroutinesModule                                   #
'#  Version         7_alpha                                             #
'#  Developed by    Charley Hoult, Armando Fuentes, Hien Tran           #
'#----------------------------------------------------------------------#
'#                                                                      #
'#  Info. go here                                                       #
'#                                                                      #
'########################################################################


'========= Global Variables ========
Option Explicit
'Public section As Boolean


''============ Constants ============
Public pi As Double 'PI=3.14159265
Public gstand As Double 'gravity at sea level ft/sec^2
Public d2r As Double 'degree to radian

'======== Rocket Parameters ========
Public Analysis As Integer
Public StagesNo As Integer 'number of stages (related to number of fin sets)

'======== Flight Conditions ========
Public alt As Double ' altitude ft
Public l_alt As Double ' launch altitude ft ' (<Not use yet>)
Public l_length As Double ' launcher length ft
Public M_no As Double ' Mach Number ' (<Not use yet>)
Public U As Double ' Flight speed fps
Public q As Double ' dynamic pressure, lb/ft^2
Public Sref As Double ' Aerodynamic reference area (crosssection area), ft^2
Public Rref As Double ' Reference Length, max Body Radius, in >> ft

Public Pr As Double ' Pr (no failure)
Public A_axial As Double 'Axial Acceleration, a, ft/sec2
Public thrust As Double ' Thrust lb
Public sigma1cg As Double '1sigma cg lateral offset,ft (= womega)'This value is obtained from reference 6. Add reference later, ft
Public sigma1thrustangle As Double '1sigma thrust misalignment angle,rad
Public nozzletbs As Double 'nozzle throat body station, in >> ft
Public thrustele As Integer 'Element where the thrust is applied
Public ignitiontest As Boolean ' right after ignition?

Public Ic As Double 'cross section moment of inertia, ft^4
Public E As Double ' modulus of elasticity, psf
Public Aeroelement As Double ' Element to use as base for aeroelastic effect
Public StaAeroelasticEff As Boolean ' Static Aeroelastic Effect
Public Nf As Integer ' Number of fins
Public sigma1gust As Double 'sigma 1 gust amplitude, ft/s
Public gustcorrel As Double ' gust longitudinal auto correlation lenght, ft

Public Rollopts_01 As Integer 'roll wave options for firststage (1,2 or 3)
Public Rollrevs As Double 'roll revolutions in boost stage for firststage
Public Rollwavepercent_01 As Double 'roll wave number as percentage of Pitch/yaw wavenumber for firststage
Public Rollopts_02 As Integer 'roll wave options for secondstage (2 or 3)
Public Rollwavepercent_02 As Double 'roll wave number as percentage of Pitch/yaw wavenumber for secondstage
'

'-------------------------------------------------------------------------

Sub Main()
'========================================================================
'\                          == Subroutine Main() ==                     /
'\                                                                      /
'\   This routine is to                                                 /
'\                                                                      /
'\                                                                      /
'========================================================================
Call Clear_Bendit

'============ Constants ============
Analysis = InputDataBendit.Range("D4")
StagesNo = InputDataBendit.Range("B3")
pi = InputDataBendit.Range("B4")
gstand = InputDataBendit.Range("B5")
d2r = InputDataBendit.Range("B6")

'======== Flight Conditions ========
Sheets("Input DataBendit").Select
Range("a10").Select
alt = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
l_alt = ActiveCell.Value '
ActiveCell.Offset(0, 1).Select
l_length = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
M_no = ActiveCell.Value ' (<Not use yet>)
ActiveCell.Offset(0, 1).Select
U = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
q = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Sref = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Rref = ActiveCell.Value / 12 '>> in to ft


Range("a13").Select
Pr = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
A_axial = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
thrust = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
sigma1cg = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
sigma1thrustangle = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
nozzletbs = ActiveCell.Value / 12 '>> in to ft
ActiveCell.Offset(0, 1).Select
thrustele = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
ignitiontest = ActiveCell.Value

Range("a16").Select
Ic = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
E = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Aeroelement = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
StaAeroelasticEff = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Nf = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
sigma1gust = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
gustcorrel = ActiveCell.Value

Range("b19").Select
Rollopts_01 = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Rollrevs = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Rollwavepercent_01 = ActiveCell.Value
ActiveCell.Offset(0, 2).Select
Rollopts_02 = ActiveCell.Value
ActiveCell.Offset(0, 1).Select
Rollwavepercent_02 = ActiveCell.Value
'

'===================================
'======= 1st Stages Fin Data =======
'===================================
Dim finspar1 As Integer
Dim cr1 As Double
Dim ct1 As Double
Dim B1 As Double
Dim gamma1 As Double
Dim sigma1delta1 As Double

finspar1 = InputDataBendit.Range("a36")  ' fin spar attachment element in section 1
cr1 = InputDataBendit.Range("b36") / 12 'fin root chord first fin section, in >> ft
ct1 = InputDataBendit.Range("c36") / 12 'fin tip chord first fin section,in >> ft
B1 = InputDataBendit.Range("d36") / 12 'exposed semispan first fin section,  in >> ft
gamma1 = InputDataBendit.Range("e36") 'LE sweep angle first fin section, degrees
sigma1delta1 = InputDataBendit.Range("f36")

Dim fpw1 As Double
Dim xF1 As Double
Dim finalphadeltacp1 As Double
Dim cnafin1 As Double
Dim cndelta1 As Double
Dim cnat1 As Double
Dim xcpassy1 As Double

fpw1 = InputDataBendit.Range("a39") 'fin panel weight for first section fins, lb
xF1 = InputDataBendit.Range("b39") / 12 'Root Chord LE Body Station first fin section, in >> ft
finalphadeltacp1 = InputDataBendit.Range("c39") / 12 ' Fin alpha and delta center of pressure, in >> ft
cnafin1 = InputDataBendit.Range("d39") 'cn alpha for fin alone airfoil first section
cndelta1 = InputDataBendit.Range("e39") ' Single Panel CN delta, /rad
cnat1 = InputDataBendit.Range("f39") 'tail assembly cn alpha, /rad
'xcpassy1 = InputDataBendit.Range("g42") / 12 'Fin ass'y Xcp, from the root chord LE, in >> ft
xcpassy1 = finalphadeltacp1 - xF1 'Fin ass'y Xcp, from the root chord LE, ft



'===================================
'======= 2st Stages Fin Data =======
'===================================
Dim finspar2 As Integer
Dim cr2 As Double
Dim ct2 As Double
Dim B2 As Double
Dim gamma2 As Double
Dim sigma1delta2 As Double

finspar2 = InputDataBendit.Range("a47")  ' fin spar attachment element in section 2
cr2 = InputDataBendit.Range("b47") / 12 'fin root chord second fin section, in >> ft
ct2 = InputDataBendit.Range("c47") / 12 'fin tip chord second fin section,in >> ft
B2 = InputDataBendit.Range("d47") / 12 'exposed semispan second fin section,  in >> ft
gamma2 = InputDataBendit.Range("e47") 'LE sweep angle second fin section, degrees
sigma1delta2 = InputDataBendit.Range("f47")

Dim fpw2 As Double
Dim xF2 As Double
Dim finalphadeltacp2 As Double
Dim cnafin2 As Double
Dim cndelta2 As Double
Dim cnat2 As Double
Dim xcpassy2 As Double

fpw2 = InputDataBendit.Range("a50") 'fin panel weight for second section fins, lb
xF2 = InputDataBendit.Range("b50") / 12 'Root Chord LE Body Station second fin section, in >> ft
finalphadeltacp2 = InputDataBendit.Range("c50") / 12 ' Fin alpha and delta center of pressure, in >> ft
cnafin2 = InputDataBendit.Range("d50") 'cn alpha for fin alone airfoil second section
cndelta2 = InputDataBendit.Range("e50") ' Single Panel CN delta, /rad
cnat2 = InputDataBendit.Range("f50") 'tail assembly cn alpha, /rad
'xcpassy2 = InputDataBendit.Range("g50") / 12 'Fin ass'y Xcp, from the root chord LE, in >> ft
xcpassy2 = finalphadeltacp2 - xF2 'Fin ass'y Xcp, from the root chord LE, ft

'======== Body Profile Data ========
Dim TEMP123 As Boolean
Dim TEMP23 As Integer
Dim jj As Integer
Dim Val01() As Variant
Dim Val02() As Variant
Dim Val03() As Variant
Dim Val04() As Variant
Dim Val05() As Variant
Dim nrow As Integer

TEMP123 = True

For jj = 1 To 5
    Select Case jj
    Case 1
        Range("L11").Select ' xi, Element aft face body station, inches from nose tip, in
        Val01 = bodyprofile(TEMP123)
        nrow = UBound(Val01) - LBound(Val01) + 1
'''        nrow = Application.CountA(Val01)
        TEMP123 = True
    Case 2
        Range("M11").Select ' Ri, Element body external radius at body station xi, in
        Val02 = bodyprofile(TEMP123)
        TEMP123 = True
    Case 3
        Range("N12").Select ' wi, Element weight (finless), lb
        Val03 = bodyprofile(TEMP123)
        TEMP123 = True
    Case 4
        Range("O12").Select ' Element CNai (finless), per radian
        Val04 = bodyprofile(TEMP123)
        TEMP123 = True
    Case 5
        Range("P12").Select ' Element Xcpi, (finless) from element front, in
        Val05 = bodyprofile(TEMP123)
    End Select
Next jj
For jj = 1 To nrow
    Val01(jj) = Val01(jj) / 12 'in >> ft
    Val02(jj) = Val02(jj) / 12 'in >> ft
Next jj
TEMP23 = UBound(Val05) - LBound(Val05) + 1
For jj = 1 To TEMP23
    Val05(jj) = Val05(jj) / 12 'in >> ft
Next jj
Range("A1").Select 'Reset to A1 cell

'======== initial ========

'===================================
'======= 1st Stages Fin Data =======
'===================================

Dim xcm1 As Double
Dim ycm1 As Double
Dim fpanela1 As Double
Dim finmu1 As Double
Dim Jo1 As Double
Dim J11 As Double

xcm1 = xcm(cr1, ct1, gamma1, B1) ' x Fin center of mass from the the root chord LE, first fin section, ft
ycm1 = ycm(cr1, ct1, B1) ' y Fin center of mass from the the root chord LE, first fin section, ft
fpanela1 = Afinpanel(B1, cr1, ct1) ' fin panel area first fin section, ft^2
finmu1 = mufin(fpw1, fpanela1) ' Fin mu first fin section, sl/ft^2
Jo1 = Jofn(cr1, ct1, finmu1, gamma1, B1) 'Fin Moment of Inertia parallel to bending vector, sl-ft^2
J11 = J1fn(cr1, ct1, finmu1, gamma1, B1) 'Fin Moment of Inertia normal to bending vector, sl-ft^2

'===================================
'======= 2st Stages Fin Data =======
'===================================
''
If StagesNo = 2 Then
    Dim xcm2 As Double
    Dim ycm2 As Double
    Dim fpanela2 As Double
    Dim finmu2 As Double
    Dim Jo2 As Double
    Dim J12 As Double
    ''
    xcm2 = xcm(cr2, ct2, gamma2, B2) ' x Fin center of mass from the the root chord LE, second fin section
    ycm2 = ycm(cr2, ct2, B2) ' y Fin center of mass from the the root chord LE, second fin section
    fpanela2 = Afinpanel(B2, cr2, ct2) ' fin panel area second fin section, ft^2
    finmu2 = mufin(fpw2, fpanela2) ' Fin mu second fin section, sl/ft^2
    Jo2 = Jofn(cr2, ct2, finmu2, gamma2, B2) 'Fin Moment of Inertia parallel to bending vector, sl-ft^2
    J12 = J1fn(cr2, ct2, finmu2, gamma2, B2) 'Fin Moment of Inertia normal to bending vector, sl-ft^2
End If

'===================================
'======= Cal =======
'===================================

Dim j As Integer

Dim element As Integer
Dim R1 As Double
Dim R2 As Double
Dim x1 As Double
Dim x2 As Double
Dim x1j() As Variant
Dim r1j() As Variant
Dim wifinless As Double
Dim cnaifinless As Double
Dim xcpifinless As Double
Dim ravg As Double
Dim li() As Variant
Dim mifinless As Double
Dim massi() As Variant
Dim wcgi() As Variant
Dim kival As Double
Dim xcgifinless As Double
Dim xcgi() As Variant
Dim Mwbodystation() As Double
Dim Jifinless As Double
Dim Ji() As Variant
Dim CNai() As Variant
Dim aerostaticcoeff As Double
Dim Mbodyaero As Double
Dim xcpi() As Double
Dim Mbodysum As Double
Mbodysum = 0

ReDim x1j(1 To (nrow))
ReDim li(1 To (nrow - 1))
ReDim massi(1 To (nrow - 1))
ReDim wcgi(1 To (nrow - 1))
ReDim xcgi(1 To (nrow - 1))
ReDim Mwbodystation(1 To (nrow - 1))
ReDim Ji(1 To (nrow - 1))
ReDim CNai(1 To (nrow - 1))
ReDim xcpi(1 To (nrow - 1))

Dim CNaN As Double
Dim l_N As Double
Dim m_N As Double
CNaN = 0
l_N = 0
m_N = 0

x1j = Val01 'ft
r1j = Val02 'ft

For j = 2 To nrow
    element = j - 1
    R1 = Val02(j - 1) ' ft
    R2 = Val02(j) ' ft
    x1 = Val01(j - 1) ' ft
    x2 = Val01(j) ' ft

    wifinless = Val03(j - 1) '  Element weight (finless), lb
    cnaifinless = Val04(j - 1) ' element CNalphai finless per radian
    xcpifinless = Val05(j - 1) ' element xcpi finless from element front, ft
    ravg = (R2 + R1) / 2 'average element radius, ft
    li(j - 1) = (x2 - x1) ' element length, ft
    mifinless = wifinless / gstand ' element mass assuming no fins present, sl
    massi(j - 1) = masselement(element, mifinless, finspar1, finspar2, fpw1, fpw2) 'element mass including fin, sl
    kival = ki(R1, R2)
    xcgifinless = xcgfinless1(x1, R1, R2, li(j - 1), kival) 'Element center of mass (finless) from nose tip, ft
    xcgi(j - 1) = Xcgfn(element, xcgifinless, finspar1, finspar2, _
        fpw1, fpw2, xcm1, xcm2, xF1, xF2, wifinless) 'Element center of mass from nose tip, ft
    Mwbodystation(j - 1) = Mw(massi(j - 1), xcgi(j - 1)) ' Moment station weight moment, lb-ft
    Jifinless = Jifinlessfn(mifinless, li(j - 1), ravg) 'Ji, Element moment of inertia (finless), sl-ft^2
    wcgi(j - 1) = massi(j - 1) * gstand 'wi, Element weight, lb
    Ji(j - 1) = Jifn(element, mifinless, Jifinless, finspar1, finspar2, xcgi(j - 1), _
        xcgifinless, Jo1, Jo2, J11, J12, fpw1, fpw2, xF1, xF2, xcm1, xcm2, ycm1, ycm2, ravg) 'Ji, Element moment of inertia, sl-ft^2
    CNai(j - 1) = cnalphai(element, finspar1, finspar2, cnaifinless, cnat1, cnat2) ' element CNalphai, per radian
    If StaAeroelasticEff = True And (j - 1) <= Aeroelement Then
        CNaN = CNaN + CNai(j - 1)
        l_N = l_N + li(j - 1)
        m_N = m_N + massi(j - 1)
    End If
Next j

Dim rhoSr As Double
Dim W As Double
Dim xcg As Double
Dim Iyy As Double
Dim CNa_all As Double

    rhoSr = rhoSreffn() 'density Sref(q,Sref, U), sl/ft
    W = gstand * sumfn(massi) 'lb
    xcg = sumfn(Mwbodystation) / W ' ft
    CNa_all = sumfn(CNai)
    Iyy = Iyyfn(xcg, massi, xcgi, Ji) ' sl-ft2
Dim SCNaXcpi As Double
SCNaXcpi = 0

For j = 2 To nrow
    element = j - 1
    x1 = Val01(j - 1) ' ft
    cnaifinless = Val04(j - 1) ' element CNalphai finless per radian
    xcpifinless = Val05(j - 1) ' element xcpi finless from element front, ft

    If StaAeroelasticEff = True And (j - 1) <= Aeroelement Then
        SCNaXcpi = SCNaXcpi + (xcg - xcpifinless) * CNai(j - 1)
        aerostaticcoeff = (2 * E * Ic - m_N * q * Sref * (l_N) ^ 2 * (CNa_all / (W / gstand) + (xcg - xcgi(j - 1)) * (SCNaXcpi / Iyy))) _
        / (2 * E * Ic - q * Sref * CNaN * (l_N) ^ 2)
        CNai(j - 1) = aerostaticcoeff * CNai(j - 1) ' element CNalphai, per radian
    End If
    xcpi(j - 1) = xcpifn(element, xcpifinless, CNai(j - 1), x1, xcpassy1, xcpassy2, _
        finspar1, finspar2, cnaifinless, cnat1, cnat2, xF1, xF2) 'Element Xcpi, from nose tip, ft
    Mbodyaero = CNai(j - 1) * xcpi(j - 1) 'body station aero moment, ft
    Mbodysum = Mbodysum + Mbodyaero 'body station moment, ft
    
    InputDataBendit.Cells(10 + j, 17) = CNai(j - 1)
    InputDataBendit.Cells(10 + j, 18) = xcpi(j - 1) * 12 ' ft >> in
Next j

Dim Rm1 As Double ' Radius at motor section, first rocket section, ft
Dim CLp1 As Double
Dim CLd1 As Double
Rm1 = r1j(finspar1 + 1) ' ft
CLp1 = CLp(cnafin1, B1, Rm1, cr1, ct1) 'per rad
CLd1 = CLdelta(cnafin1, B1, Rm1, cr1, ct1) 'per rad

If StagesNo = 2 Then
    Dim Rm2 As Double ' Radius at motor section, second rocket section, ft
    Dim CLp2 As Double
    Dim CLd2 As Double
    Rm2 = r1j(finspar2 + 1) ' ft
    CLp2 = CLp(cnafin2, B2, Rm2, cr2, ct2) 'per rad
    CLd2 = CLdelta(cnafin2, B2, Rm2, cr2, ct2) 'per rad
End If


Dim cnalpha As Double
Dim Xcp As Double
Dim staticmargin As Double
Dim lambda_p As Double
Dim lambda_r2 As Double
Dim mdelta2 As Double
Dim lambda_r As Double
Dim lambda_gstar As Double
Dim Ampfactor As Double
Dim lglp2 As Double
Dim lphl As Double
Dim lghl As Double
Dim lslglp As Double

Dim lplgsin As Double
Dim lphlsin As Double
Dim lp2lglp2 As Double
Dim lplgsincos As Double
Dim varvz As Double

    mdelta2 = 0
    cnalpha = sumfn(CNai)
    Xcp = Mbodysum / cnalpha ' ft
    staticmargin = (Xcp - xcg) ' ft
    lambda_p = (1 / U) * (q * Sref * (cnalpha) * staticmargin / Iyy) ^ (1 / 2) 'rad per ft
    If StagesNo = 2 Then
        lambda_r2 = lambdarf(2, lambda_p, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, 0, sigma1delta2) 'rad per ft
        mdelta2 = meandelta(2, lambda_r2, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, 0, sigma1delta2)
    End If
    lambda_r = lambdarf(1, lambda_p, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, sigma1delta1, mdelta2) 'rad per ft
    lambda_gstar = 1 / (0.59 * gustcorrel) 'per ft
    Ampfactor = thrust / (Iyy * U ^ 2 * (lambda_p ^ 2 - lambda_r ^ 2)) 'amplification factor, per ft
    lglp2 = lambda_gstar ^ 2 + lambda_p ^ 2
    lphl = lambda_p * (alt - l_length)
    lghl = lambda_gstar * (alt - l_length)
    lslglp = (lambda_p * sigma1gust) ^ 2 / (lglp2)
    lplgsin = -lambda_gstar * Sin(2 * lphl) / (2 * lambda_p)
    lphlsin = -(Sin(lphl)) ^ 2
    lp2lglp2 = 2 * lambda_p ^ 2 / lglp2
    lplgsincos = lp2lglp2 * Exp(-lghl) * (lambda_gstar * Sin(lphl) + lambda_p * Cos(lphl))
    varvz = lslglp * (lghl + lplgsin + lphlsin + lp2lglp2 + lplgsincos / lambda_p)
 
Dim sigma1alphag As Double
Dim wn As Double
Dim lambda_meanr As Double
Dim thrustMarm As Double
Dim sigma1alphat As Double
Dim sigma1alphacgo As Double
Dim deltafinterm1 As Double
Dim deltafinterm2 As Double
Dim deltafinterm As Double
Dim sigma1alphafin As Double
Dim sigma1alphatotal As Double
 
    sigma1alphag = (1 / U) * (varvz) ^ (1 / 2)
    wn = (q * Sref * cnalpha * staticmargin / (Iyy)) ^ (1 / 2)  'pitch yaw natural frequency, rad/second
    lambda_meanr = lambda_r * U ' mean roll rate, rad/second
    thrustMarm = nozzletbs - xcg 'ft
    sigma1alphat = Ampfactor * ((thrustMarm * sigma1thrustangle) ^ 2 + sigma1cg ^ 2) ^ (1 / 2)
    If ignitiontest = True Then
        sigma1alphat = 2 * sigma1alphat 'Ampfactor * thrustMarm * sigma1thrustangle
    End If
    sigma1alphacgo = sigma1cg * Ampfactor
    deltafinterm1 = (cndelta1 * (finalphadeltacp1 - xcg) * sigma1delta1) ^ 2 'ft2
    If StagesNo = 2 Then
        deltafinterm2 = (cndelta2 * (finalphadeltacp2 - xcg) * sigma1delta2) ^ 2 'ft2
    Else
        deltafinterm2 = 0
    End If
    deltafinterm = (deltafinterm1 + deltafinterm2) ^ (1 / 2) 'ft
    sigma1alphafin = (Nf / 8) ^ (1 / 2) * rhoSr * (deltafinterm / (Iyy * _
        (lambda_p ^ 2 - lambda_r ^ 2))) '
    sigma1alphatotal = (sigma1alphag ^ 2 + sigma1alphat ^ 2 + sigma1alphacgo ^ 2 + _
        sigma1alphafin ^ 2) ^ (1 / 2)

Dim Bloadmultiplier As Double
Dim sigmaalphatdesign As Double
Dim d2alpha_dt2 As Double
Dim Az As Double
Dim Ax As Double
Dim dragless_Ax As Double
Dim Axg As Double

    Bloadmultiplier = bodyloadm() '(Pr)
    sigmaalphatdesign = Bloadmultiplier * sigma1alphatotal
    d2alpha_dt2 = -q * Sref * sigma1alphatotal * cnalpha * staticmargin / Iyy
    Az = Azfn(sigma1alphatotal, cnalpha, W)
    Ax = gstand * thrust / W
    dragless_Ax = (thrust - W) * gstand / W
    Axg = Ax / gstand

Select Case Analysis
Case 1
    '''''Call shear
    Call shear(x1j, massi, xcgi, xcpi, li, Ji, CNai, nrow, Bloadmultiplier, _
        sigma1alphatotal, xcg, d2alpha_dt2, Az)
    '''''Call axialforce
    Call axialforce(x1j, massi, nrow, Ax)
    '''''Call finshear
    Call finshear(r1j, lambda_r, lambda_r2, Az, xcm1, xcm2, finmu1, finmu2, xcg, wn, _
        sigma1alphafin, sigma1alphatotal)
'    Sheets("Solution Bendit").Select
'    Range("a2").Select
Case 2
    '''''Call parachuteaxialload
    Call parachuteaxialload(x1j, nrow, massi, xcg)
'    Sheets("Solution Bendit").Select
'    Range("r2").Select
Case 3
    '''''Call groundMoment
    Call groundMoment(wcgi, W, xcgi, xcg, x1j, nrow)
'    Sheets("Solution Bendit").Select
'    Range("w2").Select
End Select

InputDataBendit.Cells(16, 8) = lambda_p ^ 2 / (lambda_p ^ 2 - lambda_r ^ 2)
InputDataBendit.Cells(42, 4) = lambda_r
InputDataBendit.Cells(42, 5) = meandelta(1, lambda_r, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, sigma1delta1, sigma1delta2)
InputDataBendit.Cells(42, 6) = CLp1
InputDataBendit.Cells(42, 7) = CLd1
If StagesNo = 2 Then
    InputDataBendit.Cells(53, 4) = lambda_r2
    InputDataBendit.Cells(53, 5) = mdelta2
    InputDataBendit.Cells(53, 6) = CLp2
    InputDataBendit.Cells(53, 7) = CLd2
End If

InputDataBendit.Cells(80, 1) = W 'lb
InputDataBendit.Cells(80, 2) = xcg * 12 'ft >> in
InputDataBendit.Cells(80, 3) = Iyy ' sl-ft2
InputDataBendit.Cells(80, 4) = cnalpha
InputDataBendit.Cells(80, 5) = Xcp * 12 'ft >> in
InputDataBendit.Cells(80, 6) = staticmargin 'ft
InputDataBendit.Cells(80, 8) = lambda_p 'rad/ft
InputDataBendit.Cells(80, 9) = lambda_r 'rad/ft
InputDataBendit.Cells(80, 10) = lambda_gstar ' per ft
InputDataBendit.Cells(80, 12) = lambda_meanr 'rad/sec
InputDataBendit.Cells(80, 13) = wn 'rad/sec

InputDataBendit.Cells(84, 1) = sigma1alphat 'rad
InputDataBendit.Cells(84, 2) = sigma1alphacgo 'rad
InputDataBendit.Cells(84, 3) = sigma1alphag 'rad
InputDataBendit.Cells(84, 4) = sigma1alphafin 'rad
InputDataBendit.Cells(84, 5) = sigma1alphatotal 'rad
InputDataBendit.Cells(84, 6) = sigmaalphatdesign 'rad
InputDataBendit.Cells(84, 8) = d2alpha_dt2 'rad/sec2
InputDataBendit.Cells(84, 9) = Az 'ft/sec2
InputDataBendit.Cells(84, 10) = dragless_Ax 'ft/sec2
InputDataBendit.Cells(84, 12) = aerostaticcoeff

End Sub
'-------------------------------------------------------------------------

Sub shear(x1j As Variant, massi As Variant, xcgi As Variant, xcpi As Variant, _
    li As Variant, Ji As Variant, CNai As Variant, nrow As Integer, _
    bodyloadmultiplier As Double, sigma1totalalpha As Double, xcg As Double, _
    d2a_dt2 As Double, Az As Double)
''========================================================================
''\                         == Subroutine shear() ==                     /
''\                                                                      /
'''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
''========================================================================
''shearandbendingsubroutine
'
Dim i As Integer
Dim taub() As Double
ReDim taub(1 To nrow)
Dim sigmab() As Double
ReDim sigmab(1 To nrow)
Dim taubdesign As Double
Dim sigmabdesign As Double
Dim normtaub As Double
Dim normbending As Double
Dim temp_val As Double

taub(1) = 0
sigmab(1) = 0

For i = 1 To nrow
If i > 1 Then
    taub(i) = sigma1taub(taub(i - 1), CNai(i - 1), sigma1totalalpha, massi(i - 1), _
        xcg, xcgi(i - 1), d2a_dt2, Az) 'One Sigma Body Shear Force, lb
    sigmab(i) = sigma1Momentb(sigmab(i - 1), taub(i - 1), taub(i), CNai(i - 1), _
        sigma1totalalpha, li(i - 1), x1j(i), x1j(i - 1), massi(i - 1), xcg, xcgi(i - 1), _
        xcpi(i - 1), Ji(i - 1), d2a_dt2, Az) 'One Sigma Body Bending Moment, ft-lb
End If
taubdesign = taub(i) * bodyloadmultiplier 'lb
sigmabdesign = sigmab(i) * bodyloadmultiplier 'ft-lb
temp_val = Abs(taub(i)) + 0.000001
normtaub = norminvfn(0, temp_val) 'lb
temp_val = Abs(sigmab(i)) + 0.000001
normbending = norminvfn(0, temp_val) 'ft-lb

BenditSolution.Cells(4 + i, 1) = x1j(i) * 12 'ft >> in
BenditSolution.Cells(4 + i, 2) = taub(i) 'lb
BenditSolution.Cells(4 + i, 3) = sigmab(i) * 12 'ft-lb >> in-lb
BenditSolution.Cells(4 + i, 4) = taubdesign 'lb
BenditSolution.Cells(4 + i, 5) = sigmabdesign * 12 'ft-lb >> in-lb
BenditSolution.Cells(4 + i, 6) = normtaub 'lb
BenditSolution.Cells(4 + i, 7) = normbending * 12 'ft-lb >> in-lb
Next i
End Sub
'-------------------------------------------------------------------------

Sub axialforce(x1j As Variant, massi As Variant, nrow As Integer, Ax As Double)
''========================================================================
''\                      == Subroutine axialforce() ==                   /
''\                                                                      /
''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
''========================================================================
'Pi, Axial Force, lb
Dim i As Integer
Dim xi As Double
Dim axforce As Double
Dim Aigin As Double
Dim Smass As Double
Dim masstem As Double
Dim temMR As Double
xi = 0
axforce = 0
Aigin = 1
Smass = sumfn(massi)
masstem = Smass
BenditSolution.Cells(5, 9) = xi
BenditSolution.Cells(5, 10) = axforce
For i = 2 To nrow + 1
If i <= thrustele Then
    xi = x1j(i)
Else
    If xi = x1j(i - 1) Then
        xi = x1j(i - 1) + 0.0001
        Else
        xi = x1j(i - 1)
    End If
End If
If i < nrow + 1 Then
    If i = thrustele + 1 Then
        axforce = axforce + thrust
    Else
        axforce = axforce - massi(i - 1) * Ax
    End If
Else
    axforce = 0
End If
If ignitiontest = True Then
    If i = thrustele + 1 Then
        masstem = masstem
    ElseIf i > thrustele + 1 Then
        masstem = masstem - massi(i - 2)
    Else
        masstem = masstem - massi(i - 1)
    End If
    temMR = masstem / Smass
    Aigin = ampliaxforce(masstem, Smass)
End If

BenditSolution.Cells(4 + i, 9) = xi * 12 'ft >> in
BenditSolution.Cells(4 + i, 10) = axforce * Aigin
Next i

End Sub
'-------------------------------------------------------------------------

Sub finshear(r1j As Variant, lambdar As Double, lambdar2 As Double, Az As Double, _
    xcm1 As Double, xcm2 As Double, finmu1 As Double, finmu2 As Double, _
    xcg As Double, wn As Double, sigma1alphafin As Double, sigma1totalalpha As Double)
''''')
''========================================================================
''\                       == Subroutine finshear() ==                    /
''\                                                                      /
''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
''========================================================================
'shearandbedningfinssubroutine
'
'===================================
'======= 1st Stages Fin Data =======
'===================================
Dim finspar1 As Integer
Dim cr1 As Double
Dim ct1 As Double
Dim B1 As Double
Dim gamma1 As Double
Dim sigma1delta1 As Double
Dim Nelementf1 As Double

finspar1 = InputDataBendit.Range("a36")  ' fin spar attachment element in section 1
cr1 = InputDataBendit.Range("b36") / 12 'fin root chord first fin section, in >> ft
ct1 = InputDataBendit.Range("c36") / 12 'fin tip chord first fin section, in >> ft
B1 = InputDataBendit.Range("d36") / 12 'exposed semispan first fin section, in >> ft
gamma1 = InputDataBendit.Range("e36") 'LE sweep angle first fin section, degrees
sigma1delta1 = InputDataBendit.Range("f36")
Nelementf1 = InputDataBendit.Range("g36") 'Number of fin elements along the span,

Dim fpw1 As Double
Dim xF1 As Double
Dim finalphadeltacp1 As Double
Dim cnafin1 As Double
Dim cndelta1 As Double
Dim cnat1 As Double
Dim xcpassy1 As Double

fpw1 = InputDataBendit.Range("a39") 'fin panel weight for first section fins, lb
xF1 = InputDataBendit.Range("b39") / 12 'Root Chord LE Body Station first fin section, in >> ft
finalphadeltacp1 = InputDataBendit.Range("c39") / 12 ' Fin alpha and delta center of pressure, in >> ft
cnafin1 = InputDataBendit.Range("d39") 'cn alpha for fin alone airfoil first section
cndelta1 = InputDataBendit.Range("e39") ' Single Panel CN delta, /rad
cnat1 = InputDataBendit.Range("f39") 'tail assembly cn alpha, /rad
'xcpassy1 = InputDataBendit.Range("g39") / 12 'Fin ass'y Xcp, from the root chord LE, in >> ft
xcpassy1 = finalphadeltacp1 - xF1 'Fin ass'y Xcp, from the root chord LE, ft

'===================================
'======= 2st Stages Fin Data =======
'===================================
If StagesNo = 2 Then
    Dim vortex_p_u As Double
    Dim vortex_r As Double
    Dim vortex_i As Double
    
    vortex_p_u = InputDataBendit.Range("a42") / 12 'Trailing Vortex Strength,(1/U)*dgamna/dalpha (only 2 stage), in >>ft
    vortex_r = InputDataBendit.Range("b42") / 12 'Trailing Vortex Spanwise Location at Stage 1 (only 2 stage), in >> ft
    vortex_i = InputDataBendit.Range("c42") / 12 'Trailing Vortex Spanwise Location at Stage 1 (only 2 stage), in >> ft

    Dim finspar2 As Integer
    Dim cr2 As Double
    Dim ct2 As Double
    Dim B2 As Double
    Dim gamma2 As Double
    Dim sigma1delta2 As Double
    Dim Nelementf2 As Double
    
    finspar2 = InputDataBendit.Range("a47")  ' fin spar attachment element in section 2
    cr2 = InputDataBendit.Range("b47") / 12 'fin root chord second fin section, in >> ft
    ct2 = InputDataBendit.Range("c47") / 12 'fin tip chord second fin section, in >> ft
    B2 = InputDataBendit.Range("d47") / 12 'exposed semispan second fin section, in >> ft
    gamma2 = InputDataBendit.Range("e47") 'LE sweep angle second fin section, degrees
    sigma1delta2 = InputDataBendit.Range("f47")
    Nelementf2 = InputDataBendit.Range("g47") 'Number of fin elements along the span
    
    Dim fpw2 As Double
    Dim xF2 As Double
    Dim finalphadeltacp2 As Double
    Dim cnafin2 As Double
    Dim cndelta2 As Double
    Dim cnat2 As Double
    Dim xcpassy2 As Double
    
    fpw2 = InputDataBendit.Range("a50") 'fin panel weight for second section fins, lb
    xF2 = InputDataBendit.Range("b50") / 12 'Root Chord LE Body Station second fin section, in >> ft
    finalphadeltacp2 = InputDataBendit.Range("c50") / 12 ' Fin alpha and delta center of pressure, in >> ft
    cnafin2 = InputDataBendit.Range("d50") 'cn alpha for fin alone airfoil second section
    cndelta2 = InputDataBendit.Range("e50") ' Single Panel CN delta, /rad
    cnat2 = InputDataBendit.Range("f50") 'tail assembly cn alpha, /rad
    'xcpassy2 = InputDataBendit.Range("g50") / 12 'Fin ass'y Xcp, from the root chord LE, in >> ft
    xcpassy2 = finalphadeltacp2 - xF2 'Fin ass'y Xcp, from the root chord LE, ft
    
End If

'===================================
'======= Cal =======
'===================================

Dim Rm1 As Double ' Radius at motor section, first rocket section, ft
Dim bT1 As Double
Rm1 = r1j(finspar1 + 1)
bT1 = B1 + Rm1 'ft

Dim deltayf1 As Double
Dim nfinrow1 As Integer
Dim FPA1 As Double
Dim FPC1 As Double
Dim CLp1 As Double
Dim CLd1 As Double
Dim CLRC1 As Double
deltayf1 = B1 / Nelementf1 'ft
nfinrow1 = Nelementf1 + 1
FPA1 = finplanformA(bT1, cr1, ct1, B1, Rm1) 'Fin planform A first fin section, ft
FPC1 = finplanformC(B1, cr1, ct1) 'Fin planform C first fin section
CLp1 = CLp(cnafin1, B1, Rm1, cr1, ct1) 'per rad
CLd1 = CLdelta(cnafin1, B1, Rm1, cr1, ct1) 'per rad
CLRC1 = CLd1 / (CLp1 * Rm1) 'per ft

If StagesNo = 2 Then
    Dim Rm2 As Double ' Radius at motor section, second rocket section, ft
    Dim bT2 As Double
    Rm2 = r1j(finspar2 + 1)
    bT2 = B2 + Rm2 'ft
    
    Dim deltayf2 As Double
    Dim nfinrow2 As Integer
    Dim FPA2 As Double
    Dim FPC2 As Double
    Dim CLp2 As Double
    Dim CLd2 As Double
    Dim CLRC2 As Double
    deltayf2 = B2 / Nelementf2 'ft
    nfinrow2 = Nelementf2 + 1
    FPA2 = finplanformA(bT2, cr2, ct2, B2, Rm2) 'Fin planform A second fin section, ft
    FPC2 = finplanformC(B2, cr2, ct2) 'Fin planform C second fin section
    CLp2 = CLp(cnafin2, B2, Rm2, cr2, ct2) 'per rad
    CLd2 = CLdelta(cnafin2, B2, Rm2, cr2, ct2) 'per rad
    CLRC2 = CLd2 / (CLp2 * Rm2) 'per ft
End If

Dim rhoSr As Double
rhoSr = rhoSreffn() 'density Sref(q,Sref, U), sl/ft
Dim JJ01 As Double
JJ01 = Ic / (2 * pi * rhoSr / Sref * (alt - l_length - l_alt) * Rm1 ^ 4 * (CLp1))
Dim JJ02 As Double
JJ02 = 0 ' lambda_r = lambda_r0

Dim j As Integer
Dim i As Integer
Dim deltayf As Double
Dim nfinrow As Double
Dim cT_ As Double
Dim cR_ As Double
Dim bT As Double
Dim Rm As Double
Dim cnafin As Double
Dim mudelta As Double
Dim lambdar_ As Double

Dim FPA As Double
Dim FPC As Double
Dim finmu As Double
Dim xF As Double
Dim xcm As Double
Dim CLRC As Double
Dim JJt As Double
Dim sigma1delta As Double

Dim fe As Double
Dim yval As Double
Dim MalphaF As Double
Dim MdeltafF As Double
Dim MlambdarF As Double
Dim mACy As Double
Dim mAy As Double
Dim mby As Double
Dim mby2 As Double
Dim mby3 As Double
Dim varf As Double
Dim varg As Double
Dim varh As Double
Dim avgfg As Double
Dim avggh As Double

Dim meanbendingmoment As Double
Dim MIy As Double

Dim Vyr1 As Double
Dim Vyr2 As Double
Dim Vyi1 As Double
Dim Vyi2 As Double
Dim Vy As Double
Vy = 0

Dim F_total As Double
Dim Mvar As Double

Dim sigmam As Double
Dim DesignFinBendingM As Double
Dim TLf As Double

Dim k1 As Integer
Dim k2 As Integer
Dim jstage As Integer

Dim fvp1 As Double
Dim fvp2 As Double
Dim fvp3 As Double
Dim fvp4 As Double

Dim fmvp1 As Double
Dim fmvp2 As Double
Dim fmvp3 As Double
Dim fmvp4 As Double

Dim gvp1 As Double
Dim gvp2 As Double
Dim gvp3 As Double
Dim gvp4 As Double

Dim gmvp1 As Double
Dim gmvp2 As Double
Dim gmvp3 As Double
Dim gmvp4 As Double


For j = 1 To StagesNo
jstage = StagesNo + 1 - j

If jstage = 1 Then
    deltayf = deltayf1
    nfinrow = nfinrow1
    cT_ = ct1
    cR_ = cr1
    bT = bT1
    Rm = Rm1
    cnafin = cnafin1
    mudelta = meandelta(jstage, lambdar, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, sigma1delta1, sigma1delta2) 'rad -mudelta1
    lambdar_ = lambdar
    FPA = FPA1
    FPC = FPC1
    finmu = finmu1
    xF = xF1
    xcm = xcm1
    CLRC = CLRC1
    JJt = JJ01
    sigma1delta = sigma1delta1
    k1 = 12
    k2 = 13
ElseIf jstage = 2 Then
    deltayf = deltayf2
    nfinrow = nfinrow2
    cT_ = ct2
    cR_ = cr2
    bT = bT2
    Rm = Rm2
    cnafin = cnafin2
    mudelta = meandelta(jstage, lambdar2, rhoSr, Rm1, Rm2, CLp1, CLp2, _
            CLd1, CLd2, sigma1delta1, sigma1delta2) 'rad -mudelta2
    lambdar_ = lambdar2
    FPA = FPA2
    FPC = FPC2
    finmu = finmu2
    xF = xF2
    xcm = xcm2
    CLRC = CLRC2
    JJt = JJ02
    sigma1delta = sigma1delta2
    k1 = 16
    k2 = 17
End If

For i = 1 To nfinrow
    If i = nfinrow Then
        fe = 0.99
    Else
        fe = 1
    End If
    yval = fe * deltayf * (i - 1) + Rm 'ft
    mACy = finM_AplusCy(FPA, FPC, yval) 'ft
    mAy = finM_Ay(FPA, yval) 'ft2
    mby = finM_by(bT, yval) 'ft
    mby2 = finM_by2(bT, yval) 'ft2
    mby3 = finM_by3(bT, yval) 'ft3
    
    MalphaF = mACy * (mby2 + Rm ^ 2 * Log(bT / yval)) - mAy * mby * (Rm ^ 2 / (bT * yval) + 1) - FPC * (mby3 + Rm ^ 2 * mby) 'ft3
    MdeltafF = mACy * mby2 - mAy * mby - FPC * mby3 'ft3
    MlambdarF = mAy * mby2 + FPC * (bT ^ 4 - yval ^ 4) / 4 - mACy * mby3 'ft4
    meanbendingmoment = q * cnafin * (mudelta * MdeltafF + lambdar * MlambdarF) 'ft-lb

    MIy = finmu * (wn ^ 2 * (xF + xcm - xcg) + Az / sigma1totalalpha) * MdeltafF 'lb^2/ft
    
    If StagesNo = 2 And jstage = 1 Then
        If yval = vortex_r Then
            fvp1 = 0
            fvp2 = 0
            fvp3 = 0
            fvp4 = 0

            Vyr1 = 0
        Else
            fvp1 = (-mAy + mACy * vortex_r - FPC * vortex_r ^ 2)
            fvp2 = Application.WorksheetFunction.lN(Abs((bT - vortex_r) / (yval - vortex_r)))
            fvp3 = mACy * (bT - yval)
            fvp4 = FPC * (bT ^ 2 - yval ^ 2 + 2 * vortex_r * (bT - yval)) / 2
        
            Vyr1 = (vortex_p_u / (2 * pi)) * (fvp1 * fvp2 + fvp3 - fvp4) 'ft3
        End If

        fmvp1 = (-mAy + mACy * (-vortex_r) - FPC * (-vortex_r) ^ 2)
        fmvp2 = Application.WorksheetFunction.lN(Abs((bT - (-vortex_r)) / (yval - (-vortex_r))))
        fmvp3 = mACy * (bT - yval)
        fmvp4 = FPC * (bT ^ 2 - yval ^ 2 + 2 * (-vortex_r) * (bT - yval)) / 2
            
        Vyr2 = (-vortex_p_u / (2 * pi)) * (fmvp1 * fmvp2 + fmvp3 - fmvp4) 'ft3
        
        gvp1 = (-mAy + mACy * vortex_i - FPC * vortex_i ^ 2)
        gvp2 = Application.WorksheetFunction.lN(Abs((bT - vortex_i) / (yval - vortex_i)))
        gvp3 = mACy * (bT - yval)
        gvp4 = FPC * (bT ^ 2 - yval ^ 2 + 2 * vortex_i * (bT - yval)) / 2

        Vyi1 = (-vortex_p_u / (2 * pi)) * (gvp1 * gvp2 + gvp3 - gvp4) 'ft3

        gmvp1 = (-mAy + mACy * (-vortex_i) - FPC * (-vortex_i) ^ 2)
        gmvp2 = Application.WorksheetFunction.lN((Abs(bT - (-vortex_i)) / (yval - (-vortex_i))))
        gmvp3 = mACy * (bT - yval)
        gmvp4 = FPC * (bT ^ 2 - yval ^ 2 + 2 * (-vortex_i) * (bT - yval)) / 2

        Vyi2 = (vortex_p_u / (2 * pi)) * (gmvp1 * gmvp2 + gmvp3 - gmvp4) 'ft3
            
        Vy = Vyr1 + Vyr2 + Vyi1 + Vyi2
    End If
    
    F_total = MalphaF - (MIy / q / cnafin) + Vy 'ft-lb
    varf = sigma1totalalpha ^ 2 * (F_total) ^ 2 'ft6 rad2
    avgfg = (8 / Nf) ^ (1 / 2) * sigma1alphafin * sigma1totalalpha * (F_total) * MdeltafF 'ft6 rad2
    varg = sigma1alphafin ^ 2 * MdeltafF ^ 2 'ft6 rad2
    varh = Nf * (sigma1alphafin * MlambdarF * CLRC) ^ 2 * (1 - JJt) ^ 2 'ft6 rad2
    avggh = -(CLRC) * sigma1alphafin ^ 2 * MdeltafF * MlambdarF * (1 - JJt) 'ft6 rad2
    Mvar = q ^ 2 * cnafin ^ 2 * (varf + varg + varh + avgfg + avggh) 'ft2-lb2
    
    sigmam = (Mvar) ^ (1 / 2) 'ft-lb
    
    DesignFinBendingM = norminvfn(meanbendingmoment, sigmam) 'ft-lb
    
    TLf = tensileload(finmu, U * lambdar_, cR_, cT_, Rm, bT, yval)

    BenditSolution.Cells(4 + i, k1) = (yval - Rm) * 12 'ft >> in
    BenditSolution.Cells(4 + i, k2) = DesignFinBendingM * 12  'ft-lb >> in-lb
    BenditSolution.Cells(4 + i, k2 + 1) = TLf 'lb

Next i

Next j
End Sub
'-------------------------------------------------------------------------

Sub parachuteaxialload(x1j As Variant, nrow As Integer, massi As Variant, _
    xcg As Double)
''========================================================================
''\                  == Subroutine parachuteaxialload() ==               /
''\                                                                      /
''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
''========================================================================

'===================================
'==== Parachute Deployment Load ====
'===================================

Dim parachuteOS As Double
Dim parachuteABE As Double
Dim MassPR As Double

parachuteOS = InputDataBendit.Range("A61")
parachuteABE = InputDataBendit.Range("B61")
MassPR = InputDataBendit.Range("C61")

Dim i As Integer
Dim xele As Variant
Dim xp As Double
Dim massp As Variant
Dim msump As Double
Dim msump2 As Double
Dim msump3 As Double
Dim aforcep As Double
msump = 0
msump2 = 0
ReDim xele(1 To nrow)
ReDim massp(1 To nrow)
BenditSolution.Cells(5, 20) = 0
BenditSolution.Cells(5, 21) = 0
BenditSolution.Cells(5, 22) = 0

For i = 2 To nrow + 1
    If i > parachuteABE Then
        massp(i - 1) = massi(i - 2) 'sl
        xele(i - 1) = x1j(i - 1) 'ft
    Else
        massp(i - 1) = massi(i - 1) 'sl
        xele(i - 1) = x1j(i) 'ft
    End If
    If i = parachuteABE + 1 Then
        xele(i - 1) = x1j(i - 1) + 0.0001  'ft
        xp = x1j(i - 1) 'ft
        massp(i - 1) = massi(i - 2) - MassPR 'sl
    End If
    If i = parachuteABE Then
        massp(i - 1) = 0
    End If
    msump = msump + massp(i - 1) 'sl
Next i

Dim MPDD As Double
MPDD = parachuteOS / (msump + MassPR) 'ft/sec2

For i = 1 To nrow
    msump2 = msump2 + massp(i) 'sl
    msump3 = msump - msump2 'sl
    If xcg > xp Then
        If i < parachuteABE Then
            aforcep = -msump2 * MPDD 'lb
        Else
            aforcep = msump3 * MPDD 'lb
        End If
    Else
        If i < parachuteABE Then
            aforcep = msump2 * MPDD 'lb
        Else
            aforcep = -msump3 * MPDD 'lb
        End If
    End If
BenditSolution.Cells(5 + i, 20) = i
BenditSolution.Cells(5 + i, 21) = xele(i) * 12 'ft >> in
BenditSolution.Cells(5 + i, 22) = aforcep 'lb
Next i

End Sub
'-------------------------------------------------------------------------

'groundloadssubroutine
Sub groundMoment(wi As Variant, W As Double, xcgi As Variant, xcg As Double, _
    x1 As Variant, nw As Integer)
''========================================================================
''\                     == Subroutine groundMoment() ==                  /
''\                                                                      /
''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
''========================================================================

'===================================
'====== Ground Handling Loads ======
'===================================

Dim xA As Double
Dim xF As Double
Dim Lf As Double
Dim FF As Double
Dim FA As Double
Dim xj As Double
Dim sumMj As Double
Dim Mj As Double
Dim jterm As Double
Dim JM As Integer
Dim i As Integer
Dim j As Integer

BenditSolution.Cells(5, 25) = 0 'ft >> in
BenditSolution.Cells(5, 26) = 0 'ft-lb >> in-lb
BenditSolution.Cells(5, 27) = 0 'ft-lb >> in-lb

xF = InputDataBendit.Range("A67") / 12 'Axial location of the forward support force, in >> ft
xA = InputDataBendit.Range("B67") / 12 'Axial location of the aft support force,, in >> ft
Lf = InputDataBendit.Range("C67") 'Load factor
FF = W * (xA - xcg) / (xA - xF) 'Forward support force, lb
FA = W * (xcg - xF) / (xA - xF) 'Aft support force, lb

For i = 1 To (nw - 1)
xj = xcgi(i)
JM = i
sumMj = 0
    For j = 1 To JM
    jterm = -wi(j) * (xcgi(j))
    sumMj = sumMj + jterm
    Next j
    If xj <= xF Then
        Mj = sumMj
    ElseIf xj > xF And xj <= xA Then
        Mj = sumMj + FF * (xF)
    ElseIf xj > xA Then
        Mj = sumMj + FF * (xF) + FA * (xA)
    End If
    BenditSolution.Cells(5 + i, 25) = xcgi(i) * 12 'ft >> in
    BenditSolution.Cells(5 + i, 26) = Mj * 12 'ft-lb >> in-lb
    BenditSolution.Cells(5 + i, 27) = Mj * Lf * 12 'ft-lb >> in-lb
    
Next i

BenditSolution.Cells(5 + nw, 25) = x1(nw) * 12 'ft >> in
BenditSolution.Cells(5 + nw, 26) = 0 'ft-lb >> in-lb
BenditSolution.Cells(5 + nw, 27) = 0 'ft-lb >> in-lb

End Sub
'-------------------------------------------------------------------------

Sub Clear_Bendit()
''========================================================================
''\                     == Subroutine Clear_Bendit() ==                  /
''\                                                                      /
''\   This routine is to                                                 /
''\----------------------------------------------------------------------/
''\  Called by:                                                          /
''\    Sub Main()                                                        /
''\                                                                      /
''\  Input:                                                              /
''\                                                                      /
''\  Output:                                                             /
''\                                                                      /
''\                                                                      /
'========================================================================
InputDataBendit.Range("H16").ClearContents
InputDataBendit.Range("D42:G42").ClearContents
InputDataBendit.Range("D53:G53").ClearContents
InputDataBendit.Range("Q11:Q100").ClearContents
InputDataBendit.Range("A80:M80").ClearContents
InputDataBendit.Range("A84:M84").ClearContents
BenditSolution.Range("A5:Z8005").ClearContents

End Sub
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: /home/dara/Professional/projects/RocketCalculator/source/rsandt/media/BENDIT7.xls - OLE stream: '_VBA_PROJECT_CUR/VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO xlm_macro.txt 
in file: xlm_macro - OLE stream: 'xlm_macro'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
' 0085     24 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Input DataBendi
' 0085     23 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Solution Bendi
' 0085     14 BOUNDSHEET : Sheet Information - worksheet or dialog sheet, visible -  Sheet

