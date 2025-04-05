const express = require("express");
const GroupController = require("../controllers/GroupController");
const { checkPermission } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", GroupController.getAllGroups);
router.post("/", GroupController.createGroup);
// router.get("/search", GroupController.searchGroups); 
router.put("/:groupId", GroupController.updateGroup);
router.delete("/:groupId", GroupController.deleteGroup);
router.post("/addUser", GroupController.addUserToGroup);
router.post("/removeUser", GroupController.removeUserFromGroup);
router.get("/:groupId/users", GroupController.getUsersInGroup);

module.exports = router;
