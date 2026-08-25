-- =====================================================================
-- Data import: Istanbul mayors (37 belediye başkanı --
-- İstanbul Büyükşehir + district mayors), pasted in by the admin.
--
-- Populates public.politicians (Kişiler) and public.political_seats (the
-- 26 seats shown on Anahane's top-right card -- see db/politicians.sql).
-- Only 26 of these 37 mayors have a matching seat in this
-- app (it only covers 25 of Istanbul's 39 ilçe, see CLAUDE.md); the rest
-- (Arnavutköy, Avcılar, Beylikdüzü, Büyükçekmece, Esenyurt, Kartal, Pendik, Sancaktepe, Silivri, Sultanbeyli, Tuzla) still get a
-- politicians row so they show up in Kişiler, just no seat assignment.
--
-- Safe to run against a database that already has some/all of these
-- people (e.g. Ekrem İmamoğlu, likely entered by hand before this file
-- existed): the politicians insert dedupes by exact (first_name,
-- last_name) match against whatever's already in the table, and the seat
-- assignment resolves each seat's politician_id with a fresh name lookup
-- (not a value captured at script-generation time), so it links to the
-- right row whether that row already existed or was just inserted below.
-- political_seats itself is upserted by id (same as admin.html's own
-- seat-save call), so re-running this is always safe.
--
-- Run in the Supabase SQL editor (schema from db/politicians.sql must
-- already exist).
-- =====================================================================

insert into public.politicians (first_name, last_name, party, bio)
select v.first_name, v.last_name, v.party, v.bio
from (values
  ('Ekrem', 'İmamoğlu', 'CHP', 'İstanbul Büyükşehir Belediye Başkanı'),
  ('Mustafa', 'Candaroğlu', 'AK Parti', 'Arnavutköy Belediye Başkanı'),
  ('Onursal', 'Adıgüzel', 'CHP', 'Ataşehir Belediye Başkanı'),
  ('Utku Caner', 'Çaykara', 'CHP', 'Avcılar Belediye Başkanı'),
  ('Yasin', 'Yıldız', 'AK Parti', 'Bağcılar Belediye Başkanı'),
  ('Hakan', 'Bahadır', 'AK Parti', 'Bahçelievler Belediye Başkanı'),
  ('Ayşegül', 'Özdemir Ovalıoğlu', 'CHP', 'Bakırköy Belediye Başkanı'),
  ('Yasin', 'Kartoğlu', 'AK Parti', 'Başakşehir Belediye Başkanı'),
  ('Hasan', 'Mutlu', 'CHP', 'Bayrampaşa Belediye Başkanı'),
  ('Rıza', 'Akpolat', 'CHP', 'Beşiktaş Belediye Başkanı'),
  ('Alaattin', 'Köseler', 'CHP', 'Beykoz Belediye Başkanı'),
  ('Mehmet Murat', 'Çalık', 'CHP', 'Beylikdüzü Belediye Başkanı'),
  ('İnan', 'Güney', 'CHP', 'Beyoğlu Belediye Başkanı'),
  ('Hasan', 'Akgün', 'CHP', 'Büyükçekmece Belediye Başkanı'),
  ('Orhan', 'Çerkez', 'CHP', 'Çekmeköy Belediye Başkanı'),
  ('Mehmet Tevfik', 'Göksu', 'AK Parti', 'Esenler Belediye Başkanı'),
  ('Ahmet', 'Özer', 'CHP', 'Esenyurt Belediye Başkanı'),
  ('Mithat Bülent', 'Özmen', 'CHP', 'Eyüpsultan Belediye Başkanı'),
  ('Mehmet Ergün', 'Turan', 'AK Parti', 'Fatih Belediye Başkanı'),
  ('Hakan', 'Bahçetepe', 'CHP', 'Gaziosmanpaşa Belediye Başkanı'),
  ('Bünyamin', 'Demir', 'AK Parti', 'Güngören Belediye Başkanı'),
  ('Mesut', 'Kösedağı', 'CHP', 'Kadıköy Belediye Başkanı'),
  ('Mevlüt', 'Öztekin', 'AK Parti', 'Kağıthane Belediye Başkanı'),
  ('Gökhan', 'Yüksel', 'CHP', 'Kartal Belediye Başkanı'),
  ('Kemal', 'Çebi', 'CHP', 'Küçükçekmece Belediye Başkanı'),
  ('Esin', 'Köymen', 'CHP', 'Maltepe Belediye Başkanı'),
  ('Ahmet', 'Cin', 'AK Parti', 'Pendik Belediye Başkanı'),
  ('Alper', 'Yeğin', 'CHP', 'Sancaktepe Belediye Başkanı'),
  ('Mustafa Oktay', 'Aksu', 'CHP', 'Sarıyer Belediye Başkanı'),
  ('Bora', 'Balcıoğlu', 'CHP', 'Silivri Belediye Başkanı'),
  ('Ali', 'Tombaş', 'AK Parti', 'Sultanbeyli Belediye Başkanı'),
  ('Abdurrahman', 'Dursun', 'AK Parti', 'Sultangazi Belediye Başkanı'),
  ('Resul Emrah', 'Şahan', 'CHP', 'Şişli Belediye Başkanı'),
  ('Eren Ali', 'Bingöl', 'CHP', 'Tuzla Belediye Başkanı'),
  ('İsmet', 'Yıldırım', 'AK Parti', 'Ümraniye Belediye Başkanı'),
  ('Sinem', 'Dedetaş', 'CHP', 'Üsküdar Belediye Başkanı'),
  ('Ömer', 'Arısoy', 'AK Parti', 'Zeytinburnu Belediye Başkanı')
) as v(first_name, last_name, party, bio)
where not exists (
  select 1 from public.politicians p
  where p.first_name = v.first_name and p.last_name = v.last_name
);

insert into public.political_seats (id, neighborhood, title, politician_id)
select v.seat_id, v.neighborhood, v.title, p.id
from (values
  ('istanbul', null, 'İstanbul Büyükşehir Belediye Başkanı', 'Ekrem', 'İmamoğlu'),
  ('atasehir', 'atasehir', 'Ataşehir Belediye Başkanı', 'Onursal', 'Adıgüzel'),
  ('bagcilar', 'bagcilar', 'Bağcılar Belediye Başkanı', 'Yasin', 'Yıldız'),
  ('bahcelievler', 'bahcelievler', 'Bahçelievler Belediye Başkanı', 'Hakan', 'Bahadır'),
  ('bakirkoy', 'bakirkoy', 'Bakırköy Belediye Başkanı', 'Ayşegül', 'Özdemir Ovalıoğlu'),
  ('basaksehir', 'basaksehir', 'Başakşehir Belediye Başkanı', 'Yasin', 'Kartoğlu'),
  ('bayrampasa', 'bayrampasa', 'Bayrampaşa Belediye Başkanı', 'Hasan', 'Mutlu'),
  ('besiktas', 'besiktas', 'Beşiktaş Belediye Başkanı', 'Rıza', 'Akpolat'),
  ('beykoz', 'beykoz', 'Beykoz Belediye Başkanı', 'Alaattin', 'Köseler'),
  ('beyoglu', 'beyoglu', 'Beyoğlu Belediye Başkanı', 'İnan', 'Güney'),
  ('cekmekoy', 'cekmekoy', 'Çekmeköy Belediye Başkanı', 'Orhan', 'Çerkez'),
  ('esenler', 'esenler', 'Esenler Belediye Başkanı', 'Mehmet Tevfik', 'Göksu'),
  ('eyupsultan', 'eyupsultan', 'Eyüpsultan Belediye Başkanı', 'Mithat Bülent', 'Özmen'),
  ('fatih', 'fatih', 'Fatih Belediye Başkanı', 'Mehmet Ergün', 'Turan'),
  ('gop', 'gop', 'Gaziosmanpaşa Belediye Başkanı', 'Hakan', 'Bahçetepe'),
  ('gungoren', 'gungoren', 'Güngören Belediye Başkanı', 'Bünyamin', 'Demir'),
  ('kadikoy', 'kadikoy', 'Kadıköy Belediye Başkanı', 'Mesut', 'Kösedağı'),
  ('kagithane', 'kagithane', 'Kağıthane Belediye Başkanı', 'Mevlüt', 'Öztekin'),
  ('kucukcekmece', 'kucukcekmece', 'Küçükçekmece Belediye Başkanı', 'Kemal', 'Çebi'),
  ('maltepe', 'maltepe', 'Maltepe Belediye Başkanı', 'Esin', 'Köymen'),
  ('sariyer', 'sariyer', 'Sarıyer Belediye Başkanı', 'Mustafa Oktay', 'Aksu'),
  ('sultangazi', 'sultangazi', 'Sultangazi Belediye Başkanı', 'Abdurrahman', 'Dursun'),
  ('sisli', 'sisli', 'Şişli Belediye Başkanı', 'Resul Emrah', 'Şahan'),
  ('umraniye', 'umraniye', 'Ümraniye Belediye Başkanı', 'İsmet', 'Yıldırım'),
  ('uskudar', 'uskudar', 'Üsküdar Belediye Başkanı', 'Sinem', 'Dedetaş'),
  ('zeytinburnu', 'zeytinburnu', 'Zeytinburnu Belediye Başkanı', 'Ömer', 'Arısoy')
) as v(seat_id, neighborhood, title, first_name, last_name)
join public.politicians p on p.first_name = v.first_name and p.last_name = v.last_name
on conflict (id) do update set
  neighborhood = excluded.neighborhood,
  title = excluded.title,
  politician_id = excluded.politician_id;

-- Sanity check: 37 mayors parsed, 26 assigned to a seat, 11 Kişiler-only.
