-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: clonevocrecord
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `BaiViet`
--

DROP TABLE IF EXISTS `BaiViet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `BaiViet` (
  `MaBV` int NOT NULL AUTO_INCREMENT,
  `TieuDe` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `NoiDung` text NOT NULL,
  `LoaiBV` enum('blog','huongdan') DEFAULT 'blog',
  `ChuyenMuc` varchar(100) DEFAULT NULL,
  `DoKho` enum('Dễ','Trung bình','Nâng cao') DEFAULT NULL,
  `HinhAnh` varchar(255) DEFAULT NULL,
  `MaTK` int DEFAULT NULL,
  `TrangThai` enum('nhap','daxuatban') DEFAULT 'nhap',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBV`),
  KEY `MaTK` (`MaTK`),
  CONSTRAINT `BaiViet_ibfk_1` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BaiViet`
--

LOCK TABLES `BaiViet` WRITE;
/*!40000 ALTER TABLE `BaiViet` DISABLE KEYS */;
INSERT INTO `BaiViet` VALUES (1,'Bắt đầu chơi đĩa than: 7 điều cần biết trước khi mua','Nếu mới làm quen với vinyl, bạn chưa cần một bộ dàn thật đắt tiền. Hãy bắt đầu bằng một mâm đĩa có phono preamp tích hợp hoặc một phono preamp rời phù hợp với ampli.\n\n1. Xác định ngân sách cho mâm đĩa, kim đọc và loa.\n2. Kiểm tra đĩa có bị cong vênh, xước sâu hoặc mốc bìa hay không.\n3. Đĩa cũ nên được hỏi rõ tình trạng (grading) và nghe thử nếu có thể.\n4. Luôn cầm đĩa ở mép ngoài hoặc nhãn giữa, không chạm vào rãnh.\n5. Chuẩn bị bao trong chống tĩnh điện và bao ngoài ngay từ đầu.\n6. Mâm đĩa phải đặt trên mặt phẳng chắc, tránh loa và nguồn rung.\n7. Hãy mua những album bạn thực sự muốn nghe, không chỉ mua vì độ hiếm.\n\nVinyl hay ở trải nghiệm nghe chủ động: chọn đĩa, lau đĩa, đặt kim và nghe trọn một mặt. Thiết bị tốt là thiết bị giúp bạn nghe thường xuyên và bảo vệ được bộ sưu tập.','huongdan','Hướng dẫn cơ bản','Dễ','/images/products/vinyl-01.webp',NULL,'daxuatban','2026-09-09 12:09:43','2026-09-09 12:09:45'),(2,'Vinyl và nhạc số: chọn trải nghiệm phù hợp với bạn','Vinyl không thay thế nhạc số trong mọi tình huống. Nhạc số tiện lợi, dễ tìm kiếm và phù hợp khi di chuyển; vinyl tạo ra một nghi thức nghe nhạc chậm rãi, hữu hình và giàu tính sưu tầm.\n\nVề âm thanh, chất lượng cuối cùng phụ thuộc vào bản master, tình trạng đĩa, kim đọc, phono stage, ampli và loa. Vì vậy không nên mặc định rằng mọi bản vinyl đều hay hơn mọi bản streaming.\n\nKhi chọn đĩa, hãy ưu tiên bản phát hành có thông tin mastering rõ ràng, nhà cung cấp uy tín và tình trạng vật lý tốt. Một bản đĩa sạch, phẳng và được căn chỉnh đúng sẽ đem lại trải nghiệm ổn định hơn nhiều so với một bản hiếm nhưng xuống cấp.\n\nKết luận đơn giản: dùng streaming để khám phá, dùng vinyl cho những album bạn muốn nghe sâu và giữ lâu.','blog','Kiến thức Vinyl',NULL,'/images/products/music-01.webp',NULL,'daxuatban','2026-09-09 12:09:43','2026-09-09 12:09:45'),(3,'Cách bảo quản đĩa than đúng cách trong điều kiện gia đình','Đĩa than bền hơn khi được tránh khỏi ba tác nhân chính: bụi, nhiệt và ẩm. Sau mỗi lần nghe, đưa đĩa trở lại bao trong sạch rồi cất vào bìa, không để mặt đĩa tiếp xúc trực tiếp với giấy cũ hoặc bìa bị mốc.\n\nHãy dựng đĩa theo chiều đứng, xếp vừa phải để đĩa không bị nghiêng. Không xếp chồng nhiều đĩa vì sức nặng có thể làm cong đĩa theo thời gian. Tủ nên đặt ở nơi khô, thoáng, tránh nắng chiếu trực tiếp và tránh sát tường ẩm.\n\nTrước khi nghe, dùng chổi carbon nhẹ nhàng theo vòng tròn của rãnh để lấy bụi. Với vết bẩn bám sâu, dùng dung dịch vệ sinh dành riêng cho vinyl; tuyệt đối không dùng cồn, nước rửa kính hoặc hóa chất gia dụng chưa được kiểm chứng.','huongdan','Bảo trì thiết bị','Dễ','/images/products/accessory-01.webp',NULL,'daxuatban','2026-09-09 12:09:43','2026-09-09 12:09:45'),(4,'Review album: The Dark Side of the Moon - Pink Floyd','The Dark Side of the Moon là lựa chọn kinh điển cho người bắt đầu sưu tầm progressive rock. Album có cấu trúc liền mạch, nhiều lớp hiệu ứng và phần chuyển bài được dàn dựng như một tác phẩm thống nhất.\n\nKhi mua bản vinyl, hãy kiểm tra phiên bản phát hành, năm tái bản và tình trạng đĩa. Với album có nhiều lần tái bản, thông tin trên nhãn và mã runout giúp phân biệt các bản khác nhau. Một bản sạch, phẳng và có bao trong tốt quan trọng hơn việc chỉ săn một bản cũ.\n\nĐây là album nên nghe trọn một mặt ở âm lượng vừa phải, trong một không gian ít nhiễu. Hãy bắt đầu với bản bạn dễ mua, sau đó nâng cấp khi đã hiểu mình thích chất âm và phiên bản nào.','blog','Review Album',NULL,'/images/products/music-02.webp',NULL,'daxuatban','2026-09-09 12:09:45','2026-09-09 12:09:45'),(5,'5 bước kiểm tra đĩa vinyl cũ trước khi thanh toán','Đĩa cũ có thể là cách tiết kiệm để mở rộng bộ sưu tập, nhưng cần kiểm tra có hệ thống.\n\n1. Nhìn nghiêng dưới ánh sáng để phát hiện xước sâu, mốc và vết bẩn.\n2. Đặt đĩa lên mặt phẳng để kiểm tra cong vênh; không cố bẻ hoặc ép đĩa.\n3. Xem nhãn giữa có bị bong, ướt hoặc có dấu hiệu ngấm nước không.\n4. Kiểm tra bìa, gáy và bao trong; mùi ẩm mốc thường cho thấy đĩa đã được bảo quản kém.\n5. Đối chiếu grading của người bán và hỏi chính sách đổi trả nếu đĩa bị lỗi khi phát.\n\nGrading chỉ là mô tả, không thay thế việc kiểm tra thực tế. Nếu không được nghe thử, hãy ưu tiên người bán có ảnh thật và mô tả rõ ràng.','huongdan','Hướng dẫn cơ bản','Dễ','/images/products/vinyl-02.webp',NULL,'daxuatban','2026-09-09 12:09:45','2026-09-09 12:09:45'),(6,'City Pop và sức sống mới của những bản thu Nhật Bản','City Pop thường được nhắc đến khi nói về làn sóng khám phá lại âm nhạc Nhật Bản cuối thập niên 1970 và 1980. Những bản phối giàu groove, bass rõ và màu sắc jazz-funk khiến dòng nhạc này phù hợp cả khi nghe chủ động lẫn làm nhạc nền.\n\nKhi tìm vinyl City Pop, người sưu tầm nên phân biệt bản gốc, bản tái bản và các bản bootleg. Hãy xem kỹ thông tin hãng phát hành, mã catalog và ảnh nhãn đĩa. Nếu mục tiêu là nghe, bản tái bản chính thức thường dễ mua và ít rủi ro hơn bản trôi nổi.\n\nĐiều đáng giá nhất của trào lưu này là nó mở ra cơ hội tìm hiểu toàn bộ bối cảnh âm nhạc, thay vì chỉ chạy theo một ca khúc đang thịnh hành trên mạng xã hội.','blog','Văn hóa Analog',NULL,'/images/products/artist-01.webp',NULL,'daxuatban','2026-09-09 12:09:45','2026-09-09 12:09:45'),(7,'Cân chỉnh lực tì và chống trượt cho mâm đĩa','Lực tì (tracking force) phải được đặt theo thông số của kim đọc. Trước khi cân chỉnh, đưa cần về đúng vị trí nghỉ, tháo chặn vận chuyển và đảm bảo mâm đĩa nằm cân bằng.\n\nXoay đối trọng về 0, cân cần ở trạng thái nổi, sau đó xoay cả vòng số đến 0. Tiếp tục xoay đối trọng đến đúng lực tì mà nhà sản xuất khuyến nghị. Cuối cùng đặt anti-skate ở mức gần tương đương và tinh chỉnh theo hướng dẫn của từng mẫu cần.\n\nKhông đoán lực tì bằng mắt và không dùng tay ấn kim xuống đĩa. Sai lực tì có thể làm tiếng méo, gây mòn không đều hoặc ảnh hưởng đến cả kim và rãnh đĩa. Nếu chưa có cân stylus, nên dùng cân chuyên dụng có độ phân giải phù hợp.','huongdan','Bảo trì thiết bị','Trung bình','/images/products/turntable-02.webp',NULL,'daxuatban','2026-09-09 12:09:45','2026-09-09 12:09:45'),(8,'Chọn mâm đĩa đầu tiên: phono tích hợp hay phono rời?','Mâm đĩa có phono preamp tích hợp thường dễ lắp đặt: chỉ cần kết nối với ngõ vào line của ampli hoặc loa active. Đây là lựa chọn hợp lý cho người mới, không muốn mua nhiều thiết bị cùng lúc.\n\nMâm đĩa dùng phono stage rời cho phép nâng cấp linh hoạt hơn. Khi chọn, hãy kiểm tra loại cartridge, mức output, cổng kết nối và khả năng chỉnh capacitance hoặc gain nếu thiết bị có hỗ trợ.\n\nĐừng chỉ nhìn vào công suất. Độ ổn định tốc độ, chất lượng cần, khả năng chống rung và việc dễ thay kim có ảnh hưởng trực tiếp đến trải nghiệm lâu dài. Hãy chọn hệ thống phù hợp với loa, ampli và thói quen nghe hiện tại.','huongdan','Kỹ thuật nâng cao','Trung bình','/images/products/turntable-01.webp',NULL,'daxuatban','2026-09-09 12:09:45','2026-09-09 12:09:45');
/*!40000 ALTER TABLE `BaiViet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ChatConversation`
--

DROP TABLE IF EXISTS `ChatConversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChatConversation` (
  `MaCuocChat` int NOT NULL AUTO_INCREMENT,
  `MaKH` int NOT NULL,
  `MaSP` int DEFAULT NULL,
  `MaDH` int DEFAULT NULL,
  `ChuDe` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrangThai` enum('mo','dong') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mo',
  `TinNhanCuoi` datetime DEFAULT NULL,
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaCuocChat`),
  KEY `MaSP` (`MaSP`),
  KEY `MaDH` (`MaDH`),
  KEY `idx_chat_customer_status` (`MaKH`,`TrangThai`,`TinNhanCuoi`),
  KEY `idx_chat_last_message` (`TinNhanCuoi`),
  CONSTRAINT `ChatConversation_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE,
  CONSTRAINT `ChatConversation_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE SET NULL,
  CONSTRAINT `ChatConversation_ibfk_3` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChatConversation`
