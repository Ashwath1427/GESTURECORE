import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        
        // Setup camera
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        const aspect = width / height;
        
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.defaultCameraPosition = this.camera.position.clone();
        this.defaultCameraTarget = this.controls.target.clone();

        this.setupEnvironment();
    }

    setupEnvironment() {
        // Grid & Axes
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return; // Prevent NaN corruption
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    centerCameraOnSelectedObject(target, duration = 800) {
        if (!target) return false;

        const controls = this.controls;
        const camera   = this.camera;
        const startPos = camera.position.clone();
        const startTgt = controls.target.clone();

        // Calculate bounding box center to handle larger scaled/complex objects
        const box = new THREE.Box3().setFromObject(target);
        const endTgt = new THREE.Vector3();
        box.getCenter(endTgt);

        let offset = startPos.clone().sub(startTgt);
        
        // Determine distance based on object size
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 2); // Minimum distance of 2
        const frameDistance = maxDim * 2.5;

        if (offset.lengthSq() < 0.1) {
            offset.set(5, 5, 5).setLength(frameDistance);
        } else {
            offset.setLength(frameDistance);
        }
        
        const endPos = endTgt.clone().add(offset);

        const startTime = performance.now();

        function tick() {
            const t = Math.min(
                (performance.now() - startTime) / duration, 1
            );
            const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
            camera.position.lerpVectors(startPos, endPos, e);
            controls.target.lerpVectors(startTgt, endTgt, e);
            controls.update();
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        return true;
    }

    resetCameraToDefaultView(duration = 800) {
        const controls = this.controls;
        const camera   = this.camera;
        const startPos = camera.position.clone();
        const startTgt = controls.target.clone();

        const endPos = this.defaultCameraPosition.clone();
        const endTgt = this.defaultCameraTarget.clone();

        const startTime = performance.now();

        function tick() {
            const t = Math.min(
                (performance.now() - startTime) / duration, 1
            );
            const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
            camera.position.lerpVectors(startPos, endPos, e);
            controls.target.lerpVectors(startTgt, endTgt, e);
            controls.update();
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
