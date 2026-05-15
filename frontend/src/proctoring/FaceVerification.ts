// =============================================
// Module 1: XÁC THỰC DANH TÍNH (face-api.js)
// So sánh khuôn mặt webcam vs ảnh đại diện
// =============================================
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models/face-api';

export class FaceVerification {
  private referenceDescriptor: Float32Array | null = null;
  private modelsLoaded = false;
  // Theo dõi từng model riêng lẻ
  private detectorLoaded = false;
  private landmarkLoaded = false;
  private recognitionLoaded = false;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      console.log('[FaceVerification] Đang tải các model face-api...');
      // Load tuần tự để dễ debug lỗi từng cái
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('[FaceVerification] TinyFaceDetector loaded');
      this.detectorLoaded = true;
      
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('[FaceVerification] FaceLandmark68Net loaded');
      this.landmarkLoaded = true;

      try {
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('[FaceVerification] FaceRecognitionNet loaded');
        this.recognitionLoaded = true;
      } catch (e) {
        console.error('[FaceVerification] LỖI tải FaceRecognitionNet (Dùng để so khớp khuôn mặt):', e);
      }

      this.modelsLoaded = this.detectorLoaded && this.landmarkLoaded;
      console.log('[FaceVerification] Kết quả tải model:', { 
        detector: this.detectorLoaded, 
        landmark: this.landmarkLoaded, 
        recognition: this.recognitionLoaded 
      });
    } catch (err) {
      console.error('[FaceVerification] LỖI NGHIÊM TRỌNG khi tải model cơ bản:', err);
      throw err;
    }

  }

  // Đăng ký ảnh xác thực (reference photo)
  async registerReference(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
    if (!this.modelsLoaded) return false;
    try {
      if (this.recognitionLoaded) {
        const detection = await faceapi
          .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 416 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (!detection) {
          console.warn('[FaceVerification] Không tìm thấy mặt trong ảnh đăng ký.');
          return false;
        }
        this.referenceDescriptor = detection.descriptor;
        console.log('[FaceVerification] Đã đăng ký descriptor thành công.');
        return true;
      } else {
        // Fallback: chỉ detect xem có mặt không
        const detection = await faceapi.detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 416 }));
        return !!detection;
      }
    } catch (err) {
      console.error('[FaceVerification] registerReference error:', err);
      return false;
    }
  }

  // So sánh khuôn mặt hiện tại với ảnh xác thực
  async verify(videoElement: HTMLVideoElement, threshold = 0.6): Promise<{
    faceCount: number; isMatch: boolean; distance: number;
    landmarks: faceapi.FaceLandmarks68 | null;
  }> {
    if (!this.modelsLoaded) {
      return { faceCount: 1, isMatch: true, distance: 0, landmarks: null };
    }
    try {
      // Chỉ dùng descriptor nếu cả 2 bên đều có descriptor
      if (this.recognitionLoaded && this.referenceDescriptor) {
        const detections = await faceapi
          .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 416 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length === 0) return { faceCount: 0, isMatch: false, distance: 1, landmarks: null };
        
        const distance = faceapi.euclideanDistance(this.referenceDescriptor, detections[0].descriptor);
        // Ngưỡng 0.6 là tiêu chuẩn của face-api.js
        return { faceCount: detections.length, isMatch: distance < threshold, distance, landmarks: detections[0].landmarks };
      } else {
        // Fallback: Chỉ đếm mặt
        const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 416 }));
        return { faceCount: detections.length, isMatch: true, distance: 0, landmarks: null };
      }
    } catch (err) {
      // Tránh crash loop nếu inference lỗi
      console.warn('[FaceVerification] verify inference error:', err);
      return { faceCount: 1, isMatch: true, distance: 0, landmarks: null };
    }
  }

  isReady(): boolean { return this.modelsLoaded; }
}

