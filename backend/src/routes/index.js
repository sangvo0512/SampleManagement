const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const samplesRoutes = require("./samples");
const qrCodeRoutes = require("./qrCode");
const usersRoutes = require("./users");
const groupsRoutes = require("./groups");
const permissionsRoutes = require("./permission");
const historyRoutes = require("./history");
const borrowReturnExportRoutes = require("./borrowReturnExport");
const departmentRoutes = require("./departments");
const operationCodesRoutes = require("./operationCode");
const warehouseRoutes = require("./warehouse");
// Gắn các route con vào route chính

router.use("/auth", authRoutes);
router.use("/samples", samplesRoutes);
router.use("/qr", qrCodeRoutes);
router.use("/users", usersRoutes);
router.use("/history", historyRoutes);
router.use("/groups", groupsRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/departments", departmentRoutes);
router.use("/operationCode", operationCodesRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/", borrowReturnExportRoutes);


module.exports = router;
