# import requests
# import time

# # get the current date and time
# now = round(time.time() * 1000)

# print(str(now))

# # Vin = 'http://127.0.0.1:30/api/v1/visits/visitCarIn'
# # InObj = {'plateNum': "test123",
# #  'timeIn': str(now), 'section': 4}

# Vout = 'http://127.0.0.1:30/api/v1/visits/visitCarOut'
# OutObj = {'plateNum': "test123", "timeOut": "1678847214941"}
# x = requests.post(Vout, json=OutObj)
# # x = requests.post(Vin, json=InObj)
# # x = requests.get(url)
# # print(requests.get('http://127.0.0.1:30/api/v1/visits/').text)
# print(x.text)
import base64
import json
import urllib

id_and_key = '77bdc013e065:0057e0a4c24405987561798c0c09318a25f3befbf3'
basic_auth_string = 'Basic ' + base64.b64encode(id_and_key)
headers = { 'Authorization': basic_auth_string }

request = urllib.Request(
    'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
    headers = headers
    )
response = urllib.urlopen(request)
response_data = json.loads(response.read())
response.close()