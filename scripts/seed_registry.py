"""Seed site/js/registry.json and enrich site/references/references.json.

Inputs : data/catalog.json (parsed from rsandt.com/reports.html), PDFs in site/references/.
Outputs: site/js/registry.json   - areas, topics, calculators, non-PDF source files
         site/references/references.json - one entry per served PDF with a readable title

Titles/authors/dates below were read from each document's title block (see docs/PLAN.md).
Re-run after adding a calculator:  python3 scripts/seed_registry.py
"""
import json, os, re, html, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RSANDT = 'http://www.rsandt.com/media/'

# --- Reference metadata: basename (no extension) -> (title, authors, date/venue) -------------
REF_META = {
    # original PDFs
    'A New Wind Sensor for Rockets': ('A New Wind Sensor for Rocket Launches', 'M. F. Buharie, S. Mohamed', 'AIAA student paper, 2008'),
    'Aerobee-Hi AJ11-6 Fin Airloads': ('Aerobee-Hi (AJ11-6) Fin Airloads', 'W. C. House', 'Aerojet-General memo, 1954'),
    'Analysis of the Motion of Liquids in A Partially-Filled Enclosure': ('An Analysis of the Motion of Liquids in a Partially-Filled Enclosure (R-222)', 'C. P. Hoult', 'MIT Instrumentation Laboratory'),
    'BarrowmanThesis': ('The Practical Calculation of the Aerodynamic Characteristics of Slender Finned Vehicles', 'J. S. Barrowman', 'M.S. thesis, Catholic University of America, 1967'),
    'Enhanced_Igniters': ('Enhanced Igniters', 'S. Khalighi, J. D. Wells', 'CSULA senior project'),
    'Finite Inertia Corrections': ('Finite Inertia Corrections to the Lewis Model Wind Response', 'C. P. Hoult', 'The Aerospace Corporation, 1979'),
    'Launcher Length for Sounding-Rocket Point-Mass Traj. Sim': ('Launcher Length for Sounding-Rocket Point-Mass Trajectory Simulations', 'C. P. Hoult', 'J. Spacecraft & Rockets 13(12), 1976'),
    'Optimum Thrust Programing for High-Altitude Rockets': ('Optimum Thrust Programing for High-Altitude Rockets', 'G. Leitmann', 'U.S. Naval Ordnance Test Station'),
    'SKYAEROmanual_ver3': ('SKYAERO v7.6.1 User’s Manual', 'A. Fuentes, C. P. Hoult, H. Tran, M. Tong', '2014'),
    'Sounding Rocket Fin Design to Mitigate Roll Lock-In': ('Sounding Rocket Fin Design to Mitigate Roll Lock-In', 'C. P. Hoult, H. Tran', 'Conference paper'),
    'Standardized Perturbation Values': ('Standardized Perturbation Values for Several Sounding Rockets (Dispersion & Structural Loads)', 'R. L. Ammons, C. P. Hoult', 'Aerojet-General memo, 1970'),
    'The Effect of Wind and Rotation of the Earth on Unguided Rockets': ('The Effect of Wind and Rotation of the Earth on Unguided Rockets', 'J. V. Lewis', 'BRL Report 685, 1949'),
    'Thrust Misalignments of Fixed-Nozzle Solid Rocket Motors': ('Thrust Misalignments of Fixed-Nozzle Solid Rocket Motors', 'R. N. Knauber', 'J. Spacecraft & Rockets 33(6), 1996'),
    'Van der Hoven': ('Power Spectrum of Horizontal Wind Speed (0.0007 to 900 Cycles per Hour)', 'I. Van der Hoven', 'J. Meteorology 14, 1957'),
    'WiringRules': ('Safety-critical Wiring Rules (Rev 1.0)', 'D. Sinclair', '8th IREC, 2012'),
    # converted from Word
    '1307 Supplement rev2': ('NACA Report 1307 Supplement for Downwash-Dependent Fin-Fin Interference', 'C. P. Hoult', 'RS&T memo, 2014'),
    'A New Launcher': ('A New Launcher for University Sounding Rockets', 'F. Calderon, A. Al Chamas, T. Wilson, A. Vore, B. Vite', 'AIAA Region VI student paper, 2011'),
    'AIAAFelkel3': ('Effect of Different Nose Profiles on Subsonic Pressure Coefficients', 'R. J. Felkel', 'AIAA student paper'),
    'Air Launched Rocketrev1': ('Rocket Launches from a Stabilization Parachute (rev. 1)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Airport_Communications_Lucerne_Valley': ('Airport Communications — Lucerne Valley', '', 'Field-operations note'),
    'AllowableDiffPressure': ('Sounding Rocket Allowable Differential Pressure', 'A. Espinoza, B. Vite, et al.', 'AIAA student paper'),
    'Apogee Roll Rate': ('Small Sounding Rocket Apogee Roll Rate', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Balloon_Inflating_Deployment_and_Disassembly': ('Balloon Inflating, Deployment and Disassembly', '', 'Field-operations procedure'),
    'Barrowman Equations': ('Barrowman Equations', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Bifilar Pendulum': ('Moment of Inertia Measurement with a Bifilar Pendulum', 'C. P. Hoult', 'RS&T memo, 2009'),
    'Boost Phase Roll Rate2': ('Small Sounding Rocket Boost Phase Roll Rate', 'C. P. Hoult', 'RS&T memo, 2013'),
    'CSULBWindSensor': ('A New Wind Sensor for Rocket Launches (CSULB report)', 'M. Samir, M. F. Buharie', 'CSULB'),
    'DPParachuterev2': ('Dual Purpose Parachute Recovery System (rev. 2)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Door Failure': ('Pressure Strength of Taped-On Doors', 'C. P. Hoult', 'RS&T memo, 2011'),
    'Drag Coefficient3.4': ('Drag Coefficient (rev. 3.4)', 'C. P. Hoult', 'RS&T memo, 2016'),
    'Events_and_Phases(rev3)': ('Events and Phases (rev. 3)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Fin Aeroelasticity': ('Effects of Fin Static Aeroelasticity on Roll Rate', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Fin Setting Theory[3]': ('Strip Theory for Setting Fin Angles (rev. 3)', 'C. P. Hoult', 'RS&T memo, 2014'),
    'Final 2013 RocketSafetyReport': ('Safety Report — 8th Intercollegiate Rocket Engineering Competition', '', 'IREC, 2013'),
    'Flt Path Angl Dispersions': ('Flight Path Angle Dispersions (rev. 1)', 'C. P. Hoult', 'RS&T memo, 2011'),
    'Geophysics': ('Sounding Rocket Geophysical Environment', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Ground Handling Loads': ('Ground Handling Loads', 'C. P. Hoult', 'RS&T memo, 2014'),
    'Hemisphere': ('Normal Force Acting on a Hemispherical Nose Tip', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Hi Alfa Body Aero': ('Body of Revolution High Alpha Aerodynamics', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Launcher Tipoff Deflection': ('Launcher Tipoff Deflection', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Launcher Tipoff Errors': ('Launcher Tipoff Errors', 'C. P. Hoult', 'RS&T memo, 2008'),
    'Local Sonic Flow': ('Compressibility Effects on a Minimum Pressure Gradient Nose', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Longeron Bending': ('Design Bending Loads for a Multiple Longeron Structure', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Longitudinal Body Bending Dynamics': ('Longitudinal Body Bending Dynamics', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Modified Newtonian Aero4': ('Modified Newtonian Aerodynamics (rev. 4)', 'C. P. Hoult', 'RS&T memo, 2016'),
    'Mojave Winds': ('Mojave Winds — Tether and Winch Calibration Remarks', 'C. P. Hoult', 'Correspondence'),
    'Non-Vertical Launch Effects': ('Non-Vertical Launch Effects (rev. 1)', 'C. P. Hoult', 'RS&T memo, 2012'),
    'Nose Pressure Distro4': ('Nose Pressure Distribution (rev. 4)', 'C. P. Hoult', 'RS&T memo, 2012'),
    'Ogive Nose': ('Ogive Nose', 'C. P. Hoult', 'RS&T memo, 2011'),
    'Parachute Reefing': ('Parachute Reefing', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Payload Venting2': ('Payload Bay Venting in Flight (rev. 2)', 'C. P. Hoult', 'RS&T memo, 2012'),
    'Reliability Growth': ('Reliability Growth During Flight Test', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Rocket Engine Ignition Structural Shock': ('Rocket Engine Ignition Structural Shock', 'C. P. Hoult', 'RS&T memo, 2014'),
    'SOSX Breakdwn': ('When Second Order Shock Expansion Theory Breaks Down', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Single Wedge Airfoil': ('Supersonic Single Wedge Airfoil', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Single Wedge': ('Supersonic Single Wedge Airfoil (normal-force slope)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Sloshing Errata': ('Errata for “An Analysis of the Motion of Liquids in a Partially-Filled Enclosure”', 'C. P. Hoult', 'RS&T memo'),
    'Sounding Rocket Structural Design Loads10': ('Sounding Rocket Structural Design Loads (rev. 9)', 'C. P. Hoult', 'RS&T memo'),
    'Spin Wedges': ('Static Aeroelastic Effects on Fins with Spin Wedges', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Supersonic LE Fins': ('Normal Force and Center of Pressure of a Clipped Delta Fin with Supersonic Leading Edges', 'C. P. Hoult', 'RS&T memo, 2013'),
    'TPB Bias Errors': ('Tethered Pilot Balloon Bias Errors (rev. 1)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Tether Catenary': ('Kite Catenary', 'C. P. Hoult', 'RS&T memo, 2006'),
    'The Pitch-Yaw Wave Number3': ('The Pitch-Yaw Wave Number (rev. 3)', 'C. P. Hoult', 'RS&T memo, 2013'),
    'Theory Behind DISPERSION': ('The Theory Behind DISPERSION', 'C. P. Hoult', 'RS&T memo, 2007'),
    'Thrust Misalignment': ('Thrust Misalignment Response', 'C. P. Hoult', 'RS&T memo, 2010'),
    'Trajectory Contraints': ('Trajectory Constraint Solution Algorithm', 'C. P. Hoult', 'RS&T memo, 2014'),
    'Two Stage Weights rev1': ('Optimum Allocation of Weight Between Two Stages (rev. 1)', 'C. P. Hoult', 'RS&T memo, 2015'),
    'Upper Stage Bending Influence on Static Stability3': ('Upper Stage Bending Influence on Static Stability (rev. 3)', 'C. P. Hoult', 'RS&T memo, 2012'),
    'Winch Equations': ('Winch Equations', 'C. P. Hoult', 'RS&T memo, 2008'),
}

AREAS = [
    ('aero', 'Aerodynamics', 'Centre of pressure, drag, nose shapes and supersonic flow.'),
    ('struct', 'Structures & Aeroelasticity', 'Loads, bending, flutter and pressurisation.'),
    ('dyn', 'Flight Dynamics & Mass Properties', 'Stability, roll, inertia and dispersion.'),
    ('traj', 'Trajectory, Wind & Launch', 'Trajectory simulation, wind and launcher design.'),
    ('recovery', 'Recovery', 'Parachutes and descent.'),
    ('prop', 'Propulsion & Vehicle Design', 'Nozzles and staging.'),
    ('env', 'Environment', 'Atmosphere, gravity and Earth model.'),
    ('safety', 'Safety & Reliability', 'Reliability growth.'),
]

# topic id -> (slug, area, plain-language summary)
TOPICS = {
    'BarrEqua': ('barrowman-equations', 'aero', 'Where the aerodynamic centre of pressure sits and how strongly the body and fins lift — the core of static stability.'),
    'BifiPend': ('bifilar-pendulum', 'dyn', 'Measure a rocket’s pitch/yaw moment of inertia by swinging it from two wires.'),
    'BodyAero': ('body-aeroelasticity', 'struct', 'How a long, flexible upper stage can bend under nose loads until it diverges or loses stability.'),
    'BodyBend': ('body-bending-dynamics', 'struct', 'Natural bending frequencies and mode shapes of the rocket body.'),
    'Disp': ('dispersion', 'traj', 'How launcher, wind and thrust errors scatter the impact point.'),
    'DragCoef': ('drag-coefficient', 'aero', 'Zero-lift drag build-up: skin friction, base, pressure and parasite drag.'),
    'FinAero': ('fin-aeroelasticity', 'struct', 'Fin flutter margin and static twist of flexible fins.'),
    'FinSett': ('fin-setting', 'dyn', 'Set fin cant angles to cancel misalignment and give the roll rate you want.'),
    'Geop': ('geophysics', 'env', 'Local atmosphere, gravity and Earth radius tuned to the launch site.'),
    'Igni': ('igniters', 'prop', 'Avoiding hang fires with thermite-enhanced igniters.'),
    'ModiNewtDrag': ('modified-newtonian-drag', 'aero', 'Lees’ modified Newtonian pressures for blunt shapes at supersonic speed.'),
    'NewLaun': ('new-launcher', 'traj', 'Design of a university sounding-rocket launcher and rail deflection.'),
    'NosePresCoef': ('nose-pressure-coefficient', 'aero', 'Incompressible surface pressure on a slender nose by source superposition.'),
    'Nozzles': ('nozzles', 'prop', 'De Laval nozzle thrust coefficient with the Malina 3-D correction.'),
    'OgivNose': ('ogive-nose', 'aero', 'Shape a nose cone and see its drag, tip shocks, lift, bending, surface pressure and tip temperature.'),
    'OptiNoseShap': ('optimum-nose-shape', 'aero', 'Subsonic nose shaping to delay vortex separation and roll lock-in.'),
    'OptiWeigAllo': ('optimum-weight-allocation', 'prop', 'Best split of weight between two stages for maximum burnout velocity.'),
    'PitcWave': ('pitch-yaw-wavenumber', 'dyn', 'The single most important parameter of rocket short-period motion.'),
    'ProSlosh': ('propellant-sloshing', 'dyn', 'Natural frequencies and forces of liquid sloshing in round tanks.'),
    'Reco': ('recovery', 'recovery', 'Single-parachute dual-purpose recovery, reefing and descent rates.'),
    'Reliab': ('reliability', 'safety', 'How reliability grows from one flight test to the next.'),
    'RollLockIn': ('roll-lock-in', 'dyn', 'Fin design to avoid roll locking onto the pitch frequency.'),
    'RollRate': ('roll-rate', 'dyn', 'Boost-phase and apogee roll-rate estimates.'),
    'Safety': ('safety', 'safety', 'Lessons from the 8th Intercollegiate Rocket Engineering Competition safety report.'),
    'SingWeAf': ('single-wedge-airfoil', 'aero', 'Supersonic normal force of single-wedge fins.'),
    'StruLoad': ('structural-loads', 'struct', 'Design loads from handling, pressure, gusts and ignition shock.'),
    'TrajSimu': ('trajectory-simulation', 'traj', 'SKYAERO two-degree-of-freedom point-mass trajectory simulation.'),
    'Vent': ('venting', 'struct', 'Payload-bay internal pressure during ascent through vent holes.'),
    'WindComp': ('wind-compensation', 'traj', 'Adjust launcher azimuth and elevation to cancel the wind.'),
    'WindMeas': ('wind-measurement', 'traj', 'Measuring the wind profile with tethered pilot balloons.'),
    'WireReq': ('wiring-requirements', 'safety', 'Safety-critical wiring rules for competition rockets.'),
    'YoYoDes': ('yo-yo-despinner', 'dyn', 'Despin weights for a yo-yo despin mechanism.'),
}

# Guidelines-only topics (nothing to calculate): no card, page or search entry; the old URL redirects home.
# Their PDFs stay in the reference library.
SKIP_TOPICS = {'Igni': 'igniters', 'Safety': 'safety', 'WireReq': 'wiring-requirements'}

RELEASE1_TOPICS = {'BarrEqua', 'DragCoef', 'Geop', 'OgivNose', 'FinAero', 'BifiPend', 'FinSett'}

# Calculators: slug -> (title, topic id, one-line description)
CALCULATORS = [
    ('subsonic-cp', 'Subsonic Centre of Pressure', 'BarrEqua', 'Barrowman/NACA 1307 normal-force slope and centre of pressure below the critical Mach number.'),
    ('drag-coefficient', 'Zero-Lift Drag Coefficient', 'DragCoef', 'Skin friction, base, nose and lug drag for a single-stage rocket.'),
    ('geophysics', 'Atmosphere & Gravity', 'Geop', 'Temperature, pressure, density, sound speed and gravity at any altitude and latitude.'),
    ('nose-cone', 'Nose Cone Design', 'OgivNose', 'Twelve nose shapes from subsonic to Mach 5: drag, tip shock waves, Mach angle, lift, centre of pressure, shear and bending along the nose, surface pressure, critical Mach number and tip temperature.', ['NosePresCoef', 'OptiNoseShap']),
    ('fin-flutter', 'Fin Flutter', 'FinAero', 'Flutter speed of a fin panel through the flight (Martin, corrected by Bennett), safety factor, and the thickness, span or material that fixes it.'),
    ('bifilar-pendulum', 'Bifilar Pendulum Inertia', 'BifiPend', 'Pitch/yaw moment of inertia from measured pendulum periods.'),
    ('fin-cant-angle', 'Fin Cant Angle & Roll Rate', 'FinSett', 'Strip-theory roll derivatives and the cant angle for a target roll rate.'),
    ('single-wedge', 'Single Wedge Airfoil', 'SingWeAf', 'Supersonic normal-force multiplier and wave drag of single-wedge fins, with the shock-detachment limit.'),
    ('yo-yo-despin', 'Yo-Yo Despinner', 'YoYoDes', 'Despin weights, wire loads and timing for a two-mass yo-yo with radial release.'),
    ('propellant-slosh', 'Propellant Sloshing', 'ProSlosh', 'Slosh frequencies, slosh masses and equivalent pendulum for liquid in a cylindrical tank under thrust.'),
    ('reliability-growth', 'Reliability Growth', 'Reliab', 'Reliability of each flight as test flights reveal latent defects, and the number of tests that reaches a target.'),
    ('newtonian-drag', 'Modified Newtonian Drag', 'ModiNewtDrag', 'Supersonic wave drag of nose caps, cones, flat faces and rounded fin leading edges (Lees).'),
    ('nozzle-thrust', 'Nozzle Design and Thrust', 'Nozzles', 'Conical or bell (Rao) nozzle contour, Mach number, pressure, temperature and density along it, normal shocks, flow separation, thrust, mass flow and specific impulse.'),
    ('wind-compensation', 'Wind Compensation', 'WindComp', 'Launcher quadrant elevation and azimuth that cancel the wind drift and place the impact point where you want it.'),
    ('pitch-yaw-wavenumber', 'Pitch-Yaw Wave Number', 'PitcWave', 'Pitch/yaw wavelength, wave number and natural frequency of a statically stable rocket.'),
    ('roll-rate-history', 'Roll Rate History', 'RollRate', 'Roll rate from launcher exit to burnout with roll inertia, roll turns during boost, and the roll rate at apogee.'),
    ('parachute-recovery', 'Parachute Recovery', 'Reco', 'Descent time, wind drift and landing speeds of a two-piece rocket under one parachute, with optional reefing.'),
    ('upper-stage-divergence', 'Upper-Stage Divergence', 'BodyAero', 'Divergence dynamic pressure and load amplification of a flexible upper stage or payload joint, with the longest safe stage.'),
    ('launcher-deflection', 'Launcher Rail Deflection', 'NewLaun', 'Rail tip slope at tip-off from weight and thrust misalignment, and the longest acceptable rail on a tower truss.'),
    ('tethered-pibal', 'Tethered Balloon Wind Sensor', 'WindMeas', 'Wind speed and direction from the elevation angle of a tethered pilot balloon, corrected for tether sag and drag.'),
    ('payload-venting', 'Payload Bay Venting', 'Vent', 'Bay pressure history through vent holes during ascent and the largest pressure difference across the shell.'),
    ('body-bending', 'Body Bending Modes', 'BodyBend', 'Free-free bending frequencies, mode shapes and nodes of a rocket body with uneven stiffness and mass (Rayleigh–Ritz).'),
    ('ground-handling', 'Ground Handling Loads', 'StruLoad', 'Carrying forces and joint bending moment of a hand-carried rocket, and the aft rail-button pull when the nose is lifted.'),
    ('flight-path-dispersion', 'Flight Path Angle Dispersions', 'Disp', 'One-sigma velocity tilt at burnout from thrust misalignment and gusts on a rolling rocket, as an equivalent launcher angle error.'),
    ('roll-lock-in-design', 'Roll Lock-In', 'RollLockIn', 'Smallest angle of attack at which nose vortices can lock the roll rate onto the pitch frequency, with fins sized for a static margin, and the probability of no lock-in.'),
    ('skyaero-trajectory', 'Trajectory Simulation (SKYAERO)', 'TrajSimu', 'Point-mass flight of a one- to three-stage rocket from the rail to impact: apogee, impact range, peak Mach and dynamic pressure, with wind and parachutes.'),
    ('two-stage-weights', 'Two-Stage Weight Allocation', 'OptiWeigAllo', 'Lightest split of mass between two stages for a payload and a required ideal velocity (Vertregt).'),
]


# calculators merged into another: old slug -> new slug (their pages and theory pages become redirects)
MOVED = {'ogive-nose': 'nose-cone', 'nose-pressure': 'nose-cone', 'optimum-nose': 'nose-cone'}


def clean_abstract(t, title):
    t = re.sub(r'^id="\w+">\s*', '', t)
    t = re.sub(r'\s*<a\s*$', '', t).replace('Back To Top', '').strip()
    if t.startswith(title.split()[0]):
        t = t[len(title):].strip() if t.lower().startswith(title.lower()) else t
    return html.unescape(t)


def main():
    cat = json.load(open(f'{ROOT}/data/catalog.json'))
    linked = {f['name'] for t in cat['topics'] for f in t['files']}
    # --- references (rebuilt from the PDF folders every run) ---------------------------------
    refs = []
    by_source = {}
    for sub, kind in (('original', 'original'), ('from-word', 'word')):
        for fn in sorted(os.listdir(f'{ROOT}/site/references/{sub}')):
            if not fn.endswith('.pdf'): continue
            base = fn[:-4]
            src = fn if kind == 'original' else next(
                (n for n in linked if n.rsplit('.', 1)[0] == base and n.rsplit('.', 1)[1] in ('doc', 'docx')), fn)
            title, authors, venue = REF_META[base]
            path = f'{ROOT}/site/references/{sub}/{fn}'
            pages = None
            with open(path, 'rb') as fh:
                pages = len(re.findall(rb'/Type\s*/Page[^s]', fh.read())) or None
            e = {
                'id': re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-') + ('-orig' if kind == 'original' else ''),
                'title': title, 'authors': authors, 'venue': venue, 'kind': kind,
                'file': f'references/{sub}/{fn}', 'sourceFile': src,
                'sourceUrl': RSANDT + urllib.parse.quote(src),
                'topics': [], 'sizeKB': os.path.getsize(path) // 1024, 'pages': pages,
            }
            refs.append(e)
            by_source[src] = e
    # --- topics ------------------------------------------------------------------------------
    calc_by_topic = {}
    for slug, title, tid, desc, *extra in CALCULATORS:
        for t_id in [tid, *(extra[0] if extra else [])]:
            calc_by_topic.setdefault(t_id, []).append(slug)
    topics, downloads = [], []
    for t in cat['topics']:
        if t['id'] in SKIP_TOPICS: continue
        slug, area, summary = TOPICS[t['id']]
        ref_ids, other = [], []
        for f in t['files']:
            if f['name'] in by_source:
                e = by_source[f['name']]
                if e['id'] not in ref_ids: ref_ids.append(e['id'])
                if slug not in e['topics']: e['topics'].append(slug)
            else:
                other.append({'name': f['name'], 'ext': f['ext'], 'url': RSANDT + urllib.parse.quote(f['name'])})
        topics.append({
            'id': t['id'], 'slug': slug, 'title': t['title'].replace('Aerolasticity', 'Aeroelasticity'),
            'area': area, 'summary': summary,
            'abstract': clean_abstract(t['abstract'], t['title']),
            'status': 'available' if t['id'] in calc_by_topic else 'soon',
            'calculators': calc_by_topic.get(t['id'], []),
            # published as "coming soon" before its calculator existed: the old topic URL becomes a redirect
            'wasSoon': t['id'] in calc_by_topic and t['id'] not in RELEASE1_TOPICS,
            'references': ref_ids, 'sourceFiles': other,
        })
    # calculators the owner has reviewed and signed off: shown with a purple "Final" badge on the home page
    FINAL = {'fin-flutter', 'reliability-growth', 'nozzle-thrust', 'geophysics', 'nose-cone', 'skyaero-trajectory', 'parachute-recovery', 'single-wedge'}
    calcs = [{'slug': s, 'title': ti, 'topic': TOPICS[tid][0], 'description': d, **({'final': True} if s in FINAL else {})} for s, ti, tid, d, *_ in CALCULATORS]
    reg = {
        'source': 'http://www.rsandt.com/reports.html',
        'areas': [{'id': a, 'title': ti, 'description': d} for a, ti, d in AREAS],
        'calculators': calcs, 'topics': topics, 'removed': sorted(SKIP_TOPICS.values()), 'moved': MOVED,
    }
    json.dump(reg, open(f'{ROOT}/site/js/registry.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(refs, open(f'{ROOT}/site/references/references.json', 'w'), indent=1, ensure_ascii=False)
    print(len(topics), 'topics,', len(calcs), 'calculators,', len(refs), 'references;',
          'untagged refs:', [r['id'] for r in refs if not r['topics']])


if __name__ == '__main__':
    main()
