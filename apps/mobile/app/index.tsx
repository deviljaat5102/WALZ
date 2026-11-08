import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

type Order = {
  id: string;
  amount: number;
  unit_price: number;
  status: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  offer_id: string;
};

const money = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
const statusLabel: Record<string, string> = {
  matched: 'PAYMENT PENDING',
  payment_submitted: 'VERIFY PAYMENT',
  completed: 'COMPLETED',
  disputed: 'UNDER REVIEW',
  cancelled: 'CANCELLED',
};

export default function HomeScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);\n  const [paymentDetails, setPaymentDetails] = useState<Record<string, {bank_name:string;account_holder:string;account_number:string;ifsc:string;upi_id:string|null}>>({});\n  const [utrs, setUtrs] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setOrders([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('p2p_orders')
      .select('id,amount,unit_price,status,buyer_id,seller_id,created_at,offer_id,payment_method_id')
      .or('buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) Alert.alert('Could not load orders', error.message);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const submitPayment = async (order: Order) => {
    if (!supabase) return;
    const utr = (utrs[order.id] ?? '').trim();
    if (utr.length < 6) { Alert.alert('UTR required', 'Enter the bank UTR/reference number after making the payment.'); return; }
    setBusyId(order.id);
    const { error } = await supabase.rpc('submit_p2p_payment', { p_order_id: order.id, p_utr: utr, p_proof_path: null });
    setBusyId(null);
    if (error) Alert.alert('Payment submission failed', error.message);
    else { Alert.alert('Payment submitted', 'The seller can now verify the bank credit.'); setUtrs(v => ({...v, [order.id]: ''})); await load(); }
  };

  const cancelOrder = (order: Order) => {
    Alert.alert('Cancel unpaid order?', 'This releases the seller\'s reserved asset. Only cancel if payment has not been sent.', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: async () => {
        if (!supabase) return;
        setBusyId(order.id);
        const { error } = await supabase.rpc('cancel_p2p_order', { p_order_id: order.id });
        setBusyId(null);
        if (error) Alert.alert('Could not cancel', error.message);
        else { Alert.alert('Order cancelled', 'Reserved asset has been released.'); await load(); }
      } },
    ]);
  };

  const raiseDispute = (order: Order) => {
    Alert.prompt?.('Report a problem', 'Explain what happened. Do not share passwords or OTPs.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Submit dispute', onPress: async (reason?: string) => {
        if (!supabase) return;
        if (!reason?.trim()) { Alert.alert('Reason required', 'Enter a short reason.'); return; }
        setBusyId(order.id);
        const { error } = await supabase.rpc('raise_p2p_dispute', { p_order_id: order.id, p_reason: reason.trim() });
        setBusyId(null);
        if (error) Alert.alert('Could not open dispute', error.message);
        else { Alert.alert('Dispute opened', 'The order is marked for review.'); await load(); }
      } },
    ]);
  };

  const confirmReceived = (order: Order) => {
    Alert.alert(
      'Confirm bank credit',
      'Confirm only after checking your bank account and verifying that the exact payment has actually arrived. WALZ will then transfer the reserved asset to the buyer.',
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'I verified — confirm', style: 'destructive', onPress: async () => {
          if (!supabase) return;
          setBusyId(order.id);
          const { error } = await supabase.rpc('confirm_p2p_payment', { p_order_id: order.id });
          setBusyId(null);
          if (error) Alert.alert('Not confirmed', error.message);
          else { Alert.alert('Order completed', 'The asset balance and transaction history have been updated.'); await load(); }
        } },
      ],
    );
  };

  const isConfigured = Boolean(supabase);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.kicker}>WALZ EXCHANGE</Text><Text style={styles.brand}>WALZ<Text style={styles.dot}>.</Text></Text></View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>SECURE WORKSPACE</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#9d8cff" />}>
        <View style={styles.hero}>
          <Text style={styles.heroTag}>PEER TO PEER</Text>
          <Text style={styles.heroTitle}>Trade with clarity.</Text>
          <Text style={styles.heroCopy}>Pay the seller directly. The seller verifies their bank credit before the asset is released to your WALZ balance.</Text>
          <View style={styles.steps}>
            {['Pay seller', 'Seller verifies', 'Asset credited'].map((s, i) => <View style={styles.step} key={s}><Text style={styles.stepNum}>{'0' + (i + 1)}</Text><Text style={styles.stepText}>{s}</Text></View>)}
          </View>
        </View>

        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your orders</Text><Text style={styles.sectionMeta}>{orders.length} RECORDS</Text></View>
        {!isConfigured ? <Empty title="Connect WALZ backend" copy="Add the Supabase project URL and publishable key to the mobile app environment." /> :
          loading ? <ActivityIndicator color="#a99aff" style={{ marginTop: 32 }} /> :
          !userId ? <Empty title="Sign in to continue" copy="Your private orders will appear here after secure sign-in is connected." /> :
          orders.length === 0 ? <Empty title="No orders yet" copy="When you accept an offer or create a trade, its live status will appear here." /> :
          orders.map(order => {
            const seller = order.seller_id === userId;
            const canConfirm = seller && order.status === 'payment_submitted';
            return <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}><Text style={styles.orderRole}>{seller ? 'YOU ARE SELLER' : 'YOU ARE BUYER'}</Text><Text style={[styles.status, order.status === 'completed' ? styles.done : canConfirm ? styles.attention : null]}>{statusLabel[order.status] ?? order.status.toUpperCase()}</Text></View>
              <Text style={styles.amount}>{money(order.amount)} <Text style={styles.asset}>ASSET UNITS</Text></Text>
              <Text style={styles.sub}>Rate ₹{money(order.unit_price)} · Order {order.id.slice(0, 8).toUpperCase()}</Text>
              {canConfirm && <Pressable style={styles.confirmButton} disabled={busyId === order.id} onPress={() => confirmReceived(order)}>{busyId === order.id ? <ActivityIndicator color="#080912" /> : <Text style={styles.confirmText}>VERIFY BANK CREDIT</Text>}</Pressable>}
              {seller && order.status === 'matched' && <Text style={styles.hint}>Waiting for buyer to submit payment details.</Text>}
              {order.status === 'matched' && <Pressable style={styles.secondaryButton} disabled={busyId === order.id} onPress={() => cancelOrder(order)}><Text style={styles.secondaryText}>CANCEL UNPAID ORDER</Text></Pressable>}
              {(order.status === 'matched' || order.status === 'payment_submitted') && <Pressable style={styles.disputeButton} disabled={busyId === order.id} onPress={() => raiseDispute(order)}><Text style={styles.disputeText}>REPORT A PROBLEM</Text></Pressable>}
              {order.status === 'disputed' && <Text style={styles.hint}>This order is under review. Do not send more money or release assets.</Text>}
              {!seller && order.status === 'matched' && <View style={styles.paymentBox}>
                <Text style={styles.paymentTitle}>PAY SELLER DIRECTLY</Text>
                {paymentDetails[order.id] ? <>
                  <Text style={styles.detailLabel}>BANK</Text><Text style={styles.detailValue}>{paymentDetails[order.id].bank_name}</Text>
                  <Text style={styles.detailLabel}>ACCOUNT HOLDER</Text><Text style={styles.detailValue}>{paymentDetails[order.id].account_holder}</Text>
                  <Text style={styles.detailLabel}>ACCOUNT NUMBER</Text><Text style={styles.detailValue}>{paymentDetails[order.id].account_number}</Text>
                  <Text style={styles.detailLabel}>IFSC</Text><Text style={styles.detailValue}>{paymentDetails[order.id].ifsc}</Text>
                  {!!paymentDetails[order.id].upi_id && <><Text style={styles.detailLabel}>UPI ID</Text><Text style={styles.detailValue}>{paymentDetails[order.id].upi_id}</Text></>}
                  <Text style={styles.detailLabel}>PAYMENT REFERENCE / UTR</Text>
                  <TextInput value={utrs[order.id] ?? ''} onChangeText={v => setUtrs(old => ({...old,[order.id]:v}))} placeholder="Enter UTR after paying" placeholderTextColor="#777b91" autoCapitalize="characters" style={styles.utrInput} />
                  <Pressable style={styles.confirmButton} disabled={busyId === order.id} onPress={() => submitPayment(order)}>{busyId === order.id ? <ActivityIndicator color="#080912" /> : <Text style={styles.confirmText}>I HAVE PAID — SUBMIT UTR</Text>}</Pressable>
                  <Text style={styles.hint}>Only submit after you have sent the exact amount from your bank/UPI app.</Text>
                </> : <Text style={styles.hint}>Seller payment details are not available. Contact support before sending money.</Text>}
              </View>}
              {!seller && order.status === 'payment_submitted' && <Text style={styles.hint}>Payment submitted. Waiting for seller to verify bank credit.</Text>}
            </View>;
          })
        }
        <View style={styles.notice}><Text style={styles.noticeTitle}>Payment safety</Text><Text style={styles.noticeCopy}>Never confirm from a screenshot or UTR alone. Check the actual bank statement and exact amount. WALZ does not move INR between bank accounts.</Text></View>
      </ScrollView>
    </View>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>◎</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090b12' },
  header: { paddingTop: 58, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#202235' },
  kicker: { color: '#9b8cff', fontSize: 9, letterSpacing: 2.5, fontWeight: '800' },
  brand: { color: '#f6f6ff', fontSize: 29, fontWeight: '900', letterSpacing: 4, marginTop: 3 },
  dot: { color: '#9b8cff' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#30334a', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30 },
  liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#a99aff' },
  liveText: { color: '#c3c4d5', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 48 },
  hero: { padding: 22, borderRadius: 24, backgroundColor: '#17162a', borderWidth: 1, borderColor: '#393253' },
  heroTag: { color: '#b3a7ff', fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '800', marginTop: 12 },
  heroCopy: { color: '#b8b7c9', lineHeight: 21, marginTop: 8, fontSize: 13 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 8 },
  step: { flex: 1, borderTopWidth: 1, borderTopColor: '#51496d', paddingTop: 10 },
  stepNum: { color: '#9f91ff', fontSize: 10, fontWeight: '800' },
  stepText: { color: '#e5e2f3', fontSize: 10, marginTop: 5 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 14 },
  sectionTitle: { color: '#f5f5fc', fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: '#777b91', fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#26283a', backgroundColor: '#10121d' },
  emptyIcon: { color: '#9f91ff', fontSize: 30 },
  emptyTitle: { color: '#f3f2fc', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyCopy: { color: '#969bad', textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 7 },
  orderCard: { backgroundColor: '#11131f', borderWidth: 1, borderColor: '#2b2d40', borderRadius: 18, padding: 18, marginBottom: 12 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderRole: { color: '#a5a0bc', fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  status: { color: '#e2bd7a', fontSize: 9, fontWeight: '800', letterSpacing: .5 },
  done: { color: '#8ad8b2' },
  attention: { color: '#d8c3ff' },
  amount: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 16 },
  asset: { color: '#999bb0', fontSize: 10, fontWeight: '600' },
  sub: { color: '#9296aa', fontSize: 11, marginTop: 6 },
  secondaryButton: { borderWidth: 1, borderColor: '#49445f', borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 12 },\n  secondaryText: { color: '#c5bddf', fontWeight: '800', fontSize: 10, letterSpacing: .8 },\n  disputeButton: { borderWidth: 1, borderColor: '#68444a', borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 9 },\n  disputeText: { color: '#e6a6aa', fontWeight: '800', fontSize: 10, letterSpacing: .8 },\n  confirmButton: { backgroundColor: '#b5a8ff', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 18 },
  confirmText: { color: '#0a0a13', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  hint: { color: '#b6a9dc', fontSize: 11, marginTop: 14, lineHeight: 18 },
  paymentBox: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#34364b' },\n  paymentTitle: { color: '#b5a8ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: 10 },\n  detailLabel: { color: '#858aa0', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 10 },\n  detailValue: { color: '#f1efff', fontSize: 13, fontWeight: '600', marginTop: 3 },\n  utrInput: { marginTop: 8, borderWidth: 1, borderColor: '#3a3d55', borderRadius: 10, color: '#fff', padding: 12, fontSize: 13 },\n  notice: { marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#574832', backgroundColor: '#1c1914' },
  noticeTitle: { color: '#f0d29b', fontWeight: '800', fontSize: 12 },
  noticeCopy: { color: '#b8ad9c', fontSize: 11, lineHeight: 18, marginTop: 6 },
});
