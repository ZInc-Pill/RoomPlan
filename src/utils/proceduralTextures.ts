import * as THREE from 'three';
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates an ultra-crisp, seamless procedural 512×512 CanvasTexture for Three.js.
 * Completely offline, zero external network dependency, deterministic, and instant.
 */
export function getProceduralTexture(materialId: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  if (textureCache.has(materialId)) {
    return textureCache.get(materialId)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  switch (materialId) {
    case 'oak-planks':
    case 'dark-walnut':
    case 'bleached-oak': {
      const isDark = materialId === 'dark-walnut';
      const isBleached = materialId === 'bleached-oak';
      const baseColor = isDark ? '#4a2e1b' : isBleached ? '#eedfcb' : '#d89e63';
      const plankHeight = 64; // 8 planks across 512px

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 512);

      for (let y = 0; y < 512; y += plankHeight) {
        // Subtle plank tone variation
        const toneShift = (Math.sin(y * 12.3) * 12) | 0;
        ctx.fillStyle = isDark
          ? `rgb(${60 + toneShift}, ${38 + (toneShift / 2 | 0)}, ${23 + (toneShift / 3 | 0)})`
          : isBleached
          ? `rgb(${238 + toneShift}, ${224 + toneShift}, ${208 + toneShift})`
          : `rgb(${216 + toneShift}, ${158 + (toneShift * 0.8 | 0)}, ${99 + (toneShift * 0.6 | 0)})`;
        ctx.fillRect(0, y, 512, plankHeight);

        // Directional wood grain fibers
        for (let i = 0; i < 18; i++) {
          const grainY = y + (i / 18) * plankHeight + Math.sin(i * 1.7) * 2;
          ctx.strokeStyle = isDark ? 'rgba(20, 10, 5, 0.25)' : 'rgba(100, 60, 20, 0.12)';
          ctx.lineWidth = 1 + (i % 2);
          ctx.beginPath();
          ctx.moveTo(0, grainY);
          ctx.bezierCurveTo(170, grainY + Math.sin(i) * 3, 340, grainY - Math.cos(i) * 3, 512, grainY);
          ctx.stroke();
        }

        // Staggered vertical end joints
        const jointX = ((y * 3.7) % 380) + 60;
        ctx.strokeStyle = isDark ? 'rgba(10, 5, 2, 0.65)' : 'rgba(50, 30, 15, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(jointX, y);
        ctx.lineTo(jointX, y + plankHeight);
        ctx.stroke();

        // Plank horizontal seam
        ctx.strokeStyle = isDark ? 'rgba(10, 5, 2, 0.7)' : 'rgba(50, 30, 15, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, y + plankHeight);
        ctx.lineTo(512, y + plankHeight);
        ctx.stroke();
      }
      break;
    }

    case 'herringbone-oak': {
      ctx.fillStyle = '#cf985b';
      ctx.fillRect(0, 0, 512, 512);

      const blockW = 64;
      const blockH = 16;
      ctx.save();
      // Draw repeating herringbone zigzags
      for (let y = -64; y < 576; y += 32) {
        for (let x = -64; x < 576; x += 64) {
          const varTone = (Math.sin(x * 3 + y * 7) * 16) | 0;
          ctx.fillStyle = `rgb(${210 + varTone}, ${150 + (varTone * 0.8 | 0)}, ${90 + (varTone * 0.6 | 0)})`;

          // Diagonal slat 1 (45 deg)
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
          ctx.strokeStyle = 'rgba(70, 35, 10, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-blockW / 2, -blockH / 2, blockW, blockH);
          ctx.restore();

          // Diagonal slat 2 (-45 deg)
          ctx.save();
          ctx.translate(x + 32, y + 16);
          ctx.rotate(-Math.PI / 4);
          ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
          ctx.strokeStyle = 'rgba(70, 35, 10, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-blockW / 2, -blockH / 2, blockW, blockH);
          ctx.restore();
        }
      }
      ctx.restore();
      break;
    }

    case 'marble-carrara': {
      // Soft pearlescent ivory base
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 512);

      // Cloudy soft watercolor diffusion
      for (let i = 0; i < 8; i++) {
        const radGrad = ctx.createRadialGradient(
          Math.random() * 512, Math.random() * 512, 10,
          Math.random() * 512, Math.random() * 512, 280
        );
        radGrad.addColorStop(0, 'rgba(226, 232, 240, 0.4)');
        radGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, 512, 512);
      }

      // Elegant organic marble veins
      const drawVein = (startX: number, startY: number, alpha: number) => {
        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let currX = startX;
        let currY = startY;
        ctx.moveTo(currX, currY);
        for (let seg = 0; seg < 14; seg++) {
          currX += (Math.random() - 0.35) * 55;
          currY += 40 + Math.random() * 15;
          ctx.lineTo(currX, currY);
          if (Math.random() > 0.6) {
            // Forking veinlet
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(currX, currY);
            ctx.lineTo(currX + (Math.random() - 0.5) * 45, currY + 25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(currX, currY);
          }
        }
        ctx.stroke();
      };

      drawVein(120, -20, 0.4);
      drawVein(340, -20, 0.35);
      drawVein(220, 150, 0.25);
      break;
    }

    case 'marble-nero': {
      ctx.fillStyle = '#161e2e';
      ctx.fillRect(0, 0, 512, 512);

      // White crystalline veining
      const drawNeroVein = (x: number, y: number) => {
        ctx.strokeStyle = 'rgba(240, 246, 255, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        let px = x, py = y;
        ctx.moveTo(px, py);
        for (let i = 0; i < 16; i++) {
          px += (Math.random() - 0.4) * 45;
          py += 35 + Math.random() * 20;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      };
      drawNeroVein(80, -20);
      drawNeroVein(320, -20);
      drawNeroVein(450, 120);
      break;
    }

    case 'terrazzo-venetian': {
      ctx.fillStyle = '#f3efe8';
      ctx.fillRect(0, 0, 512, 512);

      const chipColors = [
        '#d97706', '#993d28', '#334155', '#78716c', '#64748b', '#a8a29e', '#57534e'
      ];
      for (let i = 0; i < 380; i++) {
        const cx = Math.random() * 512;
        const cy = Math.random() * 512;
        const rad = 2 + Math.random() * 7;
        const color = chipColors[(Math.random() * chipColors.length) | 0];

        ctx.fillStyle = color;
        ctx.beginPath();
        // Irregular angular polygon chip
        ctx.moveTo(cx - rad + Math.random() * 2, cy - rad);
        ctx.lineTo(cx + rad, cy - rad * 0.5);
        ctx.lineTo(cx + rad * 0.8, cy + rad);
        ctx.lineTo(cx - rad * 0.6, cy + rad * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'polished-concrete': {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 512, 512);

      // Fine concrete aggregate specks
      for (let i = 0; i < 1200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const lum = Math.random() > 0.5 ? 245 : 100;
        ctx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Smooth trowel swirl gradient
      const trowelGrad = ctx.createLinearGradient(0, 0, 512, 512);
      trowelGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      trowelGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
      trowelGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = trowelGrad;
      ctx.fillRect(0, 0, 512, 512);
      break;
    }

    case 'porcelain-tile': {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 512, 512);

      const tileSize = 128; // 4x4 grid in 512px
      for (let y = 0; y < 512; y += tileSize) {
        for (let x = 0; x < 512; x += tileSize) {
          // Tile face subtle shading
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          // Tile bevel highlight
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + tileSize - 2);
          ctx.lineTo(x + 2, y + 2);
          ctx.lineTo(x + tileSize - 2, y + 2);
          ctx.stroke();

          // Recessed grout line
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, tileSize, tileSize);
        }
      }
      break;
    }

    case 'terracotta-hex': {
      ctx.fillStyle = '#c25e38';
      ctx.fillRect(0, 0, 512, 512);

      const sz = 64;
      for (let y = 0; y < 512; y += sz) {
        for (let x = 0; x < 512; x += sz) {
          const shift = (Math.sin(x * 1.5 + y * 2.3) * 14) | 0;
          ctx.fillStyle = `rgb(${194 + shift}, ${94 + shift / 2 | 0}, ${56 + shift / 3 | 0})`;
          ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);

          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, sz, sz);
        }
      }
      break;
    }

    case 'checkerboard': {
      const sq = 128;
      for (let y = 0; y < 512; y += sq) {
        for (let x = 0; x < 512; x += sq) {
          const isWhite = ((x / sq) + (y / sq)) % 2 === 0;
          ctx.fillStyle = isWhite ? '#f8fafc' : '#272f3d';
          ctx.fillRect(x, y, sq, sq);

          ctx.strokeStyle = isWhite ? '#e2e8f0' : '#1e2530';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, sq, sq);
        }
      }
      break;
    }

    case 'loop-carpet': {
      ctx.fillStyle = '#e4dfd5';
      ctx.fillRect(0, 0, 512, 512);

      // Stippled woven loop weave
      for (let y = 0; y < 512; y += 4) {
        for (let x = 0; x < 512; x += 4) {
          const lum = ((Math.sin(x * 0.9) + Math.cos(y * 0.9)) * 18) | 0;
          ctx.fillStyle = `rgb(${228 + lum}, ${223 + lum}, ${213 + lum})`;
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'exposed-brick':
    case 'white-brick': {
      const isWhite = materialId === 'white-brick';
      ctx.fillStyle = isWhite ? '#cbd5e1' : '#57534e'; // Mortar base
      ctx.fillRect(0, 0, 512, 512);

      const brickH = 32;
      const brickW = 64;
      for (let y = 0; y < 512; y += brickH) {
        const row = (y / brickH) | 0;
        const offsetX = (row % 2 === 0) ? 0 : brickW / 2;
        for (let x = -brickW; x < 512 + brickW; x += brickW) {
          const varColor = (Math.sin(x * 0.5 + y * 1.2) * 16) | 0;
          ctx.fillStyle = isWhite
            ? `rgb(${245 + (varColor / 3 | 0)}, ${248 + (varColor / 3 | 0)}, ${250 + (varColor / 3 | 0)})`
            : `rgb(${160 + varColor}, ${60 + (varColor * 0.5 | 0)}, ${40 + (varColor * 0.3 | 0)})`;
          ctx.fillRect(x + offsetX + 2, y + 2, brickW - 4, brickH - 4);
        }
      }
      break;
    }

    case 'wood-slats': {
      ctx.fillStyle = '#1e1e24'; // Dark acoustic felt background
      ctx.fillRect(0, 0, 512, 512);

      const slatW = 24;
      const gapW = 8;
      const period = slatW + gapW;
      for (let x = 0; x < 512; x += period) {
        // Oak slat
        ctx.fillStyle = '#c8955c';
        ctx.fillRect(x, 0, slatW, 512);

        // Highlight edge
        ctx.fillStyle = '#dfaf75';
        ctx.fillRect(x, 0, 2, 512);

        // Shadow side
        ctx.fillStyle = '#9e6e3c';
        ctx.fillRect(x + slatW - 2, 0, 2, 512);
      }
      break;
    }

    default: {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  textureCache.set(materialId, texture);
  return texture;
}
