// =============================================
// Module 3: PHÁT HIỆN ĐIỆN THOẠI (YOLOv8 ONNX)
// =============================================
import * as ort from 'onnxruntime-web';

const MODEL_PATH = '/models/yolov8/yolov8n.onnx';
const INPUT_SIZE = 640;

// COCO class indices cho thiết bị cần phát hiện
const TARGET_CLASSES: Record<number, string> = {
  63: 'laptop',
  67: 'cell phone',
  73: 'book',
};

export class ObjectDetector {
  private session: ort.InferenceSession | null = null;
  private isLoaded = false;
  private _debugLogged = false;

  async loadModel(): Promise<void> {
    if (this.isLoaded) return;
    try {
      console.log('[ObjectDetector] Đang tải YOLOv8 model...');
      // Phải khớp CHÍNH XÁC version với package.json (1.25.1)
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.1/dist/';
      ort.env.wasm.numThreads = 1;
      
      this.session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      this.isLoaded = true;
      console.log('[ObjectDetector] YOLOv8 loaded thành công. Dims:', this.session.outputNames);
    } catch (err) {
      console.error('[ObjectDetector] LỖI tải model YOLOv8:', err);
      // Fallback: Thử không dùng CDN nếu CDN lỗi
      try {
        console.log('[ObjectDetector] Thử load không dùng CDN path...');
        ort.env.wasm.wasmPaths = '/'; 
        this.session = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ['wasm'] });
        this.isLoaded = true;
      } catch (e2) {
        console.error('[ObjectDetector] Cả 2 cách load đều thất bại.');
      }
    }
  }



  async detect(
    videoElement: HTMLVideoElement,
    confidenceThreshold = 0.35,
  ): Promise<{ detected: boolean; objects: { className: string; confidence: number }[] }> {
    if (!this.session) return { detected: false, objects: [] };
    try {
      const canvas = document.createElement('canvas');
      canvas.width = INPUT_SIZE;
      canvas.height = INPUT_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoElement, 0, 0, INPUT_SIZE, INPUT_SIZE);
      const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      const inputTensor = this.preprocessImage(imageData);

      const feeds: Record<string, ort.Tensor> = {};
      feeds[this.session.inputNames[0]] = inputTensor;
      const results = await this.session.run(feeds);
      const output = results[this.session.outputNames[0]];

      // Debug: log output shape once
      if (!this._debugLogged) {
        console.log('[ObjectDetector] Output dims:', output.dims, 'total:', output.data.length);
        this._debugLogged = true;
      }

      const detectedObjects = this.postprocess(output, confidenceThreshold);
      if (detectedObjects.length > 0) {
        console.log('[ObjectDetector] 🔍 Detected:', detectedObjects);
      }
      return { detected: detectedObjects.length > 0, objects: detectedObjects };
    } catch (err) {
      console.error('[ObjectDetector] detect error:', err);
      return { detected: false, objects: [] };
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const { data, width, height } = imageData;
    const float32Data = new Float32Array(3 * width * height);
    for (let i = 0; i < width * height; i++) {
      float32Data[i] = data[i * 4] / 255.0;                           // R
      float32Data[width * height + i] = data[i * 4 + 1] / 255.0;     // G
      float32Data[2 * width * height + i] = data[i * 4 + 2] / 255.0; // B
    }
    return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
  }

  private postprocess(
    output: ort.Tensor,
    confidenceThreshold: number,
  ): { className: string; confidence: number }[] {
    const results: { className: string; confidence: number }[] = [];
    const data = output.data as Float32Array;
    const dims = output.dims.map(Number);

    if (dims.length === 3 && dims[0] === 1) {
      const d1 = dims[1];
      const d2 = dims[2];

      if (d1 < d2) {
        // Shape [1, 84, 8400] — standard YOLOv8 ONNX export
        const numFeatures = d1; // 84
        const numAnchors = d2;  // 8400
        const numClasses = numFeatures - 4;
        for (let i = 0; i < numAnchors; i++) {
          let maxConf = 0, maxClassId = -1;
          for (let c = 0; c < numClasses; c++) {
            const conf = data[(c + 4) * numAnchors + i];
            if (conf > maxConf) { maxConf = conf; maxClassId = c; }
          }
          if (maxConf >= confidenceThreshold && TARGET_CLASSES[maxClassId]) {
            results.push({ className: TARGET_CLASSES[maxClassId], confidence: maxConf });
          }
        }
      } else {
        // Shape [1, 8400, 84] — transposed export
        const numAnchors = d1;
        const numFeatures = d2;
        const numClasses = numFeatures - 4;
        for (let i = 0; i < numAnchors; i++) {
          let maxConf = 0, maxClassId = -1;
          for (let c = 0; c < numClasses; c++) {
            const conf = data[i * numFeatures + 4 + c];
            if (conf > maxConf) { maxConf = conf; maxClassId = c; }
          }
          if (maxConf >= confidenceThreshold && TARGET_CLASSES[maxClassId]) {
            results.push({ className: TARGET_CLASSES[maxClassId], confidence: maxConf });
          }
        }
      }
    }

    // Deduplicate — giữ confidence cao nhất mỗi class
    const deduped: Record<string, { className: string; confidence: number }> = {};
    for (const r of results) {
      if (!deduped[r.className] || r.confidence > deduped[r.className].confidence) {
        deduped[r.className] = r;
      }
    }
    return Object.values(deduped);
  }

  isReady(): boolean { return this.isLoaded; }
  destroy() { this.session?.release(); this.session = null; this.isLoaded = false; }
}
