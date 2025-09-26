const { sql, poolPromise } = require("../config/db");

class WarehouseModel {
    static async getAllWarehouses() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query("SELECT * FROM Warehouses");
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    static async createWarehouse(name) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("WarehouseName", sql.NVarChar(255), name)
                .query("INSERT INTO Warehouses (WarehouseName) OUTPUT INSERTED.* VALUES (@WarehouseName)");
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }

    static async updateWarehouse(id, name) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("WarehouseID", sql.Int, id)
                .input("WarehouseName", sql.NVarChar(255), name)
                .query("UPDATE Warehouses SET WarehouseName = @WarehouseName WHERE WarehouseID = @WarehouseID");
        } catch (err) {
            throw err;
        }
    }

    static async deleteWarehouse(id) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("WarehouseID", sql.Int, id)
                .query("DELETE FROM Warehouses WHERE WarehouseID = @WarehouseID");
        } catch (err) {
            throw err;
        }
    }
    // Mới: Lấy list QRCodeDetails theo Location (join Samples để lấy thêm info)
    static async getQRCodes(location = '') {
        const pool = await poolPromise;
        const query = `
      SELECT QD.*, S.Brand, S.BU, S.Season, S.ItemCode, S.WorkingNO, S.ArticleNO, S.ColorwayName, S.Round, '1' as Quantity
      FROM QRCodeDetails QD
      LEFT JOIN Samples S ON QD.UniqueKey = S.UniqueKey
      WHERE (@location IS NULL OR QD.Location = @location)
    `;
        try {
            const request = pool.request();
            request.input("location", sql.NVarChar, location || null);
            const result = await request.query(query);
            return result.recordset;
        } catch (err) {
            throw new Error(`Lỗi khi lấy QRCodeDetails: ${err.message}`);
        }
    }
    // Mới: Lấy dữ liệu từ view v_LocationQuantity
    static async getLocationQuantities(location = null) {
        try {
            const pool = await poolPromise;
            let query = `
            SELECT UniqueKey, Location, Quantity, Status
            FROM [dbo].[v_LocationQuantity]
        `;
            const request = pool.request();

            if (location) {
                query += ` WHERE Location = @location`;
                request.input("location", sql.NVarChar, location);
            }

            const result = await request.query(query);
            return result.recordset;
        } catch (err) {
            throw new Error(`Lỗi khi lấy dữ liệu từ v_LocationQuantity: ${err.message}`);
        }
    }
    // Mới: Thêm mẫu vào kho (cập nhật Location và tăng Quantity)
    static async addToWarehouse(location, qrCodes) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            for (const qrCodeId of qrCodes) {
                // Kiểm tra QR tồn tại và chưa có Location (tùy nghiệp vụ, có thể bỏ nếu cho phép update)
                const checkResult = await transaction.request()
                    .input("qrCodeId", sql.NVarChar, qrCodeId)
                    .query("SELECT UniqueKey, Location FROM QRCodeDetails WHERE QRCodeID = @qrCodeId");

                if (checkResult.recordset.length === 0) {
                    throw new Error(`QRCodeID '${qrCodeId}' không tồn tại`);
                }
                if (checkResult.recordset[0].Location) {
                    throw new Error(`QRCodeID '${qrCodeId}' đã có vị trí kho '${checkResult.recordset[0].Location}'`);
                }

                const uniqueKey = checkResult.recordset[0].UniqueKey;

                // Cập nhật Location trong QRCodeDetails
                await transaction.request()
                    .input("qrCodeId", sql.NVarChar, qrCodeId)
                    .input("location", sql.NVarChar, location)
                    .query("UPDATE QRCodeDetails SET Location = @location WHERE QRCodeID = @qrCodeId");

                // Tăng Quantity trong Samples
                await transaction.request()
                    .input("uniqueKey", sql.NVarChar, uniqueKey)
                    .query(`UPDATE Samples
                    SET Quantity = Quantity + 1,
                        State = CASE 
                            WHEN Quantity + 1 > 0 THEN 'Available'
                            ELSE 'Unavailable'
                        END
                    WHERE UniqueKey = @uniqueKey`);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    //Chuyển kho
    static async transferWarehouse(location, qrCodes) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            for (const qrCodeId of qrCodes) {
                // Kiểm tra QR tồn tại và phải có Location cũ
                const checkResult = await transaction.request()
                    .input("qrCodeId", sql.NVarChar, qrCodeId)
                    .query("SELECT UniqueKey, Location FROM QRCodeDetails WHERE QRCodeID = @qrCodeId");

                if (checkResult.recordset.length === 0) {
                    throw new Error(`QRCodeID '${qrCodeId}' không tồn tại`);
                }
                if (!checkResult.recordset[0].Location) {
                    throw new Error(`QRCodeID '${qrCodeId}' chưa có vị trí kho để chuyển`);
                }

                const uniqueKey = checkResult.recordset[0].UniqueKey;

                // Cập nhật Location mới trong QRCodeDetails
                await transaction.request()
                    .input("qrCodeId", sql.NVarChar, qrCodeId)
                    .input("location", sql.NVarChar, location)
                    .query("UPDATE QRCodeDetails SET Location = @location WHERE QRCodeID = @qrCodeId");

                // Không thay đổi Quantity, chỉ đảm bảo State đồng bộ
                await transaction.request()
                    .input("uniqueKey", sql.NVarChar, uniqueKey)
                    .query(`UPDATE Samples
                        SET State = CASE 
                            WHEN Quantity > 0 THEN 'Available'
                            ELSE 'Unavailable'
                        END
                        WHERE UniqueKey = @uniqueKey`);
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // Mới: Xuất Excel (lấy data tương tự getQRByLocation)
    static async getItemsForExport(location) {
        return await this.getQRByLocation(location);
    }
    // Mới: Update Location cho một QRCodeID
    static async updateLocation(qrCodeId, newLocation) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            // Kiểm tra QR tồn tại
            const checkResult = await transaction.request()
                .input("qrCodeId", sql.NVarChar, qrCodeId)
                .query("SELECT UniqueKey FROM QRCodeDetails WHERE QRCodeID = @qrCodeId");

            if (checkResult.recordset.length === 0) {
                throw new Error(`QRCodeID '${qrCodeId}' không tồn tại`);
            }

            // Update Location
            await transaction.request()
                .input("qrCodeId", sql.NVarChar, qrCodeId)
                .input("location", sql.NVarChar, newLocation)
                .query("UPDATE QRCodeDetails SET Location = @location WHERE QRCodeID = @qrCodeId");

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // Cập nhật getQRByLocation để hỗ trợ filter theo qrCodeId (nếu có)
    static async getQRByLocation(location, qrCodeId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input("location", sql.NVarChar, location || null)
                .input("qrCodeId", sql.NVarChar, qrCodeId || null);

            const query = `
            SELECT QD.*, S.Brand, S.BU, S.Season, S.ItemCode, S.WorkingNO, S.ArticleNO, S.ColorwayName, S.Round, S.Quantity
            FROM QRCodeDetails QD
            LEFT JOIN Samples S ON QD.UniqueKey = S.UniqueKey
            WHERE (@location IS NULL OR QD.Location = @location)
              AND (@qrCodeId IS NULL OR QD.QRCodeID = @qrCodeId)
        `;
            const result = await request.query(query);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = WarehouseModel;
