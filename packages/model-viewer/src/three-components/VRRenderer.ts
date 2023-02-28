import { AdditiveBlending, BufferGeometry, Color, DoubleSide, EventDispatcher, Float32BufferAttribute, Group, Line, LineBasicMaterial, Matrix4, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D, Raycaster, RingGeometry, Shape, ShapeGeometry, WebGLRenderer } from "three";
import { Renderer } from "./Renderer";
import { ModelScene } from "./ModelScene";

import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory";
import { $currentBackground, $currentEnvironmentMap } from "../features/environment";
import { $onResize } from "../model-viewer-base";
import { ChangeSource } from "./SmoothControls";
import { CameraChangeDetails } from "../features/controls";


export class VrGamepad extends EventDispatcher {

    private gamepad: any

    constructor(gamepad: any) {
        super();
        this.gamepad = gamepad;
    }

    public update() {
        if (this.gamepad.buttons) {
            this.gamepad.buttons.forEach((button: any, key: any) => {
                if (button.pressed === true) {
                    this.dispatchEvent({ type: `${key}_BUTTON_PRESSED`, button: button })
                }
            })
        }

        if (this.gamepad.axes) {
            if (
                (this.gamepad.axes[2] > 0 || this.gamepad.axes[2] < 0) || (this.gamepad.axes[3] > 0 || this.gamepad.axes[3] < 0)) {
                this.dispatchEvent({
                    type: 'axes',
                    x: this.gamepad.axes[2],
                    y: this.gamepad.axes[3]
                })
            }
        }
    }
}

export default class VRRenderer extends EventDispatcher {



    private threeRenderer: WebGLRenderer;


    frame: XRFrame | undefined;
    private controllerGrip0: any;
    private controller: any;
    private controllerModelFactory: XRControllerModelFactory = new XRControllerModelFactory();
    private raycaster = new Raycaster();
    private intersected: Object3D[] = [];
    private model: Object3D | undefined;
    private tempMatrix = new Matrix4();
    private rSpeed = 0;
    private maxScale = 3;
    private minScale = 0.3;
    private gamepad: VrGamepad | undefined;
    private presentedScene: ModelScene | undefined;
    private buttons: Group = new Group();
    currentSession: XRSession | undefined;


    constructor(private renderer: Renderer) {
        super();
        this.makeControls();
        this.threeRenderer = this.renderer.threeRenderer;
        this.threeRenderer.xr.enabled = true;

        this.threeRenderer.xr.addEventListener('sessionstart', () => this.sessionStart())
        this.threeRenderer.xr.addEventListener('sessionend', () => this.sessionEnd())
    }


    sessionStart() {

    }

    sessionEnd() {

    }

    async resolveVrSession(): Promise<XRSession> {
        // @ts-ignore
        const session: XRSession = await navigator.xr.requestSession!('immersive-vr', {});

        this.threeRenderer.xr.setReferenceSpaceType('local');

        await this.threeRenderer.xr.setSession(session);

        return session;

    }



    async present(scene: ModelScene): Promise<void> {

        //@ts-ignore
        const currentSession = await this.resolveVrSession();
        this.currentSession = currentSession;

        let waitForAnimationFrame = new Promise<void>((resolve, _reject) => {
            requestAnimationFrame(() => resolve());
        });

        this.buttons.visible = false;

        scene.setHotspotsVisibility(false);
        scene.queueRender();

        scene.background = new Color(0x000000);

        currentSession.addEventListener('end', () => {
            this.postSessionCleanup(scene)
        }, { once: true });


        this.controllerGrip0 = this.threeRenderer.xr.getControllerGrip(0);
        this.controller = this.threeRenderer.xr.getController(0);

        this.controller.addEventListener('connected', (event: any) => this.connected(event));

        this.model = scene.getObjectByName('Target') as Object3D;



        this.presentedScene = scene;
        this.presentedScene.add(this.controller, this.controllerGrip0);

        this.presentedScene.add(this.buttons);
        // this.presentedScene.add(new AmbientLight(0xffffff, 0.5));
        this.buttons.position.z = -0.1;
        this.buttons.position.y = -1.5;

        this.model.position.z = -5;

        await waitForAnimationFrame;




    }
    onUpdateScene() {
        console.log(123)
    }

