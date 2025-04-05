const express = require("express");
const PermissionController = require("../controllers/PermissionController")
const router = express.Router();

router.get("/", PermissionController.getAllPermissions);
router.get("/display", PermissionController.getDisplayPermissions);
router.post("/", PermissionController.createPermission);
router.delete("/permissions/:permissionId", PermissionController.deletePermission);
router.post("/permissions/assign", PermissionController.assignPermissionToUser);
router.post("/permissions/remove", PermissionController.removePermissionFromUser);

module.exports = router;
