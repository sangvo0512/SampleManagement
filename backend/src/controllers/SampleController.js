// src/controllers/SampleController.js
const SampleModel = require("../models/SampleModel");
const QRCodeController = require("../controllers/QRCodeController.js");
const xlsx = require("xlsx");
const { sql, poolPromise } = require("../config/db.js");

class SampleController {
    static async getAllSamples(req, res) {
        try {
            const samples = await SampleModel.getAllSamples();
            res.json(samples);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createSample(req, res) {
        try {
            const sampleData = {
                ...req.body,
                quantity: 0, // Quantity mặc định là 0
                borrowdQuantity: 0,
                exported: 0,
                rejected: 0,
                createDate: new Date(),
                modifyTime: new Date(),
            };

            if (!sampleData.colorwayName) {
                return res.status(400).json({ error: "ColorwayName is required" });
            }

            sampleData.state = "Unavailable"; // State mặc định là Unavailable
            const { sampleId, uniqueKey } = await SampleModel.createSample(sampleData);

            console.log("Creating QR for new sample:", sampleData);
            await QRCodeController.generateQRCode(
                {
                    body: {
                        brand: sampleData.brand,
                        BU: sampleData.BU,
                        season: sampleData.season,
                        itemCode: sampleData.itemCode,
                        workingNO: sampleData.workingNO,
                        articleNO: sampleData.articleNO,
                        colorwayName: sampleData.colorwayName,
                        round: sampleData.round,
                        notifyProductionQuantity: sampleData.notifyProductionQuantity,
                        dateInform: sampleData.dateInform,
                        uniqueKey,
                    },
                },
                { json: () => { } }
            );

            res.status(201).json({ message: "Sample created successfully", sampleId, uniqueKey });
        } catch (err) {
            console.error("Error in createSample:", err);
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    }

    static async updateSample(req, res) {
        try {
            const { id } = req.params;
            const sampleData = { ...req.body, modifyTime: new Date() };

            if (!sampleData.colorwayName) {
                return res.status(400).json({ error: "ColorwayName is required." });
            }
            const pool = await poolPromise;
            const sampleResult = await pool
                .request()
                .input("sampleId", sql.Int, id)
                .query("SELECT Quantity, BorrowdQuantity, UniqueKey FROM Samples WHERE SampleID = @sampleId");

            if (sampleResult.recordset.length === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            const { Quantity: currentQuantity, BorrowdQuantity, UniqueKey } = sampleResult.recordset[0];
            if (sampleData.quantity > sampleData.notifyProductionQuantity) {
                return res.status(400).json({ error: "Quantity can't > NotifyProductionQuantity" });
            }
            if (sampleData.quantity < BorrowdQuantity) {
                return res.status(403).json({
                    message: `Cannot reduce quantity to ${sampleData.quantity}. There are ${BorrowdQuantity} borrowed items.`,
                });
            }

            sampleData.state = Number(sampleData.quantity) === 0 ? "Unavailable" : "Available";

            const rowsAffected = await SampleModel.updateSample(id, sampleData);
            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            console.log("Updating QR for sample:", sampleData);
            await QRCodeController.generateQRCode(
                {
                    body: {
                        brand: sampleData.brand,
                        BU: sampleData.BU,
                        season: sampleData.season,
                        itemCode: sampleData.itemCode,
                        workingNO: sampleData.workingNO,
                        articleNO: sampleData.articleNO,
                        colorwayName: sampleData.colorwayName,
                        round: sampleData.round,
                        notifyProductionQuantity: sampleData.notifyProductionQuantity,
                        dateInform: sampleData.dateInform,
                        uniqueKey: UniqueKey,
                    },
                },
                { json: () => { } }
            );

            res.json({ message: "Sample updated successfully" });
        } catch (err) {
            console.error("Error in updateSample:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteSample(req, res) {
        try {
            const { id } = req.params;
            const rowsAffected = await SampleModel.deleteSample(id);
            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Can't find item to delete" });
            }
            res.json({ message: "Deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: `Fail to deleted : ${err.message}` });
        }
    }

    static async importSamples(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const success = [];
            const errors = [];

            for (const row of rawData) {
                try {
                    const sampleData = {
                        brand: row["品牌"],
                        BU: row["BU"],
                        season: row["季節"],
                        itemCode: row["款號"],
                        workingNO: row["working NO."],
                        articleNO: row["Article NO."],
                        colorwayName: row["ColorwayName"],
                        round: row["輪次"],
                        notifyProductionQuantity: parseInt(row["通知生產數量"]),
                        quantity: 0, // Quantity mặc định là 0
                        dateInform: (() => {
                            const d = row["通知日期"];
                            if (typeof d === "number") {
                                const parsed = xlsx.SSF.parse_date_code(d);
                                return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
                            }
                            if (typeof d === "string") {
                                const [month, day, year] = d.split("/").map(Number);
                                return new Date(Date.UTC(year, month - 1, day));
                            }
                            return new Date();
                        })(),
                        state: 'Unavailable',
                        borrowdQuantity: 0,
                        exported: 0,
                        rejected: 0,
                        createDate: new Date(),
                        modifyTime: new Date(),
                    };

                    if (!sampleData.brand || !sampleData.articleNO || !sampleData.itemCode || !sampleData.season || !sampleData.round) {
                        errors.push({ row, error: "Missing required field (Brand / ArticleNO / ItemCode / Season / Round)" });
                        continue;
                    }

                    const { sampleId, uniqueKey } = await SampleModel.createSample(sampleData);
                    success.push({ ...sampleData, sampleId, uniqueKey });
                } catch (err) {
                    errors.push({ row, error: err.message });
                }
            }

            res.json({
                message: `Imported. Successful: ${success.length}, Error: ${errors.length}`,
                success,
                errors,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async exportAvailableAndBorrowed(req, res) {
        try {
            const samples = await SampleModel.getAllSamples();
            const availableSamples = samples.filter(sample => sample.State === 'Available');
            const borrowedTransactions = await SampleModel.getRecentBorrowedTransactions();
            console.log("Data of borrowed : ", borrowedTransactions);

            const availableData = availableSamples.map(sample => ({
                "品牌": sample.Brand,
                "BU": sample.BU,
                "季节": sample.Season,
                "款号": sample.ItemCode,
                "working NO.": sample.WorkingNO,
                "Article NO.": sample.ArticleNO,
                "ColorwayName": sample.ColorwayName,
                "輪次": sample.Round,
                "通知生產數量": sample.NotifyProductionQuantity,
                "通知日期": sample.DateInform
                    ? new Date(sample.DateInform).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    })
                    : '',
                "庫存數量": sample.Quantity,
                "State": sample.State,
                "Borrowed quantity": sample.BorrowdQuantity,
                "Created date": sample.CreateDate
                    ? new Date(sample.CreateDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : '',
                "Modified time": sample.ModifyTime
                    ? new Date(sample.ModifyTime).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : '',
                "Key": sample.UniqueKey,
            }));

            const borrowedData = borrowedTransactions.map(tx => ({
                "Transaction type": tx.ActionType,
                "Brand": tx.Brand,
                "BU": tx.BU,
                "Season": tx.Season,
                "Colorwayname": tx.ColorwayName,
                "Quantity": tx.SampleQuantity,
                "Borrowed quantity": tx.BorrowdQuantity,
                "QR": tx.QRCodeID,
                "Date": new Date(tx.TransactionDate).toLocaleString('en-US'),
                "From user": tx.UserName,
                "To user": tx.ToUserName,
                "To department": tx.ToDepartmentName,
                "Location": tx.Location,
                "Created date": tx.CreateDate
                    ? new Date(tx.CreateDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : '',
                "Modified time": tx.ModifyTime
                    ? new Date(tx.ModifyTime).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : '',
                "Key": tx.UniqueKey,
            }));

            const workbook = xlsx.utils.book_new();

            const availableWorksheet = xlsx.utils.json_to_sheet(availableData);
            xlsx.utils.book_append_sheet(workbook, availableWorksheet, "Available Samples");
            const availableHeaders = [
                "品牌", "BU", "季节", "款号", "working NO.", "Article NO.", "ColorwayName", "輪次",
                "通知生產數量", "通知日期", "庫存數量", "State", "Borrowed quantity",
                "Created date", "Modified time", "Key",
            ];
            xlsx.utils.sheet_add_aoa(availableWorksheet, [availableHeaders], { origin: 'A1' });

            const borrowedWorksheet = xlsx.utils.json_to_sheet(borrowedData);
            xlsx.utils.book_append_sheet(workbook, borrowedWorksheet, "Borrowed Transactions");
            const borrowedHeaders = [
                "Transaction type", "Brand", "BU", "Season", "Colorwayname",
                "Quantity", "Borrowed quantity", "QR",
                "Date", "From user", "To user",
                "To department", "Location", "Created date", "Modified time", "Key",
            ];
            xlsx.utils.sheet_add_aoa(borrowedWorksheet, [borrowedHeaders], { origin: 'A1' });

            const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', 'attachment; filename=available_and_borrowed_samples.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (err) {
            res.status(500).json({ error: `Failed to export file Excel: ${err.message}` });
        }
    }
}

module.exports = SampleController;