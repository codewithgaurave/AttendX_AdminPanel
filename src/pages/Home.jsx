import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  QrCode,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  User,
  CalendarDays
} from 'lucide-react';
import PWAInstallButton from '../components/PWAInstallButton';

const getClockStr = () =>
  new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

const getDateStr = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

export default function Home() {
  const nav = useNavigate();
  const [clock, setClock] = useState(getClockStr());

  useEffect(() => {
    const t = setInterval(() => {
      setClock(getClockStr());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div style={styles.page}>
        <div style={styles.container}>

          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.logo}>
              Atten<span style={{ color: '#ff6b35' }}>Zo</span>
            </h1>

            <div style={styles.portal}>
              ADMIN PORTAL
            </div>

            <div style={styles.line}></div>
          </div>

          {/* Body */}
          <div style={styles.body}>

            <div style={styles.avatar}>
              <User size={30} color="#ff6b35"/>
            </div>

            <h2 style={styles.welcome}>
              Welcome Back! 👋
            </h2>

            <p style={styles.subtitle}>
              Manage your attendance with ease.
            </p>

            {/* Clock Card */}
            <div style={styles.clockCard}>
              <div style={styles.clock}>
                {clock}
              </div>

              <div style={styles.date}>
                <CalendarDays size={18}/>
                {getDateStr()}
              </div>
            </div>

            {/* QR Card */}
            <ActionCard
              icon={<QrCode size={34}/>}
              title="Scan QR & Mark Attendance"
              desc="Quickly scan and mark attendance"
              gradient="linear-gradient(90deg,#b146ff,#4a3cff)"
              onClick={() => nav('/scan')}
            />

            {/* Login Card */}
            <ActionCard
              icon={<LogIn size={34}/>}
              title="Admin Login"
              desc="Secure access to your dashboard"
              gradient="linear-gradient(90deg,#ff7b00,#ff3f72)"
              onClick={() => nav('/login')}
            />

            {/* Bottom */}
            <div style={styles.bottom}>

              <Feature
                icon={<Shield/>}
                title="Secure"
                text="Your data is always safe"
              />

              <Feature
                icon={<Zap/>}
                title="Fast"
                text="Quick attendance in seconds"
              />

              <Feature
                icon={<BarChart3/>}
                title="Smart"
                text="Insights at your fingertips"
              />

            </div>

          </div>
        </div>
      </div>

      <PWAInstallButton/>
    </>
  );
}


function ActionCard({
  icon,
  title,
  desc,
  gradient,
  onClick
}) {

  return (
    <div
      onClick={onClick}
      style={{
        background:gradient,
        borderRadius:20,
        padding:"15px",
        marginBottom:12,
        cursor:"pointer",
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        color:"#fff",
        boxShadow:"0 8px 20px rgba(0,0,0,.18)"
      }}
    >
      <div
        style={{
          background:"#fff",
          width:55,
          height:55,
          borderRadius:18,
          display:"flex",
          justifyContent:"center",
          alignItems:"center",
          color:"#6a3eff"
        }}
      >
        {icon}
      </div>

      <div style={{flex:1,paddingLeft:15}}>
        <div
          style={{
            fontWeight:700,
            fontSize:20
          }}
        >
          {title}
        </div>

        <div
          style={{
            opacity:.9,
            marginTop:4,
            fontSize:12
          }}
        >
          {desc}
        </div>
      </div>

      <ArrowRight size={20}/>
    </div>
  );
}


function Feature({
  icon,
  title,
  text
}) {

  return (
    <div
      style={{
        flex:1,
        textAlign:"center"
      }}
    >
      <div style={{fontSize:16}}>{icon}</div>

      <b style={{fontSize:11}}>{title}</b>

      <div
        style={{
          fontSize:9,
          color:"#666"
        }}
      >
        {text}
      </div>
    </div>
  );
}



const styles={

page:{
background:
"linear-gradient(135deg,#ff8a5c,#d33eff,#2196f3)",
height:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
padding:10,
overflow:"hidden"
},

container:{
width:"100%",
maxWidth:550,
height:"100%",
display:"flex",
flexDirection:"column"
},

header:{
background:"#051860",
padding:"20px 15px",
borderRadius:"25px 25px 0 0",
textAlign:"center",
color:"#fff"
},

logo:{
fontSize:42,
margin:0,
fontWeight:"800"
},

portal:{
letterSpacing:3,
marginTop:5,
opacity:.8,
fontSize:12
},

line:{
width:80,
height:4,
margin:"15px auto 0",
borderRadius:10,
background:
"linear-gradient(90deg,#ff9a00,#ff3eff)"
},

body:{
background:"#fff",
padding:"15px 20px",
borderRadius:"0 0 25px 25px",
flex:1,
overflow:"hidden",
display:"flex",
flexDirection:"column"
},

avatar:{
width:55,
height:55,
background:"#fff5f1",
borderRadius:"50%",
display:"flex",
justifyContent:"center",
alignItems:"center",
margin:"auto",
boxShadow:"0 5px 20px rgba(0,0,0,.1)"
},

welcome:{
textAlign:"center",
marginTop:15,
marginBottom:3,
fontSize:20
},

subtitle:{
textAlign:"center",
color:"#666",
fontSize:13
},

clockCard:{
background:"#fff",
padding:"15px 20px",
borderRadius:20,
boxShadow:"0 5px 20px rgba(0,0,0,.08)",
marginBottom:12
},

clock:{
fontSize:42,
fontWeight:"bold",
textAlign:"center",
color:"#071952"
},

date:{
display:"flex",
justifyContent:"center",
alignItems:"center",
gap:8,
marginTop:8,
color:"#666",
fontSize:13
},

bottom:{
display:"flex",
paddingTop:10,
gap:8,
marginTop:"auto"
}

};
