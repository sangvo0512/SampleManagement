import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
            const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
            const { token, user } = response.data;

            setUser(user);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);

            return { token, user };
        } catch (error) {
            throw new Error(error.response?.data?.message || "Login failed");
        }
    };




    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("permissions");
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);