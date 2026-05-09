// blogData.ts

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  coverImage: string;
  tags: string[];
  content: string[]; // Mỗi phần tử là một khối HTML (đoạn văn, tiêu đề, hoặc ảnh)
}

export const blogsData: BlogPost[] = [
  {
    id: 1,
    title: 'EduExam ra mắt tính năng Giám sát thi trực tuyến (Proctoring) bằng AI',
    excerpt: 'Tính năng mới giúp giáo viên dễ dàng phát hiện các hành vi gian lận trong quá trình thi, đảm bảo tính công bằng và minh bạch tuyệt đối.',
    category: 'Cập nhật hệ thống',
    author: 'Ban quản trị EduExam',
    date: '20/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
    tags: ['AI', 'Proctoring', 'Tính năng mới', 'Gian lận thi cử'],
    content: [
      '<h3>Bước tiến mới trong kỷ nguyên thi trực tuyến</h3>',
      '<p>Kể từ khi hình thức học và thi trực tuyến trở nên phổ biến, bài toán về việc đảm bảo tính công bằng, chống gian lận luôn làm đau đầu các nhà quản lý giáo dục. Các phần mềm gọi video thông thường như Zoom hay Google Meet chỉ giải quyết được phần "nhìn", nhưng không thể kiểm soát được màn hình và hành vi vi mô của thí sinh. Nhận thức được điều đó, EduExam chính thức tung ra tính năng <strong>Giám sát thi AI (Proctoring)</strong>.</p>',
      '<img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" alt="AI Analytics" />',
      '<h3>Công nghệ nhận diện hành vi (Behavior Analysis)</h3>',
      '<p>Hệ thống AI của EduExam được huấn luyện dựa trên hàng triệu biểu cảm và hành vi của thí sinh trong phòng thi. Camera sẽ liên tục quét khuôn mặt của thí sinh để phát hiện các dấu hiệu bất thường như: ánh mắt đảo liên tục ra ngoài màn hình, có người thứ hai xuất hiện trong khung hình, hoặc thí sinh đột ngột rời khỏi vị trí.</p>',
      '<p>Ngay khi phát hiện, hệ thống sẽ tự động chụp ảnh màn hình, ghi hình lại đoạn video nghi vấn và gửi cảnh báo "Đỏ" (Cấp độ 1) đến màn hình quản lý của Giám thị. Giám thị có thể xem lại ngay lập tức và quyết định đình chỉ thi hoặc trừ điểm.</p>',
      '<img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800&auto=format&fit=crop" alt="Face Recognition" />',
      '<h3>Khóa trình duyệt (Safe Exam Browser)</h3>',
      '<p>Song song với việc nhận diện khuôn mặt, tính năng Proctoring còn can thiệp sâu vào trình duyệt. Khi bài thi bắt đầu, thí sinh sẽ không thể mở Tab mới, không thể sử dụng tổ hợp phím Copy/Paste (Ctrl+C, Ctrl+V), và không thể chuyển sang cửa sổ ứng dụng khác (như Messenger, Zalo hay tài liệu Word).</p>',
      '<img src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=800&auto=format&fit=crop" alt="Locked Browser" />',
      '<h3>Tương lai của Giáo dục số</h3>',
      '<p>Việc áp dụng AI không nhằm mục đích "đe dọa" sinh viên, mà là để tạo ra một môi trường cạnh tranh lành mạnh. Những sinh viên học tập nghiêm túc sẽ không còn cảm thấy bất công trước những hành vi gian lận tinh vi. EduExam tin rằng, công nghệ này sẽ là tiêu chuẩn bắt buộc cho mọi kỳ thi trực tuyến trong vòng 5 năm tới.</p>',
      '<img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" alt="Future Education" />'
    ]
  },
  {
    id: 2,
    title: 'Hội thảo trực tuyến: Ứng dụng công nghệ vào chuyển đổi số giáo dục',
    excerpt: 'Kính mời các quý thầy cô tham gia buổi hội thảo chia sẻ kinh nghiệm giảng dạy và quản lý lớp học hiệu quả trong kỷ nguyên số.',
    category: 'Sự kiện',
    author: 'Phòng Đào tạo',
    date: '18/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1200&auto=format&fit=crop',
    tags: ['Hội thảo', 'Chuyển đổi số', 'Công nghệ giáo dục', 'Event'],
    content: [
      '<h3>Thách thức và Cơ hội của Chuyển đổi số</h3>',
      '<p>Chuyển đổi số không đơn thuần là việc "tin học hóa" bài giảng (chuyển từ bảng đen phấn trắng sang file PowerPoint). Chuyển đổi số là sự thay đổi toàn diện về phương pháp tư duy, cách thức quản lý và tương tác giữa nhà trường - giảng viên - sinh viên. Buổi hội thảo lần này do EduExam phối hợp cùng các chuyên gia hàng đầu tổ chức nhằm giải phẫu những thách thức thực tế mà các trường đại học đang gặp phải.</p>',
      '<img src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800&auto=format&fit=crop" alt="Digital Seminar" />',
      '<h3>Nội dung chính của Hội thảo</h3>',
      '<p>Buổi hội thảo sẽ kéo dài trong 3 tiếng, bao gồm 4 chuyên đề chính:</p>',
      '<ul><li><strong>Chuyên đề 1:</strong> Xây dựng học liệu số tương tác - Vượt ra khỏi giới hạn của Slide truyền thống.</li><li><strong>Chuyên đề 2:</strong> Cá nhân hóa lộ trình học tập bằng phân tích dữ liệu (Data Analytics).</li><li><strong>Chuyên đề 3:</strong> Tổ chức thi và kiểm tra đánh giá năng lực trực tuyến an toàn.</li><li><strong>Chuyên đề 4:</strong> Tọa đàm: Lắng nghe khó khăn từ các khoa, phòng ban.</li></ul>',
      '<img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop" alt="Workshop Panel" />',
      '<h3>Diễn giả khách mời</h3>',
      '<p>Chúng tôi vinh dự đón tiếp Tiến sĩ Trần Văn A - Chuyên gia công nghệ giáo dục từ Viện Nghiên cứu Đổi mới Giáo dục, cùng Thạc sĩ Lê Thị B - Trưởng phòng Đào tạo trường Đại học Công nghệ, người đã ứng dụng thành công EduExam cho hơn 15.000 sinh viên.</p>',
      '<img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop" alt="Speaker" />',
      '<h3>Thông tin đăng ký</h3>',
      '<p>Sự kiện sẽ diễn ra hoàn toàn miễn phí trên nền tảng trực tuyến. Quý thầy cô vui lòng điền form đăng ký trước ngày 25/04 để nhận mã truy cập phòng hội thảo. 100 khách mời đăng ký sớm nhất sẽ nhận được bộ Ebook "Cẩm nang số hóa bài giảng 2026".</p>',
      '<img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop" alt="Register Now" />'
    ]
  },
  {
    id: 3,
    title: '5 Bí quyết giúp sinh viên đạt điểm tuyệt đối trong các kỳ thi trắc nghiệm',
    excerpt: 'Tổng hợp các phương pháp phân bổ thời gian, loại trừ đáp án sai và chuẩn bị tâm lý tốt nhất trước khi bước vào phòng thi.',
    category: 'Góc sinh viên',
    author: 'EduExam Team',
    date: '15/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop',
    tags: ['Kỹ năng', 'Thi trắc nghiệm', 'Sinh viên', 'Bí quyết điểm cao'],
    content: [
      '<h3>1. Phân bổ thời gian theo nguyên tắc 3 vòng</h3>',
      '<p>Sai lầm lớn nhất của sinh viên khi làm bài trắc nghiệm là "câu nào cũng muốn giải ngay". Lời khuyên từ các thủ khoa là hãy quét đề theo 3 vòng. Vòng 1: Làm các câu cực dễ (chỉ mất 10-15s/câu). Vòng 2: Suy nghĩ các câu trung bình. Vòng 3: Dồn toàn bộ thời gian còn lại cho những câu cực khó. Đừng bao giờ để mất điểm ở câu dễ chỉ vì kẹt lại ở câu khó.</p>',
      '<img src="https://images.unsplash.com/photo-1506784926709-22f1ec395907?q=80&w=800&auto=format&fit=crop" alt="Time Management" />',
      '<h3>2. Kỹ thuật "Loại trừ đáp án nhiễu"</h3>',
      '<p>Trong 4 đáp án A, B, C, D, thường sẽ có 2 đáp án sai hoàn toàn (đáp án nhiễu thô) và 1 đáp án "gần đúng" (đáp án nhiễu tinh). Nhiệm vụ của bạn là nhanh chóng nhận diện 2 đáp án sai thô. Khi chỉ còn tỷ lệ 50/50, xác suất chọn đúng của bạn sẽ tăng lên rất nhiều ngay cả khi phải "lụi".</p>',
      '<img src="https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop" alt="Testing" />',
      '<h3>3. Đọc kỹ từ khóa "phủ định"</h3>',
      '<p>Các giảng viên rất thích gài bẫy bằng các từ như: "Không phải", "Ngoại trừ", "Sai". Hãy cầm bút chì gạch chân hoặc khoanh tròn ngay các từ này khi đọc đề. Nếu thi trên nền tảng EduExam, bạn có thể dùng tính năng "Highlight text" (bôi màu văn bản) để đánh dấu từ khóa.</p>',
      '<img src="https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?q=80&w=800&auto=format&fit=crop" alt="Highlighting" />',
      '<h3>4. Tận dụng nháp hiệu quả</h3>',
      '<p>Thi trắc nghiệm không có nghĩa là chỉ nhìn và bấm chọn. Với các môn tính toán (Toán, Lý, Hóa, Kinh tế vĩ mô), giấy nháp là vũ khí tối thượng. Hãy chia nháp thành các ô vuông nhỏ, đánh số thứ tự câu tương ứng. Nếu cần quay lại kiểm tra một phép tính cũ, bạn sẽ tìm thấy ngay lập tức thay vì phải tính lại từ đầu.</p>',
      '<p><strong>Lưu ý:</strong> Hãy mang theo 2 cây bút chì và 1 cục tẩy xịn. Tẩy sạch đáp án cũ là cách tốt nhất để máy chấm thi quang học không chấm nhầm.</p>',
      '<img src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop" alt="Notes" />',
      '<h3>5. Giữ cái đầu lạnh trong 5 phút cuối</h3>',
      '<p>Khi hệ thống đếm ngược báo còn 5 phút, hãy DỪNG giải bài mới. Đây là thời gian vàng để: Kiểm tra xem đã tick đủ các câu chưa (không bỏ sót), kiểm tra thông tin số báo danh, mã đề. Việc bỏ trống một câu trắc nghiệm là một tội ác với điểm số của bạn!</p>'
    ]
  },
  {
    id: 4,
    title: 'Bảo trì hệ thống định kỳ tháng 4/2026',
    excerpt: 'Hệ thống EduExam sẽ tạm gián đoạn truy cập từ 22:00 đến 23:59 ngày 25/04/2026 để nâng cấp máy chủ. Mong quý người dùng thông cảm.',
    category: 'Thông báo',
    author: 'Đội ngũ Kỹ thuật',
    date: '10/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop',
    tags: ['Bảo trì', 'Nâng cấp hệ thống', 'Thông báo', 'Server'],
    content: [
      '<h3>Thông báo ngừng dịch vụ tạm thời</h3>',
      '<p>Kính gửi quý Giảng viên và Sinh viên, nhằm mục đích nâng cao chất lượng dịch vụ và độ ổn định của hệ thống trong kỳ thi cuối kỳ sắp tới, đội ngũ kỹ thuật EduExam sẽ tiến hành bảo trì và nâng cấp máy chủ định kỳ tháng 4/2026.</p>',
      '<img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop" alt="Server Maintenance" />',
      '<h3>Thời gian dự kiến</h3>',
      '<p><strong>Bắt đầu:</strong> 22:00 Thứ Bảy, ngày 25/04/2026</p>',
      '<p><strong>Kết thúc:</strong> 23:59 Thứ Bảy, ngày 25/04/2026</p>',
      '<p>Trong khoảng thời gian này, toàn bộ các dịch vụ bao gồm: Đăng nhập, Làm bài thi, Chấm điểm, Truy cập tài liệu... sẽ tạm thời bị gián đoạn.</p>',
      '<img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop" alt="Coding" />',
      '<h3>Nội dung bản cập nhật lần này</h3>',
      '<p>Trong đợt bảo trì này, chúng tôi sẽ triển khai các bản vá quan trọng:</p>',
      '<ul><li>Nâng cấp dung lượng băng thông, cho phép 50.000 người dùng truy cập đồng thời mà không bị nghẽn mạng.</li><li>Cải thiện tốc độ tải của Ngân hàng câu hỏi (đặc biệt với các câu hỏi chứa ảnh và công thức Toán học MathJax).</li><li>Sửa lỗi giật lag khi chuyển đổi giao diện trên trình duyệt Safari (MacOS).</li></ul>',
      '<img src="https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=800&auto=format&fit=crop" alt="Network Update" />',
      '<h3>Khuyến nghị cho người dùng</h3>',
      '<p>Quý giảng viên vui lòng <strong>không cài đặt lịch thi</strong> trong khung giờ bảo trì. Nếu có sinh viên đang làm bài nộp dở dang trước thời điểm 22:00, hệ thống sẽ tự động lưu bài (Auto-save) và chấm điểm dựa trên các đáp án đã chọn.</p>',
      '<p>Chúng tôi chân thành xin lỗi vì sự bất tiện này. Mọi thắc mắc khẩn cấp vui lòng liên hệ Hotline hỗ trợ kỹ thuật trực 24/7 của chúng tôi.</p>',
      '<img src="https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?q=80&w=800&auto=format&fit=crop" alt="Support Team" />'
    ]
  },
  {
    id: 5,
    title: 'Hướng dẫn sử dụng tính năng "Chấm chéo" (Peer Assessment) cho sinh viên',
    excerpt: 'Phương pháp học tập chủ động thông qua việc sinh viên tự chấm bài tự luận của nhau dựa trên rubric do giảng viên cung cấp.',
    category: 'Hướng dẫn',
    author: 'Phòng học thuật',
    date: '05/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop',
    tags: ['Chấm chéo', 'Peer Review', 'Hướng dẫn', 'Học tập chủ động'],
    content: [
      '<h3>Peer Assessment là gì?</h3>',
      '<p>Chấm chéo (Peer Assessment/Peer Review) là một chức năng hoàn toàn mới trên EduExam, cho phép giảng viên giao quyền chấm điểm bài tập tự luận cho chính các sinh viên trong lớp. Cụ thể, sau khi hết hạn nộp bài, hệ thống sẽ xáo trộn ngẫu nhiên và ẩn danh các bài nộp, sau đó phân công cho mỗi sinh viên chấm 2-3 bài của bạn học khác.</p>',
      '<img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop" alt="Students grading" />',
      '<h3>Lợi ích của việc chấm chéo</h3>',
      '<p>Việc sinh viên tự chấm bài cho nhau mang lại lợi ích kép. Thứ nhất, nó giảm tải khối lượng công việc khổng lồ cho giảng viên đối với các lớp đông (trên 100 SV). Thứ hai, và quan trọng hơn, sinh viên sẽ được rèn luyện tư duy phản biện. Khi phải đọc bài của người khác và đối chiếu với đáp án chuẩn (Rubric), sinh viên sẽ nhận ra những lỗi sai mà bản thân cũng thường mắc phải.</p>',
      '<img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop" alt="Critical thinking" />',
      '<h3>Các bước tham gia chấm chéo</h3>',
      '<p><strong>Bước 1:</strong> Truy cập vào mục "Bài tập cần làm", chọn bài tập có gắn nhãn [Đang chờ chấm chéo].</p>',
      '<p><strong>Bước 2:</strong> Hệ thống sẽ hiển thị bài làm ẩn danh của bạn học. Bên cạnh bài làm là Bảng tiêu chí chấm điểm (Rubric) do thầy cô thiết lập. Ví dụ: Điểm mở bài (2đ), Điểm dẫn chứng (5đ), Lỗi chính tả (-1đ).</p>',
      '<img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop" alt="Rubric System" />',
      '<h3>Tính công bằng được đảm bảo ra sao?</h3>',
      '<p>Nhiều sinh viên lo lắng về việc bị bạn học chấm "ác ý" hoặc chấm hời hợt. EduExam giải quyết vấn đề này bằng cơ chế "Điểm trung bình trọng số". Bài của bạn sẽ được chấm bởi ít nhất 3 người. Hệ thống sẽ loại bỏ điểm cao nhất và thấp nhất, chỉ lấy điểm ở giữa. Ngoài ra, Giảng viên luôn là người có quyền phán quyết cuối cùng (Override) nếu có sự khiếu nại.</p>',
      '<img src="https://images.unsplash.com/photo-1450101499163-c8848c66cb85?q=80&w=800&auto=format&fit=crop" alt="Fairness" />'
    ]
  },
  {
    id: 6,
    title: 'Top 3 xu hướng công nghệ giáo dục (EdTech) nổi bật năm 2026',
    excerpt: 'Cùng nhìn lại sự phát triển của công nghệ thực tế ảo VR/AR, Trí tuệ nhân tạo GenAI và Blockchain trong lưu trữ văn bằng.',
    category: 'Tin công nghệ',
    author: 'Tạp chí EdTech',
    date: '01/04/2026',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    tags: ['EdTech', 'VR/AR', 'Blockchain', 'Xu hướng'],
    content: [
      '<h3>1. Thực tế ảo (VR) và Thực tế tăng cường (AR) trong mô phỏng</h3>',
      '<p>Năm 2026 chứng kiến sự bùng nổ của kính VR trong các trường Y Dược và Kỹ thuật. Thay vì chỉ học lý thuyết về giải phẫu học trên mô hình nhựa, sinh viên y khoa giờ đây có thể đeo kính VR và thực hiện các ca phẫu thuật ảo mô phỏng cơ thể người với độ chính xác đến từng nơ-ron thần kinh. Tại EduExam, chúng tôi đang thử nghiệm tích hợp các module đề thi 3D tương tác thay cho ảnh 2D truyền thống.</p>',
      '<img src="https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=800&auto=format&fit=crop" alt="VR Education" />',
      '<h3>2. Generative AI - Trợ lý ảo cho cả Thầy và Trò</h3>',
      '<p>Nếu như ChatGPT gây bão những năm trước, thì AI sinh tạo (GenAI) hiện tại đã được chuyên biệt hóa cho giáo dục. Giảng viên có thể tải lên một tài liệu PDF 100 trang, và AI của EduExam sẽ tự động trích xuất ra 50 câu hỏi trắc nghiệm đa dạng mức độ khó chỉ trong 10 giây. Về phía sinh viên, AI đóng vai trò như một gia sư 1-kèm-1, sẵn sàng giải thích cặn kẽ tại sao đáp án A sai, đáp án B đúng một cách cá nhân hóa.</p>',
      '<img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop" alt="AI Assistant" />',
      '<h3>3. Blockchain: Chấm dứt nạn bằng giả</h3>',
      '<p>Văn bằng, chứng chỉ và cả bảng điểm chi tiết của sinh viên giờ đây bắt đầu được các trường đại học mã hóa và lưu trữ trên chuỗi khối Blockchain. Điều này có nghĩa là chứng chỉ sẽ không bao giờ bị làm giả, bị chỉnh sửa trái phép, và các nhà tuyển dụng có thể xác thực hồ sơ ứng viên chỉ bằng một cú click chuột quét mã QR.</p>',
      '<img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=800&auto=format&fit=crop" alt="Blockchain Tech" />',
      '<h3>Tương lai của EduExam</h3>',
      '<p>Nắm bắt các xu hướng này, nền tảng EduExam cam kết sẽ ra mắt tính năng cấp chứng nhận hoàn thành khóa học dưới dạng NFT (Non-Fungible Token) vào quý 3 năm nay, giúp sinh viên làm đẹp hồ sơ LinkedIn của mình một cách uy tín nhất.</p>',
      '<img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop" alt="Future Goal" />'
    ]
  },
  {
    id: 7,
    title: 'Phỏng vấn Thủ khoa: Làm thế nào để tự học trực tuyến không bị xao nhãng?',
    excerpt: 'Lắng nghe những chia sẻ thực tế từ bạn Minh Tuấn - Thủ khoa đầu ra khoa CNTT về cách quản lý thời gian và vượt qua sự trì hoãn.',
    category: 'Góc sinh viên',
    author: 'Ban Truyền thông',
    date: '25/03/2026',
    coverImage: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=1200&auto=format&fit=crop',
    tags: ['Phỏng vấn', 'Thủ khoa', 'Tự học', 'Tập trung'],
    content: [
      '<h3>Sự cám dỗ của chiếc giường và Mạng xã hội</h3>',
      '<p>Học trực tuyến mang lại sự linh hoạt, nhưng cũng là con dao hai lưỡi. Trả lời phỏng vấn của chúng tôi, Minh Tuấn chia sẻ: "Kẻ thù lớn nhất của học online không phải là bài khó, mà là chiếc giường ngay cạnh bàn học và những thông báo tin nhắn tinh ting. Chỉ cần nhượng bộ bản thân 5 phút lướt TikTok, bạn sẽ mất cả buổi sáng."</p>',
      '<img src="https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?q=80&w=800&auto=format&fit=crop" alt="Distraction" />',
      '<h3>Chiến thuật Pomodoro 25-5 kết hợp Block site</h3>',
      '<p>Tuấn bật mí phương pháp của mình: Cài đặt tiện ích mở rộng trên trình duyệt để khóa toàn bộ Facebook, YouTube trong khung giờ học. Bật đồng hồ Pomodoro, cứ 25 phút tập trung 100% giải đề trên EduExam, sau đó nghỉ ngơi 5 phút để uống nước, vươn vai. Tuyệt đối không chạm vào điện thoại trong 5 phút nghỉ đó.</p>',
      '<img src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop" alt="Pomodoro timer" />',
      '<h3>Biến góc học tập thành "Khu vực linh thiêng"</h3>',
      '<p>Nhiều bạn có thói quen mang laptop lên giường học. Đây là sai lầm nghiêm trọng vì não bộ tự động gắn kết chiếc giường với giấc ngủ. Tuấn thiết lập một nguyên tắc: Bàn học chỉ dành cho việc học. Nếu muốn xem phim, giải trí, cậu sẽ ôm máy tính ra sofa hoặc phòng khách. Sự phân tách không gian vật lý giúp não bộ dễ dàng bật "Công tắc tập trung" khi ngồi vào bàn.</p>',
      '<img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop" alt="Workspace" />',
      '<h3>Học nhóm ảo (Virtual Study Room)</h3>',
      '<p>"Đôi khi tự học một mình rất cô đơn và dễ nản", Tuấn nói. Cậu thường tham gia các phòng học ảo (Study with me) trên Discord, nơi mọi người bật camera lên và ai cũng cắm cúi học bài trong im lặng. Cảm giác có người đang học cùng mình tạo ra áp lực đồng trang lứa (Peer pressure) tích cực, thúc đẩy bản thân không được lười biếng.</p>',
      '<img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop" alt="Study Group" />'
    ]
  }
];