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
let tribute;
let nicks = [];

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
    new Notification(`${sender} (#${room}): ${message}`);
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
    if (creds) creds.innerText = `Logged in as ${prefs.credentials.name} (${prefs.credentials.login}, via ${prefs.credentials.provider}). Currently ${attendees} attending (total attendance this meeeting: ${max_people}). `;
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
        document.getElementById('assign_proxies').style.display = 'block';
    }

    if (prefs.quorum && prefs.quorum.present.length > prefs.quorum.required) {
        let quorum = document.getElementById('quorum');
        quorum.style.display = 'block';
        quorum.style.background = '#c5f5bb';
        quorum.innerText = `Quorum has been reached. ${prefs.quorum.present.length} members present or assigned via proxy out of a required ${prefs.quorum.required}.`;
    } else if (prefs.quorum) {
        let quorum = document.getElementById('quorum');
        quorum.style.display = 'block';
        quorum.style.background = '#f5bbc6';
        quorum.innerText = `Quorum has NOT been reached yet. ${prefs.quorum.present.length} members present or assigned via proxy out of a required ${prefs.quorum.required}.`;
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
    text.innerText = "This form allows you to assign yourself as proxy for other members.\nIf one or more members have assigned you as a proxy for this meeting, \nplease enter their ASF ID(s) below, one per line:";
    text.inject(new HTML('br'));
    let txt = new HTML('textarea', {id: 'proxies'});
    txt.style.height = '300px';
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
    alert(resp.message);
    modal.style.display = 'none';
}


async function main() {
    write_creds();
    await chat();
}

// chat loop
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
            if (!channeldiv) channeldiv =  mkchannel(js.channel);
            const now = moment(js.timestamp * 1000.0).fromNow();
            let messagediv = new HTML('div', {class: 'message'});
            let datediv = new HTML('div', {class: 'timestamp', tz: js.timestamp*1000.0}, now);
            // Update timestamp every 30-40 seconds..ish. Random distribution of load
            window.setInterval(() => datediv.innerText = moment(parseFloat(datediv.getAttribute('tz'))).fromNow(), 30000 + (Math.random()*10000));
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
            linediv.inject(namediv);
            linediv.inject(datediv);
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
            prefs.quorum = js.quorum;
            write_creds();
        }
    });
}


function check_send(el, force=false) {
    // Ignore if we're in the middle of a tribute selection
    if (document.getElementsByClassName('tribute-container').length && document.getElementsByClassName('tribute-container')[0].style.display != 'none') {
        return
    }
    if(force || event.key === 'Enter' && !event.shiftKey) {
        POST("/post", {
            room: current_room,
            message: el.value
        });
        el.value = '';
        event.preventDefault();
    }
}

function mkchannel(chan) {
    let channeldiv = document.getElementById('channel_' + chan);
    if (!channeldiv) {
        channeldiv = document.createElement('div');
        channeldiv.setAttribute('id', 'channel_' + chan);
        channeldiv.setAttribute('class', 'channel');
        if (chan != current_room) channeldiv.style.display = 'none';
        let topic = '';
        for (let channel of rooms) {
            if (channel.id == chan) topic = `#${channel.id} (${channel.title}): ${channel.topic}`;
        }

        let topicdiv = new HTML('div', {class: 'topic', id: 'topic_' + chan}, topic);
        topicdiv.style.display = 'none';
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
let notifydiv = document.getElementById('notify');
if (notifydiv) {
    notifydiv.addEventListener('click', (event) => {
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