    postSessionCleanup(sceneBackup: ModelScene) {


        const scene = this.presentedScene;

        this.presentedScene!.remove(this.buttons);
        this.presentedScene!.position.z = 0;
        this.presentedScene!.background = sceneBackup.background;
        this.model?.position.set(0, 0, 0);
        this.model?.scale.set(1, 1, 1);


        if (scene != null) {
            const { element } = scene;

            scene!.setEnvironmentAndSkybox(
                (element as any)[$currentEnvironmentMap],
                (element as any)[$currentBackground]);
            // const point = this.oldTarget;
            // scene.setTarget(point.x, point.y, point.z);
            scene.xrCamera = null;

            scene.orientHotspots(0);
            element.requestUpdate('cameraTarget');
            element.requestUpdate('maxCameraOrbit');
            element[$onResize](element.getBoundingClientRect());

            requestAnimationFrame(() => {
                scene.element.dispatchEvent(new CustomEvent<CameraChangeDetails>(
                    'camera-change', { detail: { source: ChangeSource.NONE } }));
            });

            this.renderer.height = 0;

        }
    }

    private makeControls() {
        const extrudeSettings = {
            depth: 8,
            bevelEnabled: true,
            bevelSegments: 1,
            steps: 2,
            bevelSize: 1,
            bevelThickness: 1
        };
        const btnColor = 0xd4ffff;

        let triangleShape = new Shape()
            .moveTo(1, -0.8)
            .lineTo(-1, -0.8)
            .lineTo(0, 1)
            .lineTo(1, -0.8); // close path

        let cA = 0.3, cB = 1;
        let plusShape = new Shape()
            .moveTo(cA, cB)
            .lineTo(cA, cA)
            .lineTo(cB, cA)
            .lineTo(cB, -cA)
            .lineTo(cA, -cA)
            .lineTo(cA, -cB)
            .lineTo(-cA, -cB)
            .lineTo(-cA, -cA)
            .lineTo(-cB, -cA)
            .lineTo(-cB, cA)
            .lineTo(-cA, cA)
            .lineTo(-cA, cB)
            .lineTo(cA, cB); // close path

        let minusShape = new Shape()
            .moveTo(cB, cA)
            .lineTo(cB, -cA)
            .lineTo(-cB, -cA)
            .lineTo(-cB, cA)
            .lineTo(cB, cA); // close path

        const addShape = (name: string, shape: any, _extrudeSettings: any, color: any, x: number, y: number, z: number, rx: number, ry: number, rz: number, s: number) => {

            let geometry = new ShapeGeometry(shape);

            let mesh = new Mesh(geometry, new MeshPhongMaterial({
                color: color,
                side: DoubleSide,
                emissive: color,
            }));
            mesh.position.set(x, y, z);
            mesh.rotation.set(rx, ry, rz);
            mesh.scale.set(s, s, s);
            mesh.name = name;
            this.buttons.add(mesh);
        }

        addShape("TOP", triangleShape, extrudeSettings, btnColor, -0.1, 1.35, -0.45, -0.7, 0, 0, 0.05);
        addShape("BOTTOM", triangleShape, extrudeSettings, btnColor, -0.1, 1.25, -0.35, -0.7, 0, Math.PI, 0.05);
        addShape("LEFT", triangleShape, extrudeSettings, btnColor, -0.2, 1.3, -0.4, -0.7, 0, Math.PI / 2, 0.05);
        addShape("RIGHT", triangleShape, extrudeSettings, btnColor, 0, 1.3, -0.4, -0.7, 0, -Math.PI / 2, 0.05);
        addShape("ZOOMIN", plusShape, extrudeSettings, btnColor, 0.15, 1.35, -0.42, -0.7, 0, 0, 0.05);
        addShape("ZOOMOUT", minusShape, extrudeSettings, btnColor, 0.15, 1.25, -0.35, -0.7, 0, 0, 0.05);

    }

