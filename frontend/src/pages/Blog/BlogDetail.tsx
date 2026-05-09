import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FaCalendarAlt, FaUser, FaTag, FaShareAlt, FaClock,
  FaFacebookF, FaTwitter, FaLinkedinIn, FaLink, FaCommentDots
} from 'react-icons/fa';
import { blogsData } from './blogData'; 
import './BlogDetail.css'; 

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<any>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0); 
    const currentBlog = blogsData.find(b => b.id === Number(id));
    
    if (currentBlog) {
      setBlog(currentBlog);
      const related = blogsData.filter(b => b.id !== currentBlog.id).slice(0, 3);
      setRelatedBlogs(related);
    }
  }, [id]);

  if (!blog) return <div style={{textAlign:'center', padding:'100px'}}>Không tìm thấy bài viết!</div>;

  return (
    <div className="bd-wrapper">
      
      {/* 1. ẢNH BÌA COVER */}
      <div className="bd-cover" style={{ backgroundImage: `url(${blog.coverImage})` }}>
        <div className="bd-cover-overlay"></div>
        <div className="bd-cover-content">
          <span className="bd-badge">{blog.category}</span>
          <h1 className="bd-title">{blog.title}</h1>
          <div className="bd-meta">
            <span><FaUser /> {blog.author}</span>
            <span><FaCalendarAlt /> {blog.date}</span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH (Chia 2 cột: Trái nội dung, Phải thông tin) */}
      <div className="bd-container">
        <div className="bd-layout">
          
          {/* CỘT TRÁI: Nội dung bài viết & Bình luận */}
          <article className="bd-main-article">
            
            {/* Đường dẫn Breadcrumb & Tiêu đề nhỏ (Tùy chọn) */}
            <div className="bd-breadcrumb">
              Tin tức / {blog.title}
            </div>
            <div className="bd-sub-meta">
              <FaClock /> {blog.date} bởi <strong>{blog.author}</strong> | <FaCommentDots /> 2 Bình luận
            </div>

            {/* Nội dung HTML */}
            <div className="bd-content-html">
              <p className="bd-lead">{blog.excerpt}</p>
              {blog.content.map((htmlString: string, index: number) => (
                <div key={index} dangerouslySetInnerHTML={{ __html: htmlString }} />
              ))}
            </div>

            {/* Khung Bình luận */}
            <div className="bd-comments-section">
              <h3><FaCommentDots /> Bình luận (2)</h3>
              <div className="comment-item">
                <img src={`https://ui-avatars.com/api/?name=Sinh+Vien+A&background=e2e8f0`} alt="Avatar" className="comment-avatar" />
                <div className="comment-body">
                  <h4>Nguyễn Công Triết <span>- 2 ngày trước</span></h4>
                  <p>Bài viết rất hữu ích ạ. Cảm ơn tác giả!</p>
                </div>
              </div>
              <div className="comment-item">
                <img src={`https://ui-avatars.com/api/?name=Sinh+Vien+A&background=e2e8f0`} alt="Avatar" className="comment-avatar" />
                <div className="comment-body">
                  <h4>Hà Anh Khoa <span>- 3 giờ trước</span></h4>
                  <p>Hay thật đấy</p>
                </div>
              </div>
              <div className="comment-form">
                <h4>Viết bình luận của bạn</h4>
                <textarea rows={4} placeholder="Nhập nội dung bình luận..."></textarea>
                <button className="submit-comment-btn">Gửi bình luận</button>
              </div>
            </div>

          </article>

          {/* CỘT PHẢI: Sidebar Thông tin Tác giả, Share, Tags */}
          <aside className="bd-sidebar">
            
            {/* Thông tin tác giả */}
            <div className="sidebar-box author-box">
              <div className="author-header">
                <div className="author-avatar">{blog.author.charAt(0)}</div>
                <div className="author-info">
                  <h4>{blog.author}</h4>
                  <span>{blog.date}</span>
                </div>
              </div>
            </div>

            {/* Chia sẻ */}
            <div className="sidebar-box share-box">
              <h4>CHIA SẺ BÀI NÀY</h4>
              <div className="bd-share-icons">
                <button className="share-btn fb"><FaFacebookF /></button>
                <button className="share-btn tw"><FaTwitter /></button>
                <button className="share-btn li"><FaLinkedinIn /></button>
                <button className="share-btn link"><FaLink /></button>
              </div>
            </div>

            {/* Thẻ Tags */}
            <div className="sidebar-box tags-box">
              <h4>THẺ (TAGS)</h4>
              <div className="bd-tags">
                {blog.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="bd-tag-item">{tag}</span>
                ))}
              </div>
            </div>

          </aside>

        </div>

        {/* 3. BÀI VIẾT LIÊN QUAN (Đẩy xuống dưới cùng) */}
        <div className="bd-related-section">
          <h3>Bài viết liên quan</h3>
          <div className="related-grid">
            {relatedBlogs.map(rb => (
              <Link to={`/blog/${rb.id}`} key={rb.id} className="related-card">
                <div className="related-img-wrap">
                  <img src={rb.coverImage} alt={rb.title} />
                </div>
                <div className="related-info">
                  <h4>{rb.title}</h4>
                  <span className="related-date"><FaCalendarAlt /> {rb.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}