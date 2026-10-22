const pool = require('../config/database');

class SanPhamModel {
    static async getAll(category = null, search = null, limit = 100, offset = 0) {
        let query = "SELECT sp.MaSP as id, sp.TenSP as title, sp.NgheSi as artist, COALESCE(dm.TenDM, sp.TheLoai) as genre, COALESCE(dm.TenDM, sp.TheLoai) as category, sp.TheLoaiNhac as music_genre, sp.GiaBan as price, sp.SoLuongTon as stock, sp.MoTa as description, sp.HinhAnh as image, sp.DinhDang as format, sp.TinhTrangDia as `condition`, sp.QuyCach as package_info, sp.Tracklist as tracklist, sp.NamPhatHanh as year, sp.TinhTrang as status, sp.LoaiHang as item_type FROM SanPham sp LEFT JOIN DanhMuc dm ON sp.MaDM = dm.MaDM WHERE sp.TinhTrang <> 'ngungkinhdoanh'";
        const params = [];

        if (category) {
            query += " AND dm.TenDM LIKE ?";
            params.push(`%${category}%`);
        }
        if (search) {
            query += " AND sp.TenSP LIKE ?";
            params.push(`%${search}%`);
        }

        query += ' ORDER BY sp.MaSP DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute(
            "SELECT sp.MaSP as id, sp.TenSP as title, sp.NgheSi as artist, COALESCE(dm.TenDM, sp.TheLoai) as genre, COALESCE(dm.TenDM, sp.TheLoai) as category, sp.TheLoaiNhac as music_genre, sp.GiaBan as price, sp.SoLuongTon as stock, sp.MoTa as description, sp.HinhAnh as image, sp.DinhDang as format, sp.TinhTrangDia as `condition`, sp.QuyCach as package_info, sp.Tracklist as tracklist, sp.NamPhatHanh as year, sp.TinhTrang as status, sp.LoaiHang as item_type FROM SanPham sp LEFT JOIN DanhMuc dm ON sp.MaDM = dm.MaDM WHERE sp.MaSP = ?",
            [id]
        );
        return rows[0];
    }

    static async create(title, artist, genre, price, stock, desc, image, year, status, maDM = 1, musicGenre = null, format = null, condition = null, packageInfo = null, tracklist = null) {
        const [result] = await pool.execute(
            "INSERT INTO SanPham (TenSP, NgheSi, GiaBan, SoLuongTon, MoTa, HinhAnh, MaDM, TheLoai, TheLoaiNhac, DinhDang, TinhTrangDia, QuyCach, Tracklist, NamPhatHanh, TinhTrang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [title, artist, price, stock, desc, image, maDM, genre, musicGenre, format, condition, packageInfo, tracklist, year, status]
        );
        return result.insertId;
    }

    static async update(id, title, artist, genre, price, stock, desc, image, year, status, maDM = 1, musicGenre = null, format = null, condition = null, packageInfo = null, tracklist = null) {
        const [result] = await pool.execute(
            "UPDATE SanPham SET TenSP=?, NgheSi=?, GiaBan=?, MoTa=?, HinhAnh=?, MaDM=?, TheLoai=?, TheLoaiNhac=?, DinhDang=?, TinhTrangDia=?, QuyCach=?, Tracklist=?, NamPhatHanh=?, TinhTrang=? WHERE MaSP=?",
            [title, artist, price, desc, image, maDM, genre, musicGenre, format, condition, packageInfo, tracklist, year, status, id]
        );
        if (result.affectedRows > 0 && stock !== null && stock !== undefined) {
            await pool.execute('UPDATE SanPham SET SoLuongTon = ? WHERE MaSP = ?', [stock, id]);
        }
        return result.affectedRows > 0;
    }

    // Điều chỉnh tồn kho theo chênh lệch (tránh ghi đè số đã bán trong lúc admin mở form sửa).
    static async adjustStock(id, delta) {
        await pool.execute('UPDATE SanPham SET SoLuongTon = GREATEST(SoLuongTon + ?, 0) WHERE MaSP = ?', [delta, id]);
        const [rows] = await pool.execute('SELECT SoLuongTon FROM SanPham WHERE MaSP = ?', [id]);
        return rows[0] ? Number(rows[0].SoLuongTon) : null;
    }

    // Xóa mềm: không DELETE vì ChiTietDonHang/ChiTietPhieuNhap/YeuCauTraHangChiTiet tham chiếu SanPham.
    // Chuyển sang "ngừng kinh doanh" để giữ nguyên lịch sử đơn hàng, nhập kho, trả hàng.
    static async delete(id) {
        const [result] = await pool.execute(
            "UPDATE SanPham SET TinhTrang = 'ngungkinhdoanh' WHERE MaSP = ?",
            [id]
        );
        return result.affectedRows > 0;
    }

    // Từ khóa cho tìm kiếm AI (cột TuKhoaAI, migration 09). Chưa chạy migration thì bỏ qua
    // thay vì làm hỏng việc xem/sửa sản phẩm.
    static async getAiKeywords(id) {
        try {
            const [rows] = await pool.execute("SELECT TuKhoaAI FROM SanPham WHERE MaSP = ?", [id]);
            return rows[0] ? rows[0].TuKhoaAI : null;
        } catch (error) {
            if (error.code === 'ER_BAD_FIELD_ERROR') return null;
            throw error;
        }
    }

    static async setAiKeywords(id, keywords) {
        try {
            const value = String(keywords || '').trim().slice(0, 1000) || null;
            await pool.execute("UPDATE SanPham SET TuKhoaAI = ? WHERE MaSP = ?", [value, id]);
        } catch (error) {
            if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
        }
    }

    static async getDanhMucByName(name) {
        const [rows] = await pool.execute("SELECT MaDM FROM DanhMuc WHERE TenDM = ?", [name]);
        return rows[0];
    }

    static async getCategories() {
        const [rows] = await pool.query("SELECT * FROM DanhMuc");
        return rows;
    }

    static async updateStock(id, quantity, connection = pool) {
        const [result] = await connection.execute(
            "UPDATE SanPham SET SoLuongTon = SoLuongTon + ? WHERE MaSP = ?",
            [quantity, id]
        );
        return result.affectedRows > 0;
    }

    static async decreaseStock(id, quantity, connection = pool) {
        const [result] = await connection.execute(
            "UPDATE SanPham SET SoLuongTon = SoLuongTon - ? WHERE MaSP = ? AND SoLuongTon >= ?",
            [quantity, id, quantity]
        );
        return result.affectedRows > 0;
    }
}

module.exports = SanPhamModel;
