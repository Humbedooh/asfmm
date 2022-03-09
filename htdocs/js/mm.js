/*
 Licensed to the Apache Software Foundation (ASF) under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

async function METHOD(method, url, data) {
    let payload = {
        method: method,
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: data ? {
            'Content-Type': 'application/json'
        } : {},
        redirect: 'follow',
        referrerPolicy: 'no-referrer'
    }
    if (data) {
        payload.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(url, payload).catch( (e) => {
            throw e
        });
        if (response.ok !== true) {
            let body = await response.text();
            return {
                "okay": false,
                "message": `HTTP Error ${response.status}: ${response.statusText} ${body}`
            }
        }
        let js = await response.json();
        return js
    } catch (e) {
        return {
            "okay": false,
            "message": e
        }
    }
}

// HTTP methods
let DELETE = (url, data) => METHOD('DELETE', url, data);
let GET = (url, data) => METHOD('GET', url, data);
let PATCH = (url, data) => METHOD('PATCH', url, data);
let POST = (url, data) => METHOD('POST', url, data);
let PUT = (url, data) => METHOD('PUT', url, data);

/* Turns links into...links */
function fixup_urls(splicer) {

    if (typeof splicer == 'object') {
        return splicer;
        //splicer = splicer.innerText;
    }
    /* Array holding text and links */
    let i, m, t, textbits, url, urls;
    textbits = [];

    /* Find the first link, if any */
    i = splicer.search(URL_RE);
    urls = 0;

    /* While we have more links, ... */
    while (i !== -1) {
        urls++;

        /* Only parse the first 250 URLs... srsly */
        if (urls > 250) {
            break;
        }

        /* Text preceding the link? add it to textbits frst */
        if (i > 0) {
            t = splicer.substr(0, i);
            textbits.push(t);
            splicer = splicer.substr(i);
        }

        /* Find the URL and cut it out as a link */
        m = splicer.match(URL_RE);
        if (m) {
            url = m[1];
            i = url.length;
            t = splicer.substr(0, i);
            textbits.push(new HTML('a', {
                href: url,
                target: '_blank',
            }, url));
            splicer = splicer.substr(i);
        }

        /* Find the next link */
        i = splicer.search(URL_RE);
    }

    /* push the remaining text into textbits */
    textbits.push(splicer);
    return textbits;
}

/**
 * String formatting prototype
 * A'la printf
 */

String.prototype.format = function() {
    let args = arguments;
    let n = 0;
    let t = this;
    let rtn = this.replace(/(?!%)?%([-+]*)([0-9.]*)([a-zA-Z])/g, function(m, pm, len, fmt) {
        len = parseInt(len || '1');
        // We need the correct number of args, balk otherwise, using ourselves to format the error!
        if (args.length <= n) {
            let err = "Error interpolating string '%s': Expected at least %u argments, only got %u!".format(t, n + 1, args.length);
            console.log(err);
            throw err;
        }
        let varg = args[n];
        n++;
        switch (fmt) {
            case 's':
                if (typeof(varg) == 'function') {
                    varg = '(function)';
                }
                return varg;
            // For now, let u, d and i do the same thing
            case 'd':
            case 'i':
            case 'u':
                varg = parseInt(varg).pad(len); // truncate to Integer, pad if needed
                return varg;
        }
    });
    return rtn;
};


/**
 * Number prettification prototype:
 * Converts 1234567 into 1,234,567 etc
 */

