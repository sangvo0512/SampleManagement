const { sql, poolPromise } = require('../config/db');
const SampleModel = require('./SampleModel');

class TransactionModel {
    static async logProductAction({ ItemCode, ActionType, Quantity, TransactionID, UserName, DepartmentID, QRCodeID, OperationCodeID, DetailID, ToUserName, ToDepartmentName }, transaction) {
        try {
            // Ánh xạ ActionType sang tiếng Anh
            const actionTypeMap = {
                'Mượn': 'Borrow',
                'Trả': 'Return',
                'Chuyển giao': 'Transfer',
                'Xuất kho': 'Export'
            };
            const normalizedActionType = actionTypeMap[ActionType] || ActionType;
            if (!['Borrow', 'Return', 'Transfer', 'Export'].includes(normalizedActionType)) {
                throw new Error(`Invalid ActionType: ${normalizedActionType}`);
            }

            // Lấy tên bộ phận từ DepartmentID nếu có
            let departmentName = null;
            if (DepartmentID) {
                const depResult = await transaction.request()
                    .input("DepartmentID", sql.Int, DepartmentID)
                    .query(`SELECT DepartmentName FROM Departments WHERE DepartmentID = @DepartmentID`);
                departmentName = depResult.recordset[0]?.DepartmentName || null;
            }
            console.log(`logProductAction: ItemCode=${ItemCode}, ActionType=${normalizedActionType}, QRCodeID=${QRCodeID}, OperationCodeID=${OperationCodeID}, ToUserName=${ToUserName}, ToDepartmentName=${ToDepartmentName}`);

            // Chuẩn bị request để ghi log vào ProductLogs
            const request = transaction.request();
            request.input('ItemCode', sql.NVarChar(100), ItemCode);
            request.input('ActionType', sql.NVarChar(50), normalizedActionType);
            request.input('Quantity', sql.Int, Quantity);
            request.input('TransactionID', sql.Int, TransactionID);
            request.input('UserName', sql.NVarChar(50), UserName);
            request.input('DepartmentName', sql.NVarChar(100), departmentName);
            request.input('QRCodeID', sql.NVarChar(150), QRCodeID);
            request.input('DetailID', sql.Int, DetailID || null);
            request.input('OperationCodeID', sql.Int, normalizedActionType === 'Export' ? OperationCodeID : null);
            request.input('ToUserName', sql.NVarChar(50), ToUserName || null);
            request.input('ToDepartmentName', sql.NVarChar(100), ToDepartmentName || null);

            // Ghi log vào bảng ProductLogs
            await request.query(`
                INSERT INTO ProductLogs
                (ItemCode, ActionType, Quantity, TransactionID, UserName, DepartmentName, QRCodeID, Date, DetailID, OperationCodeID, ToUserName, ToDepartmentName)
                VALUES
                (@ItemCode, @ActionType, @Quantity, @TransactionID, @UserName, @DepartmentName, @QRCodeID, GETDATE(), @DetailID, @OperationCodeID, @ToUserName, @ToDepartmentName)
            `);
            console.log(`logProductAction completed`);
        } catch (error) {
            console.error('Lỗi trong logProductAction:', error);
            throw error;
        }
    }

