import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailHeader, IconButton } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { safeBack } from '@/lib/navigation';

type Phase = 'idle' | 'prepare' | 'work' | 'rest' | 'finished';

type TimerConfig = {
  prepare: number;
  work: number;
  rest: number;
  rounds: number;
  warning: number;
};

type Preset = TimerConfig & { id: string; label: string; detail: string };

const STORAGE_KEY = '@rft_coach_timer';

const PRESETS: Preset[] = [
  { id: 'bjj', label: 'BJJ', detail: '5 × 5 min', prepare: 10, work: 300, rest: 60, rounds: 5, warning: 10 },
  { id: 'mma', label: 'MMA', detail: '3 × 5 min', prepare: 10, work: 300, rest: 60, rounds: 3, warning: 10 },
  { id: 'boxe', label: 'BOXE', detail: '5 × 3 min', prepare: 10, work: 180, rest: 60, rounds: 5, warning: 10 },
  { id: 'sparring', label: 'SPARRING', detail: '8 × 5 min', prepare: 15, work: 300, rest: 60, rounds: 8, warning: 10 },
];

const DEFAULT_CONFIG: TimerConfig = {
  prepare: 10,
  work: 300,
  rest: 60,
  rounds: 5,
  warning: 10,
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'PRÊT',
  prepare: 'PRÉPARATION',
  work: 'COMBAT',
  rest: 'RÉCUPÉRATION',
  finished: 'TERMINÉ',
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export default function AdminTimerScreen() {
  useKeepAwake('rft-coach-timer');

  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState('bjj');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(DEFAULT_CONFIG.prepare);
  const [segmentDuration, setSegmentDuration] = useState(DEFAULT_CONFIG.prepare);
  const [isRunning, setIsRunning] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const transitionRef = useRef(false);
  const warningKeyRef = useRef('');

  const roundPlayer = useAudioPlayer(require('../../assets/sounds/timer-round.wav'), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const warningPlayer = useAudioPlayer(require('../../assets/sounds/timer-warning.wav'), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const finishPlayer = useAudioPlayer(require('../../assets/sounds/timer-finish.wav'), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });

  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
    });
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as { config?: TimerConfig; soundEnabled?: boolean };
          if (parsed.config) {
            setConfig(parsed.config);
            setRemaining(parsed.config.prepare);
            setSegmentDuration(parsed.config.prepare);
            setSelectedPreset('');
          }
          if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled);
        } catch {
          // Ignore an invalid local preference and keep the safe defaults.
        }
      })
      .finally(() => setPreferencesLoaded(true));
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ config, soundEnabled }));
  }, [config, preferencesLoaded, soundEnabled]);

  const playCue = useCallback(async (player: typeof roundPlayer) => {
    if (!soundEnabled) return;
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      // A timer must keep running even if the audio device is temporarily unavailable.
    }
  }, [soundEnabled]);

  const startSegment = useCallback((nextPhase: Phase, duration: number, nextRound: number) => {
    const safeDuration = Math.max(0, duration);
    setPhase(nextPhase);
    setRound(nextRound);
    setRemaining(safeDuration);
    setSegmentDuration(safeDuration);
    warningKeyRef.current = '';
    endAtRef.current = Date.now() + safeDuration * 1000;
    setIsRunning(true);
  }, []);

  const finishSession = useCallback(() => {
    endAtRef.current = null;
    setIsRunning(false);
    setPhase('finished');
    setRemaining(0);
    setSegmentDuration(0);
    Vibration.vibrate([0, 250, 120, 250]);
    void playCue(finishPlayer);
  }, [finishPlayer, playCue]);

  const advanceSegment = useCallback(() => {
    if (transitionRef.current) return;
    transitionRef.current = true;

    if (phase === 'prepare') {
      Vibration.vibrate(180);
      void playCue(roundPlayer);
      startSegment('work', config.work, 1);
    } else if (phase === 'work') {
      if (round >= config.rounds) {
        finishSession();
      } else if (config.rest > 0) {
        Vibration.vibrate(180);
        void playCue(roundPlayer);
        startSegment('rest', config.rest, round);
      } else {
        Vibration.vibrate(180);
        void playCue(roundPlayer);
        startSegment('work', config.work, round + 1);
      }
    } else if (phase === 'rest') {
      Vibration.vibrate(180);
      void playCue(roundPlayer);
      startSegment('work', config.work, round + 1);
    }

    transitionRef.current = false;
  }, [config.rest, config.rounds, config.work, finishSession, phase, playCue, round, roundPlayer, startSegment]);

  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'finished') return;

    const update = () => {
      if (endAtRef.current === null) return;
      const seconds = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        endAtRef.current = null;
        advanceSegment();
      }
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [advanceSegment, isRunning, phase]);

  useEffect(() => {
    if (!isRunning) return;

    if (
      phase === 'work' &&
      config.warning > 0 &&
      remaining === config.warning &&
      segmentDuration > config.warning
    ) {
      const key = `${round}-${remaining}`;
      if (warningKeyRef.current !== key) {
        warningKeyRef.current = key;
        Vibration.vibrate([0, 90, 70, 90]);
        void playCue(warningPlayer);
      }
    }
  }, [config.warning, isRunning, phase, playCue, remaining, round, segmentDuration, warningPlayer]);

  const startTimer = () => {
    setRound(1);
    if (config.prepare > 0) {
      void playCue(warningPlayer);
      startSegment('prepare', config.prepare, 1);
    } else {
      void playCue(roundPlayer);
      startSegment('work', config.work, 1);
    }
  };

  const togglePause = () => {
    if (isRunning) {
      if (endAtRef.current !== null) {
        setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      }
      endAtRef.current = null;
      setIsRunning(false);
      return;
    }

    endAtRef.current = Date.now() + remaining * 1000;
    setIsRunning(true);
  };

  const resetTimer = () => {
    endAtRef.current = null;
    setIsRunning(false);
    setPhase('idle');
    setRound(1);
    setRemaining(config.prepare);
    setSegmentDuration(config.prepare);
    warningKeyRef.current = '';
  };

  const confirmReset = () => {
    if (phase === 'idle' || phase === 'finished') return resetTimer();
    Alert.alert('Réinitialiser le timer ?', 'La séance en cours sera arrêtée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: resetTimer },
    ]);
  };

  const updateConfig = (key: keyof TimerConfig, delta: number, minimum: number, maximum: number) => {
    setSelectedPreset('');
    setConfig((current) => ({
      ...current,
      [key]: clamp(current[key] + delta, minimum, maximum),
    }));
  };

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setConfig({
      prepare: preset.prepare,
      work: preset.work,
      rest: preset.rest,
      rounds: preset.rounds,
      warning: preset.warning,
    });
  };

  const phaseColor = phase === 'prepare'
    ? t.gold
    : phase === 'rest'
      ? '#3B82F6'
      : phase === 'finished'
        ? '#22C55E'
        : t.crimson;
  const progress = phase === 'idle' ? 1 : segmentDuration > 0 ? remaining / segmentDuration : 0;
  const totalDuration = config.prepare + config.rounds * config.work + (config.rounds - 1) * config.rest;
  const active = phase !== 'idle' && phase !== 'finished';

  if (!isCoach) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.restricted}>Accès réservé aux coachs.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <DetailHeader eyebrow="Outil coach" title="ROUND TIMER" onBack={() => safeBack('/admin')} action={<IconButton icon={soundEnabled ? 'volume-high' : 'volume-mute'} label={soundEnabled ? 'Couper les sons du timer' : 'Activer les sons du timer'} accent={soundEnabled} onPress={() => setSoundEnabled((enabled) => !enabled)} />} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.timerPanel, { borderColor: phaseColor + '88' }]}>
          <View style={[styles.phasePill, { backgroundColor: phaseColor + '22', borderColor: phaseColor }]}>
            <Text style={[styles.phaseText, { color: phaseColor }]}>{PHASE_LABELS[phase]}</Text>
          </View>

          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.timerValue, { color: phaseColor }]}
          >
            {formatDuration(phase === 'idle' ? config.work : remaining)}
          </Text>

          <Text style={styles.roundLabel}>
            {phase === 'prepare'
              ? `ROUND 1 / ${config.rounds}`
              : phase === 'rest'
                ? `PROCHAIN ROUND ${Math.min(round + 1, config.rounds)} / ${config.rounds}`
                : phase === 'finished'
                  ? `${config.rounds} ROUNDS TERMINÉS`
                  : `ROUND ${round} / ${config.rounds}`}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: phaseColor, width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        {active ? (
          <View style={styles.runningControls}>
            <Pressable onPress={confirmReset} style={styles.secondaryControl}>
              <Ionicons name="refresh" size={22} color={t.textDim} />
              <Text style={styles.secondaryControlText}>RESET</Text>
            </Pressable>
            <Pressable onPress={togglePause} style={[styles.mainControl, { backgroundColor: phaseColor }]}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={32} color="#FFFFFF" />
              <Text style={styles.mainControlText}>{isRunning ? 'PAUSE' : 'REPRENDRE'}</Text>
            </Pressable>
            <Pressable onPress={advanceSegment} style={styles.secondaryControl}>
              <Ionicons name="play-skip-forward" size={22} color={t.textDim} />
              <Text style={styles.secondaryControlText}>SUIVANT</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>PRÉRÉGLAGES</Text>
                <Pressable onPress={() => void playCue(roundPlayer)} style={styles.testSoundButton}>
                  <Ionicons name="volume-medium-outline" size={14} color={t.crimson} />
                  <Text style={styles.testSoundText}>TEST SON</Text>
                </Pressable>
              </View>
              <View style={styles.presets}>
                {PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    onPress={() => applyPreset(preset)}
                    style={[styles.preset, selectedPreset === preset.id && styles.presetActive]}
                  >
                    <Text style={[styles.presetLabel, selectedPreset === preset.id && styles.presetLabelActive]}>{preset.label}</Text>
                    <Text style={styles.presetDetail}>{preset.detail}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RÉGLAGES</Text>
              <View style={styles.settingsGrid}>
                <TimerSetting
                  label="PRÉPARATION"
                  value={formatDuration(config.prepare)}
                  onMinus={() => updateConfig('prepare', -5, 0, 120)}
                  onPlus={() => updateConfig('prepare', 5, 0, 120)}
                  styles={styles}
                  t={t}
                />
                <TimerSetting
                  label="COMBAT"
                  value={formatDuration(config.work)}
                  onMinus={() => updateConfig('work', -30, 30, 900)}
                  onPlus={() => updateConfig('work', 30, 30, 900)}
                  styles={styles}
                  t={t}
                />
                <TimerSetting
                  label="REPOS"
                  value={formatDuration(config.rest)}
                  onMinus={() => updateConfig('rest', -10, 0, 300)}
                  onPlus={() => updateConfig('rest', 10, 0, 300)}
                  styles={styles}
                  t={t}
                />
                <TimerSetting
                  label="ROUNDS"
                  value={String(config.rounds)}
                  onMinus={() => updateConfig('rounds', -1, 1, 30)}
                  onPlus={() => updateConfig('rounds', 1, 1, 30)}
                  styles={styles}
                  t={t}
                />
                <TimerSetting
                  label="ALERTE"
                  value={formatDuration(config.warning)}
                  onMinus={() => updateConfig('warning', -5, 0, 60)}
                  onPlus={() => updateConfig('warning', 5, 0, 60)}
                  styles={styles}
                  t={t}
                />
              </View>
            </View>

            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>DURÉE TOTALE</Text>
                <Text style={styles.summaryValue}>{formatDuration(totalDuration)}</Text>
              </View>
              <Text style={styles.summaryMeta}>{config.rounds} rounds · alerte à {config.warning}s</Text>
            </View>

            <Pressable onPress={startTimer} style={styles.startButton}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>{phase === 'finished' ? 'NOUVELLE SÉANCE' : 'LANCER LE TIMER'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TimerSetting({ label, value, onMinus, onPlus, styles, t }: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  styles: ReturnType<typeof makeStyles>;
  t: Theme;
}) {
  return (
    <View style={styles.settingCard}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControls}>
        <Pressable accessibilityLabel={`Réduire ${label.toLowerCase()}`} onPress={onMinus} style={styles.stepButton}>
          <Ionicons name="remove" size={18} color={t.textDim} />
        </Pressable>
        <Text style={styles.settingValue}>{value}</Text>
        <Pressable accessibilityLabel={`Augmenter ${label.toLowerCase()}`} onPress={onPlus} style={styles.stepButton}>
          <Ionicons name="add" size={18} color={t.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    center: { alignItems: 'center', justifyContent: 'center' },
    restricted: { color: t.textMute, fontSize: 14 },
    safeArea: { borderBottomWidth: 1, borderBottomColor: t.hairline },
    scroll: { padding: Layout.gutter, paddingBottom: 42, gap: 18 },
    timerPanel: {
      minHeight: 300, backgroundColor: t.surface, borderWidth: 1, borderRadius: Radii.xl,
      padding: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    phasePill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
    phaseText: { fontFamily: FONTS.mono, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
    timerValue: {
      fontFamily: FONTS.mono, fontSize: 92, lineHeight: 104, fontWeight: '900',
      letterSpacing: -6, marginTop: 10, width: '100%', textAlign: 'center',
    },
    roundLabel: { fontFamily: FONTS.mono, fontSize: 12, color: t.textDim, letterSpacing: 2, fontWeight: '700' },
    progressTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: t.elevated, marginTop: 26, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    runningControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    mainControl: {
      width: 138, height: 76, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center',
    },
    mainControlText: { fontFamily: FONTS.mono, fontSize: 10, color: '#FFFFFF', letterSpacing: 1.5, fontWeight: '800' },
    secondaryControl: {
      width: 82, height: 66, borderRadius: Radii.md, borderWidth: 1, borderColor: t.hairlineStrong,
      backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    secondaryControlText: { fontFamily: FONTS.mono, fontSize: 8, color: t.textDim, letterSpacing: 1 },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    testSoundButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 8 },
    testSoundText: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.crimson, letterSpacing: 1 },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    preset: {
      width: '48.5%', borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md,
      backgroundColor: t.surface, padding: 12,
    },
    presetActive: { borderColor: t.crimson, backgroundColor: t.crimson + '16' },
    presetLabel: { fontFamily: FONTS.display, fontSize: 14, fontWeight: '900', color: t.textDim, letterSpacing: 1 },
    presetLabelActive: { color: t.crimson },
    presetDetail: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, marginTop: 3 },
    settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    settingCard: {
      width: '48.5%', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.md, padding: 10, gap: 8,
    },
    settingLabel: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.textMute, letterSpacing: 1.2 },
    settingControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepButton: {
      width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated,
    },
    settingValue: { fontFamily: FONTS.mono, fontSize: 15, fontWeight: '800', color: t.bone },
    summary: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      borderTopWidth: 1, borderTopColor: t.hairline, paddingTop: 14,
    },
    summaryLabel: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.textMute, letterSpacing: 1.4 },
    summaryValue: { fontFamily: FONTS.mono, fontSize: 21, fontWeight: '900', color: t.bone, marginTop: 2 },
    summaryMeta: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute },
    startButton: {
      minHeight: 58, borderRadius: Radii.md, backgroundColor: t.crimson, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    startButtonText: { fontFamily: FONTS.display, fontSize: 15, fontWeight: '900', color: t.onAccent, letterSpacing: 2 },
  });
}
