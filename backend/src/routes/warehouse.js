const express = require("express");
const WarehouseController = require("../controllers/WarehouseController");
const { checkPermission } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", WarehouseController.getAll);
router.post("/", WarehouseController.create);
router.put("/:id", WarehouseController.update);
router.delete("/:id", WarehouseController.delete);
router.get("/qrcodes", WarehouseController.getQRByLocation);
router.post("/add-to-warehouse", WarehouseController.addToWarehouse);
router.post("/transfer-warehouse", WarehouseController.transferWarehouse);
router.get("/export-warehouse", WarehouseController.exportWarehouse);
router.post("/update-location", WarehouseController.updateLocation);
module.exports = router;
