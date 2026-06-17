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
  is_private: boolean;
  is_locked: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
}

export interface Announcement {
  id: string;
  author_id: string;
  tag: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
}

export interface CalendarEvent {
  id: string;
  type: 'cours' | 'compet' | 'stage';
  title: string;
  eventDate: string;
  eventTime: string | null;
  place: string | null;
  createdAt: string;
}

export interface Competition {
  id: string;
  name: string;
  location: string | null;
  comp_date: string;
  category: string | null;
  comp_type: 'GI' | 'NO-GI' | 'OPEN' | null;
  registration_deadline: string | null;
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
}

export interface Carpool {
  id: string;
  driver_id: string;
  competition_id: string | null;
  departure_city: string;
  departure_at: string;
  seats_total: number;
  seats_taken: number;
  cost_per_seat: number;
  notes: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'first_name' | 'last_name'>;
  competitions?: Pick<Competition, 'name' | 'comp_date'>;
}

export interface PalmaresEntry {
  id: string;
  userId: string;
  competitionName: string;
  compDate: string;
  weightClass: string | null;
  compType: 'GI' | 'NO-GI' | null;
  place: number;
  notes: string | null;
  createdAt: string;
}
