import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { JointAngles } from '../types';
import { RotateCw, Flame, ShieldAlert } from 'lucide-react';

interface UR5eViewerProps {
  jointAngles: JointAngles;
  robotStatus: string;
  weldingActive: boolean;
  taskProgress: number;
  currentTaskName?: string;
  onJointChange?: (angles: JointAngles) => void;
  interactive?: boolean;
}

type Pose = { p: number; q: number[] };

const HOME = [0, 0, 118, -120, 0, 0];

const PICK_POSES: Pose[] = [
  { p: 0.00, q: HOME },
  { p: 0.16, q: [28, 0, 118, -120, 0, 0] },
  { p: 0.28, q: [28, 4, 112, -116, 0, 0] },
  { p: 0.39, q: [28, 4, 112, -116, 0, 0] },
  { p: 0.49, q: [28, -5, 104, -108, 0, 0] },
  { p: 0.69, q: [-28, -5, 104, -108, 0, 0] },
  { p: 0.81, q: [-28, 4, 112, -116, 0, 0] },
  { p: 0.91, q: [-28, 4, 112, -116, 0, 0] },
  { p: 1.00, q: HOME },
];

// ============================================================
// PART B — SORTING
// Red block starts inside BLUE box.
// Blue block starts inside RED box.
// Robot sorts each block into its matching colour box.
// ============================================================

const SORT_RED_POSES: Pose[] = [
  { p: 0.00, q: HOME },

  // Approach BLUE box on the left.
  { p: 0.18, q: [35, 0, 118, -120, 0, 0] },
  { p: 0.32, q: [35, 4, 112, -116, 0, 0] },

  // Grip red block inside blue box.
  { p: 0.42, q: [35, -8, 104, -108, 0, 0] },

  // Lift high and cross the cell.
  { p: 0.58, q: [0, -30, 142, -152, 0, 0] },

  // Descend into RED box on the right.
  { p: 0.76, q: [-35, -8, 104, -108, 0, 0] },
  { p: 0.86, q: [-35, 4, 112, -116, 0, 0] },

  { p: 1.00, q: HOME },
];

const SORT_BLUE_POSES: Pose[] = [
  { p: 0.00, q: HOME },

  // Approach RED box on the right.
  { p: 0.18, q: [-35, 0, 118, -120, 0, 0] },
  { p: 0.32, q: [-35, 4, 112, -116, 0, 0] },

  // Grip blue block inside red box.
  { p: 0.42, q: [-35, -8, 104, -108, 0, 0] },

  // Lift high and cross the cell.
  { p: 0.58, q: [0, -30, 142, -152, 0, 0] },

  // Descend into BLUE box on the left.
  { p: 0.76, q: [35, -8, 104, -108, 0, 0] },
  { p: 0.86, q: [35, 4, 112, -116, 0, 0] },

  { p: 1.00, q: HOME },
];

// ============================================================
// PART C — PALLETIZING
// Exactly 2 floor boxes.
// Robot picks box 1 without touching the table, lifts it,
// places it on the table, moves down for box 2,
// then lifts and places box 2 on the table.
// ============================================================

const PALLET_SETS: Pose[][] = [
  [
    { p: 0.00, q: HOME },

    // Move to FIRST floor box — stay clear of the table.
    { p: 0.12, q: [-55, 0, 118, -120, 0, 0] },
    { p: 0.26, q: [-55, 4, 112, -116, 0, 0] },
    { p: 0.36, q: [-55, -5, 104, -108, 0, 0] },

    // Grip and lift straight up before crossing toward the table.
    { p: 0.46, q: [-55, -5, 104, -108, 0, 0] },
    { p: 0.60, q: [-5, -30, 142, -152, 0, 0] },

    // Lower onto the table.
    { p: 0.74, q: [-18, 4, 112, -116, 0, 0] },
    { p: 0.86, q: [-18, 4, 112, -116, 0, 0] },
    { p: 0.92, q: [-18, 4, 112, -116, 0, 0] },
    { p: 1.00, q: HOME },
  ],

  [
    { p: 0.00, q: HOME },

    // Move down to SECOND floor box — clear of the table.
    { p: 0.12, q: [55, 0, 118, -120, 0, 0] },
    { p: 0.26, q: [55, 4, 112, -116, 0, 0] },
    { p: 0.36, q: [55, -5, 104, -108, 0, 0] },

    // Grip and lift straight up before crossing toward the table.
    { p: 0.46, q: [55, -5, 104, -108, 0, 0] },
    { p: 0.60, q: [5, -30, 142, -152, 0, 0] },

    // Lower onto the table.
    { p: 0.74, q: [18, 4, 112, -116, 0, 0] },
    { p: 0.86, q: [18, 4, 112, -116, 0, 0] },
    { p: 0.92, q: [18, 4, 112, -116, 0, 0] },
    { p: 1.00, q: HOME },
  ],
];

// ============================================================
// PART D — WELDING
// ============================================================

const WELD_POSES: Pose[] = [
  { p: 0.00, q: HOME },
  { p: 0.18, q: [-14, 0, 112, -116, 0, 0] },
  { p: 0.30, q: [-10, 1, 108, -113, 0, 0] },
  { p: 0.43, q: [-4, 1, 108, -113, 0, 0] },
  { p: 0.56, q: [4, 1, 108, -113, 0, 0] },
  { p: 0.69, q: [10, 1, 108, -113, 0, 0] },
  { p: 0.80, q: [14, 0, 112, -116, 0, 0] },
  { p: 0.90, q: [0, 0, 118, -120, 0, 0] },
  { p: 1.00, q: HOME },
];

function clamp01(v: number) {
  return THREE.MathUtils.clamp(v, 0, 1);
}

function smooth(v: number) {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
}

function isPickTask(name: string) {
  const s = name.toLowerCase();
  return s.includes('pick') && s.includes('place');
}

function isSortTask(name: string) {
  return name.toLowerCase().includes('sort');
}

function isPalletTask(name: string) {
  return name.toLowerCase().includes('pallet');
}

function isWeldTask(name: string) {
  return name.toLowerCase().includes('weld');
}

