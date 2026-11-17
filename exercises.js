/* Home Reps — exercise library
 *
 * Fixed data (not stored). Each exercise has its rep range, How To text, level notes
 * and two stick-figure poses (start / end) that crossfade in a loop.
 *
 * Pose format (side view, viewBox 0 -6 120 100, floor at y = 90):
 *   h: head centre, n: neck/shoulder, p: hip,
 *   l1/l2: [knee, ankle], a1/a2: [elbow, wrist],
 *   db: [[x, y, angle°], …] dumbbells, band: [[x, y], …] band line, x: extra props (chair)
 */
(function () {
  'use strict';

  var STAND = { h: [60, 15], n: [60, 25], p: [60, 51], l1: [[61, 70], [61, 89]], l2: [[59, 70], [59, 89]] };
  function pose(base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return o; }
  var CHAIR = [[[68, 62], [96, 62]], [[70, 62], [70, 90]], [[94, 62], [94, 90]], [[94, 62], [94, 36]]];

  var EX = {
    /* ---------------- Session A ---------------- */
    goblet_squat: {
      name: 'Goblet Squat', sets: 3, min: 12, max: 15,
      muscles: ['Quads', 'Glutes', 'Core'],
      steps: ['Hold one dumbbell upright against your chest, feet shoulder-width apart.',
        'Sit your hips back and down until your thighs are level with the floor.',
        'Push through your whole foot to stand up tall.'],
      avoid: 'Knees caving in. Push them out over your toes.',
      easier: 'Squat to the chair: sit down lightly, then stand up.',
      pauseAt: 'the bottom', band: 'Stand on the band and hook the loop behind your shoulders.',
      poses: [
        pose(STAND, { a1: [[66, 36], [64, 30]], a2: [[64, 36], [62, 30]], db: [[65, 30, 90]] }),
        { h: [58, 34], n: [56, 43], p: [46, 66], l1: [[66, 64], [64, 89]], l2: [[64, 66], [62, 89]],
          a1: [[62, 54], [63, 47]], a2: [[60, 54], [61, 47]], db: [[64, 47, 90]] }
      ],
      arrow: [88, 30, 88, 60]
    },
    push_up: {
      name: 'Push-up', sets: 3, min: 8, max: 15,
      muscles: ['Chest', 'Shoulders', 'Triceps'],
      steps: ['Hands under your shoulders, body straight from head to heels.',
        'Lower your chest to a fist above the floor, elbows at about 45°.',
        'Push the floor away until your arms are straight.'],
      avoid: 'Hips sagging. Squeeze your glutes and brace your stomach.',
      easier: 'Hands on the edge of the chair (incline push-up), or knees on the floor.',
      pauseAt: 'the bottom', band: 'Band across your upper back, ends pinned under your hands.',
      poses: [
        { h: [90, 61], n: [82, 66], p: [54, 74], l1: [[38, 80], [20, 87]], l2: [[38, 80], [20, 87]],
          a1: [[82, 77], [82, 88]], a2: [[82, 77], [82, 88]] },
        { h: [91, 75], n: [82, 79], p: [54, 81], l1: [[38, 84], [20, 87]], l2: [[38, 84], [20, 87]],
          a1: [[72, 77], [80, 88]], a2: [[72, 77], [80, 88]] }
      ],
      arrow: [104, 56, 104, 78]
    },
    seated_band_row: {
      name: 'Seated Band Row', sets: 3, min: 12, max: 15,
      muscles: ['Upper back', 'Lats', 'Biceps'],
      steps: ['Sit tall, legs straight, band looped around the soles of your feet.',
        'Pull the band to your stomach, elbows close to your sides.',
        'Squeeze your shoulder blades together, then return slowly.'],
      avoid: 'Leaning back to pull. Keep your chest up and your body still.',
      easier: 'Bend your knees a little so the band is looser.',
      pauseAt: 'the squeeze (hands at your stomach)',
      level4: 'Hold the band shorter (hands closer to your feet) and squeeze for 2 s.',
      poses: [
        { h: [43, 47], n: [43, 57], p: [40, 83], l1: [[60, 83], [82, 86]], l2: [[60, 83], [82, 86]],
          a1: [[56, 63], [70, 68]], a2: [[56, 63], [70, 68]], band: [[70, 68], [88, 86]] },
        { h: [41, 47], n: [42, 57], p: [40, 83], l1: [[60, 83], [82, 86]], l2: [[60, 83], [82, 86]],
          a1: [[30, 64], [44, 66]], a2: [[30, 64], [44, 66]], band: [[44, 66], [88, 86]] }
      ],
      arrow: [102, 56, 82, 56]
    },
    rdl: {
      name: 'Dumbbell Romanian Deadlift', sets: 3, min: 12, max: 15,
      muscles: ['Hamstrings', 'Glutes', 'Lower back'],
      steps: ['Stand tall, a dumbbell in each hand in front of your thighs.',
        'Push your hips back and slide the dumbbells down your legs, knees soft.',
        'Stop when you feel a stretch in your hamstrings, then drive your hips forward.'],
      avoid: 'Rounding your back. Keep it flat and your chest proud.',
      easier: 'Go down only to knee height, or do it without weights.',
      pauseAt: 'the bottom (the stretch)', band: 'Stand on the band and hold it together with the dumbbells.',
      poses: [
        pose(STAND, { a1: [[61, 38], [62, 51]], a2: [[60, 38], [61, 51]], db: [[62, 53, 0]] }),
        { h: [84, 36], n: [76, 40], p: [52, 52], l1: [[56, 70], [56, 89]], l2: [[54, 70], [54, 89]],
          a1: [[76, 53], [75, 66]], a2: [[75, 53], [74, 66]], db: [[75, 68, 0]] }
      ],
      arrow: [100, 40, 100, 66]
    },
    lateral_raise: {
      name: 'Dumbbell Lateral Raise', sets: 2, min: 12, max: 20, perSide: 'arm',
      muscles: ['Side shoulders'],
      steps: ['Stand tall with one dumbbell in one hand, elbow slightly bent. Hold the chair with the other hand.',
        'Raise the arm out to the side, up to shoulder height.',
        'Lower slowly. Do all reps, then switch arms.'],
      avoid: 'Swinging or shrugging. Lead with the elbow, keep your shoulders down.',
      easier: 'Bend the elbow to 90° (shorter lever), or do it with no weight.',
      pauseAt: 'the top', band: 'Stand on the band and hold it together with the dumbbell.',
      front: true,
      poses: [
        { h: [60, 15], n: [60, 25], p: [60, 51], l1: [[56, 70], [54, 89]], l2: [[64, 70], [66, 89]],
          a1: [[54, 37], [52, 49]], a2: [[66, 37], [69, 48]], db: [[69, 50, 90]] },
        { h: [60, 15], n: [60, 25], p: [60, 51], l1: [[56, 70], [54, 89]], l2: [[64, 70], [66, 89]],
          a1: [[54, 37], [52, 49]], a2: [[73, 26], [85, 25]], db: [[86, 25, 90]] }
      ],
      arrow: [98, 50, 98, 26]
    },
    sit_up: {
      name: 'Sit-up', sets: 2, min: 12, max: 20,
      muscles: ['Abs', 'Hip flexors'],
      steps: ['Lie on your back, knees bent, feet flat (hook them under the chair).',
        'Cross your arms on your chest and curl up, chin tucked.',
        'Sit all the way up, then roll down slowly.'],
      avoid: 'Pulling on your neck. Keep your arms crossed on your chest.',
      easier: 'Crunch: lift only your shoulders off the floor.',
      pauseAt: 'the top', level4: 'Hold one dumbbell on your chest.',
      poses: [
        { h: [12, 82], n: [21, 85], p: [46, 85], l1: [[62, 70], [76, 88]], l2: [[62, 70], [76, 88]],
          a1: [[31, 79], [26, 80]], a2: [[31, 79], [26, 80]] },
        { h: [34, 51], n: [38, 60], p: [46, 85], l1: [[62, 70], [76, 88]], l2: [[62, 70], [76, 88]],
          a1: [[45, 66], [40, 63]], a2: [[45, 66], [40, 63]] }
      ],
      arrow: [16, 70, 26, 50]
    },

    /* ---------------- Session B ---------------- */
    reverse_lunge: {
      name: 'Dumbbell Reverse Lunge', sets: 3, min: 8, max: 12, perSide: 'leg',
      muscles: ['Quads', 'Glutes', 'Balance'],
      steps: ['Stand tall, a dumbbell in each hand at your sides.',
        'Step one foot back and lower until both knees are at about 90°.',
        'Push through the front heel to stand up. Alternate legs.'],
      avoid: 'Front knee caving in. Keep it over your middle toes.',
      easier: 'No weights, and hold the chair for balance.',
      pauseAt: 'the bottom', band: 'Stand on the band with your front foot and hold it with the dumbbells.',
      poses: [
        pose(STAND, { a1: [[60, 38], [60, 51]], a2: [[60, 38], [60, 51]], db: [[60, 53, 0]] }),
        { h: [58, 27], n: [58, 37], p: [56, 63], l1: [[72, 66], [72, 89]], l2: [[48, 84], [36, 88]],
          a1: [[58, 50], [58, 62]], a2: [[58, 50], [58, 62]], db: [[58, 64, 0]] }
      ],
      arrow: [92, 34, 92, 58]
    },
    floor_press: {
      name: 'Dumbbell Floor Press', sets: 3, min: 10, max: 15,
      muscles: ['Chest', 'Triceps', 'Front shoulders'],
      steps: ['Lie on your back, knees bent, a dumbbell in each hand above your chest.',
        'Lower until your upper arms touch the floor, elbows at about 45°.',
        'Press straight up until your arms are straight.'],
      avoid: 'Bouncing your elbows off the floor. Touch down lightly.',
      easier: 'Press one arm at a time.',
      pauseAt: 'the bottom (elbows on the floor)', band: 'Band across your upper back, ends held with the dumbbells.',
      poses: [
        { h: [19, 82], n: [28, 84], p: [56, 85], l1: [[72, 70], [86, 88]], l2: [[72, 70], [86, 88]],
          a1: [[30, 72], [30, 60]], a2: [[30, 72], [30, 60]], db: [[30, 58, 0]] },
        { h: [19, 82], n: [28, 84], p: [56, 85], l1: [[72, 70], [86, 88]], l2: [[72, 70], [86, 88]],
          a1: [[40, 87], [40, 75]], a2: [[40, 87], [40, 75]], db: [[40, 73, 0]] }
      ],
      arrow: [52, 74, 52, 54]
    },
    one_arm_row: {
      name: 'One-arm Dumbbell Row', sets: 3, min: 10, max: 15, perSide: 'arm',
      muscles: ['Lats', 'Upper back', 'Biceps'],
      steps: ['Put one hand and the same-side knee on the chair seat, back flat.',
        'Pull the dumbbell to your hip, elbow close to your body.',
        'Lower until your arm is straight. Do all reps, then switch sides.'],
      avoid: 'Twisting your body. Keep your shoulders square to the floor.',
      easier: 'Stand on the band and row it instead of the dumbbell.',
      pauseAt: 'the top (dumbbell at your hip)', band: 'Stand on the band and hold it together with the dumbbell.',
      poses: [
        { h: [83, 44], n: [75, 48], p: [50, 54], l1: [[46, 72], [44, 89]], l2: [[72, 60], [88, 60]],
          a1: [[78, 55], [80, 61]], a2: [[74, 60], [74, 72]], db: [[74, 74, 0]], x: CHAIR },
        { h: [83, 44], n: [75, 48], p: [50, 54], l1: [[46, 72], [44, 89]], l2: [[72, 60], [88, 60]],
          a1: [[78, 55], [80, 61]], a2: [[62, 40], [65, 53]], db: [[65, 55, 0]], x: CHAIR }
      ],
      arrow: [58, 84, 58, 64]
    },
    overhead_press: {
      name: 'Dumbbell Overhead Press', sets: 3, min: 8, max: 12,
      muscles: ['Shoulders', 'Triceps', 'Core'],
      steps: ['Stand tall, dumbbells at shoulder height, palms forward.',
        'Brace your stomach and press straight up overhead.',
        'Lower back to your shoulders under control.'],
      avoid: 'Arching your lower back. Squeeze your glutes, ribs down.',
      easier: 'Sit on the chair, or press one arm at a time.',
      pauseAt: 'the bottom (at your shoulders)', band: 'Stand on the band and hold it together with the dumbbells.',
      poses: [
        pose(STAND, { a1: [[68, 34], [67, 24]], a2: [[66, 34], [65, 24]], db: [[67, 22, 0]] }),
        pose(STAND, { a1: [[63, 12], [62, 0]], a2: [[61, 12], [60, 0]], db: [[62, -2, 0]] })
      ],
      arrow: [86, 26, 86, 4]
    },
    hammer_curl: {
      name: 'Hammer Curl', sets: 2, min: 12, max: 15,
      muscles: ['Biceps', 'Forearms'],
      steps: ['Stand tall, dumbbells at your sides, palms facing in.',
        'Curl them up, keeping your elbows pinned to your sides.',
        'Lower slowly to straight arms.'],
      avoid: 'Swinging your body. Stand still, elbows fixed.',
      easier: 'One arm at a time, or sit on the chair.',
      pauseAt: 'the top', band: 'Stand on the band and hold it together with the dumbbells.',
      poses: [
        pose(STAND, { a1: [[60, 38], [61, 51]], a2: [[60, 38], [61, 51]], db: [[61, 52, 90]] }),
        pose(STAND, { a1: [[60, 38], [70, 30]], a2: [[60, 38], [70, 30]], db: [[71, 29, 90]] })
      ],
      arrow: [84, 52, 84, 30]
    },
    plank: {
      name: 'Plank', sets: 2, min: 30, max: 60, unit: 'sec', step: 5,
      muscles: ['Core', 'Shoulders', 'Glutes'],
      steps: ['Forearms on the floor, elbows under your shoulders.',
        'Body straight from head to heels, squeeze your glutes.',
        'Breathe steadily and hold until the timer ends.'],
      avoid: 'Hips too high or sagging. Keep one straight line.',
      easier: 'Knees on the floor.',
      levelNames: { 1: 'Forearm plank', 2: 'Long lever', 3: 'Leg lift', 4: '+ Band' },
      levelText: { 1: 'Forearms on the floor, body straight.', 2: 'Place your elbows 10 cm ahead of your shoulders.',
        3: 'Lift one foot a little, switch every 5 s.', 4: 'High plank, band around your wrists, slow shoulder taps.' },
      poses: [
        { h: [88, 70], n: [80, 74], p: [52, 79], l1: [[36, 83], [20, 87]], l2: [[36, 83], [20, 87]],
          a1: [[80, 87], [92, 88]], a2: [[80, 87], [92, 88]] },
        { h: [88, 70], n: [80, 74], p: [52, 77], l1: [[36, 82], [20, 87]], l2: [[36, 82], [20, 87]],
          a1: [[80, 87], [92, 88]], a2: [[80, 87], [92, 88]] }
      ],
      arrow: null
    }
  };

  var PROGRAM = {
    A: ['goblet_squat', 'push_up', 'seated_band_row', 'rdl', 'lateral_raise', 'sit_up'],
    B: ['reverse_lunge', 'floor_press', 'one_arm_row', 'overhead_press', 'hammer_curl', 'plank']
  };

  Object.keys(EX).forEach(function (id) {
    var e = EX[id];
    e.id = id;
    e.unit = e.unit || 'reps';
    e.step = e.step || 1;
    e.session = PROGRAM.A.indexOf(id) >= 0 ? 'A' : 'B';
  });

  var LEVEL_NAMES = { 1: 'Normal', 2: 'Tempo', 3: 'Pause', 4: '+ Band', 5: 'Max' };

  function levelName(ex, lvl) {
    if (lvl >= 5) return 'Max';
    return (ex.levelNames && ex.levelNames[lvl]) || LEVEL_NAMES[lvl];
  }
  function levelText(ex, lvl) {
    if (ex.levelText) return lvl >= 5 ? ex.levelText[4] + ' Rest is now 45 s.' : ex.levelText[lvl];
    var t = {
      1: 'Smooth, controlled reps.',
      2: 'Lower for 3 seconds on every rep.',
      3: 'Lower for 3 s, then pause 1 s at ' + ex.pauseAt + '.',
      4: (ex.level4 || ex.band) + ' Keep the 3 s lowering and the pause.'
    };
    return lvl >= 5 ? t[4] + ' Rest is now 45 s.' : t[lvl];
  }

  /* ---------- SVG stick figure ---------- */
  function pts(list) { return list.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }
  function poseSVG(p) {
    var s = '';
    if (p.x) s += p.x.map(function (seg) { return '<polyline class="fig-prop" points="' + pts(seg) + '"/>'; }).join('');
    if (p.band) s += '<polyline class="fig-band" points="' + pts(p.band) + '"/>';
    var limbs = [[p.n, p.p], [p.p].concat(p.l1), [p.p].concat(p.l2), [p.n].concat(p.a1), [p.n].concat(p.a2)];
    s += limbs.map(function (l) { return '<polyline class="fig-line" points="' + pts(l) + '"/>'; }).join('');
    s += '<circle class="fig-head" cx="' + p.h[0] + '" cy="' + p.h[1] + '" r="6"/>';
    (p.db || []).forEach(function (d) {
      s += '<g class="fig-db" transform="translate(' + d[0] + ' ' + d[1] + ') rotate(' + d[2] + ')">' +
        '<line x1="-5" y1="0" x2="5" y2="0"/><rect x="-8" y="-4" width="3.5" height="8" rx="1"/><rect x="4.5" y="-4" width="3.5" height="8" rx="1"/></g>';
    });
    return s;
  }
  function arrowSVG(a) {
    if (!a) return '';
    var dx = a[2] - a[0], dy = a[3] - a[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
    var bx = a[2] - ux * 6, by = a[3] - uy * 6;
    var p1 = [bx - uy * 4, by + ux * 4], p2 = [bx + uy * 4, by - ux * 4];
    return '<g class="fig-arrow"><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + bx + '" y2="' + by + '"/>' +
      '<polygon points="' + a[2] + ',' + a[3] + ' ' + p1[0] + ',' + p1[1] + ' ' + p2[0] + ',' + p2[1] + '"/></g>';
  }
  function demoSVG(id) {
    var e = EX[id];
    return '<svg class="demo" viewBox="0 -6 120 100" role="img" aria-label="' + e.name + ' demo">' +
      '<line class="fig-floor" x1="6" y1="90.5" x2="114" y2="90.5"/>' +
      '<g class="pose pose-a">' + poseSVG(e.poses[0]) + '</g>' +
      '<g class="pose pose-b">' + poseSVG(e.poses[1]) + '</g>' +
      arrowSVG(e.arrow) + '</svg>';
  }

  window.HR_EX = EX;
  window.HR_PROGRAM = PROGRAM;
  window.HR_LEVEL = { name: levelName, text: levelText };
  window.HR_DEMO = demoSVG;
})();
