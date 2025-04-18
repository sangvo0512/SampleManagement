const SampleModel = require("../models/SampleModel");
const xlsx = require("xlsx");
const { poolPromise } = require("../config/db.js")

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
            const sampleId = await SampleModel.createSample(req.body);
            res.status(201).json({ message: "Sample created successfully", sampleId });
        } catch (err) {
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    }

    static async updateSample(req, res) {
        try {
            const { id } = req.params;
            const rowsAffected = await SampleModel.updateSample(id, req.body);
            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }
            res.json({ message: "Sample updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteSample(req, res) {
        try {
            const { id } = req.params;
            const rowsAffected = await SampleModel.deleteSample(id);
            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }
            res.json({ message: "Sample deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async importSamples(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            // 1. Đọc file Excel
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            // 2. Lấy danh sách kho từ DB để map tên → ID
            const pool = await poolPromise;
            const warehouseResult = await pool.request()
                .query("SELECT WarehouseID, WarehouseName FROM Warehouses");

            const warehouseMap = {};
            warehouseResult.recordset.forEach(wh => {
                warehouseMap[wh.WarehouseName?.trim()] = wh.WarehouseID;
            });

            const success = [];
            const errors = [];

            // 3. Duyệt từng dòng Excel
            for (const row of rawData) {
                try {
                    const warehouseName = row["庫存位置"]?.trim();
                    const warehouseID = warehouseMap[warehouseName];

                    if (!warehouseID && warehouseName !== undefined && warehouseName.trim() !== "") {
                        errors.push({ row, error: `Không tìm thấy kho với tên: ${warehouseName}` });
                        continue;
                    }

                    const sampleData = {
                        serialNumber: row["序號"]?.toString(),
                        brand: row["品牌"],
                        BU: row["BU"],
                        season: row["季节"],
                        itemCode: row["款号"],
                        workingNO: row["working NO."],
                        articleNO: row["Article NO."],
                        round: row["輪次"],
                        notifyProductionQuantity: parseInt(row["通知生產數量"]),
                        quantity: parseInt(row["庫存數量"]),
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

                        inventoryLocation: warehouseName,
                        warehouseID,
                        state: 'Available',
                        borrowdQuantity: 0
                    };

                    if (!sampleData.serialNumber || !sampleData.brand || !sampleData.articleNO) {
                        errors.push({ row, error: "Thiếu trường bắt buộc (SerialNumber / Brand / ArticleNO)" });
                        continue;
                    }

                    const insertedId = await SampleModel.createSample(sampleData);
                    success.push({ ...sampleData, insertedId });

                } catch (err) {
                    errors.push({ row, error: err.message });
                }
            }

            res.json({
                message: `Đã import xong. Thành công: ${success.length}, Lỗi: ${errors.length}`,
                success,
                errors
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }



}

module.exports = SampleController;
