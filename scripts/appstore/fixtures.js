const { UID } = require('./harness');
const NB = {bakirkoy:'Bakırköy',bayrampasa:'Bayrampaşa',bahcelievler:'Bahçelievler',sisli:'Şişli',eyupsultan:'Eyüpsultan',gop:'Gaziosmanpaşa',esenler:'Esenler',bagcilar:'Bağcılar',basaksehir:'Başakşehir',kucukcekmece:'Küçükçekmece',sultangazi:'Sultangazi',uskudar:'Üsküdar',kadikoy:'Kadıköy',maltepe:'Maltepe',umraniye:'Ümraniye',cekmekoy:'Çekmeköy',beykoz:'Beykoz',sariyer:'Sarıyer',besiktas:'Beşiktaş',beyoglu:'Beyoğlu',gungoren:'Güngören',kagithane:'Kağıthane',atasehir:'Ataşehir',zeytinburnu:'Zeytinburnu',fatih:'Fatih',istanbul_disi:'İstanbul Dışı',adalar:'Adalar',kartal:'Kartal',pendik:'Pendik',sile:'Şile',tuzla:'Tuzla'};
const id = n => `22222222-2222-4222-8222-${String(n).padStart(12,'0')}`;
// [first,last,nb,q,r]
const PEOPLE = [
  ['Elif','Kaya','kadikoy',0,-1],
  ['Mert','Demir','sisli',1,-1],
  ['Zeynep','Arslan','uskudar',-1,0],
  ['Can','Yıldız','beyoglu',1,0],
  ['Ayşe','Çelik','fatih',-1,1],
  ['Emre','Şahin','sariyer',0,1],
  ['Selin','Aydın','besiktas',0,-2],
  ['Kerem','Öz','atasehir',2,-2],
  ['Defne','Koç','maltepe',2,-1],
  ['Barış','Polat','bakirkoy',-2,0],
  ['Ece','Kurt','uskudar',-2,1],
  ['Ozan','Tekin','kagithane',2,0],
  ['İpek','Yılmaz','beykoz',1,1],
  ['Burak','Erdem','zeytinburnu',-1,2],
  ['Nil','Acar','cekmekoy',-2,2],
  ['Arda','Güneş','eyupsultan',1,-2],
  ['Melis','Ateş','kadikoy',0,2],
  ['Umut','Kılıç','umraniye',-1,-1],
];
const people = PEOPLE.map((p,i)=>({id:id(i+1),first_name:p[0],last_name:p[1],neighborhood:p[2],q:p[3],r:p[4]}));
const ME = {id:UID,first_name:'Deniz',last_name:'Aksoy',neighborhood:'kadikoy',birth_neighborhood:'besiktas',birth_place:null,joined_at:'2025-03-14T10:00:00Z',referral_code:'DNZ4K7QA',referred_by:people[0].id,onboarded_at:'2025-03-14T10:10:00Z',language_pref:'tr',palette_pref:'mono',mascot:'cat',email:'deniz@example.com',phone:null,avatar_url:null,avatar_hair:null,avatar_hat:null,avatar_accessory:null,avatar_shirt:null,cover_badges:[]};
function profiles(){ return [ME, ...people.map(p=>({id:p.id,first_name:p.first_name,last_name:p.last_name,neighborhood:p.neighborhood,birth_neighborhood:p.neighborhood,joined_at:'2025-05-02T10:00:00Z',referral_code:'X'+p.id.slice(-7),referred_by:UID,cover_badges:[]}))]; }

