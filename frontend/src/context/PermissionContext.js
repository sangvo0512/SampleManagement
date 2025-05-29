import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

export const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("permissions");
        if (stored) {
            setPermissions(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

    const updatePermissions = useCallback((newPermissions) => {
        setPermissions((prev) => {
            // Chỉ cập nhật nếu quyền mới khác quyền hiện tại
            if (JSON.stringify(prev) !== JSON.stringify(newPermissions)) {
                localStorage.setItem("permissions", JSON.stringify(newPermissions));
                return newPermissions;
            }
            return prev;
        });
    }, []);

    const fetchPermissionsFromServer = useCallback(async (userId) => {
        try {
            setIsLoading(true);
            const res = await axios.get(`/api/permissions/effective/${userId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            console.log("Permissions API response:", res.data);

            const rawData = res.data;
            const permissionArray = Array.isArray(rawData)
                ? rawData
                : Array.isArray(rawData.permissions)
                    ? rawData.permissions
                    : [];

            const permissionKeys = permissionArray.map(p => p.PermissionKey);
            updatePermissions(permissionKeys);
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
        } finally {
            setIsLoading(false);
        }
    }, [updatePermissions]);

    return (
        <PermissionContext.Provider value={{ permissions, updatePermissions, fetchPermissionsFromServer, isLoading }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionContext);