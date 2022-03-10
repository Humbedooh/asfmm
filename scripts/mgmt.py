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
import uuid
import time

"""Management end point for ASFMM"""


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie or not cookie.state:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    if not cookie.state.get("admin"):
        return {"success": False, "message": "You need administrative powers for this..."}
    action = formdata.get("action")
    if action == "block":
        who = formdata.get("user")
        if who and who not in state.blocked:
            state.blocked.append(who)
        return {
            "success": True,
            "message": f"User {who} blocked",
        }
    elif action == "ban":
        who = formdata.get("user")
        if who and who not in state.banned:
            state.banned.append(who)
        return {
            "success": True,
            "message": f"User {who} banned",
        }
    elif action == "unblock":
        who = formdata.get("user")
        if who and who in state.blocked:
            state.blocked.remove(who)
        return {
            "success": True,
            "message": f"User {who} unblocked",
        }
    elif action == "unban":
        who = formdata.get("user")
        if who and who in state.banned:
            state.banned.remove(who)
        return {
            "success": True,
            "message": f"User {who} unbanned",
        }
    elif action == "redact":
        msgid = formdata.get("msgid")
        if msgid:
            for room in state.rooms:
                msg = None
                for message in room.messages:
                    if message["uid"] == msgid:
                        msg = message
                if msg:
                    room.messages.remove(msg)
        return {
            "success": True,
            "message": f"Message redacted from records",
        }


def register(state: typing.Any):
    return ahapi.endpoint(process)
