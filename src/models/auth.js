// In-memory user storage
const users = [
    { id: 1, email: 'bogdan@ubb.ro', password: 'melc', role: 'admin' }
];

module.exports = {
    login: (email, password) => {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) return null;

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },

    getUserById: (id) => {
        const user = users.find(u => u.id === id);
        if (!user) return null;

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
};