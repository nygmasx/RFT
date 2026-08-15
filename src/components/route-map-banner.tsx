import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

type Point = LatLng & { label?: string };
type Props = {
  destination: Point;
  origin?: Point;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  showCaption?: boolean;
};

type RouteResponse = {
  coordinates: LatLng[];
  distanceKm: number;
  durationMinutes: number;
};

function initialRegion(points: LatLng[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.5, 0.025),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.5, 0.025),
  };
}

export default function RouteMapBanner({ destination, origin, style, compact = false, showCaption = true }: Props) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const mapRef = useRef<MapView>(null);
  const [routeState, setRouteState] = useState<{ key: string; value: RouteResponse | null } | null>(null);
  const originLatitude = origin?.latitude;
  const originLongitude = origin?.longitude;
  const originLabel = origin?.label;
  const routeKey = originLatitude != null && originLongitude != null
    ? `${originLatitude}:${originLongitude}:${destination.latitude}:${destination.longitude}`
    : null;
  const fallbackPoints = useMemo(() => originLatitude != null && originLongitude != null ? [
    { latitude: originLatitude, longitude: originLongitude, label: originLabel },
    { latitude: destination.latitude, longitude: destination.longitude, label: destination.label },
  ] : [{ latitude: destination.latitude, longitude: destination.longitude, label: destination.label }], [
    destination.latitude, destination.longitude, destination.label,
    originLatitude, originLongitude, originLabel,
  ]);
  const route = routeKey && routeState?.key === routeKey ? routeState.value : null;
  const loading = Boolean(routeKey && routeState?.key !== routeKey);
  const displayedPoints = route?.coordinates?.length ? route.coordinates : fallbackPoints;

  useEffect(() => {
    if (originLatitude == null || originLongitude == null || !routeKey) return;
    let active = true;
    const query = [
      `startLatitude=${originLatitude}`,
      `startLongitude=${originLongitude}`,
      `endLatitude=${destination.latitude}`,
      `endLongitude=${destination.longitude}`,
    ].join('&');
    api.get<RouteResponse>(`/api/geolocation/route?${query}`)
      .then((value) => { if (active) setRouteState({ key: routeKey, value }); })
      .catch(() => { if (active) setRouteState({ key: routeKey, value: null }); });
    return () => { active = false; };
  }, [destination.latitude, destination.longitude, originLatitude, originLongitude, routeKey]);

  useEffect(() => {
    if (displayedPoints.length > 1) {
      mapRef.current?.fitToCoordinates(displayedPoints, {
        edgePadding: { top: 30, right: 30, bottom: compact ? 38 : 48, left: 30 },
        animated: false,
      });
    }
  }, [compact, displayedPoints]);

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <MapView
        initialRegion={initialRegion(fallbackPoints)}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        pitchEnabled={false}
        pointerEvents="none"
        ref={mapRef}
        rotateEnabled={false}
        scrollEnabled={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        userInterfaceStyle="dark"
        zoomEnabled={false}
      >
        {origin && <Marker coordinate={origin} pinColor={t.bone} title="Départ" description={origin.label} />}
        <Marker coordinate={destination} pinColor={t.crimson} title="Destination" description={destination.label} />
        {displayedPoints.length > 1 && (
          <Polyline coordinates={displayedPoints} strokeColor={t.crimson} strokeWidth={4} />
        )}
      </MapView>
      <View pointerEvents="none" style={styles.shade} />
      {loading && <ActivityIndicator color={t.crimson} style={styles.loader} />}
      {showCaption && (
        <View pointerEvents="none" style={styles.caption}>
          <Ionicons name={origin ? 'car-sport-outline' : 'location-outline'} size={14} color={t.crimson} />
          <Text numberOfLines={1} style={styles.captionText}>
            {route
              ? `${route.distanceKm.toFixed(1)} KM · ${Math.round(route.durationMinutes)} MIN`
              : destination.label ?? 'LOCALISATION'}
          </Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { height: 150, overflow: 'hidden', backgroundColor: t.elevated, borderRadius: 3 },
  compact: { height: 112 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,7,8,0.16)' },
  loader: { position: 'absolute', top: 12, right: 12 },
  caption: {
    position: 'absolute', left: 10, right: 10, bottom: 9, minHeight: 28,
    paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(7,7,7,0.82)', borderRadius: 2,
  },
  captionText: { flex: 1, color: '#F7F3EC', fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1 },
});