export const UR5eViewer: React.FC<UR5eViewerProps> = ({
  jointAngles,
  robotStatus,
  weldingActive,
  taskProgress,
  currentTaskName,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visualProgress, setVisualProgress] = useState(0);

  const refs = useRef<{
    j1?: THREE.Group;
    j2?: THREE.Group;
    j3?: THREE.Group;
    j4?: THREE.Group;
    j5?: THREE.Group;
    j6?: THREE.Group;
    toolTip?: THREE.Object3D;
    leftFinger?: THREE.Mesh;
    rightFinger?: THREE.Mesh;
    partA?: THREE.Mesh;
    redPart?: THREE.Mesh;
    bluePart?: THREE.Mesh;
    palletParts?: THREE.Mesh[];
    sparkSystem?: THREE.Points;
    sparkLight?: THREE.PointLight;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    pickGroup?: THREE.Group;
    sortGroup?: THREE.Group;
    palletGroup?: THREE.Group;
    weldGroup?: THREE.Group;
    sourceA?: THREE.Vector3;
    targetA?: THREE.Vector3;
    sortPickupRed?: THREE.Vector3;
    sortDropRed?: THREE.Vector3;
    sortPickupBlue?: THREE.Vector3;
    sortDropBlue?: THREE.Vector3;
    palletPickups?: THREE.Vector3[];
    palletDrops?: THREE.Vector3[];
    weldPath?: THREE.Vector3[];
    attached?: THREE.Mesh;
    attachedFrom?: THREE.Group;
  }>({});

  const taskRef = useRef(currentTaskName || '');
  const visualTaskRef = useRef(currentTaskName || '');
  const requestedTaskRef = useRef(currentTaskName || '');
  const visualQueueRef = useRef<string[]>([]);
  const statusRef = useRef(robotStatus);
  const progressRef = useRef(taskProgress);
  const previousTaskRef = useRef(currentTaskName || '');
  const previousStatusRef = useRef(robotStatus);
  const startTimeRef = useRef(performance.now());
  const completedTaskRef = useRef('');
  const hudUpdateRef = useRef(0);

  useEffect(() => {
    const task = currentTaskName || '';

    if (task !== requestedTaskRef.current) {
      requestedTaskRef.current = task;

      if (task) {
        if (!visualTaskRef.current) {
          visualTaskRef.current = task;
          taskRef.current = task;
          startTimeRef.current = performance.now();
          completedTaskRef.current = '';
        } else if (task !== visualTaskRef.current) {
          if (!visualQueueRef.current.includes(task)) {
            visualQueueRef.current.push(task);
          }
        }
      }
    }

    if (
      robotStatus === 'RUNNING' &&
      previousStatusRef.current !== 'RUNNING'
    ) {
      if (visualTaskRef.current) {
        startTimeRef.current = performance.now();
      }
    }

    statusRef.current = robotStatus;
    progressRef.current = taskProgress;
    previousStatusRef.current = robotStatus;
    previousTaskRef.current = task;
  }, [robotStatus, currentTaskName, taskProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    // ============================================================
    // FACTORY BACKGROUND
    // ============================================================

    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = 1600;
    backgroundCanvas.height = 900;
    const bg = backgroundCanvas.getContext('2d');

    if (bg) {
      const g = bg.createLinearGradient(0, 0, 0, 900);
      g.addColorStop(0, '#101821');
      g.addColorStop(0.55, '#2a3945');
      g.addColorStop(1, '#18232c');

      bg.fillStyle = g;
      bg.fillRect(0, 0, 1600, 900);

      bg.fillStyle = '#0a1017';
      bg.fillRect(0, 0, 1600, 125);

      bg.strokeStyle = 'rgba(160,190,210,.18)';
      bg.lineWidth = 3;

      for (let x = -200; x < 1900; x += 220) {
        bg.beginPath();
        bg.moveTo(x, 0);
        bg.lineTo(x + 170, 125);
        bg.stroke();
      }

      bg.fillStyle = '#e8f4ff';
      bg.shadowColor = 'rgba(110,180,255,.55)';
      bg.shadowBlur = 18;

      for (const x of [220, 570, 920, 1270]) {
        bg.fillRect(x, 58, 145, 10);
      }

      bg.shadowBlur = 0;

      bg.fillStyle = '#536270';

      for (const x of [80, 360, 640, 920, 1200, 1480]) {
        bg.fillRect(x, 110, 22, 520);
      }

      bg.fillStyle = 'rgba(8,13,18,.68)';
      bg.fillRect(110, 440, 1380, 205);

      bg.strokeStyle = 'rgba(220,230,240,.12)';

      for (let x = 110; x <= 1490; x += 28) {
        bg.beginPath();
        bg.moveTo(x, 440);
        bg.lineTo(x, 645);
        bg.stroke();
      }

      for (let y = 440; y <= 645; y += 28) {
        bg.beginPath();
        bg.moveTo(110, y);
        bg.lineTo(1490, y);
        bg.stroke();
      }

      bg.fillStyle = '#d2aa3e';

      for (const x of [90, 325, 560, 795, 1030, 1265, 1490]) {
        bg.fillRect(x, 418, 18, 250);
      }

      const floor = bg.createLinearGradient(0, 650, 0, 900);
      floor.addColorStop(0, '#4a5864');
      floor.addColorStop(1, '#18232d');

      bg.fillStyle = floor;
      bg.fillRect(0, 650, 1600, 250);
    }

    const bgTexture = new THREE.CanvasTexture(backgroundCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;

    // ============================================================
    // CAMERA / RENDERER
    // ============================================================

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(
      42,
      width / height,
      0.01,
      50,
    );

    camera.position.set(0.96, 0.66, 1.92);
    camera.lookAt(0, 0.47, 0);
    refs.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.10;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.72;
    controls.maxDistance = 3.7;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2 + 0.04;
    controls.target.set(0, 0.47, 0);
    controls.update();
    refs.current.controls = controls;

    // ============================================================
    // LIGHTING / FLOOR
    // ============================================================

    scene.add(new THREE.AmbientLight(0xddeaf5, 0.9));

    const hemi = new THREE.HemisphereLight(
      0xdbeeff,
      0x111820,
      1.15,
    );

    hemi.position.set(0, 6, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.15);
    key.position.set(3.5, 5.5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 15;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.00025;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8eb8d8, 0.62);
    fill.position.set(-4, 3, -3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x99c9ec, 1.0);
    rim.position.set(-2, 4, 5);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x394752,
        roughness: 0.74,
        metalness: 0.14,
      }),
    );

    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(
      10,
      20,
      0x657583,
      0x43515f,
    );

    grid.position.y = 0.002;
    scene.add(grid);

    const workRing = new THREE.Mesh(
      new THREE.RingGeometry(0.83, 0.85, 96),
      new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      }),
    );

    workRing.rotation.x = -Math.PI / 2;
    workRing.position.y = 0.004;
    scene.add(workRing);

    // ============================================================
    // ROBOT
    // ============================================================

    const robotRoot = new THREE.Group();
    robotRoot.scale.setScalar(1.25);
    scene.add(robotRoot);

    const dark = new THREE.MeshStandardMaterial({
      color: 0x171c21,
      metalness: 0.78,
      roughness: 0.28,
    });

    const darkSoft = new THREE.MeshStandardMaterial({
      color: 0x30363d,
      metalness: 0.62,
      roughness: 0.34,
    });

    const createGripper = () => {
      const tool = new THREE.Group();

      const adapter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.055, 32),
        dark,
      );

      adapter.position.z = -0.028;
      tool.add(adapter);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.024, 32),
        darkSoft,
      );

      collar.position.z = -0.068;
      tool.add(collar);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 0.075, 0.075),
        dark,
      );

      body.position.set(0, 0, -0.112);
      tool.add(body);

      const center = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.055, 0.085),
        darkSoft,
      );

      center.position.set(0, 0, -0.158);
      tool.add(center);

      const left = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.055, 0.105),
        dark,
      );

      left.position.set(-0.035, 0, -0.215);
      tool.add(left);
      refs.current.leftFinger = left;

      const right = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.055, 0.105),
        dark,
      );

      right.position.set(0.035, 0, -0.215);
      tool.add(right);
      refs.current.rightFinger = right;

      const padL = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.042, 0.045),
        darkSoft,
      );

      padL.position.set(-0.022, -0.002, -0.268);
      tool.add(padL);

      const padR = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.042, 0.045),
        darkSoft,
      );

      padR.position.set(0.022, -0.002, -0.268);
      tool.add(padR);

      const toolTip = new THREE.Object3D();
      toolTip.position.set(0, 0, -0.292);
      tool.add(toolTip);
      refs.current.toolTip = toolTip;

      const weldLight = new THREE.PointLight(
        0xffc857,
        0,
        1.2,
        2,
      );

      toolTip.add(weldLight);
      refs.current.sparkLight = weldLight;

      tool.traverse((o) => {
        const mesh = o as THREE.Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      return tool;
    };

    // ============================================================
    // SPARK PARTICLES
    // ============================================================

    const sparkCount = 110;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocity: THREE.Vector3[] = [];

    for (let i = 0; i < sparkCount; i += 1) {
      sparkVelocity.push(new THREE.Vector3());
    }

    const sparkGeometry = new THREE.BufferGeometry();

    sparkGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(sparkPositions, 3),
    );

    const sparkMaterial = new THREE.PointsMaterial({
      color: 0xffd166,
      size: 0.018,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sparkSystem = new THREE.Points(
      sparkGeometry,
      sparkMaterial,
    );

    scene.add(sparkSystem);
    refs.current.sparkSystem = sparkSystem;

    // ============================================================
    // LOAD ORIGINAL DAE FILES
    // ============================================================

    const loader = new ColladaLoader();

    const files = [
      'base.dae',
      'shoulder.dae',
      'upperarm.dae',
      'forearm.dae',
      'wrist1.dae',
      'wrist2.dae',
      'wrist3.dae',
    ];

    const loaded: Record<string, THREE.Object3D> = {};
    let loadedCount = 0;

    const enhanceMaterials = (object: THREE.Object3D) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;

        if (!mesh.isMesh) return;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const sourceMaterials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        const materials = sourceMaterials.map((source) => {
          const src = source as THREE.MeshStandardMaterial;
          const mat = new THREE.MeshStandardMaterial();

          if (src.color) mat.color.copy(src.color);
          if (src.map) mat.map = src.map;
          if (src.normalMap) mat.normalMap = src.normalMap;
          if (src.roughnessMap) mat.roughnessMap = src.roughnessMap;
          if (src.metalnessMap) mat.metalnessMap = src.metalnessMap;
          if (src.emissive) mat.emissive.copy(src.emissive);

          mat.metalness =
            typeof src.metalness === 'number'
              ? Math.max(
                  0.25,
                  Math.min(src.metalness, 0.85),
                )
              : 0.55;

          mat.roughness =
            typeof src.roughness === 'number'
              ? Math.max(
                  0.24,
                  Math.min(src.roughness, 0.55),
                )
              : 0.34;

          mat.envMapIntensity = 1.15;
          mat.side = src.side;
          mat.transparent = src.transparent;
          mat.opacity = src.opacity;

          return mat;
        });

        mesh.material = Array.isArray(mesh.material)
          ? materials
          : materials[0];
      });
    };

    const applyVisualPose = (q: number[]) => {
      const {
        j1,
        j2,
        j3,
        j4,
        j5,
        j6,
      } = refs.current;

      if (
        !j1 ||
        !j2 ||
        !j3 ||
        !j4 ||
        !j5 ||
        !j6
      ) {
        return;
      }

      j1.rotation.y = THREE.MathUtils.degToRad(q[0]);
      j2.rotation.z = THREE.MathUtils.degToRad(q[1]);
      j3.rotation.z = THREE.MathUtils.degToRad(q[2]);
      j4.rotation.z = THREE.MathUtils.degToRad(q[3]);
      j5.rotation.x = THREE.MathUtils.degToRad(q[4]);
      j6.rotation.y = THREE.MathUtils.degToRad(q[5]);
    };

    const sample = (
      poses: Pose[],
      value: number,
    ) => {
      const v = clamp01(value);
      let a = poses[0];
      let b = poses[poses.length - 1];

      for (
        let i = 0;
        i < poses.length - 1;
        i += 1
      ) {
        if (v <= poses[i + 1].p) {
          a = poses[i];
          b = poses[i + 1];
          break;
        }
      }

      const span = Math.max(
        0.0001,
        b.p - a.p,
      );

      const t = smooth(
        (v - a.p) / span,
      );

      return a.q.map((x, i) =>
        THREE.MathUtils.lerp(
          x,
          b.q[i],
          t,
        ),
      );
    };

    const getTCP = (q: number[]) => {
      applyVisualPose(q);

      const out = new THREE.Vector3();

      refs.current.toolTip?.getWorldPosition(out);

      return out;
    };

    // IMPORTANT:
    // The object is attached exactly at the tool tip,
    // between the gripper fingers.
    const attachToTool = (
      mesh: THREE.Mesh,
      from: THREE.Group,
    ) => {
      const tip = refs.current.toolTip;

      if (!tip) return;

      tip.attach(mesh);

      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);

      refs.current.attached = mesh;
      refs.current.attachedFrom = from;
    };

    const releaseFromTool = (
      mesh: THREE.Mesh,
      target: THREE.Vector3,
      group: THREE.Group,
      rotationY = 0,
    ) => {
      group.attach(mesh);

      mesh.position.copy(target);
      mesh.rotation.set(0, rotationY, 0);

      if (refs.current.attached === mesh) {
        refs.current.attached = undefined;
        refs.current.attachedFrom = undefined;
      }
    };

    // ============================================================
    // ROBOT ASSEMBLY
    // DO NOT ROTATE upperarm.dae
    // ============================================================

    const assembleRobot = () => {
      const baseLink = new THREE.Group();
      robotRoot.add(baseLink);

      const baseMesh =
        loaded['base.dae'].clone(true);

      baseMesh.rotation.set(
        0,
        0,
        Math.PI,
      );

      baseLink.add(baseMesh);

      const j1 = new THREE.Group();
      j1.position.set(
        0,
        0.1625,
        0,
      );

      baseLink.add(j1);
      refs.current.j1 = j1;

      const shoulder =
        loaded['shoulder.dae'].clone(true);

      shoulder.rotation.set(
        0,
        0,
        Math.PI,
      );

      j1.add(shoulder);

      const j2 = new THREE.Group();
      j1.add(j2);
      refs.current.j2 = j2;

      // THIS IS CORRECT.
      // NO Math.PI rotation here.
      const upperarm =
        loaded['upperarm.dae'].clone(true);

      j2.add(upperarm);

      const j3 = new THREE.Group();
      j3.position.set(
        0,
        0.425,
        0,
      );

      j2.add(j3);
      refs.current.j3 = j3;

      const forearm =
        loaded['forearm.dae'].clone(true);

      j3.add(forearm);

      const j4 = new THREE.Group();
      j4.position.set(
        0,
        0.3922,
        0,
      );

      j3.add(j4);
      refs.current.j4 = j4;

      const wrist1 =
        loaded['wrist1.dae'].clone(true);

      j4.add(wrist1);

      const j5 = new THREE.Group();
      j5.position.set(
        0,
        0.10,
        0,
      );

      j4.add(j5);
      refs.current.j5 = j5;

      const wrist2 =
        loaded['wrist2.dae'].clone(true);

      j5.add(wrist2);

      const j6 = new THREE.Group();
      j6.position.set(
        0,
        0.10,
        0,
      );

      j5.add(j6);
      refs.current.j6 = j6;

      const wrist3 =
        loaded['wrist3.dae'].clone(true);

      j6.add(wrist3);

      const gripper = createGripper();

      gripper.position.set(
        0,
        0.025,
        0.015,
      );

      gripper.rotation.x =
        -Math.PI / 2;

      j6.add(gripper);

      applyVisualPose(HOME);
    };

    // ============================================================
    // TABLE
    // ============================================================

    const makeTable = (
      center: THREE.Vector3,
      color: number,
      parent: THREE.Group,
      widthValue = 0.40,
      depthValue = 0.31,
    ) => {
      const table = new THREE.Group();

      table.position.copy(center);

      const topMat =
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.48,
          roughness: 0.40,
        });

      const metal =
        new THREE.MeshStandardMaterial({
          color: 0x1e272e,
          metalness: 0.72,
          roughness: 0.30,
        });

      const top = new THREE.Mesh(
        new THREE.BoxGeometry(
          widthValue,
          0.055,
          depthValue,
        ),
        topMat,
      );

      top.position.y = 0.0275;
      table.add(top);

      const legHeight =
        Math.max(0.18, center.y);

      const legX =
        Math.max(
          0.08,
          widthValue / 2 - 0.03,
        );

      const legZ =
        Math.max(
          0.06,
          depthValue / 2 - 0.035,
        );

      for (const x of [
        -legX,
        legX,
      ]) {
        for (const z of [
          -legZ,
          legZ,
        ]) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(
              0.028,
              legHeight,
              0.028,
            ),
            metal,
          );

          leg.position.set(
            x,
            -legHeight / 2,
            z,
          );

          table.add(leg);
        }
      }

      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(
            0.25,
            widthValue - 0.08,
          ),
          0.023,
          0.023,
        ),
        metal,
      );

      brace.position.y =
        -Math.max(
          0.12,
          legHeight - 0.04,
        );

      table.add(brace);

      table.traverse((o) => {
        const mesh = o as THREE.Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      parent.add(table);
    };

    // ============================================================
    // SORTING BOX
    // ============================================================

    const makeBin = (
      center: THREE.Vector3,
      color: number,
      parent: THREE.Group,
    ) => {
      const bin = new THREE.Group();

      bin.position.copy(center);

      const wall =
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.18,
          roughness: 0.35,
        });

      const frame =
        new THREE.MeshStandardMaterial({
          color: 0x1d262d,
          metalness: 0.70,
          roughness: 0.30,
        });

      const width = 0.26;
      const depth = 0.24;
      const wallHeight = 0.18;
      const wallThickness = 0.024;

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          0.05,
          depth,
        ),
        frame,
      );

      base.position.y = 0.025;
      bin.add(base);

      const front = new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          wallHeight,
          wallThickness,
        ),
        wall,
      );

      front.position.set(
        0,
        wallHeight / 2,
        depth / 2 -
          wallThickness / 2,
      );

      bin.add(front);

      const back = front.clone();

      back.position.z =
        -depth / 2 +
        wallThickness / 2;

      bin.add(back);

      const left = new THREE.Mesh(
        new THREE.BoxGeometry(
          wallThickness,
          wallHeight,
          depth -
            wallThickness * 2,
        ),
        wall,
      );

      left.position.set(
        -width / 2 +
          wallThickness / 2,
        wallHeight / 2,
        0,
      );

      bin.add(left);

      const right = left.clone();

      right.position.x =
        width / 2 -
        wallThickness / 2;

      bin.add(right);

      bin.traverse((o) => {
        const mesh = o as THREE.Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      parent.add(bin);
    };

    // ============================================================
    // PALLET
    // ============================================================

    const makePallet = (
      center: THREE.Vector3,
      parent: THREE.Group,
    ) => {
      const pallet = new THREE.Group();

      pallet.position.copy(center);

      const wood =
        new THREE.MeshStandardMaterial({
          color: 0x896a40,
          roughness: 0.72,
        });

      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.52,
          0.055,
          0.40,
        ),
        wood,
      );

      deck.position.y = 0.0275;
      pallet.add(deck);

      for (const x of [
        -0.19,
        0,
        0.19,
      ]) {
        for (const z of [
          -0.14,
          0.14,
        ]) {
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(
              0.065,
              0.09,
              0.065,
            ),
            wood,
          );

          block.position.set(
            x,
            -0.045,
            z,
          );

          pallet.add(block);
        }
      }

      pallet.traverse((o) => {
        const mesh = o as THREE.Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      parent.add(pallet);
    };

    // ============================================================
    // PART
    // ============================================================

    const makePart = (
      color: number,
      size = 0.09,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          size,
          size,
          size,
        ),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.18,
          roughness: 0.34,
        }),
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;
    };

    // ============================================================
    // BUILD WORKCELLS
    // ============================================================

    const buildWorkcells = () => {
      const pickGroup = new THREE.Group();
      const sortGroup = new THREE.Group();
      const palletGroup = new THREE.Group();
      const weldGroup = new THREE.Group();

      refs.current.pickGroup =
        pickGroup;

      refs.current.sortGroup =
        sortGroup;

      refs.current.palletGroup =
        palletGroup;

      refs.current.weldGroup =
        weldGroup;

      scene.add(
        pickGroup,
        sortGroup,
        palletGroup,
        weldGroup,
      );

      const toolTip =
        refs.current.toolTip;

      if (!toolTip) return;

      // ==========================================================
      // PART A
      // ==========================================================

      const sourceTCP =
        getTCP(PICK_POSES[2].q);

      const targetTCP =
        getTCP(PICK_POSES[6].q);

      const tableY =
        Math.min(
          sourceTCP.y,
          targetTCP.y,
        ) - 0.11;

      refs.current.sourceA =
        sourceTCP.clone();

      refs.current.targetA =
        targetTCP.clone();

      makeTable(
        new THREE.Vector3(
          sourceTCP.x,
          tableY,
          sourceTCP.z,
        ),
        0x465461,
        pickGroup,
      );

      makeTable(
        new THREE.Vector3(
          targetTCP.x,
          tableY,
          targetTCP.z,
        ),
        0x394b59,
        pickGroup,
      );

      const partA = makePart(
        0xe1a21a,
        0.12,
      );

      partA.position.copy(
        sourceTCP,
      );

      pickGroup.add(partA);
      refs.current.partA = partA;

      // ==========================================================
      // PART B
      // ==========================================================

      const blueBoxSourceCenter =
        getTCP(
          SORT_RED_POSES[2].q,
        );

      const redBoxSourceCenter =
        getTCP(
          SORT_BLUE_POSES[2].q,
        );

      const redBoxDestinationCenter =
        getTCP(
          SORT_RED_POSES[6].q,
        );

      const blueBoxDestinationCenter =
        getTCP(
          SORT_BLUE_POSES[6].q,
        );

      // Pickup positions match the actual low/grip pose,
      // so the gripper closes directly around each block.
      const redPickup =
        getTCP(
          SORT_RED_POSES[3].q,
        );

      const redDrop =
        redBoxDestinationCenter.clone();

      const bluePickup =
        getTCP(
          SORT_BLUE_POSES[3].q,
        );

      const blueDrop =
        blueBoxDestinationCenter.clone();

      refs.current.sortPickupRed =
        redPickup.clone();

      refs.current.sortDropRed =
        redDrop.clone();

      refs.current.sortPickupBlue =
        bluePickup.clone();

      refs.current.sortDropBlue =
        blueDrop.clone();

      const sortTableY =
        Math.min(
          blueBoxSourceCenter.y,
          redBoxSourceCenter.y,
        ) - 0.12;

      // BLUE BOX TABLE
      makeTable(
        new THREE.Vector3(
          blueBoxSourceCenter.x,
          sortTableY,
          blueBoxSourceCenter.z,
        ),
        0x465461,
        sortGroup,
        0.36,
        0.34,
      );

      // RED BOX TABLE
      makeTable(
        new THREE.Vector3(
          redBoxSourceCenter.x,
          sortTableY,
          redBoxSourceCenter.z,
        ),
        0x394b59,
        sortGroup,
        0.36,
        0.34,
      );

      const boxOffsetY = 0.095;

      // BLUE BOX
      makeBin(
        new THREE.Vector3(
          blueBoxSourceCenter.x,
          blueBoxSourceCenter.y -
            boxOffsetY,
          blueBoxSourceCenter.z,
        ),
        0x245fd1,
        sortGroup,
      );

      // RED BOX
      makeBin(
        new THREE.Vector3(
          redBoxSourceCenter.x,
          redBoxSourceCenter.y -
            boxOffsetY,
          redBoxSourceCenter.z,
        ),
        0xc92d2d,
        sortGroup,
      );

      // RED BLOCK INSIDE BLUE BOX
      const red = makePart(
        0xd62f2f,
        0.072,
      );

      red.position.copy(
        redPickup,
      );

      sortGroup.add(red);
      refs.current.redPart = red;

      // BLUE BLOCK INSIDE RED BOX
      const blue = makePart(
        0x3279df,
        0.072,
      );

      blue.position.copy(
        bluePickup,
      );

      sortGroup.add(blue);
      refs.current.bluePart = blue;

      // ==========================================================
      // PART C
      // ==========================================================

      // Floor-box positions match the actual low/grip pose.
      // The robot reaches the box first, closes the gripper,
      // then lifts high before crossing toward the table.
      const palletPickups =
        PALLET_SETS.map(
          (set) =>
            getTCP(set[3].q),
        );

      const palletDrops =
        PALLET_SETS.map(
          (set) =>
            getTCP(set[7].q),
        );

      const floorBoxY =
        0.0475;

      palletPickups.forEach((p) => {
        p.y = floorBoxY;
      });

      refs.current.palletPickups =
        palletPickups.map(
          (p) => p.clone(),
        );

      refs.current.palletDrops =
        palletDrops.map(
          (p) => p.clone(),
        );

      const palletCenter =
        new THREE.Vector3(
          palletDrops.reduce(
            (s, p) =>
              s + p.x,
            0,
          ) /
            palletDrops.length,

          palletDrops.reduce(
            (s, p) =>
              s + p.y,
            0,
          ) /
            palletDrops.length -
            0.1025,

          palletDrops.reduce(
            (s, p) =>
              s + p.z,
            0,
          ) /
            palletDrops.length,
        );

      makeTable(
        new THREE.Vector3(
          palletCenter.x,
          palletCenter.y -
            0.0275,
          palletCenter.z,
        ),
        0x394b59,
        palletGroup,
        0.74,
        0.50,
      );

      makePallet(
        palletCenter,
        palletGroup,
      );

      const palletParts =
        palletPickups.map(
          (pickup) => {
            const part =
              makePart(
                0xe0a23b,
                0.095,
              );

            part.position.copy(
              pickup,
            );

            palletGroup.add(part);

            return part;
          },
        );

      refs.current.palletParts =
        palletParts;

      // ==========================================================
      // PART D
      // ==========================================================

      const weldPath =
        WELD_POSES
          .slice(2, 7)
          .map((pose) =>
            getTCP(pose.q),
          );

      refs.current.weldPath =
        weldPath.map(
          (p) => p.clone(),
        );

      const minX =
        Math.min(
          ...weldPath.map(
            (p) => p.x,
          ),
        );

      const maxX =
        Math.max(
          ...weldPath.map(
            (p) => p.x,
          ),
        );

      const minZ =
        Math.min(
          ...weldPath.map(
            (p) => p.z,
          ),
        );

      const maxZ =
        Math.max(
          ...weldPath.map(
            (p) => p.z,
          ),
        );

      const minY =
        Math.min(
          ...weldPath.map(
            (p) => p.y,
          ),
        );

      const weldCenter =
        new THREE.Vector3(
          (minX + maxX) / 2,
          Math.max(
            0.01,
            minY - 0.07,
          ),
          (minZ + maxZ) / 2,
        );

      const bedWidth =
        Math.max(
          0.52,
          maxX -
            minX +
            0.25,
        );

      const bedDepth =
        Math.max(
          0.38,
          maxZ -
            minZ +
            0.22,
        );

      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(
          bedWidth,
          0.06,
          bedDepth,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x202a31,
          metalness: 0.72,
          roughness: 0.32,
        }),
      );

      bed.position.copy(
        weldCenter,
      );

      bed.castShadow = true;
      weldGroup.add(bed);

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(
            0.38,
            maxX -
              minX +
              0.10,
          ),
          0.018,
          Math.max(
            0.26,
            maxZ -
              minZ +
              0.10,
          ),
        ),
        new THREE.MeshStandardMaterial({
          color: 0x67747d,
          metalness: 0.65,
          roughness: 0.33,
        }),
      );

      plate.position.copy(
        weldCenter,
      );

      plate.position.y +=
        0.045;

      weldGroup.add(plate);

      const weldLegMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x1e272e,
          metalness: 0.72,
          roughness: 0.30,
        });

      const legHeight =
        Math.max(
          0.18,
          weldCenter.y,
        );

      for (const x of [
        weldCenter.x -
          bedWidth / 2 +
          0.035,

        weldCenter.x +
          bedWidth / 2 -
          0.035,
      ]) {
        for (const z of [
          weldCenter.z -
            bedDepth / 2 +
            0.035,

          weldCenter.z +
            bedDepth / 2 -
            0.035,
        ]) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(
              0.028,
              legHeight,
              0.028,
            ),
            weldLegMaterial,
          );

          leg.position.set(
            x,
            weldCenter.y -
              legHeight / 2,
            z,
          );

          leg.castShadow = true;

          weldGroup.add(leg);
        }
      }

      const pathGeometry =
        new THREE.BufferGeometry()
          .setFromPoints(
            weldPath.map(
              (p) =>
                new THREE.Vector3(
                  p.x,
                  minY + 0.005,
                  p.z,
                ),
            ),
          );

      weldGroup.add(
        new THREE.Line(
          pathGeometry,
          new THREE.LineBasicMaterial({
            color: 0xffb347,
          }),
        ),
      );

      applyVisualPose(HOME);
    };

    // ============================================================
    // LOAD MESHES
    // ============================================================

    files.forEach((filename) => {
      loader.load(
        `/models/ur5e/${filename}`,
        (collada) => {
          const sceneRoot = collada?.scene;

          if (!sceneRoot) {
            console.error(`Loaded ${filename} without a scene.`);
            setLoadError(`Failed to load UR5e model: ${filename}`);
            return;
          }

          enhanceMaterials(
            sceneRoot,
          );

          loaded[filename] =
            sceneRoot;

          loadedCount += 1;

          if (
            loadedCount ===
            files.length
          ) {
            assembleRobot();
            buildWorkcells();
            setLoading(false);
          }
        },
        undefined,
        (error) => {
          console.error(
            `Error loading ${filename}:`,
            error,
          );

          setLoadError(
            `Failed to load UR5e model: ${filename}`,
          );
        },
      );
    });

    // ============================================================
    // VISIBILITY
    // ============================================================

    const showOnlyTask = (
      task: string,
    ) => {
      const hasTask =
        task.trim().length > 0;

      if (
        refs.current.pickGroup
      ) {
        refs.current.pickGroup.visible =
          !hasTask ||
          isPickTask(task);
      }

      if (
        refs.current.sortGroup
      ) {
        refs.current.sortGroup.visible =
          isSortTask(task);
      }

      if (
        refs.current.palletGroup
      ) {
        refs.current.palletGroup.visible =
          isPalletTask(task);
      }

      if (
        refs.current.weldGroup
      ) {
        refs.current.weldGroup.visible =
          isWeldTask(task);
      }
    };

    const resetGripper = () => {
      if (
        refs.current.leftFinger
      ) {
        refs.current.leftFinger.position.x =
          -0.035;
      }

      if (
        refs.current.rightFinger
      ) {
        refs.current.rightFinger.position.x =
          0.035;
      }
    };

    const setGrip = (
      amount: number,
    ) => {
      const gap =
        THREE.MathUtils.lerp(
          0.035,
          0.018,
          clamp01(amount),
        );

      if (
        refs.current.leftFinger
      ) {
        refs.current.leftFinger.position.x =
          -gap;
      }

      if (
        refs.current.rightFinger
      ) {
        refs.current.rightFinger.position.x =
          gap;
      }
    };

    // ============================================================
    // PROCESS TIMINGS
    // ============================================================

    const getDuration = (
      task: string,
    ) => {
      if (isPickTask(task))
        return 24.0;

      if (isSortTask(task))
        return 35.0;

      if (isPalletTask(task))
        return 40.0;

      if (isWeldTask(task))
        return 34.0;

      return 0;
    };

    const getVisualPhase = (
      task: string,
    ) => {
      const duration =
        getDuration(task);

      if (!duration) return 0;

      const elapsed =
        (performance.now() -
          startTimeRef.current) /
        1000;

      return clamp01(
        elapsed / duration,
      );
    };

    const attachStateReset = () => {
      refs.current.attached =
        undefined;

      refs.current.attachedFrom =
        undefined;
    };

    const updateWeldingParticles = (
      active: boolean,
      delta: number,
    ) => {
      const points =
        refs.current.sparkSystem;

      const light =
        refs.current.sparkLight;

      const tip =
        refs.current.toolTip;

      if (
        !points ||
        !light ||
        !tip
      ) {
        return;
      }

      if (!active) {
        (
          points.material as THREE.PointsMaterial
        ).opacity = 0;

        light.intensity = 0;

        return;
      }

      const tipWorld =
        new THREE.Vector3();

      tip.getWorldPosition(
        tipWorld,
      );

      light.intensity =
        2.4 +
        Math.random() * 2.6;

      const material =
        points.material as THREE.PointsMaterial;

      material.opacity = 0.98;

      const attribute =
        points.geometry.attributes.position as THREE.BufferAttribute;

      const array =
        attribute.array as Float32Array;

      for (
        let i = 0;
        i < sparkCount;
        i += 1
      ) {
        const k = i * 3;

        array[k] +=
          sparkVelocity[i].x *
          delta;

        array[k + 1] +=
          sparkVelocity[i].y *
          delta;

        array[k + 2] +=
          sparkVelocity[i].z *
          delta;

        sparkVelocity[i].y -=
          2.5 * delta;

        if (
          array[k + 1] <
            tipWorld.y - 0.14 ||
          Math.random() < 0.04
        ) {
          array[k] =
            tipWorld.x +
            (Math.random() -
              0.5) *
              0.018;

          array[k + 1] =
            tipWorld.y;

          array[k + 2] =
            tipWorld.z +
            (Math.random() -
              0.5) *
              0.018;

          sparkVelocity[i].set(
            (Math.random() -
              0.5) *
              0.75,

            0.25 +
              Math.random() *
                0.9,

            (Math.random() -
              0.5) *
              0.75,
          );
        }
      }

      attribute.needsUpdate =
        true;
    };

    // ============================================================
    // ANIMATION
    // ============================================================

    const clock =
      new THREE.Clock();

    let frame = 0;

    const animate = () => {
      frame =
        requestAnimationFrame(
          animate,
        );

      const delta =
        Math.min(
          clock.getDelta(),
          0.05,
        );

      controls.update();

      const task =
        taskRef.current;

      const status =
        statusRef.current;

      const hasTask =
        task.trim().length > 0;

      showOnlyTask(task);

      const stopRequested =
        status === 'FAULT' ||
        status === 'STOPPED' ||
        status === 'STOP';

      const paused =
        status === 'PAUSED';

      const demoActive =
        hasTask &&
        !stopRequested &&
        !paused;

      const visualPhaseNow =
        hasTask
          ? getVisualPhase(task)
          : 0;

      if (
        performance.now() -
          hudUpdateRef.current >
        180
      ) {
        hudUpdateRef.current =
          performance.now();

        setVisualProgress(
          visualPhaseNow * 100,
        );
      }

      if (demoActive) {
        const phase =
          getVisualPhase(task);

        // ========================================================
        // A — PICK & PLACE
        // ========================================================

        if (
          isPickTask(task)
        ) {
          applyVisualPose(
            sample(
              PICK_POSES,
              phase,
            ),
          );

          const part =
            refs.current.partA;

          const source =
            refs.current.sourceA;

          const target =
            refs.current.targetA;

          const tool =
            refs.current.toolTip;

          if (
            part &&
            source &&
            target &&
            tool
          ) {
            if (phase < 0.28) {
              if (
                part.parent !==
                refs.current.pickGroup
              ) {
                refs.current.pickGroup?.attach(
                  part,
                );
              }

              part.position.copy(
                source,
              );

              setGrip(0);
            } else if (
              phase < 0.39
            ) {
              setGrip(
                smooth(
                  (phase - 0.28) /
                    0.11,
                ),
              );

              if (
                refs.current.attached !==
                part
              ) {
                attachToTool(
                  part,
                  refs.current.pickGroup!,
                );
              }
            } else if (
              phase < 0.82
            ) {
              setGrip(1);

              if (
                refs.current.attached !==
                part
              ) {
                attachToTool(
                  part,
                  refs.current.pickGroup!,
                );
              }
            } else if (
              phase < 0.92
            ) {
              setGrip(
                1 -
                  smooth(
                    (phase - 0.82) /
                      0.10,
                  ),
              );
            } else {
              setGrip(0);

              if (
                part.parent === tool
              ) {
                releaseFromTool(
                  part,
                  target,
                  refs.current.pickGroup!,
                );
              }

              part.position.copy(
                target,
              );
            }
          }
        }

        // ========================================================
        // B — SORTING
        // ========================================================

        else if (
          isSortTask(task)
        ) {
          const phase =
            getVisualPhase(task);

          const red =
            refs.current.redPart;

          const blue =
            refs.current.bluePart;

          const redPickup =
            refs.current.sortPickupRed;

          const redDrop =
            refs.current.sortDropRed;

          const bluePickup =
            refs.current.sortPickupBlue;

          const blueDrop =
            refs.current.sortDropBlue;

          // ------------------------------------------------------
          // FIRST HALF — RED BLOCK
          // ------------------------------------------------------

          if (phase < 0.5) {
            const p =
              phase * 2;

            applyVisualPose(
              sample(
                SORT_RED_POSES,
                p,
              ),
            );

            if (
              red &&
              redPickup &&
              redDrop
            ) {
              if (p < 0.34) {
                if (
                  red.parent !==
                  refs.current.sortGroup
                ) {
                  refs.current.sortGroup?.attach(
                    red,
                  );
                }

                red.position.copy(
                  redPickup,
                );

                setGrip(0);
              } else if (
                p < 0.44
              ) {
                red.position.copy(
                  redPickup,
                );

                setGrip(
                  smooth(
                    (p - 0.34) /
                      0.10,
                  ),
                );
              } else if (
                p < 0.50
              ) {
                if (
                  refs.current.attached !==
                  red
                ) {
                  attachToTool(
                    red,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(1);
              } else if (
                p < 0.86
              ) {
                if (
                  refs.current.attached !==
                  red
                ) {
                  attachToTool(
                    red,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(1);
              } else if (
                p < 0.93
              ) {
                if (
                  refs.current.attached !==
                  red
                ) {
                  attachToTool(
                    red,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(
                  1 -
                    smooth(
                      (p - 0.86) /
                        0.07,
                    ),
                );
              } else {
                setGrip(0);

                if (
                  red.parent ===
                  refs.current.toolTip
                ) {
                  releaseFromTool(
                    red,
                    redDrop,
                    refs.current.sortGroup!,
                  );
                }

                red.position.copy(
                  redDrop,
                );

                red.position.y =
                  redDrop.y;
              }
            }
          }

          // ------------------------------------------------------
          // SECOND HALF — BLUE BLOCK
          // ------------------------------------------------------

          else {
            const p =
              (phase - 0.5) * 2;

            applyVisualPose(
              sample(
                SORT_BLUE_POSES,
                p,
              ),
            );

            // Red stays inside red box.
            if (
              red &&
              redDrop &&
              red.parent !==
                refs.current.toolTip
            ) {
              red.position.copy(
                redDrop,
              );
            }

            if (
              blue &&
              bluePickup &&
              blueDrop
            ) {
              if (p < 0.34) {
                if (
                  blue.parent !==
                  refs.current.sortGroup
                ) {
                  refs.current.sortGroup?.attach(
                    blue,
                  );
                }

                blue.position.copy(
                  bluePickup,
                );

                setGrip(0);
              } else if (
                p < 0.44
              ) {
                blue.position.copy(
                  bluePickup,
                );

                setGrip(
                  smooth(
                    (p - 0.34) /
                      0.10,
                  ),
                );
              } else if (
                p < 0.50
              ) {
                if (
                  refs.current.attached !==
                  blue
                ) {
                  attachToTool(
                    blue,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(1);
              } else if (
                p < 0.86
              ) {
                if (
                  refs.current.attached !==
                  blue
                ) {
                  attachToTool(
                    blue,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(1);
              } else if (
                p < 0.93
              ) {
                if (
                  refs.current.attached !==
                  blue
                ) {
                  attachToTool(
                    blue,
                    refs.current.sortGroup!,
                  );
                }

                setGrip(
                  1 -
                    smooth(
                      (p - 0.86) /
                        0.07,
                    ),
                );
              } else {
                setGrip(0);

                if (
                  blue.parent ===
                  refs.current.toolTip
                ) {
                  releaseFromTool(
                    blue,
                    blueDrop,
                    refs.current.sortGroup!,
                  );
                }

                blue.position.copy(
                  blueDrop,
                );

                blue.position.y =
                  blueDrop.y;
              }
            }
          }
        }

        // ========================================================
        // C — PALLETIZING
        // ========================================================

        else if (
          isPalletTask(task)
        ) {
          const phase =
            getVisualPhase(task);

          const parts =
            refs.current.palletParts ||
            [];

          const pickups =
            refs.current.palletPickups ||
            [];

          const drops =
            refs.current.palletDrops ||
            [];

          if (
            pickups.length === 2 &&
            drops.length === 2
          ) {
            const scaled =
              clamp01(phase) * 2;

            const index =
              Math.min(
                1,
                Math.floor(
                  Math.min(
                    1.999,
                    scaled,
                  ),
                ),
              );

            const local =
              scaled - index;

            const poses =
              PALLET_SETS[index];

            applyVisualPose(
              sample(
                poses,
                local,
              ),
            );

            // Already placed boxes remain on pallet.
            parts.forEach(
              (part, i) => {
                if (i < index) {
                  if (
                    part.parent ===
                    refs.current.toolTip
                  ) {
                    releaseFromTool(
                      part,
                      drops[i],
                      refs.current.palletGroup!,
                    );
                  } else {
                    part.position.copy(
                      drops[i],
                    );
                  }
                }
              },
            );

            const current =
              parts[index];

            const pickupTarget =
              pickups[index];

            const dropTarget =
              drops[index];

            if (
              current &&
              pickupTarget &&
              dropTarget
            ) {
              // Approach floor box.
              if (local < 0.28) {
                if (
                  refs.current.attached ===
                  current
                ) {
                  releaseFromTool(
                    current,
                    pickupTarget,
                    refs.current.palletGroup!,
                  );
                }

                current.position.copy(
                  pickupTarget,
                );

                setGrip(0);
              }

              // Grip box.
              else if (
                local < 0.37
              ) {
                if (
                  refs.current.attached !==
                  current
                ) {
                  current.position.copy(
                    pickupTarget,
                  );
                }

                setGrip(
                  smooth(
                    (local - 0.28) /
                      0.09,
                  ),
                );
              }

              // Lock box into gripper.
              else if (
                local < 0.45
              ) {
                if (
                  refs.current.attached !==
                  current
                ) {
                  attachToTool(
                    current,
                    refs.current.palletGroup!,
                  );
                }

                setGrip(1);
              }

              // High clear carry.
              else if (
                local < 0.60
              ) {
                if (
                  refs.current.attached !==
                  current
                ) {
                  attachToTool(
                    current,
                    refs.current.palletGroup!,
                  );
                }

                setGrip(1);
              }

              // Lower toward pallet.
              else if (
                local < 0.84
              ) {
                if (
                  refs.current.attached !==
                  current
                ) {
                  attachToTool(
                    current,
                    refs.current.palletGroup!,
                  );
                }

                setGrip(1);
              }

              // Open gripper.
              else if (
                local < 0.90
              ) {
                if (
                  refs.current.attached !==
                  current
                ) {
                  attachToTool(
                    current,
                    refs.current.palletGroup!,
                  );
                }

                setGrip(
                  1 -
                    smooth(
                      (local - 0.84) /
                        0.06,
                    ),
                );
              }

              // Release on pallet.
              else {
                setGrip(0);

                if (
                  current.parent ===
                  refs.current.toolTip
                ) {
                  releaseFromTool(
                    current,
                    dropTarget,
                    refs.current.palletGroup!,
                  );
                }

                current.position.copy(
                  dropTarget,
                );
              }
            }
          }
        }

        // ========================================================
        // D — WELDING
        // ========================================================

        else if (
          isWeldTask(task)
        ) {
          const phase =
            getVisualPhase(task);

          applyVisualPose(
            sample(
              WELD_POSES,
              phase,
            ),
          );

          const weldingMoment =
            phase >= 0.29 &&
            phase <= 0.82;

          updateWeldingParticles(
            weldingActive ||
              weldingMoment,
            delta,
          );

          resetGripper();
        }

        // ========================================================
        // FINISH / NEXT TASK
        // ========================================================

        if (phase >= 0.999) {
          completedTaskRef.current =
            task;

          applyVisualPose(HOME);
          setGrip(0);

          updateWeldingParticles(
            false,
            delta,
          );

          const nextQueued =
            visualQueueRef.current.shift();

          const nextTask =
            nextQueued ||
            requestedTaskRef.current;

          if (
            nextTask &&
            nextTask !== task
          ) {
            visualTaskRef.current =
              nextTask;

            taskRef.current =
              nextTask;

            startTimeRef.current =
              performance.now();

            completedTaskRef.current =
              '';

            attachStateReset();
            resetGripper();
          } else if (
            !requestedTaskRef.current &&
            visualQueueRef.current
              .length === 0
          ) {
            visualTaskRef.current =
              '';

            taskRef.current = '';

            completedTaskRef.current =
              '';
          }
        }
      } else if (
        completedTaskRef.current ===
          task &&
        hasTask
      ) {
        applyVisualPose(HOME);
        setGrip(0);

        updateWeldingParticles(
          false,
          delta,
        );
      } else if (
        !hasTask
      ) {
        // Reset the complete workcell.
        applyVisualPose(HOME);
        setGrip(0);

        updateWeldingParticles(
          false,
          delta,
        );

        if (
          refs.current.partA &&
          refs.current.sourceA
        ) {
          if (
            refs.current.partA.parent !==
            refs.current.pickGroup
          ) {
            refs.current.pickGroup?.attach(
              refs.current.partA,
            );
          }

          refs.current.partA.position.copy(
            refs.current.sourceA,
          );

          refs.current.partA.rotation.set(
            0,
            0,
            0,
          );
        }

        if (
          refs.current.redPart &&
          refs.current.sortPickupRed
        ) {
          if (
            refs.current.redPart.parent !==
            refs.current.sortGroup
          ) {
            refs.current.sortGroup?.attach(
              refs.current.redPart,
            );
          }

          refs.current.redPart.position.copy(
            refs.current.sortPickupRed,
          );

          refs.current.redPart.rotation.set(
            0,
            0,
            0,
          );
        }

        if (
          refs.current.bluePart &&
          refs.current.sortPickupBlue
        ) {
          if (
            refs.current.bluePart.parent !==
            refs.current.sortGroup
          ) {
            refs.current.sortGroup?.attach(
              refs.current.bluePart,
            );
          }

          refs.current.bluePart.position.copy(
            refs.current.sortPickupBlue,
          );

          refs.current.bluePart.rotation.set(
            0,
            0,
            0,
          );
        }

        refs.current.palletParts?.forEach(
          (part, index) => {
            const pickups =
              refs.current.palletPickups ||
              [];

            if (pickups[index]) {
              if (
                part.parent !==
                refs.current.palletGroup
              ) {
                refs.current.palletGroup?.attach(
                  part,
                );
              }

              part.position.copy(
                pickups[index],
              );

              part.rotation.set(
                0,
                0,
                0,
              );
            }
          },
        );

        attachStateReset();
      }

      renderer.render(
        scene,
        camera,
      );
    };

    animate();

    // ============================================================
    // RESIZE / CLEANUP
    // ============================================================

    const onResize = () => {
      const newWidth =
        container.clientWidth;

      const newHeight =
        container.clientHeight;

      if (!newHeight) return;

      camera.aspect =
        newWidth / newHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        newWidth,
        newHeight,
      );
    };

    window.addEventListener(
      'resize',
      onResize,
    );

    return () => {
      window.removeEventListener(
        'resize',
        onResize,
      );

      cancelAnimationFrame(
        frame,
      );

      controls.dispose();
      renderer.dispose();

      scene.traverse(
        (object) => {
          const mesh =
            object as THREE.Mesh;

          if (mesh.geometry) {
            mesh.geometry.dispose();
          }

          if (mesh.material) {
            const materials =
              Array.isArray(
                mesh.material,
              )
                ? mesh.material
                : [mesh.material];

            materials.forEach(
              (material) =>
                material.dispose(),
            );
          }
        },
      );

      if (
        container.contains(
          renderer.domElement,
        )
      ) {
        container.removeChild(
          renderer.domElement,
        );
      }
    };
  }, []);

  // Backend telemetry only controls the numeric joint display
  // when a visual task is not currently running.
  useEffect(() => {
    if (loading) return;

    const task =
      currentTaskName || '';

    const taskRunning =
      isPickTask(task) ||
      isSortTask(task) ||
      isPalletTask(task) ||
      isWeldTask(task);

    if (taskRunning) return;

    const {
      j1,
      j2,
      j3,
      j4,
      j5,
      j6,
    } = refs.current;

    if (
      !j1 ||
      !j2 ||
      !j3 ||
      !j4 ||
      !j5 ||
      !j6
    ) {
      return;
    }

    j1.rotation.y =
      THREE.MathUtils.degToRad(
        jointAngles.j1 ?? 0,
      );

    j2.rotation.z =
      THREE.MathUtils.degToRad(
        (jointAngles.j2 ?? -90) +
          90,
      );

    j3.rotation.z =
      THREE.MathUtils.degToRad(
        (jointAngles.j3 ?? 0) +
          118,
      );

    j4.rotation.z =
      THREE.MathUtils.degToRad(
        (jointAngles.j4 ?? -90) -
          30,
      );

    j5.rotation.x =
      THREE.MathUtils.degToRad(
        jointAngles.j5 ?? 0,
      );

    j6.rotation.y =
      THREE.MathUtils.degToRad(
        jointAngles.j6 ?? 0,
      );
  }, [
    jointAngles,
    currentTaskName,
    loading,
  ]);

  const resetCamera = () => {
    const camera =
      refs.current.camera;

    const controls =
      refs.current.controls;

    if (
      !camera ||
      !controls
    ) {
      return;
    }

    camera.position.set(
      0.96,
      0.66,
      1.92,
    );

    controls.target.set(
      0,
      0.47,
      0,
    );

    controls.update();
  };

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-100 rounded-lg overflow-hidden border border-slate-300 shadow-inner flex flex-col">

      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/45 backdrop-blur-sm text-white">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />

          <p className="font-semibold text-sm tracking-wide">
            INITIALIZING UR5e DIGITAL TWIN...
          </p>
        </div>
      )}

      {loadError && (
        <div className="absolute top-4 left-4 right-4 z-40 bg-red-900/90 text-white p-3 rounded text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-300" />

          <span>
            {loadError}
          </span>
        </div>
      )}

      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing"
      />

      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">

        <div className="bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded border border-slate-700 shadow-md flex items-center gap-2 text-xs">

          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />

          <span className="font-bold tracking-wider">
            UR5e 6-AXIS INDUSTRIAL ROBOT
          </span>

          <span className="text-slate-400">
            |
          </span>

          <span className="text-emerald-400 font-mono">
            DIGITAL TWIN
          </span>

        </div>

        <div className="flex items-center gap-2">

          <div
            className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5 ${
              robotStatus === 'RUNNING'
                ? 'bg-emerald-600 text-white animate-pulse'
                : robotStatus === 'FAULT'
                  ? 'bg-rose-600 text-white'
                  : robotStatus === 'PAUSED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-200'
            }`}
          >

            {robotStatus ===
              'RUNNING' && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            )}

            STATUS: {robotStatus}

          </div>

          {weldingActive && (
            <div className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded text-xs font-bold tracking-wider flex items-center gap-1.5 shadow-md">

              <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />

              WELDING ACTIVE

            </div>
          )}

        </div>

        {(visualTaskRef.current ||
          currentTaskName) && (
          <div className="bg-white/90 backdrop-blur text-slate-800 px-3 py-2 rounded border border-slate-300 shadow-sm text-xs max-w-xs">

            <div className="flex justify-between items-center mb-1">

              <span className="text-slate-500 font-semibold uppercase text-[10px]">
                Active Operation
              </span>

              <span className="font-mono font-bold text-blue-600">
                {visualProgress.toFixed(
                  0,
                )}
                %
              </span>

            </div>

            <div className="font-semibold text-slate-900 truncate mb-1.5">
              {visualTaskRef.current ||
                currentTaskName}
            </div>

            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">

              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${visualProgress}%`,
                }}
              />

            </div>

          </div>
        )}

      </div>

      <div className="absolute top-3 right-3 z-20">

        <button
          onClick={resetCamera}
          className="bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 p-2 rounded border border-slate-300 shadow-sm text-xs font-medium flex items-center gap-1 transition"
          title="Reset Camera View"
        >

          <RotateCw className="w-3.5 h-3.5" />

          <span>
            Reset Camera
          </span>

        </button>

      </div>

      <div className="absolute bottom-2 left-2 right-2 z-20 bg-slate-900/85 backdrop-blur text-slate-200 px-3 py-1.5 rounded border border-slate-700/80 text-[11px] font-mono flex items-center justify-between flex-wrap gap-2 pointer-events-none">

        <span className="text-slate-400 font-sans font-medium text-[10px] tracking-wider uppercase">
          Joint Angles:
        </span>

        <span>
          J1:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j1 ??
              0
            ).toFixed(1)}
            °
          </b>
        </span>

        <span>
          J2:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j2 ??
              -90
            ).toFixed(1)}
            °
          </b>
        </span>

        <span>
          J3:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j3 ??
              0
            ).toFixed(1)}
            °
          </b>
        </span>

        <span>
          J4:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j4 ??
              -90
            ).toFixed(1)}
            °
          </b>
        </span>

        <span>
          J5:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j5 ??
              0
            ).toFixed(1)}
            °
          </b>
        </span>

        <span>
          J6:{' '}
          <b className="text-blue-400">
            {(
              jointAngles.j6 ??
              0
            ).toFixed(1)}
            °
          </b>
        </span>

      </div>

    </div>
  );
};