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
import time

"""Proxy assignment end point for ASFMM"""

APP = asfquart.APP


@APP.route("/proxy", methods=["POST"])
@asfquart.auth.require()
async def process_proxy() -> typing.Any:
    session = await asfquart.session.read()
    formdata = await asfquart.utils.formdata()
    whoami = session.uid
    if whoami.startswith("guest_"):
        return {"success": False, "message": "Guests cannot assign proxies"}

    assigned = set()
    invalid = set()
    for member in formdata.get("members"):
        if member and member in APP.state.members:
            APP.state.quorum.add(member)
            assigned.add(member)
        elif member:
            invalid.add(member)
    if not invalid:
        APP.state.db.insert("auditlog", {"uid": whoami, "timestamp": time.time(), "action": f"added the following {len(assigned)} proxies: {', '.join(list(assigned))}"})
        return {
            "success": True,
            "message": f"{len(assigned)} proxies assigned to you: " + ", ".join(list(assigned))
        }
    else:
        APP.state.db.insert("auditlog", {"uid": whoami, "timestamp": time.time(), "action": f"added the following {len(assigned)} proxies: {', '.join(list(assigned))}. The following {len(invalid)} invalid proxies were present: {', '.join(list(invalid))}"})
        return {
            "success": True,
            "message": f"{len(assigned)} proxies assigned to you: " + ", ".join(list(assigned)) + f"\n{len(invalid)} proxies were invalid or already assigned: " + ", ".join(list(invalid))
        }
