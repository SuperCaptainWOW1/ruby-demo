import "./style.css";

import * as THREE from "three";
import * as dat from "dat.gui";

import {
  EffectComposer,
  GLTFLoader,
  OrbitControls,
  ShaderPass,
  SMAAPass,
  OutputPass,
} from "three/examples/jsm/Addons.js";
import { degToRad } from "three/src/math/MathUtils.js";
import { makeDiamond } from "./diamond.js";
import { EffectShader } from "./EffectShader.js";

const container = document.querySelector("#app");
const count = 100;

async function startApp() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 9;
  camera.position.y = 1.5;
  camera.position.x = 2;

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const environment = await new THREE.CubeTextureLoader().loadAsync([
    "skybox/Box_Right.png",
    "skybox/Box_Left.png",
    "skybox/Box_Top.png",
    "skybox/Box_Bottom.png",
    "skybox/Box_Front.png",
    "skybox/Box_Back.png",
  ]);
  environment.encoding = THREE.sRGBEncoding;

  createLighting(scene);
  const particles = await createStarAnimation(scene, camera);

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
  scene.add(cubeCamera);
  cubeCamera.update(renderer, scene);

  // Load the modal
  const loader = new GLTFLoader();

  const loadedResult = await loader.loadAsync("./rubin.glb");
  const model = loadedResult.scene.children[0];

  model.traverse((obj) => {
    obj.position.set(0, 0, 0);
  });

  scene.add(model);

  // Create the diamond material
  const diamond = makeDiamond(model.geometry, scene, camera, {
    environment,
    color: new THREE.Color(1.3, 1.3, 1.3),
  });
  diamond.material.side = THREE.DoubleSide;

  model.geometry = diamond.geometry;
  model.material = diamond.material;

  const reflectiveWrapper = diamond.clone();
  reflectiveWrapper.material = new THREE.MeshPhysicalMaterial({
    transparent: true,
    transmission: 0.85,
    color: "#1e0f26",
    opacity: 0.03,
    roughness: 0.25,
  });
  reflectiveWrapper.position.set(0, 0, 0);
  reflectiveWrapper.scale.set(1.01, 1.01, 1.01);

  model.add(reflectiveWrapper);

  // const gui = new dat.GUI({ name: "My GUI" });

  // const params = {
  //   color: "#1e0f26",
  //   opacity: 0.03,
  //   roughness: 0.25,
  // };

  // gui
  //   .addColor(params, "color")
  //   .listen()
  //   .onChange((value) => {
  //     reflectiveWrapper.material.color.setHex(value.replace("#", "0x"));
  //   });
  // gui
  //   .add(params, "opacity")
  //   .min(0)
  //   .max(1)
  //   .listen()
  //   .onChange((value) => (reflectiveWrapper.material.opacity = value));
  // gui
  //   .add(params, "roughness")
  //   .min(0)
  //   .max(1)
  //   .listen()
  //   .onChange((value) => (reflectiveWrapper.material.roughness = value));

  // Find and play animations
  const animationMixer = new THREE.AnimationMixer(model);
  const clips = loadedResult.animations;

  clips.forEach((clip) => {
    const action = animationMixer.clipAction(clip, model);
    // action.play();
  });

  const defaultTexture = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
    }
  );
  defaultTexture.depthTexture = new THREE.DepthTexture(
    window.innerWidth,
    window.innerHeight,
    THREE.FloatType
  );

  // Post Effects
  const composer = new EffectComposer(renderer);
  const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
  const effectPass = new ShaderPass(EffectShader);
  composer.addPass(effectPass);
  composer.addPass(smaaPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const clock = new THREE.Clock();

  const controls = new OrbitControls(camera, renderer.domElement);

  let previousElapsedTime = clock.getElapsedTime();

  const inititalPositions = [...particles.geometry.attributes.position.array];

  function animate() {
    controls.update();
    animationMixer.update(clock.getDelta());
    // renderer.setRenderTarget(defaultTexture);

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousElapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // const x = particles.geometry.attributes.position.array[i3];
      // particles.geometry.attributes.position.array[i3] += Math.sin(
      //   x + elapsedTime
      // );
      // particles.geometry.attributes.position.array[i3 + 1] += 0.2 * deltaTime;

      if (
        particles.geometry.attributes.position.array[i3] > 0 &&
        particles.geometry.attributes.position.array[i3] <= 2.5
      ) {
        particles.geometry.attributes.alpha.array[i] =
          particles.geometry.attributes.position.array[i3] / 2.5;
      } else if (particles.geometry.attributes.position.array[i3] > 2.5) {
        particles.geometry.attributes.alpha.array[i] = 1;
      }

      if (
        particles.geometry.attributes.position.array[i3] > 2.5 &&
        particles.geometry.attributes.position.array[i3] <= 5
      ) {
        particles.geometry.attributes.alpha.array[i] =
          2.5 / particles.geometry.attributes.position.array[i3];
      }

      if (particles.geometry.attributes.position.array[i3] > 5) {
        particles.geometry.attributes.position.array[i3] =
          inititalPositions[i3];
        particles.geometry.attributes.position.array[i3 + 1] =
          inititalPositions[i3 + 1];
        particles.geometry.attributes.position.array[i3] =
          inititalPositions[i3];
        particles.geometry.attributes.position.array[i3 + 2] =
          inititalPositions[i3 + 2];
      } else {
        particles.geometry.attributes.position.array[i3] += deltaTime * 1;
        particles.geometry.attributes.position.array[i3 + 1] += deltaTime * 0.3;
      }

      // dynamically change alphas
      // particles.geometry.attributes.alpha.array[i] *= 0.99;

      // if (particles.geometry.attributes.alpha.array[i] < 0.01) {
      //   particles.geometry.attributes.alpha.array[i] = 1.0;
      // }
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.alpha.needsUpdate = true;

    renderer.render(scene, camera);

    previousElapsedTime = elapsedTime;
    // effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
    // composer.render();
  }
  renderer.setAnimationLoop(animate);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
startApp();

async function createStarAnimation(scene, camera) {
  const particleGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count * 1); // 1 values per vertex

  for (let i = 0; i < count * 3; i++) {
    const i3 = i * 3;

    positions[i3] = Math.random() * 2.5; // x
    positions[i3 + 1] = Math.random() * 1.5; // y
    positions[i3 + 2] = Math.random() * 0.2; // z

    alphas[i] = 1;
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  particleGeometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

  const starTexture = await new THREE.TextureLoader().loadAsync(
    "/stars_separate/star_05.svg"
  );

  const particleMaterial = new THREE.ShaderMaterial({
    // size: 0.2,
    // sizeAttenuation: true,
    map: starTexture,
    // transparent: true,
    // opacity,
    // alphaTest: 0.001,
    // depthTest: false,

    // uniforms:       uniforms,
    vertexShader: `
    attribute float alpha;

    varying float vAlpha;

    void main() {

        vAlpha = alpha;

        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

        gl_PointSize = 8.0;

        gl_Position = projectionMatrix * mvPosition;

    }`,
    fragmentShader: ` uniform vec3 color;

    varying float vAlpha;

    void main() {

        gl_FragColor = vec4( color, vAlpha );

    }`,
    transparent: true,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.lookAt(camera.position);
  scene.add(particles);

  return particles;
}

function createLighting(scene) {
  const areaLight1 = new THREE.RectAreaLight("#fff", 120);
  areaLight1.position.set(0.097, 9.2, -4.7);
  areaLight1.rotation.set(degToRad(-392), degToRad(10.2), degToRad(-4.36));

  const areaLight2 = new THREE.RectAreaLight("#fff", 1300);
  areaLight2.position.set(-12.34, -4.45, 0.8);
  areaLight2.rotation.set(
    degToRad(-290.11),
    degToRad(-197.3),
    degToRad(-315.75)
  );

  const areaLight3 = new THREE.RectAreaLight("#fff", 120);
  areaLight3.position.set(-2.02, 4.15, 10.94);
  areaLight3.rotation.set(degToRad(-299.3), degToRad(-85.28), degToRad(-71.6));

  const areaLight4 = new THREE.RectAreaLight("#fff", 120);
  areaLight4.position.set(-0.94, 9.8, -4.75);
  areaLight4.rotation.set(degToRad(-393.3), degToRad(14.3), degToRad(-6.8));

  const areaLight5 = new THREE.RectAreaLight("#fff", 1300);
  areaLight5.position.set(-19.96, -1.23, 0.82);
  areaLight5.rotation.set(
    degToRad(-290.29),
    degToRad(-197.53),
    degToRad(-315.24)
  );

  const areaLight6 = new THREE.RectAreaLight("#fff", 120);
  areaLight6.position.set(-1.25, 9.8, -3.1);
  areaLight6.rotation.set(degToRad(-393.34), degToRad(25.324), degToRad(-6.8));

  const areaLight7 = new THREE.RectAreaLight("#fff", 20);
  areaLight7.position.set(-0.63, 9.7, -3.36);
  areaLight7.rotation.set(degToRad(-393.34), degToRad(29.553), degToRad(-6.8));

  const spotLight1 = new THREE.DirectionalLight("#fff", 10);
  spotLight1.position.set(1.5, -10.366, -0.3);
  spotLight1.rotation.set(degToRad(-5.41), degToRad(1.667), degToRad(148.37));

  const pointLight1 = new THREE.PointLight("#fff", 1000);
  pointLight1.position.set(-5.5, 0.7, -1);

  const pointLight2 = new THREE.PointLight("#F5CCFF", 100);
  pointLight2.position.set(4.5, 1, -4);

  const pointLight3 = new THREE.SpotLight("#fff", 200);
  pointLight3.position.set(0, -4.5, -0.89);

  const pointLight4 = new THREE.DirectionalLight("#F5CCFF", 10);
  pointLight4.position.set(0, -5, 0);
  pointLight4.lookAt(0, 0, 0);

  const pointLight5 = new THREE.PointLight("#ffffff", 800);
  pointLight5.position.set(3, 2, 0.5);

  const directionalLight1 = new THREE.PointLight("#ffffff", 1000);
  directionalLight1.lookAt(0, -3, 0);
  directionalLight1.position.set(0, -4, 0);

  scene.add(areaLight1);
  scene.add(areaLight2);
  scene.add(areaLight3);
  scene.add(areaLight4);
  scene.add(areaLight5);
  // scene.add(areaLight6);
  scene.add(areaLight7);
  scene.add(spotLight1);
  scene.add(pointLight1);
  scene.add(pointLight2);
  scene.add(pointLight3);
  scene.add(pointLight4);
  scene.add(pointLight5);
  // scene.add(directionalLight1);
}
