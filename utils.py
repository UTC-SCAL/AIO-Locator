import math
import os
import time
from urllib import request, error

# Radius of the earth, in KM:
earth_radius = 6371


def get_distance(lat1, lon1, lat2, lon2):
    """Get the distance in meters from 2 geo coordinates"""
    global earth_radius
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return (earth_radius * c) * 1000


def clear():
    """Clear the console, regardless of system type"""
    os.system('cls' if os.name == 'nt' else 'clear')


def open_stream_safely(ip_address, **keyword_parameters):
    """Open the URL safely with timeouts handled by retrying."""
    try:
        return request.urlopen(ip_address)
    except error.URLError as e:
        print("Connection timed out.. retrying in 5 seconds")
        print(e)
        time.sleep(5)
        if 'counter' in keyword_parameters:
            counter = int(keyword_parameters['counter'])
            if counter < 5:
                return open_stream_safely(ip_address, counter=counter + 1)
            else:
                print("Done trying. Not connecting.")
                return None
        return open_stream_safely(ip_address)


def open_stream_safely_with_login(ip_address, login, password, **keyword_parameters):
    """Open the URL safely with timeouts handled by retrying."""
    try:
        p = request.HTTPPasswordMgrWithDefaultRealm()
        p.add_password(None, ip_address, login, password)
        handler = request.HTTPBasicAuthHandler(p)
        opener = request.build_opener(handler)
        request.install_opener(opener)
        return request.urlopen(ip_address)
    except error.URLError:
        print("Connection timed out.. retrying in 5 seconds")
        time.sleep(5)
        if 'counter' in keyword_parameters:
            counter = int(keyword_parameters['counter'])
            if counter < 5:
                return open_stream_safely(ip_address, counter=counter + 1)
            else:
                print("Done trying. Not connecting.")
                return None
        return open_stream_safely(ip_address)
