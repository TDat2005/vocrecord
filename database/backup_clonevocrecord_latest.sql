-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: clonevocrecord
-- ------------------------------------------------------
-- Server version	8.0.46

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
  KEY `idx_baiviet_listing` (`LoaiBV`,`TrangThai`,`NgayTao`),
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
-- Table structure for table `BinhLuanSanPham`
--

DROP TABLE IF EXISTS `BinhLuanSanPham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `BinhLuanSanPham` (
  `MaBL` int NOT NULL AUTO_INCREMENT,
  `MaSP` int NOT NULL,
  `MaKH` int DEFAULT NULL,
  `MaTK` int DEFAULT NULL,
  `MaCha` int DEFAULT NULL,
  `Loai` enum('cauhoi','phanhoi') COLLATE utf8mb4_unicode_ci DEFAULT 'cauhoi',
  `NoiDung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` enum('choxuly','daduyet','an') COLLATE utf8mb4_unicode_ci DEFAULT 'choxuly',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBL`),
  KEY `MaKH` (`MaKH`),
  KEY `MaTK` (`MaTK`),
  KEY `idx_comment_product` (`MaSP`,`TrangThai`),
  KEY `idx_comment_parent` (`MaCha`),
  CONSTRAINT `BinhLuanSanPham_ibfk_1` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE,
  CONSTRAINT `BinhLuanSanPham_ibfk_2` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE SET NULL,
  CONSTRAINT `BinhLuanSanPham_ibfk_3` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE SET NULL,
  CONSTRAINT `BinhLuanSanPham_ibfk_4` FOREIGN KEY (`MaCha`) REFERENCES `BinhLuanSanPham` (`MaBL`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BinhLuanSanPham`
--

LOCK TABLES `BinhLuanSanPham` WRITE;
/*!40000 ALTER TABLE `BinhLuanSanPham` DISABLE KEYS */;
/*!40000 ALTER TABLE `BinhLuanSanPham` ENABLE KEYS */;
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
  `ChuDe` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrangThai` enum('mo','dong') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mo',
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChatConversation`
--

LOCK TABLES `ChatConversation` WRITE;
/*!40000 ALTER TABLE `ChatConversation` DISABLE KEYS */;
INSERT INTO `ChatConversation` VALUES (1,4,NULL,NULL,'Tư vấn chung','mo','2026-09-13 08:45:50','2026-09-13 07:14:08','2026-09-13 08:45:50');
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
  `VaiTroNguoiGui` enum('khachhang','nhanvien','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DaDoc` tinyint(1) NOT NULL DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTinNhan`),
  KEY `MaTK` (`MaTK`),
  KEY `idx_chat_message_conversation` (`MaCuocChat`,`MaTinNhan`,`NgayTao`),
  KEY `idx_chat_message_unread` (`MaCuocChat`,`DaDoc`,`MaTK`),
  CONSTRAINT `ChatMessage_ibfk_1` FOREIGN KEY (`MaCuocChat`) REFERENCES `ChatConversation` (`MaCuocChat`) ON DELETE CASCADE,
  CONSTRAINT `ChatMessage_ibfk_2` FOREIGN KEY (`MaTK`) REFERENCES `TaiKhoan` (`MaTK`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChatMessage`
--

LOCK TABLES `ChatMessage` WRITE;
/*!40000 ALTER TABLE `ChatMessage` DISABLE KEYS */;
INSERT INTO `ChatMessage` VALUES (1,1,4,'khachhang','lô',0,'2026-09-13 07:14:17'),(2,1,4,'khachhang','hi',0,'2026-09-13 07:14:22'),(3,1,4,'admin','sao em',0,'2026-09-13 07:17:47'),(4,1,4,'admin','lô',0,'2026-09-13 07:18:45'),(5,1,4,'admin','m biết bố m là ai k',0,'2026-09-13 08:43:11'),(6,1,4,'admin','dạ ko ạ',0,'2026-09-13 08:45:50');
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
  KEY `idx_ctdh_order` (`MaDH`),
  CONSTRAINT `ChiTietDonHang_ibfk_1` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE CASCADE,
  CONSTRAINT `ChiTietDonHang_ibfk_2` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ChiTietDonHang`
--

LOCK TABLES `ChiTietDonHang` WRITE;
/*!40000 ALTER TABLE `ChiTietDonHang` DISABLE KEYS */;
INSERT INTO `ChiTietDonHang` VALUES (2,2,44,1,5000.00);
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
  `NguoiNhan` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SDTNhan` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayDat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TongTien` decimal(15,2) NOT NULL,
  `TrangThai` enum('choxacnhan','daxacnhan','dangchuanbihang','danggiaohang','hoanthanh','dahuy') COLLATE utf8mb4_unicode_ci DEFAULT 'choxacnhan',
  `PhuongThucThanhToan` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'COD',
  `CodeGiamGia` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoTienGiam` decimal(15,2) DEFAULT '0.00',
  `DiaChiGiao` text COLLATE utf8mb4_unicode_ci,
  `GhiChu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaNVXuLy` int DEFAULT NULL,
  `MaDonGHN` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNTrangThai` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `PhiVanChuyen` decimal(15,2) DEFAULT '0.00',
  `GHNExpectedDelivery` datetime DEFAULT NULL,
  `GHNLastSync` datetime DEFAULT NULL,
  `GHNReason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNProvinceName` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNWardName` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNIsNewAddress` tinyint(1) DEFAULT '1',
  `CanNang` int DEFAULT '600',
  `ChieuDai` int DEFAULT '25',
  `ChieuRong` int DEFAULT '20',
  `ChieuCao` int DEFAULT '8',
  `ThongTinHoanTien` text COLLATE utf8mb4_unicode_ci,
  `TrangThaiHoanTien` enum('khongapdung','choxuly','dahoantien') COLLATE utf8mb4_unicode_ci DEFAULT 'khongapdung',
  PRIMARY KEY (`MaDH`),
  KEY `fk_donhang_nhanvien` (`MaNVXuLy`),
  KEY `idx_donhang_customer_date` (`MaKH`,`NgayDat`),
  KEY `idx_donhang_status_date` (`TrangThai`,`NgayDat`),
  KEY `idx_donhang_ghn_code` (`MaDonGHN`),
  CONSTRAINT `DonHang_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE,
  CONSTRAINT `fk_donhang_nhanvien` FOREIGN KEY (`MaNVXuLy`) REFERENCES `NhanVien` (`MaNV`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DonHang`
--

LOCK TABLES `DonHang` WRITE;
/*!40000 ALTER TABLE `DonHang` DISABLE KEYS */;
INSERT INTO `DonHang` VALUES (2,4,'Nguyễn Tiến Đạt','0766255478','2026-09-13 08:01:36',5000.00,'danggiaohang','payos',NULL,0.00,'đá đá đá đá','',1,'VOC-STG-MTZMBIRQ-04VA','ready_to_pick',30000.00,'2026-09-16 09:35:03','2026-09-13 09:35:03',NULL,'Cà Mau','Xã Hòa Bình',1,600,25,20,8,NULL,'khongapdung');
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
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `KhachHang`
--

LOCK TABLES `KhachHang` WRITE;
/*!40000 ALTER TABLE `KhachHang` DISABLE KEYS */;
INSERT INTO `KhachHang` VALUES (4,'Nguyễn Tiến Đạt','0766255478','dat20062xx5@gmail.com',NULL,4),(5,'Quản trị viên',NULL,'admin@vocrecord.local',NULL,5),(6,'Quản trị viên',NULL,'admin2@vocrecord.local',NULL,6),(7,'Nhân viên bán hàng',NULL,'nhanvien@vocrecord.local',NULL,7),(8,'Nhân viên bán hàng',NULL,'nhanvien2@vocrecord.local',NULL,8);
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
  `Code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoaiGiamGia` enum('percent','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'percent',
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NhanVien`
--

LOCK TABLES `NhanVien` WRITE;
/*!40000 ALTER TABLE `NhanVien` DISABLE KEYS */;
INSERT INTO `NhanVien` VALUES (1,'Nguyễn Tiến Đạt','Qu?n tr? vi?n',4),(2,'Quản trị viên','Qu?n tr? vi?n',5),(3,'Quản trị viên','Qu?n tr? vi?n',6),(4,'Nhân viên bán hàng','Nh?n vi?n b?n h?ng',7),(5,'Nhân viên bán hàng','Nh?n vi?n b?n h?ng',8);
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
  `Email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MaCode` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoaiOTP` enum('dangky','quenmatkhau','dangnhap') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'dangky',
  `HetHan` datetime NOT NULL,
  `DaSuDung` tinyint(1) DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaOTP`),
  KEY `idx_email_code` (`Email`,`MaCode`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OtpCodes`
--

LOCK TABLES `OtpCodes` WRITE;
/*!40000 ALTER TABLE `OtpCodes` DISABLE KEYS */;
INSERT INTO `OtpCodes` VALUES (3,'dat20062xx5@gmail.com','982014','dangky','2026-09-13 06:57:26',1,'2026-09-13 06:52:26'),(4,'dat20062xx5@gmail.com','822697','dangky','2026-09-13 07:00:17',1,'2026-09-13 06:55:17'),(6,'dat20062xx5@gmail.com','920508','dangky','2026-09-13 07:18:04',1,'2026-09-13 07:13:04');
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
  `TheLoaiNhac` varchar(100) DEFAULT NULL,
  `NamPhatHanh` int DEFAULT NULL,
  `GiaBan` decimal(15,2) NOT NULL,
  `SoLuongTon` int DEFAULT '0',
  `MoTa` text,
  `HinhAnh` varchar(255) DEFAULT NULL,
  `DinhDang` varchar(100) DEFAULT NULL,
  `TinhTrangDia` varchar(100) DEFAULT NULL,
  `QuyCach` varchar(100) DEFAULT NULL,
  `Tracklist` text,
  `TinhTrang` enum('conhang','saphethang','hethang','preorder','ngungkinhdoanh') DEFAULT 'conhang',
  `MaDM` int DEFAULT NULL,
  PRIMARY KEY (`MaSP`),
  KEY `MaDM` (`MaDM`),
  CONSTRAINT `SanPham_ibfk_1` FOREIGN KEY (`MaDM`) REFERENCES `DanhMuc` (`MaDM`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SanPham`
--

LOCK TABLES `SanPham` WRITE;
/*!40000 ALTER TABLE `SanPham` DISABLE KEYS */;
INSERT INTO `SanPham` VALUES (1,'Random Access Memories','Daft Punk','Đĩa Than (Vinyl)','ELECTRONIC',2013,899000.00,12,'Album electronic kinh điển, bản vinyl 2LP phù hợp để nghe trọn mặt.','/images/products/catalog/random-access-memories.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(2,'Abbey Road','The Beatles','Đĩa Than (Vinyl)','CLASSIC ROCK',1969,799000.00,10,'Một trong những album rock được sưu tầm nhiều nhất.','/images/products/catalog/abbey-road.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(3,'The Dark Side of the Moon','Pink Floyd','Đĩa Than (Vinyl)','PROGRESSIVE ROCK',1973,849000.00,8,'Progressive rock với cấu trúc album liền mạch và giàu chi tiết.','/images/products/catalog/dark-side-of-the-moon.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(4,'Rumours','Fleetwood Mac','Đĩa Than (Vinyl)','SOFT ROCK',1977,749000.00,7,'Album soft rock nổi tiếng với bản phối cân bằng và giàu cảm xúc.','/images/products/catalog/rumours.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(5,'Kind of Blue','Miles Davis','Đĩa Than (Vinyl)','JAZZ',1959,899000.00,6,'Jazz kinh điển, bản thu tham chiếu cho nhiều hệ thống nghe.','/images/products/catalog/kind-of-blue.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(6,'Thriller','Michael Jackson','Đĩa Than (Vinyl)','POP',1982,699000.00,9,'Pop kinh điển với nhiều ca khúc quen thuộc.','/images/products/catalog/thriller.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(7,'Back to Black','Amy Winehouse','Đĩa Than (Vinyl)','SOUL',2006,799000.00,6,'Soul và jazz-pop với giọng hát đặc trưng.','/images/products/catalog/back-to-black.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(8,'Blue Train','John Coltrane','Đĩa Than (Vinyl)','JAZZ',1957,849000.00,5,'Hard bop mạnh mẽ, phù hợp cho người nghe jazz.','/images/products/catalog/blue-train.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(9,'Getz / Gilberto','Stan Getz & João Gilberto','Đĩa Than (Vinyl)','BOSSA NOVA',1964,799000.00,5,'Bossa nova nhẹ nhàng, một album jazz dễ nghe.','/images/products/catalog/getz-gilberto.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(10,'A Love Supreme','John Coltrane','Đĩa Than (Vinyl)','JAZZ',1965,899000.00,4,'Jazz chuyên sâu với phần trình diễn giàu năng lượng.','/images/products/catalog/a-love-supreme.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(11,'The Miseducation of Lauryn Hill','Lauryn Hill','Đĩa Than (Vinyl)','HIP HOP',1998,949000.00,5,'Hip hop và soul kết hợp hài hòa, album đầu tay giàu ảnh hưởng.','/images/products/catalog/miseducation.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(12,'OK Computer','Radiohead','Đĩa Than (Vinyl)','ALTERNATIVE ROCK',1997,849000.00,6,'Alternative rock với không gian âm thanh đặc trưng.','/images/products/catalog/ok-computer.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(13,'Currents','Tame Impala','Đĩa Than (Vinyl)','PSYCHEDELIC POP',2015,849000.00,7,'Psychedelic pop hiện đại với phần bass và synth nổi bật.','/images/products/catalog/currents.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(14,'Plastic Love','Mariya Takeuchi','Đĩa Than (Vinyl)','CITY POP',1984,999000.00,4,'City Pop được yêu thích rộng rãi, phù hợp cho bộ sưu tập Nhật Bản.','/images/products/catalog/plastic-love.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(15,'Discovery','Daft Punk','Đĩa Than (Vinyl)','ELECTRONIC',2001,899000.00,5,'French house giàu giai điệu, album phù hợp nghe trong không gian gia đình.','/images/products/catalog/discovery.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(16,'Folklore','Taylor Swift','Đĩa Than (Vinyl)','INDIE FOLK',2020,1099000.00,5,'Indie folk-pop với không khí trầm lắng và giàu câu chuyện.','/images/products/catalog/folklore.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(17,'Unreal Unearth','Hozier','Đĩa Than (Vinyl)','ALTERNATIVE',2023,999000.00,4,'Alternative soul hiện đại với phần hòa âm dày và giàu cảm xúc.','/images/products/catalog/unreal-unearth.jpg','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(18,'PS-LX310BT','Sony','Máy Quay Đĩa (Turntable)',NULL,2019,6990000.00,3,'Mâm đĩa tự động, hỗ trợ Bluetooth và phono tích hợp.','/images/products/catalog/ps-lx310bt.jpg','Turntable','Brand New','1 x Thiết bị',NULL,'conhang',3),(19,'AT-LP60X','Audio-Technica','Máy Quay Đĩa (Turntable)',NULL,2019,4990000.00,4,'Mâm đĩa tự động dễ dùng, phù hợp người mới bắt đầu.','/images/products/catalog/at-lp60x.jpg','Turntable','Brand New','1 x Thiết bị',NULL,'conhang',3),(20,'Debut EVO 2','Pro-Ject','Máy Quay Đĩa (Turntable)',NULL,2024,16990000.00,2,'Mâm đĩa thủ công dành cho hệ thống hi-fi và người muốn nâng cấp.','/images/products/catalog/debut-evo-2.jpg','Turntable','Brand New','1 x Thiết bị',NULL,'conhang',3),(21,'Brad Retro MKII','Gadhouse','Máy Quay Đĩa (Turntable)',NULL,2024,5590000.00,3,'Mâm đĩa phong cách retro, phù hợp không gian nghe nhạc gia đình.','/images/products/catalog/brad-retro-mkii.jpg','Turntable','Brand New','1 x Thiết bị',NULL,'conhang',3),(22,'Chổi carbon chống tĩnh điện','Vọc Records','Phụ Kiện',NULL,2024,189000.00,20,'Lấy bụi trên rãnh đĩa trước mỗi lần nghe.','/images/products/catalog/carbon-brush.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(23,'Dung dịch vệ sinh vinyl','Vọc Records','Phụ Kiện',NULL,2024,249000.00,15,'Dung dịch vệ sinh chuyên dụng cho bề mặt đĩa than.','/images/products/catalog/vinyl-cleaning-fluid.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(24,'Bao ngoài LP chống bụi (10 chiếc)','Vọc Records','Phụ Kiện',NULL,2024,99000.00,25,'Bao ngoài trong suốt giúp bảo vệ bìa album khỏi bụi và trầy xước.','/images/products/catalog/outer-sleeves.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(25,'Bao trong chống tĩnh điện (10 chiếc)','Vọc Records','Phụ Kiện',NULL,2024,129000.00,25,'Bao trong thay thế giúp hạn chế bụi và tĩnh điện.','/images/products/catalog/inner-sleeves.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(26,'Thảm platter cao su 12 inch','Vọc Records','Phụ Kiện',NULL,2024,299000.00,10,'Thảm thay thế giúp đĩa ổn định trên platter.','/images/products/catalog/rubber-platter-mat.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(27,'Chổi vệ sinh kim đọc đĩa','Vọc Records','Phụ Kiện',NULL,2024,159000.00,12,'Chổi nhỏ chuyên dụng để vệ sinh bụi bám trên stylus.','/images/products/catalog/stylus-brush.jpg','Phụ kiện','Mới','1 x Sản phẩm',NULL,'conhang',4),(28,'Nevermind (Cassette)','Nirvana','Cassette','GRUNGE',1991,399000.00,8,'Bản cassette grunge kinh điển cho bộ sưu tập lo-fi.','/images/products/catalog/nevermind-cassette.jpg','Cassette','Brand New (SS)','1 x Album',NULL,'conhang',2),(29,'1989 (Cassette)','Taylor Swift','Cassette','POP',2014,349000.00,9,'Pop hiện đại trên định dạng cassette sưu tầm.','/images/products/catalog/1989-cassette.jpg','Cassette','Brand New (SS)','1 x Album',NULL,'conhang',2),(30,'After Hours (Cassette)','The Weeknd','Cassette','SYNTH-POP',2020,399000.00,7,'Synth-pop đậm màu điện ảnh, phiên bản cassette dễ sưu tầm.','/images/products/catalog/after-hours-cassette.jpg','Cassette','Brand New (SS)','1 x Album',NULL,'conhang',2),(31,'Demon Days (Cassette)','Gorillaz','Cassette','ALTERNATIVE HIP HOP',2005,449000.00,6,'Alternative hip hop với màu sắc hoạt hình đặc trưng.','/images/products/catalog/demon-days-cassette.jpg','Cassette','Brand New (SS)','1 x Album',NULL,'conhang',2),(32,'To Pimp a Butterfly','Kendrick Lamar','Đĩa Than (Vinyl)','HIP HOP',2015,999000.00,5,'Hip hop giàu lớp lang, phù hợp người nghe muốn khám phá một album có chiều sâu.','/images/products/vinyl-04.webp','Vinyl 12\" 2LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(33,'What\'s Going On','Marvin Gaye','Đĩa Than (Vinyl)','FUNK / SOUL',1971,899000.00,5,'Soul giàu cảm xúc với phần phối khí ấm và thông điệp xã hội nổi bật.','/images/products/vinyl-01.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(34,'Bitches Brew','Miles Davis','Đĩa Than (Vinyl)','JAZZ',1970,1099000.00,4,'Jazz fusion tiên phong với âm thanh dày và giàu năng lượng.','/images/products/vinyl-02.webp','Vinyl 12\" 2LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(35,'Buena Vista Social Club','Buena Vista Social Club','Đĩa Than (Vinyl)','LATIN',1997,949000.00,4,'Âm nhạc Cuba mộc mạc, giàu nhịp điệu và phù hợp nghe thư giãn.','/images/products/vinyl-03.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(36,'Dummy','Portishead','Đĩa Than (Vinyl)','TRIP HOP',1994,899000.00,4,'Trip hop tối màu, nhiều texture và phù hợp những buổi nghe đêm.','/images/products/vinyl-04.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(37,'Blue','Joni Mitchell','Đĩa Than (Vinyl)','FOLK',1971,899000.00,4,'Folk songwriter kinh điển với phần trình bày gần gũi và giàu chi tiết.','/images/products/vinyl-01.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(38,'Spirited Away Original Soundtrack','Joe Hisaishi','Đĩa Than (Vinyl)','STAGE & SCREEN',2001,1199000.00,3,'Nhạc phim giàu không khí điện ảnh, phù hợp người sưu tầm soundtrack.','/images/products/vinyl-02.webp','Vinyl 12\" 2LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(39,'Homogenic','Björk','Đĩa Than (Vinyl)','ELECTRONIC',1997,999000.00,3,'Electronic art-pop với thiết kế âm thanh độc đáo và giàu thử nghiệm.','/images/products/vinyl-03.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(40,'Future Nostalgia','Dua Lipa','Đĩa Than (Vinyl)','POP',2020,899000.00,5,'Pop hiện đại với nhịp disco bắt tai và bản phối sáng rõ.','/images/products/vinyl-04.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(41,'Elis & Tom','Elis Regina & Antônio Carlos Jobim','Đĩa Than (Vinyl)','BOSSA NOVA',1974,949000.00,3,'Bossa nova tinh tế, nhẹ nhàng và phù hợp không gian nghe tại nhà.','/images/products/vinyl-01.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(42,'3','Ngọt','Đĩa Than (Vinyl)','VIỆT NAM',2019,599000.00,5,'Album Việt Nam hiện đại dành cho người muốn mở rộng bộ sưu tập trong nước.','/images/products/vinyl-02.webp','Vinyl 12\" LP','Brand New (SS)','1 x Album',NULL,'conhang',1),(43,'An Evening with Silk Sonic','Silk Sonic','Cassette','R&B',2021,449000.00,5,'R&B hiện đại trên định dạng cassette sưu tầm.','/images/products/cassette-01.webp','Cassette','Brand New (SS)','1 x Album',NULL,'conhang',2),(44,'Test','NSUT Tiến Đạt','Đĩa Than (Vinyl)','',2024,5000.00,9,'','/images/products/vinyl-01.webp','','','','','conhang',1);
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
  `NguoiNhan` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoai` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DiaChi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MacDinh` tinyint(1) DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `GHNTinh` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNPhuong` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNProvinceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `GHNWardId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaDC`),
  KEY `MaKH` (`MaKH`),
  CONSTRAINT `SoDiaChi_ibfk_1` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SoDiaChi`
--

LOCK TABLES `SoDiaChi` WRITE;
/*!40000 ALTER TABLE `SoDiaChi` DISABLE KEYS */;
INSERT INTO `SoDiaChi` VALUES (2,5,'Nguyen Van A','0987654321','54 Trieu Khuc, Phuong Thanh Xuan Nam, Quan Thanh Xuan',0,'2026-09-13 07:59:30','Ha Noi','Phuong Thanh Xuan Nam','202','20216'),(3,4,'đá','0766255478','đá đá đá đá',1,'2026-09-13 08:01:36','Cà Mau','Xã Hòa Bình','218','21808');
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
  `TenDangNhap` varchar(100) NOT NULL,
  `MatKhau` varchar(255) NOT NULL,
  `VaiTro` enum('khachhang','nhanvien','admin') DEFAULT 'khachhang',
  `TrangThai` tinyint(1) DEFAULT '1',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTK`),
  UNIQUE KEY `TenDangNhap` (`TenDangNhap`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TaiKhoan`
--

LOCK TABLES `TaiKhoan` WRITE;
/*!40000 ALTER TABLE `TaiKhoan` DISABLE KEYS */;
INSERT INTO `TaiKhoan` VALUES (4,'dat20062xx5@gmail.com','$2a$10$8XuTwv1hcjmOqh5ZDby2lOXHsxCKW1mTyZ10sEDPzDUdN2TfEpRNW','admin',1,'2026-09-13 07:13:55'),(5,'admin','$2a$10$C0QTIB/AZkgcDrzDuBYUb.SP0VpKEDkkmZPIgMTI1zQbajbBxg9SK','admin',1,'2026-09-13 07:15:44'),(6,'admin@vocrecord.local','$2a$10$C0QTIB/AZkgcDrzDuBYUb.SP0VpKEDkkmZPIgMTI1zQbajbBxg9SK','admin',1,'2026-09-13 07:15:44'),(7,'nhanvien','$2a$10$GrEFm/696VGaUFRH0HsYSOsKixjM2pUCnIuAQm73ZSwHdilwtCcwe','nhanvien',1,'2026-09-13 07:15:44'),(8,'nhanvien@vocrecord.local','$2a$10$GrEFm/696VGaUFRH0HsYSOsKixjM2pUCnIuAQm73ZSwHdilwtCcwe','nhanvien',1,'2026-09-13 07:15:44');
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
  KEY `idx_thanhtoan_transaction` (`MaGiaoDich`),
  CONSTRAINT `ThanhToan_ibfk_1` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ThanhToan`
--

LOCK TABLES `ThanhToan` WRITE;
/*!40000 ALTER TABLE `ThanhToan` DISABLE KEYS */;
INSERT INTO `ThanhToan` VALUES (2,2,5000.00,'payos','dathanhtoan','2864960942',NULL);
/*!40000 ALTER TABLE `ThanhToan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `YeuCauTraHang`
--

DROP TABLE IF EXISTS `YeuCauTraHang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `YeuCauTraHang` (
  `MaYCT` int NOT NULL AUTO_INCREMENT,
  `MaDH` int NOT NULL,
  `MaKH` int NOT NULL,
  `LyDo` enum('hang_loi','sai_san_pham','thieu_hang','hu_hong_van_chuyen','khac') COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `BangChung` text COLLATE utf8mb4_unicode_ci,
  `TrangThai` enum('moi','dangxuly','chapnhan','tuchoi','danghoan','hoantat') COLLATE utf8mb4_unicode_ci DEFAULT 'moi',
  `SoTienHoan` decimal(15,2) DEFAULT '0.00',
  `TrangThaiHoanTien` enum('khongapdung','choxuly','daxuly','thatbai') COLLATE utf8mb4_unicode_ci DEFAULT 'khongapdung',
  `GhiChuAdmin` text COLLATE utf8mb4_unicode_ci,
  `DaNhapKho` tinyint(1) DEFAULT '0',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaYCT`),
  KEY `MaKH` (`MaKH`),
  KEY `idx_return_order` (`MaDH`),
  KEY `idx_return_status` (`TrangThai`),
  CONSTRAINT `YeuCauTraHang_ibfk_1` FOREIGN KEY (`MaDH`) REFERENCES `DonHang` (`MaDH`) ON DELETE CASCADE,
  CONSTRAINT `YeuCauTraHang_ibfk_2` FOREIGN KEY (`MaKH`) REFERENCES `KhachHang` (`MaKH`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `YeuCauTraHang`
--

LOCK TABLES `YeuCauTraHang` WRITE;
/*!40000 ALTER TABLE `YeuCauTraHang` DISABLE KEYS */;
/*!40000 ALTER TABLE `YeuCauTraHang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `YeuCauTraHangChiTiet`
--

DROP TABLE IF EXISTS `YeuCauTraHangChiTiet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `YeuCauTraHangChiTiet` (
  `MaYCT` int NOT NULL,
  `MaCTDH` int NOT NULL,
  `MaSP` int NOT NULL,
  `SoLuong` int NOT NULL,
  PRIMARY KEY (`MaYCT`,`MaCTDH`),
  KEY `MaCTDH` (`MaCTDH`),
  KEY `MaSP` (`MaSP`),
  CONSTRAINT `YeuCauTraHangChiTiet_ibfk_1` FOREIGN KEY (`MaYCT`) REFERENCES `YeuCauTraHang` (`MaYCT`) ON DELETE CASCADE,
  CONSTRAINT `YeuCauTraHangChiTiet_ibfk_2` FOREIGN KEY (`MaCTDH`) REFERENCES `ChiTietDonHang` (`MaCTDH`) ON DELETE CASCADE,
  CONSTRAINT `YeuCauTraHangChiTiet_ibfk_3` FOREIGN KEY (`MaSP`) REFERENCES `SanPham` (`MaSP`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `YeuCauTraHangChiTiet`
--

LOCK TABLES `YeuCauTraHangChiTiet` WRITE;
/*!40000 ALTER TABLE `YeuCauTraHangChiTiet` DISABLE KEYS */;
/*!40000 ALTER TABLE `YeuCauTraHangChiTiet` ENABLE KEYS */;
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
  KEY `idx_yeuthich_customer_product` (`MaKH`,`MaSP`),
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-13  9:54:45
