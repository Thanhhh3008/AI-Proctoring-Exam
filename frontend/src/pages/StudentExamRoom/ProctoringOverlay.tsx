import React, { useRef, useEffect } from 'react';
import type { ProctoringStatus } from '../../proctoring/types';
import './ProctoringOverlay.css';

interface Props { videoStream: MediaStream | null; status: ProctoringStatus; }

export default function ProctoringOverlay({ videoStream, status }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoStream) { videoRef.current.srcObject = videoStream; videoRef.current.play().catch(() => { }); }
  }, [videoStream]);

  const getStatusBadge = () => {
    if (!status.isActive) return { text: 'Đang tải', color: '#6b7280' };

    // Kiểm tra các trạng thái cảnh báo/vi phạm
    const yaw = Math.abs(status.headPose.yaw);
    const pitch = Math.abs(status.headPose.pitch);

    if (status.phoneDetected) return { text: ' PHÁT HIỆN ĐIỆN THOẠI', color: '#ef4444' };
    if (status.faceCount > 1) return { text: ' NHIỀU NGƯỜI', color: '#ef4444' };
    if (!status.identityVerified) return { text: 'SAI NGƯỜI', color: '#f59e0b' };
    if (!status.faceDetected) return { text: 'KHÔNG THẤY MẶT', color: '#f59e0b' };
    if (yaw > 25 || pitch > 20) return { text: 'QUAY ĐẦU', color: '#f59e0b' };
    if (status.isStaticImage) return { text: 'ẢNH TĨNH?', color: '#f59e0b' };

    return { text: 'Bình thường', color: '#10b981' };
  };


  const badge = getStatusBadge();
  return (
    <div className="po-container">
      <video ref={videoRef} className="po-video" autoPlay playsInline muted />
      <div className="po-badge" style={{ background: badge.color }}><span className="po-badge-dot"></span>{badge.text}</div>
      <div className="po-border" style={{ borderColor: badge.color }} />
      {status.violations.length > 0 && <div className="po-violation-count">⚠ {status.violations.length}</div>}
    </div>
  );
}
