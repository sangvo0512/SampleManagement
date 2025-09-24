// src/controllers/QRCodeController.js
const QRCode = require("qrcode");
const { sql, poolPromise } = require("../config/db");

class QRCodeController {
    static async scanQR(req, res) {
        try {
            const { qrCode } = req.body;
            if (!qrCode) {
                return res.status(400).json({ message: "QR code data is required." });
            }

            const fields = qrCode.split("|");
            if (fields.length < 2) {
                return res.status(400).json({ message: "Invalid QR code format." });
            }

            const uniqueKey = fields[0]; // UniqueKey từ QR
            const qrIndex = fields[1]; // QRIndex từ QR

            const pool = await poolPromise;
            const result = await pool.request()
                .input("uniqueKey", sql.NVarChar, uniqueKey)
                .query("SELECT * FROM Samples WHERE UniqueKey = @uniqueKey");

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            res.json({ ...result.recordset[0], qrIndex });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Hàm internal: Generate QR cho một payload (tách logic để reuse)
    // Hàm internal: Generate QR cho một payload (tách logic để reuse)
    static async generateQRForSample(payload) {
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
            uniqueKey,
        } = payload;

        const pool = await poolPromise;
        const tx = new sql.Transaction(pool);

        try {
            await tx.begin();

            const sampleResult = await tx
                .request()
                .input("uniqueKey", sql.NVarChar, uniqueKey)
                .query("SELECT BorrowdQuantity, NotifyProductionQuantity FROM Samples WHERE UniqueKey = @uniqueKey");

            if (sampleResult.recordset.length === 0) {
                throw new Error("Sample not found");
            }

            const { BorrowdQuantity, NotifyProductionQuantity } = sampleResult.recordset[0];

            const qrResult = await tx
                .request()
                .input("uniqueKey", sql.NVarChar, uniqueKey)
                .query("SELECT QRIndex, Status FROM QRCodeDetails WHERE UniqueKey = @uniqueKey");

            const existingQRs = qrResult.recordset;
            const usedIndexes = existingQRs.map((row) => row.QRIndex);
            const borrowedIndexes = existingQRs
                .filter((row) => row.Status === "Borrowed")
                .map((row) => row.QRIndex);

            if (notifyProductionQuantity < borrowedIndexes.length) {
                throw new Error(
                    `Cannot reduce notifyProductionQuantity to ${notifyProductionQuantity}. There are ${borrowedIndexes.length} borrowed QR codes.`
                );
            }

            const qrCodes = [];

            for (let i = 1; i <= notifyProductionQuantity; i++) {
                const qrCodeId = `${uniqueKey}|${i}`;
                const qrData = `${uniqueKey}|${i}`; // Định dạng QR: UniqueKey|QRIndex
                const displayText = `${itemCode}-${articleNO}|${i}`; // Hiển thị: ItemCode-ArticleNO|index

                if (usedIndexes.includes(i)) {
                    await tx
                        .request()
                        .input("QRCodeID", sql.NVarChar, qrCodeId)
                        .input("uniqueKey", sql.NVarChar, uniqueKey)
                        .input("QRIndex", sql.Int, i)
                        .query(`
                            UPDATE QRCodeDetails
                            SET QRCodeID = @QRCodeID
                            WHERE UniqueKey = @uniqueKey AND QRIndex = @QRIndex
                        `);
                } else {
                    await tx
                        .request()
                        .input("QRCodeID", sql.NVarChar, qrCodeId)
                        .input("uniqueKey", sql.NVarChar, uniqueKey)
                        .input("QRIndex", sql.Int, i)
                        .input("Status", sql.NVarChar, "Available")
                        .input("CreatedAt", sql.DateTime, new Date())
                        .query(`
                            INSERT INTO QRCodeDetails (QRCodeID, UniqueKey, QRIndex, Status, CreatedAt, Location)
                            VALUES (@QRCodeID, @uniqueKey, @QRIndex, @Status, @CreatedAt, NULL)
                        `);
                }

                const dataUrl = await QRCode.toDataURL(qrData);
                qrCodes.push({
                    qrCodeId,
                    dataUrl,
                    displayText,
                    status: existingQRs.find((row) => row.QRIndex === i)?.Status || "Available",
                });
            }

            await tx
                .request()
                .input("uniqueKey", sql.NVarChar, uniqueKey)
                .input("notifyProductionQuantity", sql.Int, notifyProductionQuantity)
                .query(`
                    DELETE FROM QRCodeDetails
                    WHERE UniqueKey = @uniqueKey AND QRIndex > @notifyProductionQuantity AND Status = 'Available'
                `);

            await tx.commit();

            return { qrCodes };
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    // Generate cho single
    static async generateQRCode(req, res) {
        try {
            const { qrCodes } = await QRCodeController.generateQRForSample(req.body); // Gọi đúng với tên class
            res.json({ qrCodes });
        } catch (err) {
            console.error("Error in generateQRCode:", err);
            res.status(500).json({ error: err.message });
        }
    }

    // Generate cho batch
    static async generateBatchQRCode(req, res) {
        const { samples } = req.body;
        if (!Array.isArray(samples) || samples.length === 0) {
            return res.status(400).json({ error: "Samples array is required and must not be empty." });
        }

        const batchResults = [];
        const errors = [];

        for (const sample of samples) {
            const payload = {
                brand: sample.Brand,
                BU: sample.BU,
                season: sample.Season,
                itemCode: sample.ItemCode,
                workingNO: sample.WorkingNO,
                articleNO: sample.ArticleNO,
                round: sample.Round,
                notifyProductionQuantity: sample.NotifyProductionQuantity,
                dateInform: sample.DateInform,
                uniqueKey: sample.UniqueKey,
            };

            try {
                const { qrCodes } = await QRCodeController.generateQRForSample(payload); // Gọi đúng với tên class
                batchResults.push({ sample, qrCodes });
            } catch (err) {
                errors.push({ sampleId: sample.SampleID, error: err.message });
            }
        }

        res.json({ batchResults, errors });
    }
}

module.exports = QRCodeController;