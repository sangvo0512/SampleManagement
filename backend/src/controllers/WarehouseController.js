const WarehouseModel = require("../models/WarehouseModel");

const WarehouseController = {
    async getAll(req, res) {
        try {
            const data = await WarehouseModel.getAllWarehouses();
            res.json(data);
        } catch (err) {
            console.error("Error fetching warehouses:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async create(req, res) {
        try {
            const { warehouseName } = req.body;
            if (!warehouseName) return res.status(400).send("Warehouse name is required");
            const data = await WarehouseModel.createWarehouse(warehouseName);
            res.status(201).json(data);
        } catch (err) {
            console.error("Error creating warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async update(req, res) {
        try {
            const { warehouseName } = req.body;
            const { id } = req.params;
            if (!warehouseName) return res.status(400).send("Warehouse name is required");
            await WarehouseModel.updateWarehouse(id, warehouseName);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error updating warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            await WarehouseModel.deleteWarehouse(id);
            res.sendStatus(204);
        } catch (err) {
            console.error("Error deleting warehouse:", err);
            res.status(500).send("Internal Server Error");
        }
    }
};

module.exports = WarehouseController;
