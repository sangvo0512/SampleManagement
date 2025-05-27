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
        const {
            brand,
            BU,
            season,
            itemCode,
            workingNO,
            articleNO,
            round,
            notifyProductionQuantity,
            dateInform,
            quantity,
            inventoryLocation
        } = req.body;

        const pool = await poolPromise;
        const tx = new sql.Transaction(pool);

        try {
            // 1) Bắt đầu transaction
            await tx.begin();

            // 2) Xóa hết các QRCodeDetails cũ nếu có
            await tx.request()
                .input('itemCode', sql.NVarChar, itemCode)
                .query(`DELETE FROM QRCodeDetails WHERE ItemCode = @itemCode`);

            const qrCodes = [];

            // 3) Chèn từng QRCodeDetail & sinh DataURL
            for (let i = 1; i <= quantity; i++) {
                const qrData = [
                    itemCode, brand, BU, season, workingNO, articleNO,
                    round, notifyProductionQuantity, dateInform,
                    quantity, inventoryLocation, i
                ].join('|');
                const qrCodeId = `${itemCode}-${i}`;

                try {
                    // 3a) Insert vào QRCodeDetails
                    await tx.request()
                        .input('QRCodeID', sql.NVarChar, qrCodeId)
                        .input('ItemCode', sql.NVarChar, itemCode)
                        .input('QRIndex', sql.Int, i)
                        .input('QRData', sql.NVarChar, qrData)
                        .query(`
                  INSERT INTO QRCodeDetails
                    (QRCodeID, ItemCode, QRIndex, QRData)
                  VALUES
                    (@QRCodeID, @ItemCode, @QRIndex, @QRData)
                `);
                } catch (dupErr) {
                    // nếu bị UNIQUE violation do bấm nhiều lần, thì chỉ bỏ qua
                    if (!dupErr.message.includes('Violation of UNIQUE KEY constraint')) {
                        throw dupErr;
                    }
                }

                // 3b) Sinh DataURL
                const dataUrl = await QRCode.toDataURL(qrData);
                qrCodes.push({ qrCodeId, dataUrl });
            }

            // 4) Commit transaction
            await tx.commit();

            // 5) Trả về client
            res.json({ qrCodes });
        } catch (err) {
            // rollback nếu có lỗi
            try { await tx.rollback(); } catch (_) { }
            console.error('Error in generateQRCode:', err);
            res.status(500).json({ error: err.message });
        }
    }

}
module.exports = QRCodeController;

