import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

type Tab = 'Home' | 'Buy' | 'Bank' | 'Team' | 'My';
type AuthMode = 'login' | 'signup';
const BLUE = '#2162F5';
const demoOffers = [
  { amount: '40,329', income: '4,040.9', quota: '+44,369.9' },
  { amount: '3,972', income: '405.2', quota: '+4,377.2' },
  { amount: '35,742', income: '3,582.2', quota: '+39,324.2' },
  { amount: '4,510', income: '459', quota: '+4,969' },
  { amount: '14,087', income: '1,408.7', quota: '+15,495.7' },
];

export default function Index() {
  const [tab, setTab] = useState<Tab>('Home');
  const [auth, setAuth] = useState<AuthMode>('login');
  const [signedIn, setSignedIn] = useState(false);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [invite, setInvite] = useState('');
  const [otp, setOtp] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [asset, setAsset] = useState<'INR' | 'USDT'>('INR');
  const [bankName, setBankName] = useState('');
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upi, setUpi] = useState('');
  const [banks, setBanks] = useState<{bank:string;holder:string;account:string;ifsc:string;upi:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState('Buy History');

  const pageTitle = useMemo(() => tab === 'My' ? 'My Account' : tab, [tab]);

  const sendOtp = async () => {
    if (mobile.length !== 10) return Alert.alert('Mobile number', 'Enter a valid 10-digit mobile number.');
    if (!supabase) return Alert.alert('Setup required', 'Supabase environment keys are not configured for this app yet.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: '+91' + mobile });
    setBusy(false);
    Alert.alert(error ? 'OTP could not be sent' : 'OTP requested', error?.message ?? 'OTP request sent. SMS provider configuration is required for delivery.');
  };

  const authenticate = async () => {
    if (mobile.length !== 10 || password.length < 6) return Alert.alert('Check details', 'Enter your 10-digit mobile number and a password of at least 6 characters.');
    if (auth === 'signup' && password !== confirm) return Alert.alert('Password mismatch', 'Both passwords must match.');
    if (!supabase) return Alert.alert('Setup required', 'Supabase environment keys are not configured for this app yet.');
    setBusy(true);
    const result = auth === 'login'
      ? await supabase.auth.signInWithPassword({ phone: '+91' + mobile, password })
      : await supabase.auth.signUp({ phone: '+91' + mobile, password, options: { data: { invitation_code: invite } } });
    setBusy(false);
    if (result.error) return Alert.alert('Authentication failed', result.error.message);
    if (auth === 'signup') return Alert.alert('Account request submitted', 'Complete phone verification if Supabase requests an OTP.');
    setSignedIn(true);
  };

  const saveBank = async () => {
    if (!bankName.trim() || !holder.trim() || account.trim().length < 6 || !ifsc.trim()) return Alert.alert('Missing details', 'Bank name, account holder, account number and IFSC are required.');
    if (!supabase) return Alert.alert('Backend not configured', 'Bank details are not saved. Configure Supabase first.');
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return Alert.alert('Sign in required', 'Please sign in before adding a bank account.'); }
    const { error } = await supabase.from('payment_methods').insert({ user_id: user.id, bank_name: bankName.trim(), account_holder: holder.trim(), account_number: account.trim(), ifsc: ifsc.trim().toUpperCase(), upi_id: upi.trim() || null });
    setBusy(false);
    if (error) return Alert.alert('Could not save bank', error.message);
    setBanks(v => [...v, { bank: bankName, holder, account, ifsc, upi }]);
    setBankName(''); setHolder(''); setAccount(''); setIfsc(''); setUpi('');
    Alert.alert('Saved', 'Bank account added.');
  };

  if (!signedIn) return <AuthScreen mode={auth} setMode={setAuth} mobile={mobile} setMobile={setMobile} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} invite={invite} setInvite={setInvite} otp={otp} setOtp={setOtp} showPassword={showPassword} setShowPassword={setShowPassword} sendOtp={sendOtp} submit={authenticate} busy={busy} />;

  return <View style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#f3f6fa" />
    <View style={s.topBar}><View><Text style={s.hello}>Hello,</Text><Text style={s.user}>WALZ Member</Text></View><View style={s.topActions}><Pressable style={s.roundIcon} onPress={() => Alert.alert('Support', 'Support centre will be connected here.')}><Text style={s.iconText}>◉</Text></Pressable><Pressable style={s.roundIcon} onPress={() => Alert.alert('Notifications', 'You are all caught up.')}><Text style={s.iconText}>♧</Text></Pressable></View></View>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>{pageTitle}</Text>
      {tab === 'Home' && <HomeContent onNavigate={setTab} />}
      {tab === 'Buy' && <BuyContent asset={asset} setAsset={setAsset} history={history} setHistory={setHistory} />}
      {tab === 'Bank' && <View>
        <Text style={s.subTitle}>Bank Accounts</Text><Text style={s.muted}>Manage your bank accounts for transactions</Text>
        {banks.map((b,i)=><View key={i} style={s.bankCard}><Text style={s.bankName}>{b.bank}</Text><Text style={s.muted}>A/C: {b.account} · UPI: {b.upi || 'N/A'}</Text><Text style={s.muted}>IFSC: {b.ifsc} · Holder: {b.holder}</Text><Text style={s.warning}>● Pending verification</Text></View>)}
        <View style={s.formCard}><Text style={s.subTitle}>＋ Add Bank Account</Text><Field label="Bank Name" value={bankName} change={setBankName} placeholder="Enter bank name" /><Field label="Account Holder" value={holder} change={setHolder} placeholder="Name as per bank" /><Field label="Account Number" value={account} change={setAccount} placeholder="Enter account number" keyboard="numeric" /><Field label="IFSC Code" value={ifsc} change={setIfsc} placeholder="e.g. SBIN0001234" /><Field label="UPI ID (optional)" value={upi} change={setUpi} placeholder="name@bank" /><Pressable style={s.primary} onPress={saveBank} disabled={busy}><Text style={s.primaryText}>{busy ? 'SAVING…' : 'SAVE BANK ACCOUNT'}</Text></Pressable></View>
      </View>}
      {tab === 'Team' && <View style={s.panel}><Text style={s.subTitle}>Team & Referrals</Text><Text style={s.muted}>Your invitation code and referral activity will appear here.</Text><View style={s.refCode}><Text style={s.muted}>YOUR INVITATION CODE</Text><Text style={s.bigBlue}>—</Text></View><StatLine label="Level 1 Team" value="—" /><StatLine label="Level 2 Team" value="—" /><StatLine label="Pending Commission" value="₹0.00" /><StatLine label="Main Wallet Commission" value="₹0.00" /><Text style={s.disclaimer}>Commission figures will be shown only from eligible, verified transactions.</Text></View>}
      {tab === 'My' && <MyContent onLogout={() => { setSignedIn(false); setPassword(''); setTab('Home'); }} />}
    </ScrollView>
    <View style={s.nav}>{(['Home','Buy','Bank','Team','My'] as Tab[]).map((v,i)=><Pressable key={v} onPress={()=>setTab(v)} style={s.navItem}><Text style={[s.navIcon, tab===v && s.active]}>{['⌂','▣','＋','♧','☻'][i]}</Text><Text style={[s.navLabel, tab===v && s.active]}>{v}</Text></Pressable>)}</View>
  </View>;
}

