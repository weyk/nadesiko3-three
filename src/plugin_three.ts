/**
 * Type declare and utility class for ThreeJS(r165.1dev)
 */

import * as THREENS from 'three'

type Vector3 = THREENS.Vector3
type Camera = THREENS.Camera
type Loader = THREENS.Loader
type Object3D = THREENS.Object3D

export type EulerOrder = string
export type CubeCameraArgs = [number, number, THREENS.WebGLCubeRenderTarget]
export type EulerArray = [number, number, number]|[number, number, number, EulerOrder]

interface RendererOptions {
  antialias?: boolean
  alpha?: boolean
  canvas?: HTMLCanvasElement
}

interface ArrowHelper extends THREENS.LineSegments {
  new (dir: Vector3, origin: Vector3, len: number, c: number): ArrowHelper
  setDirection (dir: Vector3): void
}
interface AxesHelper extends THREENS.LineSegments {
  new (n: number): AxesHelper
}
interface AxisHelper extends THREENS.LineSegments {
  new (n: number): AxisHelper
}
interface CameraHelper extends THREENS.LineSegments {
  new (c: Camera): CameraHelper
  update (): void
}
export interface Controls {
  enabled: boolean
  new (c: Camera, e: Element): Controls
  update (delta?: number): void
}
interface Disporsal {
  dispose (): void
}
interface DRACOLoader extends Loader {
  new (man?: any): DRACOLoader
  load (url: string, onLoad?:(arg:any)=>any, onProgress?:(arg:any)=>any, onError?:(arg:any)=>any): THREENS.Texture
  setDecoderPath (path: string):void
}
export interface FirstPersonControls extends Controls {
  new (camera: Camera, dom: Element): FirstPersonControls
}
export interface FlyControls extends Controls {
  new (camera : Camera, dom: Element): FlyControls
}
export interface GLTFLoader extends Loader {
  new (man?: any): GLTFLoader
  load (url: string, onLoad?:(arg:any)=>any, onProgress?:(arg:any)=>any, onError?:(arg:any)=>any): THREENS.Texture
  setDRACOLoader (dracoLoader:DRACOLoader):void
}
export interface MD2CharacterComplex {
  new (): MD2CharacterComplex
}
interface ObjectLoader {
  new (): ObjectLoader
  load (url: string, callback: (obj: Object3D) => void,
                      progress: (xhr: XMLHttpRequest) => void,
                      err: (xhr: XMLHttpRequest) => void): void
}
export interface OrbitControls extends Controls {
  new (camera: Camera, dom: Element): OrbitControls
}
interface SkeletonUtils {
  clone (obj: Object3D): Object3D
}
export interface StereoEffect {
  new (r: THREENS.Renderer): StereoEffect
}
export interface THREEEXT {
  CameraHelper?: CameraHelper
  DRACOLoader?: DRACOLoader
  FirstPersonControls?: FirstPersonControls
  FlyControls?: FlyControls
  GLTFLoader?: GLTFLoader
  MD2CharacterComplex?: MD2CharacterComplex
  OrbitControls?: OrbitControls
  SkeletonUtils?: SkeletonUtils
  StereoEffect?: StereoEffect
}

export class ThreeUtil {
  private static isDisporsal (obj: any): obj is Disporsal {
    return 'dispose' in obj && typeof obj['dispose'] === 'function'
  }

  private static isMesh (obj: Object3D): obj is THREENS.Mesh {
    return 'isMesh' in obj && obj['isMesh'] === true
  }

  static disposeOneMaterial (material: THREENS.Material):void {
    for (const propKey of Object.keys(material)) {
      const prop = (material as {[key: string]: any})[propKey] as any
      if (ThreeUtil.isDisporsal(prop)) {
        prop.dispose()
      }
    }
    material.dispose()
  }

  static disposeChildObject (obj: THREENS.Object3D):void {
    while (obj.children.length > 0) {
      this.disposeChildObject(obj.children[0])
      obj.remove(obj.children[0])
    }
    if (ThreeUtil.isMesh(obj)) {
      if (obj.geometry) { obj.geometry.dispose() }

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          for (const material of obj.material) {
            ThreeUtil.disposeOneMaterial(material)
          }
        } else {
          ThreeUtil.disposeOneMaterial(obj.material)
        }
      }
    }
  }
}
