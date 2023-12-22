import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { SubsurfaceScatteringShader } from 'three/examples/jsm/shaders/SubsurfaceScatteringShader';
import {
  RepeatWrapping,
  ShaderMaterial,
  TextureLoader,
  UniformsUtils,
  Vector3,
  DoubleSide,
} from 'three';

//@ts-ignore
import GLTFMeshGpuInstancingExtension from 'three-gltf-extensions/loaders/EXT_mesh_gpu_instancing/EXT_mesh_gpu_instancing.js';
//@ts-ignore
import GLTFMaterialsVariantsExtension from 'three-gltf-extensions/loaders/KHR_materials_variants/KHR_materials_variants.js';

const progressContainer = document.querySelector('.spinner-container') as HTMLElement;
const specificObjectToggleCheckbox = document.getElementById('specificObjectToggle') as HTMLInputElement;
let specificObject: THREE.Object3D | undefined;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set 3D scene's background color to white
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Anti Aliasing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Replace the FXAA pass with SMAA pass
const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
composer.addPass(smaaPass);

// SSAO pass
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.01;
ssaoPass.maxDistance = 0.05;
composer.addPass(ssaoPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);

dracoLoader.setDecoderPath('/draco/');

loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);

loader.register((parser) => new GLTFMaterialsVariantsExtension(parser));
loader.register((parser) => new GLTFMeshGpuInstancingExtension(parser));

// console.log(ktx2Loader,dracoLoader,loader)

const dayNightToggle = document.getElementById('dayNightToggle');
let isDayMode = false; // Initial mode is day
let scaleFactor = 0.5;

// Function to add HDRI
function setupHDRI() {
  const rgbeloader = new RGBELoader();
  rgbeloader.load('hdri/gem_2.hdr', (hdri) => {
    const myhdr = hdri;
    myhdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = myhdr;
    scene.background = new THREE.Color("#000");
  });
}

setupHDRI();

const modelPaths = [
  'models/Floor.glb',
  'models/Wall.glb',
  'models/Small_Carpet.glb',
  'models/Coffee_Table.glb',
  'models/Frame.glb',
  'models/Plant.glb',
  'models/Window.glb',
  'models/Floor_Lamp.glb',
  'models/Accessories.glb',
  'models/Carpet.glb',
  'models/Sofa.glb',
];

//Changing Material variants
const loadedModelsMap: any = {}
const buttonArr = document.querySelectorAll('.button')

Array.from(buttonArr).forEach(button => {
  button.addEventListener('click', async (e: any) => {
    const target = e.target!;
    const selectedModel = target.dataset.model;
    const variantName = target.dataset.variant!;

    // console.log(loadedModelsMap);
    // console.log(variantName);

    if (selectedModel && loadedModelsMap[selectedModel]) {
      const modelData = loadedModelsMap[selectedModel];

      if (modelData.functions && modelData.functions.selectVariant) {
        try {
          await modelData.functions.selectVariant(
            modelData.scene,
            variantName
          );
          console.log(`Selected variant "${variantName}" for model "${selectedModel}"`);
        } catch (error) {
          console.error(`Error selecting variant: ${error}`);
        }
      } else {
        console.error(`Select variant function not found for model "${selectedModel}"`);
      }
    } else {
      console.error(`Model data not found for "${selectedModel}"`);
    }
  });
});

