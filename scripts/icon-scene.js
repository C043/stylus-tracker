// The app icon: a white "S" and "T" on black vinyl. The S is cut by the record's grooves, the T is
// the stylus, standing straight through the middle of the S and tapering to a diamond. Plain 2D canvas, drawn by
// scripts/icon-scene.html; scripts/render-icons.mjs drives it.

const SIZE = 1024;
const INK = '#fbf5e6'; // cream-50: white, warmed to the app's labels

// Seeded (mulberry32) so re-rendering gives identical PNGs.
let seed = 7;
function random() {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// The S's centreline as cubic béziers, top-right terminal to bottom-left, centred on the record.
const S_SPINE = [
	[153, -130],
	[
		[128, -175],
		[63, -195],
		[3, -195]
	],
	[
		[-92, -195],
		[-149, -145],
		[-149, -80]
	],
	[
		[-149, -10],
		[-82, 10],
		[3, 25]
	],
	[
		[93, 40],
		[159, 75],
		[159, 140]
	],
	[
		[159, 205],
		[88, 235],
		[-2, 235]
	],
	[
		[-77, 235],
		[-132, 210],
		[-159, 165]
	]
];
const S_WEIGHT = 20; // half the stroke width at its fullest

// Outline of the S: the spine widened by S_WEIGHT, tapering to fine points at both ends.
function sOutline() {
	const spine = [];
	let from = S_SPINE[0];
	for (const [c1, c2, to] of S_SPINE.slice(1)) {
		for (let i = 0; i < 60; i++) {
			const t = i / 60;
			const u = 1 - t;
			spine.push(
				[0, 1].map(
					(k) => u ** 3 * from[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t ** 3 * to[k]
				)
			);
		}
		from = to;
	}
	spine.push(from);
	const left = [];
	const right = [];
	spine.forEach(([x, y], i) => {
		const [ax, ay] = spine[Math.max(0, i - 1)];
		const [bx, by] = spine[Math.min(spine.length - 1, i + 1)];
		const length = Math.hypot(bx - ax, by - ay);
		const t = i / (spine.length - 1);
		const ease = Math.min(1, Math.min(t, 1 - t) / 0.16);
		const w = S_WEIGHT * (0.06 + 0.94 * Math.sin((ease * Math.PI) / 2));
		const nx = (-(by - ay) / length) * w;
		const ny = ((bx - ax) / length) * w;
		left.push([x + nx, y + ny]);
		right.push([x - nx, y - ny]);
	});
	const path = new Path2D();
	for (const [x, y] of [...left, ...right.reverse()]) path.lineTo(x, y);
	path.closePath();
	return path;
}

const canvas = document.createElement('canvas');
canvas.width = canvas.height = SIZE;
document.body.append(canvas);
const ctx = canvas.getContext('2d');

// Black vinyl, centred on the icon: fine grooves, a lead-in band, and two soft sheen wedges.
function vinyl({ x, y, r }) {
	ctx.fillStyle = '#070707';
	ctx.fillRect(0, 0, SIZE, SIZE);
	for (let g = r * 0.2; g < r * 1.6; g += 3) {
		ctx.strokeStyle = random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.arc(x, y, g, 0, Math.PI * 2);
		ctx.stroke();
	}
	for (const band of [0.62, 0.95]) {
		ctx.strokeStyle = 'rgba(0,0,0,0.85)';
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.arc(x, y, r * band, 0, Math.PI * 2);
		ctx.stroke();
	}
	const sheen = ctx.createConicGradient(-Math.PI / 4, x, y);
	for (const [stop, a] of [
		[0, 0],
		[0.07, 0.16],
		[0.14, 0],
		[0.5, 0],
		[0.57, 0.11],
		[0.64, 0],
		[1, 0]
	]) {
		sheen.addColorStop(stop, `rgba(255,236,210,${a})`);
	}
	ctx.fillStyle = sheen;
	ctx.fillRect(0, 0, SIZE, SIZE);
}

// Draws the letters into `ctx`; `grooved` cuts the S with the record's grooves (off when tiny).
function letters({ x, y, scale, grooved }) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	// S: the groove.
	const s = sOutline();
	ctx.fillStyle = INK;
	ctx.fill(s);
	if (grooved) {
		ctx.save();
		ctx.clip(s);
		ctx.strokeStyle = 'rgba(7,7,7,0.55)';
		ctx.lineWidth = 3.5;
		for (let g = 40; g < 900; g += 15) {
			ctx.beginPath();
			ctx.arc(0, 0, g, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
	}

	// T: the stylus, upright on the centre line and crossing the S: a headshell crossbar above it,
	// a stem tapering to a diamond below it. A vinyl-black gap keeps it in front where they cross.
	const t = new Path2D();
	t.roundRect(-140, -310, 280, 48, 10);
	t.moveTo(-25, -270);
	t.lineTo(25, -270);
	t.lineTo(6, 284);
	t.lineTo(0, 300);
	t.lineTo(-6, 284);
	t.closePath();
	ctx.save();
	ctx.clip(s);
	ctx.strokeStyle = '#070707';
	ctx.lineWidth = 18;
	ctx.stroke(t);
	ctx.restore();
	ctx.fillStyle = INK;
	ctx.fill(t);
	ctx.restore();
}

// Draws the icon at full size; `fullBleed` shrinks the art into the maskable safe zone.
function draw({ fullBleed, grooved }) {
	seed = 7;
	ctx.clearRect(0, 0, SIZE, SIZE);
	vinyl({ x: SIZE / 2, y: SIZE / 2, r: SIZE / 2 });
	letters({ x: SIZE / 2, y: SIZE / 2, scale: fullBleed ? 0.8 : 1, grooved });
}

// Returns PNG bytes as base64 at `size`, clipped to the app's rounded plinth unless `fullBleed`.
window.renderIcon = ({ size, fullBleed }) => {
	draw({ fullBleed, grooved: size >= 128 });
	const out = document.createElement('canvas');
	out.width = out.height = size;
	const o = out.getContext('2d');
	o.imageSmoothingQuality = 'high';
	if (!fullBleed) {
		o.beginPath();
		o.roundRect(0, 0, size, size, (size * 112) / 512);
		o.clip();
	}
	o.drawImage(canvas, 0, 0, size, size);
	return out.toDataURL('image/png').split(',')[1];
};
window.iconSceneReady = true;
