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
import quart
import typing
import tarfile
import io
import time

"""Data export end point for ASFMM"""


APP = asfquart.APP


@APP.route("/export")
@asfquart.auth.require()
async def process_export() -> typing.Any:
    session = await asfquart.session.read()
    whoami = session.uid
    if whoami.startswith("guest_"):
        return {"success": False, "message": "Guests cannot export data"}

    out = io.BytesIO()
    tar = tarfile.open(mode="w:gz", fileobj=out)

    # Export attendance
    attendance = "\n".join(APP.state.quorum.members).encode('utf-8')
    file = io.BytesIO(attendance)
    info = tarfile.TarInfo(name="attendance.txt")
    info.size = len(attendance)
    tar.addfile(tarinfo=info, fileobj=file)

    # Export proxy attendance (quorum minus in-person attendance)
    proxy_attendance = "\n".join([x for x in APP.state.quorum.members if x not in APP.state.attendees.keys()]).encode('utf-8')
    file = io.BytesIO(proxy_attendance)
    info = tarfile.TarInfo(name="proxies-counted.txt")
    info.size = len(proxy_attendance)
    tar.addfile(tarinfo=info, fileobj=file)

    # Export audit log
    auditlog = ""
    for row in APP.state.db.fetch("auditlog", limit=0):
        auditlog += f"[{time.ctime(row['timestamp'])}] {row ['uid']} {row['action']}\n"
    auditlog = auditlog.encode('utf-8')
    file = io.BytesIO(auditlog)
    info = tarfile.TarInfo(name="auditlog.txt")
    info.size = len(auditlog)
    tar.addfile(tarinfo=info, fileobj=file)

    # Export chat logs
    for room in APP.state.rooms:
        logfile = ""
        for message in room.messages:
            for line in message["message"].split("\n"):
                if not line.startswith("[off]"):  # Don't export the off-the-record stuff
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
    response = quart.Response(out.getvalue(), headers=headers)
    return response
