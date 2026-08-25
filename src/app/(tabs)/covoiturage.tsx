import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Chip, EmptyState, IconButton, ScreenHeader, SegmentedControl } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useCarpools } from '@/hooks/useCarpools';
import { api } from '@/lib/api';
import RouteMapBanner from '@/components/route-map-banner';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';

function initials(name: string) {
  return name.split(' ').map((s) => s[0]).join('');
}

function formatDeparture(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'DATE À CONFIRMER';
  const day = d.toLocaleString('fr-FR', { weekday: 'short' }).toUpperCase();
  const date = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${date}/${month} · ${hours}:${mins}`;
}

export default function CovoiturageScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: carpools, loading, myPassengerCarpoolIds, currentUserId, joinCarpool, leaveCarpool, refetch } = useCarpools();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  const logistics = carpools.reduce((summary, carpool) => ({
    availableSeats: summary.availableSeats + Math.max(0, carpool.seats_total - carpool.seats_taken),
    fullCount: summary.fullCount + (carpool.seats_taken >= carpool.seats_total ? 1 : 0),
  }), { availableSeats: 0, fullCount: 0 });

  const contactDriver = async (carpoolId: string) => {
    try {
      const contact = await api.get<{ name: string; phone: string }>(`/api/carpools/${carpoolId}/contact`);
      Alert.alert(contact.name, contact.phone, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => void Linking.openURL(`tel:${contact.phone.replace(/\s/g, '')}`) },
        { text: 'SMS', onPress: () => void Linking.openURL(`sms:${contact.phone.replace(/\s/g, '')}`) },
      ]);
    } catch (error: any) { Alert.alert('Contact indisponible', error.message); }
  };

  const deleteCarpool = (carpoolId: string, eventName: string, swipeable: SwipeableMethods) => {
    Alert.alert(
      'Supprimer ce covoiturage ?',
      `Le trajet pour « ${eventName} » et toutes ses réservations seront supprimés.`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => swipeable.close() },
        {
          text: 'Supprimer', style: 'destructive', onPress: () => {
            setDeletingId(carpoolId);
            void api.delete(`/api/carpools/${carpoolId}`)
              .then(() => refetch())
              .catch((error: Error) => Alert.alert('Suppression impossible', error.message))
              .finally(() => {
                swipeable.close();
                setDeletingId(null);
              });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow={isCoach ? 'Espace coach · Logistique' : `${String(carpools.length).padStart(2, '0')} trajets disponibles`}
          title={isCoach ? 'TRAJETS ÉQUIPE' : 'COVOITURAGE'}
          action={<IconButton accent icon="add" label="Proposer un covoiturage" onPress={() => router.push('/create-carpool')} />}
        />

        {/* Mode switcher */}
        <View style={styles.modeSwitcher}>
          <SegmentedControl
            items={['JE CHERCHE', 'JE PROPOSE']}
            selectedIndex={0}
            onChange={(index) => { if (index === 1) router.push('/create-carpool'); }}
          />
        </View>
      </SafeAreaView>

      {/* Route summary */}
      {isCoach ? (
        <View style={styles.coachLogistics}>
          <View style={styles.coachLogisticsHeader}>
            <View style={styles.coachLogisticsIcon}><Ionicons name="navigate-circle-outline" size={24} color={t.crimson} /></View>
            <View style={{ flex: 1 }}><Text style={styles.mapTitle}>SUIVI LOGISTIQUE</Text><Text style={styles.mapCopy}>Anticipe les places manquantes pour les prochaines compétitions.</Text></View>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/mes-covoiturages')}><Text style={styles.coachLogisticsAction}>MES TRAJETS →</Text></Pressable>
          </View>
          <View style={styles.coachLogisticsStats}>
            <View style={styles.coachLogisticsStat}><Text style={styles.coachLogisticsValue}>{carpools.length}</Text><Text style={styles.coachLogisticsLabel}>TRAJETS</Text></View>
            <View style={styles.coachLogisticsStat}><Text style={styles.coachLogisticsValue}>{logistics.availableSeats}</Text><Text style={styles.coachLogisticsLabel}>PLACES LIBRES</Text></View>
            <View style={[styles.coachLogisticsStat, { borderRightWidth: 0 }]}><Text style={[styles.coachLogisticsValue, logistics.fullCount > 0 && { color: t.crimson }]}>{logistics.fullCount}</Text><Text style={styles.coachLogisticsLabel}>COMPLETS</Text></View>
          </View>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <Ionicons name="navigate-circle-outline" size={32} color={t.crimson} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mapTitle}>TRAJETS DU CLUB</Text>
            <Text style={styles.mapCopy}>Les coordonnées du conducteur sont accessibles uniquement après réservation.</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView alwaysBounceVertical bounces decelerationRate="normal" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true); void refetch().finally(() => setRefreshing(false));
        }} />}>
          {carpools.length === 0 ? (
            <EmptyState
              icon="car-sport-outline"
              title="Aucun trajet proposé"
              message="Sois le premier à organiser le déplacement du club."
              actionLabel="PROPOSER UN TRAJET"
              onAction={() => router.push('/create-carpool')}
            />
          ) : null}
          {carpools.map((r) => {
            const driverName = r.profiles
              ? `${r.profiles.first_name} ${r.profiles.last_name}`
              : 'Conducteur';
            const eventName = r.competitions?.name ?? r.calendar_event?.title ?? 'Événement';
            const destination = r.competitions
              ? {
                latitude: r.competitions.latitude,
                longitude: r.competitions.longitude,
                label: r.competitions.location ?? eventName,
              }
              : {
                latitude: r.calendar_event?.latitude,
                longitude: r.calendar_event?.longitude,
                label: r.calendar_event?.place ?? eventName,
              };
            const available = r.seats_total - r.seats_taken;
            const isFull = available <= 0;

            const isDriver = r.driver_id === currentUserId;
            const isPassenger = myPassengerCarpoolIds.has(r.id);

            let btnLabel: string;
            let btnDisabled = false;
            let btnStyle = styles.reserveBtn;
            let btnTextStyle = styles.reserveText;

            if (isDriver) {
              btnLabel = 'GLISSER POUR GÉRER';
              btnDisabled = true;
              btnStyle = { ...styles.reserveBtn, ...styles.reserveBtnFull };
              btnTextStyle = { ...styles.reserveText, ...styles.reserveTextFull };
            } else if (isPassenger) {
              btnLabel = 'SE DÉSINSCRIRE';
              btnStyle = { ...styles.reserveBtn, ...styles.reserveBtnSecondary };
              btnTextStyle = { ...styles.reserveText, ...styles.reserveTextSecondary };
            } else if (isFull) {
              btnLabel = 'COMPLET';
              btnDisabled = true;
              btnStyle = { ...styles.reserveBtn, ...styles.reserveBtnFull };
              btnTextStyle = { ...styles.reserveText, ...styles.reserveTextFull };
            } else {
              btnLabel = 'REJOINDRE';
            }

            const card = (
              <View style={styles.card}>
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>{initials(driverName)}</Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <Text style={styles.driverTime}>{formatDeparture(r.departure_at)}</Text>
                  </View>
                  <Chip label={eventName.toUpperCase()} tone="accent" />
                </View>

                {r.departure_latitude != null && r.departure_longitude != null
                  && destination.latitude != null && destination.longitude != null && (
                  <RouteMapBanner
                    compact
                    style={styles.routeMap}
                    origin={{
                      latitude: r.departure_latitude,
                      longitude: r.departure_longitude,
                      label: r.departure_city,
                    }}
                    destination={{
                      latitude: destination.latitude,
                      longitude: destination.longitude,
                      label: destination.label,
                    }}
                  />
                )}

                <View style={styles.routeRow}>
                  <View style={styles.routeIcons}>
                    <View style={styles.routeCircle} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeSquare} />
                  </View>
                  <View style={styles.routeLabels}>
                    <Text style={styles.routeCity}>{r.departure_city}</Text>
                    <Text style={styles.routeCity}>{eventName}</Text>
                  </View>
                  <View style={styles.seats}>
                    <Text style={styles.seatCount}>
                      {available}
                      <Text style={styles.seatTotal}>/{r.seats_total}</Text>
                    </Text>
                    <Text style={styles.seatLabel}>PLACES</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={btnStyle}
                  disabled={btnDisabled}
                  onPress={() => {
                    if (btnDisabled) return;
                    if (isPassenger) void leaveCarpool(r.id);
                    else void joinCarpool(r.id);
                  }}
                >
                  <Text style={btnTextStyle}>{btnLabel}</Text>
                </Pressable>
                {(isPassenger || isDriver) && (
                  <Pressable accessibilityRole="button" style={styles.contactBtn} onPress={() => void contactDriver(r.id)}>
                    <Text style={styles.contactText}>CONTACTER LE CONDUCTEUR</Text>
                  </Pressable>
                )}
              </View>
            );

            if (!isDriver) return <View key={r.id}>{card}</View>;

            return (
              <Swipeable
                key={r.id}
                containerStyle={styles.swipeContainer}
                friction={1.7}
                rightThreshold={42}
                overshootRight={false}
                onSwipeableOpen={() => haptics.medium()}
                renderRightActions={(_progress, _translation, swipeable) => (
                  <View style={styles.swipeActions}>
                    <Pressable
                      accessibilityLabel="Modifier le covoiturage"
                      style={[styles.swipeAction, styles.editAction]}
                      onPress={() => {
                        swipeable.close();
                        router.push({ pathname: '/create-carpool', params: { id: r.id } });
                      }}
                    >
                      <Ionicons name="pencil" size={21} color="#FFFFFF" />
                      <Text style={styles.swipeActionLabel}>MODIFIER</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Supprimer le covoiturage"
                      disabled={deletingId === r.id}
                      style={[styles.swipeAction, styles.deleteAction]}
                      onPress={() => deleteCarpool(r.id, eventName, swipeable)}
                    >
                      {deletingId === r.id
                        ? <ActivityIndicator color="#FFFFFF" size="small" />
                        : <Ionicons name="trash-outline" size={22} color="#FFFFFF" />}
                      <Text style={styles.swipeActionLabel}>SUPPR.</Text>
                    </Pressable>
                  </View>
                )}
              >
                {card}
              </Swipeable>
            );
          })}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    modeSwitcher: { paddingHorizontal: Layout.gutter, paddingBottom: 16 },
    mapWrap: {
      marginHorizontal: 20, marginBottom: 16, minHeight: 92, padding: 16,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.lg, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    mapTitle: { fontFamily: FONTS.display, color: t.bone, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    mapCopy: { fontFamily: FONTS.body, color: t.textMute, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
    coachLogistics: { marginHorizontal: Layout.gutter, marginBottom: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.crimson + '55', borderRadius: Radii.lg, overflow: 'hidden' },
    coachLogisticsHeader: { minHeight: 76, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    coachLogisticsIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '16' },
    coachLogisticsAction: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800' },
    coachLogisticsStats: { minHeight: 54, flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.hairline },
    coachLogisticsStat: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline },
    coachLogisticsValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' },
    coachLogisticsLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.7, marginTop: 2 },
    mapBg: { ...StyleSheet.absoluteFill, backgroundColor: t.surface },
    mapDojo: { position: 'absolute', left: 60, top: 70, alignItems: 'center' },
    mapDojoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.crimson },
    mapDest: { position: 'absolute', right: 50, top: 50, alignItems: 'center' },
    mapDestPin: { width: 10, height: 14, backgroundColor: t.bone, borderRadius: 1 },
    mapLabel: { fontFamily: FONTS.mono, fontSize: 8, color: t.bone, letterSpacing: 2, marginTop: 4 },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Layout.gutter, gap: 12 },
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.lg, padding: 16,
    },
    swipeContainer: { borderRadius: Radii.lg, overflow: 'hidden' },
    swipeActions: { width: 140, flexDirection: 'row' },
    swipeAction: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
    editAction: { backgroundColor: '#2563EB' },
    deleteAction: { backgroundColor: '#DC2626' },
    swipeActionLabel: { color: '#FFFFFF', fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800', letterSpacing: 0.5 },
    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    driverAvatar: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center',
    },
    driverInitials: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900' },
    driverInfo: { flex: 1 },
    routeMap: { marginBottom: 10 },
    driverName: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    driverTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.2, marginTop: 1 },
    routeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderTopWidth: 1, borderTopColor: t.hairline,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    routeIcons: { alignItems: 'center', gap: 2, paddingTop: 2 },
    routeCircle: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: t.bone },
    routeLine: { width: 1, height: 16, backgroundColor: t.hairlineStrong },
    routeSquare: { width: 8, height: 8, borderRadius: 1, backgroundColor: t.crimson },
    routeLabels: { flex: 1, gap: 4 },
    routeCity: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, fontWeight: '600' },
    seats: { alignItems: 'flex-end' },
    seatCount: { fontFamily: FONTS.display, fontSize: 18, color: t.bone, fontWeight: '900' },
    seatTotal: { color: t.textMute, fontSize: 13 },
    seatLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, letterSpacing: 1.5 },
    reserveBtn: {
      marginTop: 12, minHeight: Layout.touchTarget, borderRadius: Radii.md,
      backgroundColor: t.crimson, borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center',
    },
    reserveBtnSecondary: { backgroundColor: 'transparent' },
    reserveBtnFull: { backgroundColor: t.elevated, borderColor: t.hairline },
    reserveText: {
      fontFamily: FONTS.display, fontSize: 12, fontWeight: '900',
      color: t.onAccent, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    reserveTextSecondary: { color: t.crimson },
    reserveTextFull: { color: t.textMute },
    contactBtn: { minHeight: Layout.touchTarget, paddingTop: 10, alignItems: 'center', justifyContent: 'center' },
    contactText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textDim, letterSpacing: 1.2 },
  });
}