Number.prototype.pretty = function(fix) {
    if (fix) {
        return String(this.toFixed(fix)).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
    }
    return String(this.toFixed(0)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
};


/**
 * Number padding
 * usage: 123.pad(6) -> 000123
 */

Number.prototype.pad = function(n) {
    let str = String(this);

    /* Do we need to pad? if so, do it using String.repeat */
    if (str.length < n) {
        str = "0".repeat(n - str.length) + str;
    }
    return str;
};

/* Func for converting TZ offset from minutes to +/-HHMM */

Date.prototype.TZ_HHMM = function() {
    let off_mins = this.getTimezoneOffset();
    let off_hh =   Math.floor(Math.abs(off_mins/60));
    let off_mm =   Math.abs(off_mins%60);
    let sgn = off_mins > 0 ? '-' : '+';
    return sgn + off_hh.pad(2) + ':' + off_mm.pad(2);
};



/* Func for converting a date to YYYY-MM-DD HH:MM TZ */

Date.prototype.ISOBare = function() {
    let M, O, d, h, m, y;
    if (prefs.UTC === true) {
        y = this.getUTCFullYear();
        m = (this.getUTCMonth() + 1).pad(2);
        d = this.getUTCDate().pad(2);
        h = this.getUTCHours().pad(2);
        M = this.getUTCMinutes().pad(2);
        O = 'UTC';
    } else {
        y = this.getFullYear();
        m = (this.getMonth() + 1).pad(2);
        d = this.getDate().pad(2);
        h = this.getHours().pad(2);
        M = this.getMinutes().pad(2);
        O = this.TZ_HHMM();
    }
    return y + "-" + m + "-" + d + " " + h + ":" + M + " " + O;
};


/* isArray: function to detect if an object is an array */

function isArray(value) {
    return value && typeof value === 'object' && value instanceof Array && typeof value.length === 'number' && typeof value.splice === 'function' && !(value.propertyIsEnumerable('length'));
}


/* isHash: function to detect if an object is a hash */

function isHash(value) {
    return value && typeof value === 'object' && !isArray(value);
}


/* Remove an array element by value */

Array.prototype.remove = function(val) {
    let i, item, j, len;
    for (i = j = 0, len = this.length; j < len; i = ++j) {
        item = this[i];
        if (item === val) {
            this.splice(i, 1);
            return this;
        }
    }
    return this;
};


/* Check if array has value */
Array.prototype.has = function(val) {
    for (let item of this) {
        if (item === val) {
            return true;
        }
    }
    return false;
};

function isEmpty(obj) {
    return (
        obj &&
        Object.keys(obj).length === 0 &&
        Object.getPrototypeOf(obj) === Object.prototype
    );
}


/**
 * HTML: DOM creator class
 * args:
 * - type: HTML element type (div, table, p etc) to produce
 * - params: hash of element params to add (class, style etc)
 * - children: optional child or children objects to insert into the new element
 * Example:
 * div = new HTML('div', {
 *    class: "footer",
 *    style: {
 *        fontWeight: "bold"
 *    }
#}, "Some text inside a div")
 */

const txt = (msg) => document.createTextNode(msg);

const HTML = (function() {
    function HTML(type, params, children) {

        /* create the raw element, or clone if passed an existing element */
        if (typeof type === 'object') {
            this.element = type.cloneNode();
        } else {
            this.element = document.createElement(type);
        }

        /* If params have been passed, set them */
        if (isHash(params)) {
            for (let key in params) {
                let val = params[key];

                /* Standard string value? */
                if (typeof val === "string" || typeof val === 'number') {
                    this.element.setAttribute(key, val);
                } else if (isArray(val)) {

                    /* Are we passing a list of data to set? concatenate then */
                    this.element.setAttribute(key, val.join(" "));
                } else if (isHash(val)) {

                    /* Are we trying to set multiple sub elements, like a style? */
                    for (let subkey in val) {
                        let subval = val[subkey];
                        if (!this.element[key]) {
                            throw "No such attribute, " + key + "!";
                        }
                        this.element[key][subkey] = subval;
                    }
                }
            }
        }

        /* If any children have been passed, add them to the element */
        if (children) {

            /* If string, convert to textNode using txt() */
            if (typeof children === "string") {
                this.element.inject(txt(children));
            } else {

                /* If children is an array of elems, iterate and add */
                if (isArray(children)) {
                    let child, j, len;
                    for (j = 0, len = children.length; j < len; j++) {
                        child = children[j];

                        /* String? Convert via txt() then */
                        if (typeof child === "string") {
                            this.element.inject(txt(child));
                        } else {

                            /* Plain element, add normally */
                            this.element.inject(child);
                        }
                    }
                } else {

                    /* Just a single element, add it */
                    this.element.inject(children);
                }
            }
        }
        return this.element;
    }

    return HTML;

})();

/**
 * prototype injector for HTML elements:
 * Example: mydiv.inject(otherdiv)
 */

HTMLElement.prototype.inject = function(child) {
    let item, j, len;
    if (isArray(child)) {
        for (j = 0, len = child.length; j < len; j++) {
            item = child[j];
            if (typeof item === 'string') {
                item = txt(item);
            }
            this.appendChild(item);
        }
    } else {
        if (typeof child === 'string') {
            child = txt(child);
        }
        this.appendChild(child);
    }
    return child;
};



/**
 * prototype for emptying an html element
 */
HTMLElement.prototype.empty = function() {
    let ndiv;
    ndiv = this.cloneNode();
    this.parentNode.replaceChild(ndiv, this);
    return ndiv;
};


/* OUR ACTUAL CODE GOES HERE */


// Init variables
let prefs;
let attendees = 0;
let max_people = 0;
let current_people = [];
let rooms = [];
let current_room = null;
let notify_user = false;
const URL_RE = new RegExp("(" + "(?:(?:[a-z]+)://)" + "(?:\\S+(?::\\S*)?@)?" + "(?:" + "([01][0-9][0-9]|2[0-4][0-9]|25[0-5])" + "|" + "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" + "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" + "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" + "\\.?" + ")" + "(?::\\d{2,5})?" + "(?:[/?#]([^,<>()\\[\\] \\t\\r\\n]|(<[^:\\s]*?>|\\([^:\\s]*?\\)|\\[[^:\\s]*?\\]))*)?" + ")\\.?", "mi");
let wscon = null;

// Grabs credentials or goes to oauth screen
async function get_preferences(formdata) {
    const xprefs = await GET("/preferences");
    if (formdata.get("action") == 'invite') {
        location.href = '/oauth?provider=guest&' + formdata.toString();
        return
    }
    if (xprefs.credentials === null && location.pathname !== "/oauth.html") {
        window.localStorage.setItem('mm_redirect', location.href);
        location.href = "/oauth.html";
        return {}
    } else if (xprefs.credentials !== null){
        const ru = window.localStorage.getItem('mm_redirect');
        if (ru) {
            window.localStorage.removeItem('mm_redirect');
            location.href = ru;
            return {}
        }
    }
    return xprefs;
}

function notify(room, sender, message) {
    var notification = new Notification(`${sender} (#${room}): ${message}`);
}

// OAuth gateway function
async function oauth_gate(func) {
    const form_data = new URLSearchParams(location.search);
    prefs = await get_preferences(form_data);
    if (prefs && prefs.credentials) {
        await func(form_data);
    }
}

// Top bar status writer
function write_creds() {
    const creds = document.getElementById('credentials');
    if (creds) creds.innerText = `Logged in as ${prefs.credentials.name} (via ${prefs.credentials.provider}). Currently ${attendees} attending (total attendance this meeeting: ${max_people}). `;
    let logout_link = document.createElement('a');
    logout_link.href = "/preferences?logout=true";
    logout_link.innerText = "Sign out";
    creds.appendChild(logout_link);

    let counter = document.getElementById('counter');
    counter.innerText = current_people.length;
    let userlist = document.getElementById('userlist');
    userlist.innerText = '';
    if (prefs.admin) {
        document.getElementById('sidebar').style.width = '290px';
    }
    for (let user of current_people) {
        let udiv = new HTML('li', {}, user);
        if (prefs.admin) {
            // muted user
            if (prefs.statuses.blocked.has(user)) {
                udiv.style.color = 'grey';
                udiv.title = "User muted - cannot post";
                let block = new HTML('a', {href: `javascript:void(unblock_user('${user}'));`, style: { marginLeft: '6px', float: 'right'}}, 'unmute');
                udiv.inject(block);
            } else {
                let block = new HTML('a', {href: `javascript:void(block_user('${user}'));`, style: { marginLeft: '6px', float: 'right'}}, 'mute');
                udiv.inject(block);
            }
            // banned user
            if (prefs.statuses.banned.has(user)) {
                udiv.style.color = 'red';
                udiv.title = "User banned - cannot read or post";
                let ban = new HTML('a', {href: `javascript:void(unban_user('${user}'));`, style: { marginLeft: '6px', float: 'right'}}, 'unban');
                udiv.inject(ban);
            } else {
                let ban = new HTML('a', {href: `javascript:void(ban_user('${user}'));`, style: { marginLeft: '6px', float: 'right'}}, 'ban');
                udiv.inject(ban);
            }

        }
        userlist.inject(udiv);
    }
    // non-guests can invite others
    if (!prefs.credentials.login.startsWith("guest")) {
        document.getElementById('invite').style.display = 'block';
    }
}

async function block_user(who) {
    const resp = await POST("/mgmt", {
        action: 'block',
        user: who
    });
    prefs.statuses['blocked'].push(who);
    alert(resp.message);
    write_creds();
}

async function ban_user(who) {
    const resp = await POST("/mgmt", {
        action: 'ban',
        user: who
    });
    prefs.statuses['banned'].push(who);
    alert(resp.message);
    write_creds();
}

async function unblock_user(who) {
    const resp = await POST("/mgmt", {
        action: 'unblock',
        user: who
    });
    prefs.statuses['blocked'].remove(who);
    alert(resp.message);
    write_creds();
}

async function unban_user(who) {
    const resp = await POST("/mgmt", {
        action: 'unban',
        user: who
    });
    prefs.statuses['banned'].remove(who);
    alert(resp.message);
    write_creds();
}


async function invite() {
    let name = window.prompt("Please enter the full name of the person you wish to invite");
    if (name && name.length) {
        let resp = await POST("/invite", {name: name});
        if (resp && resp.success) {
            show_invite(resp.url, name);
        }
    }
}

function show_invite(url, name) {
    let modal = document.getElementById("modal");
    let span = document.getElementsByClassName("close")[0];
    let text = document.getElementById('modal_text');
    modal.style.display = "block";
    span.onclick = function() {
        modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
    text.innerText = `Here is your invite link for ${name}: \n`;
    text.inject(fixup_urls(url));
    text.inject(new HTML('br'));
    text.inject(new HTML('br'));
    let copy = new HTML('a', {href: 'javascript:void(0);'}, [
        new HTML('img', {src: '/images/clipboard.png', align: 'absmiddle'}),
        'Copy to clipboard'
    ]);
    copy.style.marginLeft = '8px';
    copy.addEventListener('click', () => {
        navigator.clipboard.writeText(url);
        let cpnot = new HTML('div', {id: 'cpnotif'}, "Copied to clipboard!");
        document.body.appendChild(cpnot);
        window.setTimeout(() => { cpnot.style.opacity = '0'}, 50);
        window.setTimeout(() => { cpnot.parentNode.removeChild(cpnot)}, 1000);
    });
    text.inject(copy);
}


async function main() {
    const main = document.getElementById('main');
    write_creds();
    await chat();
}


async function chat() {
    const prot = (location.protocol == 'https:') ? 'wss://' : 'ws://';
    wscon = new WebSocket(prot + location.hostname + '/chat');
    // Connection killed
    wscon.addEventListener('close', function (event) {
        location.reload();
    });

    wscon.addEventListener('error', function (event) {
        alert("Connection was lost, reloading..!");
        location.reload();
    });

    window.onbeforeunload = function() {
        wscon.close();
        console.log("Closing chat...");
    }
    // Listen for messages
    wscon.addEventListener('message', function (event) {
        const js = JSON.parse(event.data);
        if (js.room_data) {
            js.room_data.unread = 0;
            rooms.push(js.room_data);
            current_room = rooms[0].id;
            show_channel(current_room)
            console.log(js.room_data);
        }
        if (js.channel) {
            let channeldiv = document.getElementById('channel_' + js.channel);
            if (!channeldiv) {
                channeldiv = document.createElement('div');
                channeldiv.setAttribute('id', 'channel_' + js.channel);
                channeldiv.setAttribute('class', 'channel');
                document.getElementById('main').appendChild(channeldiv);
                if (js.channel != current_room) channeldiv.style.display = 'none';
            }
            const now = new Date(js.timestamp * 1000.0).ISOBare();
            let messagediv = new HTML('div', {class: 'message'});
            let datediv = new HTML('div', {class: 'timestamp'}, `[${now}]`);
            datediv.title = new Date(js.timestamp * 1000.0).toString();
            let namediv = new HTML('div', {class: 'name'}, `${js.realname} (${js.sender}): `);
            namediv.title = namediv.innerText;
            if (js.timestamp == 0) {
                datediv.innerText = '';
                namediv.innerText = '';
                messagediv.style.color = 'navy';
                messagediv.style.fontWeight = 'bold';
            }

            let is_action = false;
            if (js.message.match(/^\/me /)) {
                js.message = js.message.substr(4);
                is_action = true;
            }
            let parsed = fixup_urls(js.message);
            messagediv.inject(parsed);
            if (is_action) {
                messagediv.style.fontStyle = 'italic';
                messagediv.style.color = 'blue';
            }
            if (js.message.match('@' + prefs.credentials.login + "\\b")) {
                messagediv.style.fontWeight = 'bold';
                messagediv.style.color = 'purple';
            }
            let linediv = new HTML('div', {class: 'line'});
            linediv.inject(datediv);
            linediv.inject(namediv);
            linediv.inject(messagediv);
            channeldiv.inject(linediv);
            channeldiv.scrollTo(0, channeldiv.scrollHeight);

            // Notify on mention??
            if (js.message.match('@' + prefs.credentials.login + "\\b") && notify_user) {
                notify(js.channel, js.realname, js.message);
            }

            if (js.channel != current_room) {
                for (room of rooms) {
                    if (room.id == js.channel && js.timestamp) {
                        room.unread++;
                        let urdiv = document.getElementById('unread_' + room.id);
                        urdiv.innerText = room.unread;
                    }
                }
            }
        }
        else if (js.pong) {
            attendees = js.attendees;
            max_people = js.max;
            current_people = js.current;
            current_people.sort((a, b) => a.localeCompare(b));
            prefs.statuses = js.statuses;
            write_creds();
        }
    });
}


function check_send(el, force=false) {
    if(force || event.key === 'Enter' && !event.shiftKey) {
        POST("/post", {
            room: current_room,
            message: el.value
        });
        el.value = '';
        event.preventDefault();
    }
}


function show_channel(chan) {
    let chandiv = document.getElementById('channel_' + current_room);
    if (chandiv) chandiv.style.display = 'none';

    current_room = chan;
    chandiv = document.getElementById('channel_' + chan);
    if (!chandiv) {
        chandiv = document.createElement('div');
        chandiv.setAttribute('id', 'channel_' + chan);
        chandiv.setAttribute('class', 'channel');
        document.getElementById('main').appendChild(chandiv);
    }
    chandiv.style.display = 'inline-block';
    chandiv.scrollTo(0, chandiv.scrollHeight);

    let chanpicker = document.getElementById('chanpicker');
    chanpicker.innerText = '';
    for (let room of rooms) {
        let li = new HTML('li');
        let a = new HTML('a', { href: "javascript:void(show_channel('" + room.id + "'))"});
        a.appendChild(li);
        li.innerText = room.title;
        let unreads = new HTML('span', {class: 'label'});
        unreads.setAttribute('id', 'unread_' + room.id);
        if (room.unread) unreads.innerText = room.unread;
        li.appendChild(unreads);
        chanpicker.appendChild(a);
        if (room.id != current_room) {
            li.setAttribute('type', 'inactive');
        } else {
            li.setAttribute('type', 'active');
            room.unread = 0;
            unreads.innerText = '';
        }
    }

}

// Enable/disable notifications for nick mentions
document.getElementById('notify').addEventListener('click', (event) => {
    if (event.target.checked) {
        Notification.requestPermission().then(function (result) {
            if (result == 'granted') {
                notify_user = true;
                console.log("Enabling notifications");
            }
        });
    } else {
        notify_user = false;
        console.log("Disabling notifications");
    }

});
