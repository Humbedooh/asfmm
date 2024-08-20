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
import aiohttp.web
import urllib.parse
import uuid
import time

"""OAuth end point for ASFMM"""

APP = asfquart.APP


def redirect(url):
    return aiohttp.web.Response(status=302, headers={"Location": url}, text="Redirecting back to MM...")


@APP.route("/oauth")
async def process_oauth() -> typing.Any:
    formdata = await asfquart.utils.formdata()
    provider = formdata.get("provider")
    step = formdata.get("step", "init")

    # ASF Oauth
    if provider == "asf":
        if step == "init":
            cb = APP.state.config["oauth"]["asf"]["callback_url"]
            callback_url = urllib.parse.quote(cb)
            uid = str(uuid.uuid4())
            return redirect(f"https://oauth.apache.org/auth?state={uid}&redirect_uri={callback_url}")
        elif step == "callback":
            async with aiohttp.ClientSession() as session:
                # Grab data
                headers = {
                    "Accept": "application/json",
                }
                async with session.post("https://oauth.apache.org/token", headers=headers, data=formdata) as rv:
                    response = await rv.json()
                    messages: list = []
                    msghash = uuid.uuid4()
                    new_session = {
                        "credentials": {
                            "login": response["uid"],
                            "name": response["fullname"],
                            "provider": "Apache OAuth",
                        },
                        "pending_messages": messages,
                        "admin": response["uid"] in APP.state.config["admins"],
                    }
                    await asfquart.session.write(new_session)
                    # Update quorum if member
                    if response["uid"] in APP.state.members:
                        APP.state.quorum.add(response["uid"])
                        APP.state.db.insert("auditlog", {"uid": response["uid"], "timestamp": time.time(), "action": f"logged in via {new_session['credentials']['provider']}"})
                    return redirect("/")
    elif provider == "guest":
        code = formdata.get("code")
        if code and code in APP.state.invites:
            guest_prefix = 1
            for attendee in APP.state.attendees.keys():
                if attendee.startswith("guest_"):
                    guest_prefix += 1
            new_session = {
                "credentials": {
                    "uid": "guest_" + str(guest_prefix) + "/" + APP.state.invites[code]["inviter"],
                    "fullname": APP.state.invites[code]["name"],
                    "provider": "Invite Code",
                },
                "admin": False,
                "pending_messages": [],
            }
            await asfquart.session.write(new_session)
            del APP.state.invites[code]
            return redirect("/")
        else:
            return "Could not find invite code. It may have already been used."

