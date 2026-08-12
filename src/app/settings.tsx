import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme, ThemeKey, THEMES, THEME_LABELS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { safeBack } from '@/lib/navigation';

const CLUB_CODE = 'RONIN-2026';
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'contact@roninbjj.fr';

const THEME_SWATCHES: Record<ThemeKey, string> = {
  sumi: '#0A0A0A',
  light: '#F5F2ED',
  navy: '#080D1A',
  forest: '#080F0A',
  slate: '#0C0E10',
};

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

type ProfileVisibility = 'members' | 'coaches' | 'private';
type Settings = {
  notifyCoach: boolean;
  notifyMessages: boolean;
  notifyCompetitions: boolean;
  notifyCarpools: boolean;
  shareGrade: boolean;
  sharePalmares: boolean;
  profileVisibility: ProfileVisibility;
};

type Dialog = 'password' | 'delete' | 'leave' | null;

const DEFAULT_SETTINGS: Settings = {
  notifyCoach: true,
  notifyMessages: true,
  notifyCompetitions: true,
  notifyCarpools: false,
  shareGrade: true,
  sharePalmares: true,
  profileVisibility: 'members',
};

const VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  members: 'Les membres',
  coaches: 'Les coachs',
  private: 'Moi uniquement',
};

function Toggle({ value, onChange, t }: { value: boolean; onChange: (v: boolean) => void; t: Theme }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[toggleSt(t).pill, { backgroundColor: value ? t.crimson : 'transparent', borderColor: value ? t.crimson : t.hairlineStrong }]}
      onPress={() => onChange(!value)}
    >
      <View style={[toggleSt(t).dot, { marginLeft: value ? 'auto' : 2, marginRight: value ? 2 : 'auto' }]} />
    </Pressable>
  );
}

