import "./style.css";

import * as THREE from "three";
import * as dat from "dat.gui";

import {
  EffectComposer,
  GLTFLoader,
  OrbitControls,
  RGBELoader,
  ShaderPass,
  SMAAPass,
  EXRLoader,
  OutputPass,
} from "three/examples/jsm/Addons.js";
import { degToRad } from "three/src/math/MathUtils.js";
import { makeDiamond } from "./diamond.js";
import { EffectShader } from "./EffectShader.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

async function startShaderDemo() {
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
  document.querySelector("#shader").appendChild(renderer.domElement);

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

  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
  scene.add(cubeCamera);
  cubeCamera.position.set(0, 5, 0);
  cubeCamera.update(renderer, scene);

  const loader = new GLTFLoader();

  const loadedResult = await loader.loadAsync("./rubin.glb");
  const diamond = loadedResult.scene;

  const animationMixer = new THREE.AnimationMixer(diamond);
  const clips = loadedResult.animations;

  diamond.traverse((obj) => {
    obj.position.set(0, 0, 0);
    // if (obj instanceof THREE.Mesh && obj.name.includes("Plane")) {
    //   obj.material = new THREE.MeshPhysicalMaterial({
    //     transparent: true,
    //     ior: 3,
    //     transmission: 0.1,
    //     color: "#0e0928",
    //     opacity: 0.8,
    //     roughness: 0.1,
    //     envMap: environment,
    //   });
    // } else
    if (obj instanceof THREE.Mesh && obj.name.includes("Stroke")) {
      const diamondStroke = makeDiamond(obj.geometry, scene, camera, {
        environment,
        color: new THREE.Color(1.3, 1.3, 1.3),
      });
      diamondStroke.material.side = THREE.DoubleSide;

      obj.geometry = diamondStroke.geometry;
      obj.material = diamondStroke.material;

      const reflectiveStroke = diamondStroke.clone();
      reflectiveStroke.material = new THREE.MeshPhysicalMaterial({
        transparent: true,
        // ior: 2.4,
        transmission: 0.85,
        color: "#1e0f26",
        opacity: 0.1,
        roughness: 0.5,
        // envMap: environment,
        // side: THREE.DoubleSide,
      });
      reflectiveStroke.position.set(0, 0, 0);
      reflectiveStroke.scale.set(1.01, 1.01, 1.01);

      const gui = new dat.GUI({ name: "My GUI" });

      const params = {
        color: "#1e0f26",
        opacity: 0.1,
        roughness: 0.5,
      };

      gui
        .addColor(params, "color")
        .listen()
        .onChange((value) => {
          reflectiveStroke.material.color.setHex(value.replace("#", "0x"));
        });
      gui
        .add(params, "opacity")
        .min(0)
        .max(1)
        .listen()
        .onChange((value) => (reflectiveStroke.material.opacity = value));
      gui
        .add(params, "roughness")
        .min(0)
        .max(1)
        .listen()
        .onChange((value) => (reflectiveStroke.material.roughness = value));

      obj.add(reflectiveStroke);

      async function changeEnvMap({
        right = "skybox/Box_Right.png",
        left = "skybox/Box_Left.png",
        top = "skybox/Box_Top.png",
        bottom = "skybox/Box_Bottom.png",
        front = "skybox/Box_Front.png",
        back = "skybox/Box_Back.png",
      }) {
        console.log(right);
        diamondStroke.material.uniforms.envMap.value =
          await new THREE.CubeTextureLoader().loadAsync([
            right,
            left,
            top,
            bottom,
            front,
            back,
          ]);
        diamondStroke.material.needsUpdate = true;
      }

      document
        .querySelector("input.env-right")
        .addEventListener("change", (e) => {
          changeEnvMap({ right: URL.createObjectURL(e.target.files[0]) });
        });
      document
        .querySelector("input.env-left")
        .addEventListener("change", (e) => {
          changeEnvMap({ left: URL.createObjectURL(e.target.files[0]) });
        });
      document
        .querySelector("input.env-top")
        .addEventListener("change", (e) => {
          changeEnvMap({ top: URL.createObjectURL(e.target.files[0]) });
        });
      document
        .querySelector("input.env-bottom")
        .addEventListener("change", (e) => {
          changeEnvMap({ bottom: URL.createObjectURL(e.target.files[0]) });
        });
      document
        .querySelector("input.env-front")
        .addEventListener("change", (e) => {
          changeEnvMap({ front: URL.createObjectURL(e.target.files[0]) });
        });
      document
        .querySelector("input.env-back")
        .addEventListener("change", (e) => {
          changeEnvMap({ back: URL.createObjectURL(e.target.files[0]) });
        });
    }
  });

  // diamond.rotation.x = degToRad(18);
  diamond.position.set(0, 0, 0);
  scene.add(diamond);
  camera.lookAt(diamond.position);

  clips.forEach((clip) => {
    const action = animationMixer.clipAction(clip, diamond);
    action.play();
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
  // composer.addPass(new ShaderPass(GammaCorrectionShader));
  composer.addPass(smaaPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // const effectController = {
  //   bounces: 3.0,
  //   ior: 2.4,
  //   correctMips: true,
  //   chromaticAberration: true,
  //   aberrationStrength: 0.01,
  // };

  const clock = new THREE.Clock();

  const controls = new OrbitControls(camera, renderer.domElement);

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  function animate() {
    stats.begin();
    controls.update();
    // diamond.rotation.y += 1 * clock.getDelta();
    animationMixer.update(clock.getDelta());
    // renderer.setRenderTarget(defaultTexture);

    renderer.render(scene, camera);
    // effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
    // composer.render();
    stats.end();
  }
  renderer.setAnimationLoop(animate);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
startShaderDemo();

function createLighting(scene) {
  const areaLight1 = new THREE.RectAreaLight("#fff", 120);
  // Blender - zxy - перенести потом последнюю координату вперед просто
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
  // pointLight1.add(
  //   new THREE.Mesh(
  //     new THREE.SphereGeometry(0.1),
  //     new THREE.MeshBasicMaterial({ color: 0xff0040 })
  //   )
  // );

  const pointLight2 = new THREE.PointLight("#F5CCFF", 100);
  pointLight2.position.set(4.5, 1, -4);
  // pointLight2.add(
  //   new THREE.Mesh(
  //     new THREE.SphereGeometry(0.1),
  //     new THREE.MeshBasicMaterial({ color: "blue" })
  //   )
  // );

  const pointLight3 = new THREE.SpotLight("#fff", 200);
  // const helper = new THREE.SpotLightHelper(pointLight3);
  // scene.add(helper);
  pointLight3.position.set(0, -4.5, -0.89);
  // pointLight3.lookAt(0, 0, 0);
  // // pointLight3.add(
  // //   new THREE.Mesh(
  // //     new THREE.SphereGeometry(0.1),
  // //     new THREE.MeshBasicMaterial({ color: "lightgreen" })
  // //   )
  // // );

  const pointLight4 = new THREE.DirectionalLight("#F5CCFF", 10);
  pointLight4.position.set(0, -5, 0);
  pointLight4.lookAt(0, 0, 0);
  // pointLight4.add(
  //   new THREE.Mesh(
  //     new THREE.SphereGeometry(0.1),
  //     new THREE.MeshBasicMaterial({ color: "yellow" })
  //   )
  // );

  const pointLight5 = new THREE.PointLight("#ffffff", 800);
  pointLight5.position.set(3, 2, 0.5);
  // pointLight5.lookAt(0, 0, 0);
  // pointLight5.add(
  //   new THREE.Mesh(
  //     new THREE.SphereGeometry(0.1),
  //     new THREE.MeshBasicMaterial({ color: "yellow" })
  //   )
  // )

  const directionalLight1 = new THREE.PointLight("#ffffff", 1000);
  directionalLight1.lookAt(0, -3, 0);
  directionalLight1.position.set(0, -4, 0);

  // pointLight5.lookAt(0, 0, 0);
  // const helper = new THREE.Mesh(
  //   new THREE.SphereGeometry(0.1),
  //   new THREE.MeshBasicMaterial({ color: "yellow" })
  // );
  // helper.position.y = -3;
  // scene.add(helper);

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
