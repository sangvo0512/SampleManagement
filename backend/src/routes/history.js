// src/routes/history.js
const express = require("express");
const HistoryController = require("../controllers/HistoryController");
const router = express.Router();

// Endpoint lấy lịch sử mượn/transfer/return
router.get("/borrow-return", HistoryController.getBorrowReturnHistory);

// Endpoint lấy lịch sử xuất kho
router.get("/export", HistoryController.getExportHistory);

module.exports = router;
