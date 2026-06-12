export const CHANNELS = [
  { id: 'annonces', name: 'Annonces du dojo', last: 'Coach Y. · Stage samedi 10h…', t: '12m', u: 0, lock: false, top: true, members: 87 },
  { id: 'adultes-compet', name: 'Adultes — Compétiteurs', last: 'Driss · Je suis chaud pour Paris', t: '34m', u: 3, lock: false, top: false, members: 23 },
  { id: 'adultes-loisirs', name: 'Adultes — Loisirs', last: "Léa · Quelqu'un demain 19h30 ?", t: '1h', u: 1, lock: false, top: false, members: 41 },
  { id: 'parents-enfants', name: 'Parents — Enfants 6-12', last: "Maïté · Bonjour, est-ce qu'un parent…", t: '2h', u: 12, lock: false, top: false, members: 28 },
  { id: 'parents-ados', name: 'Parents — Ados 13-17', last: 'Coach S. · Photos du tournoi 👇', t: '1j', u: 0, lock: false, top: false, members: 19 },
  { id: 'coachs', name: 'Coachs (privé)', last: 'Yannick · Planning de juin', t: '3j', u: 0, lock: true, top: false, members: 4 },
];

export interface Announcement {
  id: string;
  type: string;
  tag: string;
  pinned: boolean;
  title: string;
  author: string;
  date: string;
  body: string;
  reactions: Array<{ emoji: string; count: number }>;
  replies: number;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1', type: 'stage', tag: 'ANNONCE COACH', pinned: true,
    title: 'STAGE INTENSIF SAMEDI 06.06 — 10H',
    author: 'Coach Yannick', date: 'Mer. 28 mai 2026 · 09:14',
    body: "Bonjour à tous,\n\nJe vous annonce un stage intensif ce samedi 6 juin de 10h à 13h sur le tatami principal.\n\nTravail au sol et debout, tous niveaux. Prévoir:\n• Kimono (GI obligatoire)\n• Bouteille d'eau + serviette\n• Protège-dents\n\nMerci de confirmer votre présence en répondant à ce message avant vendredi soir.",
    reactions: [{ emoji: '✊', count: 14 }, { emoji: '🔥', count: 9 }, { emoji: '👍', count: 22 }],
    replies: 8,
  },
  {
    id: '2', type: 'compet', tag: 'COMPÉTITION', pinned: false,
    title: 'OPEN BJJ DE PARIS — 01 JUIN',
    author: 'Coach Sophie', date: 'Lun. 26 mai 2026 · 11:30',
    body: "L'Open BJJ de Paris approche !\n\n14 athlètes du club sont inscrits. Rappels importants:\n• Rendez-vous au club à 06:45\n• Pesée à 08:00 — kimono réglementaire\n• Catégories GI uniquement\n• Covoiturages disponibles (voir salon Compétiteurs)\n\nForza Ronin ! 🤙",
    reactions: [{ emoji: '💪', count: 18 }, { emoji: '🏆', count: 11 }],
    replies: 12,
  },
];

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'cours' | 'compet' | 'stage';
  title: string;
  time: string;
  place: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'e1', date: '2026-05-28', type: 'cours', title: 'Cours adultes — No-Gi', time: '19:30', place: 'Tatami 2' },
  { id: 'e2', date: '2026-05-30', type: 'cours', title: 'Cours enfants 6-12', time: '10:00', place: 'Tatami 1' },
  { id: 'e3', date: '2026-05-30', type: 'cours', title: 'Cours ados', time: '14:00', place: 'Tatami 1' },
  { id: 'e4', date: '2026-06-01', type: 'compet', title: 'Open BJJ de Paris', time: '07:30', place: 'Halle Carpentier · Paris' },
  { id: 'e5', date: '2026-06-03', type: 'cours', title: 'Cours adultes', time: '19:30', place: 'Tatami 2' },
  { id: 'e6', date: '2026-06-06', type: 'stage', title: 'Stage intensif — Coach Yannick', time: '10:00', place: 'Tatami principal · 3h' },
  { id: 'e7', date: '2026-06-10', type: 'cours', title: 'Cours adultes — No-Gi', time: '19:30', place: 'Tatami 2' },
  { id: 'e8', date: '2026-06-14', type: 'cours', title: 'Cours enfants & ados', time: '10:00', place: 'Tatami 1' },
  { id: 'e9', date: '2026-06-15', type: 'compet', title: 'Championnat France No-Gi', time: '08:00', place: 'Halle Vauban · Lille' },
  { id: 'e10', date: '2026-06-20', type: 'stage', title: 'Stage visiteur — Ceinture Noire', time: '11:00', place: 'Tatami principal · 2h30' },
  { id: 'e11', date: '2026-07-06', type: 'compet', title: 'Reims Grappling Cup', time: '09:00', place: 'Complexe René Tys · Reims' },
];

