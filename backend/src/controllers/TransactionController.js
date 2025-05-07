const TransactionModel = require('../models/TransactionModel');
const SampleModel = require('../models/SampleModel');

class TransactionController {
    // Tạo giao dịch mới
    static async createTransaction(req, res) {
        try {
            const data = req.body;

            // Ghi log giao dịch
            const transactionId = await TransactionModel.createTransaction(data);

            // Nếu là hành động "Mượn", cập nhật bảng Samples
            if (data.ActionType === "Mượn") {
                const item = await SampleModel.getSampleByItemCode(data.ItemCode);

                if (!item) {
                    return res.status(404).json({ message: "Sản phẩm không tồn tại." });
                }

                // Kiểm tra đủ số lượng
                if (item.Quantity < data.Quantity) {
                    return res.status(400).json({ message: "Không đủ số lượng sản phẩm." });
                }

                const newQuantity = item.Quantity - data.Quantity;
                const newBorrowed = (item.BorrowdQuantity || 0) + data.Quantity;
                const newState = newQuantity === 0 ? "Unavailable" : item.State;

                await SampleModel.updateSampleByItemCode(data.ItemCode, {
                    Quantity: newQuantity,
                    BorrowdQuantity: newBorrowed,
                    State: newState
                });
            }

            return res.status(201).json({ message: "Tạo giao dịch thành công.", transactionId });
        } catch (error) {
            console.error("Error creating transaction:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    // Lấy tất cả giao dịch
    static async getAllTransactions(req, res) {
        try {
            const transactions = await TransactionModel.getAllTransactions();
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    // Lấy giao dịch theo ItemCode
    static async getTransactionsByItemCode(req, res) {
        try {
            const { itemCode } = req.params;
            const transactions = await TransactionModel.getTransactionsByItemCode(itemCode);
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Error fetching transactions by ItemCode:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    // Xóa giao dịch
    static async deleteTransaction(req, res) {
        try {
            const { id } = req.params;
            const deleted = await TransactionModel.deleteTransaction(id);
            if (deleted) {
                return res.status(200).json({ message: "Xóa giao dịch thành công." });
            } else {
                return res.status(404).json({ message: "Không tìm thấy giao dịch." });
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }
    static async returnTransaction(req, res) {
        try {
            const data = req.body;

            const item = await SampleModel.getSampleByItemCode(data.ItemCode);
            if (!item) {
                return res.status(404).json({ message: "Sản phẩm không tồn tại." });
            }

            // Kiểm tra nếu trả nhiều hơn số đã mượn
            if (item.BorrowdQuantity < data.Quantity) {
                return res.status(400).json({ message: "Số lượng trả vượt quá số lượng đã mượn." });
            }

            const newQuantity = item.Quantity + data.Quantity;
            const newBorrowed = item.BorrowdQuantity - data.Quantity;
            const newState = newQuantity > 0 ? "Available" : item.State;

            // Cập nhật bảng Samples
            await SampleModel.updateSampleByItemCode(data.ItemCode, {
                Quantity: newQuantity,
                BorrowdQuantity: newBorrowed,
                State: newState
            });

            // Ghi log giao dịch "Trả"
            const transactionId = await TransactionModel.createTransaction({
                ...data,
                ActionType: "Trả"
            });

            return res.status(200).json({ message: "Trả sản phẩm thành công.", transactionId });
        } catch (error) {
            console.error("Error returning sample:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    static async exportTransaction(req, res) {
        try {
            const data = req.body;

            const item = await SampleModel.getSampleByItemCode(data.ItemCode);
            if (!item) {
                return res.status(404).json({ message: "Sản phẩm không tồn tại." });
            }

            if (item.Quantity < data.Quantity) {
                return res.status(400).json({ message: "Không đủ số lượng để xuất kho." });
            }

            const newQuantity = item.Quantity - data.Quantity;
            const newState = newQuantity === 0 ? "Unavailable" : item.State;

            // Cập nhật bảng Samples
            await SampleModel.updateSampleByItemCode(data.ItemCode, {
                Quantity: newQuantity,
                State: newState
            });

            // Ghi log giao dịch "Xuất kho"
            const transactionId = await TransactionModel.createTransaction({
                ...data,
                ActionType: "Xuất kho"
            });

            return res.status(200).json({ message: "Xuất kho thành công.", transactionId });
        } catch (error) {
            console.error("Error exporting sample:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    static async transferTransaction(req, res) {
        try {
            const data = req.body;

            const item = await SampleModel.getSampleByItemCode(data.ItemCode);
            if (!item) {
                return res.status(404).json({ message: "Sản phẩm không tồn tại." });
            }

            // Không thay đổi số lượng, chỉ ghi nhận log chuyển giao
            const transactionId = await TransactionModel.createTransaction({
                ...data,
                ActionType: "Chuyển giao"
            });

            return res.status(200).json({ message: "Chuyển giao thành công.", transactionId });
        } catch (error) {
            console.error("Error transferring sample:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

}

module.exports = TransactionController;
