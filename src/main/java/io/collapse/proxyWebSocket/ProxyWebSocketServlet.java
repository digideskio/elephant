package io.collapse.proxyWebSocket;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArraySet;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;

/**
 * Configure in WEB-INF/web.xml as
 *
 *    <servlet>
 *      <servlet-name>WebSocketProxy</servlet-name>
 *      <servlet-class>io.collapse.WebSocketProxyServlet</servlet-class>
 *      <load-on-startup>1</load-on-startup>
 *    </servlet>
 *    <servlet-mapping>
 *      <servlet-name>WebSocketProxy</servlet-name>
 *      <url-pattern>/proxy</url-pattern>
 *    </servlet-mapping>
 */
public class ProxyWebSocketServlet extends WebSocketServlet {

  protected void doGet(HttpServletRequest request, HttpServletResponse response)
    throws ServletException ,IOException {
    getServletContext().getNamedDispatcher("default").forward(request,response);
  }

  public WebSocket doWebSocketConnect(HttpServletRequest request, String protocol) {
    String host = request.getParameter("host");
    Integer port = new Integer(request.getParameter("port"));


    if(host == null || port == 0) {
      System.err.println("No host or port provided");
      return null;
    }

    // This will be a helpful block to refer to when people
    // freak out when I tell them how this works.
    if(!("irc.collapse.io".equals(host))
        || (6697 != port && 6667 != port)) {
      System.err.println("Invalid host or port: " + host + ":" + port);
      return null;
    }

    return new ProxyWebSocket(host, port);
  }
}
