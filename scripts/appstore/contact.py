import sys
from PIL import Image
files=sys.argv[2:]; ims=[Image.open(f) for f in files]
s=0.5 if ims[0].width>500 else 1
ims=[i.resize((int(i.width*s),int(i.height*s))) for i in ims]
w=sum(i.width for i in ims)+8*len(ims); h=max(i.height for i in ims)
o=Image.new('RGB',(w,h),'white'); x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+8
o.save(sys.argv[1])
