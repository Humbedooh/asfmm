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

"""Various classes in use by ASFMM"""

import time
import typing
import asfpy.sqlite
import uuid
import yaml
import ahapi.session
import requests

DB_CREATE_MESSAGES = """
CREATE TABLE "messages" (
    "uid"	TEXT NOT NULL,
    "timestamp"	REAL NOT NULL,
    "room"	TEXT NOT NULL,
    "sender"	TEXT NOT NULL,
    "realname"	TEXT NOT NULL,
    "message"	TEXT NOT NULL,
    PRIMARY KEY("uid")
);
"""

DB_CREATE_QUORUM = """
CREATE TABLE "quorum" (
    "name" TEXT NOT NULL
);
"""


class ChatRoom:
    """A chat room with metadata and messages"""

    def __init__(self, state, name, title, topic):
        self.state: State = state
        self.name = name
        self.title = title
        self.topic = topic
        self.audit = []
        self.flood_control = []  # Manages flood throttling by keeping timestamps of the last N messages
        self.messages = [x for x in self.state.db.fetch("messages", limit=0, room=name)]
        print(f"Fetched {len(self.messages)} message(s) from channel #{name}")

    def add_message(self, sender, realname, message):
        """Adds a message to the chat room, sending it to all websocket subscribers"""
        message = {
            "timestamp": time.time(),
            "uid": str(uuid.uuid4()),
            "room": self.name,
            "sender": sender,
            "realname": realname,
            "message": message,
        }
        self.state.db.insert("messages", message)
        self.messages.append(message)
        for subscriber, messages in self.state.pending_messages.items():
            messages.append(message)


class Quorum:
    def __init__(self, db: asfpy.sqlite.DB):
        self.db = db
        if not self.db.table_exists("quorum"):
            print("Creating DB table for quorum")
            self.db.runc(DB_CREATE_QUORUM)
        self.members = set([x["name"] for x in self.db.fetch("quorum", limit=0)])

    def add(self, member: str):
        if member and member not in self.members:
            self.members.add(member)
            self.db.insert("quorum", {"name": member})


class State:
    """Global state object for operations"""

    def __init__(self):
        self.config: dict = yaml.safe_load(open("mm.yaml"))
        self.cookies: typing.Optional[ahapi.session.CookieFactory] = None
        self.rooms: list = []
        self.pending_messages: dict = {}
        self.attendees: dict = {}
        self.quorum: set = set()
        self.invites: dict = {}
        db_name = self.config["database"]
        print(f"Opening database {db_name}")
        self.db: asfpy.sqlite.DB = asfpy.sqlite.DB(db_name)
        self.blocked: list = []
        self.banned: list = []
        self.members = requests.get(self.config["quorum"]["json_url"]).json()['members']
        self.quorum = Quorum(self.db)

        print(f"Loaded {len(self.quorum.members)} attendees from quorum table")

        if not self.db.table_exists("messages"):
            print("Creating DB table for messages")
            self.db.runc(DB_CREATE_MESSAGES)

        for room, data in self.config["channels"].items():
            self.rooms.append(ChatRoom(self, room, data["name"], data["topic"]))
