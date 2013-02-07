package io.collapse.proxyWebSocket;

import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.lang.Thread;
import java.net.Socket;
import org.eclipse.jetty.websocket.WebSocket;

public class ProxyWebSocket
  implements WebSocket, WebSocket.OnTextMessage {

  private String host;
  private int port;

  private WebSocket.Connection connection = null;

  private Socket socket = null;
  private InputStream socketInputStream = null;
  private OutputStream socketOutputStream = null;

  /**
   *
   */
  public ProxyWebSocket(String host, int port) {
    super();
    this.host = host;
    this.port = port;
    System.err.println("constructor");
  }

  /**
   * Called when a client connects
   */
  public void onOpen(WebSocket.Connection connection) {
    System.err.println("onOpen");
    this.connection = connection;
    this.connection.setMaxBinaryMessageSize(1024 * 1024 * 1);
    this.connection.setMaxIdleTime(1000 * 60 * 60 * 24 * 2);
    this.connection.setMaxTextMessageSize(1024 * 1024 * 1);

    try {
      this.socket = new Socket(this.host, this.port);
      this.socketOutputStream = this.socket.getOutputStream();

      BufferedReader bufferedReader =
        new BufferedReader(new InputStreamReader(this.socket.getInputStream()));

      class ReadThread extends Thread {
        private BufferedReader bufferedReader;
        private WebSocket.Connection connection;
        ReadThread(WebSocket.Connection connection,
                   BufferedReader bufferedReader) {
          this.connection = connection;
          this.bufferedReader = bufferedReader;
        }
        public void run() {
          String data;
          try {
            while(null != (data = bufferedReader.readLine())) {
              this.connection.sendMessage(data);
            }
          }
          catch(Exception exception) {
            exception.printStackTrace();
          }
        }
      }

      ReadThread readThread =
        new ReadThread(this.connection, bufferedReader);

      readThread.start();
    }
    catch(Exception exception) {
      exception.printStackTrace();
      this.connection.disconnect();
    }
  }

  public void onClose(int closeCode, String message) {
    try {
      this.socketOutputStream.close();
      this.socketInputStream.close();
      this.socket.close();
    }
    catch(Exception exception) {
      exception.printStackTrace();
    }
  }

  public void onMessage(String data) {
    try {
      this.socketOutputStream.write(data.getBytes());
    }
    catch(Exception exception) {
      System.err.println(exception.toString());
    }
  }

  /**
   * Send a message to the client
   *
   * @param data
   * A message to send
   *
   * @return void
   */
  protected void sendMessage(String data) {
    try {
      this.connection.sendMessage(data);
    }
    catch(IOException exception) {
      System.err.println(exception.toString());
    }
  }
}