    static async createTransactionHeader({ ActionType, UserName, DepartmentID, TransactionDate, ToUserName = null, ToDepartmentName = null }) {
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export'
        };
        const normalizedActionType = actionTypeMap[ActionType] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export'].includes(normalizedActionType)) {
            throw new Error(`Invalid ActionType: ${normalizedActionType}`);
        }

        const pool = await poolPromise;
        const request = pool.request()
            .input("ActionType", sql.NVarChar(50), normalizedActionType)
            .input("UserName", sql.NVarChar(100), UserName)
            .input("DepartmentID", sql.Int, DepartmentID)
            .input("TransactionDate", sql.DateTime, TransactionDate)
            .input("ToUserName", sql.NVarChar(100), ToUserName)
            .input("ToDepartmentName", sql.NVarChar(100), ToDepartmentName);

        const result = await request.query(`
            INSERT INTO Transactions
            (ActionType, UserName, DepartmentID, TransactionDate, ToUserName, ToDepartmentName)
            VALUES (@ActionType, @UserName, @DepartmentID, @TransactionDate, @ToUserName, @ToDepartmentName);
            SELECT SCOPE_IDENTITY() AS TransactionID;
        `);
        return result.recordset[0].TransactionID;
    }

    static async createTransactionDetail({ TransactionID, ItemCode, QRIndex, QRCodeData, Quantity = 1, ActionType, RelatedTransactionID = null }, transaction) {
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export'
        };
        const normalizedActionType = actionTypeMap[ActionType] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export'].includes(normalizedActionType)) {
            throw new Error(`Invalid ActionType: ${normalizedActionType}`);
        }

        const effectiveQRIndex = parseInt(QRIndex);
        if (isNaN(effectiveQRIndex)) {
            console.error(`QRIndex không hợp lệ: ${QRIndex}`);
            throw new Error(`QRIndex không hợp lệ: ${QRIndex}`);
        }

        const effectiveQRCodeData = QRCodeData || `${ItemCode}-${effectiveQRIndex}`;
        console.log(`createTransactionDetail: TransactionID=${TransactionID}, ItemCode=${ItemCode}, QRIndex=${effectiveQRIndex}, QRCodeData=${effectiveQRCodeData}`);

        try {
            const request = transaction.request();
            request.input("TransactionID", sql.Int, TransactionID);
            request.input("ItemCode", sql.NVarChar(100), ItemCode);
            request.input("QRIndex", sql.Int, effectiveQRIndex);
            request.input("QRCodeData", sql.NVarChar(500), effectiveQRCodeData);
            request.input("Quantity", sql.Int, Quantity);
            request.input("ActionType", sql.NVarChar(50), normalizedActionType);
            request.input("RelatedTransactionID", sql.Int, RelatedTransactionID);
            request.input("BorrowDate", sql.DateTime, ['Borrow', 'Transfer'].includes(normalizedActionType) ? new Date() : null);
            request.input("ReturnDate", sql.DateTime, normalizedActionType === 'Return' ? new Date() : null);

            const result = await request.query(`
                INSERT INTO TransactionDetails
                (TransactionID, ItemCode, QRIndex, QRCodeData, Quantity, ActionType, RelatedTransactionID, BorrowDate, ReturnDate)
                VALUES
                (@TransactionID, @ItemCode, @QRIndex, @QRCodeData, @Quantity, @ActionType, @RelatedTransactionID, @BorrowDate, @ReturnDate);
                SELECT SCOPE_IDENTITY() AS DetailID;
            `);
            console.log(`createTransactionDetail result: DetailID=${result.recordset[0].DetailID}`);
            return result.recordset[0].DetailID;
        } catch (error) {
            console.error('Lỗi trong createTransactionDetail:', error);
            throw error;
        }
    }

    static async createTransaction(data, transaction = null) {
        const { ActionType, UserName, DepartmentID, TransactionDate, items, OperationCodeID, ToUserName, ToDepartmentName } = data;
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export'
        };
        const normalizedActionType = actionTypeMap[ActionType.trim().toLowerCase()] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export'].includes(normalizedActionType)) {
            throw new Error(`Invalid ActionType: ${normalizedActionType}`);
        }

        const pool = await poolPromise;
        const localTransaction = transaction || await pool.transaction();

        try {
            if (!transaction) await localTransaction.begin();
            console.time(`createTransaction`);

            // Tạo Transaction header
            console.time(`insert_transaction`);
            const transactionId = await this.createTransactionHeader({
                ActionType: normalizedActionType,
                UserName,
                DepartmentID,
                TransactionDate,
                ToUserName,
                ToDepartmentName
            });
            console.timeEnd(`insert_transaction`);

            // Tải tất cả mẫu liên quan
            console.time(`load_samples`);
            const itemCodes = [...new Set(items.map(item => item.ItemCode))];
            let samples = {};
            if (itemCodes.length > 0) {
                const request = localTransaction.request();
                itemCodes.forEach((code, i) => {
                    request.input(`ItemCode${i}`, sql.NVarChar, code);
                });
                const samplesResult = await request.query(`
                    SELECT ItemCode, Quantity, BorrowdQuantity
                    FROM Samples WITH (UPDLOCK)
                    WHERE ItemCode IN (${itemCodes.map((_, i) => `@ItemCode${i}`).join(',')})
                `);
                samples = samplesResult.recordset.reduce((acc, sample) => {
                    acc[sample.ItemCode] = sample;
                    return acc;
                }, {});
            }
            console.timeEnd(`load_samples`);

            // Tải trạng thái QRCodeDetails
            console.time(`load_qr_status`);
            const qrCodeIds = items.map(item => `${item.ItemCode}-${item.QRIndex}`);
            let qrStatuses = {};
            if (qrCodeIds.length > 0) {
                const request = localTransaction.request();
                qrCodeIds.forEach((id, i) => {
                    request.input(`QRCodeID${i}`, sql.NVarChar(150), id);
                });
                const qrStatusResult = await request.query(`
                    SELECT QRCodeID, Status
                    FROM QRCodeDetails WITH (UPDLOCK)
                    WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
                `);
                qrStatuses = qrStatusResult.recordset.reduce((acc, record) => {
                    acc[record.QRCodeID] = record.Status;
                    return acc;
                }, {});
            }
            console.timeEnd(`load_qr_status`);

            // Tải DepartmentName
            console.time(`load_department`);
            let departmentName = null;
            if (DepartmentID) {
                const depResult = await localTransaction.request()
                    .input("DepartmentID", sql.Int, DepartmentID)
                    .query(`SELECT DepartmentName FROM Departments WITH (NOLOCK) WHERE DepartmentID = @DepartmentID`);
                departmentName = depResult.recordset[0]?.DepartmentName || null;
            }
            console.timeEnd(`load_department`);

            // Cập nhật Samples và QRCodeDetails
            const sampleUpdates = {};
            console.time(`process_items`);
            const itemQuantities = {};
            for (const item of items) {
                console.time(`item_${item.ItemCode}_${item.QRIndex}`);
                const QRIndex = parseInt(item.QRIndex);
                if (isNaN(QRIndex)) {
                    throw new Error(`QRIndex không hợp lệ: ${item.QRIndex}`);
                }
                const QRCodeID = `${item.ItemCode}-${QRIndex}`;
                const sample = samples[item.ItemCode];

                if (!qrStatuses[QRCodeID]) {
                    throw new Error(`Mã QR ${QRCodeID} không tồn tại.`);
                }
                const qrStatus = qrStatuses[QRCodeID];

                itemQuantities[item.ItemCode] = (itemQuantities[item.ItemCode] || 0) + (item.Quantity || 1);

                if (normalizedActionType === 'Borrow') {
                    if (qrStatus !== 'Available') {
                        throw new Error(`Mã QR ${QRCodeID} không khả dụng để mượn (trạng thái: ${qrStatus}).`);
                    }
                    if (!sample) {
                        throw new Error(`Sản phẩm không tồn tại: ${item.ItemCode}`);
                    }
                    if (sample.Quantity < itemQuantities[item.ItemCode]) {
                        throw new Error(`Không đủ số lượng để mượn cho ${item.ItemCode}.`);
                    }
                } else if (normalizedActionType === 'Export') {
                    if (qrStatus !== 'Available') {
                        throw new Error(`Mã QR ${QRCodeID} không khả dụng để xuất kho (trạng thái: ${qrStatus}).`);
                    }
                    if (!sample) {
                        throw new Error(`Sản phẩm không tồn tại: ${item.ItemCode}`);
                    }
                    if (sample.Quantity < itemQuantities[item.ItemCode]) {
                        throw new Error(`Không đủ số lượng để ${normalizedActionType} cho ${item.ItemCode}.`);
                    }
                } else if (normalizedActionType === 'Transfer') {
                    if (qrStatus !== 'Borrowed') {
                        throw new Error(`Mã QR ${QRCodeID} phải ở trạng thái 'Borrowed' để chuyển giao (trạng thái: ${qrStatus}).`);
                    }
                }
                console.timeEnd(`item_${item.ItemCode}_${item.QRIndex}`);
            }

            // Cập nhật Samples
            if (normalizedActionType === 'Borrow' || normalizedActionType === 'Export') {
                for (const itemCode in itemQuantities) {
                    const sample = samples[itemCode];
                    const totalQuantity = itemQuantities[itemCode];
                    sampleUpdates[itemCode] = {
                        Quantity: sample.Quantity - totalQuantity,
                        BorrowdQuantity: normalizedActionType === 'Borrow' ? (sample.BorrowdQuantity || 0) + totalQuantity : sample.BorrowdQuantity,
                        State: sample.Quantity - totalQuantity > 0 ? 'Available' : 'Unavailable'
                    };
                }
            }

            console.time(`update_qrcodes`);
            if (normalizedActionType === 'Borrow' || normalizedActionType === 'Export') {
                const status = normalizedActionType === 'Borrow' ? 'Borrowed' : 'Exported';
                const request = localTransaction.request();
                request.input('Status', sql.NVarChar(20), status);
                qrCodeIds.forEach((id, i) => {
                    request.input(`QRCodeID${i}`, sql.NVarChar(150), id);
                });
                await request.query(`
                    UPDATE QRCodeDetails
                    SET Status = @Status
                    WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
                `);
            }
            console.timeEnd(`update_qrcodes`);

            console.time(`update_samples`);
            for (const [itemCode, update] of Object.entries(sampleUpdates)) {
                await SampleModel.updateSampleByItemCode(itemCode, update, localTransaction);
            }
            console.timeEnd(`update_samples`);

            console.time(`insert_details_and_logs`);
            for (const item of items) {
                console.time(`detail_${item.ItemCode}_${item.QRIndex}`);
                const QRIndex = parseInt(item.QRIndex);
                const QRCodeID = `${item.ItemCode}-${QRIndex}`;
                const detailId = await this.createTransactionDetail({
                    TransactionID: transactionId,
                    ItemCode: item.ItemCode,
                    QRIndex,
                    QRCodeData: QRCodeID,
                    Quantity: item.Quantity,
                    ActionType: normalizedActionType
                }, localTransaction);

                await this.logProductAction({
                    ItemCode: item.ItemCode,
                    ActionType: normalizedActionType,
                    Quantity: item.Quantity,
                    TransactionID: transactionId,
                    UserName,
                    DepartmentID,
                    QRCodeID,
                    OperationCodeID,
                    DetailID: detailId,
                    ToUserName,
                    ToDepartmentName
                }, localTransaction);
                console.timeEnd(`detail_${item.ItemCode}_${item.QRIndex}`);
            }
            console.timeEnd(`insert_details_and_logs`);

            console.timeEnd(`createTransaction`);
            if (!transaction) await localTransaction.commit();
            return transactionId;
        } catch (error) {
            if (!transaction) await localTransaction.rollback();
            console.error("Lỗi tạo giao dịch:", error);
            throw error;
        }
    }

    static async getAllTransactions() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT t.*, u.FullName AS UserName, d.DepartmentName, s.Brand
                FROM Transactions t
                LEFT JOIN Users u ON t.UserID = u.UserID
                LEFT JOIN Departments d ON t.DepartmentID = d.DepartmentID
                LEFT JOIN Samples s ON t.ItemCode = s.ItemCode
                ORDER BY t.TransactionDate DESC
            `);
        return result.recordset;
    }

    static async getTransactionsByItemCode(itemCode) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("ItemCode", sql.NVarChar(50), itemCode)
            .query(`
                SELECT * FROM Transactions
                WHERE ItemCode = @ItemCode
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    static async getTransactionById(transactionId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("TransactionID", sql.Int, transactionId)
            .query(`SELECT * FROM Transactions WHERE TransactionID = @TransactionID`);
        return result.recordset[0];
    }

    static async getTransactionsByUserId(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT * FROM Transactions
                WHERE UserID = @UserID
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    static async getTransactionsByDepartmentId(departmentId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("DepartmentID", sql.Int, departmentId)
            .query(`
                SELECT * FROM Transactions
                WHERE DepartmentID = @DepartmentID
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    static async deleteTransaction(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("TransactionID", sql.Int, id)
            .query("DELETE FROM Transactions WHERE TransactionID = @TransactionID");
        return result.rowsAffected[0];
    }

    static async getTransactionSummaryByMonth(year) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Year", sql.Int, year)
            .query(`
                SELECT 
                    MONTH(TransactionDate) AS Month,
                    ActionType,
                    COUNT(*) AS TotalTransactions
                FROM Transactions
                WHERE YEAR(TransactionDate) = @Year
                GROUP BY MONTH(TransactionDate), ActionType
                ORDER BY Month
            `);
        return result.recordset;
    }
}

module.exports = TransactionModel;