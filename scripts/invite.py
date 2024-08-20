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
import asfquart.generics
import asfquart.session
import typing
import uuid
import time

"""Invitation end point for ASFMM"""

APP = asfquart.APP

@APP.route("/invite", methods=["POST", "GET"])
@asfquart.auth.require()
async def process() -> typing.Any:
    session = await asfquart.session.read()
    formdata = await asfquart.utils.formdata()
    invitee = formdata.get("name")
    sender = session.uid
    if not invitee or sender.startswith("guest_") or sender in state.banned:
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    realname = session.fullname

    invite_id = str(uuid.uuid4())
    state.invites[invite_id] = {
        "timestamp": time.time(),
        "inviter": sender,
        "inviter_name": realname,
        "name": f"{invitee} (Guest)",
    }
    return {
        "success": True,
        "message": "Invite created",
        "url": APP.state.config["oauth"]["asf"]["invite_url"] + invite_id,
    }

