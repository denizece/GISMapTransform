package com.mycompany.helmert;
 
import javax.ws.rs.POST;

public interface ItemResource {
    @POST
    String map(Request req);
}
