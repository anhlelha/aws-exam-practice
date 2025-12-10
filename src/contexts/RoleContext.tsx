import { createContext, useContext, useState, type ReactNode } from 'react';

type Role = 'admin' | 'user' | null;

interface RoleContextType {
    role: Role;
    setRole: (role: Role) => void;
    isAdmin: boolean;
    clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
    const [role, setRoleState] = useState<Role>(() => {
        const saved = localStorage.getItem('userRole');
        return saved as Role || null;
    });

    const setRole = (newRole: Role) => {
        setRoleState(newRole);
        if (newRole) {
            localStorage.setItem('userRole', newRole);
        } else {
            localStorage.removeItem('userRole');
        }
    };

    const clearRole = () => {
        setRoleState(null);
        localStorage.removeItem('userRole');
    };

    return (
        <RoleContext.Provider value={{
            role,
            setRole,
            isAdmin: role === 'admin',
            clearRole
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
}
