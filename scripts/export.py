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
import tarfile
import io
import aiohttp.web
import time

"""Data export end point for ASFMM"""


async def process(state: typing.Any, request, formdata: dict) -> typing.Any:
    cookie = state.cookies.get(request)  # Fetches a valid session or None if not found
    if not cookie or not cookie.state or not cookie.state.get("credentials"):
        return {"success": False, "message": "Oops, something went terribly wrong here!"}

    whoami = cookie.state["credentials"]["login"]
    if whoami.startswith("guest_"):
        return {"success": False, "message": "Guests cannot export data"}

    out = io.BytesIO()
    tar = tarfile.open(mode="w:gz", fileobj=out)

    # Export attendance
    attendance = "\n".join(state.quorum.members).encode('utf-8')
    file = io.BytesIO(attendance)
    info = tarfile.TarInfo(name="attendance.txt")
    info.size = len(attendance)
    tar.addfile(tarinfo=info, fileobj=file)

    # Export chat logs
    for room in state.rooms:
        logfile = ""
        for message in room.messages:
            for line in message["message"].split("\n"):
                logfile += f"[{time.ctime(message['timestamp'])}] {message['realname']} ({message['sender']}): {line}\n"
        logfile = logfile.encode('utf-8')
        file = io.BytesIO(logfile)
        info = tarfile.TarInfo(name=f"chat-{room.name}.txt")
        info.size = len(logfile)
        tar.addfile(tarinfo=info, fileobj=file)

    # Close up and send
    tar.close()
    headers = {
        'Content-Disposition': 'attachment; filename=asfmm.tgz',
        "Content-Type": 'application/tgz'
    }
    response = aiohttp.web.Response(headers=headers, body=out.getvalue())
    return response


def register(state: typing.Any):
    return ahapi.endpoint(process)
