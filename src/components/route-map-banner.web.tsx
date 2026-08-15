import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Point = { latitude: number; longitude: number; label?: string };
type Props = { destination: Point; origin?: Point; style?: StyleProp<ViewStyle>; compact?: boolean; showCaption?: boolean };

export default function RouteMapBanner({ destination, origin, style, compact }: Props) {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <Ionicons name={origin ? 'car-sport-outline' : 'location-outline'} size={26} color="#C8362D" />
      <Text numberOfLines={2} style={styles.text}>{destination.label ?? 'Localisation du trajet'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150, overflow: 'hidden', borderRadius: 3, backgroundColor: '#171514',
    alignItems: 'center', justifyContent: 'center', padding: 18, gap: 8,
  },
  compact: { height: 112 },
  text: { color: '#F7F3EC', fontSize: 12, textAlign: 'center' },
});
