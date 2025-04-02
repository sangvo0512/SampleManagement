const express = require("express");
const UserController = require("../controllers/userController");

const router = express.Router();

// Route lấy danh sách user
router.get("/", UserController.getUserList);

// Route lấy thông tin user theo ID
router.get("/:userId", UserController.getUserById);

// Route thêm user
router.post("/", UserController.createUser);

// Route cập nhật user
router.put("/:userId", UserController.updateUser);

// Route xóa user
router.delete("/:userId", UserController.deleteUser);

module.exports = router;
