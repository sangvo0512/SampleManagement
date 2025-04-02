const OperationCodeModel = require("../models/OperationCodeModel");

class OperationCodeController {
    static async getAllOperationCodes(req, res) {
        try {
            const operationCodes = await OperationCodeModel.getAllOperationCodes();
            res.json(operationCodes);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createOperationCode(req, res) {
        try {
            const { reasonDetail } = req.body;
            if (!reasonDetail) {
                return res.status(400).json({ error: "ReasonDetail is required" });
            }
            const newOperationCode = await OperationCodeModel.createOperationCode(reasonDetail);
            res.status(201).json(newOperationCode);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteOperationCode(req, res) {
        try {
            const { id } = req.params;
            await OperationCodeModel.deleteOperationCode(id);
            res.status(200).json({ message: "Operation Code deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateOperationCode(req, res) {
        try {
            const { id } = req.params;
            const { reasonDetail } = req.body;
            await OperationCodeModel.updateOperationCode(id, reasonDetail);
            res.status(200).json({ message: "Operation Code updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async assignOperationCodeToDepartment(req, res) {
        try {
            const { departmentID, reasonID } = req.body;
            await OperationCodeModel.assignOperationCodeToDepartment(departmentID, reasonID);
            res.status(200).json({ message: "Operation Code assigned successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getOperationCodesByDepartment(req, res) {
        try {
            const { departmentID } = req.params;
            const operationCodes = await OperationCodeModel.getOperationCodesByDepartment(departmentID);
            res.json(operationCodes);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = OperationCodeController;
