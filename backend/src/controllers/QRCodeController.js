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

            const fields = qrCode.split("|");
            if (fields.length < 5) {
                return res.status(400).json({ message: "Invalid QR code format." });
            }

            const itemCode = fields[0]; // Lấy ItemCode từ QR

            const pool = await poolPromise;
            const result = await pool.request()
                .input("itemCode", sql.NVarChar, itemCode)
                .query("SELECT * FROM Samples WHERE ItemCode = @itemCode");

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            res.json(result.recordset[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static generateQRCode = async (req, res) => {
        try {
            const {
                brand, BU, season, itemCode, workingNO, articleNO,
                round, notifyProductionQuantity, dateInform, quantity, inventoryLocation
            } = req.body;

            let qrCodes = [];
            for (let i = 1; i <= quantity; i++) {
                const qrData = `${itemCode}|${brand}|${BU}|${season}|${workingNO}|${articleNO}|${round}|${notifyProductionQuantity}|${dateInform}|${quantity}|${inventoryLocation}|${i}`;
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

