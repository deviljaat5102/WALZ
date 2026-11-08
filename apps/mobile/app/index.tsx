import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [busyId, setBusyId] = useState<string | null>(null);\n  const [paymentDetails, setPaymentDetails] = useState<Record<string, {bank_name:string;account_holder:string;account_number:string;ifsc:string;upi_id:string|null}>>({});\n  const [utrs, setUtrs] = useState<Record<string,string>>({});\n  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);\n  const [disputeReason, setDisputeReason] = useState('');

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

  const raiseDispute = async () => {
    if (!supabase || !disputeOrder) return;
    if (!disputeReason.trim()) { Alert.alert('Reason required', 'Enter a short reason.'); return; }
    setBusyId(disputeOrder);
    const { error } = await supabase.rpc('raise_p2p_dispute', { p_order_id: disputeOrder, p_reason: disputeReason.trim() });
    setBusyId(null);
    if (error) Alert.alert('Could not open dispute', error.message);
    else { setDisputeOrder(null); setDisputeReason(''); Alert.alert('Dispute opened', 'The order is marked for review.'); await load(); }
  };
