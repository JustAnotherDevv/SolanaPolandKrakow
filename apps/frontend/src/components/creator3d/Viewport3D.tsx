import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Scene3D } from '@/stores/creatorStore'

interface Viewport3DProps {
  scene?: Scene3D
  code?: string
  playing: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
}

interface GameInstance {
  start?(): void
  destroy?(): void
}

const GEO_MAP: Record<string, () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 16, 16),
  capsule: () => new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  plane: () => new THREE.PlaneGeometry(1, 1),
}

export function Viewport3D({ scene, code, playing, selectedId, onSelect }: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const threeSceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number>(0)
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const gameInstanceRef = useRef<GameInstance | null>(null)

  // ─── Init renderer (once) ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500)
    camera.position.set(15, 12, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const threeScene = new THREE.Scene()
    threeScene.background = new THREE.Color('#0d0d1a')
    threeSceneRef.current = threeScene

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2
    controls.maxDistance = 200
    controlsRef.current = controls

    // Grid helper
    const grid = new THREE.GridHelper(100, 50, 0x223344, 0x1a2233)
    threeScene.add(grid)

    // Default ambient + directional
    const ambient = new THREE.AmbientLight(0x404060, 0.5)
    threeScene.add(ambient)
    const sun = new THREE.DirectionalLight(0xffffff, 1)
    sun.position.set(20, 30, 20)
    sun.castShadow = true
    threeScene.add(sun)

    // Resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    // Render loop
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      controls.update()
      renderer.render(threeScene, camera)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
      rendererRef.current = null
    }
  }, [])

  // ─── Rebuild scene objects from JSON ────────────────────────────────────────
  const rebuildScene = useCallback(() => {
    const threeScene = threeSceneRef.current
    if (!threeScene) return

    // Remove old object meshes
    meshMapRef.current.forEach((mesh) => threeScene.remove(mesh))
    meshMapRef.current.clear()

    if (!scene) return

    // Update sky + fog
    const sky = new THREE.Color(scene.settings.skyColor)
    threeScene.background = sky
    if (scene.settings.fog) {
      threeScene.fog = new THREE.Fog(
        scene.settings.fog.color,
        scene.settings.fog.near,
        scene.settings.fog.far,
      )
    } else {
      threeScene.fog = null
    }

    scene.objects.forEach((obj) => {
      if (obj.type === 'DirectionalLight') {
        const color = (obj.controller?.color as string) ?? '#ffffff'
        const intensity = (obj.controller?.intensity as number) ?? 1
        const light = new THREE.DirectionalLight(color, intensity)
        light.position.set(obj.position.x, obj.position.y, obj.position.z)
        threeScene.add(light)
        // Store as "mesh" for selection highlighting
        const helper = new THREE.DirectionalLightHelper(light, 1)
        threeScene.add(helper)
        return
      }
      if (obj.type === 'PointLight') {
        const color = (obj.controller?.color as string) ?? '#ffffff'
        const intensity = (obj.controller?.intensity as number) ?? 1
        const distance = (obj.controller?.distance as number) ?? 30
        const light = new THREE.PointLight(color, intensity, distance)
        light.position.set(obj.position.x, obj.position.y, obj.position.z)
        threeScene.add(light)
        return
      }
      if (obj.type === 'GameController' || obj.type === 'Trigger') {
        // Invisible objects — render a wireframe box as editor hint
        const geo = new THREE.BoxGeometry(1, 1, 1)
        const mat = new THREE.MeshBasicMaterial({ color: 0x444466, wireframe: true })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
        mesh.userData.objectId = obj.id
        threeScene.add(mesh)
        meshMapRef.current.set(obj.id, mesh)
        return
      }

      if (!obj.mesh) return

      const geoFn = GEO_MAP[obj.mesh.geometry] ?? GEO_MAP.box
      const geo = geoFn()
      const mat = new THREE.MeshLambertMaterial({ color: obj.mesh.color })
      const mesh = new THREE.Mesh(geo, mat)

      mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
      mesh.rotation.set(
        THREE.MathUtils.degToRad(obj.rotation.x),
        THREE.MathUtils.degToRad(obj.rotation.y),
        THREE.MathUtils.degToRad(obj.rotation.z),
      )
      mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.objectId = obj.id
      threeScene.add(mesh)
      meshMapRef.current.set(obj.id, mesh)
    })
  }, [scene])

  useEffect(() => {
    rebuildScene()
  }, [rebuildScene])

  // ─── Selection highlight ─────────────────────────────────────────────────────
  useEffect(() => {
    meshMapRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshLambertMaterial
      if (mat.emissive) {
        mat.emissive.set(id === selectedId ? 0x334422 : 0x000000)
      }
    })
  }, [selectedId])

  // ─── Click to select ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (playing) return
    const container = containerRef.current
    const renderer = rendererRef.current
    const camera = cameraRef.current
    const threeScene = threeSceneRef.current
    if (!container || !renderer || !camera || !threeScene) return

    const rect = container.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const meshes = Array.from(meshMapRef.current.values())
    const hits = raycaster.intersectObjects(meshes)
    if (hits.length > 0) {
      const id = hits[0].object.userData.objectId as string
      onSelect(id)
    } else {
      onSelect(null)
    }
  }, [playing, onSelect])

  // ─── Play mode ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const controls = controlsRef.current
    const threeScene = threeSceneRef.current
    const renderer = rendererRef.current
    const container = containerRef.current

    if (playing && code && container && renderer && threeScene) {
      // Disable orbit controls during play
      if (controls) controls.enabled = false

      // Inject THREE globally then run game
      ;(window as unknown as Record<string, unknown>).THREE = THREE
      try {
        const factory = new Function('container', 'sdk', `
          ${code}
          if (typeof Game3D === 'undefined') throw new Error('Game3D class not found')
          return new Game3D(container, sdk)
        `)
        const sdk = {
          updateScore: () => {},
          endGame: () => {},
          updateLives: () => {},
          achievement: () => {},
        }
        const instance = factory(container, sdk) as GameInstance
        instance.start?.()
        gameInstanceRef.current = instance
      } catch (err) {
        console.error('3D game error:', err)
        if (controls) controls.enabled = true
      }
    } else {
      // Stop game
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy?.()
        gameInstanceRef.current = null
      }
      if (controls) controls.enabled = true
      // Rebuild editor scene
      rebuildScene()
    }
  }, [playing, code, rebuildScene])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0d0d1a] overflow-hidden"
      onClick={handleClick}
    >
      {!scene && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[9px] text-white/15 font-light">Describe your game — AI will build the scene</p>
        </div>
      )}
    </div>
  )
}
