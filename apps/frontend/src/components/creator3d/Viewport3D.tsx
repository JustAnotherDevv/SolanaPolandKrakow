import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls }    from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js'
import { OutlinePass }      from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js'
import type { Scene3D, SceneObject } from '@/stores/creatorStore'

interface Viewport3DProps {
  scene?: Scene3D
  code?: string
  playing: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPlayError?: (err: string) => void
  onStop?: () => void
  transformMode?: 'translate' | 'rotate' | 'scale'
  onTransformChange?: (id: string, patch: Partial<SceneObject>) => void
}

interface GameInstance { start?(): void; destroy?(): void }

const GEO: Record<string, () => THREE.BufferGeometry> = {
  box:      () => new THREE.BoxGeometry(1, 1, 1),
  sphere:   () => new THREE.SphereGeometry(0.5, 16, 12),
  capsule:  () => new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  plane:    () => new THREE.PlaneGeometry(1, 1),
}

// ─── Cartoon / Toon shader ────────────────────────────────────────────────────
const CartoonShader = {
  uniforms: {
    tDiffuse:   { value: null },
    saturation: { value: 1.55 },
    steps:      { value: 10.0 },
    vigStrength:{ value: 0.55 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float steps;
    uniform float vigStrength;
    varying vec2 vUv;
    vec3 quantize(vec3 c, float s) { return floor(c * s + 0.5) / s; }
    vec3 boostSat(vec3 c, float s) {
      float lum = dot(c, vec3(0.299,0.587,0.114));
      return mix(vec3(lum), c, s);
    }
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 col = boostSat(t.rgb, saturation);
      col = quantize(col, steps);
      vec2 uv2 = vUv - 0.5;
      col *= 1.0 - dot(uv2, uv2) * vigStrength;
      gl_FragColor = vec4(col, t.a);
    }
  `,
}

export function Viewport3D({
  scene, code, playing, selectedId, onSelect, onPlayError, onStop,
  transformMode = 'translate', onTransformChange,
}: Viewport3DProps) {
  const editorDivRef = useRef<HTMLDivElement>(null)
  const gameDivRef   = useRef<HTMLDivElement>(null)

  const rendererRef          = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef          = useRef<EffectComposer | null>(null)
  const sceneRef             = useRef<THREE.Scene | null>(null)
  const cameraRef            = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef          = useRef<OrbitControls | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const rafRef               = useRef<number>(0)
  const meshMapRef           = useRef<Map<string, THREE.Mesh>>(new Map())
  // Track lights/helpers added to scene (not in meshMap) so we can clean them up
  const sceneExtrasRef       = useRef<THREE.Object3D[]>([])
  const gameRef              = useRef<GameInstance | null>(null)
  const playingRef           = useRef(false)
  const isDraggingRef        = useRef(false)

  // ─── Init renderer + composer + TransformControls ─────────────────────────
  useEffect(() => {
    const div = editorDivRef.current
    if (!div) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    div.appendChild(renderer.domElement)
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
    rendererRef.current = renderer

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800)
    camera.position.set(22, 16, 28)
    camera.lookAt(0, 2, 0)
    cameraRef.current = camera

    const threeScene = new THREE.Scene()
    threeScene.background = new THREE.Color('#0e0e14')
    sceneRef.current = threeScene

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.minDistance = 1.5
    controls.maxDistance = 400
    controls.target.set(0, 1, 0)
    controlsRef.current = controls

    // Base scene objects (always present)
    threeScene.add(new THREE.GridHelper(200, 80, 0x1a2030, 0x141820))
    threeScene.add(new THREE.AmbientLight(0x304050, 0.6))
    const sun = new THREE.DirectionalLight(0xfff0e0, 1.4)
    sun.position.set(30, 60, 20)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 400
    sun.shadow.camera.left = sun.shadow.camera.bottom = -80
    sun.shadow.camera.right = sun.shadow.camera.top = 80
    threeScene.add(sun)
    const fill = new THREE.DirectionalLight(0x2040a0, 0.3)
    fill.position.set(-20, 10, -20)
    threeScene.add(fill)

    // EffectComposer — default: plain render
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(threeScene, camera))
    composer.addPass(new OutputPass())
    composerRef.current = composer

    // TransformControls
    const tc = new TransformControls(camera, renderer.domElement)
    tc.addEventListener('dragging-changed', (e) => {
      const ev = e as unknown as { value: boolean }
      isDraggingRef.current = ev.value
      if (controlsRef.current) controlsRef.current.enabled = !ev.value
    })
    tc.addEventListener('objectChange', () => {
      const obj = tc.object as THREE.Mesh | undefined
      if (!obj?.userData?.objectId) return
      onTransformChange?.(obj.userData.objectId as string, {
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(obj.rotation.x),
          y: THREE.MathUtils.radToDeg(obj.rotation.y),
          z: THREE.MathUtils.radToDeg(obj.rotation.z),
        },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      })
    })
    threeScene.add(tc as unknown as THREE.Object3D)
    transformControlsRef.current = tc

    // Resize
    const sizeRenderer = () => {
      const w = div.clientWidth, h = div.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      composer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    sizeRenderer()
    const ro = new ResizeObserver(sizeRenderer)
    ro.observe(div)

    // Render loop — always use composer
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) { controls.update(); composer.render() }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      controls.dispose()
      tc.detach(); tc.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
      composerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Rebuild composer passes when PostFX objects change ───────────────────
  const rebuildComposer = useCallback(() => {
    const composer = composerRef.current
    const threeScene = sceneRef.current
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!composer || !threeScene || !camera || !renderer) return

    // Clear all passes
    while (composer.passes.length > 0) composer.removePass(composer.passes[0])
    composer.addPass(new RenderPass(threeScene, camera))

    const postfxObj = scene?.objects.find(o => o.type === 'PostFX')
    const preset = (postfxObj?.controller?.preset as string | undefined) ?? 'none'

    if (preset === 'toon' || preset === 'outline') {
      const strength  = (postfxObj?.controller?.outlineStrength  as number) ?? 3.5
      const thickness = (postfxObj?.controller?.outlineThickness as number) ?? 1.5
      const op = new OutlinePass(
        new THREE.Vector2(renderer.domElement.width || 800, renderer.domElement.height || 600),
        threeScene, camera
      )
      op.edgeStrength  = strength
      op.edgeThickness = thickness
      op.edgeGlow      = 0
      op.pulsePeriod   = 0
      op.visibleEdgeColor.set('#1a1a1a')
      op.hiddenEdgeColor.set('#1a1a1a')
      op.selectedObjects = Array.from(meshMapRef.current.values())
      composer.addPass(op)
    }

    if (preset === 'toon') {
      const sat = (postfxObj?.controller?.saturation      as number) ?? 1.55
      const st  = (postfxObj?.controller?.quantizeSteps   as number) ?? 10
      const vig = (postfxObj?.controller?.vignetteStrength as number) ?? 0.55
      const cp = new ShaderPass(CartoonShader)
      cp.uniforms.saturation.value = sat
      cp.uniforms.steps.value      = st
      cp.uniforms.vigStrength.value = vig
      composer.addPass(cp)
    }

    composer.addPass(new OutputPass())
  }, [scene?.objects])

  // ─── Build scene from JSON ────────────────────────────────────────────────
  const rebuildScene = useCallback(() => {
    const s = sceneRef.current
    if (!s) return

    // Remove previously added user objects (meshes + lights/helpers)
    meshMapRef.current.forEach(m => { s.remove(m); m.geometry.dispose() })
    meshMapRef.current.clear()
    sceneExtrasRef.current.forEach(o => s.remove(o))
    sceneExtrasRef.current = []

    if (!scene) return

    // Apply sky / fog from settings (baseline)
    s.background = new THREE.Color(scene.settings.skyColor)
    s.fog = scene.settings.fog
      ? new THREE.Fog(scene.settings.fog.color, scene.settings.fog.near, scene.settings.fog.far)
      : null

    scene.objects.forEach(obj => {
      // ── Config-only types (no mesh, affect scene globally) ─────────────────
      if (obj.type === 'Sky') {
        const color = (obj.controller?.color as string) ?? '#0d1117'
        s.background = new THREE.Color(color)
        return
      }
      if (obj.type === 'Fog') {
        const color   = (obj.controller?.color   as string)  ?? '#0d1117'
        const fogType = (obj.controller?.fogType as string)  ?? 'exp2'
        if (fogType === 'linear') {
          const near = (obj.controller?.near as number) ?? 10
          const far  = (obj.controller?.far  as number) ?? 200
          s.fog = new THREE.Fog(color, near, far)
        } else {
          const density = (obj.controller?.density as number) ?? 0.02
          s.fog = new THREE.FogExp2(color, density)
        }
        return
      }
      if (obj.type === 'PostFX') return  // handled by rebuildComposer

      // ── Lights ────────────────────────────────────────────────────────────
      if (obj.type === 'AmbientLight') {
        const l = new THREE.AmbientLight(
          (obj.controller?.color as string) ?? '#ffffff',
          (obj.controller?.intensity as number) ?? 0.8
        )
        s.add(l)
        sceneExtrasRef.current.push(l)
        // Small gizmo sphere for selection (not selectable via raycast but visible in hierarchy)
        const gizmo = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffd580, wireframe: true, transparent: true, opacity: 0.5 })
        )
        gizmo.position.set(0, 3, 0)
        gizmo.userData.objectId = obj.id
        s.add(gizmo)
        meshMapRef.current.set(obj.id, gizmo)
        return
      }
      if (obj.type === 'HemisphereLight') {
        const l = new THREE.HemisphereLight(
          (obj.controller?.skyColor    as string) ?? '#87ceeb',
          (obj.controller?.groundColor as string) ?? '#444040',
          (obj.controller?.intensity   as number) ?? 0.6
        )
        s.add(l)
        sceneExtrasRef.current.push(l)
        const helper = new THREE.HemisphereLightHelper(l, 1.5)
        s.add(helper)
        sceneExtrasRef.current.push(helper)
        const gizmo = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0x87ceeb, wireframe: true, transparent: true, opacity: 0.5 })
        )
        gizmo.position.set(0, 4, 0)
        gizmo.userData.objectId = obj.id
        s.add(gizmo)
        meshMapRef.current.set(obj.id, gizmo)
        return
      }
      if (obj.type === 'DirectionalLight') {
        const l = new THREE.DirectionalLight(
          (obj.controller?.color     as string) ?? '#ffffff',
          (obj.controller?.intensity as number) ?? 1
        )
        l.position.set(obj.position.x, obj.position.y, obj.position.z)
        l.castShadow = true
        s.add(l)
        sceneExtrasRef.current.push(l)
        const helper = new THREE.DirectionalLightHelper(l, 1.5)
        s.add(helper)
        sceneExtrasRef.current.push(helper)
        const gizmo = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.3),
          new THREE.MeshBasicMaterial({ color: 0xffe066, wireframe: false, transparent: true, opacity: 0.7 })
        )
        gizmo.position.set(obj.position.x, obj.position.y, obj.position.z)
        gizmo.userData.objectId = obj.id
        s.add(gizmo)
        meshMapRef.current.set(obj.id, gizmo)
        return
      }
      if (obj.type === 'PointLight') {
        const l = new THREE.PointLight(
          (obj.controller?.color     as string) ?? '#ffffff',
          (obj.controller?.intensity as number) ?? 1,
          (obj.controller?.distance  as number) ?? 40
        )
        l.position.set(obj.position.x, obj.position.y, obj.position.z)
        s.add(l)
        sceneExtrasRef.current.push(l)
        const helper = new THREE.PointLightHelper(l, 0.5)
        s.add(helper)
        sceneExtrasRef.current.push(helper)
        const gizmo = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.25),
          new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.7 })
        )
        gizmo.position.set(obj.position.x, obj.position.y, obj.position.z)
        gizmo.userData.objectId = obj.id
        s.add(gizmo)
        meshMapRef.current.set(obj.id, gizmo)
        return
      }
      if (obj.type === 'SpotLight') {
        const l = new THREE.SpotLight(
          (obj.controller?.color     as string) ?? '#ffffff',
          (obj.controller?.intensity as number) ?? 1.5,
          (obj.controller?.distance  as number) ?? 50,
          (obj.controller?.angle     as number) ?? 0.4,
          (obj.controller?.penumbra  as number) ?? 0.2
        )
        l.position.set(obj.position.x, obj.position.y, obj.position.z)
        l.castShadow = true
        s.add(l)
        sceneExtrasRef.current.push(l)
        const helper = new THREE.SpotLightHelper(l)
        s.add(helper)
        sceneExtrasRef.current.push(helper)
        const gizmo = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.5, 6),
          new THREE.MeshBasicMaterial({ color: 0xff9944, transparent: true, opacity: 0.7 })
        )
        gizmo.position.set(obj.position.x, obj.position.y, obj.position.z)
        gizmo.userData.objectId = obj.id
        s.add(gizmo)
        meshMapRef.current.set(obj.id, gizmo)
        return
      }

      // ── Regular mesh objects ───────────────────────────────────────────────
      const isLogic = !obj.mesh || obj.type === 'GameController' || obj.type === 'Trigger'
      const geo = isLogic ? new THREE.BoxGeometry(1, 1, 1) : (GEO[obj.mesh!.geometry] ?? GEO.box)()
      const mat = isLogic
        ? new THREE.MeshBasicMaterial({ color: obj.type === 'Trigger' ? 0x0055ff : 0x8888aa, wireframe: true, transparent: true, opacity: 0.4 })
        : new THREE.MeshStandardMaterial({ color: obj.mesh!.color, roughness: 0.65, metalness: 0.15 })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
      mesh.rotation.set(
        THREE.MathUtils.degToRad(obj.rotation.x),
        THREE.MathUtils.degToRad(obj.rotation.y),
        THREE.MathUtils.degToRad(obj.rotation.z),
      )
      mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
      mesh.castShadow = mesh.receiveShadow = true
      mesh.userData.objectId = obj.id
      s.add(mesh)
      meshMapRef.current.set(obj.id, mesh)
    })

    // Rebuild composer passes now that meshMapRef is updated
    rebuildComposer()
  }, [scene, rebuildComposer])

  useEffect(() => { if (!playingRef.current) rebuildScene() }, [rebuildScene])

  // ─── Reattach TC after rebuild ────────────────────────────────────────────
  useEffect(() => {
    const tc = transformControlsRef.current
    if (!tc || playing) return
    if (selectedId) {
      const mesh = meshMapRef.current.get(selectedId)
      if (mesh) tc.attach(mesh)
      else tc.detach()
    } else {
      tc.detach()
    }
  }, [selectedId, scene, playing])

  // ─── Transform mode ───────────────────────────────────────────────────────
  useEffect(() => {
    transformControlsRef.current?.setMode(transformMode)
  }, [transformMode])

  // ─── Selection highlight ──────────────────────────────────────────────────
  useEffect(() => {
    meshMapRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.emissive) mat.emissive.set(id === selectedId ? '#1a3a1a' : '#000000')
    })
  }, [selectedId])

  // ─── Click-to-select ─────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (playingRef.current || isDraggingRef.current) return
    const div = editorDivRef.current; const cam = cameraRef.current; const s = sceneRef.current
    if (!div || !cam || !s) return
    const r = div.getBoundingClientRect()
    const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    const rc = new THREE.Raycaster()
    rc.setFromCamera(mouse, cam)
    const hits = rc.intersectObjects(Array.from(meshMapRef.current.values()))
    onSelect(hits.length > 0 ? (hits[0].object.userData.objectId as string) : null)
  }, [onSelect])

  // ─── Play / Stop ─────────────────────────────────────────────────────────
  useEffect(() => {
    playingRef.current = playing
    const editorDiv = editorDivRef.current
    const gameDiv   = gameDivRef.current
    const orbit     = controlsRef.current
    const tc        = transformControlsRef.current

    if (playing && code && gameDiv && editorDiv) {
      if (tc) tc.detach()
      editorDiv.style.visibility = 'hidden'
      gameDiv.style.display = 'block'
      if (orbit) orbit.enabled = false
      // Inject THREE + postprocessing classes for game code
      const win = window as unknown as Record<string, unknown>
      win.THREE          = THREE
      win.EffectComposer = EffectComposer
      win.RenderPass     = RenderPass
      win.ShaderPass     = ShaderPass
      win.OutlinePass    = OutlinePass
      win.OutputPass     = OutputPass
      try {
        gameDiv.innerHTML = ''
        const factory = new Function('container', 'sdk', `'use strict'\n${code}\nif(typeof Game3D==='undefined')throw new Error('Game3D class not found')\nreturn new Game3D(container, sdk)`)
        const sdk = { updateScore: () => {}, endGame: () => {}, updateLives: () => {}, achievement: () => {} }
        const inst = factory(gameDiv, sdk) as GameInstance
        inst.start?.()
        gameRef.current = inst
        const canvas = gameDiv.querySelector('canvas')
        if (canvas) Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' })
      } catch (err) {
        editorDiv.style.visibility = 'visible'
        gameDiv.style.display = 'none'
        gameDiv.innerHTML = ''
        if (orbit) orbit.enabled = true
        onPlayError?.(err instanceof Error ? err.message : String(err))
      }
    } else {
      try { gameRef.current?.destroy?.() } catch { /**/ }
      gameRef.current = null
      if (gameDiv) { gameDiv.innerHTML = ''; gameDiv.style.display = 'none' }
      if (editorDiv) editorDiv.style.visibility = 'visible'
      if (orbit) orbit.enabled = true
      rebuildScene()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ background: '#0e0e14' }}
      onClick={handleClick}
    >
      <div ref={editorDivRef} style={{ position: 'absolute', inset: 0 }} />
      <div ref={gameDivRef} style={{ position: 'absolute', inset: 0, display: 'none', zIndex: 10 }} />

      {/* Empty hint */}
      {!scene && !playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
          <span style={{ fontSize: 11, color: '#2a2a38', letterSpacing: '0.04em' }}>
            Choose a template or describe your game below
          </span>
        </div>
      )}

      {/* Editor mode badge */}
      {!playing && scene && (
        <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none', zIndex: 2 }}>
          <span style={{ fontSize: 9, color: '#44444c', background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: 3, letterSpacing: '0.06em' }}>
            EDITOR  ·  Orbit: RMB/scroll  ·  Select: click  ·  Drag gizmo: transform
          </span>
        </div>
      )}

      {/* Playing badge + stop */}
      {playing && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.75)', border: '1px solid #3a1a1a', padding: '4px 12px 4px 10px', borderRadius: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f48771', display: 'inline-block', boxShadow: '0 0 8px #f48771' }} />
            <span style={{ fontSize: 10, color: '#f48771', fontWeight: 600, letterSpacing: '0.1em' }}>PLAYING</span>
            <button
              onClick={e => { e.stopPropagation(); onStop?.() }}
              style={{ marginLeft: 8, fontSize: 9, color: '#d4d4d4', background: '#3a1a1a', border: '1px solid #6a2a2a', padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}
            >
              ■ Stop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