function AuthScreen(p: any) {
  const signup = p.mode === 'signup';
  return <View style={s.authScreen}>
    <StatusBar barStyle={signup ? 'dark-content' : 'light-content'} backgroundColor={signup ? '#ffffff' : '#101a30'} />
    {signup ? (
      <View style={s.signupHeader}>
        <Pressable onPress={() => p.setMode('login')} style={s.backButton}><Text style={s.backArrow}>‹</Text></Pressable>
        <View><Text style={s.signupTitle}>Sign Up Free</Text><Text style={s.signupSubtitle}>Create a new account</Text></View>
      </View>
    ) : (
      <View style={s.loginHeader}>
        <Text style={s.loginTitle}>Welcome Back!</Text>
        <Text style={s.loginSubtitle}>Enter your registered account to sign in</Text>
      </View>
    )}
    <ScrollView contentContainerStyle={signup ? s.signupForm : s.loginForm} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={s.authLabel}>Mobile Number</Text>
      <View style={s.authPhoneRow}>
        <View style={s.authCountry}><Text style={s.authCountryText}>+91</Text></View>
        <TextInput style={s.authInput} value={p.mobile} onChangeText={(v:string)=>p.setMobile(v.replace(/\\D/g,'').slice(0,10))} keyboardType="phone-pad" placeholder="Type 10-digit number" placeholderTextColor="#9299a4" />
      </View>
      <View style={s.authField}>
        <View style={s.authLabelRow}><Text style={s.authLabel}>Password</Text>{!signup && <Pressable onPress={() => Alert.alert('Forgot password?', 'Request an OTP to reset your password.')}><Text style={s.authLink}>Forgot password?</Text></Pressable>}</View>
        <View style={s.authPasswordWrap}><TextInput style={s.authPasswordInput} value={p.password} onChangeText={p.setPassword} placeholder="Enter password" placeholderTextColor="#9299a4" secureTextEntry={!p.showPassword} autoCapitalize="none" /><Pressable onPress={()=>p.setShowPassword(!p.showPassword)} style={s.eyeButton}><Text style={s.eyeText}>{p.showPassword ? '◉' : '◉̸'}</Text></Pressable></View>
      </View>
      {signup && <>
        <View style={s.authField}><Text style={s.authLabel}>Confirm Password</Text><TextInput style={s.authInputFull} value={p.confirm} onChangeText={p.setConfirm} placeholder="Re-enter password" placeholderTextColor="#9299a4" secureTextEntry /></View>
        <View style={s.authField}><Text style={s.authLabel}>Invitation Code</Text><TextInput style={s.authInputFull} value={p.invite} onChangeText={p.setInvite} placeholder="Enter invitation code" placeholderTextColor="#9299a4" autoCapitalize="none" /></View>
      </>}
      <Text style={s.authLabel}>OTP</Text>
      <View style={s.authOtpRow}><TextInput style={[s.authInput,{flex:1}]} value={p.otp} onChangeText={(v:string)=>p.setOtp(v.replace(/\\D/g,'').slice(0,6))} keyboardType="number-pad" maxLength={6} placeholder="Enter 6-digit OTP" placeholderTextColor="#9299a4" /><Pressable style={s.authOtpButton} onPress={p.sendOtp} disabled={p.busy}><Text style={s.authLink}>{p.busy ? 'WAIT…' : 'Send OTP'}</Text></Pressable></View>
      <Pressable style={s.authPrimary} onPress={p.submit} disabled={p.busy}><Text style={s.authPrimaryText}>{p.busy ? 'PLEASE WAIT…' : signup ? 'Create Account' : 'SIGN IN'}</Text></Pressable>
      <Text style={s.authSwitch}>{signup ? 'Already have an account? ' : 'Not registered yet? '}<Text style={s.authLink} onPress={()=>p.setMode(signup ? 'login' : 'signup')}>{signup ? 'Sign In' : 'Sign Up Free'}</Text></Text>
    </ScrollView>
  </View>;
}

