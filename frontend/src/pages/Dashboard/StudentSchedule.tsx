import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import './StudentSchedule.css';

export default function StudentSchedule() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [globalSchedule, setGlobalSchedule] = useState<any[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    const fetchScheduleData = async () => {
      setLoading(true);
      try {
        const classRes = await axiosClient.get('/classes/my-classes');
        const myClasses = classRes.data || [];
        
        let scheduleItems: any[] = [];

        await Promise.all(
          myClasses.map(async (cls: any) => {
            try {
              const detailRes = await axiosClient.get(`/classes/${cls.id}/studentclass`);
              const sections = detailRes.data.sections || [];
              
              sections.forEach((sec: any) => {
                const activities = sec.activities || [];
                activities.forEach((act: any) => {
                  const isExam = act.type?.toUpperCase() === 'EXAM' || !!act.examId;

                  if (isExam) {
                    const startTime = act.exam?.startTime || act.startTime;
                    const endTime = act.exam?.endTime || act.endTime;

                    if (startTime) {
                      scheduleItems.push({
                        id: act.id,
                        type: 'EXAM_START',
                        className: cls.subjectName,
                        classCode: cls.classCode,
                        date: startTime,
                        title: `[Mở đề] ${act.title}`
                      });
                    }
                    if (endTime) {
                      scheduleItems.push({
                        id: act.id,
                        type: 'EXAM_END',
                        className: cls.subjectName,
                        classCode: cls.classCode,
                        date: endTime,
                        title: `[Đóng đề] ${act.title}`
                      });
                    }
                  } else if (act.dueDate) {
                    scheduleItems.push({
                      id: act.id,
                      type: 'ASSIGNMENT',
                      className: cls.subjectName,
                      classCode: cls.classCode,
                      date: act.dueDate,
                      title: act.title
                    });
                  }
                });
              });
            } catch (err) {
              console.error(`Lỗi khi lấy chi tiết lớp ${cls.id}:`, err);
            }
          })
        );

        scheduleItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setGlobalSchedule(scheduleItems);
      } catch (error) {
        console.error("Lỗi tải dữ liệu lịch biểu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScheduleData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải lịch biểu...</div>;
  }

  return (
    <div className="student-schedule-container" style={{ display: 'flex', height: 'calc(100vh - 80px)', backgroundColor: 'white', overflow: 'hidden', fontFamily: '"Roboto", "Arial", sans-serif' }}>
      <div className="gc-sidebar" style={{ width: '280px', borderRight: '1px solid #dadce0', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#3c4043', marginLeft: '8px' }}>
              Tháng {currentCalendarDate.getMonth() + 1}, {currentCalendarDate.getFullYear()}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="gc-nav-btn" onClick={() => { const d = new Date(currentCalendarDate); d.setMonth(d.getMonth() - 1); setCurrentCalendarDate(d); }}><FaChevronRight style={{ transform: 'rotate(180deg)', fontSize: '12px' }} /></button>
              <button className="gc-nav-btn" onClick={() => { const d = new Date(currentCalendarDate); d.setMonth(d.getMonth() + 1); setCurrentCalendarDate(d); }}><FaChevronRight style={{ fontSize: '12px' }} /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', color: '#70757a', fontWeight: 500, marginBottom: '8px' }}>
            {['Cn', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
            {(() => {
              const days = [];
              const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
              const lastDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
              const prevLastDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 0).getDate();
              for (let i = firstDay; i > 0; i--) days.push({ d: prevLastDate - i + 1, current: false, monthOffset: -1 });
              for (let i = 1; i <= lastDate; i++) days.push({ d: i, current: true, monthOffset: 0 });
              const remain = 42 - days.length;
              for (let i = 1; i <= remain; i++) days.push({ d: i, current: false, monthOffset: 1 });

              return days.map((day, idx) => {
                const dateObj = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + day.monthOffset, day.d);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                return (
                  <div key={idx}
                    className="gc-day-cell"
                    onClick={() => setCurrentCalendarDate(dateObj)}
                    style={{
                      height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', borderRadius: '50%', cursor: 'pointer',
                      backgroundColor: isToday ? '#1a73e8' : 'transparent',
                      color: isToday ? 'white' : (day.current ? '#3c4043' : '#dadce0'),
                      fontWeight: isToday ? 700 : 400
                    }}>
                    {day.d}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
      
      <div className="gc-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '64px', borderBottom: '1px solid #dadce0', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <button
            className="gc-today-btn"
            onClick={() => setCurrentCalendarDate(new Date())}
            style={{ padding: '8px 24px', border: '1px solid #dadce0', background: 'white', borderRadius: '24px', fontSize: '14px', fontWeight: 500, color: '#3c4043', cursor: 'pointer', marginRight: '24px' }}
          >Hôm nay</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '24px' }}>
            <button className="gc-nav-btn main" onClick={() => { const d = new Date(currentCalendarDate); d.setDate(d.getDate() - 7); setCurrentCalendarDate(d); }}><FaChevronRight style={{ transform: 'rotate(180deg)', fontSize: '14px', color: '#5f6368' }} /></button>
            <button className="gc-nav-btn main" onClick={() => { const d = new Date(currentCalendarDate); d.setDate(d.getDate() + 7); setCurrentCalendarDate(d); }}><FaChevronRight style={{ fontSize: '14px', color: '#5f6368' }} /></button>
          </div>
          <span style={{ fontSize: '22px', color: '#3c4043' }}>Tháng {currentCalendarDate.getMonth() + 1}, {currentCalendarDate.getFullYear()}</span>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #dadce0', paddingRight: '15px' }}>
            <div style={{ width: '80px', flexShrink: 0, borderRight: '1px solid #dadce0', padding: '10px', fontSize: '11px', color: '#70757a', textAlign: 'center', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>GMT+07</div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {(() => {
                const weekDays = [];
                const pivot = new Date(currentCalendarDate);
                const dayOfWeek = pivot.getDay();
                const startOfWeek = new Date(pivot);
                startOfWeek.setDate(pivot.getDate() - dayOfWeek);
                const dayNames = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
                for (let i = 0; i < 7; i++) {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  const isToday = d.toDateString() === new Date().toDateString();
                  weekDays.push(
                    <div key={i} style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid #dadce0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: isToday ? '#1a73e8' : '#70757a', marginBottom: '8px' }}>{dayNames[d.getDay()]}</span>
                      <span style={{ fontSize: '24px', fontWeight: 400, color: isToday ? 'white' : '#3c4043', backgroundColor: isToday ? '#1a73e8' : 'transparent', width: '44px', height: '44px', lineHeight: '44px', borderRadius: '50%' }}>{d.getDate()}</span>
                    </div>
                  );
                }
                return weekDays;
              })()}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', position: 'relative' }}>
            <div className="time-column" style={{ width: '80px', flexShrink: 0, borderRight: '1px solid #dadce0', backgroundColor: 'white' }}>
              {[...Array(24)].map((_, i) => {
                const hour = i;
                let displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return (
                  <div key={i} style={{ height: '48px', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-10px', right: '10px', fontSize: '10px', color: '#70757a' }}>
                      {displayHour} {ampm}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', position: 'relative', minHeight: '1152px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {[...Array(24)].map((_, i) => (
                  <div key={i} style={{ height: '48px', borderBottom: '1px solid #f1f3f4' }}></div>
                ))}
              </div>

              {[...Array(7)].map((_, i) => (
                <div key={i} style={{ borderRight: '1px solid #dadce0', position: 'relative', height: '100%' }}>
                  {(() => {
                    const pivot = new Date(currentCalendarDate);
                    const dayOfWeek = pivot.getDay();
                    const startOfWeek = new Date(pivot);
                    startOfWeek.setDate(pivot.getDate() - dayOfWeek);
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);

                    const dayEvents = globalSchedule.filter(e => new Date(e.date).toDateString() === d.toDateString());
                    return dayEvents.map((ev, evIdx) => {
                      const date = new Date(ev.date);
                      const hours = date.getHours();
                      const minutes = date.getMinutes();
                      const top = (hours * 48) + (minutes / 60 * 48);

                      let bgColor = '#f9ab00';
                      let label = 'Hạn nộp bài';
                      if (ev.type === 'EXAM_START') {
                        bgColor = '#1e8e3e';
                        label = 'Mở đề thi';
                      } else if (ev.type === 'EXAM_END') {
                        bgColor = '#d93025';
                        label = 'Thời gian đóng đề';
                      }

                      return (
                        <div key={evIdx} onClick={() => navigate(`/activity/${ev.id}`)} style={{
                          position: 'absolute', top: `${top}px`, left: '4px', right: '4px',
                          minHeight: '50px', backgroundColor: bgColor,
                          color: 'white', borderRadius: '4px', padding: '6px 8px', fontSize: '10px',
                          fontWeight: 500, zIndex: 10, cursor: 'pointer', overflow: 'hidden',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '3px'
                        }}>
                          <div style={{ fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Lớp {ev.className}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.95 }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '9px', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                            </span>
                            {label}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
