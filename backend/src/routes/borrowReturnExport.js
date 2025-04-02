// src/routes/borrowReturnExport.js
const express = require("express");
const router = express.Router();
const BorrowReturnExportController = require("../controllers/BorrowReturnExportHistoryController");

// Endpoint cho mượn/transfer: POST /api/borrow
router.post("/borrow", BorrowReturnExportController.borrowOrTransfer);

// Endpoint cho trả: POST /api/return
router.post("/return", BorrowReturnExportController.returnSample);

// Endpoint cho xuất kho: POST /api/export
router.post("/export", BorrowReturnExportController.exportSample);

module.exports = router;
