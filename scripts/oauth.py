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

import quart
import asfquart
import asfquart.auth
import asfquart.session
import asfquart.utils
import typing
import time

"""OAuth end point for ASFMM"""

APP = asfquart.APP


def redirect(url):
    return quart.Response("Redirecting back to ASFMM...", status=302, headers={"Location": url})


@APP.route("/oauth")
async def process_oauth() -> typing.Any:
    formdata = await asfquart.utils.formdata()
    provider = formdata.get("provider")
    step = formdata.get("step", "init")
    # ASF Oauth
    if provider == "asf":
        if step == "callback":
            session = await asfquart.session.read()
            if session and session.uid in APP.state.members:
                APP.state.quorum.add(session.uid)
                APP.state.db.insert("auditlog", {"uid": session.uid, "timestamp": time.time(), "action": f"logged in via ASF OAuth"})
                return redirect("/")
            else:  # Not a member?!
                return "Only current ASF Members can log in via OAuth. If you are an emeritus member or a guest, please have a current member invite you."
    elif provider == "guest":
        code = formdata.get("code")
        if code and code in APP.state.invites:
            guest_prefix = 1
            for attendee in APP.state.attendees.keys():
                if attendee.startswith("guest_"):
                    guest_prefix += 1
            new_session = {
                "uid": "guest_" + str(guest_prefix) + "/" + APP.state.invites[code]["inviter"],
                "fullname": APP.state.invites[code]["name"],
                "provider": "Invite Code",
            }
            asfquart.session.write(new_session)
            del APP.state.invites[code]
            return redirect("/")
        else:
            return "Could not find invite code. It may have already been used."

