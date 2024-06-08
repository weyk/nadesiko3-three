/**
 * PluginWeykThree
 */

import { ThreeUtil } from './plugin_three.js'

import type { NakoSystem as NakoSystemBase } from 'nadesiko3core/src/plugin_api.mjs'
import * as THREENS from 'three'
import type * as THREEEXT from './plugin_three.js'

// type THREENS = THREE
declare global {
  interface Navigator {
    nako3: { addPluginObject: (name: string, obj: object) => void }
  }
  interface Window {
    THREE?: typeof THREENS
  }
}

interface NakoSystem extends NakoSystemBase {
  tags: { weykthree?: WeykThreeSystem }
}

type NumericArray2 = [ number, number ]
type NumericArray3 = [ number, number, number ]
type NumericArray4 = [ number, number, number, number ]
type NumericArray6 = [ number, number, number, number, number, number ]
type NakoOpts<T> = {[key: string]: T}
type Rect = { left: number, right: number, top: number, bottom: number }

interface XYZ {
   x:number
   y:number
   z:number
}
interface XYZW {
  x:number
  y:number
  z:number
  w:number
}
interface LazyXYZ {
  x:number|(()=>number)
  y:number|(()=>number)
  z:number|(()=>number)
}
interface LazyXYZW {
  x:number|(()=>number)
  y:number|(()=>number)
  z:number|(()=>number)
  w:number|(()=>number)
}

class WeykThreeSystem {
  private static instance: WeykThreeSystem
  private instanceCount: number
  private three: null|typeof THREENS
  private threeExt: THREEEXT.THREEEXT
  sys: NakoSystem
  _scene : null|THREENS.Scene
  _camera: null|THREENS.Camera
  _renderer: null|THREENS.WebGLRenderer
  _scene_list : THREENS.Scene[]
  propMap: {[ index: string] : string }

  static getInstance (sys: NakoSystem) {
    if (WeykThreeSystem.instance === undefined) {
      WeykThreeSystem.instance = new WeykThreeSystem(sys)
    }
    const i = WeykThreeSystem.instance
    i.instanceCount += 1
    return WeykThreeSystem.instance
  }

  constructor (sys: NakoSystem) {
    this.instanceCount = 0
    this.sys = sys

    this.three = null
    this.threeExt = {}
    this._scene = null
    this._camera = null
    this._renderer = null
    this._scene_list = []
    this.propMap = {
      'シャドー': 'shadow',
      'シャドーマップ': 'shadowMap',
      'カメラ': 'camera'
    }
  }

  clearAll () : void {
    console.log('[THREEJS] clearAll')
    // シーンに存在する要素を全部削除して解放
    for (const scene of this._scene_list) {
      if (scene !== null) {
        ThreeUtil.disposeChildObject(scene)
      }
    }
    this._scene = null
    this._camera = null
    this._scene_list = []
  }

  setupRenderer (to: THREENS.WebGLRenderer|HTMLCanvasElement|Element): THREENS.WebGLRenderer {
    const three = this.getThree()
    let renderer: null|THREENS.WebGLRenderer = null
    if (to instanceof this.three!.WebGLRenderer) {
      renderer = to
    } else {
      if (to instanceof HTMLCanvasElement) {
        renderer = new three.WebGLRenderer({ antialias: false, alpha: true, canvas: to })
        renderer.setSize(to.width, to.height)
      } else {
        to = to as Element
        renderer = new three.WebGLRenderer({ antialias: false, alpha: true })
        renderer.setSize(to.clientWidth, to.clientHeight)
        to.appendChild(renderer.domElement)
      }
      renderer.setPixelRatio(window.devicePixelRatio)
    }
    this._renderer = renderer
    return this._renderer
  }

  parseVec3 (xyz: any): null|THREENS.Vector3 {
    const three = this.getThree()
    let V
    if (xyz instanceof three.Vector3) {
      V = xyz
    } else
      if (xyz === null || typeof xyz === 'undefined') {
        V = new three.Vector3()
      } else {
        const pos = this.parsePos(xyz)
        if (pos === null) {
          return null
        }
        V = new three.Vector3(pos.x, pos.y, pos.z)
      }
    return V
  }

  isLazyXYZ (xyz: any): xyz is LazyXYZ {
    return xyz != null && 'x' in xyz && 'y' in xyz && 'z' in xyz
  }

  isLazyXYZW (xyzw: any): xyzw is LazyXYZW {
    return xyzw != null && 'x' in xyzw && 'y' in xyzw && 'z' in xyzw && 'w' in xyzw
  }

  parsePos (xyz: any): null|XYZ {
    let pos:null|XYZ = { x: 0, y: 0, z: 0 }
    if (Array.isArray(xyz) && xyz.length === 3) {
      pos.x = xyz[0]
      pos.y = xyz[1]
      pos.z = xyz[2]
    } else
      if (this.isLazyXYZ(xyz)) {
        pos.x = (typeof xyz.x === 'function') ? xyz.x() : xyz.x
        pos.y = (typeof xyz.y === 'function') ? xyz.y() : xyz.y
        pos.z = (typeof xyz.z === 'function') ? xyz.z() : xyz.z
      } else {
        pos = null
      }
    return pos
  }

  parseQuat (xyzw: any): null|XYZW {
    let quat: null|XYZW = { x: 0, y: 0, z: 0, w: 0 }
    if (Array.isArray(xyzw) && xyzw.length === 4) {
      quat.x = xyzw[0]
      quat.y = xyzw[1]
      quat.z = xyzw[2]
      quat.w = xyzw[3]
    } else
      if (this.isLazyXYZW(xyzw)) {
        quat.x = (typeof xyzw.x === 'function') ? xyzw.x() : xyzw.x
        quat.y = (typeof xyzw.y === 'function') ? xyzw.y() : xyzw.y
        quat.z = (typeof xyzw.z === 'function') ? xyzw.z() : xyzw.z
        quat.w = (typeof xyzw.w === 'function') ? xyzw.w() : xyzw.w
      } else {
        quat = null
      }
    return quat
  }

  resolveProp (obj:{[key: string]: object}|object, keylist: {[key: string]: string}): any {
    const propMap = this.propMap
    Object.keys(keylist).forEach(index => {
      let key = keylist[index]
      if (obj != null) {
        if (propMap[key] != null) {
          key = propMap[key]
        }
        if (key != null) {
          obj = (obj as {[key: string]: object})[key]
        }
      }
    })
    return obj
  }

  checkThree (): boolean {
    return this.three !== null
  }

  setThree (three: typeof THREENS): typeof THREENS {
    this.three = three
    return this.getThree()
  }

  mergeThreeExt (obj: any): THREEEXT.THREEEXT {
    return Object.assign<THREEEXT.THREEEXT, any>(this.threeExt, obj)
  }

  getThreeExt (): THREEEXT.THREEEXT {
    return this.threeExt
  }

  getThree (): typeof THREENS {
    if (this.three === null) {
      if (this.sys.__getSysVar('THREE') !== null) {
        this.three = this.sys.__getSysVar('THREE')
      } else
        if (typeof window.THREE !== 'undefined') {
          this.three = window.THREE
        }
    }
    if (this.three === null) {
      throw new Error('three.module.jsが読み込まれていません')
    }
    if (this.sys.__getSysVar('THREE') === null) {
      this.sys.__setSysVar('THREE', this.three)
    }
    return this.three
  }

  static getManager (sys: NakoSystem):WeykThreeSystem {
    if (!sys.tags.weykthree) {
      throw new Error('本プラグインが初期化されていません')
    }
    return sys.tags.weykthree
  }

  static getEnv (sys: NakoSystem): [ WeykThreeSystem, typeof THREENS ] {
    const weykthree = WeykThreeSystem.getManager(sys)
    const three = weykthree.getThree()
    return [weykthree, three]
  }
}

type NakoRumtimeName = 'wnako'|'cnako'
interface NakoVariables {
  type: 'const'|'var'
  value: any
}

type NakoFn = (...params: any[]) => (void|any)

