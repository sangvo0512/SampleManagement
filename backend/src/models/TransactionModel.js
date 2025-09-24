const { sql, poolPromise } = require('../config/db');
const SampleModel = require('./SampleModel');

class TransactionModel {
    // Ghi log hành động sản phẩm vào ProductLogs
    static async logProductAction({ UniqueKey, ActionType, Quantity, TransactionID, UserName, DepartmentName, QRCodeID, OperationCodeID, DetailID, ToUserName, ToDepartmentName }, transaction) {
        try {
            const actionTypeMap = {
                'Mượn': 'Borrow',
                'Trả': 'Return',
                'Chuyển giao': 'Transfer',
                'Xuất kho': 'Export',
                'Báo phế': 'Reject'
            };
            const normalizedActionType = actionTypeMap[ActionType] || ActionType;
            if (!['Borrow', 'Return', 'Transfer', 'Export', 'Reject'].includes(normalizedActionType)) {
                throw new Error(`Loại hành động không hợp lệ: ${normalizedActionType}`);
            }

            console.log(`logProductAction: UniqueKey=${UniqueKey}, ActionType=${normalizedActionType}, QRCodeID=${QRCodeID}, OperationCodeID=${OperationCodeID}, ToUserName=${ToUserName}, ToDepartmentName=${ToDepartmentName}`);

            const request = transaction.request();
            request.input('UniqueKey', sql.NVarChar(100), UniqueKey);
            request.input('ActionType', sql.NVarChar(50), normalizedActionType);
            request.input('Quantity', sql.Int, Quantity);
            request.input('TransactionID', sql.Int, TransactionID);
            request.input('UserName', sql.NVarChar(50), UserName);
            request.input('DepartmentName', sql.NVarChar(100), DepartmentName);  // Giữ nguyên, vì đã là Name
            request.input('QRCodeID', sql.NVarChar(150), QRCodeID);
            request.input('DetailID', sql.Int, DetailID || null);
            request.input('OperationCodeID', sql.Int, ['Export', 'Reject'].includes(normalizedActionType) ? OperationCodeID : null);
            request.input('ToUserName', sql.NVarChar(50), ToUserName || null);
            request.input('ToDepartmentName', sql.NVarChar(100), ToDepartmentName || null);

            await request.query(`
                INSERT INTO ProductLogs
                (UniqueKey, ActionType, Quantity, TransactionID, UserName, DepartmentName, QRCodeID, Date, DetailID, OperationCodeID, ToUserName, ToDepartmentName)
                VALUES
                (@UniqueKey, @ActionType, @Quantity, @TransactionID, @UserName, @DepartmentName, @QRCodeID, GETDATE(), @DetailID, @OperationCodeID, @ToUserName, @ToDepartmentName)
            `);
            console.log(`logProductAction hoàn tất`);
        } catch (error) {
            console.error('Lỗi trong logProductAction:', error);
            throw error;
        }
    }

