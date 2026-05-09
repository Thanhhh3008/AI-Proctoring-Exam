// =============================================
// Module 4: ANTI-SPOOFING (Optical Flow)
// Phát hiện ảnh tĩnh / video giả
// Thuật toán Lucas-Kanade chạy thuần JS
// =============================================

export class OpticalFlowAnalyzer {
  private previousGrayFrame: Uint8Array | null = null;
  private previousPoints: { x: number; y: number }[] = [];
  private frameWidth = 0;

  analyze(
    videoElement: HTMLVideoElement,
    threshold: number = 2.0
  ): { magnitude: number; isStatic: boolean } {

    const w = 160;
    const h = 120;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(videoElement, 0, 0, w, h);

    const grayFrame = this.toGrayscale(
      ctx.getImageData(0, 0, w, h).data,
      w,
      h
    );

    // Frame đầu tiên
    if (!this.previousGrayFrame || this.frameWidth !== w) {
      this.previousGrayFrame = grayFrame;
      this.frameWidth = w;
      this.previousPoints = this.detectCorners(grayFrame, w, h);

      return {
        magnitude: 999,
        isStatic: false
      };
    }

    let totalMag = 0;
    let valid = 0;

    for (const pt of this.previousPoints) {
      const flow = this.computeFlow(
        this.previousGrayFrame,
        grayFrame,
        w,
        h,
        pt.x,
        pt.y,
        7
      );

      if (flow) {
        totalMag += Math.sqrt(
          flow.dx * flow.dx + flow.dy * flow.dy
        );

        valid++;
      }
    }

    const avgMag = valid > 0 ? totalMag / valid : 0;

    // Update frame cũ
    this.previousGrayFrame = grayFrame;
    this.previousPoints = this.detectCorners(grayFrame, w, h);

    return {
      magnitude: avgMag,
      isStatic: avgMag < threshold
    };
  }

  private toGrayscale(
    data: Uint8ClampedArray,
    w: number,
    h: number
  ): Uint8Array {

    const gray = new Uint8Array(w * h);

    for (let i = 0; i < w * h; i++) {
      gray[i] = Math.round(
        0.299 * data[i * 4] +
        0.587 * data[i * 4 + 1] +
        0.114 * data[i * 4 + 2]
      );
    }

    return gray;
  }

  private detectCorners(
    gray: Uint8Array,
    w: number,
    h: number
  ): { x: number; y: number }[] {

    const corners: { x: number; y: number }[] = [];

    for (let y = 10; y < h - 10; y += 15) {
      for (let x = 10; x < w - 10; x += 15) {

        const gx =
          gray[y * w + x + 1] -
          gray[y * w + x - 1];

        const gy =
          gray[(y + 1) * w + x] -
          gray[(y - 1) * w + x];

        if (gx * gx + gy * gy > 100) {
          corners.push({ x, y });
        }
      }
    }

    return corners.slice(0, 50);
  }

  private computeFlow(
    prev: Uint8Array,
    curr: Uint8Array,
    w: number,
    h: number,
    px: number,
    py: number,
    ws: number
  ): { dx: number; dy: number } | null {

    const half = Math.floor(ws / 2);

    let sIxIx = 0;
    let sIxIy = 0;
    let sIyIy = 0;
    let sIxIt = 0;
    let sIyIt = 0;

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {

        const x = px + dx;
        const y = py + dy;

        if (
          x < 1 ||
          x >= w - 1 ||
          y < 1 ||
          y >= h - 1
        ) continue;

        const idx = y * w + x;

        const Ix =
          (prev[idx + 1] - prev[idx - 1]) / 2;

        const Iy =
          (prev[idx + w] - prev[idx - w]) / 2;

        const It =
          curr[idx] - prev[idx];

        sIxIx += Ix * Ix;
        sIxIy += Ix * Iy;
        sIyIy += Iy * Iy;
        sIxIt += Ix * It;
        sIyIt += Iy * It;
      }
    }

    const det =
      sIxIx * sIyIy -
      sIxIy * sIxIy;

    if (Math.abs(det) < 1e-6) {
      return null;
    }

    return {
      dx:
        (sIyIy * -sIxIt -
          sIxIy * -sIyIt) / det,

      dy:
        (sIxIx * -sIyIt -
          sIxIy * -sIxIt) / det
    };
  }
}