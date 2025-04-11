const express = require("express");
const PermissionController = require("../controllers/PermissionController");

const router = express.Router();

router.get("/", PermissionController.getAllPermissions);
router.get("/user/:userId", PermissionController.getUserPermissions);
router.get("/group/:groupId", PermissionController.getGroupPermissions);
router.post("/user", PermissionController.setUserPermissions);
router.post("/group", PermissionController.setGroupPermissions);
router.post("/remove/user", PermissionController.removeUserPermission);
router.post("/remove/group", PermissionController.removeGroupPermission);
router.get('/effective/:userId', PermissionController.getEffectivePermissions);

module.exports = router;
