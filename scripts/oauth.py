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
import urllib.parse
import uuid

"""OAuth end point for ASFMM"""


def redirect(url):
    return aiohttp.web.Response(status=302, headers={"Location": url}, text="Redirecting back to MM...")


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}
    provider = formdata.get("provider")
    step = formdata.get("step", "init")

    # ASF Oauth
    if provider == "asf":
        if step == "init":
            cb = state.config["oauth"]["asf"]["callback_url"]
            callback_url = urllib.parse.quote(cb)
            uid = str(uuid.uuid4())
            return redirect(
                f"https://oauth.apache.org/auth?state={uid}&redirect_uri={callback_url}"
            )
        elif step == "callback":
            async with aiohttp.ClientSession() as session:
                # Grab data
                headers = {
                    "Accept": "application/json",
                }
                async with session.post(
                        "https://oauth.apache.org/token", headers=headers, data=formdata
                ) as rv:
                    response = await rv.json()
                    messages: list = []
                    msghash = uuid.uuid4()
                    cookie.state = {
                        "credentials": {
                            "login": response['uid'],
                            "name": response["fullname"],
                            "provider": "Apache OAuth",
                        },
                        "pending_messages": messages,
                        "admin": response["uid"] in state.config["admins"],
                    }
                    return redirect("/")
    elif provider == "guest":
        code = formdata.get("code")
        if code and code in state.invites:
            guest_prefix = 1
            for attendee in state.attendees.keys():
                if attendee.startswith("guest_"):
                    guest_prefix += 1
            cookie.state = {
                "credentials": {
                    "login": "guest_" + str(guest_prefix) + "/" + state.invites[code]["inviter"],
                    "name": state.invites[code]["name"],
                    "provider": "Invite Code",
                },
                "admin": False,
                "pending_messages": [],
            }
            del state.invites[code]
            return redirect("/")
        else:
            return "Could not find invite code. It may have already been used."



def register(state: typing.Any):
    return ahapi.endpoint(process)