    // Tạo header giao dịch (thay DepartmentID bằng DepartmentName)
    static async createTransactionHeader({ ActionType, UserName, DepartmentName, TransactionDate, ToUserName = null, ToDepartmentName = null }) {
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export',
            'Báo phế': 'Reject'
        };
        const normalizedActionType = actionTypeMap[ActionType] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export', 'Reject'].includes(normalizedActionType)) {
            throw new Error(`Loại hành động không hợp lệ: ${normalizedActionType}`);
        }

        console.log('createTransactionHeader:', { ActionType: normalizedActionType, UserName, DepartmentName, ToUserName, ToDepartmentName });

        const pool = await poolPromise;
        const request = pool.request()
            .input('ActionType', sql.NVarChar(50), normalizedActionType)
            .input('UserName', sql.NVarChar(100), UserName)
            .input('DepartmentName', sql.NVarChar(100), DepartmentName)
            .input('TransactionDate', sql.DateTime, TransactionDate)
            .input('ToUserName', sql.NVarChar(100), ToUserName)
            .input('ToDepartmentName', sql.NVarChar(100), ToDepartmentName);

        const result = await request.query(`
            INSERT INTO Transactions
            (ActionType, UserName, DepartmentName, TransactionDate, ToUserName, ToDepartmentName)
            OUTPUT INSERTED.TransactionID
            VALUES (@ActionType, @UserName, @DepartmentName, @TransactionDate, @ToUserName, @ToDepartmentName);
        `);
        return result.recordset[0].TransactionID;
    }

    // Tạo chi tiết giao dịch
    static async createTransactionDetail({ TransactionID, UniqueKey, QRIndex, QRCodeID, Quantity = 1, ActionType, RelatedTransactionID = null }, transaction) {
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export',
            'Báo phế': 'Reject'
        };
        const normalizedActionType = actionTypeMap[ActionType] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export', 'Reject'].includes(normalizedActionType)) {
            throw new Error(`Loại hành động không hợp lệ: ${normalizedActionType}`);
        }

        const effectiveQRIndex = parseInt(QRIndex);
        if (isNaN(effectiveQRIndex)) {
            console.error(`QRIndex không hợp lệ: ${QRIndex}`);
            throw new Error(`QRIndex không hợp lệ: ${QRIndex}`);
        }

        // Kiểm tra QRCodeID
        if (!QRCodeID || typeof QRCodeID !== 'string' || QRCodeID.trim() === '') {
            console.error(`QRCodeID không hợp lệ: ${QRCodeID}`);
            throw new Error(`QRCodeID không hợp lệ hoặc bị thiếu: ${QRCodeID}`);
        }

        console.log(`createTransactionDetail: TransactionID=${TransactionID}, UniqueKey=${UniqueKey}, QRIndex=${effectiveQRIndex}, QRCodeID=${QRCodeID}`);

        try {
            const request = transaction.request();
            request.input('TransactionID', sql.Int, TransactionID);
            request.input('UniqueKey', sql.NVarChar(100), UniqueKey);
            request.input('QRIndex', sql.Int, effectiveQRIndex);
            request.input('QRCodeID', sql.NVarChar(150), QRCodeID);
            request.input('Quantity', sql.Int, Quantity);
            request.input('ActionType', sql.NVarChar(50), normalizedActionType);
            request.input('RelatedTransactionID', sql.Int, RelatedTransactionID);
            request.input('BorrowDate', sql.DateTime, ['Borrow', 'Transfer'].includes(normalizedActionType) ? new Date() : null);
            request.input('ReturnDate', sql.DateTime, normalizedActionType === 'Return' ? new Date() : null);

            const result = await request.query(`
                INSERT INTO TransactionDetails
                (TransactionID, UniqueKey, QRIndex, QRCodeID, Quantity, ActionType, RelatedTransactionID, BorrowDate, ReturnDate)
                VALUES
                (@TransactionID, @UniqueKey, @QRIndex, @QRCodeID, @Quantity, @ActionType, @RelatedTransactionID, @BorrowDate, @ReturnDate);
                SELECT SCOPE_IDENTITY() AS DetailID;
            `);
            console.log(`createTransactionDetail result: DetailID=${result.recordset[0].DetailID}`);
            return result.recordset[0].DetailID;
        } catch (error) {
            console.error('Lỗi trong createTransactionDetail:', error);
            throw error;
        }
    }

    // Tạo giao dịch, hỗ trợ nhiều UniqueKey
    static async createTransaction(data, transaction = null) {
        const { ActionType, UserName, DepartmentName, TransactionDate, items, OperationCodeID, ToUserName, ToDepartmentName } = data;
        const actionTypeMap = {
            'Mượn': 'Borrow',
            'Trả': 'Return',
            'Chuyển giao': 'Transfer',
            'Xuất kho': 'Export',
            'Báo phế': 'Reject'
        };
        const normalizedActionType = actionTypeMap[ActionType] || ActionType;
        if (!['Borrow', 'Return', 'Transfer', 'Export', 'Reject'].includes(normalizedActionType)) {
            throw new Error(`Loại hành động không hợp lệ: ${normalizedActionType}`);
        }

        const pool = await poolPromise;
        const localTransaction = transaction || await pool.transaction();

        try {
            if (!transaction) await localTransaction.begin();

            // Tạo header giao dịch (đã đổi DepartmentID -> DepartmentName)
            const transactionId = await this.createTransactionHeader({
                ActionType: normalizedActionType,
                UserName,
                DepartmentName,   // <-- dùng DepartmentName
                TransactionDate,
                ToUserName,
                ToDepartmentName
            });

            // Lấy danh sách UniqueKey từ items
            const uniqueKeys = [...new Set(items.map(item => item.UniqueKey))];
            let samples = {};
            if (uniqueKeys.length > 0) {
                const request = localTransaction.request();
                uniqueKeys.forEach((key, i) => {
                    request.input(`UniqueKey${i}`, sql.NVarChar(100), key);
                });
                const samplesResult = await request.query(`
                SELECT UniqueKey, Quantity, BorrowdQuantity, Exported, Rejected
                FROM Samples WITH (UPDLOCK)
                WHERE UniqueKey IN (${uniqueKeys.map((_, i) => `@UniqueKey${i}`).join(',')})
            `);
                samples = samplesResult.recordset.reduce((acc, sample) => {
                    acc[sample.UniqueKey] = sample;
                    return acc;
                }, {});
            }

            // Lấy trạng thái QR codes
            const qrCodeIds = items.map(item => item.QRCodeID);
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

            // ❌ Đã bỏ đoạn map từ DepartmentID -> DepartmentName vì giờ đã truyền thẳng từ frontend

            // Kiểm tra và cập nhật số lượng
            const sampleUpdates = {};
            const itemQuantities = {};
            for (const item of items) {
                const parts = item.QRCodeID.split('|');
                const QRIndex = parseInt(parts.pop());
                if (isNaN(QRIndex)) {
                    throw new Error(`QRIndex không hợp lệ từ QRCodeID: ${item.QRCodeID}`);
                }
                const parsedUniqueKey = parts.join('|');
                if (parsedUniqueKey !== item.UniqueKey) {
                    throw new Error(`UniqueKey không khớp với QRCodeID: ${item.QRCodeID}, UniqueKey: ${item.UniqueKey}`);
                }

                const QRCodeID = item.QRCodeID;
                const sample = samples[item.UniqueKey];

                if (!qrStatuses[QRCodeID]) {
                    throw new Error(`Mã QR ${QRCodeID} không tồn tại.`);
                }
                const qrStatus = qrStatuses[QRCodeID];

                itemQuantities[item.UniqueKey] = (itemQuantities[item.UniqueKey] || 0) + (item.Quantity || 1);

                if (normalizedActionType === 'Borrow') {
                    if (qrStatus !== 'Available') {
                        throw new Error(`Mã QR ${QRCodeID} không khả dụng để mượn (trạng thái: ${qrStatus}).`);
                    }
                    if (!sample) {
                        throw new Error(`Sản phẩm không tồn tại: ${item.UniqueKey}`);
                    }
                    if (sample.Quantity < itemQuantities[item.UniqueKey]) {
                        throw new Error(`Không đủ số lượng để mượn cho ${item.UniqueKey}.`);
                    }
                } else if (normalizedActionType === 'Export') {
                    if (qrStatus !== 'Available') {
                        throw new Error(`Mã QR ${QRCodeID} không khả dụng để xuất kho (trạng thái: ${qrStatus}).`);
                    }
                    if (!sample) {
                        throw new Error(`Sản phẩm không tồn tại: ${item.UniqueKey}`);
                    }
                    if (sample.Quantity < itemQuantities[item.UniqueKey]) {
                        throw new Error(`Không đủ số lượng để xuất kho cho ${item.UniqueKey}.`);
                    }
                } else if (normalizedActionType === 'Transfer') {
                    if (qrStatus !== 'Borrowed') {
                        throw new Error(`Mã QR ${QRCodeID} phải ở trạng thái 'Borrowed' để chuyển giao (trạng thái: ${qrStatus}).`);
                    }
                } else if (normalizedActionType === 'Reject') {
                    if (qrStatus !== 'Available') {
                        throw new Error(`Mã QR ${QRCodeID} không khả dụng để báo hủy (trạng thái: ${qrStatus}).`);
                    }
                    if (!sample) {
                        throw new Error(`Sản phẩm không tồn tại: ${item.UniqueKey}`);
                    }
                    if (sample.Quantity < itemQuantities[item.UniqueKey]) {
                        throw new Error(`Không đủ số lượng để báo hủy cho ${item.UniqueKey}.`);
                    }
                }
            }

            // Cập nhật số lượng mẫu
            if (['Borrow', 'Export', 'Reject'].includes(normalizedActionType)) {
                for (const uniqueKey in itemQuantities) {
                    const sample = samples[uniqueKey];
                    const totalQuantity = itemQuantities[uniqueKey];
                    sampleUpdates[uniqueKey] = {
                        Quantity: sample.Quantity - totalQuantity,
                        BorrowdQuantity: normalizedActionType === 'Borrow' ? (sample.BorrowdQuantity || 0) + totalQuantity : (sample.BorrowdQuantity || 0),
                        Exported: normalizedActionType === 'Export' ? (sample.Exported || 0) + totalQuantity : (sample.Exported || 0),
                        Rejected: normalizedActionType === 'Reject' ? (sample.Rejected || 0) + totalQuantity : (sample.Rejected || 0),
                        State: sample.Quantity - totalQuantity > 0 ? 'Available' : 'Unavailable'
                    };
                }
            }

            // Cập nhật trạng thái QR code
            if (['Borrow', 'Export', 'Reject'].includes(normalizedActionType)) {
                const status = normalizedActionType === 'Borrow' ? 'Borrowed' : normalizedActionType === 'Export' ? 'Exported' : 'Rejected';
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

            // Cập nhật mẫu
            for (const [uniqueKey, update] of Object.entries(sampleUpdates)) {
                await SampleModel.updateSampleByUniqueKey(uniqueKey, update, localTransaction);
            }

            // Tạo chi tiết giao dịch và ghi log
            for (const item of items) {
                const parts = item.QRCodeID.split('|');
                const QRIndex = parseInt(parts.pop());
                const QRCodeID = item.QRCodeID;
                console.log("Gia tri cua item:", item);
                const detailId = await this.createTransactionDetail({
                    TransactionID: transactionId,
                    UniqueKey: item.UniqueKey,
                    QRIndex,
                    QRCodeID: QRCodeID,
                    Quantity: item.Quantity,
                    ActionType: normalizedActionType
                }, localTransaction);

                await this.logProductAction({
                    UniqueKey: item.UniqueKey,
                    ActionType: normalizedActionType,
                    Quantity: item.Quantity,
                    TransactionID: transactionId,
                    UserName,
                    DepartmentName,   // <-- đổi sang DepartmentName
                    QRCodeID,
                    OperationCodeID,
                    DetailID: detailId,
                    ToUserName,
                    ToDepartmentName
                }, localTransaction);
            }

            if (!transaction) await localTransaction.commit();
            return transactionId;
        } catch (error) {
            if (!transaction) await localTransaction.rollback();
            console.error('Lỗi tạo giao dịch:', error);
            throw error;
        }
    }


    // Lấy tất cả giao dịch
    static async getAllTransactions() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
            SELECT t.*, u.FullName AS UserName
            FROM Transactions t
            LEFT JOIN Users u ON t.UserName = u.UserName
            ORDER BY t.TransactionDate DESC
        `);
        return result.recordset;
    }

    // Lấy giao dịch theo UniqueKey
    static async getTransactionsByUniqueKey(uniqueKey) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UniqueKey', sql.NVarChar(100), uniqueKey)
            .query(`
                SELECT t.*
                FROM Transactions t
                JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                WHERE td.UniqueKey = @UniqueKey
                ORDER BY t.TransactionDate DESC
            `);
        return result.recordset;
    }

    // Lấy giao dịch theo ID
    static async getTransactionById(transactionId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TransactionID', sql.Int, transactionId)
            .query(`SELECT * FROM Transactions WHERE TransactionID = @TransactionID`);
        return result.recordset[0];
    }

    // Lấy giao dịch theo UserID
    static async getTransactionsByUserId(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserName', sql.NVarChar(100), userId)
            .query(`
            SELECT * FROM Transactions
            WHERE UserName = @UserName
            ORDER BY TransactionDate DESC
        `);
        return result.recordset;
    }

    // Lấy giao dịch theo DepartmentID
    static async getTransactionsByDepartmentId(departmentName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('DepartmentName', sql.NVarChar(100), departmentName)
            .query(`
            SELECT * FROM Transactions
            WHERE DepartmentName = @DepartmentName
            ORDER BY TransactionDate DESC
        `);
        return result.recordset;
    }

    // Xóa giao dịch
    static async deleteTransaction(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('TransactionID', sql.Int, id)
            .query('DELETE FROM Transactions WHERE TransactionID = @TransactionID');
        return result.rowsAffected[0];
    }

    // Lấy thống kê giao dịch theo tháng
    static async getTransactionSummaryByMonth(year) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Year', sql.Int, year)
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

    // Lấy trạng thái mã QR
    static async getQRCodeStatus(qrCodeId) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('QRCodeID', sql.NVarChar(150), qrCodeId);

            const result = await request.query(`
                SELECT Status, Location
                FROM QRCodeDetails
                WHERE QRCodeID = @QRCodeID
            `);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0]; // Trả về cả Status và Location
        } catch (error) {
            console.error('Lỗi trong getQRCodeStatus:', error);
            throw error;
        }
    }
}

module.exports = TransactionModel;