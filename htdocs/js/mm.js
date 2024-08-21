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

function toFormData(params) {
    if (!params) return null; // No form data? Return null then.
    if (params instanceof FormData) return params; // Already a FormData object? Just return it then.
    if (params instanceof File) return params; // A File object will also suffice for Fetch.
    // Otherwise, construct from dictionary and return.
    const fd = new FormData();
    Object.entries(params).forEach(([key, value]) => fd.append(key, value));
    return fd;
}


async function METHOD(method = "GET", url, params={}) {
    const parameters = params || {}; // We want a dict here
    const headers = new Headers();
    if (parameters.json) headers.append('Content-Type', 'application/json');
    const data = parameters.json ? JSON.stringify(parameters.json) : toFormData(parameters.data);
    const response = await fetch(url, {
        method,
        headers,
        body: data,
    });
    return response;
}

// HTTP methods
let DELETE = (url, data) => METHOD('DELETE', url, data);
let GET = (url, data) => METHOD('GET', url, data);
let PATCH = (url, data) => METHOD('PATCH', url, data);
let POST = (url, data) => METHOD('POST', url, {json: data});
let PUT = (url, data) => METHOD('PUT', url, {json: data});

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

/* Determine if object is an array */
function isArray(value) {
    return value && typeof value === 'object' && value instanceof Array && typeof value.length === 'number' && typeof value.splice === 'function' && !(value.propertyIsEnumerable('length'));
}

/* Determine if object is a hash */
function isHash(value) {
    return value && typeof value === 'object' && !isArray(value);
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
            this.inject(item);
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
let notify_block = true;
const URL_RE = new RegExp("(" + "(?:(?:[a-z]+)://)" + "(?:\\S+(?::\\S*)?@)?" + "(?:" + "([01][0-9][0-9]|2[0-4][0-9]|25[0-5])" + "|" + "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" + "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" + "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" + "\\.?" + ")" + "(?::\\d{2,5})?" + "(?:[/?#]([^,<>()\\[\\] \\t\\r\\n]|(<[^:\\s]*?>|\\([^:\\s]*?\\)|\\[[^:\\s]*?\\]))*)?" + ")\\.?", "mi");
let wscon = null;
let tribute;
let nicks = [];

// Grabs credentials or goes to oauth screen
async function get_preferences(formdata) {
    const xprefs = await GET("/preferences");
    if (formdata.get("action") == 'invite') {
        location.href = '/oauth_asf?provider=guest&' + formdata.toString();
        return
    }
    if (xprefs.status === 403 && location.pathname !== "/oauth.html") {
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
    if (!notify_block) new Notification(`${sender} (#${room}): ${message}`);
    else console.log("Found notification, but notifications are blocked for now...");
}

// OAuth gateway function
async function oauth_gate(func) {
    const form_data = new URLSearchParams(location.search);
    prefs = await get_preferences(form_data);
    if (prefs.status === 404) {

    }
    else {
        prefs = await prefs.json();
        await func(form_data);
    }
}

// Top bar status writer
function write_creds() {
    const creds = document.getElementById('credentials');
    const username = document.getElementById('username');
    username.innerText = `Welcome, ${prefs.credentials.fullname}`;
    let counter = document.getElementById('counter');
    counter.innerText = current_people.length;
    let userlist = document.getElementById('userlist');
    userlist.innerText = '';
    if (prefs.admin) {
        //document.getElementById('sidebar').style.width = '290px';
    }
    for (let user of current_people) {
        let udiv = new HTML('li', {}, user);
        if (prefs.admin && user !== prefs.credentials.uid) {
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
        if (user === prefs.credentials.uid) {
            udiv.innerText += " (You)";
        }
        userlist.inject(udiv);
    }
    // non-guests can invite others
    if (!prefs.credentials.uid.startsWith("guest")) {
        document.getElementById('invite').style.display = 'block';
        document.getElementById('assign_proxies').style.display = 'block';
    }
    if (prefs.quorum && prefs.quorum.present.length > prefs.quorum.required) {
        let quorum = document.getElementById('quorum');
        quorum.style.display = 'block';
        quorum.className = 'bg-success';
        quorum.innerText = `Quorum reached. ${prefs.quorum.present.length} members out of a required ${prefs.quorum.required} accounted for.`;
    } else if (prefs.quorum) {
        let quorum = document.getElementById('quorum');
        quorum.style.display = 'block';
        quorum.className = 'bg-danger';
        quorum.innerText = `Quorum not yet reached. ${prefs.quorum.present.length} out of a required ${prefs.quorum.required} members present.`;
    }
    nicks.splice(0,nicks.length);
    for (let nick of current_people) {
        nicks.push({
            key: '@' + nick,
            value: nick
        });
    }
}


// mgmt functions
async function block_user(who) {
    const resp = await POST("/mgmt", {
        action: 'block',
        user: who
    });
    prefs.statuses['blocked'].push(who);
    let rv = await resp.json();
    alert(rv.message)
    write_creds();
}

async function ban_user(who) {
    const resp = await POST("/mgmt", {
        action: 'ban',
        user: who
    });
    prefs.statuses['banned'].push(who);
    let rv = await resp.json();
    alert(rv.message)
    write_creds();
}

async function unblock_user(who) {
    const resp = await POST("/mgmt", {
        action: 'unblock',
        user: who
    });
    prefs.statuses['blocked'].remove(who);
    let rv = await resp.json();
    alert(rv.message)
    write_creds();
}

async function unban_user(who) {
    const resp = await POST("/mgmt", {
        action: 'unban',
        user: who
    });
    prefs.statuses['banned'].remove(who);
    let rv = await resp.json();
    alert(rv.message)
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

function assign_proxies() {
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
    text.innerText = "This form allows you to act as proxy for other members. If one or more members have asked you to proxy them, please enter their ASF ID(s) below, one per line. You can fetch a list of members you are proxying at: ";
    text.inject(new HTML('a', {href: 'https://whimsy.apache.org/members/proxy.cgi', target: '_blank'}, 'https://whimsy.apache.org/members/proxy.cgi'))
    text.inject(new HTML('br'));
    text.inject(new HTML('br'));
    let txt = new HTML('textarea', {id: 'proxies'});
    txt.style.height = '300px';
    txt.style.width = "98%";
    text.inject(txt)
    let btn = new HTML('button', {onclick: 'send_proxies();'}, 'Submit');
    text.inject(new HTML('br'));
    text.inject(btn);
}


async function send_proxies() {
    let modal = document.getElementById("modal");
    let proxies = [];
    for (let line of document.getElementById('proxies').value.split(/\r?\n/)) {
        let asfid = line.split(/\s/)[0];
        proxies.push(asfid);
    }
    const resp = await POST("/proxy", {
        members: proxies
    });
    let text = document.getElementById('modal_text');
    let rv = await resp.json();
    text.innerText = rv.message
}


async function main() {
    write_creds();
    await chat();
}

// chat loop
async function chat() {
    const prot = (location.protocol == 'https:') ? 'wss://' : 'ws://';
    const port = (location.port == "") ? "" : ":" + location.port;
    wscon = new WebSocket(prot + location.hostname + port + '/chat');
    // Connection killed
    wscon.addEventListener('close', function (event) {
        if (!event.wasClean) {
            alert("Connection was lost, reconnecting..!");
            location.reload();
        }
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
            if (!channeldiv) channeldiv =  mkchannel(js.channel);
            const now = moment(js.timestamp * 1000.0).fromNow();
            let messagediv = new HTML('div', {class: 'message'});
            let dateinner = new HTML('span', {}, now);
            let datediv = new HTML('div', {class: 'timestamp', tz: js.timestamp*1000.0}, dateinner);
            // Update timestamp every 30-40 seconds..ish. Random distribution of load
            window.setInterval(() => dateinner.innerText = moment(parseFloat(datediv.getAttribute('tz'))).fromNow(), 30000 + (Math.random()*10000));
            datediv.title = new Date(js.timestamp * 1000.0).toString();
            let namediv = new HTML('div', {class: 'name'}, `${js.realname} (${js.sender})`);
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
            // [off] needs to be marked as such
            if (js.message.match(/^\s*\[off\]\s*/)) {
                messagediv.setAttribute('class', 'message_off');
            }
            let parsed = fixup_urls(js.message);
            parsed = fixup_formatting(parsed, /\b__(.+?)__\b/, "b");
            parsed = fixup_formatting(parsed, /\b_(.+?)_\b/, "i");
            parsed = fixup_formatting(parsed, /(?=[\s^])?\*\*(.+?)\*\*(?=[\s$])?/, "b");
            parsed = fixup_formatting(parsed, /(?=[\s^])?\*(.+?)\*(?=[\s$])?/, "i");
            parsed = fixup_formatting(parsed, "`(.+?)`", "kbd");

            messagediv.inject(parsed);
            if (is_action) {
                messagediv.style.fontStyle = 'italic';
                messagediv.style.color = 'blue';
            }
            if (js.message.match('@' + prefs.credentials.login + "\\b")) {
                messagediv.style.fontWeight = 'bolder';
                messagediv.style.color = '#3443e8';
            }
            let linediv = new HTML('div', {class: 'line', id: js.msgid});
            linediv.inject(namediv);
            linediv.inject(datediv);
            linediv.inject(messagediv);
            channeldiv.inject(linediv);
            channeldiv.scrollTo(0, channeldiv.scrollHeight);

            // Notify on mention??
            if (js.message.match('@' + prefs.credentials.login + "\\b") && notify_user) {
                notify(js.channel, js.realname, js.message);
            }

            // Admin? If so, add a redact option to the message
            if (prefs.admin) {
                datediv.inject(new HTML('a', {style: {marginLeft: '10px'}, href: `javascript:void(redact('${js.msgid}'));`}, 'Redact'))
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
            notify_block = false;
            attendees = js.attendees;
            max_people = js.max;
            current_people = js.current;
            current_people.sort((a, b) => a.localeCompare(b));
            prefs.statuses = js.statuses;
            prefs.quorum = js.quorum;
            write_creds();
        }
    });
}

async function redact(msgid) {
    const resp = await POST("/mgmt", {action: 'redact', msgid: msgid});
    let rv = await resp.json();
    alert(rv.message);
    if (rv.success) document.getElementById(msgid).parentNode.removeChild(document.getElementById(msgid));
}

async function check_send(el, force=false) {
    // Ignore if we're in the middle of a tribute selection
    if (document.getElementsByClassName('tribute-container').length && document.getElementsByClassName('tribute-container')[0].style.display != 'none') {
        return
    }
    // alternate newline command
    if (event.key === 'Enter' && event.ctrlKey) {
        el.value += "\n";
        return
    }
    if(force || (event.key === 'Enter') && !(event.shiftKey || event.ctrlKey)) {
        event.preventDefault();
        const message = el.value;
        // Block people trying to announce themselves...
        if (message.match(/^\s*[-a-z0-9]+\s+\|\s+\S*/)) {
            alert("It looks like you are trying to announce yourself. This is NOT needed. Your attendance has been recorded. If you are acting as a proxy for others, please click the Proxies button.")
            return
        }
        // Commands?
        let action_m = message.match(/^\/([a-z]+)\s+(\S+)$/);
        if (action_m) {
            let act = action_m[1];
            let target = action_m[2];
            if (act === "unban") {
                await unban_user(target);
                el.value = "";  // reset message field
                return
            }
            if (act === "ban") {
               await ban_user(target);
               el.value = "";  // reset message field
               return
           }
        }
        el.value = '';
        let resp = await POST("/post", {
            room: current_room,
            message: message
        });
        if (resp.status === 200) {
        } else {
            rv = await resp.json();
            el.value = rv.message;
        }
    }
}


function mkchannel(chan) {
    let channeldiv = document.getElementById('channel_' + chan);
    if (!channeldiv) {
        channeldiv = document.createElement('div');
        channeldiv.setAttribute('id', 'channel_' + chan);
        channeldiv.setAttribute('class', 'channel chat-history');
        if (chan != current_room) channeldiv.style.display = 'none';
        let topic = '';
        for (let channel of rooms) {
            if (channel.id == chan) topic = `${channel.title}: ${channel.topic}`;
        }

        let topicdiv = new HTML('div', {class: 'col-lg-12 clearfix topic', id: 'topic_' + chan}, topic);
        topicdiv.style.display = 'none';
        topicdiv.title = topic;
        document.getElementById('channels').appendChild(topicdiv);
        document.getElementById('channels').appendChild(channeldiv);
        return channeldiv
    }
}


function show_channel(chan) {
    let chandiv = document.getElementById('channel_' + current_room);
    let topicdiv = document.getElementById('topic_' + current_room);
    if (chandiv) {
        chandiv.style.display = 'none';
        topicdiv.style.display = 'none';
    }

    current_room = chan;
    chandiv = document.getElementById('channel_' + chan);
    if (!chandiv) chandiv = mkchannel(chan);
    topicdiv = document.getElementById('topic_' + chan);
    chandiv.style.display = 'inline-block';
    topicdiv.style.display = 'inline-block';
    chandiv.scrollTo(0, chandiv.scrollHeight);

    let chanpicker = document.getElementById('chanpicker');
    chanpicker.innerText = '';
    for (let room of rooms) {
        let li = new HTML('li');
        let a = new HTML('a', { href: "javascript:void(show_channel('" + room.id + "'))"});
        let span = new HTML('span');
        a.appendChild(li);
        span.innerText = room.title;
        span.className = "btn";
        let unreads = new HTML('span', {class: 'badge bg-primary badge-pad'});
        unreads.setAttribute('id', 'unread_' + room.id);
        if (room.unread) unreads.innerText = room.unread;
        span.appendChild(unreads);
        li.appendChild(span);
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
let notifydiv = document.getElementById('notify');
if (notifydiv) {
    notifydiv.addEventListener('click', (event) => {
        if (event.target.checked) {
            Notification.requestPermission().then(function (result) {
                if (result == 'granted') {
                    notify_user = true;
                    window.localStorage.setItem('asfmm_notify', 'true');
                    console.log("Enabling notifications");
                }
            });
        } else {
            notify_user = false;
            window.localStorage.setItem('asfmm_notify', 'false');
            console.log("Disabling notifications");
        }

    });
    // If previously enabled, keep it sticky
    if (Notification.permission == 'granted') {
        notifydiv.checked = (window.localStorage.getItem("asfmm_notify") == "true");
        notify_user = notifydiv.checked;
    }

    // Tribute attachment
    tribute = new Tribute({
            autocompleteMode: false,
            values: function (text, cb) {
                cb(nicks);
            }
        }
    );
    tribute.attach(document.getElementById('mooosage'));
}


const sys_theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.setAttribute('data-bs-theme', sys_theme);


$(document).keyup(function (event) {
    if (event.which === 27) {
        $('#modal').hide();
        $('#modal_help').hide();
    }
});



function fixup_formatting(splicer, pattern, format) {
    const pat = new RegExp(pattern);
    if (typeof splicer == 'object') {
        let newsplicer = [];
        for (let el of splicer) {
            if (typeof el === "string" || isArray(el)) newsplicer.push(fixup_formatting(el, pattern, format));
            else newsplicer.push(el);
        }
        return newsplicer;
        //splicer = splicer.innerText;
    }
    /* Array holding text and links */
    let i, m, t, textbits, url, urls;
    textbits = [];

    /* Find the first link, if any */
    i = splicer.search(pat);
    let blocks = 0;

    /* While we have more links, ... */
    while (i !== -1) {
        blocks++;

        /* Only parse the first 250 URLs... srsly */
        if (blocks > 250) {
            break;
        }

        /* Text preceding the link? add it to textbits frst */
        if (i > 0) {
            t = splicer.substr(0, i);
            textbits.push(t);
            splicer = splicer.substr(i);
        }

        /* Find the URL and cut it out as a link */
        m = splicer.match(pat);
        if (m) {
            let block = m[1];
            let preblock = m[0];
            i = preblock.length;
            t = splicer.substr(0, i);
            textbits.push(new HTML(format, {}, block));
            splicer = splicer.substr(i);
        }

        /* Find the next link */
        i = splicer.search(pat);
    }

    /* push the remaining text into textbits */
    textbits.push(splicer);
    return textbits;
}