// Istanbul is UTC+3. ev(day, hh, mm) -> ISO
const ist = (d,h,m=0)=> new Date(Date.UTC(2026,10,d,h-3,m)).toISOString();
const evid = n => `33333333-3333-4333-8333-${String(n).padStart(12,'0')}`;
function events(){
  const base = (n,o)=>Object.assign({id:evid(n),audience:'city',created_by:null,kefil_id:null,edition_date:null,edition_order:n,location:null,title_en:null,description_en:null,created_at:'2026-11-20T10:00:00Z',reach:null},o);
  return [
    base(1,{title:'Galata\'da Plak Gecesi',neighborhood:'beyoglu',event_date:ist(24,20),location:'Kamondo Merdivenleri',description:'Herkes bir plak getiriyor, sırayla çalıyoruz. Pikap bizden, hikâyesi sizden. Kapı 19:30\'da açılır.',kefil_id:people[3].id}),
    base(2,{title:'Moda Sahilinde Gün Batımı Yürüyüşü',neighborhood:'kadikoy',event_date:ist(24,16,30),location:'Moda İskelesi',description:'Moda iskelesinden Fenerbahçe parkına kadar sahil boyunca yürüyoruz. Yolda simit ve çay molası.',kefil_id:people[0].id}),
    base(3,{title:'Kuzguncuk\'ta Satranç Akşamı',neighborhood:'uskudar',event_date:ist(25,19),location:'Kuzguncuk Bostanı',description:'Tahtalar hazır, çay demli. Hiç oynamamış olanlara da yer var.',kefil_id:people[2].id}),
    base(5,{title:'Rumelihisarı\'nda Şiir Okuması',neighborhood:'sariyer',event_date:ist(27,18,30),location:'Hisar Kafe',description:'Herkes sevdiği bir şiiri getiriyor. Boğaz manzarası bizden.',kefil_id:people[5].id}),
  ];
}
function plans(){
  const base=(n,o)=>Object.assign({id:evid(100+n),audience:'petek',kefil_id:null,edition_date:null,edition_order:0,title_en:null,description_en:null,description:null,created_at:'2026-11-23T10:00:00Z',reach:'petek'},o);
  return [
    base(1,{title:'Bebek\'te çay, belki tavla',neighborhood:'besiktas',location:'Bebek Parkı',event_date:ist(25,17,30),created_by:UID}),
  ];
}
function hiveMap(){
  return people.map((p,i)=>({member_id:p.id,q:p.q,r:p.r,first_name:p.first_name,last_name:p.last_name,neighborhood:p.neighborhood,avatar_url:null,avatar_hair:null,avatar_hat:null,avatar_accessory:null,avatar_shirt:null,cover_badges:[],bonded:Math.max(Math.abs(p.q),Math.abs(p.r),Math.abs(p.q+p.r))===1,locked:false,joined_at:'2025-05-02T10:00:00Z'}));
}
function gameResults(seed){
  const C='correct',P='present',A='absent';
  const s=(i,att,g)=>({user_id:people[i].id,game:'sozcel',date:seed,won:true,attempts:att,guesses:g});
  const t=(i,won,att)=>({user_id:people[i].id,game:'guncel',date:seed,won,attempts:att});
  return [
    s(0,3,[[A,P,A,A,C],[C,A,P,A,C],[C,C,C,C,C]]),
    s(1,4,[[A,A,P,A,A],[P,A,A,C,A],[C,P,A,C,C],[C,C,C,C,C]]),
    s(2,2,[[C,P,A,A,C],[C,C,C,C,C]]),
    s(3,5,[[A,A,A,A,A],[A,P,A,A,A],[P,A,C,A,A],[C,A,C,P,C],[C,C,C,C,C]]),
    s(5,3,[[A,A,C,P,A],[C,A,C,A,C],[C,C,C,C,C]]),
    s(6,4,[[A,P,A,A,A],[A,A,C,P,A],[C,A,C,A,C],[C,C,C,C,C]]),
    s(9,3,[[P,A,A,C,A],[C,C,A,C,A],[C,C,C,C,C]]),
    t(0,true,1), t(1,true,2), t(3,false,5), t(4,true,1), t(6,true,3), t(7,true,1), t(2,true,2),
  ];
}
module.exports = { NB, people, ME, profiles, events, plans, hiveMap, gameResults, ist };