function toggleSt(t: Theme) {
  return StyleSheet.create({
    pill: { width: 44, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
    dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
  });
}

export default function SettingsScreen() {
  const { theme: t, themeKey, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Settings>('/api/settings'),
      api.get<{ phone?: string | null }>('/api/profile'),
    ])
      .then(([data, profile]) => {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setPhone(profile.phone ?? '');
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoadingSettings(false));
  }, [user]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const previous = settings[key];
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage('');
    try {
      await api.put('/api/settings', { [key]: value });
    } catch (e: any) {
      setSettings((current) => ({ ...current, [key]: previous }));
      setMessage(e.message);
    }
  };

  const cycleVisibility = () => {
    const values: ProfileVisibility[] = ['members', 'coaches', 'private'];
    const index = values.indexOf(settings.profileVisibility);
    void updateSetting('profileVisibility', values[(index + 1) % values.length]);
  };

  const openDialog = (next: Exclude<Dialog, null>) => {
    setDialog(next);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setDialogError('');
  };

  const closeDialog = () => {
    if (!busy) setDialog(null);
  };

  const submitDialog = async () => {
    if (!dialog || busy) return;
    setDialogError('');

    if (dialog === 'password') {
      if (!currentPassword) return setDialogError('Saisis ton mot de passe actuel.');
      if (newPassword.length < 8) return setDialogError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      if (newPassword !== confirmPassword) return setDialogError('Les nouveaux mots de passe ne correspondent pas.');
    }
    if (dialog === 'delete' && !currentPassword) {
      return setDialogError('Le mot de passe actuel est obligatoire.');
    }

    setBusy(true);
    try {
      if (dialog === 'password') {
        const result = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });
        if (result.error) throw new Error(result.error.message);
        setMessage('Mot de passe modifié.');
        setDialog(null);
      } else if (dialog === 'delete') {
        const result = await authClient.deleteUser(currentPassword);
        if (result.error) throw new Error(result.error.message);
        setDialog(null);
        await signOut();
      } else {
        await api.post('/api/settings/leave-club', {});
        setDialog(null);
        await signOut();
      }
    } catch (e: any) {
      const invalidPassword = String(e.message).toLowerCase().includes('password');
      setDialogError(invalidPassword ? 'Mot de passe incorrect.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyClubCode = async () => {
    const copied = await Clipboard.setStringAsync(CLUB_CODE);
    setMessage(copied ? 'Code du club copié.' : 'Impossible de copier le code.');
  };

  const contactSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Signalement application Ronin Fight Team')}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else setMessage(`Contacte-nous à ${SUPPORT_EMAIL}.`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => safeBack('/(tabs)/profil')}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>PARAMÈTRES</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {!!message && <Text style={styles.message}>{message}</Text>}

        <Text style={styles.sectionLabel}>APPARENCE</Text>
        <View style={styles.card}>
          <View style={styles.swatchRow}>
            {THEME_KEYS.map((key) => {
              const isActive = themeKey === key;
              return (
                <Pressable key={key} style={styles.swatchCell} onPress={() => setTheme(key)}>
                  <View style={[styles.swatchCircle, { backgroundColor: THEME_SWATCHES[key] }, isActive && styles.swatchCircleActive]} />
                  <Text style={[styles.swatchLabel, isActive && styles.swatchLabelActive]}>
                    {THEME_LABELS[key].toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>MON COMPTE</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="person-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Modifier le profil</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => openDialog('password')}>
            <Ionicons name="key-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Changer le mot de passe</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <View style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={18} color={t.textDim} />
            <Text style={[styles.rowLabel, { color: t.textDim }]}>Téléphone : {phone || 'Non renseigné'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {loadingSettings ? (
            <ActivityIndicator color={t.crimson} style={{ margin: 18 }} />
          ) : (
            <>
              <SettingToggle label="Annonces du coach" value={settings.notifyCoach} onChange={(value) => void updateSetting('notifyCoach', value)} t={t} styles={styles} border />
              <SettingToggle label="Nouveaux messages" value={settings.notifyMessages} onChange={(value) => void updateSetting('notifyMessages', value)} t={t} styles={styles} border />
              <SettingToggle label="Compétitions & stages" value={settings.notifyCompetitions} onChange={(value) => void updateSetting('notifyCompetitions', value)} t={t} styles={styles} border />
              <SettingToggle label="Covoiturages" value={settings.notifyCarpools} onChange={(value) => void updateSetting('notifyCarpools', value)} t={t} styles={styles} />
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>CONFIDENTIALITÉ</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={cycleVisibility}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Profil visible par</Text>
            <Text style={styles.rowValue}>{VISIBILITY_LABELS[settings.profileVisibility]}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <SettingToggle label="Partager mon grade" value={settings.shareGrade} onChange={(value) => void updateSetting('shareGrade', value)} t={t} styles={styles} border />
          <SettingToggle label="Partager mon palmarès" value={settings.sharePalmares} onChange={(value) => void updateSetting('sharePalmares', value)} t={t} styles={styles} />
        </View>

        <Text style={styles.sectionLabel}>CLUB</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={copyClubCode}>
            <Ionicons name="link-outline" size={18} color={t.textDim} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Code d’invitation du club</Text>
            <Text style={styles.clubCode}>{CLUB_CODE}</Text>
            <Ionicons name="copy-outline" size={17} color={t.textMute} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => openDialog('leave')}>
            <Ionicons name="warning-outline" size={18} color={t.crimson} />
            <Text style={[styles.rowLabel, { color: t.crimson }]}>Quitter le club</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>ASSISTANCE</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={contactSupport}>
            <Ionicons name="bug-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Signaler un problème</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push({ pathname: '/legal', params: { document: 'terms' } })}>
            <Ionicons name="document-text-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Conditions d’utilisation</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push({ pathname: '/legal', params: { document: 'privacy' } })}>
            <Ionicons name="shield-checkmark-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Politique de confidentialité</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Se déconnecter</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => openDialog('delete')}>
            <Ionicons name="trash-outline" size={18} color={t.crimson} />
            <Text style={[styles.rowLabel, { color: t.crimson }]}>Supprimer mon compte</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>RONIN FIGHT TEAM · v1.0 (BETA)</Text>
          <View style={styles.footerSub}>
            <Text style={styles.footerSubText}>Fabriqué avec </Text>
            <Ionicons name="heart" size={12} color={t.crimson} />
            <Text style={styles.footerSubText}> pour le tatami</Text>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={closeDialog}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {dialog === 'password' ? 'CHANGER LE MOT DE PASSE' : dialog === 'delete' ? 'SUPPRIMER LE COMPTE' : 'QUITTER LE CLUB'}
            </Text>
            <Text style={styles.modalBody}>
              {dialog === 'delete'
                ? 'Cette action est définitive et supprimera tes données personnelles.'
                : dialog === 'leave'
                  ? 'Ton accès membre sera désactivé. Un coach devra te réactiver pour revenir.'
                  : 'Le changement sera appliqué immédiatement sur ton compte.'}
            </Text>

            {(dialog === 'password' || dialog === 'delete') && (
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Mot de passe actuel"
                placeholderTextColor={t.textMute}
                secureTextEntry
              />
            )}
            {dialog === 'password' && (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={t.textMute}
                  secureTextEntry
                />
                <TextInput
                  style={styles.modalInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor={t.textMute}
                  secureTextEntry
                />
              </>
            )}
            {!!dialogError && <Text style={styles.modalError}>{dialogError}</Text>}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={closeDialog} disabled={busy}>
                <Text style={styles.modalCancelText}>ANNULER</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={submitDialog} disabled={busy}>
                {busy
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.modalConfirmText}>{dialog === 'password' ? 'MODIFIER' : 'CONFIRMER'}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingToggle({ label, value, onChange, t, styles, border = false }: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  t: Theme;
  styles: ReturnType<typeof makeStyles>;
  border?: boolean;
}) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Toggle value={value} onChange={onChange} t={t} />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: t.hairline },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: { flex: 1, fontFamily: FONTS.display, fontSize: 18, color: t.bone, fontWeight: '900', letterSpacing: 0.5 },
    scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 6 },
    message: { fontFamily: FONTS.body, fontSize: 12, color: t.crimson, paddingVertical: 8 },
    sectionLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2, marginTop: 10, marginBottom: 4 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: t.hairline },
    rowLabel: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500', flex: 1 },
    rowArrow: { fontSize: 18, color: t.textMute },
    rowValue: { fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 0.5 },
    clubCode: { fontFamily: FONTS.mono, fontSize: 12, color: t.crimson, fontWeight: '700', letterSpacing: 1 },
    swatchRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 16, gap: 8 },
    swatchCell: { flex: 1, alignItems: 'center', gap: 6 },
    swatchCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: t.hairlineStrong },
    swatchCircleActive: { borderColor: t.crimson, borderWidth: 3 },
    swatchLabel: { fontFamily: FONTS.mono, fontSize: 7.5, color: t.textMute, letterSpacing: 0.5 },
    swatchLabelActive: { color: t.crimson, fontWeight: '700' },
    footer: { alignItems: 'center', marginTop: 16, gap: 6 },
    footerText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
    footerSub: { flexDirection: 'row', alignItems: 'center' },
    footerSubText: { fontFamily: FONTS.body, fontSize: 12, color: t.textMute },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: { width: '100%', maxWidth: 440, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 4, padding: 20, gap: 12 },
    modalTitle: { fontFamily: FONTS.display, fontSize: 17, color: t.bone, fontWeight: '900', letterSpacing: 1 },
    modalBody: { fontFamily: FONTS.body, fontSize: 13, color: t.textDim, lineHeight: 19 },
    modalInput: { backgroundColor: t.ink, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 12, color: t.bone, fontFamily: FONTS.body },
    modalError: { fontFamily: FONTS.body, fontSize: 12, color: t.crimson },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: { flex: 1, height: 42, borderWidth: 1, borderColor: t.hairlineStrong, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
    modalCancelText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1 },
    modalConfirm: { flex: 1, height: 42, backgroundColor: t.crimson, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
    modalConfirmText: { fontFamily: FONTS.mono, fontSize: 10, color: '#FFFFFF', fontWeight: '700', letterSpacing: 1 },
  });
}
