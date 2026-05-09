import React from 'react';
import { FaCalendarAlt, FaUser, FaArrowRight } from 'react-icons/fa';
import { blogsData } from './blogData'; // <-- Import 7 bài viết từ file data
import './BlogPage.css';

export default function BlogPage() {
  return (
    <div className="blog-page-wrapper">
      {/* Header Banner */}
      <div className="blog-hero">
        <h1>Tin tức & Sự kiện</h1>
        <p>Cập nhật những thông tin mới nhất về hệ thống EduExam, kinh nghiệm học tập và các sự kiện giáo dục nổi bật.</p>
      </div>

      {/* Blog Grid */}
      <div className="blog-container">
        <div className="blog-grid">
          {/* Đổi mockBlogs thành blogsData */}
          {blogsData.map((blog) => (
            <article key={blog.id} className="blog-card">
              <div className="blog-image-wrapper">
                <span className="blog-category">{blog.category}</span>
                {/* Đổi blog.imageUrl thành blog.coverImage cho khớp với dữ liệu */}
                <img src={blog.coverImage} alt={blog.title} className="blog-image" />
              </div>
              <div className="blog-content">
                <div className="blog-meta">
                  <span><FaCalendarAlt /> {blog.date}</span>
                  <span><FaUser /> {blog.author}</span>
                </div>
                <h2 className="blog-title">
                  <a href={`/blog/${blog.id}`}>{blog.title}</a>
                </h2>
                <p className="blog-excerpt">{blog.excerpt}</p>
                <a href={`/blog/${blog.id}`} className="blog-read-more">
                  Đọc tiếp <FaArrowRight size={12} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}