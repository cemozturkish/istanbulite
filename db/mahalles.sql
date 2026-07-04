-- Mahalle (sub-neighborhood) lookup, one level below public.neighborhoods (ilçe).
-- Mirrors the neighborhoods table: kebab-case id, name_tr display name, plus
-- ilce_id linking each mahalle back to its parent ilçe.
--
-- Run this in Supabase SQL editor. It's idempotent.

create table if not exists public.mahalles (
  id text primary key,
  ilce_id text not null references public.neighborhoods(id),
  name_tr text not null
);

create index if not exists mahalles_ilce_id_idx on public.mahalles (ilce_id);

alter table public.mahalles enable row level security;

-- Readable by anon and authenticated, same as neighborhoods (needed for any
-- signup/profile-editing UI that lets a user pick their mahalle).
drop policy if exists "mahalles read for anon" on public.mahalles;
create policy "mahalles read for anon"
  on public.mahalles for select
  to anon
  using (true);

drop policy if exists "mahalles read for authenticated" on public.mahalles;
create policy "mahalles read for authenticated"
  on public.mahalles for select
  to authenticated
  using (true);

-- Admin-only writes, same pattern as neighborhoods/articles.
drop policy if exists "mahalles insert admin" on public.mahalles;
create policy "mahalles insert admin"
  on public.mahalles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "mahalles update admin" on public.mahalles;
create policy "mahalles update admin"
  on public.mahalles for update
  to authenticated
  using (public.is_admin());

drop policy if exists "mahalles delete admin" on public.mahalles;
create policy "mahalles delete admin"
  on public.mahalles for delete
  to authenticated
  using (public.is_admin());

-- profiles.mahalle: nullable, since only a handful of ilçes have mahalle data
-- so far. Admin assigns this manually (no self-service picker yet), so it is
-- NOT added to the protect_profile_columns trigger's reset list the way
-- neighborhood/referred_by/etc. are — until self-service exists, admin sets
-- it via direct update, which the trigger only guards for non-admin writers.
alter table public.profiles
  add column if not exists mahalle text references public.mahalles(id);

