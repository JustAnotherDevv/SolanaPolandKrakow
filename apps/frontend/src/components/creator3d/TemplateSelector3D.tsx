import { motion } from 'motion/react'
import type { Scene3D } from '@/stores/creatorStore'

export interface GameTemplate3D {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  gradient: string
  icon: string
  prompt: string     // AI enhancement hint (used when user asks AI to modify)
  code?: string      // Pre-built Game3D code — instant play, no AI wait
  scene?: Scene3D    // Pre-built scene for editor view
}

// ─── Pre-built: Third Person Adventure ───────────────────────────────────────
const THIRD_PERSON_CODE = `
class Game3D {
  constructor(container, sdk) {
    this.c = container; this.sdk = sdk;
    this.W = container.clientWidth || 800; this.H = container.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1117');
    this.scene.fog = new THREE.FogExp2('#0d1117', 0.016);
    this.camera = new THREE.PerspectiveCamera(70, this.W / this.H, 0.1, 300);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.W, this.H); this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock(); this.keys = {}; this.score = 0; this.over = false;
    this._kd = e => { this.keys[e.code] = true; };
    this._ku = e => { delete this.keys[e.code]; };
    window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku);
    this._rs = () => { this.W = container.clientWidth; this.H = container.clientHeight; this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.W, this.H); };
    window.addEventListener('resize', this._rs);
    this._build(); this._hud();
  }

  _build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0x334466, 0.7));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.3);
    sun.position.set(20, 40, 15); sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
    sun.shadow.camera.right = sun.shadow.camera.top = 50;
    s.add(sun);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; s.add(gnd);
    s.add(new THREE.GridHelper(60, 30, 0x1e2e3e, 0x1e2e3e));
    const wm = new THREE.MeshLambertMaterial({ color: 0x334455 });
    [[10,1.5,0,1,3,8],[-10,1.5,5,1,3,6],[0,1.5,-12,12,3,1],[5,1.5,10,6,3,1],[-14,1.5,-4,1,3,10]].forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), wm);
      m.position.set(w[0],w[1],w[2]); m.scale.set(w[3],w[4],w[5]);
      m.castShadow = m.receiveShadow = true; s.add(m);
    });
    [[8,1.5,8,0x224488],[-8,1.5,5,0x882222],[0,1.5,-10,0x228844]].forEach(l => {
      const pl = new THREE.PointLight(l[3], 1.2, 18); pl.position.set(l[0],l[1],l[2]); s.add(pl);
      const lv = new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6),new THREE.MeshBasicMaterial({color:l[3]})); lv.position.copy(pl.position); s.add(lv);
    });
    this.player = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8), new THREE.MeshLambertMaterial({ color: 0x00dd88 }));
    this.player.position.set(0, 1.2, 0); this.player.castShadow = true; s.add(this.player);
    Object.assign(this.player, { vel: new THREE.Vector3(), health: 100, maxHealth: 100, grounded: false, yaw: 0, ac: 0 });
    this.enemies = [];
    [[8,0.8,6],[-8,0.8,3],[0,0.8,-8],[13,0.8,-4],[-4,0.8,-12]].forEach((ep, i) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), new THREE.MeshLambertMaterial({ color: 0xdd2222 }));
      e.position.set(ep[0], ep[1], ep[2]); e.castShadow = true; s.add(e);
      Object.assign(e, { health: 30, speed: 2 + i * 0.25, damage: 8, ac: 0, pb: e.position.clone(), pa: i * 1.26 });
      this.enemies.push(e);
    });
    this.pickups = [];
    [[4,0.4,7],[-6,0.4,0],[7,0.4,-7],[-12,0.4,3]].forEach(pp => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshLambertMaterial({ color: 0xff4466, emissive: 0x440011 }));
      m.position.set(pp[0], pp[1], pp[2]); s.add(m); m.active = true; this.pickups.push(m);
    });
    this.camera.position.set(0, 4, 8);
  }

  _hud() {
    this.hud = document.createElement('div');
    this.hud.style.cssText = 'position:absolute;top:0;left:0;right:0;padding:8px 12px;display:flex;justify-content:space-between;color:#fff;font:12px monospace;pointer-events:none;z-index:10;background:linear-gradient(#0009,transparent)';
    this.c.appendChild(this.hud);
    const ctrl = document.createElement('div');
    ctrl.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:#fff8;font:10px monospace;pointer-events:none;z-index:10;white-space:nowrap';
    ctrl.textContent = 'WASD/Arrows: Move · Q/E: Rotate · Space: Jump · F: Attack (melee)';
    this.c.appendChild(ctrl); this._ctrl = ctrl;
    this._rh();
  }

  _rh() {
    const alive = this.enemies.filter(e => e.health > 0).length;
    const hp = Math.max(0, Math.round(this.player ? this.player.health : 0));
    const hc = hp > 60 ? '#44ff88' : hp > 30 ? '#ffaa00' : '#ff4444';
    this.hud.innerHTML = '<span style="color:' + hc + '">HP: ' + hp + '</span><span style="color:#ffdd00;margin:0 16px">Score: ' + this.score + '</span><span style="color:#88aaff">Enemies: ' + alive + '</span>';
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (!this.over) { this._up(dt); this._rh(); }
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _up(dt) { this._mp(dt); this._uc(); this._ue(dt); this._pk(); this._cw(); }

  _mp(dt) {
    const p = this.player; const sp = 6;
    const f = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const r = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    p.position.addScaledVector(f, sp * dt);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  p.position.addScaledVector(f, -sp * dt);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  p.position.addScaledVector(r, -sp * dt);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) p.position.addScaledVector(r, sp * dt);
    if (this.keys['KeyQ']) p.yaw += 2.5 * dt;
    if (this.keys['KeyE']) p.yaw -= 2.5 * dt;
    p.rotation.y = p.yaw;
    p.vel.y -= 18 * dt; p.position.y += p.vel.y * dt;
    if (p.position.y <= 1.2) { p.position.y = 1.2; p.vel.y = 0; p.grounded = true; }
    if (this.keys['Space'] && p.grounded) { p.vel.y = 7; p.grounded = false; }
    p.position.x = Math.max(-29, Math.min(29, p.position.x));
    p.position.z = Math.max(-29, Math.min(29, p.position.z));
    p.ac = Math.max(0, p.ac - dt);
    if (this.keys['KeyF'] && p.ac <= 0) {
      p.ac = 0.5;
      this.enemies.forEach(e => {
        if (e.health > 0 && e.position.distanceTo(p.position) < 2.8) {
          e.health -= 25;
          const oc = e.material.color.getHex(); e.material.color.setHex(0xff8888);
          setTimeout(() => { if (e.health > 0 && e.material) e.material.color.setHex(oc); }, 120);
          if (e.health <= 0) { e.visible = false; this.score += 100; this.sdk.updateScore(this.score); }
        }
      });
    }
  }

  _uc() {
    const p = this.player;
    const off = new THREE.Vector3(Math.sin(p.yaw) * 5, 3, Math.cos(p.yaw) * 5);
    this.camera.position.lerp(p.position.clone().add(off), 0.12);
    this.camera.lookAt(p.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
  }

  _ue(dt) {
    this.enemies.forEach(e => {
      if (e.health <= 0) return;
      e.ac = Math.max(0, e.ac - dt);
      const d = e.position.distanceTo(this.player.position);
      if (d < 16) {
        const dir = this.player.position.clone().sub(e.position).normalize();
        e.position.addScaledVector(dir, e.speed * dt);
        e.lookAt(new THREE.Vector3(this.player.position.x, e.position.y, this.player.position.z));
        if (d < 1.6 && e.ac <= 0) { e.ac = 1.2; this.player.health -= e.damage; if (this.player.health <= 0) this._die(); }
      } else {
        e.pa += dt * 0.6;
        e.position.x = e.pb.x + Math.sin(e.pa) * 3;
        e.position.z = e.pb.z + Math.cos(e.pa) * 3;
      }
      e.position.y = 0.8;
    });
  }

  _pk() {
    this.pickups.forEach(p => {
      if (!p.active) return;
      if (p.position.distanceTo(this.player.position) < 1.4) {
        p.active = false; p.visible = false;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
      }
      p.rotation.y += 0.03;
      p.position.y = 0.4 + Math.sin(Date.now() * 0.002) * 0.12;
    });
  }

  _die() {
    this.player.health = this.player.maxHealth;
    this.player.position.set(0, 1.2, 0);
    this.score = Math.max(0, this.score - 50);
    this._msg('Respawned! -50pts', '#ff4444');
  }

  _cw() {
    if (!this._won && this.enemies.every(e => e.health <= 0)) {
      this._won = true; this.score += 500;
      this._msg('ALL ENEMIES DEFEATED! +500', '#44ff88');
      setTimeout(() => this.sdk.endGame(this.score), 2500);
    }
  }

  _msg(text, color) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font:bold 22px monospace;color:' + color + ';text-shadow:0 0 16px ' + color + ';pointer-events:none;z-index:20;text-align:center';
    el.textContent = text; this.c.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('resize', this._rs);
    [this.hud, this._ctrl].forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
`

