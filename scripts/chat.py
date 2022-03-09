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
import uuid
""" Chat interface via WebSockets """

WEBSOCKET_TIMEOUT = 10  # After 10 seconds of no activity, we consider someone signed out.


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie or not cookie.state or not "credentials" in cookie.state:
        return {
            "success": False,
            "message": "Please authenticate first!",
        }
    ws = aiohttp.web.WebSocketResponse(timeout=WEBSOCKET_TIMEOUT)
    await ws.prepare(request)
    hashuid = uuid.uuid4()
    state.pending_messages[hashuid] = []
    whoami = cookie.state["credentials"]["login"]
    if whoami in state.banned:  # If banned, break and don't send messages at all
        return {}
    try:
        # Init some vars for tracking
        pongometer = 0
        last_user_list = set()
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
        # Now iterate over any new incoming messages, as well as status updates
        while not ws.closed:
            if whoami in state.banned:  # If banned, break and don't send messages at all
                return {}
            if len(state.pending_messages[hashuid]):
                to_send = state.pending_messages[hashuid].copy()  # copy to prevent race condition
                state.pending_messages[hashuid].clear()  # clear, so next iteration we only get new messages
                for message in to_send:
                    await ws.send_json({
                        "msgid": message["uid"],
                        "timestamp": message["timestamp"],
                        "channel": message["room"],
                        "sender": message["sender"],
                        "realname": message["realname"],
                        "message": message["message"],
                    })
            state.attendees[whoami] = time.time()
            if pongometer % 10 == 0:
                currently_attending = set()
                for k, v in state.attendees.items():
                    if v >= time.time() - WEBSOCKET_TIMEOUT:
                        currently_attending.add(k)
                # If user list has changed, or we've waited 7.5 seconds, re-send user list and statuses
                if last_user_list != currently_attending or pongometer % 30 == 0:
                    last_user_list = currently_attending
                    statuses = {}
                    if cookie.state.get("admin"):
                        statuses = {
                            "blocked": state.blocked,
                            "banned": state.banned,
                        }
                    await ws.send_json({
                        "pong": str(uuid.uuid4()),
                        "statuses": statuses,
                        "current": list(currently_attending),
                        "attendees": len(currently_attending),
                        "max": len(state.attendees)}
                    )
            pongometer += 1
            await asyncio.sleep(0.25)
    except asyncio.exceptions.CancelledError:
        pass
    del state.pending_messages[hashuid]
    return {}


def register(state: typing.Any):
    return ahapi.endpoint(process)
