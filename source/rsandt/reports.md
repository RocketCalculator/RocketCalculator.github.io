

## Rocket Science and

## Engineering Technologies

## Analysis tools for Tomorrow's Rocket Engineer

[Home](index.html)
[Bio](bio.html)
[Reports](reports.html)
[Contact](contact.html)

Reports provides abstracts of and links to the various rocket engineering topics in this web site. Although I have written most of the topical material, some of it was written by my students. Some topics contain only a Word file containing background information or material referenced by other topics. Other topics have links to both Word and to Excel files implementing the theory documented in the corresponding Word file. Most Excel files use English Units.

Note that many Excel cells are color coded: 
  • Light blue cells are for user inputs
  • Magenta cells are for natural constants
  • Clear cells are for Excel outputs
  • Bright yellow cells are for key results
  • Dark yellow (orange?) cells are for column headers
  • Advisory material, for example, describing where to obtain inputs from other simulations, are found in gray cells

 Also, the Excel files often use Visual Basic functions and subroutines. For such codes to work correctly, the user must first enable macros in Excel. For 2007 or higher versions user must click the Office button at the top left corner of the page and click on Excel options at the bottom. Select the Trust Center option and then click on Trust Center Settings. Next, click on the Macro Settings option and select enable all macros or disable macros with notifications. The latter option will notify you of any macro based excel sheet and give you the opportunity to enable them. Close and reopen Excel for changes to take place. If you have Excel 2003 go to Tools>Options>Security>Macro Security, and then select the appropriate setting. Again, restart Excel for changes to take place. For more information on Macro security visit the [MS Office page.](http://office.microsoft.com/en-us/excel-help/enable-or-disable-macros-in-office-documents-HA010031071.aspx)-->

## Topics:

[Barrowman Equations](#BarrEqua)

[Bifilar Pendulum](#BifiPend)

[Body Aerolasticity](#BodyAero)

[Body Bending Dynamics](#BodyBend)

[Dispersion](#Disp)

[Drag Coefficient](#DragCoef)

[Fin Aeroelasticity](#FinAero)

[Fin Setting](#FinSett)

[Geophysics](#Geop)

[Igniters](#Igni)

[Modified Newtonian Drag](#ModiNewtDrag)

[New Launcher](#NewLaun)

[Nose Pressure Coefficient](#NosePresCoef)

[Nozzles](#Nozzles)

[Ogive Nose](#OgivNose)

[Optimum Nose Shape](#OptiNoseShap)

[Optimum Weight Allocation](#OptiWeigAllo)

[Pitch-Yaw Wavenumber](#PitcWave)

[Propellant Sloshing](#ProSlosh)

[Recovery](#Reco)

[Reliability](#Reliab)

[Roll Lock-In](#RollLockIn)

[Roll Rate](#RollRate)

[Safety](#Safety)

[Single Wedge Airfoil](#SingWeAf)

[Structural Loads](#StruLoad)

[Trajectory Simulation](#TrajSimu)

[Venting](#Vent)

[Wind Compensation](#WindComp)

[Wind Measurement](#WindMeas)

[Wiring Requirements](#WireReq)

[Yo-Yo Despinner](#YoYoDes)

## Barrowman Equations

These files address the issue of estimating the location (body station) of a rocket’s center of pressure (CP) and its normal force coefficient slope. More generally, see [Barrowman Equations.doc](media/Barrowman Equations.doc). The name derives from a joint Master’s thesis by the husband-wife team of James and Judith Barrowman, long considered in the amateur rocket community to be the gold standard technique for CP estimation. This thesis can be found in the file named [Barrowman_Thesis.pdf](media/BarrowmanThesis.pdf). To make application of this process easy, the aerodynamics models are coded into a sequence of EXCEL spreadsheets: [SUBSONIC BARROWMAN EQUATIONS2.4.xls](media/SUBSONIC BARROWMAN EQUATIONS2.4.xls), [TRANSONIC BARROWMAN EQUATIONS.xls](media/TRANSONIC BARROWMAN EQUATIONS.xls) and [SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls). The first file addresses either one or two stage rockets flying at subsonic Mach numbers less than critical, the second addresses a single stage rocket flying at exactly Mach number one, and the last file covers a single stage rocket at low supersonic Mach numbers.

Subsonic fin normal force slope is estimated from “A Plan-Form Parameter for Correlating Certain Aerodynamic Characteristics of Swept Wings”, by F. W. Diederich, NACA Technical Note 2335, 1951. The slender part of the body of revolution is modeled by slender body theory as described in the Barrowman thesis. If the input body profile has a non-zero radius at station 0, the code automatically fits a tangent hemisphere forward of station zero. Hemisphere normal force coefficient slope and center of pressure are based on “Normal Force Acting on a Hemispherical Nose Tip”, by C. P. Hoult, RST memo, 2010, and found in the file [Hemisphere.doc](media/Hemisphere.doc). The normal force interference between fins and body, and between second stage fins and first stage fins is based primarily on “Lift and Center of Pressure of Wing-Body-Tail Combinations at Subsonic, Transonic, and Supersonic Speeds“, by C. W. Pitts, J. N. Nielsen and G. E. Kaattari, NACA Report 1307, 1953. The slender body interference factors are the one selected here. It turns out that Report 1307 is not complete, and the additional material needed is found in “N.A.C.A. Report Supplement for Downwash-Dependent Fin-Fin Interference (rev. 1)” by C. P. Hoult, RST memo, 2010 filed as [1307 Supplement rev2.doc](media/1307 Supplement rev2.doc). The transonic model (Mach number =1) is the same as that for subsonic Mach numbers except only a single stage is included. The fin normal force slope and center of pressure are found from slender body theory. That is, only the front triangular part of the fin carries any lift. Slender body interference factors per NACA Report 1307 are used.

The supersonic model is valid as long as: the fore shock on a pointed body of revolution is attached.  The supersonic fin planform is assumed to be a clipped delta with an unswept trailing edge.  When the leading edges are subsonic and the fin tips doe not mutually interfere, the isolated fins are modeled per “Theoretical Lift of Flat Swept-back Wings at Supersonic Speeds”, by D. Cohen, NACA Technical Note 1555, 1948. The actual form of her results used in the spreadsheet is found in “Calculations of the Lift Slope and Aerodynamic Centre of Cropped Delta Wings at Supersonic Speeds”, by R. H. B. Smith, J. A. Beasley and A. Stevens, C.P. No.562, 1961.  For supersonic leading edges with no interference between the root chord leading edge and the tip chord trailing edge the reference is "Aerobee-Hi (AJ11-6), Fin Airloads" by W. C. House, Aerojet-General Corp. memo, 1954 filed as  [Aerobee Fin Airloads.pdf](media/Aerobee-Hi AJ11-6 Fin Airloads.pdf).  The details are captured in "[Normal Force and Center of Pressure of a Clipped Delta Fin with Supersonic Leading Edges](media/Supersonic LE Fins.doc)", By C. P. Hoult, RST memo, 2013.  For reference the supersonic lift of a flat plate delta planform is filed as SUPERDELTA.xls.  Options for both a flat plat and a single wedge airfoil are provided.  The supersonic normal force developed on the body of revolution is modeled by “A Second-Order Shock-Expansion Method Applicable to Bodies of Revolution Near Zero Lift”, by C. A. Syvertson and D. H. Dennis, NACA Report 1328, 1958. Version 3 of this code includes provision for a concave corner in the body profile. Hemispherical nose tips are modeled using [Hemisphere.doc](media/Hemisphere.doc). For transonic speeds, or hypersonic speeds, the techniques of "When Second Order Shock Expansion Theory Breaks Down", by C.P. Hoult, RST memo, 2013, filed as [SOSX Breakdwn.doc](media/SOSX Breakdwn.doc) is used to extend the results.  The fin-body and body-fin lift interference is based on the same documents identified for the subsonic case. The shock expansion code was built by Armando Fuentes of CSULB while Hien Tran of CSULB built the fin loads for the supersonic leading edge case..

In addition to the above Barrowman models there are several related standalone codes worth mentioning. [SUPERDELTA.xls](media/SUPERDELTA.xls) generates the normal force on an isolated delta wing at any supersonic Mach number. [Single Wedge.doc](media/Single Wedge.doc) documents the supersonic normal force coefficient slope for a wedge airfoil.
[Back To Topic](#2Topic)

## Bifilar Pendulum

[Bifilar Pendulum.doc](media/Bifilar Pendulum.doc) describes the canonical technique for experimentally measuring a rocket’s pitch/yaw moment of inertia. The primary experimental pitfall, resonance between yaw/twisting mode and lateral translation/pendulum mode is identified, and mitigation approaches are discussed. Formulae for moment of inertia estimation from period data are included.

## Body Aeroelasticity

These files describe the structural responses of a long, supple upper stage during vigorous first stage thrusting. A static aeroelastic instability can occur in which the nose tip is slightly bent. This resulting aerodynamic normal force on the tip causes further bending, etc, until structural failure occurs. Alternatively, the increased nose normal force can move the vehicle center of pressure aft until the entire rocket becomes statically unstable. [Upper Stage Bending Influence on Static Stability3.doc](media/Upper Stage Bending Influence on Static Stability3.doc) provides the analysis background. [DIVERGENCE.xls](media/DIVERGENCE.xls) implements the math in a spread sheet.

## Body Bending Dynamics

This supports the estimation of the body bending natural frequencies and the normal mode shapes.  The technique used is a numerical; solution to LaGrange's equations with approximation that only the first three modes are carried.  The code is filed as [FLEXIT.xls](media/FLEXIT(Aries).xls), and the corresponding reference report is [Longitudinal Body Bending Dynamics.doc](media/Longitudinal Body Bending Dynamics.doc).  The results are the first three natural frequencies and the first two normal mode shapes.  The example displayed is for the Aries sounding rocket, a early 1970s  Minuteman I second stage conversion.

The reader is cautioned that when the roll rate becomes resonant with the fundamental body bending frequency, a large angle of attack will occur.  Structural break-up is a possibility, and roll lock-in can also occur.  See "In-Flight Flexure and Spin Lock-In for Antitank Kinetic Energy Projectiles", by A. G. Mikhail, JSR, Vol. 33, No.5, pp 657-664 (1996).

## Dispersion

Dispersion refers to the fact that rocket trajectories are always imperfect. “Dispersion” describes the scattering errors that reflect these imperfections. To estimate this, use [Flt Path Angl Dispersions.doc](media/Flt Path Angl Dispersions.doc) which contains “Flight Path Angle Dispersions (rev.1)”, by C. P. Hoult, RST memo, 2011. This provides a way to estimate the standard deviation in launcher Quadrant Elevation angle for nominally vertical trajectories. A trajectory code can convert this to an impact point error. [DISPERSION.xls](media/DISPERSION.xls) is the corresponding spread sheet implementation.

Much of the other material here documents the ways in which Quadrant Elevation angles other than 90º cause trajectory statistics to change. This QE angle scaling is captured in [Theory Behind DISPERSION.doc](media/Theory Behind DISPERSION.doc). This memo also captures the QE scaling on Unit Wind Effects, both In-Range and Cross-Range. [Launcher Tipoff Errors.doc](media/Launcher Tipoff Errors.doc) describes the right way to design a rail launcher and riding lug system. Finally, estimates on the perturbing effects may be found in [Standardized Perturbation Values.pdf](media/Standardized Perturbation Values.pdf).

## Drag Coefficient

The material in this section is a set of fragmentary codes used to estimate sounding rocket zero lift drag coefficients. The theoretical basis for these is in [Drag Coefficient3.4.docx](media/Drag Coefficient3.4.docx). Mostly this relies on materials provided in Hoerner, but [Modified Newtonian Aero4.docx](media/Modified Newtonian Aero4.docx) is used for locally hypersonic flows. The corresponding Excel code is [DRAG COEFFICIENT3.4.xls](media/DRAG_COEFFICIENT3.4.xls). Note that the supersonic body wave drag is found in [SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls).
[Back To Topic](#2Topic)

## Fin Aeroelasticity

Aeroelasticity includes both static aeroelasticity and a dynamic phenomenon, flutter,  The models discussed here are rough approximations intended to be only good enough to help the designer to stay out of trouble.   [FLUTTER MARGIN1.xls](media/FLUTTER MARGIN1.xls) implements the approximate bending torsion flutter model documented in “Summary of Flutter Experiences as a Guide to the Preliminary Design of Lifting Surfaces on Missiles”, by D. J. Martin, NACA TN-4197, 1958. The output is the margin of safety against flutter. After the Prospector P-8 fin flutter failure, everyone should be sensitive to the possibility of flutter.  Fin static aeroelasticity effects, including Prospector P-18D as a test case, are documented in [Fin Aeroelasticity.doc](media/Fin Aeroelasticity.doc), a slender beam model that develops normal force slope and the roll damping and driving moments.  It is implemented in [TWISTIT.xls](media/TWISTIT.xls). 

## Fin Setting

There are five files in this set. First is [Fin Adjustment Tips.ppt](media/Fin Adjustment Tips.ppt). It provides sketches showing good practice when one must design adjustable fins. Second is [Fin Setting Theory[3].doc](media/Fin Setting Theory[3].doc) that documents the strip theory used to estimate fin setting angles to eliminate misalignment normal force and achieve the desired roll rate. The last is [CANT ANGLE3.xls](media/CANT ANGLE3.xls) that implements the theory described above. [CANT ANGLE3.xls](media/CANT ANGLE3.xls) also estimates the roll damping and driving stability derivatives. Next, the use of spin wedges is documented in files [Spin Wedges.doc](media/Spin Wedges.doc) and [FIN WEDGE.xls](media/FIN WEDGE.xls).  These are included for completeness even though experience shows that spin wedges are a bad idea. Note that much of this is somewhat impractical because the errors in misalignment and cant angle measurement tend to dominate everything else. Thus, in practice, one only attempts to implement a desired roll rate.

## Geophysics

[Geophysics.doc](media/Geophysics.doc) documents modifications to the one-size-fits-all models of the atmosphere, gravity and geodesy conventionally used in rocket analyses. Small sounding rocket simulations are far more sensitive to atmosphere and gravity models than those used to simulate satellite launches. In particular, the tropospheric temperature profile passes through the launch site altitude and temperature, and ends at a latitude-dependent tropopause. The acceleration due to gravity on the geoid varies with latitude according to the Potsdam result. The local earth radius is dependent on latitude also, and is used in modeling the inverse square variation of acceleration of gravity with altitude. [GEOPHYSICS.xls](media/GEOPHYSICS.xls) provides a quantitative description of how the key parameters vary.

## Igniters

Hang fires are a common problem with small sounding rockets. They can be catastrophic if they involve an upper stage. Even first stage hang fires can engender significant launch delays.

The secret sauce is to embed the junction area of an ordinary igniter with a small amount of copper thermite/rubber to produce an enhanced thermal pulse. [Enhanced_Igniters.pdf](media/Enhanced_Igniters.pdf), by two CSULA seniors, Shahan Khalighi and Joseph David Wells, tells the story.
[Back To Topic](#2Topic)

## Modified Newtonian Drag

[Modified Newtonian Aero 4.docx](media/Modified Newtonian Aero4.docx) is a summary recapitulation of Lee’s famous quasi-empirical modification to the hypersonic pressure coefficient. Lee’s idea was to make the stagnation pressure match that which is obtained from flow through a normal shock isentropically compressed to stagnation conditions. Since it applies when the hypersonic similarity parameter K >> 1, it describes blunt bodies, such as a sphere, even at fairly low supersonic Mach numbers. [NEWTON.xls](media/NEWTON.xls) is a spreadsheet representation of a supersonic sphere.

## New Launcher

A new launcher for ESRA sounding rockets was developed during the 2010-2011 academic year. [A New Launcher.doc](media/A New Launcher.doc) contains the overview description, “A New Launcher for University Sounding Rockets”, by Fernando Calderon, Abd Al Chamas, Thomas Wilson, Adam Vore & Berton Vite, AIAA Region VI Student Reseach paper, 2011. The presentation charts used in the conference are in [New Launcher.pptx](media/New Launcher.pptx). Briefing title and authors are the same as above. [Launcher fixed part.pp](media/Launcher fixed part.ppt)t is a conceptual sketch of the fixed base. [Launcher Tipoff Deflection.doc](media/Launcher Tipoff Deflection.doc) estimates static bending deflections of the launcher rail during a launch.

## Nose Pressure Coefficient

These files support the design of an arbitrary slender “smooth” body of revolution in incompressible flow. “Smooth” means the radial profile has no steps, although the body radial profile may have slope discontinuities. This process can be used to design a nose shape that will inhibit separation of vortices from the forward parts of the body, and thus delay the onset of roll lock-in. [Nose Pressure Distro4.doc](media/Nose Pressure Distro4.doc) describes the theory – superposition of sources – used to compute the incompressible surface pressure. [MUNKSHIP2.xls](media/MUNKSHIP2.xls) implements this theory. Finally, [AIAAFelkel3.doc](media/AIAAFelkel3.doc) and the corresponding presentation charts filed as  [AIAAFelkel2.pptx](media/AIAAFelkel2.pptx) covers much of the same material and provides the background to estimation of the critical Mach number in [CRITICAL MACH NUMBER.xls](media/CRITICAL MACH NUMBER.xls).

## Nozzles

Rocket motor nozzles use a deLaval converging-diverging configuration to generate thrust.  Performance of such nozzles can be estimated using the one dimensional isentropic flow equations found in NACA Report 1135, "Equations, Tables and Charts for Compressible Flow".  The one dimensional thrust coefficient is modified by the Malina correction for 3D source flow.  The result is the thrust/chamber pressure* throat area = Cf, the thrust coefficient.  This result is found in [ThrustCf.xls](media/THRUSTCF.xls)

## Ogive Nose

This topic provides the simple geometric properties of ogive noses. The math is captured in [Ogive Nose.doc](media/Ogive Nose.doc). The math, in turn, is implemented in [Ogive Profile.xls](media/Ogive Profile.xls).
[Back To Topic](#2Topic)

## Optimum Nose Shape

These files support the design of a “smooth” body of revolution in subsonic flow. “Smooth” means the radial profile has no step changes, although the body radial profile may have slope discontinuities. This process can used to design a nose shape that will inhibit separation of vortices from the forward parts of the body, and thus delay the onset of roll-lockin. This model will generate the subsonic zero angle of attack pressure distribution over any body of revolution lacking significant separated flow regions. The theory used – superposition of sources – used to compute the incompressible surface pressure distribution, and the Karman-Tsien correction for subsonic Mach numbers are described in “Effect of Different Nose Profiles on Subsonic Pressure Coefficients” by R. J. Felkel, Region VI AIAA Student Research Conference, San Diego, 2011. This paper may be found in [AIAAFelkel3.doc](media/AIAAFelkel3.doc). The associated briefing charts are in [AIAAFelkel2.pptx](media/AIAAFelkel2.pptx). An EXCEL spreadsheet implementing the incompressible source superposition theory is [MUNKSHIP2.xls](media/MUNKSHIP2.xls).

Although it was discovered too late for inclusion in the Felkel paper, it turns out that a superellipse with an exponent of 1.6 provides an excellent match to the optimum nose shape. A superellipse is an ordinary ellipse with the exponent 2 replaced with one having a different value. Felkel's work showed that a tangent ogive nose profile performs almost as well as the optimum, and is therefore a good practical shape. Also, Felkel calculated the critical Mach numbers for a variety of nose shapes. See [Local Sonic Flow.doc](media/Local Sonic Flow.doc).

## Optimum Weight Allocation

One of the common problems encountered in multistage rocket design is the optimum, or best, allocation of weight between stages.  There are several definitions of "best".  For example, one could specify liftoff weight and payload weight and seek that weight allocation that maximized the burnout velocity, one could specify payload weight and burnout velocity and seek that allocation that minimized the liftoff weight.  Often, but not always, these calculations are done using Tsiolkovskii's simplified dynamics model.  Such a description is "Optimum Allocation of Weight Between Two Stages", by C. P. Holt, RST memo, 2013 found as [Two StageWeights.doc](media/Two Stage Weights rev1.doc). This uses the classical Vertregt Lagrangian multiplier technique.  It is coded as [OPT2STAGE.xls](media/OPT2STGE.xls).

Another optimization problem is the best thrust profile for a rocket of fixed total propellant weight ascending vertically under the influence of weight, thrust and aerodynamic drag.  This calculus of variations problem was solved by George Leitmann, "Optimum thrust Programing of High-Altitude Rockets", Aeronautical Engineering Review, June 1957, pp. 63-66.  He showed that the optimum thrust profile for a single stage rocket has an initially "impulsive" burn followed by an extended low thrust sustainer.  This article can be found under [Leitmann.doc](media/Optimum Thrust Programing for High-Altitude Rockets.pdf).

## Pitch-Yaw Wavenumber

[Pitch-Yaw Wavenumber3.doc](media/The Pitch-Yaw Wave Number3.doc) identifies the eponymous parameter as the most important single variable affecting rocket short period dynamics. Its relationship to the pitch-yaw natural frequency, the analogous parameter in stationary dynamics, is documented. A formula for calculating this wave number is included.

## Propellant Sloshing

The major document here is "[An Analysis of the Motion of Liquids in a Partially-Filled Enclosure](media/Analysis of the Motion of Liquids in A Partially-Filled Enclosure.pdf)", PDF file.  It was written using Air Force funds to provide force and moment transfer functions for ballistic missile autopilot analyses including propellant sloshing.  It was the first such analysis for circular tanks (previous work had addressed square tanks). This document was rushed into print when the author was rushed into Air Force active duty, and was therefore not as carefully proofread as it might have been.  An errata sheet for the report is provided in [Sloshing Errata.doc](media/Sloshing Errata.doc).  The natural frequencies of the first three sloshing modes are computed in [SLOSHIT.xls](media/SLOSHIT.xls).
[Back To Topic](#2Topic)

## Recovery

These files address the common need to recover flight hardware intact.  First, the use of a single parachute to both provide a rapid descent and a soft landing by splitting the recovered body in two is described in "Dual Purpose Parachute Recovery System, rev.2" by C. P. Hoult, RST memo, 2013.  It is filed as [DPParachute2.doc](media/DPParachuterev2.doc).  For this scheme the two parts are connected by a lanyard.  The first part to hit must be robust because it will hit hard.  After its impact the parachute will slow down so that the second part has a much gentler impact.  The file implementing this is [ONECHUTE.xls](media/ONECHUTE.xls).  An example file is [25KDSCNT.xls](media/25KDSCNT.xls).  This scheme requires a reefed parachute as described in [Parachute Reefing.doc](media/Parachute Reefing.doc) by C. P. Hoult, RST memo, 26 July 2013.

For rockets with apogees > 25 km, or so, the dynamic pressure naturally occurring during reentry  precludes deployment of a drogue parachute.  The customary engineering solution is to separate the body from the fins while still above most of the atmosphere, and let reentry drag slow the body to subsonic speed at low altitude.  For this to work, the body must be carefully ballasted to place the longitudinal center of pressure where a high angle of attack and high drag coefficient occur.  The theory is described in [Hi Alfa Body Aerodynamics.doc](media/Hi Alfa Body Aero.doc), by C. P. Hoult, RST memo, 25 July 2013, which is implemented in [JORGENSN.xls](media/JORGENSN.xls).  [JORGENSN.xls](media/JORGENSN.xls) generates the trim angle of attack and drag coefficient as a function of flight condition.  The trim drag coefficient must then be entered in a trajectory code to describe the reentry dynamics

## Reliability

These files address the growth of reliability during the flight testing process. [Reliability Growth.doc](media/Reliability Growth.doc) provides the theoretical background and [RELGRWTH.xls](media/RELGRWTH.xls) the Excel implementation.

## Roll Lock-In

These files support the design of sounding rocket tail fins to minimize the probability of roll lock-in.  Roll lock-in occurs when the pitch natural frequency matches the roll rate in powered flight.  Linear theory asserts that the angle of attack (due to thrust misalignment and C.G. offset) will become large at that time.  However, vorticity shed by the forebody at high angle of attack induces a nonlinear roll torque that causes the roll rate to depart from its expected linear increase with velocity and "lock-in" to the pitch natural frequency.  This leads to prolonged high angle of attack, excessive drag, and sometimes mission failure.  

There are two aerodynamic nonlinearities important to roll lock-in.  Besides the vortex-induced roll moment a second important aerodynamic nonlinearity is the Magnus torque from the fins.  Magnus torques from the forebody tend to be very small.

The analytical description of this process can be found in "Sounding Rocket Fin Design to Mitigate Roll Lock-In" by C. P. Hoult and Hien Tran, proceedings of the 2015 IEEE Aerospace Conference, Big Sky, MT, March 07-14, 2015.  This is filed as [Sounding Rocket Fin Design to Mitigate Roll Lock-In.pdf](media/Sounding Rocket Fin Design to Mitigate Roll Lock-In.pdf), and the associated presentation charts, with voice annotation, are filed as [Sounding Rocket Design to Mitigate Roll Lock-In.ppt](media/Sounding Rocket Design to Mitigate Roll Lock-In Voice.ppt).  The math is implemented in [Sounding Rocket Design to Mitigate Roll Lock-In.xls](media/High Alfa Roll Lock-In_rev1.xls).

## Roll Rate

Approximate analyses of small sounding rockets is conveniently done in two parts, boost and post boost.  In both cases the approximations presented here are based on a linear (low angle of attack) dynamics model.  Boost phase roll behaviors are described in "Small Sounding Rocket Boost Phase Roll Rate", by C. P. Hoult, RST memo dated 24 September 2013.  It is filed as [Boost Phase Roll Rate2.doc](media/Boost Phase Roll Rate2.doc).  For a small sounding rocket whose apogee lies in the troposphere, its roll rate at apogee can be estimated from the graph in "Small Sounding Rocket Apogee Roll Rate" by C. P. Hoult, 29 March 2013.  It has been filed as [Apogee Roll Rate.doc](media/Apogee Roll Rate.doc). The roll damping stability derivative needed can be estimated using [CANT ANGLE3.xls](media/CANT ANGLE3.xls).

## Safety

The most current perspective on safety is the [Final 2013 RocketSafetyReport.doc](media/Final 2013 RocketSafetyReport.doc) written for the 8th IREC in Jun 2013.

## Single Wedge Airfoil

The use of a single wedge airfoil for high supersonic fins has been known for decades.  Such fins, with their flat surfaces, are easy to build, and provide good torsional stiffness.  Their normal is developed as a multiplier to be applied to the flat plate result.  See [Single Wedge Airfoil.doc](media/Single Wedge Airfoil.doc) for a description of the theory.  A spreadsheet evaluation of this model is filed as [Normal Force Multiplier.xls](media/Normal Force Multiplier.xls).  Finally, any airfoil wave drag is reported in [SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls) while the base drag on a single wedge airfoil is reported in [DRAG COEFFICIENT3.4.xls](media/DRAG_COEFFICIENT3.4.xls).
[Back To Topic](#2Topic)

## Structural Loads

Structural Loads are the key to rocket structural design.  They arise from four distinct sources:
 • Ground handling loads occurring during preparation for launch.
 • Pressurization loads due to the difference between the external static pressure and the internal cavity pressure of a rocket.
 • Loads arising from the effects of environmental perturbations, mainly wind gusts and thrust misalignment.  Since these are often the most severe when pressurization loads are greatest, a nominal axial load is estimated as part of this package.
 • Transient axial loads associated with an elastic wave moving up the rocket from the thrust chamber.

1. Ground handling loads reported here include only those that have been historically observed to cause failures during prelaunch ground processing.  Since there are many ways to accomplish preflight processing, these files are likely to be incomplete.  The theory is described in [Ground Handling Loads.doc](media/Ground Handling Loads.doc), and the lug failure analysis is implemented in [UNBUTTON.xls](media/UNBUTTON.xls).

2. Pressurization loads arise from the fact that the pressure inside a rocket in flight is, in general, different from that on the outside of the rocket.  While this pressure difference can be mitigated with good venting hole design, it can never be completely eliminated.  The theory for calculating the internal cavity pressure from the isentropic expansion of trapped air is found in [Payload Venting2.doc](media/Payload Venting2.doc), and implemented in [BLOWDOWN2.xls](media/BLOWDOWN2.xls).  The external incompressible pressure coefficient along the body surface is theoretically described in [Nose Pressure Distro4.doc](media/Nose Pressure Distro4.doc), and implemented in [MUNKSHIP2.xls](media/MUNKSHIP2.xls)  Note that [MUNKSHIP2.xls](media/MUNKSHIP2.xls) has an option to automatically generate an ogive nose profile.  If an ogive is not desired, just input the body radius vs. body station table directly.  Adjustment for subsonic compressibility using the Karman-Tsien process for subcritical Mach numbers is done automatically in [BLOWDOWN2.xls](media/BLOWDOWN2.xls).  Estimation of the critical Mach number using a bisection algorithm is done in [CRITICAL MACH NUMBER.xls](media/CRITICAL MACH NUMBER.xls).

For flight Mach numbers greater than critical another approach must be used.  When there is well developed, attached bow shock supersonic flow, the second order shock expansion model implemented in [SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls) can be used.  For transonic Mach numbers, the pressure coefficients must be done with CFD or by using your favorite french curve.

3. [Sounding Rocket Structural Loads.ppt](media/Sounding Rocket Structural Loads.ppt)  provides an introductory overview to this topic. The theory for structural loads arising from external effects is captured in “Sounding Rocket Structural Design Loads (rev.9)”, by C. P. Hoult, RST memo, 2013 to be found in the file [Sounding Rocket Structural Design Loads10.doc](media/Sounding Rocket Structural Design Loads10.doc). It documents the theory for body bending moment, shear force, steady state axial force, fin bending moment and parachute deployment axial force. Assuming gaussian statistics, it develops loads for an input value of the probability of exceedance. These loads algorithms are implemented in [BENDIT7.xls](media/BENDIT7.xls).

The loads estimated in [BENDIT7.xls](media/BENDIT7.xls) depend on the angle of attack statistics. The models presented here presume a constant axial acceleration leading to dynamical differential equations with constant coefficients in the altitude domain. For thrust misalignment, the reference is “Thrust Misalignment Response”, By C. P. Hoult, RST memo, 2010. This reference also estimates the dispersive flight path angle change due to thrust misalignment. See [Thrust Misalignment.doc](media/Thrust Misalignment.doc). The gust response is presented in “[Sounding Rocket Boost Phase Gust Angle of Attack](media/Sounding Rocket Boost-Phase Gust Angle of Attack1.zip)”, by C. P. Hoult, JSR, Vol 49, no.3, pp507-511. It is based on a simple Dryden gust autocorrelation model. This is filed as Sounding Rocket Gust Angle of Attack.doc. Both models presume zero short period damping. Inclusion of damping would reduce the estimated angles of attack. Quantitative perturbing effect values can be estimated from “Standardized Perturbation Values for Several Sounding Rockets to be Used in the Calculation of Dispersion and Structural Loads”, by R. L. Ammons and C. P. Hoult, Space General memo 8110:M0658:ak, 1970, filed as [Standardized Perturbation Values.pdf](media/Standardized Perturbation Values.pdf).

Additional thrust misalignment and C.G. offset data can be found in “[Thrust Misalignments of Fixed-Nozzle Solid Rocket Motor](media/Thrust Misalignments of Fixed-Nozzle Solid Rocket Motors.pdf)” by R. N. Knauber, JSR Vol. 33, No. 6, pp 794-799. The reader is cautioned that the perturbation data reported in the above references was all obtained from rockets manufactured in an industrial environment with hard tooling under rigorous quality assurance. Rockets built under less stringent conditions can be expected to have larger misalignments.

The effects of a flexible nose or upper stage structure are described in [Upper Stage Bending Influence on Static Stability3.doc](media/Upper Stage Bending Influence on Static Stability3.doc).  This model has been incorporated into [BENDIT7.xls](media/BENDIT7.xls).  It includes both the increase in nose normal force and the inertial reactions to nose deflections.

Next, many rocket structures carry their bending loads with multiple longerons stabilized by bulkheads.  The allocation of bending loads among the longerons is described in [Longeron Bending.doc](media/Longeron Bending.doc).

The fourth topic is the effect on axial loads during transient events such as rocket motor ignition and parachute deployment.  No detailed analysis of these processes is presented here.  However, a rough approximation can be found in [Rocket Engine Ignition Structural Shock.doc](media/Rocket Engine Ignition Structural Shock.doc).  This model links three masses together by springs driven from below by an impulsive increase in thrust.  An amplification factor of 3 over steady state axial load is found.

Finally, there is an intimate connection between [BENDIT7](media/BENDIT7.xls) and the [Barrowman Equations](media/Barrowman Equations.doc) used to estimate aerodynamic forces. [BENDIT7](media/BENDIT7.xls) has an intrinsic crib sheet telling where the [BENDIT7](media/BENDIT7.xls) inputs can be found in the [Barrowman](media/Barrowman Equations.doc) codes.
[Back To Topic](#2Topic)

## Trajectory Simulation

A good trajectory simulation code is of the first importance to most rocket engineering processes. [SKYAERO 7.6.2.xls](media/SKYAERO7.6.2.xls) is two degree of freedom (2DOF) point mass precision trajectory simulation using fourth order Runge Kutta numerical integration. The state vector includes two positions, vertical and horizontal, two velocity components and the rocket mass. It is capable of simulating up to three powered stages with user-defined coast phases.  It can simulate launches from an aircraft, a balloon and a launcher on the ground. See [Events_and_Phases(rev3).doc](media/Events_and_Phases(rev3).doc) for a description of what is meant by an event or a phase.  All phase change events except leaving the launcher and transitioning to free flight are based on input values for the boundary event time after liftoff (TALO).  The initial conditions for a first stage powered phase coming immediately after a parachute stabilized phase are filed as [Air Launched Rocket.doc](media/Air Launched Rocketrev1.doc), with a numerical simulation of the initial constrained powered flight phase filed as [Descending Rocket on Rail.xls](media/Descending Rocket on Rail.xls).  Note that when a Powered Flight Phase follows a Parachute Stabilized Phase a Rail-Constrained Powered Flight Phase must come before any Free Flight Powered Flight Phase.  Use the simulation launcher length model in [SKYAERO](media/SKYAERO7.6.2.xls).  Phase changes are assumed to always occur at the end of an integration step. In general, an integration step size of 0.01 second seems to work well. The major exceptions are the parachute deployment events in which parachutes are assumed to be instantly deployed in their steady state configurations.  The very high initial accelerations after parachute deployment require a shorter step size, typically 0.001 second.  This shorter step is continued in groups of ten steps to ensure the basic “heartbeat” of a trajectory run is maintained.  The atmosphere, geodesy and gravity models used are described in [Geophysics.doc](media/Geophysics.doc). The SKYAERO code has been developed by three CSULB graduate students, Armando Fuentes, Hien Tran and Michael Tong under the direction of C. P. Hoult. Fuentes, Tran & Tong also wrote the  “SKYAERO v7.6.1 User’s Manual” found in  [SKYAEROmanual_ver3.pdf](media/SKYAEROmanual_ver3.pdf). Finally, a good top level description of SKYAERO can be found in [Revised SKYAERO Notes.ppt](media/Revised SKYAERO Notes.ppt).

All point mass codes estimate the rotational degrees of freedom using a priori assumptions.  For fin-stabilized rockets the key assumption is that the rocket always heads instantly into the relative wind.  The relative wind (purely horizontal) has two parts, the first due to rocket motion and the second due to motion of the earth’s atmosphere (winds).  See “The Effect of Wind and Rotation of the Earth on Unguided Rockets” by J.V. Lewis, Ballistic Research Laboratories Report 685, 1948.  A copy of this Report is posted as [The Effect of Wind and Rotation of the Earth on Unguided Rockets.pdf](media/The Effect of Wind and Rotation of the Earth on Unguided Rockets.pdf). These notes also provide an outline of the launcher adjustment process to correct for winds.

There are two issues with this approach. First, it is not possible for a rocket to head instantly into the relative wind at low altitudes just above the launcher.  The aerodynamic torque available for such rotations is proportional to dynamic pressure which starts from zero at ignition.  The resolution is to use two singular perturbation corrections, one to reduce the low altitude wind profile, and other to extend the launcher length simulated.  The references are (1) “Finite Inertia Corrections to the Lewis Method Wind Response”, by C.P. Hoult, Aerospace Corp. I.O.C. A79-5435-44, 1979, posted as [Finite Inertia Corrections.pdf](media/Finite Inertia Corrections.pdf), and (2) “Launcher Length for Sounding-Rocket Point-Mass Trajectory Simulations”, by C.P. Hoult, Journal of Spacecraft and Rockets, Vol. 13, No. 12, Dec 1976, pp760-761, posted as [Launcher Length for Sounding-Rocket Point-Mass Traj. Sim.pdf](media/Launcher Length for Sounding-Rocket Point-Mass Traj. Sim.pdf). Both corrections require an estimate on the pitch-yaw wavelength, or alternatively, the pitch wave number near the launcher. See [The Pitch-Yaw Wave Number3.doc](media/The Pitch-Yaw Wave Number3.doc).

The second issue arises from the fact that real world winds cause nearly all sounding rocket trajectories to be non-planar. However, the major application of trajectory analysis to the wind response problem is per J.V. Lewis to estimate the Wind Weighting Factor and the In Range and Cross Range Unit Wind Effects. [Non-Vertical Launch Effects.doc](media/Non-Vertical Launch Effects.doc) provides a technique to estimate both Unit Wind Effects given the Unit Wind Effect for a vertical (QE = 90º) launch.

Finally, thrust data for common commercial rocket motors can be found in ThrustCurve.org. Drag curves can be estimated from [DRAG_COEFFICIENT3.4.xls](media/DRAG_COEFFICIENT3.4.xls) that implements data from Hoerner, “Aerodynamic Drag”.

A related topic is trajectory design to satisfy both apogee altitude and a landing range constraints.  The relevant algorithms, some iterative,  for this process are found in [Trajectory Constraints.doc](media/Trajectory Contraints.doc).  An implementation framework is [TRAJCON.xls](media/TRAJCON.xls).
[Back To Topic](#2Topic)

## Venting

The tools here can be used to estimate the internal pressure in a compartment, say the payload bay, of an ascending rocket. The theory is captured in [Payload Venting2.doc](media/Payload Venting2.doc) The full orifice equations for both subsonic and sonic throats are discussed, including a Mach number-dependent external pressure. A fourth order Runge Kutta integration algorithm is used in [BLOWDOWN2.xls](media/BLOWDOWN2.xls) to develop numerical results.

Start with subsonic aerodynamics just like a rocket does. Find the radius vs. body station, and input this in the appropriate sky blue cells in [MUNKSHIP2.xls](media/MUNKSHIP2.xls). The other sky blue input cells are already filled in. [MUNKSHIP2.xls](media/MUNKSHIP2.xls) finds the local surface pressure coefficient CP by putting a distribution of incompressible sources along the rocket centerline, and finding the source strength distribution by satisfying the flow tangency condition on the surface. The result is the pressure coefficient CP along the body.

For supersonic Mach numbers, we use[ SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls) to generate CP along the body. [SUPERSONIC BARROWMAN EQUATIONS3.5.xls](media/SUPERSONICBARROWMANEQUATIONS3.5.xls) uses second order shock expansion theory to estimate the CP distribution. The rub comes for transonic Mach numbers. There is no easy-to-use algorithm for such cases. What most engineers do is to haul out their favorite french curve and sketch in something that looks right. Of course, CFD can be used to do CP for any Mach number, but it’s never too quick and easy to apply.

The next step is to find the critical Mach number for this problem. When the free stream Mach number reaches the critical Mach number the local flow becomes sonic (ML = 1). At a slightly higher free stream Mach number the local Mach number becomes supersonic, and then somewhere downstream ML returns to subsonic via shock wave(s). We know approximately where (body station) our vent holes will be drilled. Now find that body station forward of the vent hole station where the pressure coefficient is smallest. Note this minimum CP. The whole idea about finding the critical Mach number is that compressible subsonic flow is that is can be obtained by a transformation from incompressible flow. However, this is no longer possible when shock waves are present. Thus the critical Mach number is an upper bound on analytic modeling of CP. Now, execute [CRITICAL MACH NUMBER.xls](media/CRITICAL MACH NUMBER.xls), and note the result.

Of course, we need to know the trajectory to estimate cavity pressures. Our trajectory code is [SKYAERO7.6.2.xls](media/SKYAERO7.6.2.xls). Although I’m going to send you a copy, and it’s OK if you want to run it yourself, we use trajectory results for so many things that it’s a good idea to have a reference run that that all can use to ensure consistency.

Finally, le piece de resistance: First, find the incompressible CP for the vent hole body station, and input it and the critical Mach number into [BLOWDOWN2.xls](media/BLOWDOWN2.xls). Then, paste the trajectory data from [SKYAERO7.6.2.xls](media/SKYAERO7.6.2.xls) into [BLOWDOWN2.xls](media/BLOWDOWN2.xls), and run it to find the maximum pressure difference between the cavity and the local external pressure, PC - PX. Note that the input hole throat area AT is the sum of all holes venting the cavity in question.

The real issue is how much pressure difference the cavity door can withstand, and the hole throat area needed to stay below it. This can be found from the Espinoza, Ruiz and Vite AIAA paper "Sounding Rocket Allowable Differential Pressure" presented in Seattle in 2012, and filed as [2012 AIAA Conference.ppt](media/2012 AIAA Conference.ppt).  The same material in textual form called "Sounding Rocket Allowable Differential Pressure" is filed as [AllowableDiffPressure.doc](media/AllowableDiffPressure.doc). The theoretical basis for this is found in [Door Failure.doc](media/Door Failure.doc). All that remains is to iterate until the correct hole size is found. As a cautionary note, [BLOWDOWN2.xls](media/BLOWDOWN2.xls) allows external air to flow into the cavity as well as trapped air to flow out. If the internal pressure is too small collapse of the cavity walls, or inward failure of the cavity door is possible.
[Back To Topic](#2Topic)

## Wind Compensation

Wind compensation is the process used to adjust the launcher azimuth and quadrant elevation angle to place the predicted impact point at some desired location.  It requires that the vector wind field at the time of launch be estimated and access to a precision trajectory simulation be available.  A full technical description of this is found in [Wind Compensation for Small Sounding Rockets.ppt](media/Wind Compensation for Small Sounding Rockets.ppt). The software tool to be used in the field to estimate the launcher azimuth and quadrant elevation angles is filed as  [LAUNCHER ANGLES.xls](media/LAUNCHER ANGLES.xls).  The interface to [SKYAERO7.6.2.xls](media/SKYAERO7.6.2.xls) is via north-south and east-west components of measured winds generated by the Government and [WIND CALCULATOR.xlsx](media/WIND CALCULATOR.xlsx) being entered into [SKYAERO7.6.2.xls](media/SKYAERO7.6.2.xls) by hand.  Finally, the classsical paper on wind phenomenology by Isaac Van der Hoven is found as [Van der Hoven.pdf](media/Van der Hoven.pdf).  It shows that there will not be enough time to compensate for turbulence.

## Wind Measurement

For any rocket larger than the small hobby rockets sold by Estes, wind measurement and trajectory wind compensation by adjusting the launcher azimuth and elevation angles is essential to trouble free recovery operations. This is because uncompensated winds can move the impact point prodigious distances, often of the same order as apogee altitude. Without wind compensation, that implies a lot of cross country running over hot desert sands.

The first step in wind compensation is measurement of the wind field that a rocket will fly through. We propose a simple wind measurement scheme. Use aviation weather for winds at higher altitudes, and a simple tethered pilot balloon (pibal) sensor to measure low altitude in situ winds near the launch site. Aviation winds aloft can be found by a telephone call to the FAA. [Airport_Communications_Lucerne_Valley.doc](media/Airport_Communications_Lucerne_Valley.doc) is a data base developed by Faisal Buharie, a CSULB student and a private pilot, which provides voice links to the FAA for launches from the Lucerne Valley ROC launch site. Similar data bases can be developed for other launch sites.

The tethered pibal wind sensor is described in [CSULBWindSensor.doc](media/CSULBWindSensor.doc) and a slightly later version of the same paper, [A New Wind Sensor for Rockets.pdf](media/A New Wind Sensor for Rockets.pdf). These documents, and all the fabrication and testing described were done by four CSULB undergraduate students, Faisal Buharie, Samir Mohammed, Oscar Mejia and Anusha Prabhakar. There are several key tricks needed to implement what would otherwise be a simple scheme:

1. Be sure to include the effects of Reynolds number on balloon drag as it influences boundary layer transition.

2. The assumption of a straight line tether is valid to first order.  However, bias errors due to gravity and aerodynamic drag acting on the tether should be reflected in the data processing. See [TPB Bias Errors.doc](media/TPB Bias Errors.doc) for a description of these effects.

3. Nonlinearities in the winch tether deployed vs. winch revolutions should be modeled.

4. The importance of using a SkyScout™ to measure azimuth and elevation angle of the line of sight to the pibal cannot
     be overestimated

Some of these details are described in [Tether Catenary.doc](media/Tether Catenary.doc), [Winch Equations.doc](media/Winch Equations.doc), [Winch Concept.ppt](media/Winch Concept.ppt) and [Balloon_Inflating_Deployment_and Disassembly.doc](media/Balloon_Inflating_Deployment_and_Disassembly.doc) by Faisal Buharie.

Some wind data, obtained while a cold front was moving through the test area, can be found in [Mojave Winds.doc](media/Mojave Winds.doc).

## Wiring Requirements

The proliferation of ESRA-class sounding rocket failures in recent years has been followed by failure studies.  One of the more common failure root causes is improper wiring design, assembly and testing.  The remedy is to do it right.  Mr. Douglas Sinclair, President of Sinclair Interplanetary, a Toronto-based manufacturer of spacecraft components, has written a how-to report, [Wiring Rules.pdf](media/WiringRules.pdf).  All are urged to read and apply this report to their rocket projects.

## Yo-Yo Despinner

The yo-yo despinner is a innovative approach to despin a rocket or satellite.  Invented at JPL in the early 1960s it has been widely used since..  The reference for this code is "NASA Technical Note D-708, "Theory and Design Curves for a Yo-Yo De-Spin Mechanism for Satellites", by J. V. Fedor, August, 1961.  The code is filed as [YO-YO DSP.xls](media/YO-YO DSP.xls).  It provides estimates on the despin weights. 

[Back To Top](#top)

