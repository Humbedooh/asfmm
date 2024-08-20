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

import asfquart
import asfquart.auth
import asfquart.session
import asfquart.utils
import typing
import quart
import asyncio
import time
import uuid
import math

""" Chat interface via WebSockets """

WEBSOCKET_TIMEOUT = 10  # After 10 seconds of no activity, we consider someone signed out.

APP = asfquart.APP


@APP.websocket("/chat")
@asfquart.auth.require
async def process_chat() -> typing.Any:
    session = await asfquart.session.read()
    whoami = session.uid
    if whoami in APP.state.banned:  # If banned, break and don't send messages at all
        return {}
    hashuid = uuid.uuid4()
    APP.state.pending_messages[hashuid] = []
    try:
        # Init some vars for tracking
        pongometer = 0
        last_user_list = set()
        # All history first
        for room in APP.state.rooms:
            await quart.websocket.send_json(
                {
                    "room_data": {
                        "id": room.name,
                        "title": room.title,
                        "topic": room.topic,
                    }
                }
            )
            for message in room.messages:
                await quart.websocket.send_json(
                    {
                        "msgid": message["uid"],
                        "timestamp": message["timestamp"],
                        "channel": message["room"],
                        "sender": message["sender"],
                        "realname": message["realname"],
                        "message": message["message"],
                    }
                )
        # Now iterate over any new incoming messages, as well as status updates
        while True:
            if whoami in APP.state.banned:  # If banned, break and don't send messages at all
                return {}
            if len(APP.state.pending_messages[hashuid]):
                to_send = APP.state.pending_messages[hashuid].copy()  # copy to prevent race condition
                APP.state.pending_messages[hashuid].clear()  # clear, so next iteration we only get new messages
                for message in to_send:
                    await quart.websocket.send_json(
                        {
                            "msgid": message["uid"],
                            "timestamp": message["timestamp"],
                            "channel": message["room"],
                            "sender": message["sender"],
                            "realname": message["realname"],
                            "message": message["message"],
                        }
                    )
            APP.state.attendees[whoami] = time.time()
            if pongometer % 10 == 0:
                currently_attending = set()
                for k, v in APP.state.attendees.items():
                    if v >= time.time() - WEBSOCKET_TIMEOUT:
                        currently_attending.add(k)
                # If user list has changed, or we've waited 7.5 seconds, re-send user list and statuses
                if last_user_list != currently_attending or pongometer % 30 == 0:
                    last_user_list = currently_attending
                    statuses = {}
                    if session.uid in APP.state.admins:
                        statuses = {
                            "blocked": APP.state.blocked,
                            "banned": APP.state.banned,
                        }
                    await quart.websocket.send_json(
                        {
                            "pong": str(uuid.uuid4()),
                            "statuses": statuses,
                            "current": list(currently_attending),
                            "attendees": len(currently_attending),
                            "max": len(APP.state.attendees),
                            "quorum": {
                                "required": math.ceil(len(APP.state.members)/3),
                                "present": list(APP.state.quorum.members),
                            }
                        }
                    )
            pongometer += 1
            await asyncio.sleep(0.25)
    except asyncio.exceptions.CancelledError:
        pass
    del APP.state.pending_messages[hashuid]
    return {}
