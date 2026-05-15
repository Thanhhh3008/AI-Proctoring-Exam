export type ViolationType =
  | 'MULTIPLE_FACES' | 'NO_FACE' | 'DIFFERENT_PERSON' | 'LOOKING_AWAY'
  | 'PHONE_DETECTED' | 'STATIC_IMAGE' | 'TAB_SWITCH' | 'FULLSCREEN_EXITED' | 'COPY_PASTE';

export interface ViolationEvent {
  type: ViolationType;
  timestamp: string;
  evidenceUrl?: string;
  metadata?: Record<string, any>;
}

export interface ProctoringConfig {
  faceMatchThreshold: number;
  headPoseYawThreshold: number;
  headPosePitchThreshold: number;
  lookingAwayDuration: number;
  faceAbsenceDuration: number;
  objectDetectionInterval: number;
  objectDetectionConfidence: number;
  opticalFlowThreshold: number;
  staticImageDuration: number;
}

export const DEFAULT_PROCTORING_CONFIG: ProctoringConfig = {
  faceMatchThreshold: 0.55, //càng cao càng khó phân biệt
  headPoseYawThreshold: 20,//quay đầu quá 20 độ
  headPosePitchThreshold: 20,//cúi đầu quá 20 độ
  lookingAwayDuration: 5,//quay đầu quá 5 giây mới báo vi phạm
  faceAbsenceDuration: 5,//không thấy mặt quá 10 giây mới báo vi phạm
  objectDetectionInterval: 2000,//2s quét đt
  objectDetectionConfidence: 0.15,//ngưỡng tin cậy
  opticalFlowThreshold: 2.0,//ngưỡng nhạy cảm với chuyển động
  staticImageDuration: 15,//ảnh tĩnh quá 30 giây
};


export type ProctoringStatus = {
  isActive: boolean;
  faceDetected: boolean;
  faceCount: number;
  identityVerified: boolean;
  headPose: { yaw: number; pitch: number; roll: number };
  phoneDetected: boolean;
  isStaticImage: boolean;
  violations: ViolationEvent[];
}
