-- Migration: Thêm bảng OTP cho xác thực email
-- Chạy trên database clonevocrecord

USE clonevocrecord;

-- Bảng OTP (lưu mã xác thực gửi qua email)
CREATE TABLE IF NOT EXISTS OtpCodes (
    MaOTP INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    MaCode VARCHAR(6) NOT NULL,
    LoaiOTP ENUM('dangky', 'quenmatkhau', 'dangnhap') DEFAULT 'dangky',
    HetHan DATETIME NOT NULL,
    DaSuDung BOOLEAN DEFAULT FALSE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_code (Email, MaCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
