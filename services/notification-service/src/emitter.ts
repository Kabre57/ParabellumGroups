import { EventEmitter } from 'events';

// Simple shared emitter used to push newly created notifications to SSE clients
// Topic: "notification" payload: { userId: string, notification: any }
const notificationEmitter = new EventEmitter();

// Avoid memory leak warnings when many clients connect
notificationEmitter.setMaxListeners(50);

export default notificationEmitter;
