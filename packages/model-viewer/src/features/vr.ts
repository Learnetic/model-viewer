/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


// @ts-nocheck
import { property } from 'lit/decorators.js';
// @ts-ignore
import { Event as ThreeEvent } from 'three';

// @ts-ignore
import ModelViewerElementBase, {
    $getLoaded,
    $needsRender,
    $progressTracker,
    $renderer,
    $scene,
    $shouldAttemptPreload,
    $updateSource
} from '../model-viewer-base.js';
import { Constructor, waitForEvent } from '../utilities.js';
import { $markLoaded } from '../model-viewer-base.js';



export const $openSceneViewer = Symbol('openSceneViewer');
export const $openIOSARQuickLook = Symbol('openIOSARQuickLook');
const $canActivateVR = Symbol('canActivateAR');

const $vrButtonContainer = Symbol('vrButtonContainer');

const $onVRButtonContainerClick = Symbol('onVRButtonContainerClick');

const $enterVRWithWebXR = Symbol('enterVRWithWebXR');

const $triggerLoad = Symbol('triggerLoad');

const $preload = Symbol('preload');





export declare interface VRInterface {
    vr: boolean;
    readonly canActivateAR: boolean;
    activateAR(): Promise<void>;
}

export const VRMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<VRInterface> & T => {
    class VRModelViewerElement extends ModelViewerElement {

        @property({ type: Boolean, attribute: 'vr' }) ar: boolean = false;

        protected [$canActivateVR]: boolean = false;

        protected [$vrButtonContainer]: HTMLElement =
            this.shadowRoot!.querySelector('.vr-button') as HTMLElement;

        get canActivateVR(): boolean {



            return true;
        }

        protected [$canActivateVR]: boolean = true;

        constructor(params) {
            super(params);
            this[$vrButtonContainer].addEventListener(
                'click', this[$onVRButtonContainerClick]);
        }


        private [$onVRButtonContainerClick] = (event: Event) => {
            event.preventDefault();
            this.activateVR();
        };

        async activateVR() {

            await this[$triggerLoad]();

            await this[$enterVRWithWebXR]();
        }

        async[$triggerLoad]() {
            if (!this.loaded) {
              this[$preload] = false;
              this[$updateSource]();
              await waitForEvent(this, 'load'); 
              this[$preload] = false;
            }
          }

    
        protected async[$enterVRWithWebXR]() {

            try {
                this[$renderer].vrRenderer.present(this[$scene]);

            } catch (error) {
                console.log(error);
            }
        }


    }

    return VRModelViewerElement;
};
