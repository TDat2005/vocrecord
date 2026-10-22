-- Migration 10: thay ảnh minh họa (do AI tạo) bằng ảnh thật của sản phẩm.
--  * 33 album/cassette: bìa gốc lấy từ Cover Art Archive (MusicBrainz) và iTunes.
--  * Pro-Ject Debut EVO 2: ảnh Wikimedia Commons, CC BY 4.0 (xem DiaNhac/public/images/products/covers/CREDITS.md).
--  * Mâm đĩa Sony, Audio-Technica, Gadhouse và phụ kiện chưa có ảnh thật dùng được nên giữ ảnh cũ.
-- Chỉ đổi ảnh đang là ảnh mẫu (catalog/, vinyl-0x, cassette-0x): ảnh quản trị viên tự đặt không bị ghi đè.
-- Sau khi chạy, server tự tính lại vector ảnh cho tìm kiếm bằng ảnh bìa (đường dẫn ảnh đổi). Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

UPDATE SanPham sp
JOIN (
    SELECT 'Random Access Memories' AS TenSP, '/images/products/covers/random-access-memories.jpg' AS HinhAnh
    UNION ALL SELECT 'Abbey Road', '/images/products/covers/abbey-road.jpg'
    UNION ALL SELECT 'The Dark Side of the Moon', '/images/products/covers/dark-side-of-the-moon.jpg'
    UNION ALL SELECT 'Rumours', '/images/products/covers/rumours.jpg'
    UNION ALL SELECT 'Kind of Blue', '/images/products/covers/kind-of-blue.jpg'
    UNION ALL SELECT 'Thriller', '/images/products/covers/thriller.jpg'
    UNION ALL SELECT 'Back to Black', '/images/products/covers/back-to-black.jpg'
    UNION ALL SELECT 'Blue Train', '/images/products/covers/blue-train.jpg'
    UNION ALL SELECT 'Getz / Gilberto', '/images/products/covers/getz-gilberto.jpg'
    UNION ALL SELECT 'A Love Supreme', '/images/products/covers/a-love-supreme.jpg'
    UNION ALL SELECT 'The Miseducation of Lauryn Hill', '/images/products/covers/miseducation.jpg'
    UNION ALL SELECT 'OK Computer', '/images/products/covers/ok-computer.jpg'
    UNION ALL SELECT 'Currents', '/images/products/covers/currents.jpg'
    UNION ALL SELECT 'Plastic Love', '/images/products/covers/plastic-love.jpg'
    UNION ALL SELECT 'Discovery', '/images/products/covers/discovery.jpg'
    UNION ALL SELECT 'Folklore', '/images/products/covers/folklore.jpg'
    UNION ALL SELECT 'Unreal Unearth', '/images/products/covers/unreal-unearth.jpg'
    UNION ALL SELECT 'Nevermind (Cassette)', '/images/products/covers/nevermind.jpg'
    UNION ALL SELECT '1989 (Cassette)', '/images/products/covers/1989.jpg'
    UNION ALL SELECT 'After Hours (Cassette)', '/images/products/covers/after-hours.jpg'
    UNION ALL SELECT 'Demon Days (Cassette)', '/images/products/covers/demon-days.jpg'
    UNION ALL SELECT 'To Pimp a Butterfly', '/images/products/covers/to-pimp-a-butterfly.jpg'
    UNION ALL SELECT 'What''s Going On', '/images/products/covers/whats-going-on.jpg'
    UNION ALL SELECT 'Bitches Brew', '/images/products/covers/bitches-brew.jpg'
    UNION ALL SELECT 'Buena Vista Social Club', '/images/products/covers/buena-vista-social-club.jpg'
    UNION ALL SELECT 'Dummy', '/images/products/covers/dummy.jpg'
    UNION ALL SELECT 'Blue', '/images/products/covers/blue.jpg'
    UNION ALL SELECT 'Spirited Away Original Soundtrack', '/images/products/covers/spirited-away.jpg'
    UNION ALL SELECT 'Homogenic', '/images/products/covers/homogenic.jpg'
    UNION ALL SELECT 'Future Nostalgia', '/images/products/covers/future-nostalgia.jpg'
    UNION ALL SELECT 'Elis & Tom', '/images/products/covers/elis-and-tom.jpg'
    UNION ALL SELECT '3', '/images/products/covers/ngot-3.jpg'
    UNION ALL SELECT 'An Evening with Silk Sonic', '/images/products/covers/an-evening-with-silk-sonic.jpg'
    UNION ALL SELECT 'Debut EVO 2', '/images/products/covers/debut-evo-2.jpg'
) covers ON covers.TenSP = sp.TenSP COLLATE utf8mb4_unicode_ci
SET sp.HinhAnh = covers.HinhAnh
WHERE sp.HinhAnh IS NULL OR sp.HinhAnh = '' OR sp.HinhAnh LIKE '/images/products/catalog/%' OR sp.HinhAnh REGEXP '^/images/products/(vinyl|cassette)-0[0-9][.]webp$';