// ─── Pre-built: First Person Shooter ─────────────────────────────────────────
const FPS_CODE = `
class Game3D {
  constructor(container, sdk) {
    this.c = container; this.sdk = sdk;
    this.W = container.clientWidth || 800; this.H = container.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a14');
    this.scene.fog = new THREE.Fog('#0a0a14', 18, 70);
    this.camera = new THREE.PerspectiveCamera(75, this.W / this.H, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.W, this.H); this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock(); this.keys = {}; this.score = 0; this.ammo = 30; this.maxAmmo = 30; this.over = false;
    this.yaw = 0; this.pitch = 0; this.ppos = new THREE.Vector3(0, 1.7, 0); this.pvel = new THREE.Vector3(); this.pgrounded = true;
    this._kd = e => { this.keys[e.code] = true; if (e.code === 'KeyR') this._reload(); if (e.code === 'Space') { e.preventDefault(); if (this.pgrounded) { this.pvel.y = 5.5; this.pgrounded = false; } } };
    this._ku = e => { delete this.keys[e.code]; };
    this._mm = e => { if (document.pointerLockElement === this.renderer.domElement) { this.yaw -= e.movementX * 0.002; this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - e.movementY * 0.002)); } };
    this._mc = e => { if (document.pointerLockElement === this.renderer.domElement && e.button === 0) this._shoot(); };
    this.renderer.domElement.addEventListener('click', () => this.renderer.domElement.requestPointerLock());
    window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku);
    window.addEventListener('mousemove', this._mm); window.addEventListener('mousedown', this._mc);
    this._rs = () => { this.W = container.clientWidth; this.H = container.clientHeight; this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.W, this.H); };
    window.addEventListener('resize', this._rs);
    this._build(); this._hud();
  }

  _build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0x223355, 0.5));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.8); sun.position.set(10, 20, 10); sun.castShadow = true; s.add(sun);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x111122 });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a3a4a });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = 4; s.add(ceil);
    [[0,2,-28,56,8,1],[0,2,28,56,8,1],[28,2,0,1,8,56],[-28,2,0,1,8,56]].forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), wallMat); m.position.set(w[0],w[1],w[2]); m.scale.set(w[3],w[4],w[5]); m.castShadow = m.receiveShadow = true; s.add(m);
    });
    [[7,1,0,1,2,4],[-7,1,0,1,2,4],[0,1,8,8,2,1],[0,1,-8,6,2,1],[12,1,10,1,2,6],[-12,1,10,1,2,6],[4,1,-15,4,2,1],[-4,1,-15,4,2,1]].forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), wallMat); m.position.set(w[0],w[1],w[2]); m.scale.set(w[3],w[4],w[5]); m.castShadow = m.receiveShadow = true; s.add(m);
    });
    [[8,2,8,0x224488],[-8,2,8,0x882222],[0,2,-12,0x228844],[14,2,0,0x884422],[-14,2,-8,0x442288]].forEach(l => {
      const pl = new THREE.PointLight(l[3], 1.5, 16); pl.position.set(l[0],l[1],l[2]); s.add(pl);
    });
    this.enemies = [];
    [[14,0.9,6],[-12,0.9,4],[0,0.9,-16],[10,0.9,-10],[-8,0.9,-6],[20,0.9,15]].forEach((ep, i) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), new THREE.MeshLambertMaterial({ color: 0xcc2222 }));
      e.position.set(ep[0], ep[1], ep[2]); e.castShadow = true; s.add(e);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), new THREE.MeshBasicMaterial({ color: 0xff0000 })); eye.position.set(0, 0.5, 0.4); e.add(eye);
      Object.assign(e, { health: 40, speed: 2.5 + i * 0.3, damage: 12, ac: 0, pb: e.position.clone(), pa: i * 1.05, shot: 0, shotCool: 0 });
      this.enemies.push(e);
    });
    this.aboxes = [];
    [[5,0.3,5],[-5,0.3,12],[15,0.3,-10]].forEach(p => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshLambertMaterial({ color: 0xffaa00 })); m.position.set(p[0],p[1],p[2]); s.add(m); m.on = true; this.aboxes.push(m);
    });
    this.camera.position.copy(this.ppos);
    this.gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.55), new THREE.MeshLambertMaterial({ color: 0x888888 })); this.gun.position.set(0.22, -0.22, -0.5); this.camera.add(this.gun); s.add(this.camera);
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc44 })); this.flash.position.set(0.22, -0.22, -0.82); this.flash.visible = false; this.camera.add(this.flash);
    this._xh = document.createElement('div'); this._xh.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;pointer-events:none;z-index:10'; this._xh.innerHTML = '<svg width="20" height="20" style="overflow:visible"><line x1="10" y1="4" x2="10" y2="8" stroke="white" stroke-width="1.5" opacity="0.8"/><line x1="10" y1="12" x2="10" y2="16" stroke="white" stroke-width="1.5" opacity="0.8"/><line x1="4" y1="10" x2="8" y2="10" stroke="white" stroke-width="1.5" opacity="0.8"/><line x1="12" y1="10" x2="16" y2="10" stroke="white" stroke-width="1.5" opacity="0.8"/></svg>'; container.appendChild(this._xh);
    this._clickmsg = document.createElement('div'); this._clickmsg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,20px);font:12px monospace;color:#fff8;pointer-events:none;z-index:10;text-align:center'; this._clickmsg.textContent = 'Click to lock mouse & play'; container.appendChild(this._clickmsg);
  }

  _hud() {
    this.hud = document.createElement('div'); this.hud.style.cssText = 'position:absolute;top:0;left:0;right:0;padding:8px 12px;display:flex;justify-content:space-between;color:#fff;font:12px monospace;pointer-events:none;z-index:10;background:linear-gradient(#0009,transparent)'; this.c.appendChild(this.hud);
    const ctrl = document.createElement('div'); ctrl.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:#fff7;font:10px monospace;pointer-events:none;z-index:10;white-space:nowrap'; ctrl.textContent = 'WASD: Move · Space: Jump · LMB: Shoot · R: Reload (ammo boxes on floor)'; this.c.appendChild(ctrl); this._ctrl = ctrl;
    this._rh();
  }

  _rh() {
    const alive = this.enemies.filter(e => e.health > 0).length;
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (this._clickmsg) this._clickmsg.style.display = locked ? 'none' : 'block';
    this.hud.innerHTML = '<span style="color:#4f4">HP: 100</span><span style="color:#fd4;margin:0 16px">Score: ' + this.score + '</span><span style="color:#fa0">Ammo: ' + this.ammo + '/' + this.maxAmmo + '</span><span style="color:#8af">Enemies: ' + alive + '</span>';
  }

  _shoot() {
    if (this.ammo <= 0 || this._sc > 0) return;
    this._sc = 0.15; this.ammo--;
    this.flash.visible = true; this._ft = 0;
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = rc.intersectObjects(this.enemies.filter(e => e.health > 0));
    if (hits.length > 0) {
      const e = hits[0].object;
      const isHead = hits[0].point.y > e.position.y + 0.6;
      const dmg = isHead ? 100 : 34;
      e.health -= dmg;
      e.material.color.setHex(0xff8888); setTimeout(() => { if (e.health > 0 && e.material) e.material.color.setHex(0xcc2222); }, 100);
      if (e.health <= 0) { e.visible = false; this.score += isHead ? 200 : 100; this.sdk.updateScore(this.score); }
    }
    this._rh();
  }

  _reload() { this.ammo = this.maxAmmo; this._rh(); }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (!this.over) { this._up(dt); this._rh(); }
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _up(dt) {
    this._sc = Math.max(0, (this._sc || 0) - dt);
    const sp = 5;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    this.ppos.addScaledVector(f, sp * dt);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  this.ppos.addScaledVector(f, -sp * dt);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.ppos.addScaledVector(r, -sp * dt);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.ppos.addScaledVector(r, sp * dt);
    this.pvel.y -= 18 * dt; this.ppos.y += this.pvel.y * dt;
    if (this.ppos.y <= 1.7) { this.ppos.y = 1.7; this.pvel.y = 0; this.pgrounded = true; }
    this.ppos.x = Math.max(-27, Math.min(27, this.ppos.x)); this.ppos.z = Math.max(-27, Math.min(27, this.ppos.z));
    this.camera.position.copy(this.ppos);
    this.camera.rotation.order = 'YXZ'; this.camera.rotation.y = this.yaw; this.camera.rotation.x = this.pitch;
    if (this.flash.visible) { this._ft = (this._ft || 0) + dt; if (this._ft > 0.06) { this.flash.visible = false; this._ft = 0; } }
    this.enemies.forEach(e => {
      if (e.health <= 0) return;
      e.ac = Math.max(0, e.ac - dt); e.shotCool = Math.max(0, e.shotCool - dt);
      const d = e.position.distanceTo(this.ppos);
      if (d < 20) {
        e.position.addScaledVector(this.ppos.clone().sub(e.position).normalize(), e.speed * 0.6 * dt);
        e.lookAt(new THREE.Vector3(this.ppos.x, e.position.y, this.ppos.z));
        if (d < 2 && e.ac <= 0) { e.ac = 1; /* damage player - simplified */ }
      } else { e.pa += dt * 0.5; e.position.x = e.pb.x + Math.sin(e.pa) * 4; e.position.z = e.pb.z + Math.cos(e.pa) * 4; }
      e.position.y = 0.9;
    });
    this.aboxes.forEach(b => { if (!b.on) return; if (b.position.distanceTo(this.ppos) < 1.5) { b.on = false; b.visible = false; this.ammo = this.maxAmmo; this._rh(); } b.rotation.y += 0.04; });
    if (!this._won && this.enemies.every(e => e.health <= 0)) {
      this._won = true; this.score += 500; this._msg('MISSION COMPLETE! +500', '#44ff88');
      setTimeout(() => this.sdk.endGame(this.score), 2500);
    }
  }

  _msg(text, color) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font:bold 24px monospace;color:' + color + ';text-shadow:0 0 16px ' + color + ';pointer-events:none;z-index:20;text-align:center';
    el.textContent = text; this.c.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku);
    window.removeEventListener('mousemove', this._mm); window.removeEventListener('mousedown', this._mc);
    window.removeEventListener('resize', this._rs);
    [this.hud, this._ctrl, this._xh, this._clickmsg].forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
`

