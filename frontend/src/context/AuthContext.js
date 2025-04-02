import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // 🔹 Thêm trạng thái loading
    // axios.defaults.baseURL = "http://sample.pihlgp.com:5000/api";
    // axios.defaults.withCredentials = true; // Nếu API yêu cầu cookie
    // axios.defaults.headers.common["Authorization"] = `Bearer ${localStorage.getItem("token")}`;
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, []);


    const login = async (username, password) => {
        try {
            const response = await axios.post('http://sample.pihlgp.com:5000/api/auth/login', { username, password });
            const { token, user } = response.data;  // Chỉ lấy token và user
            setUser(user);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);
        } catch (error) {
            throw new Error(error.response?.data?.message || "Login failed");
        }
    };


    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
    };

    if (isLoading) {
        return <div>Loading...</div>; // 🔹 Hiển thị "Loading..." trong khi chờ xác thực
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);