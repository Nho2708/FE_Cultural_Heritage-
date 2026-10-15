import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Mô hình 3D nhà cổ Hội An (cùng tệp GLB bản demo đang dùng, đặt ở public/mo-hinh/nha-hoi-an.glb), vẽ thật bằng three.js trong Remotion.
// Mô hình được đưa về gốc toạ độ: chân đặt trên mặt phẳng y = 0, giữa nằm trên trục đứng, chiều ngang lớn nhất bằng 2 đơn vị.

export interface MoHinh {
  vat: THREE.Object3D;
  /** Chiều cao sau khi đưa về chuẩn (đơn vị three.js). */
  cao: number;
  /** Đường chéo mặt bằng: bề ngang lớn nhất mô hình chiếm khi xoay quanh trục đứng. */
  cheo: number;
}

let dangTai: Promise<MoHinh> | null = null;

function taiMoHinh(): Promise<MoHinh> {
  dangTai ??= new GLTFLoader().loadAsync(staticFile('mo-hinh/nha-hoi-an.glb')).then(({ scene }) => {
    scene.traverse((o) => {
      const luoi = o as THREE.Mesh;
      if (!luoi.isMesh) return;
      luoi.castShadow = true;
      luoi.receiveShadow = true;
      // Tường, gỗ, ngói đều không phải kim loại; bỏ hệ số kim loại mặc định của tệp để màu không bị tối khi thiếu phản chiếu.
      for (const vl of Array.isArray(luoi.material) ? luoi.material : [luoi.material]) {
        if ((vl as THREE.MeshStandardMaterial).isMeshStandardMaterial) (vl as THREE.MeshStandardMaterial).metalness = 0;
      }
    });
    const hop = new THREE.Box3().setFromObject(scene);
    const co = hop.getSize(new THREE.Vector3());
    const tam = hop.getCenter(new THREE.Vector3());
    const tiLe = 2 / Math.max(co.x, co.z);
    scene.position.set(-tam.x, -hop.min.y, -tam.z);
    const vat = new THREE.Group();
    vat.add(scene);
    vat.scale.setScalar(tiLe);
    return { vat, cao: co.y * tiLe, cheo: Math.hypot(co.x, co.z) * tiLe };
  });
  return dangTai;
}

/** Tải mô hình một lần cho mỗi thẻ trình duyệt; giữ khung hình chờ tới khi tải xong. */
export function useMoHinh(): MoHinh | null {
  const [moHinh, datMoHinh] = useState<MoHinh | null>(null);
  const [cho] = useState(() => delayRender('Tải mô hình 3D'));
  useEffect(() => {
    taiMoHinh()
      .then((m) => {
        datMoHinh(m);
        continueRender(cho);
      })
      .catch((loi) => cancelRender(loi));
  }, [cho]);
  return moHinh;
}

/** Ánh sáng phòng chụp mềm làm nền phản chiếu, để vật liệu PBR của mô hình có màu đúng. */
function MoiTruong({ cuongDo }: { cuongDo: number }) {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const anh = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = anh;
    scene.environmentIntensity = cuongDo;
    return () => {
      scene.environment = null;
      anh.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, cuongDo]);
  return null;
}

/** Đặt camera theo quỹ đạo quanh mô hình: góc ngẩng (độ), khoảng cách, điểm nhìn ở độ cao `nhinCao`. */
function Camera({ ngang, khoangCach, nhinCao }: { ngang: number; khoangCach: number; nhinCao: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const a = THREE.MathUtils.degToRad(ngang);
    camera.position.set(0, nhinCao + khoangCach * Math.sin(a), khoangCach * Math.cos(a));
    camera.lookAt(0, nhinCao, 0);
    camera.updateMatrixWorld();
  });
  return null;
}

/** Bóng mềm sát chân mô hình (vệt tối hình elip mờ dần ra ngoài), thêm vào bóng đổ của đèn chính. */
function BongChan({ banKinh }: { banKinh: number }) {
  const anh = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const to = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    to.addColorStop(0, 'rgba(10,10,16,0.55)');
    to.addColorStop(0.55, 'rgba(10,10,16,0.22)');
    to.addColorStop(1, 'rgba(10,10,16,0)');
    g.fillStyle = to;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
      <planeGeometry args={[banKinh * 2, banKinh * 2]} />
      <meshBasicMaterial map={anh} transparent depthWrite={false} />
    </mesh>
  );
}

/**
 * Khung vẽ mô hình nền trong suốt (nền do cảnh đặt phía sau). `xoay` là góc quay mô hình quanh trục đứng (độ);
 * camera nhìn từ góc ngẩng `ngang` (độ) ở khoảng cách `khoangCach`, vào điểm ở độ cao `nhinCao` (tỉ lệ chiều cao mô hình).
 * Đèn chính ấm phía trước, cao gần đỉnh đầu để bóng đổ ngắn; đèn viền vàng phía sau.
 */
export function KhungMoHinh({ moHinh, rong, cao, xoay, ngang, khoangCach, fov = 30, nhinCao = 0.42 }: { moHinh: MoHinh; rong: number; cao: number; xoay: number; ngang: number; khoangCach: number; fov?: number; nhinCao?: number }) {
  const vat = useMemo(() => moHinh.vat.clone(), [moHinh]);
  return (
    <ThreeCanvas width={rong} height={cao} shadows flat gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov, near: 0.05, far: 60 }}>
      <MoiTruong cuongDo={0.55} />
      <Camera ngang={ngang} khoangCach={khoangCach} nhinCao={moHinh.cao * nhinCao} />
      <hemisphereLight args={['#FFF4E2', '#2A2C3A', 0.7]} />
      <directionalLight
        position={[1.4, 6.2, 3.6]}
        intensity={2.1}
        color="#FFF0D8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
      />
      <directionalLight position={[-3.2, 2.6, -3.6]} intensity={2.6} color="#E2AE62" />
      <group rotation-y={THREE.MathUtils.degToRad(xoay)}>
        <primitive object={vat} />
      </group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0.001, 0]}>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial opacity={0.3} color="#0A0A10" />
      </mesh>
      <BongChan banKinh={1.75} />
    </ThreeCanvas>
  );
}

/** Khoảng cách camera để mô hình xoay trọn vòng vẫn lọt bề ngang khung `rong` × `cao` (chiếm tỉ lệ `chiem` bề ngang). */
export function khoangCachVuaKhung(moHinh: MoHinh, rong: number, cao: number, chiem = 0.86, fov = 30): number {
  const ngangThay = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (rong / cao);
  return moHinh.cheo / chiem / ngangThay;
}
