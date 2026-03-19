import { Response } from 'express';
import { getOne, getAll, runQuery, saveDatabase } from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = getAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user?.userId]
    );
    
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
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    runQuery('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [id, req.user?.userId]);
    
    saveDatabase();
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = getOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [req.user?.userId]
    );
    
    res.json({ success: true, data: { count: result.count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export default { getNotifications, markAsRead, getUnreadCount };