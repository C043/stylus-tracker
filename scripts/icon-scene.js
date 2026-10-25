// The app icon as a three.js scene: a stylus resting on a glowing heartbeat line, as if the line
// were the groove. Loaded by scripts/icon-scene.html; scripts/render-icons.mjs drives it.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const SIZE = 1024;
const PULSE = '#4ade80';

// Walnut tokens from layout.css.
const WALNUT = { 950: '#1c120c', 900: '#2a1a10', 800: '#3b2416', 700: '#553420' };

// Seeded (mulberry32) so re-rendering gives identical PNGs.
let seed = 7;
function random() {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
	new RoomEnvironment(),
	0.04
).texture;
scene.environmentIntensity = 0.7;

function canvasTexture(size, draw, colour = true) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	draw(canvas.getContext('2d'), size);
	const texture = new THREE.CanvasTexture(canvas);
	if (colour) texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

// Out-of-focus walnut cabinet behind the scene: soft horizontal grain, darker at the edges.
scene.background = canvasTexture(512, (ctx, s) => {
	const base = ctx.createLinearGradient(0, 0, 0, s);
	base.addColorStop(0, WALNUT[800]);
	base.addColorStop(0.55, WALNUT[900]);
	base.addColorStop(1, WALNUT[950]);
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, s, s);
	ctx.filter = 'blur(6px)';
	for (let i = 0; i < 70; i++) {
		const y = random() * s;
		ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(120,72,40,0.12)';
		ctx.fillRect(0, y, s, 2 + random() * 10);
	}
	ctx.filter = 'none';
	const glow = ctx.createRadialGradient(s * 0.55, s * 0.45, 0, s * 0.55, s * 0.45, s * 0.7);
	glow.addColorStop(0, 'rgba(85,52,32,0.55)');
	glow.addColorStop(1, 'rgba(0,0,0,0.55)');
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, s, s);
});

