from pathlib import Path
import xml.etree.ElementTree as E
r=E.parse(Path(__file__).resolve().parents[1]/'app/src/main/AndroidManifest.xml').getroot()
ns='{http://schemas.android.com/apk/res/android}'
assert not r.findall('uses-permission')
a=r.find('application')
assert a.get(ns+'allowBackup')=='false'
assert a.get(ns+'usesCleartextTraffic')=='false'
d=r.find('.//data')
assert (d.get(ns+'scheme'),d.get(ns+'host'),d.get(ns+'path'))==('near-dot','setup','/pair')
print('Android manifest XML/permission/link-route checks passed; not native compilation.')
