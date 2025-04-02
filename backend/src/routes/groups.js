const express = require("express");
const GroupController = require("../controllers/GroupController");
const { checkPermission } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/groups", GroupController.getAllGroups);
router.post("/groups", checkPermission("manage_groups"), GroupController.createGroup);
router.delete("/groups/:groupId", checkPermission("manage_groups"), GroupController.deleteGroup);
router.post("/user-groups", checkPermission("manage_groups"), GroupController.addUserToGroup);
router.delete("/user-groups", checkPermission("manage_groups"), GroupController.removeUserFromGroup);
router.get("/groups/:groupId", checkPermission("manage_groups"), GroupController.getUsersInGroup);

module.exports = router;