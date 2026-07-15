import { Trip } from '../../trips/entities/trip.entity';
import { User } from '../../users/entities/user.entity';
export declare class ChatMessage {
    id: string;
    trip_id: string;
    sender_id: string;
    message: string;
    message_type: string;
    created_at: Date;
    trip: Trip;
    sender: User;
}
