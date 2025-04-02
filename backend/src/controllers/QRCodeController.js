const QRCode = require("qrcode");
const { sql, poolPromise } = require("../config/db");
class QRCodeController {
    // API xử lý dữ liệu khi quét mã QR
    static async scanQR(req, res) {
        try {
            const { qrCode } = req.body;
            if (!qrCode) {
                return res.status(400).json({ message: "QR code data is required." });
            }

            // Giả sử dữ liệu QR được mã hóa theo định dạng:
            const fields = qrCode.split("|");
            if (fields.length < 12) {
                return res.status(400).json({ message: "Invalid QR code format." });
            }

            // Lấy giá trị định danh, ví dụ SerialNumber (có thể kết hợp thêm các trường khác nếu cần)31
            const serialNumber = fields[0];

            // Truy vấn thông tin sản phẩm mẫu theo SerialNumber
            const pool = await poolPromise;
            const result = await pool.request()
                .input("serialNumber", sql.NVarChar, serialNumber)
                .query("SELECT * FROM Samples WHERE SerialNumber = @serialNumber");

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            // Trả về thông tin sản phẩm mẫu
            res.json(result.recordset[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static generateQRCode = async (req, res) => {
        try {
            const { serialNumber, brand, BU, season, itemCode, workingNO, articleNO,
                round, notifyProductionQuantity, dateInform, quantity, inventoryLocation } = req.body;

            let qrCodes = [];
            for (let i = 1; i <= quantity; i++) {
                const qrData = `${serialNumber}|${brand}|${BU}|${season}|${itemCode}|${workingNO}|${articleNO}|${round}|${notifyProductionQuantity}|${dateInform}|${quantity}|${inventoryLocation}|${i}`;
                const qrCode = await QRCode.toDataURL(qrData);
                qrCodes.push(qrCode);
            }

            res.json({ qrCodes });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
module.exports = QRCodeController;

