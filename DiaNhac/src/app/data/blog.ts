
export interface BlogPost {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string;
  date: string;
  author: string;
}

export const categories = [
  "Tất cả",
  "Kiến thức Vinyl",
  "Review Album",
  "Nghệ sĩ & Câu chuyện",
  "Văn hóa Analog"
];

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Tại sao đĩa than (Vinyl) lại đang trở lại mạnh mẽ trong kỷ nguyên số?",
    description: "Khám phá sức hút mãnh liệt của âm thanh analog và tại sao giới trẻ ngày nay lại ưa chuộng việc sưu tầm đĩa than hơn bao giờ hết.",
    category: "Kiến thức Vinyl",
    image: "/images/products/vinyl-01.webp",
    date: "2024-03-20",
    author: "Vọc Admin"
  },
  {
    id: 2,
    title: "Review Album: 'Dark Side of the Moon' - Tuyệt tác không tuổi của Pink Floyd",
    description: "Một cái nhìn sâu sắc về chất lượng âm thanh và ý nghĩa nghệ thuật của một trong những album đĩa than bán chạy nhất mọi thời đại.",
    category: "Review Album",
    image: "/images/products/music-02.webp",
    date: "2024-03-15",
    author: "Tùng Vinyl"
  },
  {
    id: 3,
    title: "Hướng dẫn bảo quản đĩa than: Những sai lầm phổ biến bạn cần tránh",
    description: "Việc bảo quản không đúng cách có thể làm hỏng rãnh đĩa vĩnh viễn. Hãy cùng điểm qua những lưu ý quan trọng để giữ đĩa luôn như mới.",
    category: "Kiến thức Vinyl",
    image: "/images/products/accessory-01.webp",
    date: "2024-03-10",
    author: "Vọc Records"
  },
  {
    id: 4,
    title: "City Pop: Dòng nhạc Nhật Bản đang 'hồi sinh' trên toàn thế giới",
    description: "Tìm hiểu về nguồn gốc của City Pop và tại sao những giai điệu từ thập niên 80 lại trở thành xu hướng nghe nhạc của giới trẻ hiện nay.",
    category: "Văn hóa Analog",
    image: "/images/products/artist-01.webp",
    date: "2024-03-05",
    author: "Hoàng Jazz"
  },
  {
    id: 5,
    title: "Top 5 mâm đĩa than tốt nhất cho người mới bắt đầu năm 2024",
    description: "Nếu bạn đang có ý định 'vọc' đĩa than, đây là danh sách những chiếc mâm đĩa có chất lượng tốt và giá cả phải chăng nhất.",
    category: "Kiến thức Vinyl",
    image: "/images/products/turntable-01.webp",
    date: "2024-03-01",
    author: "Admin Vọc"
  }
];
