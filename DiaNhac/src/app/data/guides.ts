
export interface Guide {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Nâng cao';
}

export const guideCategories = [
  "Tất cả",
  "Hướng dẫn cơ bản",
  "Bảo trì thiết bị",
  "Kỹ thuật nâng cao"
];

export const guides: Guide[] = [
  {
    id: 1,
    title: "Cách vệ sinh đĩa than sạch như mới chỉ trong 3 bước",
    description: "Hướng dẫn chi tiết cách vệ sinh đĩa vinyl bằng tay tại nhà mà không cần dùng đến thiết bị đắt tiền.",
    category: "Hướng dẫn cơ bản",
    image: "/images/products/accessory-02.webp",
    difficulty: "Dễ"
  },
  {
    id: 2,
    title: "Cân chỉnh kim (Stylus) và lực đè (Tracking Force) chuẩn xác",
    description: "Việc cân chỉnh kim đúng cách giúp âm thanh trung thực hơn và kéo dài tuổi thọ của cả đĩa lẫn kim.",
    category: "Bảo trì thiết bị",
    image: "/images/products/turntable-02.webp",
    difficulty: "Trung bình"
  },
  {
    id: 3,
    title: "Nâng cấp Phono Preamp để tối ưu chất lượng âm thanh",
    description: "Hiểu về vai trò của Phono Preamp và cách chọn linh kiện phù hợp cho dàn âm thanh hi-fi của bạn.",
    category: "Kỹ thuật nâng cao",
    image: "/images/products/turntable-01.webp",
    difficulty: "Nâng cao"
  },
  {
    id: 4,
    title: "Bí quyết săn đĩa vintage tại các cửa hàng Second-hand",
    description: "Làm thế nào để kiểm tra tình trạng đĩa (Grading) ngay tại cửa hàng để không mua phải đĩa lỗi.",
    category: "Hướng dẫn cơ bản",
    image: "/images/products/vinyl-02.webp",
    difficulty: "Dễ"
  }
];
