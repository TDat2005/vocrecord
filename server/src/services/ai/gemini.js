const { GoogleGenAI } = require('@google/genai');

// Kết nối Gemini dùng chung cho trợ lý chat và AI thẩm định đĩa cũ.
// Key đặt trong GEMINI_API_KEY (hoặc GOOGLE_API_KEY); không có key thì các tính năng AI tự tắt.

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const isConfigured = () => Boolean(apiKey());

let client = null;
function getClient() {
    // SDK mặc định tự thử lại 5 lần khi gặp 429/5xx, mỗi lần chờ tới 60 giây: khách phải đợi vài phút.
    // Chỉ thử lại một lần ngắn, còn lại để nơi gọi chuyển sang mô hình dự phòng.
    if (!client) client = new GoogleGenAI({ apiKey: apiKey(), httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } } });
    return client;
}

module.exports = { getClient, isConfigured };
