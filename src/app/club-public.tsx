import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

type PublicData = {
  profile: { name: string; description: string | null; address: string | null; phone: string | null; email: string | null; website: string | null; disciplines: string[]; scheduleSummary: string | null; joinButtonLabel: string; joinFormId: string | null } | null;
  coaches: { id: string; firstName: string; lastName: string; avatarUrl: string | null; category: string | null }[];
  plans: { id: string; name: string; description: string | null; priceCents: number; currency: string; billingInterval: string; checkoutUrl: string | null; features: string[] }[];
  joinForm: { id: string; title: string; description: string | null; fields: { key: string; label: string; type?: string; required?: boolean }[] } | null;
};

type TrialSession = { id: string; title: string; discipline: string; category: string | null; sessionDate: string; startTime: string; place: string | null; trialAllowed: boolean };

export default function ClubPublicScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [data, setData] = useState<PublicData | null>(null);
  const [sessions, setSessions] = useState<TrialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [trialSessionId, setTrialSessionId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<PublicData>('/api/club/public'),
      api.get<TrialSession[]>('/api/club/public/sessions'),
    ]).then(([publicData, sessionRows]) => { setData(publicData); setSessions(sessionRows.filter((row) => row.trialAllowed)); })
      .catch((error) => setNotice(error.message)).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!data?.joinForm) return;
    setSending(true); setNotice('');
    try {
      await api.post(`/api/club/public/join/${data.joinForm.id}`, { firstName, lastName, email, phone, answers });
      setNotice('Demande envoyée. Le club te recontactera rapidement.');
      setShowForm(false); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setAnswers({});
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Envoi impossible'); }
    finally { setSending(false); }
  };

  const submitTrial = async () => {
    if (!trialSessionId) return setNotice('Choisis un cours.');
    setSending(true); setNotice('');
    try {
      await api.post(`/api/club/public/trials/${trialSessionId}`, { firstName, lastName, email, phone });
      setNotice('Cours d’essai réservé. Le coach voit désormais ton inscription.');
      setShowTrial(false); setFirstName(''); setLastName(''); setEmail(''); setPhone('');
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Réservation impossible'); }
    finally { setSending(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={t.crimson} /></View>;
  const profile = data?.profile;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <Pressable style={styles.back} onPress={() => safeBack('/')}><Ionicons name="chevron-back" size={22} color={t.bone} /></Pressable>
      </SafeAreaView>
      <FormScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/rft-mark.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.eyebrow}>MONTATAIRE · OISE</Text>
          <Text style={styles.title}>{profile?.name?.toUpperCase() ?? 'RONIN FIGHT TEAM'}</Text>
          <Text style={styles.description}>{profile?.description ?? 'Jiu-Jitsu Brésilien · Grappling · No-Gi'}</Text>
          <View style={styles.disciplines}>{profile?.disciplines.map((discipline) => <View key={discipline} style={styles.discipline}><Text style={styles.disciplineText}>{discipline}</Text></View>)}</View>
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <Section label="LE CLUB" styles={styles} />
        <View style={styles.infoCard}>
          {!!profile?.address && <Info icon="location-outline" text={profile.address} action={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(profile.address!)}`)} styles={styles} t={t} />}
          {!!profile?.phone && <Info icon="call-outline" text={profile.phone} action={() => Linking.openURL(`tel:${profile.phone}`)} styles={styles} t={t} />}
          {!!profile?.email && <Info icon="mail-outline" text={profile.email} action={() => Linking.openURL(`mailto:${profile.email}`)} styles={styles} t={t} />}
          {!!profile?.scheduleSummary && <Info icon="time-outline" text={profile.scheduleSummary} styles={styles} t={t} />}
        </View>

        <Section label="LES COACHS" styles={styles} />
        <View style={styles.coaches}>{data?.coaches.map((coach) => <View key={coach.id} style={styles.coach}><View style={styles.avatar}>{coach.avatarUrl ? <Image source={{ uri: coach.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.initials}>{coach.firstName[0]}{coach.lastName[0]}</Text>}</View><Text style={styles.coachName}>{coach.firstName} {coach.lastName}</Text><Text style={styles.coachMeta}>{coach.category ?? 'COACH RFT'}</Text></View>)}</View>

        <Section label="FORMULES" styles={styles} />
        {data?.plans.map((plan) => <View key={plan.id} style={styles.plan}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: plan.currency }).format(plan.priceCents / 100)}</Text>{!!plan.description && <Text style={styles.planDescription}>{plan.description}</Text>}{plan.features.map((feature) => <Text key={feature} style={styles.feature}>✓ {feature}</Text>)}{!!plan.checkoutUrl && <Pressable style={styles.planLink} onPress={() => Linking.openURL(plan.checkoutUrl!)}><Text style={styles.planLinkText}>SOUSCRIRE EN LIGNE →</Text></Pressable>}</View>)}

        <Section label="COURS D’ESSAI" styles={styles} />
        {sessions.slice(0, 8).map((session) => <Pressable key={session.id} style={[styles.session, trialSessionId === session.id && styles.sessionActive]} onPress={() => { setTrialSessionId(session.id); setShowTrial(true); }}><View style={styles.flex}><Text style={styles.sessionTitle}>{session.title}</Text><Text style={styles.sessionMeta}>{new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()} · {session.startTime.slice(0, 5)} · {session.place ?? 'RFT'}</Text></View><Text style={styles.tryText}>ESSAYER →</Text></Pressable>)}
        {sessions.length === 0 && <Text style={styles.empty}>Les prochains créneaux d’essai seront bientôt publiés.</Text>}
        {showTrial && <View style={styles.form}>
          <Text style={styles.formTitle}>RÉSERVER MON ESSAI</Text>
          <Input placeholder="Prénom" value={firstName} onChangeText={setFirstName} styles={styles} t={t} />
          <Input placeholder="Nom" value={lastName} onChangeText={setLastName} styles={styles} t={t} />
          <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" styles={styles} t={t} />
          <Input placeholder="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" styles={styles} t={t} />
          <Pressable style={styles.primary} onPress={submitTrial} disabled={sending}>{sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>CONFIRMER L’ESSAI</Text>}</Pressable>
        </View>}

        {data?.joinForm && <>
          <Pressable style={styles.primary} onPress={() => setShowForm((value) => !value)}><Text style={styles.primaryText}>{showForm ? 'FERMER' : profile?.joinButtonLabel?.toUpperCase() ?? 'REJOINDRE LE CLUB'} →</Text></Pressable>
          {showForm && <View style={styles.form}>
            <Text style={styles.formTitle}>{data.joinForm.title}</Text>
            {!!data.joinForm.description && <Text style={styles.formDescription}>{data.joinForm.description}</Text>}
            <Input placeholder="Prénom" value={firstName} onChangeText={setFirstName} styles={styles} t={t} />
            <Input placeholder="Nom" value={lastName} onChangeText={setLastName} styles={styles} t={t} />
            <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" styles={styles} t={t} />
            <Input placeholder="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" styles={styles} t={t} />
            {data.joinForm.fields.map((field) => <Input key={field.key} placeholder={`${field.label}${field.required ? ' *' : ''}`} value={answers[field.key] ?? ''} onChangeText={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))} multiline={field.type === 'textarea'} styles={styles} t={t} />)}
            <Pressable style={styles.primary} onPress={submit} disabled={sending}>{sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>ENVOYER MA DEMANDE</Text>}</Pressable>
          </View>}
        </>}
        <Pressable style={styles.login} onPress={() => router.replace('/(auth)/login')}><Text style={styles.loginText}>DÉJÀ MEMBRE ? SE CONNECTER</Text></Pressable>
        <View style={{ height: 30 }} />
      </FormScrollView>
    </View>
  );
}

function Section({ label, styles }: { label: string; styles: ReturnType<typeof makeStyles> }) { return <Text style={styles.section}>{label}</Text>; }
function Info({ icon, text, action, styles, t }: { icon: keyof typeof Ionicons.glyphMap; text: string; action?: () => void; styles: ReturnType<typeof makeStyles>; t: Theme }) { return <Pressable style={styles.info} onPress={action} disabled={!action}><Ionicons name={icon} size={18} color={t.crimson} /><Text style={styles.infoText}>{text}</Text>{action && <Ionicons name="chevron-forward" size={16} color={t.textMute} />}</Pressable>; }
function Input({ styles, t, multiline, ...props }: { styles: ReturnType<typeof makeStyles>; t: Theme; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <TextInput {...props} multiline={multiline} placeholderTextColor={t.textMute} style={[styles.input, multiline && styles.textarea]} />; }

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.ink }, safe: { position: 'absolute', zIndex: 5, left: 16, top: 0 }, back: { width: Layout.touchTarget, height: Layout.touchTarget, borderRadius: Radii.round, backgroundColor: t.surface + 'DD', alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: Layout.gutter },
    hero: { alignItems: 'center', paddingTop: 34, paddingBottom: 24 }, logo: { width: 190, height: 160 }, eyebrow: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 2.2, marginTop: 8 }, title: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 32, textAlign: 'center', marginTop: 7 }, description: { color: t.textDim, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10, maxWidth: 330 },
    disciplines: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 }, discipline: { borderWidth: 1, borderColor: t.crimson, borderRadius: Radii.round, paddingHorizontal: 9, paddingVertical: 5 }, disciplineText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 }, notice: { padding: 12, color: t.success, borderWidth: 1, borderColor: t.success + '55', backgroundColor: t.success + '12', borderRadius: Radii.md, fontSize: 12 },
    section: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.8, marginTop: 22, marginBottom: 8 }, infoCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden' }, info: { minHeight: 55, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: t.hairline }, infoText: { color: t.bone, fontSize: 12.5, flex: 1 },
    coaches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, coach: { width: '48.8%', alignItems: 'center', padding: 15, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg }, avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.elevated, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, initials: { color: t.bone, fontWeight: '900' }, coachName: { color: t.bone, fontWeight: '800', fontSize: 12, marginTop: 9, textAlign: 'center' }, coachMeta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, marginTop: 3 }, flex: { flex: 1 },
    plan: { padding: 16, marginBottom: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg }, planName: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 17 }, planPrice: { color: t.crimson, fontFamily: FONTS.display, fontWeight: '900', fontSize: 27, marginTop: 7 }, planDescription: { color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: 8 }, feature: { color: t.textDim, fontSize: 11, marginTop: 6 }, planLink: { marginTop: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.hairline }, planLinkText: { color: t.crimson, fontFamily: FONTS.mono, fontWeight: '800', fontSize: 8 },
    session: { minHeight: 64, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md, marginBottom: 7 }, sessionActive: { borderColor: t.crimson }, sessionTitle: { color: t.bone, fontWeight: '800', fontSize: 13 }, sessionMeta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, marginTop: 5 }, tryText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800' }, empty: { color: t.textMute, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md, padding: 18, textAlign: 'center', fontSize: 12 },
    primary: { minHeight: 52, backgroundColor: t.crimson, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: t.onAccent, fontFamily: FONTS.display, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, form: { backgroundColor: t.surface, padding: 16, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg }, formTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 19, fontWeight: '900' }, formDescription: { color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 6 }, input: { minHeight: 50, color: t.bone, backgroundColor: t.ink, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md, marginTop: 10, paddingHorizontal: 12 }, textarea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' }, login: { alignItems: 'center', paddingVertical: 22 }, loginText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1.2, textDecorationLine: 'underline' },
  });
}
