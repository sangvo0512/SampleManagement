const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');

// Tạo giao dịch (mượn, trả, xuất kho, chuyển giao)
// router.post('/', TransactionController.createTransaction);
router.post('/', async (req, res) => {
    const { ActionType } = req.body;
    console.log(`API /transaction called with ActionType: ${ActionType}`);
    if (ActionType === 'Return') {
        console.log('Chuyển hướng đến handleReturn');
        const result = await TransactionController.handleReturn(req.body);
        return res.status(result.success ? 200 : 400).json(result);
    }
    return await TransactionController.createTransaction(req, res);
});
// Lấy tất cả giao dịch
router.get('/', TransactionController.getAllTransactions);

// Lấy giao dịch theo ItemCode
router.get('/item/:itemCode', TransactionController.getTransactionsByItemCode);

// Lấy thông tin giao dịch mượn theo danh sách QRCodeID
router.post('/borrow', TransactionController.getBorrowTransactionsByQRCodes);


// Xóa giao dịch theo ID
router.delete('/:id', TransactionController.deleteTransaction);

//Lấy log
router.get('/logs', TransactionController.getProductLogs);
module.exports = router;
