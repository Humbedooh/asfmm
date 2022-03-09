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

"""Invitation end point for ASFMM"""


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    invitee = formdata.get("name")
    sender = cookie.state["credentials"]["login"]
    if not cookie or not invitee or sender.startswith("guest_") or sender in state.banned:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    realname = cookie.state["credentials"]["name"]

    invite_id = str(uuid.uuid4())
    state.invites[invite_id] = {
        "timestamp": time.time(),
        "inviter": sender,
        "inviter_name": realname,
        "name": invitee,
    }
    return {
        "success": True,
        "message": "Invite created",
        "url": state.config["oauth"]["asf"]["invite_url"] + invite_id,
    }


def register(state: typing.Any):
    return ahapi.endpoint(process)
