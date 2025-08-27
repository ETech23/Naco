// mock-api.js — simple in-memory mock with promise delays
const DB = (() => {
  const artisans = [
    {id:'a1', name:'Tunde Ade', skill:'Electrician', location:'Lagos', rate:5000, rating:4.7, premium:true, photo:'../assets/tunde.jpg'},
    {id:'a2', name:'Ngozi Okonkwo', skill:'Tailor', location:'Abuja', rate:4000, rating:4.8, premium:true, photo:'../assets/ngozi.jpg'},
    {id:'a3', name:'Baba Joe', skill:'Plumber', location:'Lagos', rate:3500, rating:4.4, premium:false, photo:'../assets/babajoe.jpg'},
    {id:'a4', name:'Chinedu Motors', skill:'Mechanic', location:'Port Harcourt', rate:8000, rating:4.9, premium:true, photo:'../assets/motors.jpg'},
    {id:'a5', name:'Aisha Hair', skill:'Beautician', location:'Lagos', rate:3000, rating:4.2, premium:false, photo:'../assets/aisha.jpg'}
  ];

  const reviews = [
    {id:'r1', artisanId:'a1', reviewerName:'Amaka', rating:5, text:'Great work, fast!', date:'2025-07-30'},
    {id:'r2', artisanId:'a2', reviewerName:'Ibrahim', rating:4, text:'Good tailoring', date:'2025-07-28'},
    {id:'r3', artisanId:'a1', reviewerName:'Sade', rating:5, text:'Very professional', date:'2025-07-20'}
  ];

  const bookings = [
    {id:'b1', artisanId:'a3', clientName:'Emmanuel', service:'Fix sink', date:'2025-08-15', time:'10:00', status:'upcoming'},
  ];

  const notifications = [
    {id:'n1', userId:'u1', message:'Your booking with Baba Joe is confirmed', type:'booking', timestamp:Date.now()-3600},
  ];

  const users = [
    {id:'u1', name:'Emmanuel Ogbaa', email:'emmanuel@example.com', password:'test123', role:'client', premium:false, location:'Lagos', theme:'light'}
  ];

  return {artisans, reviews, bookings, notifications, users};
})();

const delay = (ms=400) => new Promise(res => setTimeout(res, ms));

export async function getArtisans(){ await delay(); return DB.artisans.slice(); }
export async function getArtisanById(id){ await delay(); return DB.artisans.find(a=>a.id===id) || null }
export async function searchArtisans(skill='', location=''){ await delay(); const s=skill.trim().toLowerCase(); const l=location.trim().toLowerCase(); return DB.artisans.filter(a=> (s? a.skill.toLowerCase().includes(s) || a.name.toLowerCase().includes(s) : true) && (l? a.location.toLowerCase()===l : true) ) }
export async function getPremiumArtisans(){ await delay(); return DB.artisans.filter(a=>a.premium) }
export async function getReviewsForArtisan(id){ await delay(); return DB.reviews.filter(r=>r.artisanId===id) }
export async function createBooking(data){ await delay(); const id = 'b'+(DB.bookings.length+1); const booking={id, ...data, status:'upcoming'}; DB.bookings.push(booking); DB.notifications.push({id:'n'+(DB.notifications.length+1), userId:data.artisanId, message:`New booking from ${data.clientName}`, type:'booking', timestamp:Date.now()}); return booking }
export async function getUserBookings(userId){ await delay(); const user = DB.users.find(u=>u.id===userId); if(!user) return []; if(user.role==='client') return DB.bookings.filter(b=>b.clientName===user.name); return DB.bookings.filter(b=>b.artisanId===userId); }
export async function getNotifications(userId){ await delay(); return DB.notifications.filter(n=>n.userId===userId) }
export async function loginUser(email,password){ await delay(); const u=DB.users.find(x=>x.email===email && x.password===password); if(!u) throw new Error('Invalid credentials'); return {...u} }
export async function registerUser(userData){ await delay(); const id='u'+(DB.users.length+1); const newUser={id,...userData, premium:false, theme:'light'}; DB.users.push(newUser); return newUser }
export async function updateUserProfile(userId, updates){ await delay(); const u=DB.users.find(x=>x.id===userId); if(!u) throw new Error('User not found'); Object.assign(u, updates); return {...u} }
export async function switchUserRole(userId,newRole){ await delay(); const u=DB.users.find(x=>x.id===userId); if(!u) throw new Error('User not found'); u.role=newRole; return {...u} }
export async function upgradeToPremium(userId){ await delay(); const u=DB.users.find(x=>x.id===userId); if(!u) throw new Error('User not found'); u.premium=true; return {...u} }
export async function toggleTheme(userId, theme){ await delay(); const u=DB.users.find(x=>x.id===userId); if(u) u.theme=theme; return u?{...u}:null }

export default {
  getArtisans, getArtisanById, searchArtisans, getPremiumArtisans,
  getReviewsForArtisan, createBooking, getUserBookings, getNotifications,
  loginUser, registerUser, updateUserProfile, switchUserRole, upgradeToPremium, toggleTheme
};