// Function to load models one by one
function loadModels(index: number) {
  // console.log('started loading')
  if (index >= modelPaths.length) {
    // All models loaded
    console.log('All models loaded successfully.');
    progressContainer.style.display = 'none';

    // After loading is complete, set the desired pixel ratio
    const finalPixelRatio = window.devicePixelRatio * scaleFactor;
    renderer.setPixelRatio(finalPixelRatio);
    composer.setSize(window.innerWidth * 0.75, window.innerHeight);

    // addDirectionalLight();
    return;
  }

  // While loading, set a different pixel ratio
  renderer.setPixelRatio(0.25);
  composer.setSize(window.innerWidth * 0.75, window.innerHeight);

  const modelPath = modelPaths[index];
  // console.log(modelPath)
  loader.load(modelPath,
    function (gltf) {
      // console.log(modelPath)
      // console.log(gltf, index)
      const modelName = modelPath.split('/')[1].split('.')[0]
      // console.log(modelPath)
      loadedModelsMap[modelName] = gltf

      if (modelName === 'Carpet') {
        specificObject = gltf.scene; // Store the specific object
      }

      gltf.scene.traverse(function (child) {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.receiveShadow = true;
          m.castShadow = true;
        }

        if ((child as THREE.Light).isLight) {
          let l = child as THREE.PointLight;
          l.castShadow = true;
          // l.intensity = 10; // Adjust the intensity value as needed
          l.distance = 5;
          l.decay = 4;
          l.power = 400;
          // l.position.z = -1;
          l.shadow.bias = -0.005;
          l.shadow.mapSize.width = 1024;
          l.shadow.mapSize.height = 1024;
          l.shadow.radius = 2.5;
        }
      });

      gltf.scene.position.set(0, -0.5, 0);
      // gltf.scene.scale.set(1.1, 1, 1.1);
      scene.add(gltf.scene);

      // Example: Replace material of 'FloorLamp_Cover' with subsurface scattering material
    if (modelName === 'Floor_Lamp') {
      const FloorLamp_Cover = 'FloorLamp_Cover';
      const newMaterial = createSubsurfaceMaterial(); // Or any other material creation logic
      replaceMaterial(gltf.scene, FloorLamp_Cover, newMaterial);
    }

      console.log(`${modelPath}: Loaded successfully`);

      // Load the next model recursively
      loadModels(index + 1);
    },
    (xhr) => {
      console.log(`${modelPath}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
      // progressBar.style.width = `${progress}%`;
      // console.log(`${modelPath}: ${progress}% loaded`);
    },
    (error) => {
      console.log(`${modelPath}: ${error}`);
      loadModels(index + 1);
    }
  );

  // Show progress bar container
  // progressContainer.style.display = 'block';
}

function createSubsurfaceMaterial() {
  const texLoader = new TextureLoader();
  const subTexture = texLoader.load(
    './textures/subTexture.png'
  );
  subTexture.wrapS = subTexture.wrapT = RepeatWrapping;
  subTexture.repeat.set(4, 4);

  const shader = SubsurfaceScatteringShader;
  const uniforms = UniformsUtils.clone(shader.uniforms) as {
    [uniform: string]: { value: any };
  };

  // Adjust the color to a more neutral tone
  uniforms.diffuse.value = new Vector3(0.9, 0.7, 0.5);
  uniforms.shininess.value = 10;

  uniforms.thicknessMap.value = subTexture;
  uniforms.thicknessColor.value = new Vector3(0.5607843137254902, 0.26666666666666666, 0.054901960784313725);
  uniforms.thicknessDistortion.value = 0.1;
  uniforms.thicknessAmbient.value = 0.4;
  uniforms.thicknessAttenuation.value = 0.7;
  uniforms.thicknessPower.value = 10.0;
  uniforms.thicknessScale.value = 1;

  const subMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    lights: true,
  });

  subMaterial.side = DoubleSide; // Render on both sides of the geometry

  return subMaterial;
}



function replaceMaterial(model: THREE.Object3D, materialName: string, newMaterial: THREE.Material) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      // Check if the mesh name matches the specified materialName
      if (mesh.name === materialName) {
        console.log(`Replacing material for ${materialName}`);
        mesh.material = newMaterial;
      }
    }
  });
}


// Example: Replace material of 'FloorLamp_Cover' with subsurface scattering material
const subsurfaceScatteringMaterial = createSubsurfaceMaterial();

// Ensure that specificObject is defined before replacing its material
if (specificObject) {
  replaceMaterial(specificObject, 'FloorLamp_Cover', subsurfaceScatteringMaterial);
}

// Start loading models
loadModels(0);

if (specificObjectToggleCheckbox) {
  specificObjectToggleCheckbox.addEventListener('change', () => {
    const isActivated = specificObjectToggleCheckbox.checked;

    // Toggle visibility of the specific object based on the checkbox state
    if (specificObject) {
      specificObject.visible = isActivated;
    }
  });
} else {
  console.error("Element with id 'specificObjectToggle' not found.");
}

// Function to add a directional light
function addDirectionalLight() {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(10, 5, 10); // Adjust the light position
  directionalLight.castShadow = true;

  // Set up shadow parameters
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.bias = -0.005;
  directionalLight.shadow.radius = 4;

  scene.add(directionalLight);
}

// Function to remove the directional light
function removeDirectionalLight() {
  // Remove all directional lights
  const directionalLights = scene.children.filter((child) => {
    // Check if the child is a DirectionalLight before accessing isDirectionalLight
    return child.type === 'DirectionalLight';
  });

  directionalLights.forEach((directionalLight) => scene.remove(directionalLight));
}

if (dayNightToggle) {
  dayNightToggle.addEventListener('change', () => {
    const toggleStartTime = performance.now();
    isDayMode = !isDayMode;

    // Show the spinner at the beginning
    progressContainer.style.display = 'flex';
    // Use requestAnimationFrame to ensure the spinner is rendered before proceeding
    requestAnimationFrame(() => {
      if (isDayMode) {
        const modeSwitchStartTime = performance.now();
        // Switch to day mode (remove night lights, add day lights)
        addDirectionalLight(); // Add a new directional light for day mode      
        renderer.toneMappingExposure = 0.7;

        for (const modelName in loadedModelsMap) {
          const modelData = loadedModelsMap[modelName];
          if (modelData.scene) {
            modelData.scene.traverse(function (child: THREE.Object3D) {
              if ((child as THREE.Light).isLight) {
                let l = child as THREE.PointLight;
                l.power = 0;
              }
            });
          }
        }

        // Introduce a delay before logging the end time for mode switch
        setTimeout(() => {
          const modeSwitchEndTime = performance.now(); // Record the end time
          const modeSwitchDuration = modeSwitchEndTime - modeSwitchStartTime; // Calculate the duration
          console.log(`Day mode switch completed in ${modeSwitchDuration} milliseconds`);

          // Hide the spinner after a minimum duration
          setTimeout(() => {
            progressContainer.style.display = 'none';
          }, 0); // Adjust the minimum duration as needed
        }, 0); // Adjust the delay time as needed


      } else {

        const modeSwitchStartTime = performance.now();
        // Switch to night mode (remove day lights, remove directional light)

        removeDirectionalLight();
        renderer.toneMappingExposure = 0.3;

        for (const modelName in loadedModelsMap) {
          const modelData = loadedModelsMap[modelName];
          if (modelData.scene) {
            modelData.scene.traverse(function (child: THREE.Object3D) {
              if ((child as THREE.Light).isLight) {
                let l = child as THREE.PointLight;
                l.power = 400;
              }
            });
          }
        }

        // Introduce a delay before logging the end time for mode switch
        setTimeout(() => {
          const modeSwitchEndTime = performance.now(); // Record the end time
          const modeSwitchDuration = modeSwitchEndTime - modeSwitchStartTime; // Calculate the duration
          console.log(`Night mode switch completed in ${modeSwitchDuration} milliseconds`);

          // Hide the spinner after a minimum duration
          setTimeout(() => {
            progressContainer.style.display = 'none';
          }, 0); // Adjust the minimum duration as needed
        }, 0); // Adjust the delay time as needed
      }

      const toggleEndTime = performance.now(); // Record the end time
      const toggleDuration = toggleEndTime - toggleStartTime; // Calculate the duration
      console.log(`Day/Night toggle completed in ${toggleDuration} milliseconds`);
    });
  });
} else {
  console.error("Element with id 'dayNightToggle' not found.");
}

const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  render();

  composer.render();

  stats.update();
}

camera.position.set(-3.5, 2, 3.5);
// camera.lookAt(0, 0.9, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const gridSize = 10; // Adjust the size of the grid
const gridDivisions = 10; // Adjust the number of divisions in the grid

// Initial grid color (day mode)
let gridColor = 0x000000;

const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
const gridMaterial = new THREE.MeshBasicMaterial({
  color: gridColor, // Set the initial grid color
  wireframe: true, // Display the grid as wireframe
  transparent: true,
  opacity: 0.2, // Adjust the opacity of the grid
});

const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
gridMesh.rotation.x = -Math.PI / 2; // Rotate the grid to be horizontal
gridMesh.position.y = -0.51; // Adjust the Y position to be just below other objects
scene.add(gridMesh);

function render() {
  renderer.render(scene, camera);
}

animate();