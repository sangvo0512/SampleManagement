const express = require("express");
const WarehouseController = require("../controllers/WarehouseController");
const { checkPermission } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", WarehouseController.getAll);
router.post("/", WarehouseController.create);
router.put("/:id", WarehouseController.update);
router.delete("/:id", WarehouseController.delete);

module.exports = router;
