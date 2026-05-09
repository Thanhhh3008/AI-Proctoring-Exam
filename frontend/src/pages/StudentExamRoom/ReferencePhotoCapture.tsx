import React, { useRef, useState, useCallback, useEffect } from 'react';
import './ReferencePhotoCapture.css';

interface Props { 
  onCapture: (imageData: string) => void;
  externalErrorMsg?: string;
  onErrorMsgRead?: () => void;
}

export default function ReferencePhotoCapture({ onCapture, externalErrorMsg, onErrorMsgRead }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        videoRef.current.play(); 
        setIsStreaming(true); 
        setError(''); 
      }
    } catch { 
      setError('Không thể truy cập webcam. Vui lòng cấp quyền camera.'); 
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0, 640, 480);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (onErrorMsgRead) onErrorMsgRead();
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) { 
      // Không dừng track ở đây nếu có khả năng cần chụp lại
      // Tracks sẽ được dừng bởi StudentExamRoom hoặc khi unmount
      onCapture(capturedImage); 
    }
  };

  return (
    <div className="rpc-overlay">
      <div className="rpc-card">
        {externalErrorMsg && (
          <div className="rpc-error-modal-overlay">
            <div className="rpc-error-modal">
              <div className="rpc-error-icon">⚠️</div>
              <h3>Lỗi xác thực</h3>
              <p>{externalErrorMsg}</p>
              <button className="rpc-btn-retake" onClick={handleRetake}>Chụp lại</button>
            </div>
          </div>
        )}

        <div className="rpc-header">
          <div className="rpc-icon"></div>
          <h2 className="rpc-title">Xác thực danh tính</h2>
          <p className="rpc-desc">Hệ thống AI giám sát yêu cầu chụp ảnh khuôn mặt để xác minh danh tính trong suốt bài thi.</p>
        </div>

        <div className="rpc-camera-area">
          {!isStreaming && !capturedImage && (
            <div className="rpc-placeholder">
              <button className="rpc-btn-start" onClick={startCamera}> Bật Camera</button>
              {error && <p className="rpc-error">{error}</p>}
            </div>
          )}
          <video ref={videoRef} className="rpc-video" style={{ display: isStreaming && !capturedImage ? 'block' : 'none' }} autoPlay playsInline muted />
          {capturedImage && <img src={capturedImage} alt="Ảnh xác thực" className="rpc-preview" />}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {isStreaming && !capturedImage && (
            <div className="rpc-face-guide"><div className="rpc-oval"></div><span className="rpc-guide-text">Đặt khuôn mặt vào khung</span></div>
          )}
        </div>

        <div className="rpc-actions">
          {isStreaming && !capturedImage && <button className="rpc-btn-capture" onClick={capturePhoto}> Chụp ảnh xác thực</button>}
          {capturedImage && !externalErrorMsg && (
            <>
              <button className="rpc-btn-retake" onClick={handleRetake}> Chụp lại</button>
              <button className="rpc-btn-confirm" onClick={confirm}> Xác nhận và bắt đầu thi</button>
            </>
          )}
        </div>
        <div className="rpc-notice"><strong>Lưu ý:</strong> AI sẽ so sánh khuôn mặt của bạn trong suốt bài thi với ảnh này. Đảm bảo ánh sáng đủ và không đeo khẩu trang.</div>
      </div>
    </div>
  );
}
