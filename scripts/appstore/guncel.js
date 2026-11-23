module.exports = (night)=>{
  const d=(n)=>{const t=new Date(night+'T12:00:00Z'); t.setUTCDate(t.getUTCDate()-n); return t.toISOString().slice(0,10);};
  return [{puzzle_date:night, cards:[
    {text:'Boğaz\'da yoğun sis nedeniyle vapur seferleri bir saat durdu',date:d(1)},
    {text:'Kadıköy\'de yeni bisiklet yolu hizmete açıldı',date:d(9)},
    {text:'Galata Köprüsü\'nde balıkçılar yılın en büyük lüferini tuttu',date:d(1)},
    {text:'Marmaray\'da sefer sıklığı 4 dakikaya indi',date:d(40)},
    {text:'Beyoğlu\'nda tarihi sinema yeniden perde açtı',date:d(1)},
    {text:'Adalar\'a ilk kış seferi yapıldı',date:d(3)},
    {text:'Üsküdar sahilinde sonbahar kitap fuarı başladı',date:d(1)},
    {text:'Emirgan Korusu\'nda lale soğanları toprağa girdi',date:d(15)},
    {text:'Kapalıçarşı\'nın restore edilen kapısı ziyarete açıldı',date:d(2)},
  ]}];
};
