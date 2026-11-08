import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

type Order = { id: string; amount: number; unit_price: number; status: string; buyer_id: string; seller_id: string; created_at: string; offer_id: string; payment_method_id: string };
type PaymentMethod = { bank_name: string; account_holder: string; account_number: string; ifsc: string; upi_id: string | null };
const money = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
const labels: Record<string, string> = { matched: 'PAYMENT PENDING', payment_submitted: 'VERIFY PAYMENT', completed: 'COMPLETED', disputed: 'UNDER REVIEW', cancelled: 'CANCELLED' };

export default function HomeScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [details, setDetails] = useState<Record<string, PaymentMethod>>({});
  const [utrs, setUtrs] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setOrders([]); setDetails({}); setLoading(false); return; }
    const { data, error } = await supabase.from('p2p_orders')
      .select('id,amount,unit_price,status,buyer_id,seller_id,created_at,offer_id,payment_method_id')
      .or('buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id)
      .order('created_at', { ascending: false }).limit(30);
    if (error) Alert.alert('Could not load orders', error.message);
    const rows = (data ?? []) as Order[];
    setOrders(rows);
    const pending = rows.filter(o => o.buyer_id === user.id && o.status === 'matched');
    const pairs = await Promise.all(pending.map(async o => {
      const { data: pm } = await supabase.from('payment_methods').select('bank_name,account_holder,account_number,ifsc,upi_id').eq('id', o.payment_method_id).maybeSingle();
      return pm ? [o.id, pm as PaymentMethod] as const : null;
    }));
    setDetails(Object.fromEntries(pairs.filter(Boolean) as [string, PaymentMethod][]));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const submitPayment = async (order: Order) => {
    if (!supabase) return;
    const utr = (utrs[order.id] ?? '').trim();
    if (utr.length < 6) { Alert.alert('UTR required', 'Enter the UTR/reference after making the bank payment.'); return; }
    setBusyId(order.id);
    const { error } = await supabase.rpc('submit_p2p_payment', { p_order_id: order.id, p_utr: utr, p_proof_path: null });
    setBusyId(null);
    if (error) Alert.alert('Submission failed', error.message);
    else { setUtrs(v => ({ ...v, [order.id]: '' })); Alert.alert('Payment submitted', 'Seller can now verify the actual bank credit.'); await load(); }
  };

  const confirmReceived = (order: Order) => Alert.alert('Confirm bank credit', 'Only confirm after checking your bank account and verifying the exact amount has arrived.', [
    { text: 'Go back', style: 'cancel' },
    { text: 'I verified — confirm', style: 'destructive', onPress: async () => {
      if (!supabase) return;
      setBusyId(order.id);
      const { error } = await supabase.rpc('confirm_p2p_payment', { p_order_id: order.id });
      setBusyId(null);
      if (error) Alert.alert('Not confirmed', error.message);
      else { Alert.alert('Order completed', 'Asset balance and transaction history updated.'); await load(); }
    } },
  ]);

  const cancelOrder = (order: Order) => Alert.alert('Cancel unpaid order?', 'Only cancel if you have NOT sent the bank payment. Reserved asset will be released.', [
    { text: 'Keep order', style: 'cancel' },
    { text: 'Cancel order', style: 'destructive', onPress: async () => {
      if (!supabase) return;
      setBusyId(order.id);
      const { error } = await supabase.rpc('cancel_p2p_order', { p_order_id: order.id });
      setBusyId(null);
      if (error) Alert.alert('Could not cancel', error.message);
      else { Alert.alert('Order cancelled', 'Reserved asset released.'); await load(); }
    } },
  ]);

  const submitDispute = async () => {
    if (!supabase || !disputeOrder || !reason.trim()) { Alert.alert('Reason required', 'Please describe the problem.'); return; }
    setBusyId(disputeOrder);
    const { error } = await supabase.rpc('raise_p2p_dispute', { p_order_id: disputeOrder, p_reason: reason.trim() });
    setBusyId(null);
    if (error) Alert.alert('Could not open dispute', error.message);
    else { setDisputeOrder(null); setReason(''); Alert.alert('Dispute opened', 'Order marked for review.'); await load(); }
  };

  return <View style={s.screen}>
    <View style={s.header}><View><Text style={s.kicker}>WALZ EXCHANGE</Text><Text style={s.brand}>WALZ<Text style={s.purple}>.</Text></Text></View><Text style={s.headerTag}>P2P WORKSPACE</Text></View>
    <Modal visible={Boolean(disputeOrder)} transparent animationType="fade" onRequestClose={() => setDisputeOrder(null)}>
      <View style={s.backdrop}><View style={s.modal}><Text style={s.modalTitle}>Report a problem</Text><Text style={s.muted}>Describe what happened. Never share passwords or OTPs.</Text>
        <TextInput multiline value={reason} onChangeText={setReason} placeholder="Describe the issue..." placeholderTextColor="#777b91" style={s.reason} />
        <View style={s.actions}><Pressable style={s.cancelBtn} onPress={() => setDisputeOrder(null)}><Text style={s.secondaryText}>GO BACK</Text></Pressable><Pressable style={s.primaryBtn} onPress={submitDispute}><Text style={s.primaryText}>{busyId ? 'SUBMITTING…' : 'SUBMIT DISPUTE'}</Text></Pressable></View>
      </View></View>
    </Modal>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#a99aff" />}>
      <View style={s.hero}><Text style={s.kicker}>PEER TO PEER</Text><Text style={s.heroTitle}>Trade with clarity.</Text><Text style={s.muted}>Pay the seller directly. Seller checks their actual bank credit before the asset is released to the buyer.</Text>
        <View style={s.steps}>{['Pay seller', 'Seller verifies', 'Asset credited'].map((v, i) => <View key={v} style={s.step}><Text style={s.kicker}>0{i + 1}</Text><Text style={s.stepText}>{v}</Text></View>)}</View>
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>Your orders</Text><Text style={s.muted}>{orders.length} RECORDS</Text></View>
      {!supabase ? <Empty title="Backend not configured" copy="Add the Supabase project URL and publishable key to the Expo environment." /> :
        loading ? <ActivityIndicator color="#a99aff" style={{ marginTop: 32 }} /> :
        !userId ? <Empty title="Sign in required" copy="Connect the WALZ authentication screen to view your private orders." /> :
        orders.length === 0 ? <Empty title="No orders yet" copy="Accepted trades will appear here with their live status." /> :
        orders.map(order => {
          const seller = order.seller_id === userId;
          const canVerify = seller && order.status === 'payment_submitted';
          const pm = details[order.id];
          return <View key={order.id} style={s.card}>
            <View style={s.row}><Text style={s.role}>{seller ? 'YOU ARE SELLER' : 'YOU ARE BUYER'}</Text><Text style={s.status}>{labels[order.status] ?? order.status.toUpperCase()}</Text></View>
            <Text style={s.amount}>{money(Number(order.amount))} <Text style={s.unit}>ASSET UNITS</Text></Text>
            <Text style={s.muted}>Rate ₹{money(Number(order.unit_price))} · #{order.id.slice(0, 8).toUpperCase()}</Text>
            {canVerify && <Pressable style={s.primaryBtnWide} disabled={busyId === order.id} onPress={() => confirmReceived(order)}><Text style={s.primaryText}>{busyId === order.id ? 'CHECKING…' : 'VERIFY BANK CREDIT'}</Text></Pressable>}
            {seller && order.status === 'matched' && <Text style={s.note}>Waiting for buyer to submit payment details.</Text>}
            {!seller && order.status === 'matched' && <View style={s.paymentBox}>
              <Text style={s.kicker}>PAY SELLER DIRECTLY</Text>
              {pm ? <>
                <Detail label="BANK" value={pm.bank_name} /><Detail label="ACCOUNT HOLDER" value={pm.account_holder} /><Detail label="ACCOUNT NUMBER" value={pm.account_number} /><Detail label="IFSC" value={pm.ifsc} />{pm.upi_id ? <Detail label="UPI ID" value={pm.upi_id} /> : null}
                <Text style={s.detailLabel}>PAYMENT REFERENCE / UTR</Text>
                <TextInput value={utrs[order.id] ?? ''} onChangeText={v => setUtrs(old => ({ ...old, [order.id]: v }))} placeholder="Enter UTR after paying" placeholderTextColor="#777b91" autoCapitalize="characters" style={s.input} />
                <Pressable style={s.primaryBtnWide} disabled={busyId === order.id} onPress={() => submitPayment(order)}><Text style={s.primaryText}>{busyId === order.id ? 'SUBMITTING…' : 'I HAVE PAID — SUBMIT UTR'}</Text></Pressable>
                <Text style={s.note}>Only submit after sending the exact amount from your bank/UPI app.</Text>
              </> : <Text style={s.note}>Seller payment details are unavailable. Contact support before sending money.</Text>}
            </View>}
            {order.status === 'matched' && <Pressable style={s.secondaryBtn} onPress={() => cancelOrder(order)}><Text style={s.secondaryText}>CANCEL UNPAID ORDER</Text></Pressable>}
            {(order.status === 'matched' || order.status === 'payment_submitted') && <Pressable style={s.disputeBtn} onPress={() => { setDisputeOrder(order.id); setReason(''); }}><Text style={s.disputeText}>REPORT A PROBLEM</Text></Pressable>}
            {order.status === 'payment_submitted' && !seller && <Text style={s.note}>Payment submitted. Waiting for seller verification.</Text>}
            {order.status === 'disputed' && <Text style={s.note}>Under review. Do not send more money or release assets.</Text>}
          </View>;
        })}
      <View style={s.notice}><Text style={s.noticeTitle}>Payment safety</Text><Text style={s.muted}>Never confirm from a screenshot or UTR alone. Check your actual bank statement and exact amount. WALZ does not transfer INR between bank accounts.</Text></View>
    </ScrollView>
  </View>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>; }