function HomeContent({onNavigate}:{onNavigate:(t:Tab)=>void}) {
  return <View>
    <View style={s.banner}><Text style={s.bannerTag}>WALZ • MEMBER BENEFITS</Text><Text style={s.bannerTitle}>Smart Finance, Clear Transactions</Text><Text style={s.bannerSub}>Explore your account and marketplace activity</Text><Text style={s.bannerLink}>Explore Features  →</Text></View>
    <View style={s.quickGrid}>{[['♙','Newbies Activity'],['✦','Invitation Rewards'],['▤','Daily Bonus'],['♧','Join Agent']].map(([ic,t])=><Pressable key={t} style={s.quick} onPress={()=>Alert.alert(t,'This module will be connected to verified account data.')}><Text style={s.quickIcon}>{ic}</Text><Text style={s.quickText}>{t}</Text></Pressable>)}</View>
    <Pressable style={s.rupeeCard} onPress={()=>onNavigate('Buy')}><Text style={s.cardTitle}>Buy Rupee</Text><Text style={s.rewardLabel}>REWARDS</Text><Text style={s.rewardValue}>Offers</Text><Text style={s.example}>View available INR offers in Buy</Text></Pressable>
    <Pressable style={s.usdtCard} onPress={()=>onNavigate('Buy')}><Text style={s.cardTitle}>Buy USDT</Text><Text style={s.muted}>USDT marketplace offers</Text><View style={s.statRow}><View><Text style={s.muted}>ASSET</Text><Text style={s.statValue}>USDT</Text></View><View><Text style={s.muted}>MARKET</Text><Text style={s.statValue}>Open offers</Text></View></View></Pressable>
    <View style={s.panel}><Text style={s.subTitle}>Learn & Earn</Text><Pressable style={s.historyRow} onPress={()=>Alert.alert('Learn & Earn','Learning content will be added here.')}><Text style={s.rowIcon}>▣</Text><Text style={s.rowText}>Learning centre</Text><Text style={s.chevron}>›</Text></Pressable></View>
  </View>;
}
function BuyContent(p:any) {
  return <View><View style={s.buyHeader}><View style={s.tabs}>{(['INR','USDT'] as const).map(a=><Pressable key={a} onPress={()=>p.setAsset(a)}><Text style={[s.tabText,p.asset===a&&s.tabActive]}>{a}</Text></Pressable>)}</View><Pressable style={s.historyPill} onPress={()=>p.setHistory('INR History')}><Text style={s.historyPillText}>INR History</Text></Pressable></View><View style={s.filterPill}><Text style={s.filterText}>All</Text></View><Text style={s.demoNote}>DESIGN PREVIEW · Sample offer values, not live orders</Text>{demoOffers.map((o,i)=><View style={s.offerCard} key={i}><View style={s.offerTop}><Text style={s.offerAmount}>{p.asset==='INR'?'₹':'$'}{o.amount}</Text><Text style={s.bankBadge}>Bank</Text><Pressable style={s.buyBtn} onPress={()=>Alert.alert('Live offers not connected','These are reference-only sample cards. No payment or purchase will be initiated.')}><Text style={s.buyBtnText}>Buy</Text></Pressable></View><View style={s.offerBottom}><View><Text style={s.mutedCaps}>INCOME</Text><Text style={s.income}>{p.asset==='INR'?'₹':''}{o.income}  <Text style={s.bankBadge}>Offer</Text></Text></View><View style={{alignItems:'flex-end'}}><Text style={s.mutedCaps}>QUOTA</Text><Text style={s.quota}>{o.quota}</Text></View></View></View>)}</View>;
}
function MyContent({onLogout}:{onLogout:()=>void}) {
  return <View><View style={s.profile}><View style={s.avatar}><Text style={s.avatarText}>W</Text></View><View style={{flex:1}}><Text style={s.user}>WALZ Member</Text><Text style={s.muted}>UID: —</Text></View><Text style={s.edit}>✎</Text></View><View style={s.balanceCard}>{[['TCoin Balance','₹0.00'],['Total Earnings','₹0.00'],["Today's Profit",'₹0.00']].map(([a,b])=><View key={a} style={s.balanceItem}><Text style={s.muted}>{a}</Text><Text style={s.balanceValue}>{b}</Text></View>)}</View><View style={s.panel}><Text style={s.subTitle}>Statistics</Text><View style={s.statsGrid}>{[['₹','INR'],['◆','Sell'],['₿','USDT'],['⌁','Profit']].map(([ic,t])=><View style={s.statCell} key={t}><Text style={s.statBubble}>{ic}</Text><Text style={s.statName}>{t}</Text><Text style={s.muted}>₹0.00</Text></View>)}</View></View><View style={s.panel}><Text style={s.subTitle}>History</Text>{['Buy History','Sell History','USDT History','Quota History'].map((v,i)=><Pressable style={s.historyRow} key={v}><Text style={s.rowIcon}>{['🛒','◆','₿','☷'][i]}</Text><Text style={s.rowText}>{v}</Text><Text style={s.chevron}>›</Text></Pressable>)}</View><View style={s.panel}><Text style={s.subTitle}>Setting</Text>{['Messages','Service','Account Settings','Change Password'].map(v=><Pressable style={s.historyRow} key={v}><Text style={s.rowText}>{v}</Text><Text style={s.chevron}>›</Text></Pressable>)}<Pressable style={s.logout} onPress={onLogout}><Text style={s.logoutText}>LOG OUT</Text></Pressable></View></View>;
}
function Field({label,value,change,placeholder,secure,keyboard}:{label:string;value:string;change:(v:string)=>void;placeholder:string;secure?:boolean;keyboard?:any}) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={change} placeholder={placeholder} placeholderTextColor="#9aa3b2" secureTextEntry={secure} keyboardType={keyboard} autoCapitalize="none" style={s.inputFull} /></View>; }
function StatLine({label,value}:{label:string;value:string}) { return <View style={s.statLine}><Text style={s.rowText}>{label}</Text><Text style={s.statValue}>{value}</Text></View>; }

