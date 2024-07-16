import "./style.css";

import * as THREE from "three";
import {
  EffectComposer,
  GLTFLoader,
  OrbitControls,
  RGBELoader,
  ShaderPass,
  SMAAPass,
  EXRLoader,
} from "three/examples/jsm/Addons.js";
import { degToRad } from "three/src/math/MathUtils.js";
import { makeDiamond } from "./diamond.js";
import { EffectShader } from "./EffectShader.js";

async function startShaderDemo() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / 2 / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 9;
  camera.position.y = 4;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth / 2, window.innerHeight);
  document.querySelector("#shader").appendChild(renderer.domElement);

  // Load the environment map
  // const pmremGenerator = new THREE.PMREMGenerator(renderer);
  // const rgbeLoader = new RGBELoader();

  // const envTexture = await rgbeLoader.loadAsync("/env.hdr");
  // const envMap = pmremGenerator.fromEquirectangular(envTexture);
  // console.log(envMap);
  // scene.environment = envMap.texture;
  // scene.background = new THREE.Color("#212121");

  // envTexture.dispose();
  // pmremGenerator.dispose();

  const environment = await new THREE.CubeTextureLoader().loadAsync([
    "skybox/Box_Right.png",
    "skybox/Box_Left.png",
    "skybox/Box_Top.png",
    "skybox/Box_Bottom.png",
    "skybox/Box_Front.png",
    "skybox/Box_Back.png",
  ]);
  environment.encoding = THREE.sRGBEncoding;
  scene.background = new THREE.Color("#606060");

  createLighting(scene);

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
  scene.add(cubeCamera);
  cubeCamera.position.set(0, 5, 0);
  cubeCamera.update(renderer, scene);

  const loader = new GLTFLoader();
  const diamondGeometry = (await loader.loadAsync("./rubin.glb")).scene
    .children[0].geometry;
  diamondGeometry.translate(0, 5, 0);

  const diamond = makeDiamond(diamondGeometry, scene, camera, {
    environment,
    color: new THREE.Color(1, 1, 1),
  });
  diamond.rotation.x = degToRad(22);
  scene.add(diamond);

  // const cube = new THREE.Mesh(
  //   new THREE.BoxGeometry(1, 1, 1),
  //   new THREE.MeshStandardMaterial({ color: "red" })
  // );
  // cube.position.z = -1;
  // scene.add(cube);

  const defaultTexture = new THREE.WebGLRenderTarget(
    window.innerWidth / 2,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
    }
  );
  defaultTexture.depthTexture = new THREE.DepthTexture(
    window.innerWidth / 2,
    window.innerHeight,
    THREE.FloatType
  );
  // Post Effects
  const composer = new EffectComposer(renderer);
  const smaaPass = new SMAAPass(window.innerWidth / 2, window.innerHeight);
  const effectPass = new ShaderPass(EffectShader);
  composer.addPass(effectPass);
  // composer.addPass(new ShaderPass(GammaCorrectionShader));
  composer.addPass(smaaPass);
  // const effectController = {
  //   bounces: 3.0,
  //   ior: 2.4,
  //   correctMips: true,
  //   chromaticAberration: true,
  //   aberrationStrength: 0.01,
  // };

  const clock = new THREE.Clock();
  function animate() {
    diamond.rotation.y += 1 * clock.getDelta();
    renderer.setRenderTarget(defaultTexture);

    renderer.render(scene, camera);
    effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
    composer.render();
  }
  renderer.setAnimationLoop(animate);
}

async function startSimpleMaterialDemo() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / 2 / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 9;
  camera.position.y = 4;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth / 2, window.innerHeight);
  document.querySelector("#material").appendChild(renderer.domElement);

  // Load the environment map
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const rgbeLoader = new RGBELoader();

  const envTexture = await rgbeLoader.loadAsync("/env2.hdr");
  const envMap = pmremGenerator.fromEquirectangular(envTexture);
  scene.environment = envMap.texture;
  scene.background = new THREE.Color("#303030");

  envTexture.dispose();
  pmremGenerator.dispose();

  createLighting(scene);

  const loader = new GLTFLoader();
  const diamondGeometry = (await loader.loadAsync("./rubin.glb")).scene
    .children[0].geometry;
  diamondGeometry.translate(0, 5, 0);

  const diamond = new THREE.Mesh(
    diamondGeometry,
    new THREE.MeshPhysicalMaterial({
      transparent: true,
      ior: 2.4,
      transmission: 0.1,
      color: 0x221367,
      thickness: 0.02,
      opacity: 0.9,
      roughness: 0,
      // envMap,
    })
  );
  diamond.rotation.x = degToRad(22);
  scene.add(diamond);

  const clock = new THREE.Clock();
  function animate() {
    diamond.rotation.y += 1 * clock.getDelta();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);
}

startShaderDemo();
startSimpleMaterialDemo();

function createLighting(scene) {
  const areaLight1 = new THREE.SpotLight("#fff", 1000);
  // Blender - zxy - перенести потом последнюю координату вперед просто
  areaLight1.position.set(9.2, -4.7, 0.097);
  areaLight1.rotation.set(degToRad(10.2), degToRad(-4.36), degToRad(-392));

  const areaLight2 = new THREE.SpotLight("#fff", 1300);
  areaLight2.position.set(-4.45, 0.8, -12.34);
  areaLight2.rotation.set(
    degToRad(-197.3),
    degToRad(-315.75),
    degToRad(-290.11)
  );

  const areaLight3 = new THREE.SpotLight("#fff", 1000);
  areaLight3.position.set(4.15, 10.94, -2.02);
  areaLight3.rotation.set(degToRad(-85.28), degToRad(-71.6), degToRad(-299.3));

  const areaLight4 = new THREE.SpotLight("#fff", 1000);
  areaLight4.position.set(9.8, -4.75, -0.94);
  areaLight4.rotation.set(degToRad(14.3), degToRad(-6.8), degToRad(-393.3));

  const areaLight5 = new THREE.SpotLight("#fff", 1300);
  areaLight5.position.set(-1.23, 0.82, -19.96);
  areaLight5.rotation.set(
    degToRad(-197.53),
    degToRad(-315.24),
    degToRad(-290.29)
  );

  const areaLight6 = new THREE.SpotLight("#fff", 1000);
  areaLight6.position.set(9.8, -3.1, -1.25);
  areaLight6.rotation.set(degToRad(25.324), degToRad(-6.8), degToRad(-393.34));

  const areaLight7 = new THREE.SpotLight("#fff", 1000);
  areaLight7.position.set(9.7, -3.36, -0.63);
  areaLight7.rotation.set(degToRad(29.553), degToRad(-6.8), degToRad(-393.34));

  const pointLight1 = new THREE.PointLight("#fff", 1000);
  pointLight1.position.set(1.78, -0.326, -2.558);
  // pointLight1.add(
  //   new THREE.Mesh(
  //     new THREE.SphereGeometry(0.1),
  //     new THREE.MeshBasicMaterial({ color: 0xff0040 })
  //   )
  // );
  // pointLight1.position.set(0, 0, 0);

  const pointLight2 = new THREE.PointLight("#F5CCFF", 0);
  pointLight2.position.set(2.98, 0.576, -2.43);

  scene.add(areaLight1);
  scene.add(areaLight2);
  scene.add(areaLight3);
  scene.add(areaLight4);
  scene.add(areaLight5);
  scene.add(areaLight6);
  scene.add(areaLight7);
  scene.add(pointLight1);
  scene.add(pointLight2);
}