export interface ChannelMessage {
  id: string;
  author: string;
  badge?: string;
  me?: boolean;
  time: string;
  text: string;
}

export const CHANNEL_MESSAGES: Record<string, ChannelMessage[]> = {
  'annonces': [
    { id: '1', author: 'Coach Yannick', badge: 'COACH', me: false, time: '09:14', text: 'Stage intensif ce samedi 6 juin de 10h à 13h. Tous niveaux, GI obligatoire. Confirmez votre présence !' },
    { id: '2', author: 'Coach Sophie', badge: 'COACH', me: false, time: '11:30', text: 'Open BJJ de Paris le 1er juin — 14 inscrits du club. Rendez-vous à 06:45 au dojo pour les départs groupés. 💪' },
  ],
  'adultes-compet': [
    { id: '1', author: 'Coach Yannick', badge: 'COACH', me: false, time: '08:00', text: 'Rappel : pesée Paris dimanche à 08:00. Soyez au club à 06:45 au plus tard.' },
    { id: '2', author: 'Driss', me: false, time: '10:22', text: "Je suis chaud pour Paris ! Quelqu'un a besoin d'un covoit depuis Creil ?" },
    { id: '3', author: 'Karim', me: false, time: '10:35', text: 'Moi ! Je passe te prendre vers 6h30 ?' },
    { id: '4', author: 'Driss', me: false, time: '10:38', text: 'Perfect, je t\'attends devant chez moi 👊' },
    { id: '5', author: 'Moi', me: true, time: '11:02', text: 'Je prends aussi 2 places si besoin, départ Senlis 06:30' },
  ],
  'adultes-loisirs': [
    { id: '1', author: 'Léa', me: false, time: '17:45', text: "Quelqu'un vient demain soir 19h30 ? Je veux pas y aller seule 😅" },
    { id: '2', author: 'Thomas', me: false, time: '17:52', text: 'Oui je serai là !' },
    { id: '3', author: 'Moi', me: true, time: '18:10', text: 'Présent aussi 💪' },
  ],
  'parents-enfants': [
    { id: '1', author: 'Coach Sophie', badge: 'COACH', me: false, time: '09:14', text: 'Bonjour à tous, photos officielles du tournoi disponibles 👇' },
    { id: '2', author: 'Maïté D.', me: false, time: '14:02', text: "Merci coach ! Question : est-ce qu'un parent va déjà à Paris dimanche ? Je peux pas y aller mais Lina veut absolument participer." },
    { id: '3', author: 'Karim B.', me: false, time: '14:08', text: 'Je peux prendre 3 enfants depuis Creil, départ 7h15.' },
    { id: '4', author: 'Moi', me: true, time: '14:11', text: 'Super merci Karim, je te confirme demain matin ✊' },
  ],
  'parents-ados': [
    { id: '1', author: 'Coach S.', badge: 'COACH', me: false, time: '09:00', text: 'Photos du tournoi 👇 Bravo à tous les ados, belle prestation !' },
    { id: '2', author: 'Isabelle', me: false, time: '10:15', text: 'Merci coach, Nathan est super fier de sa médaille 🥈' },
  ],
  'coachs': [
    { id: '1', author: 'Yannick', badge: 'COACH', me: false, time: '08:30', text: 'Planning de juin : stage le 6, visiteur le 20. Je prépare le programme cette semaine.' },
    { id: '2', author: 'Sophie', badge: 'COACH', me: false, time: '09:00', text: "Ok parfait. Pour les inscriptions Paris, j'ai encore 3 créneaux libres si des adultes loisirs veulent se lancer." },
  ],
};

