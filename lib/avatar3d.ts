/**
 * 3D avatar driver — poses a rigged (Mixamo-named) GLB character from
 * MediaPipe Pose landmarks, so the teacher's real movement animates a
 * generated 3D character.
 *
 * Approach: for each limb we know the bone's rest direction and the
 * direction implied by the captured landmarks; we rotate the bone by the
 * quaternion between them. This is deliberately simple — no IK solver —
 * which keeps it fast and stable enough for a live classroom puppet.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Point } from "./characterEngine";

const B = {
  hips: "mixamorig:Hips",
  spine: "mixamorig:Spine",
  neck: "mixamorig:Neck",
  head: "mixamorig:Head",
  lArm: "mixamorig:LeftArm",
  lForeArm: "mixamorig:LeftForeArm",
  rArm: "mixamorig:RightArm",
  rForeArm: "mixamorig:RightForeArm",
  lUpLeg: "mixamorig:LeftUpLeg",
  lLeg: "mixamorig:LeftLeg",
  rUpLeg: "mixamorig:RightUpLeg",
  rLeg: "mixamorig:RightLeg",
} as const;

// MediaPipe landmark indices
const LM = {
  nose: 0,
  lShoulder: 11, rShoulder: 12,
  lElbow: 13, rElbow: 14,
  lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24,
  lKnee: 25, rKnee: 26,
  lAnkle: 27, rAnkle: 28,
};

/**
 * Each driven bone: which landmarks define its direction, and the
 * direction the bone points in its rest pose (Mixamo arms point down the
 * limb, legs point down).
 */
const CHAIN: {
  bone: string;
  from: number;
  to: number;
  rest: THREE.Vector3;
}[] = [
  { bone: B.lArm, from: LM.lShoulder, to: LM.lElbow, rest: new THREE.Vector3(1, 0, 0) },
  { bone: B.lForeArm, from: LM.lElbow, to: LM.lWrist, rest: new THREE.Vector3(1, 0, 0) },
  { bone: B.rArm, from: LM.rShoulder, to: LM.rElbow, rest: new THREE.Vector3(-1, 0, 0) },
  { bone: B.rForeArm, from: LM.rElbow, to: LM.rWrist, rest: new THREE.Vector3(-1, 0, 0) },
  { bone: B.lUpLeg, from: LM.lHip, to: LM.lKnee, rest: new THREE.Vector3(0, -1, 0) },
  { bone: B.lLeg, from: LM.lKnee, to: LM.lAnkle, rest: new THREE.Vector3(0, -1, 0) },
  { bone: B.rUpLeg, from: LM.rHip, to: LM.rKnee, rest: new THREE.Vector3(0, -1, 0) },
  { bone: B.rLeg, from: LM.rKnee, to: LM.rAnkle, rest: new THREE.Vector3(0, -1, 0) },
];

export type Avatar3D = {
  /** Drive the character from one frame of pose landmarks. */
  update(pose: Point[] | null | undefined): void;
  /** Render one frame. */
  render(): void;
  resize(width: number, height: number): void;
  dispose(): void;
  ready: boolean;
};

/** Landmark → world-ish vector. MediaPipe y grows downward; flip it. */
function vec(pose: Point[], i: number): THREE.Vector3 | null {
  const p = pose[i];
  if (!p) return null;
  return new THREE.Vector3(-(p.x - 0.5), -(p.y - 0.5), 0);
}

export async function createAvatar3D(
  canvas: HTMLCanvasElement,
  modelUrl: string
): Promise<Avatar3D> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.95, 2.6);
  camera.lookAt(0, 0.85, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(2, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88bbff, 1.1);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const gltf = await new GLTFLoader().loadAsync(modelUrl);
  const root = gltf.scene;
  root.position.set(0, 0, 0);
  scene.add(root);

  // Collect the bones we drive, remembering their rest rotations
  const bones = new Map<string, THREE.Bone>();
  const restRot = new Map<string, THREE.Quaternion>();
  root.traverse((o) => {
    const b = o as THREE.Bone;
    if (b.isBone) {
      bones.set(b.name, b);
      restRot.set(b.name, b.quaternion.clone());
    }
  });

  const smoothing = new Map<string, THREE.Quaternion>();
  const tmpQuat = new THREE.Quaternion();

  function update(pose: Point[] | null | undefined) {
    if (!pose) return;

    for (const link of CHAIN) {
      const bone = bones.get(link.bone);
      const rest = restRot.get(link.bone);
      if (!bone || !rest) continue;
      const a = vec(pose, link.from);
      const b = vec(pose, link.to);
      if (!a || !b) continue;

      const dir = b.clone().sub(a);
      if (dir.lengthSq() < 1e-6) continue;
      dir.normalize();

      // Rotation taking the bone's rest direction onto the observed one,
      // expressed in the parent's space via the rest orientation.
      tmpQuat.setFromUnitVectors(link.rest, dir);
      const target = rest.clone().premultiply(tmpQuat);

      // Smooth so tracking jitter doesn't make the character twitch
      const prev = smoothing.get(link.bone) ?? bone.quaternion.clone();
      prev.slerp(target, 0.35);
      smoothing.set(link.bone, prev);
      bone.quaternion.copy(prev);
    }

    // Lean the torso with the shoulders, and turn the head toward the nose
    const ls = vec(pose, LM.lShoulder);
    const rs = vec(pose, LM.rShoulder);
    const spine = bones.get(B.spine);
    if (ls && rs && spine) {
      const restSpine = restRot.get(B.spine)!;
      const tilt = Math.atan2(rs.y - ls.y, rs.x - ls.x);
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        THREE.MathUtils.clamp(tilt, -0.5, 0.5)
      );
      spine.quaternion.copy(restSpine).premultiply(q);
    }

    const nose = vec(pose, LM.nose);
    const head = bones.get(B.head);
    if (nose && ls && rs && head) {
      const restHead = restRot.get(B.head)!;
      const mid = ls.clone().add(rs).multiplyScalar(0.5);
      const yaw = THREE.MathUtils.clamp((nose.x - mid.x) * 2.2, -0.6, 0.6);
      const pitch = THREE.MathUtils.clamp((nose.y - mid.y - 0.16) * 1.6, -0.4, 0.4);
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitch, yaw, 0, "XYZ")
      );
      head.quaternion.copy(restHead).premultiply(q);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize(width: number, height: number) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }

  return { update, render, resize, dispose, ready: true };
}
