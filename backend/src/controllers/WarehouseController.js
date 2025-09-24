const WarehouseModel = require("../models/WarehouseModel");
const xlsx = require("xlsx");
const WarehouseController = {
    async getAll(req, res) {
        try {
            const data = await WarehouseModel.getAllWarehouses();
            res.json(data);
        } catch (err) {
            console.error("Error fetching warehouses:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async create(req, res) {
        try {
            const { warehouseName } = req.body;
            if (!warehouseName) return res.status(400).send("Warehouse name is required");
            const data = await WarehouseModel.createWarehouse(warehouseName);
            res.status(201).json(data);
        } catch (err) {
            console.error("Error creating warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async update(req, res) {
        try {
            const { warehouseName } = req.body;
            const { id } = req.params;
            if (!warehouseName) return res.status(400).send("Warehouse name is required");
            await WarehouseModel.updateWarehouse(id, warehouseName);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error updating warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            await WarehouseModel.deleteWarehouse(id);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error deleting warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    },
    // Mới: Lấy list mẫu theo Location
    async getQRByLocation(req, res) {
        try {
            const { location } = req.query;
            const data = await WarehouseModel.getQRByLocation(location);
            res.json(data);
        } catch (err) {
            console.error("Error fetching QR by location:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    // Mới: Thêm mẫu vào kho
    async addToWarehouse(req, res) {
        try {
            const { location, qrCodes } = req.body;
            if (!location || !qrCodes || qrCodes.length === 0) {
                return res.status(400).send("Location và danh sách QR là bắt buộc");
            }
            await WarehouseModel.addToWarehouse(location, qrCodes);
            res.status(200).json({ message: "Đã thêm thành công" });
        } catch (err) {
            console.error("Error adding to warehouse:", err);
            res.status(500).json({ error: err.message });
        }
    },
    //Chuyển đổi kho
    async transferWarehouse(req, res) {
        try {
            const { location, qrCodes } = req.body;
            if (!location || !qrCodes || qrCodes.length === 0) {
                return res.status(400).send("Location và danh sách QR là bắt buộc");
            }
            await WarehouseModel.transferWarehouse(location, qrCodes);
            res.status(200).json({ message: "Đã chuyển kho thành công" });
        } catch (err) {
            console.error("Error transferring warehouse:", err);
            res.status(500).json({ error: err.message });
        }
    },
    // Mới: Xuất Excel theo Location
    async exportWarehouse(req, res) {
        try {
            const location = req.query.location || '';
            const qrCodes = await WarehouseModel.getQRCodes(location);
            if (!qrCodes || qrCodes.length === 0) {
                return res.status(404).send("Không tìm thấy dữ liệu QR để xuất");
            }

            // Chuẩn bị worksheet
            const worksheet = xlsx.utils.json_to_sheet(qrCodes, {
                header: [
                    "QRCodeID",
                    "QRIndex",
                    "Status",
                    "CreatedAt",
                    "Location",
                    "UniqueKey",
                    "Brand",
                    "BU",
                    "Season",
                    "ItemCode",
                    "WorkingNO",
                    "ArticleNO",
                    "ColorwayName",
                    "Round",
                    "Quantity",
                ],
            });

            // Định dạng chiều rộng cột
            worksheet["!cols"] = [
                { wch: 30 }, // QRCodeID
                { wch: 10 }, // QRIndex
                { wch: 15 }, // Status
                { wch: 20 }, // CreatedAt
                { wch: 20 }, // Location
                { wch: 30 }, // UniqueKey
                { wch: 15 }, // Brand
                { wch: 15 }, // BU
                { wch: 15 }, // Season
                { wch: 20 }, // ItemCode
                { wch: 15 }, // WorkingNO
                { wch: 20 }, // ArticleNO
                { wch: 20 }, // ColorwayName
                { wch: 10 }, // Round
                { wch: 10 }, // Quantity
            ];

            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "QRCodeDetails");

            // Xuất file Excel với encoding UTF-8
            const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

            // Mã hóa filename để xử lý ký tự tiếng Trung
            let filename = location ? `warehouse_${encodeURIComponent(location)}` : 'all_qrcodes';
            try {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
                res.send(excelBuffer);
            } catch (err) {
                console.error("Error setting headers:", err);
                // Fallback filename nếu có lỗi
                res.setHeader('Content-Disposition', `attachment; filename="warehouse_export_${Date.now()}.xlsx"`);
                res.send(excelBuffer);
            }
        } catch (err) {
            console.error("Error exporting warehouse:", err);
            res.status(500).json({ error: "Lỗi khi xuất dữ liệu" });
        }
    },
    // Cập nhật getQRByLocation
    async getQRByLocation(req, res) {
        try {
            const { location, qrCodeId } = req.query;
            const data = await WarehouseModel.getQRByLocation(location, qrCodeId);
            res.json(data);
        } catch (err) {
            console.error("Error fetching QR by location:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    // Mới: Update Location cho một item
    async updateLocation(req, res) {
        try {
            const { qrCodeId, newLocation } = req.body;
            if (!qrCodeId || !newLocation) {
                return res.status(400).send("QRCodeID và Location mới là bắt buộc");
            }
            await WarehouseModel.updateLocation(qrCodeId, newLocation);
            res.status(200).json({ message: "Cập nhật kho thành công" });
        } catch (err) {
            console.error("Error updating location:", err);
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = WarehouseController;
