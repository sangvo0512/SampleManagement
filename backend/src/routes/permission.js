const express = require("express");
const PermissionController = require("../controllers/PermissionController")
const router = express.Router();

router.get("/", PermissionController.getAllPermissions);
router.post("/", PermissionController.createPermission);
router.delete("/:permissionId", PermissionController.deletePermission);
router.post("/assignUser", PermissionController.assignPermissionToUser);
router.post("/removeUser", PermissionController.removePermissionFromUser);

module.exports = router;
