// =============================================
// Module 2: GIÁM SÁT HÀNH VI (MediaPipe)
// Head Pose Estimation + Đếm mặt + Face Absence
// =============================================
import { FaceDetector, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class FaceBehaviorMonitor {
  private faceDetector: FaceDetector | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private isLoaded = false;

  async loadModels(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Face Detector - đếm số khuôn mặt
      this.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });

      // Face Landmarker - 468 điểm cho Head Pose
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 3,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      });

      this.isLoaded = true;
      console.log('[FaceBehavior] MediaPipe models loaded');
    } catch (err) {
      console.error('[FaceBehavior] Lỗi load MediaPipe:', err);
      throw err;
    }
  }

  // Phân tích frame video
  analyze(videoElement: HTMLVideoElement, timestampMs: number): {
    faceCount: number;
    headPose: { yaw: number; pitch: number; roll: number };
    faceDetected: boolean;
  } {
    const defaultResult = {
      faceCount: 0,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      faceDetected: false,
    };

    if (!this.faceLandmarker || !this.faceDetector) return defaultResult;

    try {
      const detections = this.faceDetector.detectForVideo(videoElement, timestampMs);
      const faceCount = detections.detections.length;

      const landmarkerResult = this.faceLandmarker.detectForVideo(videoElement, timestampMs);

      if (landmarkerResult.facialTransformationMatrixes && landmarkerResult.facialTransformationMatrixes.length > 0) {
        const matrix = landmarkerResult.facialTransformationMatrixes[0];
        // MediaPipe returns number[], we need to explicitly cast or convert it safely
        const float32Matrix = new Float32Array(matrix.data as unknown as number[]);
        const headPose = this.extractHeadPose(float32Matrix);
        return { faceCount, headPose, faceDetected: faceCount > 0 };
      }

      return { faceCount, headPose: { yaw: 0, pitch: 0, roll: 0 }, faceDetected: faceCount > 0 };
    } catch (err) {
      return defaultResult;
    }
  }

  // Trích xuất góc quay đầu từ ma trận biến đổi 4x4
  private extractHeadPose(matrix: Float32Array): { yaw: number; pitch: number; roll: number } {
    const r02 = matrix[2], r12 = matrix[6];
    const r10 = matrix[4], r11 = matrix[5], r22 = matrix[10];
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    return {
      yaw: toDeg(Math.atan2(r02, r22)),
      pitch: toDeg(Math.asin(-r12)),
      roll: toDeg(Math.atan2(r10, r11)),
    };
  }

  isReady(): boolean { return this.isLoaded; }

  destroy() {
    this.faceDetector?.close();
    this.faceLandmarker?.close();
    this.faceDetector = null;
    this.faceLandmarker = null;
  }
}
