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
import aiohttp.web
import uuid
import asyncio
import time
""" Chat interface via WebSockets """

WEBSOCKET_TIMEOUT = 15  # After 15 seconds of no activity, we consider someone signed out.

async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie or not cookie.state:
        return {
            "success": False,
            "message": "Please authenticate first!",
        }
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)
    try:
        while not ws.closed:
            pongometer = 0
            # All history first
            for room in state.rooms:
                await ws.send_json({
                    "room_data": {
                        "id": room.name,
                        "title": room.title,
                        "topic": room.topic,
                    }
                })
                await ws.send_json({
                    "msgid": str(uuid.uuid4()),
                    "timestamp": 0,
                    "channel": room.name,
                    "sender": "",
                    "realname": "",
                    "message": f"Welcome to the {room.name} channel. " + room.topic,
                })
                for message in room.messages:
                    await ws.send_json({
                        "msgid": message["uid"],
                        "timestamp": message["timestamp"],
                        "channel": message["room"],
                        "sender": message["sender"],
                        "realname": message["realname"],
                        "message": message["message"],
                    })
            # now new pendings...
            while True:
                if len(cookie.state["pending_messages"]):
                    to_send = cookie.state["pending_messages"].copy()  # copy to prevent race condition
                    cookie.state["pending_messages"].clear()  # clear, so next iteration we only get new messages
                    for message in to_send:
                        await ws.send_json({
                            "msgid": message["uid"],
                            "timestamp": message["timestamp"],
                            "channel": message["room"],
                            "sender": message["sender"],
                            "realname": message["realname"],
                            "message": message["message"],
                        })

                else:
                    if pongometer % 25 == 0:
                        state.attendees[cookie.state["credentials"]["login"]] = time.time()
                        currently_attending = []
                        for k, v in state.attendees.items():
                            if v >= time.time() - WEBSOCKET_TIMEOUT
                                currently_attending.append(k)
                        await ws.send_json({"pong": str(uuid.uuid4()), "current": currently_attending, "attendees": len(currently_attending), "max": len(state.attendees)})
                    pongometer += 1
                    await asyncio.sleep(0.2)
    except asyncio.exceptions.CancelledError:
        pass
    return {}


def register(state: typing.Any):
    return ahapi.endpoint(process)
