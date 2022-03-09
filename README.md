# ASFMM
ASF Members Meeting Web Chat Service

## What does this do?
This is a simple public-only web chat service for the Apache Software Foundation.
It's intended use is our annual members' meeting, and thus it's tied to our OAuth portal (but can be modified to work with any oauth portal). 

For simplicity's sake, and to make it more performant, all chat rooms are public and there are no private messaging features.

## Setup instructions

- Clone the git repo
- Adjust mm.yaml to your liking (especially the callback URLs and the admins)
- install pips: `pip3 install -r requirements.txt`
- Run the server: `python3 main.py`

### mod_proxy setup for HTTPS support
If you're using httpd as an TLS terminator, you will need to enable both `mod_proxy` and `mod_proxy_wstunnel` and have the following configuration snippet in your VirtualHost stanza:

~~~apache
ProxyPass /chat ws://localhost:8080/chat
ProxyPass / http://localhost:8080/
~~~

### Resetting the history
To reset the chat and quorum history, simply delete asfmm.sqlite and restart the service.


## Acknowledgements:

This project uses [moment.js](https://momentjs.com/) and [tribute](https://github.com/zurb/tribute) for its user interface. Many thanks for the cool features, people!