const s = StyleSheet.create({
 screen:{flex:1,backgroundColor:'#f3f6fa'},scroll:{paddingHorizontal:18,paddingTop:10,paddingBottom:26},topBar:{backgroundColor:'#fff',paddingHorizontal:22,paddingTop:58,paddingBottom:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},hello:{color:'#9aa3b2',fontSize:13,fontWeight:'600'},user:{color:'#111827',fontSize:18,fontWeight:'800'},topActions:{flexDirection:'row',gap:12},roundIcon:{width:44,height:44,borderRadius:24,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#edf0f4'},iconText:{fontSize:20,color:'#253247'},pageTitle:{fontSize:24,fontWeight:'800',color:'#1e293b',marginBottom:14},banner:{borderRadius:24,padding:22,backgroundColor:'#101c32',minHeight:190,justifyContent:'space-between',marginBottom:18},bannerTag:{color:'#f7c948',fontWeight:'800',fontSize:11},bannerTitle:{color:'#fff',fontSize:23,fontWeight:'900',marginTop:18},bannerSub:{color:'#c4cfdf',fontSize:13,marginTop:8},bannerLink:{color:'#f4b400',fontWeight:'800',marginTop:24},quickGrid:{flexDirection:'row',gap:8,marginBottom:18},quick:{flex:1,minHeight:112,borderRadius:18,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',padding:8,borderWidth:1,borderColor:'#edf0f4'},quickIcon:{fontSize:28,color:BLUE,marginBottom:10},quickText:{fontSize:11,fontWeight:'800',color:'#253247',textAlign:'center'},rupeeCard:{padding:22,borderRadius:24,backgroundColor:'#fff7ef',borderWidth:1,borderColor:'#ffe4c8',marginBottom:16},usdtCard:{padding:22,borderRadius:24,backgroundColor:'#eef6ff',borderWidth:1,borderColor:'#d7eaff',marginBottom:18},cardTitle:{fontSize:22,fontWeight:'900',color:'#303b4d'},rewardLabel:{fontSize:12,color:'#8b9bb2',fontWeight:'800',marginTop:24},rewardValue:{fontSize:28,fontWeight:'900',color:'#162033',marginTop:6},example:{color:'#a65a23',marginTop:10,fontWeight:'700'},statRow:{flexDirection:'row',justifyContent:'space-between',marginTop:22,borderTopWidth:1,borderColor:'#dce8f6',paddingTop:18},statValue:{fontSize:20,fontWeight:'900',color:'#1f2937',marginTop:5},panel:{backgroundColor:'#fff',borderRadius:22,padding:20,marginBottom:16,borderWidth:1,borderColor:'#eef1f5'},subTitle:{fontSize:21,fontWeight:'800',color:'#1e293b',marginBottom:12},muted:{fontSize:13,color:'#9aa5b5',lineHeight:19},historyRow:{flexDirection:'row',alignItems:'center',paddingVertical:16,borderTopWidth:1,borderColor:'#f0f2f5',gap:14},rowIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#eef5ff',textAlign:'center',textAlignVertical:'center',color:BLUE,fontSize:19,overflow:'hidden'},rowText:{fontSize:16,color:'#465367',flex:1},chevron:{fontSize:28,color:'#9aa5b5'},nav:{height:78,backgroundColor:'#fff',borderTopWidth:1,borderColor:'#edf0f4',flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingBottom:8},navItem:{alignItems:'center',justifyContent:'center',flex:1},navIcon:{fontSize:25,color:'#98a7ba',fontWeight:'800'},navLabel:{fontSize:11,color:'#98a7ba',fontWeight:'700',marginTop:3},active:{color:BLUE},authScreen:{flex:1,backgroundColor:'#fff'},authHead:{backgroundColor:'#101a30',paddingHorizontal:26,paddingTop:70,paddingBottom:36},authTitle:{fontSize:29,fontWeight:'900',color:'#fff'},authSub:{fontSize:15,color:'#a9b3c4',marginTop:12},authForm:{paddingHorizontal:22,paddingTop:28,paddingBottom:60},label:{fontSize:14,color:'#687386',fontWeight:'600',marginBottom:9},phoneRow:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:20},country:{width:58,height:58,backgroundColor:'#f2f4f7',borderRadius:16,alignItems:'center',justifyContent:'center'},countryText:{fontSize:16,fontWeight:'800',color:'#344054'},input:{flex:1,height:58,borderWidth:1,borderColor:'#dfe5ed',backgroundColor:'#f5f7fa',borderRadius:16,paddingHorizontal:16,fontSize:15,color:'#253247'},field:{marginBottom:20},inputFull:{height:58,borderWidth:1,borderColor:'#dfe5ed',backgroundColor:'#f5f7fa',borderRadius:16,paddingHorizontal:16,fontSize:15,color:'#253247'},link:{color:BLUE,fontWeight:'700',fontSize:14,textAlign:'right',marginBottom:16},otpBtn:{height:54,paddingHorizontal:15,backgroundColor:'#eef5ff',borderRadius:14,justifyContent:'center'},primary:{height:62,backgroundColor:BLUE,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:18,shadowColor:BLUE,shadowOpacity:.2,shadowRadius:12,elevation:4},primaryText:{color:'#fff',fontSize:16,fontWeight:'900'},switchText:{textAlign:'center',fontSize:14,color:'#7b8494',marginTop:34},buyHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},tabs:{flexDirection:'row',gap:22},tabText:{fontSize:20,fontWeight:'900',color:'#1e293b'},tabActive:{color:BLUE,borderBottomWidth:3,borderColor:BLUE,paddingBottom:8},historyPill:{backgroundColor:'#fff',borderRadius:24,paddingVertical:12,paddingHorizontal:18,borderWidth:1,borderColor:'#e4eaf1'},historyPillText:{color:'#344054',fontWeight:'800'},filterPill:{backgroundColor:BLUE,borderRadius:24,alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:20,marginTop:24,marginBottom:18},filterText:{color:'#fff',fontWeight:'800'},demoNote:{fontSize:10,color:'#8a94a5',fontWeight:'800',marginBottom:10,letterSpacing:.5},offerCard:{backgroundColor:'#fff',borderRadius:24,padding:20,marginBottom:16,borderWidth:1,borderColor:'#f0f2f5'},offerTop:{flexDirection:'row',alignItems:'center',gap:10},offerAmount:{fontSize:26,fontWeight:'900',color:'#121b2e'},bankBadge:{fontSize:11,color:BLUE,backgroundColor:'#eef5ff',paddingHorizontal:9,paddingVertical:5,borderRadius:7,overflow:'hidden',fontWeight:'800'},buyBtn:{marginLeft:'auto',backgroundColor:BLUE,borderRadius:24,paddingVertical:11,paddingHorizontal:26},buyBtnText:{color:'#fff',fontWeight:'900',fontSize:15},offerBottom:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderColor:'#f0f2f5',marginTop:20,paddingTop:16},mutedCaps:{fontSize:11,color:'#9aa8bb',fontWeight:'800',letterSpacing:1},income:{fontSize:19,fontWeight:'900',color:BLUE,marginTop:6},quota:{fontSize:18,fontWeight:'900',color:'#253247',marginTop:6},profile:{backgroundColor:'#101a30',borderRadius:20,padding:18,flexDirection:'row',alignItems:'center',gap:14,marginBottom:14},avatar:{width:58,height:58,borderRadius:30,backgroundColor:'#e9f1ff',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:25,color:BLUE,fontWeight:'900'},edit:{fontSize:23,color:BLUE,backgroundColor:'#fff',paddingHorizontal:12,paddingVertical:7,borderRadius:22},balanceCard:{backgroundColor:'#fff',borderRadius:22,padding:16,flexDirection:'row',marginBottom:16},balanceItem:{flex:1,alignItems:'center',borderRightWidth:1,borderColor:'#eef1f5',paddingHorizontal:4},balanceValue:{fontSize:16,fontWeight:'900',color:'#253247',marginTop:8},statsGrid:{flexDirection:'row',justifyContent:'space-between',marginTop:10},statCell:{alignItems:'center',flex:1},statBubble:{width:54,height:54,borderRadius:30,backgroundColor:'#eef5ff',textAlign:'center',textAlignVertical:'center',color:BLUE,fontSize:23,overflow:'hidden'},statName:{fontSize:15,fontWeight:'800',color:'#253247',marginTop:8},bankCard:{backgroundColor:'#fff',borderRadius:18,padding:18,marginTop:14,marginBottom:10},bankName:{fontSize:18,fontWeight:'800',color:'#253247'},warning:{color:'#e87979',marginTop:8,fontWeight:'700'},formCard:{backgroundColor:'#fff',borderRadius:20,padding:18,marginTop:18},refCode:{backgroundColor:'#f2f6ff',borderRadius:16,padding:18,marginVertical:14},bigBlue:{fontSize:25,fontWeight:'900',color:BLUE,marginTop:6},statLine:{flexDirection:'row',justifyContent:'space-between',paddingVertical:14,borderTopWidth:1,borderColor:'#edf0f4'},disclaimer:{fontSize:11,color:'#8994a5',marginTop:12,lineHeight:17},logout:{backgroundColor:'#fff1f1',borderRadius:12,padding:15,alignItems:'center',marginTop:18},logoutText:{color:'#d44b4b',fontWeight:'900'},

 authScreen:{flex:1,backgroundColor:'#fff'},
 signupHeader:{flexDirection:'row',alignItems:'center',gap:18,paddingHorizontal:26,paddingTop:42,paddingBottom:28,backgroundColor:'#fff'},
 backButton:{width:36,height:44,alignItems:'flex-start',justifyContent:'center'},
 backArrow:{fontSize:40,lineHeight:42,color:'#263345'},
 signupTitle:{fontSize:29,fontWeight:'900',color:'#172235'},
 signupSubtitle:{fontSize:16,color:'#7d8490',marginTop:5},
 loginHeader:{backgroundColor:'#101a30',paddingHorizontal:26,paddingTop:68,paddingBottom:68},
 loginTitle:{fontSize:30,fontWeight:'900',color:'#fff'},
 loginSubtitle:{fontSize:16,color:'#a9b3c4',marginTop:12},
 signupForm:{paddingHorizontal:22,paddingTop:28,paddingBottom:54},
 loginForm:{paddingHorizontal:22,paddingTop:40,paddingBottom:54,backgroundColor:'#fff',borderTopLeftRadius:30,borderTopRightRadius:30,marginTop:-28},
 authLabel:{fontSize:15,color:'#707987',fontWeight:'600',marginBottom:12},
 authLabelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
 authLink:{fontSize:15,color:'#2162f5',fontWeight:'700'},
 authPhoneRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:26},
 authCountry:{width:72,height:70,borderRadius:22,backgroundColor:'#f2f4f7',alignItems:'center',justifyContent:'center'},
 authCountryText:{fontSize:19,fontWeight:'800',color:'#344054'},
 authInput:{height:70,borderWidth:1.5,borderColor:'#e0e5ed',backgroundColor:'#f5f7fa',borderRadius:22,paddingHorizontal:20,fontSize:17,color:'#253247'},
 authInputFull:{height:70,borderWidth:1.5,borderColor:'#e0e5ed',backgroundColor:'#f5f7fa',borderRadius:22,paddingHorizontal:20,fontSize:17,color:'#253247'},
 authField:{marginBottom:26},
 authPasswordWrap:{height:70,borderWidth:1.5,borderColor:'#e0e5ed',backgroundColor:'#f5f7fa',borderRadius:22,flexDirection:'row',alignItems:'center'},
 authPasswordInput:{flex:1,height:70,paddingHorizontal:20,fontSize:17,color:'#253247'},
 eyeButton:{paddingHorizontal:20,height:70,justifyContent:'center'},
 eyeText:{fontSize:22,color:'#98a1af'},
 authOtpRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2,marginBottom:30},
 authOtpButton:{height:64,paddingHorizontal:18,backgroundColor:'#eef5ff',borderRadius:20,alignItems:'center',justifyContent:'center'},
 authPrimary:{height:82,backgroundColor:'#2863e9',borderRadius:21,alignItems:'center',justifyContent:'center',marginTop:22,shadowColor:'#2162f5',shadowOpacity:.2,shadowRadius:14,elevation:5},
 authPrimaryText:{color:'#fff',fontSize:19,fontWeight:'900'},
 authSwitch:{textAlign:'center',fontSize:16,color:'#7b8494',marginTop:40}

});
