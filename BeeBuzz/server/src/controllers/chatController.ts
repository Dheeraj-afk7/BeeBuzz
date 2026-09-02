import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery, saveDatabase } from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId, receiverId, message } = req.body;
    
    if (!loadId || !receiverId || !message) {
      res.status(400).json({ success: false, error: 'All fields required' });
      return;
    }
    
    const messageId = uuidv4();
    
    await runQuery(`
      INSERT INTO chat_messages (id, load_id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?, ?)
    `, [messageId, loadId, req.user?.userId, receiverId, message]);
    
    // Notify receiver
    const sender = await getOne('SELECT name FROM users WHERE id = ?', [req.user?.userId]);
    await runQuery(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [uuidv4(), receiverId, 'New Message', `${sender.name}: ${message.substring(0, 50)}...`, 'new_message', loadId]);
    
    await saveDatabase();
    
    const newMessage = await getOne('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
    
    res.status(201).json({ success: true, data: formatMessage(newMessage) });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId } = req.params;
    
    const messages = await getAll(`
      SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.load_id = ?
      ORDER BY m.created_at ASC
    `, [loadId]);
    
    res.json({ success: true, data: messages.map(formatMessage) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

function formatMessage(msg: any) {
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

export default { sendMessage, getMessages };