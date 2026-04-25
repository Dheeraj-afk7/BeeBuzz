"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.sendMessage = void 0;
const uuid_1 = require("uuid");
const database_js_1 = require("../services/database.js");
const sendMessage = async (req, res) => {
    try {
        const { loadId, receiverId, message } = req.body;
        if (!loadId || !receiverId || !message) {
            res.status(400).json({ success: false, error: 'All fields required' });
            return;
        }
        const messageId = (0, uuid_1.v4)();
        await (0, database_js_1.runQuery)(`
      INSERT INTO chat_messages (id, load_id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?, ?)
    `, [messageId, loadId, req.user?.userId, receiverId, message]);
        // Notify receiver
        const sender = await (0, database_js_1.getOne)('SELECT name FROM users WHERE id = ?', [req.user?.userId]);
        await (0, database_js_1.runQuery)(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [(0, uuid_1.v4)(), receiverId, 'New Message', `${sender.name}: ${message.substring(0, 50)}...`, 'new_message', loadId]);
        await (0, database_js_1.saveDatabase)();
        const newMessage = await (0, database_js_1.getOne)('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
        res.status(201).json({ success: true, data: formatMessage(newMessage) });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res) => {
    try {
        const { loadId } = req.params;
        const messages = await (0, database_js_1.getAll)(`
      SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.load_id = ?
      ORDER BY m.created_at ASC
    `, [loadId]);
        res.json({ success: true, data: messages.map(formatMessage) });
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getMessages = getMessages;
function formatMessage(msg) {
    return {
        id: msg.id,
        loadId: msg.load_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderPhoto: msg.sender_photo,
        receiverId: msg.receiver_id,
        message: msg.message,
        createdAt: msg.created_at
    };
}
exports.default = { sendMessage: exports.sendMessage, getMessages: exports.getMessages };
