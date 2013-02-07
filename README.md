A web or desktop-based IRC client.

Building and Running
====================

    mvn clean package
    mvn jetty:run
    open http://localhost:8080


A Brief Tour
============

The file src/main/java/io/collapse/ProxyWebSocketServlet.java defines
an endpoint that accepts requests for WebSocket sessions. The
servlet creates an instance of ProxyWebSocket that reads and writes
all traffic between a Socket and the WebSocket. The endpoint is
defined in src/main/webapp/WEB-INF/web.xml.

To get a handle on the web application, take a look at
src/main/webapp/js/Controller.js.

