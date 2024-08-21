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

""" Preferences endpoint for ASFMM """


def redirect(url="/"):
    return quart.Response("Redirecting back to ASFMM...", status=302, headers={"Location": url})

APP = asfquart.APP


@APP.route("/preferences")
@asfquart.auth.require()
async def process_prefs() -> typing.Any:
    formdata = await asfquart.utils.formdata()
    session = await asfquart.session.read()
    if formdata.get("logout"):  # Logout - wipe the cookie
        asfquart.session.clear()
        return redirect()
    return {
        "credentials": dict(session),
        "admin": session.uid in APP.state.admins
    }
