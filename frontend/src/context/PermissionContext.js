import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);

    // Đọc từ localStorage khi load lần đầu
    useEffect(() => {
        const stored = localStorage.getItem("permissions");
        if (stored) {
            setPermissions(JSON.parse(stored));
        }
    }, []);

    const updatePermissions = (newPermissions) => {
        setPermissions(newPermissions);
        localStorage.setItem("permissions", JSON.stringify(newPermissions));
    };

    const fetchPermissionsFromServer = async (userId) => {
        try {
            const res = await axios.get(`/api/permissions/effective/${userId}`);
            const permissionKeys = res.data.map(p => p.PermissionKey);
            updatePermissions(permissionKeys);
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
        }
    };

    return (
        <PermissionContext.Provider value={{ permissions, updatePermissions, fetchPermissionsFromServer }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionContext);
