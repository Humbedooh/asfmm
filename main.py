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
import quart
import classes
import os

# This forces the old style non-OIDC login.
asfquart.generics.OAUTH_URL_INIT = "https://oauth.apache.org/auth?state=%s&redirect_uri=%s"
asfquart.generics.OAUTH_URL_CALLBACK = "https://oauth.apache.org/token?code=%s"


def htdocs_path(path):
    """Returns the normalized path of a URI if it is within htdocs proper, otherwise None"""
    if path.endswith("/"):
        path += "index.html"
    disk_path = os.path.join("htdocs", path[1:])  # htdocs + path without leading slash
    if os.path.exists(disk_path) and os.path.normpath(disk_path).startswith("htdocs/"):
        return path[1:]


def asfmm_app():
    app = asfquart.construct("asfmm", oauth="/oauth_asf")
    app.state = classes.State()
    import endpoints

    # Static files (or index.html if requesting a dir listing)
    @app.route("/<path:path>")
    @app.route("/")
    async def static_files(path="index.html"):
        disk_path = htdocs_path(quart.request.path)
        if disk_path:
            return await quart.send_from_directory("htdocs", disk_path)


    app.run(port=8080)


if __name__ == "__main__":
    asfmm_app()