-- ═══════════════════════════════════════════════════════════════════════
-- Seed data — verified ilçes only.
--
-- Cross-checked against multiple sources (municipality sites, atlasbig,
-- nufusune) where the enumerated mahalle list matched the stated count
-- exactly. Only committing ilçes that passed this check; the rest
-- (including Beyoğlu — priority #2) returned incomplete or inconsistent
-- lists and need a better source before seeding. See chat for the full
-- per-ilçe confidence breakdown.
-- ═══════════════════════════════════════════════════════════════════════

-- Beşiktaş (23 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('abbasaga', 'besiktas', 'Abbasağa'),
  ('akatlar', 'besiktas', 'Akatlar'),
  ('arnavutkoy-besiktas', 'besiktas', 'Arnavutköy'),
  ('balmumcu', 'besiktas', 'Balmumcu'),
  ('bebek', 'besiktas', 'Bebek'),
  ('cihannuma', 'besiktas', 'Cihannüma'),
  ('dikilitas', 'besiktas', 'Dikilitaş'),
  ('etiler', 'besiktas', 'Etiler'),
  ('gayrettepe', 'besiktas', 'Gayrettepe'),
  ('konaklar', 'besiktas', 'Konaklar'),
  ('kurucesme', 'besiktas', 'Kuruçeşme'),
  ('kultur', 'besiktas', 'Kültür'),
  ('levazim', 'besiktas', 'Levazım'),
  ('levent', 'besiktas', 'Levent'),
  ('mecidiye', 'besiktas', 'Mecidiye'),
  ('muradiye-besiktas', 'besiktas', 'Muradiye'),
  ('nispetiye', 'besiktas', 'Nispetiye'),
  ('ortakoy', 'besiktas', 'Ortaköy'),
  ('sinanpasa', 'besiktas', 'Sinanpaşa'),
  ('turkali', 'besiktas', 'Türkali'),
  ('ulus', 'besiktas', 'Ulus'),
  ('visnezade', 'besiktas', 'Vişnezade'),
  ('yildiz-besiktas', 'besiktas', 'Yıldız')
on conflict (id) do nothing;

-- Bakırköy (15 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('atakoy-1-kisim', 'bakirkoy', 'Ataköy 1. Kısım'),
  ('atakoy-2-5-6-kisim', 'bakirkoy', 'Ataköy 2-5-6. Kısım'),
  ('atakoy-3-4-11-kisim', 'bakirkoy', 'Ataköy 3-4-11. Kısım'),
  ('atakoy-7-8-9-10-kisim', 'bakirkoy', 'Ataköy 7-8-9-10. Kısım'),
  ('basinkoy', 'bakirkoy', 'Basınköy'),
  ('cevizlik', 'bakirkoy', 'Cevizlik'),
  ('kartaltepe-bakirkoy', 'bakirkoy', 'Kartaltepe'),
  ('osmaniye', 'bakirkoy', 'Osmaniye'),
  ('sakizagaci', 'bakirkoy', 'Sakızağacı'),
  ('senlikkoy', 'bakirkoy', 'Şenlikköy'),
  ('yenimahalle-bakirkoy', 'bakirkoy', 'Yenimahalle'),
  ('yesilkoy', 'bakirkoy', 'Yeşilköy'),
  ('yesilyurt', 'bakirkoy', 'Yeşilyurt'),
  ('zeytinlik', 'bakirkoy', 'Zeytinlik'),
  ('zuhuratbaba', 'bakirkoy', 'Zuhuratbaba')
on conflict (id) do nothing;

-- Bayrampaşa (11 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('yenidogan-bayrampasa', 'bayrampasa', 'Yenidoğan'),
  ('vatan', 'bayrampasa', 'Vatan'),
  ('orta-bayrampasa', 'bayrampasa', 'Orta'),
  ('terazidere', 'bayrampasa', 'Terazidere'),
  ('altintepsi', 'bayrampasa', 'Altıntepsi'),
  ('muratpasa', 'bayrampasa', 'Muratpaşa'),
  ('ismetpasa-bayrampasa', 'bayrampasa', 'İsmetpaşa'),
  ('yildirim', 'bayrampasa', 'Yıldırım'),
  ('kartaltepe-bayrampasa', 'bayrampasa', 'Kartaltepe'),
  ('kocatepe', 'bayrampasa', 'Kocatepe'),
  ('cevatpasa', 'bayrampasa', 'Cevatpaşa')
on conflict (id) do nothing;

-- Bahçelievler (11 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('bahcelievler-merkez', 'bahcelievler', 'Bahçelievler'),
  ('zafer', 'bahcelievler', 'Zafer'),
  ('yenibosna', 'bahcelievler', 'Yenibosna'),
  ('sirinevler', 'bahcelievler', 'Şirinevler'),
  ('soganli', 'bahcelievler', 'Soğanlı'),
  ('siyavuspasa', 'bahcelievler', 'Siyavuşpaşa'),
  ('kocasinan-bahcelievler', 'bahcelievler', 'Kocasinan'),
  ('hurriyet-bahcelievler', 'bahcelievler', 'Hürriyet'),
  ('fevzicakmak-bahcelievler', 'bahcelievler', 'Fevzi Çakmak'),
  ('cobancesme', 'bahcelievler', 'Çobançeşme'),
  ('cumhuriyet-bahcelievler', 'bahcelievler', 'Cumhuriyet')
on conflict (id) do nothing;

-- Esenler (16 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('birlik', 'esenler', 'Birlik'),
  ('ciftehavuzlar', 'esenler', 'Çiftehavuzlar'),
  ('davutpasa', 'esenler', 'Davutpaşa'),
  ('fatih-esenler', 'esenler', 'Fatih'),
  ('fevzicakmak-esenler', 'esenler', 'Fevziçakmak'),
  ('havaalani', 'esenler', 'Havaalanı'),
  ('kazimkarabekir-esenler', 'esenler', 'Kazımkarabekir'),
  ('kemer-esenler', 'esenler', 'Kemer'),
  ('menderes', 'esenler', 'Menderes'),
  ('mimarsinan-esenler', 'esenler', 'Mimarsinan'),
  ('namikkemal-esenler', 'esenler', 'Namık Kemal'),
  ('nenehatun', 'esenler', 'Nenehatun'),
  ('orucreis', 'esenler', 'Oruçreis'),
  ('tuna-karabayir', 'esenler', 'Tuna (Karabayır)'),
  ('turgutreis-esenler', 'esenler', 'Turgutreis'),
  ('yavuzselim-esenler', 'esenler', 'Yavuzselim')
on conflict (id) do nothing;

-- Zeytinburnu (13 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('bestelsiz', 'zeytinburnu', 'Beştelsiz'),
  ('cirpici', 'zeytinburnu', 'Çırpıcı'),
  ('gokalp', 'zeytinburnu', 'Gökalp'),
  ('kazlicesme', 'zeytinburnu', 'Kazlıçeşme'),
  ('maltepe-zeytinburnu', 'zeytinburnu', 'Maltepe'),
  ('merkezefendi', 'zeytinburnu', 'Merkezefendi'),
  ('nuripasa', 'zeytinburnu', 'Nuripaşa'),
  ('seyitnizam', 'zeytinburnu', 'Seyitnizam'),
  ('sumer', 'zeytinburnu', 'Sümer'),
  ('telsiz-zeytinburnu', 'zeytinburnu', 'Telsiz'),
  ('veliefendi', 'zeytinburnu', 'Veliefendi'),
  ('yenidogan-zeytinburnu', 'zeytinburnu', 'Yenidoğan'),
  ('yesiltepe', 'zeytinburnu', 'Yeşiltepe')
on conflict (id) do nothing;

-- Güngören (11 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('abdurrahman-nafiz-gurman', 'gungoren', 'Abdurrahman Nafiz Gürman'),
  ('akincilar', 'gungoren', 'Akıncılar'),
  ('gencosman', 'gungoren', 'Gençosman'),
  ('gunestepe', 'gungoren', 'Güneştepe'),
  ('merkez-gungoren', 'gungoren', 'Merkez'),
  ('guven', 'gungoren', 'Güven'),
  ('haznedar', 'gungoren', 'Haznedar'),
  ('maresal-cakmak', 'gungoren', 'Mareşal Çakmak'),
  ('mehmet-nezihi-ozmen', 'gungoren', 'Mehmet Nezihi Özmen'),
  ('sanayi-gungoren', 'gungoren', 'Sanayi'),
  ('tozkoparan', 'gungoren', 'Tozkoparan')
on conflict (id) do nothing;

-- Kağıthane (19 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('caglayan', 'kagithane', 'Çağlayan'),
  ('celiktepe', 'kagithane', 'Çeliktepe'),
  ('emniyetevleri', 'kagithane', 'Emniyet Evleri'),
  ('gultepe', 'kagithane', 'Gültepe'),
  ('gursel', 'kagithane', 'Gürsel'),
  ('hamidiye-kagithane', 'kagithane', 'Hamidiye'),
  ('harmantepe', 'kagithane', 'Harmantepe'),
  ('hurriyet-kagithane', 'kagithane', 'Hürriyet'),
  ('mehmet-akif-ersoy-kagithane', 'kagithane', 'Mehmet Akif Ersoy'),
  ('merkez-kagithane', 'kagithane', 'Merkez'),
  ('nurtepe', 'kagithane', 'Nurtepe'),
  ('ortabayir', 'kagithane', 'Ortabayır'),
  ('seyrantepe', 'kagithane', 'Seyrantepe'),
  ('sultanselim-kagithane', 'kagithane', 'Sultan Selim'),
  ('sirintepe', 'kagithane', 'Şirintepe'),
  ('talatpasa', 'kagithane', 'Talatpaşa'),
  ('telsizler', 'kagithane', 'Telsizler'),
  ('yahyakemal', 'kagithane', 'Yahya Kemal'),
  ('yesilce', 'kagithane', 'Yeşilce')
on conflict (id) do nothing;

-- Ataşehir (17 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('asikveysel', 'atasehir', 'Aşıkveysel'),
  ('atasehir-ataturk', 'atasehir', 'Atatürk'),
  ('barbaros-atasehir', 'atasehir', 'Barbaros'),
  ('esatpasa', 'atasehir', 'Esatpaşa'),
  ('ferhatpasa', 'atasehir', 'Ferhatpaşa'),
  ('fetih', 'atasehir', 'Fetih'),
  ('icerenkoy', 'atasehir', 'İçerenköy'),
  ('inonu-atasehir', 'atasehir', 'İnönü'),
  ('kayisdagi', 'atasehir', 'Kayışdağı'),
  ('kucukbakkalkoy', 'atasehir', 'Küçükbakkalköy'),
  ('mevlana-atasehir', 'atasehir', 'Mevlana'),
  ('mimarsinan-atasehir', 'atasehir', 'Mimarsinan'),
  ('mustafakemal-atasehir', 'atasehir', 'Mustafa Kemal'),
  ('ornek', 'atasehir', 'Örnek'),
  ('yenicamlica', 'atasehir', 'Yeniçamlıca'),
  ('yenisahra', 'atasehir', 'Yenisahra'),
  ('yenisehir-atasehir', 'atasehir', 'Yenişehir')
on conflict (id) do nothing;

-- Maltepe (18 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('altaycesme', 'maltepe', 'Altayçeşme'),
  ('altintepe', 'maltepe', 'Altıntepe'),
  ('aydinevler', 'maltepe', 'Aydınevler'),
  ('baglarbasi-maltepe', 'maltepe', 'Bağlarbaşı'),
  ('basibuyuk', 'maltepe', 'Başıbüyük'),
  ('buyukbakkalkoy', 'maltepe', 'Büyükbakkalköy'),
  ('cevizli', 'maltepe', 'Cevizli'),
  ('cinar-maltepe', 'maltepe', 'Çınar'),
  ('esenkent-maltepe', 'maltepe', 'Esenkent'),
  ('feyzullah', 'maltepe', 'Feyzullah'),
  ('findikli-maltepe', 'maltepe', 'Fındıklı'),
  ('girne', 'maltepe', 'Girne'),
  ('gulensu', 'maltepe', 'Gülensu'),
  ('gulsuyu', 'maltepe', 'Gülsuyu'),
  ('idealtepe', 'maltepe', 'İdealtepe'),
  ('kucukyali', 'maltepe', 'Küçükyalı'),
  ('yali-maltepe', 'maltepe', 'Yalı'),
  ('zumrutevler', 'maltepe', 'Zümrütevler')
on conflict (id) do nothing;

-- Kadıköy (21 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('caferaga', 'kadikoy', 'Caferağa'),
  ('osmanaga', 'kadikoy', 'Osmanağa'),
  ('rasimpasa', 'kadikoy', 'Rasimpaşa'),
  ('kosuyolu', 'kadikoy', 'Koşuyolu'),
  ('acibadem-kadikoy', 'kadikoy', 'Acıbadem'),
  ('hasanpasa', 'kadikoy', 'Hasanpaşa'),
  ('bostanci', 'kadikoy', 'Bostancı'),
  ('caddebostan', 'kadikoy', 'Caddebostan'),
  ('dumlupinar-kadikoy', 'kadikoy', 'Dumlupınar'),
  ('egitim', 'kadikoy', 'Eğitim'),
  ('erenkoy', 'kadikoy', 'Erenköy'),
  ('fenerbahce', 'kadikoy', 'Fenerbahçe'),
  ('feneryolu', 'kadikoy', 'Feneryolu'),
  ('fikirtepe', 'kadikoy', 'Fikirtepe'),
  ('goztepe-kadikoy', 'kadikoy', 'Göztepe'),
  ('kozyatagi', 'kadikoy', 'Kozyatağı'),
  ('merdivenkoy', 'kadikoy', 'Merdivenköy'),
  ('sahrayicedit', 'kadikoy', 'Sahrayıcedit'),
  ('suadiye', 'kadikoy', 'Suadiye'),
  ('zuhtupasa', 'kadikoy', 'Zühtüpaşa'),
  ('ondokuzmayis-kadikoy', 'kadikoy', 'Ondokuzmayıs')
on conflict (id) do nothing;

-- Gaziosmanpaşa (16 mahalle)
insert into public.mahalles (id, ilce_id, name_tr) values
  ('merkez-gop', 'gop', 'Merkez'),
  ('baglarbasi-gop', 'gop', 'Bağlarbaşı'),
  ('sarigol', 'gop', 'Sarıgöl'),
  ('yenidogan-gop', 'gop', 'Yenidoğan'),
  ('karlitepe', 'gop', 'Karlıtepe'),
  ('yildiztabya', 'gop', 'Yıldıztabya'),
  ('pazarici', 'gop', 'Pazariçi'),
  ('semsipasa', 'gop', 'Şemsipaşa'),
  ('hurriyet-gop', 'gop', 'Hürriyet'),
  ('fevzicakmak-gop', 'gop', 'Fevziçakmak'),
  ('kazimkarabekir-gop', 'gop', 'Kazımkarabekir'),
  ('mevlana-gop', 'gop', 'Mevlana'),
  ('karayollari', 'gop', 'Karayolları'),
  ('yenimahalle-gop', 'gop', 'Yeni Mahalle'),
  ('barbaros-hayrettinpasa', 'gop', 'Barbaros Hayrettinpaşa'),
  ('karadeniz-gop', 'gop', 'Karadeniz')
on conflict (id) do nothing;
