const PermissionModel = require("../models/PermissionModel");

const PermissionController = {
    async getAllPermissions(req, res) {
        try {
            const data = await PermissionModel.getAllPermissions();
            res.json(data);
        } catch (err) {
            console.error("Error fetching permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async getUserPermissions(req, res) {
        try {
            const { userId } = req.params;
            const data = await PermissionModel.getUserPermissions(userId);
            res.json(data);
        } catch (err) {
            console.error("Error fetching user permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async getGroupPermissions(req, res) {
        try {
            const { groupId } = req.params;
            const data = await PermissionModel.getGroupPermissions(groupId);
            res.json(data);
        } catch (err) {
            console.error("Error fetching group permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async setUserPermissions(req, res) {
        try {
            const { userId, permissionIds } = req.body;
            if (!userId || !Array.isArray(permissionIds)) {
                return res.status(400).send("Invalid data");
            }

            await PermissionModel.setUserPermissions(userId, permissionIds);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error setting user permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async setGroupPermissions(req, res) {
        try {
            const { groupId, permissionIds } = req.body;
            if (!groupId || !Array.isArray(permissionIds)) {
                return res.status(400).send("Invalid data");
            }

            await PermissionModel.setGroupPermissions(groupId, permissionIds);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error setting group permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    },
    async removeUserPermission(req, res) {
        try {
            const { userId, permissionId } = req.body;
            if (!userId || !permissionId) {
                return res.status(400).send("Missing userId or permissionId");
            }

            await PermissionModel.removeUserPermission(userId, permissionId);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error removing user permission:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async removeGroupPermission(req, res) {
        try {
            const { groupId, permissionId } = req.body;
            if (!groupId || !permissionId) {
                return res.status(400).send("Missing groupId or permissionId");
            }

            await PermissionModel.removeGroupPermission(groupId, permissionId);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error removing group permission:", err);
            res.status(500).send("Internal Server Error");
        }
    },
    async removeUserPermission(req, res) {
        try {
            const { userId, permissionId } = req.body;
            if (!userId || !permissionId) {
                return res.status(400).send("Missing userId or permissionId");
            }

            await PermissionModel.removeUserPermission(userId, permissionId);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error removing user permission:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async removeGroupPermission(req, res) {
        try {
            const { groupId, permissionId } = req.body;
            if (!groupId || !permissionId) {
                return res.status(400).send("Missing groupId or permissionId");
            }

            await PermissionModel.removeGroupPermission(groupId, permissionId);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error removing group permission:", err);
            res.status(500).send("Internal Server Error");
        }
    },
    async getEffectivePermissions(req, res) {
        try {
            const { userId } = req.params;
            const data = await PermissionModel.getEffectivePermissions(userId);
            res.json(data);
        } catch (err) {
            console.error("Error fetching effective permissions:", err);
            res.status(500).send("Internal Server Error");
        }
    }




};

module.exports = PermissionController;
