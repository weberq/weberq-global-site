/* WeberQ demo board.
 *
 * An illustrative power + control PCB, described as data and drawn as SVG. It is
 * artwork for this site, not a client design and not a circuit anyone should
 * build. It is still laid out by PCB rules, so an engineer looking closely sees
 * no shorted nets: F.Cu and B.Cu tracks only cross on different layers.
 *
 * Units are board units, 640 x 440 (1 unit = 0.25 mm, so 160 x 110 mm).
 * WeberBoard.data is plain data so it can be checked outside a browser.
 */
(function (root) {
  'use strict';

  const W = 640;
  const H = 440;
  const tracks = [];
  const pads = [];
  const vias = [];
  const parts = [];
  const stitches = [];

  const track = (net, layer, w, stage, pts) => tracks.push({ net, layer, w, stage, pts });
  const via = (net, x, y, stage, r) => vias.push({ net, x, y, stage: stage || 'signal', r: r || 3 });
  const smd = (net, x, y, w, h) => pads.push({ net, x, y, w, h, kind: 'smd' });
  const tht = (net, x, y, r, square) => pads.push({ net, x, y, r, square: !!square, kind: 'tht' });

  /* Parts draw their own silkscreen. `shape` is a list of primitives. */
  function part(ref, label, x, y, shape) {
    parts.push({ ref, label, x, y, shape });
  }

  function soic(ref, label, cx, cy, nets) {
    const ys = [-11.25, -3.75, 3.75, 11.25];
    ys.forEach((dy, i) => smd(nets[i], cx - 22, cy + dy, 12, 4));
    ys.forEach((dy, i) => smd(nets[i + 4], cx + 22, cy + dy, 12, 4));
    part(ref, label, cx, cy, [
      ['rect', cx - 15, cy - 15, 30, 30],
      ['dot', cx - 11, cy - 11],
      ['ref', cx, cy - 20],
    ]);
  }

  function soicN(ref, label, cx, cy, nets) {
    const xs = [-11.4, -3.8, 3.8, 11.4];
    xs.forEach((dx, i) => smd(nets[i], cx + dx, cy - 22, 4, 12));
    xs.forEach((dx, i) => smd(nets[i + 4], cx + dx, cy + 22, 4, 12));
    part(ref, label, cx, cy, [
      ['rect', cx - 15, cy - 14, 30, 28],
      ['dot', cx - 11, cy - 10],
      ['refAt', cx, cy + 3],
    ]);
  }

  function chip(ref, net1, net2, x, y, vertical) {
    const d = 5;
    if (vertical) {
      smd(net1, x, y - d, 7, 6);
      smd(net2, x, y + d, 7, 6);
      part(ref, 'Passive', x, y, [['rect', x - 4.5, y - 9, 9, 18]]);
    } else {
      smd(net1, x - d, y, 6, 7);
      smd(net2, x + d, y, 6, 7);
      part(ref, 'Passive', x, y, [['rect', x - 9, y - 4.5, 18, 9]]);
    }
  }

  function mosfet(ref, x, y, netD, netG, netS) {
    smd(netD, x, y, 56, 36);
    smd(netG, x - 14, y + 40, 10, 14);
    smd(netS, x + 14, y + 40, 10, 14);
    part(ref, 'Power MOSFET', x, y, [
      ['rect', x - 25, y - 15, 50, 44],
      ['line', x - 14, y + 29, x - 14, y + 33],
      ['line', x + 14, y + 29, x + 14, y + 33],
      ['refAt', x, y + 6],
    ]);
  }

  function inductor(ref, x, y, netA, netB) {
    tht(netA, x - 35, y, 11);
    tht(netB, x + 35, y, 11);
    part(ref, 'Power inductor', x, y, [
      ['circle', x, y, 33],
      ['circle', x, y, 16],
      ['refAt', x, y + 3],
    ]);
  }

  /* ---------- Board furniture ---------- */
  const holes = [[18, 18], [622, 18], [18, 422], [622, 422]];
  const fiducials = [[58, 424], [582, 18], [582, 424]];

  /* ---------- Power stage ---------- */
  tht('DCP', 32, 70, 11, true);
  tht('GND', 32, 186, 11);
  part('J1', 'DC input terminal', 32, 128, [
    ['rect', 12, 46, 40, 164],
    ['refAt', 32, 131],
  ]);

  tht('DCP', 80, 112, 8, true);
  tht('GND', 80, 144, 8);
  part('C1', 'Bulk capacitor', 80, 128, [
    ['circle', 80, 128, 27],
    ['text', 96, 118, '+'],
    ['refAt', 80, 131],
  ]);
  tht('DCP', 140, 112, 8, true);
  tht('GND', 140, 144, 8);
  part('C2', 'Bulk capacitor', 140, 128, [
    ['circle', 140, 128, 27],
    ['text', 156, 118, '+'],
    ['refAt', 140, 131],
  ]);

  track('DCP', 'F', 18, 'power', [[32, 70], [62, 70], [92, 40], [432, 40]]);
  track('DCP', 'F', 12, 'power', [[80, 52], [80, 112]]);
  track('DCP', 'F', 12, 'power', [[140, 40], [140, 112]]);
  track('GND', 'F', 18, 'power', [[32, 186], [62, 186], [92, 216], [432, 216]]);
  track('GND', 'F', 12, 'power', [[80, 144], [80, 204]]);
  track('GND', 'F', 12, 'power', [[140, 144], [140, 216]]);

  mosfet('Q1', 268, 72, 'DCP', 'HOA', 'PHA');
  mosfet('Q2', 268, 150, 'PHA', 'LOA', 'GND');
  mosfet('Q3', 414, 72, 'DCP', 'HOB', 'PHB');
  mosfet('Q4', 414, 150, 'PHB', 'LOB', 'GND');

  track('DCP', 'F', 36, 'power', [[268, 40], [268, 56]]);
  track('DCP', 'F', 36, 'power', [[414, 40], [414, 56]]);
  track('GND', 'F', 12, 'power', [[282, 190], [282, 216]]);
  track('GND', 'F', 12, 'power', [[428, 190], [428, 216]]);
  track('PHA', 'F', 12, 'power', [[282, 112], [282, 134]]);
  track('PHB', 'F', 12, 'power', [[428, 112], [428, 134]]);

  /* Thermal via rows on the tabs. The tab vias on Q4 sit clear of the phase A
     track running underneath it on B.Cu. */
  for (let x = 250; x <= 286; x += 12) via('DCP', x, 62, 'pour');
  for (let x = 396; x <= 432; x += 12) via('DCP', x, 62, 'pour');
  for (let x = 250; x <= 286; x += 12) { via('PHA', x, 138, 'pour'); via('PHA', x, 162, 'pour'); }
  for (let x = 396; x <= 432; x += 12) { via('PHB', x, 136, 'pour'); via('PHB', x, 164, 'pour'); }

  /* Phase A leaves Q2 on the back layer and passes under Q4. */
  track('PHA', 'B', 14, 'power', [[246, 150], [446, 150], [475, 121], [475, 90]]);
  track('PHB', 'F', 14, 'power', [[428, 122], [452, 122], [452, 147], [475, 170]]);
  inductor('L1', 510, 90, 'PHA', 'OUTA');
  inductor('L2', 510, 170, 'PHB', 'OUTB');

  tht('OUTA', 566, 106, 7);
  tht('OUTB', 566, 154, 7);
  part('C5', 'Output film capacitor', 566, 130, [
    ['rect', 550, 98, 32, 64],
    ['refAt', 566, 133],
  ]);

  track('OUTA', 'F', 14, 'power', [[545, 90], [612, 90]]);
  track('OUTA', 'F', 8, 'power', [[566, 90], [566, 106]]);
  track('OUTB', 'F', 14, 'power', [[545, 170], [570, 170]]);
  track('OUTB', 'F', 8, 'power', [[566, 170], [566, 154]]);
  track('OUTC', 'F', 14, 'power', [[596, 170], [612, 170]]);

  smd('OUTB', 576, 170, 12, 20);
  smd('OUTC', 596, 170, 12, 20);
  part('R1', 'Current shunt', 586, 170, [
    ['rect', 568, 158, 36, 24],
  ]);

  tht('OUTA', 612, 90, 11);
  tht('OUTC', 612, 170, 11);
  part('J2', 'AC output terminal', 612, 130, [
    ['rect', 592, 66, 40, 128],
  ]);

  /* ---------- Gate drive ---------- */
  soicN('U2', 'Half-bridge gate driver', 200, 128,
    ['VCC', 'BSA', 'PHA', 'HOA', 'PW1', 'PW2', 'GND', 'LOA']);
  soicN('U3', 'Half-bridge gate driver', 342, 128,
    ['VCC', 'BSB', 'PHB', 'HOB', 'PW3', 'PW4', 'GND', 'LOB']);

  track('HOA', 'F', 3, 'signal', [[211.4, 106], [211.4, 98], [240, 98], [254, 112]]);
  track('LOA', 'F', 3, 'signal', [[211.4, 150], [211.4, 156], [245, 190], [254, 190]]);
  track('HOB', 'F', 3, 'signal', [[353.4, 106], [353.4, 98], [386, 98], [400, 112]]);
  track('LOB', 'F', 3, 'signal', [[353.4, 150], [353.4, 156], [387, 190], [400, 190]]);
  track('GND', 'F', 3, 'signal', [[203.8, 150], [203.8, 207]]);
  track('GND', 'F', 3, 'signal', [[345.8, 150], [345.8, 207]]);

  smd('BSA', 196, 84, 6, 7);
  smd('PHA', 204, 84, 6, 7);
  part('C3', 'Bootstrap capacitor', 200, 84, [['rect', 191, 79, 18, 10]]);
  track('BSA', 'F', 2, 'signal', [[196.2, 106], [196.2, 87]]);
  track('PHA', 'F', 2, 'signal', [[203.8, 106], [203.8, 87]]);
  track('PHA', 'F', 2, 'signal', [[203.8, 90], [218, 90]]);
  via('PHA', 218, 90);
  track('PHA', 'B', 2, 'signal', [[218, 90], [228, 100], [282, 100]]);
  via('PHA', 282, 100);
  track('PHA', 'F', 3, 'signal', [[282, 100], [282, 112]]);

  smd('BSB', 338, 84, 6, 7);
  smd('PHB', 346, 84, 6, 7);
  part('C4', 'Bootstrap capacitor', 342, 84, [['rect', 333, 79, 18, 10]]);
  track('BSB', 'F', 2, 'signal', [[338.2, 106], [338.2, 87]]);
  track('PHB', 'F', 2, 'signal', [[345.8, 106], [345.8, 87]]);
  track('PHB', 'F', 2, 'signal', [[345.8, 90], [360, 90]]);
  via('PHB', 360, 90);
  track('PHB', 'B', 2, 'signal', [[360, 90], [370, 100], [428, 100]]);
  via('PHB', 428, 100);
  track('PHB', 'F', 3, 'signal', [[428, 100], [428, 112]]);

  /* Driver supply runs on B.Cu from the regulator feed. */
  track('VCC', 'F', 2, 'signal', [[188.6, 106], [188.6, 92], [182, 85], [182, 74]]);
  via('VCC', 182, 74);
  track('VCC', 'F', 2, 'signal', [[330.6, 106], [330.6, 92], [326, 87], [326, 74]]);
  via('VCC', 326, 74);
  track('VCC', 'B', 2.5, 'signal', [[172, 262], [172, 84], [182, 74], [326, 74]]);
  via('VCC', 172, 262);

  /* ---------- PWM from the MCU, down on B.Cu under the GND bar ---------- */
  track('PW1', 'F', 2, 'signal', [[188.6, 150], [188.6, 166]]);
  via('PW1', 188.6, 166);
  track('PW1', 'B', 2, 'signal', [[188.6, 166], [188.6, 248], [194.6, 254], [262, 254], [272.5, 264.5], [272.5, 282]]);
  via('PW1', 272.5, 282);
  track('PW1', 'F', 2, 'signal', [[272.5, 282], [272.5, 297]]);

  track('PW2', 'F', 2, 'signal', [[196.2, 150], [196.2, 176]]);
  via('PW2', 196.2, 176);
  track('PW2', 'B', 2, 'signal', [[196.2, 176], [196.2, 240], [202.2, 246], [270, 246], [277.5, 253.5], [277.5, 270]]);
  via('PW2', 277.5, 270);
  track('PW2', 'F', 2, 'signal', [[277.5, 270], [277.5, 297]]);

  track('PW3', 'F', 2, 'signal', [[330.6, 150], [330.6, 166]]);
  via('PW3', 330.6, 166);
  track('PW3', 'B', 2, 'signal', [[330.6, 166], [330.6, 240], [317.5, 253.1], [317.5, 270]]);
  via('PW3', 317.5, 270);
  track('PW3', 'F', 2, 'signal', [[317.5, 270], [317.5, 297]]);

  track('PW4', 'F', 2, 'signal', [[338.2, 150], [338.2, 176]]);
  via('PW4', 338.2, 176);
  track('PW4', 'B', 2, 'signal', [[338.2, 176], [338.2, 246], [322.5, 261.7], [322.5, 282]]);
  via('PW4', 322.5, 282);
  track('PW4', 'F', 2, 'signal', [[322.5, 282], [322.5, 297]]);

  /* ---------- Current sense ---------- */
  soic('U6', 'Current-sense amplifier', 560, 270,
    ['OUTB', 'GND', 'VDD', 'ISO', 'OUTC', 'GND', 'VDD', 'VDD']);
  track('OUTB', 'F', 2, 'signal', [[576, 180], [576, 200], [530, 246], [530, 258.75], [538, 258.75]]);
  track('OUTC', 'F', 2, 'signal', [[600, 180], [600, 250], [591.25, 258.75], [582, 258.75]]);
  smd('OUTB', 576, 183, 5, 6);
  smd('OUTC', 600, 183, 5, 6);
  track('OUTB', 'F', 2, 'signal', [[576, 170], [576, 180]]);
  track('OUTC', 'F', 2, 'signal', [[596, 170], [600, 180]]);
  track('ISO', 'F', 2, 'signal', [[538, 281.25], [404, 281.25], [368, 317.5], [344, 317.5]]);

  /* ---------- MCU, QFP-48 ---------- */
  const pinX = (i) => 272.5 + 5 * i;
  const pinY = (i) => 312.5 + 5 * i;
  const topNets = ['PW1', 'PW2', '', '', 'GND', 'VDD', '', '', '', 'PW3', 'PW4', ''];
  topNets.forEach((n, i) => smd(n || 'NC', pinX(i), 302, 3, 10));
  const leftNets = ['VDD', '', 'GND', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', '', 'XI', 'XO'];
  leftNets.forEach((n, i) => smd(n || 'NC', 262, pinY(i), 10, 3));
  const rightNets = ['', 'ISO', '', '', '', 'TXD', 'RXD', 'STB', 'FLT', 'RX2', 'TX2', ''];
  rightNets.forEach((n, i) => smd(n || 'NC', 338, pinY(i), 10, 3));
  const botNets = ['', '', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', '', ''];
  botNets.forEach((n, i) => smd(n || 'NC', pinX(i), 378, 3, 10));
  part('U1', 'Microcontroller', 300, 340, [
    ['rect', 268, 308, 64, 64],
    ['dot', 275, 315],
    ['refAt', 300, 337],
    ['small', 300, 349, 'MCU'],
  ]);

  /* Decoupling beside the top pins */
  chip('C11', 'GND', 'VDD', 298, 282);
  track('GND', 'F', 2, 'signal', [[292.5, 297], [292.5, 288], [293, 287], [293, 282]]);
  track('VDD', 'F', 2, 'signal', [[297.5, 297], [297.5, 291], [303, 285.5], [303, 282]]);
  via('GND', 285, 278);
  track('GND', 'F', 2, 'signal', [[293, 282], [289, 278], [285, 278]]);
  via('VDD', 309, 274);
  track('VDD', 'F', 2, 'signal', [[303, 282], [303, 280], [309, 274]]);

  /* Left side: debug and analogue fan to J4 */
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const pin = 327.5 + 5 * k;
    const target = 300 + 16 * k;
    const run = 240 - Math.abs(target - pin);
    track('A' + k, 'F', 2, 'signal', [[258, pin], [240, pin], [run, target], [34, target]]);
    tht('A' + k, 34, target, 5.5, k === 0);
  });
  part('J4', 'Debug and I/O header', 34, 340, [
    ['rect', 24, 290, 20, 100],
  ]);

  track('GND', 'F', 2, 'signal', [[258, 322.5], [250, 322.5]]);
  via('GND', 250, 322.5);

  /* Crystal */
  smd('XI', 236, 396, 10, 12);
  smd('XO', 258, 396, 10, 12);
  part('Y1', 'Crystal', 247, 396, [['rect', 226, 388, 42, 16]]);
  track('XI', 'F', 2, 'signal', [[258, 362.5], [256, 362.5], [236, 382.5], [236, 390]]);
  track('XO', 'F', 2, 'signal', [[258, 367.5], [256, 367.5], [252, 371.5], [252, 381], [258, 387], [258, 390]]);

  /* Bottom side: GPIO fan to J5 */
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((k) => {
    const pin = 282.5 + 5 * k;
    const target = 258 + 12 * k;
    const dx = target - pin;
    track('B' + k, 'F', 2, 'signal', [[pin, 382], [pin, 386], [target, 386 + Math.abs(dx)], [target, 416]]);
    tht('B' + k, target, 416, 4.2, k === 0);
  });
  part('J5', 'GPIO header', 300, 416, [['rect', 250, 408, 100, 16]]);

  /* ---------- CAN ---------- */
  soic('U4', 'CAN transceiver', 450, 350,
    ['TXD', 'RXD', 'STB', 'FLT', 'VDD', 'CANH', 'CANL', 'GND']);
  track('TXD', 'F', 2, 'signal', [[342, 337.5], [419, 337.5], [420.25, 338.75], [428, 338.75]]);
  track('RXD', 'F', 2, 'signal', [[342, 342.5], [414, 342.5], [417.75, 346.25], [428, 346.25]]);
  track('STB', 'F', 2, 'signal', [[342, 347.5], [408, 347.5], [414.25, 353.75], [428, 353.75]]);
  track('FLT', 'F', 2, 'signal', [[342, 352.5], [402, 352.5], [410.75, 361.25], [428, 361.25]]);
  track('CANH', 'F', 2.5, 'signal', [[472, 346.25], [490, 346.25], [498.25, 338], [596, 338], [604, 330], [612, 330]]);
  track('CANL', 'F', 2.5, 'signal', [[472, 353.75], [494, 353.75], [502, 345.75], [590, 345.75], [599.25, 355], [612, 355]]);
  track('RX2', 'F', 2, 'signal', [[342, 357.5], [392, 357.5], [420, 385.5], [590, 385.5], [595.5, 380], [612, 380]]);
  track('TX2', 'F', 2, 'signal', [[342, 362.5], [390, 362.5], [420.5, 393], [600, 393], [612, 405]]);
  [['CANH', 330], ['CANL', 355], ['RX2', 380], ['TX2', 405]].forEach(([n, y], i) => tht(n, 612, y, 5.5, i === 0));
  part('J3', 'CAN and UART header', 612, 368, [
    ['rect', 601, 320, 22, 96],
  ]);

  /* TVS across the bus, both pads on the pair. */
  smd('CANH', 540, 331, 7, 6);
  smd('CANL', 540, 353, 7, 6);
  track('CANH', 'F', 2, 'signal', [[540, 338], [540, 331]]);
  track('CANL', 'F', 2, 'signal', [[540, 345.75], [540, 353]]);
  part('D1', 'Bus TVS diode', 540, 342, [['rect', 533, 325, 14, 34]]);

  /* ---------- Buck regulator ---------- */
  soic('U5', 'Buck regulator', 110, 280,
    ['GND', 'GND', 'GND', 'GND', 'VCC', 'SW', 'FB', 'VDD']);
  track('VCC', 'F', 2.5, 'signal', [[172, 262], [139, 262], [132.25, 268.75], [128, 268.75]]);
  track('SW', 'F', 3, 'signal', [[132, 276.25], [138, 276.25], [144, 282], [150, 282]]);
  smd('SW', 150, 282, 14, 22);
  smd('VDD', 186, 282, 14, 22);
  part('L3', 'Buck inductor', 168, 282, [
    ['rect', 146, 268, 44, 28],
    ['refAt', 168, 285],
  ]);
  track('VDD', 'F', 3, 'signal', [[186, 282], [222, 282], [252.5, 312.5], [258, 312.5]]);
  track('GND', 'F', 2.5, 'signal', [[88, 268.75], [70, 268.75]]);
  track('GND', 'F', 2.5, 'signal', [[88, 276.25], [70, 276.25]]);
  via('GND', 70, 268.75);
  via('GND', 70, 276.25);
  chip('C8', 'GND', 'VCC', 150, 248);
  track('VCC', 'F', 2, 'signal', [[155, 248], [165, 258], [165, 262]]);
  chip('C9', 'VDD', 'GND', 214, 268);
  track('VDD', 'F', 2, 'signal', [[209, 268], [209, 282]]);
  via('GND', 134, 248);
  track('GND', 'F', 2, 'signal', [[145, 248], [134, 248]]);
  via('GND', 229, 268);
  track('GND', 'F', 2, 'signal', [[219, 268], [229, 268]]);

  /* Status LEDs on the right, driven from the free fan-out space. */
  chip('D2', 'LED1', 'GND', 480, 410);
  chip('D3', 'LED2', 'GND', 520, 410);
  via('GND', 492, 410);
  track('GND', 'F', 2, 'signal', [[485, 410], [492, 410]]);
  via('GND', 532, 410);
  track('GND', 'F', 2, 'signal', [[525, 410], [532, 410]]);

  /* Stitching vias tie the F.Cu pour to the rest of the ground system. */
  const clearOf = (x, y) => {
    const gap = 9;
    const nearTrack = tracks.some((t) => {
      for (let i = 1; i < t.pts.length; i += 1) {
        if (segDist(x, y, t.pts[i - 1], t.pts[i]) < gap + t.w / 2) return true;
      }
      return false;
    });
    const nearPad = pads.some((p) => {
      const rx = p.kind === 'tht' ? p.r : p.w / 2;
      const ry = p.kind === 'tht' ? p.r : p.h / 2;
      return Math.abs(x - p.x) < rx + gap && Math.abs(y - p.y) < ry + gap;
    });
    const nearVia = vias.some((v) => Math.hypot(x - v.x, y - v.y) < 11);
    const inPart = parts.some((p) => p.shape.some((s) => s[0] === 'rect'
      && x > s[1] - 3 && x < s[1] + s[3] + 3 && y > s[2] - 3 && y < s[2] + s[4] + 3));
    return !nearTrack && !nearPad && !nearVia && !inPart;
  };

  function segDist(px, py, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len));
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }

  for (let x = 24; x <= 616; x += 24) {
    for (const y of [238, 424]) if (clearOf(x, y)) stitches.push([x, y]);
  }
  for (let x = 96; x <= 600; x += 48) {
    for (let y = 262; y <= 400; y += 46) if (clearOf(x, y)) stitches.push([x, y]);
  }

  const silkText = [
    [32, 37, 'DC IN', 'middle'],
    [612, 58, 'AC OUT', 'middle'],
    [612, 312, 'CAN', 'middle'],
    [34, 282, 'I/O', 'middle'],
    [300, 404, 'GPIO', 'middle'],
  ];

  /* Pour outline: the control area of the board. */
  const pour = 'M14 232H626V322H600V400H626V428H14Z';

  /* ---------- SVG rendering ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  const toPath = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
  const lengthOf = (pts) => pts.reduce((sum, p, i) => (i
    ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

  function drawPad(p, parent) {
    if (p.kind === 'tht') {
      const size = p.r * 2;
      const shape = p.square
        ? el('rect', { x: p.x - p.r, y: p.y - p.r, width: size, height: size, rx: 1.5, class: 'b-pad' }, parent)
        : el('circle', { cx: p.x, cy: p.y, r: p.r, class: 'b-pad' }, parent);
      el('circle', { cx: p.x, cy: p.y, r: Math.max(1.8, p.r * 0.42), class: 'b-drill' }, parent);
      return shape;
    }
    return el('rect', {
      x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: Math.min(p.w, p.h) > 8 ? 1.5 : 0.6, class: 'b-pad',
    }, parent);
  }

  function drawPart(p, parent) {
    const g = el('g', { class: 'b-part', 'data-ref': p.ref, 'data-label': p.label }, parent);
    for (const s of p.shape) {
      if (s[0] === 'rect') el('rect', { x: s[1], y: s[2], width: s[3], height: s[4], rx: 1, class: 'b-silk' }, g);
      else if (s[0] === 'circle') el('circle', { cx: s[1], cy: s[2], r: s[3], class: 'b-silk' }, g);
      else if (s[0] === 'line') el('line', { x1: s[1], y1: s[2], x2: s[3], y2: s[4], class: 'b-silk' }, g);
      else if (s[0] === 'dot') el('circle', { cx: s[1], cy: s[2], r: 1.6, class: 'b-silk-fill' }, g);
      else if (s[0] === 'ref' || s[0] === 'refAt') {
        el('text', { x: s[1], y: s[2], class: 'b-text', 'text-anchor': 'middle' }, g).textContent = p.ref;
      } else if (s[0] === 'text' || s[0] === 'small') {
        el('text', { x: s[1], y: s[2], class: 'b-text b-text-sm', 'text-anchor': 'middle' }, g).textContent = s[3];
      }
    }
    return g;
  }

  /* Draws the board into `host` (an SVG group) and returns its layers plus a
     seek(0..1) that builds it: place, power, signal, then pour and vias. */
  function render(host, opts) {
    const id = (opts && opts.id) || 'b';
    const defs = el('defs', {}, host);
    const clip = el('clipPath', { id: id + '-pour' }, defs);
    el('path', { d: pour }, clip);

    const layers = {
      substrate: el('g', { class: 'b-layer' }, host),
      back: el('g', { class: 'b-layer' }, host),
      front: el('g', { class: 'b-layer' }, host),
      silk: el('g', { class: 'b-layer' }, host),
    };

    const outline = 'M14 0H626A14 14 0 0 1 640 14V426A14 14 0 0 1 626 440H14A14 14 0 0 1 0 426V14A14 14 0 0 1 14 0Z';
    const body = el('path', { d: outline, class: 'b-mask' }, layers.substrate);
    const edgeLength = 2 * (W + H) - 8 * 14 + 2 * Math.PI * 14;
    const edge = el('path', { d: outline, class: 'b-edge', 'stroke-dasharray': edgeLength }, layers.silk);

    const groups = {
      outline: [{ node: edge, len: edgeLength }],
      pads: [], parts: [], power: [], signal: [], pourVias: [],
    };

    /* Pours are grouped so the exploded view can drop them. On bare paper they
       would only hide the tracks that the layer callouts point at. */
    const pourWrap = el('g', {}, layers.front);
    const pourNode = el('path', { d: pour, class: 'b-pour' }, pourWrap);
    const halos = el('g', { 'clip-path': `url(#${id}-pour)`, class: 'b-halos' }, pourWrap);
    const planeNode = el('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, class: 'b-plane' }, layers.back);

    for (const t of tracks) {
      const d = toPath(t.pts);
      const len = lengthOf(t.pts);
      if (t.layer === 'F' && t.net !== 'GND') {
        el('path', { d, class: 'b-halo', 'stroke-width': t.w + 7 }, halos);
      }
      const parent = t.layer === 'F' ? layers.front : layers.back;
      const node = el('path', {
        d, class: `b-track b-${t.layer === 'F' ? 'fcu' : 'bcu'}`, 'stroke-width': t.w, 'stroke-dasharray': len,
      }, parent);
      groups[t.stage].push({ node, len, net: t.net, pts: t.pts });
    }

    const padLayer = el('g', {}, layers.front);
    for (const p of pads) {
      if (p.net !== 'GND') {
        const pad = p.kind === 'tht' ? { x: p.x, y: p.y, w: p.r * 2, h: p.r * 2 } : p;
        el('rect', {
          x: pad.x - pad.w / 2 - 3.5, y: pad.y - pad.h / 2 - 3.5, width: pad.w + 7, height: pad.h + 7, rx: 3, class: 'b-halo-fill',
        }, halos);
      }
      groups.pads.push({ node: drawPad(p, padLayer) });
    }

    for (const p of parts) groups.parts.push({ node: drawPart(p, layers.silk) });

    const viaLayer = el('g', {}, layers.front);
    for (const v of vias) {
      const g = el('g', { class: 'b-via-wrap' }, viaLayer);
      el('circle', { cx: v.x, cy: v.y, r: v.r, class: 'b-via' }, g);
      el('circle', { cx: v.x, cy: v.y, r: v.r * 0.42, class: 'b-drill' }, g);
      (v.stage === 'pour' ? groups.pourVias : groups.signal).push({ node: g });
    }
    for (const [x, y] of stitches) {
      const g = el('g', { class: 'b-via-wrap' }, viaLayer);
      el('circle', { cx: x, cy: y, r: 3, class: 'b-via' }, g);
      el('circle', { cx: x, cy: y, r: 1.3, class: 'b-drill' }, g);
      groups.pourVias.push({ node: g });
    }

    for (const [x, y] of holes) {
      el('circle', { cx: x, cy: y, r: 11, class: 'b-keep' }, layers.silk);
      el('circle', { cx: x, cy: y, r: 7, class: 'b-hole' }, layers.silk);
    }
    for (const [x, y] of fiducials) {
      el('circle', { cx: x, cy: y, r: 2.6, class: 'b-pad' }, padLayer);
      el('circle', { cx: x, cy: y, r: 6, class: 'b-silk' }, layers.silk);
    }

    const silkInfo = el('g', {}, layers.silk);
    for (const [x, y, text, anchor] of silkText) {
      el('text', { x, y, class: 'b-text b-text-sm', 'text-anchor': anchor }, silkInfo).textContent = text;
    }
    el('text', { x: 556, y: 372, class: 'b-brand', 'text-anchor': 'middle' }, silkInfo).textContent = 'WeberQ';
    el('text', { x: 556, y: 382, class: 'b-text b-text-sm', 'text-anchor': 'middle' }, silkInfo).textContent = 'DEMO BOARD REV A';

    const seekDraw = (items, t) => {
      const n = items.length;
      items.forEach((item, i) => {
        const start = n > 1 ? (i / (n - 1)) * 0.7 : 0;
        const local = clamp01((t - start) / 0.3);
        item.node.setAttribute('stroke-dashoffset', item.len * (1 - local));
      });
    };
    const seekFade = (items, t) => {
      const n = items.length;
      items.forEach((item, i) => {
        const start = n > 1 ? (i / (n - 1)) * 0.75 : 0;
        const a = clamp01((t - start) / 0.25);
        item.node.style.opacity = a;
      });
    };

    const seek = (p) => {
      seekDraw(groups.outline, clamp01(p / 0.08));
      seekFade(groups.pads, clamp01((p - 0.04) / 0.18));
      seekFade(groups.parts, clamp01((p - 0.08) / 0.18));
      seekDraw(groups.power, clamp01((p - 0.26) / 0.24));
      seekDraw(groups.signal.filter((s) => s.len), clamp01((p - 0.5) / 0.28));
      seekFade(groups.signal.filter((s) => !s.len), clamp01((p - 0.5) / 0.28));
      seekFade(groups.pourVias, clamp01((p - 0.78) / 0.22));
      const pourT = clamp01((p - 0.78) / 0.16);
      pourNode.style.opacity = pourT;
      halos.style.opacity = pourT;
      planeNode.style.opacity = pourT;
    };

    return { layers, groups, seek, body, pourWrap };
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  root.WeberBoard = { W, H, render, data: { tracks, pads, vias, parts, stitches, holes } };
})(typeof window !== 'undefined' ? window : globalThis);
