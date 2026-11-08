"use client";
import { useState } from "react";
import "./login.css";
export default function LoginPreview(){
 const [show,setShow]=useState(false);
 const [phone,setPhone]=useState("");
 const [password,setPassword]=useState("");
 const [otp,setOtp]=useState("");
 return <main className="login-device">
  <div className="login-status"><span>12:40</span><span>▥ ◕ ◆ 5G ▰ 12%</span></div>
  <header className="login-hero"><h1>Welcome Back!</h1><p>Enter your registered account to sign in</p></header>
  <section className="login-panel">
   <label>Mobile Number</label>
   <div className="phone-row"><span className="country-code">+91</span><input aria-label="Mobile Number" inputMode="numeric" maxLength={10} placeholder="Type 10-digit number" value={phone} onChange={e=>setPhone(e.target.value.replace(/\\D/g,"").slice(0,10))}/></div>
   <div className="label-line"><label>Password</label><button className="forgot" type="button">Forgot password?</button></div>
   <div className="field-with-icon"><input aria-label="Password" type={show?"text":"password"} placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)}/><button aria-label="Toggle password visibility" type="button" onClick={()=>setShow(!show)}>{show?"◉":"◉̸"}</button></div>
   <label className="otp-label">OTP</label>
   <div className="otp-row"><input aria-label="6-digit OTP" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value.replace(/\\D/g,"").slice(0,6))}/><button type="button" className="send-otp">Send OTP</button></div>
   <button type="button" className="sign-in">SIGN IN</button>
   <p className="signup-line">Not registered yet? <button type="button">Sign Up Free</button></p>
  </section>
  <div className="login-android"><span>◀</span><span>●</span><span>■</span></div>
 </main>;
}