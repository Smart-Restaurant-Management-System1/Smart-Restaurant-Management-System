import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notificationApi,
} from './notificationService.js';

test('notificationService exports all required API methods', () => {
  assert.equal(typeof getNotifications, 'function');
  assert.equal(typeof getUnreadCount, 'function');
  assert.equal(typeof markNotificationAsRead, 'function');
  assert.equal(typeof markAllNotificationsAsRead, 'function');
});

test('notificationApi has correct headers configured', () => {
  assert.equal(notificationApi.defaults.headers['Content-Type'], 'application/json');
});

