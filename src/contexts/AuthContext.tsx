// Updated AuthContext.tsx for improved authentication flow and data consistency

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Logic for fetching current user
        const fetchUser = async () => {
            // Simulated fetch call for demo
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setLoading(false);
        };
        fetchUser();
    }, []);

    const login = async (username, password) => {
        // Login logic here
    };

    const logout = async () => {
        // Logout logic here
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    return useContext(AuthContext);
};

export { useAuth };