"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_js_1 = require("./services/database.js");
// Routes
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const loads_js_1 = __importDefault(require("./routes/loads.js"));
const bids_js_1 = __importDefault(require("./routes/bids.js"));
const chat_js_1 = __importDefault(require("./routes/chat.js"));
const notifications_js_1 = __importDefault(require("./routes/notifications.js"));
const payments_js_1 = __importDefault(require("./routes/payments.js"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_js_1.default);
app.use('/api/loads', loads_js_1.default);
app.use('/api/bids', bids_js_1.default);
app.use('/api/chat', chat_js_1.default);
app.use('/api/notifications', notifications_js_1.default);
app.use('/api/payments', payments_js_1.default);
// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'BeeBuzz API Running' });
});
// Start Server
async function startServer() {
    try {
        await (0, database_js_1.initDatabase)();
        console.log('Database initialized');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