function Empty({ title, copy }: { title: string; copy: string }) { return <View style={s.empty}><Text style={s.emptyTitle}>{title}</Text><Text style={s.muted}>{copy}</Text></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090b12' }, header: { paddingTop: 58, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#202235' },
  kicker: { color: '#a99aff', fontSize: 9, letterSpacing: 2, fontWeight: '800' }, brand: { color: '#f6f6ff', fontSize: 29, fontWeight: '900', letterSpacing: 4 }, purple: { color: '#a99aff' }, headerTag: { color: '#c3c4d5', fontSize: 9, letterSpacing: 1 },
  content: { padding: 20, paddingBottom: 48 }, hero: { padding: 22, borderRadius: 24, backgroundColor: '#17162a', borderWidth: 1, borderColor: '#393253' }, heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 12 },
  muted: { color: '#a8aabd', fontSize: 12, lineHeight: 19, marginTop: 7 }, steps: { flexDirection: 'row', gap: 8, marginTop: 22 }, step: { flex: 1, borderTopWidth: 1, borderTopColor: '#51496d', paddingTop: 10 }, stepText: { color: '#e5e2f3', fontSize: 10, marginTop: 5 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 14 }, sectionTitle: { color: '#f5f5fc', fontSize: 19, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 28, borderRadius: 18, borderWidth: 1, borderColor: '#26283a', backgroundColor: '#10121d' }, emptyTitle: { color: '#f3f2fc', fontSize: 16, fontWeight: '700', marginBottom: 5 },
  card: { backgroundColor: '#11131f', borderWidth: 1, borderColor: '#2b2d40', borderRadius: 18, padding: 18, marginBottom: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, role: { color: '#a5a0bc', fontSize: 9, letterSpacing: 1, fontWeight: '800' }, status: { color: '#e2bd7a', fontSize: 9, fontWeight: '800' },
  amount: { color: '#fff', fontSize: 25, fontWeight: '800', marginTop: 15 }, unit: { color: '#999bb0', fontSize: 10 }, paymentBox: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#34364b' }, detailLabel: { color: '#858aa0', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 10 }, detailValue: { color: '#f1efff', fontSize: 13, fontWeight: '600', marginTop: 3 },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#3a3d55', borderRadius: 10, color: '#fff', padding: 12, fontSize: 13 }, primaryBtnWide: { backgroundColor: '#b5a8ff', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 }, primaryText: { color: '#0a0a13', fontWeight: '900', fontSize: 10, letterSpacing: .8 },
  secondaryBtn: { borderWidth: 1, borderColor: '#49445f', borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 12 }, secondaryText: { color: '#c5bddf', fontWeight: '800', fontSize: 10 }, disputeBtn: { borderWidth: 1, borderColor: '#68444a', borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 9 }, disputeText: { color: '#e6a6aa', fontWeight: '800', fontSize: 10 },
  note: { color: '#b6a9dc', fontSize: 11, marginTop: 12, lineHeight: 18 }, notice: { marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#574832', backgroundColor: '#1c1914' }, noticeTitle: { color: '#f0d29b', fontWeight: '800', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', justifyContent: 'center', padding: 22 }, modal: { backgroundColor: '#171827', borderWidth: 1, borderColor: '#45405e', borderRadius: 20, padding: 20 }, modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' }, reason: { minHeight: 110, textAlignVertical: 'top', marginTop: 16, borderWidth: 1, borderColor: '#3a3d55', borderRadius: 12, color: '#fff', padding: 12 }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#49445f', borderRadius: 11, padding: 13, alignItems: 'center' }, primaryBtn: { flex: 1, backgroundColor: '#b5a8ff', borderRadius: 11, padding: 13, alignItems: 'center' },
});