// ─── Pre-built: 3D Platformer ─────────────────────────────────────────────────
const PLATFORMER_CODE = `
class Game3D {
  constructor(container, sdk) {
    this.c = container; this.sdk = sdk;
    this.W = container.clientWidth || 800; this.H = container.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a1525');
    this.scene.fog = new THREE.Fog('#0a1525', 40, 120);
    this.camera = new THREE.PerspectiveCamera(65, this.W / this.H, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.W, this.H); this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock(); this.keys = {}; this.coins = 0; this.totalCoins = 0; this.over = false;
    this.spawn = new THREE.Vector3(0, 2, 0);
    this._kd = e => { this.keys[e.code] = true; if ((e.code === 'Space' || e.code === 'ArrowUp') && this.pgrounded) { this.pvel.y = 9; this.pgrounded = false; if (this._djump === 0) this._djump = 1; } else if ((e.code === 'Space' || e.code === 'ArrowUp') && !this.pgrounded && this._djump === 1) { this.pvel.y = 7; this._djump = 2; } e.preventDefault(); };
    this._ku = e => { delete this.keys[e.code]; };
    window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku);
    this._rs = () => { this.W = container.clientWidth; this.H = container.clientHeight; this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.W, this.H); };
    window.addEventListener('resize', this._rs);
    this.ppos = new THREE.Vector3(0, 2, 0); this.pvel = new THREE.Vector3(); this.pgrounded = false; this._djump = 0;
    this.camYaw = 0; this._build(); this._hud();
  }

  _build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0x2244aa, 0.6));
    [[10,20,10,0xffffff,1],[−10,15,−10,0x4488ff,0.7]].forEach(l => {
      const dl = new THREE.DirectionalLight(l[3], l[4]); dl.position.set(l[0],l[1],l[2]); dl.castShadow = true; dl.shadow.mapSize.setScalar(1024); s.add(dl);
    });
    [[8,2,8,0x224488],[−8,2,5,0x882244],[0,2,−10,0x228866]].forEach(l => {
      const pl = new THREE.PointLight(l[3], 1.5, 20); pl.position.set(l[0],l[1],l[2]); s.add(pl);
    });
    this.platforms = [];
    const pm = (x, y, z, w, h, d, col) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col || 0x2255aa }));
      m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; s.add(m);
      m.hw = w/2; m.hh = h/2; m.hd = d/2;
      this.platforms.push(m); return m;
    };
    pm(0, 0, 0, 8, 0.5, 8, 0x1a3a5a);
    pm(6, 1.5, 0, 3, 0.4, 3, 0x224477);
    pm(10, 3, 2, 4, 0.4, 4, 0x225544);
    pm(14, 5, 0, 3, 0.4, 3, 0x224477);
    pm(10, 7, -4, 4, 0.4, 4, 0x225544);
    pm(5, 9, -4, 3, 0.4, 3, 0x224477);
    pm(0, 11, -6, 5, 0.4, 5, 0x334455);
    pm(-5, 13, -2, 3, 0.4, 3, 0x2a4a2a);
    pm(-9, 15, 2, 4, 0.4, 4, 0x4a2a2a);
    pm(-12, 17, 6, 3, 0.4, 3, 0x224477);
    pm(-8, 19, 10, 6, 0.4, 6, 0x2a5a2a);
    pm(0, 19, 16, 4, 0.4, 4, 0x4a4a1a);
    const goal = pm(4, 21, 16, 5, 0.4, 5, 0x553300);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0xffdd00 })); star.position.set(4, 22.2, 16); s.add(star); this._star = star;
    this.coinMeshes = [];
    this.totalCoins = 0;
    [[6,2.8,0],[10,4.5,2],[14,6.5,0],[5,10.5,-4],[-5,14.5,-2],[-9,16.5,2],[0,12.2,-6],[-8,20.5,10],[2,20.5,16],[-12,18.5,6]].forEach(cp => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8), new THREE.MeshLambertMaterial({ color: 0xffcc00, emissive: 0x442200 }));
      m.position.set(cp[0], cp[1], cp[2]); s.add(m); m.active = true; this.coinMeshes.push(m); this.totalCoins++;
    });
    this.player = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), new THREE.MeshLambertMaterial({ color: 0x00ccff }));
    this.player.position.copy(this.ppos); this.player.castShadow = true; s.add(this.player);
    this.camera.position.set(0, 5, 12);
  }

  _hud() {
    this.hud = document.createElement('div'); this.hud.style.cssText = 'position:absolute;top:0;left:0;right:0;padding:8px 12px;display:flex;justify-content:space-between;color:#fff;font:12px monospace;pointer-events:none;z-index:10;background:linear-gradient(#0009,transparent)'; this.c.appendChild(this.hud);
    const ctrl = document.createElement('div'); ctrl.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:#fff7;font:10px monospace;pointer-events:none;z-index:10;white-space:nowrap'; ctrl.textContent = 'WASD: Move · Space/Up (x2): Jump/Double-jump · Q/E: Rotate camera'; this.c.appendChild(ctrl); this._ctrl = ctrl;
    this._rh();
  }

  _rh() {
    this.hud.innerHTML = '<span style="color:#44ccff">Coins: ' + this.coins + '/' + this.totalCoins + '</span><span style="color:#ffdd00;margin:0 16px">★ Reach the gold platform!</span><span style="color:#aaffaa">Height: ' + Math.round(this.ppos.y) + 'm</span>';
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (!this.over) { this._up(dt); this._rh(); }
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _up(dt) {
    const sp = 6;
    const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const r = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    this.ppos.addScaledVector(f, sp * dt);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  this.ppos.addScaledVector(f, -sp * dt);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.ppos.addScaledVector(r, -sp * dt);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.ppos.addScaledVector(r, sp * dt);
    if (this.keys['KeyQ']) this.camYaw += 2 * dt;
    if (this.keys['KeyE']) this.camYaw -= 2 * dt;
    this.pvel.y -= 22 * dt;
    this.ppos.y += this.pvel.y * dt;
    this.pgrounded = false;
    this.platforms.forEach(p => {
      const dx = Math.abs(this.ppos.x - p.position.x) - p.hw - 0.3;
      const dz = Math.abs(this.ppos.z - p.position.z) - p.hd - 0.3;
      const dy = this.ppos.y - (p.position.y + p.hh + 1.1);
      if (dx < 0 && dz < 0 && dy > -0.3 && dy < 0.5 && this.pvel.y <= 0) {
        this.ppos.y = p.position.y + p.hh + 1.1; this.pvel.y = 0; this.pgrounded = true; this._djump = 0;
      }
    });
    if (this.ppos.y < -10) {
      this.ppos.copy(this.spawn); this.pvel.set(0,0,0); this.pgrounded = false;
    }
    this.player.position.copy(this.ppos); this.player.rotation.y = this.camYaw;
    const off = new THREE.Vector3(Math.sin(this.camYaw) * 8, 5, Math.cos(this.camYaw) * 8);
    this.camera.position.lerp(this.ppos.clone().add(off), 0.1);
    this.camera.lookAt(this.ppos.clone().add(new THREE.Vector3(0, 1, 0)));
    this.coinMeshes.forEach(m => {
      if (!m.active) return;
      if (m.position.distanceTo(this.ppos) < 1.2) { m.active = false; m.visible = false; this.coins++; this.sdk.updateScore(this.coins * 100); }
      m.rotation.y += 0.05; m.position.y += Math.sin(Date.now() * 0.003 + m.position.x) * 0.002;
    });
    if (this._star) { this._star.rotation.y += 0.03; this._star.rotation.x += 0.02; }
    if (!this._won && this.ppos.distanceTo(new THREE.Vector3(4, 21, 16)) < 3) {
      this._won = true; this.sdk.updateScore(this.coins * 100 + 500);
      this._msg('YOU REACHED THE TOP! ' + (this.coins === this.totalCoins ? 'PERFECT! +1000' : '+500'), '#ffdd00');
      setTimeout(() => this.sdk.endGame(this.coins * 100 + 500), 2500);
    }
  }

  _msg(text, color) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font:bold 20px monospace;color:' + color + ';text-shadow:0 0 16px ' + color + ';pointer-events:none;z-index:20;text-align:center';
    el.textContent = text; this.c.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku); window.removeEventListener('resize', this._rs);
    [this.hud, this._ctrl].forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
`

