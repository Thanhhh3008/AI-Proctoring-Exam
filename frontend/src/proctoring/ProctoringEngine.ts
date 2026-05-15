// =============================================
// ENGINE GIÁM SÁT TỔNG HỢP
// Điều phối tất cả AI modules + WebSocket
// =============================================
import { FaceVerification } from './FaceVerification';
import { FaceBehaviorMonitor } from './FaceBehaviorMonitor';
import { ObjectDetector } from './ObjectDetector';
import { OpticalFlowAnalyzer } from './OpticalFlowAnalyzer';
import { WebSocketClient } from './WebSocketClient';
import type {
  ViolationEvent, ViolationType, ProctoringConfig,
  ProctoringStatus
} from './types';
import { DEFAULT_PROCTORING_CONFIG } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ProctoringEngine {
  private faceVerification = new FaceVerification();
  private faceBehavior = new FaceBehaviorMonitor();
  private objectDetector = new ObjectDetector();
  private opticalFlow = new OpticalFlowAnalyzer();
  private wsClient = new WebSocketClient();

  private videoElement: HTMLVideoElement | null = null;
  private analysisLoop: number | null = null;
  private objectLoop: number | null = null;
  private config: ProctoringConfig;
  private isRunning = false;

  private isPhoneDetected = false;
  private noFaceCounter = 0;
  private lookingAwayCounter = 0;
  private identityViolationCounter = 0;
  private staticImageCounter = 0;
  private staticImageWarningCounter = 0;
  private isStaticImage = false;
  // Lưu landmarks từ face-api.js để dùng làm fallback cho head pose
  private lastLandmarks: any = null;

  // Cooldown tránh spam vi phạm cùng loại
  private lastViolationTime: Record<string, number> = {};
  private violationCooldownMs = 10000;

  // Xử lý lỗi MediaPipe Timestamp Mismatch
  private isAnalyzing = false;
  private lastTimestamp = 0;

  // Callbacks
  onStatusUpdate?: (status: ProctoringStatus) => void;
  onViolation?: (violation: ViolationEvent) => void;
  violations: ViolationEvent[] = [];

  constructor(config?: Partial<ProctoringConfig>) {
    this.config = { ...DEFAULT_PROCTORING_CONFIG, ...config };
  }

  // ============================================
  // KHỞI TẠO - Load tất cả AI models song song
  // ============================================
  async initialize(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const results = await Promise.allSettled([
      this.faceVerification.loadModels(),
      this.faceBehavior.loadModels(),
      this.objectDetector.loadModel(),
    ]);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const names = ['FaceVerification', 'FaceBehavior', 'ObjectDetector'];
        errors.push(`${names[i]}: ${r.reason}`);
      }
    });
    console.log('[Engine] Initialized.', errors.length > 0 ? `Errors: ${errors.join(', ')}` : 'All OK');
    return { success: errors.length === 0, errors };
  }

  async registerFace(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
    return this.faceVerification.registerReference(imageElement);
  }

  connectWebSocket(sessionId: string, examId: string, studentName: string) {
    this.wsClient.connect(sessionId, examId, studentName);
  }

  // ============================================
  // BẮT ĐẦU GIÁM SÁT
  // ============================================
  start(videoElement: HTMLVideoElement) {
    if (this.isRunning) return;
    this.videoElement = videoElement;
    this.isRunning = true;

    console.log('[Engine] Bắt đầu giám sát...');

    let lastAnalysisTime = 0;
    const loop = async () => {
      if (!this.isRunning) return;
      
      const now = performance.now();
      // Chạy phân tích chính mỗi ~1 giây
      if (now - lastAnalysisTime >= 1000) {
        await this.runMainAnalysis();
        lastAnalysisTime = now;
      }
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);

    // Vòng lặp phụ: YOLOv8 (mỗi 3s vì nặng hơn)
    this.objectLoop = window.setInterval(() => this.runObjectDetection(), this.config.objectDetectionInterval);
  }

  // ============================================
  // PHÂN TÍCH CHÍNH (mỗi 1 giây)
  // ============================================
  private async runMainAnalysis() {
    if (!this.videoElement || !this.isRunning || this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    try {
      // Đảm bảo timestamp luôn tăng dần để tránh lỗi MediaPipe
      const now = Math.max(performance.now(), this.lastTimestamp + 1);
      this.lastTimestamp = now;
      
      let faceCount = 0, faceDetected = false, identityVerified = true;
      let headPose = { yaw: 0, pitch: 0, roll: 0 };

    // 1. face-api.js — Xác thực danh tính + Đếm mặt
    if (this.faceVerification.isReady()) {
      try {
        const result = await this.faceVerification.verify(this.videoElement, this.config.faceMatchThreshold);
        faceCount = result.faceCount;
        faceDetected = faceCount > 0;

        if (faceDetected) {
          if (!result.isMatch) {
            this.identityViolationCounter++;
            // Chờ 4 lần detect liên tiếp (~4s) mới ghi vi phạm
            if (this.identityViolationCounter >= 4) {
              this.emitViolation('DIFFERENT_PERSON', { distance: result.distance });
              identityVerified = false;
            } else {
              identityVerified = false;
            }
          } else {
            this.identityViolationCounter = 0;
            identityVerified = true;
          }
        }

        if (faceCount > 1) {
          this.emitViolation('MULTIPLE_FACES', { count: faceCount });
        }
        // Lưu landmarks để dùng fallback cho head pose
        if (result.landmarks) this.lastLandmarks = result.landmarks;
      } catch (_) {
        console.error('[Engine] Face Verification Error:', _);
      }
    }

    // 2. MediaPipe — Head Pose Estimation
    if (this.faceBehavior.isReady()) {
      try {
        const behavior = this.faceBehavior.analyze(this.videoElement, now);
        faceDetected = faceDetected || behavior.faceDetected;
        faceCount = Math.max(faceCount, behavior.faceCount);
        headPose = behavior.headPose;
        // DEBUG: Log góc đầu khi đáng kể
        if (Math.abs(headPose.yaw) > 10 || Math.abs(headPose.pitch) > 10) {
          console.log(`[Engine] [MediaPipe] HeadPose: Yaw=${headPose.yaw.toFixed(1)}°, Pitch=${headPose.pitch.toFixed(1)}°`);
        }
      } catch (_) { }
    } else {
      // FALLBACK: Dùng face-api.js landmarks để ước tính góc đầu
      // Khi MediaPipe không load được từ CDN, vẫn có khả năng phát hiện quay đầu
      const landmarkPose = this.estimateHeadPoseFromLandmarks();
      if (landmarkPose) {
        headPose = landmarkPose;
        if (Math.abs(headPose.yaw) > 10 || Math.abs(headPose.pitch) > 10) {
          console.log(`[Engine] [Fallback/Landmark] HeadPose: Yaw=${headPose.yaw.toFixed(1)}°, Pitch=${headPose.pitch.toFixed(1)}°`);
        }
      } else {
        console.warn('[Engine] FaceBehavior (MediaPipe) chưa sẵn sàng và không có landmarks — bỏ qua Head Pose');
      }
    }

    // 3. Face Absence Detection
    // CHỆ báo NO_FACE khi: (1) không thấy mặt VÀ (2) góc đầu gần 0 (có nghĩa là không phải quay đầu)
    // Tránh việc bắt NO_FACE khi thực ra là đang quay đầu
    const isLikelyLookingAway = Math.abs(headPose.yaw) > 15 || Math.abs(headPose.pitch) > 15;
    if (!faceDetected && !isLikelyLookingAway) {
      this.noFaceCounter++;
      if (this.noFaceCounter >= this.config.faceAbsenceDuration) {
        this.emitViolation('NO_FACE', { duration: this.noFaceCounter });
        this.noFaceCounter = 0;
      }
    } else { this.noFaceCounter = 0; }

    // 4. Looking Away (Head Pose)
    // Sử dụng góc đầu từ MediaPipe, hoặc fallback từ face-api.js landmarks nếu MediaPipe không sẵn sàng
    const isLookingAway = Math.abs(headPose.yaw) > this.config.headPoseYawThreshold
      || Math.abs(headPose.pitch) > this.config.headPosePitchThreshold;

    if (isLookingAway) {
      this.lookingAwayCounter++;
      if (this.lookingAwayCounter >= this.config.lookingAwayDuration) {
        this.emitViolation('LOOKING_AWAY', { yaw: headPose.yaw.toFixed(1), pitch: headPose.pitch.toFixed(1) });
        this.lookingAwayCounter = 0;
      }
    } else {
      // Giảm dần thay vì reset về 0 ngay lập tức
      // → Tránh bỏ sót khi người dùng quay đầu qua lại nhiều lần ngắn
      this.lookingAwayCounter = Math.max(0, this.lookingAwayCounter - 1);
    }

    // 5. Optical Flow — Anti-spoofing
    // Phase 1: Đếm 30s → hiện badge
    // Phase 2: Chờ thêm 5s → ghi vi phạm
    try {
      const flow = this.opticalFlow.analyze(this.videoElement, this.config.opticalFlowThreshold);

      if (flow.isStatic) {
        if (!this.isStaticImage) {
          // Phase 1: chưa hiện badge, đang đếm đến staticImageDuration
          this.staticImageCounter++;
          if (this.staticImageCounter >= this.config.staticImageDuration) {
            this.isStaticImage = true;             // Bật badge (lưu trử bền vững)
            this.staticImageWarningCounter = 0;    // Bắt đầu đếm 5s
          }
        } else {
          // Phase 2: badge đang hiện, đếm thêm 5s rồi mới ghi vi phạm
          this.staticImageWarningCounter++;
          if (this.staticImageWarningCounter >= 5) {
            this.emitViolation('STATIC_IMAGE', { magnitude: flow.magnitude.toFixed(3) });
            this.staticImageCounter = 0;
            this.staticImageWarningCounter = 0;
            this.isStaticImage = false; // Reset badge sau khi đã ghi
          }
        }
      } else {
        // Có chuyển động → reset toàn bộ
        this.staticImageCounter = 0;
        this.staticImageWarningCounter = 0;
        this.isStaticImage = false;
      }
    } catch (_) { }

    // Cập nhật UI status
    this.onStatusUpdate?.({
      isActive: this.isRunning,
      faceDetected,
      faceCount,
      identityVerified, // Trạng thái này sẽ đỏ nếu đang vi phạm hoặc đang đếm vi phạm
      headPose,
      phoneDetected: this.isPhoneDetected,
      isStaticImage: this.isStaticImage,
      violations: this.violations
    });

    this.isAnalyzing = false;
  } catch (err) {
    console.error('[Engine] Critical analysis error:', err);
    this.isAnalyzing = false;
  }
}

  // ============================================
  // YOLOv8 — Phát hiện thiết bị (mỗi 3 giây)
  // ============================================
  private async runObjectDetection() {
    if (!this.videoElement || !this.isRunning || !this.objectDetector.isReady()) return;
    try {
      const result = await this.objectDetector.detect(this.videoElement, this.config.objectDetectionConfidence);
      this.isPhoneDetected = result.detected;
      if (result.detected) {
        this.emitViolation('PHONE_DETECTED', { objects: result.objects.map(o => `${o.className} (${(o.confidence * 100).toFixed(0)}%)`) });
      }
    } catch (_) { }
  }

  // ============================================
  // CHỤP ẢNH BẰNG CHỨNG
  // ============================================
  captureScreenshot(): string | null {
    if (!this.videoElement) return null;
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 640;
    canvas.height = this.videoElement.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(this.videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // Upload ảnh bằng chứng lên server, trả về URL
  private async uploadEvidence(imageData: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/proctoring/upload-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.url || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // GHI NHẬN VI PHẠM (có cooldown + chụp ảnh)
  // ============================================
  public async emitViolation(type: ViolationType, metadata?: Record<string, any>) {
    const now = Date.now();
    if (now - (this.lastViolationTime[type] || 0) < this.violationCooldownMs) return;
    this.lastViolationTime[type] = now;

    // Chụp ảnh bằng chứng cho các vi phạm phát hiện qua camera
    const cameraViolations: ViolationType[] = [
      'MULTIPLE_FACES', 'NO_FACE', 'DIFFERENT_PERSON',
      'LOOKING_AWAY', 'PHONE_DETECTED', 'STATIC_IMAGE',
    ];
    let evidenceUrl: string | undefined;
    if (this.videoElement && cameraViolations.includes(type)) {
      const screenshot = this.captureScreenshot();
      if (screenshot) {
        const uploaded = await this.uploadEvidence(screenshot);
        if (uploaded) evidenceUrl = `${API_BASE}${uploaded}`;
      }
    }

    const violation: ViolationEvent = {
      type,
      timestamp: new Date().toISOString(),
      evidenceUrl,
      metadata,
    };
    this.violations.push(violation);
    this.wsClient.reportViolation(violation);
    this.onViolation?.(violation);
    console.warn(`[Engine] ⚠ VI PHẠM: ${type}`, evidenceUrl ? '📸 Có bằng chứng' : '', metadata);
  }

  // ============================================
  // DỪNG GIÁM SÁT
  // ============================================
  stop() {
    this.isRunning = false;
    if (this.analysisLoop) clearInterval(this.analysisLoop);
    if (this.objectLoop) clearInterval(this.objectLoop);
    this.faceBehavior.destroy();
    this.objectDetector.destroy();
    this.wsClient.disconnect();
    console.log('[Engine] Đã dừng giám sát');
  }

  getViolations(): ViolationEvent[] { return [...this.violations]; }

  // ============================================
  // FALLBACK: Ước tính góc đầu từ landmarks face-api.js
  // Dùng khi MediaPipe không load được từ CDN
  // ============================================
  private estimateHeadPoseFromLandmarks(): { yaw: number; pitch: number; roll: number } | null {
    const lm = this.lastLandmarks;
    if (!lm) return null;
    try {
      // Lấy các điểm mốc chính từ 68-point landmark
      const positions = lm.positions; // Mảng với .x, .y
      if (!positions || positions.length < 68) return null;

      // Mũi (30), mắt phải (36-41), mắt trái (42-47), cằm (8)
      const nose = positions[30];
      const rightEye = positions[36];
      const leftEye = positions[45];
      const chin = positions[8];

      if (!nose || !rightEye || !leftEye || !chin) return null;

      // Tính tâm mắt
      const eyeCenterX = (rightEye.x + leftEye.x) / 2;
      const eyeCenterY = (rightEye.y + leftEye.y) / 2;
      const eyeWidth = Math.abs(leftEye.x - rightEye.x);

      // Yaw: Mũi lệch trái/phải so với tâm mắt
      // Ðược chuẩn hóa theo khoảng cách 2 mắt để không bị ảnh hưởng bởi zoom
      const yaw = eyeWidth > 0 ? ((nose.x - eyeCenterX) / eyeWidth) * 90 : 0;

      // Pitch: Mũi so với khoảng giữa mắt và cằm
      const faceHeight = Math.abs(chin.y - eyeCenterY);
      const pitch = faceHeight > 0 ? ((nose.y - eyeCenterY) / faceHeight - 0.4) * 90 : 0;

      return { yaw, pitch, roll: 0 };
    } catch {
      return null;
    }
  }
}
