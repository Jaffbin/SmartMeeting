import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { StorageService } from './StorageService';

export const OfflineQueue = {
  // Save recording for later upload
  queueRecording: async (uri, title) => {
    const queue = await OfflineQueue.getQueue();
    queue.push({
      id: Date.now().toString(),
      uri,
      title,
      queuedAt: new Date().toISOString(),
      status: 'pending'
    });
    await AsyncStorage.setItem('upload_queue', JSON.stringify(queue));
  },

  // Get queued recordings
  getQueue: async () => {
    const data = await AsyncStorage.getItem('upload_queue');
    return data ? JSON.parse(data) : [];
  },

  // Process queue when online
  processQueue: async () => {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) return;

    const queue = await OfflineQueue.getQueue();
    const pending = queue.filter(item => item.status === 'pending');

    for (const item of pending) {
      try {
        await StorageService.uploadAndTranscribe(item.uri, item.title);
        item.status = 'completed';
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
      }
    }

    await AsyncStorage.setItem('upload_queue', JSON.stringify(queue));
  }
};