import urllib.request
import re

url = 'https://feaspro.vercel.app/'
print(f'Fetching: {url}')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
res = urllib.request.urlopen(req)
html = res.read().decode('utf-8')
print(f'Response Code: {res.getcode()}')
print(f'HTML snippet:\n{html[:300]}...\n')

assets = re.findall(r'(?:src|href)=["\']([^"\']+\.(?:js|css))["\']', html)
print('Assets found in HTML:', assets)

for asset in assets:
    if asset.startswith('/'):
        asset_url = 'https://feaspro.vercel.app' + asset
    else:
        asset_url = 'https://feaspro.vercel.app/' + asset
    try:
        a_req = urllib.request.Request(asset_url, headers={'User-Agent': 'Mozilla/5.0'})
        a_res = urllib.request.urlopen(a_req)
        data = a_res.read()
        print(f' -> {asset}: Status {a_res.getcode()}, Size: {len(data)} bytes')
    except Exception as e:
        print(f' -> {asset}: FAILED ({e})')
