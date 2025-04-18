const express = require("express");
const QRCodeController = require("../controllers/QRCodeController");
const router = express.Router();

// Tạo mã QR động
router.post("/generate", QRCodeController.generateQRCode);
//Xử lí mã QR code
router.post("/scan", QRCodeController.scanQR);

module.exports = router;
