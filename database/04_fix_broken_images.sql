-- Fix: Cập nhật ảnh sản phẩm bị 404 từ Unsplash
-- Thay bằng URL mới còn hoạt động

USE clonevocrecord;

-- MaSP 6: Midnights (Blood Moon Edition) - Taylor Swift album
UPDATE SanPham SET HinhAnh = '/images/products/vinyl-01.webp' WHERE MaSP = 6;

-- MaSP 10: Guardians of the Galaxy - soundtrack
UPDATE SanPham SET HinhAnh = '/images/products/music-02.webp' WHERE MaSP = 10;

-- MaSP 11: Thriller - Michael Jackson
UPDATE SanPham SET HinhAnh = '/images/products/music-01.webp' WHERE MaSP = 11;

-- MaSP 12: Đan Trường - Vol.1
UPDATE SanPham SET HinhAnh = '/images/products/artist-01.webp' WHERE MaSP = 12;

-- MaSP 15: Sony PS-LX310BT (turntable)
UPDATE SanPham SET HinhAnh = '/images/products/turntable-01.webp' WHERE MaSP = 15;

-- MaSP 16: Crosley Cruiser Deluxe (turntable)
UPDATE SanPham SET HinhAnh = '/images/products/turntable-02.webp' WHERE MaSP = 16;

-- MaSP 18: Dung dịch rửa đĩa mềm than (accessories)
UPDATE SanPham SET HinhAnh = '/images/products/accessory-01.webp' WHERE MaSP = 18;

-- MaSP 20: Vỏ bọc đĩa than chống tĩnh điện (accessories)
UPDATE SanPham SET HinhAnh = '/images/products/accessory-02.webp' WHERE MaSP = 20;

-- MaSP 21: Plastic Love (Single) - City Pop
UPDATE SanPham SET HinhAnh = '/images/products/artist-01.webp' WHERE MaSP = 21;

-- MaSP 25: Interstellar OST
UPDATE SanPham SET HinhAnh = '/images/products/music-02.webp' WHERE MaSP = 25;

-- MaSP 27 & 53: albums VN - Hoàng, Một Ngàn Chín Trăm Hồi Đó
UPDATE SanPham SET HinhAnh = '/images/products/vinyl-03.webp' WHERE MaSP = 27;
UPDATE SanPham SET HinhAnh = '/images/products/vinyl-04.webp' WHERE MaSP = 53;

-- MaSP 52: La La Land OST
UPDATE SanPham SET HinhAnh = '/images/products/vinyl-02.webp' WHERE MaSP = 52;

-- MaSP 58: Ride on Time - City Pop
UPDATE SanPham SET HinhAnh = '/images/products/vinyl-01.webp' WHERE MaSP = 58;

-- MaSP 62, 63, 64: Phụ kiện (dùng chung 1 ảnh mới)
UPDATE SanPham SET HinhAnh = '/images/products/accessory-01.webp' WHERE MaSP = 62;
UPDATE SanPham SET HinhAnh = '/images/products/accessory-02.webp' WHERE MaSP = 63;
UPDATE SanPham SET HinhAnh = '/images/products/accessory-01.webp' WHERE MaSP = 64;

-- MaSP 65, 66: Cassette
UPDATE SanPham SET HinhAnh = '/images/products/cassette-01.webp' WHERE MaSP = 65;
UPDATE SanPham SET HinhAnh = '/images/products/cassette-01.webp' WHERE MaSP = 66;

-- MaSP 19: Kim đọc đĩa than (turntable accessory)
UPDATE SanPham SET HinhAnh = '/images/products/accessory-02.webp' WHERE MaSP = 19;
