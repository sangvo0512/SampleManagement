const express = require("express");
const OperationCodeController = require("../controllers/OperationCodeController");
// const { authenticateToken } = require("../middleware/authenticateToken ");
// const { authorizeDepartment } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", OperationCodeController.getAllOperationCodes);
router.post("/", OperationCodeController.createOperationCode);
router.delete("/:id", OperationCodeController.deleteOperationCode);
router.put("/:id", OperationCodeController.updateOperationCode);
router.post("/assign", OperationCodeController.assignOperationCodeToDepartment);
router.get("/department/:departmentID", OperationCodeController.getOperationCodesByDepartment);

module.exports = router;