export interface Registration {
  d: string;
  m: string;
  y: string;
  name: string;
  loc: string;
  cat: string;
  type: string;
  status: 'confirmé' | 'en_attente';
  covoit: string | null;
}

export const MY_REGISTRATIONS: Registration[] = [
  {
    d: '01', m: 'JUIN', y: '2026', name: 'Open BJJ de Paris',
    loc: 'Halle Carpentier · Paris', cat: '-77 KG', type: 'GI',
    status: 'confirmé', covoit: 'Karim B. · Creil 07:15',
  },
  {
    d: '15', m: 'JUIN', y: '2026', name: 'Championnat France No-Gi',
    loc: 'Halle Vauban · Lille', cat: '-77 KG', type: 'NO-GI',
    status: 'en_attente', covoit: null,
  },
];

export interface PastComp {
  d: string;
  m: string;
  y: string;
  name: string;
  cat: string;
  type: string;
  place: number;
  medal: string;
}

export const PAST_COMPETITIONS: PastComp[] = [
  { d: '17', m: 'NOV', y: '2025', name: 'Open BJJ Lille', cat: '-77 KG', type: 'GI', place: 1, medal: 'OR' },
  { d: '06', m: 'JUIL', y: '2025', name: 'Reims Grappling Cup', cat: 'ABS.', type: 'NO-GI', place: 3, medal: 'BRONZE' },
  { d: '15', m: 'JUIN', y: '2025', name: 'Champ. France No-Gi', cat: '-77 KG', type: 'NO-GI', place: 2, medal: 'ARG' },
  { d: '22', m: 'MARS', y: '2025', name: 'Open BJJ Lyon', cat: '-77 KG', type: 'GI', place: 4, medal: 'TOP 4' },
  { d: '02', m: 'JUIN', y: '2024', name: 'Open BJJ de Paris', cat: '-77 KG', type: 'GI', place: 1, medal: 'OR' },
];

export interface UpcomingComp {
  id: string;
  d: string;
  m: string;
  y: string;
  name: string;
  loc: string;
  cat: string;
  inscr: number;
  cloture: string;
  covoit: number;
  status: 'open' | 'soon';
}

export const UPCOMING_COMPS: UpcomingComp[] = [
  {
    id: 'paris-01-06', d: '01', m: 'JUIN', y: '2026', name: 'Open BJJ de Paris',
    loc: 'Halle Carpentier · Paris', cat: 'GI · IBJJF Rules',
    inscr: 14, cloture: 'Mardi 27 minuit', covoit: 3, status: 'open',
  },
  {
    id: 'france-15-06', d: '15', m: 'JUIN', y: '2026', name: 'Championnat France No-Gi',
    loc: 'Halle Vauban · Lille', cat: 'NO-GI · ADCC',
    inscr: 6, cloture: 'Lundi 09 juin', covoit: 1, status: 'open',
  },
  {
    id: 'reims-06-07', d: '06', m: 'JUIL', y: '2026', name: 'Reims Grappling Cup',
    loc: 'Complexe René Tys · Reims', cat: 'OPEN ABSOLUTE',
    inscr: 2, cloture: '20 juin', covoit: 0, status: 'soon',
  },
];

// ─── Profile data ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  memberId: string;
  category: string;
  weightClass: string;
  stance: string;
  phone: string;
  email: string;
  joinDate: string;
}

export const MY_PROFILE: UserProfile = {
  id: '137',
  firstName: 'Driss',
  lastName: 'Moreau',
  initials: 'DM',
  memberId: '#137',
  category: 'Adultes',
  weightClass: '-77 KG',
  stance: 'Gaucher',
  phone: '+33 6 12 34 56 78',
  email: 'driss.moreau@email.fr',
  joinDate: 'Septembre 2021',
};

export interface BeltInfo {
  color: 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';
  colorLabel: string;
  stripes: number;
  promotedBy: string;
  promotedDate: string;
  durationLabel: string;
}

