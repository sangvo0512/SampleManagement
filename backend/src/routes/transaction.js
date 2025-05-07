const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');

// Tạo giao dịch "Mượn"
router.post('/borrow', TransactionController.createTransaction);

// Trả sản phẩm
router.post('/return', TransactionController.returnTransaction);

// Xuất kho
router.post('/export', TransactionController.exportTransaction);

// Chuyển giao
router.post('/transfer', TransactionController.transferTransaction);

// Lấy tất cả giao dịch
router.get('/', TransactionController.getAllTransactions);

// Lấy giao dịch theo ItemCode
router.get('/:itemCode', TransactionController.getTransactionsByItemCode);

// Xóa giao dịch
router.delete('/:id', TransactionController.deleteTransaction);

module.exports = router;
