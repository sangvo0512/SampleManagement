const BorrowerModel = require('../models/BorrowerModel');

class BorrowerController {
    // Lấy danh sách tất cả người mượn
    static async getAllBorrowers(req, res) {
        try {
            const borrowers = await BorrowerModel.getAllBorrowers();
            return res.status(200).json({ success: true, data: borrowers });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người mượn:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách người mượn.', error: error.message });
        }
    }

    // Lấy người mượn theo CardID
    static async getBorrowerByCardID(req, res) {
        try {
            const { cardID } = req.params;
            if (!cardID) {
                return res.status(400).json({ success: false, message: 'CardID không được cung cấp.' });
            }
            const borrower = await BorrowerModel.getBorrowerByCardID(cardID);
            if (!borrower) {
                return res.status(404).json({ success: false, message: `Không tìm thấy người mượn với CardID: ${cardID}.` });
            }
            return res.status(200).json({ success: true, data: borrower });
        } catch (error) {
            console.error('Lỗi khi lấy người mượn:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy người mượn.', error: error.message });
        }
    }

    // Thêm người mượn mới
    static async createBorrower(req, res) {
        try {
            const { Name, CardID, Dept } = req.body;
            if (!Name || !CardID || !Dept) {
                return res.status(400).json({ success: false, message: 'Thiếu thông tin Name, CardID hoặc Dept.' });
            }
            await BorrowerModel.createBorrower({ Name, CardID, Dept });
            return res.status(201).json({ success: true, message: 'Thêm người mượn thành công.' });
        } catch (error) {
            console.error('Lỗi khi thêm người mượn:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm người mượn.', error: error.message });
        }
    }

    // Cập nhật người mượn
    static async updateBorrower(req, res) {
        try {
            const { Name, CardID, Dept } = req.body;
            if (!Name || !CardID || !Dept) {
                return res.status(400).json({ success: false, message: 'Thiếu thông tin Name, CardID hoặc Dept.' });
            }
            const affectedRows = await BorrowerModel.updateBorrower({ Name, CardID, Dept });
            if (affectedRows === 0) {
                return res.status(404).json({ success: false, message: `Không tìm thấy người mượn với CardID: ${CardID}.` });
            }
            return res.status(200).json({ success: true, message: 'Cập nhật người mượn thành công.' });
        } catch (error) {
            console.error('Lỗi khi cập nhật người mượn:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật người mượn.', error: error.message });
        }
    }

    // Xóa người mượn
    static async deleteBorrower(req, res) {
        try {
            const { cardID } = req.params;
            if (!cardID) {
                return res.status(400).json({ success: false, message: 'CardID không được cung cấp.' });
            }
            const affectedRows = await BorrowerModel.deleteBorrower(cardID);
            if (affectedRows === 0) {
                return res.status(404).json({ success: false, message: `Không tìm thấy người mượn với CardID: ${cardID}.` });
            }
            return res.status(200).json({ success: true, message: 'Xóa người mượn thành công.' });
        } catch (error) {
            console.error('Lỗi khi xóa người mượn:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa người mượn.', error: error.message });
        }
    }
}

module.exports = BorrowerController;