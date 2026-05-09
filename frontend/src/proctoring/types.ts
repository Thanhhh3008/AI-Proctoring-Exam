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
  lookingAwayDuration: 5,//thời gian quay đầu
  faceAbsenceDuration: 10,//không thấy mặt quá 10 giây
  objectDetectionInterval: 2000,//2s quét đt
  objectDetectionConfidence: 0.2,//ngưỡng tin cậy
  opticalFlowThreshold: 2.0,//ngưỡng nhạy cảm với chuyển động
  staticImageDuration: 30,//ảnh tĩnh quá 30 giây
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
