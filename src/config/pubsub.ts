import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const topicName = 'user-events';

export interface UserCreatedEvent {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
}

export async function publishUserCreated(userData: UserCreatedEvent): Promise<void> {
  try {
    const topic = pubsub.topic(topicName);
    
    // Check if topic exists, if not create it
    const [exists] = await topic.exists();
    if (!exists) {
      console.log(`Creating topic: ${topicName}`);
      await pubsub.createTopic(topicName);
    }

    const data = Buffer.from(JSON.stringify(userData));
    
    const messageId = await topic.publish(data, {
      eventType: 'user.created',
      timestamp: new Date().toISOString()
    });
    
    console.log(`User created event published, message ID: ${messageId}`);
  } catch (error) {
    console.error('Failed to publish user created event:', error);
    // Don't throw the error to prevent affecting the main flow
  }
}