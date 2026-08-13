import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function WelcomeScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user, profileStatus, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    const isCoach = user?.role === 'coach' || user?.role === 'admin';
    if (isCoach || profileStatus === 'approved') {
      router.replace('/(tabs)/accueil');
    } else if (profileStatus === 'pending' || profileStatus === null) {
      router.replace('/(auth)/pending');
    }
  }, [user, profileStatus, loading]);

  if (loading || user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.crimson} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background accent glow */}
      <View style={styles.glow} />

      <SafeAreaView style={styles.safe}>
        <Image
          accessibilityLabel="Logo Ronin Fight Team"
          contentFit="contain"
          source={require('../../assets/images/rft-mark.png')}
          style={styles.logo}
        />

        <View style={styles.body}>
          {/* Headline */}
          <View style={styles.headline}>
            <Text style={styles.eyebrow}>EST. RONIN FIGHT TEAM</Text>
            <Text style={styles.h1}>
              {'L\'ESPRIT\nDU RONIN.\n'}
              <Text style={styles.h1Accent}>UN SEUL TATAMI.</Text>
            </Text>
            <Text style={styles.sub}>
              L’app du club. Annonces, compétitions, covoiturages. Sans WhatsApp, sans bruit.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => router.replace('/(tabs)/accueil')}
            >
              <Text style={styles.btnPrimaryText}>ENTRER AU DOJO</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
              onPress={() => router.replace('/(tabs)/accueil')}
            >
              <Text style={styles.btnSecondaryText}>J’AI UN CODE CLUB</Text>
            </Pressable>

            <Text style={styles.footer}>BJJ · LUTTE · MMA — MONTATAIRE · OISE</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.ink,
    },
    glow: {
      position: 'absolute',
      top: -120,
      right: -160,
      width: 520,
      height: 520,
      borderRadius: 260,
      backgroundColor: t.crimson,
      opacity: 0.12,
    },
    safe: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: 20,
    },
    logo: { width: 112, height: 93, marginTop: 16 },
    body: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingBottom: 32,
      gap: 40,
    },
    headline: {
      gap: 20,
    },
    eyebrow: {
      fontFamily: FONTS.mono,
      fontSize: 11,
      color: t.crimson,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
    h1: {
      fontFamily: FONTS.display,
      fontSize: 64,
      lineHeight: 60,
      color: t.bone,
      fontWeight: '900',
      letterSpacing: -0.5,
      textTransform: 'uppercase',
    },
    h1Accent: {
      color: t.crimson,
    },
    sub: {
      fontFamily: FONTS.body,
      fontSize: 14,
      lineHeight: 22,
      color: t.textDim,
      maxWidth: 280,
    },
    actions: {
      gap: 12,
    },
    btnPrimary: {
      height: 54,
      backgroundColor: t.crimson,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryText: {
      fontFamily: FONTS.display,
      fontSize: 18,
      fontWeight: '900',
      color: t.bone,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    btnSecondary: {
      height: 54,
      backgroundColor: 'transparent',
      borderRadius: 2,
      borderWidth: 1,
      borderColor: t.hairlineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondaryText: {
      fontFamily: FONTS.display,
      fontSize: 18,
      fontWeight: '900',
      color: t.bone,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    footer: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      color: t.textMute,
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
      marginTop: 6,
    },
  });
}
