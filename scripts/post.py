#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import ahapi
import typing
import time

"""Post end point for MM"""


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    sender = cookie.state["credentials"]["login"]
    realname = cookie.state["credentials"]["name"]
    message = formdata.get("message")
    roomname = formdata.get("room")
    if sender in state.blocked or sender in state.banned:
        return {
            "success": False,
            "message": "You appear to be blocked from sending messages",
        }
    for room in state.rooms:
        if room.name == roomname:
            throttle_max = state.config.get("message_rate_limit", 5)
            if len(room.flood_control) >= throttle_max and room.flood_control[-throttle_max] >= time.time()-1:
                return {
                    "success": False,
                    "message": "The chat is experiencing a large influx of messages and have been throttled. Please try again.",
                }
            room.add_message(sender, realname, message)
            # Add the timestamp of this message to flood control list
            room.flood_control.append(time.time())
            if len(room.flood_control) > 50:
                room.flood_control.pop(0)
            return {
                "success": True,
                "message": "Message sent!",
            }
    return {
        "success": False,
        "message": "Could not find room!",
    }


def register(state: typing.Any):
    return ahapi.endpoint(process)
