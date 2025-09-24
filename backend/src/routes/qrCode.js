const express = require("express");
const QRCodeController = require("../controllers/QRCodeController");
const router = express.Router();

// Tạo mã QR động cho một sample
router.post("/generate", QRCodeController.generateQRCode);

// Tạo mã QR động cho batch samples
router.post("/generate-batch", QRCodeController.generateBatchQRCode);

// Xử lí mã QR code
router.post("/scan", QRCodeController.scanQR);

module.exports = router;