// ─── Pre-built scenes (displayed in editor view) ───────────────────────────────
const THIRD_PERSON_SCENE: Scene3D = {
  settings: { skyColor: '#0d1117', ambientColor: '#334466', gravity: -9.8 },
  objects: [
    { id: 'tp-player', name: 'Player', type: 'PlayerController', position: { x:0, y:1.2, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'capsule', color: '#00dd88' }, controller: { speed: 6, health: 100, camera: 'follow' } },
    { id: 'tp-e1', name: 'Enemy 1', type: 'NPCController', position: { x:8, y:0.8, z:6 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#dd2222' }, controller: { behavior: 'chase', speed: 2, health: 30, damage: 8 } },
    { id: 'tp-e2', name: 'Enemy 2', type: 'NPCController', position: { x:-8, y:0.8, z:3 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#dd2222' }, controller: { behavior: 'patrol', speed: 2.2, health: 30 } },
    { id: 'tp-e3', name: 'Enemy 3', type: 'NPCController', position: { x:0, y:0.8, z:-8 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#dd2222' }, controller: { behavior: 'chase', speed: 2.4, health: 30 } },
    { id: 'tp-wall1', name: 'Wall East', type: 'StaticMesh', position: { x:10, y:1.5, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:3,z:8 }, mesh: { geometry: 'box', color: '#334455' } },
    { id: 'tp-wall2', name: 'Wall West', type: 'StaticMesh', position: { x:-10, y:1.5, z:5 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:3,z:6 }, mesh: { geometry: 'box', color: '#334455' } },
    { id: 'tp-hp1', name: 'Health Pack', type: 'Item', position: { x:4, y:0.4, z:7 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'sphere', color: '#ff4466' }, controller: { effect: 'heal', amount: 35 } },
    { id: 'tp-gc', name: 'GameController', type: 'GameController', position: { x:0, y:0, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, controller: { winCondition: 'kill_all', scorePerKill: 100 } },
  ],
}

const FPS_SCENE: Scene3D = {
  settings: { skyColor: '#0a0a14', ambientColor: '#223355', fog: { color: '#0a0a14', near: 18, far: 70 }, gravity: -9.8 },
  objects: [
    { id: 'fps-player', name: 'Player (FPS)', type: 'PlayerController', position: { x:0, y:1.7, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'capsule', color: '#00ccff' }, controller: { camera: 'fps', speed: 5, health: 100, ammo: 30 } },
    { id: 'fps-e1', name: 'Enemy 1', type: 'NPCController', position: { x:14, y:0.9, z:6 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#cc2222' }, controller: { behavior: 'chase', speed: 2.5, health: 40 } },
    { id: 'fps-e2', name: 'Enemy 2', type: 'NPCController', position: { x:-12, y:0.9, z:4 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#cc2222' }, controller: { behavior: 'patrol', speed: 2.8, health: 40 } },
    { id: 'fps-wall1', name: 'Cover A', type: 'StaticMesh', position: { x:7, y:1, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:2,z:4 }, mesh: { geometry: 'box', color: '#2a3a4a' } },
    { id: 'fps-wall2', name: 'Cover B', type: 'StaticMesh', position: { x:-7, y:1, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:2,z:4 }, mesh: { geometry: 'box', color: '#2a3a4a' } },
    { id: 'fps-ammo', name: 'Ammo Box', type: 'Item', position: { x:5, y:0.3, z:5 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'box', color: '#ffaa00' }, controller: { effect: 'ammo', amount: 30 } },
    { id: 'fps-gc', name: 'GameController', type: 'GameController', position: { x:0, y:0, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, controller: { winCondition: 'kill_all', scorePerKill: 100 } },
  ],
}

const PLATFORMER_SCENE: Scene3D = {
  settings: { skyColor: '#0a1525', ambientColor: '#2244aa', gravity: -22 },
  objects: [
    { id: 'pl-player', name: 'Player', type: 'PlayerController', position: { x:0, y:2, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'capsule', color: '#00ccff' }, controller: { camera: 'follow', speed: 6, jumpForce: 9, doubleJump: true } },
    { id: 'pl-start', name: 'Start Platform', type: 'StaticMesh', position: { x:0, y:0, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:8,y:0.5,z:8 }, mesh: { geometry: 'box', color: '#1a3a5a' } },
    { id: 'pl-p2', name: 'Platform 2', type: 'StaticMesh', position: { x:6, y:1.5, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:3,y:0.4,z:3 }, mesh: { geometry: 'box', color: '#224477' } },
    { id: 'pl-p3', name: 'Platform 3', type: 'StaticMesh', position: { x:10, y:3, z:2 }, rotation: { x:0,y:0,z:0 }, scale: { x:4,y:0.4,z:4 }, mesh: { geometry: 'box', color: '#225544' } },
    { id: 'pl-goal', name: 'Goal Platform', type: 'Trigger', position: { x:4, y:21, z:16 }, rotation: { x:0,y:0,z:0 }, scale: { x:5,y:1,z:5 }, controller: { action: 'win' } },
    { id: 'pl-coin1', name: 'Coin', type: 'Item', position: { x:6, y:2.8, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, mesh: { geometry: 'cylinder', color: '#ffcc00' }, controller: { effect: 'score', amount: 100 } },
    { id: 'pl-gc', name: 'GameController', type: 'GameController', position: { x:0, y:0, z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 }, controller: { winCondition: 'reach_goal' } },
  ],
}

// ─── Template definitions ──────────────────────────────────────────────────────

export const TEMPLATES_3D: GameTemplate3D[] = [
  {
    id: 'blank',
    name: 'Blank Scene',
    category: 'Start Fresh',
    description: 'Empty scene. Describe your game idea and the AI will build it from scratch.',
    tags: ['Custom', 'AI', 'Blank'],
    gradient: 'from-zinc-900/60 to-zinc-800/30',
    icon: '✦',
    prompt: 'I want to create a custom 3D game. Please help me design and build it.',
  },
  {
    id: 'third-person',
    name: 'Third Person Adventure',
    category: 'Action',
    description: 'Instantly playable: WASD movement, follow camera, melee combat, 5 enemies, health packs. Modify with AI.',
    tags: ['3rd Person', 'Adventure', 'Melee'],
    gradient: 'from-green-900/60 to-emerald-900/40',
    icon: '⚔️',
    prompt: 'Improve this third person game: add more enemy types, better animations, new abilities like dash and ranged attacks, more level detail, and a boss enemy.',
    code: THIRD_PERSON_CODE,
    scene: THIRD_PERSON_SCENE,
  },
  {
    id: 'fps',
    name: 'First Person Shooter',
    category: 'Action',
    description: 'Instantly playable: pointer lock mouse look, raycasting gun, headshots, 6 enemies, ammo pickups.',
    tags: ['FPS', 'Shooter', 'Pointer Lock'],
    gradient: 'from-red-900/60 to-orange-900/40',
    icon: '🔫',
    prompt: 'Improve this FPS game: add multiple weapon types, reload animation, enemy shooting back, health system for player, more rooms, and score multipliers.',
    code: FPS_CODE,
    scene: FPS_SCENE,
  },
  {
    id: 'platformer',
    name: '3D Platformer',
    category: 'Platformer',
    description: 'Instantly playable: floating platforms, double-jump, 10 coins to collect, reach the gold platform to win.',
    tags: ['Platformer', 'Jump', 'Coins'],
    gradient: 'from-blue-900/60 to-cyan-900/40',
    icon: '🌟',
    prompt: 'Improve this platformer: add moving platforms, bounce pads, enemies that patrol platforms, timer challenge, more coin types, and better visual effects.',
    code: PLATFORMER_CODE,
    scene: PLATFORMER_SCENE,
  },
  {
    id: 'racing',
    name: 'Racing Game',
    category: 'Racing',
    description: 'High-speed neon circuit, 8 checkpoints, 3 AI rivals, drift mechanics.',
    tags: ['Racing', 'Cars', 'Speed'],
    gradient: 'from-purple-900/60 to-violet-900/40',
    icon: '🏎️',
    prompt: 'Create a complete 3D racing game. Player drives a sports car: W/S for gas/brake, A/D to steer, Space for handbrake drift. Neon night track with 8 glowing checkpoint gates to pass through in order. 3 AI opponents that race the same track. Lap timer, 3 laps to win. Speed boost pickups (blue orbs). Each car leaves a tire trail. Score based on finish position.',
  },
  {
    id: 'top-down-rpg',
    name: 'Top-Down RPG',
    category: 'RPG',
    description: 'Zelda-style top-down view, sword + bow, skeletons + orcs, locked door puzzle.',
    tags: ['RPG', 'Top-Down', 'Zelda'],
    gradient: 'from-purple-900/60 to-violet-900/40',
    icon: '🗡️',
    prompt: 'Create a top-down RPG like Zelda. Overhead camera following player. WASD move, F for sword slash, E to shoot arrow. Outdoor overworld with trees and rocks. 6 skeleton enemies (fast, weak) and 3 orc enemies (slow, strong charge). Health potions and arrows scattered. Find golden key, unlock door, reach exit portal. 5 hearts HP system.',
  },
  {
    id: 'tower-defense',
    name: 'Tower Defense',
    category: 'Strategy',
    description: 'Enemies march along a path, place towers with gold, 5 escalating waves.',
    tags: ['Strategy', 'Defense', 'Tower'],
    gradient: 'from-yellow-900/60 to-amber-900/40',
    icon: '🏰',
    prompt: 'Create a top-down 3D tower defense game. Red enemies march along a winding path to the base. Start with 100 gold — click pads to place Cannon Tower (50g, slow AoE) or Laser Tower (75g, fast single). 5 escalating waves. Each kill = 10 gold. 20 lives. Overhead camera.',
  },
  {
    id: 'survival',
    name: 'Survival Horror',
    category: 'Horror',
    description: 'First person, flashlight, 5 monsters that hunt by sound. Find 3 keycards to escape.',
    tags: ['Horror', 'Survival', 'FPS'],
    gradient: 'from-gray-900/60 to-zinc-900/40',
    icon: '👁️',
    prompt: 'Create a first person survival horror game. Flashlight with limited battery (find pickups). Dark abandoned facility. 5 pale monsters with glowing red eyes that hunt by sound (running = noise). No weapon — only hide. Find 3 keycards in different rooms to unlock the exit. Heartbeat when monster is close. 3 lives.',
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

interface TemplateSelectorProps {
  onSelect: (template: GameTemplate3D) => void
  onCustom: () => void
}

export function TemplateSelector3D({ onSelect, onCustom }: TemplateSelectorProps) {
  const categories = [...new Set(TEMPLATES_3D.map((t) => t.category))]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-[#080810]/96 backdrop-blur-sm overflow-y-auto no-scrollbar"
    >
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-sm font-light text-white/90 tracking-tight">New 3D Game</h2>
            <p className="text-[10px] font-light text-white/35 mt-0.5">
              Pick a template to play instantly · or describe your idea below
            </p>
          </div>
          <button
            onClick={onCustom}
            className="text-[10px] font-light text-primary/60 hover:text-primary border border-primary/20 hover:border-primary/40 px-3 py-1.5 rounded-lg transition-all"
          >
            Custom →
          </button>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="px-6 mb-4">
          <p className="text-[8px] font-medium text-white/25 uppercase tracking-widest mb-2">{cat}</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES_3D.filter((t) => t.category === cat).map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
      <div className="h-4" />
    </motion.div>
  )
}

function TemplateCard({ template, onSelect }: { template: GameTemplate3D; onSelect: (t: GameTemplate3D) => void }) {
  const hasPrebuilt = !!(template.code)
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      className={`relative text-left rounded-xl border border-white/8 bg-gradient-to-br ${template.gradient} hover:border-white/20 transition-all overflow-hidden group p-3`}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none flex-shrink-0">{template.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-medium text-white/90 leading-tight">{template.name}</p>
            {hasPrebuilt && (
              <span className="text-[7px] font-medium text-[#14F195] bg-[#14F195]/15 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Instant</span>
            )}
          </div>
          <p className="text-[9px] font-light text-white/45 mt-1 leading-relaxed line-clamp-2">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.tags.map((tag) => (
              <span key={tag} className="text-[7px] font-medium text-white/30 bg-white/8 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-medium text-white/50">{hasPrebuilt ? '▶ Play instantly' : 'AI Generate →'}</span>
      </div>
    </motion.button>
  )
}
