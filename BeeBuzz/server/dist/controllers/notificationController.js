"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.markAsRead = exports.getNotifications = void 0;
const database_js_1 = require("../services/database.js");
const getNotifications = async (req, res) => {
    try {
        const notifications = await (0, database_js_1.getAll)('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user?.userId]);
        res.json({
            success: true,
            data: notifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                referenceId: n.reference_id,
                read: Boolean(n.read),
                createdAt: n.created_at
            }))
        });
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, database_js_1.runQuery)('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [id, req.user?.userId]);
        await (0, database_js_1.saveDatabase)();
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
const getUnreadCount = async (req, res) => {
    try {
        const result = await (0, database_js_1.getOne)('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [req.user?.userId]);
        res.json({ success: true, data: { count: result.count } });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getUnreadCount = getUnreadCount;
exports.default = { getNotifications: exports.getNotifications, markAsRead: exports.markAsRead, getUnreadCount: exports.getUnreadCount };
