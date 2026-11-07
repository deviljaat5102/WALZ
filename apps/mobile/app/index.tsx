import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return <View style={styles.container}><Text style={styles.eyebrow}>ONE PLATFORM · CONNECTED EXPERIENCES</Text><Text style={styles.title}>WALZ</Text><Text style={styles.subtitle}>Everything connected. Built around you.</Text><View style={styles.card}><Text style={styles.cardTitle}>Your workspace is taking shape</Text><Text style={styles.body}>The mobile app foundation is ready. Secure sign-in and your first product workflows will be added next.</Text></View></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#090b12' }, eyebrow: { color: '#a99fff', letterSpacing: 2, fontSize: 10, marginBottom: 18 }, title: { color: '#f5f7fb', fontSize: 58, fontWeight: '800', letterSpacing: 8 }, subtitle: { color: '#c2c7d2', fontSize: 18, marginTop: 12, lineHeight: 26 }, card: { marginTop: 48, borderWidth: 1, borderColor: '#302d49', backgroundColor: '#131321', borderRadius: 20, padding: 22 }, cardTitle: { color: '#f5f7fb', fontSize: 17, fontWeight: '700' }, body: { color: '#aab2c0', lineHeight: 22, marginTop: 10 } });
