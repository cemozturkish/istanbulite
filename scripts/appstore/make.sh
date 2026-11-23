#!/usr/bin/env bash
# Rebuild the App Store screenshots and App Preview from the live app code.
# Needs: node + playwright (preinstalled), python3 + Pillow, ffmpeg, npm (for supabase-js).
set -euo pipefail
cd "$(dirname "$0")"
# supabase-js from npm (the jsDelivr CDN tag is served from this copy)
[ -f sbjs/package/dist/umd/supabase.js ] || { mkdir -p sbjs && (cd sbjs && npm pack @supabase/supabase-js@2 >/dev/null && tar xzf supabase-supabase-js-*.tgz); }
python3 serve.py & SRV=$!; trap 'kill $SRV' EXIT; sleep 1
mkdir -p shots out/raw vid
node scenes.js sehir,dosya,petek,ajanda,plan day 3 mono
node scenes.js oyunlar,guncel,sozcel day 3 mono
node scenes.js butun,sehir day 3 earth
node compose.js "$PWD/out"
node video2.js
node -e "
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:443,height:960},deviceScaleFactor:2})).newPage();
await p.goto('file://'+process.cwd()+'/overlay.html');await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:'vid/overlay.png',omitBackground:true});await b.close();})()"
ffmpeg -v error -y -framerate 30 -i vid/vt/f%05d.png -i vid/overlay.png -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -filter_complex "[0:v]scale=886:1728:flags=lanczos,pad=886:1920:0:122:color=0x383838[d];[d][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -map 2:a -shortest -r 30 -c:v libx264 -profile:v high -level 4.0 -preset slow -b:v 10M -maxrate 12M -bufsize 20M \
  -c:a aac -b:a 256k -ar 44100 -movflags +faststart out/istanbulite-app-preview.mp4
echo "Framed screenshots and the preview are in $PWD/out — copy them to appstore-screenshots/."