--

LOCK TABLES `ChatConversation` WRITE;
/*!40000 ALTER TABLE `ChatConversation` DISABLE KEYS */;
/*!40000 ALTER TABLE `ChatConversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ChatMessage`
--

DROP TABLE IF EXISTS `ChatMessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChatMessage` (
  `MaTinNhan` int NOT NULL AUTO_INCREMENT,
  `MaCuocChat` int NOT NULL,
  `MaTK` int NOT NULL,
  `VaiTroNguoiGui` enum('khachhang','nhanvien','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `NoiDung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `DaDoc` tinyint(1) NOT NULL DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTinNhan`),
  KEY `MaTK` (`MaTK`),
  KEY `idx_chat_message_conversation` (`MaCuocChat`,`MaTinNhan`,`NgayTao`),
  KEY `idx_chat_message_unread` (`MaCuocChat`,`DaDoc`,`MaTK`),
  CONSTRAINT `ChatMessage_ibfk_1` FOREIGN KEY (`MaCuocChat`) REFERENCES `ChatConversation` (`MaCuocChat`) ON DELETE CASCADE,
  CONSTRAINT `ChatMessage_ibfk_2` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChatMessage`
--

LOCK TABLES `ChatMessage` WRITE;
/*!40000 ALTER TABLE `ChatMessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `ChatMessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ChiTietDonHang`
--

DROP TABLE IF EXISTS `ChiTietDonHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChiTietDonHang` (
  `MaCTDH` int NOT NULL AUTO_INCREMENT,
  `MaDH` int DEFAULT NULL,
  `MaSP` int DEFAULT NULL,
  `SoLuong` int NOT NULL,
  `DonGia` decimal(15,2) NOT NULL,
  PRIMARY KEY (`MaCTDH`),
  KEY `MaDH` (`MaDH`),
  KEY `MaSP` (`MaSP`),
  CONSTRAINT `ChiTietDonHang_ibfk_1` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE CASCADE,
  CONSTRAINT `ChiTietDonHang_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChiTietDonHang`
--

LOCK TABLES `ChiTietDonHang` WRITE;
/*!40000 ALTER TABLE `ChiTietDonHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `ChiTietDonHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ChiTietGioHang`
--

DROP TABLE IF EXISTS `ChiTietGioHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChiTietGioHang` (
  `MaCTGH` int NOT NULL AUTO_INCREMENT,
  `MaGH` int DEFAULT NULL,
  `MaSP` int DEFAULT NULL,
  `SoLuong` int NOT NULL,
  `DonGia` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`MaCTGH`),
  KEY `MaGH` (`MaGH`),
  KEY `MaSP` (`MaSP`),
  CONSTRAINT `ChiTietGioHang_ibfk_1` FOREIGN KEY (`MaGH`) REFERENCES `GioHang` (`MaGH`) ON DELETE CASCADE,
  CONSTRAINT `ChiTietGioHang_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChiTietGioHang`
--

LOCK TABLES `ChiTietGioHang` WRITE;
/*!40000 ALTER TABLE `ChiTietGioHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `ChiTietGioHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ChiTietPhieuNhap`
--

DROP TABLE IF EXISTS `ChiTietPhieuNhap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChiTietPhieuNhap` (
  `MaCTPN` int NOT NULL AUTO_INCREMENT,
  `MaPN` int DEFAULT NULL,
  `MaSP` int DEFAULT NULL,
  `SoLuongNhap` int NOT NULL,
  `GiaNhap` decimal(15,2) NOT NULL,
  PRIMARY KEY (`MaCTPN`),
  KEY `MaPN` (`MaPN`),
  KEY `MaSP` (`MaSP`),
  CONSTRAINT `ChiTietPhieuNhap_ibfk_1` FOREIGN KEY (`MaPN`) REFERENCES `PhieuNhap` (`MaPN`) ON DELETE CASCADE,
  CONSTRAINT `ChiTietPhieuNhap_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChiTietPhieuNhap`
--

LOCK TABLES `ChiTietPhieuNhap` WRITE;
/*!40000 ALTER TABLE `ChiTietPhieuNhap` DISABLE KEYS */;
/*!40000 ALTER TABLE `ChiTietPhieuNhap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DanhMuc`
--

DROP TABLE IF EXISTS `DanhMuc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DanhMuc` (
  `MaDM` int NOT NULL AUTO_INCREMENT,
  `TenDM` varchar(100) NOT NULL,
  `MoTa` text,
  PRIMARY KEY (`MaDM`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DanhMuc`
--

LOCK TABLES `DanhMuc` WRITE;
/*!40000 ALTER TABLE `DanhMuc` DISABLE KEYS */;
INSERT INTO `DanhMuc` VALUES (1,'Đĩa Than (Vinyl)','Các đĩa thanh truyền thống'),(2,'Cassette','Băng Cassette gốc'),(3,'Máy Quay Đĩa (Turntable)','Mâm đĩa chất lượng cao'),(4,'Phụ Kiện','Bao da, thiết bị bảo dưỡng âm thanh');
/*!40000 ALTER TABLE `DanhMuc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DonHang`
--

DROP TABLE IF EXISTS `DonHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DonHang` (
  `MaDH` int NOT NULL AUTO_INCREMENT,
  `MaKH` int DEFAULT NULL,
  `NguoiNhan` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `SDTNhan` varchar(15) DEFAULT NULL,
  `NgayDat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TongTien` decimal(15,2) NOT NULL,
  `TrangThai` enum('choxacnhan','daxacnhan','dangchuanbihang','danggiaohang','hoanthanh','dahuy') DEFAULT 'choxacnhan',
  `PhuongThucThanhToan` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT 'COD',
  `DiaChiGiao` text,
  `GhiChu` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `MaNVXuLy` int DEFAULT NULL,
  PRIMARY KEY (`MaDH`),
  KEY `fk_donhang_nhanvien` (`MaNVXuLy`),
  KEY `idx_donhang_customer_date` (`MaKH`,`NgayDat`),
  KEY `idx_donhang_status_date` (`TrangThai`,`NgayDat`),
  CONSTRAINT `DonHang_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE,
  CONSTRAINT `fk_donhang_nhanvien` FOREIGN KEY (`MaNVXuLy`) REFERENCES `NhanVien` (`MaNV`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DonHang`
--

LOCK TABLES `DonHang` WRITE;
/*!40000 ALTER TABLE `DonHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `DonHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `GioHang`
--

DROP TABLE IF EXISTS `GioHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GioHang` (
  `MaGH` int NOT NULL AUTO_INCREMENT,
  `MaKH` int DEFAULT NULL,
  `TongTien` decimal(15,2) DEFAULT '0.00',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaGH`),
  KEY `MaKH` (`MaKH`),
  CONSTRAINT `GioHang_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `GioHang`
--

LOCK TABLES `GioHang` WRITE;
/*!40000 ALTER TABLE `GioHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `GioHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `KhachHang`
--

DROP TABLE IF EXISTS `KhachHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `KhachHang` (
  `MaKH` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `DiaChi` text,
  `MaTK` int DEFAULT NULL,
  PRIMARY KEY (`MaKH`),
  UNIQUE KEY `Email` (`Email`),
  KEY `MaTK` (`MaTK`),
  CONSTRAINT `KhachHang_ibfk_1` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `KhachHang`
--

LOCK TABLES `KhachHang` WRITE;
/*!40000 ALTER TABLE `KhachHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `KhachHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MaGiamGia`
--

DROP TABLE IF EXISTS `MaGiamGia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MaGiamGia` (
  `MaGG` int NOT NULL AUTO_INCREMENT,
  `Code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoaiGiamGia` enum('percent','fixed') COLLATE utf8mb4_unicode_ci DEFAULT 'percent',
  `GiaTri` decimal(15,2) NOT NULL,
  `DonHangToiThieu` decimal(15,2) DEFAULT '0.00',
  `SoLuong` int DEFAULT '0',
  `DaDung` int DEFAULT '0',
  `NgayHetHan` datetime DEFAULT NULL,
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaGG`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MaGiamGia`
--

LOCK TABLES `MaGiamGia` WRITE;
/*!40000 ALTER TABLE `MaGiamGia` DISABLE KEYS */;
INSERT INTO `MaGiamGia` VALUES (1,'WELCOME10','percent',10.00,0.00,100,0,'2027-12-31 23:59:59','2026-09-09 12:09:44'),(2,'VINYL50','fixed',50000.00,500000.00,100,0,'2027-12-31 23:59:59','2026-09-09 12:09:44'),(3,'AUDIO15','percent',15.00,1000000.00,30,0,'2027-12-31 23:59:59','2026-09-09 12:09:44');
/*!40000 ALTER TABLE `MaGiamGia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NhanVien`
--

DROP TABLE IF EXISTS `NhanVien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NhanVien` (
  `MaNV` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `ChucVu` varchar(50) DEFAULT NULL,
  `MaTK` int DEFAULT NULL,
  PRIMARY KEY (`MaNV`),
  KEY `MaTK` (`MaTK`),
  CONSTRAINT `NhanVien_ibfk_1` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NhanVien`
--

LOCK TABLES `NhanVien` WRITE;
/*!40000 ALTER TABLE `NhanVien` DISABLE KEYS */;
/*!40000 ALTER TABLE `NhanVien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NhatKyHoatDong`
--

DROP TABLE IF EXISTS `NhatKyHoatDong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NhatKyHoatDong` (
  `MaNK` int NOT NULL AUTO_INCREMENT,
  `MaTK` int DEFAULT NULL,
  `ThoiGian` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `HanhDong` text,
  `NoiDung` text,
  PRIMARY KEY (`MaNK`),
  KEY `MaTK` (`MaTK`),
  CONSTRAINT `NhatKyHoatDong_ibfk_1` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NhatKyHoatDong`
--

LOCK TABLES `NhatKyHoatDong` WRITE;
/*!40000 ALTER TABLE `NhatKyHoatDong` DISABLE KEYS */;
/*!40000 ALTER TABLE `NhatKyHoatDong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `OtpCodes`
--

DROP TABLE IF EXISTS `OtpCodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OtpCodes` (
  `MaOTP` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MaCode` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoaiOTP` enum('dangky','quenmatkhau','dangnhap') COLLATE utf8mb4_unicode_ci DEFAULT 'dangky',
  `HetHan` datetime NOT NULL,
  `DaSuDung` tinyint(1) DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaOTP`),
  KEY `idx_email_code` (`Email`,`MaCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OtpCodes`
--

LOCK TABLES `OtpCodes` WRITE;
/*!40000 ALTER TABLE `OtpCodes` DISABLE KEYS */;
/*!40000 ALTER TABLE `OtpCodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PhieuNhap`
--

DROP TABLE IF EXISTS `PhieuNhap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PhieuNhap` (
  `MaPN` int NOT NULL AUTO_INCREMENT,
  `MaNV` int DEFAULT NULL,
  `NgayNhap` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TongTien` decimal(15,2) DEFAULT '0.00',
  `GhiChu` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  PRIMARY KEY (`MaPN`),
  KEY `MaNV` (`MaNV`),
  CONSTRAINT `PhieuNhap_ibfk_1` FOREIGN KEY (`MaNV`) REFERENCES `NhanVien` (`MaNV`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PhieuNhap`
--

LOCK TABLES `PhieuNhap` WRITE;
/*!40000 ALTER TABLE `PhieuNhap` DISABLE KEYS */;
/*!40000 ALTER TABLE `PhieuNhap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SanPham`
--

DROP TABLE IF EXISTS `SanPham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SanPham` (
  `MaSP` int NOT NULL AUTO_INCREMENT,
  `TenSP` varchar(255) NOT NULL,
  `NgheSi` varchar(100) DEFAULT NULL,
  `TheLoai` varchar(100) DEFAULT NULL,
  `NamPhatHanh` int DEFAULT NULL,
  `GiaBan` decimal(15,2) NOT NULL,
  `SoLuongTon` int DEFAULT '0',
  `MoTa` text,
  `HinhAnh` varchar(255) DEFAULT NULL,
  `TinhTrang` enum('conhang','saphethang','hethang','preorder','ngungkinhdoanh') DEFAULT 'conhang',
  `MaDM` int DEFAULT NULL,
  PRIMARY KEY (`MaSP`),
  KEY `MaDM` (`MaDM`),
  CONSTRAINT `SanPham_ibfk_1` FOREIGN KEY (`MaDM`) REFERENCES `DanhMuc` (`MaDM`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SanPham`
--

LOCK TABLES `SanPham` WRITE;
/*!40000 ALTER TABLE `SanPham` DISABLE KEYS */;
INSERT INTO `SanPham` VALUES (1,'Random Access Memories','Daft Punk','Đĩa Than (Vinyl)',2013,899000.00,12,'Album electronic kinh điển, bản vinyl 2LP phù hợp để nghe trọn mặt.','/images/products/catalog/random-access-memories.jpg','conhang',1),(2,'Abbey Road','The Beatles','Đĩa Than (Vinyl)',1969,799000.00,10,'Một trong những album rock được sưu tầm nhiều nhất.','/images/products/catalog/abbey-road.jpg','conhang',1),(3,'The Dark Side of the Moon','Pink Floyd','Đĩa Than (Vinyl)',1973,849000.00,8,'Progressive rock với cấu trúc album liền mạch và giàu chi tiết.','/images/products/catalog/dark-side-of-the-moon.jpg','conhang',1),(4,'Rumours','Fleetwood Mac','Đĩa Than (Vinyl)',1977,749000.00,7,'Album soft rock nổi tiếng với bản phối cân bằng và giàu cảm xúc.','/images/products/catalog/rumours.jpg','conhang',1),(5,'Kind of Blue','Miles Davis','Đĩa Than (Vinyl)',1959,899000.00,6,'Jazz kinh điển, bản thu tham chiếu cho nhiều hệ thống nghe.','/images/products/catalog/kind-of-blue.jpg','conhang',1),(6,'Thriller','Michael Jackson','Đĩa Than (Vinyl)',1982,699000.00,9,'Pop kinh điển với nhiều ca khúc quen thuộc.','/images/products/catalog/thriller.jpg','conhang',1),(7,'Back to Black','Amy Winehouse','Đĩa Than (Vinyl)',2006,799000.00,6,'Soul và jazz-pop với giọng hát đặc trưng.','/images/products/catalog/back-to-black.jpg','conhang',1),(8,'Blue Train','John Coltrane','Đĩa Than (Vinyl)',1957,849000.00,5,'Hard bop mạnh mẽ, phù hợp cho người nghe jazz.','/images/products/catalog/blue-train.jpg','conhang',1),(9,'Getz / Gilberto','Stan Getz & João Gilberto','Đĩa Than (Vinyl)',1964,799000.00,5,'Bossa nova nhẹ nhàng, một album jazz dễ nghe.','/images/products/catalog/getz-gilberto.jpg','conhang',1),(10,'A Love Supreme','John Coltrane','Đĩa Than (Vinyl)',1965,899000.00,4,'Jazz chuyên sâu với phần trình diễn giàu năng lượng.','/images/products/catalog/a-love-supreme.jpg','conhang',1),(11,'The Miseducation of Lauryn Hill','Lauryn Hill','Đĩa Than (Vinyl)',1998,949000.00,5,'Hip hop và soul kết hợp hài hòa, album đầu tay giàu ảnh hưởng.','/images/products/catalog/miseducation.jpg','conhang',1),(12,'OK Computer','Radiohead','Đĩa Than (Vinyl)',1997,849000.00,6,'Alternative rock với không gian âm thanh đặc trưng.','/images/products/catalog/ok-computer.jpg','conhang',1),(13,'Currents','Tame Impala','Đĩa Than (Vinyl)',2015,849000.00,7,'Psychedelic pop hiện đại với phần bass và synth nổi bật.','/images/products/catalog/currents.jpg','conhang',1),(14,'Plastic Love','Mariya Takeuchi','Đĩa Than (Vinyl)',1984,999000.00,4,'City Pop được yêu thích rộng rãi, phù hợp cho bộ sưu tập Nhật Bản.','/images/products/catalog/plastic-love.jpg','conhang',1),(15,'Discovery','Daft Punk','Đĩa Than (Vinyl)',2001,899000.00,5,'French house giàu giai điệu, album phù hợp nghe trong không gian gia đình.','/images/products/catalog/discovery.jpg','conhang',1),(16,'Folklore','Taylor Swift','Đĩa Than (Vinyl)',2020,1099000.00,5,'Indie folk-pop với không khí trầm lắng và giàu câu chuyện.','/images/products/catalog/folklore.jpg','conhang',1),(17,'Unreal Unearth','Hozier','Đĩa Than (Vinyl)',2023,999000.00,4,'Alternative soul hiện đại với phần hòa âm dày và giàu cảm xúc.','/images/products/catalog/unreal-unearth.jpg','conhang',1),(18,'PS-LX310BT','Sony','Máy Quay Đĩa (Turntable)',2019,6990000.00,3,'Mâm đĩa tự động, hỗ trợ Bluetooth và phono tích hợp.','/images/products/catalog/ps-lx310bt.jpg','conhang',3),(19,'AT-LP60X','Audio-Technica','Máy Quay Đĩa (Turntable)',2019,4990000.00,4,'Mâm đĩa tự động dễ dùng, phù hợp người mới bắt đầu.','/images/products/catalog/at-lp60x.jpg','conhang',3),(20,'Debut EVO 2','Pro-Ject','Máy Quay Đĩa (Turntable)',2024,16990000.00,2,'Mâm đĩa thủ công dành cho hệ thống hi-fi và người muốn nâng cấp.','/images/products/catalog/debut-evo-2.jpg','conhang',3),(21,'Brad Retro MKII','Gadhouse','Máy Quay Đĩa (Turntable)',2024,5590000.00,3,'Mâm đĩa phong cách retro, phù hợp không gian nghe nhạc gia đình.','/images/products/catalog/brad-retro-mkii.jpg','conhang',3),(22,'Chổi carbon chống tĩnh điện','Vọc Records','Phụ Kiện',2024,189000.00,20,'Lấy bụi trên rãnh đĩa trước mỗi lần nghe.','/images/products/catalog/carbon-brush.jpg','conhang',4),(23,'Dung dịch vệ sinh vinyl','Vọc Records','Phụ Kiện',2024,249000.00,15,'Dung dịch vệ sinh chuyên dụng cho bề mặt đĩa than.','/images/products/catalog/vinyl-cleaning-fluid.jpg','conhang',4),(24,'Bao ngoài LP chống bụi (10 chiếc)','Vọc Records','Phụ Kiện',2024,99000.00,25,'Bao ngoài trong suốt giúp bảo vệ bìa album khỏi bụi và trầy xước.','/images/products/catalog/outer-sleeves.jpg','conhang',4),(25,'Bao trong chống tĩnh điện (10 chiếc)','Vọc Records','Phụ Kiện',2024,129000.00,25,'Bao trong thay thế giúp hạn chế bụi và tĩnh điện.','/images/products/catalog/inner-sleeves.jpg','conhang',4),(26,'Thảm platter cao su 12 inch','Vọc Records','Phụ Kiện',2024,299000.00,10,'Thảm thay thế giúp đĩa ổn định trên platter.','/images/products/catalog/rubber-platter-mat.jpg','conhang',4),(27,'Chổi vệ sinh kim đọc đĩa','Vọc Records','Phụ Kiện',2024,159000.00,12,'Chổi nhỏ chuyên dụng để vệ sinh bụi bám trên stylus.','/images/products/catalog/stylus-brush.jpg','conhang',4),(28,'Nevermind (Cassette)','Nirvana','Cassette',1991,399000.00,8,'Bản cassette grunge kinh điển cho bộ sưu tập lo-fi.','/images/products/catalog/nevermind-cassette.jpg','conhang',2),(29,'1989 (Cassette)','Taylor Swift','Cassette',2014,349000.00,9,'Pop hiện đại trên định dạng cassette sưu tầm.','/images/products/catalog/1989-cassette.jpg','conhang',2),(30,'After Hours (Cassette)','The Weeknd','Cassette',2020,399000.00,7,'Synth-pop đậm màu điện ảnh, phiên bản cassette dễ sưu tầm.','/images/products/catalog/after-hours-cassette.jpg','conhang',2),(31,'Demon Days (Cassette)','Gorillaz','Cassette',2005,449000.00,6,'Alternative hip hop với màu sắc hoạt hình đặc trưng.','/images/products/catalog/demon-days-cassette.jpg','conhang',2);
/*!40000 ALTER TABLE `SanPham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SoDiaChi`
--

DROP TABLE IF EXISTS `SoDiaChi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SoDiaChi` (
  `MaDC` int NOT NULL AUTO_INCREMENT,
  `MaKH` int NOT NULL,
  `NguoiNhan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `DiaChi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MacDinh` tinyint(1) DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaDC`),
  KEY `MaKH` (`MaKH`),
  CONSTRAINT `SoDiaChi_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SoDiaChi`
--

LOCK TABLES `SoDiaChi` WRITE;
/*!40000 ALTER TABLE `SoDiaChi` DISABLE KEYS */;
/*!40000 ALTER TABLE `SoDiaChi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TaiKhoan`
--

DROP TABLE IF EXISTS `TaiKhoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TaiKhoan` (
  `MaTK` int NOT NULL AUTO_INCREMENT,
  `TenDangNhap` varchar(50) NOT NULL,
  `MatKhau` varchar(255) NOT NULL,
  `VaiTro` enum('khachhang','nhanvien','admin') DEFAULT 'khachhang',
  `TrangThai` tinyint(1) DEFAULT '1',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTK`),
  UNIQUE KEY `TenDangNhap` (`TenDangNhap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TaiKhoan`
--

LOCK TABLES `TaiKhoan` WRITE;
/*!40000 ALTER TABLE `TaiKhoan` DISABLE KEYS */;
/*!40000 ALTER TABLE `TaiKhoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ThanhToan`
--

DROP TABLE IF EXISTS `ThanhToan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ThanhToan` (
  `MaTT` int NOT NULL AUTO_INCREMENT,
  `MaDH` int DEFAULT NULL,
  `SoTien` decimal(15,2) DEFAULT NULL,
  `HinhThuc` enum('tiemmat','chuyenkhoan','cod','payos','momo','vnpay') DEFAULT 'cod',
  `TrangThaiTT` enum('chuathanhtoan','dangxuly','dathanhtoan','thatbai','dahuy') DEFAULT 'chuathanhtoan',
  `MaGiaoDich` varchar(100) DEFAULT NULL,
  `NgayTT` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`MaTT`),
  KEY `MaDH` (`MaDH`),
  CONSTRAINT `ThanhToan_ibfk_1` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ThanhToan`
--

LOCK TABLES `ThanhToan` WRITE;
/*!40000 ALTER TABLE `ThanhToan` DISABLE KEYS */;
/*!40000 ALTER TABLE `ThanhToan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `YeuThich`
--

DROP TABLE IF EXISTS `YeuThich`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `YeuThich` (
  `MaYT` int NOT NULL AUTO_INCREMENT,
  `MaKH` int DEFAULT NULL,
  `MaSP` int DEFAULT NULL,
  PRIMARY KEY (`MaYT`),
  KEY `MaKH` (`MaKH`),
  KEY `MaSP` (`MaSP`),
  CONSTRAINT `YeuThich_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE,
  CONSTRAINT `YeuThich_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `YeuThich`
--

LOCK TABLES `YeuThich` WRITE;
/*!40000 ALTER TABLE `YeuThich` DISABLE KEYS */;
/*!40000 ALTER TABLE `YeuThich` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'clonevocrecord'
--

--
-- Dumping routines for database 'clonevocrecord'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-10 14:31:51
