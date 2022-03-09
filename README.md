# ASFMM
ASF Members Meeting Web Chat Service

## Setup instructions

- Clone the git repo
- Adjust mm.yaml to your liking (especially the callback URLs and the admins)
- install pips: `pip3 install -r requirements.txt`
- Run the server: `python3 main.py`

### mod_proxy_ws setup for HTTPS support
If you're using httpd as an TLS terminator, you will need to enable both `mod_proxy` and `mod_proxy_wstunnel` and have the following configuration snippet in your VirtualHost stanza:

~~~apache
ProxyPass /chat ws://localhost:8080/chat
ProxyPass / http://localhost:8080/
~~~