    connected(event: any) {
        this.controllerGrip0 = this.threeRenderer.xr.getControllerGrip(0);
        this.controllerGrip0.add(this.controllerModelFactory.createControllerModel(this.controllerGrip0));
        this.gamepad = new VrGamepad(event.data.gamepad);
        if (event.data.targetRayMode === 'gaze') {
            this.buttons.visible = true;
        }
        this.controller.add(this.buildController(event.data));
        this.gamepad.addEventListener('axes', (event: any) => {
            this.model!.rotation.y += event.x * 0.1;
            this.model!.rotation.x += event.y * 0.1;
        });
        this.gamepad.addEventListener('5_BUTTON_PRESSED', () => {
            if (this.model!.scale.x >= this.maxScale)
                return;
            this.model!.scale.x += 0.1;
            this.model!.scale.y += 0.1;
            this.model!.scale.z += 0.1;
        })

        this.gamepad.addEventListener('4_BUTTON_PRESSED', () => {
            if (this.model!.scale.x <= this.minScale)
                return;
            this.model!.scale.x -= 0.1;
            this.model!.scale.y -= 0.1;
            this.model!.scale.z -= 0.1;
        })

    }

    buildController(data: any) {
        let geometry, material;

        switch (data.targetRayMode) {
            case 'tracked-pointer':
                geometry = new BufferGeometry();
                geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
                geometry.setAttribute('color', new Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

                material = new LineBasicMaterial({ vertexColors: true, blending: AdditiveBlending });

                const line = new Line(geometry, material)
                line.name = 'line';

                return line;

            case 'gaze':

                geometry = new RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
                const mesh = new Mesh(geometry, material);
                mesh.name = 'point';
                return mesh;

        }

        return null;
    }

    intersectController(controller: any) {

        // Do not highlight when already selected

        if (controller.userData.selected !== undefined) return;

        const intersections = this.getIntersections(controller);
        const line = controller.getObjectByName('line');


        if (intersections.length > 0) {

            const intersection = intersections[0];

            if (line) {
                line.scale.z = intersection.distance;
            }

            const object = intersection.object;
            //@ts-ignore
            object.material.emissive.r = 1;
            this.intersected.push(object);


            if (object.name === "LEFT") {
                this.model!.rotation.y += this.rSpeed;
            }
            if (object.name === "RIGHT") {
                this.model!.rotation.y -= this.rSpeed;

            }
            if (object.name === "TOP") {
                this.model!.rotation.x -= this.rSpeed;

            }
            if (object.name === "BOTTOM") {
                this.model!.rotation.x += this.rSpeed;

            }
            if (object.name === "ZOOMIN") {
                if (this.model!.scale.x >= this.maxScale)
                    return;

                this.model!.scale.z += 0.01;
                this.model!.scale.x += 0.01;
                this.model!.scale.y += 0.01;


            }
            if (object.name === "ZOOMOUT") {
                if (this.model!.scale.x <= this.minScale)
                    return;

                this.model!.scale.z -= 0.01;
                this.model!.scale.x -= 0.01;
                this.model!.scale.y -= 0.01;
            }

            if (this.rSpeed <= 0.02) {
                this.rSpeed += 0.0001;
            }


        } else {
            if (line) {
                line.scale.z = 5;
            }
            this.rSpeed = 0;

        }

    }

    getIntersections(controller: any) {
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
        return this.raycaster.intersectObjects(this.buttons.children, true);
    }


    cleanIntersected() {

        while (this.intersected.length) {

            const object = this.intersected.pop();
            //@ts-ignore
            object!.material.emissive.r = 0;

        }

    }


    //@ts-ignore
    onWebXRFrame(t: number, frame: XRFrame) {
        this.frame = frame;
        //@ts-ignore
        ++this.frame;

        const scene = this.presentedScene!;

        this.intersectController(this.controller);
        this.cleanIntersected();

        if (this.gamepad) {
            this.gamepad!.update();
        }

        this.threeRenderer.render(scene, scene.getCamera());
    }

    async stopPresenting() { }

}