interface NakoFunction {
  type: 'func'
  josi: []|string[][]
  asyncFn?: boolean
  pure?: boolean
  fn: NakoFn
  return_none?: boolean
}
interface NakoMeta {
  type: string
  value: {
    pluginName: string
    description: string
    pluginVersion: string
    nakoRuntime: NakoRumtimeName[]
    nakoVersion: string
  }
}
interface NakoPluginObject {
  [ index: string]: NakoVariables|NakoFunction|NakoMeta
}
const PluginWeykThree: NakoPluginObject = {
  'meta': {
    type: 'const',
    value: {
      pluginName: 'plugin_weykthree', // プラグインの名前
      description: '3Dグラフィクス描画プラグイン', // プラグインの説明
      pluginVersion: '3.6.0', // プラグインのバージョン
      nakoRuntime: ['wnako'], // 対象ランタイム
      nakoVersion: '3.6.0' // 要求なでしこバージョン
    }
  },
  '初期化': {
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem):void {
      if (sys.tags.weykthree) { return }
      const threeSystem = WeykThreeSystem.getInstance(sys)
      sys.tags.weykthree = threeSystem

      // オブジェクトを初期化
      sys.__setSysVar('THREE', null)
    }
  },
  // @定数・変数
  'THREE': { type: 'const', value: '' }, // @THREE
  'TJSベースURL': { type: 'var', value: 'https://cdn.jsdelivr.net/npm/three@0.127.0' }, // @TJSべーすURL
  'TJSライブラリ名': { type: 'var', value: 'three.module.js' }, // @TJSらいぶらりめい
  // @ライブラリ・プラグイン
  'TJSライブラリ読込': { // @ThreeJSのライブラリを動的に読み込む // @TJSらいぶらりよみこむ
    type: 'func',
    josi: [],
    asyncFn: true,
    pure: true,
    fn: async function (sys: NakoSystem): Promise<boolean> {
      const weykthree = WeykThreeSystem.getManager(sys)
      if (!weykthree.checkThree() && window.THREE == null && sys.__getSysVar('THREE') === null) {
        const baseUrl = sys.__getSysVar('TJSベースURL')
        const libname = sys.__getSysVar('TJSライブラリ名')
        const moduleUrl = baseUrl === '' ? libname : (baseUrl + '/build/' + libname)
        const promise = import(moduleUrl)
        promise.then(module => {
          weykthree.setThree(module)
          return true
        })
        return await promise
      } else {
        weykthree.getThree()
        return true
      }
    }
  },
  'TJSライブラリ読込後': { // @ThreeJSのライブラリを動的に読み込む // @TJSらいぶらりよみこみご
    type: 'func',
    josi: [['に']],
    pure: true,
    fn: function (callback: () => void, sys: NakoSystem):void {
      const weykthree = WeykThreeSystem.getManager(sys)
      if (!weykthree.checkThree() && window.THREE == null && sys.__getSysVar('THREE') === null) {
        const baseUrl = sys.__getSysVar('TJSベースURL')
        const libname = sys.__getSysVar('TJSライブラリ名')
        const moduleUrl = baseUrl === '' ? libname : (baseUrl + '/build/' + libname)
        const promise = import(moduleUrl)
        promise.then(module => {
          weykthree.setThree(module)
          callback()
        })
      } else {
        weykthree.getThree()
        callback()
      }
    },
    return_none: true
  },
  'TJSプラグイン読込': { // @ThreeJSのプラグインを動的に読み込む // @TJSぷらぐいんよみこむ
    type: 'func',
    josi: [['を']],
    asyncFn: true,
    pure: true,
    fn: async function (plugins: string[], sys: NakoSystem):Promise<void> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const l = plugins.length
      if (l === 0) {
        return
      }
      const baseUrl = sys.__getSysVar('TJSベースURL')
      const totalPromise = new Promise<void>((resolve, reject) => {
        const callbacks = (function (total) {
          let countTotal = 0
          let countSuccess = 0
          return function (success: boolean) {
            countTotal += 1
            if (success) {
              countSuccess += 1
            }
            if (countTotal === total) {
              if (countTotal === countSuccess) {
                resolve()
              } else {
                reject(new Error(`読み込みに失敗したプラグインがありました(成功:${countSuccess}/全体:${countTotal})`))
              }
            }
          }
        })(l)
        for (const name of plugins) {
          const pluginUrl = baseUrl === '' ? name : (baseUrl + '/examples/jsm/' + name)
          const promise = import(pluginUrl)
          promise.then(module => {
            weykthree.mergeThreeExt(module)
            callbacks(true)
          })
          promise.catch(err => {
            console.log(err)
            callbacks(false)
          })
        }
      })
      return totalPromise
    }
  },
  'TJSプラグイン読込後': { // @ThreeJSのプラグインを動的に読み込む // @TJSぷらぐいんよみこみご
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (callback: () => void, plugins: string[], sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const l = plugins.length
      if (l === 0) {
        callback()
        return
      }
      const baseUrl = sys.__getSysVar('TJSベースURL')
      const callbacks = (function (callback, total) {
        let count = 0
        return function (success: boolean) {
          count += 1
          if (count === total) {
            callback()
          }
        }
      })(callback, l)
      for (let i = 0; i < l; i++) {
        const name = plugins[i]
        const pluginUrl = baseUrl === '' ? name : (baseUrl + '/examples/jsm/' + name)
        const promise = import(pluginUrl)
        promise.then(module => {
          weykthree.mergeThreeExt(module)
          callbacks(true)
        })
        promise.catch(err => {
          console.log(err)
          callbacks(false)
        })
      }
    },
    return_none: true
  },
  'TJS待': { // @Promiseの終了を待って結果を返す // @TJSまつ
    type: 'func',
    josi: [['を']],
    asyncFn: true,
    pure: true,
    fn: function (p: Promise<any>, sys: NakoSystem): Promise<any> {
      return p
    }
  },
  // @ThreeJS操作
  'TJS全消去': { // @ThreeJSの作成済みのオブジェクトを全て破棄する // @TJSぜんしょうきょ
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      weykthree.clearAll()
    },
    return_none: true
  },
  'TJS描画準備': { // @指定したDOMのIDに対する描画を準備し、描画オブジェクトを返す // @TJSびょうがじゅんび
    type: 'func',
    josi: [['に', 'へ']],
    pure: true,
    fn: function (to: string|Element|null, sys: NakoSystem):THREENS.WebGLRenderer {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof to === 'string') { to = document.querySelector(to) || document.getElementById(to) }
      if (!to) { throw new Error('TJS描画準備に指定した描画先の要素がありません。指定に誤りがあります') }

      return weykthree.setupRenderer(to)
    }
  },
  'TJS描画先取得': { // @描画オブジェクトの描画先となるDOM要素を返す // @TJSびょうがさきしゅとく
    type: 'func',
    josi: [['の', 'から']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem):Element {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return renderer.domElement
    }
  },
  'TJS描画': { // @指定した描画オブジェクトに対してシーン・カメラで描画する // @TJSびょうが
    type: 'func',
    josi: [['に'], ['を'], ['で']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, scene: THREENS.Scene, camera: THREENS.Camera, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      renderer.render(scene, camera)
    },
    return_none: true
  },
  'TJSシーン作成': { // @ThreeJSのシーンを作成し、シーンオブジェクトを返す // @TJSしーんさくせい
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem): THREENS.Scene {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const scene = new three.Scene()
      if (scene === null) {
        throw new Error('シーンを作成できません')
      }
      weykthree._scene = scene
      weykthree._scene_list.push(scene)
      return scene
    }
  },
  'TJSグループ作成': { // @ThreeJSのグループを作成して返す // @TJSぐるーぷさくせい
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem): THREENS.Group {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const group = new three.Group()
      if (group === null) {
        throw new Error('グループを作成できません')
      }
      return group
    }
  },
  'TJS背景設定': { // @指定したシーンの背景を設定する // @TJSはいけいせってい
    type: 'func',
    josi: [['に', 'へ'], ['を']],
    pure: true,
    fn: function (scene: THREENS.Scene, obj: number|THREENS.Color, sys: NakoSystem): void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const color = obj instanceof three.Color ? obj : new three.Color(obj)
      scene.background = color
    },
    return_none: true
  },
  'TJS霧効果設定': { // @指定したシーンに霧の効果を設定する // @TJSきりこうかせってい
    type: 'func',
    josi: [['に', 'へ'], ['を']],
    pure: true,
    fn: function (scene: THREENS.Scene, fog: THREENS.Fog|THREENS.FogExp2, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      scene.fog = fog
    },
    return_none: true
  },
  'TJSクリア': { // @指定したレンダリングのクリアする // @TJSくりあ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      renderer.clear()
    },
    return_none: true
  },
  'TJSクリア色設定': { // @指定したレンダリングの際にクリアする色として使用する色を設定する // @TJSくりあしょくせってい
    type: 'func',
    josi: [['に', 'へ'], ['を']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, color: THREENS.Color, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      renderer.setClearColor(color)
    },
    return_none: true
  },
  'TJSクリア透過設定': { // @指定したレンダリングの際にクリアする色の透過度を設定する // @TJSくりあとうかせってい
    type: 'func',
    josi: [['に', 'へ'], ['を']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, alpha: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      renderer.setClearAlpha(alpha)
    },
    return_none: true
  },
  'TJS影処理有効': { // @影の投影処理を有効にする // @TJSかげしょりゆうこう
    type: 'func',
    josi: [['の', 'を']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      renderer.shadowMap.enabled = true
    },
    return_none: true
  },
  'TJS影処理無効': { // @影の投影処理を無効にする // @TJSかげしょりむこう
    type: 'func',
    josi: [['の', 'を']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      renderer.shadowMap.enabled = false
    },
    return_none: true
  },
  'TJS影処理取得': { // @影の投影処理を有効・無効を取得して返す // @TJSかげしょりしゅとく
    type: 'func',
    josi: [['の', 'から']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem): boolean {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      return renderer.shadowMap.enabled
    }
  },
  // @基本型操作
  'TJS四元数作成': { // @四元数(quotanion)を作成して返す // @TJSしげんすうさくせい
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem): THREENS.Quaternion {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      return new three.Quaternion()
    }
  },
  'TJS四元数アングル取得': { // @四元数を基準として指定した３次元ベクトルとの角度を計算して返す // @TJSしげんすうあんぐるしゅとく
    type: 'func',
    josi: [['から'], ['の']],
    pure: true,
    fn: function (qua: THREENS.Quaternion, xyz: any, sys: NakoSystem): number {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const pos = weykthree.parsePos(xyz)
      if (pos === null) {
        throw new Error(`方向を配列で指定してください([x, y, z]:${typeof xyz}:${xyz.length})`)
      }
      const q = new three.Quaternion(pos.x, pos.y, pos.z, 0)
      const angle = qua.angleTo(q)
      return angle
    }
  },
  'TJSVec3': { // @ThreeJsのVector3を作成して返す // @TJSVec3
    type: 'func',
    josi: [['の', 'で', 'から']],
    pure: true,
    fn: function (opts: any, sys: NakoSystem): THREENS.Vector3 {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (opts == null) {
        return new three.Vector3()
      }
      const pos = weykthree.parsePos(opts)
      if (pos === null) {
        throw new Error('Vector3の作成の際に不明な引数が指定されました')
      }
      return new three.Vector3(pos.x, pos.y, pos.z)
    }
  },
  'TJSVec2設定': { // @Vector2に値を設定する // @TJSVec2せってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: THREENS.Vector2, props: THREENS.Vector2|{[key:string]:string}, xy: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (obj != null) {
        obj = weykthree.resolveProp(obj, props as {[key:string]:string}) as THREENS.Vector2
      } else {
        obj = props as THREENS.Vector2
      }
      if (Array.isArray(xy) && xy.length === 2) {
        obj.set(xy[0], xy[1])
      } else
        if (xy != null && 'x' in xy && 'y' in xy) {
          obj.set(xy.x, xy.y)
        } else {
          throw new Error('Vector2への設定の際に不明な引数が指定されました')
        }
    },
    return_none: true
  },
  'TJS加算': { // @Vec3にVec3を加算する // @TJSかさん
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (v: THREENS.Vector3, a: THREENS.Vector3, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      v.add(a)
    },
    return_none: true
  },
  'TJSスカラー乗算': { // @Vec3をスカラーで乗算する // @TJSすからーじょうざん
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (v: THREENS.Vector3, a: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      v.multiplyScalar(a)
    },
    return_none: true
  },
  'TJS四元数適用': { // @なにかに対して四元数(quotanion)を適用すて姿勢を更新する // @TJSしげんすうてきよう
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (obj: THREENS.Object3D, xyzw: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const quat = weykthree.parseQuat(xyzw)
      if (quat === null) {
        throw new Error(`四元数を配列で指定してください([x, y, z, w]:${typeof xyzw}:${xyzw.length})`)
      }
      const Q = new three.Quaternion(quat.x, quat.y, quat.z, quat.w)
      obj.applyQuaternion(Q)
    },
    return_none: true
  },
  'TJSマトリクス適用': { // @なにかに対してマトリクスを適用して位置・姿勢を更新する // @TJSまとりくすてきよう
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (obj: THREENS.Object3D|THREENS.Vector2|THREENS.Vector3, mat: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      if (obj instanceof THREENS.Vector2) {
        if (mat instanceof three.Matrix3) {
          obj.applyMatrix3(mat)
        } else {
          throw new Error('Vector2に適用するマトリクスはMatrix3を指定してください')
        }
      } else {
        if (mat instanceof three.Matrix4) {
          obj.applyMatrix4(mat)
        } else {
          throw new Error('Vector3/Object3Dに適用するマトリクスはMatrix4を指定してください')
        }
      }
    },
    return_none: true
  },
  // @共通操作
  'TJS位置設定': { // @positionを持つなにかに対して指定した座標に配置する // @TJSいちせってい
    type: 'func',
    josi: [['を'], ['に']],
    pure: true,
    fn: function (obj: THREENS.Object3D, xyz: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      const pos = weykthree.parsePos(xyz)
      if (pos === null) {
        throw new Error(`座標を配列で指定してください([x, y, z]:${typeof xyz}:${xyz.length})`)
      }
      obj.position.set(pos.x, pos.y, pos.z)
    },
    return_none: true
  },
  'TJS位置取得': { // @positionを持つなにかから座標の情報を得る // @TJSいちしゅとく
    type: 'func',
    josi: [['から', 'の']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem): THREENS.Vector3 {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)

      return obj.position
    }
  },
  'TJSワールド位置取得': { // @位置(position)を持つなにかからワールドでのその情報を得る // @TJSわーるどいちしゅとく
    type: 'func',
    josi: [['から', 'の'], ['に', 'へ']],
    pure: true,
    fn: function (obj: THREENS.Object3D, pos: THREENS.Vector3, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      obj.getWorldPosition(pos)
    },
    return_none: true
  },
  'TJSワールドマトリクス取得': { // @ワールドマトリクスを持つなにかからワールドマトリクスを得る // @TJSわーるどまとりくすしゅとく
    type: 'func',
    josi: [['から', 'の']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem): THREENS.Matrix4 {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return obj.matrixWorld
    }
  },
  'TJS四元数設定': { // @四元数(quotanion)を持つなにかに対して指定した姿勢を設定する // @TJSしげんすうせってい
    type: 'func',
    josi: [['を'], ['に']],
    pure: true,
    fn: function (obj: THREENS.Object3D, xyzw: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const quat = weykthree.parseQuat(xyzw)
      if (quat === null) {
        throw new Error(`四元数を配列で指定してください([x, y, z, w]:${typeof xyzw}:${xyzw.length})`)
      }
      obj.quaternion.set(quat.x, quat.y, quat.z, quat.w)
    },
    return_none: true
  },
  'TJS四元数取得': { // @四元数(quotanion)を持つなにかからその情報を得る // @TJSしげんすうしゅとく
    type: 'func',
    josi: [['から', 'の']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem): THREENS.Quaternion {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return obj.quaternion
    }
  },
  'TJSワールド四元数取得': { // @四元数(quotanion)を持つなにかからワールドでのその情報を得る // @TJSわーるどしげんすうしゅとく
    type: 'func',
    josi: [['から', 'の'], ['に', 'へ']],
    pure: true,
    fn: function (obj: THREENS.Object3D, quat: THREENS.Quaternion, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      obj.getWorldQuaternion(quat)
    },
    return_none: true
  },
  'TJSワールド方向取得': { // @方向(direction)を持つなにかからワールドでのその情報を得る // @TJSわーるどほうこうしゅとく
    type: 'func',
    josi: [['から', 'の'], ['に', 'へ']],
    pure: true,
    fn: function (obj: THREENS.Object3D, vec: THREENS.Vector3, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      obj.getWorldDirection(vec)
    },
    return_none: true
  },
  'TJSサイズ設定': { // @setSizeを持つオブジェクトにサイズの設定を行う // @TJSさいずせってい
    type: 'func',
    josi: [['に'], ['を', 'へ']],
    pure: true,
    fn: function (obj: any, size: NumericArray2, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.setSize !== 'function') {
        throw new Error('指定したオブジェクトはsetSizeを持っていません')
      }
      if (!Array.isArray(size) || size.length !== 2) {
        throw new Error('設定するサイズを配列で指定してください([w,h])')
      }
      obj.setSize(size[0], size[1])
    },
    return_none: true
  },
  'TJS拡大': { // @scaleを持つオブジェクトにスケールの設定を行う // @TJSかくだい
    type: 'func',
    josi: [['を'], ['で', 'に']],
    pure: true,
    fn: function (obj: any, scale: NumericArray3, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.scale !== 'function') {
        throw new Error('指定したオブジェクトはscaleを持っていません')
      }
      if (!Array.isArray(scale) || scale.length !== 3) {
        throw new Error('拡大する倍率を配列で指定してください([x,y,z])')
      }
      obj.scale(scale[0], scale[1], scale[2])
    },
    return_none: true
  },
  'TJS移動': { // @translateを持つオブジェクトを平行移動する // @TJS移動
    type: 'func',
    josi: [['を'], ['で', 'に'], ['だけ']],
    pure: true,
    fn: function (obj: any, axis: any, distance: null|number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (distance == null) {
        axis = weykthree.parsePos(axis)
        if (axis == null) {
          throw new Error('移動する先を配列で指定してください([x,y,z])')
        }
        obj.translate(axis.x, axis.y, axis.z)
      } else {
        axis = weykthree.parseVec3(axis)
        if (axis == null) {
          throw new Error('移動する方向(軸)を配列で指定してください([x,y,z])')
        }
        (obj as THREENS.Object3D).translateOnAxis(axis, distance)
      }
    },
    return_none: true
  },
  'TJS表示': { // @visibleを持つオブジェクトのvisibleにtrueを設定する // @TJSひょうじ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      obj.visible = true
    },
    return_none: true
  },
  'TJS非表示': { // @visibleを持つオブジェクトのvisibleにfalseを設定する // @TJSひひょうじ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      obj.visible = false
    },
    return_none: true
  },
  'TJS有効化': { // @なにかを有効にする // @TJSゆうこうか
    type: 'func',
    josi: [['の', 'を']],
    pure: true,
    fn: function (obj: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.enabled === 'undefined') {
        throw new Error('指定したオブジェクトはenabledを持っていません')
      }
      obj.enabled = true
    },
    return_none: true
  },
  'TJS無効化': { // @なにかを無効にする // @TJSむこうか
    type: 'func',
    josi: [['の', 'を']],
    pure: true,
    fn: function (obj: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.enabled === 'undefined') {
        throw new Error('指定したオブジェクトはenabledを持っていません')
      }
      obj.enabled = false
    },
    return_none: true
  },
  'TJSトラバース': { // @traverse可能ななにかに対してtraverseする // @TJとらばーす
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (callback: (arg:any)=>any, obj: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.traverse !== 'function') {
        throw new Error('指定したオブジェクトはtraverseを持っていません')
      }
      obj.traverse(callback)
    },
    return_none: true
  },
  'TJS影受設定': { // @receiveShadowを持つオブジェクトにその値を設定する // @TJSかげうけせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (obj: any, flag: number|string|boolean, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.receiveShadow === 'undefined') {
        throw new Error('指定したオブジェクトはreceiveShadowを持っていません')
      }
      obj.receiveShadow = !!flag
    },
    return_none: true
  },
  'TJS影受取得': { // @receiveShadowを持つオブジェクトからその値を取得する // @TJSかげうけしゅとく
    type: 'func',
    josi: [['から', 'の']],
    pure: true,
    fn: function (obj: any, sys: NakoSystem):boolean {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.receiveShadow === 'undefined') {
        throw new Error('指定したオブジェクトはreceiveShadowを持っていません')
      }
      return obj.receiveShadow
    }
  },
  'TJS影投設定': { // @castShadowを持つオブジェクトにその値を設定する // @TJSかげなげせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (obj: any, flag: number|string|boolean, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.castShadow === 'undefined') {
        throw new Error('指定したオブジェクトはcastShadowを持っていません')
      }
      obj.castShadow = !!flag
    },
    return_none: true
  },
  'TJS影投取得': { // @castShadowを持つオブジェクトからその値を取得する // @TJSかげなげしゅとく
    type: 'func',
    josi: [['から', 'の']],
    pure: true,
    fn: function (obj: any, sys: NakoSystem): boolean {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.castShadow === 'undefined') {
        throw new Error('指定したオブジェクトはcastShadowを持っていません')
      }
      return obj.castShadow
    }
  },
  'TJS登場': { // @指定したシーンやグループに指定したなにかを追加する // @TJSとうじょう
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (scene: THREENS.Scene, obj: THREENS.Object3D, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      scene.add(obj)
    },
    return_none: true
  },
  'TJS退場': { // @指定したシーンやグループから指定したなにかを削除する // @TJSたいじょう
    type: 'func',
    josi: [['から'], ['を']],
    pure: true,
    fn: function (scene: THREENS.Scene, obj: THREENS.Object3D, sys: NakoSystem): void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      scene.remove(obj)
    },
    return_none: true
  },
  'TJS自主退場': { // @指定したなにかをそれが属している親から削除する // @TJSじしゅたいじょう
    type: 'func',
    josi: [['を', 'が']],
    pure: true,
    fn: function (obj: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof obj.removeFromParent !== 'function') {
        throw new Error('指定したオブジェクトはremoveFromParentを持っていません')
      }
      obj.removeFromParent()
    },
    return_none: true
  },
  // @カメラ
  'TJS透視投影カメラ作成': { // @透視投影カメラを作成しそのオブジェクトを返す // @TJSとうしとうえいかめらさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (param: NumericArray4, sys: NakoSystem): THREENS.PerspectiveCamera {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(param) || param.length !== 4) {
        throw new Error('カメラの仕様を配列で指定してください([視野角(度), アスペクト比, 最近距離, 最遠距離])')
      }
      const camera = new three.PerspectiveCamera(param[0], param[1], param[2], param[3])
      if (camera === null) {
        throw new Error('透視投影カメラを作成できません')
      }
      weykthree._camera = camera
      return camera
    }
  },
  'TJS環境撮影カメラ作成': { // @環境マップ撮影用のCubeカメラを作成しそのオブジェクトを返す // @TJSかんきょうさつえいかめらさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (param: THREEEXT.CubeCameraArgs, sys: NakoSystem): THREENS.CubeCamera {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(param) || param.length !== 3) {
        throw new Error('カメラの仕様を配列で指定してください([最近距離, 最遠距離, 環境撮影用レンダーターゲット])')
      }
      const camera = new three.CubeCamera(param[0], param[1], param[2])
      if (camera === null) {
        throw new Error('環境撮影カメラを作成できません')
      }
      return camera
    }
  },
  'TJSカメラ上方設定': { // @カメラの上として扱う方向を指定する // @TJSかめらじょうほうせってい
    type: 'func',
    josi: [['を'], ['に']],
    pure: true,
    fn: function (camera: THREENS.Camera, vec: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      let dir: NumericArray3
      if (typeof vec === 'string') {
        if (vec === '+X') dir = [1.0, 0.0, 0.0]
        else if (vec === '-X') dir = [-1.0, 0.0, 0.0]
        else if (vec === '+Y') dir = [0.0, 1.0, 0.0]
        else if (vec === '-Y') dir = [0.0, -1.0, 0.0]
        else if (vec === '+Z') dir = [0.0, 0.0, 1.0]
        else if (vec === '-Z') dir = [0.0, 0.0, -1.0]
        else {
          throw new Error('カメラの上方向を表す文字列が正しくありません。文字列もしくは単位ベクトルの配列で指定してください("+","-"と"X","Y","Z"の組み合わせ or [x, y, z])')
        }
      } else {
        const pos = weykthree.parsePos(vec)
        if (pos === null) {
          throw new Error('カメラの上方向を表す文字列が正しくありません。文字列もしくは単位ベクトルの配列で指定してください("+","-"と"X","Y","Z"の組み合わせ or [x, y, z])')
        }
        dir = [pos.x, pos.y, pos.z]
      }
      camera.up.x = dir[0]
      camera.up.y = dir[1]
      camera.up.z = dir[2]
    }
  },
  'TJS投影マトリクス更新': { // @カメラの投影マトリクスを更新する // @TJSとうえいまとりくすこうしん
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (camera: THREENS.OrthographicCamera|THREENS.PerspectiveCamera, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof camera.updateProjectionMatrix !== 'function') {
        throw new Error('指定したオブジェクトはupdateProjectionMatrixを持っていません')
      }
      camera.updateProjectionMatrix()
    },
    return_none: true
  },
  'TJS視点設定': { // @カメラを向ける先の座標を指定する。カメラ以外にも使用可能 // @TJSしてんせってい
    type: 'func',
    josi: [['を'], ['に', 'へ']],
    pure: true,
    fn: function (camera: THREENS.Camera, at: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const pos = weykthree.parsePos(at)
      if (pos === null) {
        throw new Error('カメラを向ける先の座標を指定してください([x,y,z])')
      }
      camera.lookAt(pos.x, pos.y, pos.z)
    },
    return_none: true
  },
  'TJSカメラ最近距離設定': { // @指定したカメラの視界となる最小の距離を設定する。 // @TJSかめらさいきんきょりせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: any, camera: any, near: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!('near' in camera)) {
        obj = weykthree.resolveProp(obj, camera)
      }
      obj.near = near
    },
    return_none: true
  },
  'TJSカメラ矩形距離設定': { // @指定したカメラの視界範囲の左上右下の距離を設定する。 // @TJSかめらくけいきょりせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: any, camera: any, rect: NumericArray4|Rect, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!('left' in camera)) {
        obj = weykthree.resolveProp(obj, camera)
      }
      if (Array.isArray(rect) && rect.length === 4) {
        obj.left = rect[0]
        obj.top = rect[1]
        obj.right = rect[2]
        obj.bottom = rect[3]
      } else
        if ('left' in rect) {
          obj.left = rect.left
          obj.top = rect.top
          obj.right = rect.right
          obj.bottom = rect.bottom
        } else {
          throw new Error('矩形の指定が正しくありません。要素４つの配列([left, top, right, bottom])で指定して下さい')
        }
    },
    return_none: true
  },
  'TJSカメラ最遠距離設定': { // @指定したカメラの視界となる最大の距離を設定する。 // @TJSかめらさいえんきょりせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: any, camera: any, far: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!('far' in camera)) {
        obj = weykthree.resolveProp(obj, camera)
      }
      obj.far = far
    },
    return_none: true
  },
  'TJSカメラ視野角設定': { // @指定した光源のシャドー光源が角度を設定する。 // @TJSかめらしやかくせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: any, camera: any, angle: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!('angle' in camera)) {
        obj = weykthree.resolveProp(obj, camera)
      }
      obj.angle = angle
    },
    return_none: true
  },
  'TJS環境撮影用レンダーターゲット作成': { // @環境マップ撮影時の撮影先となるレンダーターゲットを作成しそのオブジェクトを返す // @TJSかんきょうさつえいようれんだーたーげっとさくせい
    type: 'func',
    josi: [['を'], ['で']],
    pure: true,
    fn: function (size: number, opts: NakoOpts<any>, sys: NakoSystem): THREENS.WebGLCubeRenderTarget {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.WebGLCubeRenderTarget(size, opts)
    }
  },
  'TJS環境カメラ撮影': { // @指定した描画オブジェクトに対してシーン・カメラで描画する // @TJSびょうが
    type: 'func',
    josi: [['に'], ['を'], ['で']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, scene: THREENS.Scene, camera: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof camera.update !== 'function') {
        throw new Error('指定した対象はupdateを持っていません')
      }
      camera.update(renderer, scene)
    },
    return_none: true
  },
  // @光源・シャドー光源
  'TJS環境光源作成': { // @環境光の光源を作成する // @TJSかんきょうこうげんさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (color: number, sys: NakoSystem): THREENS.AmbientLight {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.AmbientLight(color)
    }
  },
  'TJS点光源作成': { // @点の光源を作成する // @TJSてんこうげんさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (param: NumericArray4, sys: NakoSystem): THREENS.PointLight {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(param) || param.length !== 4) {
        throw new Error('点光源の仕様を配列で指定してください([色, 強度, 到達距離, 減衰率])')
      }
      return new three.PointLight(param[0], param[1], param[2], param[3])
    }
  },
  'TJS平行光源作成': { // @平行な光が降り注ぐ光源を作成する // @TJSへいこうこうげんさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (param: NumericArray2, sys: NakoSystem): THREENS.DirectionalLight {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(param) || param.length !== 2) {
        throw new Error('平行光源の仕様を配列で指定してください([色, 強度])')
      }
      return new three.DirectionalLight(param[0], param[1])
    }
  },
  'TJSスポット光源作成': { // @スポット光源を作成する // @TJSすぽっとこうさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (param: NumericArray6, sys: NakoSystem): THREENS.SpotLight {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(param) || param.length !== 6) {
        throw new Error('スポット光源の仕様を配列で指定してください([色, 強度, 到達距離, 放射角, 拡散減衰率, 距離減衰係数])')
      }
      return new three.SpotLight(param[0], param[1], param[2], param[3], param[4], param[5])
    }
  },
  'TJSマップサイズ設定': { // @指定したシャドー光源のシャドーマップのサイズを設定する。２のべき乗にすること // @TJSまっぷさいずせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (obj: any, lightshadow: any, wh: NumericArray2, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (!Array.isArray(wh) || wh.length !== 2) {
        throw new Error('サイズは[幅,高さ]の形の要素２個の配列で指定して下さい')
      }
      if (!('mapSize' in lightshadow)) {
        obj = weykthree.resolveProp(obj, lightshadow)
      }
      obj.mapSize.width = wh[0]
      obj.mapSize.height = wh[1]
    },
    return_none: true
  },
  // @構造(ジオメトリ)に対する操作
  'TJS属性設定': { // @ジオメトリに指定した名前の属性を属性バッファを設定する // @TJSぞくせいせってい
    type: 'func',
    josi: [['の'], ['に'], ['を']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, attr: string, buf: THREENS.BufferAttribute, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      geometory.setAttribute(attr, buf)
    },
    return_none: true
  },
  'TJSインデックス設定': { // @ジオメトリにインデックスを設定する。属性の参照がインデックス経由になる // @TJSいんでっくすせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, index: number[], sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      geometory.setIndex(index)
    },
    return_none: true
  },
  'TJS境界箱計算': { // @指定したジオメトリの境界を箱型として計算する // @TJSきょいかいはこけいさん
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      geometory.computeBoundingBox()
    },
    return_none: true
  },
  'TJS境界球計算': { // @指定したジオメトリの境界を球型として計算する // @TJSきょいかいきゅうけいさん
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      geometory.computeBoundingSphere()
    },
    return_none: true
  },
  'TJS法線計算': { // @指定したジオメトリの法線を計算する // @TJSほうせんけいさん
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      geometory.computeVertexNormals()
    },
    return_none: true
  },
  'TJS回転': { // @ジオメトリを指定した軸に沿って回転する // @TJSかいてん
    type: 'func',
    josi: [['を'], ['で'], ['だけ']],
    pure: true,
    fn: function (geometory: THREENS.BufferGeometry, axis: string, radius: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (axis === 'X' || axis === 'x') {
        geometory.rotateX(radius)
      } else
        if (axis === 'Y' || axis === 'y') {
          geometory.rotateY(radius)
        } else
          if (axis === 'Z' || axis === 'z') {
            geometory.rotateZ(radius)
          } else {
            throw new Error('回転の軸はXかYかZを指定して下さい')
          }
    },
    return_none: true
  },
  // @属性バッファ・バッファ
  'TJS属性バッファ作成': { // @ジオメトリの属性に設定するバッファを作成して返す。型付配列と１件分のデータ数を指定する // @TJSぞくせいばっふぁさくせい
    type: 'func',
    josi: [['から', 'を'], ['の', 'で']],
    pure: true,
    fn: function (ary: any, num: number, sys: NakoSystem): THREENS.BufferAttribute {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.BufferAttribute(ary, num)
    }
  },
  'TJSインターリーブバッファ作成': { // @インターリーブのあるバッファを作成して返す。型付配列と１頂点毎のデータ数を指定する // @TJSいんたーりーぶばっふぁさくせい
    type: 'func',
    josi: [['から', 'を'], ['の', 'で']],
    pure: true,
    fn: function (ary: any, stride: number, sys: NakoSystem): THREENS.InterleavedBuffer {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.InterleavedBuffer(ary, stride)
    }
  },
  'TJSインターリーブ属性作成': { // @インターリーブバッファから属性バッファを作成して返す。インターリーブバッファとオフセットと１件分のデータ数を指定する // @TJSいんたーりーぶぞくせいさくせい
    type: 'func',
    josi: [['で'], ['から'], ['の']],
    pure: true,
    fn: function (buf: THREENS.InterleavedBuffer, off: number, num: number, sys: NakoSystem): THREENS.InterleavedBufferAttribute {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.InterleavedBufferAttribute(buf, num, off)
    }
  },
  'TJS変更有無設定': { // @属性バッファ・インターリーブバッファに変更の有無を設定する // @TJSへんこううむせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (buf: THREENS.InterleavedBuffer, opt: any, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      let type = opt
      if (typeof type === 'string') {
        if (opt === '頻繁' || opt === '動的' || opt === '有り' || opt === '有' || opt === 'Dynamic' || opt === 'DynamicDrawUsage') {
          type = three['DynamicDrawUsage']
        } else
          if (opt === '静的' || opt === '無し' || opt === '無' || opt === 'Static' || opt === 'StaticDrawUsage') {
            type = three['StaticDrawUsage']
          } else {
            type = null
          }
      }
      buf.setUsage(type)
    },
    return_none: true
  },
  // @基本構造(ジオメトリ)
  'TJS空構造作成': { // @空のジオメトリを作成して返す // @TJSからこうぞうさくせい
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem): THREENS.BufferGeometry {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.BufferGeometry()
    }
  },
  'TJS板作成': { // @板(平面)のジオメトリを作成して返す // @TJSいたさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem):THREENS.PlaneGeometry {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const width = opts['幅'] || opts['W'] || opts['width'] || 1.0
      const height = opts['高さ'] || opts['H'] || 1.0
      const widthSegments = opts['横分割数'] || opts['heightSegments'] || 1
      const heightSegments = opts['縦分割数'] || opts['heightSegments'] || 1
      const isBuffered = opts['バッファ'] || opts['buffer'] || false
      // @ts-ignore
      if (isBuffered && typeof three.PlaneBufferGeometry !== 'undefined') {
        // @ts-ignore
        return new three.PlaneBufferGeometry(width, height, widthSegments, heightSegments)
      }
      return new three.PlaneGeometry(width, height, widthSegments, heightSegments)
    }
  },
  'TJS箱作成': { // @箱(直方体)のジオメトリを作成して返す // @TJSはこさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.BoxGeometry {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const width = opts['幅'] || opts['W'] || opts['width'] || 1.0
      const height = opts['高さ'] || opts['高'] || opts['H'] || opts['height'] || 1.0
      const depth = opts['奥行'] || opts['D'] || opts['depth'] || 1.0
      const widthSegments = opts['横分割数'] || opts['heightSegments'] || 1
      const heightSegments = opts['縦分割数'] || opts['heightSegments'] || 1
      const depthSegments = opts['奥行分割数'] || opts['depthSegments'] || 1
      const isBuffered = opts['バッファ'] || opts['buffer'] || false
      // @ts-ignore
      if (isBuffered && typeof three.BoxBufferGeometry !== 'undefined') {
        // @ts-ignore
        return new three.BoxBufferGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
      }
      return new three.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
    }
  },
  'TJS球体作成': { // @球体(多面体)のジオメトリを作成して返す // @TJSきゅうたいさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.SphereGeometry {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const radius = opts['半径'] || opts['R'] || opts['radius'] || 1.0
      const widthSegments = opts['横分割数'] || opts['widthSegments'] || 8
      const heightSegments = opts['縦分割数'] || opts['heightSegments'] || 6
      const phiStart = opts['横開始位置'] || opts['phiStart'] || 0
      const phiLength = opts['横長'] || opts['phiLength'] || (Math.PI * 2)
      const thettaStart = opts['縦開始位置'] || opts['thettaStart'] || 0
      const thetaLength = opts['縦長'] || opts['thetaLength'] || (Math.PI * 2)
      const isBuffered = opts['バッファ'] || opts['buffer'] || false
      // @ts-ignore
      if (isBuffered && typeof three.SphereBufferGeometry !== 'undefined') {
        // @ts-ignore
        return new three.SphereBufferGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thettaStart, thetaLength)
      }
      return new three.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thettaStart, thetaLength)
    }
  },
  'TJSシリンダ体作成': { // @シリンダのジオメトリを作成して返す // @TJSしりんだたいさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.CylinderGeometry {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const radiusTop = opts['上半径'] || opts['天半径'] || opts['radiusTop'] || opts['半径'] || opts['R'] || opts['radius'] || 1.0
      const radiusBottom = opts['下半径'] || opts['底半径'] || opts['radiusBottom'] || opts['半径'] || opts['R'] || opts['radius'] || 1.0
      const height = opts['高'] || opts['縦'] || opts['height'] || 1.0
      const radialSegments = opts['円分割数'] || opts['radialSegments'] || 8
      const heightSegments = opts['縦分割数'] || opts['heightSegments'] || 1
      const openEnd = !!(opts['上下開放'] || opts['openEnd'] || false)
      const thetaStart = opts['円開始位置'] || opts['thetaStart'] || 0
      const thetaLength = opts['円長'] || opts['thetaLength'] || (Math.PI * 2)
      const isBuffered = opts['バッファ'] || opts['buffer'] || false
      // @ts-ignore
      if (isBuffered && typeof three.CylinderBufferGeometry !== 'undefined') {
        // @ts-ignore
        return new three.CylinderBufferGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnd, thetaStart, thetaLength)
      }
      return new three.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnd, thetaStart, thetaLength)
    }
  },
  // @マテリアル(質感)
  'TJS基本表面材質作成': { // @mesh用の光源に因らない基本的なmateriaを作成して返す // @TJSきほんひょうめんざしつさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.MeshBasicMaterial {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.MeshBasicMaterial(opts)
    }
  },
  'TJS拡散反射材質作成': { // @mesh用の光沢を除く拡散反射するmaterialを作成して返す // @TJSかくさんはんしゃざしつさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.MeshLambertMaterial {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.MeshLambertMaterial(opts)
    }
  },
  'TJS光沢拡散反射材質作成': { // @mesh用の光沢を含む拡散反射するmaterialを作成して返す // @TJSこうたくかくさんはんしゃざしつさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.MeshPhongMaterial {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.MeshPhongMaterial(opts)
    }
  },
  'TJS標準材質作成': { // @mesh用の標準的な機能を網羅したmateriaを作成して返す // @TJSひょうじゅんざしつさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.MeshStandardMaterial {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.MeshStandardMaterial(opts)
    }
  },
  'TJSシェーダ材質作成': { // @mesh用のシェーダを使用したmateriaを作成して返す // @TJSしぇーだざしつさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.ShaderMaterial {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.ShaderMaterial(opts)
    }
  },
  // @メッシュ(質感＋構造)
  'TJSメッシュ作成': { // @meshを作成して返す // @TJSめっしゅさくせい
    type: 'func',
    josi: [['と'], ['の']],
    pure: true,
    fn: function (geo: THREENS.BufferGeometry, mat: THREENS.Material, sys: NakoSystem): THREENS.Mesh {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.Mesh(geo, mat)
    }
  },
  'TJS点メッシュ作成': { // @Point用のmeshを作成して返す // @TJSてんめっしゅさくせい
    type: 'func',
    josi: [['と'], ['の']],
    pure: true,
    fn: function (geo: THREENS.BufferGeometry, mat: THREENS.Material, sys: NakoSystem): THREENS.Points {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.Points(geo, mat)
    }
  },
  // @テクスチャ
  'TJSテクスチャローダ作成': { // @テクスチャのローダを作成して返す // @TJSてくすちゃろーださくせい
    type: 'func',
    josi: [['を', 'の', 'で']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.TextureLoader {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const path = opts['パス'] || opts['path'] || undefined
      const loader = new three.TextureLoader()
      if (path) {
        loader.setPath(path)
      }
      return loader
    }
  },
  'TJSテクスチャ読込': { // @テクスチャを読み込んでそのテクスチャを返す // @TJSてくすしゃよみこみ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.Texture {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const path = opts['パス'] || opts['path'] || undefined
      const url = opts['URL'] || opts['url'] || ''
      if (typeof url !== 'string') {
        throw new Error('画像のURLを１つ指定してください')
      }
      const ctl = new three.TextureLoader()
      if (path) {
        ctl.setPath(path)
      }
      return ctl.load(url)
    }
  },
  'TJSテクスチャ保障読込': { // @テクスチャを読み込むPromiseを返す // @TJSてくすしゃほしょうよみこみ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): Promise<THREENS.Texture> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const path = opts['パス'] || opts['path'] || undefined
      const url = opts['URL'] || opts['url'] || ''
      if (typeof url !== 'string') {
        throw new Error('画像のURLを１つ指定してください')
      }
      const ctl = new three.TextureLoader()
      if (path) {
        ctl.setPath(path)
      }
      return ctl.loadAsync(url)
    },
    return_none: false
  },
  'TJS立方体テクスチャ読込': { // @立方体状のテクスチャを読み込んでそのテクスチャを返す // @TJSりっぽうたいてくすしゃよみこみ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<string>, sys: NakoSystem): THREENS.CubeTexture {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const path = opts['パス'] || opts['path'] || undefined
      const url = opts['URL'] || opts['url']
      if (!Array.isArray(url) || url.length !== 6) {
        throw new Error('画像のURLを配列で6個指定してください(URL:[url1,url2,url3,url4,url5,url6])')
      }
      const ctl = new three.CubeTextureLoader()
      if (path) {
        ctl.setPath(path)
      }
      return ctl.load(url)
    }
  },
  'TJS立方体テクスチャ保障読込': { // @立方体状のテクスチャを読み込むPromiseを返す // @TJSりっぽうたいてくすしゃほしょうよみこみ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<string>, sys: NakoSystem): Promise<THREENS.CubeTexture> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const path = opts['パス'] || opts['path'] || undefined
      const url = opts['URL'] || opts['url']
      if (!Array.isArray(url) || url.length !== 6) {
        throw new Error('画像のURLを配列で6個指定してください(URL:[url1,url2,url3,url4,url5,url6])')
      }
      const ctl = new three.CubeTextureLoader()
      if (path) {
        ctl.setPath(path)
      }
      return ctl.loadAsync(url)
    }
  },
  'TJSキャンバステクスチャ作成': { // @キャンバスからテクスチャを作成してそのテクスチャを返す // @TJSきゃんばすてくすちゃさくせい
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem) {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const canvas = opts['キャンバス'] || opts['CANVAS'] || opts['canvas'] || undefined
      if (typeof canvas === 'undefined') {
        throw new Error('キャンバスを指定して下さい')
      }
      return new three.CanvasTexture(canvas)
    },
    return_none: false
  },
  'TJS読込': { // @なんらかのローダを使用して指定したURLから読み込んで返す // @TJSよみこみ
    type: 'func',
    josi: [['から'], ['を']],
    pure: true,
    fn: function (loader: THREENS.Loader, url: string, sys: NakoSystem): any {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new Promise((resolve) => {
        loader.load(url, resolve)
      })
    }
  },
  'TJS保障読込': { // @なんらかのローダを使用して指定したURLから読み込むPromiseを返す // @TJSほしょうよみこみ
    type: 'func',
    josi: [['から'], ['を']],
    pure: true,
    fn: function (loader: THREENS.Loader, url: string, sys: NakoSystem): Promise<any> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return loader.loadAsync(url)
    }
  },
  // @フォッグ
  'TJSフォッグ作成': { // @霧の効果を作成して返す // @TJSふぉっぐさくせい
    type: 'func',
    josi: [['で'], ['から'], ['までの']],
    pure: true,
    fn: function (color: number, near: number, far: number, sys: NakoSystem): THREENS.Fog {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.Fog(color, near, far)
    }
  },
  // @レイキャスタ
  'TJSレイキャスタ作成': { // @レイキャスターを作成して返す // @TJSれいきゃすたーさくせい
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (sys: NakoSystem): THREENS.Raycaster {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.Raycaster()
    }
  },
  'TJSカメラ起点レイ': { // @レイキャスタをカメラからの視点で設定する // @TJSかめらどうき
    type: 'func',
    josi: [['で'], ['に', 'を'], ['から']],
    pure: true,
    fn: function (raycaster: THREENS.Raycaster, coords: THREENS.Vector2|{x:number, y:number}|[number, number], camera: THREENS.Camera, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      let V: THREENS.Vector2
      if (coords instanceof three.Vector2) {
        V = coords
      } else
        if ('x' in coords && 'y' in coords) {
          V = new three.Vector2(coords.x, coords.y)
        } else
          if (Array.isArray(coords) && coords.length === 2) {
            V = new three.Vector2(coords[0], coords[1])
          } else {
            throw new Error('レイを飛ばす位置を-1.0から+1.0に正規化した要素２個の配列で指定して下さい')
          }
      raycaster.setFromCamera(V, camera)
    },
    return_none: true
  },
  'TJSレイ命中取得': { // @対象に対しレイキャスターのレイがヒットした情報を配列で返す // @TJSれいめいちゅうしゅとく
    type: 'func',
    josi: [['で'], ['に']],
    pure: true,
    fn: function (raycaster: THREENS.Raycaster, obj: any, sys: NakoSystem): Array<any> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return raycaster.intersectObject(obj)
    }
  },
  'TJSレイ命中一覧取得': { // @リストの中のレイキャスターのレイがヒットした情報を配列で返す // @TJSれいめいちゅういちらんしゅとく
    type: 'func',
    josi: [['で'], ['に']],
    pure: true,
    fn: function (raycaster: THREENS.Raycaster, lists: Array<any>, sys: NakoSystem): Array<any> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return raycaster.intersectObjects(lists)
    }
  },
  'TJSレイ原点取得': { // @レイキャスターのレイの原点(起点)を返す // @TJSれいげんてんしゅとく
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (raycaster: THREENS.Raycaster, sys: NakoSystem): THREENS.Vector3 {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return raycaster.ray.origin
    }
  },
  'TJSレイ方向取得': { // @レイキャスターのレイの方向を返す // @TJSれいほうこうしゅとく
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (raycaster: THREENS.Raycaster, sys: NakoSystem): THREENS.Vector3 {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return raycaster.ray.direction
    }
  },
  // @アニメーション
  'TJSアニメーションミキサー作成': { // @指定したモデルのアニメーションミキサーを作成して返す // @TJSあにめーしょんみきさーさくせい
    type: 'func',
    josi: [['の', 'から']],
    pure: true,
    fn: function (model: any, sys: NakoSystem): THREENS.AnimationMixer {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return new three.AnimationMixer(model)
    }
  },
  'TJSクリップアクション取得': { // @ミキサーから指定のクリップのアクションを取得する // @TJSくりっぷあくしょんしゅとく
    type: 'func',
    josi: [['から'], ['の']],
    pure: true,
    fn: function (mixer: THREENS.AnimationMixer, clip: string|THREENS.AnimationClip, sys: NakoSystem): THREENS.AnimationAction {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      return mixer.clipAction(clip as THREENS.AnimationClip)
    }
  },
  'TJSアクション比重設定': { // @アクションに対して比重を設定する // @TJSあくしょんひじゅうせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (act: THREENS.AnimationAction, w: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      act.setEffectiveWeight(w)
    },
    return_none: true
  },
  'TJSアクション再生時間倍率設定': { // @アクションに再生する時間の倍率を設定する // @TJSあくしょんさいせいじかんばんりつせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (act: THREENS.AnimationAction, w: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      act.setEffectiveTimeScale(w)
    },
    return_none: true
  },
  'TJSアクション再生': { // @指定したアクションの再生を開始する // @TJSあくしょんさいせい
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (act: THREENS.AnimationAction, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      act.play()
    },
    return_none: true
  },
  'TJSアクション停止': { // @指定したアクションを停止する // @TJSあくしょんていし
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (act: THREENS.AnimationAction, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      act.stop()
    },
    return_none: true
  },
  // @ローダー
  'TJSGLTFローダ作成': { // @glTF形式のモデル用のローダを返す // @TJSGLTFろーださくせい
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREEEXT.GLTFLoader {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.GLTFLoader === 'undefined') {
        throw new Error('GLTFLoader.jsが読み込まれていません')
      }
      const path = opts['パス'] || opts['path'] || undefined
      const draco = opts['DRACO'] || opts['draco'] || undefined
      const loader = new threeExt.GLTFLoader()
      if (path) {
        loader.setPath(path)
      }
      if (draco) {
        loader.setDRACOLoader(draco)
      }
      return loader
    }
  },
  'TJSGLTF保障読込': { // @glTF形式のモデルを読み込むPromiseを返す // @TJSGLTFほしょうよみこみ
    type: 'func',
    josi: [['を']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): Promise<any> {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.GLTFLoader === 'undefined') {
        throw new Error('GLTFLoader.jsが読み込まれていません')
      }
      const path = opts['パス'] || opts['PATH'] || opts['path'] || undefined
      const url = opts['URL'] || opts['url'] || ''
      const draco = opts['DRACO'] || opts['draco'] || undefined
      if (typeof url !== 'string') {
        throw new Error('glTFモデルのURLを１つ指定してください')
      }
      const loader = new threeExt.GLTFLoader()
      if (path) {
        loader.setPath(path)
      }
      if (draco) {
        loader.setDRACOLoader(draco)
      }
      return loader.loadAsync(url)
    }
  },
  'TJSMD2複合キャラクタローダ作成': { // @MD2形式の複合キャラクタのモデル用のローダを返す // @TJSMD2ふくごうきゃらくたろーださくせい
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys: NakoSystem): THREEEXT.MD2CharacterComplex {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.MD2CharacterComplex === 'undefined') {
        throw new Error('MD2CharacterComplex.jsが読み込まれていません')
      }
      return new threeExt.MD2CharacterComplex()
    }
  },
  // @コントローラ
  'TJS衛星軌道コントローラ作成': { // @OrbitControlerを作成して返す // @TJSえいせいきどうこんとろーらさくせい
    type: 'func',
    josi: [['に'], ['の']],
    pure: true,
    fn: function (camera: THREENS.Camera, dom: Element|THREENS.WebGLRenderer, sys: NakoSystem): THREEEXT.OrbitControls {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.OrbitControls === 'undefined') {
        throw new Error('OrbitControls.jsが読み込まれていません')
      }
      if (dom instanceof three.WebGLRenderer) {
        dom = dom.domElement
      }
      return new threeExt.OrbitControls(camera, dom as Element)
    }
  },
  'TJS一人称視点コントローラ作成': { // @FirstPersonControlsを作成して返す // @TJSいちにんしょうしてんこんとろーらさくせい
    type: 'func',
    josi: [['に'], ['の']],
    pure: true,
    fn: function (camera: THREENS.Camera, dom: Element|THREENS.WebGLRenderer, sys): THREEEXT.FirstPersonControls {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.FirstPersonControls === 'undefined') {
        throw new Error('FirstPersonControls.jsが読み込まれていません')
      }
      if (dom instanceof three.WebGLRenderer) {
        dom = dom.domElement
      }
      return new threeExt.FirstPersonControls(camera, dom as Element)
    }
  },
  'TJS飛行視点コントローラ作成': { // @FlyControlsを作成して返す // @TJSひこうしてんこんとろーらさくせい
    type: 'func',
    josi: [['に'], ['の']],
    pure: true,
    fn: function (camera: THREENS.Camera, dom: Element|THREENS.WebGLRenderer, sys: NakoSystem): THREEEXT.FlyControls {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const threeExt = weykthree.getThreeExt()
      if (typeof threeExt.FlyControls === 'undefined') {
        throw new Error('FlyControls.jsが読み込まれていません')
      }
      if (dom instanceof three.WebGLRenderer) {
        dom = dom.domElement
      }
      return new threeExt.FlyControls(camera, dom as Element)
    }
  },
  'TJS更新': { // @指定したなにかを更新(update)する // @TJSこうしん
    type: 'func',
    josi: [['の', 'を'], ['で']],
    pure: true,
    fn: function (control: THREEEXT.Controls, delta: number, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      control.update(delta)
    },
    return_none: true
  },
  // @効果
  'TJS両目効果作成': { // @StereoEffectを作成して返す // @TJSりょうめこうかさくせい
    type: 'func',
    josi: [['に']],
    pure: true,
    fn: function (renderer: THREENS.WebGLRenderer, sys: NakoSystem): THREEEXT.StereoEffect {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const treeExt = weykthree.getThreeExt()
      if (typeof treeExt.StereoEffect === 'undefined') {
        throw new Error('StereoEffect.jsが読み込まれていません')
      }
      return new treeExt.StereoEffect(renderer)
    }
  },
  // @ヘルパ
  'TJS軸線ヘルパ作成': { // @長さがlenのAxesHelperを作成して返す // @TJSじくせんへるぱさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (len: number, sys: NakoSystem): THREENS.AxesHelper {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof three.AxesHelper === 'undefined') {
        throw Error('AXESヘルパの機能が見当たりません。')
      }
      return new three.AxesHelper(len)
    }
  },
  'TJSグリッドヘルパ作成': { // @GridHelperを作成して返す // @TJSぐりっどへるぱさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.GridHelper {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof three.GridHelper === 'undefined') {
        throw Error('Gridヘルパの機能が見当たりません。')
      }
      const size = opts['サイズ'] || opts['範囲'] || opts['size'] || 10
      const divisions = opts['分割数'] || opts['divisions'] || 10
      const colorCenterLine = opts['軸線色'] || opts['colorCenterLine'] || 0x444444
      const colorGrid = opts['グリッド色'] || opts['colorGrid'] || 0x88888
      return new three.GridHelper(size, divisions, colorCenterLine, colorGrid)
    }
  },
  'TJS矢印ヘルパ作成': { // @起点とベクターを指定して矢印を用事するArrowHelperを作成して返す // @TJSやじるしへるぱさくせい
    type: 'func',
    josi: [['の']],
    pure: true,
    fn: function (opts: NakoOpts<any>, sys: NakoSystem): THREENS.ArrowHelper {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      if (typeof three.ArrowHelper === 'undefined') {
        throw Error('ARROWヘルパの機能が見当たりません。')
      }
      const dir = opts['方向'] || opts['向き'] || opts['向'] || opts['dir'] || new three.Vector3(0, 0, 1)
      const origin = opts['起点'] || opts['原点'] || opts['origin'] || new three.Vector3(0, 0, 0)
      const color = opts['色'] || opts['color'] || 0xffff00
      const len = opts['長さ'] || opts['長'] || opts['length'] || 1
      return new three.ArrowHelper(dir, origin, len, color)
    }
  },
  'TJS矢印方向設定': { // @矢印ヘルパの方向を設定する // @TJSやじるしほうこうせってい
    type: 'func',
    josi: [['に'], ['を']],
    pure: true,
    fn: function (helper: THREENS.ArrowHelper, dir: THREENS.Vector3, sys: NakoSystem):void {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      helper.setDirection(dir)
    },
    return_none: true
  },
  'TJSスケルトン付複製': { // @SkeletonUtilの機能でObject3Dをボーン込みで複製して返す // @TJSすけるとんつきふくせい
    type: 'func',
    josi: [['の', 'を', 'から']],
    pure: true,
    fn: function (obj: THREENS.Object3D, sys: NakoSystem): THREENS.Object3D {
      const [weykthree, three] = WeykThreeSystem.getEnv(sys)
      const treeExt = weykthree.getThreeExt()
      if (typeof treeExt.SkeletonUtils === 'undefined') {
        throw Error('スケルトンユーティリティの機能が見当たりません。')
      }
      return treeExt.SkeletonUtils.clone(obj)
    },
    return_none: false
  }
}

export default PluginWeykThree

// ブラウザからscriptタグで取り込んだ時、自動で登録する
if (typeof navigator === 'object' && typeof navigator.nako3 === 'object') {
  navigator.nako3.addPluginObject('PluginWeykThree', PluginWeykThree)
}