// Black vinyl floor; fine concentric grooves as a bump map, glossy so it mirrors the glow.
const grooves = canvasTexture(
	2048,
	(ctx, s) => {
		ctx.fillStyle = '#808080';
		ctx.fillRect(0, 0, s, s);
		for (let r = 0; r < s * 4; r += 5) {
			ctx.strokeStyle = r % 160 < 5 ? '#000' : random() < 0.5 ? '#6a6a6a' : '#999';
			ctx.lineWidth = r % 160 < 5 ? 3 : 1.5;
			ctx.beginPath();
			ctx.arc(s / 2, -s * 3, s * 3 + r - s * 1.2, 0, Math.PI);
			ctx.stroke();
		}
	},
	false
);
const floor = new THREE.Mesh(
	new THREE.PlaneGeometry(14, 14),
	new THREE.MeshPhysicalMaterial({
		color: '#050505',
		roughness: 0.6,
		clearcoat: 0,
		clearcoatRoughness: 0.25,
		bumpMap: grooves,
		bumpScale: 0.6,
		envMapIntensity: 0,
		specularIntensity: 0.15
	})
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.42;
floor.receiveShadow = true;
scene.add(floor);
scene.fog = new THREE.Fog(WALNUT[950], 6, 10);

// Heartbeat: flat, a small P bump, the QRS spike, a T bump, flat again. Stands on its edge.
const beat = [
	[-6, 0],
	[-0.15, 0],
	[0.05, 0.14],
	[0.25, 0],
	[0.42, 0],
	[0.52, -0.2],
	[0.78, 1.75],
	[1.05, -0.38],
	[1.2, 0],
	[1.5, 0],
	[1.78, 0.3],
	[2.05, 0],
	[7, 0]
];
const points = [];
for (let i = 0; i < beat.length - 1; i++) {
	const [x0, y0] = beat[i];
	const [x1, y1] = beat[i + 1];
	const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.02));
	for (let j = 0; j < steps; j++) {
		const t = j / steps;
		points.push(new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0));
	}
}
points.push(new THREE.Vector3(...beat.at(-1), 0));
const pulsePath = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.05);
// The line glows: its core is on the bloom layer, blurred separately and added over the scene.
const BLOOM_LAYER = 1;
const pulse = new THREE.Mesh(
	new THREE.TubeGeometry(pulsePath, 2400, 0.026, 16),
	new THREE.MeshBasicMaterial({ color: '#6dfb9f', toneMapped: false })
);
pulse.layers.enable(BLOOM_LAYER);
scene.add(pulse);
// Green light spilling onto the vinyl under the line.
const spill = canvasTexture(256, (ctx, s) => {
	const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
	g.addColorStop(0, 'rgba(74,222,128,0.3)');
	g.addColorStop(1, 'rgba(74,222,128,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, s, s);
});
for (const [x, z, w, d] of [
	[0, 0.05, 10, 0.7],
	[0.78, 0.1, 1.8, 1.6]
]) {
	const glow = new THREE.Mesh(
		new THREE.PlaneGeometry(w, d),
		new THREE.MeshBasicMaterial({
			map: spill,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		})
	);
	glow.rotation.x = -Math.PI / 2;
	glow.position.set(x, -0.415, z);
	scene.add(glow);
}
// The line's light on the underside of the cartridge.
const bounce = new THREE.PointLight(PULSE, 0.6, 1.6, 1.6);
bounce.position.set(-0.8, 0.25, 0.3);
scene.add(bounce);

// Stylus. Tip rests on the flat line just before the beat.
const tip = new THREE.Vector3(-0.55, 0.034, 0);
const stylus = new THREE.Group();
scene.add(stylus);

const aluminium = new THREE.MeshPhysicalMaterial({
	color: '#b9b9b3',
	metalness: 1,
	roughness: 0.38,
	anisotropy: 0.85
});
const polished = new THREE.MeshPhysicalMaterial({
	color: '#a9a9a5',
	metalness: 1,
	roughness: 0.24
});
const gloss = new THREE.MeshPhysicalMaterial({
	color: '#0c0c0c',
	roughness: 0.38,
	clearcoat: 1,
	clearcoatRoughness: 0.06,
	envMapIntensity: 0.45
});
const oxblood = new THREE.MeshPhysicalMaterial({
	color: '#9e2a2b',
	roughness: 0.35,
	clearcoat: 0.6
});

function mesh(geometry, material, setup) {
	const m = new THREE.Mesh(geometry, material);
	m.castShadow = true;
	m.receiveShadow = true;
	setup?.(m);
	stylus.add(m);
	return m;
}

// Cartridge body, its front face raked back like a real one.
const bodyShape = new THREE.Shape();
bodyShape.moveTo(-0.52, 0.62);
bodyShape.lineTo(0.5, 0.62);
bodyShape.lineTo(0.34, 0.04);
bodyShape.quadraticCurveTo(0.32, 0, 0.27, 0);
bodyShape.lineTo(-0.46, 0);
bodyShape.quadraticCurveTo(-0.52, 0, -0.52, 0.06);
bodyShape.lineTo(-0.52, 0.62);
mesh(
	new THREE.ExtrudeGeometry(bodyShape, {
		depth: 0.56,
		bevelEnabled: true,
		bevelThickness: 0.035,
		bevelSize: 0.03,
		bevelSegments: 6,
		curveSegments: 16
	}),
	gloss,
	(m) => m.position.set(-0.95, 0.66, -0.28)
);
mesh(new THREE.BoxGeometry(0.62, 0.05, 0.02), oxblood, (m) => m.position.set(-1.05, 1.12, 0.32));

// Headshell plate with a finger lift, mounting screws, tonearm tube and collar.
mesh(new RoundedBoxGeometry(1.7, 0.09, 0.78, 4, 0.03), aluminium, (m) =>
	m.position.set(-1.0, 1.36, 0)
);
mesh(new RoundedBoxGeometry(0.5, 0.07, 0.3, 4, 0.03), aluminium, (m) => {
	m.position.set(-0.02, 1.48, 0);
	m.rotation.z = 0.55;
});
for (const z of [-0.2, 0.2]) {
	mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 24), polished, (m) =>
		m.position.set(-1.0, 1.42, z)
	);
}
const collar = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 32), polished, (m) => {
	m.position.set(-1.92, 1.42, 0);
	m.rotation.z = Math.PI / 2;
});
const armStart = collar.position.clone();
const armEnd = new THREE.Vector3(-4.6, 5.2, -2.2);
mesh(new THREE.CylinderGeometry(0.11, 0.11, armStart.distanceTo(armEnd), 32), polished, (m) => {
	m.position.copy(armStart).lerp(armEnd, 0.5);
	m.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		armEnd.clone().sub(armStart).normalize()
	);
});

