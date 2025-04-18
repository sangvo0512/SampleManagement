const express = require("express");
const multer = require("multer");
const SampleController = require("../controllers/SampleController");
const router = express.Router();

// Cấu hình multer để upload file Excel
const upload = multer({ dest: "uploads/" });

// Lấy danh sách sản phẩm mẫu
router.get("/", SampleController.getAllSamples);

// Tạo mới sản phẩm mẫu
router.post("/", SampleController.createSample);

// Sửa sản phẩm mẫu theo ID (ví dụ: PUT /api/samples/123)
router.put("/:id", SampleController.updateSample);

// Xóa sản phẩm mẫu theo ID (ví dụ: DELETE /api/samples/123)
router.delete("/:id", SampleController.deleteSample);

// Import sản phẩm mẫu từ file Excel
router.post("/import", upload.single("file"), SampleController.importSamples);

module.exports = router;
