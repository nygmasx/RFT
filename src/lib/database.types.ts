export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  member_id: string | null;
  category: string | null;
  weight_class: string | null;
  stance: string | null;
  phone: string | null;
  avatar_url: string | null;
  joined_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BeltRecord {
  id: string;
  userId: string;
  color: 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';
  stripes: number;
  promotedBy: string | null;
  promotedDate: string | null;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  body: string;
  messageType: 'text' | 'image' | 'audio';
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaDurationMs: number | null;
  replyToId: string | null;
  replyTo: {
    id: string;
    userId: string;
    body: string;
    messageType: 'text' | 'image' | 'audio';
    authorName: string;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    reacted: boolean;
  }[];
  mentionedUserIds: string[];
  readCount: number;
  recipientCount: number;
  createdAt: string;
  updatedAt: string | null;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
}

export interface MentionableMember {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface MessageReceiptDetails {
  messageId: string;
  recipientCount: number;
  readCount: number;
  recipients: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    status: 'read' | 'delivered';
    distributedAt: string;
    readAt: string | null;
  }[];
}

export interface Announcement {
  id: string;
  authorId: string;
  tag: string | null;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
  isRead: boolean;
  reactions: AnnouncementReaction[];
}

export interface AnnouncementReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface AnnouncementReply {
  id: string;
  announcementId: string;
  userId: string;
  body: string;
  createdAt: string;
  profiles: Pick<Profile, 'first_name' | 'last_name'>;
}

export interface CalendarEvent {
  id: string;
  type: 'cours' | 'compet' | 'stage';
  title: string;
  eventDate: string;
  eventTime: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface Competition {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  comp_date: string;
  category: string | null;
  comp_type: 'GI' | 'NO-GI' | 'OPEN' | null;
  importance: 'local' | 'regional' | 'national' | 'international' | 'major';
  registration_deadline: string | null;
  registration_url: string | null;
  status: 'open' | 'soon' | 'closed';
  created_at: string;
}

export interface Registration {
  id: string;
  user_id: string;
  competition_id: string;
  weight_class: string | null;
  status: 'confirmé' | 'en_attente' | 'annulé';
  created_at: string;
  competitions?: Competition;
  result?: PalmaresEntry | null;
}

export interface Carpool {
  id: string;
  driver_id: string;
  competition_id: string | null;
  calendar_event_id: string | null;
  departure_city: string;
  departure_latitude: number | null;
  departure_longitude: number | null;
  departure_at: string;
  seats_total: number;
  seats_taken: number;
  cost_per_seat: number;
  notes: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
  competitions?: Pick<Competition, 'name' | 'comp_date' | 'location' | 'latitude' | 'longitude'>;
  calendar_event?: Pick<CalendarEvent, 'title' | 'eventDate' | 'eventTime' | 'place' | 'latitude' | 'longitude' | 'type'>;
}

export interface PalmaresEntry {
  id: string;
  userId: string;
  competitionId: string | null;
  competitionName: string;
  compDate: string;
  weightClass: string | null;
  compType: 'GI' | 'NO-GI' | null;
  place: number;
  resultStage: 'champion' | 'finalist' | 'semifinal' | 'quarterfinal' | 'round_of_16' | 'round_of_32' | 'participant';
  validationStatus: 'pending' | 'approved' | 'rejected';
  submissionSource: 'athlete' | 'coach';
  beltColor: 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire' | null;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}