// Cantilever from under the body down to the diamond.
const cantileverTop = new THREE.Vector3(-0.72, 0.68, 0);
const cantileverEnd = tip.clone().add(new THREE.Vector3(0, 0.07, 0));
mesh(
	new THREE.CylinderGeometry(0.016, 0.026, cantileverTop.distanceTo(cantileverEnd), 16),
	polished,
	(m) => {
		m.position.copy(cantileverTop).lerp(cantileverEnd, 0.5);
		m.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			cantileverTop.clone().sub(cantileverEnd).normalize()
		);
	}
);
mesh(
	new THREE.ConeGeometry(0.03, 0.08, 6),
	new THREE.MeshPhysicalMaterial({
		color: '#fff',
		emissive: '#d9ffe6',
		emissiveIntensity: 1.5,
		roughness: 0
	}),
	(m) => {
		m.position.copy(tip).add(new THREE.Vector3(0, 0.04, 0));
		m.rotation.x = Math.PI;
	}
);
// A spark where the diamond meets the line.
const spark = new THREE.PointLight('#e9ffef', 0.6, 1, 2);
spark.position.copy(tip).add(new THREE.Vector3(0, 0.06, 0.12));
scene.add(spark);

// Warm key light from the top left, a cool rim from behind.
const key = new THREE.DirectionalLight('#ffe2bf', 3.2);
key.position.set(-3, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
scene.add(key);
const rim = new THREE.DirectionalLight('#cfe0ff', 1.6);
rim.position.set(3, 3, -5);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 50);
camera.position.set(-0.45, 3.4, 7.8);
camera.lookAt(-0.45, 0.62, 0);

const target = () =>
	new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 8, type: THREE.HalfFloatType });
const bloom = new EffectComposer(renderer, target());
bloom.renderToScreen = false;
bloom.addPass(new RenderPass(scene, camera));
bloom.addPass(new UnrealBloomPass(new THREE.Vector2(SIZE, SIZE), 0.9, 0.18, 0));

const composer = new EffectComposer(renderer, target());
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
	new ShaderPass(
		new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, glow: { value: bloom.renderTarget2.texture } },
			vertexShader: `
				varying vec2 vUv;
				void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
			fragmentShader: `
				uniform sampler2D tDiffuse, glow;
				varying vec2 vUv;
				void main() { gl_FragColor = texture2D(tDiffuse, vUv) + texture2D(glow, vUv); }`
		}),
		'tDiffuse'
	)
);
composer.addPass(new OutputPass());

// Glow pass: only the bloom layer, on black, so nothing else blooms.
function renderGlow() {
	const background = scene.background;
	scene.background = null;
	camera.layers.set(BLOOM_LAYER);
	bloom.render();
	camera.layers.set(0);
	scene.background = background;
}

// Renders the scene, zoomed out for maskable icons so it fits the safe zone, and returns PNG bytes
// as base64 at `size`, clipped to the app's rounded plinth unless `fullBleed`.
window.renderIcon = ({ size, fullBleed }) => {
	camera.zoom = fullBleed ? 0.8 : 1;
	camera.updateProjectionMatrix();
	renderGlow();
	composer.render();
	const out = document.createElement('canvas');
	out.width = out.height = size;
	const ctx = out.getContext('2d');
	ctx.imageSmoothingQuality = 'high';
	if (!fullBleed) {
		ctx.beginPath();
		ctx.roundRect(0, 0, size, size, (size * 112) / 512);
		ctx.clip();
	}
	ctx.drawImage(renderer.domElement, 0, 0, size, size);
	return out.toDataURL('image/png').split(',')[1];
};
window.iconSceneReady = true;
