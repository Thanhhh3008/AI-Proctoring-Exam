import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'SUCCESS' | 'FAILED' | 'PENDING'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>(''); // Lưu thông báo lỗi chi tiết

useEffect(() => {
    const processPayment = async () => {
      const resultCode = searchParams.get('resultCode');
      const orderId = searchParams.get('orderId');
      const transId = searchParams.get('transId') || ''; // Có thể có hoặc không
      
      const localMessage = searchParams.get('localMessage') || searchParams.get('message');

      // Nếu MoMo báo thành công (resultCode = 0)
      if (resultCode === '0' && orderId) {
        try {
          // GỌI LÊN BACKEND VÀ TRUYỀN resultCode XUỐNG
          await axiosClient.post('/payment/check-status', { 
            orderId, 
            resultCode, 
            transId 
          });
          setStatus('SUCCESS');
        } catch (error) {
          console.error('Lỗi khi xác thực giao dịch:', error);
          setStatus('FAILED'); 
          setErrorMessage('Không thể xác thực giao dịch với máy chủ.');
        }
      } else {
        // MoMo báo thất bại (resultCode khác 0) - Báo thẳng lỗi luôn, không gọi Backend nữa
        setStatus('FAILED');
        setErrorMessage(localMessage || 'Đã có lỗi xảy ra trong quá trình thanh toán.');
        
        // Vẫn gọi Backend để nó update trạng thái trong Database thành FAILED
        if (orderId) {
            try {
                await axiosClient.post('/payment/check-status', { orderId, resultCode, transId });
            } catch(e) {} // Bỏ qua lỗi ở đây vì đằng nào cũng là FAILED
        }
      }
      setLoading(false);
    };

    processPayment();
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        
        {loading ? (
          <>
            <FaSpinner className="fa-spin" size={50} color="#3b82f6" style={{ margin: '0 auto 20px auto', display: 'block' }} />
            <h2 style={{ color: '#1e293b' }}>Đang xác thực giao dịch...</h2>
            <p style={{ color: '#64748b' }}>Vui lòng không đóng trình duyệt.</p>
          </>
        ) : status === 'SUCCESS' ? (
          <>
            <FaCheckCircle size={60} color="#10b981" style={{ margin: '0 auto 20px auto', display: 'block' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Thanh toán thành công!</h2>
            <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.5' }}>
              Cảm ơn bạn đã mua khóa học. Biên lai đã được gửi vào Email của bạn. Hệ thống đã tự động thêm bạn vào lớp học.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Vào lớp học ngay
            </button>
          </>
        ) : (
          <>
            <FaTimesCircle size={60} color="#ef4444" style={{ margin: '0 auto 20px auto', display: 'block' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Thanh toán thất bại</h2>
            
            {/* Hiển thị lỗi chi tiết lấy từ MoMo */}
            <div style={{ backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
              <p style={{ color: '#991b1b', margin: 0, fontWeight: '500', fontSize: '14px' }}>
                Lý do: {errorMessage}
              </p>
            </div>

            <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.5', fontSize: '14px' }}>
              Vui lòng kiểm tra lại thông tin tài khoản hoặc chọn phương thức thanh toán khác.
            </p>
            <button 
              onClick={() => navigate('/available-classes')}
              style={{ padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Quay lại trang khám phá
            </button>
          </>
        )}

      </div>
    </div>
  );
}