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

"""Post end point for MM"""


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    sender = cookie.state["credentials"]["login"]
    realname = cookie.state["credentials"]["name"]
    message = formdata.get("message")
    roomname = formdata.get("room")
    for room in state.rooms:
        if room.name == roomname:
            room.add_message(sender, realname, message)
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