export const MY_BELT: BeltInfo = {
  color: 'marron',
  colorLabel: 'MARRON',
  stripes: 2,
  promotedBy: 'Coach Yannick',
  promotedDate: '12.03.2024',
  durationLabel: '2 ANS 2 MOIS',
};

export interface ActivityEntry {
  date: string;
  type: 'cours' | 'stage';
  title: string;
  duration: string;
}

export const MY_ACTIVITY: ActivityEntry[] = [
  { date: '27.05.2026', type: 'cours',  title: 'Cours adultes — GI',       duration: '1h30' },
  { date: '25.05.2026', type: 'cours',  title: 'Cours adultes — No-Gi',    duration: '1h30' },
  { date: '20.05.2026', type: 'cours',  title: 'Cours adultes — GI',       duration: '1h30' },
  { date: '17.05.2026', type: 'stage',  title: 'Stage visiteur Rodrigo T.', duration: '2h' },
  { date: '14.05.2026', type: 'cours',  title: 'Cours adultes — No-Gi',    duration: '1h30' },
  { date: '10.05.2026', type: 'cours',  title: 'Cours adultes — GI',       duration: '1h30' },
  { date: '04.05.2026', type: 'cours',  title: 'Cours adultes — GI',       duration: '1h30' },
  { date: '28.04.2026', type: 'cours',  title: 'Cours adultes — No-Gi',    duration: '1h30' },
];

// Monthly attendance for the bar chart (last 6 months)
export const MONTHLY_ATTENDANCE = [
  { month: 'DÉC', count: 6 },
  { month: 'JAN', count: 8 },
  { month: 'FÉV', count: 7 },
  { month: 'MAR', count: 9 },
  { month: 'AVR', count: 8 },
  { month: 'MAI', count: 5 },
];

export interface CarpoolEntry {
  id: string;
  role: 'driver' | 'passenger';
  event: string;
  date: string;
  route: string;
  passengers?: number;
  driver?: string;
  status: 'completed' | 'upcoming';
}

export const MY_CARPOOLS: CarpoolEntry[] = [
  { id: 'c1', role: 'driver',    event: 'Open BJJ Lille',       date: '17.11.2025', route: 'Creil → Lille',  passengers: 3, status: 'completed' },
  { id: 'c2', role: 'passenger', event: 'Champ. France No-Gi',  date: '15.06.2025', route: 'Senlis → Lille', driver: 'Yannis L.', status: 'completed' },
  { id: 'c3', role: 'driver',    event: 'Open BJJ Lyon',        date: '22.03.2025', route: 'Creil → Lyon',   passengers: 2, status: 'completed' },
  { id: 'c4', role: 'driver',    event: 'Open BJJ de Paris',    date: '01.06.2026', route: 'Creil → Paris',  passengers: 2, status: 'upcoming' },
];

export const PALMARES_FULL = [
  { y: '2026', date: '01.06.2026', name: 'Open BJJ de Paris',    cat: '-77 KG', type: 'GI',    place: 1 },
  { y: '2025', date: '15.06.2025', name: 'Champ. France No-Gi',  cat: '-77 KG', type: 'NO-GI', place: 2 },
  { y: '2025', date: '06.07.2025', name: 'Reims Grappling Cup',  cat: 'ABS.',   type: 'NO-GI', place: 3 },
  { y: '2025', date: '22.03.2025', name: 'Open BJJ Lyon',        cat: '-77 KG', type: 'GI',    place: 4 },
  { y: '2024', date: '17.11.2024', name: 'Open BJJ Lille',       cat: '-77 KG', type: 'GI',    place: 1 },
  { y: '2024', date: '02.06.2024', name: 'Open BJJ de Paris',    cat: '-77 KG', type: 'GI',    place: 1 },
  { y: '2024', date: '14.04.2024', name: 'No-Gi Reims',          cat: '-77 KG', type: 'NO-GI', place: 2 },
  { y: '2024', date: '10.02.2024', name: 'Beauvais Open',        cat: '-83 KG', type: 'GI',    place: 3 },
];
